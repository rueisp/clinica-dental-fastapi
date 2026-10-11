# backend_fastapi/utils/fechas.py
from datetime import datetime, date, timedelta
import pytz

DEFAULT_TZ = pytz.timezone('America/Bogota')

def obtener_tz_doctor(zona: str = None):
    """Retorna el objeto pytz timezone de forma segura"""
    if not zona:
        return DEFAULT_TZ
    try:
        return pytz.timezone(zona)
    except Exception:
        return DEFAULT_TZ

# 1. Alias y funciones usadas por pagos.py
def obtener_ahora_local(zona: str = None) -> datetime:
    return datetime.now(obtener_tz_doctor(zona))

def limpiar_naive(dt: datetime) -> datetime:
    if not dt:
        return None
    return dt.replace(tzinfo=None)

def obtener_hoy_local(zona: str = None) -> date:
    return obtener_ahora_local(zona).date()

# 2. Alias y funciones usadas por limites.py, auth.py, dashboard.py, etc.
def ahora_aware(zona: str = None) -> datetime:
    return obtener_ahora_local(zona)

def ahora_naive(zona: str = None) -> datetime:
    return limpiar_naive(obtener_ahora_local(zona))

def hoy_local(zona: str = None) -> date:
    return obtener_hoy_local(zona)

def asegurar_tz(dt: datetime, zona: str = None) -> datetime:
    if not dt:
        return None
    tz = obtener_tz_doctor(zona)
    if dt.tzinfo is not None:
        return dt.astimezone(tz)
    else:
        return tz.localize(dt)

# Ubicación: backend_fastapi/utils/fechas.py (añadir o verificar esta función)
def formatear_fecha_visual(fecha_input, zona: str = None) -> str:
    """Convierte cualquier fecha, datetime o string a formato visual DD/MM/AAAA"""
    if not fecha_input:
        return ""
    if isinstance(fecha_input, datetime):
        fecha_input = asegurar_tz(fecha_input, zona).date()
    if isinstance(fecha_input, date):
        return fecha_input.strftime('%d/%m/%Y')
    if isinstance(fecha_input, str):
        limpia = fecha_input.split('T')[0].split(' ')[0].strip()
        if '-' in limpia:
            p = limpia.split('-')
            if len(p) == 3:
                return f"{p[2]}/{p[1]}/{p[0]}"
    return str(fecha_input) 

def fecha_esta_vigente(dt, zona: str = None) -> bool:
    """Determina con precisión si una fecha/datetime aún está vigente en hora local"""
    if not dt:
        return False
    dt_aware = asegurar_tz(dt, zona)
    if not dt_aware:
        return False
    return dt_aware > ahora_aware(zona)

def fecha_esta_vencida(dt, zona: str = None) -> bool:
    """Inverso seguro de fecha_esta_vigente"""
    return not fecha_esta_vigente(dt, zona)

def calcular_dias_restantes(dt, zona: str = None) -> int:
    """Calcula los días restantes contra la hora local con redondeo hacia arriba para fracciones"""
    if not dt:
        return 0
    dt_aware = asegurar_tz(dt, zona)
    if not dt_aware:
        return 0
    ahora = ahora_aware(zona)
    if dt_aware <= ahora:
        return 0
    segundos_restantes = (dt_aware - ahora).total_seconds()
    return max(0, int(segundos_restantes // 86400) + (1 if segundos_restantes % 86400 > 0 else 0))

def calcular_progreso_periodo(dt_fin, duracion_dias: int, zona: str = None) -> int:
    """Calcula el porcentaje transcurrido del plan (0 a 100%) para la interfaz visual"""
    if not dt_fin or duracion_dias <= 0:
        return 100
    fin_aware = asegurar_tz(dt_fin, zona)
    if not fin_aware:
        return 100
    ahora = ahora_aware(zona)
    if fin_aware <= ahora:
        return 100
    inicio_aware = fin_aware - timedelta(days=duracion_dias)
    duracion_total = (fin_aware - inicio_aware).total_seconds()
    tiempo_transcurrido = (ahora - inicio_aware).total_seconds()
    if duracion_total <= 0:
        return 100
    return min(100, max(0, int((tiempo_transcurrido / duracion_total) * 100)))   