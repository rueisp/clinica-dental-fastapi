# backend_fastapi/services/bot_templates.py

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
        "palabras_clave": "ortodoncia, ortodoncias, brackets, bracket, breke, brecke, breque, brakets, braket, braquets, braquet, frenillos, frenillo, frenos, freno, montaje de brackets, montaje brackets, montaje de ortodoncia, montaje ortodoncia, cuota inicial brackets, cuota inicial ortodoncia, mensualidad de brackets, mensualidad brackets, mensualidad ortodoncia, mensualidades de brackets, ponerme brackets, ponerme los brackets, ponerme frenillos, ponerme los frenillos, alinear dientes, alinear los dientes, enderezar dientes, enderezar los dientes, tratamiento de ortodoncia",
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
        "intencion": "agendar_cita_disponibilidad",
        "palabras_clave": "cita hoy, citas hoy, cita para hoy, citas para hoy, tienen cita, tienen citas, hay cita, hay citas, tienen espacio, tienen espacios, tienen cupo, tienen cupos, agendar cita, agendar una cita, apartar cita, apartar una cita, pedir cita, pedir una cita, sacar cita, sacar una cita, quiero una cita, quiero cita, me pueden agendar, me regalan una cita, espacio para hoy, cupo para hoy, disponibilidad, tienen disponibilidad, espacio hoy, cupo hoy, cuando me toca, cuando me toca el control, mi control, el control, mi proximo control, proximo control, tengo cita, tengo cita hoy, a que hora es mi cita, a que hora tengo cita, a que hora voy, confirmar mi cita, revisar mi cita, que dia me toca, que dia voy, fecha de mi cita, fecha de mi control, cita de control, cita de revision, cita de valoracion",
        "respuesta": "¡Hola! 👋 Permítenos revisar la agenda y te confirmamos a la mayor brevedad posible. 🦷📅",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "costo_valoracion",
        "palabras_clave": "valoracion, valoraciones, revision, revisiones, cita de valoracion, cita de revision, consulta de valoracion, consulta de revision, cuanto vale la valoracion, cuanto cuesta la valoracion, precio de la valoracion, valor de la valoracion, costo de la valoracion, que vale la valoracion, que cuesta la valoracion, cobran la valoracion, cuanto cobran por la valoracion, cobran la revision, cuanto vale la revision, cuanto cuesta la revision, precio de la revision, valor de la revision, costo de la revision, la valoracion tiene costo, tiene costo la valoracion, tiene costo la revision, cobran por revisar, valoracion gratis, valoracion gratuita",
        "respuesta": "¡Hola! 🦷 En nuestro consultorio la cita de *valoración y diagnóstico inicial es totalmente gratuita (sin costo)*. Te revisamos, evaluamos tu caso y te entregamos tu presupuesto sin compromiso. ¿Te gustaría que te agendemos un espacio? 📅✨",
        "link_imagen": None,
        "estado": "ACTIVO"
    },
    {
        "intencion": "precios",
        "palabras_clave": "precios, precio, lista de precios, listas de precios, precios generales, catalogo de precios, catalogo de servicios, lista de tarifas, tarifas, tarifa, valores de servicios, valor de tratamientos, costo de tratamientos, cotizacion general, cotizacion, cotizaciones, cotizar, presupuesto general, presupuesto, presupuestos, cuanto vale, que vale, cuanto cuesta, que cuesta, cuanto cobran, cuanto es, cuanto sale, que precios tienen, que precios manejan, que tarifas manejan, costo, costos, valor, valores, precio de la consulta, cuanto vale la consulta, cuanto cuesta la consulta, valor de la consulta",
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
        "intencion": "incidencia_bracket_despegado",
        "palabras_clave": "se me despegaron, se me despego, se me despego un bracket, se me despego el bracket, se me despegaron los brackets, se me despegaron varios brackets, despegaron brackets, despego brackets, bracket despegado, brackets despegados, se me cayeron, se me cayo, se me cayo un bracket, se me cayo el bracket, se me cayeron los brackets, bracket caido, brackets caidos, se me soltaron, se me solto, se me solto un bracket, se me solto el bracket, bracket suelto, brackets sueltos, bracket flojo, brackets flojos, me los pueden pegar, me lo pueden pegar, que me los peguen, que me lo peguen, pegar bracket, pegar brackets, pegarme el bracket, pegarme un bracket, pegar de nuevo, volver a pegar, se me partio un bracket, bracket roto, me chusa el alambre, me pulla el alambre, se me salio el alambre, se me solto el alambre",
        "respuesta": "¡Hola! 🦷 Danos un momento, por favor.\nLos doctores revisarán tu caso para darte una solución a la brevedad. ¡Ya te escribimos! ✨",
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