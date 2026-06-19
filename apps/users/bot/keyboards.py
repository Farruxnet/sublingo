import telebot


def login_keyboard(login_url: str) -> telebot.types.InlineKeyboardMarkup:
    markup = telebot.types.InlineKeyboardMarkup()
    markup.add(
        telebot.types.InlineKeyboardButton(
            text='Login to SubLingo',
            url=login_url,
        )
    )
    return markup
