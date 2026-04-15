"""
Test new features from iteration 2:
1. Daily summary via WhatsApp when closing cash register
2. Appointments status_filter query param with service_name/service_price
3. WhatsApp settings auth requirements
"""
import pytest
import requests
import os
import asyncio
import sys

sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://gestao-app-1.preview.emergentagent.com')


# ============ Helper: Get Test Token ============
def get_test_token_sync():
    """Synchronously get test token from database"""
    import subprocess
    result = subprocess.run(
        ['python', '-c', '''
import asyncio
import os
import sys
sys.path.insert(0, '/app/backend')

async def get_token():
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
        await engine.dispose()
        return user_session.session_token if user_session else None

print(asyncio.run(get_token()) or "")
'''],
        capture_output=True,
        text=True,
        cwd='/app/backend'
    )
    token = result.stdout.strip()
    return token if token else None


# ============ Fixtures ============
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    token = get_test_token_sync()
    if not token:
        pytest.skip("No test session found. Run test_authenticated.py first to create test user.")
    return token


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ============ Health Check ============
class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_returns_200(self, api_client):
        """GET /api/health - Should return 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data


# ============ WhatsApp Settings Auth ============
class TestWhatsAppSettingsAuth:
    """WhatsApp settings require auth"""
    
    def test_whatsapp_settings_requires_auth(self, api_client):
        """GET /api/whatsapp/settings - Should require auth"""
        # Clear any auth header
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/whatsapp/settings")
        assert response.status_code == 401


# ============ Appointments Status Filter ============
class TestAppointmentsStatusFilter:
    """Appointments endpoint with status_filter query param"""
    
    def test_appointments_status_filter_completed(self, authenticated_client):
        """GET /api/appointments/?status_filter=completed - Should filter by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/appointments/?status_filter=completed")
        assert response.status_code == 200
        data = response.json()
        # Verify all returned have completed status
        for apt in data:
            assert apt["status"] == "completed"
            # Verify service_name and service_price fields exist
            assert "service_name" in apt, "Missing service_name field"
            assert "service_price" in apt, "Missing service_price field"
    
    def test_appointments_status_filter_pending(self, authenticated_client):
        """GET /api/appointments/?status_filter=pending - Should filter by status"""
        response = authenticated_client.get(f"{BASE_URL}/api/appointments/?status_filter=pending")
        assert response.status_code == 200
        data = response.json()
        # Verify all returned have pending status
        for apt in data:
            assert apt["status"] == "pending"
    
    def test_appointments_returns_service_info(self, authenticated_client):
        """GET /api/appointments/ - Should return service_name and service_price"""
        response = authenticated_client.get(f"{BASE_URL}/api/appointments/")
        assert response.status_code == 200
        data = response.json()
        # If any appointments exist, verify they have service info
        if data:
            apt = data[0]
            assert "service_name" in apt, "Missing service_name field"
            assert "service_price" in apt, "Missing service_price field"


# ============ Cash Register ============
class TestCashRegister:
    """Cash register endpoints"""
    
    def test_cash_register_open(self, authenticated_client):
        """POST /api/cash-register/open - Should create a new cash register session"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/cash-register/open",
            json={"opening_balance": 100.0}
        )
        # Could be 200 (success) or 400 (already open)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data["status"] == "open"
        else:
            # Already open - this is acceptable
            assert "already open" in response.json().get("detail", "").lower()
    
    def test_cash_register_current_returns_product_totals(self, authenticated_client):
        """GET /api/cash-register/current - Should return product totals"""
        response = authenticated_client.get(f"{BASE_URL}/api/cash-register/current")
        
        # Could be 200 (open register) or 404 (no open register)
        if response.status_code == 200:
            data = response.json()
            assert "total_services" in data, "Missing total_services field"
            assert "total_products" in data, "Missing total_products field"
            assert "opening_balance" in data
        elif response.status_code == 404:
            # No open register - need to open first
            pass
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_cash_register_close_triggers_background_summary(self, authenticated_client):
        """POST /api/cash-register/close - Should work and trigger daily summary in background"""
        # First ensure a register is open
        open_resp = authenticated_client.post(
            f"{BASE_URL}/api/cash-register/open",
            json={"opening_balance": 100.0}
        )
        
        if open_resp.status_code not in [200, 400]:
            pytest.skip("Could not open cash register")
        
        # Close the register
        response = authenticated_client.post(
            f"{BASE_URL}/api/cash-register/close",
            json={"closing_balance": 150.0}
        )
        
        # Could be 200 (success) or 404 (no open register)
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "closed"
            assert "total_services" in data
            assert "total_products" in data
            # Background task for daily summary is triggered but we can't verify WhatsApp
            # as it requires real credentials
        elif response.status_code == 404:
            # No open register - acceptable
            pass
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")


# ============ Products List (No Auth) ============
class TestProductsList:
    """Products endpoint for public access"""
    
    def test_products_list_no_auth(self, api_client):
        """GET /api/products/ - Should work without auth"""
        # Clear any auth header
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/products/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
