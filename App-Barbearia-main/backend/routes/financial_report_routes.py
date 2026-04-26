"""Enhanced financial reports routes"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import datetime, timedelta

from database import get_db
from auth import get_current_barber
from models import ServiceHistory, Service, ProductSale, Product, Appointment, User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/financial-summary")
async def financial_summary(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Enhanced financial reports: monthly revenue, avg ticket, top services"""
    now = datetime.utcnow()
    start = now - timedelta(days=months * 30)

    # Monthly service revenue
    service_rev = await db.execute(
        select(
            extract("year", ServiceHistory.completed_at).label("year"),
            extract("month", ServiceHistory.completed_at).label("month"),
            func.sum(ServiceHistory.price_paid).label("total"),
            func.count(ServiceHistory.id).label("count"),
        )
        .where(ServiceHistory.completed_at >= start)
        .group_by("year", "month")
        .order_by("year", "month")
    )
    monthly_services = [
        {
            "year": int(r.year),
            "month": int(r.month),
            "total": float(r.total or 0),
            "count": int(r.count),
        }
        for r in service_rev.fetchall()
    ]

    # Monthly product revenue
    product_rev = await db.execute(
        select(
            extract("year", ProductSale.created_at).label("year"),
            extract("month", ProductSale.created_at).label("month"),
            func.sum(ProductSale.total_price).label("total"),
            func.count(ProductSale.id).label("count"),
        )
        .where(ProductSale.created_at >= start)
        .group_by("year", "month")
        .order_by("year", "month")
    )
    monthly_products = [
        {
            "year": int(r.year),
            "month": int(r.month),
            "total": float(r.total or 0),
            "count": int(r.count),
        }
        for r in product_rev.fetchall()
    ]

    # Top services
    top_svc = await db.execute(
        select(
            Service.name,
            func.count(ServiceHistory.id).label("count"),
            func.sum(ServiceHistory.price_paid).label("revenue"),
        )
        .join(Service, ServiceHistory.service_id == Service.id)
        .where(ServiceHistory.completed_at >= start)
        .group_by(Service.name)
        .order_by(func.sum(ServiceHistory.price_paid).desc())
        .limit(10)
    )
    top_services = [
        {"name": r.name, "count": int(r.count), "revenue": float(r.revenue or 0)}
        for r in top_svc.fetchall()
    ]

    # Overall totals
    total_service_rev = sum(m["total"] for m in monthly_services)
    total_product_rev = sum(m["total"] for m in monthly_products)
    total_service_count = sum(m["count"] for m in monthly_services)
    avg_ticket = total_service_rev / total_service_count if total_service_count > 0 else 0

    # This month stats
    current_month = now.month
    current_year = now.year
    this_month_svc = next(
        (m for m in monthly_services if m["year"] == current_year and m["month"] == current_month),
        {"total": 0, "count": 0},
    )
    this_month_prod = next(
        (m for m in monthly_products if m["year"] == current_year and m["month"] == current_month),
        {"total": 0, "count": 0},
    )

    # Appointments today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_apts = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.scheduled_time.between(today_start, today_end),
            Appointment.status.in_(["pending", "confirmed"]),
        )
    )
    appointments_today = today_apts.scalar() or 0

    return {
        "period_months": months,
        "total_revenue": total_service_rev + total_product_rev,
        "total_service_revenue": total_service_rev,
        "total_product_revenue": total_product_rev,
        "total_services_done": total_service_count,
        "average_ticket": round(avg_ticket, 2),
        "this_month": {
            "service_revenue": this_month_svc["total"],
            "product_revenue": this_month_prod["total"],
            "services_count": this_month_svc["count"],
            "total": this_month_svc["total"] + this_month_prod["total"],
        },
        "appointments_today": appointments_today,
        "monthly_services": monthly_services,
        "monthly_products": monthly_products,
        "top_services": top_services,
    }
