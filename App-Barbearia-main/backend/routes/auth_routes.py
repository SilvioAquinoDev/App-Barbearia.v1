from fastapi import APIRouter, Depends, HTTPException, status, Response, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from database import get_db
from auth import exchange_session_id, create_user_session, get_current_user
from models import User, UserSession
from schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

# Create a Pydantic model for the request body
class SessionRequest(BaseModel):
    session_id: str

@router.post("/session")
async def create_session(
    request_data: SessionRequest,  # Use Pydantic model instead of raw string
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Exchange session_id for session_token"""
    
    session_id = request_data.session_id
    print(f"🔐 [AUTH] Recebido session_id: {session_id[:20]}...")
    
    try:
        # Get user data from Emergent Auth
        print(f"📡 [AUTH] Chamando Emergent Auth para validar session_id...")
        user_data = await exchange_session_id(session_id)
        print(f"✅ [AUTH] Dados do usuário recebidos: {user_data.get('email')}")
        
        # Create user and session
        print(f"💾 [AUTH] Criando/atualizando usuário no banco...")
        user, session_token = await create_user_session(user_data, db)
        print(f"✅ [AUTH] Usuário criado/atualizado: {user.email} (role: {user.role})")
        print(f"✅ [AUTH] Session token gerado: {session_token[:20]}...")
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/"
        )
        
        print(f"🎉 [AUTH] Login completado com sucesso para {user.email}")
        
        return {
            "user": UserResponse.model_validate(user),
            "session_token": session_token
        }
    except Exception as e:
        print(f"❌ [AUTH] Erro no login: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"❌ [AUTH] Traceback: {traceback.format_exc()}")
        raise

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current user info"""
    return current_user


@router.put("/update-phone")
async def update_phone(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's phone and/or birth_date"""
    phone = data.get("phone", "").strip()
    birth_date_str = data.get("birth_date")

    if phone and len(phone) >= 8:
        current_user.phone = phone
    elif phone:
        raise HTTPException(status_code=400, detail="Telefone invalido")

    if birth_date_str:
        from datetime import date as date_type
        try:
            current_user.birth_date = date_type.fromisoformat(birth_date_str)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Data de nascimento invalida. Use YYYY-MM-DD")

    if not phone and not birth_date_str:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user"""
    
    # Delete all user sessions
    await db.execute(
        delete(UserSession).where(UserSession.user_id == current_user.user_id)
    )
    await db.commit()
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

@router.post("/promote-to-barber")
async def promote_to_barber(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Promote current user to barber (for demo purposes)"""
    
    current_user.role = "barber"
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)