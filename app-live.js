/* ============================================================
   myVitalog — Live data bridge
   Loads the signed-in user's real records from Supabase
   (health_data key/value store, same model as the legacy app)
   and maps them into the window.VITALOG_DATA shape the new
   tabs render from. Falls back to the bundled sample data for
   anything that has no stored equivalent yet (e.g. wearable-only
   series like HRV / resting HR, the AI insight + chat).

   Also: off-canvas rail drawer for small screens.
   ============================================================ */

(function () {
  // ── Mobile rail drawer (runs regardless of auth/data) ──────────────────
  var railToggle = document.getElementById('rail-toggle');
  var rail = document.getElementById('rail');
  function closeRail() { document.body.classList.remove('rail-open'); }
  if (railToggle) {
    railToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      document.body.classList.toggle('rail-open');
    });
  }
  // Close the drawer when navigating or tapping outside it
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('rail-open')) return;
    if (e.target.closest('#rail-toggle')) return;
    if (e.target.closest('#rail')) {
      if (e.target.closest('.rail-item')) closeRail();
      return;
    }
    closeRail();
  });
  window.addEventListener('hashchange', closeRail);
})();

// ── Live data load ─────────────────────────────────────────────────────────
window.__VITALOG_DATA_READY = (async function () {
  var auth = window.__VITALOG_AUTH;
  if (!auth || !auth.client) return;            // no Supabase -> keep sample data
  var session;
  try { session = await auth.ready; } catch (e) { return; }
  if (!session || !session.user) return;        // null => gate already redirected

  var sb = auth.client, uid = session.user.id;
  var rows;
  try {
    var res = await sb.from('health_data').select('data_key,data_value').eq('user_id', uid);
    if (res.error) throw res.error;
    rows = res.data || [];
  } catch (e) {
    console.warn('[live] could not load health_data, keeping sample:', e);
    return;
  }

  var store = {};
  rows.forEach(function (r) { store[r.data_key] = r.data_value; });
  window.__VITALOG_STORE = store;
  window.__VITALOG_SESSION = session;

  try {
    window.VITALOG_DATA = buildLive(store, session, window.VITALOG_DATA || {});
  } catch (e) {
    console.warn('[live] build failed, keeping sample:', e);
    return;
  }

  // ── Persist supplement toggles ─────────────────────────────────────────
  // The new UI renders supplement checkboxes with data-supp="<index>".
  // We keep the parallel id list so a toggle maps back to supplog:<today>.
  document.addEventListener('change', async function (e) {
    var cb = e.target.closest('[data-supp]');
    if (!cb) return;
    var i = Number(cb.getAttribute('data-supp'));
    var ids = window.__VITALOG_SUPP_IDS || [];
    var id = ids[i];
    if (!id) return;                            // sample data (no real id) -> skip
    var key = 'supplog:' + dKey(0);
    var log = store[key] || {};
    if (cb.checked) log[id] = true; else delete log[id];
    store[key] = log;
    if (window.VITALOG_DATA.supplements[i]) window.VITALOG_DATA.supplements[i].taken = cb.checked;
    try {
      await sb.from('health_data').upsert(
        { user_id: uid, data_key: key, data_value: log, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,data_key' }
      );
    } catch (err) { console.warn('[live] supplement persist failed:', err); }
  });
})();

// ── Helpers + mapping ────────────────────────────────────────────────────────
function dKey(o) {                              // matches legacy app.js dateKey()
  var d = new Date(); d.setDate(d.getDate() + o);
  return d.toISOString().split('T')[0];
}
function fmtLong(o) {
  var d = new Date(); d.setDate(d.getDate() + o);
  return d.toLocaleDateString('en-US', { weekday: 'long' }) + ' · ' +
         d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtShort(o) {
  var d = new Date(); d.setDate(d.getDate() + o);
  return d.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' +
         d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function num(x) { var n = Number(x); return isNaN(n) ? 0 : n; }

function buildLive(store, session, base) {
  base = base || {};
  var s = store['settings'] || {};
  var gBase = (base.user && base.user.goals) || {};
  var bottleOz = num(s.bottleOz) || 24;

  function foods(o) { var v = store['food:' + dKey(o)]; return Array.isArray(v) ? v : []; }
  function sumF(arr) {
    return arr.reduce(function (a, f) {
      a.cal += num(f.cal); a.p += num(f.p); a.c += num(f.c); a.f += num(f.f); a.cost += num(f.cost); return a;
    }, { cal: 0, p: 0, c: 0, f: 0, cost: 0 });
  }
  function bottles(o) { return parseInt(store['water:' + dKey(o)] || 0, 10) || 0; }
  function weightAt(o) { var v = store['weight:' + dKey(o)]; return (v === undefined || v === null || v === '') ? null : num(v); }
  function sleepAt(o) { var v = store['sleep:' + dKey(o)]; return v && typeof v === 'object' ? v : null; }
  function journalAt(o) {
    var r = store['journal:' + dKey(o)];
    if (!r) return { text: '', mood: 0 };
    if (typeof r === 'string') return { text: r, mood: 0 };
    return { text: r.text || '', mood: num(r.mood) };
  }
  function hasAny(o) {
    return foods(o).length > 0 || bottles(o) > 0 || weightAt(o) !== null || sleepAt(o) || journalAt(o).text;
  }

  var goalKcal = num(s.calGoal) || gBase.kcal || 2200;
  var goalProt = num(s.protGoal) || gBase.protein || 160;
  var goalCarb = num(s.carbGoal) || gBase.carbs || 220;
  var goalFat  = num(s.fatGoal)  || gBase.fat || 70;
  var goalWater = num(s.waterGoal) || gBase.water || 100;

  var tf = sumF(foods(0));

  // Latest / previous weight
  var w0 = weightAt(0), wPrev = null, i;
  if (w0 === null) { for (i = 1; i <= 60; i++) { if (weightAt(i) !== null) { w0 = weightAt(i); break; } } }
  for (i = 1; i <= 60; i++) { if (weightAt(i) !== null) { wPrev = weightAt(i); break; } }

  // Latest sleep
  var sl = sleepAt(0); if (!sl) { for (i = 1; i <= 14; i++) { if (sleepAt(i)) { sl = sleepAt(i); break; } } }
  var jt0 = journalAt(0);

  // Streak: consecutive days with any log, allowing an empty "today"
  var streak = 0, start = hasAny(0) ? 0 : 1;
  for (i = start; i <= 365; i++) { if (hasAny(i)) streak++; else break; }

  // Series
  function seriesCal(days) { var a = []; for (var o = days - 1; o >= 0; o--) a.push(Math.round(sumF(foods(o)).cal)); return a; }
  function seriesProt(days) { var a = []; for (var o = days - 1; o >= 0; o--) a.push(Math.round(sumF(foods(o)).p)); return a; }
  function seriesWeight(days) {
    var a = [], last = null;
    for (var o = days - 1; o >= 0; o--) { var w = weightAt(o); if (w !== null) last = w; if (last !== null) a.push(last); }
    return a;
  }
  function seriesSleep(days) {
    var a = []; for (var o = days - 1; o >= 0; o--) { var x = sleepAt(o); if (x) a.push(+((num(x.mins)) / 60).toFixed(1)); }
    return a;
  }
  function nonEmpty(arr, fallback) { return (arr && arr.length >= 2 && arr.some(function (v) { return v; })) ? arr : fallback; }

  var kcalSeries = nonEmpty(seriesCal(7), base.kcalSeries || [0, 0, 0, 0, 0, 0, 0]);
  var proteinSeries = nonEmpty(seriesProt(7), base.proteinSeries || [0, 0, 0, 0, 0, 0, 0]);
  var weightSeries = nonEmpty(seriesWeight(15), base.weightSeries || []);
  var sleepSeries = nonEmpty(seriesSleep(10), base.sleepSeries || [7]);

  // Supplements (real list + today's log)
  var suppList = store['supplementList'];
  var supplements, suppIds = null;
  if (Array.isArray(suppList) && suppList.length) {
    var sLog = store['supplog:' + dKey(0)] || {};
    suppIds = suppList.map(function (x) { return x.id; });
    supplements = suppList.map(function (x) {
      return { name: x.name, dose: x.dose || '', time: x.time || '', taken: !!sLog[x.id] };
    });
  } else {
    supplements = base.supplements || [];
  }
  window.__VITALOG_SUPP_IDS = suppIds;

  // Self-care
  var scList = store['selfcareList'], selfCare;
  if (Array.isArray(scList) && scList.length) {
    var scLog = store['sclog:' + dKey(0)] || {};
    selfCare = scList.map(function (x) { return { name: x.name, time: x.time || '', done: !!scLog[x.id] }; });
  } else {
    selfCare = base.selfCare || [];
  }

  // Biometrics — overlay the weight metric with real values, keep the rest as sample
  var biometrics = (base.biometrics || []).map(function (b) {
    if (b.key === 'weight' && weightSeries.length) {
      return Object.assign({}, b, {
        value: (w0 !== null ? w0 : b.value),
        delta: (w0 !== null && wPrev !== null) ? +(w0 - wPrev).toFixed(1) : b.delta,
        series: weightSeries
      });
    }
    return b;
  });

  // History — previous 5 days from real logs
  var history = [];
  for (i = 1; i <= 5; i++) {
    var hf = sumF(foods(i)), hw = weightAt(i), hs = sleepAt(i), hj = journalAt(i);
    history.push({
      date: fmtShort(i),
      kcal: Math.round(hf.cal),
      protein: Math.round(hf.p),
      water: bottles(i) * bottleOz,
      weight: hw !== null ? hw : '—',
      sleep: hs ? +((num(hs.mins)) / 60).toFixed(1) : 0,
      mood: hj.mood || 0
    });
  }
  var historyHasData = history.some(function (h) { return h.kcal || h.weight !== '—' || h.sleep || h.mood; });
  if (!historyHasData && base.history) history = base.history;

  // Identity
  var storedName = '';
  try { storedName = (JSON.parse(localStorage.getItem('vitalog_settings') || '{}').name || '').trim(); } catch (e) {}
  var meta = session.user.user_metadata || {};
  var name = storedName || meta.full_name || meta.name ||
             (session.user.email ? session.user.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : 'You');
  var email = session.user.email || '';

  return {
    user: {
      name: name, email: email, initial: (name || '?').charAt(0).toUpperCase(),
      goals: { kcal: goalKcal, protein: goalProt, carbs: goalCarb, fat: goalFat, water: goalWater, weight: gBase.weight || (w0 || 0) },
      conditions: Array.isArray(s.conditions) ? s.conditions : (base.user && base.user.conditions && !Object.keys(store).length ? base.user.conditions : [])
    },
    today: {
      date: fmtLong(0),
      kcal: { used: Math.round(tf.cal), goal: goalKcal },
      protein: { used: Math.round(tf.p), goal: goalProt },
      carbs: { used: Math.round(tf.c), goal: goalCarb },
      fat: { used: Math.round(tf.f), goal: goalFat },
      water: { used: bottles(0) * bottleOz, goal: goalWater, unit: 'oz' },
      weight: w0 !== null ? w0 : (base.today && base.today.weight) || 0,
      weightDelta: (w0 !== null && wPrev !== null) ? +(w0 - wPrev).toFixed(1) : ((base.today && base.today.weightDelta) || 0),
      sleepLast: sl
        ? { hours: +((num(sl.mins)) / 60).toFixed(1), quality: num(sl.quality), bedtime: sl.bed || '', wake: sl.wake || '' }
        : (base.today && base.today.sleepLast) || { hours: 0, quality: 0, bedtime: '', wake: '' },
      mood: jt0.mood || ((base.today && base.today.mood) || 0),
      energy: (base.today && base.today.energy) || 0,
      streakDays: streak
    },
    meals: foods(0).map(function (f) {
      return { time: f.time || '', type: f.meal || 'Meal', name: f.name || '', kcal: Math.round(num(f.cal)), p: num(f.p), c: num(f.c), f: num(f.f), cost: num(f.cost) };
    }),
    weightSeries: weightSeries,
    kcalSeries: kcalSeries,
    proteinSeries: proteinSeries,
    sleepSeries: sleepSeries,
    hrvSeries: base.hrvSeries || [],            // wearable-only — sample until a device is connected
    restingHRSeries: base.restingHRSeries || [],
    workouts: base.workouts || [],              // exercise plan still uses sample structure
    pullSession: base.pullSession || [],
    prs: base.prs || [],
    supplements: supplements,
    selfCare: selfCare,
    biometrics: biometrics,
    insightThisWeek: base.insightThisWeek || { title: '', body: '', correlations: [] },
    chat: base.chat || [],
    journalToday: { morning: jt0.text || '', dream: (function () { var d = store['dream:' + dKey(0)]; return d ? (d.text || d.dream || '') : ''; })() },
    history: history
  };
}
