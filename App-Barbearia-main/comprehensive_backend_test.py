#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Suite for Barbershop Manager
Tests all backend endpoints according to the review request.
Creates test data in database, tests with authentication, then cleans up.
"""

import asyncio
import sys
import os
sys.path.append('/app/backend')

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid

# Import backend modules for database setup
from database import async_session_factory, init_db
from models import User, UserSession

class ComprehensiveBarbershopTester:
    def __init__(self, base_url: str = "https://cutflow-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_token: Optional[str] = None
        self.test_user_id: Optional[str] = None
        self.test_results = {
            "setup": {},
            "health_check": {},
            "auth_endpoints": {},
            "services_endpoints": {},
            "products_endpoints": {},
            "appointments_endpoints": {},
            "cash_register_endpoints": {},
            "cleanup": {},
            "summary": {}
        }
        self.created_service_id = None
        self.created_product_id = None
        self.created_appointment_id = None
        
    async def setup_test_data(self):
        """Create test user and session in database"""
        print("🔧 Setting up test data in database...")
        
        try:
            await init_db()
            
            async with async_session_factory() as db:
                # Create test user
                self.test_user_id = f'test_barber_{uuid.uuid4().hex[:8]}'
                user = User(
                    user_id=self.test_user_id,
                    email=f'{self.test_user_id}@test.com',
                    name='Test Barber User',
                    role='barber'  # Create as barber to test barber endpoints
                )
                db.add(user)
                
                # Create session token
                self.test_token = f'session_{uuid.uuid4().hex}'
                session = UserSession(
                    user_id=self.test_user_id,
                    session_token=self.test_token,
                    expires_at=datetime.utcnow() + timedelta(days=7)
                )
                db.add(session)
                
                await db.commit()
                
            self.test_results["setup"] = {
                "status": "PASS",
                "user_id": self.test_user_id,
                "token": self.test_token[:20] + "..."
            }
            print(f"✅ Test data setup complete. User ID: {self.test_user_id}")
            print(f"✅ Token created: {self.test_token[:20]}...")
            return True
            
        except Exception as e:
            self.test_results["setup"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ Setup failed: {e}")
            return False
    
    def test_health_check(self):
        """Test GET /api/health"""
        print("\n🔍 Testing Health Check...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.test_results["health_check"] = {"status": "PASS", "response": data}
                    print("✅ Health check PASSED")
                else:
                    self.test_results["health_check"] = {"status": "FAIL", "reason": "Status not healthy", "response": data}
                    print(f"❌ Health check FAILED - Status not healthy: {data}")
            else:
                self.test_results["health_check"] = {"status": "FAIL", "reason": f"HTTP {response.status_code}"}
                print(f"❌ Health check FAILED - HTTP {response.status_code}")
                
        except Exception as e:
            self.test_results["health_check"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ Health check ERROR: {e}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication Endpoints...")
        
        # Test GET /api/auth/me with Bearer token
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            response = self.session.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user_id") == self.test_user_id:
                    self.test_results["auth_endpoints"]["get_me"] = {
                        "status": "PASS", 
                        "response": data
                    }
                    print("✅ GET /api/auth/me PASSED")
                else:
                    self.test_results["auth_endpoints"]["get_me"] = {
                        "status": "FAIL", 
                        "reason": "User ID mismatch",
                        "response": data
                    }
                    print(f"❌ GET /api/auth/me FAILED - User ID mismatch")
            else:
                self.test_results["auth_endpoints"]["get_me"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/auth/me FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["auth_endpoints"]["get_me"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/auth/me ERROR: {e}")

        # Test POST /api/auth/session with fake session_id (should fail)
        try:
            fake_session_id = "fake_session_id_123"
            response = self.session.post(
                f"{self.base_url}/api/auth/session?session_id={fake_session_id}", 
                timeout=10
            )
            
            if response.status_code == 401:
                self.test_results["auth_endpoints"]["create_session_fake"] = {
                    "status": "PASS", 
                    "note": "Correctly returned 401 for fake session_id"
                }
                print("✅ POST /api/auth/session with fake ID PASSED - Correctly returned 401")
            else:
                self.test_results["auth_endpoints"]["create_session_fake"] = {
                    "status": "FAIL", 
                    "reason": f"Expected 401, got {response.status_code}",
                    "response": response.text
                }
                print(f"❌ POST /api/auth/session FAILED - Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.test_results["auth_endpoints"]["create_session_fake"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ POST /api/auth/session ERROR: {e}")
    
    def test_services_endpoints(self):
        """Test Services CRUD endpoints"""
        print("\n🔍 Testing Services Endpoints...")
        
        headers = {"Authorization": f"Bearer {self.test_token}", "Content-Type": "application/json"}
        
        # Test GET /api/services (public)
        try:
            response = self.session.get(f"{self.base_url}/api/services", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.test_results["services_endpoints"]["get_services"] = {
                    "status": "PASS", 
                    "response": f"Returned {len(data)} services"
                }
                print(f"✅ GET /api/services PASSED - Returned {len(data)} services")
            else:
                self.test_results["services_endpoints"]["get_services"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}"
                }
                print(f"❌ GET /api/services FAILED - HTTP {response.status_code}")
                
        except Exception as e:
            self.test_results["services_endpoints"]["get_services"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/services ERROR: {e}")

        # Test POST /api/services (requires barber auth)
        try:
            service_data = {
                "name": "Corte Masculino",
                "description": "Corte de cabelo masculino completo",
                "price": 50.0,
                "duration_minutes": 30
            }
            
            response = self.session.post(
                f"{self.base_url}/api/services/",
                headers=headers,
                json=service_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.created_service_id = data.get("id")
                self.test_results["services_endpoints"]["create_service"] = {
                    "status": "PASS", 
                    "service_id": self.created_service_id,
                    "response": data
                }
                print(f"✅ POST /api/services PASSED - Created service ID: {self.created_service_id}")
            else:
                self.test_results["services_endpoints"]["create_service"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ POST /api/services FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["services_endpoints"]["create_service"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ POST /api/services ERROR: {e}")

        # Test GET /api/services/{id} if service was created
        if self.created_service_id:
            try:
                response = self.session.get(f"{self.base_url}/api/services/{self.created_service_id}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.test_results["services_endpoints"]["get_service_by_id"] = {
                        "status": "PASS", 
                        "response": data
                    }
                    print(f"✅ GET /api/services/{self.created_service_id} PASSED")
                else:
                    self.test_results["services_endpoints"]["get_service_by_id"] = {
                        "status": "FAIL", 
                        "reason": f"HTTP {response.status_code}"
                    }
                    print(f"❌ GET /api/services/{self.created_service_id} FAILED - HTTP {response.status_code}")
                    
            except Exception as e:
                self.test_results["services_endpoints"]["get_service_by_id"] = {"status": "ERROR", "reason": str(e)}
                print(f"❌ GET /api/services/{self.created_service_id} ERROR: {e}")

        # Test PUT /api/services/{id} if service was created
        if self.created_service_id:
            try:
                update_data = {
                    "name": "Corte Masculino Premium",
                    "price": 60.0
                }
                
                response = self.session.put(
                    f"{self.base_url}/api/services/{self.created_service_id}",
                    headers=headers,
                    json=update_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.test_results["services_endpoints"]["update_service"] = {
                        "status": "PASS", 
                        "response": data
                    }
                    print(f"✅ PUT /api/services/{self.created_service_id} PASSED")
                else:
                    self.test_results["services_endpoints"]["update_service"] = {
                        "status": "FAIL", 
                        "reason": f"HTTP {response.status_code}",
                        "response": response.text
                    }
                    print(f"❌ PUT /api/services/{self.created_service_id} FAILED - HTTP {response.status_code}")
                    
            except Exception as e:
                self.test_results["services_endpoints"]["update_service"] = {"status": "ERROR", "reason": str(e)}
                print(f"❌ PUT /api/services/{self.created_service_id} ERROR: {e}")

    def test_products_endpoints(self):
        """Test Products CRUD endpoints"""
        print("\n🔍 Testing Products Endpoints...")
        
        headers = {"Authorization": f"Bearer {self.test_token}", "Content-Type": "application/json"}
        
        # Test GET /api/products (public)
        try:
            response = self.session.get(f"{self.base_url}/api/products", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.test_results["products_endpoints"]["get_products"] = {
                    "status": "PASS", 
                    "response": f"Returned {len(data)} products"
                }
                print(f"✅ GET /api/products PASSED - Returned {len(data)} products")
            else:
                self.test_results["products_endpoints"]["get_products"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}"
                }
                print(f"❌ GET /api/products FAILED - HTTP {response.status_code}")
                
        except Exception as e:
            self.test_results["products_endpoints"]["get_products"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/products ERROR: {e}")

        # Test POST /api/products (requires barber auth)
        try:
            product_data = {
                "name": "Gel Fixador",
                "description": "Gel para cabelo com fixação forte",
                "price": 25.0,
                "stock": 10
            }
            
            response = self.session.post(
                f"{self.base_url}/api/products/",
                headers=headers,
                json=product_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.created_product_id = data.get("id")
                self.test_results["products_endpoints"]["create_product"] = {
                    "status": "PASS", 
                    "product_id": self.created_product_id,
                    "response": data
                }
                print(f"✅ POST /api/products PASSED - Created product ID: {self.created_product_id}")
            else:
                self.test_results["products_endpoints"]["create_product"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ POST /api/products FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["products_endpoints"]["create_product"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ POST /api/products ERROR: {e}")

    def test_appointments_endpoints(self):
        """Test Appointments endpoints"""
        print("\n🔍 Testing Appointments Endpoints...")
        
        headers = {"Authorization": f"Bearer {self.test_token}", "Content-Type": "application/json"}
        
        # Test GET /api/appointments (requires auth)
        try:
            response = self.session.get(f"{self.base_url}/api/appointments", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.test_results["appointments_endpoints"]["get_appointments"] = {
                    "status": "PASS", 
                    "response": f"Returned {len(data)} appointments"
                }
                print(f"✅ GET /api/appointments PASSED - Returned {len(data)} appointments")
            else:
                self.test_results["appointments_endpoints"]["get_appointments"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/appointments FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["appointments_endpoints"]["get_appointments"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/appointments ERROR: {e}")

        # Test POST /api/appointments (requires auth and service_id)
        if self.created_service_id:
            try:
                appointment_data = {
                    "service_id": self.created_service_id,
                    "scheduled_time": "2026-03-15T10:00:00"
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/appointments/",
                    headers=headers,
                    json=appointment_data,
                    timeout=10
                )
                
                if response.status_code == 201:
                    data = response.json()
                    self.created_appointment_id = data.get("id")
                    self.test_results["appointments_endpoints"]["create_appointment"] = {
                        "status": "PASS", 
                        "appointment_id": self.created_appointment_id,
                        "response": data
                    }
                    print(f"✅ POST /api/appointments PASSED - Created appointment ID: {self.created_appointment_id}")
                else:
                    self.test_results["appointments_endpoints"]["create_appointment"] = {
                        "status": "FAIL", 
                        "reason": f"HTTP {response.status_code}",
                        "response": response.text
                    }
                    print(f"❌ POST /api/appointments FAILED - HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.test_results["appointments_endpoints"]["create_appointment"] = {"status": "ERROR", "reason": str(e)}
                print(f"❌ POST /api/appointments ERROR: {e}")

    def test_cash_register_endpoints(self):
        """Test Cash Register endpoints"""
        print("\n🔍 Testing Cash Register Endpoints...")
        
        headers = {"Authorization": f"Bearer {self.test_token}", "Content-Type": "application/json"}
        
        # Test GET /api/cash-register/current (should return 404 if none open)
        try:
            response = self.session.get(f"{self.base_url}/api/cash-register/current", headers=headers, timeout=10)
            
            if response.status_code in [404, 200]:  # 404 is OK if no register open, 200 if one exists
                if response.status_code == 404:
                    self.test_results["cash_register_endpoints"]["get_current"] = {
                        "status": "PASS", 
                        "note": "No open cash register (404 expected)"
                    }
                    print("✅ GET /api/cash-register/current PASSED - No open register (404 expected)")
                else:
                    data = response.json()
                    self.test_results["cash_register_endpoints"]["get_current"] = {
                        "status": "PASS", 
                        "response": data
                    }
                    print("✅ GET /api/cash-register/current PASSED - Existing register found")
            else:
                self.test_results["cash_register_endpoints"]["get_current"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/cash-register/current FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["cash_register_endpoints"]["get_current"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/cash-register/current ERROR: {e}")

        # Test POST /api/cash-register/open
        try:
            open_data = {
                "opening_balance": 100.0
            }
            
            response = self.session.post(
                f"{self.base_url}/api/cash-register/open",
                headers=headers,
                json=open_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.test_results["cash_register_endpoints"]["open_register"] = {
                    "status": "PASS", 
                    "response": data
                }
                print("✅ POST /api/cash-register/open PASSED")
            elif response.status_code == 400:
                # Already open is also OK
                self.test_results["cash_register_endpoints"]["open_register"] = {
                    "status": "PASS", 
                    "note": "Cash register already open (400 expected)"
                }
                print("✅ POST /api/cash-register/open PASSED - Already open (400 expected)")
            else:
                self.test_results["cash_register_endpoints"]["open_register"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ POST /api/cash-register/open FAILED - HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.test_results["cash_register_endpoints"]["open_register"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ POST /api/cash-register/open ERROR: {e}")

    async def cleanup_test_data(self):
        """Clean up test user and sessions from database"""
        print("\n🧹 Cleaning up test data...")
        
        try:
            async with async_session_factory() as db:
                # Delete test user sessions
                from sqlalchemy import delete
                await db.execute(
                    delete(UserSession).where(UserSession.user_id == self.test_user_id)
                )
                
                # Delete test user
                await db.execute(
                    delete(User).where(User.user_id == self.test_user_id)
                )
                
                await db.commit()
                
            self.test_results["cleanup"] = {
                "status": "PASS",
                "message": "Test data cleaned up successfully"
            }
            print("✅ Cleanup completed successfully")
            return True
            
        except Exception as e:
            self.test_results["cleanup"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ Cleanup failed: {e}")
            return False

    def generate_summary(self):
        """Generate test results summary"""
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        error_tests = 0
        
        # Count results from all categories except summary
        for category, results in self.test_results.items():
            if category in ["summary"]:
                continue
            
            if isinstance(results, dict):
                if "status" in results:  # Single test
                    total_tests += 1
                    if results["status"] == "PASS":
                        passed_tests += 1
                    elif results["status"] == "FAIL":
                        failed_tests += 1
                    elif results["status"] == "ERROR":
                        error_tests += 1
                else:  # Multiple tests in category
                    for test_name, result in results.items():
                        if isinstance(result, dict) and "status" in result:
                            total_tests += 1
                            if result["status"] == "PASS":
                                passed_tests += 1
                            elif result["status"] == "FAIL":
                                failed_tests += 1
                            elif result["status"] == "ERROR":
                                error_tests += 1
        
        self.test_results["summary"] = {
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests
        }
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"🔥 Errors: {error_tests}")
        print()
        
        # Print detailed results for failed/error tests
        if failed_tests > 0 or error_tests > 0:
            print("🔍 DETAILED FAILURE/ERROR REPORT:")
            print("-" * 40)
            
            for category, results in self.test_results.items():
                if category in ["summary"]:
                    continue
                
                if isinstance(results, dict):
                    if "status" in results and results["status"] in ["FAIL", "ERROR"]:
                        print(f"{category}: {results['status']} - {results.get('reason', results.get('error', 'No reason provided'))}")
                    else:
                        for test_name, result in results.items():
                            if isinstance(result, dict) and result.get("status") in ["FAIL", "ERROR"]:
                                print(f"{category}.{test_name}: {result['status']} - {result.get('reason', result.get('error', 'No reason provided'))}")

    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Comprehensive Barbershop Manager API Backend Tests...")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Setup test data
        if not await self.setup_test_data():
            print("❌ Setup failed, aborting tests")
            return self.test_results
        
        # Run all test methods
        self.test_health_check()
        self.test_auth_endpoints()
        self.test_services_endpoints()
        self.test_products_endpoints()
        self.test_appointments_endpoints()
        self.test_cash_register_endpoints()
        
        # Cleanup
        await self.cleanup_test_data()
        
        # Generate summary
        self.generate_summary()
        
        return self.test_results

async def main():
    """Main test runner"""
    tester = ComprehensiveBarbershopTester()
    results = await tester.run_all_tests()
    
    # Save results to file for analysis
    with open("/app/comprehensive_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: /app/comprehensive_test_results.json")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())