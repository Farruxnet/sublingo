// test.js — Deck-scoped multiple-choice quiz logic

// TODO: replace getActiveDeck() with /api/session/words from real backend
let deck        = null;
let questions   = [];
let currentQ    = 0;
let score       = 0;
let wrongAnswers = [];
let answered    = false;

function buildQuestions() {
  deck = getActiveDeck();
  if (!deck || deck.words.length < 2) return;

  const pool = deck.words.length >= 4 ? deck.words : deck.words;

  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);

  questions = shuffled.map(word => {
    const distractors = pool
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.translation);

    // Pad if fewer than 3 distractors available
    while (distractors.length < 3) distractors.push('—');

    const options = [...distractors, word.translation].sort(() => Math.random() - 0.5);
    return { word, correctAnswer: word.translation, options };
  });
}

function initTest() {
  deck = getActiveDeck();

  if (!deck || deck.words.length === 0) {
    showNoDeck();
    return;
  }

  if (deck.words.length < 2) {
    showNoDeck('This deck needs at least 2 words to run a test.');
    return;
  }

  buildQuestions();
  currentQ     = 0;
  score        = 0;
  wrongAnswers = [];
  answered     = false;

  document.getElementById('noDeckScreen').classList.add('d-none');
  renderQuestion();
}

function showNoDeck(msg) {
  showToast(msg || 'No deck selected — pick one from your library', 'info');
  setTimeout(() => window.location.replace('library.html'), 800);
}

function renderQuestion() {
  if (currentQ >= questions.length) { showResults(); return; }

  document.getElementById('resultsScreen').classList.add('d-none');
  document.getElementById('questionScreen').classList.remove('d-none');

  answered = false;

  const { word, options } = questions[currentQ];
  const pct = Math.round(currentQ / questions.length * 100);

  document.getElementById('progressBar').style.width    = pct + '%';
  document.getElementById('qCounter').textContent       = `${currentQ + 1} / ${questions.length}`;
  document.getElementById('scoreDisplay').textContent   = `Score: ${score}`;
  document.getElementById('deckLabel').textContent      = deck.name;
  document.getElementById('questionWord').textContent   = word.word;
  document.getElementById('questionIpa').textContent    = word.ipa;

  const grid = document.getElementById('answersGrid');
  // Index-based onclick prevents apostrophe issues in Uzbek translations
  grid.innerHTML = options.map((opt, i) => `
    <button class="answer-btn" data-index="${i}">
      <span class="answer-key">${String.fromCharCode(65 + i)}.</span>
      ${opt}
    </button>`).join('');

  grid.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => checkAnswer(btn, parseInt(btn.dataset.index, 10)));
  });

  document.getElementById('nextBtn').classList.add('d-none');
  document.getElementById('feedbackMsg').classList.add('d-none');
}

function checkAnswer(btn, optIndex) {
  if (answered) return;
  answered = true;

  const { word, correctAnswer, options } = questions[currentQ];
  const selected  = options[optIndex];
  const isCorrect = selected === correctAnswer;

  document.querySelectorAll('.answer-btn').forEach(b => {
    b.disabled = true;
    if (options[parseInt(b.dataset.index, 10)] === correctAnswer) b.classList.add('correct');
  });

  if (!isCorrect) {
    btn.classList.add('wrong');
    wrongAnswers.push(word);
    // TODO: POST to /api/test/answer { wordId, deckId: deck.id, userId: getAnonymousId(), correct: false, timestamp }
    console.log(`[Test] Wrong — "${word.word}", correct: "${correctAnswer}"`);
  } else {
    score++;
    // TODO: POST to /api/test/answer { wordId, deckId: deck.id, userId: getAnonymousId(), correct: true, timestamp }
    console.log(`[Test] Correct — "${word.word}"`);
  }

  const fb = document.getElementById('feedbackMsg');
  fb.className = `mt-3 p-3 rounded-3 ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
  fb.innerHTML = isCorrect
    ? `<i class="bi bi-check-circle-fill me-2"></i>Correct! <strong>${word.word}</strong> = <em>${correctAnswer}</em>`
    : `<i class="bi bi-x-circle-fill me-2"></i>Not quite. <strong>${word.word}</strong> = <em>${correctAnswer}</em>`;
  fb.classList.remove('d-none');

  document.getElementById('nextBtn').classList.remove('d-none');
}

function nextQuestion() {
  currentQ++;
  renderQuestion();
}

function showResults() {
  document.getElementById('questionScreen').classList.add('d-none');
  document.getElementById('resultsScreen').classList.remove('d-none');

  document.getElementById('progressBar').style.width  = '100%';
  document.getElementById('qCounter').textContent     = 'Complete!';

  const total = questions.length;
  const pct   = Math.round(score / total * 100);

  document.getElementById('finalScore').textContent  = `${score} / ${total}`;
  document.getElementById('finalPct').textContent    = `${pct}%`;
  document.getElementById('resultDeck').textContent  = deck.name;

  const circle = document.getElementById('scoreCircle');
  if (pct >= 80) {
    circle.style.background   = '#dcfce7';
    circle.style.borderColor  = 'var(--sl-success)';
    document.getElementById('finalScore').style.color = 'var(--sl-success)';
  } else if (pct >= 50) {
    circle.style.background   = '#fef3c7';
    circle.style.borderColor  = '#d97706';
    document.getElementById('finalScore').style.color = '#92400e';
  } else {
    circle.style.background   = 'var(--sl-danger-bg)';
    circle.style.borderColor  = 'var(--sl-danger)';
    document.getElementById('finalScore').style.color = 'var(--sl-danger)';
  }

  document.getElementById('resultMessage').textContent =
    pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good job — keep going!' : 'Keep practicing!';

  const wrongList = document.getElementById('wrongList');
  if (wrongAnswers.length === 0) {
    wrongList.innerHTML = `<p style="color:var(--sl-success);font-weight:600;font-size:var(--sl-text-sm);">
      <i class="bi bi-trophy-fill me-2"></i>Perfect score — no mistakes!</p>`;
  } else {
    wrongList.innerHTML = `
      <p style="font-size:var(--sl-text-xs);font-weight:600;color:var(--sl-danger);margin-bottom:.625rem;">
        <i class="bi bi-x-circle me-1"></i>Review these words:
      </p>
      <div class="row g-2">
        ${wrongAnswers.map(w => `
          <div class="col-12 col-sm-6">
            <div class="sl-card p-2 d-flex align-items-center gap-2">
              <button class="btn-audio flex-shrink-0" data-word="${w.word}" title="Pronounce">
                <i class="bi bi-volume-up"></i>
              </button>
              <div>
                <div style="font-weight:600;font-size:var(--sl-text-xs);font-family:'Fraunces',Georgia,serif;">${w.word}</div>
                <div style="font-size:var(--sl-text-xs);color:var(--sl-muted);">${w.translation}</div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;

    // Attach audio listeners after DOM insertion
    wrongList.querySelectorAll('.btn-audio').forEach(btn => {
      btn.addEventListener('click', () => playWordAudio(btn.dataset.word));
    });
  }
}

function restartTest() {
  initTest();
}
