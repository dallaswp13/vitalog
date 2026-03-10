// metrics.js — Vitalog Metrics Tab
// Stackable charts with Chart.js. Each chart is independently configurable.

const METRIC_OPTIONS = [
  { key: 'calories', label: 'Calories',    color: '#8a9e00', unit: 'kcal' },
  { key: 'protein',  label: 'Protein',     color: '#1a7fd4', unit: 'g'    },
  { key: 'carbs',    label: 'Carbs',       color: '#c07800', unit: 'g'    },
  { key: 'fat',      label: 'Fat',         color: '#8b3fbf', unit: 'g'    },
  { key: 'water',    label: 'Water',       color: '#0076b6', unit: 'oz'   },
  { key: 'cost',     label: 'Food Cost',   color: '#0e8a5a', unit: '$'    },
  { key: 'sleep',    label: 'Sleep',       color: '#c45a00', unit: 'hrs'  },
  { key: 'weight',   label: 'Weight',      color: '#d94f1a', unit: 'lbs'  },
  { key: 'bmi',      label: 'BMI',         color: '#7c3aed', unit: ''     },
  { key: 'mood',     label: 'Mood',        color: '#c084fc', unit: '/5'   },
];

const CHART_TYPES = ['line', 'bar', 'pie'];
const RANGES = [7, 14, 30, 90];

let _charts = []; // array of { id, chartInstance, config }
let _chartIdCounter = 0;

// ── Data fetching ─────────────────────────────────────
function _getDaysBack(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function _getMetricForDay(key, dateKey) {
  if (key === 'calories') {
    const items = getFoods(dateKey);
    const v = items.reduce((a, i) => a + i.cal, 0);
    return v || null;
  }
  if (key === 'protein') {
    const items = getFoods(dateKey);
    const v = items.reduce((a, i) => a + i.p, 0);
    return v || null;
  }
  if (key === 'carbs') {
    const items = getFoods(dateKey);
    const v = items.reduce((a, i) => a + i.c, 0);
    return v || null;
  }
  if (key === 'fat') {
    const items = getFoods(dateKey);
    const v = items.reduce((a, i) => a + i.f, 0);
    return v || null;
  }
  if (key === 'water') {
    const v = getWater(dateKey) * getBottleOz();
    return v || null;
  }
  if (key === 'cost') {
    const items = getFoods(dateKey);
    const v = items.reduce((a, i) => a + (i.cost || 0), 0);
    return v ? parseFloat(v.toFixed(2)) : null;
  }
  if (key === 'sleep') {
    const sl = getSleep(dateKey);
    return sl && sl.mins ? parseFloat((sl.mins / 60).toFixed(1)) : null;
  }
  if (key === 'weight') {
    return getWeight(dateKey) || null;
  }
  if (key === 'bmi') {
    return getBMIForKey(dateKey) ? parseFloat(getBMIForKey(dateKey).toFixed(1)) : null;
  }
  if (key === 'mood') {
    const jd = getJournalData(dateKey);
    return jd.mood || null;
  }
  return null;
}

function _buildDatasets(metricKeys, days) {
  return metricKeys.map(key => {
    const opt = METRIC_OPTIONS.find(m => m.key === key);
    const data = days.map(d => _getMetricForDay(key, d));
    return {
      label: opt.label + (opt.unit ? ` (${opt.unit})` : ''),
      data,
      borderColor: opt.color,
      backgroundColor: opt.color + '33',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: false,
    };
  });
}

function _buildPieData(metricKeys, days) {
  // For pie: sum each metric over the date range, normalized to %
  const totals = metricKeys.map(key => {
    const opt = METRIC_OPTIONS.find(m => m.key === key);
    const sum = days.reduce((acc, d) => {
      const v = _getMetricForDay(key, d);
      return acc + (v || 0);
    }, 0);
    return { label: opt.label, value: sum, color: opt.color };
  });
  const total = totals.reduce((a, t) => a + t.value, 0) || 1;
  return {
    labels: totals.map(t => t.label),
    datasets: [{
      data: totals.map(t => parseFloat((t.value / total * 100).toFixed(1))),
      backgroundColor: totals.map(t => t.color + 'cc'),
      borderColor: totals.map(t => t.color),
      borderWidth: 2,
    }]
  };
}

// ── Chart card builder ────────────────────────────────
function addMetricsChart(savedConfig) {
  const id = ++_chartIdCounter;
  const config = savedConfig || {
    id,
    type: 'line',
    metrics: ['calories'],
    range: 30,
    title: '',
  };
  config.id = id;

  const container = document.getElementById('metrics-charts-container');
  const card = document.createElement('div');
  card.className = 'metrics-card';
  card.id = 'metrics-card-' + id;
  card.innerHTML = _buildCardHTML(config);
  container.appendChild(card);

  _renderChart(config);
  _charts.push({ id, config, chartInstance: null });
}

function _buildCardHTML(config) {
  const typeButtons = CHART_TYPES.map(t =>
    `<button class="chart-type-btn${config.type === t ? ' active' : ''}"
      onclick="updateChartType(${config.id},'${t}')">${_typeIcon(t)} ${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
  ).join('');

  const rangeButtons = RANGES.map(r =>
    `<button class="chart-range-btn${config.range === r ? ' active' : ''}"
      onclick="updateChartRange(${config.id},${r})">${r}d</button>`
  ).join('');

  const metricCheckboxes = METRIC_OPTIONS.map(m =>
    `<label class="metric-check${config.metrics.includes(m.key) ? ' selected' : ''}"
      style="--mc:${m.color}" onclick="toggleChartMetric(${config.id},'${m.key}')">
      <span class="mc-dot"></span>${m.label}
    </label>`
  ).join('');

  return `
    <div class="metrics-card-header">
      <input class="metrics-title-input" type="text" placeholder="Chart title (optional)"
        value="${config.title || ''}"
        onchange="updateChartTitle(${config.id},this.value)">
      <button class="metrics-remove-btn" onclick="removeMetricsChart(${config.id})">✕</button>
    </div>
    <div class="metrics-controls">
      <div class="chart-type-row">${typeButtons}</div>
      <div class="chart-range-row">${rangeButtons}</div>
    </div>
    <div class="metric-picker">${metricCheckboxes}</div>
    <div class="chart-wrap">
      <canvas id="chart-canvas-${config.id}"></canvas>
    </div>
  `;
}

function _typeIcon(t) {
  if (t === 'line') return '📈';
  if (t === 'bar')  return '📊';
  if (t === 'pie')  return '🥧';
  return '';
}

// ── Chart rendering ───────────────────────────────────
function _renderChart(config) {
  const canvas = document.getElementById('chart-canvas-' + config.id);
  if (!canvas) return;

  // Destroy existing instance
  const existing = _charts.find(c => c.id === config.id);
  if (existing && existing.chartInstance) {
    existing.chartInstance.destroy();
    existing.chartInstance = null;
  }

  const days = _getDaysBack(config.range);
  const labels = days.map(d => {
    const dt = new Date(d + 'T12:00:00');
    // Shorter labels for longer ranges
    if (config.range > 30) return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const tickColor = isDark ? '#777' : '#888';
  const tooltipBg = isDark ? '#1a1a1a' : '#fff';
  const tooltipText = isDark ? '#f0f0f0' : '#1a1a1a';

  let chartData, chartOptions;

  if (config.type === 'pie') {
    chartData = _buildPieData(config.metrics, days);
    chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: tickColor, padding: 16, font: { family: 'DM Sans', size: 13 }, boxWidth: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
      }
    };
  } else {
    // Separate high-magnitude metrics (calories ~1500-3000) from small ones
    const HIGH_SCALE_KEYS = ['calories'];
    const activeMetrics = config.metrics;
    const hasHighScale = activeMetrics.some(k => HIGH_SCALE_KEYS.includes(k));
    const hasLowScale  = activeMetrics.some(k => !HIGH_SCALE_KEYS.includes(k));

    const datasets = activeMetrics.map(key => {
      const opt = METRIC_OPTIONS.find(m => m.key === key);
      const isHigh = HIGH_SCALE_KEYS.includes(key);
      const data = days.map(d => _getMetricForDay(key, d));
      const ds = {
        label: opt.label + (opt.unit ? ` (${opt.unit})` : ''),
        data,
        borderColor: opt.color,
        backgroundColor: config.type === 'bar' ? opt.color + 'bb' : opt.color + '18',
        borderWidth: config.type === 'bar' ? 0 : 2.5,
        pointRadius: config.range > 30 ? 0 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: opt.color,
        pointBorderColor: isDark ? '#111' : '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: config.type === 'line',
        borderRadius: config.type === 'bar' ? 6 : 0,
        yAxisID: (hasHighScale && hasLowScale) ? (isHigh ? 'yLeft' : 'yRight') : 'yLeft',
        spanGaps: true,
      };
      return ds;
    });

    chartData = { labels, datasets };

    // Build scales
    const scales = {
      x: {
        ticks: {
          color: tickColor,
          font: { family: 'DM Sans', size: 11 },
          maxRotation: config.range > 14 ? 45 : 0,
          maxTicksLimit: config.range > 60 ? 12 : config.range > 14 ? 15 : config.range,
          autoSkip: true,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
      },
    };

    if (hasHighScale && hasLowScale) {
      // Dual axis
      const highOpt = METRIC_OPTIONS.find(m => m.key === activeMetrics.find(k => HIGH_SCALE_KEYS.includes(k)));
      const lowOpts = activeMetrics.filter(k => !HIGH_SCALE_KEYS.includes(k)).map(k => METRIC_OPTIONS.find(m => m.key === k));
      scales.yLeft = {
        type: 'linear', position: 'left',
        ticks: { color: highOpt?.color || tickColor, font: { family: 'DM Sans', size: 11 }, callback: v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
        title: { display: true, text: highOpt?.label || 'Calories', color: highOpt?.color || tickColor, font: { size: 11, family: 'DM Sans', weight: '600' } },
        beginAtZero: true,
      };
      scales.yRight = {
        type: 'linear', position: 'right',
        ticks: { color: lowOpts[0]?.color || tickColor, font: { family: 'DM Sans', size: 11 } },
        grid: { drawOnChartArea: false },
        border: { display: false },
        title: { display: true, text: lowOpts.map(o=>o?.label).join(' / '), color: lowOpts[0]?.color || tickColor, font: { size: 11, family: 'DM Sans', weight: '600' } },
        beginAtZero: true,
      };
    } else {
      scales.yLeft = {
        type: 'linear', position: 'left',
        ticks: {
          color: tickColor,
          font: { family: 'DM Sans', size: 11 },
          callback: v => v >= 1000 ? (v/1000).toFixed(1)+'k' : v,
        },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
        beginAtZero: true,
      };
    }

    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: tickColor, padding: 16,
            font: { family: 'DM Sans', size: 12 },
            usePointStyle: true, pointStyleWidth: 10,
            boxHeight: 8,
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tickColor,
          borderColor: isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => {
              const val = ctx.parsed.y;
              if (val === null || val === undefined) return null;
              const opt = METRIC_OPTIONS.find(m => (m.label + (m.unit ? ` (${m.unit})` : '')) === ctx.dataset.label);
              return ` ${ctx.dataset.label.split(' (')[0]}: ${val}${opt ? ' '+opt.unit : ''}`;
            }
          }
        }
      },
      scales,
    };
  }

  // Set canvas height for line/bar (not pie)
  if (config.type !== 'pie') {
    canvas.style.height = '340px';
    canvas.parentElement.style.height = '340px';
  } else {
    canvas.style.height = '320px';
    canvas.parentElement.style.height = '320px';
  }

  const instance = new Chart(canvas, { type: config.type === 'pie' ? 'pie' : config.type, data: chartData, options: chartOptions });

  const entry = _charts.find(c => c.id === config.id);
  if (entry) entry.chartInstance = instance;
}

// ── Update handlers ───────────────────────────────────
function _saveMetricsConfig() {
  lsSet('metricsConfig', _charts.map(c => c.config));
}

function updateChartType(id, type) {
  const entry = _charts.find(c => c.id === id);
  if (!entry) return;
  entry.config.type = type;
  const card = document.getElementById('metrics-card-' + id);
  if (card) card.innerHTML = _buildCardHTML(entry.config);
  _renderChart(entry.config);
  _saveMetricsConfig();
}

function updateChartRange(id, range) {
  const entry = _charts.find(c => c.id === id);
  if (!entry) return;
  entry.config.range = range;
  const card = document.getElementById('metrics-card-' + id);
  if (card) card.innerHTML = _buildCardHTML(entry.config);
  _renderChart(entry.config);
  _saveMetricsConfig();
}

function toggleChartMetric(id, key) {
  const entry = _charts.find(c => c.id === id);
  if (!entry) return;
  const idx = entry.config.metrics.indexOf(key);
  if (idx >= 0) {
    if (entry.config.metrics.length === 1) return; // keep at least one
    entry.config.metrics.splice(idx, 1);
  } else {
    entry.config.metrics.push(key);
  }
  const card = document.getElementById('metrics-card-' + id);
  if (card) card.innerHTML = _buildCardHTML(entry.config);
  _renderChart(entry.config);
  _saveMetricsConfig();
}

function updateChartTitle(id, title) {
  const entry = _charts.find(c => c.id === id);
  if (entry) { entry.config.title = title; _saveMetricsConfig(); }
}

function removeMetricsChart(id) {
  const entry = _charts.find(c => c.id === id);
  if (entry && entry.chartInstance) entry.chartInstance.destroy();
  _charts = _charts.filter(c => c.id !== id);
  document.getElementById('metrics-card-' + id)?.remove();
  _saveMetricsConfig();
}

// ── Tab renderer ──────────────────────────────────────
function renderMetrics() {
  if (_charts.length === 0) {
    // Load saved config from Supabase/cache
    const saved = lsGetSync('metricsConfig');
    if (saved && Array.isArray(saved) && saved.length > 0) {
      saved.forEach(cfg => addMetricsChart(cfg));
    } else {
      // First time: add a sensible default
      addMetricsChart({ type: 'line', metrics: ['calories', 'protein'], range: 30, title: 'Nutrition Overview' });
    }
  } else {
    _charts.forEach(c => _renderChart(c.config));
  }
}
