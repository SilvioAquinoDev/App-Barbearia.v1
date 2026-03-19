from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from database import get_db
from auth import get_current_user, get_current_barber
from models import Appointment, PushToken, User, Service
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from notification_service import notify_new_appointment, notify_appointment_confirmed, notify_appointment_cancelled, notify_appointment_completed
from routes.loyalty_routes import award_loyalty_points

router = APIRouter(prefix="/appointments", tags=["appointments"])

async def send_appointment_notifications(
    appointment_id: int,
    db: AsyncSession,
    event_type: str = "new_booking",
):
    """Background task to send push + WhatsApp notifications"""
    try:
        appt_result = await db.execute(
            select(Appointment, Service.name, Service.price).join(
                Service, Appointment.service_id == Service.id
            ).where(Appointment.id == appointment_id)
        )
        row = appt_result.first()
        if not row:
            return
        appointment, service_name, service_price = row

        apt_data = {
            "id": appointment.id,
            "client_name": appointment.client_name or "Cliente",
            "client_phone": appointment.client_phone or "",
            "client_email": appointment.client_email or "",
            "service_name": service_name,
            "scheduled_time": appointment.scheduled_time.strftime("%d/%m/%Y %H:%M"),
        }

        if event_type == "new_booking":
            await notify_new_appointment(db, apt_data)
        elif event_type == "confirmed":
            await notify_appointment_confirmed(db, apt_data)
        elif event_type == "cancelled":
            await notify_appointment_cancelled(db, apt_data)
        elif event_type == "completed":
            await notify_appointment_completed(db, apt_data)

        appointment.notification_sent = True
        await db.commit()
    except Exception as e:
        print(f"Error sending notifications: {e}")

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
        status="pending"
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Send notification in background
    background_tasks.add_task(
        send_appointment_notifications,
        appointment.id,
        db
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
        send_appointment_notifications, appointment.id, db, "confirmed"
    )
    
    return {"message": "Appointment confirmed successfully"}

@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Cancel appointment"""
    
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
    appointment.status = "cancelled"
    await db.commit()
    
    background_tasks.add_task(
        send_appointment_notifications, appointment.id, db, "cancelled"
    )
    
    return {"message": "Appointment cancelled successfully"}

@router.post("/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Mark appointment as completed"""
    
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
    await db.commit()
    
    # Award loyalty points if client has phone number
    if appointment.client_phone:
        try:
            await award_loyalty_points(
                db, appointment.id, service_price,
                appointment.client_phone, appointment.client_name
            )
        except Exception as e:
            print(f"[Loyalty] Erro ao dar pontos: {e}")
    
    background_tasks.add_task(
        send_appointment_notifications, appointment.id, db, "completed"
    )
    
    return {"message": "Appointment completed successfully"}
