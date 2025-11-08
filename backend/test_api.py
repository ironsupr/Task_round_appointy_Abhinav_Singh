"""
Simple test script to verify API is working
Run: python test_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_root():
    """Test root endpoint"""
    print("Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200

def test_register():
    """Test user registration"""
    print("Testing user registration...")
    data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Token received: {result['access_token'][:20]}...\n")
        return result['access_token']
    else:
        print(f"Error: {response.json()}\n")
        # Try login instead
        return test_login()

def test_login():
    """Test user login"""
    print("Testing user login...")
    data = {
        "username": "testuser",
        "password": "testpass123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=data)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Token received: {result['access_token'][:20]}...\n")
        return result['access_token']
    else:
        print(f"Error: {response.json()}\n")
        return None

def test_get_user(token):
    """Test getting current user"""
    print("Testing get current user...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"User: {response.json()}\n")
    return response.status_code == 200

def test_create_content(token):
    """Test creating content"""
    print("Testing content creation...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "content_type": "article",
        "title": "Test Article",
        "raw_data": "This is a test article about artificial intelligence and machine learning.",
        "source_url": "https://example.com",
        "metadata": {"domain": "example.com"}
    }
    response = requests.post(f"{BASE_URL}/api/content", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Content created with ID: {result['id']}\n")
        return result['id']
    else:
        print(f"Error: {response.json()}\n")
        return None

def test_get_contents(token):
    """Test getting all content"""
    print("Testing get all content...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/content", headers=headers)
    print(f"Status: {response.status_code}")
    contents = response.json()
    print(f"Found {len(contents)} items\n")
    return response.status_code == 200

def test_search(token):
    """Test semantic search"""
    print("Testing semantic search...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "query": "articles about AI",
        "limit": 10
    }
    response = requests.post(f"{BASE_URL}/api/search", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        results = response.json()
        print(f"Found {len(results)} results\n")
        return True
    else:
        print(f"Error: {response.json()}\n")
        return False

def main():
    print("=" * 50)
    print("Synapse API Test Suite")
    print("=" * 50)
    print()

    try:
        # Test root
        if not test_root():
            print("❌ Root endpoint failed!")
            return

        # Register/Login
        token = test_register()
        if not token:
            print("❌ Authentication failed!")
            return

        # Test authenticated endpoints
        if not test_get_user(token):
            print("❌ Get user failed!")
            return

        # Create content
        content_id = test_create_content(token)
        if not content_id:
            print("❌ Create content failed!")
            return

        # Get contents
        if not test_get_contents(token):
            print("❌ Get contents failed!")
            return

        # Search
        if not test_search(token):
            print("❌ Search failed!")
            return

        print("=" * 50)
        print("✅ All tests passed!")
        print("=" * 50)

    except requests.exceptions.ConnectionError:
        print("❌ Connection error! Is the backend running on http://localhost:8000?")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
