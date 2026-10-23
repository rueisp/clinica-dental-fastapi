# backend_fastapi/services/evolution_service.py
import time
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

# Memoria volátil de IDs despachados por la API/bot con TTL para prevenir auto-silencio
MENSAJES_ENVIADOS_POR_BOT: dict[str, float] = {}

async def resolver_destinatario_lid(instance_name: str, numero_o_jid: str, addressing_mode: str = None) -> str:
    """Resuelve el destinatario (@lid o número estándar) con caché de alta velocidad para evitar sobrecargar Hetzner"""
    jid_str = str(numero_o_jid).strip()
    
    # 1. Si ya es un @lid, lo usamos directamente
    if "@lid" in jid_str:
        return jid_str

    numero_limpio = "".join(filter(str.isdigit, jid_str))
    if not numero_limpio:
        return jid_str

    # 2. Si ya lo tenemos en caché (positivo o normal), devolverlo de inmediato sin llamadas de red
    if numero_limpio in MAPA_LID_CACHE:
        return MAPA_LID_CACHE[numero_limpio]

    # 3. Solo si viene marcado explícitamente como 'lid' o no tiene formato, consultar Hetzner una sola vez
    if addressing_mode == "lid" or ("@" not in jid_str and len(numero_limpio) > 12):
        try:
            url_chats = f"{Config.EVOLUTION_API_URL}/chat/findChats/{instance_name}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(url_chats, json={}, headers=HEADERS)
                if res.status_code == 200:
                    chats = res.json()
                    lista_chats = chats if isinstance(chats, list) else chats.get("value", [])
                    for chat in lista_chats:
                        remote_jid = chat.get("remoteJid", "")
                        last_key = chat.get("lastMessage", {}).get("key", {}) if chat.get("lastMessage") else {}
                        
                        # Extraer alt_jid de forma segura sin búsquedas sueltas en str(chat)
                        alt_jid = (
                            last_key.get("remoteJidAlt", "")
                            or chat.get("remoteJidAlt", "")
                            or str(chat.get("phone", ""))
                            or str(chat.get("phoneNumber", ""))
                        )
                        alt_num = "".join(filter(str.isdigit, alt_jid.split("@")[0]))
                        
                        # Coincidencia exacta de número telefónico (con o sin prefijo 57 de Colombia)
                        es_coincidencia = (
                            alt_num == numero_limpio
                            or (len(numero_limpio) == 10 and alt_num == f"57{numero_limpio}")
                            or (len(alt_num) == 10 and numero_limpio == f"57{alt_num}")
                        )
                        
                        if "@lid" in remote_jid and alt_num and es_coincidencia:
                            # Control preventivo de memoria en RAM (< 512 MiB)
                            if len(MAPA_LID_CACHE) > 500:
                                claves_a_borrar = list(MAPA_LID_CACHE.keys())[:100]
                                for k in claves_a_borrar:
                                    MAPA_LID_CACHE.pop(k, None)
                            
                            MAPA_LID_CACHE[numero_limpio] = remote_jid
                            print(f"🔗 [LID Resolver] Mapeado exacto exitoso: {numero_limpio} -> {remote_jid}", flush=True)
                            return remote_jid
        except Exception as e:
            print(f"⚠️ [LID Resolver Error]: {e}", flush=True)

    # 4. Guardar en caché como número estándar para evitar futuras consultas HTTP a Hetzner
    resultado_final = numero_limpio or jid_str
    
    if len(MAPA_LID_CACHE) > 500:
        claves_a_borrar = list(MAPA_LID_CACHE.keys())[:100]
        for k in claves_a_borrar:
            MAPA_LID_CACHE.pop(k, None)

    MAPA_LID_CACHE[numero_limpio] = resultado_final
    return resultado_final

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
    Obtiene el QR de la instancia sin desconectar sesiones activas.
    Protección de Resiliencia:
    - Ante errores de red o caídas de servidor (HTTP >= 500), NUNCA borra la instancia.
    - Si la instancia no existe (HTTP 404), la crea directamente sin intentar borrarla.
    - Si la sesión está 'open', la preserva intacta.
    - Solo reinicia (delete -> create) si la instancia responde 200 pero la sesión está confirmadamente cerrada sin QR.
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

            # 1. Protección contra caídas transitorias o errores de Hetzner (NO borrar)
            if res_connect.status_code >= 500:
                print(f"⚠️ [Evolution API Error]: El servidor respondió con estado {res_connect.status_code}. No se borrará la instancia.", flush=True)
                return {
                    "success": False,
                    "error": f"Evolution API no disponible temporalmente (HTTP {res_connect.status_code})"
                }

            if res_connect.status_code in (401, 403):
                return {
                    "success": False,
                    "error": f"Error de autenticación con Evolution API (HTTP {res_connect.status_code})"
                }

            data_connect = res_connect.json() if res_connect.content else {}

            # 2. Si la sesión ya está abierta y conectada, NO tocarla
            estado_actual = (
                data_connect.get("instance", {}).get("state") 
                or data_connect.get("state") 
                or data_connect.get("status")
            )
            if estado_actual == "open":
                if webhook_url:
                    await configurar_webhook_instancia(instance_name, webhook_url)
                return {
                    "success": True,
                    "status": "open",
                    "qrcode": None,
                    "pairingCode": None
                }

            qr_base64 = (
                data_connect.get("base64")
                or data_connect.get("qrcode", {}).get("base64")
            )
            pairing_code = data_connect.get("pairingCode")

            # 3. Si la instancia no existe en Evolution (HTTP 404), crearla directamente sin DELETE
            if res_connect.status_code == 404:
                print(f"[Evolution API] Instancia '{instance_name}' no existe (404). Creando nueva...", flush=True)
                res_create = await client.post(url_create, json=payload, headers=HEADERS)
                data_create = res_create.json() if res_create.content else {}
                qr_base64 = (
                    data_create.get("qrcode", {}).get("base64")
                    or data_create.get("base64")
                )
                pairing_code = data_create.get("pairingCode")
            # 4. Si la instancia existe (200), pero no tiene QR y no está 'open' (sesión cerrada o muerta), reiniciar limpiamente
            elif not qr_base64:
                print(f"[Evolution API] Sesión cerrada o sin QR en '{instance_name}'. Reiniciando para generar código nuevo...", flush=True)
                await client.delete(url_delete, headers=HEADERS)
                res_create = await client.post(url_create, json=payload, headers=HEADERS)
                data_create = res_create.json() if res_create.content else {}
                qr_base64 = (
                    data_create.get("qrcode", {}).get("base64")
                    or data_create.get("base64")
                )
                pairing_code = data_create.get("pairingCode") or pairing_code

            if webhook_url:
                await configurar_webhook_instancia(instance_name, webhook_url)

            if qr_base64:
                return {
                    "success": True,
                    "status": "connecting",
                    "qrcode": qr_base64,
                    "pairingCode": pairing_code
                }
            else:
                return {"success": False, "error": "No se pudo obtener el QR de Evolution API."}

        except Exception as e:
            print(f"❌ [Evolution API Error]: {e}", flush=True)
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
    """Despacha un mensaje de texto o multimedia por WhatsApp a través de Evolution API y registra su ID contra auto-silencio"""
    destinatario = str(numero).strip()

    if "@s.whatsapp.net" in destinatario:
        destinatario = destinatario.replace("@s.whatsapp.net", "").strip()
    elif "@" not in destinatario:
        destinatario = "".join(filter(str.isdigit, destinatario))

    # Validación preventiva de destinatario
    if not destinatario or (len(destinatario) < 7 and "@lid" not in destinatario):
        print(f"⚠️ [Evolution API Despacho] Destinatario inválido descartado: '{numero}'", flush=True)
        return False

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

    if not texto_formateado and not imagen_url:
        print("⚠️ [Evolution API Despacho] Intento de despacho con texto e imagen vacíos", flush=True)
        return False

    url = (
        f"{Config.EVOLUTION_API_URL}/message/sendText/{instance_name}"
        if not imagen_url
        else f"{Config.EVOLUTION_API_URL}/message/sendMedia/{instance_name}"
    )
    
    if imagen_url:
        # Deducción dinámica de mimetype y extensión para soporte universal (PNG, WEBP, JPEG)
        path_limpio = imagen_url.split("?")[0].lower()
        if path_limpio.endswith(".png"):
            mimetype = "image/png"
            file_name = "imagen.png"
        elif path_limpio.endswith(".webp"):
            mimetype = "image/webp"
            file_name = "imagen.webp"
        elif path_limpio.endswith(".gif"):
            mimetype = "image/gif"
            file_name = "imagen.gif"
        else:
            mimetype = "image/jpeg"
            file_name = "imagen.jpeg"

        # WhatsApp limita el caption a 1024 caracteres
        caption_seguro = texto_formateado[:1020] + "..." if len(texto_formateado) > 1024 else texto_formateado

        payload = {
            "number": destinatario,
            "mediatype": "image",
            "mimetype": mimetype,
            "media": imagen_url,
            "caption": caption_seguro,
            "fileName": file_name
        }
    else:
        payload = {
            "number": destinatario,
            "text": texto_formateado
        }

    print(f"\n🚀 [Evolution API Despacho] Enviando a: {url}")
    print(f"📦 [Destinatario]: {destinatario}")

    async with httpx.AsyncClient(timeout=25.0) as client:
        try:
            res = await client.post(url, json=payload, headers=HEADERS)
            
            # Truncado de log a 120 caracteres para proteger Cloud Logging contra volcados binarios
            resumen_log = (res.text[:120] + "...") if len(res.text) > 120 else res.text
            print(f"📡 [Evolution API Respuesta ({res.status_code})]: {resumen_log}\n", flush=True)

            if res.status_code in (200, 201):
                # Captura atómica del ID del mensaje despachado para evitar que el bot se auto-silencie
                try:
                    data_res = res.json()
                    msg_id = data_res.get("key", {}).get("id")
                    if msg_id:
                        ahora_ts = time.time()
                        # Purga con TTL de 300 segundos si supera 300 registros
                        if len(MENSAJES_ENVIADOS_POR_BOT) > 300:
                            expirados = [k for k, ts in MENSAJES_ENVIADOS_POR_BOT.items() if ahora_ts - ts > 300]
                            for k in expirados:
                                MENSAJES_ENVIADOS_POR_BOT.pop(k, None)
                        MENSAJES_ENVIADOS_POR_BOT[msg_id] = ahora_ts
                except Exception:
                    pass
                return True
            return False
        except Exception as e:
            print(f"❌ [Evolution API Error]: {e}\n", flush=True)
            return False