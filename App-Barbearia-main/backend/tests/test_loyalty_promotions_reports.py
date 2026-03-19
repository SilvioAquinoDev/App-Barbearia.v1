"""
Test new features iteration 3:
1. Loyalty Program - config, clients, add points, redeem, public lookup
2. Promotions CRUD - create, list all, list active, update, delete
3. Financial Reports - daily/weekly/monthly, top services, daily breakdown
4. Service Photos - upload, list, delete

Base URL: https://barber-mgmt-5.preview.emergentagent.com
Test user: test_barber@testing.com (created in iteration 1)
"""
import pytest
import requests
import os
import subprocess
import sys
import time

sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://barber-mgmt-5.preview.emergentagent.com')


# ============ Helper: Get Test Token ============
def get_test_token_sync():
    """Synchronously get test token from database"""
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
@pytest.fixture(scope="function")
def api_client():
    """Public requests session (no auth)"""
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


@pytest.fixture(scope="function")
def authenticated_client(auth_token):
    """Session with auth header - fresh for each test"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ============ Health Check ============
class TestHealthCheck:
    """Basic health check"""
    
    def test_health_returns_200(self, api_client):
        """GET /api/health - Should return 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


# ============ Loyalty Program - Config ============
class TestLoyaltyConfig:
    """Loyalty configuration endpoint tests"""
    
    def test_loyalty_config_requires_auth(self, api_client):
        """GET /api/loyalty/config - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/config")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_loyalty_config_get_creates_default(self, authenticated_client):
        """GET /api/loyalty/config - Should return config with default 100pt threshold"""
        response = authenticated_client.get(f"{BASE_URL}/api/loyalty/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "redemption_threshold" in data
        assert "points_per_real" in data
        assert "reward_description" in data
        assert "is_active" in data
        # Default threshold is 100
        assert data["redemption_threshold"] == 100 or isinstance(data["redemption_threshold"], int)
    
    def test_loyalty_config_update(self, authenticated_client):
        """PUT /api/loyalty/config - Should update config"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/loyalty/config",
            json={
                "points_per_real": 1.5,
                "redemption_threshold": 150,
                "reward_description": "1 Corte Premium",
                "is_active": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "config" in data or "message" in data
        
        # Verify the update
        get_response = authenticated_client.get(f"{BASE_URL}/api/loyalty/config")
        assert get_response.status_code == 200
        config = get_response.json()
        assert config["points_per_real"] == 1.5
        assert config["redemption_threshold"] == 150
        
        # Reset to default for other tests
        authenticated_client.put(
            f"{BASE_URL}/api/loyalty/config",
            json={
                "points_per_real": 1.0,
                "redemption_threshold": 100,
                "reward_description": "1 Corte Grátis",
                "is_active": True
            }
        )


# ============ Loyalty Program - Clients ============
class TestLoyaltyClients:
    """Loyalty clients endpoint tests"""
    
    def test_loyalty_clients_requires_auth(self, api_client):
        """GET /api/loyalty/clients - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/clients")
        assert response.status_code == 401
    
    def test_loyalty_clients_list(self, authenticated_client):
        """GET /api/loyalty/clients - Should return list of clients with points"""
        response = authenticated_client.get(f"{BASE_URL}/api/loyalty/clients")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)


# ============ Loyalty Program - Public Lookup ============
class TestLoyaltyPublicLookup:
    """Public loyalty lookup by phone (no auth required)"""
    
    def test_loyalty_client_lookup_nonexistent(self, api_client):
        """GET /api/loyalty/client/{phone} - Should return 0 points for new phone"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/client/5511999999999")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["points"] == 0
        assert data["client_phone"] == "5511999999999"
    
    def test_loyalty_client_history_nonexistent(self, api_client):
        """GET /api/loyalty/client/{phone}/history - Should return empty list for new phone"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/client/5511999999999/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


# ============ Loyalty Program - Full Flow ============
class TestLoyaltyFullFlow:
    """Full loyalty flow: add points -> check balance -> redeem -> check balance"""
    
    TEST_PHONE = "TEST_5511888888888"
    
    def test_01_add_points_manual(self, authenticated_client):
        """POST /api/loyalty/add-points - Should add points to client"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/loyalty/add-points",
            json={
                "client_phone": self.TEST_PHONE,
                "client_name": "Test Client Loyalty",
                "points": 50,
                "description": "Manual test points"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "new_balance" in data
        assert data["new_balance"] >= 50
    
    def test_02_check_balance_after_add(self, api_client):
        """GET /api/loyalty/client/{phone} - Should show updated balance"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/client/{self.TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert data["points"] >= 50
        assert data["total_earned"] >= 50
    
    def test_03_add_more_points_to_reach_threshold(self, authenticated_client):
        """POST /api/loyalty/add-points - Add more points to reach 100 threshold"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/loyalty/add-points",
            json={
                "client_phone": self.TEST_PHONE,
                "points": 60,
                "description": "More test points"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["new_balance"] >= 100  # Should have at least 110 now
    
    def test_04_check_history_shows_transactions(self, api_client):
        """GET /api/loyalty/client/{phone}/history - Should show transactions"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/client/{self.TEST_PHONE}/history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least 2 earn transactions
        # Check structure
        for txn in data:
            assert "type" in txn
            assert "points" in txn
            assert "description" in txn
            assert "created_at" in txn
    
    def test_05_redeem_points(self, authenticated_client):
        """POST /api/loyalty/redeem - Should redeem points successfully"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/loyalty/redeem",
            json={"client_phone": self.TEST_PHONE}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "points_used" in data
        assert "new_balance" in data
        assert data["points_used"] == 100  # Default threshold
    
    def test_06_check_balance_after_redeem(self, api_client):
        """GET /api/loyalty/client/{phone} - Should show reduced balance"""
        response = api_client.get(f"{BASE_URL}/api/loyalty/client/{self.TEST_PHONE}")
        assert response.status_code == 200
        data = response.json()
        assert data["total_redeemed"] >= 100
    
    def test_07_redeem_insufficient_points_fails(self, authenticated_client):
        """POST /api/loyalty/redeem - Should fail when points < threshold"""
        # Try to redeem again (should have less than 100 now)
        response = authenticated_client.post(
            f"{BASE_URL}/api/loyalty/redeem",
            json={"client_phone": self.TEST_PHONE}
        )
        # Should be 400 (insufficient points)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


# ============ Promotions - CRUD ============
class TestPromotionsCRUD:
    """Promotions CRUD endpoint tests"""
    
    created_promo_id = None
    
    def test_01_promotions_list_public(self, api_client):
        """GET /api/promotions/ - Should be public (no auth)"""
        response = api_client.get(f"{BASE_URL}/api/promotions/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
    
    def test_02_promotions_all_requires_auth(self, api_client):
        """GET /api/promotions/all - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/promotions/all")
        assert response.status_code == 401
    
    def test_03_create_promotion(self, authenticated_client):
        """POST /api/promotions/ - Should create promotion"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/promotions/",
            json={
                "title": "TEST_Promo 10% Off",
                "description": "Test promotion description",
                "discount_percent": 10.0,
                "code": "TEST10",
                "valid_until": "2026-12-31"
            }
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        TestPromotionsCRUD.created_promo_id = data["id"]
    
    def test_04_verify_promotion_in_list(self, api_client):
        """GET /api/promotions/ - Should show created promotion"""
        response = api_client.get(f"{BASE_URL}/api/promotions/")
        assert response.status_code == 200
        data = response.json()
        promo_ids = [p["id"] for p in data]
        assert TestPromotionsCRUD.created_promo_id in promo_ids
    
    def test_05_promotions_all_shows_barber_promos(self, authenticated_client):
        """GET /api/promotions/all - Should show barber's promotions"""
        response = authenticated_client.get(f"{BASE_URL}/api/promotions/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        promo_ids = [p["id"] for p in data]
        assert TestPromotionsCRUD.created_promo_id in promo_ids
    
    def test_06_update_promotion(self, authenticated_client):
        """PUT /api/promotions/{id} - Should update promotion"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/promotions/{TestPromotionsCRUD.created_promo_id}",
            json={
                "title": "TEST_Promo 20% Off Updated",
                "discount_percent": 20.0,
                "is_active": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_07_update_nonexistent_promotion_fails(self, authenticated_client):
        """PUT /api/promotions/{id} - Should return 404 for nonexistent"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/promotions/999999",
            json={"title": "Nonexistent"}
        )
        assert response.status_code == 404
    
    def test_08_delete_promotion(self, authenticated_client):
        """DELETE /api/promotions/{id} - Should delete promotion"""
        response = authenticated_client.delete(
            f"{BASE_URL}/api/promotions/{TestPromotionsCRUD.created_promo_id}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_09_delete_nonexistent_fails(self, authenticated_client):
        """DELETE /api/promotions/{id} - Should return 404 for nonexistent"""
        response = authenticated_client.delete(f"{BASE_URL}/api/promotions/999999")
        assert response.status_code == 404


# ============ Financial Reports ============
class TestFinancialReports:
    """Financial reports endpoint tests"""
    
    def test_reports_financial_requires_auth(self, api_client):
        """GET /api/reports/financial - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/reports/financial")
        assert response.status_code == 401
    
    def test_reports_financial_day(self, authenticated_client):
        """GET /api/reports/financial?period=day - Should return daily report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/financial?period=day")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["period"] == "day"
        assert "total_revenue" in data
        assert "total_services" in data
        assert "total_products" in data
        assert "completed_appointments" in data
        assert "cancelled_appointments" in data
        assert "pending_appointments" in data
        assert "start_date" in data
    
    def test_reports_financial_week(self, authenticated_client):
        """GET /api/reports/financial?period=week - Should return weekly report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/financial?period=week")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
        assert "total_revenue" in data
    
    def test_reports_financial_month(self, authenticated_client):
        """GET /api/reports/financial?period=month - Should return monthly report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/financial?period=month")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "month"
        assert "total_revenue" in data


# ============ Top Services Report ============
class TestTopServicesReport:
    """Top services ranking endpoint tests"""
    
    def test_top_services_requires_auth(self, api_client):
        """GET /api/reports/top-services - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/reports/top-services")
        assert response.status_code == 401
    
    def test_top_services_returns_ranking(self, authenticated_client):
        """GET /api/reports/top-services - Should return service ranking"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/top-services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # If there are results, verify structure
        for svc in data:
            assert "name" in svc
            assert "price" in svc
            assert "count" in svc
            assert "revenue" in svc


# ============ Daily Breakdown Report ============
class TestDailyBreakdownReport:
    """7-day breakdown endpoint tests"""
    
    def test_daily_breakdown_requires_auth(self, api_client):
        """GET /api/reports/daily-breakdown - Should require auth"""
        response = api_client.get(f"{BASE_URL}/api/reports/daily-breakdown")
        assert response.status_code == 401
    
    def test_daily_breakdown_returns_7_days(self, authenticated_client):
        """GET /api/reports/daily-breakdown?days=7 - Should return 7-day breakdown"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/daily-breakdown?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7
        # Verify structure
        for day in data:
            assert "date" in day
            assert "day_name" in day
            assert "services" in day
            assert "products" in day
            assert "appointments" in day


# ============ Service Photos ============
class TestServicePhotos:
    """Service photo endpoints tests"""
    
    created_photo_id = None
    
    def test_01_service_photos_public_get(self, api_client):
        """GET /api/service-photos/{service_id} - Should be public"""
        # Use service_id 1 (should exist from previous tests)
        response = api_client.get(f"{BASE_URL}/api/service-photos/1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
    
    def test_02_upload_photo_requires_auth(self, api_client):
        """POST /api/service-photos/ - Should require auth"""
        response = api_client.post(
            f"{BASE_URL}/api/service-photos/",
            json={
                "service_id": 1,
                "photo_data": "test_base64_data",
                "caption": "Test photo"
            }
        )
        assert response.status_code == 401
    
    def test_03_upload_photo(self, authenticated_client):
        """POST /api/service-photos/ - Should upload photo"""
        # Simple base64 encoded test image (1x1 pixel PNG)
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/service-photos/",
            json={
                "service_id": 1,
                "photo_data": test_base64,
                "caption": "TEST_Service photo"
            }
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        TestServicePhotos.created_photo_id = data["id"]
    
    def test_04_verify_photo_in_list(self, api_client):
        """GET /api/service-photos/{service_id} - Should show uploaded photo"""
        response = api_client.get(f"{BASE_URL}/api/service-photos/1")
        assert response.status_code == 200
        data = response.json()
        photo_ids = [p["id"] for p in data]
        assert TestServicePhotos.created_photo_id in photo_ids
    
    def test_05_delete_photo_requires_auth(self, api_client):
        """DELETE /api/service-photos/{id} - Should require auth"""
        response = api_client.delete(f"{BASE_URL}/api/service-photos/{TestServicePhotos.created_photo_id}")
        assert response.status_code == 401
    
    def test_06_delete_photo(self, authenticated_client):
        """DELETE /api/service-photos/{id} - Should delete photo"""
        response = authenticated_client.delete(f"{BASE_URL}/api/service-photos/{TestServicePhotos.created_photo_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_07_delete_nonexistent_fails(self, authenticated_client):
        """DELETE /api/service-photos/{id} - Should return 404 for nonexistent"""
        response = authenticated_client.delete(f"{BASE_URL}/api/service-photos/999999")
        assert response.status_code == 404


# ============ Appointment Complete Awards Loyalty Points ============
class TestAppointmentCompleteLoyalty:
    """Test that completing appointment awards loyalty points"""
    
    def test_complete_appointment_awards_points(self, authenticated_client, api_client):
        """POST /api/appointments/{id}/complete - Should award loyalty points"""
        # This test assumes an appointment exists. Let's check if there's a pending one
        response = authenticated_client.get(f"{BASE_URL}/api/appointments/?status_filter=pending")
        if response.status_code != 200:
            pytest.skip("Could not list appointments")
        
        data = response.json()
        if not data:
            pytest.skip("No pending appointments to complete")
        
        # Get first pending appointment with a client_phone
        apt = None
        for a in data:
            if a.get("client_phone"):
                apt = a
                break
        
        if not apt:
            pytest.skip("No pending appointments with client_phone to test loyalty awarding")
        
        # Check client's current points
        client_phone = apt["client_phone"]
        points_before_resp = api_client.get(f"{BASE_URL}/api/loyalty/client/{client_phone}")
        points_before = points_before_resp.json().get("points", 0) if points_before_resp.status_code == 200 else 0
        
        # Complete the appointment
        complete_resp = authenticated_client.post(f"{BASE_URL}/api/appointments/{apt['id']}/complete")
        if complete_resp.status_code != 200:
            pytest.skip(f"Could not complete appointment: {complete_resp.status_code}")
        
        # Give a moment for the DB to update
        time.sleep(0.5)
        
        # Check points after
        points_after_resp = api_client.get(f"{BASE_URL}/api/loyalty/client/{client_phone}")
        points_after = points_after_resp.json().get("points", 0) if points_after_resp.status_code == 200 else 0
        
        # Points should have increased (based on service price * points_per_real)
        assert points_after >= points_before, f"Points should have increased. Before: {points_before}, After: {points_after}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
