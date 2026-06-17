# SubLingo — CLAUDE.md

This file is the authoritative guide for any AI agent (Claude or otherwise) working on this codebase. Read it fully before making any changes.

---

## What this project is

SubLingo is a static, front-end-only web app that helps Uzbek-speaking users learn English vocabulary from video subtitles. Users create named **decks** from subtitle files; each deck is a self-contained study group. They study decks via flip-card review and multiple-choice tests.

Current state: **MVP v0.6 UI shell** — all data is mocked, there is no real backend, and every real integration point is marked with a `// TODO:` comment. Auth is also mocked (localStorage flag). v0.6 adds Telegram Mini App support, crash-fix QA pass, dark-mode icon toggle, learned-word toggle on the word list, and mobile polish.

Language pair: **English → Uzbek**. The UI language is English. All user-facing strings are written inline — they should eventually be extracted into a single `i18n.js` localization object.

---

## File map

```
sublingo/
├── index.html          Landing page (logged-out): hero + value loop + provider login
├── library.html        My Library (logged-in): deck grid + new-deck modal
├── deck.html           Deck hub: icon tiles → Words / Flashcards / Test (entry point after openDeck())
├── words.html          Word list + filters + inline rename
├── flashcards.html     Flip-card study screen (deck-scoped)
├── test.html           Multiple-choice quiz screen (deck-scoped)
├── css/
│   └── style.css       Full design system: tokens, components, layout
└── js/
    ├── mockData.js     Deck model, seed data, auth helpers, persistence
    ├── main.js         Shared utilities: nav, badges, ring SVG, TTS stub, toasts, confirm dialog, skeleton helpers
    ├── library.js      Library render, deck CRUD UI, new-deck modal flow
    ├── flashcards.js   Deck-scoped flashcard logic
    └── test.js         Deck-scoped quiz logic
```

Navigation flow: `index.html` → (login) → `library.html` → (openDeck) → `deck.html` → Words / Flashcards / Test.
The `.study-tabs` bar inside study pages has a "← Deck" link back to `deck.html`.

**Removed in v0.5 cleanup:** `.sl-hero*`, `.sl-word-chips`, `.sl-chip`, `.underline-accent`, `.sl-section-label` CSS rules (no HTML referenced them). Inline `<style>` block from `test.html` (moved `.feedback-correct/.feedback-wrong` to `style.css`). Per-deck nav links (Words/Flashcards/Test) removed from the global navbar — those live in `.study-tabs` and `deck.html` hub tiles only.

**v0.7 changes:** Navbar hamburger toggler and `.navbar-collapse` block removed from all five logged-in pages (`library.html`, `deck.html`, `words.html`, `flashcards.html`, `test.html`). Nothing meaningful was in the collapse (only the "My Library" link which duplicates the brand), so it is gone entirely. The navbar now contains brand/logo + theme toggle + user chip + logout — all always-visible inline. Back navigation on study pages remains the `.study-tabs` `← Deck` link.

**v0.6 changes:** Telegram Mini App script in every page `<head>`; `initTelegram()` IIFE in `main.js`; crash-fixed `#noDeckScreen` null refs in `flashcards.js` and `test.js`; `requireAuth()` moved before `library.js` loads; sun/moon SVG swap on theme toggle (`_updateThemeIcon()`); learned-word toggle button added to every word card in `words.html` (`toggleLearned()`); Bootstrap navbar collapse fixed (removed conflicting `d-md-flex`); "Library" → "My Library" across all logged-in pages; safe-area insets on `<body>` for Telegram/iOS; mobile tap-target enlargements.

Every HTML page loads scripts in this exact order: `telegram-web-app.js` (CDN) → `mockData.js` → `main.js` → page-specific JS. Telegram script must precede mockData so `window.Telegram` is defined when `initTelegram()` runs. Do not reorder the rest; `mockData.js` must load before `main.js` and page JS.

---

## Core data shapes

### Deck object
```js
{
  id:          String,    // unique — "deck_${Date.now()}_${randomSuffix}"
  name:        String,    // user-given name
  source:      String,    // original filename or "Pasted text"
  createdAt:   Number,    // Date.now()
  lastStudied: Number|null,  // Date.now() at last setActiveDeck() call; null if never opened
  words:       Word[],    // array of Word objects
  stats:       { total: Number, learned: Number }  // synced via recomputeStats()
}
```

### Word object
```js
{
  id:           Number,   // unique integer within the deck
  word:         String,   // English headword
  partOfSpeech: String,   // e.g. "adjective", "verb", "noun"
  translation:  String,   // Uzbek — may contain apostrophes (ʻ or ')
  definition:   String,   // English definition
  ipa:          String,   // IPA transcription e.g. "/rɪˈlʌktənt/"
  example:      String,   // Example sentence
  level:        String,   // CEFR: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  learned:      Boolean
}
```

**Never** embed Uzbek translations directly in HTML `onclick` attribute strings — they contain apostrophes that break inline JS. Always use index/id-based references and `addEventListener`.

---

## Auth flow

| Scenario | Behaviour |
|---|---|
| Not logged in, lands on `index.html` | Shown landing hero + login card |
| Not logged in, lands on any other page | `requireAuth()` calls `window.location.replace('index.html')` |
| Logs in with email | `loginUser(email)` sets `sublingo_loggedIn=true`, `sublingo_email=<email>` |
| Continues as guest | `loginUser('')` sets `sublingo_loggedIn=true`, no email |
| Logs out | `logoutUser()` clears `sublingo_loggedIn` + `sublingo_email`, redirects to `index.html` |
| Already logged in, visits `index.html` | Inline script redirects to `library.html` |

**`requireAuth()` convention:** call it at the top of the inline `<script>` on every page except `index.html`. Use `if (!requireAuth()) { /* stops here */ }` — the function itself does the redirect, so no further code is needed on that branch.

---

## State management

| State | Location | Persisted? | localStorage key |
|---|---|---|---|
| All decks | `DECKS` array in `mockData.js` | Yes | `sublingo_decks` |
| Active deck ID | `activeDeckId` in `mockData.js` | Yes | `sublingo_active_deck` |
| Auth flag | `sublingo_loggedIn` | Yes | `sublingo_loggedIn` |
| User email | `sublingo_email` | Yes | `sublingo_email` |
| Anonymous user ID | `getAnonymousId()` in `mockData.js` | Yes | `sublingo_uid` |
| Theme preference | `initTheme()` / `toggleTheme()` in `main.js` | Yes | `sublingo_theme` |
| Flashcard ratings (session) | `ratings` in `flashcards.js` | No | — |
| Test score / wrong answers (session) | `score`, `wrongAnswers` in `test.js` | No | — |

`loadDecksFromStorage()` runs automatically at the bottom of `mockData.js`. If `sublingo_decks` is empty it seeds three example decks (Friends S01E01, TED Talk, Breaking Bad S01E01).

---

## Deck helpers (all in `mockData.js`)

| Function | What it does |
|---|---|
| `getDecks()` | Returns `DECKS` |
| `getDeckById(id)` | Returns one deck or `null` |
| `getActiveDeck()` | Returns active deck (falls back to first) |
| `setActiveDeck(id)` | Sets `activeDeckId`, updates `deck.lastStudied = Date.now()`, persists |
| `createDeck(name, source, words)` | Creates deck with `lastStudied: null`, pushes, persists, returns it |
| `renameDeck(id, name)` | Mutates deck name, persists |
| `deleteDeck(id)` | Removes deck, resets active if needed, persists |
| `markWordLearned(deckId, wordId, learned)` | Mutates word flag, `recomputeStats`, persists |
| `recomputeStats(deck)` | Recalculates `deck.stats` from `deck.words` |
| `saveDecksToStorage()` | Writes `DECKS` to localStorage |
| `loadDecksFromStorage()` | Reads localStorage; seeds if empty |
| `timeAgo(timestamp)` | Human-readable relative time; returns `'Never'` for null |

---

## Auth helpers (all in `mockData.js`)

| Function | What it does |
|---|---|
| `isLoggedIn()` | Returns true if `sublingo_loggedIn === 'true'` |
| `loginUser(email)` | Sets login flag + email; calls `getAnonymousId()` to ensure UID exists |
| `logoutUser()` | Removes login flag + email |
| `getUserEmail()` | Returns stored email or `'Guest'` |
| `requireAuth()` | Redirects to `index.html` via `window.location.replace` if not logged in; returns bool |
| `getAnonymousId()` | Returns or creates a persistent UUID for anonymous tracking |

---

## TODO integration points

### `js/library.js` — `handleCreateDeck()`
1. Read the file: `const content = await pickedFile.text()`
2. POST to `/api/parse` with `{ content, format: 'srt'|'vtt'|'txt' }` → returns `{ sentences }`
3. POST to `/api/extract` with `{ sentences, targetLevel, maxWords: 20, langPair: 'en-uz', deckId }` → returns `{ words: Word[] }`
4. Pass `words` to `createDeck(name, source, words)` and remove `_simulateDelay` calls.
5. `handleCreateDeck` must `fetch('/api/extract', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sentences, targetLevel, maxWords:20, langPair:'en-uz', userId: getAnonymousId() }) })`. On non-2xx, throw with `err.message` to hit the catch block which shows a danger toast.

### `js/main.js` — `playWordAudio(word)`
Replace Web Speech API stub with:
```js
const audio = new Audio(`/api/tts?word=${encodeURIComponent(word)}&lang=en-US`);
audio.play();
```

### `js/flashcards.js` — `rateCard()`
Replace `console.log` stub with:
```js
fetch('/api/srs/rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wordId: word.id, deckId: deck.id, userId: getAnonymousId(), rating, timestamp: new Date().toISOString() })
});
```

### `js/test.js` — `checkAnswer()` correct/wrong branches
```js
fetch('/api/test/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wordId: word.id, deckId: deck.id, userId: getAnonymousId(), correct: isCorrect, timestamp: new Date().toISOString() })
});
```

### `index.html` — `loginWithProvider(provider)`
Replace mock body with real OAuth:
- Google: `google.accounts.id.initialize()` → exchange `id_token` at `POST /api/auth/google`
- Telegram (Mini App): read `Telegram.WebApp.initDataUnsafe.user`, skip the button UI, POST `{ initData: Telegram.WebApp.initData }` → `POST /api/auth/telegram`
- Telegram (widget): inject Telegram Login Widget, handle callback at `POST /api/auth/telegram`
Both return `{ email, token }`; store token, call `loginUser(email)`. `requireAuth()` will later validate the token server-side instead of checking a localStorage bool.

---

## Design system

Defined entirely in `css/style.css`. Use only CSS custom properties — never hardcode hex inline.

```css
--sl-bg, --sl-surface, --sl-ink, --sl-muted, --sl-line, --sl-soft
--sl-primary, --sl-primary-600, --sl-primary-bg
--sl-accent, --sl-accent-bg
--sl-success, --sl-danger, --sl-danger-bg
--sl-radius, --sl-radius-sm
--sl-shadow, --sl-shadow-md
```

**Dark mode:** `[data-theme="dark"]` on `<html>` overrides every token. Applied before first paint via a small inline script in each page's `<head>`. Never use `prefers-color-scheme` media query in CSS — use the `data-theme` attribute so JS can override the system preference.

Typography: `Fraunces` (headings/display) + `Inter` (UI/body) loaded via `@import` inside `style.css` only. Do not add separate `<link>` tags for fonts in HTML.

Accent (`--sl-accent`: terracotta `#E2703A`) is used sparingly — one key call-to-action per screen.

### Key component classes

| Class | Where used |
|---|---|
| `.landing-hero` | `index.html` hero section (logged-out) |
| `.login-card` | Login/email form card on `index.html` |
| `.study-tabs` | Tab bar (Words / Flashcards / Test) on study pages; scrolls horizontally on mobile |
| `.skeleton-card` + `.skel` | Loading placeholders (shimmer animation) |
| `.nav-user-chip` | Logged-in navbar: shows email prefix |
| `.nav-logout-btn` | Logout icon button in navbar |
| `.btn-theme` | Sun/moon theme toggle; icon swapped by `_updateThemeIcon()` on every toggle |
| `.modal-loading-overlay` | Spinner overlay inside new-deck modal during parse/extract |
| `.result-circle--good/ok/bad` | Score circle color variants in test results (all CSS-var, no hardcoded hex) |

---

## Conventions to keep

- **No framework, no build step.** Vanilla ES2020 only. No npm.
- **Bootstrap 5 utility classes first.** Custom CSS only when Bootstrap can't do it.
- **All color via CSS variables.** Never hardcode hex inline in HTML or JS.
- **Mobile-first.** Verify at 375px before desktop.
- **No comments explaining WHAT code does.** Only TODOs and non-obvious WHYs.
- **No Uzbek text in `onclick` attributes.** Always use `addEventListener` + index/id references.
- **Script load order:** `mockData.js` → `main.js` → page-specific JS. Enforced in every HTML file.
- **`recomputeStats(deck)` + `saveDecksToStorage()` after any mutation** that changes a word's `learned` flag.
- **`requireAuth()` on all pages except `index.html`.** On pages that load a page-specific JS file (e.g. `library.html`), put the auth guard in a separate `<script>` block *before* the page JS `<script src>` tag, so the page JS never runs for unauthenticated users.
- **Telegram Mini App:** feature-detect with `window.Telegram?.WebApp` — never assume it's present. Call `ready()` + `expand()` only when it exists. `initTelegram()` IIFE in `main.js` handles this.
- **`setActiveDeck(id)` before navigating** to any study page; it updates `lastStudied`.

---

## What not to build (scope guard)

Do not add any of the following unless explicitly asked:

- Real subtitle parsing or NLP.
- A backend server or database.
- Real user authentication (keep the localStorage mock unless specifically asked).
- A spaced-repetition algorithm (keep the Again/Hard/Easy stub).
- Real TTS audio generation beyond the Web Speech API stub.
- Any npm package or build toolchain.
- Additional language pairs beyond English → Uzbek.
- A settings / preferences screen.
