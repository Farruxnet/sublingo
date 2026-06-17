// main.js — Shared logic, navigation helpers, and utility functions

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  window.location.href = page;
}

// ─── Active nav link highlight ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
});

// ─── CEFR level badge color helper ────────────────────────────────────────────
function levelBadgeClass(level) {
  const map = { A1: 'bg-success', A2: 'bg-success', B1: 'bg-warning text-dark', B2: 'bg-warning text-dark', C1: 'bg-danger', C2: 'bg-danger' };
  return map[level] || 'bg-secondary';
}

// ─── Part-of-speech badge color helper ────────────────────────────────────────
function posBadgeClass(pos) {
  if (pos.includes('noun'))      return 'badge-pos-noun';
  if (pos.includes('verb'))      return 'badge-pos-verb';
  if (pos.includes('adjective')) return 'badge-pos-adj';
  if (pos.includes('adverb'))    return 'badge-pos-adv';
  return 'badge-pos-other';
}

// ─── Audio placeholder ────────────────────────────────────────────────────────
// TODO: replace with real TTS API call (e.g. Web Speech API or backend TTS endpoint)
function playWordAudio(word) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = 0.85;
    window.speechSynthesis.speak(utter);
  } else {
    console.log(`[Audio stub] Would play pronunciation for: "${word}"`);
  }
}

// ─── Toast notification helper ────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id = 'toast-' + Date.now();
  const iconMap = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi ${iconMap[type] || 'bi-bell'} me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  const el = document.getElementById(id);
  const toast = new bootstrap.Toast(el, { delay: 2500 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}
