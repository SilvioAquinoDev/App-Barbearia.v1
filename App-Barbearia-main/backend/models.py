from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from database import Base

class User(Base):
    """User model for barbers and clients"""
    __tablename__ = "users"
    
    user_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    picture: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="client")  # "barber" or "client"
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    #appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="client", foreign_keys="Appointment.client_id")
    # Relationships - agora pode ser None para agendamentos de visitantes
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment", 
        back_populates="client", 
        foreign_keys="Appointment.client_id"
    )


class UserSession(Base):
    """User session for authentication"""
    __tablename__ = "user_sessions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    session_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Service(Base):
    """Service model"""
    __tablename__ = "services"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(Base):
    """Product model"""
    __tablename__ = "products"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Appointment(Base):
    """Appointment model"""
    __tablename__ = "appointments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"))
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, confirmed, cancelled, completed
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Novos campos para agendamentos públicos (usando a sintaxe correta)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Nome do cliente (para visitantes)
    client_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Telefone do cliente
    client_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Email do cliente (opcional)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False)  # True se for agendamento de visitante
    
    # Relationships
    #client: Mapped[User] = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    #service: Mapped[Service] = relationship("Service")
    client: Mapped[Optional[User]] = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    service: Mapped[Service] = relationship("Service")



class CashRegister(Base):
    """Cash register model"""
    __tablename__ = "cash_register"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"))
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    opening_balance: Mapped[float] = mapped_column(Float, default=0.0)
    closing_balance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_services: Mapped[float] = mapped_column(Float, default=0.0)
    total_products: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open, closed

class ServiceHistory(Base):
    """Service history model"""
    __tablename__ = "service_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"))
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"))
    appointment_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("appointments.id"), nullable=True)
    cash_register_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("cash_register.id"), nullable=True)
    price_paid: Mapped[float] = mapped_column(Float)
    photos: Mapped[Optional[str]] = mapped_column(JSON, nullable=True)  # Array of base64 images
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PushToken(Base):
    """Push token model for notifications"""
    __tablename__ = "push_tokens"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(20))  # ios or android
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
