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

### 2. Regla de Nombres de Despliegue (Evitar Duplicados en Cloud Run)
* Los nombres de los servicios en los comandos `gcloud` deben ser estrictamente `dental-backend` y `frontend-nextjs`.
* **Prohibición:** Queda prohibido añadir el número de proyecto (`779789369655`) al final del nombre en el comando de despliegue, ya que Google Cloud lo agrega dinámicamente en la URL interna.
*B. Gestión Estricta de Secret Manager y Capa Gratuita ($0 COP)
- Secretos Estrictamente Regionales: Todos los secretos de infraestructura (CLOUDINARY_API_SECRET, DATABASE_URL, SECRET_KEY, TELEGRAM_TOKEN) deben crearse y mantenerse configurados exclusivamente bajo replicación regional en us-east1 (coincidiendo con dental-backend). Queda estrictamente prohibido el uso de replicación automática/global para evitar cargos por réplica interregional.
- Política de Versión Única Activa: Cada secreto debe contener exactamente UNA (1) sola versión en estado 'Habilitada'. Ante cualquier actualización o rotación de credenciales (nueva versión), es de carácter obligatorio destruir de inmediato la versión anterior.
- Blindaje de Capa Gratuita (Free Tier): El proyecto debe mantener en todo momento un total acumulado menor o igual a 6 versiones activas concurrentes para garantizar costo $0 COP permanente en el SKU 'Secret version replica storage'.

### 3. Fugas de Almacenamiento en Cloud Storage
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
II. REGLAS DE WHATSAPP (EVOLUTION API & MULTI-TENANT)
1. Aislamiento por Instancias
Cada odontólogo opera bajo una instancia única nombrada: doctor_<uuid_sin_guiones>.
Queda prohibido mezclar historiales entre instancias en la base de datos Supabase.
2. Modelo Inbound y Prevención de Baneos (Cero Proxies)
CloudentApp opera exclusivamente como atención receptiva (Inbound). El bot solo responde cuando el paciente inicia el contacto.
Quedan prohibidas las campañas de mensajería masiva en frío sin consentimiento para proteger la reputación de la IP del servidor Hetzner y los números de los doctores.
No se requiere el uso de proxies mientras el tráfico sea natural y conversacional.
3. Jerarquía de Respuestas y Silencio Humano
Nivel 1: Coincidencia directa de Catálogo y Chatbot en Supabase (<0.2 segundos).
Nivel 2: Asistente Contextual con Gemini IA con respuestas de máximo 2 a 3 líneas.
Silencio Humano: Cuando el doctor interviene manualmente desde la bandeja web (/chat), el bot entra en silencio para no entorpecer la atención humana.
Deduplicación: La memoria de IDs de mensajes procesados previene respuestas duplicadas ante reintentos del webhook.
4. Protocolo de Desconexión
El endpoint @router.post("/desconectar") nunca debe exigir permisos de plan. Cualquier usuario debe poder desvincular su línea telefónica en cualquier momento, incluso si su plan expiró o cambió de nivel.
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
IV. COMANDOS RÁPIDOS DE AUDITORÍA (POWERSHELL)
Ejecuta estos comandos en tu terminal local para verificar la salud del sistema en 10 segundos:
1. Auditar Cloud Run (Instancias en 0 y CPU Throttled)
code
Powershell
gcloud run services list --format="table(metadata.name,status.url,spec.template.metadata.annotations['autoscaling.knative.dev/minScale']:label=MIN,spec.template.metadata.annotations['autoscaling.knative.dev/maxScale']:label=MAX,spec.template.metadata.annotations['run.googleapis.com/cpu-throttling']:label=THROTTLED)"
(Verificar que MIN esté vacío o en 0, MAX en 1 y THROTTLED en true).
2. Auditar Almacenamiento Residual en Buckets
code
Powershell
gcloud storage du -s gs://run-sources-cloudentapp-us-east1 gs://cloudentapp_cloudbuild
3. Auditar Políticas de Limpieza y Soft Delete de Storage
code
Powershell
gcloud storage buckets describe gs://run-sources-cloudentapp-us-east1 --format="yaml(soft_delete_policy, lifecycle_config)"
(Verificar que retentionDurationSeconds sea '0' y la regla de ciclo de vida tenga age: 1).
4. Probar Notificaciones de Telegram
code
Powershell
.\venv_fastapi\Scripts\python probar_telegram.py
(Verificar que retorne éxito hacia el CHAT_ID=1108080476).