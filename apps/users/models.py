import secrets
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings


class User(AbstractUser):
    telegram_id = models.BigIntegerField(unique=True, null=True, blank=True)

    class Meta:
        db_table = 'users_user'


class TelegramUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='telegram_profile')
    telegram_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=255, blank=True)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    language_code = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.first_name or self.username or str(self.telegram_id)

    class Meta:
        db_table = 'users_telegramuser'


class TelegramLoginToken(models.Model):
    token = models.CharField(max_length=128, unique=True)
    telegram_user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()

    class Meta:
        db_table = 'users_telegramlogintoken'


def generate_login_url(telegram_user):
    """Create a one-time login token and return the full auth URL."""
    token = secrets.token_urlsafe(64)
    TelegramLoginToken.objects.create(
        token=token,
        telegram_user=telegram_user,
        expires_at=timezone.now() + timezone.timedelta(minutes=settings.TELEGRAM_TOKEN_TTL),
    )
    return f"{settings.SITE_URL}/auth/?token={token}"
