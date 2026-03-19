from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db
from auth import get_current_barber
from models import Service
from schemas import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter(prefix="/services", tags=["services"])

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Create a new service"""
    
    service = Service(**service_data.model_dump())
    db.add(service)
    await db.commit()
    await db.refresh(service)
    
    return service

@router.get("/", response_model=List[ServiceResponse])
async def list_services(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """List all services"""
    
    query = select(Service)
    if active_only:
        query = query.where(Service.is_active == True)
    
    result = await db.execute(query)
    services = result.scalars().all()
    
    return services

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get service by ID"""
    
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    return service

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Update service"""
    
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Update fields
    update_data = service_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)
    
    await db.commit()
    await db.refresh(service)
    
    return service

@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Delete service (soft delete)"""
    
    result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service.is_active = False
    await db.commit()
    
    return {"message": "Service deleted successfully"}

@router.put("/{service_id}/toggle-active", response_model=ServiceResponse)
async def toggle_service_active(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_barber)
):
    """Toggle service active status"""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.is_active = not service.is_active
    await db.commit()
    await db.refresh(service)
    return service

