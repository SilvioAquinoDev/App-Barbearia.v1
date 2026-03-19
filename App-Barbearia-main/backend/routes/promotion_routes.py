from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from auth import get_current_barber
from models import Promotion

router = APIRouter(prefix="/promotions", tags=["promotions"])


class PromotionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    code: Optional[str] = None
    valid_until: Optional[str] = None  # ISO date


class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    code: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_promotions(
    db: AsyncSession = Depends(get_db),
):
    """List active promotions - public"""
    result = await db.execute(
        select(Promotion).where(Promotion.is_active == True).order_by(Promotion.created_at.desc())
    )
    promos = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "discount_percent": p.discount_percent,
            "code": p.code,
            "valid_until": p.valid_until.isoformat() if p.valid_until else None,
            "is_active": p.is_active,
        }
        for p in promos
    ]


@router.get("/all")
async def list_all_promotions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """List all promotions for barber management"""
    result = await db.execute(
        select(Promotion).where(Promotion.barber_id == current_user.user_id)
        .order_by(Promotion.created_at.desc())
    )
    promos = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "discount_percent": p.discount_percent,
            "code": p.code,
            "valid_until": p.valid_until.isoformat() if p.valid_until else None,
            "is_active": p.is_active,
        }
        for p in promos
    ]


@router.post("/", status_code=201)
async def create_promotion(
    data: PromotionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    valid_until = None
    if data.valid_until:
        try:
            valid_until = datetime.fromisoformat(data.valid_until)
        except ValueError:
            pass
    
    promo = Promotion(
        barber_id=current_user.user_id,
        title=data.title,
        description=data.description,
        discount_percent=data.discount_percent,
        code=data.code,
        valid_until=valid_until,
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return {
        "id": promo.id,
        "title": promo.title,
        "message": "Promoção criada com sucesso",
    }


@router.put("/{promo_id}")
async def update_promotion(
    promo_id: int,
    data: PromotionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(Promotion).where(and_(Promotion.id == promo_id, Promotion.barber_id == current_user.user_id))
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    
    if data.title is not None: promo.title = data.title
    if data.description is not None: promo.description = data.description
    if data.discount_percent is not None: promo.discount_percent = data.discount_percent
    if data.code is not None: promo.code = data.code
    if data.is_active is not None: promo.is_active = data.is_active
    if data.valid_until is not None:
        try:
            promo.valid_until = datetime.fromisoformat(data.valid_until)
        except ValueError:
            pass
    
    await db.commit()
    return {"message": "Promoção atualizada"}


@router.delete("/{promo_id}")
async def delete_promotion(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(Promotion).where(and_(Promotion.id == promo_id, Promotion.barber_id == current_user.user_id))
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    
    await db.delete(promo)
    await db.commit()
    return {"message": "Promoção removida"}
