# endpoints/pagos.py (nuevo archivo)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import pytz
from typing import Optional

from database import get_db
from dependencies.auth import get_current_user
from models_fastapi import Usuario, Paciente, PagoUnificado
from schemas.pago import PagoCreate, PagoResponse
from utils.pago_utils import generar_codigo_unico

router = APIRouter(prefix="/api/pagos", tags=["pagos"])


@router.post("/nuevo", response_model=PagoResponse, status_code=status.HTTP_201_CREATED)
async def crear_pago(
    pago_data: PagoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint para cobro rápido con autocompletado de pacientes
    """
    try:
        # 1. Convertir fecha de DD/MM/YYYY a date
        try:
            fecha_obj = datetime.strptime(pago_data.fecha, '%d/%m/%Y').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use DD/MM/YYYY")
        
        # 2. Hora actual en Colombia
        colombia_tz = pytz.timezone('America/Bogota')
        hora_actual = datetime.now(colombia_tz).time()
        
        # 3. Determinar nombre del paciente
        paciente_nombre_final = pago_data.paciente_nombre
        telefono_final = pago_data.telefono
        
        if pago_data.paciente_id:
            # Buscar paciente en BD
            result = await db.execute(
                select(Paciente).where(Paciente.id == pago_data.paciente_id)
            )
            paciente = result.scalar_one_or_none()
            
            if paciente:
                paciente_nombre_final = f"{paciente.nombres} {paciente.apellidos}"
                # Si no se envió teléfono, usar el del paciente
                if not telefono_final and paciente.telefono:
                    telefono_final = paciente.telefono
        
        # 4. Crear el pago
        nuevo_pago = PagoUnificado(
            paciente_id=pago_data.paciente_id if pago_data.paciente_id else None,
            paciente_nombre=paciente_nombre_final,
            fecha=fecha_obj,
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
        
        return PagoResponse(
            id=nuevo_pago.id,
            codigo=nuevo_pago.codigo,
            paciente_nombre=nuevo_pago.paciente_nombre,
            fecha=nuevo_pago.fecha,
            hora=nuevo_pago.hora,
            monto=nuevo_pago.monto,
            metodo_pago=nuevo_pago.metodo_pago,
            descripcion=nuevo_pago.descripcion,
            observacion=nuevo_pago.observacion,
            telefono=nuevo_pago.telefono
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al registrar el pago: {str(e)}"
        )