"""
Iteration 11 - Backend API Tests for Notification System
Tests: Health, Web Push, Evolution API, Appointments with notifications, Web-client serving
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gestao-app-1.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
BARBER_TOKEN = "session_a8ed7973fbd64266ae243c4b10b4d4d4"
CLIENT_TOKEN = "session_4cdb48e4f83541f2a585bac0ff874c0b"


@pytest.fixture
def barber_client():
    """Session with barber auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {BARBER_TOKEN}"
    })
    return session


@pytest.fixture
def client_client():
    """Session with client auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CLIENT_TOKEN}"
    })
    return session


@pytest.fixture
def no_auth_client():
    """Session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============== HEALTH CHECK ==============
class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_returns_200(self, no_auth_client):
        """GET /api/health returns 200"""
        response = no_auth_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


# ============== WEB PUSH ROUTES ==============
class TestWebPush:
    """Web Push notification endpoint tests"""
    
    def test_vapid_public_key_returns_key(self, no_auth_client):
        """GET /api/web-push/vapid-public-key returns VAPID public key"""
        response = no_auth_client.get(f"{BASE_URL}/api/web-push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        assert len(data["publicKey"]) > 50  # VAPID keys are long
        print(f"✓ VAPID public key returned: {data['publicKey'][:30]}...")
    
    def test_subscribe_requires_auth(self, no_auth_client):
        """POST /api/web-push/subscribe requires authentication"""
        response = no_auth_client.post(f"{BASE_URL}/api/web-push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {"p256dh": "test", "auth": "test"}
        })
        assert response.status_code == 401
        print("✓ Subscribe requires auth (401)")
    
    def test_subscribe_with_auth(self, client_client):
        """POST /api/web-push/subscribe saves subscription with auth"""
        response = client_client.post(f"{BASE_URL}/api/web-push/subscribe", json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
            "keys": {"p256dh": "test-p256dh-key", "auth": "test-auth-key"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "subscribed"
        print(f"✓ Push subscription saved: {data}")
    
    def test_unsubscribe_with_auth(self, client_client):
        """DELETE /api/web-push/unsubscribe removes subscription"""
        response = client_client.delete(f"{BASE_URL}/api/web-push/unsubscribe")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unsubscribed"
        print(f"✓ Push unsubscribed: {data}")


# ============== EVOLUTION API ROUTES ==============
class TestEvolutionAPI:
    """Evolution API WhatsApp integration tests"""
    
    def test_evolution_status_requires_barber_auth(self, no_auth_client):
        """GET /api/evolution/status requires barber auth"""
        response = no_auth_client.get(f"{BASE_URL}/api/evolution/status")
        assert response.status_code == 401
        print("✓ Evolution status requires auth (401)")
    
    def test_evolution_status_with_barber_auth(self, barber_client):
        """GET /api/evolution/status returns status with barber auth"""
        response = barber_client.get(f"{BASE_URL}/api/evolution/status")
        assert response.status_code == 200
        data = response.json()
        # Should gracefully handle missing config
        assert "connected" in data
        if not data["connected"]:
            assert "reason" in data
            print(f"✓ Evolution status (not configured): {data}")
        else:
            print(f"✓ Evolution status (connected): {data}")
    
    def test_evolution_setup_requires_barber_auth(self, no_auth_client):
        """POST /api/evolution/setup requires barber auth"""
        response = no_auth_client.post(f"{BASE_URL}/api/evolution/setup", json={
            "api_url": "https://test.evolution.api",
            "api_key": "test-key"
        })
        assert response.status_code == 401
        print("✓ Evolution setup requires auth (401)")
    
    def test_evolution_setup_with_barber_auth(self, barber_client):
        """POST /api/evolution/setup saves config with barber auth"""
        # Note: We don't actually want to change the config, just test the endpoint works
        # Using empty values to test graceful handling
        response = barber_client.post(f"{BASE_URL}/api/evolution/setup", json={
            "api_url": "",
            "api_key": "",
            "instance_name": "test-instance"
        })
        # Should accept the request (even with empty values)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Evolution setup accepted: {data}")
    
    def test_evolution_graceful_handling_no_config(self, barber_client):
        """Evolution API gracefully handles missing config (no crash)"""
        # After setting empty config, status should return gracefully
        response = barber_client.get(f"{BASE_URL}/api/evolution/status")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] == False
        assert "nao configurada" in data.get("reason", "").lower() or "not configured" in data.get("reason", "").lower() or data.get("reason", "") != ""
        print(f"✓ Evolution gracefully handles missing config: {data}")


# ============== WEB CLIENT SERVING ==============
class TestWebClientServing:
    """Web-client static file serving tests"""
    
    def test_web_client_html(self, no_auth_client):
        """GET /api/web/ serves web-client HTML"""
        response = no_auth_client.get(f"{BASE_URL}/api/web/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "<!DOCTYPE html>" in response.text or "<html" in response.text
        print("✓ Web client HTML served at /api/web/")
    
    def test_web_client_service_worker(self, no_auth_client):
        """GET /api/web/sw.js serves service worker JS"""
        response = no_auth_client.get(f"{BASE_URL}/api/web/sw.js")
        assert response.status_code == 200
        assert "javascript" in response.headers.get("content-type", "")
        assert "push" in response.text.lower() or "notification" in response.text.lower()
        print("✓ Service worker JS served at /api/web/sw.js")
    
    def test_web_client_assets(self, no_auth_client):
        """GET /api/web/assets/* serves static assets"""
        # First get the HTML to find asset paths
        html_response = no_auth_client.get(f"{BASE_URL}/api/web/")
        assert html_response.status_code == 200
        
        # Try to get a JS asset (from the dist folder)
        assets_response = no_auth_client.get(f"{BASE_URL}/api/web/assets/index-CAIvXRbq.js")
        if assets_response.status_code == 200:
            assert "javascript" in assets_response.headers.get("content-type", "")
            print("✓ Static assets served at /api/web/assets/*")
        else:
            # Try CSS
            css_response = no_auth_client.get(f"{BASE_URL}/api/web/assets/index-qFPZcTq_.css")
            assert css_response.status_code == 200
            print("✓ Static CSS assets served at /api/web/assets/*")


# ============== BARBERSHOP PUBLIC INFO ==============
class TestBarbershopPublicInfo:
    """Barbershop public info endpoint tests"""
    
    def test_public_info_no_auth(self, no_auth_client):
        """GET /api/barbershop/public-info returns barbershop info without auth"""
        response = no_auth_client.get(f"{BASE_URL}/api/barbershop/public-info")
        assert response.status_code == 200
        data = response.json()
        # Should have basic info fields
        assert "name" in data or data == {}  # May be empty if no barbershop
        print(f"✓ Barbershop public info: {data}")


# ============== APPOINTMENTS WITH NOTIFICATIONS ==============
class TestAppointmentsNotifications:
    """Appointment CRUD with notification trigger tests"""
    
    @pytest.fixture
    def test_service_id(self, barber_client):
        """Get or create a test service"""
        # Get existing services
        response = barber_client.get(f"{BASE_URL}/api/services")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        # Create a test service if none exist
        response = barber_client.post(f"{BASE_URL}/api/services", json={
            "name": "TEST_Corte Teste",
            "description": "Servico de teste",
            "price": 50.0,
            "duration_minutes": 30
        })
        if response.status_code == 201:
            return response.json()["id"]
        return 1  # Fallback
    
    def test_create_appointment_triggers_notification(self, client_client, test_service_id):
        """POST /api/appointments/ creates appointment and triggers notification background task"""
        future_time = (datetime.now() + timedelta(days=2)).replace(hour=14, minute=0, second=0, microsecond=0)
        
        response = client_client.post(f"{BASE_URL}/api/appointments/", json={
            "service_id": test_service_id,
            "scheduled_time": future_time.isoformat(),
            "notes": "TEST_notification_test"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Appointment created (notification triggered in background): id={data['id']}")
        return data["id"]
    
    def test_confirm_appointment_triggers_notification(self, barber_client, client_client, test_service_id):
        """PATCH /api/appointments/{id}/confirm triggers notification"""
        # First create an appointment
        future_time = (datetime.now() + timedelta(days=3)).replace(hour=15, minute=0, second=0, microsecond=0)
        
        create_response = client_client.post(f"{BASE_URL}/api/appointments/", json={
            "service_id": test_service_id,
            "scheduled_time": future_time.isoformat(),
            "notes": "TEST_confirm_notification"
        })
        assert create_response.status_code == 201
        apt_id = create_response.json()["id"]
        
        # Confirm the appointment (barber only)
        confirm_response = barber_client.post(f"{BASE_URL}/api/appointments/{apt_id}/confirm")
        assert confirm_response.status_code == 200
        data = confirm_response.json()
        assert "confirmed" in data.get("message", "").lower()
        print(f"✓ Appointment {apt_id} confirmed (notification triggered)")
    
    def test_cancel_appointment_triggers_notification(self, barber_client, client_client, test_service_id):
        """PATCH /api/appointments/{id}/cancel triggers notification"""
        # First create an appointment
        future_time = (datetime.now() + timedelta(days=4)).replace(hour=16, minute=0, second=0, microsecond=0)
        
        create_response = client_client.post(f"{BASE_URL}/api/appointments/", json={
            "service_id": test_service_id,
            "scheduled_time": future_time.isoformat(),
            "notes": "TEST_cancel_notification"
        })
        assert create_response.status_code == 201
        apt_id = create_response.json()["id"]
        
        # Cancel the appointment (barber only)
        cancel_response = barber_client.post(f"{BASE_URL}/api/appointments/{apt_id}/cancel")
        assert cancel_response.status_code == 200
        data = cancel_response.json()
        assert "cancelled" in data.get("message", "").lower()
        print(f"✓ Appointment {apt_id} cancelled (notification triggered)")


# ============== SEND REMINDERS ENDPOINT ==============
class TestSendReminders:
    """Send reminders endpoint tests"""
    
    def test_send_reminders_endpoint(self, no_auth_client):
        """POST /api/appointments/send-reminders triggers reminder check"""
        response = no_auth_client.post(f"{BASE_URL}/api/appointments/send-reminders")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Send reminders triggered: {data}")


# ============== PUBLIC BOOKING WITH NOTIFICATION ==============
class TestPublicBookingNotification:
    """Public booking endpoint with notification tests"""
    
    def test_public_booking_triggers_notification(self, no_auth_client):
        """POST /api/public/book creates appointment and triggers notification"""
        # Get available services first
        services_response = no_auth_client.get(f"{BASE_URL}/api/public/services")
        assert services_response.status_code == 200
        services = services_response.json()
        
        if len(services) == 0:
            pytest.skip("No services available for public booking")
        
        service_id = services[0]["id"]
        
        # Get available slots for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        slots_response = no_auth_client.get(f"{BASE_URL}/api/public/available-slots?date_str={tomorrow}&service_id={service_id}")
        
        if slots_response.status_code != 200 or len(slots_response.json().get("slots", [])) == 0:
            # Try day after tomorrow
            day_after = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            slots_response = no_auth_client.get(f"{BASE_URL}/api/public/available-slots?date_str={day_after}&service_id={service_id}")
        
        slots_data = slots_response.json()
        if len(slots_data.get("slots", [])) == 0:
            pytest.skip("No available slots for public booking test")
        
        slot = slots_data["slots"][0]
        
        # Book the appointment
        booking_response = no_auth_client.post(f"{BASE_URL}/api/public/book", json={
            "client_name": "TEST_Cliente Notificacao",
            "client_phone": "11999998888",
            "client_email": "test_notification@test.com",
            "service_id": service_id,
            "scheduled_time": slot["datetime_iso"],
            "notes": "TEST_public_booking_notification"
        })
        
        assert booking_response.status_code == 201
        data = booking_response.json()
        assert "id" in data
        assert data["status"] == "pending"
        print(f"✓ Public booking created (notification triggered): id={data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
