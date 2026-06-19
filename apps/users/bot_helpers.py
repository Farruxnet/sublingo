from django.contrib.auth import get_user_model
from .models import TelegramUser, generate_login_url

User = get_user_model()


def get_or_create_telegram_user(tg_user: dict) -> TelegramUser:
    """Upsert User + TelegramUser from a Telegram user dict."""
    telegram_id = tg_user['id']

    try:
        tg = TelegramUser.objects.select_related('user').get(telegram_id=telegram_id)
        # Update mutable fields in case they changed
        tg.username      = tg_user.get('username', '') or ''
        tg.first_name    = tg_user.get('first_name', '') or ''
        tg.last_name     = tg_user.get('last_name', '') or ''
        tg.language_code = tg_user.get('language_code', '') or ''
        tg.save(update_fields=['username', 'first_name', 'last_name', 'language_code'])
        # Keep User.telegram_id in sync
        tg.user.telegram_id = telegram_id
        tg.user.save(update_fields=['telegram_id'])
        return tg
    except TelegramUser.DoesNotExist:
        pass

    username = tg_user.get('username') or f'tg_{telegram_id}'
    user, _ = User.objects.get_or_create(
        username=username,
        defaults={
            'telegram_id': telegram_id,
            'first_name':  tg_user.get('first_name', '') or '',
            'last_name':   tg_user.get('last_name', '') or '',
        }
    )
    user.telegram_id = telegram_id
    user.save(update_fields=['telegram_id'])

    return TelegramUser.objects.create(
        user=user,
        telegram_id=telegram_id,
        username=tg_user.get('username', '') or '',
        first_name=tg_user.get('first_name', '') or '',
        last_name=tg_user.get('last_name', '') or '',
        language_code=tg_user.get('language_code', '') or '',
    )


def issue_login_url(telegram_user: TelegramUser) -> str:
    """Generate and return a one-time login URL for this Telegram user."""
    return generate_login_url(telegram_user)
