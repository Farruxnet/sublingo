from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('auth/', views.auth_view, name='auth'),
    path('logout/', views.logout_view, name='logout'),
    path('telegram/webhook/', views.telegram_webhook_view, name='telegram_webhook'),
]
