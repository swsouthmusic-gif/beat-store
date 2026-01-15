"""
Django management command to create a superuser from environment variables.
This is useful for production deployments where you can't interactively create a superuser.

Usage:
    python manage.py create_superuser
    
    # Or with environment variables:
    DJANGO_SUPERUSER_USERNAME=admin DJANGO_SUPERUSER_EMAIL=admin@example.com DJANGO_SUPERUSER_PASSWORD=securepass python manage.py create_superuser

The command will:
- Skip if a superuser already exists (unless --force is used)
- Create a superuser using environment variables
- Fail gracefully if required environment variables are missing
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError
from decouple import config
import os


class Command(BaseCommand):
    help = 'Create a superuser from environment variables'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if a superuser already exists',
        )
        parser.add_argument(
            '--username',
            type=str,
            default=None,
            help='Superuser username (overrides DJANGO_SUPERUSER_USERNAME env var)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='Superuser email (overrides DJANGO_SUPERUSER_EMAIL env var)',
        )
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help='Superuser password (overrides DJANGO_SUPERUSER_PASSWORD env var)',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        # Check if superuser already exists
        if not force and User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.SUCCESS('Superuser already exists. Skipping creation.')
            )
            self.stdout.write(
                'Use --force to create another superuser or delete existing one first.'
            )
            return 0

        # Get credentials from arguments or environment variables
        username = options['username'] or config('DJANGO_SUPERUSER_USERNAME', default=None)
        email = options['email'] or config('DJANGO_SUPERUSER_EMAIL', default=None)
        password = options['password'] or config('DJANGO_SUPERUSER_PASSWORD', default=None)

        # Validate required fields
        if not username:
            self.stdout.write(
                self.style.ERROR(
                    'Username is required. Set DJANGO_SUPERUSER_USERNAME environment variable '
                    'or use --username argument.'
                )
            )
            return 1

        if not email:
            self.stdout.write(
                self.style.WARNING(
                    'Email not provided. Using empty string. '
                    'Set DJANGO_SUPERUSER_EMAIL environment variable or use --email argument.'
                )
            )
            email = ''

        if not password:
            self.stdout.write(
                self.style.ERROR(
                    'Password is required. Set DJANGO_SUPERUSER_PASSWORD environment variable '
                    'or use --password argument.'
                )
            )
            return 1

        # Check if username already exists
        if User.objects.filter(username=username).exists():
            if force:
                self.stdout.write(
                    self.style.WARNING(
                        f'User "{username}" already exists. Updating to superuser...'
                    )
                )
                user = User.objects.get(username=username)
                user.is_superuser = True
                user.is_staff = True
                user.email = email
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated user "{username}" to superuser.'
                    )
                )
                return 0
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f'User "{username}" already exists. Use --force to update to superuser.'
                    )
                )
                return 1

        # Create superuser
        try:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created superuser "{username}"'
                )
            )
            return 0
        except IntegrityError as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating superuser: {e}')
            )
            return 1
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Unexpected error: {e}')
            )
            return 1
