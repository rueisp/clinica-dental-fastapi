# utils/pago_utils.py
import random
import string
from datetime import datetime
import pytz

COLOMBIA_TZ = pytz.timezone('America/Bogota')

def generar_codigo_unico() -> str:
    """Genera un código único para el recibo tipo R-YYYYMMDD-XXXXXX con hora oficial de Colombia"""
    fecha_str = datetime.now(COLOMBIA_TZ).strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"R-{fecha_str}-{random_str}"