# backend_fastapi/services/evolution_service.py
import httpx
import logging
from config import Config

logger = logging.getLogger("evolution_service")

HEADERS = {
    "apikey": Config.EVOLUTION_API_KEY,
    "Content-Type": "application/json"
}

# Cache en memoria de mapeo: numero_telefono -> jid_lid
MAPA_LID_CACHE: dict = {}

async def resolver_destinatario_lid(instance_name: str, numero_o_jid: str, addressing_mode: str = None) -> str:
    """Resuelve el JID correcto (@lid o número estándar) para garantizar la entrega en WhatsApp"""
    jid_str = str(numero_o_jid).strip()
    
    # 1. Si ya es un @lid, lo usamos directamente
    if "@lid" in jid_str:
        return jid_str

    numero_limpio = "".join(filter(str.isdigit, jid_str))

    # 2. Si ya lo tenemos en caché, devolverlo
    if numero_limpio in MAPA_LID_CACHE:
        return MAPA_LID_CACHE[numero_limpio]

    # 3. Si el addressingMode es "lid", consultar findChats en Evolution API para encontrar su LID
    if addressing_mode == "lid" or "@" not in jid_str:
        try:
            url_chats = f"{Config.EVOLUTION_API_URL}/chat/findChats/{instance_name}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url_chats, json={}, headers=HEADERS)
                if res.status_code == 200:
                    chats = res.json()
                    # Soporte si viene como lista o diccionario con clave 'value'
                    lista_chats = chats if isinstance(chats, list) else chats.get("value", [])
                    for chat in lista_chats:
                        remote_jid = chat.get("remoteJid", "")
                        last_key = chat.get("lastMessage", {}).get("key", {}) if chat.get("lastMessage") else {}
                        alt_jid = last_key.get("remoteJidAlt", "")
                        
                        if "@lid" in remote_jid and (numero_limpio in alt_jid or numero_limpio in str(chat)):
                            MAPA_LID_CACHE[numero_limpio] = remote_jid
                            print(f"🔗 [LID Resolver] Mapeado exitoso: {numero_limpio} -> {remote_jid}", flush=True)
                            return remote_jid
        except Exception as e:
            print(f"⚠️ [LID Resolver Error]: {e}", flush=True)

    # 4. Si es número estándar normal, retornar dígitos limpios
    return numero_limpio or jid_str

async def configurar_webhook_instancia(instance_name: str, webhook_url: str) -> bool:
    """Configura la URL de Webhook en la instancia de Evolution API v2"""
    url = f"{Config.EVOLUTION_API_URL}/webhook/set/{instance_name}"
    
    payload = {
        "webhook": {
            "enabled": True,
            "url": webhook_url,
            "byEvents": False,
            "base64": False,
            "events": [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE"
            ]
        }
    }
    
    print(f"\n📡 [Evolution Webhook Set] Configurando webhook en: {url}")
    print(f"🔗 [Webhook URL]: {webhook_url}")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(url, json=payload, headers=HEADERS)
            print(f"✔ [Evolution Webhook Status]: {res.status_code} - {res.text}\n")
            return res.status_code in (200, 201)
        except Exception as e:
            logger.error(f"[Evolution API] Error configurando webhook para {instance_name}: {e}")
            return False

async def crear_o_obtener_qr(instance_name: str, webhook_url: str = None) -> dict:
    """
    Obtiene el QR de la instancia. Si la sesión anterior fue cerrada/desconectada,
    reinicia la instancia para entregar un código QR fresco inmediatamente.
    """
    url_create = f"{Config.EVOLUTION_API_URL}/instance/create"
    url_connect = f"{Config.EVOLUTION_API_URL}/instance/connect/{instance_name}"
    url_delete = f"{Config.EVOLUTION_API_URL}/instance/delete/{instance_name}"
    
    payload = {
        "instanceName": instance_name,
        "token": "",
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res_connect = await client.get(url_connect, headers=HEADERS)
            data_connect = res_connect.json() if res_connect.content else {}
            qr_base64 = (
                data_connect.get("base64")
                or data_connect.get("qrcode", {}).get("base64")
            )

            if not qr_base64 or res_connect.status_code != 200:
                print(f"[Evolution API] Reiniciando instancia '{instance_name}' para generar QR nuevo...")
                await client.delete(url_delete, headers=HEADERS)
                
                res_create = await client.post(url_create, json=payload, headers=HEADERS)
                data_create = res_create.json() if res_create.content else {}
                
                qr_base64 = (
                    data_create.get("qrcode", {}).get("base64")
                    or data_create.get("base64")
                )

            if webhook_url:
                await configurar_webhook_instancia(instance_name, webhook_url)

            if qr_base64:
                return {
                    "success": True,
                    "status": "connecting",
                    "qrcode": qr_base64,
                    "pairingCode": data_connect.get("pairingCode")
                }
            else:
                return {"success": False, "error": "No se pudo obtener el QR de Evolution API."}

        except Exception as e:
            print(f"❌ [Evolution API Error]: {e}")
            return {"success": False, "error": str(e)}

async def obtener_estado_conexion(instance_name: str) -> dict:
    """Consulta el estado de conexión ('open', 'close', 'connecting')"""
    url = f"{Config.EVOLUTION_API_URL}/instance/connectionState/{instance_name}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(url, headers=HEADERS)
            if res.status_code == 200:
                data = res.json()
                state = data.get("instance", {}).get("state") or data.get("state", "disconnected")
                return {"success": True, "state": state}
            return {"success": True, "state": "disconnected"}
        except Exception as e:
            logger.error(f"[Evolution API] Error consultando estado de {instance_name}: {e}")
            return {"success": False, "state": "error", "error": str(e)}

async def desconectar_instancia(instance_name: str) -> dict:
    """Cierra la sesión de WhatsApp (Logout)"""
    url = f"{Config.EVOLUTION_API_URL}/instance/logout/{instance_name}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.delete(url, headers=HEADERS)
            return {"success": res.status_code in (200, 204)}
        except Exception as e:
            logger.error(f"[Evolution API] Error cerrando sesión de {instance_name}: {e}")
            return {"success": False, "error": str(e)}

async def enviar_mensaje_evolution(instance_name: str, numero: str, texto: str, imagen_url: str = None) -> bool:
    """Despacha un mensaje de texto o multimedia por WhatsApp a través de Evolution API"""
    destinatario = str(numero).strip()

    if "@s.whatsapp.net" in destinatario:
        destinatario = destinatario.replace("@s.whatsapp.net", "").strip()
    elif "@" not in destinatario:
        destinatario = "".join(filter(str.isdigit, destinatario))

    # Normalización universal de saltos de línea
    texto_formateado = (
        str(texto or "")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .strip()
    )

    url = f"{Config.EVOLUTION_API_URL}/message/sendText/{instance_name}" if not imagen_url else f"{Config.EVOLUTION_API_URL}/message/sendMedia/{instance_name}"
    
    payload = {
        "number": destinatario,
        "text": texto_formateado
    } if not imagen_url else {
        "number": destinatario,
        "mediatype": "image",
        "mimetype": "image/jpeg",
        "media": imagen_url,
        "caption": texto_formateado,
        "fileName": "afiche_promocion.jpeg"
    }

    print(f"\n🚀 [Evolution API Despacho] Enviando a: {url}")
    print(f"📦 [Destinatario]: {destinatario}")

    async with httpx.AsyncClient(timeout=25.0) as client:
        try:
            res = await client.post(url, json=payload, headers=HEADERS)
            print(f"📡 [Evolution API Respuesta ({res.status_code})]: {res.text}\n", flush=True)

            if res.status_code in (200, 201):
                return True
            return False
        except Exception as e:
            print(f"❌ [Evolution API Error]: {e}\n", flush=True)
            return False