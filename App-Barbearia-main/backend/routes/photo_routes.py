from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth import get_current_barber
from models import ServicePhoto

router = APIRouter(prefix="/service-photos", tags=["service-photos"])


class PhotoCreate(BaseModel):
    service_id: int
    photo_data: str  # base64
    caption: Optional[str] = None


@router.get("/{service_id}")
async def get_service_photos(
    service_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Public: get photos for a service"""
    result = await db.execute(
        select(ServicePhoto)
        .where(ServicePhoto.service_id == service_id)
        .order_by(ServicePhoto.created_at.desc())
    )
    photos = result.scalars().all()
    return [
        {
            "id": p.id,
            "service_id": p.service_id,
            "photo_data": p.photo_data,
            "caption": p.caption,
            "created_at": p.created_at.isoformat(),
        }
        for p in photos
    ]


@router.post("/", status_code=201)
async def upload_photo(
    data: PhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    photo = ServicePhoto(
        service_id=data.service_id,
        photo_data=data.photo_data,
        caption=data.caption,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return {"id": photo.id, "message": "Foto adicionada com sucesso"}


@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(ServicePhoto).where(ServicePhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    await db.delete(photo)
    await db.commit()
    return {"message": "Foto removida"}
