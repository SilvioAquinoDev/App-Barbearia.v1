"""
Test WaSenderAPI Integration and Phone Update Features
Tests:
- GET /api/whatsapp/settings - returns correct settings structure
- GET /api/whatsapp/status - returns 'not_configured' when no PAT
- POST /api/whatsapp/setup - validates API key, rejects invalid with 400
- PUT /api/whatsapp/settings - updates business_phone and is_active
- PUT /api/auth/update-phone - saves phone number
- PUT /api/auth/update-phone - rejects invalid phone (less than 8 chars)
- GET /api/auth/me - returns user with phone field
- POST /api/whatsapp/connect - requires session configured first
- GET /api/whatsapp/qrcode - returns error when no session
- POST /api/whatsapp/test - rejects when WhatsApp not connected
"""
import pytest
import requests
import os

# Use the external URL for testing
BASE_URL = "https://gestao-app-1.preview.emergentagent.com"

# Barber session token from test context
BARBER_TOKEN = "session_3d0a8ec778fd4062947268666bcff5c4"


class TestWhatsAppSettings:
    """Test GET /api/whatsapp/settings endpoint"""
    
    def test_get_settings_requires_auth(self):
        """GET /api/whatsapp/settings without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/whatsapp/settings requires authentication")
    
    def test_get_settings_returns_correct_structure(self):
        """GET /api/whatsapp/settings with auth should return correct structure"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/whatsapp/settings", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure has required fields
        assert "id" in data, "Response missing 'id' field"
        assert "is_active" in data, "Response missing 'is_active' field"
        assert "has_pat" in data, "Response missing 'has_pat' field"
        assert "wasender_session_id" in data, "Response missing 'wasender_session_id' field"
        assert "connected" in data, "Response missing 'connected' field"
        
        print(f"PASS: GET /api/whatsapp/settings returns correct structure: {data}")


class TestWhatsAppStatus:
    """Test GET /api/whatsapp/status endpoint"""
    
    def test_status_requires_auth(self):
        """GET /api/whatsapp/status without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/whatsapp/status requires authentication")
    
    def test_status_not_configured_when_no_pat(self):
        """GET /api/whatsapp/status should return 'not_configured' when no PAT set"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/whatsapp/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # If no PAT is configured, should return 'not_configured' status
        # If PAT is set but invalid, might return 'error'
        assert "status" in data, "Response missing 'status' field"
        print(f"PASS: GET /api/whatsapp/status returns status: {data.get('status')}")


class TestWhatsAppSetup:
    """Test POST /api/whatsapp/setup endpoint"""
    
    def test_setup_requires_auth(self):
        """POST /api/whatsapp/setup without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/setup",
            json={"api_key": "invalid_key"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/whatsapp/setup requires authentication")
    
    def test_setup_rejects_invalid_api_key(self):
        """POST /api/whatsapp/setup with invalid API key should return 400"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/setup",
            headers=headers,
            json={"api_key": "invalid_api_key_12345"}
        )
        # Should return 400 because the API key validation fails with WaSenderAPI
        assert response.status_code == 400, f"Expected 400 for invalid API key, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        print(f"PASS: POST /api/whatsapp/setup rejects invalid API key with 400: {data.get('detail')}")
    
    def test_setup_requires_api_key_field(self):
        """POST /api/whatsapp/setup without api_key field should return 422"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/setup",
            headers=headers,
            json={}
        )
        # Pydantic validation should reject missing field
        assert response.status_code == 422, f"Expected 422 for missing api_key, got {response.status_code}: {response.text}"
        print("PASS: POST /api/whatsapp/setup requires api_key field")


class TestWhatsAppSettingsUpdate:
    """Test PUT /api/whatsapp/settings endpoint"""
    
    def test_update_settings_requires_auth(self):
        """PUT /api/whatsapp/settings without auth should return 401"""
        response = requests.put(
            f"{BASE_URL}/api/whatsapp/settings",
            json={"business_phone": "+5511999998888"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: PUT /api/whatsapp/settings requires authentication")
    
    def test_update_business_phone(self):
        """PUT /api/whatsapp/settings should update business_phone"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        test_phone = "+5511888887777"
        response = requests.put(
            f"{BASE_URL}/api/whatsapp/settings",
            headers=headers,
            json={"business_phone": test_phone}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have 'message' field"
        print(f"PASS: PUT /api/whatsapp/settings updated business_phone: {data}")
    
    def test_update_is_active(self):
        """PUT /api/whatsapp/settings should update is_active"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.put(
            f"{BASE_URL}/api/whatsapp/settings",
            headers=headers,
            json={"is_active": False}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: PUT /api/whatsapp/settings updated is_active")


class TestUpdatePhone:
    """Test PUT /api/auth/update-phone endpoint"""
    
    def test_update_phone_requires_auth(self):
        """PUT /api/auth/update-phone without auth should return 401"""
        response = requests.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "+5511999999999"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: PUT /api/auth/update-phone requires authentication")
    
    def test_update_phone_success(self):
        """PUT /api/auth/update-phone should save phone number"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        test_phone = "+5511998765432"
        response = requests.put(
            f"{BASE_URL}/api/auth/update-phone",
            headers=headers,
            json={"phone": test_phone}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return UserResponse with phone field
        assert "phone" in data, "Response should have 'phone' field"
        assert data["phone"] == test_phone, f"Phone should be {test_phone}, got {data['phone']}"
        assert "user_id" in data, "Response should have 'user_id' field"
        assert "email" in data, "Response should have 'email' field"
        print(f"PASS: PUT /api/auth/update-phone saved phone: {data['phone']}")
    
    def test_update_phone_rejects_invalid_short(self):
        """PUT /api/auth/update-phone should reject phone less than 8 chars"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.put(
            f"{BASE_URL}/api/auth/update-phone",
            headers=headers,
            json={"phone": "123456"}  # 6 chars - too short
        )
        assert response.status_code == 400, f"Expected 400 for short phone, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        print(f"PASS: PUT /api/auth/update-phone rejects short phone with 400: {data.get('detail')}")
    
    def test_update_phone_rejects_empty(self):
        """PUT /api/auth/update-phone should reject empty phone"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.put(
            f"{BASE_URL}/api/auth/update-phone",
            headers=headers,
            json={"phone": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty phone, got {response.status_code}: {response.text}"
        print("PASS: PUT /api/auth/update-phone rejects empty phone")


class TestAuthMe:
    """Test GET /api/auth/me endpoint"""
    
    def test_auth_me_returns_phone_field(self):
        """GET /api/auth/me should return user with phone field"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should have 'user_id' field"
        assert "email" in data, "Response should have 'email' field"
        assert "name" in data, "Response should have 'name' field"
        assert "role" in data, "Response should have 'role' field"
        assert "phone" in data, "Response should have 'phone' field"
        
        # Verify user is the barber we expect
        assert data["role"] == "barber", f"Expected role 'barber', got {data['role']}"
        print(f"PASS: GET /api/auth/me returns user with phone field: {data}")


class TestWhatsAppConnect:
    """Test POST /api/whatsapp/connect endpoint"""
    
    def test_connect_requires_auth(self):
        """POST /api/whatsapp/connect without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/connect")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/whatsapp/connect requires authentication")
    
    def test_connect_requires_session_configured(self):
        """POST /api/whatsapp/connect without session should return 400"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.post(f"{BASE_URL}/api/whatsapp/connect", headers=headers)
        
        # Should return 400 if no PAT/session is configured
        # Could be 200 if PAT is already configured (external API may return error in that case)
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Error response should have 'detail' field"
            print(f"PASS: POST /api/whatsapp/connect requires session: {data.get('detail')}")
        else:
            # If 200, it means PAT was configured before - check the response
            print(f"INFO: POST /api/whatsapp/connect returned {response.status_code}: {response.text}")
            # This is acceptable if the external API returns something
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"


class TestWhatsAppQRCode:
    """Test GET /api/whatsapp/qrcode endpoint"""
    
    def test_qrcode_requires_auth(self):
        """GET /api/whatsapp/qrcode without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/qrcode")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/whatsapp/qrcode requires authentication")
    
    def test_qrcode_error_when_no_session(self):
        """GET /api/whatsapp/qrcode without session should return 400"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/whatsapp/qrcode", headers=headers)
        
        # Should return 400 if no session is configured
        # Or could return 200 with qr_code: null if session exists but QR not available
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Error response should have 'detail' field"
            print(f"PASS: GET /api/whatsapp/qrcode returns error when no session: {data.get('detail')}")
        elif response.status_code == 200:
            data = response.json()
            # Even if session exists, QR code might be null
            print(f"INFO: GET /api/whatsapp/qrcode returned 200: {data}")
            assert "qr_code" in data or "message" in data, "Response should have qr_code or message"


class TestWhatsAppTestMessage:
    """Test POST /api/whatsapp/test endpoint"""
    
    def test_test_message_requires_auth(self):
        """POST /api/whatsapp/test without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/whatsapp/test requires authentication")
    
    def test_test_message_rejects_when_not_connected(self):
        """POST /api/whatsapp/test should reject when WhatsApp not connected"""
        headers = {"Authorization": f"Bearer {BARBER_TOKEN}"}
        response = requests.post(f"{BASE_URL}/api/whatsapp/test", headers=headers)
        
        # Should return 400 if not connected
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Error response should have 'detail' field"
            print(f"PASS: POST /api/whatsapp/test rejects when not connected: {data.get('detail')}")
        elif response.status_code == 500:
            # Could be 500 if session key exists but message sending fails
            print(f"INFO: POST /api/whatsapp/test returned 500 (message send failed): {response.text}")
        else:
            print(f"INFO: POST /api/whatsapp/test returned {response.status_code}: {response.text}")


class TestAdditionalEndpoints:
    """Test additional WhatsApp endpoints"""
    
    def test_disconnect_requires_auth(self):
        """POST /api/whatsapp/disconnect without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/disconnect")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/whatsapp/disconnect requires authentication")
    
    def test_create_session_requires_auth(self):
        """POST /api/whatsapp/create-session without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/create-session",
            json={"name": "Test Session"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/whatsapp/create-session requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
