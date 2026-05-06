from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from datetime import datetime
import uuid
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
        ahora_colombia = datetime.now(COLOMBIA_TZ)
        fecha_actual = ahora_colombia.date()
        hora_actual = ahora_colombia.time()
        
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
        
                        # 3. Crear el pago asegurando que usamos la hora de Colombia
        nuevo_pago = PagoClinico(
            paciente_id=pago_data.paciente_id,
            odontologo_id=current_user.id,
            monto=pago_data.monto,
            metodo_pago=pago_data.metodo_pago,
            fecha=ahora_colombia,  # <--- GUARDAMOS EL DATETIME COMPLETO CON TZ
            hora=ahora_colombia.time(),      # <--- USAMOS LA VARIABLE QUE CALCULAMOS ARRIBA
            paciente_nombre=pago_data.paciente_nombre,
            concepto=pago_data.descripcion,
            codigo=f"R-{uuid.uuid4().hex[:8].upper()}",
            observacion=pago_data.observacion,
            telefono=pago_data.telefono,
            es_rapido=pago_data.es_rapido
        )

        db.add(nuevo_pago)
        await db.commit()
        await db.refresh(nuevo_pago)

        # LIMPIEZA: Convertir a Colombia antes de enviar al frontend
        if isinstance(nuevo_pago.fecha, datetime):
            # Esto es vital: convertimos a zona horaria local ANTES de sacar la fecha
            nuevo_pago.fecha = nuevo_pago.fecha.astimezone(COLOMBIA_TZ).date()
        
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

# En endpoints/pagos.py

@router.get("/codigo/{codigo}", response_model=PagoResponse)
async def obtener_pago_por_codigo(
    codigo: str, 
    db: AsyncSession = Depends(get_db)  # <--- CAMBIADO: Antes decía get_session
):
    query = select(PagoClinico).where(PagoClinico.codigo == codigo)
    result = await db.execute(query)
    pago = result.scalar_one_or_none()
    
    if not pago:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")

     # --- INICIO DE LA CORRECCIÓN ---
    if hasattr(pago, 'fecha') and isinstance(pago.fecha, datetime):
        # Convertimos de UTC a Colombia ANTES de extraer la fecha (.date())
        pago.fecha = pago.fecha.astimezone(COLOMBIA_TZ).date()
    # --- FIN DE LA CORRECCIÓN ---
    
    # Mapeo manual para el esquema
    pago.descripcion = getattr(pago, 'concepto', "Consulta")
    pago.paciente_nombre = pago.paciente_nombre if pago.paciente_nombre else "Paciente"

    return pago

@router.get("/", response_model=list[PagoResponse])
async def listar_pagos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. ORDEN: Por fecha y hora descendente para que los nuevos estén arriba
    query = (
        select(PagoClinico)
        .where(PagoClinico.odontologo_id == current_user.id)
        .order_by(PagoClinico.fecha.desc(), PagoClinico.id.desc()) 
    )
    
    result = await db.execute(query)
    pagos = result.scalars().all()

    for pago in pagos:
        # --- CORRECCIÓN DEFINITIVA DE FECHA ---
        if hasattr(pago, 'fecha') and isinstance(pago.fecha, datetime):
            # Si la hora es exactamente 00:00:00, es un registro "viejo" que no debemos mover
            if pago.fecha.hour == 0 and pago.fecha.minute == 0:
                pago.fecha = pago.fecha.date() 
            else:
                # Si tiene hora real, aplicamos la conversión normal a Colombia
                pago.fecha = pago.fecha.astimezone(COLOMBIA_TZ).date()
        
        # El resto de tu limpieza...
        pago.descripcion = getattr(pago, 'concepto', "Consulta")
        if not getattr(pago, 'paciente_nombre', None):
            pago.paciente_nombre = "Paciente General"

    return pagos

from sqlalchemy import delete # Asegúrate de tener esta importación arriba

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_pago(
    id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Buscamos el pago y verificamos que pertenezca al odontólogo actual
    query = select(PagoClinico).where(
        PagoClinico.id == id, 
        PagoClinico.odontologo_id == current_user.id
    )
    result = await db.execute(query)
    pago = result.scalar_one_or_none()

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado o no tienes permiso")

    await db.delete(pago)
    await db.commit()
    return None