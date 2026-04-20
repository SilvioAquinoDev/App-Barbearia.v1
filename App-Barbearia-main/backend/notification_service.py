"""Unified notification service - Web Push, Expo Push, Evolution API WhatsApp"""
import json
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User, Appointment, Service, PushToken
from routes.web_push_routes import send_web_push
from routes.evolution_routes import send_evolution_message

logger = logging.getLogger(__name__)


# ============== EXPO PUSH ==============
async def send_expo_push(push_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push API"""
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": push_token,
                    "title": title,
                    "body": body,
                    "sound": "default",
                    "data": data or {},
                },
            )
            logger.info(f"Expo push sent to {push_token[:30]}...: {r.status_code}")
            return r.status_code == 200
    except Exception as e:
        logger.error(f"Expo push error: {e}")
        return False


# ============== NOTIFICATION DISPATCHERS ==============
async def notify_appointment_status(db: AsyncSession, appointment_id: int, action: str):
    """Main dispatcher: send notifications for appointment status changes.
    action: 'created' | 'confirmed' | 'cancelled' | 'completed'
    """
    try:
        result = await db.execute(
            select(Appointment).where(Appointment.id == appointment_id)
        )
        apt = result.scalar_one_or_none()
        if not apt:
            return

        # Get service name
        svc_result = await db.execute(select(Service).where(Service.id == apt.service_id))
        svc = svc_result.scalar_one_or_none()
        svc_name = svc.name if svc else "Servico"

        time_str = apt.scheduled_time.strftime("%d/%m/%Y as %H:%M") if apt.scheduled_time else ""
        client_name = apt.client_name or "Cliente"
        client_phone = apt.client_phone or ""
        client_email = apt.client_email or ""

        # Build messages per action
        messages = _build_messages(action, client_name, svc_name, time_str)

        # 1. Notify BARBER via Expo Push (new appointment, cancellation)
        if action in ("created", "cancelled"):
            await _notify_barber_push(db, apt, messages["barber_title"], messages["barber_body"])

        # 2. Notify CLIENT via Web Push (all status changes)
        if client_email:
            await _notify_client_web_push(db, client_email, messages["client_title"], messages["client_body"])

        # 3. Notify CLIENT via WhatsApp (all status changes via Evolution API)
        if client_phone:
            await send_evolution_message(client_phone, messages["whatsapp"])

    except Exception as e:
        logger.error(f"Notification dispatch error: {e}")


def _build_messages(action: str, client_name: str, svc_name: str, time_str: str):
    """Build notification messages for each channel"""
    if action == "created":
        return {
            "barber_title": "Novo Agendamento!",
            "barber_body": f"{client_name} agendou {svc_name} para {time_str}",
            "client_title": "Agendamento Confirmado",
            "client_body": f"Seu agendamento de {svc_name} foi criado para {time_str}",
            "whatsapp": f"Ola {client_name}! Seu agendamento de *{svc_name}* foi criado para *{time_str}*. Aguarde a confirmacao!",
        }
    elif action == "confirmed":
        return {
            "barber_title": "Agendamento Confirmado",
            "barber_body": f"{client_name} - {svc_name} confirmado para {time_str}",
            "client_title": "Agendamento Confirmado!",
            "client_body": f"Seu agendamento de {svc_name} para {time_str} foi confirmado!",
            "whatsapp": f"Ola {client_name}! Seu agendamento de *{svc_name}* para *{time_str}* foi *confirmado*! Esperamos voce!",
        }
    elif action == "cancelled":
        return {
            "barber_title": "Agendamento Cancelado",
            "barber_body": f"{client_name} cancelou {svc_name} de {time_str}",
            "client_title": "Agendamento Cancelado",
            "client_body": f"Seu agendamento de {svc_name} para {time_str} foi cancelado.",
            "whatsapp": f"Ola {client_name}. Seu agendamento de *{svc_name}* para *{time_str}* foi *cancelado*. Caso queira reagendar, entre em contato!",
        }
    elif action == "completed":
        return {
            "barber_title": "Atendimento Concluido",
            "barber_body": f"{client_name} - {svc_name} concluido",
            "client_title": "Atendimento Concluido!",
            "client_body": f"Seu atendimento de {svc_name} foi concluido. Obrigado pela preferencia!",
            "whatsapp": f"Ola {client_name}! Seu atendimento de *{svc_name}* foi *concluido*. Obrigado pela preferencia! Esperamos ve-lo novamente!",
        }
    return {
        "barber_title": "Atualizacao",
        "barber_body": f"{client_name} - {svc_name}",
        "client_title": "Atualizacao do Agendamento",
        "client_body": f"Seu agendamento de {svc_name} foi atualizado.",
        "whatsapp": f"Ola {client_name}. Seu agendamento de *{svc_name}* foi atualizado.",
    }


async def _notify_barber_push(db: AsyncSession, apt: Appointment, title: str, body: str):
    """Send Expo push to all barbers (since appointments don't have barber_id)"""
    try:
        barbers = await db.execute(
            select(User).where(User.role == "barber")
        )
        barber_list = barbers.scalars().all()
        for barber in barber_list:
            tokens_result = await db.execute(
                select(PushToken).where(PushToken.user_id == barber.user_id)
            )
            tokens = tokens_result.scalars().all()
            for token in tokens:
                await send_expo_push(token.token, title, body, {"appointment_id": apt.id})
    except Exception as e:
        logger.error(f"Barber push error: {e}")


async def _notify_client_web_push(db: AsyncSession, client_email: str, title: str, body: str):
    """Send Web Push to client browser"""
    try:
        result = await db.execute(
            select(User).where(User.email == client_email, User.web_push_subscription.isnot(None))
        )
        user = result.scalar_one_or_none()
        if user and user.web_push_subscription:
            send_web_push(user.web_push_subscription, title, body)
    except Exception as e:
        logger.error(f"Client web push error: {e}")


# ============== REMINDER (1h before) ==============
async def send_appointment_reminders():
    """Send reminders for appointments happening in ~1 hour"""
    from datetime import datetime, timedelta
    from database import async_session_factory

    try:
        async with async_session_factory() as db:
            now = datetime.now()  # naive datetime to match DB column
            window_start = now + timedelta(minutes=55)
            window_end = now + timedelta(minutes=65)

            result = await db.execute(
                select(Appointment).where(
                    Appointment.scheduled_time.between(window_start, window_end),
                    Appointment.status.in_(["pending", "confirmed"]),
                )
            )
            appointments = result.scalars().all()

            for apt in appointments:
                svc_result = await db.execute(select(Service).where(Service.id == apt.service_id))
                svc = svc_result.scalar_one_or_none()
                svc_name = svc.name if svc else "Servico"
                time_str = apt.scheduled_time.strftime("%H:%M") if apt.scheduled_time else ""
                client_name = apt.client_name or "Cliente"

                # WhatsApp reminder via Evolution API
                if apt.client_phone:
                    msg = (
                        f"Lembrete: Ola {client_name}! "
                        f"Seu agendamento de *{svc_name}* e daqui a *1 hora* (as {time_str}). "
                        f"Esperamos voce!"
                    )
                    await send_evolution_message(apt.client_phone, msg)

                # Web Push reminder
                if apt.client_email:
                    await _notify_client_web_push(
                        db,
                        apt.client_email,
                        "Lembrete de Agendamento",
                        f"Seu {svc_name} e em 1 hora (as {time_str}). Nao esqueca!",
                    )

                # Expo Push to barber
                await _notify_barber_push(
                    db, apt,
                    "Lembrete",
                    f"{client_name} - {svc_name} em 1 hora ({time_str})",
                )

            logger.info(f"[Reminder] Checked {len(appointments)} appointments")
    except Exception as e:
        logger.error(f"Reminder error: {e}")
