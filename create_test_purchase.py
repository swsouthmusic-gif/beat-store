#!/usr/bin/env python3
"""
Script to create a test purchase for testing download functionality
"""
import os
import sys
import django

# Add the beats_store directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'beats_store'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'beats_store.settings')
django.setup()

from django.contrib.auth.models import User
from beats.models import Beat, Purchase

def create_test_purchase():
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
        print(f"Created test user: {user.username}")
    else:
        print(f"Using existing test user: {user.username}")
    
    # Get the first available beat
    beat = Beat.objects.first()
    if not beat:
        print("No beats found in database. Please add some beats first.")
        return
    
    print(f"Using beat: {beat.name}")
    
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
        print(f"Created test purchase: {purchase}")
        print(f"Download URL: /api/beats/{beat.id}/download/?type=mp3")
    else:
        print(f"Purchase already exists: {purchase}")
        print(f"Download URL: /api/beats/{beat.id}/download/?type=mp3")
    
    # Print user info for frontend testing
    print("\n" + "="*50)
    print("TEST USER INFO FOR FRONTEND:")
    print(f"Username: {user.username}")
    print(f"Password: testpass123")
    print(f"Beat ID: {beat.id}")
    print(f"Beat Name: {beat.name}")
    print("="*50)

if __name__ == "__main__":
    create_test_purchase()
