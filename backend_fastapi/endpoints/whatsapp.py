# backend_fastapi/endpoints/whatsapp.py
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from dependencies.auth import get_current_user
from models import Usuario

from services.evolution_service import (
    crear_o_obtener_qr,
    obtener_estado_conexion,
    desconectar_instancia,
    enviar_mensaje_evolution,
    configurar_webhook_instancia,
    resolver_destinatario_lid
)
from services.bot_engine_service import (
    verificar_silencio_humano,
    registrar_historial_db,
    obtener_respuesta_faq_db,
    consultar_gemini_ia,
    extraer_user_id_de_instancia,
    poblar_plantilla_bot_doctor
)

router = APIRouter()

# 🛡️ MEMORIA DE DEDUPLICACIÓN (Evita que el bot responda dos veces)
MENSAJES_PROCESADOS = set()

class EnviarMensajeRequest(BaseModel):
    numero: str
    texto: str
    imagen: Optional[str] = None

def obtener_nombre_instancia(usuario: Usuario) -> str:
    return f"doctor_{str(usuario.id).replace('-', '_')}"

@router.get("/estado")
async def consultar_estado_whatsapp(current_user: Usuario = Depends(get_current_user)):
    instance_name = obtener_nombre_instancia(current_user)
    # Auto-asegurar que este doctor tenga su plantilla base inicializada
    await poblar_plantilla_bot_doctor(
        user_id=str(current_user.id),
        doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
        consultorio_nombre=current_user.nombre_consultorio,
        telefono=current_user.telefono
    )
    resultado = await obtener_estado_conexion(instance_name)
    return {
        "instancia": instance_name,
        "conectado": resultado.get("state") == "open",
        "estado": resultado.get("state", "disconnected")
    }

@router.post("/conectar")
async def conectar_whatsapp(request: Request, current_user: Usuario = Depends(get_current_user)):
    instance_name = obtener_nombre_instancia(current_user)
    
    # Auto-asegurar plantilla base
    await poblar_plantilla_bot_doctor(
        user_id=str(current_user.id),
        doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
        consultorio_nombre=current_user.nombre_consultorio,
        telefono=current_user.telefono
    )

    host = request.headers.get("host", "")
    if "localhost" in host or "127.0.0.1" in host:
        base_url = "https://dental-backend-779789369655.us-east1.run.app"
    else:
        base_url = str(request.base_url).rstrip("/")

    webhook_url = f"{base_url}/api/whatsapp/webhook/evolution"

    resultado = await crear_o_obtener_qr(instance_name, webhook_url=webhook_url)
    if not resultado.get("success"):
        raise HTTPException(status_code=500, detail=f"Error al conectar WhatsApp: {resultado.get('error')}")
        
    return {
        "instancia": instance_name,
        "qrcode": resultado.get("qrcode"),
        "pairingCode": resultado.get("pairingCode"),
        "status": resultado.get("status")
    }

@router.post("/desconectar")
async def desconectar_whatsapp(current_user: Usuario = Depends(get_current_user)):
    instance_name = obtener_nombre_instancia(current_user)
    resultado = await desconectar_instancia(instance_name)
    return {"success": resultado.get("success", False)}

@router.post("/enviar-mensaje")
async def enviar_mensaje_manual(datos: EnviarMensajeRequest, current_user: Usuario = Depends(get_current_user)):
    """Despacho manual del Doctor desde Next.js y activación de silencio humano"""
    instance_name = obtener_nombre_instancia(current_user)
    destinatario_real = await resolver_destinatario_lid(instance_name, datos.numero)
    
    exito = await enviar_mensaje_evolution(
        instance_name=instance_name,
        numero=destinatario_real,
        texto=datos.texto,
        imagen_url=datos.imagen
    )
    
    if not exito:
        raise HTTPException(status_code=500, detail="No se pudo despachar el mensaje por WhatsApp.")
        
    await registrar_historial_db(datos.numero, "[Intervención Doctor/Humano]", datos.texto, instance=instance_name)
    return {"success": True, "mensaje": "Mensaje enviado exitosamente"}

@router.post("/webhook/evolution")
async def webhook_evolution_receiver(request: Request):
    """Receptor del Webhook de Evolution API: Silencio Humano + Jerarquía 3 Niveles Multi-Tenant"""
    try:
        body = await request.json()
        evento = body.get("event")
        instance = body.get("instance", "doctor_default")
        data = body.get("data", {})

        if evento in ("messages.upsert", "MESSAGES_UPSERT"):
            key = data.get("key", {})
            if key.get("fromMe"):
                return {"status": "ignored_from_me"}

            remote_jid = key.get("remoteJid", "")
            if "@g.us" in remote_jid or "status@broadcast" in remote_jid:
                return {"status": "ignored_group_or_status"}

            # 🛡️ FILTRO ANTI-DUPLICADOS (DEDUPLICACIÓN)
            message_id = key.get("id")
            if message_id:
                if message_id in MENSAJES_PROCESADOS:
                    print(f"⏭ [Webhook Evolution] Ignorando evento duplicado para mensaje ID: {message_id}", flush=True)
                    return {"status": "ignored_duplicate"}
                MENSAJES_PROCESADOS.add(message_id)
                if len(MENSAJES_PROCESADOS) > 1000:
                    MENSAJES_PROCESADOS.clear()

            addressing_mode = key.get("addressingMode", "")
            remote_jid_alt = key.get("remoteJidAlt", "")
            
            # 📞 1. Extraer el número telefónico real legible para la bandeja y base de datos
            telefono_real = None
            if "@s.whatsapp.net" in remote_jid_alt:
                telefono_real = "".join(filter(str.isdigit, remote_jid_alt.split("@")[0]))
            elif "@s.whatsapp.net" in remote_jid:
                telefono_real = "".join(filter(str.isdigit, remote_jid.split("@")[0]))
            else:
                sender_val = data.get("sender", "") or key.get("participant", "")
                if "@s.whatsapp.net" in sender_val:
                    telefono_real = "".join(filter(str.isdigit, sender_val.split("@")[0]))

            # Si viene por @lid, guardamos el mapeo bidireccional en memoria
            if telefono_real and "@lid" in remote_jid:
                from services.evolution_service import MAPA_LID_CACHE
                MAPA_LID_CACHE[telefono_real] = remote_jid
                MAPA_LID_CACHE[remote_jid.split("@")[0]] = telefono_real

            # El número que verá el doctor en su bandeja web (/chat)
            numero_paciente = telefono_real or remote_jid.split("@")[0]
            
            # El destinatario técnico que necesita Baileys para entregar la respuesta
            destinatario_respuesta = await resolver_destinatario_lid(instance, remote_jid, addressing_mode)

            message_obj = data.get("message", {})
            
            texto_paciente = (
                message_obj.get("conversation")
                or message_obj.get("extendedTextMessage", {}).get("text")
                or message_obj.get("imageMessage", {}).get("caption")
                or data.get("messageText")
                or ""
            ).strip()

            if not texto_paciente:
                return {"status": "ignored_no_text"}

            # 🆔 Obtener el odontologo_id a partir del nombre de instancia
            odontologo_id = extraer_user_id_de_instancia(instance)

            print(f"📩 [Webhook Evolution] Mensaje recibido de {numero_paciente} en {instance} (Doctor ID: {odontologo_id}): '{texto_paciente}'", flush=True)

            # 1. Silencio humano
            if await verificar_silencio_humano(numero_paciente, ventana_horas=0, instance=instance):
                print(f"🤫 [Webhook Evolution] Silencio activo para {numero_paciente}.", flush=True)
                await registrar_historial_db(numero_paciente, texto_paciente, "", instance=instance)
                return {"status": "silence_active"}

            # 2. Jerarquía de Respuestas Multi-Tenant
            respuesta = await obtener_respuesta_faq_db(texto_paciente, odontologo_id=odontologo_id)
            if not respuesta:
                respuesta = await consultar_gemini_ia(texto_paciente, numero_paciente, instance=instance, odontologo_id=odontologo_id)

            if not respuesta:
                respuesta = {
                    "texto": "Hola! 👋 No logré entender tu consulta, pero pronto un doctor te atenderá personalmente. 🦷",
                    "imagen": None
                }

            print(f"📤 [Webhook Evolution] Despachando respuesta a {destinatario_respuesta}: '{respuesta['texto'][:50]}...'", flush=True)

            # 3. Despacho garantizado al destinatario
            exito_envio = await enviar_mensaje_evolution(
                instance_name=instance,
                numero=destinatario_respuesta,
                texto=respuesta["texto"],
                imagen_url=respuesta.get("imagen")
            )
            print(f"🏁 [Webhook Evolution] Resultado de envío a WhatsApp: {exito_envio}", flush=True)

            # 4. Registrar en Supabase
            await registrar_historial_db(numero_paciente, texto_paciente, respuesta["texto"], instance=instance)

        return {"status": "ok"}
    except Exception as e:
        print(f"❌ [Webhook Evolution Error]: {e}", flush=True)
        return {"status": "error", "error": str(e)}

@router.post("/activar-webhook")
async def activar_webhook_manual(current_user: Usuario = Depends(get_current_user)):
    """Fuerza la activación del Webhook público en Evolution API"""
    instance_name = obtener_nombre_instancia(current_user)
    webhook_url = "https://dental-backend-779789369655.us-east1.run.app/api/whatsapp/webhook/evolution"
    
    exito = await configurar_webhook_instancia(instance_name, webhook_url)
    return {
        "instancia": instance_name,
        "webhook_url": webhook_url,
        "configurado": exito
    }