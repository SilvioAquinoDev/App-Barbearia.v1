"""Mercado Pago Pix payment routes"""
import os
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth import get_current_user
from models import Appointment

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger(__name__)

MP_TOKEN = os.environ.get("MERCADOPAGO_TOKEN", "")


class CreatePixRequest(BaseModel):
    appointment_id: int
    amount: float
    payer_email: str
    payer_name: str
    description: str = "Agendamento Barbearia"


@router.post("/create-pix")
async def create_pix_payment(
    data: CreatePixRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a Pix payment via Mercado Pago"""
    if not MP_TOKEN:
        raise HTTPException(400, "Mercado Pago nao configurado. Adicione MERCADOPAGO_TOKEN no .env")

    import mercadopago
    sdk = mercadopago.SDK(MP_TOKEN)

    payment_data = {
        "transaction_amount": float(data.amount),
        "description": data.description,
        "payment_method_id": "pix",
        "payer": {
            "email": data.payer_email,
            "first_name": data.payer_name,
        },
        "external_reference": str(data.appointment_id),
    }

    result = sdk.payment().create(payment_data, request_options={
        "custom_headers": {"x-idempotency-key": str(uuid.uuid4())}
    })

    if result["status"] != 201:
        logger.error(f"MP payment failed: {result}")
        raise HTTPException(500, "Falha ao criar pagamento")

    response = result["response"]
    tx_data = response.get("point_of_interaction", {}).get("transaction_data", {})

    # Update appointment
    apt_result = await db.execute(select(Appointment).where(Appointment.id == data.appointment_id))
    apt = apt_result.scalar_one_or_none()
    if apt:
        apt.payment_id = str(response["id"])
        apt.payment_status = response["status"]
        apt.payment_amount = data.amount
        await db.commit()

    return {
        "payment_id": response["id"],
        "status": response["status"],
        "qr_code": tx_data.get("qr_code"),
        "qr_code_base64": tx_data.get("qr_code_base64"),
        "copy_paste": tx_data.get("qr_code"),
        "amount": data.amount,
    }


@router.get("/status/{payment_id}")
async def get_payment_status(payment_id: str):
    """Check Pix payment status"""
    if not MP_TOKEN:
        raise HTTPException(400, "Mercado Pago nao configurado")

    import mercadopago
    sdk = mercadopago.SDK(MP_TOKEN)
    result = sdk.payment().get(payment_id)

    if result["status"] != 200:
        raise HTTPException(404, "Pagamento nao encontrado")

    r = result["response"]
    return {
        "payment_id": r["id"],
        "status": r["status"],
        "status_detail": r.get("status_detail"),
        "amount": r.get("transaction_amount"),
    }


@router.post("/webhook/mercadopago")
async def mercadopago_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive Mercado Pago webhook notifications"""
    import json
    body = await request.body()
    try:
        payload = json.loads(body)
    except Exception:
        return {"status": "ignored"}

    logger.info(f"MP webhook: {payload}")

    if payload.get("type") == "payment":
        payment_id = str(payload.get("data", {}).get("id", ""))
        if payment_id and MP_TOKEN:
            background_tasks.add_task(_process_mp_webhook, payment_id)

    return {"status": "received"}


async def _process_mp_webhook(payment_id: str):
    """Process MP payment webhook in background"""
    from database import async_session_factory
    import mercadopago

    try:
        sdk = mercadopago.SDK(MP_TOKEN)
        result = sdk.payment().get(payment_id)
        if result["status"] != 200:
            return

        r = result["response"]
        ext_ref = r.get("external_reference")
        if not ext_ref:
            return

        async with async_session_factory() as db:
            apt_result = await db.execute(
                select(Appointment).where(Appointment.payment_id == payment_id)
            )
            apt = apt_result.scalar_one_or_none()
            if apt:
                apt.payment_status = r["status"]
                if r["status"] == "approved":
                    apt.status = "confirmed"
                await db.commit()
                logger.info(f"MP webhook: appointment {apt.id} -> {r['status']}")
    except Exception as e:
        logger.error(f"MP webhook error: {e}")
