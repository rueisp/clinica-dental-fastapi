import os
from dotenv import load_dotenv
import httpx
import logging

load_dotenv() # Esto carga las variables del archivo .env

# Configura estos valores con lo que obtuviste de BotFather y userinfobot
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")

async def enviar_alerta_pago_telegram(doctor_nombre: str, plan_nombre: str, referencia: str):
    """Envía una notificación al administrador cuando se reporta un pago"""
    
    if not TELEGRAM_TOKEN or "AQUI" in TELEGRAM_TOKEN:
        logging.warning("⚠️ Telegram Token no configurado. No se envió la alerta.")
        return

    mensaje = (
        f"🔔 *NUEVO PAGO REPORTADO*\n\n"
        f"👤 *Doctor:* {doctor_nombre}\n"
        f"📦 *Plan solicitado:* {plan_nombre}\n"
        f"🔢 *Referencia:* {referencia}\n\n"
        f"👉 Ingresa al panel de administración para validar el comprobante."
    )

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={
                "chat_id": CHAT_ID,
                "text": mensaje,
                "parse_mode": "Markdown"
            })
            response.raise_for_status()
    except Exception as e:
        logging.error(f"❌ Error enviando notificación a Telegram: {e}")