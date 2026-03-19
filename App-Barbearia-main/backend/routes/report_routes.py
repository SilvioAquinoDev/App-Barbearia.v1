from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta

from database import get_db
from auth import get_current_barber
from models import Appointment, Service, ProductSale, CashRegister

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/financial")
async def get_financial_report(
    period: str = "day",  # day, week, month
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    now = datetime.utcnow()
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Revenue from completed appointments
    svc_result = await db.execute(
        select(func.coalesce(func.sum(Service.price), 0), func.count(Appointment.id))
        .select_from(Appointment)
        .join(Service, Appointment.service_id == Service.id)
        .where(and_(
            Appointment.status == "completed",
            Appointment.updated_at >= start,
        ))
    )
    svc_row = svc_result.first()
    total_services = float(svc_row[0]) if svc_row else 0
    completed_count = int(svc_row[1]) if svc_row else 0
    
    # Revenue from product sales
    prod_result = await db.execute(
        select(func.coalesce(func.sum(ProductSale.total_price), 0), func.count(ProductSale.id))
        .where(and_(
            ProductSale.barber_id == current_user.user_id,
            ProductSale.created_at >= start,
        ))
    )
    prod_row = prod_result.first()
    total_products = float(prod_row[0]) if prod_row else 0
    product_sales_count = int(prod_row[1]) if prod_row else 0
    
    # Cancelled appointments count
    cancel_result = await db.execute(
        select(func.count(Appointment.id))
        .where(and_(
            Appointment.status == "cancelled",
            Appointment.updated_at >= start,
        ))
    )
    cancelled_count = cancel_result.scalar() or 0
    
    # Pending appointments count
    pending_result = await db.execute(
        select(func.count(Appointment.id))
        .where(and_(
            Appointment.status.in_(["pending", "confirmed"]),
            Appointment.scheduled_time >= start,
        ))
    )
    pending_count = pending_result.scalar() or 0
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "total_services": total_services,
        "total_products": total_products,
        "total_revenue": total_services + total_products,
        "completed_appointments": completed_count,
        "product_sales_count": product_sales_count,
        "cancelled_appointments": cancelled_count,
        "pending_appointments": pending_count,
    }


@router.get("/top-services")
async def get_top_services(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    now = datetime.utcnow()
    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    result = await db.execute(
        select(
            Service.name,
            Service.price,
            func.count(Appointment.id).label("count"),
            func.sum(Service.price).label("revenue")
        )
        .select_from(Appointment)
        .join(Service, Appointment.service_id == Service.id)
        .where(and_(
            Appointment.status == "completed",
            Appointment.updated_at >= start,
        ))
        .group_by(Service.id, Service.name, Service.price)
        .order_by(func.count(Appointment.id).desc())
        .limit(10)
    )
    rows = result.all()
    return [
        {
            "name": r[0],
            "price": float(r[1]),
            "count": int(r[2]),
            "revenue": float(r[3]) if r[3] else 0,
        }
        for r in rows
    ]


@router.get("/daily-breakdown")
async def get_daily_breakdown(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    now = datetime.utcnow()
    result = []
    
    for i in range(days):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Services revenue
        svc = await db.execute(
            select(func.coalesce(func.sum(Service.price), 0), func.count(Appointment.id))
            .select_from(Appointment)
            .join(Service, Appointment.service_id == Service.id)
            .where(and_(
                Appointment.status == "completed",
                Appointment.updated_at >= day_start,
                Appointment.updated_at < day_end,
            ))
        )
        svc_row = svc.first()
        
        # Products revenue
        prod = await db.execute(
            select(func.coalesce(func.sum(ProductSale.total_price), 0))
            .where(and_(
                ProductSale.barber_id == current_user.user_id,
                ProductSale.created_at >= day_start,
                ProductSale.created_at < day_end,
            ))
        )
        prod_total = float(prod.scalar() or 0)
        
        result.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day_name": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][day_start.weekday()],
            "services": float(svc_row[0]) if svc_row else 0,
            "products": prod_total,
            "appointments": int(svc_row[1]) if svc_row else 0,
        })
    
    result.reverse()
    return result
