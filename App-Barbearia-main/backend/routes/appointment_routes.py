from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel  # <-- IMPORTANTE: Adicionar este import

from database import get_db
from auth import get_current_user, get_current_barber
from models import Appointment, PushToken, User, Service
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from notification_service import notify_appointment_status
from routes.loyalty_routes import award_loyalty_points, redeem_points_from_booking

router = APIRouter(prefix="/appointments", tags=["appointments"])


async def _send_notifications_bg(appointment_id: int, action: str):
    """Background task wrapper for notifications - creates its own DB session"""
    from database import async_session_factory
    try:
        async with async_session_factory() as db:
            await notify_appointment_status(db, appointment_id, action)
    except Exception as e:
        print(f"Notification error: {e}")


async def _process_reward_redemption(db: AsyncSession, appointment):
    """Process reward redemption when appointment is completed"""
    if appointment.is_redeeming_reward and appointment.reward_description:
        try:
            result = await redeem_points_from_booking(
                db=db,
                client_email=appointment.client_email,
                client_phone=appointment.client_phone,
                reward_description=appointment.reward_description,
                appointment_id=appointment.id
            )
            
            # Adiciona uma nota no agendamento
            if appointment.notes:
                appointment.notes += f"\n\n✅ PRÊMIO RESGATADO: {appointment.reward_description} (Pontos: {result['points_used']})"
            else:
                appointment.notes = f"✅ PRÊMIO RESGATADO: {appointment.reward_description} (Pontos: {result['points_used']})"
            
            await db.commit()
            print(f"✅ Resgate processado: {result}")
            return result
        except Exception as e:
            print(f"❌ Erro ao processar resgate: {e}")
            return None
    return None


# Public Booking Schema (definido aqui para não depender do schemas.py)
class PublicBookingCreate(BaseModel):
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    service_id: int
    scheduled_time: datetime
    notes: Optional[str] = None
    is_redeeming_reward: bool = False
    reward_description: Optional[str] = None


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new appointment"""
    
    appointment = Appointment(
        client_id=current_user.user_id,
        service_id=appointment_data.service_id,
        scheduled_time=appointment_data.scheduled_time,
        notes=appointment_data.notes,
        status="pending",
        is_redeeming_reward=appointment_data.is_redeeming_reward if hasattr(appointment_data, 'is_redeeming_reward') else False,
        reward_description=appointment_data.reward_description if hasattr(appointment_data, 'reward_description') else None
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Send notification in background
    background_tasks.add_task(
        _send_notifications_bg,
        appointment.id,
        "created"
    )
    
    return appointment


@router.get("/")
async def list_appointments(
    status_filter: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List appointments with service info"""
    
    query = select(Appointment, Service.name, Service.price).join(
        Service, Appointment.service_id == Service.id
    )
    
    if current_user.role == "client":
        query = query.where(
            (Appointment.client_id == current_user.user_id) |
            (Appointment.client_email == current_user.email)
        )
    
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    
    query = query.order_by(Appointment.scheduled_time.desc())
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "id": apt.id,
            "client_id": apt.client_id,
            "service_id": apt.service_id,
            "scheduled_time": apt.scheduled_time.isoformat(),
            "status": apt.status,
            "client_name": apt.client_name,
            "client_phone": apt.client_phone,
            "client_email": apt.client_email,
            "notes": apt.notes,
            "notification_sent": apt.notification_sent,
            "created_at": apt.created_at.isoformat(),
            "updated_at": apt.updated_at.isoformat(),
            "service_name": service_name,
            "service_price": service_price,
            "is_redeeming_reward": apt.is_redeeming_reward if hasattr(apt, 'is_redeeming_reward') else False,
            "reward_description": apt.reward_description if hasattr(apt, 'reward_description') else None,
        }
        for apt, service_name, service_price in rows
    ]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appointment by ID"""
    
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check permissions
    if current_user.role == "client" and appointment.client_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this appointment"
        )
    
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Update appointment (barber only)"""
    
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Update fields
    update_data = appointment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    await db.commit()
    await db.refresh(appointment)
    
    return appointment


@router.post("/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Confirm appointment"""
    
    result = await db.execute(
        select(Appointment, Service.name).join(
            Service, Appointment.service_id == Service.id
        ).where(Appointment.id == appointment_id)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    appointment, service_name = row
    appointment.status = "confirmed"
    await db.commit()
    
    # Send Push + WhatsApp notification in background
    background_tasks.add_task(
        _send_notifications_bg, appointment.id, "confirmed"
    )
    
    return {"message": "Appointment confirmed successfully"}


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel appointment - allows both clients and barbers to cancel"""
    
    result = await db.execute(
        select(Appointment, Service.name).join(
            Service, Appointment.service_id == Service.id
        ).where(Appointment.id == appointment_id)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    appointment, service_name = row
    
    # Check permissions
    if current_user.role == "client":
        # Client can only cancel their own appointments
        if appointment.client_id != current_user.user_id and appointment.client_email != current_user.email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments"
            )
        # Optional: Check if appointment is in the future
        if appointment.scheduled_time <= datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel past appointments"
            )
    # Barbers can cancel any appointment (no additional checks needed)
    
    appointment.status = "cancelled"
    await db.commit()
    
    background_tasks.add_task(
        _send_notifications_bg, appointment.id, "cancelled"
    )
    
    return {"message": "Appointment cancelled successfully"}


@router.post("/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Mark appointment as completed and process reward redemption if applicable"""
    
    result = await db.execute(
        select(Appointment, Service.name, Service.price).join(
            Service, Appointment.service_id == Service.id
        ).where(Appointment.id == appointment_id)
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    appointment, service_name, service_price = row
    appointment.status = "completed"
    appointment.completed_at = datetime.now()
    await db.commit()
    
    # Process reward redemption if this is a reward booking
    await _process_reward_redemption(db, appointment)
    
    # Award loyalty points for the service (if not redeeming)
    # Se não for um resgate, dá os pontos normalmente
    if not appointment.is_redeeming_reward and appointment.client_phone:
        try:
            await award_loyalty_points(
                db, 
                appointment.id, 
                service_price,
                appointment.client_phone, 
                appointment.client_name, 
                appointment.client_email
            )
        except Exception as e:
            print(f"[Loyalty] Erro ao dar pontos: {e}")
    
    background_tasks.add_task(
        _send_notifications_bg, appointment.id, "completed"
    )
    
    return {"message": "Appointment completed successfully"}


# Public booking endpoint (não requer autenticação)
@router.post("/public/book", status_code=status.HTTP_201_CREATED)
async def public_booking(
    booking_data: PublicBookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint for booking without authentication"""
    
    # Verificar se o horário está disponível
    result = await db.execute(
        select(Appointment).where(
            Appointment.scheduled_time == booking_data.scheduled_time,
            Appointment.status.in_(["pending", "confirmed"])
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already taken"
        )
    
    # Buscar o serviço para obter o preço e duração
    service_result = await db.execute(
        select(Service).where(Service.id == booking_data.service_id)
    )
    service = service_result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Criar o agendamento
    appointment = Appointment(
        client_name=booking_data.client_name,
        client_phone=booking_data.client_phone,
        client_email=booking_data.client_email,
        service_id=booking_data.service_id,
        scheduled_time=booking_data.scheduled_time,
        notes=booking_data.notes,
        status="pending",
        is_redeeming_reward=booking_data.is_redeeming_reward,
        reward_description=booking_data.reward_description
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Send notification in background
    background_tasks.add_task(
        _send_notifications_bg,
        appointment.id,
        "created"
    )
    
    return {
        "id": appointment.id,
        "client_name": appointment.client_name,
        "client_phone": appointment.client_phone,
        "client_email": appointment.client_email,
        "service_name": service.name,
        "scheduled_time": appointment.scheduled_time.isoformat(),
        "status": appointment.status,
        "is_redeeming_reward": appointment.is_redeeming_reward,
        "reward_description": appointment.reward_description
    }