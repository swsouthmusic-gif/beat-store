"""
Django management command to export all beat data to JSON.
This can be used to transfer beats from local to production.

Usage:
    python manage.py export_beats
    
    # Export to specific file
    python manage.py export_beats --output beats_export.json
"""

from django.core.management.base import BaseCommand
from django.core import serializers
from beats.models import Beat
import json


class Command(BaseCommand):
    help = 'Export all beat data to JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='beats_export.json',
            help='Output file path (default: beats_export.json)',
        )

    def handle(self, *args, **options):
        output_file = options['output']
        
        beats = Beat.objects.all()
        total = beats.count()
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No beats found in database.'))
            return
        
        self.stdout.write(f'Exporting {total} beat(s)...')
        
        # Export beats to JSON (excluding file fields - those are handled by migrate_to_s3)
        # We'll export the metadata, and files will be migrated separately
        data = serializers.serialize('json', beats, fields=(
            'name', 'genre', 'bpm', 'scale', 'price',
            'mp3_price', 'wav_price', 'stems_price', 'created_at'
        ))
        
        # Also include file field names for reference
        beats_data = []
        for beat in beats:
            beat_dict = {
                'model': 'beats.beat',
                'pk': beat.pk,
                'fields': {
                    'name': beat.name,
                    'genre': beat.genre,
                    'bpm': beat.bpm,
                    'scale': beat.scale,
                    'price': str(beat.price),
                    'mp3_price': str(beat.mp3_price) if beat.mp3_price else None,
                    'wav_price': str(beat.wav_price) if beat.wav_price else None,
                    'stems_price': str(beat.stems_price) if beat.stems_price else None,
                    'created_at': beat.created_at.isoformat(),
                    # File field names (for reference - files are migrated separately)
                    'cover_art_name': beat.cover_art.name if beat.cover_art else None,
                    'snippet_mp3_name': beat.snippet_mp3.name if beat.snippet_mp3 else None,
                    'mp3_file_name': beat.mp3_file.name if beat.mp3_file else None,
                    'wav_file_name': beat.wav_file.name if beat.wav_file else None,
                    'stems_file_name': beat.stems_file.name if beat.stems_file else None,
                }
            }
            beats_data.append(beat_dict)
        
        # Write to file in beats_store directory (so it's accessible during deployment)
        from django.conf import settings
        from pathlib import Path
        output_path = Path(settings.BASE_DIR) / output_file
        
        with open(output_path, 'w') as f:
            json.dump(beats_data, f, indent=2)
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Exported {total} beat(s) to {output_path}')
        )
        self.stdout.write(f'\n📝 Next steps:')
        self.stdout.write(f'   1. Run: python manage.py migrate_to_s3 (to upload files to S3)')
        self.stdout.write(f'   2. Commit {output_file} to git: git add {output_file}')
        self.stdout.write(f'   3. Push to deploy - beats will auto-load in production if database is empty')
