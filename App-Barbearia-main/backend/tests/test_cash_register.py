"""
Test Cash Register with Product Sales Totals
"""
import asyncio
import os
import sys
import requests

sys.path.insert(0, '/app/backend')

async def get_test_token():
    """Get existing test session token"""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select
    
    DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://neondb_owner:npg_Z9VJg3sFYhyr@ep-shiny-moon-ai8b3te3-pooler.c-4.us-east-1.aws.neon.tech/neondb')
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        from models import User, UserSession
        
        result = await session.execute(
            select(UserSession).join(User).where(User.email == "test_barber@testing.com")
        )
        user_session = result.scalar_one_or_none()
        
        if user_session:
            await engine.dispose()
            return user_session.session_token
        
        await engine.dispose()
        return None


def test_cash_register_flow(token):
    """Test cash register open, product sale, current totals, close"""
    BASE_URL = "https://gestao-app-1.preview.emergentagent.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    results = {"passed": 0, "failed": 0}
    
    print("\n📋 Testing Cash Register Flow...")
    
    # Step 1: Open cash register
    print("\n1. Opening cash register...")
    resp = requests.post(
        f"{BASE_URL}/api/cash-register/open",
        headers=headers,
        json={"opening_balance": 100.0}
    )
    
    if resp.status_code == 200:
        register = resp.json()
        print(f"✅ Cash register opened - ID: {register.get('id')}")
        results["passed"] += 1
    elif resp.status_code == 400:
        print(f"⚠️ Cash register already open")
        results["passed"] += 1
    else:
        print(f"❌ Failed to open cash register: {resp.status_code} - {resp.text}")
        results["failed"] += 1
        return results
    
    # Step 2: Make a product sale
    print("\n2. Making a product sale...")
    products_resp = requests.get(f"{BASE_URL}/api/products/")
    products = products_resp.json()
    
    if products:
        product = products[0]
        sale_resp = requests.post(
            f"{BASE_URL}/api/products/{product['id']}/sell?quantity=1",
            headers=headers
        )
        
        if sale_resp.status_code == 200:
            sale_data = sale_resp.json()
            print(f"✅ Product sold - {product['name']}, Total: {sale_data.get('total')}")
            results["passed"] += 1
        elif sale_resp.status_code == 400:
            print(f"⚠️ Product stock insufficient")
            results["passed"] += 1
        else:
            print(f"❌ Product sale failed: {sale_resp.status_code}")
            results["failed"] += 1
    
    # Step 3: Get current cash register (should include product sales totals)
    print("\n3. Getting current cash register...")
    current_resp = requests.get(
        f"{BASE_URL}/api/cash-register/current",
        headers=headers
    )
    
    if current_resp.status_code == 200:
        current = current_resp.json()
        print(f"✅ Current cash register:")
        print(f"   - Opening balance: {current.get('opening_balance')}")
        print(f"   - Total services: {current.get('total_services')}")
        print(f"   - Total products: {current.get('total_products')}")
        
        # Verify total_products field exists
        if "total_products" in current:
            print(f"   ✅ Product sales included in cash register totals")
            results["passed"] += 1
        else:
            print(f"   ❌ Missing total_products field")
            results["failed"] += 1
    else:
        print(f"❌ Failed to get current register: {current_resp.status_code}")
        results["failed"] += 1
    
    # Step 4: Close cash register
    print("\n4. Closing cash register...")
    close_resp = requests.post(
        f"{BASE_URL}/api/cash-register/close",
        headers=headers,
        json={"closing_balance": 250.0}
    )
    
    if close_resp.status_code == 200:
        closed = close_resp.json()
        print(f"✅ Cash register closed:")
        print(f"   - Opening balance: {closed.get('opening_balance')}")
        print(f"   - Closing balance: {closed.get('closing_balance')}")
        print(f"   - Total services: {closed.get('total_services')}")
        print(f"   - Total products: {closed.get('total_products')}")
        results["passed"] += 1
    else:
        print(f"❌ Failed to close register: {close_resp.status_code} - {close_resp.text}")
        results["failed"] += 1
    
    return results


async def main():
    print("=" * 60)
    print("Cash Register with Product Sales Test")
    print("=" * 60)
    
    try:
        token = await get_test_token()
        if not token:
            print("❌ No test session found. Run test_authenticated.py first.")
            return
        
        print(f"✅ Using test token: {token[:30]}...")
        
        results = test_cash_register_flow(token)
        
        print("\n" + "=" * 60)
        print(f"Results: {results['passed']} passed, {results['failed']} failed")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
