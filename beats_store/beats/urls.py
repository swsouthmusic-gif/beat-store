# beats/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BeatViewSet, stripe_webhook, UserProfileView, UserRegistrationView

router = DefaultRouter()
router.register(r'beats', BeatViewSet)

urlpatterns = [
    path('stripe/webhook/', stripe_webhook, name='stripe_webhook'),
    path('users/profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/register/', UserRegistrationView.as_view(), name='user_registration'),
] + router.urls
