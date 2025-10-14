from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid

class Beat(models.Model):
    name = models.CharField(max_length=255)
    genre = models.CharField(max_length=100)
    bpm = models.PositiveIntegerField()
    scale = models.CharField(max_length=50)

    cover_art = models.ImageField(upload_to="covers/")
    snippet_mp3 = models.FileField(upload_to="snippets/")

    price = models.DecimalField(max_digits=6, decimal_places=2)

    wav_file = models.FileField(upload_to="downloads/wav/", null=True, blank=True)
    wav_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    mp3_file = models.FileField(upload_to="downloads/mp3/", null=True, blank=True)
    mp3_price = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    stems_file = models.FileField(upload_to="downloads/stems/", null=True, blank=True)
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
    photo = models.ImageField(upload_to="profiles/", null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
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
