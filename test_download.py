#!/usr/bin/env python3
"""
Test script to create a fake purchase and test download functionality
"""
import os
import sys
import django
import requests
import json

# Add the beats_store directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'beats_store'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'beats_store.settings')
django.setup()

from django.contrib.auth.models import User
from beats.models import Beat, Purchase

def create_test_purchase():
    print("Creating test purchase...")
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✅ Created test user: {user.username}")
    else:
        print(f"✅ Using existing test user: {user.username}")
    
    # Get the first available beat
    beat = Beat.objects.first()
    if not beat:
        print("❌ No beats found in database. Please add some beats first.")
        return None, None
    
    print(f"✅ Using beat: {beat.name} (ID: {beat.id})")
    
    # Check if MP3 file exists
    if not beat.mp3_file:
        print("❌ No MP3 file available for this beat")
        return None, None
    
    print(f"✅ MP3 file available: {beat.mp3_file}")
    
    # Create a test purchase for MP3 download
    purchase, created = Purchase.objects.get_or_create(
        user=user,
        beat=beat,
        download_type='mp3',
        defaults={
            'price_paid': 9.99,
            'payment_method': 'test'
        }
    )
    
    if created:
        print(f"✅ Created test purchase: {purchase}")
    else:
        print(f"✅ Purchase already exists: {purchase}")
    
    return user, beat

def test_download_api():
    print("\n" + "="*60)
    print("TESTING DOWNLOAD API")
    print("="*60)
    
    # First, get a JWT token
    print("1. Getting JWT token...")
    token_response = requests.post('http://localhost:8000/api/token/', {
        'username': 'testuser',
        'password': 'testpass123'
    })
    
    if token_response.status_code != 200:
        print(f"❌ Failed to get token: {token_response.text}")
        return
    
    token_data = token_response.json()
    access_token = token_data['access']
    print(f"✅ Got access token: {access_token[:20]}...")
    
    # Get beats to find one with a purchase
    print("\n2. Getting beats...")
    beats_response = requests.get('http://localhost:8000/api/beats/')
    if beats_response.status_code != 200:
        print(f"❌ Failed to get beats: {beats_response.text}")
        return
    
    beats = beats_response.json()
    if not beats:
        print("❌ No beats found")
        return
    
    beat = beats[0]
    print(f"✅ Found beat: {beat['name']} (ID: {beat['id']})")
    
    # Test download
    print("\n3. Testing download...")
    download_url = f"http://localhost:8000/api/beats/{beat['id']}/download/?type=mp3"
    headers = {'Authorization': f'Bearer {access_token}'}
    
    download_response = requests.get(download_url, headers=headers)
    
    if download_response.status_code == 200:
        print(f"✅ Download successful! File size: {len(download_response.content)} bytes")
        
        # Save the file for testing
        filename = f"test_download_{beat['name'].replace(' ', '_')}.mp3"
        with open(filename, 'wb') as f:
            f.write(download_response.content)
        print(f"✅ File saved as: {filename}")
    else:
        print(f"❌ Download failed: {download_response.status_code} - {download_response.text}")

if __name__ == "__main__":
    print("BEAT STORE DOWNLOAD TEST")
    print("="*60)
    
    # Create test purchase
    user, beat = create_test_purchase()
    
    if user and beat:
        print(f"\n📋 TEST INFORMATION:")
        print(f"   Username: {user.username}")
        print(f"   Password: testpass123")
        print(f"   Beat ID: {beat.id}")
        print(f"   Beat Name: {beat.name}")
        print(f"   Download URL: http://localhost:8000/api/beats/{beat.id}/download/?type=mp3")
        
        # Test the API
        test_download_api()
    else:
        print("❌ Could not create test purchase")
