from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "client"
    phone: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str]
    role: str
    phone: Optional[str]
    birth_date: Optional[date] = None
    barbershop_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Service Schemas
class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    duration_minutes: int = Field(..., gt=0)

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None

class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    duration_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    stock: int
    image_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Appointment Schemas
class AppointmentCreate(BaseModel):
    service_id: int
    scheduled_time: datetime
    notes: Optional[str] = None
    is_redeeming_reward: bool = False
    reward_description: Optional[str] = None

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    client_id: Optional[str] = None
    service_id: int
    scheduled_time: datetime
    status: str
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    notes: Optional[str] = None
    notification_sent: bool
    created_at: datetime
    updated_at: datetime
    is_redeeming_reward: Optional[bool] = False
    reward_description: Optional[str] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Public Booking Schema (para agendamento sem autenticação)
class PublicBookingCreate(BaseModel):
    client_name: str = Field(..., min_length=2, max_length=255)
    client_phone: str = Field(..., min_length=8, max_length=20)
    client_email: Optional[EmailStr] = None
    service_id: int
    scheduled_time: datetime
    notes: Optional[str] = None
    is_redeeming_reward: bool = False
    reward_description: Optional[str] = None

class PublicBookingResponse(BaseModel):
    id: int
    client_name: str
    client_phone: str
    client_email: Optional[str]
    service_name: str
    scheduled_time: datetime
    status: str
    is_redeeming_reward: bool
    reward_description: Optional[str]
    
    class Config:
        from_attributes = True

# Cash Register Schemas
class CashRegisterOpen(BaseModel):
    opening_balance: float = Field(default=0.0, ge=0)

class CashRegisterClose(BaseModel):
    closing_balance: float = Field(..., ge=0)

class CashRegisterResponse(BaseModel):
    id: int
    barber_id: str
    opened_at: datetime
    closed_at: Optional[datetime]
    opening_balance: float
    closing_balance: Optional[float]
    total_services: float
    total_products: float
    status: str
    
    class Config:
        from_attributes = True

# Service History Schemas
class ServiceHistoryCreate(BaseModel):
    client_id: str
    service_id: int
    appointment_id: Optional[int] = None
    price_paid: float
    photos: Optional[List[str]] = None  # base64 images
    notes: Optional[str] = None

class ServiceHistoryResponse(BaseModel):
    id: int
    client_id: str
    barber_id: str
    service_id: int
    appointment_id: Optional[int]
    cash_register_id: Optional[int]
    price_paid: float
    photos: Optional[List[str]]
    notes: Optional[str]
    completed_at: datetime
    
    class Config:
        from_attributes = True

# Push Token Schemas
class PushTokenRegister(BaseModel):
    token: str
    platform: str = Field(..., pattern="^(ios|android)$")

class PushTokenResponse(BaseModel):
    id: int
    user_id: str
    token: str
    platform: str
    is_active: bool
    
    class Config:
        from_attributes = True

# Report Schemas
class FinancialReport(BaseModel):
    period: str  # daily, weekly, monthly
    start_date: datetime
    end_date: datetime
    total_services: float
    total_products: float
    total_revenue: float
    services_count: int
    appointments_count: int

# Loyalty Schemas
class LoyaltyConfigUpdate(BaseModel):
    points_per_real: float = 1.0
    redemption_threshold: int = 100
    reward_description: str = "1 Corte Grátis"
    is_active: bool = True

class LoyaltyPointsResponse(BaseModel):
    client_email: Optional[str]
    client_phone: Optional[str]
    client_name: Optional[str]
    points: int
    total_earned: int
    total_redeemed: int
    redemption_threshold: int
    reward_description: str

class LoyaltyTransactionResponse(BaseModel):
    id: int
    type: str  # earn or redeem
    points: int
    description: str
    created_at: datetime
    appointment_id: Optional[int]

class ManualPointsAdd(BaseModel):
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_name: Optional[str] = None
    points: int = Field(..., gt=0)
    description: str = "Pontos manuais"

class RedeemPointsRequest(BaseModel):
    client_email: EmailStr

class AvailableSlotsResponse(BaseModel):
    date: str
    slots: List[str]

# Barber Shop Schemas
class BarbershopCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class BarbershopResponse(BaseModel):
    id: int
    name: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: str
    title: str
    body: str
    data: Optional[dict]
    read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Working Hours Schemas
class WorkingHoursUpdate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)  # 0=Monday, 6=Sunday
    start_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    is_working: bool = True

class WorkingHoursResponse(BaseModel):
    id: int
    barbershop_id: int
    day_of_week: int
    start_time: str
    end_time: str
    is_working: bool
    
    class Config:
        from_attributes = True