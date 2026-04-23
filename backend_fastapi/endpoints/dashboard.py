# endpoints/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, Date
from datetime import datetime, timedelta
from typing import Optional
import pytz
from database import get_db
from dependencies.auth import get_current_user
from models_fastapi import Usuario, Cita, Paciente
from schemas import CitaCreate, CitaUpdate

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
        "user_name": current_user.nombre_completo
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
            "nombre": current_user.nombre_completo or current_user.username,
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
    """Obtener citas para una fecha específica"""
    
    try:
        fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    
    query = (
        select(
            Cita.id,
            Cita.hora,
            Cita.motivo,
            Cita.doctor,
            Cita.estado,
            Cita.paciente_id,
            case(
                (Cita.paciente_id.isnot(None), 
                 func.concat(Paciente.nombres, ' ', Paciente.apellidos)),
                else_=func.concat(Cita.pre_nombres, ' ', Cita.pre_apellidos)
            ).label("paciente_nombre"),
            case(
                (Cita.paciente_id.isnot(None), Paciente.telefono),
                else_=Cita.pre_telefono
            ).label("telefono")
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
    citas = result.all()
    
    citas_list = []
    for cita in citas:
        hora_formateada = ""
        if cita.hora:
            hora_formateada = cita.hora.strftime('%H:%M')
        
        citas_list.append({
            "id": cita.id,
            "paciente_nombre": cita.paciente_nombre or "Paciente sin registrar",
            "paciente_id": cita.paciente_id,
            "hora": hora_formateada,
            "motivo": cita.motivo or "Consulta",
            "doctor": cita.doctor,
            "estado": cita.estado,
            "telefono": cita.telefono or ""
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
    cita_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar una cita (soft delete)"""
    from models_fastapi import Cita
    
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
    cita_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener una cita por su ID"""
    
    query = (
        select(
            Cita.id,
            Cita.fecha,
            Cita.hora,
            Cita.motivo,
            Cita.doctor,
            Cita.estado,
            Cita.paciente_id,
            case(
                (Cita.paciente_id.isnot(None), 
                 func.concat(Paciente.nombres, ' ', Paciente.apellidos)),
                else_=func.concat(Cita.pre_nombres, ' ', Cita.pre_apellidos)
            ).label("paciente_nombre"),
            case(
                (Cita.paciente_id.isnot(None), Paciente.telefono),
                else_=Cita.pre_telefono
            ).label("telefono")
        )
        .outerjoin(Paciente, Cita.paciente_id == Paciente.id)
        .where(
            Cita.id == cita_id,
            Cita.is_deleted == False,
            Cita.odontologo_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    cita = result.first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    hora_formateada = ""
    if cita.hora:
        hora_formateada = cita.hora.strftime('%H:%M')
    
    return {
        "success": True,
        "id": cita.id,
        "fecha": cita.fecha.strftime('%Y-%m-%d'),
        "hora": hora_formateada,
        "motivo": cita.motivo,
        "doctor": cita.doctor,
        "estado": cita.estado,
        "paciente_id": cita.paciente_id,
        "paciente_nombre": cita.paciente_nombre,
        "telefono": cita.telefono
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
        motivo=cita_data.motivo,                    # ← Cambiado
        doctor=cita_data.doctor,                    # ← Cambiado
        estado='pendiente',
        odontologo_id=current_user.id,
        paciente_id=cita_data.paciente_id,          # ← Cambiado
        pre_nombres=cita_data.paciente_nombre,      # ← Cambiado
        pre_apellidos='',
        pre_telefono=cita_data.paciente_telefono    # ← Cambiado
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
    cita_id: int,
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
    
    cita.motivo = cita_data.motivo if cita_data.motivo is not None else cita.motivo  # ← Cambiado
    cita.doctor = cita_data.doctor if cita_data.doctor is not None else cita.doctor  # ← Cambiado
    cita.pre_nombres = cita_data.paciente_nombre if cita_data.paciente_nombre is not None else cita.pre_nombres  # ← Cambiado
    cita.pre_telefono = cita_data.paciente_telefono if cita_data.paciente_telefono is not None else cita.pre_telefono  # ← Cambiado
    cita.paciente_id = cita_data.paciente_id if cita_data.paciente_id is not None else cita.paciente_id  # ← Cambiado
    
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
    
    colombia_tz = pytz.timezone('America/Bogota')
    ahora = datetime.now(colombia_tz)
    hoy = ahora.date()
    
    # ========== 1. STATS (igual que /dashboard/stats) ==========
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
    
    # ========== 2. EVENTOS (versión optimizada que ya implementaste) ==========
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
    
    # ========== 3. RESPUESTA COMBINADA ==========
    return {
        "success": True,
        "usuario": {
            "nombre": current_user.nombre_completo or current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "fecha_actual_formateada": fecha_actual_formateada,
        "total_pacientes": total_pacientes,
        "eventos": eventos_list
    }