from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from auth import get_current_barber
from models import ProductSale, Product, User

router = APIRouter(prefix="/product-sales", tags=["product-sales"])


class SaleResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    client_name: str | None
    created_at: datetime


@router.get("/")
async def get_sales(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(ProductSale, Product.name).join(
            Product, ProductSale.product_id == Product.id
        ).where(
            and_(
                ProductSale.barber_id == current_user.user_id,
                ProductSale.created_at >= since
            )
        ).order_by(ProductSale.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": sale.id,
            "product_id": sale.product_id,
            "product_name": name,
            "quantity": sale.quantity,
            "unit_price": sale.unit_price,
            "total_price": sale.total_price,
            "client_name": sale.client_name,
            "created_at": sale.created_at.isoformat(),
        }
        for sale, name in rows
    ]


@router.get("/summary")
async def get_sales_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber)
):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    async def get_total(since):
        result = await db.execute(
            select(func.coalesce(func.sum(ProductSale.total_price), 0)).where(
                and_(
                    ProductSale.barber_id == current_user.user_id,
                    ProductSale.created_at >= since
                )
            )
        )
        return float(result.scalar() or 0)
    
    return {
        "today": await get_total(today),
        "week": await get_total(week_ago),
        "month": await get_total(month_ago),
    }
