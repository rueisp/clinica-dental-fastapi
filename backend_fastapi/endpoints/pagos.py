from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import pytz
import random
import string

# Importaciones de tu estructura actual
from database import get_db
from dependencies.auth import get_current_user # Asegúrate de que esta ruta sea correcta
from models import Usuario, Paciente, PagoClinico # Usamos el nuevo PagoClinico
from schemas.pago import PagoCreate, PagoResponse

router = APIRouter(prefix="/pagos", tags=["pagos"])

COLOMBIA_TZ = pytz.timezone('America/Bogota')

def generar_codigo_unico():
    """Genera un código único para el recibo tipo R-20240520-ABC123"""
    fecha_str = datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"R-{fecha_str}-{random_str}"

@router.post("/nuevo", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
async def crear_pago(
    pago_data: PagoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Hora actual en Colombia
        hora_actual = datetime.now(COLOMBIA_TZ).time()
        
        # 2. Lógica de rescate de datos del paciente
        paciente_nombre_final = pago_data.paciente_nombre
        telefono_final = pago_data.telefono
        
        if pago_data.paciente_id:
            # Buscamos al paciente para traer su nombre real y teléfono si no se envió uno
            result = await db.execute(
                select(Paciente).where(Paciente.id == pago_data.paciente_id)
            )
            paciente = result.scalar_one_or_none()
            
            if paciente:
                # Priorizamos nombres de la DB para evitar errores de digitación
                paciente_nombre_final = f"{paciente.nombres} {paciente.apellidos}"
                # Si en el form de Next.js no pusieron teléfono, usamos el de la ficha del paciente
                if not telefono_final and paciente.telefono:
                    telefono_final = paciente.telefono
        
        # 3. Crear la instancia del nuevo modelo unificado
        nuevo_pago = PagoClinico(
            paciente_id=pago_data.paciente_id,
            paciente_nombre=paciente_nombre_final,
            fecha=pago_data.fecha, # Pydantic ya lo convirtió a objeto date
            hora=hora_actual,
            descripcion=pago_data.descripcion,
            monto=pago_data.monto,
            metodo_pago=pago_data.metodo_pago,
            observacion=pago_data.observacion,
            pagado_por=pago_data.pagado_por,
            codigo=generar_codigo_unico(),
            es_rapido=pago_data.es_rapido,
            usuario_id=current_user.id,
            telefono=telefono_final
        )
        
        db.add(nuevo_pago)
        await db.commit()
        await db.refresh(nuevo_pago)
        
        return nuevo_pago
        
    except Exception as e:
        await db.rollback()
        print(f"DEBUG ERROR: {str(e)}") # Útil para ver errores en consola
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar el pago: {str(e)}"
        )

@router.get("/{id}", response_model=PagoResponse)
async def obtener_pago(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PagoClinico).where(PagoClinico.id == id))
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return pago

@router.get("/codigo/{codigo}", response_model=PagoResponse)
async def obtener_pago_por_codigo(codigo: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PagoClinico).where(PagoClinico.codigo == codigo))
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")
    return pago

# ... (mantén tus importaciones y código anterior igual) ...

@router.get("/", response_model=list[PagoResponse])
async def listar_pagos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user) # Protegemos la lista solo para usuarios logueados
):
    try:
        # Consultamos todos los pagos ordenados por fecha y hora descendente
        result = await db.execute(
            select(PagoClinico).order_by(PagoClinico.fecha.desc(), PagoClinico.hora.desc())
        )
        pagos = result.scalars().all()
        return pagos
    except Exception as e:
        print(f"Error al listar pagos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el historial de pagos"
        )

# (Al final de tu archivo ya tienes los otros métodos GET, déjalos como están)