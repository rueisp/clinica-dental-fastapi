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

# ============================================================
# PLANTILLAS BASE OFICIALES (CLONADAS PARA CADA DOCTOR NUEVO)
# ============================================================

PLANTILLA_SERVICIOS_BASE = [
    {
        "servicio": "Limpieza",
        "categoria": "General",
        "palabras_clave": "limpieza, profilaxis, limpieza dental, higiene, destartraje",
        "precio": "COP 50.000",
        "descripcion": "Limpieza Dental Profunda (Profilaxis). Incluye: Eliminación de placa bacteriana, pulido dental y aplicación de flúor.",
        "disponible": True
    },
    {
        "servicio": "Resina",
        "categoria": "General",
        "palabras_clave": "resina, calza, restauracion, calzas, empaste, tapadura",
        "precio": "Desde COP 100.000",
        "descripcion": "Restauración estética con resina de alta estética (calza dental). Incluye aislamiento y fotocurado.",
        "disponible": True
    },
    {
    "servicio": "Blanqueamiento en Consultorio",
    "categoria": "General",
    "palabras_clave": "blanqueamiento, blanqueamientos, blanquear, blanquear dientes, blanqueamiento en consultorio, blanqueamiento led, blanqueamiento laser, aclarar dientes",
    "precio": "COP 200.000",
    "descripcion": "Blanqueamiento / Aclaramiento Dental en consultorio. Incluye: Profilaxis previa y sesión de aclaramiento con lámpara LED.",
    "disponible": True
},
    {
        "servicio": "Ortodoncia",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia, brackets, frenillos, brakets, frenos",
        "precio": "COP 150.000",
        "descripcion": "Tratamiento de Ortodoncia Convencional (Brackets). Montaje / Cuota inicial: COP 150.000. Mensualidades: COP 70.000.",
        "disponible": True
    },
    {
        "servicio": "Extracción",
        "categoria": "General",
        "palabras_clave": "extraccion, exodoncia, sacar muela, sacada de muela, sacar muelas, sacada de muelas, sacan muelas, sacar diente, sacan dientes, sacada de diente, quitar muela,cordal, cordales, cirugia oral",
        "precio": "Desde COP 120.000",
        "descripcion": "Extracción Dental Simple (Exodoncia). Incluye: Aplicación de anestesia local, procedimiento quirúrgico y recomendaciones postoperatorias.",
        "disponible": True
    },
    {
        "servicio": "Prótesis Dental / Caja de Dientes",
        "categoria": "General",
        "palabras_clave": "protesis, caja de dientes, plancha, dientes postizos",
        "precio": "Según valoración",
        "descripcion": "Confección e instalación de prótesis dentales removibles (cajas de dientes totales o parciales).",
        "disponible": True
    },
    {
        "servicio": "Endodoncia",
        "categoria": "Especialidad",
        "palabras_clave": "endodoncia, tratamiento de conductos, matado de nervio, matar el nervio",
        "precio": "Según valoración",
        "descripcion": "Tratamiento de conductos (Endodoncia) realizado por especialista para salvar la pieza dental natural.",
        "disponible": True
    },
    {
        "servicio": "Microdiseño Dental",
        "categoria": "Estética",
        "palabras_clave": "microdiseno, micro diseno, microdiseño, diseno de sonrisa, diseño de sonrisa, bordes incisales",
        "precio": "COP 700.000",
        "descripcion": "Tratamiento de Microdiseño Dental con bordes incisales en resina de alta estética. Armoniza forma y alineación sin desgaste dental severo.",
        "disponible": True
    },
    {
        "servicio": "Radiografías",
        "categoria": "Diagnóstico",
        "palabras_clave": "radiografia, radiografias, rayos x, rx, tomografia, panoramica",
        "precio": "No disponible en sede",
        "descripcion": "IMPORTANTE: No realizamos radiografías ni toma de Rayos X en el consultorio. Remitimos al centro radiológico especializado.",
        "disponible": True
    },
    {
        "servicio": "Cementación de Corona Caída",
        "categoria": "General",
        "palabras_clave": "cementar corona, pegar corona, se me cayo una corona, corona despegada",
        "precio": "Desde COP 80.000",
        "descripcion": "Cementado o recementado de corona dental previa que se le ha caído al paciente.",
        "disponible": True
    },
    {
        "servicio": "Corona Dental Nueva",
        "categoria": "Prótesis / Especialidad",
        "palabras_clave": "corona nueva, corona dental, funda dental, zirconio, porcelana",
        "precio": "Desde COP 1.200.000",
        "descripcion": "Confección e instalación de prótesis fija tipo corona dental nueva. En porcelana o zirconio de alta resistencia.",
        "disponible": True
    },
    {
        "servicio": "Retenedores de Ortodoncia",
        "categoria": "Ortodoncia",
        "palabras_clave": "retenedor, retenedores, placas de ortodoncia, essix",
        "precio": "Fijo: COP 200.000 | Placas: COP 250.000",
        "descripcion": "Dispositivos para mantener los dientes en posición tras finalizar la ortodoncia.",
        "disponible": True
    },
    {
        "servicio": "Placa de Bruxismo",
        "categoria": "General / Protección",
        "palabras_clave": "placa de bruxismo, bruxismo, placa miorrelajante, apretar dientes, rechinar dientes",
        "precio": "Acetato: COP 180.000 | Rígida: COP 250.000",
        "descripcion": "Placa de protección para evitar el desgaste dental por el hábito involuntario de apretar o rechinar los dientes.",
        "disponible": True
    },
    {
        "servicio": "Ortodoncia Convencional",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia convencional, brackets tradicionales, brackets metalicos",
        "precio": "Montaje: COP 150.000 | Mensualidad: COP 70.000",
        "descripcion": "Ortodoncia con brackets tradicionales metálicos. Montaje superior e inferior con valoración incluida.",
        "disponible": True
    },
    {
        "servicio": "Ortodoncia Autoligados",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia autoligados, brackets autoligados, sin ligas",
        "precio": "Montaje: COP 350.000 | Mensualidad: COP 90.000",
        "descripcion": "Ortodoncia con brackets de autoligado (tecnología sin ligas). Tratamientos más rápidos y con menor fricción.",
        "disponible": True
    },
    {
        "servicio": "Blanqueamiento Casero (Kit Promoción)",
        "categoria": "General",
        "palabras_clave": "blanqueamiento casero, aclaramiento casero, kit de blanqueamiento",
        "precio": "COP 100.000",
        "descripcion": "¡Promoción de Blanqueamiento Dental Casero! Incluye: 2 jeringas de gel aclarador y cubetas personalizadas.",
        "disponible": True
    }
]

def obtener_plantilla_configuracion(doctor_nombre: str = "", consultorio_nombre: str = "", telefono: str = "") -> dict:
    nombre_clinica = consultorio_nombre or (f"Consultorio Dr. {doctor_nombre}".strip() if doctor_nombre else "Consultorio Odontológico")
    tel = telefono or "[Tu Número de WhatsApp]"
    return {
        "nombre_consultorio": nombre_clinica,
        "ciudad": "[Tu Ciudad, Ej: Bogotá / Medellín]",
        "barrio": "[Tu Barrio / Sector]",
        "direccion": "[Dirección de tu Consultorio, Ej: Calle 123 # 45-67, Consultorio 201]",
        "telefono": tel,
        "telefonos": tel,
        "whatsapp": tel,
        "email": "contacto@tuconsultorio.com",
        "horarios": "Lunes a Viernes: 9:00 AM - 12:00 PM y 2:00 PM - 6:00 PM | Sábados: 9:00 AM - 5:00 PM",
        "horario_lunes_viernes": "9:00 AM - 12:00 M / 2:00 PM - 6:00 PM",
        "horario_sabado": "9:00 AM - 12:00 M / 2:00 PM - 5:00 PM",
        "horario_domingo": "Cerrado",
        "mensaje_bienvenida": f"¡Hola! 👋 Gracias por comunicarte con {nombre_clinica}. ¿En qué te podemos ayudar hoy?",
        "mensaje_despedida": "¡Será un gusto atenderte! 😊"
    }

PLANTILLA_CHATBOT_BASE = [
    {
        "intencion": "saludo",
        "palabras_clave": "hola, buenos dias, buenas tardes, buenas noches, buen dia, buendia, buena tarde, buenas, como esta, como estan, hi, hello, holis, que tal, saludos",
        "respuesta": "¡Hola! 🦷 Gracias por comunicarte con nuestro consultorio odontológico. ¿En qué te podemos colaborar el día de hoy?",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "precios",
        "palabras_clave": "precios, lista de precios, valores de servicios, cotizacion general, precios generales, presupuesto general, cuanto vale, que vale, cuanto cuesta, que cuesta, cuanto cobran, costo, valor, tarifas",
        "respuesta": "Nuestros Precios Principales: ✨ Limpieza: COP 50.000 | 💎 Resinas: Desde COP 100.000 | 🌟 Blanqueamiento: COP 200.000 | 🦷 Extracciones: Desde COP 120.000 | 📐 Ortodoncia: Inicial COP 150.000.\n\n¿Te gustaría agendar una cita de valoración?",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "horarios",
        "palabras_clave": "horarios, horario, hora, horas, atencion, horario de atencion, estan abiertos, abren, cierran, que dias atienden, que dias abren, a que hora abren",
        "respuesta": "📅 *Horarios de Atención:*\n• Lunes a Viernes: 9:00 AM - 12:00 PM y 2:00 PM - 6:00 PM\n• Sábados: 9:00 AM - 12:00 PM y 2:00 PM - 5:00 PM\n• Domingos y Festivos: Cerrado.",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "ubicacion",
        "palabras_clave": "direccion, ubicacion, ubicados, donde estan, donde quedan, sede, local, barrio, ciudad, en que parte estan, como llego, direccion del consultorio",
        "respuesta": "📍 *NUESTRA UBICACIÓN:*\nNos encontramos ubicados en [Dirección de tu Consultorio, Ej: Calle 123 # 45-67].\n\n¡Será un gusto atenderte! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "despedida",
        "palabras_clave": "gracias, muchas gracias, mil gracias, perfecto, excelente, listo, dale, de acuerdo, chao, hasta luego, adios, entendido, genial, ok, ok gracias",
        "respuesta": "¡Con mucho gusto! 😊 En nuestro consultorio estamos para servirte. ¡Que tengas un excelente día! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "metodos_pago",
        "palabras_clave": "metodos de pago, metodo de pago, como puedo pagar, como se paga, puedo pagar con, formas de pago, forma de pago, medios de pago, medios pago, nequi, bancolombia, tarjeta, efectivo",
        "respuesta": "💳 *MÉTODOS DE PAGO EN CONSULTORIO:*\n• Efectivo\n• Transferencias (Nequi, Bancolombia)\n• Tarjetas débito y crédito.\n\n¡Facilidades para que cuides tu sonrisa! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    }
]

# ============================================================
# FUNCIONES DE INICIALIZACIÓN MULTI-TENANT
# ============================================================

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
    """Puebla automáticamente las tablas 'configuracion', 'servicios' y 'chatbot' para un doctor si están vacías"""
    if not user_id:
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Verificar si ya tiene configuración
            url_chk = f"{Config.SUPABASE_URL}/rest/v1/configuracion?odontologo_id=eq.{user_id}&limit=1"
            res_chk = await client.get(url_chk, headers=SUPABASE_HEADERS)
            if res_chk.status_code == 200 and len(res_chk.json()) > 0:
                return  # Ya está configurado

            print(f"🌱 [Bot Multi-Tenant] Inicializando plantilla base para doctor ID: {user_id}", flush=True)

            # 2. Poblar 'configuracion'
            cfg_dict = obtener_plantilla_configuracion(doctor_nombre, consultorio_nombre, telefono)
            cfg_payload = [
                {"odontologo_id": user_id, "clave": k, "valor": str(v)}
                for k, v in cfg_dict.items()
            ]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/configuracion", json=cfg_payload, headers=SUPABASE_HEADERS)

            # 3. Poblar 'servicios'
            srv_payload = [
                {**item, "odontologo_id": user_id}
                for item in PLANTILLA_SERVICIOS_BASE
            ]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/servicios", json=srv_payload, headers=SUPABASE_HEADERS)

            # 4. Poblar 'chatbot'
            bot_payload = [
                {**item, "odontologo_id": user_id}
                for item in PLANTILLA_CHATBOT_BASE
            ]
            await client.post(f"{Config.SUPABASE_URL}/rest/v1/chatbot", json=bot_payload, headers=SUPABASE_HEADERS)

            print(f"✅ [Bot Multi-Tenant] Plantilla inicializada con éxito para doctor ID: {user_id}", flush=True)
        except Exception as e:
            print(f"❌ [Bot Multi-Tenant Init Error]: {e}", flush=True)

# ============================================================
# LÓGICA DE TEXTO Y SILENCIO HUMANO
# ============================================================

def eliminar_tildes_y_signos(texto: str) -> str:
    """Limpia tildes, signos de interrogación y caracteres especiales"""
    if not texto:
        return ""
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", str(texto)) if unicodedata.category(c) != "Mn")
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

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            await client.post(url, json=payload, headers=SUPABASE_HEADERS)
        except Exception as e:
            print(f"❌ [Supabase Historial Error]: {e}", flush=True)

async def obtener_historial_reciente(numero: str, limite: int = 3, instance: str = None) -> str:
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

# ============================================================
# JERARQUÍA DE RESPUESTAS FILTRADA POR ODONTÓLOGO
# ============================================================

async def obtener_respuesta_faq_db(texto_paciente: str, odontologo_id: str = None) -> dict | None:
    """
    Evalúa 'chatbot' y 'servicios' comparando el puntaje de coincidencia.
    Si el paciente nombra un tratamiento específico, gana 'servicios'.
    Si hace una pregunta general (precios, horarios, ubicación), gana 'chatbot'.
    """
    async with httpx.AsyncClient(timeout=6.0) as client:
        mejor_resp_bot = None
        max_puntos_bot = 0

        mejor_resp_srv = None
        max_puntos_srv = 0

        # 1. Búsqueda en tabla 'chatbot' (Menú general, Ubicación, Promos)
        try:
            url_bot = f"{Config.SUPABASE_URL}/rest/v1/chatbot"
            if odontologo_id:
                url_bot += f"?odontologo_id=eq.{odontologo_id}"
            res_bot = await client.get(url_bot, headers=SUPABASE_HEADERS)
            datos_bot = res_bot.json() if res_bot.status_code == 200 else []
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
                        "imagen": img_limpia
                    }
        except Exception as e:
            print(f"❌ [Supabase Chatbot Error]: {e}", flush=True)

        # 2. Búsqueda en tabla 'servicios' (Tratamientos específicos del doctor)
        try:
            url_srv = f"{Config.SUPABASE_URL}/rest/v1/servicios"
            if odontologo_id:
                url_srv += f"?odontologo_id=eq.{odontologo_id}"
            res_srv = await client.get(url_srv, headers=SUPABASE_HEADERS)
            datos_srv = res_srv.json() if res_srv.status_code == 200 else []
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
        except Exception as e:
            print(f"❌ [Supabase Servicios Error]: {e}", flush=True)

        # 3. Comparación inteligente de mayor relevancia
        # Si el tratamiento específico tiene igual o mayor puntaje que la pregunta general, gana el tratamiento
        if max_puntos_srv >= 3 and max_puntos_srv >= max_puntos_bot:
            print(f"⚡ [Supabase Match] Coincidencia específica en 'servicios' (Puntaje: {max_puntos_srv})", flush=True)
            return mejor_resp_srv
        elif max_puntos_bot >= 3:
            print(f"⚡ [Supabase Match] Coincidencia en 'chatbot' (Puntaje: {max_puntos_bot})", flush=True)
            return mejor_resp_bot

    return None

async def consultar_gemini_ia(texto_paciente: str, numero_paciente: str, instance: str = None, odontologo_id: str = None) -> dict | None:
    """Nivel 2: Genera respuesta contextualizada con datos exclusivos del odontólogo"""
    if not Config.GEMINI_API_KEY:
        print("❌ [Gemini] ERROR: GEMINI_API_KEY no configurada", flush=True)
        return None

    config_datos, servicios_datos = [], []
    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            url_cfg = f"{Config.SUPABASE_URL}/rest/v1/configuracion"
            if odontologo_id:
                url_cfg += f"?odontologo_id=eq.{odontologo_id}"
            res_cfg = await client.get(url_cfg, headers=SUPABASE_HEADERS)
            if res_cfg.status_code == 200:
                config_datos = res_cfg.json()

            url_srv = f"{Config.SUPABASE_URL}/rest/v1/servicios"
            if odontologo_id:
                url_srv += f"?odontologo_id=eq.{odontologo_id}"
            res_srv = await client.get(url_srv, headers=SUPABASE_HEADERS)
            if res_srv.status_code == 200:
                servicios_datos = [
                    f for f in res_srv.json() 
                    if f.get("disponible") is None or f.get("disponible") is True or str(f.get("disponible", "")).upper() in ("TRUE", "ACTIVO", "1", "")
                ]
        except Exception as e:
            print(f"[Gemini] Advertencia leyendo contexto Supabase: {e}", flush=True)

    historial = await obtener_historial_reciente(numero_paciente, instance=instance)

    # Extraer nombre del consultorio desde la configuración
    consultorio_nombre = "Consultorio Odontológico"
    for item in config_datos:
        if item.get("clave") == "nombre_consultorio":
            consultorio_nombre = item.get("valor", consultorio_nombre)
            break

    prompt = f"""
Eres el asistente virtual empático, claro y profesional de '{consultorio_nombre}'.
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
- Configuración, Horarios y Ubicación: {config_datos}
- Catálogo de Servicios y Tarifas: {servicios_datos}

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

    # Jerarquía de modelos activos oficiales con fallback automático
    modelos = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"]

    for modelo in modelos:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={Config.GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=12.0) as client:
            try:
                print(f"🤖 [Gemini] Intentando con {modelo} (Doctor: {odontologo_id})...", flush=True)
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