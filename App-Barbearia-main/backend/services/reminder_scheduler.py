"""
Background scheduler for sending appointment reminders.
Runs every 5 minutes, checks for appointments in the next hour,
and sends reminders via WhatsApp (Evolution API), Web Push, and Expo Push.
"""
import asyncio
import logging
from notification_service import send_appointment_reminders

logger = logging.getLogger(__name__)

REMINDER_INTERVAL_SECONDS = 300  # 5 minutes


async def reminder_scheduler_loop():
    """Main loop that runs send_appointment_reminders periodically"""
    logger.info("[Reminder] Scheduler de lembretes iniciado (a cada 5 min)")
    while True:
        await send_appointment_reminders()
        await asyncio.sleep(REMINDER_INTERVAL_SECONDS)
