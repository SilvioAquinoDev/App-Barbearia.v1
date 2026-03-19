"""from fastapi import APIRouter, Depends, HTTPException, status
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
    ""Public: get client points by phone""
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
    ""Called after appointment completion to award loyalty points""
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
    await db.commit()"""



from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import logging
import traceback
import sys

# Configurar logging detalhado
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

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
    client_email: EmailStr
    client_name: Optional[str] = None
    points: int
    description: str = "Pontos manuais"

class RedeemRequest(BaseModel):
    client_email: EmailStr

class ClientPointsResponse(BaseModel):
    client_email: Optional[str]
    client_phone: Optional[str]
    client_name: Optional[str]
    points: int
    total_earned: int
    total_redeemed: int
    redemption_threshold: int
    reward_description: str

    class Config:
        from_attributes = True


# --- Função auxiliar para verificar banco de dados ---

async def check_database_connection(db: AsyncSession):
    """Verifica se a conexão com o banco está funcionando"""
    try:
        logger.debug("🔍 Verificando conexão com o banco de dados...")
        await db.execute(select(1))
        logger.debug("✅ Conexão com banco OK")
        return True
    except Exception as e:
        logger.error(f"❌ Erro de conexão com banco: {str(e)}")
        return False


# --- Barber endpoints ---

@router.get("/config")
async def get_loyalty_config(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """Get loyalty program configuration"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== GET /config INICIADO ==========")
    logger.info(f"[{request_id}] 👤 Barbeiro: {current_user.user_id}")
    
    try:
        # Verificar conexão
        if not await check_database_connection(db):
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        # Buscar configuração
        logger.info(f"[{request_id}] 🔎 Buscando configuração para barbeiro: {current_user.user_id}")
        
        result = await db.execute(
            select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
        )
        config = result.scalar_one_or_none()
        
        if not config:
            logger.info(f"[{request_id}] ⚙️ Configuração não encontrada, criando padrão...")
            config = LoyaltyConfig(
                barber_id=current_user.user_id,
                points_per_real=1.0,
                redemption_threshold=100,
                reward_description="1 Corte Grátis",
                is_active=True
            )
            db.add(config)
            await db.commit()
            await db.refresh(config)
            logger.info(f"[{request_id}] ✅ Configuração padrão criada: ID={config.id}")
        
        logger.info(f"[{request_id}] 📤 Retornando configuração: threshold={config.redemption_threshold}")
        
        return {
            "id": config.id,
            "points_per_real": config.points_per_real,
            "redemption_threshold": config.redemption_threshold,
            "reward_description": config.reward_description,
            "is_active": config.is_active,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao buscar config: {str(e)}")
        logger.error(f"[{request_id}] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erro interno ao buscar configuração: {str(e)}"
        )
    finally:
        logger.info(f"[{request_id}] ========== GET /config FINALIZADO ==========")


@router.get("/clients")
async def list_loyalty_clients(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """List all loyalty clients (barber only)"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== GET /clients INICIADO ==========")
    
    try:
        if not await check_database_connection(db):
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        logger.info(f"[{request_id}] 🔎 Buscando todos os clientes...")
        
        result = await db.execute(
            select(LoyaltyPoints).order_by(LoyaltyPoints.points.desc())
        )
        clients = result.scalars().all()
        
        logger.info(f"[{request_id}] 📊 Encontrados {len(clients)} clientes")
        
        response = [
            {
                "id": c.id,
                "client_email": c.client_email,
                "client_phone": c.client_phone,
                "client_name": c.client_name,
                "points": c.points or 0,
                "total_earned": c.total_earned or 0,
                "total_redeemed": c.total_redeemed or 0,
            }
            for c in clients
        ]
        
        logger.info(f"[{request_id}] 📤 Retornando {len(response)} clientes")
        return response
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao listar clientes: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        logger.info(f"[{request_id}] ========== GET /clients FINALIZADO ==========")


@router.get("/client/{email}")
async def get_client_points(
    email: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: get client points by email"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== GET /client/{email} INICIADO ==========")
    logger.info(f"[{request_id}] 📧 Email recebido: {email}")
    
    try:
        # 1. Verificar conexão com banco
        logger.info(f"[{request_id}] 🔍 Verificando conexão com banco...")
        if not await check_database_connection(db):
            logger.error(f"[{request_id}] ❌ Falha na conexão com banco")
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        # 2. Verificar se a tabela LoyaltyPoints existe e tem registros
        logger.info(f"[{request_id}] 🔍 Verificando tabela loyalty_points...")
        
        # Tabela existe?
        try:
            # Contar registros na tabela
            count_result = await db.execute(select(func.count()).select_from(LoyaltyPoints))
            total_clients = count_result.scalar()
            logger.info(f"[{request_id}] 📊 Total de clientes na tabela loyalty_points: {total_clients}")
        except Exception as e:
            logger.error(f"[{request_id}] ❌ Erro ao acessar tabela loyalty_points: {str(e)}")
            logger.error(traceback.format_exc())
            # Se a tabela não existe, vamos criar um registro padrão?
            logger.warning(f"[{request_id}] ⚠️ Tabela loyalty_points pode não existir")
        
        # 3. Listar todos os emails cadastrados (para debug)
        try:
            all_clients = await db.execute(select(LoyaltyPoints.client_email))
            emails = all_clients.scalars().all()
            logger.info(f"[{request_id}] 📧 Emails cadastrados: {emails}")
        except Exception as e:
            logger.warning(f"[{request_id}] ⚠️ Não foi possível listar emails: {str(e)}")
        
        # 4. Buscar cliente específico
        logger.info(f"[{request_id}] 🔎 Buscando cliente com email: {email}")
        
        # Tentar diferentes formas de busca
        client = None
        
        # Busca exata por email
        result = await db.execute(
            select(LoyaltyPoints).where(LoyaltyPoints.client_email == email)
        )
        client = result.scalar_one_or_none()
        
        if client:
            logger.info(f"[{request_id}] ✅ Cliente encontrado por email:")
            logger.info(f"   ID: {client.id}")
            logger.info(f"   Nome: {client.client_name}")
            logger.info(f"   Email: {client.client_email}")
            logger.info(f"   Telefone: {client.client_phone}")
            logger.info(f"   Pontos: {client.points}")
        else:
            logger.info(f"[{request_id}] ❌ Cliente NÃO encontrado para email: {email}")
            
            # Busca por parte do email (case insensitive)
            try:
                result = await db.execute(
                    select(LoyaltyPoints).where(
                        func.lower(LoyaltyPoints.client_email).like(f"%{email.lower()}%")
                    )
                )
                similar_clients = result.scalars().all()
                if similar_clients:
                    logger.info(f"[{request_id}] 🔍 Clientes com email similar:")
                    for c in similar_clients:
                        logger.info(f"   - {c.client_email} ({c.client_name})")
            except Exception as e:
                logger.warning(f"[{request_id}] ⚠️ Erro na busca fuzzy: {str(e)}")
        
        # 5. Buscar configuração
        logger.info(f"[{request_id}] 🔎 Buscando configuração de fidelidade...")
        config = None
        try:
            config_result = await db.execute(
                select(LoyaltyConfig).where(LoyaltyConfig.is_active == True)
            )
            config = config_result.scalar_one_or_none()
            
            if config:
                logger.info(f"[{request_id}] ✅ Configuração encontrada:")
                logger.info(f"   ID: {config.id}")
                logger.info(f"   Barber ID: {config.barber_id}")
                logger.info(f"   Threshold: {config.redemption_threshold}")
                logger.info(f"   Reward: {config.reward_description}")
            else:
                logger.info(f"[{request_id}] ⚠️ Nenhuma configuração ativa encontrada")
                
                # Tenta buscar qualquer configuração
                config_result = await db.execute(select(LoyaltyConfig))
                all_configs = config_result.scalars().all()
                logger.info(f"[{request_id}] 📊 Total de configurações no banco: {len(all_configs)}")
                for c in all_configs:
                    logger.info(f"   Config {c.id}: barber={c.barber_id}, active={c.is_active}")
                    
        except Exception as e:
            logger.error(f"[{request_id}] ❌ Erro ao buscar configuração: {str(e)}")
            logger.error(traceback.format_exc())
        
        # 6. Valores padrão (seguros)
        threshold = 100
        reward = "1 Corte Grátis"
        
        if config:
            threshold = config.redemption_threshold or 100
            reward = config.reward_description or "1 Corte Grátis"
        
        logger.info(f"[{request_id}] 📊 Valores utilizados: threshold={threshold}, reward={reward}")
        
        # 7. Construir resposta
        if not client:
            logger.info(f"[{request_id}] 📦 Construindo resposta para cliente NÃO encontrado")
            response = {
                "client_email": email,
                "client_phone": None,
                "client_name": None,
                "points": 0,
                "total_earned": 0,
                "total_redeemed": 0,
                "redemption_threshold": threshold,
                "reward_description": reward,
            }
        else:
            logger.info(f"[{request_id}] 📦 Construindo resposta para cliente encontrado")
            response = {
                "client_email": client.client_email or email,
                "client_phone": client.client_phone,
                "client_name": client.client_name,
                "points": client.points or 0,
                "total_earned": client.total_earned or 0,
                "total_redeemed": client.total_redeemed or 0,
                "redemption_threshold": threshold,
                "reward_description": reward,
            }
        
        logger.info(f"[{request_id}] 📤 Resposta final: {response}")
        logger.info(f"[{request_id}] ========== GET /client/{email} FINALIZADO (SUCESSO) ==========")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] ❌ ERRO NÃO TRATADO NA ROTA /client/{email}")
        logger.error(f"Tipo do erro: {type(e).__name__}")
        logger.error(f"Mensagem: {str(e)}")
        logger.error("Traceback completo:")
        logger.error(traceback.format_exc())
        logger.info(f"[{request_id}] ========== GET /client/{email} FINALIZADO (ERRO) ==========")
        
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao buscar pontos: {str(e)}"
        )


@router.get("/client/{email}/history")
async def get_client_history(
    email: str,
    db: AsyncSession = Depends(get_db),
):
    """Get client points transaction history"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== GET /client/{email}/history INICIADO ==========")
    
    try:
        if not await check_database_connection(db):
            logger.error(f"[{request_id}] ❌ Falha na conexão com banco")
            return []
        
        logger.info(f"[{request_id}] 🔎 Buscando histórico para email: {email}")
        
        # Tenta buscar por email
        result = await db.execute(
            select(LoyaltyTransaction)
            .where(LoyaltyTransaction.client_email == email)
            .order_by(LoyaltyTransaction.created_at.desc())
            .limit(50)
        )
        txns = result.scalars().all()
        
        logger.info(f"[{request_id}] 📊 Encontradas {len(txns)} transações")
        
        response = [
            {
                "id": t.id,
                "type": t.type,
                "points": t.points,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in txns
        ]
        
        logger.info(f"[{request_id}] 📤 Retornando {len(response)} transações")
        return response
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao buscar histórico: {str(e)}")
        logger.error(traceback.format_exc())
        return []
    finally:
        logger.info(f"[{request_id}] ========== GET /client/{email}/history FINALIZADO ==========")


@router.put("/config")
async def update_loyalty_config(
    data: LoyaltyConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """Update loyalty program configuration"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== PUT /config INICIADO ==========")
    logger.info(f"[{request_id}] 👤 Barbeiro: {current_user.user_id}")
    logger.info(f"[{request_id}] 📦 Dados recebidos: {data.dict()}")
    
    try:
        if not await check_database_connection(db):
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        # Buscar configuração existente
        result = await db.execute(
            select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
        )
        config = result.scalar_one_or_none()
        
        if not config:
            logger.info(f"[{request_id}] ⚙️ Configuração não encontrada, criando nova...")
            config = LoyaltyConfig(barber_id=current_user.user_id)
            db.add(config)
        
        # Atualizar valores
        config.points_per_real = data.points_per_real
        config.redemption_threshold = data.redemption_threshold
        config.reward_description = data.reward_description
        config.is_active = data.is_active
        
        await db.commit()
        await db.refresh(config)
        
        logger.info(f"[{request_id}] ✅ Configuração atualizada:")
        logger.info(f"   threshold={config.redemption_threshold}")
        logger.info(f"   reward={config.reward_description}")
        
        return {
            "message": "Configuração atualizada", 
            "config": {
                "points_per_real": config.points_per_real,
                "redemption_threshold": config.redemption_threshold,
                "reward_description": config.reward_description,
                "is_active": config.is_active,
            }
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao atualizar config: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        logger.info(f"[{request_id}] ========== PUT /config FINALIZADO ==========")


@router.post("/add-points")
async def add_points_manual(
    data: ManualPointsAdd,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """Manually add points to a client (barber only)"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== POST /add-points INICIADO ==========")
    logger.info(f"[{request_id}] 👤 Barbeiro: {current_user.user_id}")
    logger.info(f"[{request_id}] 📦 Dados: email={data.client_email}, pontos={data.points}")
    
    try:
        if not await check_database_connection(db):
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        # Busca por email
        logger.info(f"[{request_id}] 🔎 Buscando cliente com email: {data.client_email}")
        result = await db.execute(
            select(LoyaltyPoints).where(LoyaltyPoints.client_email == data.client_email)
        )
        client = result.scalar_one_or_none()
        
        if not client:
            logger.info(f"[{request_id}] 🆕 Cliente não encontrado, criando novo...")
            client = LoyaltyPoints(
                client_email=data.client_email,
                client_name=data.client_name,
                points=0,
                total_earned=0,
                total_redeemed=0,
            )
            db.add(client)
            await db.flush()
            logger.info(f"[{request_id}] ✅ Novo cliente criado com ID: {client.id}")
        
        if data.client_name:
            client.client_name = data.client_name
        
        # Adiciona pontos
        client.points += data.points
        client.total_earned += data.points
        
        logger.info(f"[{request_id}] 💰 Pontos atualizados: {client.points} (total ganho: {client.total_earned})")
        
        # Registra transação
        txn = LoyaltyTransaction(
            client_email=data.client_email,
            type="earn",
            points=data.points,
            description=data.description,
        )
        db.add(txn)
        
        await db.commit()
        
        logger.info(f"[{request_id}] ✅ {data.points} pontos adicionados com sucesso")
        
        return {
            "message": f"{data.points} pontos adicionados", 
            "new_balance": client.points
        }
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao adicionar pontos: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        logger.info(f"[{request_id}] ========== POST /add-points FINALIZADO ==========")


@router.post("/redeem")
async def redeem_points(
    data: RedeemRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_barber)
):
    """Redeem points for reward (barber only)"""
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== POST /redeem INICIADO ==========")
    logger.info(f"[{request_id}] 👤 Barbeiro: {current_user.user_id}")
    logger.info(f"[{request_id}] 📦 Email: {data.client_email}")
    
    try:
        if not await check_database_connection(db):
            raise HTTPException(status_code=500, detail="Erro de conexão com banco")
        
        # Get barber's config
        config_result = await db.execute(
            select(LoyaltyConfig).where(LoyaltyConfig.barber_id == current_user.user_id)
        )
        config = config_result.scalar_one_or_none()
        
        threshold = config.redemption_threshold if config else 100
        reward = config.reward_description if config else "1 Corte Grátis"
        
        logger.info(f"[{request_id}] ⚙️ Config: threshold={threshold}, reward={reward}")
        
        # Busca cliente por email
        result = await db.execute(
            select(LoyaltyPoints).where(LoyaltyPoints.client_email == data.client_email)
        )
        client = result.scalar_one_or_none()
        
        if not client:
            logger.error(f"[{request_id}] ❌ Cliente não encontrado: {data.client_email}")
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        logger.info(f"[{request_id}] 👤 Cliente: {client.client_name}, pontos atuais: {client.points}")
        
        if client.points < threshold:
            logger.error(f"[{request_id}] ❌ Pontos insuficientes: {client.points} < {threshold}")
            raise HTTPException(
                status_code=400, 
                detail=f"Pontos insuficientes. Necessário: {threshold}"
            )
        
        # Deduz pontos
        client.points -= threshold
        client.total_redeemed += threshold
        
        logger.info(f"[{request_id}] 💰 Pontos após resgate: {client.points}")
        
        # Registra transação
        txn = LoyaltyTransaction(
            client_email=data.client_email,
            type="redeem",
            points=threshold,
            description=f"Resgate: {reward}",
        )
        db.add(txn)
        await db.commit()
        
        logger.info(f"[{request_id}] ✅ Resgate realizado com sucesso")
        
        return {
            "message": f"Resgate realizado: {reward}",
            "points_used": threshold,
            "new_balance": client.points,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao resgatar pontos: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        logger.info(f"[{request_id}] ========== POST /redeem FINALIZADO ==========")


# --- Função auxiliar para ser chamada após serviço concluído ---

async def award_loyalty_points(
    db: AsyncSession, 
    appointment_id: int, 
    service_price: float, 
    client_email: str = None,
    client_phone: str = None,
    client_name: str = None
):
    """
    Called after appointment completion to award loyalty points.
    Pode receber email ou phone para compatibilidade.
    """
    request_id = datetime.now().timestamp()
    logger.info(f"[{request_id}] ========== award_loyalty_points INICIADO ==========")
    logger.info(f"[{request_id}] 📅 Appointment: {appointment_id}, Preço: {service_price}")
    logger.info(f"[{request_id}] 👤 Cliente: email={client_email}, phone={client_phone}, name={client_name}")
    
    try:
        # Verifica se há configuração ativa
        config_result = await db.execute(
            select(LoyaltyConfig).where(LoyaltyConfig.is_active == True)
        )
        config = config_result.scalar_one_or_none()
        
        if not config or not config.is_active:
            logger.info(f"[{request_id}] ℹ️ Programa de fidelidade inativo")
            return
        
        # Calcula pontos
        points = int(service_price * config.points_per_real)
        logger.info(f"[{request_id}] 📊 Pontos calculados: {points} (preço={service_price}, taxa={config.points_per_real})")
        
        if points <= 0:
            logger.info(f"[{request_id}] ℹ️ Pontos insuficientes para conceder")
            return
        
        # Tenta buscar por email primeiro, depois por phone
        client = None
        if client_email:
            result = await db.execute(
                select(LoyaltyPoints).where(LoyaltyPoints.client_email == client_email)
            )
            client = result.scalar_one_or_none()
            logger.info(f"[{request_id}] 🔍 Busca por email {client_email}: {'encontrado' if client else 'não encontrado'}")
        
        if not client and client_phone:
            result = await db.execute(
                select(LoyaltyPoints).where(LoyaltyPoints.client_phone == client_phone)
            )
            client = result.scalar_one_or_none()
            logger.info(f"[{request_id}] 🔍 Busca por phone {client_phone}: {'encontrado' if client else 'não encontrado'}")
        
        # Se não encontrou, cria novo
        if not client:
            logger.info(f"[{request_id}] 🆕 Criando novo cliente: email={client_email}, phone={client_phone}, name={client_name}")
            client = LoyaltyPoints(
                client_email=client_email,
                client_phone=client_phone,
                client_name=client_name,
                points=0,
                total_earned=0,
                total_redeemed=0,
            )
            db.add(client)
            await db.flush()
            logger.info(f"[{request_id}] ✅ Novo cliente criado com ID: {client.id}")
        
        # Atualiza nome se fornecido
        if client_name and not client.client_name:
            client.client_name = client_name
            logger.info(f"[{request_id}] 📝 Nome do cliente atualizado: {client_name}")
        
        # Adiciona pontos
        client.points += points
        client.total_earned += points
        logger.info(f"[{request_id}] 💰 Pontos atualizados: {client.points} (total ganho: {client.total_earned})")
        
        # Registra transação
        txn = LoyaltyTransaction(
            client_email=client_email,
            client_phone=client_phone,
            type="earn",
            points=points,
            description=f"Serviço concluído (R${service_price:.2f})",
            appointment_id=appointment_id,
        )
        db.add(txn)
        logger.info(f"[{request_id}] 📋 Transação criada para appointment {appointment_id}")
        
        await db.commit()
        logger.info(f"[{request_id}] ✅ Pontos concedidos com sucesso!")
        
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Erro ao conceder pontos: {str(e)}")
        logger.error(traceback.format_exc())
        await db.rollback()
    finally:
        logger.info(f"[{request_id}] ========== award_loyalty_points FINALIZADO ==========")