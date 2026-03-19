#!/usr/bin/env python3
"""
Backend Test Suite for Barbershop Manager API
Testing new public booking and barber schedule management endpoints.
"""

import asyncio
import uuid
import json
import sys
import os
from datetime import datetime, timedelta

import requests

# Import modules from current backend directory
from database import async_session_factory, init_db
from models import User, UserSession, Service, BarberAvailability, Appointment
from sqlalchemy import delete

# Configuration
BACKEND_URL = "https://barber-mgmt-5.preview.emergentagent.com/api"
TEST_BARBER_ID = "test_schedule_001"
TEST_BARBER_EMAIL = "schedule@test.com"
TEST_BARBER_NAME = "Barber Test"

class BarberBookingTester:
    def __init__(self):
        self.session_token = None
        self.auth_headers = {}
        self.test_service_id = None
        self.created_schedule_ids = []
        self.created_appointment_id = None

    async def setup_test_data(self):
        """Step 1: Setup - Create test barber + session using Python"""
        print("📋 Step 1: Setting up test barber and session...")
        
        try:
            await init_db()
            async with async_session_factory() as db:
                # Create test barber user
                user = User(
                    user_id=TEST_BARBER_ID,
                    email=TEST_BARBER_EMAIL,
                    name=TEST_BARBER_NAME,
                    role='barber'
                )
                db.add(user)
                
                # Create session token
                token = f'session_{uuid.uuid4().hex}'
                session = UserSession(
                    user_id=TEST_BARBER_ID,
                    session_token=token,
                    expires_at=datetime.utcnow() + timedelta(days=7)
                )
                db.add(session)
                
                await db.commit()
                
                self.session_token = token
                self.auth_headers = {"Authorization": f"Bearer {token}"}
                print(f"✅ Test barber created with token: {token[:16]}...")
                
        except Exception as e:
            print(f"❌ Failed to setup test data: {e}")
            raise

    def test_schedule_management(self):
        """Step 2: Test Schedule Management (requires barber auth)"""
        print("\n📋 Step 2: Testing Schedule Management...")
        
        # Test GET /api/schedule/ - should return empty list
        print("Testing GET /api/schedule/ (empty)")
        response = requests.get(f"{BACKEND_URL}/schedule/", headers=self.auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        schedules = response.json()
        assert isinstance(schedules, list), "Expected list response"
        print(f"✅ Empty schedule list returned correctly - {len(schedules)} items")
        
        # Test POST /api/schedule/bulk - create schedule for Mon-Fri
        print("Testing POST /api/schedule/bulk (Mon-Fri)")
        bulk_data = {
            "days": [0, 1, 2, 3, 4],  # Monday to Friday
            "start_time": "09:00",
            "end_time": "18:00",
            "slot_duration_minutes": 30,
            "recurrence_type": "weekly"
        }
        response = requests.post(f"{BACKEND_URL}/schedule/bulk", 
                               json=bulk_data, 
                               headers=self.auth_headers)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        created_schedules = response.json()
        assert len(created_schedules) == 5, f"Expected 5 schedules, got {len(created_schedules)}"
        
        # Store IDs for cleanup
        self.created_schedule_ids = [schedule['id'] for schedule in created_schedules]
        print(f"✅ Created {len(created_schedules)} schedules for Mon-Fri")
        
        # Test GET /api/schedule/ - should now return 5 entries
        print("Testing GET /api/schedule/ (populated)")
        response = requests.get(f"{BACKEND_URL}/schedule/", headers=self.auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        schedules = response.json()
        assert len(schedules) == 5, f"Expected 5 schedules, got {len(schedules)}"
        print("✅ Schedule list now contains 5 entries")
        
        # Test DELETE /api/schedule/{id} - delete one entry
        if self.created_schedule_ids:
            schedule_id_to_delete = self.created_schedule_ids[0]
            print(f"Testing DELETE /api/schedule/{schedule_id_to_delete}")
            response = requests.delete(f"{BACKEND_URL}/schedule/{schedule_id_to_delete}", 
                                     headers=self.auth_headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            print("✅ Individual schedule deleted successfully")
            
            # Remove from our tracking list
            self.created_schedule_ids.remove(schedule_id_to_delete)

    def test_public_booking_flow(self):
        """Step 3: Test Public Booking (no auth)"""
        print("\n📋 Step 3: Testing Public Booking Flow...")
        
        # Test GET /api/public/services - should return services list
        print("Testing GET /api/public/services")
        response = requests.get(f"{BACKEND_URL}/public/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        services = response.json()
        assert isinstance(services, list), "Expected services list"
        
        # Find a service to use for booking
        if services:
            self.test_service_id = services[0]['id']
            print(f"✅ Found {len(services)} services, using service ID: {self.test_service_id}")
        else:
            print("⚠️  No services found, creating a test service...")
            # Create a test service using authenticated request
            service_data = {
                "name": "Test Haircut",
                "description": "Test service for booking",
                "price": 25.0,
                "duration_minutes": 30
            }
            response = requests.post(f"{BACKEND_URL}/services/", 
                                   json=service_data, 
                                   headers=self.auth_headers)
            assert response.status_code == 201, f"Failed to create test service: {response.status_code}"
            self.test_service_id = response.json()['id']
            print(f"✅ Created test service with ID: {self.test_service_id}")
        
        # Create schedule again for testing available slots (if we deleted all)
        if len(self.created_schedule_ids) == 0:
            print("Recreating schedule for availability testing...")
            bulk_data = {
                "days": [0],  # Just Monday
                "start_time": "09:00",
                "end_time": "18:00",
                "slot_duration_minutes": 30,
                "recurrence_type": "weekly"
            }
            response = requests.post(f"{BACKEND_URL}/schedule/bulk", 
                                   json=bulk_data, 
                                   headers=self.auth_headers)
            assert response.status_code == 201, "Failed to recreate schedule"
            created_schedules = response.json()
            self.created_schedule_ids.extend([schedule['id'] for schedule in created_schedules])
        
        # Test GET /api/public/available-slots?date_str=2026-03-09
        print("Testing GET /api/public/available-slots for 2026-03-09 (Monday)")
        response = requests.get(f"{BACKEND_URL}/public/available-slots?date_str=2026-03-09")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        slots_data = response.json()
        assert 'slots' in slots_data, "Response should contain 'slots' key"
        available_slots = slots_data['slots']
        print(f"✅ Found {len(available_slots)} available slots for March 9, 2026")
        
        if not available_slots:
            print("❌ No available slots found - cannot test booking")
            return
        
        # Test POST /api/public/book - book an appointment
        print("Testing POST /api/public/book")
        selected_slot = available_slots[0]['datetime_iso']
        booking_data = {
            "client_name": "Carlos Silva",
            "client_phone": "11999887766",
            "service_id": self.test_service_id,
            "scheduled_time": selected_slot,
            "notes": "Test booking for API testing"
        }
        response = requests.post(f"{BACKEND_URL}/public/book", json=booking_data)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        booking_confirmation = response.json()
        self.created_appointment_id = booking_confirmation['id']
        print(f"✅ Appointment booked successfully: ID {self.created_appointment_id}")
        
        # Test GET /api/public/available-slots again - verify the booked slot is no longer available
        print("Testing GET /api/public/available-slots (after booking)")
        response = requests.get(f"{BACKEND_URL}/public/available-slots?date_str=2026-03-09")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        slots_data_after = response.json()
        available_slots_after = slots_data_after['slots']
        
        # The booked slot should no longer be available
        booked_slot_times = [slot['datetime_iso'] for slot in available_slots_after]
        assert selected_slot not in booked_slot_times, "Booked slot should not be available anymore"
        print(f"✅ Booked slot removed from available slots ({len(available_slots_after)} remaining)")
        
        # Test POST /api/public/book with same time - should get 409 conflict
        print("Testing POST /api/public/book (duplicate time - should fail)")
        response = requests.post(f"{BACKEND_URL}/public/book", json=booking_data)
        assert response.status_code == 409, f"Expected 409 conflict, got {response.status_code}"
        print("✅ Duplicate booking correctly rejected with 409 conflict")

    def test_schedule_delete_all(self):
        """Test DELETE /api/schedule/ - clear all remaining"""
        print("\nTesting DELETE /api/schedule/ (clear all)")
        response = requests.delete(f"{BACKEND_URL}/schedule/", headers=self.auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ All schedules cleared successfully")
        
        # Clear our tracking list
        self.created_schedule_ids = []

    async def cleanup_test_data(self):
        """Step 4: Cleanup - Delete test data"""
        print("\n📋 Step 4: Cleaning up test data...")
        
        try:
            await init_db()
            async with async_session_factory() as db:
                # Delete test appointment
                await db.execute(
                    delete(Appointment).where(Appointment.client_name == 'Carlos Silva')
                )
                
                # Delete remaining schedules
                await db.execute(
                    delete(BarberAvailability).where(BarberAvailability.barber_id == TEST_BARBER_ID)
                )
                
                # Delete test session
                await db.execute(
                    delete(UserSession).where(UserSession.user_id == TEST_BARBER_ID)
                )
                
                # Delete test user
                await db.execute(
                    delete(User).where(User.user_id == TEST_BARBER_ID)
                )
                
                await db.commit()
                print("✅ Cleanup completed successfully")
                
        except Exception as e:
            print(f"⚠️  Cleanup error (non-critical): {e}")

    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Barber Booking API Test Suite")
        print(f"Backend URL: {BACKEND_URL}")
        
        try:
            # Step 1: Setup
            await self.setup_test_data()
            
            # Step 2: Schedule Management
            self.test_schedule_management()
            
            # Step 3: Public Booking
            self.test_public_booking_flow()
            
            # Additional schedule cleanup test
            self.test_schedule_delete_all()
            
            print("\n🎉 All tests completed successfully!")
            return True
            
        except AssertionError as e:
            print(f"\n❌ Test failed: {e}")
            return False
        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            # Step 4: Cleanup
            await self.cleanup_test_data()


async def main():
    """Main test runner"""
    tester = BarberBookingTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())