# endpoints/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, Date
from datetime import datetime, timedelta, date, time
from utils.fechas import ahora_naive, hoy_local
from typing import Optional
from database import get_db
from dependencies.auth import get_current_user
from models import Usuario, Cita, Paciente, Subscription, Plan
from schemas import CitaCreate, CitaUpdate
from uuid import UUID
from dependencies.limites import verificar_suscripcion_activa

router = APIRouter()

# ============================================================
# HELPERS REUTILIZABLES DE CALENDARIO Y AGENDA (Cero Duplicación)
# ============================================================
DIAS_SEMANA_ES = {
    0: 'lunes', 1: 'martes', 2: 'miércoles', 3: 'jueves',
    4: 'viernes', 5: 'sábado', 6: 'domingo'
}
MESES_ES = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
}

def _formatear_fecha_espanol(d: date) -> str:
    """Formatea una fecha técnica en saludo legible colombiano"""
    return f"{DIAS_SEMANA_ES[d.weekday()]}, {d.day} de {MESES_ES[d.month]} de {d.year}"

async def _obtener_citas_dia_detalladas(db: AsyncSession, fecha_obj: date, odontologo_id: UUID) -> list[dict]:
    """Consulta y formatea las citas del día para un doctor con datos limpios de paciente"""
    query = (
        select(
            Cita,
            Paciente.nombres.label("p_nombres"),
            Paciente.apellidos.label("p_apellidos"),
            Paciente.telefono.label("p_tel")
        )
        .outerjoin(Paciente, Cita.paciente_id == Paciente.id)
        .where(
            Cita.fecha == fecha_obj,
            Cita.odontologo_id == odontologo_id,
            Cita.is_deleted == False
        )
        .order_by(Cita.hora)
    )
    result = await db.execute(query)
    rows = result.all()

    citas_detalladas = []
    for row in rows:
        cita = row.Cita
        nombre_final = (
            f"{row.p_nombres} {row.p_apellidos or ''}".strip()
            if row.p_nombres
            else (cita.nombre_provisional or "Paciente sin registrar")
        )
        citas_detalladas.append({
            "id": str(cita.id),
            "paciente_nombre": nombre_final,
            "paciente_id": str(cita.paciente_id) if cita.paciente_id else None,
            "hora": cita.hora.strftime('%H:%M') if cita.hora else "",
            "motivo": cita.motivo or "Consulta",
            "doctor": cita.doctor,
            "estado": cita.estado,
            "telefono": row.p_tel or cita.telefono_provisional or ""
        })
    return citas_detalladas

async def _obtener_eventos_calendario(
    db: AsyncSession,
    odontologo_id: UUID,
    start: Optional[str] = None,
    end: Optional[str] = None
) -> list[dict]:
    """Agrupa en SQL la cantidad de citas por día en un rango específico para FullCalendar"""
    query = (
        select(
            Cita.fecha.label("fecha"),
            func.count(Cita.id).label("total")
        )
        .where(
            Cita.odontologo_id == odontologo_id,
            Cita.is_deleted == False
        )
    )

    if start:
        try:
            fecha_inicio = datetime.strptime(start.strip(), '%Y-%m-%d').date()
            query = query.where(Cita.fecha >= fecha_inicio)
        except ValueError:
            pass

    if end:
        try:
            fecha_fin = datetime.strptime(end.strip(), '%Y-%m-%d').date()
            query = query.where(Cita.fecha <= fecha_fin)
        except ValueError:
            pass

    query = query.group_by(Cita.fecha)
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "title": f"{row.total} cita{'s' if row.total > 1 else ''}",
            "start": row.fecha.strftime('%Y-%m-%d'),
            "color": "transparent",
            "textColor": "#6b7280"
        }
        for row in rows
    ]

@router.get("/citas/por-fecha")
async def get_citas_por_fecha(
    fecha: str,
    doctor_id: Optional[UUID] = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Consulta citas del día aplicando la regla oficial de visualización del admin"""
    try:
        fecha_obj = datetime.strptime(fecha.strip(), '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    id_a_filtrar = doctor_id if (current_user.is_admin and doctor_id) else current_user.id
    citas_list = await _obtener_citas_dia_detalladas(db, fecha_obj, id_a_filtrar)

    return {
        "success": True,
        "fecha": fecha,
        "citas": citas_list,
        "total": len(citas_list)
    }

@router.get("/citas/eventos")
async def get_citas_eventos(
    start: Optional[str] = None,
    end: Optional[str] = None,
    doctor_id: Optional[UUID] = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Consulta eventos de calendario agrupados aplicando la regla oficial del admin"""
    id_a_filtrar = doctor_id if (current_user.is_admin and doctor_id) else current_user.id
    eventos_list = await _obtener_eventos_calendario(db, id_a_filtrar, start, end)
    return {
        "success": True,
        "eventos": eventos_list
    }

@router.delete("/citas/{cita_id}")
async def eliminar_cita(
    cita_id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar una cita (soft delete con registro de fecha de borrado)"""
    await verificar_suscripcion_activa(current_user, db)
    
    result = await db.execute(
        select(Cita).where(Cita.id == cita_id, Cita.is_deleted == False)
    )
    cita = result.scalar_one_or_none()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    if cita.odontologo_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permiso para eliminar citas pertenecientes a otro odontólogo."
        )
    
    cita.is_deleted = True
    cita.deleted_at = ahora_naive()
    await db.commit()
    
    return {"success": True, "message": "Cita eliminada"}


# ==================== CITAS CRUD ====================

@router.get("/citas/{cita_id}")
async def get_cita_by_id(
    cita_id: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(
            Cita,
            Paciente.nombres,
            Paciente.apellidos,
            Paciente.telefono.label("paciente_tel_db")
        )
        .outerjoin(Paciente, Cita.paciente_id == Paciente.id)
        .where(
            Cita.id == cita_id,
            Cita.is_deleted == False
        )
    )
    
    # Si NO es administrador, restringimos la búsqueda únicamente a sus propias citas
    if not current_user.is_admin:
        query = query.where(Cita.odontologo_id == current_user.id)
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    cita = row.Cita
    # Construir nombre
    if row.nombres:
        nombre_completo = f"{row.nombres} {row.apellidos or ''}".strip()
    else:
        nombre_completo = cita.nombre_provisional

    return {
        "success": True,
        "id": cita.id,
        "fecha": cita.fecha.strftime('%Y-%m-%d'),
        "hora": cita.hora.strftime('%H:%M') if cita.hora else "",
        "motivo": cita.motivo,
        "doctor": cita.doctor,
        "estado": cita.estado,
        "paciente_id": cita.paciente_id,
        "paciente_nombre": nombre_completo,
        "telefono": row.paciente_tel_db or cita.telefono_provisional or ""
    }


@router.post("/citas")
async def create_cita(
    cita_data: CitaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crear una nueva cita"""
    await verificar_suscripcion_activa(current_user, db)
    
    fecha_str = (cita_data.fecha or "").strip()
    hora_str = (cita_data.hora or "").strip()
    
    if not fecha_str or not hora_str:
        raise HTTPException(status_code=400, detail="Fecha y hora son requeridas")

    try:
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        hora_obj = datetime.strptime(hora_str, '%H:%M').time()
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail="Formato de fecha (YYYY-MM-DD) u hora (HH:MM) inválido."
        )

    if not (time(8, 0) <= hora_obj <= time(20, 30)):
        raise HTTPException(
            status_code=400, 
            detail="El horario permitido de atención es de 08:00 AM a 08:30 PM."
        )

    # Blindaje Cross-Tenant: Verificar pertenencia del paciente si viene especificado
    paciente_valido_id = None
    if cita_data.paciente_id:
        try:
            paciente_uuid = UUID(str(cita_data.paciente_id))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Identificador de paciente inválido.")

        res_pac = await db.execute(
            select(Paciente.id).where(
                Paciente.id == paciente_uuid,
                Paciente.odontologo_id == current_user.id,
                Paciente.is_deleted == False
            )
        )
        if not res_pac.scalar_one_or_none():
            raise HTTPException(
                status_code=404, 
                detail="El paciente especificado no existe o no pertenece a tu consultorio."
            )
        paciente_valido_id = paciente_uuid

    # Crear nueva cita
    nueva_cita = Cita(
        fecha=fecha_obj,
        hora=hora_obj,
        motivo=cita_data.motivo,
        doctor=cita_data.doctor if cita_data.doctor else f"Dr. {current_user.nombres} {current_user.apellidos or ''}".strip(),
        odontologo_id=current_user.id,
        paciente_id=paciente_valido_id,
        # Guardamos nombre y teléfono "sueltos" para que aparezcan en negro si no hay historial
        nombre_provisional=cita_data.paciente_nombre, 
        telefono_provisional=cita_data.paciente_telefono,
        estado='pendiente'
    )
    
    db.add(nueva_cita)
    await db.commit()
    await db.refresh(nueva_cita)
    
    return {
        "success": True,
        "message": "Cita creada exitosamente",
        "cita_id": str(nueva_cita.id)
    }

@router.put("/citas/{cita_id}")
async def update_cita(
    cita_id: UUID,
    cita_data: CitaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar una cita existente preservando cambios en pacientes provisionales"""
    await verificar_suscripcion_activa(current_user, db)
    
    query = select(Cita).where(Cita.id == cita_id, Cita.is_deleted == False)
    if not current_user.is_admin:
        query = query.where(Cita.odontologo_id == current_user.id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    if cita_data.fecha:
        try:
            cita.fecha = datetime.strptime(cita_data.fecha.strip(), '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido (use YYYY-MM-DD).")
    
    if cita_data.hora:
        try:
            hora_obj = datetime.strptime(cita_data.hora.strip(), '%H:%M').time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de hora inválido (use HH:MM).")

        if not (time(8, 0) <= hora_obj <= time(20, 30)):
            raise HTTPException(
                status_code=400, 
                detail="El horario permitido de atención es de 08:00 AM a 08:30 PM."
            )
        cita.hora = hora_obj
    
    cita.motivo = cita_data.motivo if cita_data.motivo is not None else cita.motivo
    cita.doctor = cita_data.doctor if cita_data.doctor is not None else cita.doctor
    
    if cita_data.paciente_id is not None:
        raw_pac_id = str(cita_data.paciente_id).strip()
        if raw_pac_id:
            try:
                pac_uuid = UUID(raw_pac_id)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Identificador de paciente inválido.")

            res_pac = await db.execute(
                select(Paciente.id).where(
                    Paciente.id == pac_uuid,
                    Paciente.odontologo_id == current_user.id,
                    Paciente.is_deleted == False
                )
            )
            if not res_pac.scalar_one_or_none():
                raise HTTPException(
                    status_code=404, 
                    detail="El paciente especificado no existe o no pertenece a tu consultorio."
                )
            cita.paciente_id = pac_uuid
        else:
            cita.paciente_id = None

    # Corrección de pérdida de datos en pacientes provisionales
    if cita_data.paciente_nombre is not None:
        cita.nombre_provisional = cita_data.paciente_nombre
    if cita_data.paciente_telefono is not None:
        cita.telefono_provisional = cita_data.paciente_telefono

    await db.commit()
    
    return {
        "success": True,
        "message": "Cita actualizada exitosamente"
    }



@router.get("/dashboard/home-data")
async def get_home_data(
    selected_date: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    doctor_id: Optional[UUID] = None,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Carga ultraligera unificada para el Dashboard: Saludo, Citas del Día y Eventos Mensuales"""
    await verificar_suscripcion_activa(current_user, db)

    hoy = hoy_local()
    try:
        fecha_agenda = datetime.strptime(selected_date.strip(), '%Y-%m-%d').date() if selected_date else hoy
    except (ValueError, AttributeError):
        fecha_agenda = hoy

    # Criterio oficial admin: por defecto ve su propia agenda, salvo que elija auditar a un doctor específico
    id_a_filtrar = doctor_id if (current_user.is_admin and doctor_id) else current_user.id

    # 1. Eventos del mes (solo se calculan si se navega el calendario con rango)
    eventos_list = []
    if start and end:
        eventos_list = await _obtener_eventos_calendario(db, id_a_filtrar, start, end)

    # 2. Citas detalladas del día
    citas_detalladas = await _obtener_citas_dia_detalladas(db, fecha_agenda, id_a_filtrar)

    return {
        "success": True,
        "usuario": {
            "nombre": current_user.nombres or current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "fecha_actual_formateada": _formatear_fecha_espanol(hoy),
        "total_pacientes": 0,
        "eventos": eventos_list,
        "citas_dia": citas_detalladas,
        "fecha_consultada": fecha_agenda.strftime('%Y-%m-%d')
    }