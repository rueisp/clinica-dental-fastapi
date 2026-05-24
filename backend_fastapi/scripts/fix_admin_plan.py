# scripts/fix_admin_plan.py
import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from database import AsyncSessionLocal
from models import Usuario, Subscription, Plan
from sqlalchemy import select
from datetime import datetime

async def fix_admin_plan():
    async with AsyncSessionLocal() as db:
        # 1. Buscar admin
        admin_result = await db.execute(select(Usuario).where(Usuario.username == "admin"))
        admin = admin_result.scalar_one_or_none()
        
        if not admin:
            print("❌ Admin no encontrado")
            return
        
        print(f"✅ Admin encontrado: ID {admin.id}")
        
        # 2. Buscar plan básico (el más económico)
        plan_result = await db.execute(select(Plan).order_by(Plan.precio_mensual).limit(1))
        plan = plan_result.scalar_one_or_none()
        
        if not plan:
            print("❌ No hay planes en la DB")
            return
        
        print(f"✅ Plan seleccionado: {plan.nombre} (ID {plan.id})")
        
        # 3. Verificar si ya tiene plan
        existing = await db.execute(
            select(Subscription).where(Subscription.user_id == admin.id)
        )
        if existing.scalar_one_or_none():
            print("⚠️ Admin ya tiene un plan asignado")
            return
        
        # 4. Asignar plan
        usuario_plan = Subscription(
            user_id=admin.id,
            plan_id=plan.id,
            estado="activo",
            es_trial=False,
            fecha_inicio=datetime.now(),
            trial_pacientes_primeros_7_dias=False,
            trial_dias_restantes=0
        )
        
        db.add(usuario_plan)
        await db.commit()
        print("✅ Plan asignado al admin correctamente")

if __name__ == "__main__":
    asyncio.run(fix_admin_plan())