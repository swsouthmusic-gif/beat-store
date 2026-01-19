"""
Django management command to load beat data from JSON export.
This imports beats into the database (but not files - files must be in S3).

Usage:
    python manage.py load_beats beats_export.json
    
    # Skip existing beats (by name)
    python manage.py load_beats beats_export.json --skip-existing
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from beats.models import Beat
from decimal import Decimal
from pathlib import Path
import json
import os


class Command(BaseCommand):
    help = 'Load beat data from JSON export file'

    def add_arguments(self, parser):
        parser.add_argument(
            'input_file',
            type=str,
            nargs='?',
            default=None,
            help='JSON file containing beat data to import (default: beats_export.json)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip beats that already exist (by name)',
        )
        parser.add_argument(
            '--auto',
            action='store_true',
            help='Automatically load if no beats exist in database',
        )

    def handle(self, *args, **options):
        input_file = options['input_file'] or 'beats_export.json'
        skip_existing = options['skip_existing']
        auto = options['auto']
        
        # Auto mode: only load if no beats exist
        if auto:
            beat_count = Beat.objects.count()
            if beat_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'Database already has {beat_count} beat(s). Skipping auto-load.')
                )
                return 0
        
        # Try to find the file in multiple locations
        file_path = None
        search_paths = [
            input_file,  # Current directory
            Path(settings.BASE_DIR) / input_file,  # beats_store/ directory
            Path(settings.BASE_DIR).parent / input_file,  # Project root
        ]
        
        for path in search_paths:
            if os.path.exists(path):
                file_path = path
                break
        
        if not file_path:
            if auto:
                # In auto mode, silently skip if file doesn't exist
                self.stdout.write(
                    self.style.WARNING(f'Export file not found: {input_file}. Skipping auto-load.')
                )
                return 0
            else:
                self.stdout.write(
                    self.style.ERROR(f'File not found: {input_file}')
                )
                self.stdout.write(f'Searched in: {", ".join(str(p) for p in search_paths)}')
                return 1
        
        input_file = file_path
        
        self.stdout.write(f'Loading beats from {input_file}...')
        
        with open(input_file, 'r') as f:
            beats_data = json.load(f)
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for beat_data in beats_data:
            fields = beat_data.get('fields', {})
            beat_name = fields.get('name')
            
            # Check if beat already exists
            if skip_existing and Beat.objects.filter(name=beat_name).exists():
                self.stdout.write(f'  ⏭  Skipping existing beat: {beat_name}')
                skipped_count += 1
                continue
            
            try:
                # Create beat (without file fields - those should be in S3)
                # Handle backward compatibility: if 'price' exists, use it as mp3_price fallback
                mp3_price_value = fields.get('mp3_price')
                if not mp3_price_value and fields.get('price'):
                    mp3_price_value = fields.get('price')
                
                beat = Beat.objects.create(
                    name=beat_name,
                    genre=fields.get('genre', ''),
                    bpm=fields.get('bpm', 120),
                    scale=fields.get('scale', ''),
                    mp3_price=Decimal(mp3_price_value) if mp3_price_value else Decimal('0.00'),
                    wav_price=Decimal(fields['wav_price']) if fields.get('wav_price') else None,
                    stems_price=Decimal(fields['stems_price']) if fields.get('stems_price') else None,
                )
                
                # Note: File fields are not set here - they should already be in S3
                # The file field names are in the export for reference
                # You'll need to manually set file fields or they'll be set when files are uploaded
                
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created beat: {beat.name} (ID: {beat.id})')
                )
                created_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error creating beat {beat_name}: {str(e)}')
                )
                error_count += 1
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Skipped: {skipped_count}')
        self.stdout.write(f'  Errors: {error_count}')
        self.stdout.write('='*50)
        self.stdout.write('\n⚠️  Note: File fields are not imported.')
        self.stdout.write('   Files should already be in S3. Set file fields manually if needed.')
        
        # Return appropriate exit code
        if error_count > 0:
            return 1
        return 0
