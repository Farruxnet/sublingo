// main.js — Shared utilities. Depends on mockData.js already loaded.

// ─── Telegram Mini App ────────────────────────────────────────────────────────
// TODO: replace loginWithProvider('telegram') mock with real Telegram.WebApp.initDataUnsafe
//       user object → POST /api/auth/telegram { initData: Telegram.WebApp.initData }
(function initTelegram() {
  const twa = window.Telegram?.WebApp;
  if (!twa) return;
  twa.ready();
  twa.expand();
  // Sync theme: Telegram colorScheme overrides saved preference (user can still toggle)
  const savedTheme = localStorage.getItem('sublingo_theme');
  if (!savedTheme) {
    const tgDark = twa.colorScheme === 'dark';
    document.documentElement.setAttribute('data-theme', tgDark ? 'dark' : 'light');
  }
  // Safe area inset: Telegram may set --tg-safe-area-inset-top/bottom
  // We use env(safe-area-inset-*) in CSS which handles both native and TG
})();

// ─── Theme ────────────────────────────────────────────────────────────────────
function _updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('.btn-theme').forEach(btn => {
    btn.innerHTML = isDark
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sublingo_theme', next);
  _updateThemeIcon();
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  window.location.href = page;
}

// ─── Active nav highlight + user chip ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sl-nav-link[data-page]').forEach(link => {
    if (link.dataset.page === path) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const userChip = document.getElementById('navUserChip');
  if (userChip && isLoggedIn()) {
    const email = getUserEmail();
    userChip.textContent = email === 'Guest' ? 'Guest' : email.split('@')[0];
  }

  // Wire all theme toggles on the page and set correct icon
  _updateThemeIcon();
  document.querySelectorAll('.btn-theme').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
});

// ─── CEFR badge class ─────────────────────────────────────────────────────────
function levelBadgeClass(level) {
  const map = { A1:'badge-a', A2:'badge-a', B1:'badge-b', B2:'badge-b', C1:'badge-c', C2:'badge-c' };
  return map[level] || 'badge-other';
}

// ─── Part-of-speech badge class ───────────────────────────────────────────────
function posBadgeClass(pos) {
  if (pos.includes('noun'))      return 'badge-pos-noun';
  if (pos.includes('verb'))      return 'badge-pos-verb';
  if (pos.includes('adjective')) return 'badge-pos-adj';
  if (pos.includes('adverb'))    return 'badge-pos-adv';
  return 'badge-pos-other';
}

// ─── SVG progress ring ────────────────────────────────────────────────────────
function progressRingSVG(learned, total, size = 48, stroke = 4) {
  const pct  = total > 0 ? learned / total : 0;
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct * circ).toFixed(1);
  const cx   = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" aria-hidden="true">
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="var(--sl-line)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="var(--sl-primary)" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circ.toFixed(1)}" stroke-dashoffset="0"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cx})"/>
  </svg>`;
}

// ─── CEFR range ───────────────────────────────────────────────────────────────
function cefrRange(words) {
  if (!words || words.length === 0) return '—';
  const order  = ['A1','A2','B1','B2','C1','C2'];
  const levels = [...new Set(words.map(w => w.level).filter(Boolean))]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0] || '—';
}

// ─── Audio ────────────────────────────────────────────────────────────────────
// TODO: replace with GET /api/tts?word=<w>&lang=en-US → MP3; fall back to Web Speech API
const _ttsCache = {};
function playWordAudio(word) {
  if (_ttsCache[word.toLowerCase()]) {
    _ttsCache[word.toLowerCase()].cloneNode().play();
    return;
  }
  // TODO: try fetch('/api/tts?word=' + encodeURIComponent(word) + '&lang=en-US') first
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const id    = 'toast-' + Date.now();
  const icons = { success:'bi-check-circle-fill', danger:'bi-x-circle-fill', info:'bi-info-circle-fill', warning:'bi-exclamation-circle-fill' };
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast sl-toast align-items-center border-0" role="alert" aria-live="assertive" data-type="${type}">
      <div class="d-flex align-items-center gap-2 px-3 py-2">
        <i class="bi ${icons[type] || 'bi-bell'} toast-icon" data-type="${type}"></i>
        <span class="toast-msg">${message}</span>
        <button type="button" class="btn-close ms-auto" data-bs-dismiss="toast" style="font-size:.7rem;"></button>
      </div>
    </div>`);
  const el = document.getElementById(id);
  new bootstrap.Toast(el, { delay: 2800 }).show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ─── Skeleton loader helpers ──────────────────────────────────────────────────
function showSkeleton(containerId, rows = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: rows }, () => `
    <div class="skeleton-card mb-3">
      <div class="skel skel-title"></div>
      <div class="skel skel-line"></div>
      <div class="skel skel-line skel-short"></div>
    </div>`).join('');
}

function hideSkeleton(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function confirmAction(message, onConfirm) {
  const id = 'confirm-' + Date.now();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="${id}" tabindex="-1" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content sl-modal">
          <div class="modal-body p-4">
            <p class="mb-0 fw-medium" style="color:var(--sl-ink);">${message}</p>
          </div>
          <div class="modal-footer border-0 pt-0 pb-3 px-4 gap-2">
            <button class="btn-ghost-sm flex-fill" data-bs-dismiss="modal">Cancel</button>
            <button class="btn-danger-sm flex-fill" id="${id}-confirm">Delete</button>
          </div>
        </div>
      </div>
    </div>`);
  const el = document.getElementById(id);
  const m  = new bootstrap.Modal(el);
  document.getElementById(`${id}-confirm`).addEventListener('click', () => { m.hide(); onConfirm(); });
  el.addEventListener('hidden.bs.modal', () => el.remove());
  m.show();
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
