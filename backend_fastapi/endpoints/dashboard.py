# endpoints/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, Date
from datetime import datetime, timedelta
from typing import Optional
import pytz
from database import get_db
from dependencies.auth import get_current_user
from models import Usuario, Cita, Paciente, Subscription, Plan
from schemas import CitaCreate, CitaUpdate
from uuid import UUID

router = APIRouter()

@router.get("/test-auth")
async def test_auth(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint de prueba para verificar autenticación"""
    return {
        "success": True,
        "user_id": current_user.id,
        "user_email": current_user.email,
        "user_name": current_user.nombres
    }


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint básico del dashboard con saludo y fecha"""
    
    colombia_tz = pytz.timezone('America/Bogota')
    ahora = datetime.now(colombia_tz)
    hoy = ahora.date()
    
    # Contador total de pacientes
    query_total_pacientes = (
        select(func.count(Paciente.id))
        .where(
            Paciente.odontologo_id == current_user.id,
            Paciente.is_deleted == False
        )
    )
    result_total_pacientes = await db.execute(query_total_pacientes)
    total_pacientes = result_total_pacientes.scalar() or 0
    
    # Fechas formateadas
    dias_semana_es = {
        0: 'lunes', 1: 'martes', 2: 'miércoles', 3: 'jueves',
        4: 'viernes', 5: 'sábado', 6: 'domingo'
    }
    meses_es = {
        1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
        5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
    }
    
    fecha_actual_formateada = f"{dias_semana_es[hoy.weekday()]}, {hoy.day} de {meses_es[hoy.month]} de {hoy.year}"
    
    return {
        "success": True,
        "usuario": {
            "nombre": current_user.nombres or current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "fecha_actual_formateada": fecha_actual_formateada,
        "total_pacientes": total_pacientes
    }



@router.get("/citas/por-fecha")
async def get_citas_por_fecha(
    fecha: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")
    
    # 1. Consulta con etiquetas p_nombres, p_apellidos y p_tel
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
            Cita.is_deleted == False,
            Cita.odontologo_id == current_user.id
        )
        .order_by(Cita.hora)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    citas_list = []
    for row in rows:
        cita = row.Cita
        
        # --- LÓGICA DE NOMBRE CORREGIDA ---
        nombre_final = ""
        
        # ✅ CAMBIO: Usamos row.p_nombres para que coincida con el .label("p_nombres")
        if row.p_nombres:
            nombre_final = f"{row.p_nombres} {row.p_apellidos or ''}".strip()
        
        # Prioridad 2: Si no hay paciente en la tabla, usamos el nombre guardado en la cita
        elif cita.nombre_provisional:
            nombre_final = cita.nombre_provisional
            
        # Prioridad 3: Fallback
        if not nombre_final:
            nombre_final = "Paciente sin registrar"

        # ✅ CAMBIO: Usamos row.p_tel para que coincida con el .label("p_tel")
        telefono_final = row.p_tel or cita.telefono_provisional or ""
        
        citas_list.append({
            "id": str(cita.id),
            "paciente_nombre": nombre_final,
            "paciente_id": str(cita.paciente_id) if cita.paciente_id else None,
            "hora": cita.hora.strftime('%H:%M') if cita.hora else "",
            "motivo": cita.motivo or "Consulta",
            "doctor": cita.doctor,
            "estado": cita.estado,
            "telefono": telefono_final
        })
    
    return {
        "success": True,
        "fecha": fecha,
        "citas": citas_list,
        "total": len(citas_list)
    }

@router.get("/citas/eventos")
async def get_citas_eventos(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    
    # Construir query base
    query = (
        select(
            cast(Cita.fecha, Date).label("fecha"),
            func.count(Cita.id).label("total")
        )
        .where(Cita.is_deleted == False)
    )
    
    if not current_user.is_admin:
        query = query.where(Cita.odontologo_id == current_user.id)
    
    # Agrupar por fecha directamente en SQL
    query = query.group_by(cast(Cita.fecha, Date))
    
    result = await db.execute(query)
    eventos_db = result.all()
    
    # Formatear para FullCalendar (mismo formato que antes)
    eventos_list = []
    for fecha, count in eventos_db:
        eventos_list.append({
            "title": f"{count} cita{'s' if count > 1 else ''}",
            "start": fecha.strftime('%Y-%m-%d'),
            "color": "transparent",
            "textColor": "#6b7280"
        })
    
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
    """Eliminar una cita (soft delete)"""
    from models import Cita
    
    result = await db.execute(
        select(Cita).where(Cita.id == cita_id)
    )
    cita = result.scalar_one_or_none()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    if cita.odontologo_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    cita.is_deleted = True
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
            Cita.is_deleted == False,
            Cita.odontologo_id == current_user.id
        )
    )
    
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
    
    from datetime import datetime
    
    # Validar datos básicos
    fecha_str = cita_data.fecha  # ← Cambiado: .get('fecha') → .fecha
    hora_str = cita_data.hora    # ← Cambiado: .get('hora') → .hora
    
    if not fecha_str or not hora_str:
        raise HTTPException(status_code=400, detail="Fecha y hora son requeridas")
    
    try:
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        hora_obj = datetime.strptime(hora_str, '%H:%M').time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha u hora inválido")
    
    # Crear nueva cita
    nueva_cita = Cita(
        fecha=fecha_obj,
        hora=hora_obj,
        motivo=cita_data.motivo,
        odontologo_id=current_user.id,
        paciente_id=cita_data.paciente_id,
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
        "cita_id": nueva_cita.id
    }

@router.put("/citas/{cita_id}")
async def update_cita(
    cita_id: UUID,
    cita_data: CitaUpdate,  # ← Cambiado: dict → CitaUpdate
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar una cita existente"""
    
    from datetime import datetime
    
    # Buscar la cita
    result = await db.execute(
        select(Cita).where(
            Cita.id == cita_id,
            Cita.is_deleted == False,
            Cita.odontologo_id == current_user.id
        )
    )
    cita = result.scalar_one_or_none()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    # Actualizar campos (todos con . en lugar de .get)
    if cita_data.fecha:  # ← Cambiado: .get('fecha') → .fecha
        try:
            cita.fecha = datetime.strptime(cita_data.fecha, '%Y-%m-%d').date()
        except ValueError:
            pass
    
    if cita_data.hora:  # ← Cambiado: .get('hora') → .hora
        try:
            cita.hora = datetime.strptime(cita_data.hora, '%H:%M').time()
        except ValueError:
            pass
    
    # Actualizar solo los campos que existen en el modelo Cita
        cita.motivo = cita_data.motivo if cita_data.motivo is not None else cita.motivo
        cita.doctor = cita_data.doctor if cita_data.doctor is not None else cita.doctor
        
        # IMPORTANTE: Los datos del paciente (nombre/teléfono) NO se guardan en Cita.
        # Si necesitas actualizarlos, se hace en la tabla Paciente, no aquí.
        
        # Actualizar el ID del paciente si se proporciona uno nuevo
        if cita_data.paciente_id is not None:
            cita.paciente_id = cita_data.paciente_id

        await db.commit()
    
    return {
        "success": True,
        "message": "Cita actualizada exitosamente"
    }



@router.get("/dashboard/home-data")
async def get_home_data(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    
    # 🔥 VALIDACIÓN CRÍTICA: Verificar que el usuario tenga un plan activo
    plan_result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == "active"
        )
    )
    user_plan = plan_result.scalar_one_or_none()
    
    if not user_plan:
        raise HTTPException(
            status_code=403,
            detail="Usuario sin plan activo. Contacta al administrador para activar tu suscripción."
        )
    
    # USA ESTO (Consistente con el resto de tu app):
    colombia_tz = pytz.timezone('America/Bogota')
    ahora = datetime.now(colombia_tz)
    hoy = ahora.date()
    
    # ========== 1. STATS ==========
    query_total_pacientes = (
        select(func.count(Paciente.id))
        .where(
            Paciente.odontologo_id == current_user.id,
            Paciente.is_deleted == False
        )
    )
    result_total_pacientes = await db.execute(query_total_pacientes)
    total_pacientes = result_total_pacientes.scalar() or 0
    
    # Formatear fecha
    dias_semana_es = {
        0: 'lunes', 1: 'martes', 2: 'miércoles', 3: 'jueves',
        4: 'viernes', 5: 'sábado', 6: 'domingo'
    }
    meses_es = {
        1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
        5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
        9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
    }
    
    fecha_actual_formateada = f"{dias_semana_es[hoy.weekday()]}, {hoy.day} de {meses_es[hoy.month]} de {hoy.year}"
    
    # ========== 2. EVENTOS ==========
    query_eventos = (
        select(
            cast(Cita.fecha, Date).label("fecha"),
            func.count(Cita.id).label("total")
        )
        .where(Cita.is_deleted == False)
    )
    
    if not current_user.is_admin:
        query_eventos = query_eventos.where(Cita.odontologo_id == current_user.id)
    
    query_eventos = query_eventos.group_by(cast(Cita.fecha, Date))
    
    result_eventos = await db.execute(query_eventos)
    eventos_db = result_eventos.all()
    
    eventos_list = []
    for fecha, count in eventos_db:
        eventos_list.append({
            "title": f"{count} cita{'s' if count > 1 else ''}",
            "start": fecha.strftime('%Y-%m-%d'),
            "color": "transparent",
            "textColor": "#6b7280"
        })
    
    # ========== 3. RESPUESTA ==========
    return {
        "success": True,
        "usuario": {
            "nombre": current_user.nombres or current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "fecha_actual_formateada": fecha_actual_formateada,
        "total_pacientes": total_pacientes,
        "eventos": eventos_list
    }