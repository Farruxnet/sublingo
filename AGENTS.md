# SubLingo — Agent Integration Guide & Technical Specification

> **Current version:** v0.5 — Dark mode, slim navbar, dead-code cleanup
> Last updated to match: `CLAUDE.md` v0.5, commit `18ad816`

This document describes the planned AI-agent architecture for SubLingo and specifies every interface an agent must implement or consume. It is written for engineers building the backend and for AI coding agents implementing those features.

Read `CLAUDE.md` first — it is the ground truth for data shapes, state management, and coding conventions. This file covers the API surface and backend architecture only.

---

## System overview

```
Browser (static front end — no build step, vanilla JS)
        │
        │  HTTP/REST  (JSON)
        ▼
┌────────────────────────────────────────────────┐
│               SubLingo API                     │
│  (FastAPI / Express / any HTTP server)         │
│                                                │
│  ┌─────────────┐   ┌──────────────────────┐   │
│  │  Subtitle   │   │   Vocabulary          │   │
│  │  Parser     │──▶│   AI Agent (LLM)     │   │
│  │  Agent 1    │   │   Agent 2             │   │
│  └─────────────┘   └──────────────────────┘   │
│                                                │
│  ┌─────────────┐   ┌──────────────────────┐   │
│  │    TTS      │   │   SRS Scheduler +    │   │
│  │   Agent 3   │   │   Test Analytics     │   │
│  └─────────────┘   │   Agents 4 & 5       │   │
│                    └──────────────────────┘   │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  Deck & Word Storage (PostgreSQL)       │  │
│  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

The front end is deliberately agent-agnostic. Every integration point is a named JS function containing a `// TODO:` comment. A backend engineer replaces each stub with a `fetch()` call to the endpoint defined below — nothing else in the file needs to change.

---

## Deck lifecycle (front-end flow)

Understanding this flow is required before implementing any agent endpoint.

```
1. User opens New Deck modal (index.html)
2. Picks a .srt/.vtt file OR pastes text
3. Enters a deck name + target CEFR level
4. Clicks "Create deck"
        │
        ▼  [Agent 1] POST /api/parse  →  sentences[]
        │
        ▼  [Agent 2] POST /api/extract  →  Word[]
        │
        ▼  createDeck(name, source, words)  →  stored in localStorage
        │
        ▼  setActiveDeck(id)  →  navigate to words.html
5. User reviews words, opens flashcards, takes test
        │
        ▼  [Agent 3] GET /api/tts  →  audio per word
        │
        ▼  [Agent 4] POST /api/srs/rate  →  SRS interval
        │
        ▼  [Agent 5] POST /api/test/answer  →  analytics
```

---

## Agent 1 — Subtitle Parser

**Responsibility:** Accept raw subtitle file content, strip timestamps and formatting, return clean sentences.

### Endpoint
```
POST /api/parse
Content-Type: application/json
```

### Request body
```json
{
  "content": "<raw .srt or .vtt file text as a string>",
  "format":  "srt"
}
```
`format` is `"srt"` | `"vtt"` | `"txt"`. Detect automatically from content if omitted.

### Response
```json
{
  "sentences": [
    "She was reluctant to leave the party early.",
    "It was inevitable that things would change."
  ],
  "wordCount":    312,
  "durationSecs": 1840
}
```

### Implementation notes
- SRT timestamp pattern to strip: `^\d+:\d+:\d+[\.,]\d+ --> .*$`
- Strip VTT cue metadata and inline tags (`<b>`, `<i>`, `<c.color>`, `<00:00:00.000>`, etc.)
- Merge consecutive lines of the same cue into one sentence.
- Deduplicate repeated sentences (common in auto-generated captions).
- Pass `/api/parse` output directly as `sentences` to `/api/extract` — the two are typically called in sequence.

### Front-end integration point
`index.html → handleCreateDeck()`. Replace the mock-words slice with:
```js
async function handleCreateDeck() {
  const text  = await pickedFile.text();                 // FileReader stub → real read
  const parse = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, format: pickedFile.name.split('.').pop() })
  }).then(r => r.json());

  const extract = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sentences:   parse.sentences,
      targetLevel: document.getElementById('deckLevelSelect').value || 'B2',
      maxWords:    20,
      langPair:    'en-uz'
    })
  }).then(r => r.json());

  const deck = createDeck(
    document.getElementById('deckNameInput').value.trim(),
    pickedFile.name,
    extract.words    // Word[] from Agent 2
  );
  setActiveDeck(deck.id);
  bootstrap.Modal.getInstance(document.getElementById('newDeckModal')).hide();
  navigateTo('words.html');
}
```

---

## Agent 2 — Vocabulary Extractor (LLM-powered)

**Responsibility:** Receive sentences from the parser, call an LLM, and return a structured list of vocabulary words worth learning — in the Word schema expected by the front end.

### Endpoint
```
POST /api/extract
Content-Type: application/json
```

### Request body
```json
{
  "sentences":   ["She was reluctant to leave…", "…"],
  "targetLevel": "B1",
  "maxWords":    20,
  "langPair":    "en-uz"
}
```

### Response — must match the `Word` schema from `CLAUDE.md`
```json
{
  "words": [
    {
      "id":           1,
      "word":         "reluctant",
      "partOfSpeech": "adjective",
      "translation":  "istamasdan, ikkilanuvchi",
      "definition":   "Unwilling and hesitant; not eager to do something.",
      "ipa":          "/rɪˈlʌktənt/",
      "example":      "She was reluctant to leave the party early.",
      "level":        "B1",
      "learned":      false
    }
  ]
}
```

### LLM system prompt
```
You are a vocabulary extraction assistant for an English-to-Uzbek language learning app.

Given a list of English sentences from a subtitle file:
1. Identify words educational for a CEFR {targetLevel} learner or below.
2. Skip proper nouns, numbers, and words the learner almost certainly already knows
   (the, is, a, I, you, he, she, go, come, very, etc.).
3. Prefer words that appear in the subtitle sentences — use the subtitle sentence as
   the "example" field verbatim.
4. For each word return: base/lemma form, partOfSpeech, Uzbek translation, English
   definition, IPA (with slashes), example sentence, CEFR level, learned: false.
5. Return at most {maxWords} words, ranked by educational value (uncommon but useful first).
6. Return valid JSON only — no prose, no markdown code fences. Schema: { "words": [...] }
```

### Model recommendation
- **Default:** `claude-sonnet-4-6` — best cost/quality balance for extraction + translation.
- **Upgrade to:** `claude-opus-4-8` if Uzbek translation quality or CEFR classification needs improvement.
- **Never use:** a model smaller than Sonnet for this task — translation accuracy degrades noticeably.

### Important: `id` field
The LLM should set `id` starting from 1. When `createDeck()` in `mockData.js` stores the words it reassigns IDs as `Date.now() + index` to guarantee uniqueness across decks. The backend does not need to guarantee globally unique word IDs.

---

## Agent 3 — Text-to-Speech (TTS)

**Responsibility:** Return an audio file (MP3) for a given English word or phrase.

### Endpoint
```
GET /api/tts?word=reluctant&lang=en-US
```

### Response
```
Content-Type: audio/mpeg
<binary MP3 stream>
```

### Front-end integration point
`js/main.js → playWordAudio(word)`. Replace the Web Speech API stub:
```js
function playWordAudio(word) {
  // TODO: replace with real TTS endpoint
  const audio = new Audio(`/api/tts?word=${encodeURIComponent(word)}&lang=en-US`);
  audio.play().catch(() => {});   // silence autoplay errors
}
```
This function is called from `words.html`, `flashcards.html`, and `test.html` (wrong-answer list). All three already use `addEventListener` — no HTML changes required.

### Provider options
| Option | Latency | Cost | Notes |
|---|---|---|---|
| Web Speech API (current stub) | Instant | Free | Browser-dependent quality; keep as offline fallback |
| ElevenLabs Turbo v2.5 | ~250 ms | Low | High naturalness, English accent control |
| Google Cloud TTS (WaveNet) | ~200 ms | Low | Reliable, neutral accent, good for learners |
| OpenAI TTS `tts-1` | ~350 ms | Low | Good quality, simple API |

**Cache aggressively.** Store generated MP3s keyed by `word.toLowerCase()` in Redis or on disk. English headwords don't change pronunciation — a cache miss rate above 5% means something is wrong.

---

## Agent 4 — Spaced-Repetition Scheduler (SRS)

**Responsibility:** Receive a flashcard rating (Again / Hard / Easy) and return the next review interval for that word.

### Endpoint
```
POST /api/srs/rate
Content-Type: application/json
```

### Request body
```json
{
  "deckId":    "deck_1718617200000_ab3x2",
  "wordId":    1718617200042,
  "userId":    "550e8400-e29b-41d4-a716-446655440000",
  "rating":    "easy",
  "timestamp": "2026-06-17T10:00:00Z"
}
```
`deckId` is included from v0.2 onward so the backend can scope SRS state per deck rather than globally per word.

### Response
```json
{
  "wordId":       1718617200042,
  "nextReviewAt": "2026-06-18T10:00:00Z",
  "intervalDays": 1,
  "easeFactor":   2.5
}
```

### Algorithm recommendation
Implement **FSRS v5** (Free Spaced Repetition Scheduler). It outperforms SM-2 on recall prediction and is MIT-licensed. Reference: `open-spaced-repetition/py-fsrs`.

| UI button | FSRS rating value |
|---|---|
| Again | 1 |
| Hard | 2 |
| Easy | 4 |

(FSRS has no rating `3` by default; "Good" maps to 3 if you add it later.)

### Front-end integration point
`js/flashcards.js → rateCard(rating)`:
```js
async function rateCard(rating) {
  const word = deck.words[currentIndex];

  // TODO: POST to /api/srs/rate
  await fetch('/api/srs/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deckId: deck.id,
      wordId: word.id,
      userId: getAnonymousId(),
      rating,
      timestamp: new Date().toISOString()
    })
  });

  if (rating === 'easy') {
    markWordLearned(deck.id, word.id, true);  // already in mockData.js
    // TODO: also POST to /api/words/:wordId/learned
    deck = getActiveDeck();
  }

  advance();
}
```

---

## Agent 5 — Test Analytics Collector

**Responsibility:** Record individual test answers for analytics and adaptive review prioritization.

### Endpoint
```
POST /api/test/answer
Content-Type: application/json
```

### Request body
```json
{
  "deckId":    "deck_1718617200000_ab3x2",
  "wordId":    1718617200042,
  "userId":    "550e8400-e29b-41d4-a716-446655440000",
  "correct":   false,
  "timestamp": "2026-06-17T10:05:30Z"
}
```

### Response
```json
{ "ok": true }
```

### Front-end integration point
`js/test.js → checkAnswer()`. Both `console.log` stubs become a fire-and-forget fetch:
```js
// TODO: POST to /api/test/answer
fetch('/api/test/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deckId:    deck.id,
    wordId:    word.id,
    userId:    getAnonymousId(),
    correct:   isCorrect,
    timestamp: new Date().toISOString()
  })
});
```

---

## Session & user identity

No authentication in MVP. `getAnonymousId()` in `mockData.js` generates and persists a UUID in `localStorage` key `sublingo_uid`. It is already implemented and called by both `flashcards.js` and `test.js`.

When real auth is added, replace `getAnonymousId()` calls with a JWT claim — no other changes needed at the call sites.

---

## API error handling contract

All endpoints must return errors in this shape so the front end can call `showToast(data.message, 'danger')`:

```json
{
  "error":   true,
  "message": "Human-readable description shown to the user",
  "code":    "PARSE_FAILED" | "LLM_TIMEOUT" | "TTS_UNAVAILABLE" | "SRS_ERROR" | "UNKNOWN"
}
```

HTTP status must also be non-2xx. The front-end pattern is:
```js
const res = await fetch('/api/extract', { ... });
if (!res.ok) {
  const err = await res.json();
  showToast(err.message || 'Something went wrong', 'danger');
  return;
}
```

---

## Database schema (future backend)

```sql
-- Decks (one per subtitle file / paste session per user)
CREATE TABLE decks (
  id           TEXT PRIMARY KEY,           -- matches front-end deck.id format
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  source       TEXT,                       -- original filename or "Pasted text"
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Words (canonical per deck — not globally deduplicated in MVP)
CREATE TABLE words (
  id             BIGINT PRIMARY KEY,       -- matches front-end word.id (Date.now() + i)
  deck_id        TEXT REFERENCES decks(id) ON DELETE CASCADE,
  word           TEXT NOT NULL,
  part_of_speech TEXT,
  translation    TEXT,
  definition     TEXT,
  ipa            TEXT,
  example        TEXT,
  level          TEXT                      -- CEFR: A1–C2
);

-- SRS progress per user per word per deck
CREATE TABLE srs_cards (
  user_id       TEXT    NOT NULL,
  deck_id       TEXT    REFERENCES decks(id) ON DELETE CASCADE,
  word_id       BIGINT  REFERENCES words(id) ON DELETE CASCADE,
  ease_factor   REAL    DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review   TIMESTAMPTZ,
  learned       BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, deck_id, word_id)
);

-- Test events (analytics)
CREATE TABLE test_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT,
  deck_id     TEXT    REFERENCES decks(id) ON DELETE SET NULL,
  word_id     BIGINT  REFERENCES words(id) ON DELETE SET NULL,
  correct     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Key changes from v0.1 schema:
- Added `decks` table (v0.2 deck system).
- `words.id` is now `BIGINT` to match the `Date.now() + index` IDs the front end generates.
- `srs_cards` primary key now includes `deck_id` — a word can appear in multiple decks with independent SRS state.
- `test_events` includes `deck_id` for per-deck analytics.

---

## Localization plan

All UI strings are hardcoded in HTML (English). When Uzbek UI is needed:

1. Create `js/i18n.js` with `const STRINGS = { en: { ... }, uz: { ... } }`.
2. Tag every label in HTML with `data-i18n="key"`.
3. On page load, `applyStrings(lang)` sets `textContent` from `STRINGS[lang]`.
4. Store chosen language in `localStorage` key `sublingo_lang`.

The Uzbek translation strings in `Word.translation` are data, not UI — they are unaffected by this plan.

---

## Recommended tech stack

| Layer | Recommendation | Rationale |
|---|---|---|
| API server | FastAPI (Python) | Native async, first-class Anthropic SDK support |
| LLM | `claude-sonnet-4-6` via `anthropic` SDK | Best extraction + translation quality at scale |
| TTS | ElevenLabs Turbo v2.5 + Web Speech API fallback | Latency + naturalness |
| SRS | `py-fsrs` (MIT) | Proven FSRS v5 implementation |
| Database | PostgreSQL + SQLAlchemy | Schema above is Postgres-native |
| Cache | Redis | TTS audio, hot deck data |
| Front-end hosting | GitHub Pages / Netlify / Vercel | Zero-config static deploy; no server needed |

---

## Front-end build policy

**Do not add a build step.** The front end must open directly in a browser via `file://` or any static host with zero configuration. If a feature genuinely requires a bundler, document the decision in `CLAUDE.md` before proceeding.
