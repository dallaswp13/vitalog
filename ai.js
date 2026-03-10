// ai.js — Vitalog AI Features
// Requires: sync.js (data helpers), app.js globals (WORKOUT_PLAN, EX_DAYS, dateKey, showToast, etc.)

// ── Core API caller ───────────────────────────────────
async function callAI(system, userMessage, maxTokens = 1024, imageDataUrl = null) {
  let messageContent;
  if (imageDataUrl) {
    const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mediaType = matches[1];
      const base64Data = matches[2];
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } }
      ];
      if (userMessage) messageContent.push({ type: 'text', text: userMessage });
    } else {
      messageContent = userMessage;
    }
  } else {
    messageContent = userMessage;
  }
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: messageContent }],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

function parseJSON(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch { return null; } }
    return null;
  }
}

// ════════════════════════════════════════
// FEATURE 1: MACRO ESTIMATOR
// ════════════════════════════════════════

async function estimateMacros() {
  const nameEl = document.getElementById('f-name');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { showToast('Enter a food name first'); if (nameEl) nameEl.focus(); return; }

  const btn = document.getElementById('estimate-btn');
  if (btn) { btn.disabled = true; btn.textContent = '✦ Estimating...'; }

  try {
    const system = `You are a nutrition expert. Return ONLY a JSON object with estimated nutritional values per typical single serving. No explanation, no markdown, just raw JSON.
Format: {"cal": number, "p": number, "c": number, "f": number, "cost": number}
cal=calories(kcal), p=protein(g), c=carbs(g), f=fat(g), cost=typical US price USD for one serving.
Round cal/p/c/f to nearest integer. Cost to 2 decimal places.`;

    const text = await callAI(system, `Estimate macros for one serving of: "${name}"`);
    const data = parseJSON(text);
    if (!data || typeof data.cal !== 'number') throw new Error('Could not parse nutrition data');

    document.getElementById('f-cal').value  = data.cal  || '';
    document.getElementById('f-prot').value = data.p    || '';
    document.getElementById('f-carb').value = data.c    || '';
    document.getElementById('f-fat').value  = data.f    || '';
    if (data.cost) document.getElementById('f-cost').value = data.cost.toFixed(2);

    const badge = document.getElementById('estimate-badge');
    if (badge) { badge.textContent = '✦ AI estimate — review before saving'; badge.style.display = 'block'; }
    showToast('✦ Macros estimated — review and adjust!');
  } catch (err) {
    console.error('Estimate error:', err);
    showToast('Could not estimate — try a more specific description');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ Estimate'; }
  }
}

// ════════════════════════════════════════
// FEATURE 2: WEEKLY SUMMARY
// ════════════════════════════════════════

function getWeeklySummaryKey(date) {
  const d = date || new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const wk = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `weekly_summary:${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function getPastWeekKeys() {
  const keys = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    keys.push(d.toISOString().split('T')[0]);
  }
  return keys;
}

async function generateWeeklySummary(forceRegenerate = false) {
  const summaryKey = getWeeklySummaryKey();
  const existing = lsGetSync(summaryKey);
  if (existing && !forceRegenerate) return existing;

  const days = getPastWeekKeys();
  const s = getSettings();

  const dayData = days.map(k => {
    const foods = getFoods(k);
    const cal   = foods.reduce((a, f) => a + f.cal, 0);
    const prot  = foods.reduce((a, f) => a + f.p,   0);
    const water = getWater(k) * getBottleOz();
    const weight = getWeight(k);
    const sleep  = getSleep(k);
    const jd     = getJournalData(k);
    const dt  = new Date(k + 'T12:00:00');
    const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
    const dayName = EX_DAYS[dow];
    const jan4 = new Date(dt.getFullYear(), 0, 4);
    const wkNum = Math.ceil(((dt - jan4) / 86400000 + jan4.getDay() + 1) / 7);
    const wkKey = `${dt.getFullYear()}-W${String(wkNum).padStart(2,'0')}`;
    const exChecked = getExChecked(wkKey);
    const plan = WORKOUT_PLAN[dayName];
    const exTotal = plan && !plan.rest ? plan.tasks.length : 0;
    const exDone  = plan && !plan.rest ? plan.tasks.filter((_, i) => exChecked[dayName + '__' + i]).length : 0;
    return { date: k, dayName, cal: cal||null, prot: prot||null, water: water||null,
      weight: weight||null, sleepHrs: sleep&&sleep.mins ? +(sleep.mins/60).toFixed(1) : null,
      sleepQuality: sleep ? sleep.quality : null, mood: jd.mood||null, exDone, exTotal };
  });

  const userName = s.name ? s.name : null;
  const profile = `${userName ? 'Name: '+userName+', ' : ''}Gender: ${s.gender||'unspecified'}, Age: ${s.age||'unknown'}, Height: ${s.heightFt||'?'}ft ${s.heightIn||'?'}in. Goals: ${s.calGoal||'none'} cal/day, ${s.protGoal||'none'}g protein.`;
  const system = `You are a supportive personal health coach writing a weekly summary for Vitalog.
Be warm, specific, motivating. Reference actual numbers. Keep to 4-5 paragraphs.
${userName ? 'Address the user by their first name ('+userName+') naturally throughout.' : ''}
Use plain text section headers (no markdown bold/bullets). Write conversational prose.
Sections: "This Week" / "Highlights" / "Areas to Watch" / "Looking Ahead"`;
  const prompt = `${profile}\n\nPast 7 days:\n${JSON.stringify(dayData, null, 2)}\n\nWrite a personalized weekly health summary.`;

  try {
    const summary = await callAI(system, prompt, 800);
    const result = { text: summary, generatedAt: new Date().toISOString() };
    lsSet(summaryKey, result);
    return result;
  } catch (err) { console.error('Weekly summary error:', err); return null; }
}

async function checkAndShowWeeklySummary() {
  const today = new Date();
  if (today.getDay() !== 1) return;
  const shownKey = `summary_shown_${getWeeklySummaryKey()}`;
  if (lsGetSync(shownKey)) return;
  lsSet(shownKey, true);
  setTimeout(() => showWeeklySummaryModal(false), 2000);
}

async function showWeeklySummaryModal(forceRegenerate = false) {
  let modal = document.getElementById('weekly-summary-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'weekly-summary-modal';
    modal.className = 'ai-modal-overlay';
    modal.innerHTML = `
      <div class="ai-modal">
        <div class="ai-modal-header">
          <div class="ai-modal-title">✦ Weekly Summary</div>
          <button class="ai-modal-close" onclick="closeWeeklySummary()">✕</button>
        </div>
        <div class="ai-modal-body" id="weekly-summary-body"></div>
        <div class="ai-modal-footer">
          <span class="ai-badge">✦ AI Generated</span>
          <button class="ai-regenerate-btn" onclick="showWeeklySummaryModal(true)">↺ Regenerate</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.classList.add('open');
  document.getElementById('weekly-summary-body').innerHTML =
    '<div class="ai-loading"><div class="ai-spinner"></div><span>Generating your summary…</span></div>';
  const result = await generateWeeklySummary(forceRegenerate);
  if (result && result.text) {
    const genDate = new Date(result.generatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    document.getElementById('weekly-summary-body').innerHTML =
      `<div class="ai-summary-meta">Week of ${getPastWeekKeys()[6]} — Generated ${genDate}</div>` +
      `<div class="ai-summary-text"><p>${result.text.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>')}</p></div>`;
  } else {
    document.getElementById('weekly-summary-body').innerHTML =
      '<div class="ai-error">Could not generate summary. Make sure you have data logged this week and try again.</div>';
  }
}

function closeWeeklySummary() {
  document.getElementById('weekly-summary-modal')?.classList.remove('open');
}

// ════════════════════════════════════════
// FEATURE 3: AI GOAL PLANNER
// ════════════════════════════════════════

async function runGoalPlanner() {
  const targetWeight = parseFloat(document.getElementById('gp-target-weight').value);
  const targetDate   = document.getElementById('gp-target-date').value;
  const notes        = (document.getElementById('gp-notes').value || '').trim();
  if (!targetWeight || !targetDate) { showToast('Enter a target weight and date'); return; }

  const btn = document.getElementById('gp-btn');
  if (btn) { btn.disabled = true; btn.textContent = '✦ Generating Plan…'; }

  const s = getSettings();
  const recent = getMostRecentWeight();
  const currentWeight = recent ? recent.weight : null;
  if (!currentWeight) {
    showToast('Log your current weight first on the Exercise tab');
    if (btn) { btn.disabled = false; btn.textContent = '✦ Generate My Plan'; }
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const daysUntil = Math.round((new Date(targetDate) - new Date(today)) / 86400000);
  if (daysUntil < 7) {
    showToast('Choose a target date at least 1 week away');
    if (btn) { btn.disabled = false; btn.textContent = '✦ Generate My Plan'; }
    return;
  }

  const system = `You are an expert personal trainer and nutritionist.
Return ONLY valid JSON. No markdown, no explanation.
Format: {"summary":"string","dailyCalories":number,"proteinG":number,"carbsG":number,"fatG":number,"weeklyWeightChange":number,"workoutIntensity":"light|moderate|intense","workoutNotes":"string","tips":["string"]}`;
  const prompt = `Profile: ${s.gender||'unspecified'}, age ${s.age||'?'}, ${s.heightFt||'?'}ft ${s.heightIn||'?'}in.
Current: ${currentWeight} lbs. Target: ${targetWeight} lbs by ${targetDate} (${daysUntil} days). Notes: ${notes||'none'}.
Create a safe, sustainable plan. Cap weight change at 2 lbs/week.`;

  try {
    const text = await callAI(system, prompt, 600);
    const plan = parseJSON(text);
    if (!plan || !plan.dailyCalories) throw new Error('Invalid plan');
    renderGoalPlanResults(plan, targetWeight, targetDate, daysUntil, currentWeight);
  } catch (err) {
    console.error('Goal planner error:', err);
    showToast('Could not generate plan — please try again');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✦ Generate My Plan'; }
  }
}

function renderGoalPlanResults(plan, targetWeight, targetDate, daysUntil, currentWeight) {
  const el = document.getElementById('gp-results');
  if (!el) return;
  const ic = { light: 'var(--cost)', moderate: 'var(--carbs)', intense: 'var(--accent2)' };
  el.innerHTML = `<div class="gp-result-card">
    <div class="gp-result-header">✦ Your Personalized Plan</div>
    <div class="gp-summary-text">${plan.summary}</div>
    <div class="gp-stats-grid">
      <div class="gp-stat"><div class="gp-stat-label">Daily Cal</div><div class="gp-stat-val" style="color:var(--accent)">${plan.dailyCalories}</div></div>
      <div class="gp-stat"><div class="gp-stat-label">Protein</div><div class="gp-stat-val" style="color:var(--protein)">${plan.proteinG}g</div></div>
      <div class="gp-stat"><div class="gp-stat-label">Carbs</div><div class="gp-stat-val" style="color:var(--carbs)">${plan.carbsG}g</div></div>
      <div class="gp-stat"><div class="gp-stat-label">Fat</div><div class="gp-stat-val" style="color:var(--fat)">${plan.fatG}g</div></div>
      <div class="gp-stat"><div class="gp-stat-label">Wk Change</div><div class="gp-stat-val" style="color:var(--accent2)">${plan.weeklyWeightChange>0?'+':''}${plan.weeklyWeightChange} lbs</div></div>
      <div class="gp-stat"><div class="gp-stat-label">Intensity</div><div class="gp-stat-val" style="color:${ic[plan.workoutIntensity]||'var(--accent)'}">${plan.workoutIntensity}</div></div>
    </div>
    <div class="gp-workout-notes">${plan.workoutNotes}</div>
    ${plan.tips&&plan.tips.length?`<div class="gp-tips-label">Key Tips</div><div class="gp-tips">${plan.tips.map(t=>`<div class="gp-tip">→ ${t}</div>`).join('')}</div>`:''}
    <button class="settings-save-btn ai-gp-btn" style="margin-top:16px" onclick="applyGoalPlan(${plan.dailyCalories},${plan.proteinG},${plan.carbsG},${plan.fatG})">Apply This Plan to My Goals</button>
  </div>`;
  el.style.display = 'block';
}

function applyGoalPlan(cal, prot, carbs, fat) {
  const s = getSettings();
  s.calGoal=cal; s.protGoal=prot; s.carbGoal=carbs; s.fatGoal=fat;
  lsSet('settings', s);
  ['set-cal-goal','set-prot-goal','set-carb-goal','set-fat-goal'].forEach((id,i)=>{
    const el=document.getElementById(id); if(el) el.value=[cal,prot,carbs,fat][i];
  });
  showToast('✓ Plan applied to your daily goals!');
  renderDiet();
}

// ════════════════════════════════════════
// FEATURE 4: AI CHAT BUBBLE
// ════════════════════════════════════════

function initChatBubble() {
  if (document.getElementById('ai-chat-bubble')) return;

  const bubble = document.createElement('div');
  bubble.id = 'ai-chat-bubble';
  bubble.innerHTML = '✦';
  bubble.title = 'AI Assistant — log data naturally';
  bubble.onclick = toggleChat;
  document.body.appendChild(bubble);

  const panel = document.createElement('div');
  panel.id = 'ai-chat-panel';
  panel.innerHTML = `
    <div class="acp-header">
      <div class="acp-title">
        <span class="ai-badge-pill" style="font-size:10px;padding:3px 8px">✦ AI</span>
        <span>Vitalog Assistant</span>
      </div>
      <button class="ai-modal-close" onclick="toggleChat()">✕</button>
    </div>
    <div class="acp-body" id="acp-body">
      <div class="acp-welcome">
        <div class="acp-welcome-icon">✦</div>
        <div class="acp-welcome-title">Log anything naturally</div>
        <div class="acp-welcome-text">Type your day in plain English and I'll save everything automatically.</div>
        <div class="acp-example" onclick="fillChatExample()">Tap to try an example →</div>
      </div>
    </div>
    <div class="acp-footer">
      <textarea class="acp-input" id="acp-input" placeholder="Describe meals, sleep, weight, workouts… (Ctrl+Enter to send)" rows="3"></textarea>
      <button class="acp-send" id="acp-send" onclick="sendChatMessage()">Send</button>
    </div>`;
  document.body.appendChild(panel);

  document.getElementById('acp-input').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendChatMessage();
  });
}

function toggleChat() {
  const panel = document.getElementById('ai-chat-panel');
  const bubble = document.getElementById('ai-chat-bubble');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (bubble) bubble.classList.toggle('active', isOpen);
  if (isOpen) setTimeout(() => document.getElementById('acp-input')?.focus(), 150);
}

function fillChatExample() {
  const input = document.getElementById('acp-input');
  if (input) {
    input.value = "10pm-7am okay sleep\nbanana & 3 eggs for breakfast\n200 lbs\nran 3 miles, 200 pushups\nfeeling great today";
    input.focus();
  }
}

// ── AI Attitude system prompt suffix ─────────────────
function _attitudeSuffix() {
  const s = getSettings ? getSettings() : {};
  const att = s.aiAttitude || 'supportive';
  const map = {
    supportive: 'Your tone is warm, encouraging, and supportive. Celebrate wins, be gentle about misses.',
    harsh:      'You are a no-nonsense drill sergeant. Call out laziness, zero tolerance for excuses, tough love only.',
    funny:      'You are hilarious. Roast the user playfully, use sarcasm and jokes while still being helpful.',
    plain:      'Be direct and factual. No fluff, no emotion, just data and brief observations.',
    zen:        'Speak calmly and mindfully. Frame health as a journey, use serene and peaceful language.',
  };
  return map[att] || map.supportive;
}

// ── Context snapshot for AI ───────────────────────────
function _buildContextSnapshot() {
  const today = new Date().toISOString().split('T')[0];
  const suppList = (getSupplementList ? getSupplementList() : null) || DEFAULT_SUPPLEMENTS;
  const suppLog  = getSupplementLog ? getSupplementLog(today) : {};
  const scList   = (getSelfCareList ? getSelfCareList() : null) || DEFAULT_SELFCARE;
  const scLog    = getSelfCareLog ? getSelfCareLog(today) : {};
  const cleanList = (getCleaningList ? getCleaningList() : null) || DEFAULT_CLEANING;
  const cleanLog  = getCleaningLog ? getCleaningLog(today) : {};
  const s = getSettings ? getSettings() : {};
  const partyEnabled = !!s.partyEnabled;
  const partyList = partyEnabled ? ((getPartyList ? getPartyList() : null) || []) : [];

  const suppSummary = suppList.map(sv => `${sv.name}${sv.dose?' ('+sv.dose+')':''}: ${suppLog[sv.id]?'taken':'not taken'}`).join(', ');
  const scSummary   = scList.map(c  => `${c.name}: ${scLog[c.id]?'done':'pending'}`).join(', ');
  const cleanSummary = cleanList.map(cl => `${cl.name}${cl.freq?' ('+cl.freq+')':''}: ${cleanLog[cl.id]?'done':'pending'}`).join(', ');
  const partySummary = partyEnabled && partyList.length ? partyList.map(p => p.name+(p.dose?' ('+p.dose+')':'')).join(', ') : '';

  // Health conditions
  const conditionAvoid = typeof getConditionAvoidList === 'function' ? getConditionAvoidList() : '';

  return `
USER'S CURRENT LISTS (today: ${today}):
- Supplements: ${suppSummary || 'none'}
- Self Care: ${scSummary || 'none'}
- Home Cleaning: ${cleanSummary || 'none'}
${partySummary ? '- Party Favors tracking: '+partySummary : ''}
${conditionAvoid ? `
HEALTH CONDITIONS & SENSITIVITIES (CRITICAL — strictly avoid these in all food/product suggestions):
${conditionAvoid}
` : ''}`;
}

async function sendChatMessage() {
  const input = document.getElementById('acp-input');
  const userText = input ? input.value.trim() : '';
  if (!userText) return;

  input.value = '';
  input.disabled = true;
  const sendBtn = document.getElementById('acp-send');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '…'; }

  appendChatMessage(userText, true);
  const thinkingId = appendChatThinking();

  const today = new Date().toISOString().split('T')[0];
  const contextSnap = _buildContextSnapshot();

  const system = `You are a health data assistant for Vitalog. Extract health data from natural language and return ONLY raw JSON.
${_attitudeSuffix()}

Today is ${today}.
${contextSnap}

JSON format (omit keys you cannot determine):
{
  "date": "YYYY-MM-DD",
  "foods": [{ "name": "string", "meal": "Breakfast|Lunch|Dinner|Snacks", "cal": number, "p": number, "c": number, "f": number, "cost": number }],
  "water_bottles": number,
  "weight_lbs": number,
  "sleep": { "bed": "HH:MM", "wake": "HH:MM", "quality": 1 },
  "exercise": [{ "name": "string", "detail": "string" }],
  "mood": 1,
  "journal": "string",
  "mark_supplements": ["supplement name or id"],
  "mark_selfcare": ["item name or id"],
  "mark_cleaning": ["task name or id"],
  "add_supplement": { "name": "string", "dose": "string", "url": "string" },
  "add_selfcare": { "name": "string", "time": "string", "url": "string" },
  "add_cleaning": { "name": "string", "freq": "string" }
}

Rules:
- Estimate macros for any food mentioned.
- Sleep quality 1-5, mood 1-5. Water in ~24oz bottle equivalents.
- journal: one sentence summary.
- If user says they took/did a supplement or self care item, add its name to mark_supplements/mark_selfcare/mark_cleaning.
- If user pastes a URL (amazon, iherb, any shop link) and mentions a product/supplement/item, use add_supplement or add_selfcare with the url field set.
- If user says "add X to my supplements/self care/cleaning", populate the appropriate add_ field.
- Return raw JSON only.`;

  try {
    const text = await callAI(system, userText, 1400);
    console.log('AI raw:', text);
    const parsed = parseJSON(text);
    removeChatThinking(thinkingId);
    if (!parsed) {
      appendChatMessage("I couldn't parse that. Try describing meals, sleep, weight, workouts, or what supplements you took.", false);
    } else {
      const saved = await saveParsedData(parsed);
      appendChatMessage(buildConfirmationMessage(parsed, saved), false);
    }
  } catch (err) {
    console.error('Chat error:', err);
    removeChatThinking(thinkingId);
    appendChatMessage(`Something went wrong: ${err.message}`, false);
  } finally {
    if (input) input.disabled = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send'; }
    if (input) input.focus();
  }
}

async function saveParsedData(parsed) {
  const saved = [];
  const k = parsed.date || new Date().toISOString().split('T')[0];

  if (parsed.foods && parsed.foods.length > 0) {
    const existing = getFoods(k);
    const newFoods = parsed.foods.map(f => ({
      name: f.name || 'Unknown', meal: f.meal || 'Snacks',
      cal: Math.round(f.cal||0), p: Math.round(f.p||0),
      c: Math.round(f.c||0), f: Math.round(f.f||0),
      cost: parseFloat((f.cost||0).toFixed(2)),
    }));
    setFoods(k, [...existing, ...newFoods]);
    saved.push(`${newFoods.length} food item${newFoods.length>1?'s':''}`);
  }

  if (parsed.water_bottles && parsed.water_bottles > 0) {
    setWater(k, Math.round(parsed.water_bottles));
    saved.push('water intake');
  }

  if (parsed.weight_lbs && parsed.weight_lbs > 50) {
    setWeight(k, parseFloat(parsed.weight_lbs));
    saved.push('weight');
  }

  if (parsed.sleep && (parsed.sleep.bed || parsed.sleep.wake || parsed.sleep.quality)) {
    const sl = parsed.sleep;
    let mins = 0;
    if (sl.bed && sl.wake) {
      const [bh,bm]=sl.bed.split(':').map(Number);
      const [wh,wm]=sl.wake.split(':').map(Number);
      let bedMins=bh*60+bm, wakeMins=wh*60+wm;
      if(wakeMins<=bedMins) wakeMins+=24*60;
      mins=wakeMins-bedMins;
    }
    setSleep(k, { bed:sl.bed||'', wake:sl.wake||'', mins, quality:sl.quality||3 });
    saved.push('sleep');
  }

  if (parsed.mood || parsed.journal || (parsed.exercise && parsed.exercise.length)) {
    const existing = getJournalData(k);
    let journalText = existing.text || '';
    if (parsed.exercise && parsed.exercise.length > 0) {
      const exLine = parsed.exercise.map(e=>`${e.name}${e.detail?' ('+e.detail+')':''}`).join(', ');
      journalText = journalText ? `${journalText}\nExercise: ${exLine}` : `Exercise: ${exLine}`;
    }
    if (parsed.journal) {
      journalText = journalText ? `${journalText}\n${parsed.journal}` : parsed.journal;
    }
    setJournalData(k, { text:journalText, mood:parsed.mood||existing.mood||0 });
    if (parsed.mood) saved.push('mood');
    if (parsed.journal||(parsed.exercise&&parsed.exercise.length)) saved.push('journal');
  }

  // Mark supplements as taken
  if (parsed.mark_supplements && parsed.mark_supplements.length > 0) {
    const list = (getSupplementList()||DEFAULT_SUPPLEMENTS);
    const log = getSupplementLog(k);
    let markedCount = 0;
    parsed.mark_supplements.forEach(name => {
      const item = list.find(s => s.id===name || s.name.toLowerCase()===name.toLowerCase() || s.name.toLowerCase().includes(name.toLowerCase()));
      if (item) { log[item.id]=true; markedCount++; }
    });
    if (markedCount > 0) { setSupplementLog(k, log); saved.push(`${markedCount} supplement${markedCount>1?'s':''} marked`); }
  }

  // Mark self care as done
  if (parsed.mark_selfcare && parsed.mark_selfcare.length > 0) {
    const list = (getSelfCareList()||DEFAULT_SELFCARE);
    const log = getSelfCareLog(k);
    let markedCount = 0;
    parsed.mark_selfcare.forEach(name => {
      const item = list.find(c => c.id===name || c.name.toLowerCase()===name.toLowerCase() || c.name.toLowerCase().includes(name.toLowerCase()));
      if (item) { log[item.id]=true; markedCount++; }
    });
    if (markedCount > 0) { setSelfCareLog(k, log); saved.push(`${markedCount} self care item${markedCount>1?'s':''} marked`); }
  }

  // Mark cleaning tasks as done
  if (parsed.mark_cleaning && parsed.mark_cleaning.length > 0) {
    const list = (getCleaningList()||DEFAULT_CLEANING);
    const log = getCleaningLog(k);
    let markedCount = 0;
    parsed.mark_cleaning.forEach(name => {
      const item = list.find(cl => cl.id===name || cl.name.toLowerCase()===name.toLowerCase() || cl.name.toLowerCase().includes(name.toLowerCase()));
      if (item) { log[item.id]=true; markedCount++; }
    });
    if (markedCount > 0) { setCleaningLog(k, log); saved.push(`${markedCount} cleaning task${markedCount>1?'s':''} marked`); }
  }

  // Add new supplement from URL or request
  if (parsed.add_supplement && parsed.add_supplement.name) {
    const list = (getSupplementList()||DEFAULT_SUPPLEMENTS.slice());
    const newItem = { id:'s'+Date.now(), name:parsed.add_supplement.name, dose:parsed.add_supplement.dose||'', url:parsed.add_supplement.url||'' };
    list.push(newItem);
    saveSupplementList(list);
    saved.push(`"${newItem.name}" added to supplements`);
  }

  // Add new self care item from URL or request
  if (parsed.add_selfcare && parsed.add_selfcare.name) {
    const list = (getSelfCareList()||DEFAULT_SELFCARE.slice());
    const newItem = { id:'c'+Date.now(), name:parsed.add_selfcare.name, time:parsed.add_selfcare.time||'', url:parsed.add_selfcare.url||'' };
    list.push(newItem);
    saveSelfCareList(list);
    saved.push(`"${newItem.name}" added to self care`);
  }

  // Add new cleaning task from request
  if (parsed.add_cleaning && parsed.add_cleaning.name) {
    const list = (getCleaningList()||DEFAULT_CLEANING.slice());
    const newItem = { id:'cl'+Date.now(), name:parsed.add_cleaning.name, freq:parsed.add_cleaning.freq||'' };
    list.push(newItem);
    saveCleaningList(list);
    saved.push(`"${newItem.name}" added to cleaning`);
  }

  // Refresh active tab
  const activePanel = document.querySelector('.panel.active');
  if (activePanel) {
    const id = activePanel.id;
    if (id==='panel-diet')        renderDiet();
    if (id==='panel-exercise')    renderExercise();
    if (id==='panel-journal')     renderJournal();
    if (id==='panel-calendar')    renderCalendar();
    if (id==='panel-supplements') renderSupplements();
    if (id==='panel-selfcare')    renderSelfCare();
    if (id==='panel-cleaning')    renderCleaning();
    if (id==='panel-dashboard')   renderDashboard();
  }

  return saved;
}

function buildConfirmationMessage(parsed, saved) {
  if (!saved || saved.length === 0) {
    return "I received your message but couldn't find any health data to save. Try mentioning meals, sleep times, weight, or workouts.";
  }
  let msg = `✓ Saved your **${saved.join(', ')}**`;
  if (parsed.date && parsed.date !== new Date().toISOString().split('T')[0]) msg += ` for ${parsed.date}`;
  msg += '.\n\n';
  if (parsed.foods && parsed.foods.length) {
    const totalCal = parsed.foods.reduce((a,f) => a+(f.cal||0), 0);
    msg += `🍽 ${parsed.foods.map(f=>f.name).join(', ')} — ~${totalCal} kcal total\n`;
  }
  if (parsed.weight_lbs)  msg += `⚖️ Weight: ${parsed.weight_lbs} lbs\n`;
  if (parsed.sleep && parsed.sleep.bed && parsed.sleep.wake)
    msg += `😴 Sleep: ${parsed.sleep.bed} → ${parsed.sleep.wake}\n`;
  if (parsed.exercise && parsed.exercise.length)
    msg += `🏋 ${parsed.exercise.map(e=>e.name).join(', ')}\n`;
  if (parsed.mood) {
    const ml = ['','Rough','Low','Okay','Good','Great'];
    msg += `😊 Mood: ${ml[parsed.mood]} (${parsed.mood}/5)\n`;
  }
  return msg.trim();
}

function appendChatMessage(text, isUser) {
  const body = document.getElementById('acp-body');
  if (!body) return;
  const welcome = body.querySelector('.acp-welcome');
  if (welcome) welcome.remove();
  const div = document.createElement('div');
  div.className = `acp-msg ${isUser ? 'acp-msg-user' : 'acp-msg-ai'}`;
  div.innerHTML = text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function appendChatThinking() {
  const id = 'thinking-' + Date.now();
  const body = document.getElementById('acp-body');
  if (!body) return id;
  const div = document.createElement('div');
  div.id = id;
  div.className = 'acp-msg acp-msg-ai acp-thinking';
  div.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return id;
}

function removeChatThinking(id) {
  document.getElementById(id)?.remove();
}

// ════════════════════════════════════════
// PRODUCT INGREDIENT CHECK (Learn tab)
// ════════════════════════════════════════
async function checkProductIngredients() {
  const urlEl = document.getElementById('learn-product-url');
  const resultEl = document.getElementById('learn-product-result');
  if (!urlEl || !resultEl) return;
  const url = urlEl.value.trim();
  if (!url) { showToast('Paste a product URL first'); return; }
  try { new URL(url); } catch { showToast('Please enter a valid URL'); return; }

  resultEl.style.display = 'block';
  resultEl.innerHTML = `<div class="learn-product-result"><div style="display:flex;align-items:center;gap:10px;padding:12px 0"><div class="ai-tab-thinking"><span></span><span></span><span></span></div><span style="color:var(--muted);font-size:13px">Scanning ingredients…</span></div></div>`;

  const system = `You are a health safety expert. The user provides a product URL. Return ONLY a JSON object.
Format: {"product_name":"string","flags":[{"ingredient":"string","severity":"high|medium|low","concern":"string","found_in":"string"}],"safe":true,"summary":"string"}
Check for: seed oils (canola, soybean, sunflower, vegetable oil), high fructose corn syrup, artificial colors (Red 40, Yellow 5, Blue 1), aspartame, sucralose, carrageenan, BHA/BHT, MSG, sodium nitrate, titanium dioxide, TBHQ, artificial flavors, sodium benzoate, polysorbate 80, maltodextrin.
If you cannot determine ingredients from the URL alone, analyze what you can infer from the product type and note the user should check the label.
Return raw JSON only.`;

  try {
    const raw = await callAI(system, `Analyze this product for harmful ingredients: ${url}`, 1200);
    const parsed = parseJSON(raw);
    if (!parsed) {
      resultEl.innerHTML = `<div class="learn-product-result"><p style="color:var(--muted);font-size:13px">Could not analyze this URL. Try an Amazon, Walmart, or brand product page link.</p></div>`;
      return;
    }
    const flags = parsed.flags || [];
    const productName = parsed.product_name || 'Product';
    let html = `<div class="learn-product-result">`;
    html += `<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--text)">${productName}</div>`;
    if (parsed.safe && flags.length === 0) {
      html += `<div class="learn-product-clean">✅ No major concerns found in this product.</div>`;
    } else {
      html += `<div style="font-size:12px;color:var(--muted);margin-bottom:12px">${parsed.summary || ''}</div>`;
      flags.forEach(f => {
        const sev = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '⚪';
        const sevClass = f.severity === 'high' ? 'learn-flag-severity-high' : f.severity === 'medium' ? 'learn-flag-severity-med' : 'learn-flag-severity-low';
        html += `<div class="learn-product-flag">
          <span class="learn-flag-icon">${sev}</span>
          <div>
            <div class="learn-flag-name ${sevClass}">${f.ingredient}</div>
            <div class="learn-flag-desc">${f.concern}</div>
            ${f.found_in ? `<div class="learn-flag-desc" style="margin-top:3px;opacity:.7">Also in: ${f.found_in}</div>` : ''}
          </div>
        </div>`;
      });
    }
    html += `<button class="learn-product-add-btn" onclick="showAddProductModal(${JSON.stringify(parsed).replace(/"/g,'&quot;')})">+ Add to My Tracker</button>`;
    html += `<button class="learn-product-shop-btn" onclick="showCleanAlternatives(${JSON.stringify(flags).replace(/"/g,'&quot;')}, '${productName.replace(/'/g,"\\'")}')">✦ View Clean Alternatives</button>`;
    html += `</div>`;
    resultEl.innerHTML = html;
  } catch (err) {
    resultEl.innerHTML = `<div class="learn-product-result"><p style="color:var(--muted);font-size:13px">Error: ${err.message}</p></div>`;
  }
}

// ════════════════════════════════════════
// CLEAN ALTERNATIVES DATABASE
// ════════════════════════════════════════
const CLEAN_ALTERNATIVES_DB = [
  {
    category: 'Seed Oils (Canola, Vegetable, Soybean, Sunflower)',
    tags: ['seed oil','canola','vegetable oil','soybean','sunflower','corn oil','safflower'],
    alternatives: [
      { name:'Extra Virgin Olive Oil', brand:'California Olive Ranch', why:'Cold-pressed, high in oleocanthal and oleic acid. Ideal for low-medium heat.', label:'🫒 Best Overall' },
      { name:'Avocado Oil', brand:'Chosen Foods', why:'High smoke point (~500°F), neutral flavor. Best for high-heat cooking.', label:'🔥 High Heat' },
      { name:'Coconut Oil (unrefined)', brand:'Nutiva Organic', why:'Stable saturated fat, antimicrobial. Best for baking and medium heat.', label:'🥥 Baking' },
      { name:'Grass-Fed Ghee', brand:'4th & Heart', why:'Clarified butter — high smoke point, rich in CLA and fat-soluble vitamins.', label:'🧈 Premium' },
      { name:'Tallow / Lard (grass-fed)', brand:'Fatworks', why:'Ancestral cooking fat. Stable at high heat, rich in fat-soluble nutrients.', label:'🥩 Carnivore' },
    ]
  },
  {
    category: 'Artificial Sweeteners & HFCS',
    tags: ['aspartame','sucralose','saccharin','high fructose corn syrup','hfcs','acesulfame','corn syrup'],
    alternatives: [
      { name:'Raw Honey', brand:'Local or Wedderspoon Manuka', why:'Contains enzymes, antioxidants, and antimicrobial properties. Use in moderation.', label:'🍯 Best Overall' },
      { name:'Pure Maple Syrup (Grade A)', brand:'Coombs Family Farms', why:'Contains manganese, zinc, and 24+ antioxidants. Lower GI than table sugar.', label:'🍁 Baking' },
      { name:'Medjool Dates / Date Sugar', brand:'Natural Delights', why:'Whole food sweetener with fiber — blunts blood sugar spike.', label:'🌴 Whole Food' },
      { name:'Monk Fruit Sweetener', brand:'Lakanto', why:'Zero calorie, zero GI. No known negative health effects. Good for keto.', label:'🍈 Zero Cal' },
      { name:'Allulose', brand:'NOW Foods Allulose', why:'Rare sugar that barely raises blood glucose. Caramelizes like sugar.', label:'🔬 Low GI' },
    ]
  },
  {
    category: 'Artificial Food Dyes',
    tags: ['red 40','yellow 5','yellow 6','blue 1','blue 2','green 3','artificial color','fdc','tartrazine'],
    alternatives: [
      { name:'Beet Powder', brand:'Terrasoul Superfoods', why:'Natural red/pink coloring. Rich in nitrates for cardiovascular health.', label:'🔴 Red/Pink' },
      { name:'Turmeric', brand:'Simply Organic', why:'Natural yellow coloring. Powerful anti-inflammatory (curcumin).', label:'🟡 Yellow' },
      { name:'Spirulina', brand:'Nutrex Hawaii', why:'Natural blue-green coloring. Dense in protein and B12.', label:'🔵 Blue/Green' },
      { name:'Annatto', brand:'Frontier Co-op', why:'Natural orange coloring from achiote seeds. Safe, traditional use.', label:'🟠 Orange' },
    ]
  },
  {
    category: 'Chemical Preservatives',
    tags: ['bha','bht','tbhq','sodium benzoate','potassium sorbate','sodium nitrate','sodium nitrite','propyl gallate','sulfites'],
    alternatives: [
      { name:'Vitamin E (Mixed Tocopherols)', brand:'As ingredient in products', why:'Natural preservative that prevents oxidation. Look for it on labels instead of BHA/BHT.', label:'🧪 Natural Preservative' },
      { name:'Rosemary Extract', brand:'As ingredient in products', why:'Natural antioxidant preservative. Used in clean-label products.', label:'🌿 Herbal' },
      { name:'Clean-label deli meats', brand:'Applegate Farms', why:'No nitrates/nitrites added. Uncured, humanely raised.', label:'🥩 Deli Meats' },
      { name:'No-preservative snacks', brand:'Siete Family Foods', why:'Grain-free, clean ingredients. No artificial preservatives.', label:'🌮 Snacks' },
    ]
  },
  {
    category: 'Emulsifiers & Gut-Disrupting Additives',
    tags: ['carrageenan','carboxymethylcellulose','polysorbate 80','polysorbate 60','soy lecithin','xanthan gum'],
    alternatives: [
      { name:'Sunflower Lecithin', brand:'Bulletproof', why:'Better alternative to soy lecithin. Supports brain health without estrogenic concerns.', label:'🌻 Better Emulsifier' },
      { name:'Organic dairy (no carrageenan)', brand:'Organic Valley', why:'Many organic brands avoid carrageenan. Check labels — it hides in "natural" products.', label:'🥛 Dairy' },
      { name:'Full-fat coconut milk (BPA-free can)', brand:'Thai Kitchen Organic', why:'Naturally creamy without emulsifiers needed.', label:'🥥 Dairy-Free' },
    ]
  },
  {
    category: 'Ultra-Processed Snacks & Cereals',
    tags: ['maltodextrin','artificial flavor','modified starch','enriched flour','bromated','bleached flour'],
    alternatives: [
      { name:'RX Bars', brand:'RXBar', why:'Whole food protein bars. Ingredients listed right on the front — dates, egg whites, nuts.', label:'💪 Bars' },
      { name:'Siete Grain-Free Chips', brand:'Siete Family Foods', why:'Cassava, avocado oil, real seasoning. No seed oils.', label:'🌽 Chips' },
      { name:'Lesser Evil Popcorn', brand:'LesserEvil', why:'Popped in coconut oil. Clean, simple ingredients.', label:'🍿 Popcorn' },
      { name:'Purely Elizabeth Granola', brand:'Purely Elizabeth', why:'Ancient grains, coconut oil, no refined sugar or seed oils.', label:'🥣 Granola' },
      { name:"Bob's Red Mill Oats", brand:"Bob's Red Mill", why:'Uncontaminated oats, whole grain, minimal processing.', label:'🌾 Oats' },
    ]
  },
];

function _buildAltIndex() {
  const index = {};
  CLEAN_ALTERNATIVES_DB.forEach(cat => {
    cat.tags.forEach(tag => {
      if (!index[tag]) index[tag] = [];
      index[tag].push(cat);
    });
  });
  return index;
}

function showCleanAlternatives(flags, productName) {
  const altIndex = _buildAltIndex();
  const matched = new Set();
  const results = [];
  (flags || []).forEach(flag => {
    const ingredientLower = (flag.ingredient || '').toLowerCase();
    Object.keys(altIndex).forEach(tag => {
      if (ingredientLower.includes(tag) || tag.includes(ingredientLower.split(' ')[0])) {
        altIndex[tag].forEach(cat => {
          if (!matched.has(cat.category)) {
            matched.add(cat.category);
            results.push({ ...cat, flagged: flag.ingredient });
          }
        });
      }
    });
  });
  if (results.length === 0) results.push(CLEAN_ALTERNATIVES_DB[CLEAN_ALTERNATIVES_DB.length - 1]);

  let modal = document.getElementById('clean-alt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'clean-alt-modal';
    modal.className = 'ai-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  let html = `
    <div class="ai-modal" style="max-width:600px">
      <div class="ai-modal-header">
        <div class="ai-modal-title">✦ CLEAN ALTERNATIVES</div>
        <button class="ai-modal-close" onclick="document.getElementById('clean-alt-modal').classList.remove('open')">✕</button>
      </div>
      <div class="ai-modal-body" style="max-height:70vh;overflow-y:auto">
        <p style="font-size:12px;color:var(--muted);margin-bottom:20px;line-height:1.6">
          Based on the ingredients flagged in <strong>${productName}</strong>, here are Vitalog-recommended clean swaps:
        </p>`;

  results.forEach(cat => {
    html += `<div style="margin-bottom:24px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:2px">Replacing</div>
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px">${cat.flagged || cat.category}</div>
      <div style="display:flex;flex-direction:column;gap:10px">`;
    cat.alternatives.forEach(alt => {
      html += `<div class="clean-alt-card">
        <div class="clean-alt-top">
          <span class="clean-alt-label">${alt.label}</span>
          <div>
            <div class="clean-alt-name">${alt.name}</div>
            <div class="clean-alt-brand">${alt.brand}</div>
          </div>
        </div>
        <div class="clean-alt-why">${alt.why}</div>
      </div>`;
    });
    html += `</div></div>`;
  });

  html += `</div>
      <div class="ai-modal-footer">
        <span class="ai-badge">✦ Vitalog Curated</span>
        <button class="settings-save-btn" style="margin:0" onclick="document.getElementById('clean-alt-modal').classList.remove('open')">Done</button>
      </div>
    </div>`;

  modal.innerHTML = html;
  modal.classList.add('open');
}

// ════════════════════════════════════════
// ADD PRODUCT TO TRACKER MODAL
// ════════════════════════════════════════
function showAddProductModal(parsedProduct) {
  const name = parsedProduct.product_name || '';
  const isSupplement = /supplement|vitamin|mineral|probiotic|protein powder|omega|collagen|magnesium|zinc|d3|b12|iron|calcium|fiber|adaptogen|herb|extract/i.test(name);
  const isDiet = /food|snack|bar|cereal|bread|pasta|sauce|chip|cracker|beverage|drink|juice|milk|yogurt|granola|oil|dressing|seasoning|spice|condiment|soup|meal|frozen/i.test(name);
  const isSelfCare = /lotion|cream|shampoo|conditioner|soap|sunscreen|moisturizer|serum|face|skin|body|hair|deodorant|toothpaste|floss|mouthwash|lip|cleanser|toner|exfoliant|mask/i.test(name);

  // Default category
  let defaultCat = isSupplement ? 'supplement' : isSelfCare ? 'selfcare' : 'diet';

  let modal = document.getElementById('add-product-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-product-modal';
    modal.className = 'ai-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="ai-modal" style="max-width:480px">
      <div class="ai-modal-header">
        <div class="ai-modal-title">+ ADD TO MY TRACKER</div>
        <button class="ai-modal-close" onclick="document.getElementById('add-product-modal').classList.remove('open')">✕</button>
      </div>
      <div class="ai-modal-body">
        <div style="margin-bottom:14px">
          <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Product Name</label>
          <input type="text" id="apm-name" value="${name}" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px">
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Add to</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="apm-cat-btn${defaultCat==='supplement'?' apm-cat-active':''}" onclick="apmSelectCat(this,'supplement')">💊 Supplements</button>
            <button class="apm-cat-btn${defaultCat==='selfcare'?' apm-cat-active':''}" onclick="apmSelectCat(this,'selfcare')">✨ Self Care</button>
            <button class="apm-cat-btn${defaultCat==='diet'?' apm-cat-active':''}" onclick="apmSelectCat(this,'diet')">🥗 Diet / Food</button>
          </div>
        </div>
        <div id="apm-supp-fields" style="${defaultCat==='supplement'?'':'display:none'}">
          <div style="margin-bottom:10px">
            <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Dose / Serving</label>
            <input type="text" id="apm-dose" placeholder="e.g. 1 capsule, 500mg" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px">
          </div>
          <div style="margin-bottom:10px">
            <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Notes</label>
            <input type="text" id="apm-supp-notes" placeholder="e.g. take with food" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px">
          </div>
        </div>
        <div id="apm-selfcare-fields" style="${defaultCat==='selfcare'?'':'display:none'}">
          <div style="margin-bottom:10px">
            <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Notes</label>
            <input type="text" id="apm-sc-notes" placeholder="e.g. apply morning and night" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px">
          </div>
        </div>
        <div id="apm-diet-fields" style="${defaultCat==='diet'?'':'display:none'}">
          <div class="goals-grid" style="margin-bottom:10px">
            <div><label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Calories</label><input type="number" id="apm-cal" min="0" placeholder="0" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px"></div>
            <div><label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Protein (g)</label><input type="number" id="apm-prot" min="0" placeholder="0" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px"></div>
          </div>
          <div class="goals-grid" style="margin-bottom:10px">
            <div><label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Carbs (g)</label><input type="number" id="apm-carb" min="0" placeholder="0" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px"></div>
            <div><label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Fat (g)</label><input type="number" id="apm-fat" min="0" placeholder="0" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px"></div>
          </div>
          <div style="margin-bottom:10px">
            <label style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:600;display:block;margin-bottom:6px">Default Meal</label>
            <select id="apm-meal" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-family:'DM Sans';font-size:14px">
              <option>Breakfast</option><option>Lunch</option><option selected>Dinner</option><option>Snacks</option>
            </select>
          </div>
        </div>
      </div>
      <div class="ai-modal-footer">
        <button class="settings-save-btn" style="margin:0;background:var(--card);border:1px solid var(--border);color:var(--text)" onclick="document.getElementById('add-product-modal').classList.remove('open')">Cancel</button>
        <button class="settings-save-btn" style="margin:0" onclick="confirmAddProduct()">+ Add to Tracker</button>
      </div>
    </div>`;

  // Store the current selected cat
  modal.dataset.cat = defaultCat;
  modal.classList.add('open');
}

function apmSelectCat(btn, cat) {
  document.querySelectorAll('.apm-cat-btn').forEach(b => b.classList.remove('apm-cat-active'));
  btn.classList.add('apm-cat-active');
  ['supplement','selfcare','diet'].forEach(c => {
    const el = document.getElementById(`apm-${c==='supplement'?'supp':c==='selfcare'?'selfcare':'diet'}-fields`);
    if (el) el.style.display = c === cat ? '' : 'none';
  });
  document.getElementById('add-product-modal').dataset.cat = cat;
}

function confirmAddProduct() {
  const modal = document.getElementById('add-product-modal');
  const cat = modal ? modal.dataset.cat : 'supplement';
  const name = (document.getElementById('apm-name')?.value || '').trim();
  if (!name) { if(typeof showToast==='function') showToast('Enter a product name'); return; }

  if (cat === 'supplement') {
    const dose = document.getElementById('apm-dose')?.value || '';
    const notes = document.getElementById('apm-supp-notes')?.value || '';
    const list = (typeof getSupplementList === 'function' ? getSupplementList() : null) || [];
    const newId = 'prod_' + Date.now();
    list.push({ id: newId, name, dose, notes });
    if (typeof lsSet === 'function') lsSet('supplementList', list);
    if(typeof showToast==='function') showToast('✓ Added to Supplements!');
  } else if (cat === 'selfcare') {
    const notes = document.getElementById('apm-sc-notes')?.value || '';
    const list = (typeof getSelfCareList === 'function' ? getSelfCareList() : null) || [];
    const newId = 'prod_' + Date.now();
    list.push({ id: newId, name, notes });
    if (typeof lsSet === 'function') lsSet('selfCareList', list);
    if(typeof showToast==='function') showToast('✓ Added to Self Care!');
  } else if (cat === 'diet') {
    const cal  = parseInt(document.getElementById('apm-cal')?.value)  || 0;
    const prot = parseInt(document.getElementById('apm-prot')?.value) || 0;
    const carb = parseInt(document.getElementById('apm-carb')?.value) || 0;
    const fat  = parseInt(document.getElementById('apm-fat')?.value)  || 0;
    const meal = document.getElementById('apm-meal')?.value || 'Snacks';
    const list = (typeof getQuickAdds === 'function' ? getQuickAdds() : null) || [];
    const newId = 'prod_' + Date.now();
    list.push({ id: newId, name, cal, prot, carb, fat, meal, color: '#4ade80' });
    if (typeof lsSet === 'function') lsSet('quickAdds', list);
    if(typeof showToast==='function') showToast('✓ Added to Quick Add Foods!');
  }

  if (modal) modal.classList.remove('open');
}
