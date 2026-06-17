// test.js — Multiple-choice quiz logic

// TODO: replace getSelectedWords() with words from real backend session
let questions    = [];
let currentQ     = 0;
let score        = 0;
let wrongAnswers = [];
let answered     = false;

function buildQuestions() {
  const pool = getSelectedWords().length >= 4 ? getSelectedWords() : [...MOCK_WORDS];

  // Shuffle and take up to 10 questions
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);

  questions = shuffled.map(word => {
    // Pick 3 distractor translations from the rest of the pool
    const distractors = pool
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.translation);

    const options = [...distractors, word.translation].sort(() => Math.random() - 0.5);

    return { word, correctAnswer: word.translation, options };
  });
}

function initTest() {
  buildQuestions();
  currentQ     = 0;
  score        = 0;
  wrongAnswers = [];
  answered     = false;
  renderQuestion();
}

function renderQuestion() {
  const resultsScreen  = document.getElementById('resultsScreen');
  const questionScreen = document.getElementById('questionScreen');

  if (currentQ >= questions.length) {
    showResults();
    return;
  }

  resultsScreen.classList.add('d-none');
  questionScreen.classList.remove('d-none');

  answered = false;

  const { word, options } = questions[currentQ];
  const progress = Math.round((currentQ / questions.length) * 100);

  document.getElementById('progressBar').style.width = progress + '%';
  document.getElementById('progressBar').setAttribute('aria-valuenow', progress);
  document.getElementById('qCounter').textContent = `Question ${currentQ + 1} / ${questions.length}`;
  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;

  document.getElementById('questionWord').textContent  = word.word;
  document.getElementById('questionIpa').textContent   = word.ipa;

  const answersEl = document.getElementById('answersGrid');
  // Use index-based onclick to avoid quoting issues with apostrophes in Uzbek text
  answersEl.innerHTML = options.map((opt, i) => `
    <button class="answer-btn" onclick="checkAnswer(this, ${i})" data-index="${i}">
      <span class="fw-bold me-2 text-muted" style="font-size:0.8rem;">${String.fromCharCode(65 + i)}.</span>
      ${opt}
    </button>`).join('');

  document.getElementById('nextBtn').classList.add('d-none');
  document.getElementById('feedbackMsg').classList.add('d-none');
}

function checkAnswer(btn, optIndex) {
  if (answered) return;
  answered = true;

  const { word, correctAnswer, options } = questions[currentQ];
  const selected  = options[optIndex];
  const isCorrect = selected === correctAnswer;

  // Highlight all buttons
  document.querySelectorAll('.answer-btn').forEach(b => {
    b.disabled = true;
    const idx = parseInt(b.dataset.index, 10);
    if (options[idx] === correctAnswer) b.classList.add('correct');
  });

  if (!isCorrect) {
    btn.classList.add('wrong');
    wrongAnswers.push(word);
    // TODO: send wrong answer to backend for adaptive review scheduling
    console.log(`[Test] Wrong answer for "${word.word}". Correct: "${correctAnswer}"`);
  } else {
    score++;
    // TODO: send correct answer to backend
    console.log(`[Test] Correct answer for "${word.word}"`);
  }

  // Feedback message
  const fb = document.getElementById('feedbackMsg');
  fb.className = `alert mt-3 ${isCorrect ? 'alert-success' : 'alert-danger'}`;
  fb.innerHTML = isCorrect
    ? `<i class="bi bi-check-circle-fill me-2"></i>Correct! <strong>${word.word}</strong> means <em>${correctAnswer}</em>`
    : `<i class="bi bi-x-circle-fill me-2"></i>Incorrect. <strong>${word.word}</strong> means <em>${correctAnswer}</em>`;
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

  document.getElementById('progressBar').style.width = '100%';
  document.getElementById('qCounter').textContent    = 'Complete!';
  document.getElementById('scoreDisplay').textContent = `Score: ${score}`;

  const total   = questions.length;
  const pct     = Math.round((score / total) * 100);

  document.getElementById('finalScore').textContent = `${score} / ${total}`;
  document.getElementById('finalPct').textContent   = `${pct}%`;
  document.getElementById('scoreCircle').style.background =
    pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2';
  document.getElementById('scoreCircle').style.borderColor =
    pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  document.getElementById('finalScore').style.color =
    pct >= 80 ? '#15803d' : pct >= 50 ? '#92400e' : '#b91c1c';

  // Medal + message
  const medal = pct >= 80 ? '🏆 Excellent!' : pct >= 50 ? '👍 Good job!' : '📖 Keep practicing!';
  document.getElementById('resultMessage').textContent = medal;

  // Wrong answers list
  const wrongList = document.getElementById('wrongList');
  if (wrongAnswers.length === 0) {
    wrongList.innerHTML = `<p class="text-success fw-semibold"><i class="bi bi-trophy-fill me-2"></i>Perfect score — no mistakes!</p>`;
  } else {
    wrongList.innerHTML = `
      <h6 class="fw-semibold mb-2 text-danger"><i class="bi bi-x-circle me-2"></i>Review these words:</h6>
      <div class="row g-2">
        ${wrongAnswers.map(w => `
          <div class="col-12 col-sm-6">
            <div class="sl-card p-2 d-flex align-items-center gap-2">
              <button class="btn-audio flex-shrink-0" onclick="playWordAudio('${w.word}')" title="Pronounce">
                <i class="bi bi-volume-up"></i>
              </button>
              <div>
                <div class="fw-semibold small">${w.word}</div>
                <div class="text-muted" style="font-size:0.78rem;">${w.translation}</div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }
}

function restartTest() {
  initTest();
}
