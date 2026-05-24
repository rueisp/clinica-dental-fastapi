# endpoints/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, Date
from datetime import datetime, timedelta, date
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
    
    # 1. Definimos la consulta base
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
            Cita.is_deleted == False
        )
    )

    # 2. Filtro condicional: Si NO es admin, solo ve lo suyo
    if not current_user.is_admin:
        query = query.where(Cita.odontologo_id == current_user.id)
    
    # 3. Ordenamos y ejecutamos
    query = query.order_by(Cita.hora)
    result = await db.execute(query)
    rows = result.all()
    
    citas_list = []
    for row in rows:
        cita = row.Cita
        
        # Lógica de nombre
        if row.p_nombres:
            nombre_final = f"{row.p_nombres} {row.p_apellidos or ''}".strip()
        elif cita.nombre_provisional:
            nombre_final = cita.nombre_provisional
        else:
            nombre_final = "Paciente sin registrar"

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
    start: Optional[str] = None,  # Nuevo: Fecha inicio (YYYY-MM-DD)
    end: Optional[str] = None,    # Nuevo: Fecha fin (YYYY-MM-DD)
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Optimizado: Obtiene el conteo de citas por día filtrando por un rango 
    específico en SQL para no saturar la memoria.
    """
    
    # 1. Construir query base solo con las columnas necesarias (ID y Fecha)
    query = (
        select(
            Cita.fecha.label("fecha"),
            func.count(Cita.id).label("total")
        )
        .where(Cita.is_deleted == False)
    )
    
    # 2. Filtrar por el dueño de la agenda
    if not current_user.is_admin:
        query = query.where(Cita.odontologo_id == current_user.id)
    
    # 3. FILTRO CRÍTICO: Rango de fechas en SQL
    # Si el frontend no envía fechas, por defecto traemos el mes actual (opcional)
    if start:
        try:
            fecha_inicio = datetime.strptime(start, '%Y-%m-%d').date()
            query = query.where(Cita.fecha >= fecha_inicio)
        except ValueError: pass
        
    if end:
        try:
            fecha_fin = datetime.strptime(end, '%Y-%m-%d').date()
            query = query.where(Cita.fecha <= fecha_fin)
        except ValueError: pass
    
    # 4. Agrupar
    query = query.group_by(Cita.fecha)
    
    result = await db.execute(query)
    eventos_db = result.all()
    
    # 5. Formatear para FullCalendar
    eventos_list = []
    for row in eventos_db:
        eventos_list.append({
            "title": f"{row.total} cita{'s' if row.total > 1 else ''}",
            "start": row.fecha.strftime('%Y-%m-%d'),
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
        paciente_id=cita_data.paciente_id if cita_data.paciente_id else None,
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
    selected_date: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    doctor_id: Optional[UUID] = None,  # <-- AGREGADO: Parámetro opcional para el admin
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. VALIDACIÓN DE SUSCRIPCIÓN (Se mantiene igual...)
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
    
    # 2. CONFIGURACIÓN DE FECHA LOCAL (Colombia)
    colombia_tz = pytz.timezone('America/Bogota')
    ahora = datetime.now(colombia_tz)
    hoy = ahora.date()
    
    try:
        fecha_agenda = datetime.strptime(selected_date, '%Y-%m-%d').date() if selected_date else hoy
    except ValueError:
        fecha_agenda = hoy

    # 3. OPTIMIZACIÓN CRÍTICA: Solo contar pacientes si estamos en vista mensual/calendario (start y end presentes)
    total_pacientes = 0
    eventos_list = []
    
    if start and end:
        # Solo ejecutamos esta consulta pesada si el usuario está navegando el calendario mensual
        query_total_pacientes = (
            select(func.count(Paciente.id))
            .where(
                Paciente.odontologo_id == current_user.id,
                Paciente.is_deleted == False
            )
        )
        result_total_pacientes = await db.execute(query_total_pacientes)
        total_pacientes = result_total_pacientes.scalar() or 0

        # 5. EVENTOS DEL CALENDARIO (Se mantiene igual, solo se ejecuta si start y end existen...)
        query_eventos = (
            select(
                Cita.fecha.label("fecha"),
                func.count(Cita.id).label("total")
            )
            .where(Cita.is_deleted == False)
        )

        # Lógica de filtrado inteligente para los eventos del calendario
        if current_user.is_admin:
            # Si el admin seleccionó un doctor, el calendario mensual muestra solo sus eventos.
            # Si no seleccionó ninguno, por defecto muestra sus propios eventos.
            id_a_filtrar = doctor_id if doctor_id else current_user.id
            query_eventos = query_eventos.where(Cita.odontologo_id == id_a_filtrar)
        else:
            # Si es un doctor normal, solo ve sus propios eventos
            query_eventos = query_eventos.where(Cita.odontologo_id == current_user.id)

        try:
            fecha_inicio = datetime.strptime(start, '%Y-%m-%d').date()
            query_eventos = query_eventos.where(Cita.fecha >= fecha_inicio)
        except ValueError: pass
            
        try:
            fecha_fin = datetime.strptime(end, '%Y-%m-%d').date()
            query_eventos = query_eventos.where(Cita.fecha <= fecha_fin)
        except ValueError: pass

        query_eventos = query_eventos.group_by(Cita.fecha)
        result_eventos = await db.execute(query_eventos)
        eventos_db = result_eventos.all()

        for row in eventos_db:
            eventos_list.append({
                "title": f"{row.total} cita{'s' if row.total > 1 else ''}",
                "start": row.fecha.strftime('%Y-%m-%d'),
                "color": "transparent",
                "textColor": "#6b7280"
            })

    # 4. FORMATEO DE FECHA PARA EL SALUDO (Se mantiene igual...)
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
    
    # 6. CITAS DETALLADAS DEL DÍA (Optimizado para traer solo lo necesario de forma asíncrona)
    query_citas_dia = (
        select(
            Cita,
            Paciente.nombres.label("p_nombres"),
            Paciente.apellidos.label("p_apellidos"),
            Paciente.telefono.label("p_tel")
        )
        .outerjoin(Paciente, Cita.paciente_id == Paciente.id)
        .where(
            Cita.fecha == fecha_agenda,
            Cita.is_deleted == False
        )
    )

    # LÓGICA DE FILTRADO INTELIGENTE PARA EL ADMIN
    if current_user.is_admin:
        # Si eres admin y seleccionaste un doctor, filtramos por su ID.
        # Si no seleccionaste ninguno, por defecto te mostramos tus propias citas.
        id_a_filtrar = doctor_id if doctor_id else current_user.id
        query_citas_dia = query_citas_dia.where(Cita.odontologo_id == id_a_filtrar)
    else:
        # Si es un doctor normal, solo puede ver sus propias citas
        query_citas_dia = query_citas_dia.where(Cita.odontologo_id == current_user.id)
    
    query_citas_dia = query_citas_dia.order_by(Cita.hora)
    result_citas = await db.execute(query_citas_dia)
    rows_citas = result_citas.all()
    
    citas_detalladas = []
    for row in rows_citas:
        cita = row.Cita
        nombre_final = f"{row.p_nombres} {row.p_apellidos or ''}".strip() if row.p_nombres else (cita.nombre_provisional or "Paciente sin registrar")
        
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
    
    # 7. RESPUESTA FINAL COMPLETA
    return {
        "success": True,
        "usuario": {
            "nombre": current_user.nombres or current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "fecha_actual_formateada": fecha_actual_formateada,
        "total_pacientes": total_pacientes,
        "eventos": eventos_list,
        "citas_dia": citas_detalladas,
        "fecha_consultada": fecha_agenda.strftime('%Y-%m-%d')
    }