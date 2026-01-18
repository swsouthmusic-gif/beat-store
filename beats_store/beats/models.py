from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
import uuid
import os
import logging

logger = logging.getLogger(__name__)

class Beat(models.Model):
    name = models.CharField(max_length=255)
    genre = models.CharField(max_length=100)
    bpm = models.PositiveIntegerField()
    scale = models.CharField(max_length=50)

    cover_art = models.ImageField(upload_to="covers/", null=True, blank=True)
    snippet_mp3 = models.FileField(upload_to="preview-snippet/", null=True, blank=True)

    price = models.DecimalField(max_digits=6, decimal_places=2)

    wav_file = models.FileField(upload_to="beats/", null=True, blank=True)
    wav_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    mp3_file = models.FileField(upload_to="beats/", null=True, blank=True)
    mp3_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    stems_file = models.FileField(upload_to="beats/", null=True, blank=True)
    stems_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Purchase(models.Model):
    DOWNLOAD_TYPE_CHOICES = [
        ('mp3', 'MP3'),
        ('wav', 'WAV'),
        ('stems', 'Stems'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    beat = models.ForeignKey(Beat, on_delete=models.CASCADE)
    download_type = models.CharField(max_length=10, choices=DOWNLOAD_TYPE_CHOICES)
    price_paid = models.DecimalField(max_digits=6, decimal_places=2)
    payment_method = models.CharField(max_length=50, default='stripe')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'beat', 'download_type']
    
    def __str__(self):
        return f"{self.user.username} - {self.beat.name} ({self.download_type})"


class UserProfile(models.Model):
    """Extended user profile with additional fields"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    photo = models.ImageField(upload_to="user-avatar/", null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"


class StripeWebhookEvent(models.Model):
    """Track Stripe webhook events to prevent duplicate processing"""
    stripe_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Stripe Event: {self.event_type} ({self.stripe_event_id})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile when a User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Automatically save the UserProfile when the User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


@receiver(pre_save, sender=Beat)
def track_mp3_file_change(sender, instance, **kwargs):
    """Track if mp3_file is being changed to regenerate snippet if needed"""
    if instance.pk:
        try:
            old_instance = Beat.objects.get(pk=instance.pk)
            # Check if mp3_file changed
            if old_instance.mp3_file != instance.mp3_file:
                instance._mp3_file_changed = True
            # If snippet was auto-generated (ends with '_preview.mp3'), mark it for regeneration
            if old_instance.snippet_mp3:
                snippet_name = os.path.basename(old_instance.snippet_mp3.name)
                if snippet_name.endswith('_preview.mp3'):
                    instance._should_regenerate_snippet = True
        except Beat.DoesNotExist:
            pass


@receiver(post_save, sender=Beat)
def generate_snippet_from_mp3(sender, instance, created, **kwargs):
    """Automatically generate a 30-second snippet from mp3_file if snippet_mp3 is not provided"""
    # Prevent recursion if we're updating the snippet
    if hasattr(instance, '_updating_snippet'):
        return
    
    # Skip snippet generation during migrations or data loading
    # Check if we're in a management command context
    import sys
    if any('migrate' in arg or 'load_beats' in arg or 'migrate_to_s3' in arg for arg in sys.argv):
        return
    
    # Skip if mp3_file doesn't exist
    if not instance.mp3_file:
        return
    
    # Determine if we need to generate snippet
    should_generate = False
    
    if created:
        # New beat: generate if snippet doesn't exist
        should_generate = not instance.snippet_mp3
    else:
        # Existing beat: regenerate if mp3_file changed and snippet was auto-generated
        if hasattr(instance, '_should_regenerate_snippet') and instance._should_regenerate_snippet:
            should_generate = True
        # Or generate if snippet doesn't exist but mp3_file does
        elif not instance.snippet_mp3:
            should_generate = True
    
    if not should_generate:
        return
    
    try:
        from pydub import AudioSegment
        import tempfile
        
        # Handle both local and S3 storage
        if hasattr(instance.mp3_file, 'path'):
            # Local storage
            mp3_path = instance.mp3_file.path
            if not os.path.exists(mp3_path):
                logger.warning(f"MP3 file not found at {mp3_path}")
                return
            # Load the audio file
            audio = AudioSegment.from_mp3(mp3_path)
        else:
            # S3 storage - download to temp file first using storage backend
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                # Use storage backend to read the file
                with instance.mp3_file.open('rb') as source_file:
                    temp_file.write(source_file.read())
                    temp_path = temp_file.name
            
            # Load the audio file
            audio = AudioSegment.from_mp3(temp_path)
            # Clean up temp file after loading
            os.unlink(temp_path)
        
        # Get the first 30 seconds (30 * 1000 milliseconds)
        snippet_duration = 30 * 1000  # 30 seconds in milliseconds
        # Ensure we don't exceed the audio length
        snippet = audio[:min(snippet_duration, len(audio))]
        
        # Generate snippet filename - use the beat name or ID for uniqueness
        mp3_filename = os.path.basename(instance.mp3_file.name)
        # Remove extension from mp3 filename and use beat name/ID for snippet
        mp3_name_without_ext = os.path.splitext(mp3_filename)[0]
        snippet_filename = f"{mp3_name_without_ext}_preview.mp3"
        
        # Export snippet to a temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            snippet.export(temp_file.name, format='mp3')
            temp_path = temp_file.name
        
        # Read the generated snippet
        with open(temp_path, 'rb') as f:
            snippet_content = f.read()
        
        # Delete old snippet if regenerating
        if instance.snippet_mp3 and hasattr(instance, '_should_regenerate_snippet'):
            instance.snippet_mp3.delete(save=False)
        
        # Save to snippet_mp3 field - this will automatically use "preview-snippet/" folder
        # due to upload_to="preview-snippet/" in the model field definition
        instance.snippet_mp3.save(
            snippet_filename,
            ContentFile(snippet_content),
            save=False
        )
        
        # Clean up temporary file
        os.unlink(temp_path)
        
        # Save the instance to persist the snippet (using update_fields to avoid recursion)
        # Mark that we're updating snippet to prevent infinite recursion
        instance._updating_snippet = True
        instance.save(update_fields=['snippet_mp3'])
        delattr(instance, '_updating_snippet')
        
        logger.info(f"Generated 30-second snippet for beat {instance.id}")
        
    except ImportError:
        logger.error("pydub is not installed. Please install it with: pip install pydub")
    except Exception as e:
        logger.error(f"Error generating snippet for beat {instance.id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
