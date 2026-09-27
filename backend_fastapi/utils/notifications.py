import os
import html
import httpx
import logging
from dotenv import load_dotenv

# Forzamos la carga del .env
load_dotenv()

async def enviar_alerta_pago_telegram(doctor_nombre: str, plan_nombre: str, referencia: str):
    """Envía una notificación al administrador cuando se reporta un pago usando HTML protegido contra caracteres especiales"""
    
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("CHAT_ID")
    
    if not token or not chat_id:
        logging.error("⚠️ Telegram Token o CHAT_ID no configurados en el .env")
        return

    # Escapamos los textos dinámicos para evitar que caracteres como '&', '<', '>' rompan el parser HTML de Telegram
    doctor_seguro = html.escape(str(doctor_nombre or "Doctor"))
    plan_seguro = html.escape(str(plan_nombre or "Plan Desconocido"))
    referencia_segura = html.escape(str(referencia or "Sin referencia"))

    mensaje = (
        f"🔔 <b>NUEVO PAGO REPORTADO</b>\n\n"
        f"👤 <b>Doctor:</b> {doctor_seguro}\n"
        f"📦 <b>Plan:</b> {plan_seguro}\n"
        f"🔢 <b>Ref:</b> {referencia_segura}\n\n"
        f"👉 Revisa el Panel de Control para activar."
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={
                "chat_id": chat_id,
                "text": mensaje,
                "parse_mode": "HTML"
            })
            
            if response.status_code == 200:
                print(f"🚀 Telegram enviado con éxito al chat {chat_id}")
            else:
                print(f"❌ Telegram rechazó el mensaje: {response.text}")
                
    except Exception as e:
        logging.error(f"❌ Error crítico de red en Telegram: {e}")