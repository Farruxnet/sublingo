// mockData.js — Deck model, persistence, seed data, and helpers
// Script load order: this file MUST load before main.js and any page JS.

// ─── Canonical word pool (seed data only) ────────────────────────────────────
// TODO: replace individual deck.words with data from POST /api/extract
const SEED_WORDS_A = [
  { id:1,  word:"reluctant",  partOfSpeech:"adjective",      translation:"istamasdan, ikkilanuvchi",          definition:"Unwilling and hesitant; not eager to do something.",                              ipa:"/rɪˈlʌktənt/",   example:"She was reluctant to leave the party early.",                 level:"B1", learned:false },
  { id:2,  word:"inevitable", partOfSpeech:"adjective",      translation:"muqarrar, oldini olib boʻlaydigan", definition:"Certain to happen; unavoidable.",                                           ipa:"/ɪnˈɛvɪtəbl/",   example:"Change is inevitable in any growing organization.",           level:"B2", learned:false },
  { id:3,  word:"pursue",     partOfSpeech:"verb",           translation:"intilmoq, taʻqib qilmoq",     definition:"To follow or chase; to continue with a course of action.",                        ipa:"/pəˈsjuː/",       example:"He decided to pursue a career in medicine.",                 level:"B1", learned:false },
  { id:4,  word:"generous",   partOfSpeech:"adjective",      translation:"saxiy, ochiq qoʻل",           definition:"Showing a readiness to give more than is strictly necessary.",                    ipa:"/ˈdʒɛnərəs/",    example:"It was generous of her to share her lunch.",                 level:"A2", learned:false },
  { id:5,  word:"consequence",partOfSpeech:"noun",           translation:"oqibat, natija",                   definition:"A result or effect of an action or condition.",                                   ipa:"/ˈkɒnsɪkwəns/",  example:"He failed to consider the consequences of his actions.",     level:"B1", learned:false },
  { id:6,  word:"ambiguous",  partOfSpeech:"adjective",      translation:"noaniq, ikki maʻnoli",        definition:"Open to more than one interpretation; not having one obvious meaning.",            ipa:"/æmˈbɪɡjuəs/",   example:"The instructions were ambiguous and confusing.",             level:"B2", learned:false },
  { id:7,  word:"diligent",   partOfSpeech:"adjective",      translation:"mehnatsevar, tirishqoq",           definition:"Having or showing care and conscientiousness in one's work.",                      ipa:"/ˈdɪlɪdʒənt/",   example:"She was a diligent student who always completed her work.",  level:"B1", learned:false },
  { id:8,  word:"negotiate",  partOfSpeech:"verb",           translation:"muzokaralar olib bormoq, kelishmoq",definition:"To try to reach an agreement through discussion.",                                ipa:"/nɪˈɡəʊʃɪeɪt/",  example:"They had to negotiate the terms of the contract.",           level:"B2", learned:false },
];

const SEED_WORDS_B = [
  { id:9,  word:"apparent",   partOfSpeech:"adjective",      translation:"aniq, ravshan, koʻrinadigan", definition:"Clearly visible or understood; obvious.",                                         ipa:"/əˈpærənt/",     example:"It was apparent that she was upset about something.",        level:"B1", learned:false },
  { id:10, word:"acquire",    partOfSpeech:"verb",           translation:"orttirmoq, qoʻlga kiritmoq",  definition:"To buy or obtain something; to learn or develop a skill.",                        ipa:"/əˈkwaɪər/",     example:"It takes years to acquire fluency in a foreign language.",  level:"B1", learned:false },
  { id:11, word:"privilege",  partOfSpeech:"noun",           translation:"imtiyoz, maxsus huquq",            definition:"A special right available only to a particular person or group.",                  ipa:"/ˈprɪvɪlɪdʒ/",  example:"Education is a privilege that not everyone has access to.", level:"B2", learned:false },
  { id:12, word:"curious",    partOfSpeech:"adjective",      translation:"qiziquvchan, bilishga chanqoq",    definition:"Eager to know or learn something.",                                               ipa:"/ˈkjʊərɪəs/",    example:"The curious child asked endless questions.",                 level:"A2", learned:false },
  { id:13, word:"exhausted",  partOfSpeech:"adjective",      translation:"charchagan, holdan toygan",        definition:"Drained of physical or mental resources; very tired.",                             ipa:"/ɪɡˈzɔːstɪd/",   example:"After the marathon, she was completely exhausted.",          level:"A2", learned:false },
  { id:14, word:"persuade",   partOfSpeech:"verb",           translation:"ishontirmoq, koʻndirmoq",     definition:"To cause someone to do something through reasoning.",                              ipa:"/pəˈsweɪd/",     example:"He managed to persuade his parents to let him go.",         level:"B1", learned:false },
  { id:15, word:"elaborate",  partOfSpeech:"adjective / verb",translation:"murakkab; batafsil tushuntirmoq", definition:"Involving many carefully arranged parts; to explain in more detail.",              ipa:"/ɪˈlæbərət/",    example:"She gave an elaborate explanation of the theory.",           level:"B2", learned:false },
];

// ─── Deck helpers ─────────────────────────────────────────────────────────────

function recomputeStats(deck) {
  deck.stats = {
    total:   deck.words.length,
    learned: deck.words.filter(w => w.learned).length,
  };
}

function createDeck(name, source, words) {
  // TODO: real words will come from POST /api/extract (subtitle parser agent)
  // instead of the mock words array passed here.
  const deck = {
    id:        `deck_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    name:      name.trim() || 'Untitled deck',
    source:    source || 'Unknown source',
    createdAt: Date.now(),
    words:     words.map((w, i) => ({ ...w, id: Date.now() + i })),
    stats:     { total: 0, learned: 0 },
  };
  recomputeStats(deck);
  DECKS.push(deck);
  saveDecksToStorage();
  return deck;
}

function getDecks() {
  return DECKS;
}

function getDeckById(id) {
  return DECKS.find(d => d.id === id) || null;
}

function getActiveDeck() {
  // TODO: real version fetches from /api/session/words for the active session
  return getDeckById(activeDeckId) || DECKS[0] || null;
}

function setActiveDeck(id) {
  activeDeckId = id;
  localStorage.setItem('sublingo_active_deck', id);
}

function renameDeck(id, newName) {
  const deck = getDeckById(id);
  if (!deck) return;
  deck.name = newName.trim() || deck.name;
  saveDecksToStorage();
}

function deleteDeck(id) {
  const idx = DECKS.findIndex(d => d.id === id);
  if (idx === -1) return;
  DECKS.splice(idx, 1);
  if (activeDeckId === id) {
    activeDeckId = DECKS.length > 0 ? DECKS[0].id : null;
    localStorage.setItem('sublingo_active_deck', activeDeckId || '');
  }
  saveDecksToStorage();
}

function markWordLearned(deckId, wordId, learned = true) {
  const deck = getDeckById(deckId);
  if (!deck) return;
  const word = deck.words.find(w => w.id === wordId);
  if (word) {
    word.learned = learned;
    recomputeStats(deck);
    saveDecksToStorage();
  }
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveDecksToStorage() {
  localStorage.setItem('sublingo_decks', JSON.stringify(DECKS));
}

function loadDecksFromStorage() {
  const raw = localStorage.getItem('sublingo_decks');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DECKS.length = 0;
        parsed.forEach(d => DECKS.push(d));
      }
    } catch (_) { /* corrupted storage — keep seed */ }
  }

  const storedActive = localStorage.getItem('sublingo_active_deck');
  if (storedActive && getDeckById(storedActive)) {
    activeDeckId = storedActive;
  } else if (DECKS.length > 0) {
    activeDeckId = DECKS[0].id;
  }
}

// ─── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ─── Bootstrap with seed decks ────────────────────────────────────────────────
// Seeded decks give the library a non-empty state in the demo.
const DECKS = [
  {
    id: 'deck_seed_friends',
    name: 'Friends S01E01',
    source: 'friends.s01e01.srt',
    createdAt: Date.now() - 86400000,
    words: SEED_WORDS_A.map(w => ({ ...w })),
    stats: { total: SEED_WORDS_A.length, learned: 2 },
  },
  {
    id: 'deck_seed_ted',
    name: 'TED Talk — How to Learn',
    source: 'ted_how_to_learn.vtt',
    createdAt: Date.now() - 172800000,
    words: SEED_WORDS_B.map(w => ({ ...w })),
    stats: { total: SEED_WORDS_B.length, learned: 5 },
  },
];
// Pre-mark some seed words as learned so the progress rings look real
DECKS[0].words[0].learned = true;
DECKS[0].words[2].learned = true;
DECKS[1].words[1].learned = true;
DECKS[1].words[2].learned = true;
DECKS[1].words[3].learned = true;
DECKS[1].words[4].learned = true;
DECKS[1].words[5].learned = true;

let activeDeckId = DECKS[0].id;

// Run immediately so all page scripts see populated DECKS
loadDecksFromStorage();
