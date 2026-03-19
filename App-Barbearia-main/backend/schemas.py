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
    notes: Optional[str] = None
    notification_sent: bool
    created_at: datetime
    updated_at: datetime
    
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
