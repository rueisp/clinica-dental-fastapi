import os
from dotenv import load_dotenv

load_dotenv()

import asyncio
import httpx
import time

API_KEY = os.getenv("GEMINI_API_KEY", "")

PREGUNTA = "Buenas tardes, me gustaría saber si tienen espacio para una cita este viernes por la tarde"

SISTEMA = """
Eres el asistente virtual amable, profesional y muy breve de 'Consultorio Odontológico'.
Horario Viernes: 9:00 AM - 12:00 M y 2:00 PM - 6:00 PM. Sábados: 9:00 AM - 5:00 PM.
Instrucción: Responde en WhatsApp en MÁXIMO 2 líneas informando el horario del viernes e indicando amablemente que el doctor confirmará la disponibilidad del turno a la brevedad. No confirmes citas en firme ni pidas datos.
"""

async def probar_modelo(client, modelo):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={API_KEY}"
    
    payload = {
        "systemInstruction": {
            "parts": [{"text": SISTEMA}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": PREGUNTA}]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 150,
            "temperature": 0.2
        }
    }
    
    print(f"\n⏱️ Evaluando '{modelo}'...")
    inicio = time.time()
    try:
        res = await client.post(url, json=payload)
        duracion = round(time.time() - inicio, 2)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            texto = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                texto = "".join(p.get("text", "") for p in parts if "text" in p and not p.get("thought")).strip()
                if not texto and parts and "text" in parts[-1]:
                    texto = parts[-1]["text"].strip()
                    
            print(f"✅ Status: 200 en {duracion} segundos")
            print(f"💬 Respuesta al paciente:\n{texto}")
        else:
            print(f"❌ Status {res.status_code} en {duracion}s: {res.text[:200]}")
    except Exception as e:
        duracion = round(time.time() - inicio, 2)
        print(f"❌ Error tras {duracion}s: {e}")

async def main():
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Probamos los modelos optimizados de tu cuenta
        candidatos = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash-lite"
        ]
        for m in candidatos:
            await probar_modelo(client, m)

if __name__ == "__main__":
    asyncio.run(main())