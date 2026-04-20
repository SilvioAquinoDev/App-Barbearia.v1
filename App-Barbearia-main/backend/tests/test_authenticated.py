"""
Test script to create test user/session and test authenticated endpoints
This script injects test data directly into the database for testing barber-only endpoints
"""
import asyncio
import os
import sys
import requests
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, '/app/backend')

async def create_test_session():
    """Create a test user and session for testing authenticated endpoints"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select, delete, text
    import uuid
    
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb')
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Import models
        from models import User, UserSession
        
        # Create or get test user
        test_email = "test_barber@testing.com"
        test_user_id = "test_barber_001"
        
        # Check if test user exists
        result = await session.execute(
            select(User).where(User.email == test_email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                user_id=test_user_id,
                email=test_email,
                name="Test Barber",
                role="barber"  # Important: set as barber for full access
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"✅ Created test user: {user.email} (role: {user.role})")
        else:
            # Ensure user is barber
            if user.role != "barber":
                user.role = "barber"
                await session.commit()
            print(f"✅ Found existing test user: {user.email} (role: {user.role})")
        
        # Create session token
        session_token = f"test_session_{uuid.uuid4().hex}"
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Delete existing sessions for test user
        await session.execute(
            delete(UserSession).where(UserSession.user_id == user.user_id)
        )
        
        user_session = UserSession(
            user_id=user.user_id,
            session_token=session_token,
            expires_at=expires_at
        )
        session.add(user_session)
        await session.commit()
        
        print(f"✅ Created session token: {session_token[:30]}...")
        
        await engine.dispose()
        
        return session_token, user.user_id


def test_authenticated_endpoints(token):
    """Test endpoints with authentication"""
    BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    results = {"passed": 0, "failed": 0, "errors": []}
    
    # Test 1: GET /api/auth/me
    print("\n📋 Testing authenticated endpoints...")
    
    try:
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/auth/me - User: {data.get('email')} (role: {data.get('role')})")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/auth/me - Status: {resp.status_code}")
            results["failed"] += 1
            results["errors"].append(f"/api/auth/me returned {resp.status_code}")
    except Exception as e:
        print(f"❌ GET /api/auth/me - Error: {e}")
        results["failed"] += 1
    
    # Test 2: GET /api/appointments/ with auth
    try:
        resp = requests.get(f"{BASE_URL}/api/appointments/", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/appointments/ - Returned {len(data)} appointments")
            # Check if response includes service_name and service_price
            if data and len(data) > 0:
                appt = data[0]
                if "service_name" in appt and "service_price" in appt:
                    print(f"   ✅ Appointments include service_name and service_price fields")
                else:
                    print(f"   ⚠️ Missing service_name/service_price in appointment response")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/appointments/ - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ GET /api/appointments/ - Error: {e}")
        results["failed"] += 1
    
    # Test 3: GET /api/whatsapp/settings with auth
    try:
        resp = requests.get(f"{BASE_URL}/api/whatsapp/settings", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/whatsapp/settings - has_token: {data.get('has_token')}, is_active: {data.get('is_active')}")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/whatsapp/settings - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ GET /api/whatsapp/settings - Error: {e}")
        results["failed"] += 1
    
    # Test 4: PUT /api/whatsapp/settings with auth
    try:
        resp = requests.put(
            f"{BASE_URL}/api/whatsapp/settings",
            headers=headers,
            json={"is_active": False}
        )
        if resp.status_code == 200:
            print(f"✅ PUT /api/whatsapp/settings - Settings updated")
            results["passed"] += 1
        else:
            print(f"❌ PUT /api/whatsapp/settings - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ PUT /api/whatsapp/settings - Error: {e}")
        results["failed"] += 1
    
    # Test 5: GET /api/cash-register/current with auth (may return 404 if none open)
    try:
        resp = requests.get(f"{BASE_URL}/api/cash-register/current", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/cash-register/current - Open register found")
            # Check if includes product totals
            if "total_products" in data:
                print(f"   ✅ Cash register includes total_products: {data.get('total_products')}")
            results["passed"] += 1
        elif resp.status_code == 404:
            print(f"✅ GET /api/cash-register/current - No open register (404 expected)")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/cash-register/current - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ GET /api/cash-register/current - Error: {e}")
        results["failed"] += 1
    
    # Test 6: GET /api/product-sales/ with auth
    try:
        resp = requests.get(f"{BASE_URL}/api/product-sales/", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/product-sales/ - Returned {len(data)} sales")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/product-sales/ - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ GET /api/product-sales/ - Error: {e}")
        results["failed"] += 1
    
    # Test 7: GET /api/product-sales/summary with auth
    try:
        resp = requests.get(f"{BASE_URL}/api/product-sales/summary", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ GET /api/product-sales/summary - Today: {data.get('today')}, Week: {data.get('week')}, Month: {data.get('month')}")
            results["passed"] += 1
        else:
            print(f"❌ GET /api/product-sales/summary - Status: {resp.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"❌ GET /api/product-sales/summary - Error: {e}")
        results["failed"] += 1
    
    # Test 8: Test POST /api/products/{id}/sell with auth
    try:
        # Get a product first
        products_resp = requests.get(f"{BASE_URL}/api/products/")
        products = products_resp.json()
        if products:
            product_id = products[0]["id"]
            current_stock = products[0]["stock"]
            
            # Try to sell a product
            resp = requests.post(
                f"{BASE_URL}/api/products/{product_id}/sell?quantity=1",
                headers=headers
            )
            if resp.status_code == 200:
                data = resp.json()
                print(f"✅ POST /api/products/{product_id}/sell - Sale recorded, remaining stock: {data.get('remaining_stock')}")
                results["passed"] += 1
            elif resp.status_code == 400:
                print(f"✅ POST /api/products/{product_id}/sell - Stock insufficient (400 expected)")
                results["passed"] += 1
            else:
                print(f"❌ POST /api/products/{product_id}/sell - Status: {resp.status_code}")
                results["failed"] += 1
        else:
            print("⚠️ No products available to test sell endpoint")
    except Exception as e:
        print(f"❌ POST /api/products/sell - Error: {e}")
        results["failed"] += 1
    
    return results


async def main():
    print("=" * 60)
    print("Backend Authenticated Endpoints Test")
    print("=" * 60)
    
    try:
        token, user_id = await create_test_session()
        results = test_authenticated_endpoints(token)
        
        print("\n" + "=" * 60)
        print(f"Results: {results['passed']} passed, {results['failed']} failed")
        if results["errors"]:
            print("Errors:")
            for err in results["errors"]:
                print(f"  - {err}")
        print("=" * 60)
        
        return results
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return {"passed": 0, "failed": 1, "errors": [str(e)]}


if __name__ == "__main__":
    asyncio.run(main())
