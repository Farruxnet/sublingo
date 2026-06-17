# SubLingo — CLAUDE.md

This file is the authoritative guide for any AI agent (Claude or otherwise) working on this codebase. Read it fully before making any changes.

---

## What this project is

SubLingo is a static, front-end-only web app that helps Uzbek-speaking users learn English vocabulary from video subtitles. The current state is an **MVP UI shell**: all data is mocked, there is no backend, and every real integration point is marked with a `// TODO:` comment.

Language pair: **English → Uzbek**. The UI language is English. All user-facing strings are written inline for now — they should eventually be extracted into a single localization object so the UI can be switched to Uzbek.

---

## File map

```
sublingo/
├── index.html          Home / Upload screen
├── words.html          Extracted words list + deck selection
├── flashcards.html     Flip-card study screen
├── test.html           Multiple-choice quiz screen
├── css/
│   └── style.css       All custom styles (on top of Bootstrap 5)
└── js/
    ├── mockData.js     Word data array + selection state helpers
    ├── main.js         Shared utilities: nav, badges, TTS stub, toasts
    ├── flashcards.js   Deck and card logic
    └── test.js         Quiz question building and answer checking
```

Every HTML page loads scripts in this exact order: `mockData.js` → `main.js` → page-specific JS. Do not reorder these; `mockData.js` must run first because the others depend on `MOCK_WORDS` and `selectedWordIds`.

---

## Core data shape

Every word object in `MOCK_WORDS` (and in any future API response) must conform to this shape:

```js
{
  id:           Number,   // unique, stable integer
  word:         String,   // English headword
  partOfSpeech: String,   // e.g. "adjective", "verb", "noun", "adjective / verb"
  translation:  String,   // Uzbek; may contain apostrophes (ʻ or ')
  definition:   String,   // English definition
  ipa:          String,   // IPA transcription including slashes, e.g. "/rɪˈlʌktənt/"
  example:      String,   // Example sentence (from subtitle context when real)
  level:        String,   // CEFR: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  learned:      Boolean   // study-progress flag
}
```

**Never** embed word translations directly in HTML `onclick` attribute strings — Uzbek text contains apostrophes that break inline JS. Always use index-based references (see `test.js → renderQuestion`).

---

## State management

There is no framework. State lives in three places:

| State | Location | Persisted? |
|---|---|---|
| Word pool | `MOCK_WORDS` (global const) | No (page reload resets) |
| Selected word IDs | `selectedWordIds` (global `let` in `mockData.js`) | Yes — `localStorage` key `sublingo_selected` |
| Flashcard progress (ratings) | `ratings` object in `flashcards.js` | No |
| Test score / wrong answers | `score`, `wrongAnswers` in `test.js` | No |

`loadSelectionFromStorage()` runs automatically at the bottom of `mockData.js`, so selection persists across page navigations.

---

## TODO integration points

These are the exact locations where real backend / AI logic must be wired in. Touch each file at the comment shown.

### `js/mockData.js` — top of file
Replace `MOCK_WORDS` array with an API call to the subtitle parser + vocabulary extractor. Shape must match the schema above.

### `index.html` — `handleExtract()` function
Currently just navigates to `words.html`. Replace with:
1. Read the uploaded file via `FileReader` API.
2. POST raw subtitle text to `/api/extract` (subtitle parser).
3. Receive `Word[]` array; write it into `MOCK_WORDS` (or a session-scoped replacement).
4. Navigate to `words.html`.

### `index.html` — `showFileSelected()` function
Currently only shows the filename. Wire real file reading here.

### `js/main.js` — `playWordAudio()`
Currently uses Web Speech API as a stub. Replace with a call to a real TTS endpoint (e.g. ElevenLabs, Google TTS, or Anthropic's future audio API) that streams an MP3 for the given English word.

### `js/flashcards.js` — `rateCard()`
The `console.log` stub should become a POST to `/api/srs/rate` with `{ wordId, rating, timestamp }`. Implement SM-2 or FSRS on the backend and return the next review interval.

### `js/flashcards.js` — `rateCard()` easy branch
`word.learned = true` should also POST to `/api/words/:id/learned`.

### `js/test.js` — `checkAnswer()` correct/wrong branches
Both `console.log` stubs should POST to `/api/test/answer` with `{ wordId, correct, timestamp }` for analytics and adaptive scheduling.

### `js/mockData.js` — `getSelectedWords()`
Replace with a fetch from `/api/session/words` that returns the user's current deck for the active session.

---

## Conventions to keep

- **No framework, no build step.** Keep all JS as vanilla ES2020 or earlier. If you need a utility, write it inline; do not introduce npm.
- **Bootstrap 5 utility classes first.** Only add custom CSS to `style.css` when Bootstrap utilities cannot do the job.
- **CSS variables for color.** Never hardcode the accent color inline — always use `var(--sl-primary)` etc. (defined at the top of `style.css`).
- **Mobile-first.** Any new layout must work at 375 px viewport width before you test at desktop sizes.
- **No comments explaining what code does.** Comments exist only for TODOs and non-obvious WHYs.

---

## What not to build (scope guard)

Do not add any of the following unless explicitly asked:

- Real subtitle parsing or NLP.
- A backend server or database.
- User authentication.
- A spaced-repetition algorithm (just keep the Again/Hard/Easy stub).
- Real audio file generation or playback beyond the Web Speech API stub.
- Any npm package or build toolchain.
- Additional languages beyond English → Uzbek.
