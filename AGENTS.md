# SubLingo — Authoritative Agent Guide

This file is the single source of truth for any AI agent or developer working on this repository. It describes the actual codebase as built. Read it fully before making any changes. Do not rely on `CLAUDE.md` — that file describes the original static MVP and is no longer accurate.

---

## Project Overview

SubLingo is a Django web application that helps Uzbek-speaking users learn English vocabulary extracted from video subtitles. Users create named **decks** from subtitle files. Each deck holds English words with Uzbek translations, IPA, definitions, and example sentences. Users study decks through three modes: a word list browser, a flip-card flashcard session, and a multiple-choice quiz.

### Main Business Flow

1. User authenticates via Telegram (no passwords, no email).
2. User lands on their Library — a grid of all their decks.
3. User creates a deck by supplying a name and source label. Words are created separately (AI extraction is a future integration point; decks currently start empty).
4. User opens a deck hub page that shows progress and links to the three study modes.
5. In the word list, individual words can be marked as learned via AJAX toggle.
6. In flashcards, cards are rated Again / Hard / Easy; marking Easy also marks the word learned in the database.
7. In the test, multiple-choice questions are generated client-side from the deck's word list.

### Authentication Flow

There is no password or email login. Authentication is Telegram-only.

1. User opens the Telegram bot and sends `/start`.
2. The bot upserts the user's `TelegramUser` record, creates a `TelegramLoginToken` (one-time, 15-minute TTL), and sends an inline keyboard button linking to `{SITE_URL}/auth/?token=<token>`.
3. User clicks the button — their browser opens the Django site.
4. `auth_view` validates the token: checks existence, `used=False`, `expires_at > now()`.
5. On success: marks token `used=True`, calls `django.contrib.auth.login()`, creates a session, redirects to `/library/`.
6. On failure: adds a Django message and redirects to `/` (login page).

### Telegram Bot Flow

The bot runs via a Telegram webhook. Telegram POSTs updates to `/telegram/webhook/`. The view validates the `X-Telegram-Bot-Api-Secret-Token` header, then feeds the raw JSON to `bot.process_new_updates()`. The only registered handler is `/start`.

### User Journey

```
User sends /start to Telegram bot
    → bot creates/updates TelegramUser
    → bot generates TelegramLoginToken
    → bot sends inline button: "Login to SubLingo" → {SITE_URL}/auth/?token=<tok>
    → user clicks → browser opens /auth/?token=<tok>
    → Django validates token → session created → redirect to /library/
    → user sees deck grid
    → user creates a deck (name + source label)
    → user opens deck hub → sees Words / Flashcards / Test tiles
    → user studies
    → navbar logout icon → /logout/ → redirect to /
```

---

## Technology Stack

| Concern | Choice |
|---|---|
| Python | 3.12.3 |
| Django | 5.2 LTS |
| Database (default) | SQLite (`db.sqlite3`) |
| Database (production) | Any `DATABASE_URL`-compatible backend (psycopg2-binary installed) |
| Telegram bot library | pyTelegramBotAPI 4.34.0 (`import telebot`) |
| Environment management | django-environ 0.14.0 |
| Virtual environment | `.venv/` managed by `uv` |
| CSS framework | Bootstrap 5.3.3 (CDN) |
| Icons | Bootstrap Icons 1.11.3 (CDN) |
| Custom CSS | `static/css/style.css` |
| Fonts | Fraunces (headings) + Inter (UI) via `@import` inside `style.css` |
| Frontend JS | Vanilla ES2020, no build step, no npm |

---

## Project Structure

```
sublingo/
├── config/
│   ├── settings.py       All settings; reads .env via django-environ
│   ├── urls.py           Root URL conf — includes users.urls and lingo.urls
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/
│   ├── users/            Authentication, Telegram user management, bot
│   │   ├── models.py     User, TelegramUser, TelegramLoginToken, generate_login_url()
│   │   ├── views.py      login_view, auth_view, logout_view, telegram_webhook_view
│   │   ├── urls.py       /, /auth/, /logout/, /telegram/webhook/
│   │   ├── admin.py      UserAdmin, TelegramUserAdmin, TelegramLoginTokenAdmin
│   │   ├── bot_helpers.py  get_or_create_telegram_user(), issue_login_url()
│   │   └── bot/
│   │       ├── bot.py      TeleBot singleton (None when token unset)
│   │       ├── handlers.py /start command handler
│   │       └── keyboards.py  login_keyboard() factory
│   │
│   └── lingo/            Deck and word management, all study views
│       ├── models.py     Deck, Word
│       ├── views.py      Page views + AJAX endpoints
│       ├── urls.py       /library/, /deck/<id>/, study pages, AJAX routes
│       └── admin.py      DeckAdmin (with WordInline), WordAdmin
│
├── templates/            Project-level template directory (DIRS-based)
│   ├── base.html         Shared layout: head, navbar, footer, JS
│   ├── users/
│   │   └── login.html    Landing page (standalone — does not extend base.html)
│   └── lingo/
│       ├── library.html  Deck grid + create/rename/delete modals
│       ├── deck.html     Deck hub: progress ring + study mode tiles
│       ├── words.html    Word list with client-side filters + AJAX learned toggle
│       ├── flashcards.html  Flip-card session
│       └── test.html     Multiple-choice quiz
│
├── static/               Served at /static/ in dev; collected to staticfiles/ for prod
│   ├── css/
│   │   └── style.css     Full design system (1277 lines)
│   └── js/
│       ├── main.js       Shared utilities (theme, audio, toast, confirm dialog)
│       ├── flashcards.js Pure flashcard UI logic
│       └── test.js       Pure quiz UI logic
│
├── manage.py
├── .env                  Local environment variables (never commit)
└── .venv/                Python virtual environment (never commit)
```

**Note on root-level files:** `index.html`, `library.html`, `deck.html`, `words.html`, `flashcards.html`, `test.html`, `css/`, and `js/` at the repository root are the original static MVP. They are not used by the Django application. Django uses `templates/` and `static/` only.

### `apps/users/` — Responsibilities

Everything related to identity: custom User model, Telegram profile data, one-time login token lifecycle, Telegram bot, and all authentication views. This app has no knowledge of decks or words.

### `apps/lingo/` — Responsibilities

All vocabulary features: deck CRUD, word listing, flashcard sessions, quiz sessions. All views are `@login_required`. This app has no knowledge of Telegram.

---

## Models

### `apps/users/models.py`

#### `User` — `db_table = 'users_user'`

Extends `AbstractUser`. Set as `AUTH_USER_MODEL`.

| Field | Type | Notes |
|---|---|---|
| `telegram_id` | `BigIntegerField` | Unique, nullable. Mirrors `TelegramUser.telegram_id` for convenience. |
| *(AbstractUser fields)* | — | `username`, `first_name`, `last_name`, `is_staff`, etc. |

#### `TelegramUser` — `db_table = 'users_telegramuser'`

Stores the Telegram profile. One-to-one with `User`.

| Field | Type | Notes |
|---|---|---|
| `user` | `OneToOneField(User)` | `related_name='telegram_profile'`, CASCADE |
| `telegram_id` | `BigIntegerField` | Unique. Telegram's numeric user ID. |
| `username` | `CharField(255)` | Telegram @handle. May be blank. |
| `first_name` | `CharField(255)` | May be blank. |
| `last_name` | `CharField(255)` | May be blank. |
| `language_code` | `CharField(10)` | e.g. `'en'`, `'uz'`. May be blank. |
| `created_at` | `DateTimeField` | `auto_now_add=True` |

`__str__` returns `first_name` or `username` or `str(telegram_id)`.

#### `TelegramLoginToken` — `db_table = 'users_telegramlogintoken'`

One-time login tokens. A new token is created on every `/start`.

| Field | Type | Notes |
|---|---|---|
| `token` | `CharField(128)` | Unique. `secrets.token_urlsafe(64)` output. |
| `telegram_user` | `ForeignKey(TelegramUser)` | CASCADE |
| `expires_at` | `DateTimeField` | `now() + TELEGRAM_TOKEN_TTL minutes` |
| `used` | `BooleanField` | Default `False`. Set `True` when `auth_view` consumes the token. |

Instance method `is_valid() → bool`: returns `True` only if `used=False` AND `expires_at > timezone.now()`.

#### `generate_login_url(telegram_user)` — module-level function in `models.py`

Creates a `TelegramLoginToken` and returns `"{SITE_URL}/auth/?token={token}"`. This is the only place tokens are created. Call via `issue_login_url()` in `bot_helpers.py` — do not call directly from bot handler code.

---

### `apps/lingo/models.py`

#### `Deck` — `db_table = 'lingo_deck'`

A named collection of words belonging to one user. Default ordering: `-created_at`.

| Field | Type | Notes |
|---|---|---|
| `owner` | `ForeignKey(User)` | `related_name='decks'`, CASCADE |
| `name` | `CharField(255)` | User-given name. |
| `source` | `CharField(255)` | Filename or `'Pasted text'`. May be blank. |
| `created_at` | `DateTimeField` | `auto_now_add=True` |
| `last_studied` | `DateTimeField` | Nullable. Set to `now()` by `deck_view` on every open. |

Property `stats → {'total': int, 'learned': int}`: computed live from the `words` related manager (two DB queries). Do not call in tight loops over many decks.

#### `Word` — `db_table = 'lingo_word'`

A single vocabulary entry within a deck.

| Field | Type | Notes |
|---|---|---|
| `deck` | `ForeignKey(Deck)` | `related_name='words'`, CASCADE |
| `word` | `CharField(255)` | English headword. |
| `part_of_speech` | `CharField(100)` | e.g. `'adjective'`, `'verb'`. May be blank. |
| `translation` | `CharField(500)` | Uzbek translation. May contain apostrophes — never embed in `onclick`. |
| `definition` | `TextField` | English definition. |
| `ipa` | `CharField(255)` | e.g. `'/rɪˈlʌktənt/'` |
| `example` | `TextField` | Example sentence. |
| `level` | `CharField(2)` | CEFR: `A1 A2 B1 B2 C1 C2`. May be blank. |
| `learned` | `BooleanField` | Default `False`. |

---

## Views

### `apps/users/views.py`

#### `login_view` — `GET /`

Landing page. Redirects authenticated users to `/library/`. Renders `users/login.html` with `telegram_bot_username` context variable (from `settings.TELEGRAM_BOT_USERNAME`).

#### `auth_view` — `GET /auth/?token=<str>`

Validates a one-time login token. Fetches `TelegramLoginToken` by token string with `select_related('telegram_user__user')`. Calls `is_valid()`. On success: marks `used=True`, calls `login(request, user, backend='django.contrib.auth.backends.ModelBackend')`, redirects to `library`. On any failure: adds a Django error message and redirects to `login`.

#### `logout_view` — `GET /logout/`

Calls `logout(request)`, redirects to `login`.

#### `telegram_webhook_view` — `POST /telegram/webhook/`

Decorated `@csrf_exempt`. Accepts only POST — returns 400 otherwise. Validates `X-Telegram-Bot-Api-Secret-Token` header against `settings.TELEGRAM_WEBHOOK_SECRET` (skips check if setting is empty) — returns 403 on mismatch. Returns 503 if `bot is None` (token not configured). Calls `bot.process_new_updates([Update.de_json(body)])`. Returns 200.

---

### `apps/lingo/views.py`

All views: `@login_required`. Redirect unauthenticated users to `LOGIN_URL = '/'`. All deck/word queries are scoped to `owner=request.user`.

#### `library_view` — `GET /library/` (also aliased to `GET /`)

Context: `decks` — queryset filtered to `owner=request.user` with `prefetch_related('words')`. Template: `lingo/library.html`.

#### `deck_view` — `GET /deck/<deck_id>/`

Side-effect: sets `deck.last_studied = timezone.now()` on every visit (`update_fields=['last_studied']`). Context: `deck`, `total`, `learned`, `pct`, `no_words` (bool), `too_few` (bool, `total < 2`). Template: `lingo/deck.html`.

#### `words_view` — `GET /deck/<deck_id>/words/`

Context: `deck`, `words` (list), `words_json` (JSON string of `_word_to_dict()` for all words), `total`, `learned`, `pct`. Template: `lingo/words.html`.

#### `toggle_learned_view` — `POST /deck/<deck_id>/words/<word_id>/toggle/`

AJAX. Flips `word.learned`. Returns `{'learned': bool, 'total': int, 'learned_count': int}`.

#### `flashcards_view` — `GET /deck/<deck_id>/flashcards/`

Redirects to `deck` view if the deck has zero words. Context: `deck`, `words_json`. Template: `lingo/flashcards.html`.

#### `rate_card_view` — `POST /deck/<deck_id>/rate/`

AJAX. Body: `{'word_id': int, 'rating': 'again'|'hard'|'easy'}`. If `rating == 'easy'`, updates `Word.learned = True` via `Word.objects.filter(pk=word_id, deck=deck).update(learned=True)`. Returns `{'ok': True}`.

#### `test_view` — `GET /deck/<deck_id>/test/`

Redirects to `deck` view if fewer than 2 words. Context: `deck`, `words_json`. Template: `lingo/test.html`.

#### `create_deck_view` — `POST /deck/create/`

AJAX. Body: `{'name': str, 'source': str}`. Creates a `Deck` with no words. Returns `{'id': int, 'name': str}`.

#### `rename_deck_view` — `POST /deck/<deck_id>/rename/`

AJAX. Body: `{'name': str}`. Updates `deck.name`. Returns `{'name': str}`.

#### `delete_deck_view` — `POST /deck/<deck_id>/delete/`

AJAX. Deletes the deck (cascades to all its words). Returns `{'ok': True}`.

#### `_word_to_dict(w)` — private helper

Serialises a `Word` instance for JSON. Keys are camelCase to match the JS convention: `id`, `word`, `partOfSpeech`, `translation`, `definition`, `ipa`, `example`, `level`, `learned`. Every view that passes `words_json` to a template calls this.

---

## Telegram Bot

### Webhook Flow

```
Telegram → POST /telegram/webhook/
         → telegram_webhook_view validates secret header
         → bot.process_new_updates([Update.de_json(body)])
         → telebot dispatches to registered handler
         → start() runs
         → HTTP 200
```

### Bot Initialisation — `apps/users/bot/bot.py`

```python
token = settings.TELEGRAM_BOT_TOKEN
bot = telebot.TeleBot(token, threaded=False) if token else None

if bot is not None:
    from . import handlers
```

- `threaded=False` is required for webhook mode. Do not change this.
- `bot` is `None` when `TELEGRAM_BOT_TOKEN` is empty. All code that uses `bot` must handle this case.
- Handler registration happens at import time of `handlers`. The import only runs when `bot is not None`.
- Never import `handlers` directly — only import from `bot.py` which manages the guard.

### Handlers — `apps/users/bot/handlers.py`

#### `/start`

```python
@bot.message_handler(commands=['start'])
def start(message):
    ...
```

1. Extracts `message.from_user` fields (`id`, `username`, `first_name`, `last_name`, `language_code`).
2. Calls `get_or_create_telegram_user(dict)` — upserts `User` + `TelegramUser`.
3. Calls `issue_login_url(telegram_user)` — creates `TelegramLoginToken`, returns URL.
4. Calls `bot.send_message(chat_id, text, reply_markup=login_keyboard(url))`.

### Keyboards — `apps/users/bot/keyboards.py`

#### `login_keyboard(login_url: str) → InlineKeyboardMarkup`

Returns a single-button `InlineKeyboardMarkup`. Button text: `'Login to SubLingo'`. Button URL: the provided login URL.

### Login Token Generation

Call chain:

```
handlers.start()
    → issue_login_url(telegram_user)         [bot_helpers.py]
        → generate_login_url(telegram_user)  [models.py]
            → secrets.token_urlsafe(64)
            → TelegramLoginToken.objects.create(token, telegram_user, expires_at)
            → return f"{SITE_URL}/auth/?token={token}"
```

`generate_login_url` is the single place tokens are created. `issue_login_url` is the single entry point from bot code.

### Webhook Security

`telegram_webhook_view` reads `settings.TELEGRAM_WEBHOOK_SECRET`. If the setting is non-empty and the request header `X-Telegram-Bot-Api-Secret-Token` does not match exactly, the view returns HTTP 403 and does not process the update. Set the same value in BotFather when registering the webhook (`setWebhook?secret_token=...`).

---

## Bot Helpers — `apps/users/bot_helpers.py`

#### `get_or_create_telegram_user(tg_user: dict) → TelegramUser`

Accepts keys: `id`, `username`, `first_name`, `last_name`, `language_code`.

- **Existing user:** Fetches `TelegramUser` by `telegram_id`, updates mutable fields (`username`, `first_name`, `last_name`, `language_code`), syncs `User.telegram_id`, returns existing instance.
- **New user:** Creates `User` (username = Telegram @handle or `tg_{id}`), creates `TelegramUser`, returns new instance.

#### `issue_login_url(telegram_user: TelegramUser) → str`

Thin wrapper around `generate_login_url()`. Use this from bot code; do not call `generate_login_url()` directly.

---

## Authentication

**Only Telegram authentication is supported.** There is no password field, no email form, no OAuth.

### Token Validation in `auth_view`

```python
token = TelegramLoginToken.objects.select_related('telegram_user__user').get(token=token_str)
# is_valid() = not self.used and self.expires_at > timezone.now()
if not token.is_valid():
    # reject with message
token.used = True
token.save(update_fields=['used'])
login(request, user, backend='django.contrib.auth.backends.ModelBackend')
```

The token is marked `used=True` before `login()` is called. A token cannot be consumed twice.

### Session

Uses Django's built-in session framework. Sessions are stored in the database. Session cookie is standard Django `sessionid`.

### Logout

`logout(request)` flushes the session. Redirects to `login` (the landing page at `/`).

---

## Templates

Templates live in `templates/` (project root). Found via `TEMPLATES[0]['DIRS'] = [BASE_DIR / 'templates']`.

### `templates/base.html`

All lingo templates extend this. Provides:

- `<head>`: Bootstrap 5.3.3 CSS (CDN), Bootstrap Icons 1.11.3 (CDN), `static/css/style.css`, Telegram Web App JS, inline theme-init script.
- Blocks: `title`, `extra_head`, `body_class`, `navbar`, `content`, `extra_js`.
- **Navbar:** Brand link → `/library/`. Theme toggle. If authenticated: user chip (`user.first_name` or `user.username`), logout link → `/logout/`.
- **Footer:** Static text.
- **Toast container:** `<div id="toast-container">` for JS toasts from `main.js`.
- **Scripts:** Bootstrap JS bundle (CDN), `static/js/main.js`.
- **Theme wiring:** Inline script after `main.js` calls `_updateThemeIcon()` and attaches `toggleTheme` listeners.

### `templates/users/login.html`

Does **not** extend `base.html`. Standalone page with its own `<html>` structure (class `landing-body`, `landing-nav`, `landing-hero`). Contains its own inline theme-toggle JS because it does not load `main.js`. Shows Django messages for auth errors. The Telegram login button links to `t.me/{{ telegram_bot_username }}`.

### `templates/lingo/library.html`

Extends `base.html`. Deck grid rendered server-side from the `decks` context variable. All deck CRUD JS is inline in `{% block extra_js %}`. Exposes `const CSRF_TOKEN = '{{ csrf_token }}'` for AJAX calls. Contains new-deck modal, rename modal, kebab context menu (built dynamically in JS).

### `templates/lingo/deck.html`

Extends `base.html`. Fully server-rendered — no AJAX. Displays deck name, metadata line, progress bar, three study tile links. Tiles get `hub-tile--disabled` class when `no_words` or `too_few`. Progress ring SVG is drawn by inline JS in `{% block extra_js %}`.

### `templates/lingo/words.html`

Extends `base.html`. Injects `words_json` into JS `const ALL_WORDS`. All filtering (search, CEFR level, part of speech) runs client-side against this array. `renderWords()` rebuilds the word grid on every filter change. Learned toggle calls `POST /deck/<id>/words/<word_id>/toggle/` and patches `ALL_WORDS` in place — no page reload.

### `templates/lingo/flashcards.html`

Extends `base.html`. Loads `static/js/flashcards.js`. The `{% block extra_js %}` script defines `deck`, `currentIndex`, `ratings` as globals and calls `initDeck()`. The `rateCard()` function is defined in the page script (not in `flashcards.js`) because it needs the CSRF token and deck ID from the template context.

### `templates/lingo/test.html`

Extends `base.html`. Loads `static/js/test.js`. The page script defines `deck`, `questions`, `currentQ`, `score`, `wrongAnswers`, `answered` as globals, calls `buildQuestions(DECK_WORDS)`, then `renderQuestion()`.

---

## Static Files

`STATIC_URL = '/static/'`. Source: `STATICFILES_DIRS = [BASE_DIR / 'static']`. Production collect target: `STATIC_ROOT = BASE_DIR / 'staticfiles'`.

### `static/css/style.css` (1277 lines)

Full design system. Key conventions:
- CSS custom properties on `:root` for all colours, spacing, shadows, radii.
- Dark mode via `[data-theme="dark"]` on `<html>`. Never use `prefers-color-scheme` in CSS.
- All component styles: navbar, deck cards, word cards, flashcard flip animation, quiz buttons, modals, badges, progress bars, toasts, upload zone.
- Fonts loaded via `@import` — do not add `<link>` font tags in templates.
- **Never hardcode hex colours in templates or JS.** Use `var(--sl-primary)`, `var(--sl-danger)`, etc.

Key token names: `--sl-bg`, `--sl-surface`, `--sl-ink`, `--sl-muted`, `--sl-line`, `--sl-primary`, `--sl-accent`, `--sl-success`, `--sl-danger`, `--sl-radius`, `--sl-shadow`.

### `static/js/main.js` (168 lines)

Loaded on every page via `base.html`. No Django URL or CSRF dependencies. Provides:

| Function | Purpose |
|---|---|
| `_updateThemeIcon()` | Swaps sun/moon SVG on all `.btn-theme` buttons |
| `toggleTheme()` | Toggles `data-theme` attribute and persists to `localStorage` |
| `levelBadgeClass(level)` | Returns CSS class for CEFR badge |
| `posBadgeClass(pos)` | Returns CSS class for part-of-speech badge |
| `playWordAudio(word)` | Web Speech API TTS stub |
| `showToast(message, type)` | Bootstrap toast helper |
| `confirmAction(message, onConfirm)` | Bootstrap modal confirm dialog |
| `escapeHtml(s)` | XSS-safe string escaping |

Also contains an IIFE that calls `twa.ready()` and `twa.expand()` when running inside Telegram.

### `static/js/flashcards.js` (63 lines)

Pure UI for the flashcard session. Depends on globals `deck`, `currentIndex`, `ratings` defined by the page script before any function is called. Functions: `renderCard()`, `flipCard()`, `advance()`, `goBack()`, `showCompletion()`, `restartDeck()`.

### `static/js/test.js` (142 lines)

Pure UI for the quiz session. Depends on globals `deck`, `questions`, `currentQ`, `score`, `wrongAnswers`, `answered` defined by the page script. Functions: `buildQuestions(words)`, `renderQuestion()`, `checkAnswer()`, `nextQuestion()`, `showResults()`, `restartTest()`.

No image assets exist in `static/` currently.

---

## URL Structure

### Root (`config/urls.py`)

```
/admin/    Django admin
/          → users.urls (included)
/          → lingo.urls (included)
```

### Users (`apps/users/urls.py`)

| URL | Name | View | Notes |
|---|---|---|---|
| `/` | `login` | `login_view` | Redirects to library if authenticated |
| `/auth/` | `auth` | `auth_view` | Token validation; GET with `?token=` param |
| `/logout/` | `logout` | `logout_view` | |
| `/telegram/webhook/` | `telegram_webhook` | `telegram_webhook_view` | `@csrf_exempt`; POST only |

### Lingo (`apps/lingo/urls.py`)

| URL | Name | View | Type |
|---|---|---|---|
| `/` | `home` | `library_view` | Page (alias) |
| `/library/` | `library` | `library_view` | Page |
| `/deck/<int:deck_id>/` | `deck` | `deck_view` | Page |
| `/deck/<int:deck_id>/words/` | `words` | `words_view` | Page |
| `/deck/<int:deck_id>/flashcards/` | `flashcards` | `flashcards_view` | Page |
| `/deck/<int:deck_id>/test/` | `test` | `test_view` | Page |
| `/deck/<int:deck_id>/words/<int:word_id>/toggle/` | `toggle_learned` | `toggle_learned_view` | AJAX |
| `/deck/<int:deck_id>/rate/` | `rate_card` | `rate_card_view` | AJAX |
| `/deck/create/` | `create_deck` | `create_deck_view` | AJAX |
| `/deck/<int:deck_id>/rename/` | `rename_deck` | `rename_deck_view` | AJAX |
| `/deck/<int:deck_id>/delete/` | `delete_deck` | `delete_deck_view` | AJAX |

AJAX endpoints accept POST only. They require the `X-CSRFToken` header. Templates expose the token as `const CSRF_TOKEN = '{{ csrf_token }}'`.

`LOGIN_URL = '/'` — `@login_required` redirects to the login page (not to `/library/`).

---

## Environment Variables

All read from `.env` in the project root by `django-environ`. Never commit `.env`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SECRET_KEY` | Yes (prod) | insecure placeholder | Django secret key |
| `DEBUG` | No | `True` | Django debug mode |
| `ALLOWED_HOSTS` | Yes (prod) | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DATABASE_URL` | No | `sqlite:///db.sqlite3` | Database connection URL |
| `TELEGRAM_BOT_TOKEN` | Yes (bot) | `''` | Token from @BotFather. Bot disabled when empty. |
| `TELEGRAM_BOT_USERNAME` | No | `SubLingoBot` | Shown on login page as the bot link target |
| `TELEGRAM_WEBHOOK_SECRET` | No | `''` | Validates Telegram webhook POSTs. Check skipped when empty. |
| `TELEGRAM_TOKEN_TTL` | No | `15` | Login token validity in minutes |
| `SITE_URL` | No | `http://localhost:8000` | Base URL prepended to login URLs. No trailing slash. |

`.env` template:

```env
SECRET_KEY=replace-with-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

TELEGRAM_BOT_TOKEN=123456789:AABBccDDee...
TELEGRAM_BOT_USERNAME=SubLingoBot
TELEGRAM_WEBHOOK_SECRET=any-random-string

DATABASE_URL=sqlite:///db.sqlite3

TELEGRAM_TOKEN_TTL=15
SITE_URL=http://localhost:8000
```

---

## Development Notes

**Running locally:**

```bash
source .venv/bin/activate
python manage.py migrate
python manage.py runserver
```

**Registering the webhook (once, after deploy to HTTPS):**

```
https://api.telegram.org/bot<TOKEN>/setWebhook\
  ?url=https://yourdomain.com/telegram/webhook/\
  &secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

**`Deck.stats` is computed, not stored.** It issues two DB queries per call (`words.count()` + `words.filter(learned=True).count()`). Do not call it in a loop over many decks without prefetching.

**Word data shape in JS.** `_word_to_dict()` in `lingo/views.py` is the canonical serialisation. Keys use camelCase (`partOfSpeech`, not `part_of_speech`) to match the original JS convention inherited from the static MVP. All template JS expects this shape exactly.

**CSRF on AJAX.** Every AJAX call sends `X-CSRFToken`. The token is injected into each template's `{% block extra_js %}` as `const CSRF_TOKEN = '{{ csrf_token }}'`. Do not add `@csrf_exempt` to any lingo view.

**Uzbek apostrophes.** The `translation` field often contains `ʻ` or `'`. Never embed translations in HTML `onclick` attributes. Always use `addEventListener` with index or ID lookups.

**Bot singleton initialisation order.** `apps/users/bot/bot.py` initialises `TeleBot` at module import time — Django settings must be loaded before this module is imported. Never import from `bot/` at module level in `models.py` or `apps.py`. The webhook view imports lazily (`from .bot.bot import bot` inside the function body).

**`threaded=False` on TeleBot.** Required for webhook mode. Polling threads conflict with WSGI request handling. Do not remove or change this flag.

**Empty decks on creation.** `create_deck_view` creates a `Deck` with zero words. Populating words via AI extraction is a future integration point. The intended flow is: POST subtitle content to a parsing service → POST sentences to an extraction service → bulk-create `Word` objects linked to the deck.

**Root-level static files are dead code.** `index.html`, `library.html`, `css/`, `js/` etc. at the repository root are the original static MVP. They are not served or referenced by the Django application.

---

## AI Agent Working Rules

These rules are mandatory for every task in this repository.

### Minimal Changes

Always implement the smallest possible change.

Do not redesign existing code.

Do not rewrite working code.

Do not refactor unrelated code.

### File Scope

Before changing code, identify the minimum set of files that must be modified.

Only modify files required for the task.

Do not touch unrelated files.

### Migrations

Migration files are protected.

Never:
- create new migration files
- modify existing migration files
- regenerate migrations
- delete migration files

...unless the user explicitly requests it.

If a task requires model changes:
- Update the model code only.
- State explicitly: "Migrations must be generated separately with `python manage.py makemigrations`."

### Architecture

Preserve the existing architecture.

Do not introduce:
- service layers
- repository classes
- CQRS patterns
- event sourcing
- dependency injection frameworks

Use existing patterns: function-based views, direct ORM calls, module-level helpers in `bot_helpers.py` or `models.py`.

### Database

Do not redesign the schema.

Do not introduce unnecessary relations or new tables.

Keep solutions close to the existing model structure.

### Templates

Preserve the existing UI.

Do not redesign pages unless explicitly requested.

Do not change CSS class names, layout structure, or component markup unless required by the task.

### Token Efficiency

Read only files relevant to the current task.

Do not scan the entire project unnecessarily.

Do not output large blocks of unchanged code.

### Refactoring

Refactoring is forbidden unless:
- required to solve the task
- existing code is demonstrably broken
- explicitly requested by the user

### New Files

Before creating a new file, ask: can this fit in an existing file?

If yes, use the existing file.

### Security

Never remove or weaken:
- `@login_required` on lingo views
- `owner=request.user` scoping in all lingo queries
- `is_valid()` check and `used=True` mark in `auth_view`
- Secret header validation in `telegram_webhook_view`
- `@csrf_exempt` belongs only on `telegram_webhook_view` — never add it to lingo views

### Bug Fixes

Fix the root cause. Do not add workarounds that leave the underlying issue in place. Do not change code unrelated to the bug.

### Feature Requests

Before implementing:
1. Check if an existing view, model, or helper can be extended.
2. Reuse existing models, templates, views, and utilities.
3. Do not duplicate logic that already exists.

### Required Workflow

For every task:

1. **Identify affected files** — list the exact files that must change and why.
2. **Confirm scope** — explicitly state which files will NOT be modified.
3. **Implement** — make only the identified changes.

The goal is maximum stability, minimum code changes, and predictable behaviour.
