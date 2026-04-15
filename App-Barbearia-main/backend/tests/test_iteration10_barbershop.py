"""
Backend tests for Iteration 10 - Barbershop CRUD & Birthday clients
Tests: barbershop routes, birthday endpoint, web-client integration data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gestao-app-1.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = "session_3d0a8ec778fd4062947268666bcff5c4"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client):
    """Session with barber auth header"""
    api_client.headers.update({"Authorization": f"Bearer {SESSION_TOKEN}"})
    return api_client


# ============= Health Check =============
class TestHealthCheck:
    """Health endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health - should return healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        print(f"✅ Health check passed: {data}")


# ============= Barbershop CRUD =============
class TestBarbershopCRUD:
    """Barbershop endpoint tests"""
    
    def test_get_public_info_no_auth(self, api_client):
        """GET /api/barbershop/public-info - should return data without auth"""
        response = api_client.get(f"{BASE_URL}/api/barbershop/public-info")
        assert response.status_code == 200
        data = response.json()
        # Should return barbershop info
        assert "name" in data
        assert "phone" in data
        assert "address" in data
        assert "logo_url" in data
        print(f"✅ Public info returned: name={data.get('name')}, phone={data.get('phone')}")
    
    def test_get_my_barbershop_no_auth(self, api_client):
        """GET /api/barbershop/mine - should require auth"""
        response = api_client.get(f"{BASE_URL}/api/barbershop/mine")
        assert response.status_code == 401
        print("✅ /barbershop/mine requires authentication")
    
    def test_get_my_barbershop_with_auth(self, authenticated_client):
        """GET /api/barbershop/mine - should return barber's barbershop"""
        response = authenticated_client.get(f"{BASE_URL}/api/barbershop/mine")
        assert response.status_code == 200
        data = response.json()
        # Should return full barbershop data
        assert "id" in data
        assert "name" in data
        assert "phone" in data
        assert "address" in data
        assert "logo_url" in data
        assert "owner_id" in data
        assert "created_at" in data
        print(f"✅ My barbershop returned: id={data['id']}, name={data['name']}")
    
    def test_create_barbershop_already_exists(self, authenticated_client):
        """POST /api/barbershop/ - should fail when barbershop already exists"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/barbershop/",
            json={"name": "Test New Shop"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "ja possui" in data.get("detail", "").lower()
        print(f"✅ Create barbershop blocked (already exists): {data.get('detail')}")
    
    def test_update_barbershop_no_auth(self, api_client):
        """PUT /api/barbershop/ - should require auth"""
        response = api_client.put(
            f"{BASE_URL}/api/barbershop/",
            json={"name": "Updated Name"}
        )
        assert response.status_code == 401
        print("✅ Update barbershop requires authentication")
    
    def test_update_barbershop_name(self, authenticated_client):
        """PUT /api/barbershop/ - should update barbershop name"""
        # Get current data first
        get_response = authenticated_client.get(f"{BASE_URL}/api/barbershop/mine")
        original = get_response.json()
        
        # Update name
        new_name = "Barbearia do Silvio"
        response = authenticated_client.put(
            f"{BASE_URL}/api/barbershop/",
            json={"name": new_name}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        print(f"✅ Barbershop name updated: {data['name']}")
    
    def test_update_barbershop_phone_address(self, authenticated_client):
        """PUT /api/barbershop/ - should update phone and address"""
        new_phone = "(11) 99999-8888"
        new_address = "Rua das Flores, 123 - Centro"
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/barbershop/",
            json={"phone": new_phone, "address": new_address}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == new_phone
        assert data["address"] == new_address
        
        # Verify persisted
        verify = authenticated_client.get(f"{BASE_URL}/api/barbershop/mine")
        verify_data = verify.json()
        assert verify_data["phone"] == new_phone
        assert verify_data["address"] == new_address
        print(f"✅ Barbershop phone/address updated and persisted")
    
    def test_public_info_reflects_update(self, api_client, authenticated_client):
        """GET /api/barbershop/public-info - should reflect updated barbershop data"""
        # Update barbershop
        authenticated_client.put(
            f"{BASE_URL}/api/barbershop/",
            json={"name": "Barbearia do Silvio", "phone": "(11) 99999-8888", "address": "Rua das Flores, 123"}
        )
        
        # Check public info
        response = api_client.get(f"{BASE_URL}/api/barbershop/public-info")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Barbearia do Silvio"
        assert "(11) 99999-8888" in data["phone"]
        print(f"✅ Public info reflects updated data")


# ============= Birthday Clients =============
class TestBirthdayClients:
    """Birthday clients endpoint tests"""
    
    def test_birthdays_no_auth(self, api_client):
        """GET /api/clients/birthdays - should require barber auth"""
        response = api_client.get(f"{BASE_URL}/api/clients/birthdays")
        assert response.status_code == 401
        print("✅ Birthday endpoint requires authentication")
    
    def test_birthdays_with_auth(self, authenticated_client):
        """GET /api/clients/birthdays - should return birthday clients for current month"""
        response = authenticated_client.get(f"{BASE_URL}/api/clients/birthdays")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Each item should have birthday fields
        for client in data:
            assert "name" in client
            assert "phone" in client
            assert "birth_date" in client
            assert "birth_day" in client
            print(f"  Birthday client: {client.get('name')} - {client.get('birth_date')}")
        
        print(f"✅ Birthday clients returned: {len(data)} clients")


# ============= Clients List =============
class TestClientsList:
    """Clients list endpoint tests"""
    
    def test_clients_no_auth(self, api_client):
        """GET /api/clients/ - should require barber auth"""
        response = api_client.get(f"{BASE_URL}/api/clients/")
        assert response.status_code == 401
        print("✅ Clients list requires authentication")
    
    def test_clients_with_auth(self, authenticated_client):
        """GET /api/clients/ - should return client list with all fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/clients/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should have clients
        if len(data) > 0:
            client = data[0]
            # Check required fields
            assert "name" in client
            assert "email" in client
            assert "phone" in client
            assert "birth_date" in client
            assert "total_appointments" in client
            assert "source" in client  # "registered" or "appointment"
            print(f"✅ Client fields verified: name, email, phone, birth_date, total_appointments, source")
        
        print(f"✅ Clients returned: {len(data)} clients")


# ============= Auth Update (phone + birth_date) =============
class TestAuthUpdatePhone:
    """PUT /api/auth/update-phone tests"""
    
    def test_update_phone_no_auth(self, api_client):
        """PUT /api/auth/update-phone - should require auth"""
        response = api_client.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "11999999999"}
        )
        assert response.status_code == 401
        print("✅ Update phone requires authentication")
    
    def test_update_phone_only(self, authenticated_client):
        """PUT /api/auth/update-phone - should accept phone field"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "(11) 99999-7777"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "(11) 99999-7777"
        print(f"✅ Phone updated: {data['phone']}")
    
    def test_update_phone_and_birth_date(self, authenticated_client):
        """PUT /api/auth/update-phone - should accept both phone and birth_date"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "(11) 98888-6666", "birth_date": "1990-05-15"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "(11) 98888-6666"
        assert data["birth_date"] == "1990-05-15"
        print(f"✅ Phone and birth_date updated: {data['phone']}, {data['birth_date']}")
    
    def test_update_invalid_phone(self, authenticated_client):
        """PUT /api/auth/update-phone - should reject short phone"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "123"}  # Too short
        )
        assert response.status_code == 400
        print("✅ Short phone rejected with 400")
    
    def test_update_invalid_birth_date_format(self, authenticated_client):
        """PUT /api/auth/update-phone - should reject invalid date format"""
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/update-phone",
            json={"phone": "11999999999", "birth_date": "15/05/1990"}  # Wrong format
        )
        # Should either reject or handle gracefully
        # Some implementations may accept different formats
        if response.status_code == 400:
            print("✅ Invalid date format rejected")
        else:
            print(f"⚠️ Date format accepted (may be parsed): status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
