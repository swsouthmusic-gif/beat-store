from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Beat, Purchase, UserProfile

class BeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Beat
        fields = '__all__'

class PurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['photo', 'bio', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


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
