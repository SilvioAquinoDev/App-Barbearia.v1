"""Clients management routes - list clients from appointments + registered users"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Optional
from pydantic import BaseModel
from datetime import date

from database import get_db
from auth import get_current_barber
from models import User, Appointment

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientResponse(BaseModel):
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    total_appointments: int = 0
    last_appointment: Optional[str] = None
    source: str = "appointment"  # "registered" or "appointment"


@router.get("/")
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber),
):
    """List all clients: registered users + unique clients from appointments"""
    clients = []
    seen_emails = set()
    seen_phones = set()

    # 1. Registered clients (users with role='client')
    result = await db.execute(
        select(User).where(User.role == "client")
    )
    registered = result.scalars().all()
    for u in registered:
        # Get appointment stats
        stats = await db.execute(
            select(func.count(Appointment.id), func.max(Appointment.scheduled_time)).where(
                (Appointment.client_id == u.user_id) | (Appointment.client_email == u.email)
            )
        )
        row = stats.first()
        total = row[0] if row else 0
        last = row[1].strftime("%d/%m/%Y %H:%M") if row and row[1] else None

        clients.append(ClientResponse(
            id=u.user_id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            birth_date=u.birth_date,
            total_appointments=total,
            last_appointment=last,
            source="registered",
        ))
        seen_emails.add(u.email.lower() if u.email else "")
        if u.phone:
            seen_phones.add(u.phone.replace(" ", "").replace("-", ""))

    # 2. Unique clients from appointments (not already in registered list)
    appt_result = await db.execute(
        select(
            Appointment.client_name,
            Appointment.client_email,
            Appointment.client_phone,
            func.count(Appointment.id).label("total"),
            func.max(Appointment.scheduled_time).label("last_time"),
        )
        .where(Appointment.client_name.isnot(None))
        .group_by(Appointment.client_name, Appointment.client_email, Appointment.client_phone)
    )
    for row in appt_result.all():
        name, email, phone, total, last_time = row
        email_lower = email.lower() if email else ""
        phone_clean = phone.replace(" ", "").replace("-", "") if phone else ""

        # Skip if already in registered list
        if email_lower and email_lower in seen_emails:
            continue
        if phone_clean and phone_clean in seen_phones:
            continue

        clients.append(ClientResponse(
            id=None,
            name=name,
            email=email,
            phone=phone,
            birth_date=None,
            total_appointments=total,
            last_appointment=last_time.strftime("%d/%m/%Y %H:%M") if last_time else None,
            source="appointment",
        ))
        if email_lower:
            seen_emails.add(email_lower)
        if phone_clean:
            seen_phones.add(phone_clean)

    # Sort by name
    clients.sort(key=lambda c: c.name.lower())
    return clients
