"""Web Push Notification routes - VAPID-based browser push"""
import json
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional
from pywebpush import webpush, WebPushException

from database import get_db
from auth import get_current_user
from models import User

router = APIRouter(prefix="/web-push", tags=["web-push"])
logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_MAILTO = os.environ.get("VAPID_MAILTO", "mailto:admin@barbershop.com")


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return VAPID public key for client subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID keys not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_push(
    sub: PushSubscription,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save browser push subscription for a user"""
    current_user.web_push_subscription = json.dumps(sub.dict())
    await db.commit()
    return {"status": "subscribed"}


@router.delete("/unsubscribe")
async def unsubscribe_push(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove browser push subscription"""
    current_user.web_push_subscription = None
    await db.commit()
    return {"status": "unsubscribed"}


def send_web_push(subscription_json: str, title: str, body: str, url: str = "/dashboard"):
    """Send a web push notification to a browser subscription"""
    if not VAPID_PRIVATE_KEY or not subscription_json:
        return False
    try:
        sub_info = json.loads(subscription_json)
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/favicon.ico",
            "url": url,
        })
        webpush(
            subscription_info=sub_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_MAILTO},
        )
        logger.info(f"Web push sent: {title}")
        return True
    except WebPushException as e:
        logger.error(f"Web push failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Web push error: {e}")
        return False
