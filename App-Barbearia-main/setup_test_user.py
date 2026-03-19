#!/usr/bin/env python3
"""
Setup test user and session in database according to review request instructions
"""
import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import async_session_factory, init_db
from models import User, UserSession
from datetime import datetime, timedelta
import uuid

async def setup():
    await init_db()
    async with async_session_factory() as db:
        user_id = 'test_barber_001'
        user = User(user_id=user_id, email='testbarber@test.com', name='Test Barber', role='barber')
        db.add(user)
        token = f'session_{uuid.uuid4().hex}'
        session = UserSession(user_id=user_id, session_token=token, expires_at=datetime.utcnow() + timedelta(days=7))
        db.add(session)
        await db.commit()
        print(f'TOKEN={token}')

if __name__ == "__main__":
    asyncio.run(setup())