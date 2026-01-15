from pathlib import Path
import os
from decouple import config, AutoConfig
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
# Project root is one level up from BASE_DIR (where .env file is located)
PROJECT_ROOT = BASE_DIR.parent

# Configure decouple to look for .env in project root
config = AutoConfig(search_path=PROJECT_ROOT)


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-aot-xqio#(y@502=naxb+jl@=+9v2xd6+fb(^xlqt!_5i32_6#')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])


# Application definition

INSTALLED_APPS = [
    'jazzmin',   
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'storages',  # django-storages for S3
    'rest_framework',
    'corsheaders',
    'beats',
    'drf_spectacular',
    'drf_spectacular_sidecar',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS Configuration
# For development, allow all origins. For production, set CORS_ALLOW_ALL_ORIGINS=False in .env
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://localhost:3000,https://swsmusicgroup.com,https://www.swsmusicgroup.com',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()]
)

ROOT_URLCONF = 'beats_store.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'beats_store.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# For local development, use SQLite by default
# For production, use DATABASE_URL from environment (Railway PostgreSQL)
if DEBUG:
    # Local development: always use SQLite, completely ignore DATABASE_URL
    # This ensures Railway database URLs don't interfere with local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Production: use DATABASE_URL from environment (Railway PostgreSQL)
    DATABASES = {
        'default': dj_database_url.config(
            default=config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
        )
    }


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

JAZZMIN_SETTINGS = {
    "site_title": "Beat Store Admin",
    "site_header": "Beat Store Admin",
    "site_brand": "Beat Store",
    "welcome_sign": "Welcome to Beat Store Admin",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "navbar_small_text": True,
    "body_small_text": True,
    "brand_colour": "navbar-dark", 
    "accent": "accent-primary",
    "navbar": "navbar-dark navbar-gray",
    "sidebar": "sidebar-dark-primary",
}

# AWS S3 Configuration
# Automatically use S3 if credentials are provided (works in both local dev and production)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default=None)
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default=None)
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default=None)

# Check if S3 should be used (if credentials are provided, use S3)
USE_S3 = (
    AWS_ACCESS_KEY_ID is not None and 
    AWS_SECRET_ACCESS_KEY is not None and 
    AWS_STORAGE_BUCKET_NAME is not None
)

if USE_S3:
    # AWS S3 settings
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None)
    
    # S3 settings
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_VERIFY = True
    
    # Force HTTPS for S3 URLs
    AWS_S3_USE_SSL = True
    AWS_S3_USE_SIGV4 = True
    AWS_S3_SECURE_URLS = True  # Force HTTPS in generated URLs
    
    # Media files (user uploads)
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Generate correct S3 URL based on region
    # For most regions: https://bucket-name.s3.region.amazonaws.com/
    # For us-east-1: https://bucket-name.s3.amazonaws.com/ (no region in URL)
    if AWS_S3_REGION_NAME == 'us-east-1':
        s3_domain = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    else:
        s3_domain = f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"
    
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN or s3_domain}/'
    MEDIA_ROOT = None  # Not used with S3
else:
    # Local file storage (fallback when S3 credentials not provided)
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# Production settings
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    # Disable SSL redirect for local development
    SECURE_SSL_REDIRECT = False

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        "rest_framework.authentication.SessionAuthentication",
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Beats Store API',
    'DESCRIPTION': 'API docs for managing beats, files, prices, etc.',
    'VERSION': '1.0.0',
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
}

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Stripe Configuration
# Use live keys in production (when DEBUG=False), test keys in development
if not DEBUG:
    # Production: Use live keys
    # Priority: STRIPE_*_LIVE env vars > STRIPE_* env vars > defaults
    STRIPE_PUBLISHABLE_KEY = config(
        'STRIPE_PUBLISHABLE_KEY_LIVE',
        default=config('STRIPE_PUBLISHABLE_KEY', default=None)
    )
    STRIPE_SECRET_KEY = config(
        'STRIPE_SECRET_KEY_LIVE',
        default=config('STRIPE_SECRET_KEY', default=None)
    )
    STRIPE_WEBHOOK_SECRET = config(
        'STRIPE_WEBHOOK_SECRET_LIVE',
        default=config('STRIPE_WEBHOOK_SECRET', default=None)
    )
else:
    # Development: Use test keys
    STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default=None)
    STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default=None)
    STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default=None)
