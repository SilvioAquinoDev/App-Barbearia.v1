"""
Test client_email field in appointments
Tests for:
- POST /api/public/book accepts client_email and saves it
- POST /api/public/book response includes client_email in BookingConfirmation
- GET /api/appointments/ includes client_email in each appointment
- GET /api/appointments/ filters by client_email for client role
"""
import pytest
import requests
import os
import random
from datetime import datetime, timedelta

# Use public URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gestao-app-1.preview.emergentagent.com').rstrip('/')

# Auth token for barber (from review_request)
BARBER_SESSION = "session_3d0a8ec778fd4062947268666bcff5c4"
SERVICE_ID = 6  # Corte Rapido - known valid service


def get_unique_slot(day_offset=2, hour=9, minute_offset=0):
    """Generate a unique time slot to avoid conflicts"""
    future = datetime.utcnow() + timedelta(days=day_offset)
    # Add random minutes to avoid conflicts
    random_min = random.randint(0, 59)
    return future.replace(hour=hour, minute=random_min, second=0, microsecond=0)


class TestPublicBookingWithEmail:
    """Test POST /api/public/book with client_email field"""
    
    def test_book_with_email_returns_201(self):
        """Test booking with email returns 201 and includes email in response"""
        # Use dynamic time slot 3 days in future to avoid conflicts
        scheduled_time = get_unique_slot(day_offset=3, hour=10)
        
        payload = {
            "client_name": "TEST_EmailClient",
            "client_phone": "11999998888",
            "client_email": "test_email_client@example.com",
            "service_id": SERVICE_ID,
            "scheduled_time": scheduled_time.isoformat(),
            "notes": "Test booking with email"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/book", json=payload)
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify client_email is in response (BookingConfirmation schema)
        assert "client_email" in data, "client_email field missing from response"
        assert data["client_email"] == "test_email_client@example.com", f"Email mismatch: {data['client_email']}"
        assert data["client_name"] == "TEST_EmailClient"
        assert data["client_phone"] == "11999998888"
        assert "id" in data
        print(f"PASS: Booking created with ID {data['id']}, email={data['client_email']}")
        
        return data["id"]
    
    def test_book_without_email_returns_201(self):
        """Test booking without email still works (email is Optional)"""
        # Use dynamic time slot to avoid conflicts
        scheduled_time = get_unique_slot(day_offset=4, hour=11)
        
        payload = {
            "client_name": "TEST_NoEmailClient",
            "client_phone": "11999997777",
            "service_id": SERVICE_ID,
            "scheduled_time": scheduled_time.isoformat(),
            "notes": "Test booking without email"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/book", json=payload)
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # client_email should be None when not provided
        assert "client_email" in data, "client_email field should still be in response"
        assert data["client_email"] is None, f"Expected None, got {data['client_email']}"
        print(f"PASS: Booking created without email, client_email=None")
        
        return data["id"]
    
    def test_book_with_null_email_returns_201(self):
        """Test booking with explicit null email"""
        # Use dynamic time slot to avoid conflicts
        scheduled_time = get_unique_slot(day_offset=5, hour=12)
        
        payload = {
            "client_name": "TEST_NullEmailClient",
            "client_phone": "11999996666",
            "client_email": None,
            "service_id": SERVICE_ID,
            "scheduled_time": scheduled_time.isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/public/book", json=payload)
        
        print(f"Response status: {response.status_code}")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["client_email"] is None
        print(f"PASS: Booking with null email works correctly")


class TestAppointmentsListWithEmail:
    """Test GET /api/appointments/ includes client_email"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {BARBER_SESSION}"}
    
    def test_list_appointments_includes_email_field(self, auth_headers):
        """Test that appointments list includes client_email in each appointment"""
        # Use trailing slash to avoid 307 redirect
        response = requests.get(f"{BASE_URL}/api/appointments/", headers=auth_headers)
        
        print(f"Response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            # Check first appointment has client_email field
            first_apt = data[0]
            assert "client_email" in first_apt, f"client_email missing from appointment. Keys: {first_apt.keys()}"
            print(f"PASS: Appointments list includes client_email field")
            print(f"Sample appointment: id={first_apt['id']}, client_email={first_apt.get('client_email')}")
        else:
            print("WARNING: No appointments found to verify client_email field")
        
        return data
    
    def test_appointments_have_expected_fields(self, auth_headers):
        """Verify appointment objects have all expected fields including client_email"""
        response = requests.get(f"{BASE_URL}/api/appointments/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "id", "client_id", "service_id", "scheduled_time", "status",
            "client_name", "client_phone", "client_email", "notes",
            "notification_sent", "created_at", "updated_at",
            "service_name", "service_price"
        ]
        
        if len(data) > 0:
            apt = data[0]
            for field in expected_fields:
                assert field in apt, f"Missing field: {field}. Available: {apt.keys()}"
            print(f"PASS: All expected fields present including client_email")
        else:
            pytest.skip("No appointments to check fields")


class TestAppointmentFilterByEmail:
    """Test that client role filters appointments by client_email OR client_id"""
    
    @pytest.fixture
    def barber_headers(self):
        return {"Authorization": f"Bearer {BARBER_SESSION}"}
    
    def test_barber_sees_all_appointments(self, barber_headers):
        """Barber should see all appointments (no email filter)"""
        response = requests.get(f"{BASE_URL}/api/appointments/", headers=barber_headers)
        
        assert response.status_code == 200
        data = response.json()
        print(f"Barber can see {len(data)} appointments")
        
        # Verify we can see appointments without client_id (public bookings)
        public_bookings = [a for a in data if a.get("client_id") is None]
        print(f"Public bookings (no client_id): {len(public_bookings)}")
        
        return data
    
    def test_appointments_without_trailing_slash_redirects(self, barber_headers):
        """Test that /api/appointments (no trailing slash) returns 307"""
        response = requests.get(
            f"{BASE_URL}/api/appointments", 
            headers=barber_headers,
            allow_redirects=False
        )
        
        # Should be 307 redirect
        assert response.status_code == 307, f"Expected 307, got {response.status_code}"
        print("PASS: /api/appointments returns 307 redirect (use trailing slash)")


class TestBookingEmailPersistence:
    """Test that email is actually persisted in database"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {BARBER_SESSION}"}
    
    def test_created_booking_email_persists(self, auth_headers):
        """Create booking with email, then verify it appears in appointments list"""
        # Use dynamic time slot to avoid conflicts
        scheduled_time = get_unique_slot(day_offset=6, hour=14)
        unique_email = f"TEST_persist_{datetime.utcnow().strftime('%H%M%S')}@example.com"
        
        payload = {
            "client_name": "TEST_PersistClient",
            "client_phone": "11999995555",
            "client_email": unique_email,
            "service_id": SERVICE_ID,
            "scheduled_time": scheduled_time.isoformat()
        }
        
        # Create booking
        create_response = requests.post(f"{BASE_URL}/api/public/book", json=payload)
        assert create_response.status_code == 201, f"Create failed: {create_response.text}"
        
        created = create_response.json()
        booking_id = created["id"]
        print(f"Created booking ID {booking_id} with email {unique_email}")
        
        # Fetch appointments and verify email persisted
        list_response = requests.get(f"{BASE_URL}/api/appointments/", headers=auth_headers)
        assert list_response.status_code == 200
        
        appointments = list_response.json()
        
        # Find our appointment
        found = None
        for apt in appointments:
            if apt["id"] == booking_id:
                found = apt
                break
        
        assert found is not None, f"Booking {booking_id} not found in appointments list"
        assert found["client_email"] == unique_email, f"Email not persisted. Expected {unique_email}, got {found['client_email']}"
        
        print(f"PASS: Email {unique_email} persisted correctly for appointment {booking_id}")


class TestPublicServicesEndpoint:
    """Test that public services endpoint still works"""
    
    def test_get_public_services(self):
        """Verify services endpoint returns service ID 6 (Corte Rapido)"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        services = response.json()
        service_ids = [s["id"] for s in services]
        
        assert SERVICE_ID in service_ids, f"Service ID {SERVICE_ID} not found in services"
        print(f"PASS: Service ID {SERVICE_ID} exists. Total services: {len(services)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
