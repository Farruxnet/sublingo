// library.js — My Library page logic

// ─── Render ───────────────────────────────────────────────────────────────────
function renderLibrary() {
  const decks   = getDecks();
  const grid    = document.getElementById('deckGrid');
  const empty   = document.getElementById('emptyLibrary');
  const countEl = document.getElementById('deckCountLabel');

  countEl.textContent = `${decks.length} deck${decks.length !== 1 ? 's' : ''}`;

  if (decks.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  grid.innerHTML = decks.map(deck => {
    const { total, learned } = deck.stats;
    const pct        = total > 0 ? Math.round(learned / total * 100) : 0;
    const ring       = progressRingSVG(learned, total, 44, 4);
    const range      = cefrRange(deck.words);
    const lastStudied = deck.lastStudied ? timeAgo(deck.lastStudied) : 'Not studied yet';

    return `
      <div class="col-12 col-sm-6 col-xl-4">
        <div class="deck-card" id="dc-${escapeHtml(deck.id)}"
             role="button" tabindex="0"
             onclick="openDeck('${escapeHtml(deck.id)}')"
             onkeydown="if(event.key==='Enter'||event.key===' ')openDeck('${escapeHtml(deck.id)}')">
          <div class="deck-card__header">
            <div class="deck-card__name">${escapeHtml(deck.name)}</div>
            <button class="deck-kebab"
                    onclick="event.stopPropagation();openKebab(event,'${escapeHtml(deck.id)}')"
                    title="Deck options" aria-label="Deck options">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
          </div>
          <div class="deck-card__meta">
            <span class="badge-other" style="font-size:.7rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                  title="${escapeHtml(deck.source)}">${escapeHtml(deck.source)}</span>
            <span class="${levelBadgeClass(deck.words[0]?.level || '')}">${range}</span>
          </div>
          <div style="font-size:var(--sl-text-xs);color:var(--sl-muted);">
            <i class="bi bi-clock me-1"></i>Last studied: ${lastStudied}
          </div>
          <div class="deck-card__footer">
            <div class="deck-card__progress-label">
              <span style="font-weight:600;color:var(--sl-ink);">${learned}</span> / ${total} learned
              <span style="margin-left:.4rem;color:var(--sl-primary);font-weight:600;">${pct}%</span>
            </div>
            <div class="deck-card__ring">${ring}</div>
          </div>
        </div>
      </div>`;
  }).join('') + `
    <div class="col-12 col-sm-6 col-xl-4">
      <button class="deck-card-new w-100" style="border:none;min-height:160px;"
              data-bs-toggle="modal" data-bs-target="#newDeckModal">
        <i class="bi bi-plus-circle" style="font-size:1.5rem;"></i>
        <span style="font-size:var(--sl-text-sm);font-weight:500;">New deck</span>
      </button>
    </div>`;
}

// ─── Open deck ────────────────────────────────────────────────────────────────
function openDeck(id) {
  setActiveDeck(id);
  navigateTo('deck.html');
}

function studyDeck(id) {
  setActiveDeck(id);
  navigateTo('flashcards.html');
}

function testDeck(id) {
  setActiveDeck(id);
  navigateTo('test.html');
}

// ─── Kebab context menu ───────────────────────────────────────────────────────
function openKebab(e, deckId) {
  e.stopPropagation();
  closeKebab();

  const menu = document.createElement('div');
  menu.id = 'kebab-menu';
  menu.style.cssText = `position:fixed;z-index:9000;background:var(--sl-surface);
    border:1px solid var(--sl-line);border-radius:var(--sl-radius-sm);
    box-shadow:var(--sl-shadow-md);padding:.375rem;min-width:164px;`;

  const items = [
    { icon:'bi-eye',            label:'Open',   fn:`openDeck('${deckId}')` },
    { icon:'bi-card-text',      label:'Study',  fn:`studyDeck('${deckId}')` },
    { icon:'bi-patch-question', label:'Test',   fn:`testDeck('${deckId}')` },
    { icon:'bi-pencil',         label:'Rename', fn:`showRenameModal('${deckId}')` },
    { icon:'bi-trash',          label:'Delete', fn:`confirmDeleteDeck('${deckId}')`, danger:true },
  ];

  menu.innerHTML = items.map(it => `
    <button onclick="${it.fn};closeKebab();" style="
      display:flex;align-items:center;gap:.5rem;width:100%;border:none;background:none;
      padding:.425rem .75rem;border-radius:6px;font-size:var(--sl-text-xs);font-weight:500;
      color:${it.danger ? 'var(--sl-danger)' : 'var(--sl-ink)'};cursor:pointer;text-align:left;
      transition:background .1s;"
      onmouseover="this.style.background='var(--sl-soft)'"
      onmouseout="this.style.background='none'">
      <i class="bi ${it.icon}"></i>${it.label}
    </button>`).join('');

  document.body.appendChild(menu);

  const rect  = e.currentTarget.getBoundingClientRect();
  const menuW = 168;
  let left = rect.right - menuW;
  let top  = rect.bottom + 4;
  if (left < 8) left = 8;
  if (top + 220 > window.innerHeight) top = rect.top - 224;
  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';

  setTimeout(() => document.addEventListener('click', closeKebab, { once: true }), 10);
}

function closeKebab() {
  document.getElementById('kebab-menu')?.remove();
}

function showRenameModal(id) {
  const deck = getDeckById(id);
  if (!deck) return;
  const input = document.getElementById('renameInput');
  input.value = deck.name;

  const modal = new bootstrap.Modal(document.getElementById('renameDeckModal'));
  document.getElementById('renameSaveBtn').onclick = () => {
    const name = input.value.trim();
    if (name) { renameDeck(id, name); renderLibrary(); showToast('Deck renamed', 'success'); }
    modal.hide();
  };
  modal.show();
  setTimeout(() => input.select(), 300);
}

function confirmDeleteDeck(id) {
  const deck = getDeckById(id);
  if (!deck) return;
  confirmAction(
    `Delete "<strong>${escapeHtml(deck.name)}</strong>"? This cannot be undone.`,
    () => { deleteDeck(id); renderLibrary(); showToast('Deck deleted', 'info'); }
  );
}

// ─── Create deck flow ─────────────────────────────────────────────────────────
let activeTab  = 'file';
let pickedFile = null;

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('pane-file').classList.toggle('d-none', tab !== 'file');
  document.getElementById('pane-paste').classList.toggle('d-none', tab !== 'paste');
  document.getElementById('tab-file-btn').classList.toggle('active', tab === 'file');
  document.getElementById('tab-paste-btn').classList.toggle('active', tab === 'paste');
  document.getElementById('tab-file-btn').setAttribute('aria-selected', String(tab === 'file'));
  document.getElementById('tab-paste-btn').setAttribute('aria-selected', String(tab === 'paste'));
}

const dropZone   = document.getElementById('dropZone');
const fileInput  = document.getElementById('fileInput');
const fileInfo   = document.getElementById('fileInfo');
const fileNameEl = document.getElementById('fileName');

dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) showFileSelected(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) showFileSelected(fileInput.files[0]);
});

function showFileSelected(file) {
  // TODO: read file content here with file.text() and pass to /api/parse
  pickedFile = file;
  const nameInput = document.getElementById('deckNameInput');
  fileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  fileInfo.classList.remove('d-none');
  if (!nameInput.value) nameInput.value = file.name.replace(/\.[^.]+$/, '');
}

async function handleCreateDeck() {
  const name   = document.getElementById('deckNameInput').value.trim();
  const source = activeTab === 'file'
    ? (pickedFile ? pickedFile.name : null)
    : (document.getElementById('pasteText').value.trim() ? 'Pasted text' : null);

  if (!name) {
    document.getElementById('deckNameInput').focus();
    showToast('Please enter a deck name', 'danger');
    return;
  }
  if (!source) {
    showToast('Add a subtitle file or paste some text first', 'danger');
    return;
  }

  // Show loading skeleton while parse + extract "run"
  const overlay   = document.getElementById('loadingOverlay');
  const labelEl   = document.getElementById('loadingLabel');
  const createBtn = document.getElementById('createBtn');
  overlay.classList.remove('d-none');
  createBtn.disabled = true;

  try {
    // TODO: Step 1 — POST /api/parse { content: await pickedFile.text(), format }
    labelEl.textContent = 'Parsing subtitle file…';
    await _simulateDelay(600);

    // TODO: Step 2 — POST /api/extract { sentences, targetLevel, maxWords, langPair: 'en-uz' }
    labelEl.textContent = 'Extracting vocabulary…';
    await _simulateDelay(800);

    // Use mock words for now (replace with API response above)
    const allSeed  = [...SEED_WORDS_A, ...SEED_WORDS_B, ...SEED_WORDS_C];
    const mockWords = allSeed.sort(() => Math.random() - 0.5).slice(0, 8);

    const deck = createDeck(name, source, mockWords);
    setActiveDeck(deck.id);

    overlay.classList.add('d-none');
    createBtn.disabled = false;

    bootstrap.Modal.getInstance(document.getElementById('newDeckModal')).hide();
    resetModal();
    renderLibrary();
    showToast(`"${escapeHtml(name)}" created — ${deck.stats.total} words extracted`, 'success');

  } catch (err) {
    // TODO: surface real API errors via err.message / err.code
    overlay.classList.add('d-none');
    createBtn.disabled = false;
    showToast('Failed to create deck — please try again', 'danger');
    console.error('[createDeck error]', err);
  }
}

function _simulateDelay(ms) {
  // TODO: remove — replace with real fetch calls in handleCreateDeck()
  return new Promise(r => setTimeout(r, ms));
}

function resetModal() {
  pickedFile = null;
  document.getElementById('deckNameInput').value   = '';
  document.getElementById('pasteText').value       = '';
  document.getElementById('fileInfo').classList.add('d-none');
  fileInput.value = '';
  switchTab('file');
}

document.getElementById('newDeckModal').addEventListener('hidden.bs.modal', resetModal);

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutUser();
    window.location.replace('index.html');
  });
  renderLibrary();
});
