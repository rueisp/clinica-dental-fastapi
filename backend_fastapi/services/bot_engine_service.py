# backend_fastapi/services/bot_engine_service.py
import re
import uuid
import unicodedata
import httpx
import logging
from datetime import datetime, timezone, timedelta
from config import Config

logger = logging.getLogger("bot_engine")

SUPABASE_HEADERS = {
    "apikey": Config.SUPABASE_KEY,
    "Authorization": f"Bearer {Config.SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# 🚀 Caché en memoria para evitar consultas duplicadas a Supabase (TTL: 60 segundos)
CACHE_SERVICIOS_DOCTOR: dict = {}
CACHE_CONFIG_DOCTOR: dict = {}
CACHE_CHATBOT_DOCTOR: dict = {}
CACHE_SUSCRIPCION_DOCTOR: dict = {}

# ============================================================
# PLANTILLAS BASE OFICIALES (Importadas desde bot_templates.py)
# ============================================================
from services.bot_templates import (
    PLANTILLA_SERVICIOS_BASE,
    obtener_plantilla_configuracion,
    PLANTILLA_CHATBOT_BASE
)


# ============================================================
# FUNCIONES DE INICIALIZACIÓN MULTI-TENANT
# ============================================================

# Ubicación: backend_fastapi/services/bot_engine_service.py (reemplazo completo de verificar_suscripcion_activa_bot)

async def verificar_suscripcion_activa_bot(odontologo_id: str) -> bool:
    """Verifica con caché en RAM (0 ms) que el doctor tenga plan vigente y activo directamente en PostgreSQL"""
    if not odontologo_id:
        return False

    ahora_ts = datetime.now(timezone.utc).timestamp()
    cache_sub = CACHE_SUSCRIPCION_DOCTOR.get(odontologo_id)
    
    # 1. Si la memoria RAM tiene menos de 10 minutos (600s), responder en 0 ms
    if cache_sub and (ahora_ts - cache_sub["timestamp"] < 600):
        return cache_sub["activo"]

    try:
        from database import AsyncSessionLocal
        from models import Usuario, Subscription, Plan
        from sqlalchemy import select
        import uuid

        doctor_uuid = uuid.UUID(odontologo_id)

        async with AsyncSessionLocal() as db:
            # A. Bypass para Administrador
            res_user = await db.execute(select(Usuario).where(Usuario.id == doctor_uuid))
            usuario = res_user.scalar_one_or_none()
            if usuario and usuario.is_admin:
                CACHE_SUSCRIPCION_DOCTOR[odontologo_id] = {"activo": True, "timestamp": ahora_ts}
                return True

            # B. Buscar suscripción en PostgreSQL directo (sin bloqueo de RLS)
            res_sub = await db.execute(select(Subscription).where(Subscription.user_id == doctor_uuid))
            sub = res_sub.scalar_one_or_none()
            if not sub or sub.status != "active" or not sub.current_period_end:
                CACHE_SUSCRIPCION_DOCTOR[odontologo_id] = {"activo": False, "timestamp": ahora_ts}
                return False

            # C. Verificar fecha de vigencia
            ahora_utc = datetime.now(timezone.utc)
            fecha_fin = sub.current_period_end
            if hasattr(fecha_fin, "tzinfo") and fecha_fin.tzinfo is not None:
                vigente = fecha_fin > ahora_utc
            else:
                vigente = fecha_fin > ahora_utc.replace(tzinfo=None)

            if not vigente:
                CACHE_SUSCRIPCION_DOCTOR[odontologo_id] = {"activo": False, "timestamp": ahora_ts}
                return False

            # D. Verificar permiso de bot según el plan (Exclusivo Trial y Ultra)
            res_plan = await db.execute(select(Plan).where(Plan.id == sub.plan_id))
            plan = res_plan.scalar_one_or_none()
            
            tiene_permiso = False
            if plan and plan.can_use_bot:
                tiene_permiso = True
            elif sub.plan_type:
                tipo_normalizado = sub.plan_type.lower()
                if "trial" in tipo_normalizado or "ultra" in tipo_normalizado:
                    tiene_permiso = True

            CACHE_SUSCRIPCION_DOCTOR[odontologo_id] = {"activo": tiene_permiso, "timestamp": ahora_ts}
            return tiene_permiso

    except Exception as e:
        print(f"⚠️ [Error Verificando Suscripción en BD]: {e}", flush=True)
        return False

    return False

def extraer_user_id_de_instancia(instance_name: str) -> str | None:
    """Extrae el UUID del usuario desde el nombre de instancia 'doctor_<uuid_con_guiones_bajos>'"""
    if not instance_name or not instance_name.startswith("doctor_"):
        return None
    raw_id = instance_name.replace("doctor_", "")
    # Restaurar formato UUID con guiones: 8-4-4-4-12
    partes = raw_id.split("_")
    if len(partes) == 5:
        reconstruido = "-".join(partes)
        try:
            uuid.UUID(reconstruido)
            return reconstruido
        except ValueError:
            pass
    # Intento directo de parseo
    try:
        uuid.UUID(raw_id)
        return raw_id
    except ValueError:
        return None

async def poblar_plantilla_bot_doctor(user_id: str, doctor_nombre: str = "", consultorio_nombre: str = "", telefono: str = ""):
    """Puebla automáticamente las tablas solo si el doctor no tiene NADA configurado."""
    if not user_id:
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. VERIFICACIÓN MULTI-TABLA: Aseguramos que ninguna tabla tenga datos del doctor
            tablas_a_verificar = ["configuracion", "servicios", "chatbot"]
            for tabla in tablas_a_verificar:
                url_chk = f"{Config.SUPABASE_URL}/rest/v1/{tabla}?odontologo_id=eq.{user_id}&limit=1"
                res_chk = await client.get(url_chk, headers=SUPABASE_HEADERS)
                if res_chk.status_code == 200 and len(res_chk.json()) > 0:
                    # Si alguna tabla ya tiene datos, abortamos para no duplicar
                    return 

            print(f"🌱 [Bot Multi-Tenant] Inicializando plantilla base para doctor ID: {user_id}", flush=True)

            # 2. Poblar 'configuracion'
            cfg_dict = obtener_plantilla_configuracion(doctor_nombre, consultorio_nombre, telefono)
            cfg_payload = [{"odontologo_id": user_id, "clave": k, "valor": str(v)} for k, v in cfg_dict.items()]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/configuracion", json=cfg_payload, headers=SUPABASE_HEADERS)

            # 3. Poblar 'servicios'
            srv_payload = [{**item, "odontologo_id": user_id} for item in PLANTILLA_SERVICIOS_BASE]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/servicios", json=srv_payload, headers=SUPABASE_HEADERS)

            # 4. Poblar 'chatbot'
            bot_payload = [{**item, "odontologo_id": user_id} for item in PLANTILLA_CHATBOT_BASE]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/chatbot", json=bot_payload, headers=SUPABASE_HEADERS)

            print(f"✅ [Bot Multi-Tenant] Plantilla inicializada con éxito para doctor ID: {user_id}", flush=True)
        except Exception as e:
            print(f"❌ [Bot Multi-Tenant Init Error]: {e}", flush=True)
# ============================================================
# LÓGICA DE TEXTO Y SILENCIO HUMANO
# ============================================================

def eliminar_tildes_y_signos(texto: str) -> str:
    """Limpia tildes, signos y separa números pegados a palabras (ej: 'hola3' -> 'hola 3')"""
    if not texto:
        return ""
    # 1. Separar números pegados a letras (ej: 'hola3' -> 'hola 3')
    texto_separado = re.sub(r"([a-zA-Z])(\d+)", r"\1 \2", str(texto))
    # 2. Quitar tildes
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", texto_separado) if unicodedata.category(c) != "Mn")
    # 3. Quitar caracteres especiales
    limpio = re.sub(r"[^\w\s]", " ", sin_tildes)
    return " ".join(limpio.split()).lower()

SALUDOS_CORTOS = {"hola", "buenos dias", "buenas tardes", "buenas noches", "buen dia", "buenas", "hi", "hello", "holis", "saludos"}

def calcular_puntaje_coincidencia(texto_paciente: str, lista_keywords: list) -> int:
    paciente_limpio = eliminar_tildes_y_signos(texto_paciente)
    puntaje = 0
    es_mensaje_largo = len(paciente_limpio) > 15

    for kw in lista_keywords:
        kw_limpio = eliminar_tildes_y_signos(kw)
        if not kw_limpio:
            continue
        
        patron = r"\b" + re.escape(kw_limpio) + r"(?:es|s)?\b"
        if re.search(patron, paciente_limpio):
            if kw_limpio in SALUDOS_CORTOS and es_mensaje_largo:
                continue
            if kw_limpio == paciente_limpio:
                puntaje += len(kw_limpio) + 5
            else:
                puntaje += len(kw_limpio)

    return puntaje

async def verificar_silencio_humano(numero: str, ventana_horas: int = 0, instance: str = None) -> bool:
    if ventana_horas <= 0:
        return False

    url = f"{Config.SUPABASE_URL}/rest/v1/historial?numero=eq.{numero}"
    if instance:
        url += f"&instance=eq.{instance}"
    url += "&order=created_at.desc&limit=1"

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            res = await client.get(url, headers=SUPABASE_HEADERS)
            datos = res.json() if res.status_code == 200 else []
            if not datos:
                return False

            ultimo = datos[0]
            if ultimo.get("mensaje_paciente") == "[Intervención Doctor/Humano]":
                created_at_str = ultimo.get("created_at")
                if created_at_str:
                    fecha_msg = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) - fecha_msg < timedelta(hours=ventana_horas):
                        return True
            return False
        except Exception:
            return False
        
async def registrar_historial_db(numero: str, mensaje: str, respuesta: str, instance: str = None):
    url = f"{Config.SUPABASE_URL}/rest/v1/historial"
    payload = {
        "numero": str(numero),
        "mensaje_paciente": str(mensaje),
        "respuesta_enviada": str(respuesta)
    }
    if instance:
        payload["instance"] = str(instance)

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(url, json=payload, headers=SUPABASE_HEADERS)
        except Exception as e:
            print(f"❌ [Supabase Historial Error]: {e}", flush=True)


async def obtener_historial_reciente(numero: str, limite: int = 3, instance: str = None) -> str:
    url = f"{Config.SUPABASE_URL}/rest/v1/historial?numero=eq.{numero}"
    if instance:
        url += f"&instance=eq.{instance}"
    url += f"&order=created_at.desc&limit={limite}"

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            res = await client.get(url, headers=SUPABASE_HEADERS)
            datos = res.json() if res.status_code == 200 else []
            if not datos:
                return "No hay conversación previa en esta sesión."
            datos.reverse()
            interacciones = [
                f"Paciente: {reg.get('mensaje_paciente', '')}\nBot: {reg.get('respuesta_enviada', '')}"
                for reg in datos if reg.get('mensaje_paciente') != "[Intervención Doctor/Humano]"
            ]
            return "\n---\n".join(interacciones) or "No hay conversación previa."
        except Exception:
            return "No hay conversación previa."
                

async def obtener_respuesta_faq_db(texto_paciente: str, odontologo_id: str = None) -> dict | None:
    """
    Nivel 1: Atiende consultas directas en 0.1s.
    Responde instantáneamente con mensaje unificado de confirmación de agenda para cualquier
    solicitud de cita o turno, preservando la atención de costos de valoración y catálogo clínico.
    Cuenta con caché en RAM (TTL 60s) para servicios y chatbot.
    """
    ahora_ts = datetime.now(timezone.utc).timestamp()
    paciente_limpio = eliminar_tildes_y_signos(texto_paciente)

    # 🚨 DISCRIMINADOR PRIORITARIO: Intención de Cita, Agenda, Control o Asistencia (Tolerante a singulares y plurales)
    patrones_cita_control = [
        r"\bcuando me toca\b",
        r"\bmi control\b",
        r"\bel control\b",
        r"\bproximo control\b",
        r"\bproximas? citas?\b",
        r"\bproxima consulta\b",
        r"\bfecha de mi cita\b",
        r"\bfecha de mi control\b",
        r"\bconfirmar mi cita\b",
        r"\brevisar mi cita\b",
        r"\bque dia me toca\b",
        r"\bcitas? de control\b",
        r"\bcitas? de revision\b",
        r"\bcitas? de valoracion\b",
        r"\btengo citas?\b",
        r"\bhay citas?\b",
        r"\btienen?\s+(?:un\s+)?citas?\b",
        r"\btienen?\s+espacios?\b",
        r"\btienen?\s+cupos?\b",
        r"\bagendar(?:\s+una)?\s+cita\b",
        r"\bapartar(?:\s+una)?\s+cita\b",
        r"\bpedir(?:\s+una)?\s+cita\b",
        r"\bsacar(?:\s+una)?\s+cita\b",
        r"\bquiero(?:\s+una)?\s+cita\b",
        r"\bme pueden agendar\b",
        r"\bme regalan una cita\b",
        r"\bdisponibilidad(?:\s+para)?\s+hoy\b",
        r"\bcitas?\s+(?:para\s+)?hoy\b",
        r"\bpuedo ir\b",
        r"\bpuedo pasar\b",
        r"\bcuando puedo ir\b",
        r"\bque dia puedo ir\b",
        r"\ba que hora puedo ir\b",
        r"\ba que horas puedo ir\b",
        r"\ba que hora voy\b",
        r"\bque dia voy\b",
        r"\ba que hora es mi cita\b",
        r"\ba que hora tengo\b",
        r"\bme pueden atender\b",
        r"\bme puede atender\b",
        r"\bme atienden\b",
        r"\bme pueden revisar\b",
        r"\bme puede revisar\b",
        r"\bme revisan\b",
        r"\bme pueden ver\b",
        r"\bme puede ver\b",
        r"\bpara que me revisen\b",
        r"\bpara que me atiendan\b",
        r"\bpara que me miren\b",
        r"\bcuando me pueden\b"
    ]

    es_consulta_agenda = any(re.search(p, paciente_limpio) for p in patrones_cita_control)

    # Validar si es una pregunta sobre el COSTO o GRATUIDAD de la valoración (debe responder tarifa gratuita en Nivel 1)
    es_pregunta_costo_valoracion = (
        ("valoracion" in paciente_limpio or "revision" in paciente_limpio)
        and any(re.search(r"\b" + w + r"\b", paciente_limpio) for w in ["cuanto", "precio", "costo", "cobran", "vale", "cuesta", "gratis"])
    )

    # Si es solicitud de turno o disponibilidad (y NO pregunta de precio de valoración), respuesta unificada de agenda
    if es_consulta_agenda and not es_pregunta_costo_valoracion:
        print(f"📅 [Detección de Agenda/Cita] Paciente consultó turno/control/disponibilidad: '{texto_paciente}'. Respondiendo confirmación de agenda.", flush=True)
        return {
            "texto": "¡Hola! 👋 Permítenos revisar la agenda y te confirmamos a la mayor brevedad posible. 🦷📅",
            "imagen": None
        }

    async with httpx.AsyncClient(timeout=6.0) as client:
        mejor_resp_bot = None
        max_puntos_bot = 0

        mejor_resp_srv = None
        max_puntos_srv = 0
        servicios_coincidentes = []

        # 1. Búsqueda en tabla 'servicios' (Tratamientos individuales directos con caché de 60s)
        try:
            datos_srv = []
            cache_entry = CACHE_SERVICIOS_DOCTOR.get(odontologo_id)
            if cache_entry and (ahora_ts - cache_entry["timestamp"] < 60):
                datos_srv = cache_entry["datos"]
            else:
                url_srv = f"{Config.SUPABASE_URL}/rest/v1/servicios"
                if odontologo_id:
                    url_srv += f"?odontologo_id=eq.{odontologo_id}"
                res_srv = await client.get(url_srv, headers=SUPABASE_HEADERS)
                if res_srv.status_code == 200:
                    datos_srv = res_srv.json()
                    if odontologo_id:
                        CACHE_SERVICIOS_DOCTOR[odontologo_id] = {"datos": datos_srv, "timestamp": ahora_ts}

            servicios_disponibles = [
                f for f in datos_srv 
                if f.get("disponible") is True or str(f.get("disponible")).upper() == "TRUE"
            ]

            for fila in servicios_disponibles:
                palabras = (fila.get("palabras_clave", "") or "").split(",")
                nombre_servicio = fila.get("servicio", "")
                if nombre_servicio:
                    palabras.append(nombre_servicio)

                puntos = calcular_puntaje_coincidencia(texto_paciente, palabras)
                
                if puntos >= 4:
                    servicios_coincidentes.append((fila, puntos))

                if puntos > max_puntos_srv:
                    max_puntos_srv = puntos
                    servicio_nom = fila.get("servicio", "Tratamiento")
                    precio = fila.get("precio", "Según valoración")
                    desc = (fila.get("descripcion") or "").strip()
                    
                    detalle_extra = f"\n\n{desc}" if desc and len(desc) < 80 else ""

                    if "resina" in servicio_nom.lower() or "calza" in servicio_nom.lower():
                        texto_formateado = (
                            f"¡Hola! 👋 ¡Claro que sí! Las *resinas o calzas* tienen un valor *{precio}*."
                            f"{detalle_extra}\n\n"
                            f"¿Te gustaría que te agendemos una cita para revisarte? 📅🦷"
                        )
                    else:
                        texto_formateado = (
                            f"¡Hola! 👋 ¡Claro que sí! El servicio de *{servicio_nom}* tiene un valor de *{precio}*."
                            f"{detalle_extra}\n\n"
                            f"¿Te gustaría que te agendemos una cita para revisarte? 📅🦷"
                        )

                    img_srv = fila.get("link_imagen")
                    img_srv_limpia = str(img_srv).strip() if img_srv and str(img_srv).strip() and str(img_srv).strip().upper() != "NULL" else None

                    mejor_resp_srv = {
                        "texto": texto_formateado,
                        "imagen": img_srv_limpia
                    }
        except Exception as e:
            print(f"❌ [Supabase Servicios Error]: {e}", flush=True)

        # 🔀 Detección Multi-Servicio:
        servicios_distintos = []
        for fila, pts in servicios_coincidentes:
            nom_base = fila.get("servicio", "").strip()
            if not any(nom_base.lower() in s.lower() or s.lower() in nom_base.lower() for s in servicios_distintos):
                servicios_distintos.append(nom_base)

        if len(servicios_distintos) >= 2:
            print(f"🔀 [Multi-Servicio Detectado] Paciente consultó por: {servicios_distintos}. Delegando a Gemini IA...", flush=True)
            return None

        # 2. Búsqueda en tabla 'chatbot' (Ubicación, Horarios, Saludos, Cordales, Promos con caché de 60s)
        try:
            datos_bot = []
            cache_bot_entry = CACHE_CHATBOT_DOCTOR.get(odontologo_id)
            if cache_bot_entry and (ahora_ts - cache_bot_entry["timestamp"] < 60):
                datos_bot = cache_bot_entry["datos"]
            else:
                url_bot = f"{Config.SUPABASE_URL}/rest/v1/chatbot"
                if odontologo_id:
                    url_bot += f"?odontologo_id=eq.{odontologo_id}"
                res_bot = await client.get(url_bot, headers=SUPABASE_HEADERS)
                if res_bot.status_code == 200:
                    datos_bot = res_bot.json()
                    if odontologo_id:
                        CACHE_CHATBOT_DOCTOR[odontologo_id] = {"datos": datos_bot, "timestamp": ahora_ts}

            datos_activos = [f for f in datos_bot if str(f.get("estado", "")).upper() == "ACTIVO"]

            for fila in datos_activos:
                keywords = fila.get("palabras_clave", "").split(",")
                puntos = calcular_puntaje_coincidencia(texto_paciente, keywords)
                if puntos > max_puntos_bot:
                    max_puntos_bot = puntos
                    img = fila.get("link_imagen")
                    img_limpia = str(img).strip() if img and str(img).strip() and str(img).strip().upper() != "NULL" else None
                    mejor_resp_bot = {
                        "texto": fila.get("respuesta", ""),
                        "imagen": img_limpia,
                        "intencion": fila.get("intencion", "")
                    }
        except Exception as e:
            print(f"❌ [Supabase Chatbot Error]: {e}", flush=True)

        # 3. ⚖️ Desempate y Prioridad Inteligente:
        # Si coincide un servicio específico (ej: calza, resina, limpieza), nunca permitir que gane la lista general de precios
        if mejor_resp_srv and mejor_resp_bot and mejor_resp_bot.get("intencion") == "precios":
            print(f"⚡ [Supabase Match Directo] Priorizando tratamiento específico sobre lista general de precios (Puntaje srv: {max_puntos_srv})", flush=True)
            return mejor_resp_srv

        if max_puntos_bot > max_puntos_srv and max_puntos_bot >= 5:
            print(f"⚡ [Supabase Match Directo] Respondiendo 'chatbot' por mayor relevancia (Puntaje: {max_puntos_bot})", flush=True)
            return mejor_resp_bot

        if max_puntos_srv >= 4:
            print(f"⚡ [Supabase Match Directo] Respondiendo servicio individual (Puntaje: {max_puntos_srv})", flush=True)
            return mejor_resp_srv

        if max_puntos_bot >= 5 and mejor_resp_bot:
            print(f"⚡ [Supabase Match Directo] Respondiendo 'chatbot' (Puntaje: {max_puntos_bot})", flush=True)
            return mejor_resp_bot

    return None

async def consultar_gemini_ia(texto_paciente: str, numero_paciente: str, instance: str = None, odontologo_id: str = None) -> dict | None:
    """Nivel 2: Genera respuesta contextualizada ultra-rápida (<1s) con gemini-3.5-flash-lite"""
    if not Config.GEMINI_API_KEY:
        print("❌ [Gemini] ERROR: GEMINI_API_KEY no configurada", flush=True)
        return None

    ahora_ts = datetime.now(timezone.utc).timestamp()
    config_datos, servicios_datos = [], []

    # 1. Lectura desde memoria RAM (Caché 60s)
    cache_srv = CACHE_SERVICIOS_DOCTOR.get(odontologo_id)
    if cache_srv and (ahora_ts - cache_srv["timestamp"] < 60):
        servicios_datos = [
            f for f in cache_srv["datos"] 
            if f.get("disponible") is None or f.get("disponible") is True or str(f.get("disponible", "")).upper() in ("TRUE", "ACTIVO", "1", "")
        ]

    cache_cfg = CACHE_CONFIG_DOCTOR.get(odontologo_id)
    if cache_cfg and (ahora_ts - cache_cfg["timestamp"] < 60):
        config_datos = cache_cfg["datos"]

    if not config_datos or not servicios_datos:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                if not config_datos:
                    url_cfg = f"{Config.SUPABASE_URL}/rest/v1/configuracion"
                    if odontologo_id:
                        url_cfg += f"?odontologo_id=eq.{odontologo_id}"
                    res_cfg = await client.get(url_cfg, headers=SUPABASE_HEADERS)
                    if res_cfg.status_code == 200:
                        config_datos = res_cfg.json()
                        if odontologo_id:
                            CACHE_CONFIG_DOCTOR[odontologo_id] = {"datos": config_datos, "timestamp": ahora_ts}

                if not servicios_datos:
                    url_srv = f"{Config.SUPABASE_URL}/rest/v1/servicios"
                    if odontologo_id:
                        url_srv += f"?odontologo_id=eq.{odontologo_id}"
                    res_srv = await client.get(url_srv, headers=SUPABASE_HEADERS)
                    if res_srv.status_code == 200:
                        raw_srv = res_srv.json()
                        servicios_datos = [
                            f for f in raw_srv 
                            if f.get("disponible") is None or f.get("disponible") is True or str(f.get("disponible", "")).upper() in ("TRUE", "ACTIVO", "1", "")
                        ]
                        if odontologo_id:
                            CACHE_SERVICIOS_DOCTOR[odontologo_id] = {"datos": raw_srv, "timestamp": ahora_ts}
            except Exception as e:
                print(f"[Gemini] Advertencia leyendo contexto Supabase: {e}", flush=True)

    historial = await obtener_historial_reciente(numero_paciente, instance=instance)

    # 2. Contexto temporal exacto en Colombia
    import pytz
    tz_col = pytz.timezone('America/Bogota')
    ahora_col = datetime.now(tz_col)
    dias_semana_map = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}
    dia_actual_nombre = dias_semana_map[ahora_col.weekday()]
    hora_actual_str = ahora_col.strftime("%I:%M %p")

    # 3. Destilar datos del consultorio
    cfg_map = {item.get("clave"): item.get("valor") for item in config_datos if item.get("clave")}
    consultorio_nombre = cfg_map.get("nombre_consultorio") or "Consultorio Odontológico"
    
    h_semana = cfg_map.get('horario_lunes_viernes') or cfg_map.get('horarios') or "9:00 AM - 12:00 M y 2:00 PM - 6:00 PM"
    h_sabado = cfg_map.get('horario_sabado') or "9:00 AM - 12:00 M y 2:00 PM - 5:00 PM"
    h_domingo = cfg_map.get('horario_domingo') or "Cerrado"

    if ahora_col.weekday() < 5:
        horario_hoy = h_semana
    elif ahora_col.weekday() == 5:
        horario_hoy = h_sabado
    else:
        horario_hoy = h_domingo

    info_sede = f"""- Consultorio: {consultorio_nombre}
- Ubicación: {cfg_map.get('ciudad', '')}, {cfg_map.get('barrio', '')} - {cfg_map.get('direccion', '')}
- Teléfono: {cfg_map.get('telefono', '')}
- FECHA Y HORA ACTUAL: {dia_actual_nombre}, {hora_actual_str} (Hora Colombia)
- HORARIO OFICIAL DE HOY ({dia_actual_nombre}): {horario_hoy}
- Horarios Generales:
  * Lunes a Viernes: {h_semana}
  * Sábados: {h_sabado}
  * Domingos y Festivos: {h_domingo}"""

    lineas_servicios = []
    for s in servicios_datos:
        nom = s.get("servicio", "").strip()
        precio = s.get("precio", "").strip()
        if nom:
            lineas_servicios.append(f"- {nom}: {precio}")
    info_servicios = "\n".join(lineas_servicios) or "Consulte tarifas en valoración."

    # 4. Instrucción del sistema estricta
    system_instruction_text = f"""
Eres el asistente virtual amable, profesional y muy conciso de '{consultorio_nombre}'.
Tu objetivo es responder para WhatsApp en MÁXIMO 2 líneas, usando emojis amables.

DATOS DEL CONSULTORIO:
{info_sede}

TARIFAS OFICIALES EN COP:
{info_servicios}

🚨 CONSULTAS DE VARIOS TRATAMIENTOS / MULTI-SERVICIO:
Si el paciente pregunta por dos o más servicios en el mismo mensaje (ej: limpieza y calza):
1. Consolida en máximo 2 líneas las tarifas en COP de cada servicio preguntado.
2. Invita brevemente a una cita de valoración conjunta para revisarle (ej: "¿Te gustaría agendar una cita de valoración para revisarte? 📅🦷").

🚨 PROTOCOLO ESTRICTO DE CITAS Y DISPONIBILIDAD:
Si el paciente pide cita o pregunta disponibilidad para hoy o cualquier día:
1. Responde en MÁXIMO 2 líneas informando textualmente el horario oficial registrado para ese día (para hoy es: {horario_hoy}).
2. PROHIBIDO inventar términos como "jornada continua" o modificar las franjas horarias. Si hay descanso al mediodía, indícalo tal como aparece en los datos.
3. Indica amablemente que el doctor o recepcionista confirmará el turno exacto a la brevedad.
4. PROHIBIDO confirmar citas en firme o decir que hay cupos libres.
5. PROHIBIDO pedir datos personales o qué procedimiento se va a hacer.

🚨 CASOS PARTICULARES, DOLOR, URGENCIAS O CONSULTAS SIN RESPUESTA FIJA:
Si el paciente menciona dolor, molestias, inflamación, brackets rotos, caídos o sueltos, alambre que chusa, cauchitos, gomitas, elásticos o ligas intermaxilares (dudas sobre cómo ponérselos, reposición o si se le acabaron), o plantea cualquier situación clínica particular que requiera evaluación del odontólogo:
PROHIBIDO recetar medicamentos, improvisar diagnósticos o dar instrucciones de colocación de elásticos.
Responde EXACTAMENTE:
"¡Hola! 👋 Danos un momento, por favor.
Los doctores revisarán tu caso para darte una solución personalizada a la brevedad. ¡Ya te escribimos! 🦷✨"

REGLAS GENERALES:
- Mensajes cortísimos (máximo 2 líneas), humanos y directos.
- Tarifas siempre en COP según los datos oficiales.
"""

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction_text}]},
        "contents": [{"role": "user", "parts": [{"text": f"HISTORIAL PREVIO:\n{historial}\n\nMENSAJE DEL PACIENTE:\n{texto_paciente}"}]}],
        "generationConfig": {"maxOutputTokens": 150, "temperature": 0.2},
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }

    modelo = "gemini-3.5-flash-lite"
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={Config.GEMINI_API_KEY}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"🤖 [Gemini] Consultando {modelo} (Doctor: {odontologo_id})...", flush=True)
            res = await client.post(gemini_url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    texto_ia = "".join(p["text"] for p in parts if "text" in p and not p.get("thought")).strip()
                    if not texto_ia and parts and "text" in parts[-1]:
                        texto_ia = parts[-1]["text"].strip()

                    if texto_ia:
                        print(f"✅ [Gemini IA Respuesta]: {texto_ia[:60]}...", flush=True)
                        return {"texto": texto_ia, "imagen": None}
            else:
                print(f"⚠️ [Gemini {modelo} Status {res.status_code}]: {res.text}", flush=True)
        except Exception as e:
            print(f"❌ [Gemini {modelo} Exception]: {type(e).__name__} - {e}", flush=True)

    return None