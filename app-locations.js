/* ============================================================
   myVitalog — Locations tab
   A "where should I go" sounding board.

   - Save addresses (one Home + any number of named places),
     persisted to Supabase (health_data key "locations") with a
     localStorage fallback.
   - Geocode with OpenStreetMap Nominatim (no API key).
   - Find nearby places with the Overpass API, bucketed into:
       • On foot         (≤ ~0.8 mi)
       • Short drive      (≤ ~8 mi  / ~15 min)
       • Worth the drive  (≤ ~30 mi / up to ~1 hr)
   - Healthy focus: grocery/markets, gyms & fitness, activities &
     outdoors, and restaurants/cafés with fast-food and junk
     cuisines filtered out.

   Self-registers as window.TABS.locations and is driven by the
   per-tab init() hook in app-main.js.
   ============================================================ */

(function () {
  // ── Config ───────────────────────────────────────────────────────────────
  var WALK_M = 1200, DRIVE_M = 13000, FAR_M = 48000;
  var NEAR_R = 13000, FAR_R = 48000;
  var CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
  var OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  var GROUPS = {
    food:     { label: 'Healthy eats' },
    activity: { label: 'Outdoors & activities' },
    fitness:  { label: 'Gyms & fitness' },
    grocery:  { label: 'Grocery & markets' }
  };
  var GROUP_ORDER = ['food', 'activity', 'fitness', 'grocery'];

  var BANDS = [
    { key: 'walk',  title: 'On foot',          note: 'under ~0.8 mi · ~15 min walk' },
    { key: 'drive', title: 'Short drive',      note: 'under ~8 mi · ~15 min' },
    { key: 'far',   title: 'Worth the drive',  note: 'up to ~30 mi · up to ~1 hr' }
  ];

  var FOOD_DENY = ['burger', 'fast_food', 'fried', 'fries', 'donut', 'doughnut', 'ice_cream', 'hot_dog', 'chicken_wings'];
  var FOOD_BOOST = ['vegan', 'vegetarian', 'salad', 'poke', 'health', 'juice', 'smoothie', 'mediterranean', 'greek', 'falafel', 'seafood', 'sushi', 'japanese', 'bowl', 'organic', 'farm_to_table'];

  // ── State ────────────────────────────────────────────────────────────────
  var LKEY = 'locations';
  var saved = null;        // { addresses:[{id,name,address,lat,lon,isHome}], activeId }
  var resultsByAddr = {};  // id -> places[]
  var loadingId = null;

  function uid() { return 'loc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function loadSaved() {
    var store = window.__VITALOG_STORE;
    if (store && store[LKEY] && Array.isArray(store[LKEY].addresses)) return clone(store[LKEY]);
    try {
      var ls = JSON.parse(localStorage.getItem('vitalog_' + LKEY) || 'null');
      if (ls && Array.isArray(ls.addresses)) return ls;
    } catch (e) {}
    return { addresses: [], activeId: null };
  }
  async function persist() {
    try { localStorage.setItem('vitalog_' + LKEY, JSON.stringify(saved)); } catch (e) {}
    if (window.__VITALOG_STORE) window.__VITALOG_STORE[LKEY] = clone(saved);
    var auth = window.__VITALOG_AUTH, sess = window.__VITALOG_SESSION;
    if (auth && auth.client && sess) {
      try {
        await auth.client.from('health_data').upsert(
          { user_id: sess.user.id, data_key: LKEY, data_value: saved, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,data_key' }
        );
      } catch (e) { console.warn('[locations] cloud save failed:', e); }
    }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function activeAddr() { return (saved.addresses || []).find(function (a) { return a.id === saved.activeId; }) || null; }

  // ── Geo helpers ──────────────────────────────────────────────────────────
  function haversine(aLat, aLon, bLat, bLon) {
    var R = 6371000, toR = Math.PI / 180;
    var dLat = (bLat - aLat) * toR, dLon = (bLon - aLon) * toR;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  async function geocode(q) {
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(q);
    var r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('Geocoding service error');
    var j = await r.json();
    if (!j || !j.length) throw new Error('Address not found — try adding city/state or a ZIP.');
    return { lat: +j[0].lat, lon: +j[0].lon, display: j[0].display_name };
  }

  // ── Overpass ─────────────────────────────────────────────────────────────
  function nearQuery(lat, lon, r) {
    var p = '(around:' + r + ',' + lat + ',' + lon + ')';
    return '[out:json][timeout:25];(' +
      'node[shop~"^(supermarket|greengrocer|health_food|organic|farm)$"]' + p + ';' +
      'way[shop~"^(supermarket|greengrocer|health_food|organic|farm)$"]' + p + ';' +
      'node[amenity=marketplace]' + p + ';' +
      'node[leisure~"^(fitness_centre|sports_centre|swimming_pool)$"]' + p + ';' +
      'way[leisure~"^(fitness_centre|sports_centre|swimming_pool)$"]' + p + ';' +
      'node[sport=climbing]' + p + ';way[sport=climbing]' + p + ';' +
      'node[amenity~"^(restaurant|cafe)$"]' + p + ';' +
      'way[amenity~"^(restaurant|cafe)$"]' + p + ';' +
      'node[leisure~"^(park|nature_reserve|garden)$"]' + p + ';' +
      'way[leisure~"^(park|nature_reserve|garden)$"]' + p + ';' +
      'node[natural~"^(beach|peak)$"]' + p + ';' +
      'node[tourism~"^(viewpoint|attraction)$"]' + p + ';' +
      ');out center tags 250;';
  }
  function farQuery(lat, lon, r) {
    var p = '(around:' + r + ',' + lat + ',' + lon + ')';
    return '[out:json][timeout:25];(' +
      'node[leisure~"^(nature_reserve|park|garden)$"]' + p + ';' +
      'way[leisure~"^(nature_reserve|park|garden)$"]' + p + ';' +
      'node[natural~"^(beach|peak)$"]' + p + ';' +
      'node[tourism~"^(viewpoint|attraction)$"]' + p + ';' +
      'node[leisure~"^(sports_centre|fitness_centre|swimming_pool)$"]' + p + ';' +
      'way[leisure~"^(sports_centre|fitness_centre|swimming_pool)$"]' + p + ';' +
      'node[sport=climbing]' + p + ';' +
      'node[shop~"^(health_food|organic|farm|supermarket)$"]' + p + ';' +
      'way[shop~"^(health_food|organic|farm)$"]' + p + ';' +
      'node[amenity~"^(restaurant|cafe)$"]["diet:vegan"~"yes|only"]' + p + ';' +
      'node[amenity~"^(restaurant|cafe)$"]["diet:vegetarian"~"yes|only"]' + p + ';' +
      ');out center tags 150;';
  }
  async function overpass(query) {
    var lastErr;
    for (var i = 0; i < OVERPASS.length; i++) {
      try {
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, 28000);
        var r = await fetch(OVERPASS[i], { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error('Overpass ' + r.status);
        var j = await r.json();
        return j.elements || [];
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Places service unavailable');
  }

  // ── Classify + filter ────────────────────────────────────────────────────
  function classify(tags) {
    if (!tags) return null;
    var name = tags.name; if (!name) return null;

    if (tags.shop && /^(supermarket|greengrocer|health_food|organic|farm)$/.test(tags.shop)) {
      var slab = { supermarket: 'Grocery', greengrocer: 'Produce', health_food: 'Health food', organic: 'Organic grocer', farm: 'Farm shop' }[tags.shop];
      return { group: 'grocery', sub: slab, score: tags.shop === 'health_food' || tags.shop === 'organic' ? 2 : 1 };
    }
    if (tags.amenity === 'marketplace') return { group: 'grocery', sub: 'Market', score: 2 };

    if (tags.leisure && /^(fitness_centre|sports_centre|swimming_pool)$/.test(tags.leisure)) {
      var flab = { fitness_centre: 'Gym', sports_centre: 'Sports center', swimming_pool: 'Pool' }[tags.leisure];
      return { group: 'fitness', sub: flab, score: 1 };
    }
    if (tags.sport === 'climbing') return { group: 'fitness', sub: 'Climbing', score: 1 };

    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') {
      var cuisine = (tags.cuisine || '').toLowerCase();
      for (var d = 0; d < FOOD_DENY.length; d++) { if (cuisine.indexOf(FOOD_DENY[d]) >= 0) return null; }
      var score = 0;
      if (/^(yes|only)$/.test(tags['diet:vegan'] || '') || /^(yes|only)$/.test(tags['diet:vegetarian'] || '')) score += 2;
      for (var b = 0; b < FOOD_BOOST.length; b++) { if (cuisine.indexOf(FOOD_BOOST[b]) >= 0) { score += 2; break; } }
      var sub = tags.amenity === 'cafe' ? 'Café' : 'Restaurant';
      if (cuisine) sub = cap(cuisine.split(';')[0].replace(/_/g, ' ')) + (tags.amenity === 'cafe' ? ' café' : '');
      return { group: 'food', sub: sub, score: score };
    }

    if (tags.leisure && /^(park|nature_reserve|garden)$/.test(tags.leisure)) {
      var llab = { park: 'Park', nature_reserve: 'Nature reserve', garden: 'Garden' }[tags.leisure];
      return { group: 'activity', sub: llab, score: tags.leisure === 'nature_reserve' ? 2 : 1 };
    }
    if (tags.natural === 'beach') return { group: 'activity', sub: 'Beach', score: 2 };
    if (tags.natural === 'peak') return { group: 'activity', sub: 'Peak / trail', score: 2 };
    if (tags.tourism === 'viewpoint') return { group: 'activity', sub: 'Viewpoint', score: 1 };
    if (tags.tourism === 'attraction') return { group: 'activity', sub: 'Attraction', score: 1 };
    return null;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function normalize(els, oLat, oLon) {
    var out = [], seen = {};
    els.forEach(function (e) {
      var lat = e.lat != null ? e.lat : (e.center && e.center.lat);
      var lon = e.lon != null ? e.lon : (e.center && e.center.lon);
      if (lat == null || lon == null) return;
      var c = classify(e.tags);
      if (!c) return;
      var key = e.type + '/' + e.id;
      if (seen[key]) return; seen[key] = 1;
      out.push({
        id: key, name: e.tags.name, group: c.group, sub: c.sub, score: c.score,
        lat: lat, lon: lon, dist: haversine(oLat, oLon, lat, lon)
      });
    });
    return out;
  }

  async function fetchPlaces(addr) {
    var near = nearQuery(addr.lat, addr.lon, NEAR_R);
    var far = farQuery(addr.lat, addr.lon, FAR_R);
    var res = await Promise.all([overpass(near), overpass(far)]);
    var merged = normalize(res[0].concat(res[1]), addr.lat, addr.lon);
    // Dedup again across the two sets (normalize dedups within its own call only)
    var seen = {}, places = [];
    merged.forEach(function (p) { if (seen[p.id]) return; seen[p.id] = 1; places.push(p); });
    places = places.filter(function (p) { return p.dist <= FAR_M; });
    return places;
  }

  // ── Bucketing ────────────────────────────────────────────────────────────
  function band(dist) { return dist <= WALK_M ? 'walk' : (dist <= DRIVE_M ? 'drive' : 'far'); }
  function miles(m) { return m / 1609.34; }
  function fmtDist(m) { var mi = miles(m); return mi < 0.1 ? (Math.round(m / 0.3048) + ' ft') : (mi.toFixed(mi < 10 ? 1 : 0) + ' mi'); }
  function fmtTime(m, key) {
    var km = m / 1000;
    if (key === 'walk') return '~' + Math.max(1, Math.round(km / 5 * 60)) + ' min walk';
    var min = key === 'drive' ? km / 35 * 60 : km / 60 * 60;
    return '~' + Math.max(1, Math.round(min)) + ' min drive';
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function render() {
    saved = loadSaved();
    var a = activeAddr();
    var addresses = saved.addresses || [];

    var chips = addresses.map(function (ad) {
      return '<button class="loc-chip ' + (ad.id === saved.activeId ? 'active' : '') + '" data-act="select" data-id="' + ad.id + '">' +
        (ad.isHome ? '<span class="loc-home-dot" title="Home"></span>' : '') +
        '<span class="loc-chip-name">' + esc(ad.name) + '</span>' +
        '<span class="loc-chip-x" data-act="delete" data-id="' + ad.id + '" title="Remove">×</span>' +
        '</button>';
    }).join('');

    var resultsHtml = '';
    if (!a) {
      resultsHtml = '<div class="loc-empty"><div class="serif loc-empty-h">Tell me where you are.</div>' +
        '<p>Add your home address (or anywhere you spend time) and I\'ll surface the groceries, gyms, healthy spots, and outdoor places around it — sorted by how far you\'d have to go.</p></div>';
    } else if (resultsByAddr[a.id]) {
      resultsHtml = renderResults(resultsByAddr[a.id], a);
    } else {
      resultsHtml = '<div class="loc-status" id="loc-status">Finding places near ' + esc(a.name) + '…</div>';
    }

    return '' +
    '<div class="loc-wrap page-fade-in">' +
      '<section class="card loc-setup">' +
        '<div class="card-head"><div>' +
          '<span class="eyebrow">Your places</span>' +
          '<h3 class="card-title">Where to?</h3>' +
        '</div>' + (a ? '<button class="btn btn-ghost loc-refresh" data-act="refresh">Refresh</button>' : '') + '</div>' +
        '<div class="loc-form">' +
          '<input id="loc-input" class="loc-input" type="text" placeholder="Enter an address, e.g. 350 5th Ave, New York" autocomplete="off" />' +
          '<input id="loc-name" class="loc-name" type="text" placeholder="Label (Home, Work…)" autocomplete="off" />' +
          '<label class="loc-homecheck"><input type="checkbox" id="loc-home" /> Home</label>' +
          '<button class="btn btn-primary" data-act="add">Save place</button>' +
        '</div>' +
        '<div class="loc-err" id="loc-err" hidden></div>' +
        (chips ? '<div class="loc-chips">' + chips + '</div>' : '') +
      '</section>' +
      '<div id="loc-results">' + resultsHtml + '</div>' +
    '</div>';
  }

  function renderResults(places, a) {
    var buckets = { walk: [], drive: [], far: [] };
    places.forEach(function (p) { buckets[band(p.dist)].push(p); });

    var sections = BANDS.map(function (bd) {
      var items = buckets[bd.key];
      var inner;
      if (!items.length) {
        inner = '<div class="loc-none">Nothing notable in this range.</div>';
      } else {
        inner = GROUP_ORDER.map(function (g) {
          var list = items.filter(function (p) { return p.group === g; });
          if (!list.length) return '';
          list.sort(function (x, y) { return (y.score - x.score) || (x.dist - y.dist); });
          list = list.slice(0, 5);
          var rows = list.map(function (p) {
            var dir = 'https://www.google.com/maps/dir/?api=1&origin=' + a.lat + ',' + a.lon + '&destination=' + p.lat + ',' + p.lon;
            return '<a class="loc-place list-row" href="' + dir + '" target="_blank" rel="noopener">' +
              '<div class="loc-place-main"><div class="loc-place-name">' + esc(p.name) + '</div>' +
              '<div class="loc-place-sub">' + esc(p.sub) + '</div></div>' +
              '<div class="loc-place-dist">' + fmtDist(p.dist) + '<span>' + fmtTime(p.dist, bd.key) + '</span></div>' +
              '</a>';
          }).join('');
          return '<div class="loc-group"><div class="loc-group-h eyebrow">' + GROUPS[g].label + '</div>' + rows + '</div>';
        }).join('');
        if (!inner.trim()) inner = '<div class="loc-none">Nothing notable in this range.</div>';
      }
      return '<section class="card loc-band">' +
        '<div class="loc-band-head"><h3 class="serif loc-band-title">' + bd.title + '</h3>' +
        '<span class="mono loc-band-note">' + bd.note + '</span></div>' +
        '<div class="loc-band-body">' + inner + '</div></section>';
    }).join('');

    return '<div class="loc-active mono">Around <strong>' + esc(a.name) + '</strong> · ' + esc(a.address) + '</div>' + sections;
  }

  // ── Behavior ─────────────────────────────────────────────────────────────
  async function ensureResults(container) {
    var a = activeAddr();
    if (!a || resultsByAddr[a.id]) return;

    // Try fresh cache from localStorage
    var ckey = a.lat.toFixed(4) + ',' + a.lon.toFixed(4);
    try {
      var cache = JSON.parse(localStorage.getItem('vitalog_loc_cache') || '{}');
      if (cache[ckey] && (Date.now() - cache[ckey].ts) < CACHE_TTL) {
        resultsByAddr[a.id] = cache[ckey].places;
        paint(container);
        return;
      }
    } catch (e) {}

    var statusEl = container.querySelector('#loc-status');
    loadingId = a.id;
    try {
      var places = await fetchPlaces(a);
      if (loadingId !== a.id) return; // a newer request superseded this one
      resultsByAddr[a.id] = places;
      try {
        var c = JSON.parse(localStorage.getItem('vitalog_loc_cache') || '{}');
        c[ckey] = { ts: Date.now(), places: places };
        localStorage.setItem('vitalog_loc_cache', JSON.stringify(c));
      } catch (e) {}
      paint(container);
    } catch (e) {
      if (statusEl) statusEl.innerHTML = '<span class="loc-status-err">Couldn\'t load places: ' + esc(e.message) + '</span> <button class="btn btn-ghost" data-act="refresh">Try again</button>';
    }
  }

  function paint(container) {
    var box = container.querySelector('#loc-results');
    var a = activeAddr();
    if (box && a && resultsByAddr[a.id]) box.innerHTML = renderResults(resultsByAddr[a.id], a);
  }

  function showErr(container, msg) {
    var el = container.querySelector('#loc-err');
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false; el.textContent = msg;
  }

  function init(container) {
    saved = loadSaved();
    wireOnce();
    ensureResults(container);
  }

  // Bind delegated handlers a single time. #content persists across tab
  // switches, so re-binding on each init() would stack duplicate handlers.
  function wireOnce() {
    if (window.__VITALOG_LOC_WIRED) return;
    window.__VITALOG_LOC_WIRED = true;
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.id === 'loc-input' && e.key === 'Enter') {
        e.preventDefault();
        var b = document.querySelector('.loc-wrap [data-act="add"]');
        if (b) b.click();
      }
    });
    document.addEventListener('click', async function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn || !btn.closest('.loc-wrap')) return;
      var container = document.getElementById('content');
      if (!container) return;
      var act = btn.getAttribute('data-act');

      if (act === 'add') {
        e.preventDefault();
        var input = container.querySelector('#loc-input');
        var nameEl = container.querySelector('#loc-name');
        var homeEl = container.querySelector('#loc-home');
        var q = (input.value || '').trim();
        if (!q) { showErr(container, 'Enter an address first.'); return; }
        showErr(container, '');
        btn.disabled = true; var old = btn.textContent; btn.textContent = 'Locating…';
        try {
          var geo = await geocode(q);
          var isHome = homeEl && homeEl.checked;
          if (isHome) (saved.addresses || []).forEach(function (x) { x.isHome = false; });
          var label = (nameEl.value || '').trim() || (isHome ? 'Home' : (geo.display.split(',')[0] || 'Saved place'));
          var rec = { id: uid(), name: label, address: geo.display, lat: geo.lat, lon: geo.lon, isHome: !!isHome };
          saved.addresses = saved.addresses || [];
          saved.addresses.push(rec);
          saved.activeId = rec.id;
          await persist();
          rerender(container);
          ensureResults(container);
        } catch (err) {
          showErr(container, err.message || 'Could not find that address.');
          btn.disabled = false; btn.textContent = old;
        }
        return;
      }

      if (act === 'select') {
        var id = btn.getAttribute('data-id');
        if (saved.activeId === id) return;
        saved.activeId = id;
        persist();
        rerender(container);
        ensureResults(container);
        return;
      }

      if (act === 'delete') {
        e.preventDefault(); e.stopPropagation();
        var did = btn.getAttribute('data-id');
        saved.addresses = (saved.addresses || []).filter(function (x) { return x.id !== did; });
        if (saved.activeId === did) saved.activeId = saved.addresses[0] ? saved.addresses[0].id : null;
        delete resultsByAddr[did];
        persist();
        rerender(container);
        ensureResults(container);
        return;
      }

      if (act === 'refresh') {
        var a = activeAddr();
        if (!a) return;
        delete resultsByAddr[a.id];
        try {
          var cache = JSON.parse(localStorage.getItem('vitalog_loc_cache') || '{}');
          delete cache[a.lat.toFixed(4) + ',' + a.lon.toFixed(4)];
          localStorage.setItem('vitalog_loc_cache', JSON.stringify(cache));
        } catch (er) {}
        var box = container.querySelector('#loc-results');
        if (box) box.innerHTML = '<div class="loc-status" id="loc-status">Finding places near ' + esc(a.name) + '…</div>';
        ensureResults(container);
        return;
      }
    });
  }

  function rerender(container) {
    // Re-render just the locations subtree (container is #content)
    container.innerHTML = render();
  }

  // ── Register tab ─────────────────────────────────────────────────────────
  function crumb() {
    var s = loadSaved(); var a = (s.addresses || []).find(function (x) { return x.id === s.activeId; });
    return a ? ('Around ' + a.name) : 'Add a place to begin';
  }
  if (window.TABS) {
    window.TABS.locations = { title: 'Locations', crumb: crumb, render: render, init: init };
  }
})();
