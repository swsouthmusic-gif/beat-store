from django.contrib import admin
from .models import Beat, Purchase

@admin.register(Beat)
class BeatAdmin(admin.ModelAdmin):
    list_display = ("name", "genre", "bpm", "price", "created_at")
    search_fields = ("name", "genre")
    list_filter = ("genre", "scale", "bpm")

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("user", "beat", "download_type", "price_paid", "payment_method", "created_at")
    search_fields = ("user__username", "beat__name")
    list_filter = ("download_type", "payment_method", "created_at")
    readonly_fields = ("created_at",)
