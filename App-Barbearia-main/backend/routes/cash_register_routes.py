from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import datetime, timedelta

from database import get_db
from auth import get_current_barber
from models import CashRegister, ServiceHistory, Appointment, Service, ProductSale
from schemas import CashRegisterOpen, CashRegisterClose, CashRegisterResponse

router = APIRouter(prefix="/cash-register", tags=["cash-register"])

@router.post("/open", response_model=CashRegisterResponse)
async def open_cash_register(
    data: CashRegisterOpen,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Open cash register"""
    
    # Check if there's already an open cash register
    result = await db.execute(
        select(CashRegister).where(
            and_(
                CashRegister.barber_id == current_user.user_id,
                CashRegister.status == "open"
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cash register already open"
        )
    
    cash_register = CashRegister(
        barber_id=current_user.user_id,
        opening_balance=data.opening_balance,
        status="open"
    )
    
    db.add(cash_register)
    await db.commit()
    await db.refresh(cash_register)
    
    return cash_register

@router.post("/close", response_model=CashRegisterResponse)
async def close_cash_register(
    data: CashRegisterClose,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Close cash register"""
    
    # Find open cash register
    result = await db.execute(
        select(CashRegister).where(
            and_(
                CashRegister.barber_id == current_user.user_id,
                CashRegister.status == "open"
            )
        )
    )
    cash_register = result.scalar_one_or_none()
    
    if not cash_register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open cash register found"
        )
    
    # Calculate totals from service history
    history_result = await db.execute(
        select(ServiceHistory).where(
            ServiceHistory.cash_register_id == cash_register.id
        )
    )
    services = history_result.scalars().all()
    
    total_services = sum(service.price_paid for service in services)
    
    # Also calculate from completed appointments
    completed_result = await db.execute(
        select(func.coalesce(func.sum(Service.price), 0)).select_from(Appointment).join(
            Service, Appointment.service_id == Service.id
        ).where(
            and_(
                Appointment.status == "completed",
                Appointment.updated_at >= cash_register.opened_at
            )
        )
    )
    total_from_appointments = float(completed_result.scalar() or 0)
    total_services = max(total_services, total_from_appointments)
    
    # Calculate product sales total
    product_sales_result = await db.execute(
        select(func.coalesce(func.sum(ProductSale.total_price), 0)).where(
            and_(
                ProductSale.barber_id == current_user.user_id,
                ProductSale.created_at >= cash_register.opened_at
            )
        )
    )
    total_products = float(product_sales_result.scalar() or 0)
    
    cash_register.closing_balance = data.closing_balance
    cash_register.total_services = total_services
    cash_register.total_products = total_products
    cash_register.closed_at = datetime.utcnow()
    cash_register.status = "closed"
    
    await db.commit()
    await db.refresh(cash_register)
    
    # Gather daily summary data for WhatsApp notification
    # Count completed appointments during this cash register session
    completed_count_result = await db.execute(
        select(func.count(Appointment.id)).where(
            and_(
                Appointment.status == "completed",
                Appointment.updated_at >= cash_register.opened_at,
                Appointment.updated_at <= cash_register.closed_at
            )
        )
    )
    completed_count = completed_count_result.scalar() or 0
    
    cancelled_count_result = await db.execute(
        select(func.count(Appointment.id)).where(
            and_(
                Appointment.status == "cancelled",
                Appointment.updated_at >= cash_register.opened_at,
                Appointment.updated_at <= cash_register.closed_at
            )
        )
    )
    cancelled_count = cancelled_count_result.scalar() or 0
    
    # Get tomorrow's appointments
    tomorrow_start = (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0)
    tomorrow_end = tomorrow_start + timedelta(days=1)
    
    tomorrow_result = await db.execute(
        select(Appointment, Service.name).join(
            Service, Appointment.service_id == Service.id
        ).where(
            and_(
                Appointment.scheduled_time >= tomorrow_start,
                Appointment.scheduled_time < tomorrow_end,
                Appointment.status.in_(["pending", "confirmed"])
            )
        ).order_by(Appointment.scheduled_time)
    )
    tomorrow_rows = tomorrow_result.all()
    tomorrow_appointments = [
        {
            "time": apt.scheduled_time.strftime("%H:%M"),
            "client": apt.client_name or "Cliente",
            "service": svc_name,
        }
        for apt, svc_name in tomorrow_rows
    ]
    
    # Send daily summary via WhatsApp in background
    from routes.whatsapp_routes import send_daily_summary
    summary_data = {
        "total_services": total_services,
        "total_products": total_products,
        "completed_count": completed_count,
        "cancelled_count": cancelled_count,
        "tomorrow_appointments": tomorrow_appointments,
    }
    background_tasks.add_task(send_daily_summary, db, current_user.user_id, summary_data)
    
    return cash_register

@router.get("/current")
async def get_current_cash_register(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Get current open cash register with calculated totals"""
    
    result = await db.execute(
        select(CashRegister).where(
            and_(
                CashRegister.barber_id == current_user.user_id,
                CashRegister.status == "open"
            )
        )
    )
    cash_register = result.scalar_one_or_none()
    
    if not cash_register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No open cash register found"
        )
    
    # Calculate total from completed appointments since cash register opened
    completed_result = await db.execute(
        select(func.coalesce(func.sum(Service.price), 0)).select_from(Appointment).join(
            Service, Appointment.service_id == Service.id
        ).where(
            and_(
                Appointment.status == "completed",
                Appointment.updated_at >= cash_register.opened_at
            )
        )
    )
    total_services = float(completed_result.scalar() or 0)
    
    # Calculate total from service history for this cash register
    history_result = await db.execute(
        select(func.coalesce(func.sum(ServiceHistory.price_paid), 0)).where(
            ServiceHistory.cash_register_id == cash_register.id
        )
    )
    total_from_history = float(history_result.scalar() or 0)
    
    # Use the larger of the two totals
    total_services = max(total_services, total_from_history)
    
    # Calculate product sales total since cash register opened
    product_sales_result = await db.execute(
        select(func.coalesce(func.sum(ProductSale.total_price), 0)).where(
            and_(
                ProductSale.barber_id == current_user.user_id,
                ProductSale.created_at >= cash_register.opened_at
            )
        )
    )
    total_products = float(product_sales_result.scalar() or 0)
    
    # Update the cash register with calculated totals
    cash_register.total_services = total_services
    cash_register.total_products = total_products
    await db.commit()
    await db.refresh(cash_register)
    
    return cash_register

@router.get("/history", response_model=List[CashRegisterResponse])
async def get_cash_register_history(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Get cash register history"""
    
    result = await db.execute(
        select(CashRegister)
        .where(CashRegister.barber_id == current_user.user_id)
        .order_by(CashRegister.opened_at.desc())
        .limit(limit)
    )
    registers = result.scalars().all()
    
    return registers
