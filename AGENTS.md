# SubLingo — Agent Integration Guide & Technical Specification

This document describes the planned AI-agent architecture for SubLingo and specifies every interface an agent must implement or consume. It is written for engineers building the backend and for AI coding agents implementing those features.

---

## System overview

```
Browser (static front end)
        │
        │  HTTP/REST  (JSON)
        ▼
┌───────────────────────────────────────┐
│            SubLingo API               │
│  (FastAPI / Express / any HTTP server)│
│                                       │
│  ┌────────────┐  ┌─────────────────┐  │
│  │  Subtitle  │  │   Vocabulary    │  │
│  │  Parser    │  │   AI Agent      │  │
│  │  Agent     │  │  (LLM-powered)  │  │
│  └────────────┘  └─────────────────┘  │
│                                       │
│  ┌────────────┐  ┌─────────────────┐  │
│  │    TTS     │  │   SRS / Study   │  │
│  │   Agent    │  │   Progress DB   │  │
│  └────────────┘  └─────────────────┘  │
└───────────────────────────────────────┘
```

The front end is deliberately agent-agnostic. Every integration point is a named function in JavaScript that currently contains a `// TODO:` comment and a `console.log` stub. An agent (or a human engineer) replaces each stub with a `fetch()` call to the corresponding API endpoint defined below.

---

## Agent 1 — Subtitle Parser

**Responsibility:** Accept raw subtitle file content, strip timestamps and formatting, return clean sentences.

### Input
```
POST /api/parse
Content-Type: application/json

{
  "content": "<raw .srt or .vtt file text>",
  "format":  "srt" | "vtt"
}
```

### Output
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
- Strip SRT/VTT timestamps with regex: `^\d+:\d+:\d+[\.,]\d+ --> .*$`
- Strip HTML tags from VTT cue payloads (`<b>`, `<i>`, `<c>`, etc.).
- Merge consecutive lines belonging to the same cue into a single sentence.
- Deduplicate repeated sentences (common in auto-generated subtitles).

---

## Agent 2 — Vocabulary Extractor (LLM-powered)

**Responsibility:** Take a list of sentences, call an LLM, and return a structured list of vocabulary words worth learning — filtered for the user's target CEFR level.

### Input
```
POST /api/extract
Content-Type: application/json

{
  "sentences":   ["..."],
  "targetLevel": "B1",          // CEFR ceiling; return words at or below this
  "maxWords":    20,
  "langPair":    "en-uz"
}
```

### Output
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

### Recommended LLM prompt (system)
```
You are a vocabulary extraction assistant for an English-to-Uzbek language learning app.

Given a list of English sentences from a subtitle file:
1. Identify words that are educational for a learner at CEFR level {targetLevel} or below.
2. Skip proper nouns, numbers, and words the learner almost certainly already knows (the, is, a, I, you…).
3. For each word return: the base/lemma form, part of speech, Uzbek translation, English definition, IPA pronunciation, the original example sentence from the subtitles, and CEFR level.
4. Return valid JSON matching the schema provided. No prose, no markdown fences.
5. Return at most {maxWords} words, prioritized by educational value.
```

### Model recommendation
Use `claude-sonnet-4-6` for cost/quality balance on this extraction task. Use `claude-opus-4-8` only if translation quality or CEFR classification accuracy needs improvement.

### Front-end integration point
`index.html → handleExtract()` — replace the `navigateTo('words.html')` call with:
```js
async function handleExtract() {
  const content = await readFileAsText(fileInput.files[0]);
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, targetLevel: levelSelect.value || 'B2', maxWords: 20, langPair: 'en-uz' })
  });
  const data = await res.json();
  // Replace MOCK_WORDS with real data for this session
  MOCK_WORDS.length = 0;
  data.words.forEach(w => MOCK_WORDS.push(w));
  selectedWordIds = MOCK_WORDS.map(w => w.id);
  saveSelectionToStorage();
  navigateTo('words.html');
}
```

---

## Agent 3 — Text-to-Speech (TTS)

**Responsibility:** Return an audio file (MP3 or OGG) for a given English word or sentence.

### Input
```
GET /api/tts?word=reluctant&lang=en-US
```

### Output
```
Content-Type: audio/mpeg
<binary MP3 stream>
```

### Front-end integration point
`js/main.js → playWordAudio(word)` — replace the Web Speech API call with:
```js
function playWordAudio(word) {
  const audio = new Audio(`/api/tts?word=${encodeURIComponent(word)}&lang=en-US`);
  audio.play();
}
```

### Implementation options (choose one)
| Option | Latency | Cost | Notes |
|---|---|---|---|
| Web Speech API (current stub) | Instant | Free | Varies by browser; keep as fallback |
| ElevenLabs Turbo v2 | ~300 ms | Low | High quality, natural voice |
| Google TTS | ~200 ms | Low | Reliable, neutral accent |
| Anthropic future audio API | TBD | TBD | Prefer if available for consistency |

Cache generated audio by word in a key-value store (Redis or filesystem). English words rarely change pronunciation.

---

## Agent 4 — Spaced-Repetition Scheduler (SRS)

**Responsibility:** Receive a flashcard rating and return the next review interval for that word.

### Rate endpoint
```
POST /api/srs/rate
Content-Type: application/json

{
  "wordId":    1,
  "userId":    "anon-uuid",
  "rating":    "again" | "hard" | "easy",
  "timestamp": "2026-06-17T10:00:00Z"
}
```

### Response
```json
{
  "wordId":          1,
  "nextReviewAt":    "2026-06-18T10:00:00Z",
  "intervalDays":    1,
  "easeFactor":      2.5
}
```

### Algorithm recommendation
Implement **FSRS v5** (Free Spaced Repetition Scheduler). It outperforms SM-2 on recall prediction and is MIT-licensed. Reference implementation: `open-spaced-repetition/py-fsrs`.

Rating mapping:
| UI button | FSRS rating |
|---|---|
| Again | `1` (Again) |
| Hard | `2` (Hard) |
| Easy | `4` (Easy) |

### Front-end integration point
`js/flashcards.js → rateCard(rating)` — replace the `console.log` stub:
```js
async function rateCard(rating) {
  const word = deck[currentIndex];
  await fetch('/api/srs/rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId: word.id, userId: getAnonymousId(), rating, timestamp: new Date().toISOString() })
  });
  advance();
}
```

---

## Agent 5 — Test Analytics Collector

**Responsibility:** Record test answers for analytics and adaptive review prioritization.

### Input
```
POST /api/test/answer
Content-Type: application/json

{
  "wordId":    5,
  "userId":    "anon-uuid",
  "correct":   false,
  "timestamp": "2026-06-17T10:05:30Z"
}
```

### Response
```json
{ "ok": true }
```

### Front-end integration point
`js/test.js → checkAnswer()` — replace the two `console.log` stubs with a fire-and-forget fetch:
```js
fetch('/api/test/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wordId: word.id, userId: getAnonymousId(), correct: isCorrect, timestamp: new Date().toISOString() })
});
```

---

## Session & user identity

The MVP has no authentication. Use a randomly generated UUID stored in `localStorage` as an anonymous user identifier. Generate it once in `main.js`:

```js
function getAnonymousId() {
  let id = localStorage.getItem('sublingo_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sublingo_uid', id);
  }
  return id;
}
```

When real auth is added, replace `getAnonymousId()` with a JWT claim — the call sites do not need to change.

---

## API error handling contract

All endpoints must return errors in this shape so the front end can show a toast:
```json
{
  "error": true,
  "message": "Human-readable description",
  "code":    "PARSE_FAILED" | "LLM_TIMEOUT" | "TTS_UNAVAILABLE" | ...
}
```

The front end should catch non-2xx responses and call `showToast(data.message, 'danger')`.

---

## Data persistence schema (future backend)

When a database is introduced, these are the minimum tables needed:

```sql
-- Words (canonical, shared across users)
CREATE TABLE words (
  id           INTEGER PRIMARY KEY,
  word         TEXT NOT NULL,
  part_of_speech TEXT,
  translation  TEXT,
  definition   TEXT,
  ipa          TEXT,
  example      TEXT,
  level        TEXT   -- CEFR
);

-- Study progress per user per word
CREATE TABLE srs_cards (
  user_id      TEXT NOT NULL,
  word_id      INTEGER REFERENCES words(id),
  ease_factor  REAL    DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review  TIMESTAMP,
  learned      BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, word_id)
);

-- Test events (analytics)
CREATE TABLE test_events (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT,
  word_id      INTEGER REFERENCES words(id),
  correct      BOOLEAN,
  created_at   TIMESTAMP DEFAULT NOW()
);
```

---

## Localization plan

All UI strings are currently hardcoded in HTML. When Uzbek UI is needed:

1. Create `js/i18n.js` with a `const STRINGS = { en: {...}, uz: {...} }` object.
2. Replace every literal label in HTML with a `data-i18n="key"` attribute.
3. On page load, call `applyStrings(lang)` which sets `textContent` from `STRINGS[lang]`.
4. Store the chosen language in `localStorage` key `sublingo_lang`.

---

## Recommended tech stack for backend

| Layer | Recommendation | Rationale |
|---|---|---|
| API server | FastAPI (Python) | Native async, easy Anthropic SDK integration |
| LLM | `claude-sonnet-4-6` via Anthropic SDK | Best extraction quality at reasonable cost |
| TTS | ElevenLabs Turbo v2 or Web Speech API fallback | Latency + quality |
| SRS | `py-fsrs` library | MIT license, proven algorithm |
| Database | PostgreSQL + SQLAlchemy | Reliable, schema above is Postgres-native |
| Cache | Redis | TTS audio caching, session data |
| Hosting | Any static host (Vercel, Netlify, GitHub Pages) for front end | No server needed for current MVP |

---

## Front-end build policy

**Do not add a build step.** The front end must remain openable directly in a browser via `file://` or any static host with zero configuration. If a feature genuinely requires a bundler, discuss with the project owner first and document the decision here.
