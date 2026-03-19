"""
Test Promotions CRUD and Service Photos CRUD endpoints
Iteration 4: Tests for mobile promotions management and service photos upload features
"""
import pytest
import requests
import os
import sys
import asyncio
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://barber-mgmt-5.preview.emergentagent.com').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_PROMO_"


class TestSetup:
    """Setup test session for authenticated endpoints"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Create or get test session token"""
        async def create_session():
            from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
            from sqlalchemy import select, delete
            import uuid
            
            DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb')
            
            engine = create_async_engine(DATABASE_URL, echo=False)
            async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            
            async with async_session() as session:
                from models import User, UserSession
                
                test_email = "test_barber@testing.com"
                test_user_id = "test_barber_001"
                
                result = await session.execute(
                    select(User).where(User.email == test_email)
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    user = User(
                        user_id=test_user_id,
                        email=test_email,
                        name="Test Barber",
                        role="barber"
                    )
                    session.add(user)
                    await session.commit()
                    await session.refresh(user)
                
                # Create session token
                session_token = f"test_session_{uuid.uuid4().hex}"
                expires_at = datetime.utcnow() + timedelta(hours=24)
                
                # Delete existing sessions for test user
                await session.execute(
                    delete(UserSession).where(UserSession.user_id == user.user_id)
                )
                
                user_session = UserSession(
                    user_id=user.user_id,
                    session_token=session_token,
                    expires_at=expires_at
                )
                session.add(user_session)
                await session.commit()
                
                await engine.dispose()
                
                return session_token
        
        return asyncio.get_event_loop().run_until_complete(create_session())


@pytest.fixture(scope="module")
def auth_headers():
    """Get auth headers with fresh session token"""
    async def get_token():
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from sqlalchemy import select, delete
        import uuid
        
        DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb')
        
        engine = create_async_engine(DATABASE_URL, echo=False)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            from models import User, UserSession
            
            test_email = "test_barber@testing.com"
            test_user_id = "test_barber_001"
            
            result = await session.execute(
                select(User).where(User.email == test_email)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                user = User(
                    user_id=test_user_id,
                    email=test_email,
                    name="Test Barber",
                    role="barber"
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
            
            session_token = f"test_session_{uuid.uuid4().hex}"
            expires_at = datetime.utcnow() + timedelta(hours=24)
            
            await session.execute(
                delete(UserSession).where(UserSession.user_id == user.user_id)
            )
            
            user_session = UserSession(
                user_id=user.user_id,
                session_token=session_token,
                expires_at=expires_at
            )
            session.add(user_session)
            await session.commit()
            
            await engine.dispose()
            
            return session_token
    
    token = asyncio.get_event_loop().run_until_complete(get_token())
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


# ==================== HEALTH CHECK ====================

class TestHealthCheck:
    """Health check endpoint test"""
    
    def test_health_endpoint(self):
        """GET /api/health - Health check"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")


# ==================== PROMOTIONS CRUD TESTS ====================

class TestPromotionsCRUD:
    """Full CRUD tests for promotions endpoints"""
    
    def test_01_public_list_promotions(self):
        """GET /api/promotions/ - Public list active promotions (no auth)"""
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✅ Public promotions list: {len(data)} active promotions")
    
    def test_02_all_promotions_requires_auth(self):
        """GET /api/promotions/all - Should require auth"""
        resp = requests.get(f"{BASE_URL}/api/promotions/all")
        # Should return 401 or 403 without auth
        assert resp.status_code in [401, 403]
        print(f"✅ /api/promotions/all correctly requires authentication")
    
    def test_03_all_promotions_with_auth(self, auth_headers):
        """GET /api/promotions/all - List all barber's promotions with auth"""
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✅ Barber's promotions list: {len(data)} total promotions")
    
    def test_04_create_promotion_requires_auth(self):
        """POST /api/promotions/ - Should require auth"""
        payload = {"title": "Test Promo"}
        resp = requests.post(f"{BASE_URL}/api/promotions/", json=payload)
        assert resp.status_code in [401, 403]
        print(f"✅ Create promotion correctly requires authentication")
    
    def test_05_create_promotion_with_auth(self, auth_headers):
        """POST /api/promotions/ - Create promotion with full data"""
        valid_until = (datetime.now() + timedelta(days=30)).isoformat()
        payload = {
            "title": f"{TEST_PREFIX}Summer Sale",
            "description": "Test promotion for summer sale",
            "discount_percent": 25.0,
            "code": "SUMMER25",
            "valid_until": valid_until
        }
        resp = requests.post(f"{BASE_URL}/api/promotions/", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert "title" in data
        print(f"✅ Created promotion: ID={data['id']}, title={data['title']}")
        # Store for later tests
        pytest.promotion_id = data["id"]
    
    def test_06_create_promotion_minimal(self, auth_headers):
        """POST /api/promotions/ - Create promotion with minimal data (title only)"""
        payload = {"title": f"{TEST_PREFIX}Minimal Promo"}
        resp = requests.post(f"{BASE_URL}/api/promotions/", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        print(f"✅ Created minimal promotion: ID={data['id']}")
        pytest.minimal_promo_id = data["id"]
    
    def test_07_verify_promotion_in_all_list(self, auth_headers):
        """GET /api/promotions/all - Verify created promotion appears in list"""
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        promo_ids = [p["id"] for p in data]
        assert pytest.promotion_id in promo_ids
        print(f"✅ Created promotion found in barber's list")
    
    def test_08_verify_active_promotion_in_public_list(self):
        """GET /api/promotions/ - Verify active promotion appears in public list"""
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        assert resp.status_code == 200
        data = resp.json()
        promo_ids = [p["id"] for p in data]
        assert pytest.promotion_id in promo_ids
        # Verify promotion data structure
        promo = next(p for p in data if p["id"] == pytest.promotion_id)
        assert promo["title"] == f"{TEST_PREFIX}Summer Sale"
        assert promo["discount_percent"] == 25.0
        assert promo["code"] == "SUMMER25"
        assert promo["is_active"] == True
        print(f"✅ Active promotion found in public list with correct data")
    
    def test_09_update_promotion_requires_auth(self):
        """PUT /api/promotions/{id} - Should require auth"""
        payload = {"title": "Updated"}
        resp = requests.put(f"{BASE_URL}/api/promotions/{pytest.promotion_id}", json=payload)
        assert resp.status_code in [401, 403]
        print(f"✅ Update promotion correctly requires authentication")
    
    def test_10_update_promotion_title(self, auth_headers):
        """PUT /api/promotions/{id} - Update title"""
        payload = {"title": f"{TEST_PREFIX}Summer Sale UPDATED"}
        resp = requests.put(
            f"{BASE_URL}/api/promotions/{pytest.promotion_id}",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Updated promotion title")
    
    def test_11_update_promotion_discount(self, auth_headers):
        """PUT /api/promotions/{id} - Update discount percent"""
        payload = {"discount_percent": 30.0}
        resp = requests.put(
            f"{BASE_URL}/api/promotions/{pytest.promotion_id}",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Updated promotion discount to 30%")
    
    def test_12_verify_update_persisted(self, auth_headers):
        """GET /api/promotions/all - Verify update was persisted"""
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        promo = next((p for p in data if p["id"] == pytest.promotion_id), None)
        assert promo is not None
        assert promo["title"] == f"{TEST_PREFIX}Summer Sale UPDATED"
        assert promo["discount_percent"] == 30.0
        print(f"✅ Updates persisted: title='{promo['title']}', discount={promo['discount_percent']}%")
    
    def test_13_toggle_promotion_inactive(self, auth_headers):
        """PUT /api/promotions/{id} - Toggle is_active to False"""
        payload = {"is_active": False}
        resp = requests.put(
            f"{BASE_URL}/api/promotions/{pytest.promotion_id}",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Toggled promotion to inactive")
    
    def test_14_inactive_not_in_public_list(self):
        """GET /api/promotions/ - Verify inactive promotion NOT in public list"""
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        assert resp.status_code == 200
        data = resp.json()
        promo_ids = [p["id"] for p in data]
        assert pytest.promotion_id not in promo_ids
        print(f"✅ Inactive promotion correctly hidden from public list")
    
    def test_15_inactive_still_in_all_list(self, auth_headers):
        """GET /api/promotions/all - Verify inactive promotion still in barber's list"""
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        promo = next((p for p in data if p["id"] == pytest.promotion_id), None)
        assert promo is not None
        assert promo["is_active"] == False
        print(f"✅ Inactive promotion still visible in barber's management list")
    
    def test_16_toggle_promotion_active(self, auth_headers):
        """PUT /api/promotions/{id} - Toggle is_active back to True"""
        payload = {"is_active": True}
        resp = requests.put(
            f"{BASE_URL}/api/promotions/{pytest.promotion_id}",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Toggled promotion back to active")
    
    def test_17_active_back_in_public_list(self):
        """GET /api/promotions/ - Verify re-activated promotion back in public list"""
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        assert resp.status_code == 200
        data = resp.json()
        promo_ids = [p["id"] for p in data]
        assert pytest.promotion_id in promo_ids
        print(f"✅ Re-activated promotion visible in public list again")
    
    def test_18_delete_promotion_requires_auth(self):
        """DELETE /api/promotions/{id} - Should require auth"""
        resp = requests.delete(f"{BASE_URL}/api/promotions/{pytest.minimal_promo_id}")
        assert resp.status_code in [401, 403]
        print(f"✅ Delete promotion correctly requires authentication")
    
    def test_19_delete_promotion(self, auth_headers):
        """DELETE /api/promotions/{id} - Delete promotion"""
        resp = requests.delete(
            f"{BASE_URL}/api/promotions/{pytest.promotion_id}",
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Deleted promotion ID={pytest.promotion_id}")
    
    def test_20_deleted_not_in_any_list(self, auth_headers):
        """Verify deleted promotion not in any list"""
        # Public list
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        public_ids = [p["id"] for p in resp.json()]
        assert pytest.promotion_id not in public_ids
        
        # Barber's list
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        all_ids = [p["id"] for p in resp.json()]
        assert pytest.promotion_id not in all_ids
        print(f"✅ Deleted promotion not in public or barber's list")
    
    def test_21_update_nonexistent_promotion(self, auth_headers):
        """PUT /api/promotions/{id} - Update non-existent promotion returns 404"""
        payload = {"title": "Should fail"}
        resp = requests.put(
            f"{BASE_URL}/api/promotions/999999",
            json=payload,
            headers=auth_headers
        )
        assert resp.status_code == 404
        print(f"✅ Update non-existent promotion returns 404")
    
    def test_22_delete_nonexistent_promotion(self, auth_headers):
        """DELETE /api/promotions/{id} - Delete non-existent promotion returns 404"""
        resp = requests.delete(
            f"{BASE_URL}/api/promotions/999999",
            headers=auth_headers
        )
        assert resp.status_code == 404
        print(f"✅ Delete non-existent promotion returns 404")
    
    def test_23_cleanup_minimal_promo(self, auth_headers):
        """Cleanup: Delete minimal test promotion"""
        resp = requests.delete(
            f"{BASE_URL}/api/promotions/{pytest.minimal_promo_id}",
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Cleaned up minimal test promotion")


# ==================== SERVICE PHOTOS CRUD TESTS ====================

class TestServicePhotosCRUD:
    """Full CRUD tests for service photos endpoints"""
    
    @pytest.fixture(scope="class")
    def test_service_id(self):
        """Get a service ID for testing photos"""
        resp = requests.get(f"{BASE_URL}/api/services/")
        if resp.status_code == 200 and resp.json():
            return resp.json()[0]["id"]
        pytest.skip("No services available for photo testing")
    
    def test_01_get_photos_public(self, test_service_id):
        """GET /api/service-photos/{service_id} - Public list photos (no auth)"""
        resp = requests.get(f"{BASE_URL}/api/service-photos/{test_service_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✅ Public photos list for service {test_service_id}: {len(data)} photos")
    
    def test_02_upload_photo_requires_auth(self, test_service_id):
        """POST /api/service-photos/ - Should require auth"""
        payload = {
            "service_id": test_service_id,
            "photo_data": "base64_test_data",
            "caption": "Test photo"
        }
        resp = requests.post(f"{BASE_URL}/api/service-photos/", json=payload)
        assert resp.status_code in [401, 403]
        print(f"✅ Upload photo correctly requires authentication")
    
    def test_03_upload_photo_with_auth(self, auth_headers, test_service_id):
        """POST /api/service-photos/ - Upload photo with base64 data"""
        # Small test base64 image (1x1 red pixel PNG)
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        payload = {
            "service_id": test_service_id,
            "photo_data": test_base64,
            "caption": f"{TEST_PREFIX}Test photo caption"
        }
        resp = requests.post(f"{BASE_URL}/api/service-photos/", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        print(f"✅ Uploaded photo: ID={data['id']}")
        pytest.photo_id = data["id"]
        pytest.photo_service_id = test_service_id
    
    def test_04_upload_photo_no_caption(self, auth_headers, test_service_id):
        """POST /api/service-photos/ - Upload photo without caption (optional field)"""
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        payload = {
            "service_id": test_service_id,
            "photo_data": test_base64
        }
        resp = requests.post(f"{BASE_URL}/api/service-photos/", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        print(f"✅ Uploaded photo without caption: ID={data['id']}")
        pytest.photo_id_no_caption = data["id"]
    
    def test_05_verify_photo_in_list(self, test_service_id):
        """GET /api/service-photos/{service_id} - Verify uploaded photo appears"""
        resp = requests.get(f"{BASE_URL}/api/service-photos/{test_service_id}")
        assert resp.status_code == 200
        data = resp.json()
        photo_ids = [p["id"] for p in data]
        assert pytest.photo_id in photo_ids
        
        # Verify photo data structure
        photo = next(p for p in data if p["id"] == pytest.photo_id)
        assert "service_id" in photo
        assert "photo_data" in photo
        assert "caption" in photo
        assert "created_at" in photo
        assert photo["service_id"] == test_service_id
        assert photo["caption"] == f"{TEST_PREFIX}Test photo caption"
        print(f"✅ Uploaded photo found in list with correct data")
    
    def test_06_get_photos_nonexistent_service(self):
        """GET /api/service-photos/{service_id} - Non-existent service returns empty list"""
        resp = requests.get(f"{BASE_URL}/api/service-photos/999999")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0
        print(f"✅ Non-existent service returns empty photo list")
    
    def test_07_delete_photo_requires_auth(self):
        """DELETE /api/service-photos/{photo_id} - Should require auth"""
        resp = requests.delete(f"{BASE_URL}/api/service-photos/{pytest.photo_id}")
        assert resp.status_code in [401, 403]
        print(f"✅ Delete photo correctly requires authentication")
    
    def test_08_delete_photo(self, auth_headers):
        """DELETE /api/service-photos/{photo_id} - Delete photo"""
        resp = requests.delete(
            f"{BASE_URL}/api/service-photos/{pytest.photo_id}",
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Deleted photo ID={pytest.photo_id}")
    
    def test_09_verify_deleted_not_in_list(self, test_service_id):
        """GET /api/service-photos/{service_id} - Verify deleted photo removed"""
        resp = requests.get(f"{BASE_URL}/api/service-photos/{test_service_id}")
        assert resp.status_code == 200
        data = resp.json()
        photo_ids = [p["id"] for p in data]
        assert pytest.photo_id not in photo_ids
        print(f"✅ Deleted photo not in list")
    
    def test_10_delete_nonexistent_photo(self, auth_headers):
        """DELETE /api/service-photos/{photo_id} - Delete non-existent photo returns 404"""
        resp = requests.delete(
            f"{BASE_URL}/api/service-photos/999999",
            headers=auth_headers
        )
        assert resp.status_code == 404
        print(f"✅ Delete non-existent photo returns 404")
    
    def test_11_cleanup_no_caption_photo(self, auth_headers):
        """Cleanup: Delete test photo without caption"""
        resp = requests.delete(
            f"{BASE_URL}/api/service-photos/{pytest.photo_id_no_caption}",
            headers=auth_headers
        )
        assert resp.status_code == 200
        print(f"✅ Cleaned up test photo without caption")


# ==================== FULL FLOW INTEGRATION TESTS ====================

class TestPromotionsFullFlow:
    """Full promotion lifecycle flow test"""
    
    def test_full_promotion_flow(self, auth_headers):
        """Full flow: create -> list all -> update -> toggle inactive -> list public -> delete"""
        # 1. Create promotion
        valid_until = (datetime.now() + timedelta(days=7)).isoformat()
        create_payload = {
            "title": f"{TEST_PREFIX}Flow Test Promo",
            "description": "Testing full flow",
            "discount_percent": 15.0,
            "code": "FLOW15",
            "valid_until": valid_until
        }
        resp = requests.post(f"{BASE_URL}/api/promotions/", json=create_payload, headers=auth_headers)
        assert resp.status_code == 201
        promo_id = resp.json()["id"]
        print(f"✅ Step 1: Created promotion ID={promo_id}")
        
        # 2. List all - should contain new promotion
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert resp.status_code == 200
        assert any(p["id"] == promo_id for p in resp.json())
        print(f"✅ Step 2: Promotion in barber's list")
        
        # 3. Update title and discount
        update_payload = {"title": f"{TEST_PREFIX}Flow Test UPDATED", "discount_percent": 20.0}
        resp = requests.put(f"{BASE_URL}/api/promotions/{promo_id}", json=update_payload, headers=auth_headers)
        assert resp.status_code == 200
        print(f"✅ Step 3: Updated promotion")
        
        # 4. Verify update
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        promo = next(p for p in resp.json() if p["id"] == promo_id)
        assert promo["title"] == f"{TEST_PREFIX}Flow Test UPDATED"
        assert promo["discount_percent"] == 20.0
        print(f"✅ Step 4: Update verified")
        
        # 5. Toggle inactive
        resp = requests.put(f"{BASE_URL}/api/promotions/{promo_id}", json={"is_active": False}, headers=auth_headers)
        assert resp.status_code == 200
        print(f"✅ Step 5: Toggled inactive")
        
        # 6. Verify not in public list
        resp = requests.get(f"{BASE_URL}/api/promotions/")
        assert not any(p["id"] == promo_id for p in resp.json())
        print(f"✅ Step 6: Inactive promotion hidden from public")
        
        # 7. Delete
        resp = requests.delete(f"{BASE_URL}/api/promotions/{promo_id}", headers=auth_headers)
        assert resp.status_code == 200
        print(f"✅ Step 7: Deleted promotion")
        
        # 8. Verify deleted
        resp = requests.get(f"{BASE_URL}/api/promotions/all", headers=auth_headers)
        assert not any(p["id"] == promo_id for p in resp.json())
        print(f"✅ Step 8: Promotion fully removed - FULL FLOW PASSED")


class TestServicePhotosFullFlow:
    """Full service photos lifecycle flow test"""
    
    def test_full_photo_flow(self, auth_headers):
        """Full flow: upload -> list -> delete -> verify empty"""
        # Get a service ID
        resp = requests.get(f"{BASE_URL}/api/services/")
        if resp.status_code != 200 or not resp.json():
            pytest.skip("No services available")
        service_id = resp.json()[0]["id"]
        
        # 1. Get initial photo count
        resp = requests.get(f"{BASE_URL}/api/service-photos/{service_id}")
        initial_count = len(resp.json())
        print(f"✅ Step 1: Initial photo count = {initial_count}")
        
        # 2. Upload photo
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        payload = {
            "service_id": service_id,
            "photo_data": test_base64,
            "caption": f"{TEST_PREFIX}Flow test photo"
        }
        resp = requests.post(f"{BASE_URL}/api/service-photos/", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        photo_id = resp.json()["id"]
        print(f"✅ Step 2: Uploaded photo ID={photo_id}")
        
        # 3. List photos - should have one more
        resp = requests.get(f"{BASE_URL}/api/service-photos/{service_id}")
        assert len(resp.json()) == initial_count + 1
        print(f"✅ Step 3: Photo count increased to {initial_count + 1}")
        
        # 4. Delete photo
        resp = requests.delete(f"{BASE_URL}/api/service-photos/{photo_id}", headers=auth_headers)
        assert resp.status_code == 200
        print(f"✅ Step 4: Deleted photo")
        
        # 5. Verify back to initial count
        resp = requests.get(f"{BASE_URL}/api/service-photos/{service_id}")
        assert len(resp.json()) == initial_count
        print(f"✅ Step 5: Photo count back to {initial_count} - FULL FLOW PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
