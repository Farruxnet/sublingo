// main.js — Shared utilities. Depends on mockData.js already loaded.

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  window.location.href = page;
}

// ─── Active nav highlight ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    if (link.dataset.page === path) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
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
  const pct    = total > 0 ? learned / total : 0;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = (pct * circ).toFixed(1);
  const cx     = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" aria-hidden="true">
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="var(--sl-line)" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" stroke="var(--sl-primary)" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circ.toFixed(1)}"
      stroke-dashoffset="0"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cx})"/>
  </svg>`;
}

// ─── CEFR range from word array ───────────────────────────────────────────────
function cefrRange(words) {
  if (!words || words.length === 0) return '—';
  const order = ['A1','A2','B1','B2','C1','C2'];
  const levels = words.map(w => w.level).filter(Boolean);
  const sorted = [...new Set(levels)].sort((a,b) => order.indexOf(a) - order.indexOf(b));
  return sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length-1]}` : sorted[0] || '—';
}

// ─── Audio (Web Speech API stub) ─────────────────────────────────────────────
// TODO: replace with real TTS endpoint (e.g. ElevenLabs, Google TTS)
function playWordAudio(word) {
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
  const id = 'toast-' + Date.now();
  const icons = { success:'bi-check-circle-fill', danger:'bi-x-circle-fill', info:'bi-info-circle-fill' };
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

// ─── Confirm dialog (inline Bootstrap modal alternative) ─────────────────────
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
            <button class="btn btn-ghost-sm flex-fill" data-bs-dismiss="modal">Cancel</button>
            <button class="btn btn-danger-sm flex-fill" id="${id}-confirm">Delete</button>
          </div>
        </div>
      </div>
    </div>`);
  const el  = document.getElementById(id);
  const m   = new bootstrap.Modal(el);
  document.getElementById(`${id}-confirm`).addEventListener('click', () => {
    m.hide();
    onConfirm();
  });
  el.addEventListener('hidden.bs.modal', () => el.remove());
  m.show();
}

// ─── Anonymous user ID ────────────────────────────────────────────────────────
function getAnonymousId() {
  let id = localStorage.getItem('sublingo_uid');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('sublingo_uid', id); }
  return id;
}
