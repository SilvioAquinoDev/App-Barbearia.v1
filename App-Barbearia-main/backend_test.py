#!/usr/bin/env python3
"""
Backend API Testing Suite for Barbershop Manager
Tests all backend endpoints according to the review request.
"""

import requests
import json
from typing import Dict, Any

class BarbershopAPITester:
    def __init__(self, base_url: str = "https://cutflow-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            "health_check": None,
            "services_endpoints": {},
            "products_endpoints": {},
            "appointments_endpoints": {},
            "cash_register_endpoints": {},
            "errors": []
        }
    
    def test_health_check(self):
        """Test GET /api/health - Should return status healthy"""
        try:
            print("🔍 Testing Health Check...")
            response = self.session.get(f"{self.base_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["status", "service", "version"]
                
                if all(key in data for key in expected_keys) and data.get("status") == "healthy":
                    self.test_results["health_check"] = {"status": "PASS", "response": data}
                    print("✅ Health check PASSED")
                    return True
                else:
                    self.test_results["health_check"] = {"status": "FAIL", "reason": "Invalid response format", "response": data}
                    print(f"❌ Health check FAILED - Invalid response format: {data}")
                    return False
            else:
                self.test_results["health_check"] = {"status": "FAIL", "reason": f"HTTP {response.status_code}", "response": response.text}
                print(f"❌ Health check FAILED - HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.test_results["health_check"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ Health check ERROR: {e}")
            return False
    
    def test_services_endpoints(self):
        """Test Services endpoints (No auth required for GET)"""
        print("\n🔍 Testing Services Endpoints...")
        
        # Test GET /api/services
        try:
            response = self.session.get(f"{self.base_url}/api/services", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.test_results["services_endpoints"]["get_services"] = {
                        "status": "PASS", 
                        "response": data,
                        "note": f"Returned {len(data)} services"
                    }
                    print(f"✅ GET /api/services PASSED - Returned {len(data)} services")
                else:
                    self.test_results["services_endpoints"]["get_services"] = {
                        "status": "FAIL", 
                        "reason": "Response is not a list",
                        "response": data
                    }
                    print(f"❌ GET /api/services FAILED - Expected list, got: {type(data)}")
            else:
                self.test_results["services_endpoints"]["get_services"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/services FAILED - HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.test_results["services_endpoints"]["get_services"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/services ERROR: {e}")
    
    def test_products_endpoints(self):
        """Test Products endpoints (No auth required for GET)"""
        print("\n🔍 Testing Products Endpoints...")
        
        # Test GET /api/products
        try:
            response = self.session.get(f"{self.base_url}/api/products", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.test_results["products_endpoints"]["get_products"] = {
                        "status": "PASS", 
                        "response": data,
                        "note": f"Returned {len(data)} products"
                    }
                    print(f"✅ GET /api/products PASSED - Returned {len(data)} products")
                else:
                    self.test_results["products_endpoints"]["get_products"] = {
                        "status": "FAIL", 
                        "reason": "Response is not a list",
                        "response": data
                    }
                    print(f"❌ GET /api/products FAILED - Expected list, got: {type(data)}")
            else:
                self.test_results["products_endpoints"]["get_products"] = {
                    "status": "FAIL", 
                    "reason": f"HTTP {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/products FAILED - HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.test_results["products_endpoints"]["get_products"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/products ERROR: {e}")
    
    def test_appointments_endpoints(self):
        """Test Appointments endpoints (Requires auth)"""
        print("\n🔍 Testing Appointments Endpoints...")
        
        # Test GET /api/appointments without auth - Should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/appointments", timeout=10)
            
            if response.status_code == 401:
                self.test_results["appointments_endpoints"]["get_appointments_no_auth"] = {
                    "status": "PASS", 
                    "note": "Correctly returned 401 without authentication"
                }
                print("✅ GET /api/appointments without auth PASSED - Correctly returned 401")
            else:
                self.test_results["appointments_endpoints"]["get_appointments_no_auth"] = {
                    "status": "FAIL", 
                    "reason": f"Expected 401, got {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/appointments without auth FAILED - Expected 401, got {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.test_results["appointments_endpoints"]["get_appointments_no_auth"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/appointments ERROR: {e}")
    
    def test_cash_register_endpoints(self):
        """Test Cash Register endpoints (Requires auth)"""
        print("\n🔍 Testing Cash Register Endpoints...")
        
        # Test GET /api/cash-register/current without auth - Should return 401
        try:
            response = self.session.get(f"{self.base_url}/api/cash-register/current", timeout=10)
            
            if response.status_code == 401:
                self.test_results["cash_register_endpoints"]["get_current_no_auth"] = {
                    "status": "PASS", 
                    "note": "Correctly returned 401 without authentication"
                }
                print("✅ GET /api/cash-register/current without auth PASSED - Correctly returned 401")
            else:
                self.test_results["cash_register_endpoints"]["get_current_no_auth"] = {
                    "status": "FAIL", 
                    "reason": f"Expected 401, got {response.status_code}",
                    "response": response.text
                }
                print(f"❌ GET /api/cash-register/current without auth FAILED - Expected 401, got {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            self.test_results["cash_register_endpoints"]["get_current_no_auth"] = {"status": "ERROR", "reason": str(e)}
            print(f"❌ GET /api/cash-register/current ERROR: {e}")
    
    def test_additional_endpoints(self):
        """Test additional endpoints for completeness"""
        print("\n🔍 Testing Additional Endpoints...")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{self.base_url}/api", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ GET /api PASSED - Response: {data}")
            else:
                print(f"❌ GET /api FAILED - HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ GET /api ERROR: {e}")
    
    def run_all_tests(self):
        """Run all tests and provide summary"""
        print("🚀 Starting Barbershop Manager API Backend Tests...")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Run all test methods
        self.test_health_check()
        self.test_services_endpoints()
        self.test_products_endpoints()
        self.test_appointments_endpoints() 
        self.test_cash_register_endpoints()
        self.test_additional_endpoints()
        
        # Print summary
        self.print_summary()
        
        return self.test_results
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        error_tests = 0
        
        # Count results
        for category, results in self.test_results.items():
            if category == "errors":
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
                if category == "errors":
                    continue
                
                if isinstance(results, dict):
                    if "status" in results and results["status"] in ["FAIL", "ERROR"]:
                        print(f"{category}: {results['status']} - {results.get('reason', 'No reason provided')}")
                    else:
                        for test_name, result in results.items():
                            if isinstance(result, dict) and result.get("status") in ["FAIL", "ERROR"]:
                                print(f"{category}.{test_name}: {result['status']} - {result.get('reason', 'No reason provided')}")

def main():
    """Main test runner"""
    tester = BarbershopAPITester()
    results = tester.run_all_tests()
    
    # Save results to file for analysis
    with open("/app/test_results_backend.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: /app/test_results_backend.json")

if __name__ == "__main__":
    main()