from django.contrib import admin
from django.contrib.auth import logout
from django.urls import path, include
from django.shortcuts import redirect
from django.http import HttpRequest, HttpResponseRedirect
from django.views.decorators.http import require_http_methods

from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def redirect_to_admin(request: HttpRequest) -> HttpResponseRedirect:
    return redirect('/admin/', permanent=False)

@require_http_methods(["GET", "POST"])
def admin_logout_view(request):
    """Custom logout view that accepts both GET and POST requests"""
    logout(request)
    return redirect('/admin/')

urlpatterns = [
    path('', redirect_to_admin),
    path('admin/logout/', admin_logout_view, name='admin_logout'),
    path('admin/', admin.site.urls),

    path('api/', include('beats.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media files in both development and production
# In production, consider using cloud storage (S3, etc.) for better performance
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
