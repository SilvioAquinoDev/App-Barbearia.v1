"""Google OAuth authentication - Direct Google Sign-In
REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
"""
import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import User, UserSession, Barbershop

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")


class GoogleTokenRequest(BaseModel):
    credential: str


class SetupBarbershopRequest(BaseModel):
    phone: str
    barbershop_name: str
    barbershop_address: str = ""
    barbershop_phone: str = ""


@router.post("/google")
async def google_auth(data: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with Google ID token"""
    try:
        # Verify Google ID token
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={data.credential}"
            )
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Token Google invalido")
            google_data = r.json()

        email = google_data.get("email")
        name = google_data.get("name", email)
        picture = google_data.get("picture")
        google_sub = google_data.get("sub")

        if not email:
            raise HTTPException(status_code=401, detail="Email nao encontrado no token")

        # Find or create user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                user_id=f"user_{uuid.uuid4().hex[:12]}",
                email=email,
                name=name,
                picture=picture,
                role="client",
            )
            db.add(user)
            await db.flush()

        # Create session
        session_token = f"session_{uuid.uuid4().hex}"
        session = UserSession(
            user_id=user.user_id,
            session_token=session_token,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.add(session)
        await db.commit()
        await db.refresh(user)

        # Check if user has barbershop
        shop = None
        if user.barbershop_id:
            r2 = await db.execute(select(Barbershop).where(Barbershop.id == user.barbershop_id))
            shop = r2.scalar_one_or_none()
        elif user.role == "barber":
            r2 = await db.execute(select(Barbershop).where(Barbershop.owner_id == user.user_id))
            shop = r2.scalar_one_or_none()

        return {
            "token": session_token,
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture,
                "role": user.role,
                "phone": user.phone,
                "birth_date": str(user.birth_date) if user.birth_date else None,
                "barbershop_id": user.barbershop_id,
            },
            "barbershop": {
                "id": shop.id,
                "name": shop.name,
                "phone": shop.phone,
                "address": shop.address,
            } if shop else None,
            "needs_setup": user.role == "barber" and not shop,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na autenticacao: {e}")


@router.post("/setup-barbershop")
async def setup_barbershop(
    data: SetupBarbershopRequest,
    db: AsyncSession = Depends(get_db),
):
    """First-time setup: create barbershop and update user phone"""
    pass


class UpdateProfileRequest(BaseModel):
    phone: str = ""
    birth_date: str = None


from auth import get_current_user as _get_user

@router.put("/update-profile")
async def update_profile(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(_get_user),
):
    """Update current user's profile"""
    result = await db.execute(select(User).where(User.user_id == current_user.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuario nao encontrado")

    if data.phone:
        user.phone = data.phone
    if data.birth_date:
        from datetime import datetime as dt
        try:
            user.birth_date = dt.strptime(data.birth_date, "%Y-%m-%d").date()
        except ValueError:
            try:
                user.birth_date = dt.strptime(data.birth_date, "%d/%m/%Y").date()
            except ValueError:
                pass

    await db.commit()
    return {"message": "Perfil atualizado"}


@router.get("/google-client-id")
async def get_google_client_id():
    """Return Google Client ID for frontend"""
    return {"clientId": GOOGLE_CLIENT_ID}
