/* ============================================================
   myVitalog — Interaction layer
   Wires the redesigned UI to the real Supabase health_data store
   (same key/value model the legacy app uses), so toggles, mood,
   journal, and the Settings subpages actually persist.

   Loaded after app-live.js (shares window.__VITALOG_STORE / _AUTH
   / _SESSION and the global dKey helper) and before app-main.js.
   AI features (Quick-log parsing, AI chat) are intentionally left
   for a later pass.
   ============================================================ */

(function () {
  function VD() { return window.VITALOG_DATA || {}; }
  function store() { return window.__VITALOG_STORE || (window.__VITALOG_STORE = {}); }
  function settings() { return store().settings || {}; }
  function today() { return (typeof dKey === 'function') ? dKey(0) : new Date().toISOString().split('T')[0]; }

  // ── Persistence ────────────────────────────────────────────────────────────
  async function saveKey(key, value) {
    store()[key] = value;
    var auth = window.__VITALOG_AUTH, sess = window.__VITALOG_SESSION;
    if (auth && auth.client && sess) {
      try {
        await auth.client.from('health_data').upsert(
          { user_id: sess.user.id, data_key: key, data_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,data_key' }
        );
      } catch (e) { console.warn('[actions] save "' + key + '" failed:', e); }
    }
  }
  function saveSettings() { return saveKey('settings', store().settings || {}); }

  // ── Theme ────────────────────────────────────────────────────────────────
  function applyTheme(mode) {
    var m = mode === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : (mode || 'dark');
    document.documentElement.setAttribute('data-mode', m);
  }

  // ── Feature visibility (hide rail tabs) ────────────────────────────────────
  var FEAT_TAB = {
    'Diet & nutrition': 'diet', 'Exercise & PRs': 'exercise', 'Sleep': 'sleep',
    'Biometrics': 'biometrics', 'Supplements': 'supplements', 'Journal': 'journal',
    'Metrics': 'metrics', 'Locations': 'locations'
  };
  function applyFeatures() {
    var feats = settings().features || {};
    Object.keys(FEAT_TAB).forEach(function (label) {
      var on = feats[label] !== undefined ? !!feats[label] : true;
      var btn = document.querySelector('.rail-item[data-tab="' + FEAT_TAB[label] + '"]');
      if (btn) btn.style.display = on ? '' : 'none';
    });
  }

  // ── Settings field save ────────────────────────────────────────────────────
  var GOAL_MAP = {
    calGoal: ['kcal', 'kcal'], protGoal: ['protein', 'protein'], carbGoal: ['carbs', 'carbs'],
    fatGoal: ['fat', 'fat'], waterGoal: ['water', 'water'], weightGoal: ['weight', null]
  };
  function saveSetting(key, raw) {
    var s = store().settings || (store().settings = {});
    var numKeys = ['calGoal', 'protGoal', 'carbGoal', 'fatGoal', 'waterGoal', 'weightGoal', 'age', 'waistTarget', 'bodyFatTarget'];
    var val = numKeys.indexOf(key) >= 0 ? (raw === '' ? '' : Number(raw)) : raw;
    s[key] = val;

    // Mirror into VITALOG_DATA so other tabs reflect the change immediately.
    var vd = VD();
    if (GOAL_MAP[key] && vd.user) {
      var g = vd.user.goals || (vd.user.goals = {});
      var n = Number(val) || 0;
      var gk = GOAL_MAP[key][0], tk = GOAL_MAP[key][1];
      g[gk] = n;
      if (tk && vd.today && vd.today[tk]) vd.today[tk].goal = n;
    }
    if (key === 'name' && vd.user) {
      vd.user.name = val;
      var nm = document.querySelector('.user-chip .user-name'); if (nm) nm.textContent = val;
      var av = document.querySelector('.user-chip .avatar'); if (av) av.textContent = (val || '?').charAt(0).toUpperCase();
      try { var ls = JSON.parse(localStorage.getItem('vitalog_settings') || '{}'); ls.name = val; localStorage.setItem('vitalog_settings', JSON.stringify(ls)); } catch (e) {}
    }
    saveSettings();
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportData() {
    var sess = window.__VITALOG_SESSION;
    var payload = {
      app: 'myVitalog', exportedAt: new Date().toISOString(),
      account: sess && sess.user ? { email: sess.user.email } : null,
      data: store()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'vitalog-export-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ── Wire (once) ──────────────────────────────────────────────────────────
  function wire() {
    if (window.__VITALOG_ACT_WIRED) return;
    window.__VITALOG_ACT_WIRED = true;

    // Clicks: settings nav, mood/energy, conditions, features, theme, export
    document.addEventListener('click', function (e) {
      // Settings subpage nav
      var link = e.target.closest('.settings-link');
      if (link) {
        var pane = link.getAttribute('data-pane');
        if (pane && pane !== 'signout') {
          var wrap = link.closest('.settings-wrap');
          if (wrap) {
            wrap.querySelectorAll('.settings-link').forEach(function (b) { b.classList.toggle('active', b === link); });
            wrap.querySelectorAll('.settings-pane').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-pane') === pane); });
          }
        }
        return;
      }

      // Mood / energy segments
      var seg = e.target.closest('[data-mood],[data-energy]');
      if (seg) {
        var isMood = seg.hasAttribute('data-mood');
        var val = Number(seg.getAttribute(isMood ? 'data-mood' : 'data-energy'));
        var row = seg.parentElement;
        if (row) row.querySelectorAll('.mood-seg').forEach(function (b) { b.classList.toggle('on', b === seg); });
        if (isMood) {
          var jk = 'journal:' + today();
          var j = store()[jk] || {};
          if (typeof j === 'string') j = { text: j, mood: 0 };
          j.mood = val; saveKey(jk, j);
          if (VD().today) VD().today.mood = val;
        } else {
          saveKey('energy:' + today(), val);
          if (VD().today) VD().today.energy = val;
        }
        return;
      }

      // Conditions chips
      var cond = e.target.closest('[data-cond]');
      if (cond) {
        var c = cond.getAttribute('data-cond');
        var s = store().settings || (store().settings = {});
        var list = Array.isArray(s.conditions) ? s.conditions : [];
        var i = list.indexOf(c);
        if (i >= 0) list.splice(i, 1); else list.push(c);
        s.conditions = list;
        cond.classList.toggle('accent');
        if (VD().user) VD().user.conditions = list.slice();
        saveSettings();
        return;
      }

      // Feature toggles
      var feat = e.target.closest('[data-feature]');
      if (feat) {
        var label = feat.getAttribute('data-feature');
        var s2 = store().settings || (store().settings = {});
        var feats = s2.features || (s2.features = {});
        var tog = feat.querySelector('.toggle');
        var now = !(tog && tog.classList.contains('on'));
        feats[label] = now;
        if (tog) tog.classList.toggle('on', now);
        applyFeatures();
        saveSettings();
        return;
      }

      // Appearance theme
      var modeBtn = e.target.closest('[data-mode-set]');
      if (modeBtn) {
        var mode = modeBtn.getAttribute('data-mode-set');
        var s3 = store().settings || (store().settings = {});
        s3.mode = mode;
        var sibs = modeBtn.parentElement ? modeBtn.parentElement.querySelectorAll('[data-mode-set]') : [];
        sibs.forEach(function (b) { b.classList.toggle('accent', b === modeBtn); });
        applyTheme(mode);
        saveSettings();
        return;
      }

      // Export
      if (e.target.closest('[data-act="export-data"]')) { exportData(); return; }
    });

    // Checkbox toggles: supplements (detail tab) + self-care
    document.addEventListener('change', function (e) {
      var suppX = e.target.closest('[data-supp-x]');
      if (suppX) {
        var i = Number(suppX.getAttribute('data-supp-x'));
        var ids = window.__VITALOG_SUPP_IDS || [];
        var id = ids[i];
        if (VD().supplements && VD().supplements[i]) VD().supplements[i].taken = suppX.checked;
        if (id) {
          var k = 'supplog:' + today();
          var log = store()[k] || {};
          if (suppX.checked) log[id] = true; else delete log[id];
          saveKey(k, log);
        }
        return;
      }
      var sc = e.target.closest('[data-selfcare]');
      if (sc) {
        var si = Number(sc.getAttribute('data-selfcare'));
        var scIds = window.__VITALOG_SC_IDS || [];
        var sid = scIds[si];
        if (VD().selfCare && VD().selfCare[si]) VD().selfCare[si].done = sc.checked;
        if (sid) {
          var sk = 'sclog:' + today();
          var slog = store()[sk] || {};
          if (sc.checked) slog[sid] = true; else delete slog[sid];
          saveKey(sk, slog);
        }
        return;
      }
      // Settings text/number fields
      var setInp = e.target.closest('[data-setting]');
      if (setInp) {
        var key = setInp.getAttribute('data-setting');
        if (key && key !== '__email') saveSetting(key, setInp.value);
        return;
      }
    });

    // Journal autosave (debounced)
    var jTimer = null;
    document.addEventListener('input', function (e) {
      var ta = e.target.closest('[data-journal]');
      if (!ta) return;
      clearTimeout(jTimer);
      var which = ta.getAttribute('data-journal');
      var text = ta.value;
      jTimer = setTimeout(function () {
        if (which === 'dream') {
          saveKey('dream:' + today(), { text: text });
          if (VD().journalToday) VD().journalToday.dream = text;
        } else {
          var jk = 'journal:' + today();
          var j = store()[jk] || {};
          if (typeof j === 'string') j = { text: j, mood: 0 };
          j.text = text; saveKey(jk, j);
          if (VD().journalToday) VD().journalToday.morning = text;
        }
      }, 600);
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  wire();
  applyTheme('dark'); // sensible default until prefs load
  var ready = window.__VITALOG_DATA_READY;
  function applyPrefs() { try { applyTheme(settings().mode); applyFeatures(); } catch (e) {} }
  if (ready && typeof ready.then === 'function') ready.then(applyPrefs); else applyPrefs();
})();
