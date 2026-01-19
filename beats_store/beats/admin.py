from django.contrib import admin
from .models import Beat, Purchase, UserProfile, StripeWebhookEvent

@admin.register(Beat)
class BeatAdmin(admin.ModelAdmin):
    list_display = ("name", "genre", "bpm", "price", "uploaded_by", "created_at")
    search_fields = ("name", "genre", "uploaded_by__username")
    list_filter = ("genre", "scale", "bpm", "uploaded_by")
    exclude = ("snippet_mp3",)  # Exclude snippet_mp3 from form - it's auto-generated from mp3_file
    
    def has_module_permission(self, request):
        """Allow staff and superusers to access Beat model"""
        return request.user.is_staff or request.user.is_superuser
    
    def has_view_permission(self, request, obj=None):
        """Allow staff and superusers to view Beats"""
        return request.user.is_staff or request.user.is_superuser
    
    def has_add_permission(self, request):
        """Allow staff and superusers to add Beats"""
        return request.user.is_staff or request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """Allow staff and superusers to edit Beats"""
        return request.user.is_staff or request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Allow staff and superusers to delete Beats"""
        return request.user.is_staff or request.user.is_superuser

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("user", "beat", "download_type", "price_paid", "payment_method", "created_at")
    search_fields = ("user__username", "beat__name")
    list_filter = ("download_type", "payment_method", "created_at")
    readonly_fields = ("created_at",)
    
    def has_module_permission(self, request):
        """Only superusers can access Purchase model"""
        return request.user.is_superuser
    
    def has_view_permission(self, request, obj=None):
        """Only superusers can view Purchases"""
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        """Only superusers can add Purchases"""
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """Only superusers can edit Purchases"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete Purchases"""
        return request.user.is_superuser

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "updated_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
    
    def has_module_permission(self, request):
        """Only superusers can access UserProfile model"""
        return request.user.is_superuser
    
    def has_view_permission(self, request, obj=None):
        """Only superusers can view UserProfiles"""
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        """Only superusers can add UserProfiles"""
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """Only superusers can edit UserProfiles"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete UserProfiles"""
        return request.user.is_superuser

@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("stripe_event_id", "event_type", "processed", "created_at")
    search_fields = ("stripe_event_id", "event_type")
    list_filter = ("event_type", "processed", "created_at")
    readonly_fields = ("stripe_event_id", "event_type", "created_at")
    
    def has_module_permission(self, request):
        """Only superusers can access StripeWebhookEvent model"""
        return request.user.is_superuser
    
    def has_view_permission(self, request, obj=None):
        """Only superusers can view StripeWebhookEvents"""
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        """StripeWebhookEvents are created automatically, no manual add"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Only superusers can edit StripeWebhookEvents"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete StripeWebhookEvents"""
        return request.user.is_superuser
