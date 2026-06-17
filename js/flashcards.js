// flashcards.js — Deck-scoped flashcard logic

// TODO: replace getActiveDeck() with a fetch from /api/session/words for the real backend session
let deck        = null;
let currentIndex = 0;
let ratings     = {};   // { wordId: 'again' | 'hard' | 'easy' }

function initDeck() {
  deck = getActiveDeck();

  if (!deck || deck.words.length === 0) {
    showNoDeck();
    return;
  }

  currentIndex = 0;
  ratings      = {};
  renderCard();
}

function showNoDeck() {
  showToast('No deck selected — pick one from your library', 'info');
  setTimeout(() => window.location.replace('library.html'), 800);
}

function renderCard() {
  if (currentIndex >= deck.words.length) {
    showCompletion();
    return;
  }

  document.getElementById('completionScreen').classList.add('d-none');
  document.getElementById('noDeckScreen').classList.add('d-none');
  document.getElementById('studyScreen').classList.remove('d-none');

  const word = deck.words[currentIndex];

  document.getElementById('flashcard').classList.remove('flipped');

  document.getElementById('cardWord').textContent        = word.word;
  document.getElementById('cardIpa').textContent         = word.ipa;
  document.getElementById('cardPosLevel').innerHTML      =
    `<span class="${posBadgeClass(word.partOfSpeech)}">${word.partOfSpeech}</span>
     <span class="${levelBadgeClass(word.level)} ms-1">${word.level}</span>`;

  document.getElementById('cardTranslation').textContent = word.translation;
  document.getElementById('cardDefinition').textContent  = word.definition;
  document.getElementById('cardExample').textContent     = `"${word.example}"`;

  const pct = Math.round(currentIndex / deck.words.length * 100);
  document.getElementById('progressBar').style.width    = pct + '%';
  document.getElementById('cardCounter').textContent    = `${currentIndex + 1} / ${deck.words.length}`;
  document.getElementById('deckLabel').textContent      = deck.name;

  document.getElementById('prevBtn').disabled = currentIndex === 0;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function rateCard(rating) {
  const word = deck.words[currentIndex];
  ratings[word.id] = rating;

  // TODO: POST to /api/srs/rate with { wordId, deckId: deck.id, userId: getAnonymousId(), rating, timestamp } for FSRS scheduling
  console.log(`[SRS stub] "${word.word}" rated: ${rating}`);

  if (rating === 'easy') {
    // TODO: also POST to /api/words/:id/learned
    markWordLearned(deck.id, word.id, true);
    deck = getActiveDeck(); // refresh after mutation
  }

  advance();
}

function advance() {
  currentIndex++;
  renderCard();
}

function goBack() {
  if (currentIndex > 0) { currentIndex--; renderCard(); }
}

function showCompletion() {
  document.getElementById('studyScreen').classList.add('d-none');
  document.getElementById('completionScreen').classList.remove('d-none');

  const total = deck.words.length;
  const easy  = Object.values(ratings).filter(r => r === 'easy').length;
  const hard  = Object.values(ratings).filter(r => r === 'hard').length;
  const again = Object.values(ratings).filter(r => r === 'again').length;

  document.getElementById('summaryDeck').textContent  = deck.name;
  document.getElementById('summaryTotal').textContent = total;
  document.getElementById('summaryEasy').textContent  = easy;
  document.getElementById('summaryHard').textContent  = hard;
  document.getElementById('summaryAgain').textContent = again;

  document.getElementById('progressBar').style.width  = '100%';
  document.getElementById('cardCounter').textContent  = `${total} / ${total}`;
}

function restartDeck() {
  ratings = {};
  initDeck();
}
