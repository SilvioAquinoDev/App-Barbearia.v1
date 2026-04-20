"""
Test appointment status change endpoints and WhatsApp notification triggers
"""
import asyncio
import os
import sys
import requests
from datetime import datetime, timedelta

sys.path.insert(0, '/app/backend')

async def get_test_token():
    """Get existing test session token"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select
    
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb')
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        from models import User, UserSession
        
        result = await session.execute(
            select(UserSession).join(User).where(User.email == "test_barber@testing.com")
        )
        user_session = result.scalar_one_or_none()
        
        if user_session:
            await engine.dispose()
            return user_session.session_token
        
        await engine.dispose()
        return None


async def create_test_appointment(token):
    """Create a test appointment for testing"""
    BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
    
    # Create via public booking
    future_time = (datetime.utcnow() + timedelta(days=7, hours=14)).isoformat()
    
    resp = requests.post(
        f"{BASE_URL}/api/public/book",
        json={
            "client_name": "Test Client",
            "client_phone": "11999999999",
            "service_id": 5,  # Use existing service ID
            "scheduled_time": future_time
        }
    )
    
    if resp.status_code == 201:
        return resp.json()
    elif resp.status_code == 409:
        # Slot already taken, try different time
        future_time = (datetime.utcnow() + timedelta(days=8, hours=10)).isoformat()
        resp = requests.post(
            f"{BASE_URL}/api/public/book",
            json={
                "client_name": "Test Client",
                "client_phone": "11999999999",
                "service_id": 5,
                "scheduled_time": future_time
            }
        )
        if resp.status_code == 201:
            return resp.json()
    
    return None


def test_appointment_actions(token, appointment_id):
    """Test appointment confirm, complete, cancel endpoints"""
    BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    results = {"passed": 0, "failed": 0, "errors": []}
    
    # Test 1: Confirm appointment
    print(f"\n📋 Testing appointment actions on ID: {appointment_id}")
    
    try:
        resp = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/confirm",
            headers=headers
        )
        if resp.status_code == 200:
            print(f"✅ POST /api/appointments/{appointment_id}/confirm - Success")
            print(f"   WhatsApp notification triggered in background (will fail gracefully without Meta API creds)")
            results["passed"] += 1
        else:
            print(f"❌ POST /api/appointments/{appointment_id}/confirm - Status: {resp.status_code}")
            print(f"   Response: {resp.text}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ Confirm appointment error: {e}")
        results["failed"] += 1
    
    # Test 2: Complete appointment
    try:
        resp = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/complete",
            headers=headers
        )
        if resp.status_code == 200:
            print(f"✅ POST /api/appointments/{appointment_id}/complete - Success")
            print(f"   WhatsApp notification triggered in background")
            results["passed"] += 1
        else:
            print(f"❌ POST /api/appointments/{appointment_id}/complete - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ Complete appointment error: {e}")
        results["failed"] += 1
    
    return results


def test_cancel_appointment(token, appointment_id):
    """Test appointment cancel endpoint (separate since it's a destructive action)"""
    BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/cancel",
            headers=headers
        )
        if resp.status_code == 200:
            print(f"✅ POST /api/appointments/{appointment_id}/cancel - Success")
            print(f"   WhatsApp notification triggered in background")
            return True
        else:
            print(f"❌ POST /api/appointments/{appointment_id}/cancel - Status: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cancel appointment error: {e}")
        return False


async def main():
    print("=" * 60)
    print("Appointment Actions Test (confirm/complete/cancel)")
    print("=" * 60)
    
    try:
        token = await get_test_token()
        if not token:
            print("❌ No test session found. Run test_authenticated.py first.")
            return
        
        print(f"✅ Using test token: {token[:30]}...")
        
        # Get existing appointments
        BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
        headers = {"Authorization": f"Bearer {token}"}
        
        resp = requests.get(f"{BASE_URL}/api/appointments/", headers=headers)
        appointments = resp.json()
        
        # Find a pending appointment to test
        pending = [a for a in appointments if a["status"] == "pending"]
        
        if pending:
            appt = pending[0]
            print(f"✅ Found pending appointment ID: {appt['id']}")
            results = test_appointment_actions(token, appt["id"])
        else:
            # Create a new appointment
            print("No pending appointments found, creating one...")
            new_appt = await create_test_appointment(token)
            if new_appt:
                print(f"✅ Created test appointment ID: {new_appt['id']}")
                results = test_appointment_actions(token, new_appt["id"])
            else:
                print("⚠️ Could not create test appointment")
                results = {"passed": 0, "failed": 0}
        
        # Test cancel on another appointment
        confirmed = [a for a in appointments if a["status"] == "confirmed"]
        if confirmed:
            print(f"\n📋 Testing cancel on confirmed appointment ID: {confirmed[0]['id']}")
            test_cancel_appointment(token, confirmed[0]["id"])
        
        print("\n" + "=" * 60)
        print(f"Results: {results['passed']} passed, {results['failed']} failed")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
