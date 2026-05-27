/* ============================================================
   Tab renderers — vanilla, return HTML strings.
   Each tab is a function: renderX(data) → html
   Registered in window.TABS.
   ============================================================ */

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function pct(used, goal) { return Math.max(0, Math.min(100, Math.round((used / goal) * 100))); }

function sparkPath(data, width, height, pad = 4) {
  if (!data || data.length < 2) return '';
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const inner = height - pad * 2;
  const xs = data.map((_, i) => (i / (data.length - 1)) * width);
  const ys = data.map((v) => pad + (1 - (v - min) / range) * inner);
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const px = xs[i-1], py = ys[i-1], cx = xs[i], cy = ys[i];
    const mx = (px + cx) / 2;
    d += ` Q ${mx} ${py} ${(mx + cx)/2} ${(py + cy)/2} T ${cx} ${cy}`;
  }
  return d;
}

function spark(data, opts = {}) {
  const w = opts.w || 220, h = opts.h || 64;
  const stroke = opts.stroke || 'var(--accent)';
  const fill = opts.fill || 'none';
  const d = sparkPath(data, w, h);
  const area = opts.area
    ? `<path d="${d} L ${w} ${h} L 0 ${h} Z" fill="url(#spark-grad-${opts.id || 'a'})" />`
    : '';
  const grad = opts.area
    ? `<defs><linearGradient id="spark-grad-${opts.id || 'a'}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${stroke}" stop-opacity=".35"/>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
      </linearGradient></defs>`
    : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">
    ${grad}
    ${area}
    <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function ring(pctVal, opts = {}) {
  const size = opts.size || 88, stroke = opts.stroke || 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pctVal / 100);
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--rule)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${opts.color || 'var(--accent)'}"
      stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}

function bars(data, opts = {}) {
  const w = opts.w || 360, h = opts.h || 90, gap = 6;
  const min = 0, max = Math.max(...data);
  const barW = (w - gap * (data.length - 1)) / data.length;
  let html = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">`;
  data.forEach((v, i) => {
    const bh = (v / max) * (h - 4);
    const isLast = i === data.length - 1;
    html += `<rect x="${i * (barW + gap)}" y="${h - bh}" width="${barW}" height="${bh}"
      rx="2" fill="${isLast ? 'var(--accent)' : 'var(--ink-soft)'}" opacity="${isLast ? 1 : .35}"/>`;
  });
  html += `</svg>`;
  return html;
}

function multiLine(seriesArr, opts = {}) {
  // seriesArr: [{data:[…], color, label}]
  const w = opts.w || 700, h = opts.h || 200, pad = 16;
  const all = seriesArr.flatMap((s) => s.data);
  const min = Math.min(...all), max = Math.max(...all);
  const range = (max - min) || 1;
  const xs = (i, len) => pad + (i / (len - 1)) * (w - pad * 2);
  const ys = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);
  let html = `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">`;
  // grid lines (3 horizontal)
  for (let i = 0; i <= 3; i++) {
    const y = pad + (i / 3) * (h - pad * 2);
    html += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="var(--rule-soft)" stroke-width=".5"/>`;
  }
  // series
  seriesArr.forEach((s) => {
    let d = '';
    s.data.forEach((v, i) => {
      const x = xs(i, s.data.length), y = ys(v);
      d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    });
    html += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round"/>`;
    // last point
    const last = s.data.length - 1;
    html += `<circle cx="${xs(last, s.data.length)}" cy="${ys(s.data[last])}" r="3.5"
       fill="${s.color}"/>`;
  });
  html += `</svg>`;
  return html;
}

// ──────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────

function renderDashboard(d) {
  const t = d.today;
  const kp = pct(t.kcal.used, t.kcal.goal);
  const pp = pct(t.protein.used, t.protein.goal);
  const wp = pct(t.water.used, t.water.goal);
  return `
  <div class="page-fade-in rise-stagger" style="display:flex;flex-direction:column;gap:24px">

    <!-- Hero greeting -->
    <section class="card hero-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap">
        <div>
          <span class="eyebrow">${t.date} · ${t.streakDays}-day streak</span>
          <h2 class="serif" style="font-size:44px;line-height:1.04;letter-spacing:-.02em;margin:10px 0 0;max-width:24ch">
            Good morning, <em class="accent">${escapeHtml(d.user.name)}.</em>
          </h2>
          <p style="color:var(--ink-soft);max-width:46ch;line-height:1.55;margin:12px 0 0;font-size:15px">
            You're <strong style="color:var(--ink)">${t.kcal.goal - t.kcal.used} kcal</strong> and
            <strong style="color:var(--ink)">${t.protein.goal - t.protein.used}g protein</strong> from today's goal.
            Long run yesterday looks like it paid off — HRV is up 4 ms.
          </p>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          ${ringStat('Calories', t.kcal.used.toLocaleString(), '/ ' + t.kcal.goal, kp)}
          ${ringStat('Protein',  t.protein.used + 'g', '/ ' + t.protein.goal + 'g', pp)}
          ${ringStat('Water',    t.water.used + ' ' + t.water.unit, '/ ' + t.water.goal, wp)}
        </div>
      </div>
    </section>

    <!-- KPI strip -->
    <section class="grid-12">
      ${kpiCard('Weight', t.weight + ' <span class="unit">lb</span>', t.weightDelta + ' lb · 7d',
        d.weightSeries, 'span-3', { stroke: 'var(--accent)', area: true, id: 'w' })}
      ${kpiCard('Sleep',  t.sleepLast.hours + 'h ' + Math.round((t.sleepLast.hours % 1) * 60) + 'm',
        'avg 7h 32m · 7d', d.sleepSeries, 'span-3', { stroke: '#9EB6D1', area: true, id: 's' })}
      ${kpiCard('HRV',    '52 <span class="unit">ms</span>', '+4 · 7d', d.hrvSeries, 'span-3',
        { stroke: '#7AB58A', area: true, id: 'h' })}
      ${kpiCard('Resting HR', '55 <span class="unit">bpm</span>', '−2 · 7d', d.restingHRSeries, 'span-3',
        { stroke: '#D5A86A', area: true, id: 'r' })}
    </section>

    <!-- Two-up: Today + AI insight -->
    <section class="grid-12">
      <!-- Today's plan / meals -->
      <div class="card span-7">
        <div class="card-head">
          <div>
            <span class="eyebrow">Today</span>
            <h3 class="card-title">A day in passing.</h3>
          </div>
          <button class="card-action">View all →</button>
        </div>
        <div>
          ${d.meals.slice(0,4).map((m) => `
            <div class="list-row">
              <span class="time">${m.time}</span>
              <div style="flex:1">
                <div class="label">${escapeHtml(m.name)}</div>
                <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.06em;margin-top:3px;text-transform:uppercase">
                  ${m.type} · ${m.kcal} kcal · ${m.p}g P
                </div>
              </div>
              <span class="meta">$${m.cost.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="list-row">
            <span class="time">17:30</span>
            <div style="flex:1">
              <div class="label" style="color:var(--ink-soft)">Easy run · 4 mi <em class="accent" style="font-family:'Instrument Serif',serif;font-style:italic;margin-left:6px">planned</em></div>
              <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.06em;margin-top:3px;text-transform:uppercase">
                ~38 min · est 410 kcal
              </div>
            </div>
            <button class="chip" style="padding:5px 10px">Start</button>
          </div>
        </div>
      </div>

      <!-- AI insight -->
      <div class="card span-5" style="display:flex;flex-direction:column;gap:18px">
        <div class="card-head" style="margin-bottom:0">
          <div>
            <span class="pill-tag"><span class="dot"></span>This week's read</span>
          </div>
          <button class="card-action">Open ↗</button>
        </div>
        <h3 class="serif" style="font-size:26px;line-height:1.15;letter-spacing:-.01em;margin:0">
          You slept <em class="accent">52 minutes more</em> on nights you finished dinner before 8 pm.
        </h3>
        <p style="color:var(--ink-soft);font-size:14px;line-height:1.55;margin:0">
          Mood scores tracked the same way — averaging 4.2 on early-dinner nights vs 3.5 on late ones.
          Worth experimenting with this week.
        </p>
        <hr class="hairline" />
        <div style="display:flex;flex-direction:column;gap:10px">
          ${d.insightThisWeek.correlations.slice(0,3).map((c) => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;gap:12px">
              <span style="color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.l}</span>
              <span class="mono" style="color:${c.dir === 'pos' ? 'var(--pos)' : 'var(--neg)'};flex-shrink:0">${c.v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Workout + supplements -->
    <section class="grid-12">
      <!-- Active workout card -->
      <div class="card span-7">
        <div class="card-head">
          <div>
            <span class="eyebrow">Up next</span>
            <h3 class="card-title">Pull · Day 4 <em class="accent" style="font-family:'Instrument Serif',serif;font-style:italic;font-size:18px;margin-left:6px">Week 6 / 12</em></h3>
          </div>
          <button class="btn btn-primary btn-sm">Start session →</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${d.pullSession.slice(0,6).map((s) => `
            <div class="lift-tile ${s.active ? 'active' : ''} ${s.done === s.sets ? 'done' : ''}">
              <span class="mono" style="font-size:10px;color:${s.active ? 'var(--accent-ink)' : 'var(--muted)'};letter-spacing:.08em">
                ${String(s.n).padStart(2,'0')} · ${s.sets}×${s.reps}
              </span>
              <div style="font-size:14px;font-weight:500;margin-top:4px">${s.name}</div>
              <div class="mono" style="font-size:12px;color:${s.active ? 'var(--accent-ink)' : 'var(--ink-soft)'};margin-top:2px">
                ${s.weight}${typeof s.weight === 'number' ? ' lb' : ''}
              </div>
              <div class="set-dots" style="margin-top:8px">
                ${Array.from({length: s.sets}, (_, i) =>
                  `<i class="${i < s.done ? 'filled' : ''}"></i>`
                ).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Supplements -->
      <div class="card span-5">
        <div class="card-head">
          <div>
            <span class="eyebrow">Supplements</span>
            <h3 class="card-title">Daily stack.</h3>
          </div>
          <span class="mono" style="font-size:11px;color:var(--muted)">${d.supplements.filter((s) => s.taken).length}/${d.supplements.length}</span>
        </div>
        <div>
          ${d.supplements.map((s, i) => `
            <label class="supp-row">
              <input type="checkbox" ${s.taken ? 'checked' : ''} data-supp="${i}" />
              <span class="check"></span>
              <span class="label" style="${s.taken ? 'color:var(--muted);text-decoration:line-through' : ''}">${escapeHtml(s.name)}</span>
              <span class="mono" style="font-size:10.5px;color:var(--muted)">${escapeHtml(s.dose)} · ${s.time}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </section>

  </div>
  <style>
    .ring-stat{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:110px;white-space:nowrap}
    .ring-stat .value{font-family:'Instrument Serif',serif;font-size:22px;line-height:1;letter-spacing:-.01em;margin-top:6px;white-space:nowrap}
    .ring-stat .sub{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap}
    .ring-stat .label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-family:'JetBrains Mono',monospace}

    .kpi-card{padding:20px;display:flex;flex-direction:column;gap:14px}
    .kpi-card .top{display:flex;justify-content:space-between;align-items:baseline}
    .kpi-card .val{font-family:'Instrument Serif',serif;font-size:34px;line-height:1;letter-spacing:-.02em;margin:0}
    .kpi-card .val .unit{font-size:15px;color:var(--muted);margin-left:3px}
    .kpi-card .delta{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted)}
    .kpi-card .delta.pos{color:var(--pos)}
    .kpi-card .delta.neg{color:var(--neg)}

    .lift-tile{
      background:var(--surface-2);
      border-radius:12px;padding:14px;
      transition:background .25s ease, transform .15s ease;
    }
    .lift-tile.active{background:var(--accent);color:var(--accent-ink)}
    .lift-tile.done{opacity:.5}
    .lift-tile .set-dots{display:flex;gap:4px}
    .lift-tile .set-dots i{
      width:8px;height:8px;border-radius:50%;
      background:var(--rule);display:inline-block;
    }
    .lift-tile.active .set-dots i{background:rgba(27,30,34,.25)}
    .lift-tile .set-dots i.filled{background:var(--accent)}
    .lift-tile.active .set-dots i.filled{background:var(--accent-ink)}

    .supp-row{
      display:flex;align-items:center;gap:12px;
      padding:11px 0;border-bottom:.5px solid var(--rule-soft);
      cursor:pointer;
    }
    .supp-row:last-child{border-bottom:0}
    .supp-row input{position:absolute;opacity:0;pointer-events:none}
    .supp-row .check{
      width:18px;height:18px;border-radius:6px;
      border:1px solid var(--rule);
      background:transparent;flex-shrink:0;
      transition:background .15s ease, border-color .15s ease;
      display:flex;align-items:center;justify-content:center;
    }
    .supp-row input:checked + .check{
      background:var(--accent);border-color:var(--accent);
    }
    .supp-row input:checked + .check::after{
      content:"";width:6px;height:10px;border:solid var(--accent-ink);
      border-width:0 1.5px 1.5px 0;transform:rotate(45deg) translateY(-1px);
    }
    .supp-row .label{flex:1;font-size:13.5px;color:var(--ink);transition:color .15s ease}
  </style>
  `;
}

function ringStat(label, value, sub, pctVal) {
  return `
    <div class="ring-stat">
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:88px;height:88px">
        ${ring(pctVal, { size: 88, stroke: 6 })}
        <span class="mono" style="position:absolute;font-size:13px;color:var(--ink);font-weight:500">${pctVal}%</span>
      </div>
      <div class="value">${value}</div>
      <div class="sub">${sub}</div>
      <div class="label">${label}</div>
    </div>
  `;
}

function kpiCard(label, value, delta, series, span, sparkOpts) {
  const deltaClass = delta.includes('+') ? 'pos' : delta.includes('−') ? 'neg' : '';
  return `
    <div class="card kpi-card ${span}">
      <div class="top">
        <span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase">${label}</span>
        <span class="delta ${deltaClass}">${delta}</span>
      </div>
      <div class="val">${value}</div>
      ${spark(series, { w: 220, h: 44, ...sparkOpts })}
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// DIET
// ──────────────────────────────────────────────────────────────

function renderDiet(d) {
  const t = d.today;
  const macros = [
    ['kcal',    t.kcal.used,    t.kcal.goal,    'Calories'],
    ['protein', t.protein.used, t.protein.goal, 'Protein',  'g'],
    ['carbs',   t.carbs.used,   t.carbs.goal,   'Carbs',    'g'],
    ['fat',     t.fat.used,     t.fat.goal,     'Fat',      'g'],
  ];
  const totalCost = d.meals.reduce((s, m) => s + m.cost, 0);

  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">

    <section class="grid-12 rise-stagger">
      ${macros.map(([k, used, goal, label, unit]) => {
        const p = pct(used, goal);
        return `
          <div class="card kpi-card span-3" style="gap:10px">
            <div class="top">
              <span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase">${label}</span>
              <span class="mono" style="font-size:10.5px;color:var(--ink-soft)">${used}${unit||''} / ${goal}${unit||''}</span>
            </div>
            <div class="val">${used}${unit ? `<span class="unit">${unit}</span>` : ''}</div>
            <div class="bar" style="height:4px;background:var(--rule-soft);border-radius:999px;overflow:hidden">
              <i style="display:block;height:100%;width:${p}%;background:var(--accent);border-radius:999px"></i>
            </div>
            <div class="mono" style="font-size:11px;color:var(--muted)">${goal - used > 0 ? (goal - used) + (unit||'') + ' left' : 'goal hit'}</div>
          </div>
        `;
      }).join('')}
    </section>

    <section class="grid-12">
      <div class="card span-8">
        <div class="card-head">
          <div>
            <span class="eyebrow">Today's meals</span>
            <h3 class="card-title">${d.meals.length} entries · <em class="accent">$${totalCost.toFixed(2)}</em></h3>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm">+ Quick add</button>
            <button class="btn btn-primary btn-sm">+ AI log</button>
          </div>
        </div>
        ${d.meals.map((m) => `
          <div class="list-row">
            <span class="time">${m.time}</span>
            <div class="thumb"></div>
            <div style="flex:1">
              <div class="label">${escapeHtml(m.name)}</div>
              <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.06em;margin-top:3px;text-transform:uppercase">
                ${m.type}
              </div>
            </div>
            <div style="text-align:right">
              <div class="mono" style="font-size:13px;color:var(--ink)">${m.kcal} kcal</div>
              <div class="mono" style="font-size:10.5px;color:var(--muted);margin-top:2px">
                P ${m.p} · C ${m.c} · F ${m.f}
              </div>
            </div>
            <div style="text-align:right;min-width:60px">
              <div class="mono" style="font-size:12px;color:var(--ink-soft)">$${m.cost.toFixed(2)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card span-4">
        <div class="card-head" style="margin-bottom:14px">
          <div>
            <span class="eyebrow">Macro split</span>
            <h3 class="card-title">Today.</h3>
          </div>
        </div>
        ${donutChart([
          { l: 'Protein', v: t.protein.used * 4, c: 'var(--accent)' },
          { l: 'Carbs',   v: t.carbs.used * 4,   c: '#9EB6D1' },
          { l: 'Fat',     v: t.fat.used * 9,     c: '#D5A86A' },
        ])}
        <hr class="hairline" style="margin:16px 0" />
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;font-size:12.5px">
            <span style="color:var(--ink-soft)">Daily cost · 7d avg</span>
            <span class="mono" style="color:var(--ink)">$32.40</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px">
            <span style="color:var(--ink-soft)">Avg meals / day</span>
            <span class="mono" style="color:var(--ink)">4.6</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px">
            <span style="color:var(--ink-soft)">Protein goal hit</span>
            <span class="mono" style="color:var(--pos)">5/7 days</span>
          </div>
        </div>
      </div>
    </section>

  </div>
  `;
}

function donutChart(slices) {
  const total = slices.reduce((s, x) => s + x.v, 0);
  const size = 180, stroke = 22, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const segs = slices.map((s) => {
    const len = (s.v / total) * c;
    const seg = `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${s.c}"
      stroke-width="${stroke}" stroke-dasharray="${len} ${c - len}"
      stroke-dashoffset="${-acc}" transform="rotate(-90 ${size/2} ${size/2})"/>`;
    acc += len;
    return seg;
  }).join('');
  return `
    <div style="display:flex;align-items:center;gap:20px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="flex-shrink:0">
        ${segs}
      </svg>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px">
        ${slices.map((s) => `
          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px">
            <i style="width:8px;height:8px;border-radius:2px;background:${s.c}"></i>
            <span style="flex:1;color:var(--ink-soft)">${s.l}</span>
            <span class="mono" style="color:var(--ink)">${Math.round((s.v/total)*100)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// EXERCISE
// ──────────────────────────────────────────────────────────────

function renderExercise(d) {
  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">
    <section class="grid-12 rise-stagger">
      <!-- Week strip -->
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">This week</span>
            <h3 class="card-title">5 of 7 sessions <em class="accent">on plan.</em></h3>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm">Edit plan</button>
            <button class="btn btn-primary btn-sm">+ New workout</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px">
          ${d.workouts.map((w) => `
            <div class="day-tile ${w.done ? 'done' : ''} ${w.active ? 'active' : ''} ${!w.planned ? 'rest' : ''}">
              <span class="mono" style="font-size:10px;color:${w.active ? 'var(--accent-ink)' : 'var(--muted)'};letter-spacing:.12em;text-transform:uppercase">${w.day}</span>
              <div style="font-family:'Instrument Serif',serif;font-size:18px;line-height:1.1;margin-top:8px;letter-spacing:-.005em">${escapeHtml(w.name)}</div>
              <div class="mono" style="font-size:10.5px;color:${w.active ? 'var(--accent-ink)' : 'var(--muted)'};margin-top:8px">
                ${w.minutes ? w.minutes + ' min' : '—'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="grid-12">
      <!-- Active session -->
      <div class="card span-7">
        <div class="card-head">
          <div>
            <span class="eyebrow">Active session</span>
            <h3 class="card-title">Pull · Day 4</h3>
          </div>
          <span class="mono" style="font-size:11px;color:var(--muted)">Week 6 · 21:24 elapsed</span>
        </div>
        ${d.pullSession.map((s) => `
          <div class="set-row ${s.active ? 'active' : ''} ${s.done === s.sets ? 'done' : ''}">
            <span class="mono num">${String(s.n).padStart(2, '0')}</span>
            <div style="flex:1">
              <div class="name">${escapeHtml(s.name)}</div>
              <div class="mono sub">${s.sets} × ${s.reps} · ${s.weight}${typeof s.weight === 'number' ? ' lb' : ''}</div>
            </div>
            <div class="set-pips">
              ${Array.from({length: s.sets}, (_, i) =>
                `<span class="${i < s.done ? 'on' : ''}"></span>`
              ).join('')}
            </div>
            <button class="chip" style="padding:5px 10px">${s.done < s.sets ? 'Log set' : 'Edit'}</button>
          </div>
        `).join('')}
      </div>

      <!-- PRs -->
      <div class="card span-5">
        <div class="card-head">
          <div>
            <span class="eyebrow">Personal records</span>
            <h3 class="card-title">Top lifts.</h3>
          </div>
          <button class="card-action">All →</button>
        </div>
        ${d.prs.map((pr) => `
          <div class="list-row">
            <div style="flex:1">
              <div class="label">${escapeHtml(pr.lift)}</div>
              <div class="mono" style="font-size:10.5px;color:var(--muted);margin-top:3px">${pr.when} · +${pr.up} lb</div>
            </div>
            <div class="mono" style="font-size:22px;font-family:'Instrument Serif',serif;line-height:1;letter-spacing:-.015em">
              ${pr.weight} <span style="font-size:13px;color:var(--muted)">× ${pr.reps}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
  <style>
    .day-tile{
      background:var(--surface-2);border-radius:12px;padding:14px;
      min-height:96px;display:flex;flex-direction:column;
      transition:background .25s ease, transform .15s ease;
      cursor:pointer;
    }
    .day-tile:hover{transform:translateY(-2px)}
    .day-tile.done{opacity:.55}
    .day-tile.active{background:var(--accent);color:var(--accent-ink)}
    .day-tile.rest{background:transparent;border:.5px dashed var(--rule)}

    .set-row{
      display:flex;align-items:center;gap:14px;
      padding:14px 14px;border-radius:12px;
      transition:background .2s ease;
      border-bottom:.5px solid var(--rule-soft);
    }
    .set-row:last-child{border-bottom:0}
    .set-row.active{background:var(--accent-soft)}
    .set-row.done{opacity:.5}
    .set-row .num{font-size:10px;color:var(--accent);letter-spacing:.12em;width:22px}
    .set-row .name{font-size:14.5px;font-weight:500}
    .set-row .sub{font-size:11px;color:var(--muted);margin-top:3px;letter-spacing:.04em;text-transform:uppercase}
    .set-pips{display:flex;gap:3px}
    .set-pips span{width:10px;height:10px;border-radius:3px;background:var(--rule)}
    .set-pips span.on{background:var(--accent)}
  </style>
  `;
}

// ──────────────────────────────────────────────────────────────
// SLEEP
// ──────────────────────────────────────────────────────────────

function renderSleep(d) {
  const t = d.today;
  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">
    <section class="grid-12 rise-stagger">
      <!-- Last night hero -->
      <div class="card span-7">
        <span class="eyebrow">Last night</span>
        <h2 class="serif" style="font-size:54px;line-height:1;letter-spacing:-.02em;margin:14px 0 8px">
          ${t.sleepLast.hours}h ${Math.round((t.sleepLast.hours % 1) * 60)}m <em class="accent" style="font-size:24px;font-family:'Instrument Serif',serif;font-style:italic;margin-left:6px">restful.</em>
        </h2>
        <div class="mono" style="font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">
          ${t.sleepLast.bedtime} → ${t.sleepLast.wake} · quality ${t.sleepLast.quality}/5
        </div>

        <hr class="hairline" style="margin:24px 0"/>

        <div style="display:flex;gap:32px;flex-wrap:wrap">
          <div>
            <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">Deep</div>
            <div class="serif" style="font-size:24px;margin-top:6px">1h 32m</div>
          </div>
          <div>
            <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">REM</div>
            <div class="serif" style="font-size:24px;margin-top:6px">1h 48m</div>
          </div>
          <div>
            <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">Light</div>
            <div class="serif" style="font-size:24px;margin-top:6px">4h 04m</div>
          </div>
          <div>
            <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">Wake</div>
            <div class="serif" style="font-size:24px;margin-top:6px">12m</div>
          </div>
        </div>
      </div>

      <!-- Mood + energy -->
      <div class="card span-5">
        <span class="eyebrow">How you feel</span>
        <h3 class="card-title" style="margin:10px 0 18px">Mood &amp; energy.</h3>

        <div style="margin-bottom:18px">
          <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Mood</div>
          <div class="mood-row">
            ${['Low','Okay','Good','Great','Best'].map((l, i) => `
              <button class="mood-seg ${i === t.mood ? 'on' : ''}">${l}</button>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Energy</div>
          <div class="mood-row">
            ${['Low','Okay','Good','Great','Best'].map((l, i) => `
              <button class="mood-seg ${i === t.energy ? 'on' : ''}">${l}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Week chart -->
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">Last 14 nights</span>
            <h3 class="card-title">Drifting <em class="accent">earlier.</em></h3>
          </div>
          <div style="display:flex;gap:6px">
            <button class="chip">7d</button>
            <button class="chip accent">14d</button>
            <button class="chip">30d</button>
          </div>
        </div>
        ${bars([6.2,7.1,6.8,7.4,7.9,7.6,8.2,7.4,7.2,7.0,7.5,7.8,7.4,7.6], { h: 110, w: 800 })}
      </div>
    </section>
  </div>
  <style>
    .mood-row{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
    .mood-seg{
      appearance:none;border:.5px solid var(--rule-soft);
      background:var(--surface-2);color:var(--ink-soft);
      padding:10px 0;border-radius:8px;
      font-size:11.5px;cursor:pointer;
      transition:background .15s ease, color .15s ease, border-color .15s ease, transform .12s ease;
    }
    .mood-seg:hover{transform:translateY(-1px);border-color:var(--ink-soft)}
    .mood-seg.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
  </style>
  `;
}

// ──────────────────────────────────────────────────────────────
// BIOMETRICS
// ──────────────────────────────────────────────────────────────

function renderBiometrics(d) {
  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">

    <section class="grid-12 rise-stagger">
      ${d.biometrics.map((b) => {
        const deltaStr = b.delta == null ? '' : (b.delta > 0 ? '+' + b.delta : '−' + Math.abs(b.delta));
        const dirClass = b.delta == null ? '' : (b.delta < 0 ? 'pos' : 'neg');
        // for some metrics (HRV) up is good — flip
        const upIsGood = ['hrv','spo2'].includes(b.key);
        const flipped = upIsGood && b.delta != null ? (b.delta > 0 ? 'pos' : 'neg') : dirClass;
        return `
          <div class="card kpi-card span-3" style="gap:10px">
            <div class="top">
              <span class="mono" style="font-size:10px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase">${b.label}</span>
              ${b.delta != null ? `<span class="delta ${flipped}">${deltaStr} ${b.unit}</span>` : ''}
            </div>
            <div class="val">${b.value}${b.unit ? `<span class="unit">${b.unit}</span>` : ''}</div>
            ${spark(b.series.map(Number), { w: 220, h: 40, stroke: 'var(--accent)', area: true, id: 'b' + b.key })}
          </div>
        `;
      }).join('')}
    </section>

    <section class="grid-12">
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">Weight · 90 days</span>
            <h3 class="card-title">Down <em class="accent">2.4 lb</em> from May 1.</h3>
          </div>
          <div style="display:flex;gap:6px">
            <button class="chip">7d</button>
            <button class="chip">30d</button>
            <button class="chip accent">90d</button>
            <button class="chip">1y</button>
            <button class="chip">All</button>
          </div>
        </div>
        <div style="padding:12px 0 0">
          ${multiLine([
            { data: d.biometrics[0].series, color: 'var(--accent)', label: 'Weight' }
          ], { w: 1200, h: 260 })}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          ${['Mar 1','Mar 15','Apr 1','Apr 15','May 1','May 15','Today'].map((l) => `
            <span class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.06em">${l}</span>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="grid-12">
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">Log a reading</span>
            <h3 class="card-title">Add biometric.</h3>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          ${d.biometrics.map((b) => `
            <button class="bio-add">
              <div class="mono" style="font-size:10px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase">${b.label}</div>
              <div class="mono" style="font-size:13px;color:var(--ink-soft);margin-top:6px">+ Add reading</div>
            </button>
          `).join('')}
        </div>
      </div>
    </section>
  </div>
  <style>
    .bio-add{
      appearance:none;border:.5px dashed var(--rule);background:transparent;
      padding:18px 14px;border-radius:12px;text-align:left;cursor:pointer;
      transition:background .15s ease, border-color .15s ease, transform .15s ease;
    }
    .bio-add:hover{background:var(--chip);border-color:var(--ink-soft);border-style:solid;transform:translateY(-1px)}
  </style>
  `;
}

// ──────────────────────────────────────────────────────────────
// SUPPLEMENTS
// ──────────────────────────────────────────────────────────────

function renderSupplements(d) {
  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">
    <section class="grid-12 rise-stagger">
      <div class="card span-8">
        <div class="card-head">
          <div>
            <span class="eyebrow">Daily stack</span>
            <h3 class="card-title">${d.supplements.filter((s) => s.taken).length} of ${d.supplements.length} <em class="accent">done.</em></h3>
          </div>
          <button class="btn btn-primary btn-sm">+ Add supplement</button>
        </div>
        ${d.supplements.map((s, i) => `
          <label class="supp-card">
            <input type="checkbox" ${s.taken ? 'checked' : ''} data-supp-x="${i}" />
            <span class="check"></span>
            <div style="flex:1">
              <div class="name" style="${s.taken ? 'color:var(--muted);text-decoration:line-through' : ''}">${escapeHtml(s.name)}</div>
              <div class="mono" style="font-size:10.5px;color:var(--muted);letter-spacing:.06em;margin-top:3px;text-transform:uppercase">
                ${escapeHtml(s.dose)} · ${s.time}
              </div>
            </div>
            <button class="chip" type="button" onclick="event.preventDefault()">Reorder ↗</button>
          </label>
        `).join('')}
      </div>

      <div class="card span-4">
        <span class="eyebrow">Self care</span>
        <h3 class="card-title" style="margin:10px 0 18px">Routine.</h3>
        ${d.selfCare.map((s, i) => `
          <label class="supp-card">
            <input type="checkbox" ${s.done ? 'checked' : ''} />
            <span class="check"></span>
            <div style="flex:1">
              <div class="name" style="${s.done ? 'color:var(--muted);text-decoration:line-through' : ''}">${escapeHtml(s.name)}</div>
              <div class="mono" style="font-size:10.5px;color:var(--muted);margin-top:3px;letter-spacing:.06em;text-transform:uppercase">${s.time}</div>
            </div>
          </label>
        `).join('')}
      </div>
    </section>
  </div>
  <style>
    .supp-card{
      display:flex;align-items:center;gap:14px;padding:14px 0;
      border-bottom:.5px solid var(--rule-soft);cursor:pointer;
    }
    .supp-card:last-child{border-bottom:0}
    .supp-card input{position:absolute;opacity:0;pointer-events:none}
    .supp-card .check{
      width:20px;height:20px;border-radius:7px;
      border:1px solid var(--rule);background:transparent;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      transition:background .15s ease, border-color .15s ease;
    }
    .supp-card input:checked + .check{background:var(--accent);border-color:var(--accent)}
    .supp-card input:checked + .check::after{
      content:"";width:6px;height:11px;border:solid var(--accent-ink);
      border-width:0 1.5px 1.5px 0;transform:rotate(45deg) translateY(-1px);
    }
    .supp-card .name{font-size:14.5px;color:var(--ink);transition:color .15s ease}
  </style>
  `;
}

// ──────────────────────────────────────────────────────────────
// METRICS — multi-line dashboards
// ──────────────────────────────────────────────────────────────

function renderMetrics(d) {
  const series = [
    { key: 'weight', label: 'Weight (lb)', data: d.biometrics[0].series, color: 'var(--accent)' },
    { key: 'kcal',   label: 'Calories',    data: d.kcalSeries,            color: '#9EB6D1' },
    { key: 'protein',label: 'Protein (g)', data: d.proteinSeries,         color: '#7AB58A' },
    { key: 'sleep',  label: 'Sleep (h)',   data: d.sleepSeries,           color: '#D5A86A' },
    { key: 'hrv',    label: 'HRV (ms)',    data: d.hrvSeries,             color: '#C496B6' },
    { key: 'rhr',    label: 'Resting HR',  data: d.restingHRSeries,       color: '#E07A52' },
  ];

  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">
    <section class="grid-12 rise-stagger">
      ${series.map((s) => `
        <div class="card span-6">
          <div class="card-head" style="margin-bottom:6px">
            <div>
              <span class="eyebrow">${s.label}</span>
              <h3 class="card-title" style="margin-top:6px">
                ${s.data[s.data.length-1]} <em class="accent" style="font-family:'Instrument Serif',serif;font-style:italic;font-size:16px;margin-left:6px">latest</em>
              </h3>
            </div>
            <span class="mono" style="font-size:11px;color:var(--muted)">7d · avg ${
              (s.data.reduce((a,b) => a+b, 0) / s.data.length).toFixed(s.key === 'sleep' ? 1 : 0)
            }</span>
          </div>
          ${spark(s.data, { w: 600, h: 110, stroke: s.color, area: true, id: 'm-'+s.key })}
        </div>
      `).join('')}
    </section>

    <section class="grid-12">
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">Correlations · last 90 days</span>
            <h3 class="card-title">What's moving <em class="accent">together.</em></h3>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          ${d.insightThisWeek.correlations.map((c) => `
            <div style="display:flex;align-items:center;gap:18px;padding:16px 18px;background:var(--surface-2);border-radius:12px">
              <div style="flex:1">
                <div style="font-size:14.5px;color:var(--ink)">${c.l}</div>
                <div class="mono" style="font-size:10.5px;color:var(--muted);margin-top:4px;letter-spacing:.06em;text-transform:uppercase">
                  ${c.dir === 'pos' ? 'positive correlation' : 'negative correlation'}
                </div>
              </div>
              <div class="serif" style="font-size:30px;line-height:1;letter-spacing:-.015em;color:${c.dir === 'pos' ? 'var(--pos)' : 'var(--neg)'}">
                ${c.v}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// AI ASSISTANT
// ──────────────────────────────────────────────────────────────

function renderAI(d) {
  return `
  <div class="page-fade-in" style="display:grid;grid-template-columns:1fr 280px;gap:24px;align-items:stretch;min-height:calc(100vh - 200px)">
    <!-- Chat -->
    <div class="card" style="display:flex;flex-direction:column;padding:0;overflow:hidden">
      <header style="padding:22px 24px;border-bottom:.5px solid var(--rule-soft);display:flex;align-items:center;justify-content:space-between">
        <div>
          <span class="eyebrow">AI assistant</span>
          <h3 class="card-title" style="margin-top:6px">
            Hi <em class="accent">Dallas.</em>
          </h3>
        </div>
        <div style="display:flex;gap:8px">
          <button class="chip">New chat</button>
          <button class="chip">History</button>
        </div>
      </header>

      <div class="chat-stream" id="chat-stream">
        ${d.chat.map((m) => chatBubble(m)).join('')}
      </div>

      <footer style="padding:16px 18px;border-top:.5px solid var(--rule-soft)">
        <div class="chat-input">
          <textarea id="chat-text" placeholder="Log a meal, ask about your trends, or describe how you feel…" rows="1"></textarea>
          <button class="btn btn-primary btn-sm" id="chat-send">Send →</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button class="chip">📝 Daily summary</button>
          <button class="chip">📊 Weekly read</button>
          <button class="chip">🥗 Suggest a dinner</button>
          <button class="chip">💪 Plan tomorrow</button>
        </div>
      </footer>
    </div>

    <!-- Context rail -->
    <aside style="display:flex;flex-direction:column;gap:14px">
      <div class="card" style="padding:18px">
        <span class="eyebrow">Context the AI sees</span>
        <ul style="list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:8px">
          ${[
            'Profile · 32, male, 5\'11"',
            'Conditions · Lactose, High Cholesterol',
            'Goals · 2,200 kcal · 160g P',
            'Last 7 days of logs',
            'Wearable sync · Oura',
          ].map((x) => `
            <li style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-soft)">
              <span style="width:5px;height:5px;background:var(--accent);border-radius:50%"></span>
              ${escapeHtml(x)}
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="card" style="padding:18px">
        <span class="eyebrow">Recent</span>
        <ul style="list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:10px">
          ${[
            { t: 'Today', l: 'Breakfast & run' },
            { t: 'Yesterday', l: 'Weekly summary' },
            { t: 'Sun', l: 'Recipe idea — high protein' },
            { t: 'Sat', l: 'Why am I tired?' },
          ].map((x) => `
            <li style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px;cursor:pointer">
              <span style="color:var(--ink-soft)">${escapeHtml(x.l)}</span>
              <span class="mono" style="font-size:10.5px;color:var(--muted)">${escapeHtml(x.t)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </aside>
  </div>

  <style>
    .chat-stream{
      flex:1;overflow-y:auto;padding:24px;
      display:flex;flex-direction:column;gap:14px;
    }
    .chat-bubble{
      max-width:78%;padding:14px 18px;border-radius:18px;
      font-size:14.5px;line-height:1.55;
      animation:rise-in .35s cubic-bezier(.2,.7,.2,1) both;
    }
    .chat-bubble.user{
      align-self:flex-end;background:var(--accent);color:var(--accent-ink);
      border-bottom-right-radius:4px;
    }
    .chat-bubble.ai{
      align-self:flex-start;background:var(--surface-2);color:var(--ink);
      border:.5px solid var(--rule-soft);
      border-bottom-left-radius:4px;
    }
    .chat-bubble.ai::before{
      content:"AI";display:block;font-family:'JetBrains Mono',monospace;font-size:9px;
      letter-spacing:.14em;color:var(--accent);margin-bottom:6px;
    }
    .chat-input{
      display:flex;align-items:flex-end;gap:8px;
      background:var(--surface-2);border:.5px solid var(--rule-soft);
      border-radius:14px;padding:10px;
      transition:border-color .15s ease;
    }
    .chat-input:focus-within{border-color:var(--accent)}
    .chat-input textarea{
      flex:1;background:transparent;border:0;outline:none;resize:none;
      font:inherit;font-size:14.5px;color:var(--ink);min-height:36px;max-height:160px;
      padding:8px 6px;line-height:1.5;
    }
  </style>
  `;
}

function chatBubble(m) {
  return `<div class="chat-bubble ${m.who}">${escapeHtml(m.text)}</div>`;
}

// ──────────────────────────────────────────────────────────────
// JOURNAL
// ──────────────────────────────────────────────────────────────

function renderJournal(d) {
  return `
  <div class="page-fade-in" style="display:flex;flex-direction:column;gap:24px">
    <section class="grid-12 rise-stagger">
      <div class="card span-8">
        <div class="card-head">
          <div>
            <span class="eyebrow">${d.today.date}</span>
            <h3 class="card-title">Morning entry.</h3>
          </div>
          <span class="mono" style="font-size:11px;color:var(--muted)">Saved · 07:18</span>
        </div>
        <textarea class="journal-area" placeholder="What's on your mind?">${escapeHtml(d.journalToday.morning)}</textarea>
      </div>
      <div class="card span-4">
        <div class="card-head">
          <div>
            <span class="eyebrow">Dream</span>
            <h3 class="card-title">Last night.</h3>
          </div>
        </div>
        <textarea class="journal-area" placeholder="Any dreams to capture?">${escapeHtml(d.journalToday.dream)}</textarea>
      </div>
    </section>

    <section class="grid-12">
      <div class="card span-12">
        <div class="card-head">
          <div>
            <span class="eyebrow">Recent entries</span>
            <h3 class="card-title">History.</h3>
          </div>
        </div>
        ${d.history.map((h) => `
          <div class="list-row" style="align-items:flex-start">
            <span class="time" style="width:120px">${escapeHtml(h.date)}</span>
            <div style="flex:1">
              <div class="label">Mood ${h.mood}/5 · ${h.sleep}h sleep · ${h.kcal} kcal</div>
              <div style="font-size:13px;color:var(--ink-soft);margin-top:4px;line-height:1.5">
                Quick day. Good lift session. Felt energetic after the walk.
              </div>
            </div>
            <button class="chip">Open ↗</button>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
  <style>
    .journal-area{
      width:100%;min-height:240px;
      background:transparent;border:0;outline:none;resize:vertical;
      font-family:'Instrument Serif',serif;font-size:22px;line-height:1.45;
      color:var(--ink);letter-spacing:-.005em;
      padding:8px 0;
    }
    .journal-area::placeholder{color:var(--muted);font-style:italic}
  </style>
  `;
}

// ──────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────

function renderSettings(d) {
  return `
  <div class="page-fade-in" style="display:grid;grid-template-columns:200px 1fr;gap:36px">
    <aside style="position:sticky;top:108px;height:fit-content;display:flex;flex-direction:column;gap:2px">
      ${['Profile','Goals','Features','Appearance','Conditions','Body targets','Devices','Export data','Sign out'].map((s, i) => `
        <button class="settings-link ${i === 0 ? 'active' : ''}">${s}</button>
      `).join('')}
    </aside>
    <main class="rise-stagger" style="display:flex;flex-direction:column;gap:24px">

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Profile</span>
            <h3 class="card-title">About you.</h3>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
          ${textField('Name', d.user.name)}
          ${textField('Email', d.user.email)}
          ${textField('Age', '32')}
          ${textField('Height', '5\'11"')}
          ${textField('Gender', 'Male')}
          ${textField('Timezone', 'America/Chicago')}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Daily goals</span>
            <h3 class="card-title">Targets.</h3>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
          ${textField('Calories', d.user.goals.kcal)}
          ${textField('Protein (g)', d.user.goals.protein)}
          ${textField('Carbs (g)', d.user.goals.carbs)}
          ${textField('Fat (g)', d.user.goals.fat)}
          ${textField('Water (oz)', d.user.goals.water)}
          ${textField('Weight (lb)', d.user.goals.weight)}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Conditions &amp; sensitivities</span>
            <h3 class="card-title">What the AI accounts for.</h3>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${['Diabetes','Hypertension','Celiac','Lactose Intolerance','Nut Allergy','Vegan','Vegetarian','Keto','IBS','Crohn\'s','Thyroid','Heart Disease','GERD','High Cholesterol','Anxiety','Depression','ADHD','PCOS','Osteoporosis','Arthritis','Asthma','Migraines','Sleep Apnea','Low Iron'].map((c) => `
            <button class="chip ${d.user.conditions.includes(c) ? 'accent' : ''}">${c}</button>
          `).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Features</span>
            <h3 class="card-title">Show or hide tabs.</h3>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          ${[
            ['Diet & nutrition', true],
            ['Exercise & PRs', true],
            ['Sleep', true],
            ['Biometrics', true],
            ['Supplements', true],
            ['Self care', true],
            ['Journal', true],
            ['Metrics', true],
            ['Period tracker', false],
            ['Poop tracker', false],
            ['Intimacy tracker', false],
            ['Party favors', false],
          ].map(([l, on]) => `
            <label class="toggle-row">
              <span>${l}</span>
              <span class="toggle ${on ? 'on' : ''}"><i></i></span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <span class="eyebrow">Appearance</span>
            <h3 class="card-title">Theme.</h3>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          ${['System','Light','Dark'].map((m, i) => `
            <button class="chip ${i === 2 ? 'accent' : ''}">${m}</button>
          `).join('')}
        </div>
      </section>

    </main>
  </div>
  <style>
    .settings-link{
      appearance:none;border:0;background:transparent;text-align:left;
      padding:9px 12px;border-radius:8px;cursor:pointer;
      color:var(--ink-soft);font-size:13.5px;font-weight:400;
      transition:background .18s ease, color .18s ease;
    }
    .settings-link:hover{background:var(--chip);color:var(--ink)}
    .settings-link.active{background:var(--surface);color:var(--ink);font-weight:500}
    .toggle-row{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 16px;border-radius:10px;
      background:var(--surface-2);font-size:14px;color:var(--ink);
      cursor:pointer;
      transition:background .15s ease;
    }
    .toggle-row:hover{background:var(--surface-3)}
    .toggle{
      width:36px;height:20px;border-radius:999px;background:var(--rule);
      position:relative;flex-shrink:0;
      transition:background .2s ease;
    }
    .toggle i{
      position:absolute;top:2px;left:2px;
      width:16px;height:16px;border-radius:50%;background:var(--ink);
      transition:transform .25s cubic-bezier(.3,.7,.2,1);
    }
    .toggle.on{background:var(--accent)}
    .toggle.on i{transform:translateX(16px);background:var(--accent-ink)}
  </style>
  `;
}

function textField(label, value) {
  return `
    <div class="field">
      <label>${label}</label>
      <div class="input-wrap">
        <input type="text" value="${escapeHtml(String(value))}" />
      </div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// Registry
// ──────────────────────────────────────────────────────────────

window.TABS = {
  dashboard:   { title: 'Dashboard',      crumb: (d) => d.today.date + ' · ' + d.today.streakDays + '-day streak', render: renderDashboard },
  ai:          { title: 'AI Assistant',   crumb: () => 'Powered by Claude · context-aware',                       render: renderAI },
  diet:        { title: 'Diet',           crumb: (d) => d.today.date + ' · ' + d.meals.length + ' meals',         render: renderDiet },
  exercise:    { title: 'Exercise',       crumb: (d) => d.today.date + ' · week 6 / 12',                          render: renderExercise },
  sleep:       { title: 'Sleep',          crumb: (d) => 'Last 14 nights · avg ' + (d.sleepSeries.reduce((a,b)=>a+b,0)/d.sleepSeries.length).toFixed(1) + 'h', render: renderSleep },
  biometrics:  { title: 'Biometrics',     crumb: () => '8 metrics tracked · last reading today',                  render: renderBiometrics },
  supplements: { title: 'Supplements',    crumb: (d) => d.supplements.length + ' in your stack · ' + d.supplements.filter((s)=>s.taken).length + ' taken today', render: renderSupplements },
  journal:     { title: 'Journal',        crumb: (d) => d.today.date,                                              render: renderJournal },
  metrics:     { title: 'Metrics',        crumb: () => 'Last 7 days · ranges: 7d / 30d / 90d / all',               render: renderMetrics },
  settings:    { title: 'Settings',       crumb: () => 'Profile, goals, features, appearance',                    render: renderSettings },
};
