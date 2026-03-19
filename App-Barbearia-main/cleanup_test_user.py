#!/usr/bin/env python3
"""
Cleanup test user and session from database
"""
import asyncio
import sys
import os
sys.path.append('/app/backend')

from database import async_session_factory
from models import User, UserSession, Appointment, CashRegister, ServiceHistory
from sqlalchemy import delete

async def cleanup():
    async with async_session_factory() as db:
        # Delete related data first (due to foreign key constraints)
        
        # Delete service history
        await db.execute(
            delete(ServiceHistory).where(
                (ServiceHistory.client_id == 'test_barber_001') |
                (ServiceHistory.barber_id == 'test_barber_001')
            )
        )
        
        # Delete appointments
        await db.execute(
            delete(Appointment).where(Appointment.client_id == 'test_barber_001')
        )
        
        # Delete cash register
        await db.execute(
            delete(CashRegister).where(CashRegister.barber_id == 'test_barber_001')
        )
        
        # Delete test user sessions
        await db.execute(
            delete(UserSession).where(UserSession.user_id == 'test_barber_001')
        )
        
        # Delete test user
        await db.execute(
            delete(User).where(User.user_id == 'test_barber_001')
        )
        
        await db.commit()
        print('✅ Test data cleaned up successfully')

if __name__ == "__main__":
    asyncio.run(cleanup())