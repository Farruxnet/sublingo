from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib import messages
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import TelegramLoginToken


def login_view(request):
    if request.user.is_authenticated:
        return redirect('library')
    bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', 'SubLingoBot')
    return render(request, 'users/login.html', {'telegram_bot_username': bot_username})


def auth_view(request):
    token_str = request.GET.get('token', '').strip()
    if not token_str:
        messages.error(request, 'Invalid login link.')
        return redirect('login')

    try:
        token = TelegramLoginToken.objects.select_related(
            'telegram_user__user'
        ).get(token=token_str)
    except TelegramLoginToken.DoesNotExist:
        messages.error(request, 'Login link not found or already used.')
        return redirect('login')

    if not token.is_valid():
        messages.error(request, 'Login link has expired. Please request a new one from the bot.')
        return redirect('login')

    token.used = True
    token.save(update_fields=['used'])

    user = token.telegram_user.user
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return redirect('library')


def logout_view(request):
    logout(request)
    return redirect('login')


@csrf_exempt
def telegram_webhook_view(request):
    if request.method != 'POST':
        return HttpResponse(status=400)

    secret = settings.TELEGRAM_WEBHOOK_SECRET
    if secret and request.headers.get('X-Telegram-Bot-Api-Secret-Token') != secret:
        return HttpResponse(status=403)

    import telebot
    from .bot.bot import bot
    if bot is None:
        return HttpResponse(status=503)
    bot.process_new_updates([
        telebot.types.Update.de_json(request.body.decode('utf-8'))
    ])
    return HttpResponse(status=200)
