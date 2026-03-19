'''from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from auth import exchange_session_id, create_user_session, get_current_user
from models import User, UserSession
from schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/session")
async def create_session(
    session_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Exchange session_id for session_token"""
    
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
            secure=False, # antes era True
            samesite="lax", # antes era none
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
    
    return UserResponse.model_validate(current_user)'''

    # routes/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from database import get_db
from auth import exchange_session_id, create_user_session, get_current_user
from models import User, UserSession
from schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

# Modelo Pydantic para receber o session_id no body
class SessionRequest(BaseModel):
    session_id: str

@router.post("/session")
async def create_session(
    request_data: SessionRequest,  # ← Agora recebe JSON do body
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Exchange session_id for session_token"""
    
    session_id = request_data.session_id  # ← Pega do body
    
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
        
        # Set cookie - CONFIGURAÇÃO PARA DESENVOLVIMENTO
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=False,  # False para desenvolvimento local (HTTP)
            samesite="lax",  # 'lax' funciona com HTTP
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
