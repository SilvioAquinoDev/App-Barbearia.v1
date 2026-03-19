from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta, date
from pydantic import BaseModel, Field

from database import get_db
from models import Appointment, Service, BarberAvailability, User
from notification_service import notify_new_appointment

router = APIRouter(prefix="/public", tags=["public-booking"])


# --- Schemas ---

class PublicBookingCreate(BaseModel):
    client_name: str = Field(..., min_length=2, max_length=255)
    client_phone: str = Field(..., min_length=8, max_length=30)
    client_email: Optional[str] = None
    service_id: int
    scheduled_time: str  # ISO datetime string
    notes: Optional[str] = None


class AvailableSlot(BaseModel):
    time: str  # HH:MM
    datetime_iso: str  # Full ISO datetime


class ServicePublic(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    duration_minutes: int

    class Config:
        from_attributes = True


class BookingConfirmation(BaseModel):
    id: int
    client_name: str
    client_phone: str
    client_email: Optional[str] = None
    service_name: str
    scheduled_time: str
    status: str


# --- Endpoints ---

@router.get("/services", response_model=List[ServicePublic])
async def get_public_services(db: AsyncSession = Depends(get_db)):
    """Get active services - public, no auth"""
    result = await db.execute(
        select(Service).where(Service.is_active == True)
    )
    return result.scalars().all()


@router.get("/available-slots")
async def get_available_slots(
    date_str: str,  # YYYY-MM-DD
    service_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots for a specific date - public, no auth"""

    # Parse the date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Don't allow past dates
    if target_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book past dates")

    day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday

    # Get service duration if specified
    service_duration = 30
    if service_id:
        svc_result = await db.execute(select(Service).where(Service.id == service_id))
        service = svc_result.scalar_one_or_none()
        if service:
            service_duration = service.duration_minutes

    # Get barber availability for this day
    result = await db.execute(
        select(BarberAvailability).where(
            and_(
                BarberAvailability.is_active == True,
                or_(
                    BarberAvailability.day_of_week == day_of_week,
                    BarberAvailability.specific_date == date_str
                )
            )
        )
    )
    availabilities = result.scalars().all()

    if not availabilities:
        return {"date": date_str, "slots": [], "message": "Sem horários disponíveis para esta data"}

    # Generate all possible time slots
    all_slots = set()
    for avail in availabilities:
        start_h, start_m = map(int, avail.start_time.split(":"))
        end_h, end_m = map(int, avail.end_time.split(":"))
        slot_dur = avail.slot_duration_minutes or service_duration

        current = datetime(target_date.year, target_date.month, target_date.day, start_h, start_m)
        end_time = datetime(target_date.year, target_date.month, target_date.day, end_h, end_m)

        while current + timedelta(minutes=slot_dur) <= end_time:
            all_slots.add(current)
            current += timedelta(minutes=slot_dur)

    # Get existing appointments for this date (exclude cancelled)
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59)

    booked_result = await db.execute(
        select(Appointment.scheduled_time).where(
            and_(
                Appointment.scheduled_time >= day_start,
                Appointment.scheduled_time <= day_end,
                Appointment.status.in_(["pending", "confirmed"])
            )
        )
    )
    booked_times = {row[0] for row in booked_result.all()}

    # Filter out booked slots and past times
    now = datetime.utcnow()
    available = []
    for slot in sorted(all_slots):
        if slot not in booked_times and slot > now:
            available.append({
                "time": slot.strftime("%H:%M"),
                "datetime_iso": slot.isoformat()
            })

    return {
        "date": date_str,
        "day_name": ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][day_of_week],
        "slots": available,
        "total_available": len(available)
    }


@router.post("/book", response_model=BookingConfirmation, status_code=status.HTTP_201_CREATED)
async def public_book_appointment(
    booking: PublicBookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Book an appointment - public, no login required"""

    # Validate service exists
    svc_result = await db.execute(
        select(Service).where(and_(Service.id == booking.service_id, Service.is_active == True))
    )
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    # Parse scheduled time
    try:
        scheduled = datetime.fromisoformat(booking.scheduled_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data/hora inválido")

    # Don't allow past times
    if scheduled < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Não é possível agendar no passado")

    # Check if slot is still available
    existing = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.scheduled_time == scheduled,
                Appointment.status.in_(["pending", "confirmed"])
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Este horário já está reservado. Escolha outro horário.")

    # Create appointment without client_id (public booking)
    appointment = Appointment(
        client_id=None,
        service_id=booking.service_id,
        scheduled_time=scheduled,
        client_name=booking.client_name,
        client_phone=booking.client_phone,
        client_email=booking.client_email,
        notes=booking.notes,
        status="pending"
    )

    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    # Send notification in background
    apt_data = {
        "id": appointment.id,
        "client_name": appointment.client_name,
        "client_phone": appointment.client_phone or "",
        "client_email": appointment.client_email or "",
        "service_name": service.name,
        "scheduled_time": scheduled.strftime("%d/%m/%Y %H:%M"),
    }
    background_tasks.add_task(notify_new_appointment, db, apt_data)

    return BookingConfirmation(
        id=appointment.id,
        client_name=appointment.client_name,
        client_phone=appointment.client_phone,
        client_email=appointment.client_email,
        service_name=service.name,
        scheduled_time=scheduled.strftime("%d/%m/%Y às %H:%M"),
        status="pending"
    )
