from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional
from pydantic import BaseModel
import httpx

from database import get_db
from auth import get_current_barber
from models import WhatsAppSettings, User

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

WASENDER_BASE = "https://wasenderapi.com/api"


class WasenderSetup(BaseModel):
    api_key: str


class WasenderSessionCreate(BaseModel):
    name: Optional[str] = "Barbershop"


# ---- WaSenderAPI helpers ----

async def _wasender_request(method: str, path: str, pat: str, json_data=None):
    headers = {"Authorization": f"Bearer {pat}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, f"{WASENDER_BASE}{path}", headers=headers, json=json_data)
        return resp


# ---- Settings endpoints ----

@router.get("/settings")
async def get_whatsapp_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    s = result.scalar_one_or_none()
    if not s:
        return {
            "id": 0, "is_active": False, "has_pat": False,
            "wasender_session_id": None, "connected": False,
        }
    return {
        "id": s.id,
        "is_active": s.is_active,
        "has_pat": bool(s.wasender_pat),
        "wasender_session_id": s.wasender_session_id,
        "connected": s.is_active and bool(s.wasender_session_key),
    }


@router.put("/settings")
async def update_whatsapp_settings(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Update WhatsApp settings (business_phone, is_active)"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = WhatsAppSettings(barber_id=current_user.user_id)
        db.add(settings)
    if "business_phone" in data:
        settings.business_phone = data["business_phone"]
    if "is_active" in data:
        settings.is_active = data["is_active"]
    await db.commit()
    return {"message": "Configuracoes atualizadas"}



@router.post("/setup")
async def setup_wasender(
    data: WasenderSetup,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Save WaSenderAPI PAT and list sessions"""
    # Get or create settings FIRST (always save the key)
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = WhatsAppSettings(barber_id=current_user.user_id)
        db.add(settings)

    settings.wasender_pat = data.api_key
    await db.commit()
    await db.refresh(settings)

    # Now validate PAT by listing sessions
    try:
        resp = await _wasender_request("GET", "/whatsapp-sessions", data.api_key)
        if resp.status_code != 200:
            return {
                "message": "API Key salva, mas a validacao falhou. Verifique a key.",
                "has_sessions": False,
                "sessions": [],
                "wasender_session_id": None,
                "validation_error": True,
            }
        sessions = resp.json()
    except Exception as e:
        return {
            "message": f"API Key salva, mas nao foi possivel conectar ao WaSenderAPI: {str(e)}",
            "has_sessions": False,
            "sessions": [],
            "wasender_session_id": None,
            "validation_error": True,
        }

    # If sessions exist, use the first one
    if isinstance(sessions, list) and len(sessions) > 0:
        session = sessions[0]
        session_id = str(session.get("id", ""))
        settings.wasender_session_id = session_id
        api_key = session.get("api_key") or session.get("token")
        if api_key:
            settings.wasender_session_key = api_key
            settings.is_active = True
        await db.commit()
        await db.refresh(settings)

    return {
        "message": "API Key salva com sucesso",
        "has_sessions": isinstance(sessions, list) and len(sessions) > 0,
        "sessions": sessions if isinstance(sessions, list) else [],
        "wasender_session_id": settings.wasender_session_id,
    }


@router.post("/create-session")
async def create_wasender_session(
    data: WasenderSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Create a new WaSenderAPI session"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_pat:
        raise HTTPException(status_code=400, detail="Configure a API Key primeiro")

    resp = await _wasender_request(
        "POST", "/whatsapp-sessions", settings.wasender_pat,
        {"name": data.name or "Barbershop"}
    )
    if resp.status_code not in (200, 201):
        detail = resp.json().get("message", resp.text) if resp.headers.get("content-type", "").startswith("application/json") else resp.text
        raise HTTPException(status_code=400, detail=f"Erro ao criar sessao: {detail}")

    session_data = resp.json()
    session_id = str(session_data.get("id", ""))
    api_key = session_data.get("api_key") or session_data.get("token")

    settings.wasender_session_id = session_id
    if api_key:
        settings.wasender_session_key = api_key

    await db.commit()
    return {"message": "Sessao criada", "session": session_data}


@router.post("/connect")
async def connect_wasender_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Connect/start a WaSenderAPI session to generate QR code"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_pat or not settings.wasender_session_id:
        raise HTTPException(status_code=400, detail="Configure a API Key e crie uma sessao primeiro")

    resp = await _wasender_request(
        "POST",
        f"/whatsapp-sessions/{settings.wasender_session_id}/connect",
        settings.wasender_pat,
    )
    return {"status_code": resp.status_code, "data": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text}


@router.get("/qrcode")
async def get_wasender_qrcode(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Get QR code for WhatsApp session authentication"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_pat or not settings.wasender_session_id:
        raise HTTPException(status_code=400, detail="Sessao nao configurada")

    resp = await _wasender_request(
        "GET",
        f"/whatsapp-sessions/{settings.wasender_session_id}/qrcode",
        settings.wasender_pat,
    )
    if resp.status_code != 200:
        return {"qr_code": None, "message": "QR Code nao disponivel. Tente conectar a sessao primeiro.", "raw": resp.text}

    data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"qr": resp.text}
    return {"qr_code": data.get("qr") or data.get("qrCode") or data.get("qr_code") or data.get("data"), "raw": data}


@router.get("/status")
async def get_wasender_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Get current WhatsApp session status"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_pat or not settings.wasender_session_id:
        return {"status": "not_configured"}

    # Get session details
    resp = await _wasender_request(
        "GET",
        f"/whatsapp-sessions/{settings.wasender_session_id}",
        settings.wasender_pat,
    )
    if resp.status_code != 200:
        return {"status": "error", "detail": resp.text}

    session_data = resp.json()
    status = session_data.get("status", "unknown")

    # If connected, save session key and activate
    api_key = session_data.get("api_key") or session_data.get("token")
    if api_key and status in ("connected", "open", "active"):
        settings.wasender_session_key = api_key
        settings.is_active = True
        await db.commit()

    return {"status": status, "session": session_data}


@router.post("/disconnect")
async def disconnect_wasender(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Disconnect WhatsApp session"""
    result = await db.execute(
        select(WhatsAppSettings).where(WhatsAppSettings.barber_id == current_user.user_id)
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_pat or not settings.wasender_session_id:
        raise HTTPException(status_code=400, detail="Sessao nao configurada")

    resp = await _wasender_request(
        "POST",
        f"/whatsapp-sessions/{settings.wasender_session_id}/disconnect",
        settings.wasender_pat,
    )
    settings.is_active = False
    settings.wasender_session_key = None
    await db.commit()

    return {"message": "Sessao desconectada"}


@router.post("/test")
async def test_wasender_message(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Send a test message"""
    result = await db.execute(
        select(WhatsAppSettings).where(
            and_(WhatsAppSettings.barber_id == current_user.user_id, WhatsAppSettings.is_active == True)
        )
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_session_key:
        raise HTTPException(status_code=400, detail="WhatsApp nao conectado")

    if not settings.business_phone:
        raise HTTPException(status_code=400, detail="Configure um numero de telefone para teste nas configuracoes")

    phone = settings.business_phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    success = await send_wasender_message(settings.wasender_session_key, phone, "Teste de integracao WaSenderAPI. Sua barbearia esta configurada!")

    if success:
        return {"message": "Mensagem de teste enviada com sucesso!"}
    raise HTTPException(status_code=500, detail="Falha ao enviar mensagem de teste")


# ---- Send message via WaSenderAPI ----

async def send_wasender_message(session_key: str, to_phone: str, message: str) -> bool:
    """Send a WhatsApp message via WaSenderAPI"""
    try:
        headers = {
            "Authorization": f"Bearer {session_key}",
            "Content-Type": "application/json",
        }
        payload = {"to": to_phone, "text": message}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{WASENDER_BASE}/send-message", json=payload, headers=headers)
            print(f"[WaSenderAPI] Send response: {resp.status_code} {resp.text[:200]}")
            return resp.status_code in (200, 201)
    except Exception as e:
        print(f"[WaSenderAPI] Send error: {e}")
        return False


async def notify_appointment(db: AsyncSession, appointment_data: dict, event_type: str):
    """Send WhatsApp notification for appointment events via WaSenderAPI"""
    result = await db.execute(
        select(WhatsAppSettings).where(
            and_(WhatsAppSettings.is_active == True, WhatsAppSettings.wasender_session_key.isnot(None))
        )
    )
    settings_list = result.scalars().all()

    client_phone = appointment_data.get("client_phone", "")
    client_name = appointment_data.get("client_name", "Cliente")
    service_name = appointment_data.get("service_name", "Servico")
    scheduled_time = appointment_data.get("scheduled_time", "")

    messages = {
        "new_booking": f"Ola {client_name}! Seu agendamento foi recebido.\n\nServico: {service_name}\nData/Hora: {scheduled_time}\nStatus: Pendente\n\nAguarde a confirmacao do barbeiro.",
        "confirmed": f"Ola {client_name}! Seu agendamento foi CONFIRMADO!\n\nServico: {service_name}\nData/Hora: {scheduled_time}\n\nTe esperamos!",
        "cancelled": f"Ola {client_name}, seu agendamento foi cancelado.\n\nServico: {service_name}\nData/Hora: {scheduled_time}\n\nPara reagendar, acesse nosso site.",
        "completed": f"Ola {client_name}! Obrigado pela visita!\n\nServico: {service_name}\n\nEsperamos ve-lo novamente!",
    }

    message = messages.get(event_type, "")
    if not message or not client_phone:
        return

    phone = client_phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    for s in settings_list:
        await send_wasender_message(s.wasender_session_key, phone, message)


async def send_daily_summary(db: AsyncSession, barber_id: str, summary_data: dict):
    """Send daily summary via WhatsApp when cash register is closed"""
    result = await db.execute(
        select(WhatsAppSettings).where(
            and_(WhatsAppSettings.barber_id == barber_id, WhatsAppSettings.is_active == True)
        )
    )
    settings = result.scalar_one_or_none()
    if not settings or not settings.wasender_session_key or not settings.business_phone:
        print(f"[WhatsApp] Resumo diario nao enviado: configuracao ausente para barber {barber_id}")
        return

    total_services = summary_data.get("total_services", 0)
    total_products = summary_data.get("total_products", 0)
    total_revenue = total_services + total_products
    completed_count = summary_data.get("completed_count", 0)
    cancelled_count = summary_data.get("cancelled_count", 0)
    tomorrow_appointments = summary_data.get("tomorrow_appointments", [])

    msg = f"RESUMO DO DIA\n\n"
    msg += f"Atendimentos concluidos: {completed_count}\n"
    if cancelled_count > 0:
        msg += f"Cancelamentos: {cancelled_count}\n"
    msg += f"\n--- FATURAMENTO ---\n"
    msg += f"Servicos: R$ {total_services:.2f}\n"
    msg += f"Produtos: R$ {total_products:.2f}\n"
    msg += f"TOTAL: R$ {total_revenue:.2f}\n"

    if tomorrow_appointments:
        msg += f"\n--- AMANHA ({len(tomorrow_appointments)} agendamento(s)) ---\n"
        for apt in tomorrow_appointments:
            msg += f"  {apt['time']} - {apt['client']} ({apt['service']})\n"
    else:
        msg += f"\nNenhum agendamento para amanha."

    msg += f"\nBom descanso!"

    phone = settings.business_phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    await send_wasender_message(settings.wasender_session_key, phone, msg)
