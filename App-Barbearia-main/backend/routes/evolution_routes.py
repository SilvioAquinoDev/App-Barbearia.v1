"""Evolution API integration routes - WhatsApp via Pairing Code"""
import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth import get_current_barber
from models import User

router = APIRouter(prefix="/evolution", tags=["evolution"])
logger = logging.getLogger(__name__)


def get_evo_config():
    url = os.environ.get("EVOLUTION_API_URL", "").rstrip("/")
    key = os.environ.get("EVOLUTION_API_KEY", "")
    return url, key


class EvolutionSetup(BaseModel):
    api_url: str
    api_key: str
    instance_name: Optional[str] = "barbershop"


class InstanceCreate(BaseModel):
    instance_name: str = "barbershop"
    phone_number: str


@router.post("/setup")
async def setup_evolution(
    data: EvolutionSetup,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_barber),
):
    """Save Evolution API configuration"""
    from dotenv import set_key
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    set_key(env_path, "EVOLUTION_API_URL", data.api_url.rstrip("/"))
    set_key(env_path, "EVOLUTION_API_KEY", data.api_key)
    os.environ["EVOLUTION_API_URL"] = data.api_url.rstrip("/")
    os.environ["EVOLUTION_API_KEY"] = data.api_key
    return {"status": "configured", "url": data.api_url}


@router.get("/status")
async def evolution_status(current_user: User = Depends(get_current_barber)):
    """Check Evolution API connection status"""
    url, key = get_evo_config()
    if not url or not key:
        return {"connected": False, "reason": "Evolution API nao configurada"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{url}/instance/fetchInstances",
                headers={"apikey": key},
            )
            if r.status_code == 200:
                instances = r.json()
                connected_instances = [
                    i for i in instances
                    if i.get("instance", {}).get("status") == "open"
                ]
                return {
                    "connected": True,
                    "instances": len(instances),
                    "active": len(connected_instances),
                    "details": instances,
                }
            return {"connected": False, "reason": f"Status {r.status_code}"}
    except Exception as e:
        return {"connected": False, "reason": str(e)}


@router.post("/create-instance")
async def create_instance(
    data: InstanceCreate,
    current_user: User = Depends(get_current_barber),
):
    """Create a new Evolution API instance"""
    url, key = get_evo_config()
    if not url or not key:
        raise HTTPException(400, "Evolution API nao configurada. Configure primeiro em /evolution/setup")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{url}/instance/create",
                headers={"apikey": key, "Content-Type": "application/json"},
                json={
                    "instanceName": data.instance_name,
                    "integration": "WHATSAPP-BAILEYS",
                    "number": data.phone_number.replace("+", "").replace(" ", "").replace("-", ""),
                },
            )
            if r.status_code in (200, 201):
                return r.json()
            raise HTTPException(r.status_code, r.text)
    except httpx.HTTPError as e:
        raise HTTPException(500, f"Erro de conexao: {e}")


@router.post("/pairing-code/{instance_name}")
async def get_pairing_code(
    instance_name: str,
    current_user: User = Depends(get_current_barber),
):
    """Get pairing code for WhatsApp connection"""
    url, key = get_evo_config()
    if not url or not key:
        raise HTTPException(400, "Evolution API nao configurada")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{url}/instance/connect/{instance_name}",
                headers={"apikey": key},
            )
            if r.status_code == 200:
                data = r.json()
                return {
                    "pairingCode": data.get("pairingCode"),
                    "code": data.get("code"),
                    "qrcode": data.get("base64"),
                }
            raise HTTPException(r.status_code, r.text)
    except httpx.HTTPError as e:
        raise HTTPException(500, f"Erro: {e}")


@router.delete("/instance/{instance_name}")
async def delete_instance(
    instance_name: str,
    current_user: User = Depends(get_current_barber),
):
    """Delete/disconnect an Evolution API instance"""
    url, key = get_evo_config()
    if not url or not key:
        raise HTTPException(400, "Evolution API nao configurada")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.delete(
                f"{url}/instance/logout/{instance_name}",
                headers={"apikey": key},
            )
            r = await client.delete(
                f"{url}/instance/delete/{instance_name}",
                headers={"apikey": key},
            )
            return {"status": "deleted"}
    except httpx.HTTPError as e:
        raise HTTPException(500, f"Erro: {e}")


async def send_evolution_message(phone: str, message: str, instance_name: str = "barbershop"):
    """Send a WhatsApp message via Evolution API"""
    url, key = get_evo_config()
    if not url or not key:
        logger.warning("Evolution API not configured, skipping WhatsApp message")
        return False
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not clean_phone.startswith("55"):
        clean_phone = "55" + clean_phone
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{url}/message/sendText/{instance_name}",
                headers={"apikey": key, "Content-Type": "application/json"},
                json={
                    "number": clean_phone,
                    "text": message,
                },
            )
            if r.status_code in (200, 201):
                logger.info(f"WhatsApp sent to {clean_phone}")
                return True
            logger.error(f"WhatsApp send failed: {r.status_code} {r.text}")
            return False
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return False
