from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, TelegramUser, TelegramLoginToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'telegram_id', 'is_staff', 'date_joined')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Telegram', {'fields': ('telegram_id',)}),
    )


@admin.register(TelegramUser)
class TelegramUserAdmin(admin.ModelAdmin):
    list_display = ('telegram_id', 'first_name', 'username', 'language_code', 'created_at')
    search_fields = ('telegram_id', 'username', 'first_name')
    raw_id_fields = ('user',)


@admin.register(TelegramLoginToken)
class TelegramLoginTokenAdmin(admin.ModelAdmin):
    list_display = ('telegram_user', 'used', 'expires_at')
    list_filter = ('used',)
    raw_id_fields = ('telegram_user',)
