from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from urllib.parse import urljoin
from .models import Beat, Purchase, UserProfile

class BeatSerializer(serializers.ModelSerializer):
    # Ensure file fields return absolute URLs
    cover_art = serializers.SerializerMethodField()
    snippet_mp3 = serializers.SerializerMethodField()
    mp3_file = serializers.SerializerMethodField()
    wav_file = serializers.SerializerMethodField()
    stems_file = serializers.SerializerMethodField()
    
    class Meta:
        model = Beat
        fields = '__all__'
        read_only_fields = ['snippet_mp3']  # snippet_mp3 is auto-generated from mp3_file
    
    def _get_file_url(self, file_field):
        """Helper method to get absolute URL for file fields"""
        if not file_field:
            return None
        
        try:
            # Try to get URL from storage backend (works for both local and S3)
            if hasattr(file_field, 'url'):
                url = file_field.url
                
                # Ensure HTTPS for S3 URLs (fix any HTTP S3 URLs)
                if url.startswith('http://') and 'amazonaws.com' in url:
                    url = url.replace('http://', 'https://')
                
                # Handle protocol-relative URLs
                if url.startswith('//'):
                    url = 'https:' + url
                
                # Handle relative URLs
                elif url.startswith('/') and not url.startswith('http'):
                    if settings.USE_S3:
                        # S3: prepend MEDIA_URL (which is already the full S3 domain)
                        url = urljoin(settings.MEDIA_URL, url.lstrip('/'))
                    else:
                        # Local: build absolute URL using request
                        request = self.context.get('request')
                        if request:
                            url = request.build_absolute_uri(url)
                        else:
                            # Fallback: prepend MEDIA_URL
                            url = urljoin(settings.MEDIA_URL, url.lstrip('/'))
                
                return url
            elif hasattr(file_field, 'name') and file_field.name:
                # Fallback: construct URL from name
                if settings.USE_S3:
                    # S3: MEDIA_URL is already the full domain
                    return urljoin(settings.MEDIA_URL, file_field.name)
                else:
                    # Local: build absolute URL
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(settings.MEDIA_URL + file_field.name)
                    else:
                        return urljoin(settings.MEDIA_URL, file_field.name)
        except Exception as e:
            # Log error but don't break serialization
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting file URL: {e}")
        
        return None
    
    def get_cover_art(self, obj):
        return self._get_file_url(obj.cover_art)
    
    def get_snippet_mp3(self, obj):
        return self._get_file_url(obj.snippet_mp3)
    
    def get_mp3_file(self, obj):
        return self._get_file_url(obj.mp3_file)
    
    def get_wav_file(self, obj):
        return self._get_file_url(obj.wav_file)
    
    def get_stems_file(self, obj):
        return self._get_file_url(obj.stems_file)

class PurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = ['photo', 'bio', 'middle_initial', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_photo(self, obj):
        """Get absolute URL for photo field (works for both local and S3)"""
        if not obj.photo:
            return None
        
        try:
            # Try to get URL from storage backend (works for both local and S3)
            if hasattr(obj.photo, 'url'):
                url = obj.photo.url
                
                # Ensure HTTPS for S3 URLs (fix any HTTP S3 URLs)
                if url.startswith('http://') and 'amazonaws.com' in url:
                    url = url.replace('http://', 'https://')
                
                # Handle protocol-relative URLs
                if url.startswith('//'):
                    url = 'https:' + url
                
                # Handle relative URLs
                elif url.startswith('/') and not url.startswith('http'):
                    if settings.USE_S3:
                        # S3: prepend MEDIA_URL (which is already the full S3 domain)
                        url = urljoin(settings.MEDIA_URL, url.lstrip('/'))
                    else:
                        # Local: build absolute URL using request
                        request = self.context.get('request')
                        if request:
                            url = request.build_absolute_uri(url)
                        else:
                            # Fallback: prepend MEDIA_URL
                            url = urljoin(settings.MEDIA_URL, url.lstrip('/'))
                
                return url
            elif hasattr(obj.photo, 'name') and obj.photo.name:
                # Fallback: construct URL from name
                if settings.USE_S3:
                    # S3: MEDIA_URL is already the full domain
                    return urljoin(settings.MEDIA_URL, obj.photo.name)
                else:
                    # Local: build absolute URL
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(settings.MEDIA_URL + obj.photo.name)
                    else:
                        return urljoin(settings.MEDIA_URL, obj.photo.name)
        except Exception as e:
            # Log error but don't break serialization
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting photo URL: {e}")
        
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id']
    
    def update(self, instance, validated_data):
        # Handle profile data if provided
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile if data provided
        if profile_data:
            profile, created = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            print(f"Profile updated: {profile.photo}, {profile.bio}")
        
        # Refresh the instance to get the updated profile data
        instance.refresh_from_db()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate_username(self, value):
        """Validate that username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another one.")
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        # Create profile for new user
        UserProfile.objects.create(user=user)
        return user
