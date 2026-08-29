# backend_fastapi/services/bot_engine_service.py
import re
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

def eliminar_tildes_y_signos(texto: str) -> str:
    """Limpia tildes, signos de interrogación y caracteres especiales"""
    if not texto:
        return ""
    # Quitar tildes
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", str(texto)) if unicodedata.category(c) != "Mn")
    # Quitar signos de puntuación y dejar solo letras, números y espacios
    limpio = re.sub(r"[^\w\s]", " ", sin_tildes)
    return " ".join(limpio.split()).lower()

SALUDOS_CORTOS = {"hola", "buenos dias", "buenas tardes", "buenas noches", "buen dia", "buenas", "hi", "hello", "holis", "saludos"}

def calcular_puntaje_coincidencia(texto_paciente: str, lista_keywords: list) -> int:
    """
    Calcula coincidencia tolerando plurales y singulares
    (ej: 'calza' coincide con 'calza' y 'calzas', 'extraccion' con 'extracciones')
    """
    paciente_limpio = eliminar_tildes_y_signos(texto_paciente)
    puntaje = 0
    es_mensaje_largo = len(paciente_limpio) > 15

    for kw in lista_keywords:
        kw_limpio = eliminar_tildes_y_signos(kw)
        if not kw_limpio:
            continue
        
        # Regex que acepta la palabra exacta o con terminación de plural (s o es)
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
    """Verifica si el doctor intervino recientemente (0h para pruebas)"""
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
    """Registra la interacción en la tabla 'historial' de Supabase asociando la instancia del doctor"""
    url = f"{Config.SUPABASE_URL}/rest/v1/historial"
    payload = {
        "numero": str(numero),
        "mensaje_paciente": str(mensaje),
        "respuesta_enviada": str(respuesta)
    }
    if instance:
        payload["instance"] = str(instance)

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            await client.post(url, json=payload, headers=SUPABASE_HEADERS)
        except Exception as e:
            print(f"❌ [Supabase Historial Error]: {e}", flush=True)

async def obtener_historial_reciente(numero: str, limite: int = 3, instance: str = None) -> str:
    """Obtiene las últimas interacciones del paciente para contexto de IA por doctor"""
    url = f"{Config.SUPABASE_URL}/rest/v1/historial?numero=eq.{numero}"
    if instance:
        url += f"&instance=eq.{instance}"
    url += f"&order=created_at.desc&limit={limite}"

    async with httpx.AsyncClient(timeout=6.0) as client:
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

async def obtener_respuesta_faq_db(texto_paciente: str) -> dict | None:
    """
    Jerarquía de Supabase:
    1. Tabla 'chatbot': Promociones y afiches con imagen (Prioridad visual).
    2. Tabla 'servicios': Catálogo de tratamientos y tarifas clínicas.
    """
    async with httpx.AsyncClient(timeout=6.0) as client:
        # 1. Búsqueda en tabla 'chatbot' (Afiches y Promociones)
        try:
            url_bot = f"{Config.SUPABASE_URL}/rest/v1/chatbot"
            res_bot = await client.get(url_bot, headers=SUPABASE_HEADERS)
            datos_bot = res_bot.json() if res_bot.status_code == 200 else []
            datos_activos = [f for f in datos_bot if str(f.get("estado", "")).upper() == "ACTIVO"]

            mejor_resp_bot = None
            max_puntos_bot = 0

            for fila in datos_activos:
                keywords = fila.get("palabras_clave", "").split(",")
                puntos = calcular_puntaje_coincidencia(texto_paciente, keywords)
                if puntos > max_puntos_bot:
                    max_puntos_bot = puntos
                    img = fila.get("link_imagen")
                    img_limpia = str(img).strip() if img and str(img).strip() and str(img).strip().upper() != "NULL" else None
                    mejor_resp_bot = {
                        "texto": fila.get("respuesta", ""),
                        "imagen": img_limpia
                    }

            if max_puntos_bot >= 3 and mejor_resp_bot:
                print(f"⚡ [Supabase Match] Coincidencia en 'chatbot' (Puntaje: {max_puntos_bot} | Imagen: {bool(mejor_resp_bot.get('imagen'))})", flush=True)
                return mejor_resp_bot
        except Exception as e:
            print(f"❌ [Supabase Chatbot Error]: {e}", flush=True)

        # 2. Búsqueda en tabla 'servicios' (Tratamientos y Tarifas)
        try:
            url_srv = f"{Config.SUPABASE_URL}/rest/v1/servicios"
            res_srv = await client.get(url_srv, headers=SUPABASE_HEADERS)
            datos_srv = res_srv.json() if res_srv.status_code == 200 else []
            servicios_disponibles = [
                f for f in datos_srv 
                if f.get("disponible") is True or str(f.get("disponible")).upper() == "TRUE"
            ]

            mejor_resp_srv = None
            max_puntos_srv = 0

            for fila in servicios_disponibles:
                palabras = (fila.get("palabras_clave", "") or "").split(",")
                nombre_servicio = fila.get("servicio", "")
                if nombre_servicio:
                    palabras.append(nombre_servicio)

                puntos = calcular_puntaje_coincidencia(texto_paciente, palabras)
                if puntos > max_puntos_srv:
                    max_puntos_srv = puntos
                    
                    servicio_nom = fila.get("servicio", "Tratamiento")
                    precio = fila.get("precio", "Según valoración")
                    desc = fila.get("descripcion", "")

                    texto_formateado = (
                        f"🦷 *{servicio_nom}*\n\n"
                        f"📝 {desc}\n\n"
                        f"💰 *Precio:* {precio}\n\n"
                        f"¿Te gustaría agendar una cita de valoración con el doctor para este tratamiento? 📅"
                    )

                    mejor_resp_srv = {
                        "texto": texto_formateado,
                        "imagen": None
                    }

            if max_puntos_srv >= 3 and mejor_resp_srv:
                print(f"⚡ [Supabase Match] Coincidencia en 'servicios' (Puntaje: {max_puntos_srv})", flush=True)
                return mejor_resp_srv
        except Exception as e:
            print(f"❌ [Supabase Servicios Error]: {e}", flush=True)

    return None

async def consultar_gemini_ia(texto_paciente: str, numero_paciente: str, instance: str = None) -> dict | None:
    """Genera una respuesta contextualizada con respaldo automático de modelos Gemini"""
    if not Config.GEMINI_API_KEY:
        print("❌ [Gemini] ERROR: GEMINI_API_KEY no configurada", flush=True)
        return None

    # Leer configuración y catálogo de servicios de Supabase
    config_datos, servicios_datos = [], []
    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            res_cfg = await client.get(f"{Config.SUPABASE_URL}/rest/v1/configuracion", headers=SUPABASE_HEADERS)
            if res_cfg.status_code == 200:
                config_datos = res_cfg.json()

            res_srv = await client.get(f"{Config.SUPABASE_URL}/rest/v1/servicios", headers=SUPABASE_HEADERS)
            if res_srv.status_code == 200:
                servicios_datos = [
                    f for f in res_srv.json() 
                    if f.get("disponible") is None or f.get("disponible") is True or str(f.get("disponible", "")).upper() in ("TRUE", "ACTIVO", "1", "")
                ]
        except Exception as e:
            print(f"[Gemini] Advertencia leyendo contexto Supabase: {e}", flush=True)

    historial = await obtener_historial_reciente(numero_paciente, instance=instance)

    prompt = f"""
Eres el asistente virtual empático, claro y profesional de 'Odontología Rueis Pitre'.
Tu objetivo es responder inquietudes de los pacientes de forma clara, respetuosa y breve con emojis para WhatsApp.

DICCIONARIO ODONTOLÓGICO Y SINÓNIMOS POPULARES:
- "Sacar muela / sacan muelas / cordal / dolor de muela / exodoncia": Extracciones dentales y cirugías orales.
- "Calza / calzas / tapadura / parche / restauración": Resinas dentales.
- "Limpieza / quitar sarro / profilaxis": Profilaxis dental.
- "Matar el nervio / conducto": Endodoncia.
- "Frenillos / alambres / brackets": Ortodoncia.
- "Blanqueamiento": Aclaramiento dental.
- "Diseño de sonrisa / microdiseño": Microdiseño Dental estético.

DATOS OFICIALES DEL CONSULTORIO (LEÍDOS EN VIVO DESDE SUPABASE):
- Configuración y Teléfonos: {config_datos}
- Catálogo de Servicios y Tarifas: {servicios_datos}
- Horarios de Atención: Lunes a Viernes (9:00 AM - 12:00 PM | 2:00 PM - 6:00 PM), Sábados (9:00 AM - 12:00 PM | 2:00 PM - 5:00 PM). Domingos y Festivos: Cerrado.
- Dirección: Cra 84 # 42C-19, Barrio Simón Bolívar, La América.

HISTORIAL RECIENTE CON ESTE PACIENTE:
{historial}

🚨 PROTOCOLO DE SEGURIDAD Y CASOS SENSIBLES (OBLIGATORIO):
Si el paciente menciona alguna de las siguientes situaciones:
a) Dolor severo/intolerable, inflamación facial, sangrado o traumatismo por golpe.
b) Complicaciones después de una cirugía o extracción reciente.
c) Pide que le formules medicamentos, analgésicos, antibióticos o dosis específicas.
d) Manifiesta una queja, reclamo o inconformidad con un tratamiento previo.

👉 ACCIÓN OBLIGATORIA PARA CASOS SENSIBLES:
- NO improvises explicaciones clínicas largas ni posibles causas teóricas.
- Prohíbete terminantemente recetar o sugerir medicamentos o dosis (recomienda no automedicarse).
- Responde con un mensaje corto, empático y tranquilizador (máximo 3 líneas) indicándole que el caso ha sido marcado como prioritario y que el doctor se comunicará directamente con él a la mayor brevedad. Invítalo a acudir a urgencias médicas si es un sangrado incontrolable o inflamación que comprometa la respiración.

REGLAS GENERALES:
1. Revisa siempre el Catálogo de Servicios para dar los precios y descripciones exactas.
2. Si el paciente pide agendar cita, solicítale su nombre completo, el tratamiento de interés y la jornada de preferencia (mañana o tarde).
3. No des diagnósticos definitivos. Invita a valoración presencial.
4. Respuestas muy cortas (máximo 3 a 4 párrafos breves), profesionales y con emojis para WhatsApp.

CONSULTA DEL PACIENTE:
{texto_paciente}
"""

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }

    # Jerarquía de modelos con fallback en caso de 503 (alta demanda)
    modelos = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"]

    for modelo in modelos:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={Config.GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=12.0) as client:
            try:
                print(f"🤖 [Gemini] Intentando con {modelo}...", flush=True)
                res = await client.post(gemini_url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            texto_ia = parts[0]["text"].strip()
                            print(f"✅ [Gemini IA Respuesta ({modelo})]: {texto_ia[:60]}...", flush=True)
                            return {"texto": texto_ia, "imagen": None}
                else:
                    print(f"⚠️ [Gemini {modelo} Status {res.status_code}]: {res.text}", flush=True)
            except Exception as e:
                print(f"❌ [Gemini {modelo} Exception]: {type(e).__name__} - {e}", flush=True)

    return None