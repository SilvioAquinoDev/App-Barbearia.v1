from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db
from auth import get_current_barber
from models import BarberAvailability, User

router = APIRouter(prefix="/schedule", tags=["barber-schedule"])


# --- Schemas ---

class ScheduleCreate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)  # 0=Monday, 6=Sunday
    specific_date: Optional[str] = None  # YYYY-MM-DD
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    slot_duration_minutes: int = Field(default=30, ge=10, le=120)
    recurrence_type: str = Field(default="weekly")  # daily, weekly, biweekly, monthly


class ScheduleResponse(BaseModel):
    id: int
    barber_id: str
    day_of_week: Optional[int]
    specific_date: Optional[str]
    start_time: str
    end_time: str
    slot_duration_minutes: int
    recurrence_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BulkScheduleCreate(BaseModel):
    """Create schedule for multiple days at once"""
    days: List[int] = Field(..., min_length=1)  # List of day_of_week values
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    slot_duration_minutes: int = Field(default=30, ge=10, le=120)
    recurrence_type: str = Field(default="weekly")


# --- Endpoints ---

@router.get("/", response_model=List[ScheduleResponse])
async def get_my_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Get barber's schedule"""
    result = await db.execute(
        select(BarberAvailability)
        .where(BarberAvailability.barber_id == current_user.user_id)
        .order_by(BarberAvailability.day_of_week)
    )
    return result.scalars().all()


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Create a schedule entry"""

    # Validate times
    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="Horário inicial deve ser antes do final")

    # Must have either day_of_week or specific_date
    if data.day_of_week is None and not data.specific_date:
        raise HTTPException(status_code=400, detail="Informe o dia da semana ou uma data específica")

    schedule = BarberAvailability(
        barber_id=current_user.user_id,
        day_of_week=data.day_of_week,
        specific_date=data.specific_date,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_duration_minutes=data.slot_duration_minutes,
        recurrence_type=data.recurrence_type,
        is_active=True
    )

    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return schedule


@router.post("/bulk", response_model=List[ScheduleResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_schedule(
    data: BulkScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Create schedule for multiple days at once"""

    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="Horário inicial deve ser antes do final")

    created = []
    for day in data.days:
        schedule = BarberAvailability(
            barber_id=current_user.user_id,
            day_of_week=day,
            start_time=data.start_time,
            end_time=data.end_time,
            slot_duration_minutes=data.slot_duration_minutes,
            recurrence_type=data.recurrence_type,
            is_active=True
        )
        db.add(schedule)
        created.append(schedule)

    await db.commit()
    for s in created:
        await db.refresh(s)

    return created


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Update a schedule entry"""
    result = await db.execute(
        select(BarberAvailability).where(
            and_(
                BarberAvailability.id == schedule_id,
                BarberAvailability.barber_id == current_user.user_id
            )
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horário não encontrado")

    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="Horário inicial deve ser antes do final")

    schedule.day_of_week = data.day_of_week
    schedule.specific_date = data.specific_date
    schedule.start_time = data.start_time
    schedule.end_time = data.end_time
    schedule.slot_duration_minutes = data.slot_duration_minutes
    schedule.recurrence_type = data.recurrence_type

    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Delete a schedule entry"""
    result = await db.execute(
        select(BarberAvailability).where(
            and_(
                BarberAvailability.id == schedule_id,
                BarberAvailability.barber_id == current_user.user_id
            )
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horário não encontrado")

    await db.delete(schedule)
    await db.commit()
    return {"message": "Horário removido com sucesso"}


@router.delete("/")
async def clear_all_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    """Clear all schedule entries for the barber"""
    await db.execute(
        delete(BarberAvailability).where(
            BarberAvailability.barber_id == current_user.user_id
        )
    )
    await db.commit()
    return {"message": "Todos os horários foram removidos"}
