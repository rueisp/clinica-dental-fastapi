from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from datetime import datetime, timedelta
import uuid
import pytz
import random
import string
from utils.notifications import enviar_alerta_pago_telegram
from schemas.pago import PagoReporte
# Importaciones de tu estructura actual
from database import get_db
from dependencies.auth import get_current_user # Asegúrate de que esta ruta sea correcta
from models import PagoSuscripcion, Plan, Subscription, Usuario, Paciente, PagoClinico # Usamos el nuevo PagoClinico
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
            paciente_nombre=paciente_nombre_final, # ✅ USAR LA VARIABLE FINAL
            concepto=pago_data.descripcion,
            codigo=f"R-{uuid.uuid4().hex[:8].upper()}",
            observacion=pago_data.observacion,
            telefono=telefono_final,  # ✅ USAR LA VARIABLE FINAL
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


@router.post("/reportar")
async def reportar_pago(
    pago_data: PagoReporte, 
    current_user: Usuario = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # Asegúrate de que el frontend envíe el UUID del plan, no un número.
    nuevo_pago = PagoSuscripcion(
        user_id=current_user.id,
        plan_id=pago_data.plan_id, # Aquí se guardará el UUID
        monto=pago_data.monto,
        comprobante_url=pago_data.comprobante_url,
        referencia_pago=pago_data.referencia_pago,
        estado="pendiente"
    )
    
    db.add(nuevo_pago)
    await db.commit()

    # 2. Enviar la alerta a tu celular
    # Usamos un try/except para que si falla el internet o Telegram, 
    # el doctor no vea un error, ya que el pago SÍ se guardó en la DB.
    try:
        await enviar_alerta_pago_telegram(
            doctor_nombre=f"{current_user.nombres} {current_user.apellidos}",
            plan_nombre=pago_data.plan_nombre,
            referencia=pago_data.referencia_pago
        )
    except Exception as e:
        print(f"⚠️ Error enviando Telegram: {e}") # Al menos lo verás en la consola del servidor

    return {"status": "success", "message": "Pago reportado exitosamente. Revisaremos en breve."}


from datetime import datetime, timedelta

@router.post("/admin/aprobar/{pago_id}")
async def aprobar_pago_admin(
    pago_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Verificar que seas el admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    # 2. Convertir pago_id a UUID y buscar el registro
    try:
        pago_uuid = uuid.UUID(pago_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="El ID de pago proporcionado no es válido")

    result_pago = await db.execute(select(PagoSuscripcion).where(PagoSuscripcion.id == pago_uuid))
    pago = result_pago.scalar_one_or_none()
    
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    if pago.estado == "aprobado":
        raise HTTPException(status_code=400, detail="Este pago ya ha sido aprobado previamente")

    # 3. Buscar la suscripción del doctor que realizó el pago
    result_sub = await db.execute(select(Subscription).where(Subscription.user_id == pago.user_id))
    suscripcion = result_sub.scalar_one_or_none()
    
    if not suscripcion:
        # Por seguridad, si no existe la creamos (aunque el trigger o el endpoint previo deberían haberla creado)
        suscripcion = Subscription(user_id=pago.user_id)
        db.add(suscripcion)

    # 4. Buscar los datos del plan (usando el plan_id guardado en el pago)
    result_plan = await db.execute(select(Plan).where(Plan.id == pago.plan_id))
    plan = result_plan.scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="El plan asociado a este pago ya no existe en el catálogo")

    # --- ACTIVACIÓN ---
    ahora = datetime.now(COLOMBIA_TZ)
    
    # Actualizar el registro del pago
    pago.estado = "aprobado"
    pago.fecha_aprobacion = ahora # Campo que tienes en tu modelo PagoSuscripcion

    # Actualizar la suscripción
    suscripcion.plan_type = plan.nombre
    suscripcion.status = "active"
    
    # Calcular vigencia: 
    # Si el usuario ya tiene un plan activo, podrías sumarle días a su fecha de fin.
    # Pero lo estándar en pagos manuales es: Hoy + Duración del plan.
    dias_vigencia = plan.duracion_dias if plan.duracion_dias else 30
    suscripcion.current_period_end = ahora + timedelta(days=dias_vigencia)

    # Nota: Solo usa 'updated_at' si lo agregaste a tu clase Subscription en models.py
    # Si no está en el modelo, comenta la siguiente línea para evitar errores:
    # suscripcion.updated_at = ahora 

    await db.commit()
    
    return {
        "success": True,
        "message": f"¡Éxito! El plan {plan.nombre} ha sido activado para el usuario hasta el {suscripcion.current_period_end.strftime('%Y-%m-%d')}."
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
    
    # Formatear respuesta
    respuesta = []
    for pago in pagos:
        print(f"🔍 Procesando pago: {pago.id}")  # DEBUG
        
        # Obtener datos del usuario
        result_user = await db.execute(select(Usuario).where(Usuario.id == pago.user_id))
        usuario = result_user.scalar_one_or_none()
        print(f"   Usuario: {usuario.email if usuario else 'No encontrado'}")  # DEBUG
        
        # Obtener datos del plan
        result_plan = await db.execute(select(Plan).where(Plan.id == pago.plan_id))
        plan = result_plan.scalar_one_or_none()
        print(f"   Plan: {plan.nombre if plan else 'No encontrado'}")  # DEBUG
        
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
                "estado": pago.estado
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