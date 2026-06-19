from .bot import bot
from .keyboards import login_keyboard
from ..bot_helpers import get_or_create_telegram_user, issue_login_url


@bot.message_handler(commands=['start'])
def start(message):
    tg = message.from_user
    telegram_user = get_or_create_telegram_user({
        'id':            tg.id,
        'username':      tg.username or '',
        'first_name':    tg.first_name or '',
        'last_name':     tg.last_name or '',
        'language_code': tg.language_code or '',
    })

    login_url = issue_login_url(telegram_user)

    bot.send_message(
        message.chat.id,
        'Click the button below to log in to SubLingo.',
        reply_markup=login_keyboard(login_url),
    )
