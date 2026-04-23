# utils/pago_utils.py
import random
import string
from datetime import date

def generar_codigo_unico() -> str:
    """Genera un código único para el recibo"""
    fecha_str = date.today().strftime('%Y%m%d')
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"R-{fecha_str}-{random_str}"