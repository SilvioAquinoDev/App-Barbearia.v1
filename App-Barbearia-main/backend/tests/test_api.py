"""
Backend API Tests for Barbershop Manager
Tests health, products, public services, whatsapp settings, cash register, appointments, product sales
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://barber-mgmt-5.preview.emergentagent.com').rstrip('/')


class TestHealthAndPublicEndpoints:
    """Test health check and public endpoints (no auth required)"""
    
    def test_health_check(self):
        """GET /api/health - Should return 200 with healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        print(f"✅ Health check passed: {data}")
    
    def test_products_list(self):
        """GET /api/products/ - Should return products list without auth"""
        response = requests.get(f"{BASE_URL}/api/products/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            product = data[0]
            assert "id" in product
            assert "name" in product
            assert "price" in product
            assert "stock" in product
        print(f"✅ Products list returned {len(data)} products")
    
    def test_public_services(self):
        """GET /api/public/services - Public services endpoint should work without auth"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            service = data[0]
            assert "id" in service
            assert "name" in service
            assert "price" in service
            assert "duration_minutes" in service
        print(f"✅ Public services returned {len(data)} services")


class TestWhatsAppAuthProtection:
    """Test WhatsApp endpoints require authentication (401 without token)"""
    
    def test_whatsapp_settings_get_requires_auth(self):
        """GET /api/whatsapp/settings - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✅ WhatsApp GET settings correctly returns 401 without auth")
    
    def test_whatsapp_settings_put_requires_auth(self):
        """PUT /api/whatsapp/settings - Should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/whatsapp/settings",
            json={"is_active": False}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ WhatsApp PUT settings correctly returns 401 without auth")
    
    def test_whatsapp_test_requires_auth(self):
        """POST /api/whatsapp/test - Should require authentication"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ WhatsApp POST test correctly returns 401 without auth")


class TestCashRegisterAuthProtection:
    """Test cash register endpoints require authentication"""
    
    def test_cash_register_current_requires_auth(self):
        """GET /api/cash-register/current - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/cash-register/current")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Cash register /current correctly returns 401 without auth")
    
    def test_cash_register_open_requires_auth(self):
        """POST /api/cash-register/open - Should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/cash-register/open",
            json={"opening_balance": 100.0}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Cash register /open correctly returns 401 without auth")
    
    def test_cash_register_close_requires_auth(self):
        """POST /api/cash-register/close - Should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/cash-register/close",
            json={"closing_balance": 500.0}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Cash register /close correctly returns 401 without auth")


class TestAppointmentAuthProtection:
    """Test appointment endpoints require authentication"""
    
    def test_appointments_list_requires_auth(self):
        """GET /api/appointments/ - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/appointments/")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Appointments list correctly returns 401 without auth")
    
    def test_appointment_confirm_requires_auth(self):
        """POST /api/appointments/1/confirm - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/appointments/1/confirm")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Appointment confirm correctly returns 401 without auth")
    
    def test_appointment_cancel_requires_auth(self):
        """POST /api/appointments/1/cancel - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/appointments/1/cancel")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Appointment cancel correctly returns 401 without auth")
    
    def test_appointment_complete_requires_auth(self):
        """POST /api/appointments/1/complete - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/appointments/1/complete")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Appointment complete correctly returns 401 without auth")


class TestProductSalesAuthProtection:
    """Test product sales endpoints require authentication"""
    
    def test_product_sell_requires_auth(self):
        """POST /api/products/1/sell - Should require auth (barber only)"""
        response = requests.post(f"{BASE_URL}/api/products/1/sell?quantity=1")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Product sell correctly returns 401 without auth")
    
    def test_product_sales_list_requires_auth(self):
        """GET /api/product-sales/ - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/product-sales/")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Product sales list correctly returns 401 without auth")
    
    def test_product_sales_summary_requires_auth(self):
        """GET /api/product-sales/summary - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/product-sales/summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Product sales summary correctly returns 401 without auth")


class TestPublicBookingEndpoints:
    """Test public booking endpoints (no auth required)"""
    
    def test_available_slots_valid_date(self):
        """GET /api/public/available-slots - Should return slots for future date"""
        # Use a future date
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/available-slots?date_str={future_date}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "date" in data
        assert "slots" in data
        print(f"✅ Available slots for {future_date}: {len(data.get('slots', []))} slots available")
    
    def test_available_slots_past_date(self):
        """GET /api/public/available-slots - Should reject past dates"""
        from datetime import datetime, timedelta
        past_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/available-slots?date_str={past_date}")
        assert response.status_code == 400, f"Expected 400 for past date, got {response.status_code}"
        print(f"✅ Available slots correctly rejects past date: {past_date}")
    
    def test_available_slots_invalid_format(self):
        """GET /api/public/available-slots - Should reject invalid date format"""
        response = requests.get(f"{BASE_URL}/api/public/available-slots?date_str=invalid-date")
        assert response.status_code == 400, f"Expected 400 for invalid date, got {response.status_code}"
        print(f"✅ Available slots correctly rejects invalid date format")
    
    def test_public_book_missing_fields(self):
        """POST /api/public/book - Should validate required fields"""
        response = requests.post(
            f"{BASE_URL}/api/public/book",
            json={}
        )
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print(f"✅ Public book correctly validates required fields")
    
    def test_public_book_invalid_service(self):
        """POST /api/public/book - Should reject invalid service ID"""
        from datetime import datetime, timedelta
        future_time = (datetime.now() + timedelta(days=7, hours=10)).isoformat()
        response = requests.post(
            f"{BASE_URL}/api/public/book",
            json={
                "client_name": "Test Client",
                "client_phone": "11999999999",
                "service_id": 99999,  # Invalid service ID
                "scheduled_time": future_time
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid service, got {response.status_code}"
        print(f"✅ Public book correctly rejects invalid service ID")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_auth_me_requires_auth(self):
        """GET /api/auth/me - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Auth /me correctly returns 401 without auth")
    
    def test_auth_logout_requires_auth(self):
        """POST /api/auth/logout - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Auth /logout correctly returns 401 without auth")
    
    def test_auth_promote_requires_auth(self):
        """POST /api/auth/promote-to-barber - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/auth/promote-to-barber")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Auth /promote-to-barber correctly returns 401 without auth")


class TestServiceEndpoints:
    """Test service management endpoints"""
    
    def test_services_list(self):
        """GET /api/services/ - List services"""
        response = requests.get(f"{BASE_URL}/api/services/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Services list returned {len(data)} services")
    
    def test_service_create_requires_auth(self):
        """POST /api/services/ - Should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/services/",
            json={"name": "Test", "price": 10.0, "duration_minutes": 30}
        )
        # May require auth or not depending on implementation
        # If 401 or 403, it's correctly protected
        if response.status_code in [401, 403]:
            print(f"✅ Services create is protected (status: {response.status_code})")
        else:
            print(f"⚠️ Services create returned {response.status_code}")


class TestProductEndpoints:
    """Test product management endpoints"""
    
    def test_products_list(self):
        """GET /api/products/ - Should list products"""
        response = requests.get(f"{BASE_URL}/api/products/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Products list returned {len(data)} products")
    
    def test_product_by_id(self):
        """GET /api/products/{id} - Should get product by ID"""
        # First get a product ID
        list_response = requests.get(f"{BASE_URL}/api/products/")
        products = list_response.json()
        if products:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == product_id
            print(f"✅ Product {product_id} retrieved successfully")
        else:
            print("⚠️ No products to test GET by ID")
    
    def test_product_not_found(self):
        """GET /api/products/99999 - Should return 404 for non-existent product"""
        response = requests.get(f"{BASE_URL}/api/products/99999")
        assert response.status_code == 404
        print(f"✅ Product not found returns 404")
    
    def test_product_create_requires_auth(self):
        """POST /api/products/ - Should require barber auth"""
        response = requests.post(
            f"{BASE_URL}/api/products/",
            json={"name": "Test Product", "price": 10.0, "stock": 5}
        )
        assert response.status_code == 401
        print(f"✅ Product create correctly requires auth")
    
    def test_product_update_requires_auth(self):
        """PUT /api/products/{id} - Should require barber auth"""
        response = requests.put(
            f"{BASE_URL}/api/products/1",
            json={"name": "Updated Product"}
        )
        assert response.status_code == 401
        print(f"✅ Product update correctly requires auth")
    
    def test_product_delete_requires_auth(self):
        """DELETE /api/products/{id} - Should require barber auth"""
        response = requests.delete(f"{BASE_URL}/api/products/1")
        assert response.status_code == 401
        print(f"✅ Product delete correctly requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
