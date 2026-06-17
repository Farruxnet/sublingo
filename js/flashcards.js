// flashcards.js — Flashcard study logic

// TODO: replace getSelectedWords() with words fetched from a real backend session
let deck = [];
let currentIndex = 0;
let ratings = {}; // { wordId: 'again' | 'hard' | 'easy' }

function initDeck() {
  deck = getSelectedWords();
  if (deck.length === 0) {
    // Fallback: use all words if nothing is selected
    deck = [...MOCK_WORDS];
  }
  currentIndex = 0;
  renderCard();
}

function renderCard() {
  const completionScreen = document.getElementById('completionScreen');
  const studyScreen      = document.getElementById('studyScreen');

  if (currentIndex >= deck.length) {
    showCompletion();
    return;
  }

  completionScreen.classList.add('d-none');
  studyScreen.classList.remove('d-none');

  const word = deck[currentIndex];
  const card = document.getElementById('flashcard');

  // Reset flip state
  card.classList.remove('flipped');

  // Front face
  document.getElementById('cardWord').textContent       = word.word;
  document.getElementById('cardIpa').textContent        = word.ipa;
  document.getElementById('cardPosLevel').innerHTML     =
    `<span class="badge ${posBadgeClass(word.partOfSpeech)} rounded-pill me-1">${word.partOfSpeech}</span>
     <span class="badge ${levelBadgeClass(word.level)} rounded-pill">${word.level}</span>`;

  // Back face
  document.getElementById('cardTranslation').textContent = word.translation;
  document.getElementById('cardDefinition').textContent  = word.definition;
  document.getElementById('cardExample').textContent     = `"${word.example}"`;

  // Progress
  const progress = Math.round((currentIndex / deck.length) * 100);
  document.getElementById('progressBar').style.width    = progress + '%';
  document.getElementById('progressBar').setAttribute('aria-valuenow', progress);
  document.getElementById('cardCounter').textContent    = `Card ${currentIndex + 1} / ${deck.length}`;

  // Nav buttons
  document.getElementById('prevBtn').disabled = currentIndex === 0;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function rateCard(rating) {
  const word = deck[currentIndex];
  ratings[word.id] = rating;

  // TODO: send rating to spaced-repetition backend (e.g. SM-2 algorithm)
  console.log(`[SRS stub] Word "${word.word}" rated: ${rating}`);

  if (rating === 'easy') {
    // TODO: mark word as learned in backend
    word.learned = true;
  }

  advance();
}

function advance() {
  currentIndex++;
  renderCard();
}

function goBack() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCard();
  }
}

function showCompletion() {
  document.getElementById('studyScreen').classList.add('d-none');
  document.getElementById('completionScreen').classList.remove('d-none');

  const total   = deck.length;
  const easy    = Object.values(ratings).filter(r => r === 'easy').length;
  const hard    = Object.values(ratings).filter(r => r === 'hard').length;
  const again   = Object.values(ratings).filter(r => r === 'again').length;

  document.getElementById('summaryTotal').textContent = total;
  document.getElementById('summaryEasy').textContent  = easy;
  document.getElementById('summaryHard').textContent  = hard;
  document.getElementById('summaryAgain').textContent = again;

  // Progress bar at 100%
  document.getElementById('progressBar').style.width = '100%';
  document.getElementById('cardCounter').textContent = `${total} / ${total} — Complete!`;
}

function restartDeck() {
  ratings = {};
  initDeck();
}
