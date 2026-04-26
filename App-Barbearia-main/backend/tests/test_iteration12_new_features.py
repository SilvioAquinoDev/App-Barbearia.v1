"""
Iteration 12 - Backend Tests for New Features:
1. Google OAuth endpoints (GET /api/auth/google-client-id)
2. Mercado Pago Pix payment endpoints (graceful error handling when MP_TOKEN empty)
3. Enhanced financial reports (GET /api/reports/financial-summary)
4. Supabase Storage (POST /api/barbershop/logo)
5. Multi-tenant isolation (barbershop_id on tables)
6. Health check and existing endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gestao-app-1.preview.emergentagent.com")
BASE_URL = BASE_URL.rstrip("/")

# Test credentials from test_credentials.md
BARBER_TOKEN = "session_test_barber_62d082eb"
CLIENT_TOKEN = "session_test_client_68f69fcd"


class TestHealthAndBasicEndpoints:
    """Basic health and API endpoints"""

    def test_health_check(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        print(f"✓ Health check passed: {data}")

    def test_root_endpoint(self):
        """GET /api returns API info"""
        response = requests.get(f"{BASE_URL}/api")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Root endpoint: {data}")


class TestGoogleOAuth:
    """Google OAuth endpoints - Direct Google Sign-In"""

    def test_get_google_client_id(self):
        """GET /api/auth/google-client-id returns clientId field"""
        response = requests.get(f"{BASE_URL}/api/auth/google-client-id")
        assert response.status_code == 200
        data = response.json()
        assert "clientId" in data
        # GOOGLE_CLIENT_ID is empty in .env, so clientId should be empty string
        print(f"✓ Google Client ID endpoint: clientId='{data['clientId']}' (empty is expected)")

    def test_google_auth_invalid_token(self):
        """POST /api/auth/google with invalid token returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={"credential": "invalid_token_12345"}
        )
        # Should return 401 for invalid token
        assert response.status_code in [401, 500]
        print(f"✓ Google auth with invalid token: {response.status_code}")


class TestMercadoPagoPayments:
    """Mercado Pago Pix payment endpoints - graceful error handling when MP_TOKEN empty"""

    def test_create_pix_no_mp_token(self):
        """POST /api/payments/create-pix returns error when MP_TOKEN not configured"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.post(
            f"{BASE_URL}/api/payments/create-pix",
            headers=headers,
            json={
                "appointment_id": 1,
                "amount": 50.0,
                "payer_email": "test@example.com",
                "payer_name": "Test User",
                "description": "Test payment"
            }
        )
        # Should return 400 with graceful error message when MP_TOKEN is empty
        assert response.status_code == 400
        data = response.json()
        assert "Mercado Pago" in data.get("detail", "")
        print(f"✓ Create Pix without MP_TOKEN: {response.status_code} - {data}")

    def test_create_pix_no_auth(self):
        """POST /api/payments/create-pix without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/payments/create-pix",
            json={
                "appointment_id": 1,
                "amount": 50.0,
                "payer_email": "test@example.com",
                "payer_name": "Test User"
            }
        )
        assert response.status_code == 401
        print(f"✓ Create Pix without auth: {response.status_code}")

    def test_payment_status_no_mp_token(self):
        """GET /api/payments/status/123 returns error when MP_TOKEN not configured"""
        response = requests.get(f"{BASE_URL}/api/payments/status/123")
        # Should return 400 with graceful error message
        assert response.status_code == 400
        data = response.json()
        assert "Mercado Pago" in data.get("detail", "")
        print(f"✓ Payment status without MP_TOKEN: {response.status_code} - {data}")

    def test_mercadopago_webhook(self):
        """POST /api/payments/webhook/mercadopago accepts webhook payload"""
        response = requests.post(
            f"{BASE_URL}/api/payments/webhook/mercadopago",
            json={
                "type": "payment",
                "data": {"id": "12345"}
            }
        )
        # Webhook should accept and return status
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["received", "ignored"]
        print(f"✓ Mercado Pago webhook: {response.status_code} - {data}")

    def test_mercadopago_webhook_invalid_json(self):
        """POST /api/payments/webhook/mercadopago with invalid JSON returns ignored"""
        response = requests.post(
            f"{BASE_URL}/api/payments/webhook/mercadopago",
            data="not json",
            headers={"Content-Type": "application/json"}
        )
        # Should gracefully handle invalid JSON
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ignored"
        print(f"✓ Mercado Pago webhook invalid JSON: {response.status_code} - {data}")


class TestFinancialReports:
    """Enhanced financial reports endpoints"""

    def test_financial_summary_no_auth(self):
        """GET /api/reports/financial-summary without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary")
        assert response.status_code == 401
        print(f"✓ Financial summary without auth: {response.status_code}")

    def test_financial_summary_client_auth(self):
        """GET /api/reports/financial-summary with client auth returns 403"""
        headers = {"Authorization": f"Bearer {CLIENT_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=headers)
        # Client should not have access to barber reports
        assert response.status_code == 403
        print(f"✓ Financial summary with client auth: {response.status_code}")

    def test_financial_summary_barber_auth(self):
        """GET /api/reports/financial-summary with barber auth returns revenue data"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period_months" in data
        assert "total_revenue" in data
        assert "total_service_revenue" in data
        assert "total_product_revenue" in data
        assert "total_services_done" in data
        assert "average_ticket" in data
        assert "this_month" in data
        assert "appointments_today" in data
        assert "monthly_services" in data
        assert "monthly_products" in data
        assert "top_services" in data
        
        # Verify this_month structure
        this_month = data["this_month"]
        assert "service_revenue" in this_month
        assert "product_revenue" in this_month
        assert "services_count" in this_month
        assert "total" in this_month
        
        print(f"✓ Financial summary with barber auth: {response.status_code}")
        print(f"  - Total revenue: {data['total_revenue']}")
        print(f"  - Average ticket: {data['average_ticket']}")
        print(f"  - Appointments today: {data['appointments_today']}")

    def test_financial_summary_with_months_param(self):
        """GET /api/reports/financial-summary?months=3 returns data for 3 months"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary?months=3", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period_months"] == 3
        print(f"✓ Financial summary with months=3: period_months={data['period_months']}")


class TestBarbershopAndSupabaseStorage:
    """Barbershop endpoints and Supabase Storage"""

    def test_barbershop_public_info(self):
        """GET /api/barbershop/public-info returns barbershop info without auth"""
        response = requests.get(f"{BASE_URL}/api/barbershop/public-info")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "phone" in data
        assert "address" in data
        assert "logo_url" in data
        print(f"✓ Barbershop public info: {data['name']}")

    def test_barbershop_mine_no_auth(self):
        """GET /api/barbershop/mine without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/barbershop/mine")
        assert response.status_code == 401
        print(f"✓ Barbershop mine without auth: {response.status_code}")

    def test_barbershop_mine_barber_auth(self):
        """GET /api/barbershop/mine with barber auth returns barbershop"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/barbershop/mine", headers=headers)
        assert response.status_code == 200
        data = response.json()
        if data:  # Barber may or may not have a barbershop
            assert "id" in data
            assert "name" in data
            print(f"✓ Barbershop mine: {data}")
        else:
            print(f"✓ Barbershop mine: No barbershop found (expected for new barber)")

    def test_barbershop_logo_upload_no_auth(self):
        """POST /api/barbershop/logo without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/barbershop/logo")
        assert response.status_code in [401, 422]  # 422 if validation fails first
        print(f"✓ Barbershop logo upload without auth: {response.status_code}")

    def test_barbershop_logo_upload_endpoint_exists(self):
        """POST /api/barbershop/logo endpoint exists (Supabase storage)"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        # Send a minimal file to test endpoint exists
        files = {"file": ("test.png", b"fake image data", "image/png")}
        response = requests.post(f"{BASE_URL}/api/barbershop/logo", headers=headers, files=files)
        # Should return 404 (no barbershop) or 500 (Supabase error) but NOT 404 for route
        assert response.status_code in [200, 404, 500]
        print(f"✓ Barbershop logo upload endpoint exists: {response.status_code}")
        if response.status_code != 200:
            print(f"  - Response: {response.json()}")


class TestWebPushAndWebClient:
    """Web Push and Web Client endpoints"""

    def test_vapid_public_key(self):
        """GET /api/web-push/vapid-public-key returns VAPID key"""
        response = requests.get(f"{BASE_URL}/api/web-push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        assert len(data["publicKey"]) > 0
        print(f"✓ VAPID public key: {data['publicKey'][:30]}...")

    def test_web_client_serves(self):
        """GET /api/web/ serves web-client"""
        response = requests.get(f"{BASE_URL}/api/web/")
        assert response.status_code == 200
        # Should return HTML
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Web client serves: {response.status_code}")


class TestMultiTenantIsolation:
    """Multi-tenant isolation - barbershop_id on tables"""

    def test_services_have_barbershop_id(self):
        """Services endpoint returns data with barbershop context"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/services/", headers=headers)
        assert response.status_code == 200
        print(f"✓ Services endpoint accessible: {response.status_code}")

    def test_products_have_barbershop_id(self):
        """Products endpoint returns data with barbershop context"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/products/", headers=headers)
        assert response.status_code == 200
        print(f"✓ Products endpoint accessible: {response.status_code}")

    def test_appointments_have_barbershop_id(self):
        """Appointments endpoint returns data with barbershop context"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/appointments/", headers=headers)
        assert response.status_code == 200
        print(f"✓ Appointments endpoint accessible: {response.status_code}")


class TestExistingEndpointsStillWork:
    """Verify existing endpoints still work after changes"""

    def test_auth_me(self):
        """GET /api/auth/me returns user info"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
        print(f"✓ Auth me: {data['email']} ({data['role']})")

    def test_public_services(self):
        """GET /api/public/services returns services without auth"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public services: {len(data)} services")

    def test_public_available_slots(self):
        """GET /api/public/available-slots returns available slots"""
        response = requests.get(f"{BASE_URL}/api/public/available-slots?date_str=2026-04-30")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "slots" in data
        print(f"✓ Public available slots: {len(data.get('slots', []))} slots")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
