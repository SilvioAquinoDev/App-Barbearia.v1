from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, Integer, Float, JSON, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
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
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="client", foreign_keys="Appointment.client_id")

class Barbershop(Base):
    """Barbershop entity for multi-tenant"""
    __tablename__ = "barbershops"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Appointment(Base):
    """Appointment model"""
    __tablename__ = "appointments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("users.user_id"), nullable=True, index=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"))
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, confirmed, cancelled, completed
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    client_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client: Mapped[Optional[User]] = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    service: Mapped[Service] = relationship("Service")


class BarberAvailability(Base):
    """Barber schedule/availability model"""
    __tablename__ = "barber_availability"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), index=True)
    day_of_week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0=Monday, 6=Sunday
    specific_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)  # HH:MM
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    recurrence_type: Mapped[str] = mapped_column(String(20), default="weekly")  # daily, weekly, biweekly, monthly
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

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


class ProductSale(Base):
    """Product sale record"""
    __tablename__ = "product_sales"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), index=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float)
    total_price: Mapped[float] = mapped_column(Float)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WhatsAppSettings(Base):
    """WhatsApp Business API settings"""
    __tablename__ = "whatsapp_settings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), unique=True)
    phone_number_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    wasender_pat: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wasender_session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wasender_session_key: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoyaltyConfig(Base):
    """Loyalty program configuration"""
    __tablename__ = "loyalty_config"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"), unique=True)
    points_per_real: Mapped[float] = mapped_column(Float, default=1.0)
    redemption_threshold: Mapped[int] = mapped_column(Integer, default=100)
    reward_description: Mapped[str] = mapped_column(String(255), default="1 Corte Grátis")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoyaltyPoints(Base):
    """Client loyalty points"""
    __tablename__ = "loyalty_points"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    client_phone: Mapped[str] = mapped_column(String(30), index=True)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    total_earned: Mapped[int] = mapped_column(Integer, default=0)
    total_redeemed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoyaltyTransaction(Base):
    """Loyalty points transaction history"""
    __tablename__ = "loyalty_transactions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    client_phone: Mapped[str] = mapped_column(String(30), index=True)
    type: Mapped[str] = mapped_column(String(20))  # "earn" or "redeem"
    points: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(255))
    appointment_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("appointments.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Promotion(Base):
    """Promotions created by barber"""
    __tablename__ = "promotions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    barber_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.user_id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discount_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ServicePhoto(Base):
    """Photos for services/portfolio"""
    __tablename__ = "service_photos"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"), index=True)
    photo_data: Mapped[str] = mapped_column(Text)  # base64 encoded
    caption: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

