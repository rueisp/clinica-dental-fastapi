# models_fastapi.py - Versión para FastAPI (sin dependencias de Flask)
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, Text, ForeignKey, JSON, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime, date
from database import Base

class Usuario(Base):
    __tablename__ = 'usuarios'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    nombre_completo = Column(String(150), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Relaciones
    pacientes = relationship('Paciente', back_populates='odontologo')
    planes = relationship('UsuarioPlan', back_populates='usuario', cascade='all, delete-orphan')
    limites_diarios = relationship('LimiteDiario', back_populates='usuario', cascade='all, delete-orphan')


class Paciente(Base):
    __tablename__ = 'paciente'
    
    id = Column(Integer, primary_key=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    tipo_documento = Column(String(50), nullable=True)
    documento = Column(String(50), unique=True, nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    edad = Column(Integer, nullable=True)
    sexo = Column(String(1), nullable=True)
    telefono = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    ocupacion = Column(String(100), nullable=True)
    direccion = Column(String(200), nullable=True)
    barrio = Column(String(100), nullable=True)
    motivo_consulta = Column(Text, nullable=True)
    enfermedad_actual = Column(Text, nullable=True)
    alergias = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    cepillado_dental = Column(Text, nullable=True)
    habitos = Column(Text, nullable=True)
    dentigrama_canvas = Column(String(255), nullable=True)
    imagen_perfil_url = Column(String(255), nullable=True)
    odontologo_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relaciones
    odontologo = relationship('Usuario', back_populates='pacientes')
    evoluciones = relationship('Evolucion', backref='paciente', lazy='dynamic')
    citas = relationship('Cita', back_populates='paciente')


class Cita(Base):
    __tablename__ = 'cita'
    __table_args__ = (
        Index('idx_cita_fecha_odontologo', 'fecha', 'odontologo_id'),
        Index('idx_cita_estado', 'estado'),
    )
    
    id = Column(Integer, primary_key=True)
    paciente_id = Column(Integer, ForeignKey('paciente.id'), nullable=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    motivo = Column(String(255), nullable=True)
    doctor = Column(String(100), nullable=False)
    odontologo_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    observaciones = Column(Text, nullable=True)
    estado = Column(String(20), default='pendiente', nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    pre_nombres = Column(String(100), nullable=True)
    pre_apellidos = Column(String(100), nullable=True)
    pre_telefono = Column(String(50), nullable=True)
    
    
    # Relaciones
    paciente = relationship('Paciente', back_populates='citas')
    odontologo = relationship('Usuario', back_populates='citas')


class Plan(Base):
    __tablename__ = 'planes'
    
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(200), nullable=True)
    precio_mensual = Column(Float, nullable=False, default=0.0)
    limite_pacientes_diario = Column(Integer, nullable=False, default=10)
    precio_cop = Column(Integer, nullable=False, default=0)
    limite_pacientes_diario_primeros_7_dias = Column(Integer, nullable=False, default=20)
    duracion_trial_dias = Column(Integer, nullable=False, default=7)
    caracteristicas = Column(JSON, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    orden = Column(Integer, default=0, nullable=False)
    
    usuarios_planes = relationship('UsuarioPlan', back_populates='plan')


class UsuarioPlan(Base):
    __tablename__ = 'usuarios_planes'
    
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    plan_id = Column(Integer, ForeignKey('planes.id'), nullable=False)
    estado = Column(String(20), nullable=False, default='activo')
    fecha_inicio = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_fin = Column(DateTime, nullable=True)
    fecha_cancelacion = Column(DateTime, nullable=True)
    es_trial = Column(Boolean, default=False, nullable=False)
    trial_dias_restantes = Column(Integer, nullable=True)
    trial_pacientes_primeros_7_dias = Column(Boolean, default=False, nullable=False)
    
    usuario = relationship('Usuario', back_populates='planes')
    plan = relationship('Plan', back_populates='usuarios_planes')
    pagos = relationship('Pago', back_populates='usuario_plan', cascade='all, delete-orphan')


class LimiteDiario(Base):
    __tablename__ = 'limites_diarios'
    
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    fecha = Column(Date, nullable=False, default=date.today)
    contador_pacientes = Column(Integer, nullable=False, default=0)
    limite_actual = Column(Integer, nullable=False, default=10)
    es_dia_trial = Column(Boolean, default=False, nullable=False)
    dia_numero_trial = Column(Integer, nullable=True)
    
    usuario = relationship('Usuario', back_populates='limites_diarios')


class Pago(Base):
    __tablename__ = 'pagos'
    
    id = Column(Integer, primary_key=True)
    usuario_plan_id = Column(Integer, ForeignKey('usuarios_planes.id'), nullable=False)
    monto = Column(Float, nullable=False)
    moneda = Column(String(3), nullable=False, default='USD')
    metodo_pago = Column(String(50), nullable=True)
    id_transaccion = Column(String(100), unique=True, nullable=True)
    estado = Column(String(20), nullable=False, default='completado')
    fecha_pago = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_vencimiento = Column(DateTime, nullable=True)
    periodo_inicio = Column(DateTime, nullable=False)
    periodo_fin = Column(DateTime, nullable=False)
    metadatos = Column(JSON, nullable=True)
    
    usuario_plan = relationship('UsuarioPlan', back_populates='pagos')


class Evolucion(Base):
    __tablename__ = 'evolucion'
    
    id = Column(Integer, primary_key=True)
    descripcion = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=False)
    paciente_id = Column(Integer, ForeignKey('paciente.id'), nullable=False)
    
# Agregar relación faltante en Usuario para citas
Usuario.citas = relationship('Cita', back_populates='odontologo')


# models_fastapi.py (agregar esta clase)

class PagoUnificado(Base):
    __tablename__ = "pagos_unificados"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Campos obligatorios
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    descripcion = Column(String(255), nullable=False)
    monto = Column(Integer, nullable=False)
    metodo_pago = Column(String(50), nullable=False)
    
    # Información del paciente
    paciente_nombre = Column(String(200), nullable=False)
    paciente_id = Column(Integer, ForeignKey("paciente.id"), nullable=True)
    
    # Campos adicionales
    pagado_por = Column(String(150), nullable=True)
    observacion = Column(Text, nullable=True)
    telefono = Column(String(20), nullable=True)  # ← NUEVO: teléfono directo
    
    # Control del sistema
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    es_rapido = Column(Boolean, default=False, nullable=False)
    
    # Auditoría
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # Relaciones
    paciente = relationship("Paciente", backref="pagos_unificados")
    usuario = relationship("Usuario", backref="pagos_registrados")

