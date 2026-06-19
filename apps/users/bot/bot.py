import telebot
from django.conf import settings

token = settings.TELEGRAM_BOT_TOKEN
# ponytail: lazy None guard — bot is None when token not configured; webhook view checks before use
bot = telebot.TeleBot(token, threaded=False) if token else None

if bot is not None:
    from . import handlers  # noqa: E402,F401 — registers handlers on import
