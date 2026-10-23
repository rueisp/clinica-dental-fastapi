# backend_fastapi/utils/notifications.py
import os
import html
import httpx
import logging
from typing import Optional
from dotenv import load_dotenv

# Asegurar carga del .env en ejecuciones locales y pruebas
load_dotenv()

from config import Config

logger = logging.getLogger("notifications")

async def enviar_alerta_pago_telegram(
    doctor_nombre: str, 
    plan_nombre: str, 
    referencia: str,
    monto: Optional[float] = None
) -> bool:
    """
    Envía una notificación al administrador cuando se reporta un pago.
    Retorna True si Telegram confirmó la entrega, False en caso de fallo.
    """
    token = (os.getenv("TELEGRAM_TOKEN") or Config.TELEGRAM_TOKEN or "").strip()
    chat_id = (os.getenv("CHAT_ID") or Config.CHAT_ID or "").strip()
    
    if not token or not chat_id:
        print(f"⚠️ [Telegram Error]: TELEGRAM_TOKEN o CHAT_ID no configurados en .env", flush=True)
        logger.warning("⚠️ Telegram Token o CHAT_ID no configurados.")
        return False

    # Escapamos los textos dinámicos para proteger el parser HTML de Telegram
    doctor_seguro = html.escape(str(doctor_nombre or "Doctor"))
    plan_seguro = html.escape(str(plan_nombre or "Plan Desconocido"))
    referencia_segura = html.escape(str(referencia or "Sin referencia"))

    linea_monto = ""
    if monto is not None and monto > 0:
        linea_monto = f"💰 <b>Monto:</b> ${monto:,.0f} COP\n"

    mensaje = (
        f"🔔 <b>NUEVO PAGO REPORTADO</b>\n\n"
        f"👤 <b>Doctor:</b> {doctor_seguro}\n"
        f"📦 <b>Plan:</b> {plan_seguro}\n"
        f"{linea_monto}"
        f"🔢 <b>Ref:</b> {referencia_segura}\n\n"
        f"👉 Revisa el Panel de Control para activar."
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": mensaje,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") is True:
                    print(f"🚀 [Telegram]: Mensaje entregado con éxito al chat {chat_id}", flush=True)
                    logger.info(f"🚀 Telegram enviado con éxito al chat {chat_id}")
                    return True
                else:
                    print(f"❌ [Telegram Error]: {data.get('description')}", flush=True)
                    logger.error(f"❌ Telegram respondió error lógico: {data.get('description')}")
                    return False
            else:
                print(f"❌ [Telegram Rechazo HTTP {response.status_code}]: {response.text}", flush=True)
                logger.error(f"❌ Telegram rechazó el mensaje: {response.text}")
                return False
    except httpx.TimeoutException:
        print("❌ [Telegram Error]: Timeout de conexión (10s)", flush=True)
        logger.error("❌ Timeout de conexión con Telegram API (10s)")
        return False
    except Exception as e:
        print(f"❌ [Telegram Error]: {type(e).__name__} - {e}", flush=True)
        logger.error(f"❌ Error de red conectando con Telegram: {e}")
        return False