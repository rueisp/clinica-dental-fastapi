# 🛡️ PROTOCOLO Y REGLAS DE AUDITORÍA: CLOUD RUN, STORAGE Y WHATSAPP

Este documento contiene las directrices técnicas obligatorias para garantizar costo operativo en **$0 COP en inactividad**, seguridad estricta de credenciales, estabilidad del motor de WhatsApp (Evolution API) y consistencia en el modelo de suscripciones de **CloudentApp**.

---

## I. INFRAESTRUCTURA Y OPTIMIZACIÓN DE COSTOS (GCP)

### 1. Política de Escalado y Recursos (Cloud Run)
Los servicios deben operar estrictamente bajo Serverless puro para evitar cobros fijos mensuales:
* **Servicio Backend (`dental-backend`):**
  * Memoria: `512 MiB` | CPU: `1 vCPU`
  * Concurrencia: `80` solicitudes por contenedor
  * Instancias mínimas: `--min-instances=0` (innegociable; apaga el contenedor al no haber tráfico)
  * Instancias máximas: `--max-instances=1` (protege contra costos desmedidos por ataques o bucles)
  * Asignación de CPU: `--cpu-throttling` (la CPU solo se cobra durante el procesamiento activo)
  * Timeout de petición: `--timeout=60s` (evita que peticiones colgadas mantengan viva la CPU)
* **Servicio Frontend (`frontend-nextjs`):**
  * Memoria: `512 MiB` (escalable a 1 GiB si la compilación lo exige) | CPU: `1 vCPU`
  * Instancias mínimas: `--min-instances=0` | Instancias máximas: `--max-instances=1`
  * Asignación de CPU: `--cpu-throttling`

### 2. Regla de Nombres de Despliegue y Límite de Memoria (512 MiB)
* Los nombres de los servicios en los comandos `gcloud` deben ser estrictamente `dental-backend` y `frontend-nextjs`.
* **Prohibición de Sufijo:** Queda prohibido añadir el número de proyecto (`779789369655`) al final del nombre en el comando de despliegue.
* **Límite de Memoria Innegociable:** Ambos servicios deben desplegarse con estrictamente **512 MiB** (`--memory 512Mi`). Prohibido desplegar con 1 GiB o más.
* **Retención de Revisiones (Máximo 2 Activas):** Tras cada despliegue, es obligatorio purgar las revisiones inactivas conservando únicamente las dos (2) más recientes.

### 3. Gestión Estricta de Secret Manager ($0 COP)
* **Secretos Estrictamente Regionales:** Todos los secretos (`CLOUDINARY_API_SECRET`, `DATABASE_URL`, `SECRET_KEY`, `TELEGRAM_TOKEN`) deben crearse y mantenerse exclusivamente bajo replicación regional en `us-east1`. Prohibida la replicación automática/global.
* **Versión Única Activa:** Cada secreto debe contener exactamente **UNA (1)** sola versión en estado 'Habilitada'. Al rotar credenciales, destruir de inmediato la versión anterior.
* **Blindaje Free Tier:** Mantener un total acumulado $\le$ 6 versiones activas concurrentes para costo permanente de $0 COP.

### 4. Fugas de Almacenamiento en Cloud Storage
Cada despliegue con código fuente (`--source`) genera archivos comprimidos en Cloud Storage. Para evitar facturación por almacenamiento residual:
* **Ciclo de Vida (Lifecycle):** Los buckets de compilación (`run-sources-cloudentapp-us-east1` y `cloudentapp_cloudbuild`) deben mantener activa una regla de eliminación a **1 día de antigüedad** (`age: 1`).
* **Soft Delete:** La retención de Soft Delete debe estar en **0 segundos** (`--clear-soft-delete`) en depósitos temporales para evitar que los archivos borrados generen cargos durante 7 días.
* **Filtro `.gcloudignore`:** En la raíz del frontend debe existir `.gcloudignore` excluyendo `node_modules/`, `.next/` y archivos temporales para que cada deploy suba ~5 MB en lugar de >100 MB.

### 4. Política de Limpieza en Artifact Registry
* El repositorio de imágenes Docker debe tener vinculada la política `politica-limpieza.json` para conservar un máximo de **2 versiones recientes** (`"keepCount": 2`).
* Las imágenes intermedias o sin etiquetar (`tagState: any`) deben purgarse automáticamente para no saturar gigabytes fijos de disco.

### 5. Inyección Segura de Secretos (Gotcha de Windows PowerShell)
* Queda estrictamente prohibido usar el operador tubería (`|`) en PowerShell para inyectar secretos en Google Cloud Secret Manager (ej. `echo "..." | gcloud secrets ...`), ya que PowerShell añade un salto de línea invisible (`\n`) que corrompe credenciales (como `DATABASE_URL` o `SECRET_KEY`).
* Para subir secretos en Windows, usar siempre:
  ```powershell
  Set-Content -Path "temp_secret.txt" -Value "VALOR" -NoNewline
  gcloud secrets versions add NOMBRE_SECRETO --data-file="temp_secret.txt"
  Remove-Item -Path "temp_secret.txt" -Force


## II. REGLAS DE WHATSAPP (EVOLUTION API V2 & MULTI-TENANT)

### 1. Arquitectura de Motor Dedicado (Hetzner VPS)
* **Motor:** Evolution API v2.3.7 corriendo en contenedor Docker en VPS dedicado Hetzner.
* **Conectividad:** WebSockets persistentes (Baileys) sin cortes por serverless. Instancias de Cloud Run de mensajería deshabilitadas (escaladas a 0).
* **Envoltorio de Webhook V2:** El registro del webhook exige el payload con envoltorio oficial:
  `{"webhook": {"enabled": true, "url": "https://.../api/whatsapp/webhook/evolution", "byEvents": false, "base64": false, "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]}}`.

### 2. Aislamiento y Direcciones Universales (LID vs JID)
* Cada doctor opera bajo la instancia única: `doctor_<uuid_sin_guiones>`.
* Si el mensaje entrante contiene `@lid` (privacidad de WhatsApp), preservar el identificador técnico para el despacho y almacenar el número estándar mapeado en `MAPA_LID_CACHE`.

### 3. Jerarquía Inteligente de Respuestas (3 Niveles)
* **Nivel 1A (Supabase `chatbot`):** FAQs, promociones con afiche Cloudinary y descartes clínicos (ej: aclaración de que no se sacan cordales ni toman radiografías en sede).
* **Nivel 1B (Supabase `servicios`):** Catálogo clínico y precios en COP al instante (<0.1s). Si el mensaje pregunta por 2 o más servicios simultáneos, retorna `None` y delega a Gemini.
* **Nivel 2 (Gemini IA `gemini-3.5-flash-lite`):** Modelo oficial ultra-rápido (<1s) y bajo costo. Política obligatoria de variantes *Lite*. Respuestas de máximo 2 líneas ancladas a fecha y hora oficial de Colombia (`America/Bogota`).
* **Nivel 3 (Fallback):** Mensaje empático estándar informando que los doctores revisarán el caso a la brevedad.

### 4. Silencio Humano y Desconexión Universal
* **Intervención Humana:** Al responder desde la bandeja web (`/chat`), el bot entra en silencio para no interrumpir.
* **Deduplicación:** Memoria `MENSAJES_PROCESADOS` con TTL de 5 minutos (300s).
* **Desconexión Libre:** `POST /api/whatsapp/desconectar` nunca debe exigir permisos de plan para permitir al usuario desvincular su línea en cualquier momento.

III. PLANES, UPGRADES Y CONSISTENCIA MULTIDIVISA
1. Jerarquía de Planes
Trial (7 días): Acceso total a todas las herramientas (clínicas y Bot de WhatsApp). Límite de 10 pacientes/día. Se puede usar una sola vez por cuenta.
Básico ($20.000 COP / $6 USD): Ficha clínica, agenda, recibos y exportación a Word. Sin odontograma, sin fotos, sin voz y sin Bot de WhatsApp.
Pro ($30.000 COP / $10 USD): Todo el módulo clínico habilitado (Odontograma digital, fotos/radiografías en la nube, evolución por voz). Sin Bot de WhatsApp.
Ultra ($40.000 COP / $12 USD mensual | $400.000 COP / $120 USD anual): Acceso completo a todo el sistema clínico + Asistente Virtual de WhatsApp 24/7 y personalización de respuestas automáticas.
2. Regla de Upgrades (Mejora de Plan)
Los doctores solo pueden cambiarse a planes de mayor valor (Upgrade).
Queda bloqueado el cambio hacia planes de menor valor (Downgrade) mientras la suscripción esté activa; deben esperar al fin de su ciclo.
No expulsión (Error 403): Al reportar un pago de mejora, el doctor no pierde el acceso a su Dashboard ni a sus pacientes; mantiene su estatus activo hasta que el administrador apruebe el recibo.
3. Regla de Prorrateo a Favor de CloudentApp
Al aprobar un Upgrade desde /admin/pagos:
Se calculan los días restantes del plan viejo y se convierten a saldo en dinero.
Dicho saldo se divide por el valor diario del nuevo plan.
Se aplica redondeo estricto hacia abajo con math.floor(), garantizando que cualquier fracción de día favorezca financieramente a la plataforma.
La nueva fecha de vencimiento es: Duración_Nuevo_Plan + Días_Prorrateados.

## IV. COMANDOS RÁPIDOS DE AUDITORÍA (POWERSHELL)

Ejecuta estos comandos en tu terminal local para auditar la salud del sistema en 10 segundos:

### 1. Auditoría Rápida de Doctores, Planes y Pacientes (Consola)
Consulta en 1 segundo el estado de todos los odontólogos de tu SaaS sin abrir el navegador:
```powershell
.\venv_fastapi\Scripts\python -c "import asyncio; from database import AsyncSessionLocal; from models import Usuario, Subscription, Paciente; from sqlalchemy import select, func; async def m(): async with AsyncSessionLocal() as db: sub = (select(func.count(Paciente.id)).where(Paciente.odontologo_id == Usuario.id, Paciente.is_deleted == False).correlate(Usuario).scalar_subquery()); res = await db.execute(select(Usuario, Subscription, sub.label('total')).join(Subscription, Usuario.id == Subscription.user_id).order_by(Usuario.nombres.asc())); print('\n' + '='*65); print(f'{\"DOCTOR\":<22} | {\"PACIENTES\":<10} | {\"PLAN\":<15} | ESTADO'); print('='*65); [print(f'{u.nombres[:20]:<22} | {tot:<10} | {s.plan_type:<15} | {s.status}') for u, s, tot in res.all()]; print('='*65 + '\n'); asyncio.run(m())"


2. Auditar Cloud Run (Instancias en 0, Throttling y 512 MiB)
code
Powershell
gcloud run services list --format="table(metadata.name,status.url,spec.template.metadata.annotations['autoscaling.knative.dev/minScale']:label=MIN,spec.template.metadata.annotations['autoscaling.knative.dev/maxScale']:label=MAX,spec.template.metadata.annotations['run.googleapis.com/cpu-throttling']:label=THROTTLED)"
(Verificar que MIN esté vacío o en 0, MAX en 1 y THROTTLED en true).
3. Purgar Revisiones Inactivas de Cloud Run (Conservar solo 2)
code
Powershell
# Backend:
gcloud run revisions list --service dental-backend --region us-east1 --project cloudentapp --format="value(name)" | Select-Object -Skip 2 | ForEach-Object { gcloud run revisions delete $_ --region us-east1 --project cloudentapp --quiet }

# Frontend:
gcloud run revisions list --service frontend-nextjs --region us-east1 --project cloudentapp --format="value(name)" | Select-Object -Skip 2 | ForEach-Object { gcloud run revisions delete $_ --region us-east1 --project cloudentapp --quiet }
4. Auditar Almacenamiento Residual en Buckets de Compilación
code
Powershell
gcloud storage du -s gs://run-sources-cloudentapp-us-east1 gs://cloudentapp_cloudbuild
5. Auditar Políticas de Soft Delete (0s) y Ciclo de Vida (1 día)
code
Powershell
gcloud storage buckets describe gs://run-sources-cloudentapp-us-east1 --format="yaml(soft_delete_policy, lifecycle_config)"
(Verificar que retentionDurationSeconds sea '0' y age sea 1).
6. Probar Notificaciones de Telegram
code
Powershell
.\venv_fastapi\Scripts\python probar_telegram.py
(Verificar confirmación de envío hacia el CHAT_ID configurado).