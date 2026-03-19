"""Notification service - Expo Push + WhatsApp via WaSenderAPI"""
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models import WhatsAppSettings, PushToken, User

logger = logging.getLogger(__name__)

# Expo Push
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(tokens: list[str], title: str, body: str, data: dict = None):
    """Send push notification via Expo Push API"""
    if not tokens:
        return
    messages = []
    for token in tokens:
        if not token.startswith("ExponentPushToken[") and not token.startswith("ExpoPushToken["):
            continue
        msg = {"to": token, "title": title, "body": body, "sound": "default"}
        if data:
            msg["data"] = data
        messages.append(msg)

    if not messages:
        logger.warning("[Push] Nenhum token Expo valido encontrado")
        return

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=messages)
            logger.info(f"[Push] Expo response: {resp.status_code} - {len(messages)} mensagem(ns)")
            if resp.status_code != 200:
                logger.error(f"[Push] Expo error: {resp.text[:300]}")
    except Exception as e:
        logger.error(f"[Push] Erro ao enviar push: {e}")


async def send_push_to_barbers(db: AsyncSession, title: str, body: str, data: dict = None):
    """Send push to all barber devices"""
    result = await db.execute(
        select(PushToken.token).join(
            User, PushToken.user_id == User.user_id
        ).where(
            and_(User.role == "barber", PushToken.is_active == True)
        )
    )
    tokens = [row[0] for row in result.all()]
    await send_expo_push(tokens, title, body, data)


async def send_push_to_client(db: AsyncSession, client_email: str, title: str, body: str, data: dict = None):
    """Send push to client by email"""
    if not client_email:
        return
    result = await db.execute(
        select(PushToken.token).join(
            User, PushToken.user_id == User.user_id
        ).where(
            and_(User.email == client_email, PushToken.is_active == True)
        )
    )
    tokens = [row[0] for row in result.all()]
    await send_expo_push(tokens, title, body, data)


# WhatsApp via WaSenderAPI

async def send_whatsapp(db: AsyncSession, phone: str, message: str) -> bool:
    """Send WhatsApp message via WaSenderAPI"""
    if not phone:
        return False
    result = await db.execute(
        select(WhatsAppSettings).where(
            and_(WhatsAppSettings.is_active == True, WhatsAppSettings.wasender_session_key.isnot(None))
        )
    )
    settings = result.scalar_one_or_none()
    if not settings:
        logger.info(f"[WhatsApp] Sem sessao ativa para enviar para {phone}")
        return False

    clean = phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    try:
        headers = {"Authorization": f"Bearer {settings.wasender_session_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://wasenderapi.com/api/send-message",
                json={"to": clean, "text": message},
                headers=headers,
            )
            logger.info(f"[WhatsApp] WaSenderAPI: {resp.status_code} para {clean}")
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.error(f"[WhatsApp] Erro: {e}")
        return False


# Combined notification functions

async def notify_new_appointment(db: AsyncSession, apt_data: dict):
    """Notify: new appointment created"""
    name = apt_data.get("client_name", "Cliente")
    service = apt_data.get("service_name", "Servico")
    time = apt_data.get("scheduled_time", "")
    phone = apt_data.get("client_phone", "")
    email = apt_data.get("client_email", "")

    # Push to barber
    await send_push_to_barbers(
        db,
        "Novo Agendamento!",
        f"{name} agendou {service} para {time}",
        {"type": "new_appointment", "appointment_id": apt_data.get("id")},
    )

    # WhatsApp to client
    msg = (
        f"Ola {name}! Seu agendamento foi recebido.\n\n"
        f"Servico: {service}\nData/Hora: {time}\nStatus: Pendente\n\n"
        f"Aguarde a confirmacao do barbeiro."
    )
    await send_whatsapp(db, phone, msg)

    # Push to client
    await send_push_to_client(db, email, "Agendamento Recebido", f"Seu agendamento de {service} para {time} foi recebido.", {"type": "new_appointment"})


async def notify_appointment_confirmed(db: AsyncSession, apt_data: dict):
    """Notify: appointment confirmed"""
    name = apt_data.get("client_name", "Cliente")
    service = apt_data.get("service_name", "Servico")
    time = apt_data.get("scheduled_time", "")
    phone = apt_data.get("client_phone", "")
    email = apt_data.get("client_email", "")

    msg = (
        f"Ola {name}! Seu agendamento foi CONFIRMADO!\n\n"
        f"Servico: {service}\nData/Hora: {time}\n\n"
        f"Te esperamos!"
    )
    await send_whatsapp(db, phone, msg)
    await send_push_to_client(db, email, "Agendamento Confirmado!", f"Seu agendamento de {service} para {time} foi confirmado.", {"type": "confirmed"})


async def notify_appointment_cancelled(db: AsyncSession, apt_data: dict):
    """Notify: appointment cancelled"""
    name = apt_data.get("client_name", "Cliente")
    service = apt_data.get("service_name", "Servico")
    time = apt_data.get("scheduled_time", "")
    phone = apt_data.get("client_phone", "")
    email = apt_data.get("client_email", "")

    msg = (
        f"Ola {name}, seu agendamento foi cancelado.\n\n"
        f"Servico: {service}\nData/Hora: {time}\n\n"
        f"Para reagendar, acesse nosso site."
    )
    await send_whatsapp(db, phone, msg)
    await send_push_to_client(db, email, "Agendamento Cancelado", f"Seu agendamento de {service} para {time} foi cancelado.", {"type": "cancelled"})


async def notify_appointment_completed(db: AsyncSession, apt_data: dict):
    """Notify: appointment completed"""
    name = apt_data.get("client_name", "Cliente")
    service = apt_data.get("service_name", "Servico")
    phone = apt_data.get("client_phone", "")
    email = apt_data.get("client_email", "")

    msg = (
        f"Ola {name}! Obrigado pela visita!\n\n"
        f"Servico: {service}\n\n"
        f"Esperamos ve-lo novamente!"
    )
    await send_whatsapp(db, phone, msg)
    await send_push_to_client(db, email, "Obrigado pela visita!", f"Seu servico de {service} foi concluido. Ate a proxima!", {"type": "completed"})


async def notify_appointment_reminder(db: AsyncSession, apt_data: dict):
    """Notify: appointment reminder (1h before)"""
    name = apt_data.get("client_name", "Cliente")
    service = apt_data.get("service_name", "Servico")
    time = apt_data.get("scheduled_time", "")
    phone = apt_data.get("client_phone", "")
    email = apt_data.get("client_email", "")

    msg = (
        f"Lembrete! Ola {name}, seu agendamento de {service} e em breve.\n\n"
        f"Horario: {time}\n\nTe esperamos!"
    )
    await send_whatsapp(db, phone, msg)
    await send_push_to_client(db, email, "Lembrete de Agendamento", f"Seu agendamento de {service} e as {time}. Te esperamos!", {"type": "reminder"})


# Backward compatibility
class NotificationServiceCompat:
    async def send_appointment_notification(self, tokens=None, appointment_data=None):
        logger.info(f"[Push-Legacy] {appointment_data}")

notification_service = NotificationServiceCompat()
