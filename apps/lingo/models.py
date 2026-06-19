from django.db import models
from django.conf import settings


class Deck(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='decks')
    name = models.CharField(max_length=255)
    source = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_studied = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lingo_deck'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def stats(self):
        words = self.words.all()
        total = words.count()
        learned = words.filter(learned=True).count()
        return {'total': total, 'learned': learned}


LEVEL_CHOICES = [
    ('A1', 'A1'), ('A2', 'A2'),
    ('B1', 'B1'), ('B2', 'B2'),
    ('C1', 'C1'), ('C2', 'C2'),
]


class Word(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='words')
    word = models.CharField(max_length=255)
    part_of_speech = models.CharField(max_length=100, blank=True)
    translation = models.CharField(max_length=500, blank=True)
    definition = models.TextField(blank=True)
    ipa = models.CharField(max_length=255, blank=True)
    example = models.TextField(blank=True)
    level = models.CharField(max_length=2, choices=LEVEL_CHOICES, blank=True)
    learned = models.BooleanField(default=False)

    class Meta:
        db_table = 'lingo_word'

    def __str__(self):
        return self.word
