# backend_fastapi/utils/pago_utils.py
import random
import string
from utils.fechas import obtener_ahora_local

def generar_codigo_unico() -> str:
    """Genera un código único para el recibo tipo R-YYYYMMDD-XXXXXX con hora oficial de Colombia"""
    fecha_str = obtener_ahora_local('America/Bogota').strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"R-{fecha_str}-{random_str}"