// tutorial.js — Vitalog Interactive Onboarding Checklist
// Replaces the old spotlight tour with a persistent slide-in checklist panel.

const OB_KEY = 'onboarding_v2';

// ─────────────────────────────────────────────────────────
// CHECKLIST DEFINITION
// ─────────────────────────────────────────────────────────
const OB_ITEMS = [

  // ── SETUP ────────────────────────────────────────────
  {
    id: 'setup_name',
    phase: 'setup',
    icon: '👤',
    title: 'Add your name',
    body: 'Personalises your greeting, AI summaries, and share cards.',
    tab: 'settings', settingsTab: 'profile',
    highlight: '#set-name',
    autoCheck: () => !!(getSettings().name),
  },
  {
    id: 'setup_body',
    phase: 'setup',
    icon: '📏',
    title: 'Set height & age',
    body: 'Used to calculate your BMI and tailor AI recommendations.',
    tab: 'settings', settingsTab: 'profile',
    highlight: '#set-height-ft',
    autoCheck: () => !!(getSettings().heightFt && getSettings().age),
  },
  {
    id: 'setup_calgoal',
    phase: 'setup',
    icon: '🔥',
    title: 'Set a calorie goal',
    body: 'Drives the progress bars in your Diet tab. Use the AI Planner or set it manually.',
    tab: 'settings', settingsTab: 'goals',
    highlight: '#set-cal-goal',
    autoCheck: () => !!(getSettings().calGoal),
  },
  {
    id: 'setup_protgoal',
    phase: 'setup',
    icon: '🥩',
    title: 'Set a protein goal',
    body: 'Track your protein intake against your daily target.',
    tab: 'settings', settingsTab: 'goals',
    highlight: '#set-prot-goal',
    autoCheck: () => !!(getSettings().protGoal),
  },
  {
    id: 'setup_watergoal',
    phase: 'setup',
    icon: '💧',
    title: 'Set a water goal',
    body: 'How many ounces are you aiming for per day?',
    tab: 'settings', settingsTab: 'goals',
    highlight: '#set-water-goal',
    autoCheck: () => !!(getSettings().waterGoal),
  },

  // ── EXPLORE ──────────────────────────────────────────
  {
    id: 'explore_ai',
    phase: 'explore',
    icon: '✦',
    title: 'Try the AI Assistant',
    body: 'Describe your whole day in plain English — meals, sleep, workout, mood — and AI logs everything at once with rich confirmation cards.',
    tab: 'ai',
    highlight: '#ai-tab-input',
    autoCheck: () => false,
  },
  {
    id: 'explore_diet',
    phase: 'explore',
    icon: '🍽',
    title: 'Log your first meal',
    body: 'Use Quick Add for saved foods, or type a food name and hit ✦ Estimate to auto-fill macros with AI.',
    tab: 'diet',
    highlight: '.add-form',
    autoCheck: () => {
      try { return getFoods(new Date().toISOString().split('T')[0]).length > 0; } catch { return false; }
    },
  },
  {
    id: 'explore_water',
    phase: 'explore',
    icon: '🫧',
    title: 'Track your water',
    body: "Tap + Bottle every time you finish one. The bar fills toward your daily goal.",
    tab: 'diet',
    highlight: '.water-card',
    autoCheck: () => {
      try { return getWater(new Date().toISOString().split('T')[0]) > 0; } catch { return false; }
    },
  },
  {
    id: 'explore_exercise',
    phase: 'explore',
    icon: '🏋',
    title: 'Check off a workout',
    body: 'A built-in 6-day plan is ready to go. Check off exercises as you finish them. Build your own plan from scratch in the workout builder.',
    tab: 'exercise',
    highlight: '.ex-day-tasks',
    autoCheck: () => false,
  },
  {
    id: 'explore_sleep',
    phase: 'explore',
    icon: '😴',
    title: 'Log your sleep',
    body: 'Enter bed time, wake time, and rate how rested you felt. Sleep trends show up in your Metrics charts.',
    tab: 'sleep',
    highlight: '.sleep-inputs',
    autoCheck: () => {
      try { return !!getSleep(new Date().toISOString().split('T')[0]); } catch { return false; }
    },
  },
  {
    id: 'explore_journal',
    phase: 'explore',
    icon: '📝',
    title: 'Write a journal entry',
    body: "Pick a mood, then write freely. Entries are private and feed into your Monday AI Weekly Summary.",
    tab: 'journal',
    highlight: '.journal-card',
    autoCheck: () => {
      try { return !!(getJournalData(new Date().toISOString().split('T')[0])?.text); } catch { return false; }
    },
  },
  {
    id: 'explore_supplements',
    phase: 'explore',
    icon: '💊',
    title: 'Set up your Supplements',
    body: 'Check off each supplement daily. Add Amazon links to any item so you can reorder in one tap.',
    tab: 'supplements',
    highlight: '#supp-checklist',
    autoCheck: () => false,
  },
  {
    id: 'explore_biometrics',
    phase: 'explore',
    icon: '🩺',
    title: 'Log a biometric',
    body: 'BP, heart rate, glucose, HRV, steps and more. Each field shows a live status badge against clinical reference ranges.',
    tab: 'biometrics',
    highlight: '.bio-grid',
    autoCheck: () => {
      try { return Object.keys(getBiometrics(new Date().toISOString().split('T')[0])).length > 0; } catch { return false; }
    },
  },
  {
    id: 'explore_history',
    phase: 'explore',
    icon: '📅',
    title: 'Browse your History',
    body: 'Month calendar colour-coded by any metric. Tap any day for a full breakdown. AI Weekly Summary lands here every Monday.',
    tab: 'calendar',
    highlight: '.cal-filter',
    autoCheck: () => false,
  },
  {
    id: 'explore_metrics',
    phase: 'explore',
    icon: '📊',
    title: 'Add a Metrics chart',
    body: "Stack charts to spot patterns — weight vs. calories, sleep vs. mood. Hit + Add Chart to get started.",
    tab: 'metrics',
    highlight: '#metrics-charts-container',
    autoCheck: () => false,
  },
  {
    id: 'explore_share',
    phase: 'explore',
    icon: '📲',
    title: 'Create a Share Story',
    body: 'Generate an Instagram-ready story card with your stats. Drag to reorder items, pick a colour theme and style, then download.',
    tab: 'share',
    highlight: '.share-layout',
    autoCheck: () => false,
  },
  {
    id: 'explore_learn',
    phase: 'explore',
    icon: '🧠',
    title: 'Read the Learn tab',
    body: 'A clean reference to endocrine disruptors, harmful oils, food additives, heavy metals, and household toxins worth avoiding.',
    tab: 'learn',
    highlight: '#learn-content',
    autoCheck: () => false,
  },
];

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────
let _obState = {};

function _loadState() {
  try { _obState = JSON.parse(localStorage.getItem(OB_KEY) || '{}'); } catch { _obState = {}; }
}

function _saveState() {
  try { localStorage.setItem(OB_KEY, JSON.stringify(_obState)); } catch {}
}

function _autoDetect() {
  let changed = false;
  OB_ITEMS.forEach(item => {
    if (_obState[item.id]) return;
    try { if (item.autoCheck && item.autoCheck()) { _obState[item.id] = true; changed = true; } } catch {}
  });
  if (changed) _saveState();
}

function _totalDone()  { return OB_ITEMS.filter(i => _obState[i.id]).length; }
function _isAllDone()  { return _totalDone() === OB_ITEMS.length; }

// ─────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────
function checkAndStartTutorial() {
  _loadState();
  _autoDetect();
  _injectLauncherBtn();
  const dismissed = localStorage.getItem(OB_KEY + '_dismissed');
  if (!dismissed && !_isAllDone()) {
    setTimeout(openOnboarding, 800);
  }
}

function _injectLauncherBtn() {
  if (document.getElementById('ob-launcher')) return;
  const btn = document.createElement('button');
  btn.id = 'ob-launcher';
  btn.className = 'ob-launcher-btn';
  btn.onclick = openOnboarding;
  btn.innerHTML = `<span class="ob-launcher-icon">✦</span><span class="ob-launcher-label">Getting Started</span><span class="ob-launcher-count" id="ob-launcher-count"></span>`;
  const footer = document.querySelector('.sidebar-footer');
  if (footer) footer.parentNode.insertBefore(btn, footer);
  _updateLauncherCount();
}

function _updateLauncherCount() {
  const el = document.getElementById('ob-launcher-count');
  if (!el) return;
  const done = _totalDone(), total = OB_ITEMS.length;
  el.textContent = done + '/' + total;
  el.className = 'ob-launcher-count' + (done === total ? ' ob-launcher-count--done' : '');
}

// ─────────────────────────────────────────────────────────
// PANEL
// ─────────────────────────────────────────────────────────
function openOnboarding() {
  _loadState(); _autoDetect();
  try { localStorage.removeItem(OB_KEY + '_dismissed'); } catch {}

  let panel = document.getElementById('ob-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ob-panel';
    document.body.appendChild(panel);
  }
  panel.classList.remove('ob-panel--minimised');
  _renderPanel();
  setTimeout(() => panel.classList.add('ob-panel--open'), 20);
}

function _renderPanel() {
  const panel = document.getElementById('ob-panel');
  if (!panel) return;

  const done  = _totalDone(), total = OB_ITEMS.length;
  const pct   = Math.round(done / total * 100);
  const setup   = OB_ITEMS.filter(i => i.phase === 'setup');
  const explore = OB_ITEMS.filter(i => i.phase === 'explore');
  const sDone   = setup.filter(i => _obState[i.id]).length;
  const eDone   = explore.filter(i => _obState[i.id]).length;

  panel.innerHTML = `
    <div class="ob-header">
      <div class="ob-header-left">
        <div class="ob-title">✦ Getting Started</div>
        <div class="ob-subtitle">${done} of ${total} complete</div>
      </div>
      <div class="ob-header-btns">
        <button class="ob-btn-icon" onclick="minimiseOnboarding()" title="Minimise">−</button>
        <button class="ob-btn-icon" onclick="dismissOnboarding()" title="Dismiss">✕</button>
      </div>
    </div>

    <div class="ob-progress-track">
      <div class="ob-progress-fill" style="width:${pct}%"></div>
    </div>

    <div class="ob-body" id="ob-body">

      <div class="ob-phase-header">
        <div class="ob-phase-left">
          <span class="ob-phase-num">1</span>
          <div>
            <div class="ob-phase-title">Setup Your Profile</div>
            <div class="ob-phase-sub">Fill in your details so Vitalog can personalise your goals and AI coaching.</div>
          </div>
        </div>
        <span class="ob-phase-badge ${sDone === setup.length ? 'ob-phase-badge--done' : ''}">${sDone}/${setup.length}</span>
      </div>

      <div class="ob-list">
        ${setup.map(item => _renderItem(item)).join('')}
      </div>

      <div class="ob-divider"></div>

      <div class="ob-phase-header">
        <div class="ob-phase-left">
          <span class="ob-phase-num">2</span>
          <div>
            <div class="ob-phase-title">Explore the App</div>
            <div class="ob-phase-sub">Tap any item to jump to that feature. It'll be checked off automatically.</div>
          </div>
        </div>
        <span class="ob-phase-badge ${eDone === explore.length ? 'ob-phase-badge--done' : ''}">${eDone}/${explore.length}</span>
      </div>

      <div class="ob-list">
        ${explore.map(item => _renderItem(item)).join('')}
      </div>

      ${_isAllDone() ? `
        <div class="ob-done-banner">
          <div class="ob-done-confetti">🎉</div>
          <strong>You're all set!</strong>
          <span>Everything is configured. Time to build the habit.</span>
          <button class="ob-done-btn" onclick="dismissOnboarding()">Close &amp; Get Going</button>
        </div>` : ''}

    </div>
  `;
}

function _renderItem(item) {
  const done = !!_obState[item.id];
  return `<div class="ob-item ${done ? 'ob-item--done' : ''}" id="ob-item-${item.id}" onclick="obItemClick('${item.id}')">
    <div class="ob-check ${done ? 'ob-check--done' : ''}">
      ${done ? `<svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>` : ''}
    </div>
    <span class="ob-item-icon">${item.icon}</span>
    <div class="ob-item-text">
      <div class="ob-item-title">${item.title}</div>
      <div class="ob-item-body">${item.body}</div>
    </div>
    ${done ? '' : '<span class="ob-item-arrow">›</span>'}
  </div>`;
}

// ─────────────────────────────────────────────────────────
// INTERACTIONS
// ─────────────────────────────────────────────────────────
let _hlTimeout = null;

function obItemClick(id) {
  const item = OB_ITEMS.find(i => i.id === id);
  if (!item) return;

  if (item.tab) {
    if (item.settingsTab) switchTab('settings', item.settingsTab);
    else switchTab(item.tab);
  }

  if (item.highlight) {
    clearTimeout(_hlTimeout);
    _hlTimeout = setTimeout(() => {
      const sel = item.highlight.split(',')[0].trim();
      const el  = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ob-highlight');
        setTimeout(() => el.classList.remove('ob-highlight'), 2400);
      }
    }, 300);
  }

  _obState[id] = true;
  _saveState();
  _autoDetect();
  _renderPanel();
  _updateLauncherCount();
}

function minimiseOnboarding() {
  document.getElementById('ob-panel')?.classList.toggle('ob-panel--minimised');
}

function dismissOnboarding() {
  const panel = document.getElementById('ob-panel');
  if (panel) { panel.classList.remove('ob-panel--open'); setTimeout(() => panel.remove(), 360); }
  try { localStorage.setItem(OB_KEY + '_dismissed', '1'); } catch {}
}
