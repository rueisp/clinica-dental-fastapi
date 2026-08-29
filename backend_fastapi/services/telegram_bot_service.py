# backend_fastapi/services/telegram_bot_service.py
import re
import httpx
import logging
from config import Config
from services.bot_engine_service import registrar_historial_db
from services.evolution_service import enviar_mensaje_evolution

logger = logging.getLogger("telegram_bot")

async def enviar_alerta_telegram(numero_paciente: str, mensaje_texto: str, instance_name: str):
    """Notifica al doctor en Telegram cuando llega un mensaje de WhatsApp"""
    if not Config.TELEGRAM_TOKEN or not Config.CHAT_ID:
        return

    url = f"https://api.telegram.org/bot{Config.TELEGRAM_TOKEN}/sendMessage"
    texto = (
        f"🔔 <b>Nuevo mensaje de WhatsApp</b>\n\n"
        f"👤 <b>Paciente:</b> {numero_paciente}\n"
        f"📱 <b>Instancia:</b> {instance_name}\n"
        f"💬 <b>Mensaje:</b> {mensaje_texto}\n\n"
        f"✍️ <i>(Responde a este mensaje en Telegram para contestar al paciente)</i>"
    )
    payload = {"chat_id": Config.CHAT_ID, "text": texto, "parse_mode": "HTML"}

    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            await client.post(url, json=payload)
        except Exception as e:
            logger.error(f"[Telegram] Error enviando alerta: {e}")

async def procesar_respuesta_telegram(datos_telegram: dict):
    """Procesa cuando el doctor responde un mensaje desde Telegram y lo envía por WhatsApp"""
    try:
        mensaje = datos_telegram.get("message", {})
        texto_doctor = mensaje.get("text", "").strip()
        reply_to = mensaje.get("reply_to_message", {})
        texto_original = reply_to.get("text", "")

        if not texto_doctor or not texto_original:
            return

        coincidencia = re.search(r'Paciente:\s*\+?([A-Za-z0-9._]+)', texto_original)
        if not coincidencia:
            return

        numero_paciente = coincidencia.group(1).strip()
        
        # Extraer instancia si existe en el mensaje original, sino usar valor por defecto
        match_inst = re.search(r'Instancia:\s*([A-Za-z0-9._]+)', texto_original)
        instance_name = match_inst.group(1).strip() if match_inst else "doctor_default"

        logger.info(f"[Telegram] Doctor responde a {numero_paciente}: {texto_doctor}")

        # 1. Enviar por Evolution API
        await enviar_mensaje_evolution(instance_name, numero_paciente, texto_doctor)

        # 2. Registrar en Supabase activando el silencio de 2h
        await registrar_historial_db(numero_paciente, "[Intervención Doctor/Humano]", texto_doctor)

        # 3. Confirmar en Telegram
        url = f"https://api.telegram.org/bot{Config.TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": mensaje.get("chat", {}).get("id"),
            "text": f"✅ <b>Mensaje enviado a +{numero_paciente} por WhatsApp</b>",
            "parse_mode": "HTML",
            "reply_to_message_id": mensaje.get("message_id")
        }
        async with httpx.AsyncClient(timeout=6.0) as client:
            await client.post(url, json=payload)

    except Exception as e:
        logger.error(f"[Telegram] Error procesando respuesta: {e}")