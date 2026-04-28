# endpoints/pacientes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from typing import Optional
import cloudinary.uploader
import cloudinary
import pytz
import os
from pydantic import BaseModel
from database import get_db
from dependencies.auth import get_current_user
from dependencies.limites import verificar_limite_pacientes
from models import Usuario, Paciente, LimiteDiario, Evolucion
from sqlalchemy import or_, delete



router = APIRouter()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dlueb7c6r"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "769636716889216"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "Z2YYOqLAi0ql4jFGjhHiDjslApo")
)



class PacienteUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    tipo_documento: Optional[str] = None
    documento: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    edad: Optional[int] = None
    sexo: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    barrio: Optional[str] = None
    motivo_consulta: Optional[str] = None
    enfermedad_actual: Optional[str] = None
    alergias: Optional[str] = None
    observaciones: Optional[str] = None
    dentigrama_canvas: Optional[str] = None
    ocupacion: Optional[str] = None
    cepillado_dental: Optional[str] = None
    habitos: Optional[str] = None


@router.post("/pacientes")
async def crear_paciente(
    nombres: str = Form(...),
    apellidos: str = Form(...),
    tipo_documento: Optional[str] = Form(None),
    documento: Optional[str] = Form(None),
    fecha_nacimiento: Optional[str] = Form(None),
    edad: Optional[int] = Form(None),
    sexo: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    telefono: str = Form(...),
    direccion: Optional[str] = Form(None),
    barrio: Optional[str] = Form(None),
    motivo_consulta: Optional[str] = Form(None),
    enfermedad_actual: Optional[str] = Form(None),
    alergias: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    dentigrama_canvas: Optional[str] = Form(None),
    imagen_perfil: Optional[UploadFile] = File(None),
    ocupacion: Optional[str] = Form(None),
    cepillado_dental: Optional[str] = Form(None),
    habitos: Optional[str] = Form(None),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verificar_limite_pacientes(current_user, db)
    
    # 1. Verificar documento duplicado
    if documento:
        result = await db.execute(
            select(Paciente).where(
                Paciente.documento == documento,
                Paciente.is_deleted == False
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(400, detail=f"Ya existe un paciente con el documento {documento}")
    
    # 2. Procesar fecha de nacimiento
    fecha_nacimiento_obj = None
    if fecha_nacimiento:
        try:
            fecha_nacimiento_obj = datetime.strptime(fecha_nacimiento, '%Y-%m-%d').date()
        except:
            pass
    
    if not edad and fecha_nacimiento_obj:
        hoy = date.today()
        edad = hoy.year - fecha_nacimiento_obj.year
        if (hoy.month, hoy.day) < (fecha_nacimiento_obj.month, fecha_nacimiento_obj.day):
            edad -= 1
    
    # 3. Crear paciente SIN imágenes aún
    nuevo_paciente = Paciente(
        nombres=nombres,
        apellidos=apellidos,
        tipo_documento=tipo_documento,
        documento=documento,
        fecha_nacimiento=fecha_nacimiento_obj,
        edad=edad,
        sexo=sexo,
        email=email,
        telefono=telefono,
        direccion=direccion,
        barrio=barrio,
        motivo_consulta=motivo_consulta,
        enfermedad_actual=enfermedad_actual,
        alergias=alergias,
        observaciones=observaciones,
        dentigrama_canvas=None,
        imagen_perfil_url=None,
        odontologo_id=current_user.id,
        is_deleted=False,
        ocupacion=ocupacion,
        cepillado_dental=cepillado_dental,
        habitos=habitos
    )
    
    db.add(nuevo_paciente)
    await db.flush()  # Obtener ID sin commit final
    await db.refresh(nuevo_paciente)
    
    # 4. Subir imagen de perfil (si viene)
    if imagen_perfil and imagen_perfil.filename:
        try:
            upload_result = cloudinary.uploader.upload(
                await imagen_perfil.read(),
                public_id=f"pacientes/{current_user.id}/perfil_paciente_{nuevo_paciente.id}",
                overwrite=True
            )
            nuevo_paciente.imagen_perfil_url = upload_result.get('secure_url')
        except Exception as e:
            raise HTTPException(500, detail=f"Error al subir imagen de perfil: {str(e)}")
    
    # 5. Subir dentigrama (si viene)
    if dentigrama_canvas and dentigrama_canvas.startswith('data:image'):
        try:
            upload_result = cloudinary.uploader.upload(
                dentigrama_canvas,
                public_id=f"dentigramas/{current_user.id}/dentigrama_paciente_{nuevo_paciente.id}",
                overwrite=True
            )
            nuevo_paciente.dentigrama_canvas = upload_result.get('secure_url')
        except Exception as e:
            raise HTTPException(500, detail=f"Error al subir dentigrama: {str(e)}")
    
    # 6. Incrementar límite diario
    fecha_hoy = date.today()
    limite_diario = await db.execute(
        select(LimiteDiario).where(
            LimiteDiario.usuario_id == current_user.id,
            LimiteDiario.fecha == fecha_hoy
        )
    )
    limite = limite_diario.scalar_one_or_none()
    if limite:
        limite.contador_pacientes += 1
    
    await db.commit()
    await db.refresh(nuevo_paciente)
    
    return {
        "success": True,
        "message": "Paciente creado exitosamente",
        "paciente_id": nuevo_paciente.id,
        "redirect_url": "/pacientes/lista"
    }


@router.get("/pacientes")
async def listar_pacientes(
    page: int = 1,
    search: str = "",
    per_page: int = 6,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar pacientes con paginación y búsqueda"""
    
    query = select(Paciente).where(Paciente.is_deleted == False)
    
    if not current_user.is_admin:
        query = query.where(Paciente.odontologo_id == current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Paciente.nombres.ilike(search_term),
                Paciente.apellidos.ilike(search_term),
                Paciente.telefono.ilike(search_term)
            )
        )
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.execute(count_query)
    total_count = total.scalar() or 0
    
    offset = (page - 1) * per_page
    query = query.order_by(Paciente.id.desc()).offset(offset).limit(per_page)
    
    result = await db.execute(query)
    pacientes = result.scalars().all()
    
    pacientes_list = []
    for p in pacientes:
        pacientes_list.append({
            "id": p.id,
            "nombres": p.nombres,
            "apellidos": p.apellidos,
            "documento": p.documento or "-",
            "telefono": p.telefono,
        })
    
    return {
        "success": True,
        "pacientes": pacientes_list,
        "total": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_count + per_page - 1) // per_page
    }

# Obtener pacientes en papelera (soft deleted)
@router.get("/pacientes/papelera")
async def listar_papelera(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Paciente).where(
        Paciente.is_deleted == True
    )
    
    if not current_user.is_admin:
        query = query.where(Paciente.odontologo_id == current_user.id)
    
    query = query.order_by(Paciente.deleted_at.desc())
    
    result = await db.execute(query)
    pacientes = result.scalars().all()
    
    return {
        "success": True,
        "pacientes": [
            {
                "id": p.id,
                "nombres": p.nombres,
                "apellidos": p.apellidos,
                "documento": p.documento,
                "deleted_at": p.deleted_at.strftime('%Y-%m-%d %H:%M') if p.deleted_at else None
            }
            for p in pacientes
        ]
    }


@router.get("/pacientes/{paciente_id}")
async def obtener_paciente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener datos de un paciente específico"""
    
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == False
        )
    )
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este paciente")
    
    fecha_nacimiento_str = None
    if paciente.fecha_nacimiento:
        fecha_nacimiento_str = paciente.fecha_nacimiento.strftime('%d/%m/%Y')
    
    return {
        "success": True,
        "id": paciente.id,
        "nombres": paciente.nombres,
        "apellidos": paciente.apellidos,
        "nombre_completo": f"{paciente.nombres} {paciente.apellidos}",
        "tipo_documento": paciente.tipo_documento,
        "documento": paciente.documento,
        "fecha_nacimiento": fecha_nacimiento_str,
        "edad": paciente.edad,
        "sexo": paciente.sexo,
        "email": paciente.email,
        "telefono": paciente.telefono,
        "direccion": paciente.direccion,
        "barrio": paciente.barrio,
        "motivo_consulta": paciente.motivo_consulta,
        "enfermedad_actual": paciente.enfermedad_actual,
        "alergias": paciente.alergias,
        "observaciones": paciente.observaciones,
        "dentigrama_canvas": paciente.dentigrama_canvas,
        "imagen_perfil_url": paciente.imagen_perfil_url,
        "ocupacion": paciente.ocupacion,
        "cepillado_dental": paciente.cepillado_dental,
        "habitos": paciente.habitos
    }


@router.put("/pacientes/{paciente_id}")
async def actualizar_paciente(
    paciente_id: int,
    nombres: Optional[str] = Form(None),
    apellidos: Optional[str] = Form(None),
    tipo_documento: Optional[str] = Form(None),
    documento: Optional[str] = Form(None),
    fecha_nacimiento: Optional[str] = Form(None),
    edad: Optional[int] = Form(None),
    sexo: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    direccion: Optional[str] = Form(None),
    barrio: Optional[str] = Form(None),
    motivo_consulta: Optional[str] = Form(None),
    enfermedad_actual: Optional[str] = Form(None),
    alergias: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    dentigrama_canvas: Optional[str] = Form(None),
    imagen_perfil: Optional[UploadFile] = File(None),
    eliminar_imagen: Optional[str] = Form(None),
    ocupacion: Optional[str] = Form(None),
    cepillado_dental: Optional[str] = Form(None),
    habitos: Optional[str] = Form(None),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar un paciente existente"""
    
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == False
        )
    )
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este paciente")
    
    # Verificar documento duplicado
    if documento and documento != paciente.documento:
        result = await db.execute(
            select(Paciente).where(
                Paciente.documento == documento,
                Paciente.is_deleted == False,
                Paciente.id != paciente_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(400, detail=f"Ya existe otro paciente con el documento {documento}")
    
    # Procesar fecha de nacimiento
    if fecha_nacimiento:
        try:
            fecha_obj = datetime.strptime(fecha_nacimiento, '%Y-%m-%d').date()
            paciente.fecha_nacimiento = fecha_obj
            hoy = date.today()
            edad_calculada = hoy.year - fecha_obj.year
            if (hoy.month, hoy.day) < (fecha_obj.month, fecha_obj.day):
                edad_calculada -= 1
            paciente.edad = edad_calculada
        except:
            pass
    
    # ============================================================
    # PROCESAR DENTIGRAMA
    # ============================================================
    dentigrama_final_url = None
    if dentigrama_canvas:
        if dentigrama_canvas.startswith('data:image'):
            try:
                # Usar public_id COMPLETO (sin folder separado)
                public_id_completo = f"dentigramas/{current_user.id}/dentigrama_paciente_{paciente_id}"
                
                upload_result = cloudinary.uploader.upload(
                    dentigrama_canvas,
                    public_id=public_id_completo,  # ← Cambiar a public_id completo
                    overwrite=True,
                    invalidate=True  # ← Forzar invalidación de caché
                )
                dentigrama_final_url = upload_result.get('secure_url')
                
                # Debug: Verificar en logs
                print(f"✅ Dentigrama actualizado - public_id: {upload_result.get('public_id')}")
                
            except Exception as e:
                print(f"❌ Error subiendo dentigrama: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error al subir dentigrama: {str(e)}")
        elif dentigrama_canvas.startswith('http'):
            dentigrama_final_url = dentigrama_canvas

    if dentigrama_final_url is not None:
        paciente.dentigrama_canvas = dentigrama_final_url
    
    # ============================================================
    # PROCESAR IMAGEN DE PERFIL
    # ============================================================
    # Si viene nueva imagen
    if imagen_perfil and imagen_perfil.filename:
        try:
            # Subir nueva imagen con public_id COMPLETO (sin folder separado)
            upload_result = cloudinary.uploader.upload(
                await imagen_perfil.read(),
                public_id=f"pacientes/{current_user.id}/perfil_paciente_{paciente_id}",
                overwrite=True,
                invalidate=True  # Forzar invalidación de caché
            )
            paciente.imagen_perfil_url = upload_result.get('secure_url')
            
            # Debug: Verificar en logs
            print(f"✅ Imagen perfil actualizada - public_id: {upload_result.get('public_id')}")
            
        except Exception as e:
            print(f"❌ Error subiendo imagen perfil: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error al subir imagen de perfil: {str(e)}")

    # Si se solicita eliminar imagen
    elif eliminar_imagen == 'true':
        paciente.imagen_perfil_url = None
    
    # ============================================================
    # ACTUALIZAR CAMPOS DE TEXTO
    # ============================================================
    if nombres is not None:
        paciente.nombres = nombres
    if apellidos is not None:
        paciente.apellidos = apellidos
    if tipo_documento is not None:
        paciente.tipo_documento = tipo_documento
    if documento is not None:
        paciente.documento = documento
    if edad is not None:
        paciente.edad = edad
    if sexo is not None:
        paciente.sexo = sexo
    if email is not None:
        paciente.email = email
    if telefono is not None:
        paciente.telefono = telefono
    if direccion is not None:
        paciente.direccion = direccion
    if barrio is not None:
        paciente.barrio = barrio
    if motivo_consulta is not None:
        paciente.motivo_consulta = motivo_consulta
    if enfermedad_actual is not None:
        paciente.enfermedad_actual = enfermedad_actual
    if alergias is not None:
        paciente.alergias = alergias
    if observaciones is not None:
        paciente.observaciones = observaciones
    if ocupacion is not None:
        paciente.ocupacion = ocupacion
    if cepillado_dental is not None:
        paciente.cepillado_dental = cepillado_dental
    if habitos is not None:
        paciente.habitos = habitos
    
    await db.commit()
    await db.refresh(paciente)
    
    return {
        "success": True,
        "message": "Paciente actualizado exitosamente",
        "paciente_id": paciente.id
    }

@router.delete("/pacientes/{paciente_id}")
async def eliminar_paciente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Soft delete - Mover paciente a papelera"""
    
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == False
        )
    )
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este paciente")
    
    # Soft delete
    paciente.is_deleted = True
    paciente.deleted_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Paciente movido a la papelera"
    }



# Restaurar paciente (soft delete reverso)
@router.put("/pacientes/{paciente_id}/restaurar")
async def restaurar_paciente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == True
        )
    )
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado en papelera")
    
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    paciente.is_deleted = False
    paciente.deleted_at = None
    
    await db.commit()
    
    return {"success": True, "message": "Paciente restaurado"}


@router.delete("/pacientes/{paciente_id}/permanente")
async def eliminar_permanente(
    paciente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Buscar el paciente
    result = await db.execute(
        select(Paciente).where(
            Paciente.id == paciente_id,
            Paciente.is_deleted == True
        )
    )
    paciente = result.scalar_one_or_none()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    if not current_user.is_admin and paciente.odontologo_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    
    # 2. ✅ ELIMINAR PRIMERO LAS EVOLUCIONES
    await db.execute(
        delete(Evolucion).where(Evolucion.paciente_id == paciente_id)
    )
    
    # 3. Luego eliminar imágenes de Cloudinary (opcional)
    if paciente.imagen_perfil_url:
        try:
            public_id = paciente.imagen_perfil_url.split('/')[-1].split('.')[0]
            cloudinary.uploader.destroy(f"pacientes/{current_user.id}/{public_id}")
        except:
            pass
    
    if paciente.dentigrama_canvas:
        try:
            public_id = paciente.dentigrama_canvas.split('/')[-1].split('.')[0]
            cloudinary.uploader.destroy(f"dentigramas/{current_user.id}/{public_id}")
        except:
            pass
    
    # 4. Finalmente eliminar el paciente
    await db.delete(paciente)
    await db.commit()
    
    return {"success": True, "message": "Paciente eliminado definitivamente"}


# endpoints/pacientes.py (agregar este endpoint)

@router.get("/pacientes/buscar")
async def buscar_pacientes_autocomplete(
    q: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Busca pacientes por nombre para autocompletado (máximo 10 resultados)"""
    
    search_term = f"%{q}%"
    
    query = select(Paciente).where(
        Paciente.is_deleted == False,
        or_(
            Paciente.nombres.ilike(search_term),
            Paciente.apellidos.ilike(search_term),
            func.concat(Paciente.nombres, ' ', Paciente.apellidos).ilike(search_term)
        )
    )
    
    if not current_user.is_admin:
        query = query.where(Paciente.odontologo_id == current_user.id)
    
    query = query.limit(10)
    
    result = await db.execute(query)
    pacientes = result.scalars().all()
    
    return {
        "pacientes": [
            {
                "id": p.id,
                "nombres": p.nombres,
                "apellidos": p.apellidos,
                "nombre_completo": f"{p.nombres} {p.apellidos}",
                "telefono": p.telefono
            }
            for p in pacientes
        ]
    }