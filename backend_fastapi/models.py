from sqlalchemy import Column, Integer, Numeric, String, Date, Time, Boolean, BigInteger, Text, ForeignKey, DateTime, JSON, Float, Index, UniqueConstraint, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, date
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from database import Base 

# ============================================================
# MODELO: USUARIO (Actualizado a UUID)
# ============================================================
class Usuario(Base):
    __tablename__ = 'usuarios'
    __table_args__ = {'extend_existing': True}
    
    # El ID ahora es UUID para casar con Supabase Auth
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Relaciones actualizadas
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
# MODELO: SUBSCRIPTION (El corazón del nuevo sistema)
# ============================================================
class Subscription(Base):
    __tablename__ = 'subscriptions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), unique=True)
    plan_type = Column(String, default='trial') # trial, basic, pro
    status = Column(String, default='active')
    current_period_end = Column(DateTime)
    
    usuario = relationship('Usuario', back_populates='subscription')

# ============================================================
# MODELO: PACIENTE (Mantiene todos tus campos clínicos)
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
    dentigrama_canvas = Column(Text, nullable=True) # Cambiado a Text por si el base64 es largo
    imagen_perfil_url = Column(String(255), nullable=True)
    
    # La clave foránea ahora es UUID
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    odontologo = relationship('Usuario', back_populates='pacientes')
    evoluciones = relationship('Evolucion', back_populates='paciente', cascade="all, delete-orphan")
    citas = relationship('Cita', back_populates='paciente')
    pagos_clinicos = relationship('PagoClinico', back_populates='paciente')

# ============================================================
# MODELO: CITA (Sincronizado con UUID y Supabase)
# ============================================================
class Cita(Base):
    __tablename__ = 'citas'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # CAMBIO CRÍTICO: Debe ser UUID para conectar con la tabla pacientes
    paciente_id = Column(UUID(as_uuid=True), ForeignKey('pacientes.id', ondelete="CASCADE"), nullable=True)
    
    # Usamos DateTime o Date/Time según prefieras, pero mantengamos la consistencia
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(Time, nullable=False)
    motivo = Column(String(255), nullable=True)
    doctor = Column(String(100), nullable=False)

    nombre_provisional = Column(String(255), nullable=True)
    telefono_provisional = Column(String(50), nullable=True)
    
    # Conector con el Odontólogo (ya es UUID)
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False, index=True)
    
    # Nombre de columna: 'estado' para que coincida con el SQL de Supabase
    estado = Column(String(20), default='pendiente')
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relaciones
    paciente = relationship('Paciente', back_populates='citas')
    odontologo = relationship('Usuario', back_populates='citas')

# ============================================================
# MODELO: EVOLUCION
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
# MODELO: LIMITE DIARIO (Corregido para UUID y Relaciones)
# ============================================================
class LimiteDiario(Base):
    __tablename__ = 'limites_diarios'
    
    # 1. Cambiamos ID a UUID para mantener consistencia con todo el proyecto
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 2. Aseguramos que el ForeignKey sea UUID y coincida con 'usuarios.id'
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    
    # 3. Usamos Date para que coincida con la comparación en la lógica de límites
    fecha = Column(Date, default=datetime.now().date)
    
    contador_pacientes = Column(Integer, default=0)
    limite_actual = Column(Integer, default=5) # 5 es el estándar para el plan Trial
    
    # Esta relación debe coincidir con el 'back_populates' que pongas en la clase Usuario
    usuario = relationship('Usuario', back_populates='limites_diarios')

# ============================================================
# MODELO: PAGOS CLÍNICOS (Sincronizado con Supabase)
# ============================================================
class PagoClinico(Base):
    __tablename__ = 'pagos'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey('pacientes.id', ondelete="CASCADE"), nullable=True)
    
    # IMPORTANTE: Cambiamos user_id por odontologo_id para que coincida con su SQL
    odontologo_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    
    monto = Column(Numeric(12, 2), nullable=False) # Numeric coincide con su SQL numeric(12,2)
    
    # CAMBIO CRÍTICO: Su SQL tiene 'concepto', no 'descripcion' ni 'paciente_nombre'
    concepto = Column(Text, nullable=True) 
    
    metodo_pago = Column(Text, nullable=True)
    fecha = Column(DateTime(timezone=True), default=func.now()) # Coincide con su default now()
    hora = Column(Time, nullable=True)
    codigo = Column(String(50), unique=True) # El R-2026...
    observacion = Column(Text, nullable=True)
    telefono = Column(String(20), nullable=True)
    pagado_por = Column(String(255), nullable=True)
    es_rapido = Column(Boolean, default=False)
    paciente_nombre = Column(String(255), nullable=True) # <-- AGREGAR ESTA LÍNEA
    
    # Relaciones (Asegúrese de que el nombre coincida en Usuario y Paciente)
    usuario = relationship("Usuario", back_populates="pagos_registrados")
    paciente = relationship("Paciente", back_populates="pagos_clinicos")


class Plan(Base):
    __tablename__ = 'planes'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(50), nullable=False, unique=True) # Aquí irá 'trial', 'basic', 'pro'
    descripcion = Column(String(200))
    precio_cop = Column(Integer, default=0)
    precio_mensual = Column(Float, default=0.0) # Equivalente a USD
    duracion_dias = Column(Integer, default=30)
    limite_pacientes_diario = Column(Integer, default=10)
    activo = Column(Boolean, default=True)
    orden = Column(Integer, default=1)
     ## --- AGREGA ESTAS 4 LÍNEAS NUEVAS ---
    can_use_odontogram = Column(Boolean, default=False)
    can_use_multimedia = Column(Boolean, default=False)
    can_use_voice = Column(Boolean, default=False)
    can_export_history = Column(Boolean, default=False)
    ## ------------------------------------
    
    # Esta relación conecta el nombre del plan con la suscripción
    usuarios_suscritos = relationship("Subscription", primaryjoin="Plan.nombre == Subscription.plan_type", foreign_keys="Subscription.plan_type", viewonly=True)  


class PagoSuscripcion(Base):
    __tablename__ = 'pagos_suscripcion'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('usuarios.id'), nullable=False)
    # CAMBIO: plan_id debe ser UUID para coincidir con Plan.id
    plan_id = Column(UUID(as_uuid=True), ForeignKey('planes.id', ondelete="CASCADE"), nullable=False) 
    monto = Column(Integer, nullable=False)
    referencia_pago = Column(String(50), nullable=False)
    comprobante_url = Column(String(500), nullable=False)
    estado = Column(String(20), default='pendiente')
    fecha_reporte = Column(DateTime, default=func.now())
    fecha_aprobacion = Column(DateTime, nullable=True)
    # Agregado para que no falle el endpoint de listar todos
    observacion_admin = Column(Text, nullable=True)   