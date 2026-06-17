# SubLingo — CLAUDE.md

This file is the authoritative guide for any AI agent (Claude or otherwise) working on this codebase. Read it fully before making any changes.

---

## What this project is

SubLingo is a static, front-end-only web app that helps Uzbek-speaking users learn English vocabulary from video subtitles. Users create named **decks** from subtitle files; each deck is a self-contained study group. They study decks via flip-card review and multiple-choice tests.

Current state: **MVP v0.2 UI shell** — all data is mocked, there is no backend, and every real integration point is marked with a `// TODO:` comment.

Language pair: **English → Uzbek**. The UI language is English. All user-facing strings are written inline for now — they should eventually be extracted into a single `i18n.js` localization object so the UI can be switched to Uzbek.

---

## File map

```
sublingo/
├── index.html          Library (deck grid) + hero + new-deck modal
├── words.html          Deck detail: word list + filters + inline rename
├── flashcards.html     Flip-card study screen (deck-scoped)
├── test.html           Multiple-choice quiz screen (deck-scoped)
├── css/
│   └── style.css       Full design system: tokens, components, layout
└── js/
    ├── mockData.js     Deck model, seed data, persistence, all helpers
    ├── main.js         Shared utilities: nav, badges, ring SVG, TTS stub, toasts, confirm dialog
    ├── flashcards.js   Deck-scoped flashcard logic
    └── test.js         Deck-scoped quiz logic
```

Every HTML page loads scripts in this exact order: `mockData.js` → `main.js` → page-specific JS. Do not reorder; `mockData.js` must run first because all other scripts depend on `DECKS`, `activeDeckId`, and the helper functions it exports.

---

## Core data shapes

### Deck object
```js
{
  id:        String,    // unique — created via `deck_${Date.now()}_${randomSuffix}`
  name:      String,    // user-given name
  source:    String,    // original filename or "Pasted text"
  createdAt: Number,    // Date.now()
  words:     Word[],    // array of Word objects (schema below)
  stats:     { total: Number, learned: Number }  // always kept in sync via recomputeStats()
}
```

### Word object
```js
{
  id:           Number,   // unique integer within the deck
  word:         String,   // English headword
  partOfSpeech: String,   // e.g. "adjective", "verb", "noun", "adjective / verb"
  translation:  String,   // Uzbek — may contain apostrophes (ʻ or ')
  definition:   String,   // English definition
  ipa:          String,   // IPA transcription incl. slashes, e.g. "/rɪˈlʌktənt/"
  example:      String,   // Example sentence (subtitle context when real)
  level:        String,   // CEFR: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  learned:      Boolean   // study-progress flag
}
```

**Never** embed word translations directly in HTML `onclick` attribute strings — Uzbek text contains apostrophes that break inline JS. Always use index/id-based references and `addEventListener` (see `test.js → renderQuestion`, `words.html → renderWords`).

---

## State management

| State | Location | Persisted? | localStorage key |
|---|---|---|---|
| All decks | `DECKS` array in `mockData.js` | Yes | `sublingo_decks` |
| Active deck ID | `activeDeckId` in `mockData.js` | Yes | `sublingo_active_deck` |
| Flashcard ratings (session) | `ratings` object in `flashcards.js` | No | — |
| Test score / wrong answers (session) | `score`, `wrongAnswers` in `test.js` | No | — |
| Anonymous user ID | `getAnonymousId()` in `main.js` | Yes | `sublingo_uid` |

`loadDecksFromStorage()` runs automatically at the bottom of `mockData.js`. If `sublingo_decks` is empty or absent it falls back to the two seed decks defined in the same file.

The old `selectedWordIds` / `sublingo_selected` state is retired. Selection is now "which deck is active," managed entirely through `activeDeckId` / `setActiveDeck(id)`.

---

## Deck helpers (all in `mockData.js`)

| Function | What it does |
|---|---|
| `getDecks()` | Returns the `DECKS` array |
| `getDeckById(id)` | Returns one deck or `null` |
| `getActiveDeck()` | Returns the active deck (falls back to first deck) |
| `setActiveDeck(id)` | Sets `activeDeckId` and persists it |
| `createDeck(name, source, words)` | Creates, pushes, and persists a new deck; returns it |
| `renameDeck(id, name)` | Mutates deck name and persists |
| `deleteDeck(id)` | Removes deck, resets active if needed, persists |
| `markWordLearned(deckId, wordId, learned)` | Mutates word flag, calls `recomputeStats`, persists |
| `recomputeStats(deck)` | Recalculates `deck.stats` from `deck.words` |
| `saveDecksToStorage()` | Writes `DECKS` to localStorage |
| `loadDecksFromStorage()` | Reads from localStorage; seeds if empty |
| `timeAgo(timestamp)` | Returns a human-readable relative time string |

---

## TODO integration points

### `js/mockData.js` — `createDeck()`
Replace mock `words` argument with data from `POST /api/extract` (subtitle parser agent). The caller in `index.html → handleCreateDeck()` should:
1. Read the file via `FileReader` API (`file.text()`).
2. POST the content to `/api/extract` with `{ content, targetLevel, maxWords, langPair }`.
3. Receive `{ words: Word[] }` and pass `words` to `createDeck()`.

### `js/mockData.js` — `getActiveDeck()`
The real version should fetch from `GET /api/session/words?deckId=…` to hydrate the deck with fresh server-side data (e.g. updated SRS intervals, server-side learned flags).

### `index.html` — `showFileSelected()`
Wire real file reading: `const text = await pickedFile.text()` then pass to the extract API.

### `index.html` — `handleCreateDeck()`
Replace mock seed-word slice with real API call (see `createDeck()` note above).

### `js/main.js` — `playWordAudio(word)`
Replace Web Speech API stub with a real TTS endpoint (ElevenLabs, Google TTS, etc.):
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
  body: JSON.stringify({ wordId: word.id, userId: getAnonymousId(), rating, timestamp: new Date().toISOString() })
});
```

### `js/flashcards.js` — easy branch in `rateCard()`
`markWordLearned(deck.id, word.id, true)` already persists locally. Also POST to `/api/words/:id/learned` for server-side tracking.

### `js/test.js` — `checkAnswer()` correct/wrong branches
Both `console.log` stubs should POST to `/api/test/answer`:
```js
fetch('/api/test/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wordId: word.id, userId: getAnonymousId(), correct: isCorrect, timestamp: new Date().toISOString() })
});
```

---

## Design system

Defined entirely in `css/style.css`. Use only these variables — never hardcode hex values inline.

```css
--sl-bg, --sl-surface, --sl-ink, --sl-muted, --sl-line, --sl-soft
--sl-primary, --sl-primary-600, --sl-primary-bg
--sl-accent, --sl-accent-bg
--sl-success, --sl-danger, --sl-danger-bg
--sl-radius, --sl-radius-sm
--sl-shadow, --sl-shadow-md
```

Typography: `Fraunces` (headings, display, card word titles) loaded via `@import` in `style.css`. `Inter` for all UI/body text. Do not add a separate `<link>` for fonts in HTML — the CSS import handles it.

Accent color (`--sl-accent`: terracotta `#E2703A`) is used **sparingly** — one key action or highlight per screen only. Do not use it for generic badges or borders.

---

## Conventions to keep

- **No framework, no build step.** Vanilla ES2020 only. No npm.
- **Bootstrap 5 utility classes first.** Custom CSS in `style.css` only when Bootstrap can't do it.
- **All color via CSS variables.** Never hardcode hex inline in HTML or JS.
- **Mobile-first.** Verify at 375px before desktop.
- **No comments explaining WHAT code does.** Only TODOs and non-obvious WHYs.
- **No Uzbek text in `onclick` attributes.** Always use `addEventListener` + index/id references.
- **Script load order:** `mockData.js` → `main.js` → page-specific JS. Enforced in every HTML file.
- **`recomputeStats(deck)` + `saveDecksToStorage()` after any mutation** that changes a word's `learned` flag.

---

## What not to build (scope guard)

Do not add any of the following unless explicitly asked:

- Real subtitle parsing or NLP.
- A backend server or database.
- User authentication.
- A spaced-repetition algorithm (keep the Again/Hard/Easy stub).
- Real audio file generation beyond the Web Speech API stub.
- Any npm package or build toolchain.
- Additional language pairs beyond English → Uzbek.
- A settings / preferences screen.
