#!/usr/bin/env python
"""
Script to create a test user for authentication testing
Run this from the project root directory
"""
import os
import sys
import django

# Add the Django project directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'beats_store'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'beats_store.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_user():
    # Check if user already exists
    if User.objects.filter(username='testuser').exists():
        print("Test user 'testuser' already exists!")
        return
    
    # Create test user
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    
    print(f"Test user created successfully!")
    print(f"Username: testuser")
    print(f"Password: testpass123")
    print(f"Email: test@example.com")

if __name__ == '__main__':
    create_test_user()
