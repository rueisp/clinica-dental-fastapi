import os
from dotenv import load_dotenv
import httpx
import logging

# Forzamos la carga del .env
load_dotenv()

async def enviar_alerta_pago_telegram(doctor_nombre: str, plan_nombre: str, referencia: str):
    """Envía una notificación al administrador cuando se reporta un pago usando HTML"""
    
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("CHAT_ID")
    
    if not token or not chat_id:
        logging.error("⚠️ Telegram Token o CHAT_ID no configurados en el .env")
        return

    # Usamos etiquetas HTML <b> en lugar de asteriscos para evitar errores con guiones bajos
    mensaje = (
        f"🔔 <b>NUEVO PAGO REPORTADO</b>\n\n"
        f"👤 <b>Doctor:</b> {doctor_nombre}\n"
        f"📦 <b>Plan:</b> {plan_nombre}\n"
        f"🔢 <b>Ref:</b> {referencia}\n\n"
        f"👉 Revisa el Panel de Control para activar."
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={
                "chat_id": chat_id,
                "text": mensaje,
                "parse_mode": "HTML"  # <--- CAMBIADO A HTML PARA EVITAR ERRORES
            })
            
            if response.status_code == 200:
                print(f"🚀 Telegram enviado con éxito a las {chat_id}")
            else:
                print(f"❌ Telegram rechazó el mensaje: {response.text}")
                
    except Exception as e:
        logging.error(f"❌ Error crítico de red en Telegram: {e}")