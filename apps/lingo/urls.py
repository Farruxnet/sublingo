from django.urls import path
from . import views

urlpatterns = [
    path('', views.library_view, name='home'),
    path('library/', views.library_view, name='library'),
    path('deck/<int:deck_id>/', views.deck_view, name='deck'),
    path('deck/<int:deck_id>/words/', views.words_view, name='words'),
    path('deck/<int:deck_id>/flashcards/', views.flashcards_view, name='flashcards'),
    path('deck/<int:deck_id>/test/', views.test_view, name='test'),
    # AJAX endpoints
    path('deck/<int:deck_id>/words/<int:word_id>/toggle/', views.toggle_learned_view, name='toggle_learned'),
    path('deck/<int:deck_id>/rate/', views.rate_card_view, name='rate_card'),
    path('deck/create/', views.create_deck_view, name='create_deck'),
    path('deck/<int:deck_id>/rename/', views.rename_deck_view, name='rename_deck'),
    path('deck/<int:deck_id>/delete/', views.delete_deck_view, name='delete_deck'),
]
