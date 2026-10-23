# backend_fastapi/scripts/poblar_bot_doctores.py
import asyncio
import sys
from pathlib import Path

# Asegurar importacion de modulos hermanos desde la raiz del backend
sys.path.append(str(Path(__file__).parent.parent))

from database import AsyncSessionLocal
from models import Usuario
from sqlalchemy import select
from services.bot_engine_service import poblar_plantilla_bot_doctor

async def poblar_todos():
    print("🚀 Verificando e inicializando plantilla base para doctores (excluyendo administradores)...")
    exitosos = 0
    fallidos = []

    async with AsyncSessionLocal() as db:
        # Excluir cuentas de administrador del SaaS
        result = await db.execute(select(Usuario).where(Usuario.is_admin.is_(False)).order_by(Usuario.nombres.asc()))
        usuarios = result.scalars().all()
        total = len(usuarios)
        print(f"📋 Encontrados {total} odontólogos para procesar.")

        for i, u in enumerate(usuarios, 1):
            print(f"🔹 [{i}/{total}] Procesando: {u.username} ({u.id})...")
            try:
                await poblar_plantilla_bot_doctor(
                    user_id=str(u.id),
                    doctor_nombre=f"{u.nombres} {u.apellidos or ''}".strip(),
                    consultorio_nombre=u.nombre_consultorio,
                    telefono=u.telefono
                )
                exitosos += 1
            except Exception as e:
                print(f"⚠️ Error procesando {u.username}: {e}")
                fallidos.append((u.username, str(u.id), str(e)))

            # Pausa preventiva para respetar rate limits de Supabase
            await asyncio.sleep(0.1)

    print("\n" + "=" * 55)
    print(f"📊 RESUMEN: {exitosos}/{total} doctores procesados con éxito.")
    if fallidos:
        print(f"⚠️ Doctores con error ({len(fallidos)}):")
        for uname, uid, err in fallidos:
            print(f"   • {uname} ({uid}): {err}")
    print("=" * 55 + "\n")

if __name__ == "__main__":
    asyncio.run(poblar_todos())
