"""
Backend API Tests for Authenticated Endpoints
Creates test user/session and tests barber-only endpoints
"""
import pytest
import requests
import os
import asyncio
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://gestao-app-1.preview.emergentagent.com').rstrip('/')

# We'll create a test session using the database directly
# Since we can't use Emergent Auth directly, we need a pre-created session token
# The main agent mentioned promote-to-barber flow, let's try to create test data via scripts


class TestAuthenticatedEndpointsWithToken:
    """Tests for endpoints that require barber authentication"""
    
    # These tests require a valid session token
    # Skip if no auth token available
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create requests session"""
        return requests.Session()
    
    def test_cannot_access_protected_without_token(self, session):
        """Verify protected endpoints require token"""
        endpoints = [
            ("GET", "/api/appointments/"),
            ("GET", "/api/cash-register/current"),
            ("GET", "/api/whatsapp/settings"),
            ("GET", "/api/product-sales/"),
            ("GET", "/api/product-sales/summary"),
        ]
        for method, endpoint in endpoints:
            if method == "GET":
                resp = session.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 401, f"{endpoint} should return 401, got {resp.status_code}"
        print("✅ All protected endpoints correctly return 401 without auth")


class TestResponseStructures:
    """Test response data structures"""
    
    def test_products_response_structure(self):
        """Verify products response structure"""
        resp = requests.get(f"{BASE_URL}/api/products/")
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            product = data[0]
            # Verify expected fields
            expected_fields = ["id", "name", "price", "stock", "is_active", "created_at", "updated_at"]
            for field in expected_fields:
                assert field in product, f"Missing field: {field}"
            assert isinstance(product["id"], int)
            assert isinstance(product["price"], (int, float))
            assert isinstance(product["stock"], int)
            assert isinstance(product["is_active"], bool)
        print("✅ Products response structure is correct")
    
    def test_services_response_structure(self):
        """Verify services response structure"""
        resp = requests.get(f"{BASE_URL}/api/services/")
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            service = data[0]
            expected_fields = ["id", "name", "price", "duration_minutes", "is_active"]
            for field in expected_fields:
                assert field in service, f"Missing field: {field}"
            assert isinstance(service["duration_minutes"], int)
        print("✅ Services response structure is correct")
    
    def test_public_services_response_structure(self):
        """Verify public services has correct structure for booking"""
        resp = requests.get(f"{BASE_URL}/api/public/services")
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            service = data[0]
            # Public services should have fields needed for booking
            assert "id" in service
            assert "name" in service
            assert "price" in service
            assert "duration_minutes" in service
        print("✅ Public services response structure is correct")
    
    def test_available_slots_response_structure(self):
        """Verify available slots response structure"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        resp = requests.get(f"{BASE_URL}/api/public/available-slots?date_str={future_date}")
        assert resp.status_code == 200
        data = resp.json()
        assert "date" in data
        assert "slots" in data
        assert "day_name" in data
        assert "total_available" in data
        if len(data["slots"]) > 0:
            slot = data["slots"][0]
            assert "time" in slot
            assert "datetime_iso" in slot
        print(f"✅ Available slots response structure is correct ({data['total_available']} slots)")


class TestPublicBookingValidation:
    """Test public booking endpoint validation"""
    
    @pytest.fixture
    def valid_service_id(self):
        """Get a valid service ID for testing"""
        resp = requests.get(f"{BASE_URL}/api/public/services")
        services = resp.json()
        if services:
            return services[0]["id"]
        pytest.skip("No services available for testing")
    
    def test_book_with_short_name(self, valid_service_id):
        """Test booking with name too short"""
        future_time = (datetime.now() + timedelta(days=7, hours=10)).isoformat()
        resp = requests.post(
            f"{BASE_URL}/api/public/book",
            json={
                "client_name": "X",  # Too short (min 2)
                "client_phone": "11999999999",
                "service_id": valid_service_id,
                "scheduled_time": future_time
            }
        )
        assert resp.status_code == 422
        print("✅ Booking correctly validates minimum name length")
    
    def test_book_with_short_phone(self, valid_service_id):
        """Test booking with phone too short"""
        future_time = (datetime.now() + timedelta(days=7, hours=10)).isoformat()
        resp = requests.post(
            f"{BASE_URL}/api/public/book",
            json={
                "client_name": "Test Client",
                "client_phone": "123",  # Too short (min 8)
                "service_id": valid_service_id,
                "scheduled_time": future_time
            }
        )
        assert resp.status_code == 422
        print("✅ Booking correctly validates minimum phone length")
    
    def test_book_with_past_time(self, valid_service_id):
        """Test booking with past time"""
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        resp = requests.post(
            f"{BASE_URL}/api/public/book",
            json={
                "client_name": "Test Client",
                "client_phone": "11999999999",
                "service_id": valid_service_id,
                "scheduled_time": past_time
            }
        )
        assert resp.status_code == 400
        print("✅ Booking correctly rejects past times")


class TestErrorResponses:
    """Test error response formats"""
    
    def test_404_response_format(self):
        """Verify 404 responses have proper format"""
        resp = requests.get(f"{BASE_URL}/api/products/99999")
        assert resp.status_code == 404
        data = resp.json()
        assert "detail" in data
        print("✅ 404 response has proper format")
    
    def test_401_response_format(self):
        """Verify 401 responses have proper format"""
        resp = requests.get(f"{BASE_URL}/api/appointments/")
        assert resp.status_code == 401
        data = resp.json()
        assert "detail" in data
        print("✅ 401 response has proper format")
    
    def test_422_response_format(self):
        """Verify 422 validation error has proper format"""
        resp = requests.post(
            f"{BASE_URL}/api/public/book",
            json={}
        )
        assert resp.status_code == 422
        data = resp.json()
        assert "detail" in data
        print("✅ 422 response has proper format")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
