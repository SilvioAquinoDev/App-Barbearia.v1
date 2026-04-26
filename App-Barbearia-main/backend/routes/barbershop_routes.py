"""Barbershop management routes - SaaS entity"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel

from database import get_db
from auth import get_current_user, get_current_barber
from models import Barbershop, User
from services.supabase_storage import upload_file

router = APIRouter(prefix="/barbershop", tags=["barbershop"])


class BarbershopCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None


class BarbershopUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


@router.get("/mine")
async def get_my_barbershop(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Get the barbershop owned by the current barber"""
    result = await db.execute(
        select(Barbershop).where(Barbershop.owner_id == current_user.user_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        return None
    return {
        "id": shop.id,
        "name": shop.name,
        "phone": shop.phone,
        "address": shop.address,
        "logo_url": shop.logo_url,
        "owner_id": shop.owner_id,
        "created_at": shop.created_at.isoformat() if shop.created_at else None,
    }


@router.post("/")
async def create_barbershop(
    data: BarbershopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Create a new barbershop (first-time onboarding)"""
    existing = await db.execute(
        select(Barbershop).where(Barbershop.owner_id == current_user.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Voce ja possui uma barbearia cadastrada")

    shop = Barbershop(
        name=data.name,
        phone=data.phone,
        address=data.address,
        owner_id=current_user.user_id,
    )
    db.add(shop)
    await db.commit()
    await db.refresh(shop)
    return {
        "id": shop.id,
        "name": shop.name,
        "phone": shop.phone,
        "address": shop.address,
        "logo_url": shop.logo_url,
        "owner_id": shop.owner_id,
    }


@router.put("/")
async def update_barbershop(
    data: BarbershopUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Update barbershop info"""
    result = await db.execute(
        select(Barbershop).where(Barbershop.owner_id == current_user.user_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Barbearia nao encontrada")

    if data.name is not None:
        shop.name = data.name
    if data.phone is not None:
        shop.phone = data.phone
    if data.address is not None:
        shop.address = data.address

    await db.commit()
    await db.refresh(shop)
    return {
        "id": shop.id,
        "name": shop.name,
        "phone": shop.phone,
        "address": shop.address,
        "logo_url": shop.logo_url,
        "owner_id": shop.owner_id,
    }


@router.post("/logo")
async def upload_barbershop_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Upload barbershop logo"""
    result = await db.execute(
        select(Barbershop).where(Barbershop.owner_id == current_user.user_id)
    )
    shop = result.scalar_one_or_none()
    if not shop:
        raise HTTPException(status_code=404, detail="Barbearia nao encontrada. Cadastre primeiro.")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    file_data = await file.read()
    try:
        logo_url = await upload_file("barbershop-logos", file_data, f"logo.{ext}", file.content_type or "image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no upload: {e}")

    shop.logo_url = logo_url
    await db.commit()
    await db.refresh(shop)

    return {"logo_url": shop.logo_url}


@router.get("/public-info")
async def get_public_barbershop_info(db: AsyncSession = Depends(get_db)):
    """Get barbershop public info (for web-client). Returns the first barbershop."""
    result = await db.execute(select(Barbershop).limit(1))
    shop = result.scalar_one_or_none()
    if not shop:
        return {"name": "Barbershop Premium", "phone": None, "address": None, "logo_url": None}
    return {
        "name": shop.name,
        "phone": shop.phone,
        "address": shop.address,
        "logo_url": shop.logo_url,
    }
