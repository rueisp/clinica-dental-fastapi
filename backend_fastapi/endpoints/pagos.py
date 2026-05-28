from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, extract
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import pytz
import random
import string

# Importaciones de la aplicación (Sin el prefijo de carpeta raíz)
from utils.notifications import enviar_alerta_pago_telegram
from database import get_db
from dependencies.auth import get_current_user
from models import PagoSuscripcion, Plan, Subscription, Usuario, Paciente, PagoClinico

# Importaciones de esquemas agrupadas
from schemas.pago import PagoCreate, PagoResponse, PagoReporte

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
        # 1. Obtener el momento exacto en Colombia
        ahora_colombia = datetime.now(COLOMBIA_TZ)
        paciente_nombre_final = pago_data.paciente_nombre
        telefono_final = pago_data.telefono
        
        if pago_data.paciente_id:
            result = await db.execute(
                select(Paciente).where(Paciente.id == pago_data.paciente_id)
            )
            paciente = result.scalar_one_or_none()
            if paciente:
                paciente_nombre_final = f"{paciente.nombres} {paciente.apellidos}"
                if not telefono_final and paciente.telefono:
                    telefono_final = paciente.telefono
        
        # 2. Crear el registro
        nuevo_pago = PagoClinico(
            paciente_id=pago_data.paciente_id,
            odontologo_id=current_user.id,
            monto=pago_data.monto,
            metodo_pago=pago_data.metodo_pago,
            fecha=ahora_colombia,
            hora=ahora_colombia.time(),
            paciente_nombre=paciente_nombre_final,
            concepto=pago_data.concepto,
            codigo=generar_codigo_unico(),
            observacion=pago_data.observacion,
            telefono=telefono_final,
            es_rapido=pago_data.es_rapido
        )

        db.add(nuevo_pago)
        await db.commit()
        await db.refresh(nuevo_pago)

        # 3. Formatear la fecha de forma segura como objeto date local sin modificar el objeto de la DB
        fecha_local = nuevo_pago.fecha
        if isinstance(fecha_local, datetime):
            fecha_local = fecha_local.astimezone(COLOMBIA_TZ).date()
        elif isinstance(fecha_local, str):
            try:
                fecha_local = datetime.strptime(fecha_local, '%Y-%m-%d').date()
            except ValueError:
                pass

        return PagoResponse(
            id=nuevo_pago.id,
            codigo=nuevo_pago.codigo,
            paciente_id=nuevo_pago.paciente_id,
            paciente_nombre=nuevo_pago.paciente_nombre,
            fecha=fecha_local,
            hora=nuevo_pago.hora,
            monto=float(nuevo_pago.monto),
            metodo_pago=nuevo_pago.metodo_pago,
            concepto=nuevo_pago.concepto,
            observacion=nuevo_pago.observacion,
            telefono=nuevo_pago.telefono,
            es_rapido=nuevo_pago.es_rapido,
            created_at=nuevo_pago.fecha if isinstance(nuevo_pago.fecha, datetime) else None
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{id}", response_model=PagoResponse)
async def obtener_pago(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PagoClinico).where(PagoClinico.id == id))
    pago = result.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return pago

# En endpoints/pagos.py

@router.get("/codigo/{codigo}")
async def obtener_pago_por_codigo(
    codigo: str, 
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(PagoClinico, Usuario)
        .join(Usuario, PagoClinico.odontologo_id == Usuario.id)
        .where(PagoClinico.codigo == codigo)
    )
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Recibo no encontrado")

    pago, doctor = row
    
    # Formatear la fecha de forma segura sin modificar el objeto de la DB
    fecha_str = ""
    if pago.fecha:
        if isinstance(pago.fecha, datetime):
            fecha_str = pago.fecha.astimezone(COLOMBIA_TZ).strftime('%Y-%m-%d')
        else:
            # Si ya es un objeto date, lo formateamos directamente sin astimezone
            fecha_str = pago.fecha.strftime('%Y-%m-%d')
    return {
        "codigo": pago.codigo,
        "paciente_nombre": pago.paciente_nombre or "Paciente",
        "fecha": fecha_str,
        "hora": pago.hora.strftime('%H:%M') if pago.hora else "",
        "monto": float(pago.monto),
        "metodo_pago": pago.metodo_pago,
        "concepto": pago.concepto or "Consulta",
        "observacion": pago.observacion,
        "telefono": pago.telefono,
        "clinica_nombre": doctor.nombre_consultorio or f"Dr. {doctor.nombres} {doctor.apellidos}",
        "clinica_telefono": doctor.telefono or ""
    }

@router.get("/")
async def listar_pagos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    page: int = 1,
    per_page: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Consulta base filtrada por el odontólogo
    query = select(PagoClinico).where(PagoClinico.odontologo_id == current_user.id)
    
    # 2. FILTRO SQL: Solo traer el mes y año solicitado
    if mes and anio:
        query = query.where(extract('month', PagoClinico.fecha) == mes)
        query = query.where(extract('year', PagoClinico.fecha) == anio)
    
    # 3. CONTEO TOTAL: Antes de recortar por página
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0
    
    # 4. PAGINACIÓN: Aplicar orden y límites
    offset = (page - 1) * per_page
    query = query.order_by(PagoClinico.fecha.desc(), PagoClinico.id.desc()).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    pagos_db = result.scalars().all()

    # 5. Construir la respuesta mapeando a diccionarios limpios sin alterar la DB
    pagos_list = []
    for p in pagos_db:
        fecha_str = ""
        if p.fecha:
            if isinstance(p.fecha, datetime):
                fecha_str = p.fecha.astimezone(COLOMBIA_TZ).strftime('%Y-%m-%d')
            else:
                fecha_str = p.fecha.strftime('%Y-%m-%d')
                
        pagos_list.append({
            "id": p.id,
            "codigo": p.codigo,
            "paciente_id": p.paciente_id,
            "paciente_nombre": p.paciente_nombre or "Paciente General",
            "fecha": fecha_str,
            "hora": p.hora.strftime('%H:%M') if p.hora else None,
            "monto": float(p.monto),
            "metodo_pago": p.metodo_pago or "Efectivo",
            "concepto": p.concepto or "Consulta",
            "observacion": p.observacion,
            "telefono": p.telefono,
            "es_rapido": p.es_rapido
        })

    return {
        "total": total_count,
        "pagos": pagos_list,
        "total_pages": (total_count + per_page - 1) // per_page
    }


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

@router.post("/reportar")
async def reportar_pago(
    pago_data: PagoReporte, 
    current_user: Usuario = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # 1. CANDADO DE SEGURIDAD: Verificar si la referencia ya existe
    query_check = select(PagoSuscripcion).where(
        PagoSuscripcion.referencia_pago == pago_data.referencia_pago
    )
    result_check = await db.execute(query_check)
    if result_check.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Esta referencia de pago ya fue reportada. Si crees que es un error, contacta a soporte."
        )

    # 2. Guardar el reporte en la base de datos
    nuevo_pago = PagoSuscripcion(
        user_id=current_user.id,
        plan_id=pago_data.plan_id, 
        monto=pago_data.monto,
        comprobante_url=pago_data.comprobante_url,
        referencia_pago=pago_data.referencia_pago,
        estado="pendiente"
    )
    
    db.add(nuevo_pago)
    
    # 3. Actualizar la suscripción a 'pending_payment'
    result_sub = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    suscripcion = result_sub.scalar_one_or_none()
    if suscripcion:
        suscripcion.status = "pending_payment"
        suscripcion.plan_type = pago_data.plan_nombre

    await db.commit()

    # 4. Enviar la alerta a Telegram
    try:
        await enviar_alerta_pago_telegram(
            doctor_nombre=f"{current_user.nombres} {current_user.apellidos}",
            plan_nombre=pago_data.plan_nombre,
            referencia=pago_data.referencia_pago
        )
        print("✅ Alerta de Telegram enviada con éxito")
    except Exception as e:
        print(f"❌ Error enviando Telegram: {str(e)}")

    return {"status": "success", "message": "Pago reportado exitosamente. Revisaremos en breve."}


@router.post("/admin/aprobar/{pago_id}")
async def aprobar_pago_admin(
    pago_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Validación de Admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    # 2. Convertir y buscar el pago
    try:
        pago_uuid = uuid.UUID(pago_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de pago inválido")

    result_pago = await db.execute(select(PagoSuscripcion).where(PagoSuscripcion.id == pago_uuid))
    pago = result_pago.scalar_one_or_none()
    
    if not pago or pago.estado == "aprobado":
        raise HTTPException(status_code=404, detail="Pago no encontrado o ya aprobado")

    # 3. Buscar el plan y la suscripción
    result_plan = await db.execute(select(Plan).where(Plan.id == pago.plan_id))
    plan = result_plan.scalar_one_or_none()
    
    result_sub = await db.execute(select(Subscription).where(Subscription.user_id == pago.user_id))
    suscripcion = result_sub.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    # 4. Lógica de fechas
    ahora_con_tz = datetime.now(COLOMBIA_TZ)
    ahora = ahora_con_tz.replace(tzinfo=None)
    dias_a_sumar = plan.duracion_dias if plan.duracion_dias else 30

    fecha_fin_actual = suscripcion.current_period_end
    if fecha_fin_actual and fecha_fin_actual.tzinfo is not None:
        fecha_fin_actual = fecha_fin_actual.replace(tzinfo=None)

    if fecha_fin_actual and fecha_fin_actual > ahora:
        nueva_fecha_fin = fecha_fin_actual + timedelta(days=dias_a_sumar)
    else:
        nueva_fecha_fin = ahora + timedelta(days=dias_a_sumar)

    # 5. ACTUALIZAR MODELOS (Sincronizando plan_id y plan_type)
    pago.estado = "aprobado"
    pago.fecha_aprobacion = ahora

    if suscripcion:
        suscripcion.plan_id = plan.id  # <--- Sincronización agregada
        suscripcion.plan_type = plan.nombre
        suscripcion.status = "active"
        suscripcion.current_period_end = nueva_fecha_fin
    else:
        nueva_sub = Subscription(
            user_id=pago.user_id,
            plan_id=plan.id,  # <--- Sincronización agregada
            plan_type=plan.nombre,
            status="active",
            current_period_end=nueva_fecha_fin
        )
        db.add(nueva_sub)

    await db.commit()
    
    return {
        "success": True, 
        "message": f"¡Plan {plan.nombre} activado! Vence el {nueva_fecha_fin.strftime('%Y-%m-%d')}"
    }


@router.get("/admin/pendientes")
async def obtener_pagos_pendientes(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verificar que sea admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    
    # Buscar pagos pendientes
    query = select(PagoSuscripcion).where(PagoSuscripcion.estado == "pendiente")
    result = await db.execute(query)
    pagos = result.scalars().all()
    
    print(f"📊 Pagos encontrados: {len(pagos)}")  # DEBUG
    
    # Bucle corregido para obtener_pagos_pendientes
    respuesta = []
    for pago in pagos:
        print(f"🔍 Procesando pago: {pago.id}")  # DEBUG
        
        # 1. Obtener datos del usuario
        result_user = await db.execute(select(Usuario).where(Usuario.id == pago.user_id))
        usuario = result_user.scalar_one_or_none()
        
        # 2. Obtener datos del plan solicitado
        result_plan = await db.execute(select(Plan).where(Plan.id == pago.plan_id))
        plan = result_plan.scalar_one_or_none()

        # 3. Obtener suscripción actual para ver cuánto tiempo le queda (CANDADO DE SEGURIDAD)
        result_sub = await db.execute(select(Subscription).where(Subscription.user_id == pago.user_id))
        sub = result_sub.scalar_one_or_none()

        # Cálculo de días actuales (Sincronizado con Bogotá)
        dias_acumulados = 0
        if sub and sub.current_period_end:
            ahora = datetime.now(COLOMBIA_TZ).replace(tzinfo=None)
            vence = sub.current_period_end.replace(tzinfo=None)
            if vence > ahora:
                dias_acumulados = (vence - ahora).days

        print(f"   Usuario: {usuario.email if usuario else 'No encontrado'} - Días previos: {dias_acumulados}")  # DEBUG
        
        respuesta.append({
            "pago": {
                "id": str(pago.id),
                "usuario_nombre": f"{usuario.nombres} {usuario.apellidos}" if usuario else "Desconocido",
                "usuario_email": usuario.email if usuario else "N/A",
                "plan_nombre": plan.nombre if plan else "Desconocido",
                "monto": pago.monto,
                "referencia_pago": pago.referencia_pago,
                "comprobante_url": pago.comprobante_url,
                "fecha_reporte": pago.fecha_reporte.isoformat() if pago.fecha_reporte else None,
                "estado": pago.estado,
                "dias_actuales": dias_acumulados  # <--- NUEVO CAMPO ENVIADO AL FRONTEND
            }
        })
    
    print(f"✅ Respuesta final: {len(respuesta)} items")  # DEBUG
    return respuesta


@router.get("/admin/todos")
async def obtener_todos_pagos_suscripcion(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    # 1. Verificar que sea admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    
    # 2. Buscar todos los pagos (con paginación)
    query = select(PagoSuscripcion).order_by(
        PagoSuscripcion.fecha_reporte.desc()
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    pagos = result.scalars().all()
    
    # 3. Contar total
    count_query = select(func.count()).select_from(PagoSuscripcion)
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 4. Enriquecer con datos de usuario y plan
    respuesta = []
    for pago in pagos:
        result_user = await db.execute(
            select(Usuario).where(Usuario.id == pago.user_id)
        )
        usuario = result_user.scalar_one_or_none()
        
        result_plan = await db.execute(
            select(Plan).where(Plan.id == pago.plan_id)
        )
        plan = result_plan.scalar_one_or_none()
        
        respuesta.append({
            "id": str(pago.id),
            "usuario_nombre": f"{usuario.nombres} {usuario.apellidos}" if usuario else "Desconocido",
            "usuario_email": usuario.email if usuario else "N/A",
            "plan_nombre": plan.nombre if plan else "Desconocido",
            "monto": pago.monto,
            "referencia_pago": pago.referencia_pago,
            "comprobante_url": pago.comprobante_url,
            "fecha_reporte": pago.fecha_reporte.isoformat() if pago.fecha_reporte else None,
            "fecha_aprobacion": pago.fecha_aprobacion.isoformat() if pago.fecha_aprobacion else None,
            "estado": pago.estado,
            "observacion_admin": pago.observacion_admin
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "pagos": respuesta
    }

@router.get("/admin/usuarios-resumen")
async def obtener_resumen_usuarios(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Unimos Usuario con Subscription para traer todo de un golpe
    query = select(Usuario, Subscription).join(Subscription, Usuario.id == Subscription.user_id)
    result = await db.execute(query)
    rows = result.all()

    respuesta = []
    for user, sub in rows:
        # Contamos de forma ultra-rápida en SQL cuántos pacientes activos tiene este doctor
        count_query = select(func.count(Paciente.id)).where(
            Paciente.odontologo_id == user.id,
            Paciente.is_deleted == False
        )
        count_result = await db.execute(count_query)
        total_pacientes = count_result.scalar() or 0

        respuesta.append({
            "id": str(user.id),
            "nombre": f"{user.nombres} {user.apellidos}",
            "email": user.email,
            "plan_actual": sub.plan_type,
            "estado": sub.status,
            "vence": sub.current_period_end.strftime('%Y-%m-%d') if sub.current_period_end else "N/A",
            "total_pacientes": total_pacientes  # <-- ENVIADO AL FRONTEND
        })
    
    return respuesta

@router.post("/admin/activar-manual/{user_id}")
async def activar_manual_admin(
    user_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No autorizado")

    # 1. Buscar la suscripción
    res_sub = await db.execute(select(Subscription).where(Subscription.user_id == uuid.UUID(user_id)))
    suscripcion = res_sub.scalar_one_or_none()
    
    if not suscripcion:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")

    # 2. Buscar el plan
    plan_nombre = suscripcion.plan_type if suscripcion.plan_type and suscripcion.plan_type != 'trial' else 'pro_mensual'
    res_plan = await db.execute(select(Plan).where(Plan.nombre == plan_nombre))
    plan = res_plan.scalar_one_or_none()

    # 3. Calcular fechas LIMPIAS
    ahora = datetime.now(COLOMBIA_TZ).replace(tzinfo=None)
    dias = plan.duracion_dias if plan else 30
    vencimiento = ahora + timedelta(days=dias)

    # 4. Actualizar campos (Sincronizando plan_id y plan_type)
    suscripcion.status = "active"
    suscripcion.plan_id = plan.id if plan else suscripcion.plan_id  # <--- Sincronización agregada
    suscripcion.plan_type = plan.nombre if plan else plan_nombre
    suscripcion.current_period_start = ahora
    suscripcion.current_period_end = vencimiento
    suscripcion.updated_at = ahora

    # 5. Forzar el guardado
    await db.commit()
    return {"success": True, "message": "Activado correctamente"}

@router.post("/admin/rechazar/{pago_id}")
async def rechazar_pago_admin(
    pago_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Validación de Admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    # 2. Buscar el pago
    try:
        pago_uuid = uuid.UUID(pago_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de pago inválido")

    result_pago = await db.execute(select(PagoSuscripcion).where(PagoSuscripcion.id == pago_uuid))
    pago = result_pago.scalar_one_or_none()
    
    if not pago or pago.estado != "pendiente":
        raise HTTPException(status_code=404, detail="Pago no encontrado o ya procesado")

    # 3. Buscar la suscripción del usuario para desbloquearla
    result_sub = await db.execute(select(Subscription).where(Subscription.user_id == pago.user_id))
    suscripcion = result_sub.scalar_one_or_none()

    # 4. ACTUALIZAR ESTADOS
    pago.estado = "rechazado"
    if suscripcion:
        # Devolvemos a 'active' para que el doctor pueda intentar reportar de nuevo
        suscripcion.status = "active" 

    await db.commit()
    
    return {"success": True, "message": "Pago rechazado. El usuario ha sido desbloqueado."}