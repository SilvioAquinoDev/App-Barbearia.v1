from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from auth import get_current_barber, get_current_user
from models import LoyaltyConfig, LoyaltyPoints, LoyaltyTransaction, Appointment, Service

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


# --- Schemas ---

class LoyaltyConfigUpdate(BaseModel):
    points_per_real: float = 1.0
    redemption_threshold: int = 100
    reward_description: str = "1 Corte Grátis"
    is_active: bool = True

class ManualPointsAdd(BaseModel):
    client_phone: str
    client_name: Optional[str] = None
    points: int
    description: str = "Pontos manuais"

class RedeemRequest(BaseModel):
    client_phone: str


# --- Barber endpoints ---

@router.get("/config")
async def get_loyalty_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = LoyaltyConfig(barber_id=current_user.user_id)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return {
        "id": config.id,
        "points_per_real": config.points_per_real,
        "redemption_threshold": config.redemption_threshold,
        "reward_description": config.reward_description,
        "is_active": config.is_active,
    }

@router.put("/config")
async def update_loyalty_config(
    data: LoyaltyConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = LoyaltyConfig(barber_id=current_user.user_id)
        db.add(config)
    config.points_per_real = data.points_per_real
    config.redemption_threshold = data.redemption_threshold
    config.reward_description = data.reward_description
    config.is_active = data.is_active
    await db.commit()
    await db.refresh(config)
    return {"message": "Configuração atualizada", "config": {
        "points_per_real": config.points_per_real,
        "redemption_threshold": config.redemption_threshold,
        "reward_description": config.reward_description,
        "is_active": config.is_active,
    }}

@router.get("/clients")
async def list_loyalty_clients(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(LoyaltyPoints).order_by(LoyaltyPoints.points.desc())
    )
    clients = result.scalars().all()
    return [
        {
            "id": c.id,
            "client_phone": c.client_phone,
            "client_name": c.client_name,
            "points": c.points,
            "total_earned": c.total_earned,
            "total_redeemed": c.total_redeemed,
        }
        for c in clients
    ]

@router.get("/client/{phone}")
async def get_client_points(
    phone: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: get client points by phone"""
    result = await db.execute(
        select(LoyaltyPoints).where(LoyaltyPoints.client_phone == phone)
    )
    client = result.scalar_one_or_none()
    if not client:
        return {"client_phone": phone, "points": 0, "total_earned": 0, "total_redeemed": 0}
    
    # Get config for threshold info
    config_result = await db.execute(select(LoyaltyConfig).where(LoyaltyConfig.is_active == True))
    config = config_result.scalar_one_or_none()
    
    threshold = config.redemption_threshold if config else 100
    reward = config.reward_description if config else "1 Corte Grátis"
    
    return {
        "client_phone": client.client_phone,
        "client_name": client.client_name,
        "points": client.points,
        "total_earned": client.total_earned,
        "total_redeemed": client.total_redeemed,
        "redemption_threshold": threshold,
        "reward_description": reward,
    }

@router.get("/client/{phone}/history")
async def get_client_history(
    phone: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LoyaltyTransaction)
        .where(LoyaltyTransaction.client_phone == phone)
        .order_by(LoyaltyTransaction.created_at.desc())
        .limit(50)
    )
    txns = result.scalars().all()
    return [
        {
            "id": t.id,
            "type": t.type,
            "points": t.points,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in txns
    ]

@router.post("/add-points")
async def add_points_manual(
    data: ManualPointsAdd,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    result = await db.execute(
        select(LoyaltyPoints).where(LoyaltyPoints.client_phone == data.client_phone)
    )
    client = result.scalar_one_or_none()
    if not client:
        client = LoyaltyPoints(
            client_phone=data.client_phone,
            client_name=data.client_name,
            points=0,
            total_earned=0,
            total_redeemed=0,
        )
        db.add(client)
    
    if data.client_name:
        client.client_name = data.client_name
    client.points += data.points
    client.total_earned += data.points
    
    txn = LoyaltyTransaction(
        client_phone=data.client_phone,
        type="earn",
        points=data.points,
        description=data.description,
    )
    db.add(txn)
    await db.commit()
    
    return {"message": f"{data.points} pontos adicionados", "new_balance": client.points}

@router.post("/redeem")
async def redeem_points(
    data: RedeemRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    config_result = await db.execute(
        select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
    )
    config = config_result.scalar_one_or_none()
    threshold = config.redemption_threshold if config else 100
    reward = config.reward_description if config else "1 Corte Grátis"
    
    result = await db.execute(
        select(LoyaltyPoints).where(LoyaltyPoints.client_phone == data.client_phone)
    )
    client = result.scalar_one_or_none()
    if not client or client.points < threshold:
        raise HTTPException(status_code=400, detail=f"Pontos insuficientes. Necessário: {threshold}")
    
    client.points -= threshold
    client.total_redeemed += threshold
    
    txn = LoyaltyTransaction(
        client_phone=data.client_phone,
        type="redeem",
        points=threshold,
        description=f"Resgate: {reward}",
    )
    db.add(txn)
    await db.commit()
    
    return {
        "message": f"Resgate realizado: {reward}",
        "points_used": threshold,
        "new_balance": client.points,
    }


async def award_loyalty_points(db: AsyncSession, appointment_id: int, service_price: float, client_phone: str, client_name: str = None):
    """Called after appointment completion to award loyalty points"""
    config_result = await db.execute(
        select(LoyaltyConfig).where(LoyaltyConfig.is_active == True)
    )
    config = config_result.scalar_one_or_none()
    if not config:
        return
    
    points = int(service_price * config.points_per_real)
    if points <= 0:
        return
    
    result = await db.execute(
        select(LoyaltyPoints).where(LoyaltyPoints.client_phone == client_phone)
    )
    client = result.scalar_one_or_none()
    if not client:
        client = LoyaltyPoints(
            client_phone=client_phone,
            client_name=client_name,
            points=0,
            total_earned=0,
            total_redeemed=0,
        )
        db.add(client)
    
    if client_name:
        client.client_name = client_name
    client.points += points
    client.total_earned += points
    
    txn = LoyaltyTransaction(
        client_phone=client_phone,
        type="earn",
        points=points,
        description=f"Serviço concluído (R${service_price:.2f})",
        appointment_id=appointment_id,
    )
    db.add(txn)
    await db.commit()
