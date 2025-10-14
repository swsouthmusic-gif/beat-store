#!/usr/bin/env python
"""
Script to create test beats for the beat store
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

from beats.models import Beat
from decimal import Decimal

def create_test_beats():
    # Check if beats already exist
    if Beat.objects.count() > 0:
        print(f"Found {Beat.objects.count()} existing beats. Skipping creation.")
        return
    
    # Create test beats using existing media files
    test_beats = [
        {
            'name': '12 Uvas Master',
            'genre': 'Hip Hop',
            'bpm': 140,
            'scale': 'C Minor',
            'cover_art': 'covers/Super.png',
            'snippet_mp3': 'snippets/12_uvas_master.mp3',
            'price': Decimal('29.99'),
            'wav_file': 'downloads/wav/12uvasmaster.wav',
            'wav_price': Decimal('39.99'),
            'mp3_file': 'downloads/mp3/12_uvas_master.mp3',
            'mp3_price': Decimal('19.99'),
            'stems_file': 'downloads/stems/STEMS.zip',
            'stems_price': Decimal('49.99'),
        },
        {
            'name': 'Situacion 85 Beat',
            'genre': 'Trap',
            'bpm': 85,
            'scale': 'F# Major',
            'cover_art': 'covers/cover.jpeg',
            'snippet_mp3': 'snippets/situacion_85_beat_ref.mp3',
            'price': Decimal('24.99'),
            'wav_file': 'downloads/wav/situacion_85_beat_ref_music.wav',
            'wav_price': Decimal('34.99'),
            'mp3_file': 'downloads/mp3/situacion_85_beat_ref.mp3',
            'mp3_price': Decimal('14.99'),
            'stems_file': 'downloads/stems/un_poquito.zip',
            'stems_price': Decimal('44.99'),
        },
        {
            'name': 'BULMA Beat',
            'genre': 'Drill',
            'bpm': 150,
            'scale': 'A Minor',
            'cover_art': 'covers/Super.png',  # Using existing cover
            'snippet_mp3': 'snippets/12_uvas_master.mp3',  # Using existing snippet
            'price': Decimal('19.99'),
            'wav_file': 'downloads/wav/12uvasmaster.wav',  # Using existing file
            'wav_price': Decimal('29.99'),
            'mp3_file': 'downloads/mp3/12_uvas_master.mp3',  # Using existing file
            'mp3_price': Decimal('9.99'),
            'stems_file': 'downloads/stems/STEMS.zip',  # Using existing file
            'stems_price': Decimal('39.99'),
        }
    ]
    
    created_beats = []
    for beat_data in test_beats:
        beat = Beat.objects.create(**beat_data)
        created_beats.append(beat)
        print(f"Created beat: {beat.name}")
    
    print(f"\nSuccessfully created {len(created_beats)} test beats!")
    print("You can now see the beats in your frontend application.")

if __name__ == '__main__':
    create_test_beats()
