# backend_fastapi/endpoints/bot_config.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import cloudinary.uploader
from config import Config
from database import get_db
from dependencies.auth import get_current_user
from dependencies.limites import verificar_permiso
from models import Usuario
from services.bot_engine_service import (
    SUPABASE_HEADERS,
    cliente_http_sesion,
    poblar_plantilla_bot_doctor,
    PLANTILLA_SERVICIOS_BASE,
    PLANTILLA_CHATBOT_BASE,
    obtener_plantilla_configuracion,
    CACHE_SERVICIOS_DOCTOR,
    CACHE_CONFIG_DOCTOR,
    CACHE_CHATBOT_DOCTOR
)

router = APIRouter(prefix="/bot-config", tags=["Configuración del Bot"])

# ============================================================
# ESQUEMAS PYDANTIC
# ============================================================

class ConfiguracionGeneralUpdate(BaseModel):
    nombre_consultorio: Optional[str] = None
    ciudad: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    horarios: Optional[str] = None
    horario_lunes_viernes: Optional[str] = None
    horario_sabado: Optional[str] = None
    horario_domingo: Optional[str] = None
    mensaje_bienvenida: Optional[str] = None
    mensaje_despedida: Optional[str] = None

class ServicioCreate(BaseModel):
    servicio: str
    categoria: Optional[str] = "General"
    palabras_clave: Optional[str] = ""
    precio: str
    descripcion: Optional[str] = ""
    disponible: Optional[bool] = True
    link_imagen: Optional[str] = None

class ServicioUpdate(BaseModel):
    servicio: Optional[str] = None
    categoria: Optional[str] = None
    palabras_clave: Optional[str] = None
    precio: Optional[str] = None
    descripcion: Optional[str] = None
    disponible: Optional[bool] = None
    link_imagen: Optional[str] = None

class ChatbotItemCreate(BaseModel):
    intencion: str
    palabras_clave: Optional[str] = ""
    respuesta: str
    link_imagen: Optional[str] = None
    estado: Optional[str] = "ACTIVO"

class ChatbotItemUpdate(BaseModel):
    intencion: Optional[str] = None
    palabras_clave: Optional[str] = None
    respuesta: Optional[str] = None
    link_imagen: Optional[str] = None
    estado: Optional[str] = None

# ============================================================
# 1. CONFIGURACIÓN GENERAL (Horarios, Consultorio, Sede)
# ============================================================

@router.get("/general")
async def obtener_configuracion_general(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la configuración del consultorio y horarios del doctor en sesión"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/configuracion?odontologo_id=eq.{user_id}"

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando configuración en Supabase")
        
        filas = res.json()
        if not filas:
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )
            res_retry = await client.get(url, headers=SUPABASE_HEADERS)
            filas = res_retry.json() if res_retry.status_code == 200 else []

        datos_dict = {item.get("clave"): item.get("valor") for item in filas}
        return {"success": True, "configuracion": datos_dict}

@router.put("/general")
async def guardar_configuracion_general(
    datos: ConfiguracionGeneralUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Guarda o actualiza la configuración de la sede y sincroniza automáticamente las respuestas de Ubicación y Horarios en el Chatbot"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    campos_a_actualizar = datos.model_dump(exclude_unset=True)

    if not campos_a_actualizar:
        return {"success": True, "message": "Sin cambios"}

    payload = [
        {"odontologo_id": user_id, "clave": k, "valor": str(v or "")}
        for k, v in campos_a_actualizar.items()
    ]

    url = f"{Config.SUPABASE_URL}/rest/v1/configuracion?on_conflict=odontologo_id,clave"
    headers = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates"}

    async with cliente_http_sesion(timeout=8.0) as client:
        # 1. Guardar claves en tabla 'configuracion'
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error guardando configuración: {res.text}")

        # 2. Sincronización automática de DIRECCIÓN con la intención 'ubicacion' en chatbot (insensible a mayúsculas)
        if "direccion" in campos_a_actualizar and str(campos_a_actualizar["direccion"]).strip():
            dir_limpia = str(campos_a_actualizar["direccion"]).strip()
            nueva_resp_ubicacion = (
                f"📍 *NUESTRA UBICACIÓN:*\n"
                f"Nos encontramos ubicados en {dir_limpia}.\n\n"
                f"¡Será un gusto atenderte! 🦷"
            )
            url_chat_ubicacion = f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}&intencion=ilike.ubicacion"
            await client.patch(url_chat_ubicacion, json={"respuesta": nueva_resp_ubicacion}, headers=SUPABASE_HEADERS)

        # 3. Sincronización automática de HORARIOS con la intención 'horarios' en chatbot (insensible a mayúsculas)
        if any(k in campos_a_actualizar for k in ("horario_lunes_viernes", "horario_sabado", "horario_domingo")):
            h_lv = str(campos_a_actualizar.get("horario_lunes_viernes") or "9:00 AM - 12:00 M y 2:00 PM - 6:00 PM").strip()
            h_sab = str(campos_a_actualizar.get("horario_sabado") or "9:00 AM - 12:00 M y 2:00 PM - 5:00 PM").strip()
            h_dom = str(campos_a_actualizar.get("horario_domingo") or "Cerrado").strip()
            nueva_resp_horarios = (
                f"📅 *Horarios de Atención:*\n"
                f"• Lunes a Viernes: {h_lv}\n"
                f"• Sábados: {h_sab}\n"
                f"• Domingos y Festivos: {h_dom}."
            )
            url_chat_horarios = f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}&intencion=ilike.horarios"
            await client.patch(url_chat_horarios, json={"respuesta": nueva_resp_horarios}, headers=SUPABASE_HEADERS)

    # Invalida caché de configuración y chatbot en RAM para reflejo inmediato en WhatsApp
    CACHE_CONFIG_DOCTOR.pop(user_id, None)
    CACHE_CHATBOT_DOCTOR.pop(user_id, None)

    return {"success": True, "message": "Configuración guardada y sincronizada correctamente"}

# ============================================================
# 2. CATÁLOGO DE SERVICIOS Y TARIFAS EN COP
# ============================================================

@router.get("/servicios")
async def listar_servicios_doctor(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los tratamientos clínicos y precios del doctor (auto-inicializa si está vacío)"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?odontologo_id=eq.{user_id}&order=id.asc"

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando servicios en Supabase")
        
        servicios_list = res.json()
        if not servicios_list:
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )
            res_retry = await client.get(url, headers=SUPABASE_HEADERS)
            servicios_list = res_retry.json() if res_retry.status_code == 200 else []

        return {"success": True, "servicios": servicios_list}

@router.post("/servicios")
async def crear_servicio_doctor(
    datos: ServicioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo tratamiento clínico en el catálogo del bot"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    datos_dict = datos.model_dump()

    if not datos_dict.get("link_imagen") or str(datos_dict.get("link_imagen")).strip() == "":
        datos_dict["link_imagen"] = None

    payload = {
        **datos_dict,
        "odontologo_id": user_id
    }
    url = f"{Config.SUPABASE_URL}/rest/v1/servicios"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando servicio: {res.text}")

        # Invalidar caché en RAM
        CACHE_SERVICIOS_DOCTOR.pop(user_id, None)
        return {"success": True, "servicio": res.json()[0] if res.json() else payload}

@router.put("/servicios/{servicio_id}")
async def actualizar_servicio_doctor(
    servicio_id: int,
    datos: ServicioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza un tratamiento existente del doctor e invalida caché"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    payload = datos.model_dump(exclude_unset=True)

    if not payload:
        return {"success": True, "message": "Sin cambios"}

    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?id=eq.{servicio_id}&odontologo_id=eq.{user_id}"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.patch(url, json=payload, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error actualizando servicio: {res.text}")

        actualizados = res.json()
        if not actualizados:
            raise HTTPException(
                status_code=404,
                detail="El tratamiento no existe o no tienes permiso para editarlo."
            )

        # Invalidar caché en RAM
        CACHE_SERVICIOS_DOCTOR.pop(user_id, None)
        return {"success": True, "message": "Servicio actualizado correctamente"}

@router.delete("/servicios/{servicio_id}")
async def eliminar_servicio_doctor(
    servicio_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un tratamiento del catálogo del doctor e invalida caché"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?id=eq.{servicio_id}&odontologo_id=eq.{user_id}"

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.delete(url, headers=SUPABASE_HEADERS)
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"Error eliminando servicio: {res.text}")

        # Invalidar caché en RAM
        CACHE_SERVICIOS_DOCTOR.pop(user_id, None)
        return {"success": True, "message": "Servicio eliminado correctamente"}

# ============================================================
# 3. CHATBOT: FAQ, SALUDOS Y PROMOCIONES CON FOTO
# ============================================================

@router.get("/chatbot")
async def listar_chatbot_items(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista las intenciones, promociones y afiches configurados por el doctor"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}&order=id.asc"

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando chatbot en Supabase")
        return {"success": True, "items": res.json()}

@router.post("/chatbot")
async def crear_chatbot_item(
    datos: ChatbotItemCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una nueva intención o promoción con afiche"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    datos_dict = datos.model_dump()
    
    if not datos_dict.get("link_imagen") or str(datos_dict.get("link_imagen")).strip() == "":
        datos_dict["link_imagen"] = None

    payload = {
        **datos_dict,
        "odontologo_id": user_id
    }
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando respuesta: {res.text}")

        # Invalidar caché de chatbot en RAM
        CACHE_CHATBOT_DOCTOR.pop(user_id, None)
        return {"success": True, "item": res.json()[0] if res.json() else payload}

@router.put("/chatbot/{item_id}")
async def actualizar_chatbot_item(
    item_id: int,
    datos: ChatbotItemUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza una intención, respuesta o enlace de imagen existente"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    payload = datos.model_dump(exclude_unset=True)

    if not payload:
        return {"success": True, "message": "Sin cambios"}

    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?id=eq.{item_id}&odontologo_id=eq.{user_id}"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.patch(url, json=payload, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error actualizando chatbot: {res.text}")

        actualizados = res.json()
        if not actualizados:
            raise HTTPException(
                status_code=404,
                detail="La respuesta no existe o no tienes permiso para editarla."
            )

        # Invalidar caché de chatbot en RAM
        CACHE_CHATBOT_DOCTOR.pop(user_id, None)
        return {"success": True, "message": "Respuesta actualizada correctamente"}

@router.delete("/chatbot/{item_id}")
async def eliminar_chatbot_item(
    item_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina una respuesta personalizada del doctor"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?id=eq.{item_id}&odontologo_id=eq.{user_id}"

    async with cliente_http_sesion(timeout=8.0) as client:
        res = await client.delete(url, headers=SUPABASE_HEADERS)
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"Error eliminando respuesta: {res.text}")

        # Invalidar caché de chatbot en RAM
        CACHE_CHATBOT_DOCTOR.pop(user_id, None)
        return {"success": True, "message": "Respuesta eliminada correctamente"}

@router.post("/subir-afiche")
async def subir_afiche_promocion(
    archivo: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sube un afiche o imagen publicitaria a Cloudinary para el bot del doctor sin bloquear el event loop"""
    await verificar_permiso("can_use_bot", current_user, db)

    if not archivo.content_type or not archivo.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP)."
        )

    contenido = await archivo.read()
    if len(contenido) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="La imagen excede el tamaño máximo permitido de 5 MB."
        )

    try:
        res_upload = await asyncio.to_thread(
            cloudinary.uploader.upload,
            contenido,
            folder=f"promociones_bot/{current_user.id}",
            overwrite=True
        )
        return {
            "success": True,
            "url": res_upload.get("secure_url")
        }
    except Exception as e:
        print(f"❌ [Error Cloudinary]: {e}", flush=True)
        raise HTTPException(
            status_code=500,
            detail="No se pudo procesar la subida de la imagen publicitaria."
        )

# ============================================================
# 4. RESTAURAR PLANTILLA PREDETERMINADA
# ============================================================

@router.post("/restaurar-plantilla")
async def restaurar_plantilla_base(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Restaura todos los servicios, horarios y chatbot a los valores oficiales de fábrica"""
    await verificar_permiso("can_use_bot", current_user, db)
    user_id = str(current_user.id)

    async with cliente_http_sesion(timeout=10.0) as client:
        try:
            # 1. Borrar configuración actual del doctor en Supabase verificando cada respuesta
            del_cfg = await client.delete(
                f"{Config.SUPABASE_URL}/rest/v1/configuracion?odontologo_id=eq.{user_id}",
                headers=SUPABASE_HEADERS
            )
            del_srv = await client.delete(
                f"{Config.SUPABASE_URL}/rest/v1/servicios?odontologo_id=eq.{user_id}",
                headers=SUPABASE_HEADERS
            )
            del_bot = await client.delete(
                f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}",
                headers=SUPABASE_HEADERS
            )

            if not all(r.status_code in (200, 204) for r in (del_cfg, del_srv, del_bot)):
                raise HTTPException(
                    status_code=500,
                    detail="No se pudo purgar la configuración previa en la base de datos."
                )

            # 2. Re-poblar plantilla base oficial
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )

            # 3. Purgar todas las cachés del doctor en RAM
            CACHE_CONFIG_DOCTOR.pop(user_id, None)
            CACHE_SERVICIOS_DOCTOR.pop(user_id, None)
            CACHE_CHATBOT_DOCTOR.pop(user_id, None)

            return {"success": True, "message": "Plantilla restablecida a valores oficiales correctamente"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ [Error Restaurar Plantilla]: {e}", flush=True)
            raise HTTPException(
                status_code=500,
                detail="Ocurrió un error al restaurar la plantilla predeterminada."
            )