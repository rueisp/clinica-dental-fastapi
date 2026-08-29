# backend_fastapi/endpoints/bot_config.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import cloudinary.uploader
from config import Config
from dependencies.auth import get_current_user
from models import Usuario
from services.bot_engine_service import (
    SUPABASE_HEADERS,
    poblar_plantilla_bot_doctor,
    PLANTILLA_SERVICIOS_BASE,
    PLANTILLA_CHATBOT_BASE,
    obtener_plantilla_configuracion
)

router = APIRouter(prefix="/bot-config", tags=["Configuración del Bot"])

# ============================================================
# ESQUEMAS PYDANTIC
# ============================================================

class ConfiguracionGeneralUpdate(BaseModel):
    nombre_consultorio: Optional[str] = None
    ciudad: Optional[str] = None
    barrio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    horarios: Optional[str] = None
    horario_lunes_viernes: Optional[str] = None
    horario_sabado: Optional[str] = None
    horario_domingo: Optional[str] = None
    mensaje_bienvenida: Optional[str] = None
    mensaje_despedida: Optional[str] = None

class ServicioCreate(BaseModel):
    servicio: str
    categoria: Optional[str] = "General"
    palabras_clave: Optional[str] = ""
    precio: str
    descripcion: Optional[str] = ""
    disponible: Optional[bool] = True

class ServicioUpdate(BaseModel):
    servicio: Optional[str] = None
    categoria: Optional[str] = None
    palabras_clave: Optional[str] = None
    precio: Optional[str] = None
    descripcion: Optional[str] = None
    disponible: Optional[bool] = None

class ChatbotItemCreate(BaseModel):
    intencion: str
    palabras_clave: str
    respuesta: str
    link_imagen: Optional[str] = None
    estado: Optional[str] = "ACTIVO"

class ChatbotItemUpdate(BaseModel):
    intencion: Optional[str] = None
    palabras_clave: Optional[str] = None
    respuesta: Optional[str] = None
    link_imagen: Optional[str] = None
    estado: Optional[str] = None

# ============================================================
# 1. CONFIGURACIÓN GENERAL (Horarios, Consultorio, Sede)
# ============================================================

@router.get("/general")
async def obtener_configuracion_general(current_user: Usuario = Depends(get_current_user)):
    """Obtiene la configuración del consultorio y horarios del doctor en sesión"""
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/configuracion?odontologo_id=eq.{user_id}"

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando configuración en Supabase")
        
        filas = res.json()
        if not filas:
            # Si no tiene, auto-inicializar plantilla
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )
            res_retry = await client.get(url, headers=SUPABASE_HEADERS)
            filas = res_retry.json() if res_retry.status_code == 200 else []

        # Convertir lista de filas clave-valor a un objeto JSON limpio
        datos_dict = {item.get("clave"): item.get("valor") for item in filas}
        return {"success": True, "configuracion": datos_dict}

@router.put("/general")
async def guardar_configuracion_general(
    datos: ConfiguracionGeneralUpdate,
    current_user: Usuario = Depends(get_current_user)
):
    """Guarda o actualiza las claves de configuración del doctor en sesión"""
    user_id = str(current_user.id)
    campos_a_actualizar = datos.model_dump(exclude_unset=True)

    if not campos_a_actualizar:
        return {"success": True, "message": "Sin cambios"}

    payload = [
        {"odontologo_id": user_id, "clave": k, "valor": str(v or "")}
        for k, v in campos_a_actualizar.items()
    ]

    # Usamos upsert (on_conflict odontologo_id, clave)
    url = f"{Config.SUPABASE_URL}/rest/v1/configuracion?on_conflict=odontologo_id,clave"
    headers = {**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates"}

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error guardando configuración: {res.text}")

    return {"success": True, "message": "Configuración guardada correctamente"}

# ============================================================
# 2. CATÁLOGO DE SERVICIOS Y TARIFAS EN COP
# ============================================================

@router.get("/servicios")
async def listar_servicios_doctor(current_user: Usuario = Depends(get_current_user)):
    """Lista todos los tratamientos clínicos y precios del doctor (auto-inicializa si está vacío)"""
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?odontologo_id=eq.{user_id}&order=id.asc"

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando servicios en Supabase")
        
        servicios_list = res.json()
        if not servicios_list:
            # Auto-inicializar plantilla si es la primera vez que entra
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )
            res_retry = await client.get(url, headers=SUPABASE_HEADERS)
            servicios_list = res_retry.json() if res_retry.status_code == 200 else []

        return {"success": True, "servicios": servicios_list}

@router.put("/servicios/{servicio_id}")
async def actualizar_servicio_doctor(
    servicio_id: int,
    datos: ServicioUpdate,
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza un tratamiento existente del doctor"""
    user_id = str(current_user.id)
    payload = datos.model_dump(exclude_unset=True)

    if not payload:
        return {"success": True, "message": "Sin cambios"}

    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?id=eq.{servicio_id}&odontologo_id=eq.{user_id}"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.patch(url, json=payload, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error actualizando servicio: {res.text}")
        return {"success": True, "message": "Servicio actualizado correctamente"}

@router.delete("/servicios/{servicio_id}")
async def eliminar_servicio_doctor(
    servicio_id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """Elimina un tratamiento del catálogo del doctor"""
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/servicios?id=eq.{servicio_id}&odontologo_id=eq.{user_id}"

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.delete(url, headers=SUPABASE_HEADERS)
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"Error eliminando servicio: {res.text}")
        return {"success": True, "message": "Servicio eliminado correctamente"}

# ============================================================
# 3. CHATBOT: FAQ, SALUDOS Y PROMOCIONES CON FOTO
# ============================================================

@router.get("/chatbot")
async def listar_chatbot_items(current_user: Usuario = Depends(get_current_user)):
    """Lista las intenciones, promociones y afiches configurados por el doctor"""
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}&order=id.asc"

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(url, headers=SUPABASE_HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail="Error consultando chatbot en Supabase")
        return {"success": True, "items": res.json()}

@router.post("/chatbot")
async def crear_chatbot_item(
    datos: ChatbotItemCreate,
    current_user: Usuario = Depends(get_current_user)
):
    """Crea una nueva intención o promoción con afiche"""
    user_id = str(current_user.id)
    payload = {
        **datos.model_dump(),
        "odontologo_id": user_id
    }
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error creando respuesta: {res.text}")
        return {"success": True, "item": res.json()[0] if res.json() else payload}

@router.put("/chatbot/{item_id}")
async def actualizar_chatbot_item(
    item_id: int,
    datos: ChatbotItemUpdate,
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza una intención, respuesta o enlace de imagen existente"""
    user_id = str(current_user.id)
    payload = datos.model_dump(exclude_unset=True)

    if not payload:
        return {"success": True, "message": "Sin cambios"}

    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?id=eq.{item_id}&odontologo_id=eq.{user_id}"
    headers = {**SUPABASE_HEADERS, "Prefer": "return=representation"}

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.patch(url, json=payload, headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error actualizando chatbot: {res.text}")
        return {"success": True, "message": "Respuesta actualizada correctamente"}

@router.delete("/chatbot/{item_id}")
async def eliminar_chatbot_item(
    item_id: int,
    current_user: Usuario = Depends(get_current_user)
):
    """Elimina una respuesta personalizada del doctor"""
    user_id = str(current_user.id)
    url = f"{Config.SUPABASE_URL}/rest/v1/chatbot?id=eq.{item_id}&odontologo_id=eq.{user_id}"

    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.delete(url, headers=SUPABASE_HEADERS)
        if res.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"Error eliminando respuesta: {res.text}")
        return {"success": True, "message": "Respuesta eliminada correctamente"}

@router.post("/subir-afiche")
async def subir_afiche_promocion(
    archivo: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user)
):
    """Sube un afiche o imagen publicitaria a Cloudinary para el bot del doctor"""
    try:
        contenido = await archivo.read()
        res_upload = cloudinary.uploader.upload(
            contenido,
            folder=f"promociones_bot/{current_user.id}",
            overwrite=True
        )
        return {
            "success": True,
            "url": res_upload.get("secure_url")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir imagen publicitaria: {str(e)}")

# ============================================================
# 4. RESTAURAR PLANTILLA PREDETERMINADA
# ============================================================

@router.post("/restaurar-plantilla")
async def restaurar_plantilla_base(current_user: Usuario = Depends(get_current_user)):
    """Restaura todos los servicios, horarios y chatbot a los valores oficiales de fábrica"""
    user_id = str(current_user.id)

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # 1. Borrar configuración actual del doctor
            await client.delete(f"{Config.SUPABASE_URL}/rest/v1/configuracion?odontologo_id=eq.{user_id}", headers=SUPABASE_HEADERS)
            await client.delete(f"{Config.SUPABASE_URL}/rest/v1/servicios?odontologo_id=eq.{user_id}", headers=SUPABASE_HEADERS)
            await client.delete(f"{Config.SUPABASE_URL}/rest/v1/chatbot?odontologo_id=eq.{user_id}", headers=SUPABASE_HEADERS)

            # 2. Re-poblar plantilla base
            await poblar_plantilla_bot_doctor(
                user_id=user_id,
                doctor_nombre=f"{current_user.nombres} {current_user.apellidos or ''}".strip(),
                consultorio_nombre=current_user.nombre_consultorio,
                telefono=current_user.telefono
            )
            return {"success": True, "message": "Plantilla restablecida a valores oficiales correctamente"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error restaurando plantilla: {str(e)}")