import httpx
from fastapi import Depends, HTTPException, status, Cookie, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from database import get_db
from models import User, UserSession
from config import get_settings

settings = get_settings()

async def exchange_session_id(session_id: str) -> dict:
    """Exchange session_id for user data from Emergent Auth"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10.0
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session_id"
            )
        
        return response.json()

async def create_user_session(
    user_data: dict,
    db: AsyncSession
) -> tuple[User, str]:
    """Create or update user and create session"""
    
    # Check if user exists
    result = await db.execute(
        select(User).where(User.email == user_data["email"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=user_id,
            email=user_data["email"],
            name=user_data.get("name", ""),
            picture=user_data.get("picture"),
            role="client"  # Default role
        )
        db.add(user)
    else:
        # Update user info
        user.name = user_data.get("name", user.name)
        user.picture = user_data.get("picture", user.picture)
    
    # Create session token
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    user_session = UserSession(
        user_id=user.user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    db.add(user_session)
    await db.commit()
    await db.refresh(user)
    
    return user, session_token

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from session token"""
    
    # Try to get token from: 1) Authorization header, 2) Cookie, 3) Query param
    token = None
    
    # Method 1: Authorization header (preferred for mobile)
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        print(f"🔑 [AUTH] Token encontrado no header Authorization")
    
    # Method 2: Cookie (for web browser)
    if not token and session_token:
        token = session_token
        print(f"🔑 [AUTH] Token encontrado no cookie")
    
    # Method 3: Query parameter fallback
    if not token:
        token = request.query_params.get("session_token")
        if token:
            print(f"🔑 [AUTH] Token encontrado nos query params")
    
    if not token:
        print(f"❌ [AUTH] Nenhum token encontrado. Headers: {dict(request.headers)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Find session
    result = await db.execute(
        select(UserSession).where(UserSession.session_token == token)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    # Check if session expired
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired"
        )
    
    # Get user
    result = await db.execute(
        select(User).where(User.user_id == session.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

async def get_current_barber(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is a barber"""
    if current_user.role != "barber":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only barbers can access this resource"
        )
    return current_user
