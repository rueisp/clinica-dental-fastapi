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

# ============================================================
# PLANTILLAS BASE OFICIALES (CLONADAS PARA CADA DOCTOR NUEVO)
# ============================================================

PLANTILLA_SERVICIOS_BASE = [
    {
        "servicio": "Limpieza",
        "categoria": "General",
        "palabras_clave": "limpieza, limpiezas, profilaxis, profilaxis dental, limpieza dental, higiene oral, higiene dental, destartraje, detartraje, tartrectomia, limpiarme los dientes, limpiar dientes, limpiarme la boca, hacerme la limpieza, hacerme una limpieza, hacerme limpieza, hacerse una limpieza, quitar sarro, quitarme el sarro, limpieza de sarro, eliminar sarro, sacar sarro, limpieza profunda, limpieza con ultrasonido, limpieza ultrasonido, lavado dental, lavado de dientes",
        "precio": "COP 50.000",
        "descripcion": "Limpieza Dental Profunda (Profilaxis). Incluye: Eliminación de placa bacteriana, pulido dental y aplicación de flúor.",
        "disponible": True
    },
    {
        "servicio": "Resina",
        "categoria": "General",
        "palabras_clave": "resina, resinas, calza, calzas, calzar, calzarme, calzarse, calzada, calzadas, calzarle, tapadura, tapaduras, tapar muela, taparme una muela, taparme muela, tapar, taparme, empaste, empastes, empastar, restauracion, restauraciones, arreglar muela, curar muela, obturacion, obturaciones, obturar, resina dental, resinas dentales, calza dental, calzas dentales, calzar diente, calzar dientes, tapar diente, tapar dientes",
        "precio": "Desde COP 100.000",
        "descripcion": "Restauración estética con resina de alta estética (calza dental). Incluye aislamiento y fotocurado.",
        "disponible": True
    },
    {
        "servicio": "Blanqueamiento en Consultorio",
        "categoria": "General",
        "palabras_clave": "blanqueamiento, blanqueamientos, blanqueamiento dental, blanqueamiento en consultorio, blanqueamiento clinico, blanqueamiento led, blanqueamiento laser, blanqueamiento con lampara, blanqueamiento con luz, blanquear, blanquearme, blanquearse, blanquear dientes, blanquear los dientes, blanquearme los dientes, blanquearme la sonrisa, aclaramiento, aclaramiento dental, aclaramiento en consultorio, aclarar dientes, aclararme los dientes, aclarar los dientes, hacerme un blanqueamiento, hacerme el blanqueamiento, blanquear sonrisa, dientes blancos, poner los dientes blancos",
        "precio": "COP 200.000",
        "descripcion": "Blanqueamiento / Aclaramiento Dental en consultorio. Incluye: Profilaxis previa y sesión de aclaramiento con lámpara LED.",
        "disponible": True
    },
    {
        "servicio": "Ortodoncia",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia, ortodoncias, brackets, bracket, breke, brecke, breque, brakets, braket, braquets, braquet, frenillos, frenillo, frenos, freno, montaje de brackets, montaje brackets, montaje de ortodoncia, montaje ortodoncia, cuota inicial brackets, cuota inicial ortodoncia, mensualidad de brackets, mensualidad brackets, mensualidad ortodoncia, mensualidades de brackets, control de ortodoncia, controles de ortodoncia, control de brackets, ponerme brackets, ponerme los brackets, ponerme frenillos, ponerme los frenillos, alinear dientes, alinear los dientes, enderezar dientes, enderezar los dientes, tratamiento de ortodoncia, cita de ortodoncia",
        "precio": "COP 150.000",
        "descripcion": "Tratamiento de Ortodoncia Convencional (Brackets). Montaje / Cuota inicial: COP 150.000. Mensualidades: COP 70.000.",
        "disponible": True
    },
    {
        "servicio": "Extracción",
        "categoria": "General",
        "palabras_clave": "extraccion, extracciones, exodoncia, sacar muela, sacada de muela, sacar muelas, sacada de muelas, sacan muelas, sacar diente, sacan dientes, sacada de diente, quitar muela, quitar muelas, sacarme una muela, sacarme muela, sacarme un diente",
        "precio": "Desde COP 120.000",
        "descripcion": "Aplica para extracciones dentales simples.",
        "disponible": True
    },
    {
        "servicio": "Prótesis Dental / Caja de Dientes",
        "categoria": "General",
        "palabras_clave": "protesis, protesis dental, protesis dentales, protesis removible, protesis removibles, protesis total, protesis parcial, protesis flexible, protesis flexibles, protesis en acrilico, valplast, flexite, caja de dientes, cajas de dientes, caja dental, plancha dental, planchas dentales, plancha, planchas, dentadura, dentaduras, dentadura postiza, dentaduras postizas, dientes postizos, diente postizo, muela postiza, muelas postizas, chapeta, chapetas, chapeta dental, dientes de quitar y poner, diente de quitar y poner, puente dental, puentes dentales",
        "precio": "Según valoración",
        "descripcion": "Confección e instalación de prótesis dentales removibles (cajas de dientes totales o parciales).",
        "disponible": True
    },
    {
        "servicio": "Endodoncia",
        "categoria": "Especialidad",
        "palabras_clave": "endodoncia, endodoncias, tratamiento de conducto, tratamiento de conductos, tratamiento conducto, tratamiento conductos, conducto, conductos, conducto dental, conductos dentales, conducto en muela, conducto muela, conducto en diente, conducto diente, matar nervio, matar el nervio, matarme el nervio, matada de nervio, matado de nervio, sacar el nervio, sacarme el nervio, sacar nervio, extraccion del nervio, extraccion de nervio, limpiar conducto, limpiar conductos, limpieza de conducto, terapia de conducto, pulpotomia, pulpectomia",
        "precio": "Según valoración",
        "descripcion": "Tratamiento de conductos (Endodoncia) realizado por especialista para salvar la pieza dental natural.",
        "disponible": True
    },
    {
        "servicio": "Microdiseño Dental",
        "categoria": "Estética",
        "palabras_clave": "microdiseno, microdisenos, microdiseño, microdiseños, micro diseno, micro diseño, diseno de sonrisa, diseño de sonrisa, disenos de sonrisa, diseños de sonrisa, diseno de sonrisa en resina, diseño de sonrisa en resina, diseno en resina, diseño en resina, bordes incisales, borde incisal, bordes en resina, bordes dentales, borde dental, carillas en resina, carilla en resina, carillas dentales, carilla dental, carillas de resina, carillas, emparejar dientes, emparejar los dientes, perfilar dientes, perfilar los dientes, nivelar dientes, estetica dental",
        "precio": "COP 700.000",
        "descripcion": "Tratamiento de Microdiseño Dental con bordes incisales en resina de alta estética. Armoniza forma y alineación sin desgaste dental severo.",
        "disponible": True
    },
    {
        "servicio": "Radiografías",
        "categoria": "Diagnóstico",
        "palabras_clave": "radiografia, radiografias, radiografia dental, radiografias dentales, rayos x, rayo x, rayosx, rx, panoramica, panoramicas, radiografia panoramica, radiografias panoramicas, periapical, periapicales, radiografia periapical, radiografias periapicales, tomografia, tomografias, tac dental, placa de rayos x, placas de rayos x, toman radiografias, tomar radiografia, hacen radiografias, sacar radiografia, sacan radiografias, toman rayos x, sacar rayos x, sacan rayos x, hacen rayos x",
        "precio": "No disponible en sede",
        "descripcion": "IMPORTANTE: No realizamos radiografías ni toma de Rayos X en el consultorio. Remitimos al centro radiológico especializado.",
        "disponible": True
    },
    {
        "servicio": "Cementación de Corona Caída",
        "categoria": "General",
        "palabras_clave": "cementar corona, cementar una corona, cementacion de corona, cementado de corona, recementar corona, recementado de corona, pegar corona, pegarme la corona, pegarme una corona, pegar una corona, se me cayo una corona, se me cayo la corona, se me despego la corona, se me despego una corona, corona despegada, corona suelta, corona floja, pegar funda, pegar una funda, se me cayo la funda, se me cayo una funda, funda despegada, funda suelta, se me cayo un perno, pegar perno",
        "precio": "Desde COP 80.000",
        "descripcion": "Cementado o recementado de corona dental previa que se le ha caído al paciente.",
        "disponible": True
    },
    {
        "servicio": "Corona Dental Nueva",
        "categoria": "Prótesis / Especialidad",
        "palabras_clave": "corona, coronas, corona dental, coronas dentales, corona nueva, coronas nuevas, corona dental nueva, funda dental, fundas dentales, funda para diente, fundas para dientes, corona de porcelana, coronas de porcelana, corona en porcelana, coronas en porcelana, corona de zirconio, coronas de zirconio, corona en zirconio, coronas en zirconio, circonio, corona en circonio, corona de ceramica, coronas de ceramica, corona metal porcelana, protesis fija, protesis fija dental, diente de porcelana, muela de porcelana, diente en zirconio, muela en zirconio, ponerme una corona, hacerme una corona, mandar a hacer una corona",
        "precio": "Desde COP 1.200.000",
        "descripcion": "Confección e instalación de prótesis fija tipo corona dental nueva. En porcelana o zirconio de alta resistencia.",
        "disponible": True
    },
    {
        "servicio": "Retenedores de Ortodoncia",
        "categoria": "Ortodoncia",
        "palabras_clave": "retenedor, retenedores, retenedor dental, retenedores dentales, retenedores de ortodoncia, retenedor de ortodoncia, placas de ortodoncia, placa de ortodoncia, placas de contencion, placa de contencion, retenedores transparentes, retenedor transparente, placas transparentes, placa transparente, essix, retenedor essix, retenedores essix, hawley, retenedor hawley, placa hawley, retenedor fijo, retenedores fijos, alambre fijo, mandar a hacer retenedores, cambiar retenedores, se me rompio el retenedor, se me perdio el retenedor, se me partio el retenedor",
        "precio": "Fijo: COP 200.000 | Placas: COP 250.000",
        "descripcion": "Dispositivos para mantener los dientes en posición tras finalizar la ortodoncia.",
        "disponible": True
    },
    {
        "servicio": "Placa de Bruxismo",
        "categoria": "General / Protección",
        "palabras_clave": "placa de bruxismo, placas de bruxismo, bruxismo, bruxismos, placa para bruxismo, placa miorrelajante, placa neuromiorrelajante, placa oclusal, ferula de descarga, ferula dental, ferula para bruxismo, ferula nocturna, guarda dental, guardas dentales, guarda nocturna, protector nocturno, placa nocturna, placa para dormir, placa dental para dormir, protector para dormir, apretar los dientes, apretar dientes, aprieto los dientes, rechinar los dientes, rechinar dientes, rechino los dientes, placa rigida, placa de acetato",
        "precio": "Acetato: COP 180.000 | Rígida o Dual: COP 400.000",
        "descripcion": "Placa de protección para evitar el desgaste dental por el hábito involuntario de apretar o rechinar los dientes.",
        "disponible": True
    },
    {
        "servicio": "Ortodoncia Convencional",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia convencional, ortodoncia tradicional, ortodoncia normal, ortodoncia metalica, ortodoncias metalicas, brackets convencionales, brackets tradicionales, brackets tradicionales metalicos, brackets metalicos, bracket metalico, brakets metalicos, braquets metalicos, frenillos metalicos, frenos metalicos, brackets con ligas, brackets con cauchos, brackets con gomitas, brackets con cachitos, brackets normales, brackets comunes, brackets plateados",
        "precio": "Montaje: COP 150.000 | Mensualidad: COP 50.000",
        "descripcion": "Ortodoncia con brackets tradicionales metálicos. Montaje superior e inferior con valoración incluida.",
        "disponible": True
    },
    {
        "servicio": "Ortodoncia Autoligados",
        "categoria": "Ortodoncia",
        "palabras_clave": "ortodoncia autoligados, ortodoncia de autoligado, ortodoncia autoligada, autoligado, autoligados, brackets autoligados, bracket autoligado, brakets autoligados, braquets autoligados, brackets sin ligas, bracket sin ligas, brakets sin ligas, brackets sin cauchos, bracket sin cauchos, brackets sin gomitas, sin ligas, sin cauchos, sin gomitas, sistema damon, brackets damon, ortodoncia damon, damon, brackets con tapita, brackets con compuerta, autoligables",
        "precio": "Montaje: COP 400.000 | Mensualidad: COP 50.000",
        "descripcion": "Ortodoncia con brackets de autoligado (tecnología sin ligas). Tratamientos más rápidos y con menor fricción.",
        "disponible": True
    },
    {
        "servicio": "Blanqueamiento Casero (Kit Promoción)",
        "categoria": "General",
        "palabras_clave": "blanqueamiento casero, blanqueamientos caseros, aclaramiento casero, aclaramientos caseros, blanqueamiento en casa, blanqueamiento para la casa, blanqueamiento para casa, aclaramiento en casa, aclaramiento para la casa, kit de blanqueamiento, kit blanqueamiento, kits de blanqueamiento, kit de aclaramiento, kit aclaramiento, blanqueamiento con cubetas, cubetas de blanqueamiento, cubetas para blanquear, cubetas para blanqueamiento, gel de blanqueamiento, gel blanqueador, jeringas de blanqueamiento, jeringa de blanqueamiento, blanquear dientes en casa, blanquearme en casa",
        "precio": "COP 100.000",
        "descripcion": "¡Promoción de Blanqueamiento Dental Casero! Incluye: 2 jeringas de gel aclarador y cubetas personalizadas.",
        "disponible": True
    },
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
        "palabras_clave": "hola, buenos dias, buenas tardes, buenas noches, buen dia, buendia, buena tarde, buena noche, buenas, como esta, como estan, como estas, como le va, que tal, que mas, saludos, cordial saludo, hi, hello, holis, hola doctor, hola doctora, hola doc, buenas doctor, buenas doc",
        "respuesta": "¡Hola! 🦷 Gracias por comunicarte con nuestro consultorio odontológico. ¿En qué te podemos colaborar el día de hoy?",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "precios",
        "palabras_clave": "precios, precio, lista de precios, listas de precios, precios generales, catalogo de precios, catalogo de servicios, lista de tarifas, tarifas, tarifa, valores de servicios, valor de tratamientos, costo de tratamientos, cotizacion general, cotizacion, cotizaciones, cotizar, presupuesto general, presupuesto, presupuestos, cuanto vale, que vale, cuanto cuesta, que cuesta, cuanto cobran, cuanto es, cuanto sale, que precios tienen, que precios manejan, que tarifas manejan, costo, costos, valor, valores, precio de la consulta, cuanto vale la consulta, cuanto cuesta la consulta, valor de la consulta, precio de la valoracion, cuanto vale la valoracion, cuanto cuesta la valoracion, valor de la valoracion",
        "respuesta": "Nuestros Precios Principales: ✨ Limpieza: COP 50.000 | 💎 Resinas: Desde COP 100.000 | 🌟 Blanqueamiento: COP 200.000 | 🦷 Extracciones: Desde COP 120.000 | 📐 Ortodoncia: Inicial COP 150.000.\n\n¿Te gustaría agendar una cita de valoración?",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "horarios",
        "palabras_clave": "horario, horarios, horario de atencion, horarios de atencion, que horario tienen, que horarios tienen, que horario manejan, que horarios manejan, cual es el horario, cual es su horario, a que hora abren, a que hora cierran, hasta que hora atienden, desde que hora atienden, hasta que hora abren, hasta que hora trabajan, que dias abren, que dias atienden, que dias trabajan, estan abiertos, estan abiertos hoy, estan atendiendo, estan atendiendo hoy, atienden hoy, abren hoy, trabajan hoy, atienden los sabados, abren los sabados, atienden sabados, abren sabados, atienden domingos, abren domingos, atienden festivos, abren festivos, jornada de atencion, dias de atencion",
        "respuesta": "📅 *Horarios de Atención:*\n• Lunes a Viernes: 9:00 AM - 12:00 PM y 2:00 PM - 6:00 PM\n• Sábados: 9:00 AM - 12:00 PM y 2:00 PM - 5:00 PM\n• Domingos y Festivos: Cerrado.",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "ubicacion",
        "palabras_clave": "direccion, direcciones, ubicacion, ubicaciones, donde estan, donde quedan, donde estan ubicados, donde quedan ubicados, donde queda el consultorio, donde es el consultorio, donde atienden, cual es la direccion, cual es su direccion, me regala la direccion, me comparte la direccion, me da la direccion, que direccion tienen, en que parte estan, en que parte quedan, en que barrio estan, en que barrio quedan, en que ciudad estan, como llego, como llegar, como hago para llegar, por donde quedan, por donde estan, sede, sedes, direccion del consultorio, ubicacion del consultorio, punto de referencia, puntos de referencia, que queda cerca",
        "respuesta": "📍 *NUESTRA UBICACIÓN:*\nNos encontramos ubicados en [Dirección de tu Consultorio, Ej: Calle 123 # 45-67].\n\n¡Será un gusto atenderte! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "despedida",
        "palabras_clave": "gracias, muchas gracias, mil gracias, muchisimas gracias, gracias doctor, gracias doctora, gracias doc, dios le pague, dios lo bendiga, dios la bendiga, perfecto, excelente, listo, dale, de acuerdo, entendido, todo claro, quedo claro, muy amable, muy formal, genial, ok, ok gracias, chao, chaito, hasta luego, hasta pronto, adios, nos vemos, que tenga buen dia, que tenga feliz dia, que este bien, feliz dia, feliz tarde, feliz noche",
        "respuesta": "¡Con mucho gusto! 😊 En nuestro consultorio estamos para servirte. ¡Que tengas un excelente día! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "metodos_pago",
        "palabras_clave": "metodos de pago, metodo de pago, formas de pago, forma de pago, medios de pago, medio de pago, como puedo pagar, como se paga, formas para pagar, como cancelar, puedo pagar con, nequi, bancolombia, daviplata, bre b, bre-b, breb, transferencia, transferencias, datafono, datafonos, datáfono, tarjeta, tarjetas, tarjeta debito, tarjeta credito, tarjetas de credito, tarjetas de debito, reciben tarjeta, reciben tarjetas, aceptan tarjeta, aceptan tarjetas, tienen datafono, tienen nequi, reciben nequi, aceptan nequi, reciben transferencia, aceptan transferencia, efectivo, en efectivo, pago en efectivo, reciben efectivo, aceptan efectivo, pago a cuotas, a cuotas",
        "respuesta": "💳 *MÉTODOS DE PAGO EN CONSULTORIO:*\n• Efectivo\n• Transferencias (Nequi, Bancolombia)\n• Tarjetas débito y crédito.\n\n¡Facilidades para que cuides tu sonrisa! 🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "Referencias para llegar al consultorio",
        "palabras_clave": "como llego, como llegar, como hago para llegar, como se llega, por donde llego, punto de referencia, puntos de referencia, referencia para llegar, referencias para llegar, alguna referencia, que queda cerca, cerca de que queda, cerca a que queda, que hay cerca, al lado de que queda, frente a que queda, diagonal a que queda, por donde es la entrada, por donde se entra, donde queda la entrada, como es la fachada, foto de la fachada, como es el consultorio por fuera, foto del consultorio, croquis, mapa para llegar, no doy con la direccion, no encuentro el consultorio",
        "respuesta": "📍 *PUNTOS DE REFERENCIA PARA LLEGAR:*\nEstamos ubicados [Describe tus puntos de referencia: diagonal a..., frente a...].\n\n¡Te adjuntamos una imagen de referencia para que nos encuentres fácilmente! 🏢🦷",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "cordales_terceros_molares",
        "palabras_clave": "tercer molar, terceros molares, cordal, cordales, muela del juicio, muelas del juicio, cirugia de cordales, sacar cordal, sacar cordales, sacada de cordal, sacada de cordales, sacar muela del juicio, extraccion de cordales, extraccion de cordal, extracciones de cordales, extraccion de terceros molares, extracciones de terceros molares, cirugia oral",
        "respuesta": "¡Hola! 👋 En nuestro consultorio realizamos extracciones dentales simples, pero actualmente *no realizamos extracción ni cirugía de terceros molares (cordales o muelas del juicio)*. Te sugerimos consultar con un especialista en Cirugía Maxilofacial. 🦷✨",
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
    Nivel 1: Atiende consultas directas en 0.1s.
    Compara puntajes reales para que una consulta específica (como cordales) gane sobre un servicio genérico.
    """
    ahora_ts = datetime.now(timezone.utc).timestamp()

    async with httpx.AsyncClient(timeout=6.0) as client:
        mejor_resp_bot = None
        max_puntos_bot = 0

        mejor_resp_srv = None
        max_puntos_srv = 0
        servicios_coincidentes = []

        # 1. Búsqueda en tabla 'servicios' (Tratamientos directos)
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
                    
                    # Formato limpio: solo incluye aclaración corta si existe y no es relleno
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

        # 2. Búsqueda en tabla 'chatbot' (Ubicación, Horarios, Saludos, Cordales)
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

        # 3. ⚖️ Prioridad justa por puntaje absoluto:
        # Si la intención de Chatbot (ej: Cordales) acumuló más puntos que el catálogo genérico, GANA CHATBOT
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

    # 1. 🚀 Lectura ultra-rápida desde memoria RAM (Caché 60s)
    cache_srv = CACHE_SERVICIOS_DOCTOR.get(odontologo_id)
    if cache_srv and (ahora_ts - cache_srv["timestamp"] < 60):
        servicios_datos = [
            f for f in cache_srv["datos"] 
            if f.get("disponible") is None or f.get("disponible") is True or str(f.get("disponible", "")).upper() in ("TRUE", "ACTIVO", "1", "")
        ]

    cache_cfg = CACHE_CONFIG_DOCTOR.get(odontologo_id)
    if cache_cfg and (ahora_ts - cache_cfg["timestamp"] < 60):
        config_datos = cache_cfg["datos"]

    # 📡 Consulta rápida a Supabase (debe ser corto: 5.0 segundos)
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

    # 2. Destilar datos del consultorio
    cfg_map = {item.get("clave"): item.get("valor") for item in config_datos if item.get("clave")}
    consultorio_nombre = cfg_map.get("nombre_consultorio") or "Consultorio Odontológico"
    
    info_sede = f"""- Consultorio: {consultorio_nombre}
- Ubicación: {cfg_map.get('ciudad', '')}, {cfg_map.get('barrio', '')} - {cfg_map.get('direccion', '')}
- Teléfono: {cfg_map.get('telefono', '')}
- Horarios de Atención:
  * Lunes a Viernes: {cfg_map.get('horario_lunes_viernes', cfg_map.get('horarios', 'Consulte'))}
  * Sábados: {cfg_map.get('horario_sabado', 'Consulte')}
  * Domingos y Festivos: {cfg_map.get('horario_domingo', 'Cerrado')}"""

    lineas_servicios = []
    for s in servicios_datos:
        nom = s.get("servicio", "").strip()
        precio = s.get("precio", "").strip()
        if nom:
            lineas_servicios.append(f"- {nom}: {precio}")
    info_servicios = "\n".join(lineas_servicios) or "Consulte tarifas en valoración."

    # 3. Instrucción del sistema (Afinada para consultas múltiples)
    system_instruction_text = f"""
Eres el asistente virtual amable, profesional y muy conciso de '{consultorio_nombre}'.
Tu objetivo es responder para WhatsApp en MÁXIMO 2 o 3 líneas, usando emojis amables.

DATOS DEL CONSULTORIO:
{info_sede}

TARIFAS OFICIALES EN COP:
{info_servicios}

🚨 PROTOCOLO ESTRICTO DE TARIFAS Y MÚLTIPLES SERVICIOS:
- Si el paciente pregunta por UN solo tratamiento, menciona su precio oficial en COP e invita a valoración.
- Si el paciente pregunta por VARIOS tratamientos en el mismo mensaje (ej: limpieza, calzas y sacar muelas):
  1. Responde de forma consolidada, amable y unificada en MÁXIMO 2 o 3 líneas.
  2. Menciona claramente el precio oficial en COP de CADA UNO de los tratamientos consultados según las Tarifas Oficiales.
  3. Invita amablemente a una cita de valoración para evaluar todas las piezas dentales en conjunto.

🚨 PROTOCOLO ESTRICTO DE CITAS Y DISPONIBILIDAD:
Si el paciente pide cita o pregunta disponibilidad para un día/jornada:
1. Responde en MÁXIMO 2 líneas.
2. Informa el horario oficial de atención para ese día según los datos del consultorio.
3. Indica amablemente que el doctor o recepcionista confirmará el turno exacto a la brevedad.
4. PROHIBIDO confirmar citas en firme o decir que hay cupo libre.
5. PROHIBIDO pedir datos personales o qué procedimiento se va a hacer.

🚨 CASOS DE DOLOR O URGENCIAS:
- PROHIBIDO recetar o recomendar medicamentos.
- Indica en 2 líneas que el caso fue priorizado para revisión del doctor e invita a urgencias si es vital.

REGLAS GENERALES:
- Mensajes cortísimos, humanos y directos. Cero relleno.
- Precios siempre en COP según las tarifas oficiales.
"""

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction_text}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{
                    "text": f"HISTORIAL PREVIO:\n{historial}\n\nMENSAJE DEL PACIENTE:\n{texto_paciente}"
                }]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 150,
            "temperature": 0.2
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }

    # 🧠 Consulta a Gemini IA (AQUÍ ES DONDE VA EL TIMEOUT DE 30 SEGUNDOS)
    modelo = "gemini-3.5-flash-lite"
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={Config.GEMINI_API_KEY}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:  # <--- AQUÍ VA 30.0
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