// sync.js — Cloud sync layer
// Wraps Supabase reads/writes with a localStorage fallback cache
// The app calls these instead of localStorage directly

const SUPABASE_URL = 'https://fqovfqzysvctejmtwigj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AgTnpMdSur2PLSGfGN8t8g_m1vgG5DH';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let _userId = null;
let _syncQueue = {}; // key -> value, debounced writes
let _syncTimers = {};
const SYNC_DELAY = 800; // ms debounce

// ── Auth ──────────────────────────────────────────────
async function authInit() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return false;
  }
  _userId = session.user.id;

  // Show user email in header
  const emailEl = document.getElementById('user-email');
  if (emailEl) emailEl.textContent = session.user.email;

  // Populate sidebar user info
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (sidebarName) sidebarName.textContent = session.user.email;
  if (sidebarAvatar) sidebarAvatar.textContent = session.user.email.charAt(0).toUpperCase();

  // Listen for auth changes
  _supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });

  return true;
}

async function authSignOut() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── Core read/write ───────────────────────────────────
// lsGet / lsSet are the same names the app already uses internally
// We keep a local cache in sessionStorage for speed

function _cacheKey(k) { return 'ht_cache_' + k; }

function _readCache(k) {
  try { return JSON.parse(sessionStorage.getItem(_cacheKey(k))); } catch { return undefined; }
}
function _writeCache(k, v) {
  try { sessionStorage.setItem(_cacheKey(k), JSON.stringify(v)); } catch {}
}

async function lsGet(k) {
  // Return cached value immediately for snappy UI
  const cached = _readCache(k);
  if (cached !== undefined && cached !== null) return cached;

  // Fetch from Supabase
  if (!_userId) return null;
  try {
    const { data, error } = await _supabase
      .from('health_data')
      .select('data_value')
      .eq('user_id', _userId)
      .eq('data_key', k)
      .maybeSingle();
    if (error) throw error;
    const val = data ? data.data_value : null;
    _writeCache(k, val);
    return val;
  } catch (e) {
    console.warn('lsGet error', k, e);
    return null;
  }
}

function lsSet(k, v) {
  // Write to cache immediately
  _writeCache(k, v);

  // Debounce the Supabase write
  if (_syncTimers[k]) clearTimeout(_syncTimers[k]);
  _syncTimers[k] = setTimeout(() => _flushKey(k, v), SYNC_DELAY);
}

async function _flushKey(k, v) {
  if (!_userId) return;
  try {
    await _supabase.from('health_data').upsert(
      { user_id: _userId, data_key: k, data_value: v, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,data_key' }
    );
  } catch (e) {
    console.warn('lsSet flush error', k, e);
  }
}

// Bulk preload all user data into cache on startup (makes the app feel instant)
async function preloadAllData() {
  if (!_userId) return;
  try {
    const { data, error } = await _supabase
      .from('health_data')
      .select('data_key, data_value')
      .eq('user_id', _userId);
    if (error) throw error;
    if (data) {
      data.forEach(row => _writeCache(row.data_key, row.data_value));
    }
  } catch (e) {
    console.warn('preload error', e);
  }
}

// Sync versions of the specific storage helpers the app uses
// These need to be async since lsGet is async, but we expose
// sync-looking wrappers using the preloaded cache

function lsGetSync(k) {
  const cached = _readCache(k);
  return (cached !== undefined && cached !== null) ? cached : null;
}

// ── Specific data helpers (sync, use cache) ───────────
function getFoods(k)       { return lsGetSync('food:'+k) || []; }
function setFoods(k, v)    { lsSet('food:'+k, v); }
function getWater(k)       { return parseInt(lsGetSync('water:'+k) || '0'); }
function setWater(k, v)    { lsSet('water:'+k, String(v)); }
function getWeight(k)      { return lsGetSync('weight:'+k); }
function setWeight(k, v)   { lsSet('weight:'+k, v); }
function getJournalData(k) {
  const r = lsGetSync('journal:'+k);
  if (!r) return { text: '', mood: 0 };
  if (typeof r === 'string') return { text: r, mood: 0 };
  return r;
}
function setJournalData(k, v) { lsSet('journal:'+k, v); }
function getSleep(k)       { return lsGetSync('sleep:'+k) || null; }
function setSleep(k, v)    { lsSet('sleep:'+k, v); }
function getExChecked(wk)  { return lsGetSync('ex:'+wk) || {}; }
function setExChecked(wk, v) { lsSet('ex:'+wk, v); }
function getQuickList()    { return lsGetSync('quickList') || null; } // null = use DEFAULT_QUICK
function saveQuickList(l)  { lsSet('quickList', l); }
function getCustomWorkouts() { return lsGetSync('customWorkouts') || []; }
function saveCustomWorkouts(w) { lsSet('customWorkouts', w); }
function getSettings() {
  return lsGetSync('settings') || {
    bottleOz: 24, calGoal: 0, protGoal: 0, carbGoal: 0, fatGoal: 0, waterGoal: 0,
    heightFt: 0, heightIn: 0, gender: '', age: 0, theme: 'light'
  };
}

// ── Supplements ──────────────────────────────────────
function getSupplementList()    { return lsGetSync('supplementList') || null; }
function saveSupplementList(v)  { lsSet('supplementList', v); }
function getSupplementLog(k)    { return lsGetSync('supplog:'+k) || {}; }
function setSupplementLog(k, v) { lsSet('supplog:'+k, v); }

// ── Self Care ─────────────────────────────────────────
function getSelfCareList()      { return lsGetSync('selfcareList') || null; }
function saveSelfCareList(v)    { lsSet('selfcareList', v); }
function getSelfCareLog(k)      { return lsGetSync('sclog:'+k) || {}; }
function setSelfCareLog(k, v)   { lsSet('sclog:'+k, v); }

// ── Personal Records ──────────────────────────────────
function getPRs()           { return lsGetSync('prs') || {}; }
function setPRs(v)          { lsSet('prs', v); }

// ── Biometrics ────────────────────────────────────────
function getBiometrics(k)   { return lsGetSync('bio:'+k) || {}; }
function setBiometrics(k,v) { lsSet('bio:'+k, v); }

// ── Party Favors ──────────────────────────────────────
function getPartyList()      { return lsGetSync('partyList') || null; }
function savePartyList(v)    { lsSet('partyList', v); }
function getPartyLog(k)      { return lsGetSync('partylog:'+k) || {}; }
function setPartyLog(k, v)   { lsSet('partylog:'+k, v); }

// ── Home Cleaning ─────────────────────────────────────
function getCleaningList()      { return lsGetSync('cleaningList') || null; }
function saveCleaningList(v)    { lsSet('cleaningList', v); }
function getCleaningLog(k)      { return lsGetSync('cleanlog:'+k) || {}; }
function setCleaningLog(k, v)   { lsSet('cleanlog:'+k, v); }

// ── Period Tracking ───────────────────────────────────
function getPeriodSettings()    { return lsGetSync('periodSettings') || null; }
function savePeriodSettings(v)  { lsSet('periodSettings', v); }
function getPeriodLog(k)        { return lsGetSync('periodlog:'+k) || {}; }
function setPeriodLog(k, v)     { lsSet('periodlog:'+k, v); }

// ── Dream Journal ──────────────────────────────────────
function getDreamEntry(k)      { return lsGetSync('dream:'+k) || {}; }
function setDreamEntry(k, v)   { lsSet('dream:'+k, v); }

// ── Body Targets ───────────────────────────────────────
function getBodyTargetsSaved() { return lsGetSync('bodyTargets') || []; }
function saveBodyTargetsSaved(v){ lsSet('bodyTargets', v); }

// Clear all cached data (used on sign out)
function clearAllCache() {
  const keys = Object.keys(sessionStorage).filter(k => k.startsWith('ht_cache_'));
  keys.forEach(k => sessionStorage.removeItem(k));
}

// ── Poop Tracker ──────────────────────────────────────
function getPoopLog(k)      { return lsGetSync('poop:'+k) || []; }
function setPoopLog(k, v)   { lsSet('poop:'+k, v); }

// ── Sex Tracker ───────────────────────────────────────
function getSexLog(k)       { return lsGetSync('sex:'+k) || []; }
function setSexLog(k, v)    { lsSet('sex:'+k, v); }
