// flashcards.js — pure UI; deck/ratings/currentIndex injected by template script

function renderCard() {
  if (currentIndex >= deck.words.length) { showCompletion(); return; }

  document.getElementById('completionScreen').classList.add('d-none');
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
  document.getElementById('progressBar').style.width  = pct + '%';
  document.getElementById('cardCounter').textContent  = `${currentIndex + 1} / ${deck.words.length}`;
  document.getElementById('deckLabel').textContent    = deck.name;
  document.getElementById('prevBtn').disabled         = currentIndex === 0;
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
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

  document.getElementById('summaryTotal').textContent = total;
  document.getElementById('summaryEasy').textContent  = easy;
  document.getElementById('summaryHard').textContent  = hard;
  document.getElementById('summaryAgain').textContent = again;
  document.getElementById('progressBar').style.width  = '100%';
  document.getElementById('cardCounter').textContent  = `${total} / ${total}`;
}

function restartDeck() {
  ratings = {};
  currentIndex = 0;
  renderCard();
  document.getElementById('completionScreen').classList.add('d-none');
  document.getElementById('studyScreen').classList.remove('d-none');
}
