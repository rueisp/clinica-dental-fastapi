# backend_fastapi/utils/pago_utils.py
import secrets
from utils.fechas import obtener_ahora_local

# Alfabeto Base32 limpio sin caracteres visualmente ambiguos (excluye: 0, O, 1, I, L)
ALFABETO_RECIBO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

def generar_codigo_unico(zona_horaria: str = "America/Bogota") -> str:
    """
    Genera un código de recibo criptográficamente seguro y legible tipo R-YYYYMMDD-XXXXXX.
    Utiliza hora oficial de Colombia y un alfabeto sin caracteres confusos para evitar errores de transcripción.
    """
    fecha_str = obtener_ahora_local(zona_horaria).strftime('%Y%m%d')
    sufijo_aleatorio = ''.join(secrets.choice(ALFABETO_RECIBO) for _ in range(6))
    return f"R-{fecha_str}-{sufijo_aleatorio}"