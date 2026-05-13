import asyncio
from utils.notifications import enviar_alerta_pago_telegram

async def main():
    print("🚀 Intentando enviar alerta a Telegram...")
    try:
        await enviar_alerta_pago_telegram(
            doctor_nombre="Doctor Prueba NextJS",
            plan_nombre="Plan Pro Mensual",
            referencia="REF-999888777"
        )
        print("✅ ¡Mensaje enviado! Revisa tu Telegram.")
    except Exception as e:
        print(f"❌ Falló el envío: {e}")

if __name__ == "__main__":
    asyncio.run(main())