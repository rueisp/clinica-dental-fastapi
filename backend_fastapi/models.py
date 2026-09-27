# backend_fastapi/models.py
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, Numeric, String, Date, Time, Boolean,
    Text, ForeignKey, DateTime, Float, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from werkzeug.security import generate_password_hash, check_password_hash
from database import Base 

# ============================================================
# MODELO: USUARIO (Odontólogos y Administrador)
# ============================================================
class Usuario(Base):
    __tablename__ = 'usuarios'
    __table_args__ = {'extend_existing': True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    nombre_consultorio = Column(String(150), nullable=True)
    telefono = Column(String(50), nullable=True)
    
    # Relaciones
    pacientes = relationship('Paciente', back_populates='odontologo', cascade="all, delete-orphan")
    subscription = relationship('Subscription', back_populates='usuario', uselist=False)
    limites_diarios = relationship('LimiteDiario', back_populates='usuario', cascade='all, delete-orphan')
    pagos_registrados = relationship('PagoClinico', back_populates='usuario')
    citas = relationship('Cita', back_populates='odontologo')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# ============================================================
# MODELO: SUBSCRIPTION (Vigencia y Estado del Plan del Doctor)
# ============================================================
class Subscription(Base):
    __tablename__ = 'subscriptions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), unique=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('planes.id'), nullable=True)
    plan_type = Column(String, default='trial') 
    status = Column(String, default='active')
    
    current_period_start = Column(DateTime, default=func.now())
    current_period_end = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
     
    usuario = relationship('Usuario', back_populates='subscription')
    plan = relationship('Plan')

# ============================================================
# MODELO: PACIENTE (Ficha Clínica y Antecedentes)
# ============================================================
class Paciente(Base):
    __tablename__ = 'pacientes'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    dentigrama_canvas = Column(Text, nullable=True)
    imagen_perfil_url = Column(String(255), nullable=True)
    
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    odontologo = relationship('Usuario', back_populates='pacientes')
    evoluciones = relationship('Evolucion', back_populates='paciente', cascade="all, delete-orphan")
    citas = relationship('Cita', back_populates='paciente')
    pagos_clinicos = relationship('PagoClinico', back_populates='paciente')

# ============================================================
# MODELO: CITA (Agenda Odontológica)
# ============================================================
class Cita(Base):
    __tablename__ = 'citas'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey('pacientes.id', ondelete="CASCADE"), nullable=True)
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(Time, nullable=False)
    motivo = Column(String(255), nullable=True)
    doctor = Column(String(100), nullable=False)
    nombre_provisional = Column(String(255), nullable=True)
    telefono_provisional = Column(String(50), nullable=True)
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False, index=True)
    estado = Column(String(20), default='pendiente')
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    paciente = relationship('Paciente', back_populates='citas')
    odontologo = relationship('Usuario', back_populates='citas')

# ============================================================
# MODELO: EVOLUCION (Historial Clínico)
# ============================================================
class Evolucion(Base):
    __tablename__ = 'evoluciones'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    descripcion = Column(Text, nullable=False)
    fecha = Column(DateTime, default=func.now())
    paciente_id = Column(UUID(as_uuid=True), ForeignKey('pacientes.id', ondelete="CASCADE"), nullable=False)
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    paciente = relationship("Paciente", back_populates="evoluciones")

# ============================================================
# MODELO: LIMITE DIARIO (Control de Pacientes por Día)
# ============================================================
class LimiteDiario(Base):
    __tablename__ = 'limites_diarios'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    fecha = Column(Date, default=date.today)
    contador_pacientes = Column(Integer, default=0)
    limite_actual = Column(Integer, default=20)
    
    usuario = relationship('Usuario', back_populates='limites_diarios')

# ============================================================
# MODELO: PAGOS CLÍNICOS (Recibos y Cobros del Consultorio)
# ============================================================
class PagoClinico(Base):
    __tablename__ = 'pagos'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey('pacientes.id', ondelete="CASCADE"), nullable=True)
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    concepto = Column(Text, nullable=True) 
    metodo_pago = Column(Text, nullable=True)
    fecha = Column(DateTime(timezone=True), default=func.now())
    hora = Column(Time, nullable=True)
    codigo = Column(String(50), unique=True)
    observacion = Column(Text, nullable=True)
    telefono = Column(String(20), nullable=True)
    pagado_por = Column(String(255), nullable=True)
    es_rapido = Column(Boolean, default=False)
    paciente_nombre = Column(String(255), nullable=True)
    
    usuario = relationship("Usuario", back_populates="pagos_registrados")
    paciente = relationship("Paciente", back_populates="pagos_clinicos")

# ============================================================
# MODELO: PLAN (Catálogo Oficial de Suscripciones)
# ============================================================
class Plan(Base):
    __tablename__ = 'planes'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(200))
    precio_cop = Column(Integer, default=0)
    precio_mensual = Column(Float, default=0.0)
    duracion_dias = Column(Integer, default=30)
    limite_pacientes_diario = Column(Integer, default=10)
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=1)
    can_use_odontogram = Column(Boolean, default=False)
    can_use_multimedia = Column(Boolean, default=False)
    can_use_voice = Column(Boolean, default=False)
    can_export_history = Column(Boolean, default=False)
    can_use_bot = Column(Boolean, default=False)
    
    usuarios_suscritos = relationship("Subscription", primaryjoin="Plan.nombre == Subscription.plan_type", foreign_keys="Subscription.plan_type", viewonly=True)  

# ============================================================
# MODELO: PAGO SUSCRIPCIÓN (Reportes de Upgrade y Renovación)
# ============================================================
class PagoSuscripcion(Base):
    __tablename__ = 'pagos_suscripcion'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('planes.id', ondelete="CASCADE"), nullable=False) 
    monto = Column(Integer, nullable=False)
    referencia_pago = Column(String(50), nullable=False)
    comprobante_url = Column(String(500), nullable=False)
    estado = Column(String(20), default='pendiente')
    fecha_reporte = Column(DateTime, default=func.now())
    fecha_aprobacion = Column(DateTime, nullable=True)
    observacion_admin = Column(Text, nullable=True)