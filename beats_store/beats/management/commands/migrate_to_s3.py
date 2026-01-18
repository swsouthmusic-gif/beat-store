"""
Django management command to migrate files from local storage to AWS S3.

Usage:
    python manage.py migrate_to_s3
    
    # Dry run (preview without uploading)
    python manage.py migrate_to_s3 --dry-run
    
    # Migrate specific beat
    python manage.py migrate_to_s3 --beat-id 1
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.storage import default_storage
from pathlib import Path
from beats.models import Beat
import os
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate files from local storage to AWS S3'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be migrated without actually uploading',
        )
        parser.add_argument(
            '--beat-id',
            type=int,
            help='Migrate only a specific beat by ID',
        )
        parser.add_argument(
            '--skip-on-error',
            action='store_true',
            help='Continue even if errors occur (useful for deployment)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        beat_id = options.get('beat_id')
        skip_on_error = options.get('skip_on_error', False)
        
        # Check if S3 is configured
        if not getattr(settings, 'USE_S3', False):
            if skip_on_error:
                self.stdout.write(
                    self.style.WARNING('S3 is not configured. Skipping migration.')
                )
                return 0  # Return success code
            else:
                self.stdout.write(
                    self.style.ERROR('S3 is not configured. Please set AWS credentials in your environment.')
                )
                return 1  # Return error code
        
        self.stdout.write(self.style.SUCCESS('Starting migration to S3...'))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No files will be uploaded'))
        
        # Get beats to migrate
        if beat_id:
            beats = Beat.objects.filter(id=beat_id)
            if not beats.exists():
                self.stdout.write(self.style.ERROR(f'Beat with ID {beat_id} not found.'))
                return
        else:
            beats = Beat.objects.all()
        
        total_beats = beats.count()
        self.stdout.write(f'Found {total_beats} beat(s) to process')
        
        migrated_count = 0
        skipped_count = 0
        error_count = 0
        
        for beat in beats:
            self.stdout.write(f'\nProcessing Beat ID {beat.id}: {beat.name}')
            beat_migrated = False
            
            # Files to migrate with their field names and expected S3 folders
            files_to_migrate = [
                ('cover_art', 'covers/'),
                ('snippet_mp3', 'preview-snippet/'),
                ('mp3_file', 'beats/'),
                ('wav_file', 'beats/'),
                ('stems_file', 'beats/'),
            ]
            
            for field_name, s3_folder in files_to_migrate:
                file_field = getattr(beat, field_name, None)
                
                if not file_field or not file_field.name:
                    continue
                
                # Check if file exists locally first (even if URL suggests S3)
                # When S3 is configured, file_field.path won't work, so check local filesystem
                local_path = None
                file_exists_locally = False
                
                # Get BASE_DIR to find local media files
                # BASE_DIR is beats_store/ directory
                # Media files are typically in beats_store/media/
                # Command is at: beats_store/beats/management/commands/migrate_to_s3.py
                # BASE_DIR would be beats_store/, so go: commands -> management -> beats -> beats_store
                command_dir = Path(__file__).resolve().parent.parent.parent.parent
                local_media_root = command_dir / "media"
                
                # Initialize variables
                local_path = None
                file_exists_locally = False
                
                # Try to get local path from file_field (works if using local storage)
                # Don't use hasattr() as it triggers the property which raises NotImplementedError for S3
                try:
                    local_path = file_field.path
                    file_exists_locally = os.path.exists(local_path)
                except (NotImplementedError, AttributeError):
                    # S3 storage doesn't support .path - this is expected, check local filesystem instead
                    pass
                
                # If not found, check local media directory (files from before S3 was configured)
                if not file_exists_locally and local_media_root.exists():
                    filename_only = os.path.basename(file_field.name)
                    
                    # Try current path structure
                    potential_paths = [
                        local_media_root / file_field.name,  # Current path
                        local_media_root / "downloads" / "mp3" / filename_only,  # Old mp3 path
                        local_media_root / "downloads" / "wav" / filename_only,  # Old wav path
                        local_media_root / "downloads" / "stems" / filename_only,  # Old stems path
                        local_media_root / "snippets" / filename_only,  # Old snippets path
                        local_media_root / "covers" / filename_only,  # Covers path
                    ]
                    
                    for potential_path in potential_paths:
                        if potential_path.exists():
                            local_path = str(potential_path)
                            file_exists_locally = True
                            self.stdout.write(f'  → Found local file at: {local_path}')
                            break
                
                # Check if file actually exists in S3
                file_exists_in_s3 = False
                if hasattr(file_field, 'url') and 'amazonaws.com' in file_field.url:
                    # Try to verify file exists in S3
                    try:
                        if default_storage.exists(file_field.name):
                            file_exists_in_s3 = True
                            # Also check if it's in the correct folder (not old paths like downloads/mp3/)
                            if file_field.name.startswith('beats/') or file_field.name.startswith('covers/') or file_field.name.startswith('preview-snippet/') or file_field.name.startswith('mp3-snippets/'):
                                self.stdout.write(f'  ✓ {field_name}: Already in S3 at correct location, skipping')
                                continue
                            else:
                                # File is in S3 but wrong location, we'll migrate it
                                self.stdout.write(
                                    self.style.WARNING(f'  ⚠ {field_name}: In S3 but wrong location ({file_field.name}), will migrate to correct folder')
                                )
                        else:
                            # URL suggests S3 but file doesn't exist
                            self.stdout.write(
                                self.style.WARNING(f'  ⚠ {field_name}: S3 URL exists but file not found in bucket, will migrate from local if available')
                            )
                    except Exception as e:
                        # Can't verify S3, assume it doesn't exist
                        self.stdout.write(
                            self.style.WARNING(f'  ⚠ {field_name}: Could not verify S3 existence ({str(e)}), will check local')
                        )
                
                # If file exists in S3 at correct location, skip
                if file_exists_in_s3 and (file_field.name.startswith('beats/') or file_field.name.startswith('covers/') or file_field.name.startswith('preview-snippet/') or file_field.name.startswith('mp3-snippets/')):
                    continue
                
                # Check if we have a local file to migrate
                if not file_exists_locally:
                    if file_exists_in_s3:
                        # File is in S3 but wrong location - we'd need to copy within S3
                        # For now, skip and note it
                        self.stdout.write(
                            self.style.WARNING(f'  ⚠ {field_name}: File in S3 at wrong location but no local copy. Manual migration needed.')
                        )
                        continue
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  ⚠ {field_name}: No local file found and not in S3')
                        )
                        continue
                
                try:
                    # Get the filename (remove any old folder paths like downloads/mp3/)
                    filename = os.path.basename(file_field.name)
                    
                    if dry_run:
                        self.stdout.write(
                            self.style.WARNING(f'  [DRY RUN] Would upload {field_name} to s3://{settings.AWS_STORAGE_BUCKET_NAME}/{s3_folder}{filename}')
                        )
                        beat_migrated = True  # Count in dry run too
                    else:
                        # Read file content
                        with open(local_path, 'rb') as f:
                            file_content = f.read()
                        
                        # Create a Django file object
                        from django.core.files.base import ContentFile
                        django_file = ContentFile(file_content)
                        django_file.name = filename
                        
                        # Delete old file from S3 if it exists at wrong location
                        if file_exists_in_s3 and file_field.name:
                            try:
                                default_storage.delete(file_field.name)
                                self.stdout.write(f'  → Deleted old S3 file: {file_field.name}')
                            except Exception as e:
                                # Ignore errors if file doesn't exist
                                pass
                        
                        # Use the field's save method which will handle upload_to automatically
                        # This ensures files go to the correct folders (beats/, covers/, preview-snippet/)
                        getattr(beat, field_name).save(filename, django_file, save=False)
                        
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ {field_name}: Uploaded to {getattr(beat, field_name).name}')
                        )
                        beat_migrated = True
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {field_name}: Error - {str(e)}')
                    )
                    error_count += 1
                    logger.error(f'Error migrating {field_name} for beat {beat.id}: {e}')
                    if not skip_on_error:
                        raise  # Re-raise if not skipping on error
            
            # Save the beat if any files were migrated
            if beat_migrated and not dry_run:
                try:
                    beat.save()
                    migrated_count += 1
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Beat {beat.id} saved'))
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error saving beat {beat.id}: {str(e)}')
                    )
                    error_count += 1
            elif not beat_migrated:
                skipped_count += 1
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Migration Summary:'))
        self.stdout.write(f'  Total beats processed: {total_beats}')
        if not dry_run:
            self.stdout.write(f'  Successfully migrated: {migrated_count}')
            self.stdout.write(f'  Skipped (already in S3): {skipped_count}')
            self.stdout.write(f'  Errors: {error_count}')
        else:
            self.stdout.write(self.style.WARNING('  (Dry run - no files were actually migrated)'))
        self.stdout.write('='*50)
        
        # Return appropriate exit code
        if error_count > 0 and not skip_on_error:
            return 1
        return 0
