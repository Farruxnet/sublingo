from django.contrib import admin
from .models import Deck, Word


class WordInline(admin.TabularInline):
    model = Word
    extra = 0
    fields = ('word', 'part_of_speech', 'level', 'learned')


@admin.register(Deck)
class DeckAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'source', 'word_count', 'created_at', 'last_studied')
    list_filter = ('owner',)
    search_fields = ('name', 'source')
    inlines = [WordInline]

    @admin.display(description='Words')
    def word_count(self, obj):
        return obj.words.count()


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ('word', 'deck', 'part_of_speech', 'level', 'learned')
    list_filter = ('learned', 'level', 'part_of_speech')
    search_fields = ('word', 'translation')
    raw_id_fields = ('deck',)
