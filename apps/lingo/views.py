import json
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from .models import Deck, Word


@login_required
def library_view(request):
    decks = Deck.objects.filter(owner=request.user).prefetch_related('words')
    return render(request, 'lingo/library.html', {'decks': decks})


@login_required
def deck_view(request, deck_id):
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    deck.last_studied = timezone.now()
    deck.save(update_fields=['last_studied'])
    words = list(deck.words.all())
    total = len(words)
    learned = sum(1 for w in words if w.learned)
    pct = round(learned / total * 100) if total else 0
    return render(request, 'lingo/deck.html', {
        'deck': deck,
        'total': total,
        'learned': learned,
        'pct': pct,
        'no_words': total == 0,
        'too_few': total < 2,
    })


@login_required
def words_view(request, deck_id):
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    words = list(deck.words.all())
    total = len(words)
    learned = sum(1 for w in words if w.learned)
    pct = round(learned / total * 100) if total else 0

    return render(request, 'lingo/words.html', {
        'deck': deck,
        'words': words,
        'words_json': json.dumps([_word_to_dict(w) for w in words]),
        'total': total,
        'learned': learned,
        'pct': pct,
    })


@login_required
def toggle_learned_view(request, deck_id, word_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    word = get_object_or_404(Word, pk=word_id, deck=deck)
    word.learned = not word.learned
    word.save(update_fields=['learned'])
    stats = deck.stats
    return JsonResponse({
        'learned': word.learned,
        'total': stats['total'],
        'learned_count': stats['learned'],
    })


@login_required
def flashcards_view(request, deck_id):
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    words = list(deck.words.all())
    if len(words) == 0:
        return redirect('deck', deck_id=deck_id)
    return render(request, 'lingo/flashcards.html', {
        'deck': deck,
        'words_json': json.dumps([_word_to_dict(w) for w in words]),
    })


@login_required
def rate_card_view(request, deck_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    word_id = data.get('word_id')
    rating = data.get('rating')
    if rating == 'easy' and word_id:
        Word.objects.filter(pk=word_id, deck=deck).update(learned=True)
    return JsonResponse({'ok': True})


@login_required
def test_view(request, deck_id):
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    words = list(deck.words.all())
    if len(words) < 2:
        return redirect('deck', deck_id=deck_id)
    return render(request, 'lingo/test.html', {
        'deck': deck,
        'words_json': json.dumps([_word_to_dict(w) for w in words]),
    })


@login_required
def create_deck_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)

    name = data.get('name', '').strip() or 'Untitled deck'
    source = data.get('source', '').strip() or 'Unknown source'
    deck = Deck.objects.create(owner=request.user, name=name, source=source)
    return JsonResponse({'id': deck.pk, 'name': deck.name})


@login_required
def rename_deck_view(request, deck_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'invalid json'}, status=400)
    name = data.get('name', '').strip()
    if name:
        deck.name = name
        deck.save(update_fields=['name'])
    return JsonResponse({'name': deck.name})


@login_required
def delete_deck_view(request, deck_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)
    deck = get_object_or_404(Deck, pk=deck_id, owner=request.user)
    deck.delete()
    return JsonResponse({'ok': True})


def _word_to_dict(w):
    return {
        'id': w.pk,
        'word': w.word,
        'partOfSpeech': w.part_of_speech,
        'translation': w.translation,
        'definition': w.definition,
        'ipa': w.ipa,
        'example': w.example,
        'level': w.level,
        'learned': w.learned,
    }
