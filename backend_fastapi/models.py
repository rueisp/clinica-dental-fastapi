from sqlalchemy import Column, Integer, String, Date, Time, Boolean, BigInteger, Text, ForeignKey, DateTime, JSON, Float, Index, UniqueConstraint, func
from sqlalchemy.orm import relationship
from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash
from database import Base 

# ============================================================
# MODELO: USUARIO
# ============================================================
class Usuario(Base):
    __tablename__ = 'usuarios'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    nombre_completo = Column(String(150), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Relaciones - Deben coincidir con back_populates de las otras clases
    pacientes = relationship('Paciente', back_populates='odontologo', cascade="all, delete-orphan")
    planes = relationship('UsuarioPlan', back_populates='usuario', cascade='all, delete-orphan')
    limites_diarios = relationship('LimiteDiario', back_populates='usuario', cascade='all, delete-orphan')
    auditoria_accesos = relationship('AuditoriaAcceso', back_populates='usuario', cascade='all, delete-orphan')
    pagos_registrados = relationship('PagoClinico', back_populates='usuario')
    solicitudes_pago = relationship('SolicitudPago', back_populates='usuario')
    citas = relationship('Cita', back_populates='odontologo') # <--- CORRECCIÓN VITAL

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# ============================================================
# MODELO: PACIENTE
# ============================================================
class Paciente(Base):
    __tablename__ = 'paciente'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    tipo_documento = Column(String(50), nullable=True)
    documento = Column(String(50), unique=True, nullable=True, index=True)
    fecha_nacimiento = Column(Date, nullable=True)
    edad = Column(Integer, nullable=True)
    sexo = Column(String(1), nullable=True)
    email = Column(String(100), nullable=True)
    telefono = Column(String(50), nullable=False)
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
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relaciones
    odontologo = relationship('Usuario', back_populates='pacientes')
    evoluciones = relationship('Evolucion', back_populates='paciente', cascade="all, delete-orphan")
    citas = relationship('Cita', back_populates='paciente')
    pagos_clinicos = relationship('PagoClinico', back_populates='paciente')

# ============================================================
# MODELO: CITA
# ============================================================
class Cita(Base):
    __tablename__ = 'cita'
    __table_args__ = (
        Index('idx_cita_fecha_odontologo', 'fecha', 'odontologo_id'),
        Index('idx_cita_estado', 'estado'),
        {'extend_existing': True}
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
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    pre_nombres = Column(String(100), nullable=True)
    pre_apellidos = Column(String(100), nullable=True)
    pre_telefono = Column(String(50), nullable=True)
    
    paciente = relationship('Paciente', back_populates='citas')
    odontologo = relationship('Usuario', back_populates='citas')

# ============================================================
# MODELO: EVOLUCION
# ============================================================
class Evolucion(Base):
    __tablename__ = 'evolucion'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    descripcion = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=False, default=func.now())
    paciente_id = Column(Integer, ForeignKey('paciente.id'), nullable=False)
    
    paciente = relationship("Paciente", back_populates="evoluciones")

# ============================================================
# TABLA UNIFICADA: PAGOS DE PACIENTES (PAGOS CLÍNICOS)
# ============================================================
class PagoClinico(Base):
    __tablename__ = 'pagos'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey('paciente.id', ondelete="SET NULL"), nullable=True)
    paciente_nombre = Column(String(255), nullable=False)
    fecha = Column(Date, nullable=False, default=func.current_date())
    hora = Column(Time, nullable=False)
    descripcion = Column(Text, nullable=False)
    monto = Column(BigInteger, nullable=False) 
    metodo_pago = Column(String(50), nullable=False)
    observacion = Column(Text, nullable=True)
    pagado_por = Column(String(150), nullable=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    es_rapido = Column(Boolean, default=False, nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    telefono = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    paciente = relationship("Paciente", back_populates="pagos_clinicos")
    usuario = relationship("Usuario", back_populates="pagos_registrados")

# ============================================================
# MODELOS DE SUSCRIPCIÓN Y SISTEMA
# ============================================================
class Plan(Base):
    __tablename__ = 'planes'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(200), nullable=True)
    precio_mensual = Column(Float, nullable=False, default=0.0)
    precio_cop = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, default=True, nullable=False)
    
    usuarios_planes = relationship('UsuarioPlan', back_populates='plan')

class UsuarioPlan(Base):
    __tablename__ = 'usuarios_planes'
    __table_args__ = (Index('idx_u_p_activo', 'usuario_id', 'estado'), {'extend_existing': True})
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    plan_id = Column(Integer, ForeignKey('planes.id'), nullable=False)
    estado = Column(String(20), nullable=False, default='activo')
    fecha_inicio = Column(DateTime, default=func.now())
    es_trial = Column(Boolean, default=False)
    
    usuario = relationship('Usuario', back_populates='planes')
    plan = relationship('Plan', back_populates='usuarios_planes')
    pagos_suscripcion = relationship('PagoSuscripcion', back_populates='usuario_plan')

class PagoSuscripcion(Base):
    __tablename__ = 'pagos_suscripciones'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    usuario_plan_id = Column(Integer, ForeignKey('usuarios_planes.id'), nullable=False)
    monto = Column(Float, nullable=False)
    moneda = Column(String(3), default='USD')
    fecha_pago = Column(DateTime, default=func.now())
    
    usuario_plan = relationship('UsuarioPlan', back_populates='pagos_suscripcion')

class LimiteDiario(Base):
    __tablename__ = 'limites_diarios'
    __table_args__ = (UniqueConstraint('usuario_id', 'fecha', name='uq_u_f'), {'extend_existing': True})
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    fecha = Column(Date, nullable=False, default=func.current_date())
    contador_pacientes = Column(Integer, default=0)
    limite_actual = Column(Integer, default=10)
    usuario = relationship('Usuario', back_populates='limites_diarios')

class AuditoriaAcceso(Base):
    __tablename__ = 'auditoria_accesos'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    tipo_accion = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=func.now(), index=True)
    usuario = relationship('Usuario', back_populates='auditoria_accesos')

class SolicitudPago(Base):
    __tablename__ = 'solicitudes_pago_manual'
    __table_args__ = {'extend_existing': True}
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    plan_nombre = Column(String(80))
    monto_cop = Column(Integer)
    estado = Column(String(20), default='PENDIENTE')
    usuario = relationship('Usuario', back_populates='solicitudes_pago')