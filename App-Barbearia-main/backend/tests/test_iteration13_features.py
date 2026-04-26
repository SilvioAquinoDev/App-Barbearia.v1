"""
Iteration 13 - Backend Tests for New Features:
1. Google OAuth endpoints (GET /api/auth/google-client-id, POST /api/auth/google)
2. PUT /api/clients/{user_id} - Update client info (requires barber auth)
3. GET /api/reports/financial-summary - Enhanced financial reports (requires barber auth)
4. Mercado Pago Pix payment endpoints (graceful error handling when MP_TOKEN empty)
5. Web-client serving (GET /api/web/, /api/web/login, /api/web/pagamento-pix)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gestao-app-1.preview.emergentagent.com")
BASE_URL = BASE_URL.rstrip("/")

# Test credentials from test_credentials.md
BARBER_TOKEN = "session_test_barber_62d082eb"
CLIENT_TOKEN = "session_test_client_68f69fcd"
TEST_CLIENT_USER_ID = "user_e8d1b1eb2bea"


class TestHealthCheck:
    """Basic health check"""

    def test_health_returns_200(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check: {data}")


class TestGoogleOAuthEndpoints:
    """Google OAuth endpoints - Direct Google Sign-In"""

    def test_get_google_client_id_returns_clientid_field(self):
        """GET /api/auth/google-client-id returns clientId field"""
        response = requests.get(f"{BASE_URL}/api/auth/google-client-id")
        assert response.status_code == 200
        data = response.json()
        assert "clientId" in data
        # GOOGLE_CLIENT_ID is empty in .env, so clientId should be empty string
        print(f"✓ Google Client ID: clientId='{data['clientId']}' (empty is expected)")

    def test_google_auth_accepts_credential_returns_error_for_invalid(self):
        """POST /api/auth/google accepts credential and returns error for invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={"credential": "invalid_token_12345"}
        )
        # Should return 401 for invalid token
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalido" in data["detail"].lower() or "invalid" in data["detail"].lower()
        print(f"✓ Google auth invalid token: {response.status_code} - {data}")


class TestClientEndpoints:
    """Client CRUD endpoints with PUT for editing"""

    def test_put_client_updates_info_with_barber_auth(self):
        """PUT /api/clients/{user_id} updates client info (requires barber auth)"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.put(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_USER_ID}",
            headers=headers,
            json={
                "name": "Test Client Updated",
                "email": "silvio.aquinodev@gmail.com",
                "phone": "11999999999"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "sucesso" in data["message"].lower()
        print(f"✓ PUT client: {data}")

    def test_put_client_requires_auth(self):
        """PUT /api/clients/{user_id} without auth returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_USER_ID}",
            json={"name": "Test"}
        )
        assert response.status_code == 401
        print(f"✓ PUT client without auth: {response.status_code}")

    def test_put_client_not_found(self):
        """PUT /api/clients/{user_id} with invalid user_id returns 404"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.put(
            f"{BASE_URL}/api/clients/invalid_user_id_12345",
            headers=headers,
            json={"name": "Test"}
        )
        assert response.status_code == 404
        print(f"✓ PUT client not found: {response.status_code}")


class TestFinancialReports:
    """Enhanced financial reports endpoints"""

    def test_financial_summary_returns_data_with_barber_auth(self):
        """GET /api/reports/financial-summary returns data (requires barber auth)"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "period_months" in data
        assert "total_revenue" in data
        assert "total_service_revenue" in data
        assert "total_product_revenue" in data
        assert "average_ticket" in data
        assert "this_month" in data
        assert "monthly_services" in data
        assert "monthly_products" in data
        assert "top_services" in data
        print(f"✓ Financial summary: total_revenue={data['total_revenue']}, avg_ticket={data['average_ticket']}")

    def test_financial_summary_requires_auth(self):
        """GET /api/reports/financial-summary without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary")
        assert response.status_code == 401
        print(f"✓ Financial summary without auth: {response.status_code}")

    def test_financial_summary_requires_barber_role(self):
        """GET /api/reports/financial-summary with client auth returns 403"""
        headers = {"Authorization": f"Bearer {CLIENT_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/reports/financial-summary", headers=headers)
        assert response.status_code == 403
        print(f"✓ Financial summary with client auth: {response.status_code}")


class TestMercadoPagoPayments:
    """Mercado Pago Pix payment endpoints - graceful error handling when MP_TOKEN empty"""

    def test_create_pix_returns_error_when_mp_token_not_set(self):
        """POST /api/payments/create-pix returns error when MERCADOPAGO_TOKEN not set"""
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

    def test_create_pix_requires_auth(self):
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

    def test_webhook_accepts_payload(self):
        """POST /api/payments/webhook/mercadopago accepts webhook"""
        response = requests.post(
            f"{BASE_URL}/api/payments/webhook/mercadopago",
            json={"type": "payment", "data": {"id": "123"}}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "received"
        print(f"✓ Webhook: {data}")

    def test_webhook_handles_invalid_json(self):
        """POST /api/payments/webhook/mercadopago handles invalid JSON gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/payments/webhook/mercadopago",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ignored"
        print(f"✓ Webhook invalid JSON: {data}")


class TestWebClientServing:
    """Web-client serving endpoints"""

    def test_web_root_serves_html(self):
        """GET /api/web/ serves web-client HTML"""
        response = requests.get(f"{BASE_URL}/api/web/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "<!DOCTYPE html>" in response.text
        print(f"✓ Web root serves HTML")

    def test_web_login_page_loads(self):
        """GET /api/web/login page loads with Google login button"""
        response = requests.get(f"{BASE_URL}/api/web/login")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Web login page loads")

    def test_web_pix_page_loads(self):
        """GET /api/web/pagamento-pix page loads with Pix payment UI"""
        response = requests.get(f"{BASE_URL}/api/web/pagamento-pix")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Web Pix page loads")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""

    def test_auth_me_returns_user(self):
        """GET /api/auth/me returns user info"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data or "email" in data
        print(f"✓ Auth me: {data.get('email', data.get('user_id'))}")

    def test_services_list(self):
        """GET /api/services/ returns services list"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/services/", headers=headers)
        assert response.status_code == 200
        print(f"✓ Services list: {len(response.json())} services")

    def test_clients_list(self):
        """GET /api/clients/ returns clients list"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/clients/", headers=headers)
        assert response.status_code == 200
        print(f"✓ Clients list: {len(response.json())} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
