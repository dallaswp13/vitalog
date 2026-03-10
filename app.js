// app.js — Vitalog application logic
// Depends on sync.js being loaded first

function fmtCost(v){return v?'$'+parseFloat(v).toFixed(2):null;}
function getBottleOz(){return getSettings().bottleOz||24;}


// ════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════
const MEALS = ['Breakfast','Lunch','Dinner','Snacks'];
const EX_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const WORKOUT_PLAN = {
  Monday:{label:'Full Body Strength',tasks:[
    {name:'Warm-up: light jog + dynamic stretches',meta:'10 min',tag:'warm',tagLabel:'Warm-up'},
    {name:'Squats (3x12)',meta:'Legs & glutes',tag:'strength',tagLabel:'Strength'},
    {name:'Push-ups or bench press (3x10)',meta:'Chest & shoulders',tag:'strength',tagLabel:'Strength'},
    {name:'Dumbbell rows (3x12 each side)',meta:'Back & biceps',tag:'strength',tagLabel:'Strength'},
    {name:'Plank holds (3x45 sec)',meta:'Core',tag:'strength',tagLabel:'Strength'},
    {name:'Cool-down: full body stretch',meta:'10 min',tag:'cool',tagLabel:'Cool-down'},
  ]},
  Tuesday:{label:'Cardio Burn',tasks:[
    {name:'Warm-up: brisk walk',meta:'5 min',tag:'warm',tagLabel:'Warm-up'},
    {name:'30-min moderate run or brisk walk',meta:'Zone 2 cardio',tag:'cardio',tagLabel:'Cardio'},
    {name:'HIIT intervals (20 sec on / 40 sec off x8)',meta:'~10 min',tag:'cardio',tagLabel:'Cardio'},
    {name:'Cool-down: walking + stretching',meta:'10 min',tag:'cool',tagLabel:'Cool-down'},
  ]},
  Wednesday:{label:'Upper Body Focus',tasks:[
    {name:'Warm-up: arm circles, shoulder rolls',meta:'5 min',tag:'warm',tagLabel:'Warm-up'},
    {name:'Overhead press (3x10)',meta:'Shoulders',tag:'strength',tagLabel:'Strength'},
    {name:'Lat pulldowns or pull-ups (3x8)',meta:'Back',tag:'strength',tagLabel:'Strength'},
    {name:'Bicep curls (3x12)',meta:'Arms',tag:'strength',tagLabel:'Strength'},
    {name:'Tricep dips or pushdowns (3x12)',meta:'Arms',tag:'strength',tagLabel:'Strength'},
    {name:'Core: bicycle crunches + leg raises (2x15)',meta:'Abs',tag:'strength',tagLabel:'Strength'},
    {name:'Cool-down stretch',meta:'10 min',tag:'cool',tagLabel:'Cool-down'},
  ]},
  Thursday:{label:'Active Recovery',tasks:[
    {name:'Yoga or gentle stretching session',meta:'30-40 min',tag:'cool',tagLabel:'Recovery'},
    {name:'Leisurely walk outdoors',meta:'20-30 min',tag:'cardio',tagLabel:'Light Cardio'},
    {name:'Foam rolling / mobility work',meta:'10-15 min',tag:'cool',tagLabel:'Recovery'},
  ]},
  Friday:{label:'Lower Body Focus',tasks:[
    {name:'Warm-up: leg swings, hip circles',meta:'5 min',tag:'warm',tagLabel:'Warm-up'},
    {name:'Romanian deadlifts (3x10)',meta:'Hamstrings & glutes',tag:'strength',tagLabel:'Strength'},
    {name:'Lunges (3x12)',meta:'Quads & glutes',tag:'strength',tagLabel:'Strength'},
    {name:'Glute bridges or hip thrusts (3x15)',meta:'Glutes',tag:'strength',tagLabel:'Strength'},
    {name:'Calf raises (3x20)',meta:'Calves',tag:'strength',tagLabel:'Strength'},
    {name:'Cool-down: hip flexor & hamstring stretches',meta:'10 min',tag:'cool',tagLabel:'Cool-down'},
  ]},
  Saturday:{label:'Fun Cardio',tasks:[
    {name:'Choose your activity!',meta:'Hiking, cycling, swimming, dancing...',tag:'cardio',tagLabel:'Cardio'},
    {name:'45-90 minutes of sustained movement',meta:'Keep it enjoyable',tag:'cardio',tagLabel:'Cardio'},
    {name:'Stretch afterward',meta:'10 min',tag:'cool',tagLabel:'Cool-down'},
  ]},
  Sunday:{label:'Rest Day',rest:true}
};
const DEFAULT_QUICK = [
  {name:'Banana',cal:89,p:1,c:23,f:0,cost:.30,meal:'Breakfast'},
  {name:'Oats (1 cup)',cal:307,p:11,c:55,f:5,cost:.50,meal:'Breakfast'},
  {name:'Eggs x2',cal:143,p:13,c:1,f:10,cost:.60,meal:'Breakfast'},
  {name:'Chicken breast 150g',cal:248,p:46,c:0,f:5,cost:2.50,meal:'Lunch'},
  {name:'Brown rice (1 cup)',cal:216,p:5,c:45,f:2,cost:.40,meal:'Lunch'},
  {name:'Greek yogurt',cal:100,p:17,c:6,f:0,cost:1.20,meal:'Snacks'},
  {name:'Almonds (30g)',cal:173,p:6,c:6,f:15,cost:.90,meal:'Snacks'},
  {name:'Salmon fillet',cal:280,p:39,c:0,f:13,cost:5.00,meal:'Dinner'},
  {name:'Sweet potato',cal:103,p:2,c:24,f:0,cost:.80,meal:'Dinner'},
  {name:'Protein shake',cal:150,p:25,c:8,f:2,cost:1.50,meal:'Snacks'},
];

// ════════════════════════════════════════
// STATE
// ════════════════════════════════════════
let dietOffset = 0;
let journalOffset = 0;
let sleepOffset = 0;
let suppOffset = 0;
let scOffset = 0;
let cleanOffset = 0;
let bioOffset = 0;
let editMode = false;
let editModalIdx = -1;
let calMetric = 'calories';
let popupDateKey = null;
let dayviewKey = null;
let currentWeightKey = null;
let currentMood = 0;
let currentSleepQ = 0;
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
const todayName = EX_DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
let activeExDay = todayName;
let exOffset = 0;
let currentDietKey = "";

// ── Default lists for supplements & self care ──
const DEFAULT_SUPPLEMENTS=[
  {id:'s1',name:'Vitamin D3',dose:'2000 IU'},
  {id:'s2',name:'Magnesium Glycinate',dose:'400mg'},
  {id:'s3',name:'Omega-3 Fish Oil',dose:'1g'},
  {id:'s4',name:'Zinc',dose:'15mg'},
  {id:'s5',name:'Creatine',dose:'5g'},
  {id:'s6',name:'Vitamin C',dose:'500mg'},
];
const DEFAULT_SELFCARE=[
  {id:'c1',name:'Morning Skincare',time:'AM'},
  {id:'c2',name:'Brush & Floss',time:'AM/PM'},
  {id:'c3',name:'Meditation',time:'AM'},
  {id:'c4',name:'Evening Skincare',time:'PM'},
  {id:'c5',name:'Journaling',time:'PM'},
  {id:'c6',name:'Stretching',time:'PM'},
];
const DEFAULT_CLEANING=[
  {id:'cl1',name:'Make Bed',freq:'Daily'},
  {id:'cl2',name:'Wipe Kitchen Counters',freq:'Daily'},
  {id:'cl3',name:'Take Out Trash',freq:'Weekly'},
  {id:'cl4',name:'Vacuum / Sweep',freq:'Weekly'},
  {id:'cl5',name:'Mop Floors',freq:'Weekly'},
  {id:'cl6',name:'Clean Bathrooms',freq:'Weekly'},
];

// ════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════
function dateKey(o){const d=new Date();d.setDate(d.getDate()+o);return d.toISOString().split('T')[0];}
function dateKeyFromDate(d){return d.toISOString().split('T')[0];}
function fmtDate(o){const d=new Date();d.setDate(d.getDate()+o);return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});}
function fmtDateFromKey(k){return new Date(k+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});}






















// ════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════
let sidebarCollapsed = false;
function toggleSidebar(){
  sidebarCollapsed=!sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed',sidebarCollapsed);
  try{localStorage.setItem('vitalog_sidebar_collapsed',sidebarCollapsed?'1':'0');}catch(e){}
}
function openMobileSidebar(){
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebar-overlay').classList.add('show');
}
function closeMobileSidebar(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
function initSidebar(){
  try{
    const saved=localStorage.getItem('vitalog_sidebar_collapsed');
    if(saved==='1'){sidebarCollapsed=true;document.getElementById('sidebar').classList.add('collapsed');}
    const logOpen=localStorage.getItem('vitalog_log_open');
    if(logOpen==='1') toggleLogManually(true);
  }catch(e){}
}

// ════════════════════════════════════════
// NAV
// ════════════════════════════════════════
const TAB_TITLES={ai:'AI ASSISTANT',dashboard:'DASHBOARD',diet:'DIET',exercise:'EXERCISE',sleep:'SLEEP',journal:'JOURNAL',supplements:'SUPPLEMENTS',party:'PARTY FAVORS',selfcare:'SELF CARE',cleaning:'HOME CLEANING',biometrics:'BIOMETRICS',period:'PERIOD TRACKER',poop:'POOP TRACKER',sex:'INTIMACY TRACKER',learn:'LEARN',share:'SHARE',calendar:'HISTORY',metrics:'METRICS',settings:'SETTINGS',dayview:'DAY SUMMARY'};
// Log Manually tabs — these live inside the collapsible group
const LOG_MANUALLY_TABS = new Set(['diet','exercise','sleep','journal','party','period','poop','sex','supplements','selfcare','cleaning','biometrics']);

function toggleLogManually(forceOpen){
  const group = document.getElementById('log-sub-group');
  const chevron = document.getElementById('nav-log-chevron');
  const toggle = document.getElementById('nav-log-toggle');
  if(!group) return;
  const willOpen = forceOpen !== undefined ? forceOpen : !group.classList.contains('open');
  group.classList.toggle('open', willOpen);
  if(chevron) chevron.style.transform = willOpen ? 'rotate(180deg)' : '';
  if(toggle) toggle.classList.toggle('nav-group-open', willOpen);
  try{ localStorage.setItem('vitalog_log_open', willOpen?'1':'0'); }catch(e){}
}

function switchTab(name, settingsSubTab){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  // Clear subtab active states
  document.querySelectorAll('.nav-subtab[data-tab]').forEach(t=>t.classList.remove('active'));
  const panel=document.getElementById('panel-'+name);
  if(panel) panel.classList.add('active');
  const titleEl=document.getElementById('topbar-title');
  if(titleEl) titleEl.textContent=TAB_TITLES[name]||name.toUpperCase();

  // Handle which group is open and what's highlighted
  if(LOG_MANUALLY_TABS.has(name)){
    // Highlight the Log Manually parent + the matching subtab
    const logToggle = document.getElementById('nav-log-toggle');
    if(logToggle) logToggle.classList.add('active');
    const subBtn = document.querySelector(`.nav-subtab[data-tab="${name}"]`);
    if(subBtn) subBtn.classList.add('active');
    toggleLogManually(true); // keep open
  } else {
    // Highlight the matching top-level tab
    const tab=document.querySelector(`.nav-tab[data-tab="${name}"]`);
    if(tab) tab.classList.add('active');
  }

  // Settings sub-group: open when on settings, close otherwise
  const settingsGroup=document.getElementById('settings-sub-group');
  if(settingsGroup) settingsGroup.classList.toggle('open', name==='settings');
  const settingsChevron=document.getElementById('nav-settings-chevron');
  if(settingsChevron) settingsChevron.style.transform = name==='settings' ? 'rotate(180deg)' : '';
  const settingsBtn=document.getElementById('nav-settings-btn');
  if(settingsBtn) settingsBtn.classList.toggle('nav-group-open', name==='settings');

  closeMobileSidebar();

  if(name==='ai') renderAITab();
  else if(name==='dashboard') renderDashboard();
  else if(name==='diet') renderDiet();
  else if(name==='exercise') renderExercise();
  else if(name==='sleep') renderSleep();
  else if(name==='journal') renderJournal();
  else if(name==='supplements') renderSupplements();
  else if(name==='party') renderParty();
  else if(name==='selfcare') renderSelfCare();
  else if(name==='cleaning') renderCleaning();
  else if(name==='biometrics') renderBiometrics();
  else if(name==='period') renderPeriod();
  else if(name==='poop') renderPoop();
  else if(name==='sex') renderSex();
  else if(name==='learn') renderLearn();
  else if(name==='share') renderShare();
  else if(name==='calendar') renderCalendar();
  else if(name==='metrics') renderMetrics();
  else if(name==='settings'){
    renderSettings();
    switchSettingsTab(settingsSubTab||'profile');
  }
}

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════

// ═══════════════════════════════════════
// DASHBOARD SECTION ORDERING
// ═══════════════════════════════════════
const DASH_SECTION_DEFS = [
  { id:'affirmation',  label:'Daily Quote',         icon:'✦' },
  { id:'nutrition',    label:'Nutrition Banner',     icon:'🍽' },
  { id:'ai_summary',   label:'Weekly AI Summary',   icon:'✦ AI' },
  { id:'stats',        label:'Today at a Glance',   icon:'📊' },
  { id:'checklist',    label:"Today's Checklist",  icon:'✅' },
];
const DASH_SECTION_DEFAULT = ['affirmation','nutrition','ai_summary','stats','checklist'];

function getDashOrder() {
  const saved = lsGetSync('dashOrder');
  if (saved && Array.isArray(saved) && saved.length === DASH_SECTION_DEFAULT.length) return saved;
  return [...DASH_SECTION_DEFAULT];
}
function saveDashOrder(order) { lsSet('dashOrder', order); }

function openDashReorder() {
  let modal = document.getElementById('dash-reorder-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dash-reorder-modal';
    modal.className = 'ai-modal-overlay';
    document.body.appendChild(modal);
  }
  const order = getDashOrder();
  modal.innerHTML = `<div class="ai-modal" style="max-width:380px">
    <div class="ai-modal-header">
      <div class="ai-modal-title">Reorder Dashboard</div>
      <button class="ai-modal-close" onclick="document.getElementById('dash-reorder-modal').classList.remove('open')">✕</button>
    </div>
    <div class="ai-modal-body">
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Drag sections to reorder your dashboard.</p>
      <div class="dash-reorder-list" id="dash-reorder-list">
        ${order.map(id => {
          const def = DASH_SECTION_DEFS.find(d=>d.id===id);
          if (!def) return '';
          return `<div class="dash-reorder-item" draggable="true" data-sid="${id}"
            ondragstart="_dro_dragstart(event)" ondragover="_dro_dragover(event)" ondrop="_dro_drop(event)" ondragend="_dro_dragend(event)">
            <span class="dash-reorder-drag">⠿</span>
            <span class="dash-reorder-icon">${def.icon}</span>
            <span class="dash-reorder-label">${def.label}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="ai-modal-footer">
      <button class="modal-cancel" onclick="document.getElementById('dash-reorder-modal').classList.remove('open')">Cancel</button>
      <button class="settings-save-btn" style="margin:0" onclick="_dro_save()">Save Order</button>
    </div>
  </div>`;
  modal.classList.add('open');
  _dro_initDrag();
}

let _dro_dragging = null;
function _dro_initDrag() {
  // handled by inline events
}
function _dro_dragstart(e) {
  _dro_dragging = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function _dro_dragover(e) {
  e.preventDefault();
  const list = document.getElementById('dash-reorder-list');
  const over = e.currentTarget;
  if (!_dro_dragging || over === _dro_dragging) return;
  const items = [...list.querySelectorAll('.dash-reorder-item')];
  const dragIdx = items.indexOf(_dro_dragging);
  const overIdx = items.indexOf(over);
  if (dragIdx < overIdx) list.insertBefore(_dro_dragging, over.nextSibling);
  else list.insertBefore(_dro_dragging, over);
}
function _dro_drop(e) { e.preventDefault(); }
function _dro_dragend(e) {
  e.currentTarget.classList.remove('dragging');
  _dro_dragging = null;
}
function _dro_save() {
  const list = document.getElementById('dash-reorder-list');
  if (!list) return;
  const order = [...list.querySelectorAll('.dash-reorder-item')].map(el => el.dataset.sid);
  saveDashOrder(order);
  document.getElementById('dash-reorder-modal').classList.remove('open');
  renderDashboard();
  showToast('✓ Dashboard layout saved!');
}

function renderDashboard(){
  const s=getSettings();
  const name=s.name||'';
  const hour=new Date().getHours();
  const greet=hour<12?'GOOD<br><span>MORNING.</span>':hour<17?'GOOD<br><span>AFTERNOON.</span>':'GOOD<br><span>EVENING.</span>';
  const greetEl=document.getElementById('dashboard-greeting');
  if(greetEl) greetEl.innerHTML=name?`HEY ${name.toUpperCase()},<br><span>LET'S GO.</span>`:greet;

  const todayKey=new Date().toISOString().split('T')[0];
  const foods=getFoods(todayKey);
  let tCal=0,tProt=0,tCarb=0,tFat=0;
  foods.forEach(i=>{tCal+=i.cal||0;tProt+=i.p||0;tCarb+=i.c||0;tFat+=i.f||0;});
  const waterBottles=getWater(todayKey);
  const calGoal=s.calGoal||2000;
  const protGoal=s.protGoal||150;
  const carbGoal=s.carbGoal||0;
  const fatGoal=s.fatGoal||0;
  const waterGoal=s.waterGoal||96;
  const bottleOz=s.bottleOz||24;
  const waterOz=waterBottles*bottleOz;
  const waterPct=waterGoal?Math.min(100,Math.round(waterOz/waterGoal*100)):0;
  const calPct=calGoal?Math.min(100,Math.round(tCal/calGoal*100)):0;
  const protPct=protGoal?Math.min(100,Math.round(tProt/protGoal*100)):0;

  // Needs remaining
  const calNeeded=Math.max(0,calGoal-tCal);
  const protNeeded=Math.max(0,protGoal-tProt);
  const carbNeeded=carbGoal?Math.max(0,carbGoal-tCarb):null;
  const fatNeeded=fatGoal?Math.max(0,fatGoal-tFat):null;
  const waterNeeded=Math.max(0,waterGoal-waterOz);

  // Exercise
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayDay=dayNames[new Date().getDay()];
  const exData=getExChecked(getWeekKey(0))||{};
  const plan=WORKOUT_PLAN[todayDay];
  let exDone=0,exTotal=0;
  if(plan&&!plan.rest){
    exTotal=plan.tasks.length;
    exDone=plan.tasks.filter((_,i)=>exData[todayDay+'__'+i]).length;
  }

  // Weight/sleep
  let weightStr='—';
  for(let i=0;i<14;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const w=getWeight(d.toISOString().split('T')[0]);
    if(w){weightStr=parseFloat(w).toFixed(1)+' lbs';break;}
  }
  let sleepStr='—';
  const sEntry=getSleep(todayKey)||getSleep((()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().split('T')[0];})());
  if(sEntry&&sEntry.bed&&sEntry.wake){
    const [bh,bm]=sEntry.bed.split(':').map(Number);
    const [wh,wm]=sEntry.wake.split(':').map(Number);
    let mins=(wh*60+wm)-(bh*60+bm);if(mins<0)mins+=1440;
    sleepStr=Math.floor(mins/60)+'h '+(mins%60)+'m';
  }

  // Checklist items remaining
  const todoItems=[];
  const s2=getSettings();
  // Exercise tasks
  if(plan&&!plan.rest&&exTotal>0){
    plan.tasks.forEach((task,i)=>{
      const done=!!exData[todayDay+'__'+i];
      todoItems.push({cat:'Exercise',icon:'💪',name:task.name||task,done,color:'var(--accent2)',tab:'exercise',itemId:'ex__'+i});
    });
  }
  // Supplements (only if enabled)
  if(s2.feat_supplements!==false){
    const suppList=getSupplementList()||DEFAULT_SUPPLEMENTS;
    const suppLog=getSupplementLog(todayKey);
    suppList.forEach(sv=>{
      todoItems.push({cat:'Supps',icon:'💊',name:sv.name,done:!!suppLog[sv.id],color:'var(--cost)',tab:'supplements',itemId:'supp__'+sv.id});
    });
  }
  // Self Care (only if enabled)
  if(s2.feat_selfcare!==false){
    const scList=getSelfCareList()||DEFAULT_SELFCARE;
    const scLog=getSelfCareLog(todayKey);
    scList.forEach(c=>{
      todoItems.push({cat:'Self Care',icon:'✨',name:c.name,done:!!scLog[c.id],color:'var(--journal)',tab:'selfcare',itemId:'sc__'+c.id});
    });
  }
  // Cleaning (only if enabled)
  if(s2.feat_cleaning!==false){
    const cleanList=getCleaningList()||DEFAULT_CLEANING;
    const cleanLog=getCleaningLog(todayKey);
    cleanList.forEach(cl=>{
      todoItems.push({cat:'Cleaning',icon:'🧹',name:cl.name,done:!!cleanLog[cl.id],color:'#60a5fa',tab:'cleaning',itemId:'clean__'+cl.id});
    });
  }

  const remaining=todoItems.filter(t=>!t.done).length;
  const totalTodo=todoItems.length;

  // Build nutrition needs banner
  const allNutritionDone = calPct>=100 && protPct>=100 && waterPct>=100;
  const nutritionBanner = allNutritionDone
    ? `<div class="dash-nutrition-banner dash-nutrition-done">
        <span class="dash-nutrition-banner-icon">🎉</span>
        <div><div class="dash-nutrition-banner-title">All nutrition goals hit!</div>
        <div class="dash-nutrition-banner-sub">Calories · Protein · Hydration — you're crushing it</div></div>
       </div>`
    : `<div class="dash-nutrition-banner" onclick="switchTab('diet')">
        <div class="dash-nutrition-banner-title">Still needed today</div>
        <div class="dash-nutrition-needs-row">
          ${calPct<100?`<div class="dash-nutrition-need">
            <div class="dash-nutrition-need-val" style="color:var(--accent)">${calNeeded}</div>
            <div class="dash-nutrition-need-unit">kcal</div>
            <div class="dash-nutrition-need-label">calories</div>
            <div class="dash-nutrition-need-bar"><div style="width:${calPct}%;background:var(--accent)"></div></div>
          </div>`:''}
          ${protPct<100?`<div class="dash-nutrition-need">
            <div class="dash-nutrition-need-val" style="color:var(--protein)">${protNeeded}</div>
            <div class="dash-nutrition-need-unit">g</div>
            <div class="dash-nutrition-need-label">protein</div>
            <div class="dash-nutrition-need-bar"><div style="width:${protPct}%;background:var(--protein)"></div></div>
          </div>`:''}
          ${carbGoal&&carbNeeded>0?`<div class="dash-nutrition-need">
            <div class="dash-nutrition-need-val" style="color:var(--carbs)">${carbNeeded}</div>
            <div class="dash-nutrition-need-unit">g</div>
            <div class="dash-nutrition-need-label">carbs</div>
            <div class="dash-nutrition-need-bar"><div style="width:${carbGoal?Math.min(100,Math.round(tCarb/carbGoal*100)):0}%;background:var(--carbs)"></div></div>
          </div>`:''}
          ${fatGoal&&fatNeeded>0?`<div class="dash-nutrition-need">
            <div class="dash-nutrition-need-val" style="color:var(--fat)">${fatNeeded}</div>
            <div class="dash-nutrition-need-unit">g</div>
            <div class="dash-nutrition-need-label">fat</div>
            <div class="dash-nutrition-need-bar"><div style="width:${fatGoal?Math.min(100,Math.round(tFat/fatGoal*100)):0}%;background:var(--fat)"></div></div>
          </div>`:''}
          ${waterPct<100?`<div class="dash-nutrition-need">
            <div class="dash-nutrition-need-val" style="color:var(--water)">${waterNeeded}</div>
            <div class="dash-nutrition-need-unit">oz</div>
            <div class="dash-nutrition-need-label">water</div>
            <div class="dash-nutrition-need-bar"><div style="width:${waterPct}%;background:var(--water)"></div></div>
          </div>`:''}
        </div>
        <div class="dash-nutrition-banner-sub" style="margin-top:8px">Tap to log food or water →</div>
       </div>`;

  // Build section HTML map
  const _sectionHTML = {
    affirmation: `<div class="dash-affirmation-card" id="dash-affirmation">
      <div class="dash-affirmation-icon">✦</div>
      <div style="flex:1"><div class="dash-affirmation-text" id="dash-affirmation-text">Loading…</div></div>
      <button class="quote-refresh-btn" onclick="refreshDailyQuote()" title="New quote">↻</button>
    </div>`,
    nutrition: nutritionBanner,
    ai_summary: `<div class="dash-ai-card" onclick="showWeeklySummaryModal(false)">
      <div class="dash-ai-left">
        <div class="dash-ai-badge">✦ AI</div>
        <div><div class="dash-ai-title">Weekly AI Summary</div><div class="dash-ai-sub">Get an AI-powered review of your past 7 days</div></div>
      </div><span style="font-size:18px;color:var(--muted)">→</span>
    </div>`,
    stats: `<div class="dash-section-title">Today at a glance</div>
    <div class="dash-grid">
      <div class="dash-card" onclick="switchTab('diet')">
        <div class="dash-card-label">Calories</div>
        <div class="dash-card-val" style="color:var(--accent)">${tCal.toLocaleString()}<span style="font-size:16px;color:var(--muted)"> / ${calGoal.toLocaleString()}</span></div>
        <div class="dash-card-bar"><div class="dash-card-bar-fill" style="width:${calPct}%;background:var(--accent)"></div></div>
        <div class="dash-card-sub">${calPct>=100?'Goal reached! 🎉':calNeeded.toLocaleString()+' kcal to go'}</div>
      </div>
      <div class="dash-card" onclick="switchTab('diet')">
        <div class="dash-card-label">Protein</div>
        <div class="dash-card-val" style="color:var(--protein)">${tProt}g<span style="font-size:16px;color:var(--muted)"> / ${protGoal}g</span></div>
        <div class="dash-card-bar"><div class="dash-card-bar-fill" style="width:${protPct}%;background:var(--protein)"></div></div>
        <div class="dash-card-sub">${protPct>=100?'Goal reached! 🎉':protNeeded+'g to go'}</div>
      </div>
      <div class="dash-card" onclick="switchTab('diet')">
        <div class="dash-card-label">Hydration</div>
        <div class="dash-card-val" style="color:var(--water)">${waterBottles}<span style="font-size:14px;color:var(--muted)"> bottles</span></div>
        <div class="dash-card-bar"><div class="dash-card-bar-fill" style="width:${waterPct}%;background:var(--water)"></div></div>
        <div class="dash-card-sub">${waterPct>=100?'Hydrated! 💧':waterNeeded+'oz to go'}</div>
      </div>
      <div class="dash-card" onclick="switchTab('exercise')">
        <div class="dash-card-label">Workout — ${todayDay}</div>
        ${plan&&plan.rest
          ?`<div class="dash-card-val" style="color:var(--muted);font-size:22px">Rest Day 😴</div>`
          :exTotal===0
            ?`<div class="dash-card-val" style="font-size:22px;color:var(--muted)">No plan</div>`
            :`<div class="dash-card-val" style="color:var(--accent2)">${exDone}<span style="font-size:16px;color:var(--muted)"> / ${exTotal}</span></div>
              <div class="dash-card-bar"><div class="dash-card-bar-fill" style="width:${exTotal?Math.round(exDone/exTotal*100):0}%;background:var(--accent2)"></div></div>
              <div class="dash-card-sub">${exTotal-exDone>0?exTotal-exDone+' exercises left':'All done! 💪'}</div>`
        }
      </div>
      <div class="dash-card" onclick="switchTab('exercise')">
        <div class="dash-card-label">Weight</div>
        <div class="dash-card-val" style="color:var(--accent2)">${weightStr}</div>
        <div class="dash-card-sub">most recent log</div>
      </div>
      <div class="dash-card" onclick="switchTab('sleep')">
        <div class="dash-card-label">Sleep</div>
        <div class="dash-card-val" style="color:var(--sleep)">${sleepStr}</div>
        <div class="dash-card-sub">last logged</div>
      </div>
    </div>`,
    checklist: `<div class="dash-section-title" style="margin-top:20px">
      Today's checklist
      ${remaining>0?`<span class="dash-todo-badge">${remaining} left</span>`:`<span class="dash-todo-badge dash-todo-badge-done">✓ all done</span>`}
    </div>
    <div class="dash-todo-list" id="dash-todo-list">
      ${todoItems.length===0
        ?`<p style="color:var(--muted);font-size:13px">No checklist items yet. Add supplements, self care, or cleaning tasks.</p>`
        :todoItems.map(t=>`
        <div class="dash-todo-item${t.done?' done':''}" onclick="dashToggleTodo('${t.tab}','${t.itemId}')">
          <div class="dash-todo-check" style="${t.done?'background:'+t.color+';border-color:'+t.color:'border-color:'+t.color}">${t.done?'✓':''}</div>
          <span class="dash-todo-cat" style="color:${t.color}">${t.cat}</span>
          <span class="dash-todo-name">${t.name}</span>
        </div>`).join('')}
    </div>`,
  };

  const order = getDashOrder();
  const container=document.getElementById('dashboard-content');
  container.innerHTML = `<div class="dash-reorder-btn-row">
    <button class="dash-reorder-btn" onclick="openDashReorder()" title="Customize dashboard order">⠿ Customize</button>
  </div>` + order.map(id => _sectionHTML[id] || '').join('\n');
  loadDailyAffirmation();
  renderDashWeightWidget();
}

function renderDashWeightWidget(){
  const ws=document.getElementById('dash-weight-section');
  const wc=document.getElementById('dash-weight-content');
  if(!ws||!wc) return;
  const k=new Date().toISOString().split('T')[0];
  const existing=getWeight(k);
  if(existing){
    const s=getSettings();
    const bmi=calcBMI(existing,s.heightFt||0,s.heightIn||0);
    const cat=bmi?bmiCategory(bmi):null;
    wc.innerHTML='<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">'
      +'<div class="weight-val">'+existing+'</div><span class="weight-unit"> lbs</span>'
      +(bmi?'<div class="weight-bmi-pill" style="background:'+cat.color+'22;color:'+cat.color+'">BMI '+bmi.toFixed(1)+' · '+cat.label+'</div>':'')
      +'</div>'
      +'<button class="weight-save-btn" onclick="editDashWeightPrompt()">Edit</button>';
  } else {
    wc.innerHTML='<div style="margin-bottom:8px"><label>Today\'s weight (optional)</label>'
      +'<input type="number" id="dash-weight-input" placeholder="e.g. 185.5" min="50" max="500" step="0.1" style="max-width:180px;margin-top:4px"></div>'
      +'<button class="weight-save-btn" onclick="saveDashWeight()">Save Weight</button>';
  }
}
function saveDashWeight(){
  const v=parseFloat(document.getElementById('dash-weight-input')?.value);
  if(!v||v<50){showToast('Enter a valid weight');return;}
  const k=new Date().toISOString().split('T')[0];
  setWeight(k,v);renderDashWeightWidget();renderDashboard();showToast('✓ Weight saved: '+v+' lbs');
}
function editDashWeightPrompt(){
  const wc=document.getElementById('dash-weight-content');
  const k=new Date().toISOString().split('T')[0];
  wc.innerHTML='<div style="margin-bottom:8px"><label>Update weight</label>'
    +'<input type="number" id="dash-weight-input" value="'+getWeight(k)+'" min="50" max="500" step="0.1" style="max-width:180px;margin-top:4px"></div>'
    +'<button class="weight-save-btn" onclick="saveDashWeight()">Save</button>';
}

function dashToggleTodo(tab, itemId){
  const today=new Date().toISOString().split('T')[0];
  if(itemId.startsWith('supp__')){
    const id=itemId.slice(6); const log=getSupplementLog(today);
    log[id]=!log[id]; setSupplementLog(today,log);
  } else if(itemId.startsWith('sc__')){
    const id=itemId.slice(4); const log=getSelfCareLog(today);
    log[id]=!log[id]; setSelfCareLog(today,log);
  } else if(itemId.startsWith('clean__')){
    const id=itemId.slice(7); const log=getCleaningLog(today);
    log[id]=!log[id]; setCleaningLog(today,log);
  } else if(itemId.startsWith('ex__')){
    const i=parseInt(itemId.slice(4));
    const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayDay=dayNames[new Date().getDay()];
    const wk=getWeekKey(0); const ch=getExChecked(wk);
    const ck=todayDay+'__'+i; ch[ck]=!ch[ck]; setExChecked(wk,ch);
  }
  renderDashboard();
}


// ════════════════════════════════════════
function dietChangeDay(d){dietOffset+=d;renderDiet();}
function dietGoToToday(){dietOffset=0;renderDiet();}
function journalGoToToday(){journalOffset=0;renderJournal();}
function exChangeDay(d){
  exOffset+=d;
  if(exOffset>0) exOffset=0;
  const _d=new Date();_d.setDate(_d.getDate()+exOffset);
  activeExDay=EX_DAYS[_d.getDay()===0?6:_d.getDay()-1];
  renderExercise();
}
function exGoToToday(){exOffset=0;activeExDay=todayName;renderExercise();}

function addWater(){
  const k=dateKey(dietOffset);
  setWater(k,getWater(k)+1);
  renderWaterWidget(k);
  showToast('\uD83D\uDCA7 Bottle #'+getWater(k)+' logged! ('+(getWater(k)*getBottleOz())+'oz)');
}
function undoWater(){
  const k=dateKey(dietOffset);
  setWater(k,Math.max(0,getWater(k)-1));
  renderWaterWidget(k);
}
function renderWaterWidget(k){
  const n=getWater(k);
  const oz=n*getBottleOz();
  const s=getSettings();
  const goalOz=s.waterGoal||0;
  document.getElementById('water-count').innerHTML=n+' <span>bottle'+(n!==1?'s':'')+'</span>';
  document.getElementById('water-oz').textContent=oz+'oz'+(goalOz?' / '+goalOz+'oz goal':'');
  document.getElementById('water-undo').style.display=n>0?'':'none';
  document.getElementById('water-goal-fill').style.width=goalOz?Math.min(100,(oz/goalOz*100))+'%':'0%';
  const wrap=document.getElementById('water-bottles');wrap.innerHTML='';
  for(let i=0;i<Math.min(Math.max(n+1,6),14);i++){
    const ic=document.createElement('span');
    ic.className='bottle-icon'+(i<n?' filled':'');
    ic.textContent='\uD83E\uDD64';
    wrap.appendChild(ic);
  }
}

function renderDiet(){
  const k=dateKey(dietOffset);
  currentDietKey=k;
  document.getElementById('diet-date-display').textContent=fmtDate(dietOffset);
  document.getElementById('diet-today-badge').style.display=dietOffset===0?'':'none';
  const _dbt=document.getElementById('diet-back-today');if(_dbt)_dbt.style.display=dietOffset===0?'none':'';
  const items=getFoods(k);
  const s=getSettings();
  let tCal=0,tP=0,tC=0,tF=0,tCost=0;
  items.forEach(i=>{tCal+=i.cal;tP+=i.p;tC+=i.c;tF+=i.f;tCost+=(i.cost||0);});
  // Summary cards with goal bars
  function setCard(id,val,goal,barId,goalId){
    document.getElementById(id).textContent=val;
    if(goal>0){
      const remaining=goal-val;
      const over=remaining<0;
      document.getElementById(goalId).innerHTML=over
        ? `<span style="color:var(--accent2)">${Math.abs(remaining)} over goal</span>`
        : `<span style="color:var(--muted)">${remaining} to go</span>`;
      document.getElementById(barId).style.width=Math.min(100,(val/goal*100)).toFixed(1)+'%';
    } else {
      document.getElementById(goalId).textContent='Set a goal in Settings';
      document.getElementById(barId).style.width='0%';
    }
  }
  setCard('s-cal',tCal,s.calGoal||0,'s-cal-bar','s-cal-goal');
  setCard('s-prot',tP,s.protGoal||0,'s-prot-bar','s-prot-goal');
  setCard('s-carb',tC,s.carbGoal||0,'s-carb-bar','s-carb-goal');
  setCard('s-fat',tF,s.fatGoal||0,'s-fat-bar','s-fat-goal');
  document.getElementById('s-cost').textContent='$'+tCost.toFixed(2);
  const tk=tP*4+tC*4+tF*9||1;
  document.getElementById('bar-p').style.width=(tP*4/tk*100).toFixed(1)+'%';
  document.getElementById('bar-c').style.width=(tC*4/tk*100).toFixed(1)+'%';
  document.getElementById('bar-f').style.width=(tF*9/tk*100).toFixed(1)+'%';
  renderWaterWidget(k);
  // Meals
  const mc=document.getElementById('meals-container');mc.innerHTML='';
  MEALS.forEach(meal=>{
    const mi=items.filter(i=>i.meal===meal);
    const mCal=mi.reduce((a,i)=>a+i.cal,0);
    const mCost=mi.reduce((a,i)=>a+(i.cost||0),0);
    const mp=[];if(mCal>0)mp.push(mCal+' kcal');if(mCost>0)mp.push('$'+mCost.toFixed(2));
    const sec=document.createElement('div');sec.className='meal-section';
    sec.innerHTML='<div class="meal-header"><span class="meal-name">'+meal+'</span><span class="meal-meta">'+mp.map(p=>'<span>'+p+'</span>').join('')+'</span></div>'
      +(mi.length===0?'<div class="empty-meal">Nothing logged yet</div>'
        :mi.map(item=>{
          const ri=items.indexOf(item);
          const ct=item.cost?'<span class="food-cost-tag">'+fmtCost(item.cost)+'</span>':'';
          return '<div class="food-item"><div class="food-info"><div class="food-name">'+item.name+'</div>'
            +'<div class="food-macros">P:'+item.p+'g &middot; C:'+item.c+'g &middot; F:'+item.f+'g</div></div>'
            +'<div class="food-right">'+ct+'<div class="food-cal">'+item.cal+'<span style="font-size:11px;font-family:DM Sans;color:var(--muted)"> kcal</span></div>'
            +'<button class="del-btn" onclick="delFood(currentDietKey,'+ri+')">&#215;</button></div></div>';
        }).join(''));
    mc.appendChild(sec);
  });
  renderQuickAdds();
}
function quickAdd(q){
  const k=dateKey(dietOffset);const items=getFoods(k);
  items.push({name:q.name,cal:q.cal,p:q.p,c:q.c,f:q.f,cost:q.cost||0,meal:q.meal});
  setFoods(k,items);renderDiet();showToast('\u2713 '+q.name+' added!');
}
function addFood(){
  const name=document.getElementById('f-name').value.trim();
  if(!name){document.getElementById('f-name').focus();return;}
  const item={name,
    cal:parseInt(document.getElementById('f-cal').value)||0,
    p:parseInt(document.getElementById('f-prot').value)||0,
    c:parseInt(document.getElementById('f-carb').value)||0,
    f:parseInt(document.getElementById('f-fat').value)||0,
    cost:parseFloat(document.getElementById('f-cost').value)||0,
    meal:document.getElementById('f-meal').value};
  const k=dateKey(dietOffset);const items=getFoods(k);
  items.push(item);setFoods(k,items);
  ['f-name','f-cal','f-prot','f-carb','f-fat','f-cost'].forEach(id=>document.getElementById(id).value='');
  renderDiet();showToast('\u2713 Food logged!');
}
function delFood(k,idx){const items=getFoods(k);items.splice(idx,1);setFoods(k,items);renderDiet();}

// Quick adds
function toggleEditMode(){
  editMode=!editMode;
  const t=document.getElementById('edit-toggle');
  t.textContent=editMode?'\u2713 Done':'\u270E Customize';
  t.classList.toggle('active',editMode);
  document.getElementById('new-quick-form').classList.toggle('open',editMode);
  renderQuickAdds();
}
function renderQuickAdds(){
  const qa=document.getElementById('quick-adds');qa.innerHTML='';
  (getQuickList()||DEFAULT_QUICK.map(q=>({...q}))).forEach((q,idx)=>{
    const btn=document.createElement('button');
    if(editMode){
      btn.className='quick-btn delete-mode';
      btn.innerHTML='<span style="flex:1">'+q.name+'</span>'
        +'<span style="font-size:10px;opacity:.7" onclick="event.stopPropagation();openEditModal('+idx+')">\u270E</span>'
        +'<span class="del-x" onclick="event.stopPropagation();removeQuick('+idx+')">\u2715</span>';
      btn.onclick=()=>openEditModal(idx);
    } else {
      btn.className='quick-btn';btn.textContent=q.name;
      const c=q.cost?' \u00b7 '+fmtCost(q.cost):'';
      btn.title=q.cal+' kcal \u00b7 P:'+q.p+'g C:'+q.c+'g F:'+q.f+'g'+c;
      btn.onclick=()=>quickAdd(q);
    }
    qa.appendChild(btn);
  });
}
function removeQuick(idx){const l=getQuickList()||DEFAULT_QUICK.map(q=>({...q}));const r=l.splice(idx,1)[0];saveQuickList(l);renderQuickAdds();showToast('\u2715 '+r.name+' removed');}
function saveNewQuick(){
  const name=document.getElementById('nq-name').value.trim();
  if(!name){document.getElementById('nq-name').focus();return;}
  const item={name,cal:parseInt(document.getElementById('nq-cal').value)||0,p:parseInt(document.getElementById('nq-prot').value)||0,
    c:parseInt(document.getElementById('nq-carb').value)||0,f:parseInt(document.getElementById('nq-fat').value)||0,
    cost:parseFloat(document.getElementById('nq-cost').value)||0,meal:document.getElementById('nq-meal').value};
  const l=getQuickList()||DEFAULT_QUICK.map(q=>({...q}));l.push(item);saveQuickList(l);
  ['nq-name','nq-cal','nq-prot','nq-carb','nq-fat','nq-cost'].forEach(id=>document.getElementById(id).value='');
  renderQuickAdds();showToast('\u2713 "'+name+'" saved!');
}
function openEditModal(idx){
  editModalIdx=idx;const q=getQuickList()[idx];
  document.getElementById('eq-name').value=q.name;document.getElementById('eq-cal').value=q.cal;
  document.getElementById('eq-prot').value=q.p;document.getElementById('eq-carb').value=q.c;
  document.getElementById('eq-fat').value=q.f;document.getElementById('eq-cost').value=q.cost||'';
  document.getElementById('eq-meal').value=q.meal;
  document.getElementById('edit-modal').classList.add('open');
}
function closeEditModal(){document.getElementById('edit-modal').classList.remove('open');}
function saveEditModal(){
  if(editModalIdx<0)return;
  const l=getQuickList()||DEFAULT_QUICK.map(q=>({...q}));
  l[editModalIdx]={name:document.getElementById('eq-name').value.trim()||l[editModalIdx].name,
    cal:parseInt(document.getElementById('eq-cal').value)||0,p:parseInt(document.getElementById('eq-prot').value)||0,
    c:parseInt(document.getElementById('eq-carb').value)||0,f:parseInt(document.getElementById('eq-fat').value)||0,
    cost:parseFloat(document.getElementById('eq-cost').value)||0,meal:document.getElementById('eq-meal').value};
  saveQuickList(l);closeEditModal();renderQuickAdds();showToast('\u2713 Quick add updated!');
}

// ════════════════════════════════════════
// EXERCISE TAB
// ════════════════════════════════════════
function renderExercise(){
  // Date nav
  const _exEl=document.getElementById('ex-date-display');
  if(_exEl) _exEl.textContent=fmtDate(exOffset);
  const _exBadge=document.getElementById('ex-today-badge');
  if(_exBadge) _exBadge.style.display=exOffset===0?'':'none';
  const _exBt=document.getElementById('ex-back-today');
  if(_exBt) _exBt.style.display=exOffset===0?'none':'';
  // Day tabs
  const tabs=document.getElementById('ex-day-tabs');tabs.innerHTML='';
  EX_DAYS.forEach(day=>{
    const b=document.createElement('button');
    b.className='ex-tab'+(day===activeExDay?' active':'');
    b.textContent=day===todayName?day+' \u2605':day;
    b.onclick=()=>{
      const _td=new Date().getDay()===0?6:new Date().getDay()-1;
      const _diff=EX_DAYS.indexOf(day)-_td;
      exOffset=_diff>0?0:_diff;
      activeExDay=day;
      renderExercise();
    };
    tabs.appendChild(b);
  });
  renderExCards();
  renderCustomWorkoutList();
  renderPRs();
}
function getWeekKey(offset){
  const d=new Date();if(offset)d.setDate(d.getDate()+offset);
  const jan4=new Date(d.getFullYear(),0,4);
  const wk=Math.ceil(((d-jan4)/86400000+jan4.getDay()+1)/7);
  return d.getFullYear()+'-W'+String(wk).padStart(2,'0');
}
function renderExCards(){
  const container=document.getElementById('ex-cards');container.innerHTML='';
  const plan=WORKOUT_PLAN[activeExDay];
  const wk=getWeekKey(exOffset);const checked=getExChecked(wk);
  if(plan.rest){
    container.innerHTML='<div class="ex-rest-day"><div class="emoji">\uD83D\uDE34</div><h2>Rest &amp; Recover</h2><p>Sleep well, eat well, hydrate.</p></div>';
    document.getElementById('ex-progress-label').textContent='\u2014';
    document.getElementById('ex-bar-fill').style.width='0%';
    return;
  }
  // Built-in tasks
  const allTasks=[...plan.tasks];
  // Check if there are custom workouts assigned to this day
  getCustomWorkouts().filter(w=>w.assignedDay===activeExDay).forEach(w=>{
    w.exercises.forEach(ex=>{allTasks.push({name:ex.name,meta:w.name,tag:ex.tag||'custom',tagLabel:ex.tag==='custom'?'Custom':ex.tag.charAt(0).toUpperCase()+ex.tag.slice(1),custom:true});});
  });
  const total=allTasks.length;
  const done=allTasks.filter((_,i)=>checked[activeExDay+'__'+i]).length;
  document.getElementById('ex-progress-label').textContent=done+' / '+total;
  document.getElementById('ex-bar-fill').style.width=(done/total*100)+'%';
  if(done===total&&total>0){
    container.innerHTML='<div class="ex-celebration"><div class="emoji">\uD83C\uDF89</div><h2>Day Complete!</h2><p>Crushed it. Rest up and come back stronger.</p></div>';
    return;
  }
  const st=document.createElement('div');st.className='ex-section-title';st.textContent=plan.label;container.appendChild(st);
  allTasks.forEach((task,i)=>{
    const ck=activeExDay+'__'+i;const isDone=!!checked[ck];
    const card=document.createElement('div');card.className='ex-card'+(isDone?' done':'');
    card.innerHTML='<div class="ex-check"></div><div class="ex-task-info"><div class="ex-task-name">'+task.name+'</div><div class="ex-task-meta">'+task.meta+'</div></div>'
      +'<a class="ex-yt-btn" href="'+getExerciseYouTubeUrl(task.name)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Watch tutorial on YouTube">▶</a>'
      +'<span class="ex-tag ex-tag-'+task.tag+'">'+task.tagLabel+'</span>';
    card.onclick=()=>{const ch=getExChecked(getWeekKey(exOffset));ch[ck]=!ch[ck];setExChecked(getWeekKey(exOffset),ch);renderExCards()};
    container.appendChild(card);
  });
}
function resetExDay(){
  const wk=getWeekKey(exOffset);const ch=getExChecked(wk);
  const plan=WORKOUT_PLAN[activeExDay];
  if(plan.tasks) plan.tasks.forEach((_,i)=>{delete ch[activeExDay+'__'+i];});
  setExChecked(wk,ch);renderExCards();
}

// ── Weight widget ──
function weightBMIBlock(weightVal){
  const s=getSettings();
  if(!weightVal||(!s.heightFt&&!s.heightIn)) return '';
  const bmi=calcBMI(weightVal,s.heightFt||0,s.heightIn||0);
  if(!bmi) return '';
  const cat=bmiCategory(bmi);
  return '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">'
    +'<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">BMI</div>'
    +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    +'<div style="font-family:Bebas Neue;font-size:38px;line-height:1;color:'+cat.color+'">'+bmi.toFixed(1)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:'+cat.color+'">'+cat.label+'</div>'
    +'</div>'
    +'<div style="margin-top:8px;height:5px;border-radius:99px;background:var(--border);overflow:hidden;position:relative">'
    +'<div style="position:absolute;left:0;top:0;height:100%;width:'+Math.min(100,Math.max(0,((bmi-10)/30)*100)).toFixed(1)+'%;background:'+cat.color+';border-radius:99px;transition:width .4s"></div>'
    +'<div style="position:absolute;left:'+((8.5/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:1px;background:var(--muted)"></div>'
    +'<div style="position:absolute;left:'+((15/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:1px;background:var(--muted)"></div>'
    +'<div style="position:absolute;left:'+((20/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:1px;background:var(--muted)"></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:3px">'
    +'<span>Underweight</span><span>Healthy</span><span>Overweight</span><span>Obese</span>'
    +'</div>'
    +'</div>';
}
function renderWeightWidget(){
  const ws=document.getElementById('weight-section');
  const wc=document.getElementById('weight-content');
  if(!ws)return;
  const k=dateKey(0);currentWeightKey=k;
  const existing=getWeight(k);
  if(existing){
    wc.innerHTML='<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">'
      +'<div class="weight-val">'+existing+'</div><span class="weight-unit"> lbs</span></div>'
      +'<button class="weight-save-btn" onclick="editWeightPrompt()">Edit</button>'
      +weightBMIBlock(existing);
  } else {
    wc.innerHTML='<div style="margin-bottom:10px"><label>Today weight (optional)</label>'
      +'<input type="number" id="weight-input" placeholder="e.g. 185.5" min="50" max="500" step="0.1" style="max-width:180px;margin-top:4px"></div>'
      +'<button class="weight-save-btn" onclick="saveWeight()">Save Weight</button>';
  }
}
function saveWeight(){
  const v=parseFloat(document.getElementById('weight-input').value);
  if(!v||v<50){showToast('Enter a valid weight');return;}
  setWeight(currentWeightKey,v);renderWeightWidget();showToast('\u2713 Weight saved: '+v+' lbs');
}
function editWeightPrompt(){
  const wc=document.getElementById('weight-content');
  wc.innerHTML='<div style="margin-bottom:10px"><label>Update weight</label>'
    +'<input type="number" id="weight-input" value="'+getWeight(currentWeightKey)+'" min="50" max="500" step="0.1" style="max-width:180px;margin-top:4px"></div>'
    +'<button class="weight-save-btn" onclick="saveWeight()">Save</button>';
}

// ── Custom workout builder ──
function toggleWorkoutBuilder(){
  const f=document.getElementById('new-workout-form');
  const open=f.classList.toggle('open');
  document.getElementById('open-builder-btn').textContent=open?'Cancel':'+ Create New Workout';
}
function addExInput(){
  const list=document.getElementById('ex-input-list');
  const row=document.createElement('div');row.className='ex-input-row';
  row.innerHTML='<input type="text" class="ex-input" placeholder="Exercise name + sets/reps">'
    +'<select class="ex-tag-select" style="width:90px;font-size:11px"><option value="strength">Strength</option>'
    +'<option value="cardio">Cardio</option><option value="warm">Warm-up</option><option value="cool">Cool-down</option></select>'
    +'<button class="del-btn" onclick="removeExInput(this)">&#215;</button>';
  list.appendChild(row);
}
function removeExInput(btn){
  const rows=document.querySelectorAll('.ex-input-row');
  if(rows.length>1)btn.parentElement.remove();
}
function saveCustomWorkout(){
  const name=document.getElementById('wk-name').value.trim();
  if(!name){document.getElementById('wk-name').focus();return;}
  const exercises=[];
  document.querySelectorAll('.ex-input-row').forEach(row=>{
    const n=row.querySelector('.ex-input').value.trim();
    const t=row.querySelector('.ex-tag-select').value;
    if(n) exercises.push({name:n,tag:t});
  });
  if(exercises.length===0){showToast('Add at least one exercise');return;}
  const workouts=getCustomWorkouts();
  workouts.push({id:Date.now(),name,exercises,assignedDay:null});
  saveCustomWorkouts(workouts);
  document.getElementById('wk-name').value='';
  document.querySelectorAll('.ex-input').forEach((inp,i)=>{if(i>0)inp.parentElement.remove();else inp.value='';});
  toggleWorkoutBuilder();
  renderCustomWorkoutList();
  showToast('\u2713 Workout "'+name+'" saved!');
}
function renderCustomWorkoutList(){
  const list=document.getElementById('custom-workout-list');list.innerHTML='';
  const workouts=getCustomWorkouts();
  if(workouts.length===0){
    list.innerHTML='<div style="font-size:12px;color:var(--muted);font-style:italic;padding:4px 0">No custom workouts yet.</div>';
    return;
  }
  workouts.forEach((w,idx)=>{
    const item=document.createElement('div');item.className='custom-workout-item';
    const assigned=w.assignedDay?(' <span style="color:var(--accent);font-size:11px">\u2192 '+w.assignedDay+'</span>'):'';
    item.innerHTML='<div class="cwi-header">'
      +'<div class="cwi-name">'+w.name+assigned+'</div>'
      +'<div class="cwi-actions">'
      +'<select class="cwi-btn" style="width:110px;font-size:11px" onchange="assignWorkoutDay('+idx+',this.value)">'
      +'<option value="">Assign day...</option>'
      +EX_DAYS.map(d=>'<option value="'+d+'"'+(w.assignedDay===d?' selected':'')+'>'+d+'</option>').join('')
      +'</select>'
      +'<button class="cwi-btn danger" onclick="deleteCustomWorkout('+idx+')">Delete</button>'
      +'</div></div>'
      +'<div class="cwi-exercises">'+w.exercises.map(e=>'<span class="cwi-ex-tag">'+e.name+'</span>').join('')+'</div>';
    list.appendChild(item);
  });
}
function assignWorkoutDay(idx,day){
  const workouts=getCustomWorkouts();
  workouts[idx].assignedDay=day||null;
  saveCustomWorkouts(workouts);renderCustomWorkoutList();renderExCards();
  if(day) showToast('\u2713 Assigned to '+day);
}
function deleteCustomWorkout(idx){
  const workouts=getCustomWorkouts();const name=workouts[idx].name;
  workouts.splice(idx,1);saveCustomWorkouts(workouts);
  renderCustomWorkoutList();renderExCards();showToast('\u2715 "'+name+'" deleted');
}

// ════════════════════════════════════════
// JOURNAL TAB
// ════════════════════════════════════════
function journalChangeDay(d){journalOffset+=d;renderJournal();}
function setMood(v){currentMood=v;document.querySelectorAll('.mood-btn').forEach(b=>b.classList.toggle('selected',parseInt(b.dataset.mood)===v));}
function setSleepQ(v){currentSleepQ=v;document.querySelectorAll('.sq-btn').forEach(b=>b.classList.toggle('selected',parseInt(b.dataset.q)===v));}

function calcSleepHours(bed,wake){
  if(!bed||!wake)return null;
  const [bh,bm]=bed.split(':').map(Number);
  const [wh,wm]=wake.split(':').map(Number);
  let mins=(wh*60+wm)-(bh*60+bm);
  if(mins<0)mins+=1440;
  return mins;
}
function updateSleepDuration(){
  const bed=document.getElementById('sleep-bed').value;
  const wake=document.getElementById('sleep-wake').value;
  const mins=calcSleepHours(bed,wake);
  if(mins!==null){
    document.getElementById('sleep-hours').textContent=Math.floor(mins/60)+'h '+(mins%60)+'m';
  }
}
function saveSleep(){
  const k=dateKey(sleepOffset);
  const bed=document.getElementById('sleep-bed').value;
  const wake=document.getElementById('sleep-wake').value;
  const mins=calcSleepHours(bed,wake);
  setSleep(k,{bed,wake,mins:mins||0,quality:currentSleepQ});
  showToast('\u2713 Sleep saved!');
}
function saveJournal(){
  const k=dateKey(journalOffset);
  setJournalData(k,{text:document.getElementById('journal-text').value,mood:currentMood});
  const s=document.getElementById('journal-saved');
  s.classList.add('show');setTimeout(()=>s.classList.remove('show'),2000);
}
function renderJournal(){
  const k=dateKey(journalOffset);
  document.getElementById('journal-date-display').textContent=fmtDate(journalOffset);
  document.getElementById('journal-today-badge').style.display=journalOffset===0?'':'none';
  const _jbt=document.getElementById('journal-back-today');if(_jbt)_jbt.style.display=journalOffset===0?'none':'';
  const jd=getJournalData(k);
  document.getElementById('journal-text').value=jd.text||'';
  currentMood=jd.mood||0;
  document.querySelectorAll('.mood-btn').forEach(b=>b.classList.toggle('selected',parseInt(b.dataset.mood)===currentMood));
}

// ════════════════════════════════════════
// CALENDAR TAB
// ════════════════════════════════════════
const METRIC_COLORS={calories:'var(--accent)',protein:'var(--protein)',carbs:'var(--carbs)',fat:'var(--fat)',water:'var(--water)',cost:'var(--cost)',sleep:'var(--sleep)',weight:'var(--accent2)',bmi:'var(--journal)'};

function setCalMetric(m){
  calMetric=m;
  document.querySelectorAll('.cal-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.metric===m));
  renderCalendar();
}
function calChangeMonth(d){
  calMonth+=d;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  renderCalendar();
}
function getMetricVal(k){
  const items=getFoods(k);
  if(calMetric==='calories') return items.reduce((a,i)=>a+i.cal,0)||null;
  if(calMetric==='protein')  return items.reduce((a,i)=>a+i.p,0)||null;
  if(calMetric==='carbs')    return items.reduce((a,i)=>a+i.c,0)||null;
  if(calMetric==='fat')      return items.reduce((a,i)=>a+i.f,0)||null;
  if(calMetric==='cost'){const v=items.reduce((a,i)=>a+(i.cost||0),0);return v||null;}
  if(calMetric==='water'){const v=getWater(k)*getBottleOz();return v||null;}
  if(calMetric==='sleep'){const sl=getSleep(k);return sl&&sl.mins?sl.mins:null;}
  if(calMetric==='weight') return getWeight(k)||null;
  if(calMetric==='bmi') return getBMIForKey(k)||null;
  return null;
}
function fmtMetricVal(v){
  if(calMetric==='calories') return Math.round(v)+'';
  if(calMetric==='protein'||calMetric==='carbs'||calMetric==='fat') return Math.round(v)+'g';
  if(calMetric==='cost') return '$'+v.toFixed(2);
  if(calMetric==='water') return v+'oz';
  if(calMetric==='sleep'){const h=Math.floor(v/60);const m=v%60;return h+'h'+(m?m+'m':'');}
  if(calMetric==='weight') return v+'lbs';
  if(calMetric==='bmi') return v.toFixed(1);
  return v+'';
}


// ════════════════════════════════════════
// CALENDAR EVENTS
// ════════════════════════════════════════
function getCalendarEvents() { return lsGetSync('calEvents') || {}; }
function setCalendarEvents(v) { lsSet('calEvents', v); }
function getCalendarEventsForDay(k) {
  const all = getCalendarEvents();
  return all[k] || [];
}
function addCalendarEvent(k, event) {
  const all = getCalendarEvents();
  if (!all[k]) all[k] = [];
  all[k].push({ id: 'ev' + Date.now(), ...event });
  setCalendarEvents(all);
}
function deleteCalendarEvent(k, id) {
  const all = getCalendarEvents();
  if (all[k]) all[k] = all[k].filter(e => e.id !== id);
  setCalendarEvents(all);
}
const CAL_EVENT_TYPES = [
  { key: 'doctor',    label: "Doctor's Appt",  icon: '🩺', color: '#f87171' },
  { key: 'dentist',   label: 'Dentist',          icon: '🦷', color: '#60a5fa' },
  { key: 'gym',       label: 'Gym / Class',      icon: '🏋', color: '#4ade80' },
  { key: 'therapy',   label: 'Therapy',          icon: '🧠', color: '#a78bfa' },
  { key: 'birthday',  label: 'Birthday',         icon: '🎂', color: '#fb923c' },
  { key: 'reminder',  label: 'Reminder',         icon: '🔔', color: '#fbbf24' },
  { key: 'other',     label: 'Other',            icon: '📅', color: '#94a3b8' },
];
function getCalEventStyle(type) {
  return CAL_EVENT_TYPES.find(t => t.key === type) || CAL_EVENT_TYPES[CAL_EVENT_TYPES.length - 1];
}

let addEventModalDay = null;
function openAddEventModal(k) {
  addEventModalDay = k;
  let modal = document.getElementById('add-event-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-event-modal';
    modal.className = 'ai-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="ai-modal" style="max-width:400px">
    <div class="ai-modal-header">
      <div class="ai-modal-title">📅 Add Event — ${fmtDateFromKey(k)}</div>
      <button class="ai-modal-close" onclick="document.getElementById('add-event-modal').classList.remove('open')">✕</button>
    </div>
    <div class="ai-modal-body">
      <div style="margin-bottom:12px">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700">Event Type</label>
        <div class="cal-event-type-grid" id="cal-event-type-grid">
          ${CAL_EVENT_TYPES.map(t => `<button class="cal-event-type-btn" data-type="${t.key}" onclick="selectCalEventType('${t.key}')" style="--ev-color:${t.color}">${t.icon} ${t.label}</button>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700">Title</label>
        <input type="text" id="cal-event-title" placeholder="e.g. Dr. Smith checkup, Yoga class…" style="width:100%;background:var(--input-bg);border:1px solid var(--border);color:var(--text);font-family:DM Sans;font-size:14px;padding:9px 11px;border-radius:8px;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="margin-bottom:4px">
        <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700">Time (optional)</label>
        <input type="time" id="cal-event-time" style="margin-top:4px;background:var(--input-bg);border:1px solid var(--border);color:var(--text);font-family:DM Sans;font-size:14px;padding:9px 11px;border-radius:8px">
      </div>
    </div>
    <div class="ai-modal-footer">
      <button class="settings-save-btn" style="background:var(--card);border:1px solid var(--border);color:var(--text);margin:0" onclick="document.getElementById('add-event-modal').classList.remove('open')">Cancel</button>
      <button class="settings-save-btn" style="margin:0" id="save-event-btn" onclick="saveCalendarEvent()">Add Event</button>
    </div>
  </div>`;
  modal.classList.add('open');
  // Select first type by default
  setTimeout(() => selectCalEventType('doctor'), 10);
}

let _selectedCalEventType = 'doctor';
function selectCalEventType(type) {
  _selectedCalEventType = type;
  document.querySelectorAll('.cal-event-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

function saveCalendarEvent() {
  if (!addEventModalDay) return;
  const title = (document.getElementById('cal-event-title')?.value || '').trim();
  const time  = document.getElementById('cal-event-time')?.value || '';
  const type  = _selectedCalEventType || 'other';
  if (!title) { showToast('Enter a title for the event'); return; }
  addCalendarEvent(addEventModalDay, { title, time, type });
  document.getElementById('add-event-modal')?.classList.remove('open');
  renderCalendar();
  showToast('✓ Event added!');
}

function renderCalendar(){
  const label=new Date(calYear,calMonth,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.getElementById('cal-month-label').textContent=label.toUpperCase();
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  ['SUN','MON','TUE','WED','THU','FRI','SAT'].forEach(d=>{
    const h=document.createElement('div');h.className='cal-day-header';h.textContent=d;grid.appendChild(h);
  });
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayKey=dateKeyFromDate(new Date());
  const vals=[];
  for(let d=1;d<=daysInMonth;d++){const k=new Date(calYear,calMonth,d).toISOString().split('T')[0];const v=getMetricVal(k);if(v)vals.push(v);}
  const maxVal=vals.length?Math.max(...vals):1;
  // Get period settings for this month (if enabled)
  const s3=getSettings();
  const periodEnabled=!!s3.periodEnabled;
  const periodSettings=periodEnabled?getPeriodSettings():null;
  for(let i=0;i<firstDay;i++){const e=document.createElement('div');e.className='cal-day empty';grid.appendChild(e);}
  for(let d=1;d<=daysInMonth;d++){
    const k=new Date(calYear,calMonth,d).toISOString().split('T')[0];
    const v=getMetricVal(k);const isToday=k===todayKey;
    const events=getCalendarEventsForDay(k);
    // Period phase for this day
    let periodDot='';
    if(periodEnabled&&periodSettings&&periodSettings.lastStart){
      const plog=getPeriodLog(k);
      const ps=periodSettings;
      const lastStart=new Date(ps.lastStart+'T12:00:00');
      const thisDay=new Date(k+'T12:00:00');
      const daysSince=Math.floor((thisDay-lastStart)/86400000);
      const cycleDay=((daysSince%ps.cycleLength)+ps.cycleLength)%ps.cycleLength;
      if(plog&&plog.flow&&plog.flow!=='none'){
        const fc={spotting:'#fda4af',light:'#fb7185',medium:'#f43f5e',heavy:'#be123c'};
        periodDot='<div class="cal-period-dot" style="background:'+(fc[plog.flow]||'#fb7185')+'"></div>';
      } else if(cycleDay<(ps.periodLength||5)){
        periodDot='<div class="cal-period-dot" style="background:#fb7185;opacity:0.4"></div>';
      } else if(cycleDay<(ps.periodLength||5)+7){
        periodDot='<div class="cal-period-dot" style="background:#a78bfa;opacity:0.4"></div>';
      } else if(cycleDay>ps.cycleLength-5){
        periodDot='<div class="cal-period-dot" style="background:#f59e0b;opacity:0.4"></div>';
      }
    }
    // Events dots
    let eventsDots='';
    if(events.length>0){
      eventsDots='<div class="cal-events-row">';
      events.slice(0,3).forEach(ev=>{
        const st=getCalEventStyle(ev.type);
        eventsDots+='<div class="cal-event-dot" style="background:'+st.color+'" title="'+ev.title+'"></div>';
      });
      if(events.length>3) eventsDots+='<div class="cal-event-dot cal-event-dot-more">+</div>';
      eventsDots+='</div>';
    }
    const cell=document.createElement('div');
    cell.className='cal-day'+(isToday?' today':'')+(v?' has-data':'')+(events.length?' has-events':'');
    const color=METRIC_COLORS[calMetric];
    let inner='<div class="cal-day-top"><div class="cal-day-num">'+d+'</div>'+periodDot+'</div>';
    if(v){
      inner+='<div class="cal-val" style="color:'+color+'">'+fmtMetricVal(v)+'</div>';
      inner+='<div class="cal-day-bar" style="background:'+color+';opacity:.5;width:'+(v/maxVal*100).toFixed(0)+'%"></div>';
    }
    inner+=eventsDots;
    cell.innerHTML=inner;
    cell.onclick=()=>openDayPopup(k);
    grid.appendChild(cell);
  }
}
function openDayPopup(k){
  const s2=getSettings();
  popupDateKey=k;
  const items=getFoods(k);
  const tCal=items.reduce((a,i)=>a+i.cal,0);
  const tP=items.reduce((a,i)=>a+i.p,0);
  const tC=items.reduce((a,i)=>a+i.c,0);
  const tF=items.reduce((a,i)=>a+i.f,0);
  const tCost=items.reduce((a,i)=>a+(i.cost||0),0);
  const water=getWater(k)*getBottleOz();
  const weight=getWeight(k);
  const sl=getSleep(k);
  const jd=getJournalData(k);
  const MOODS=['','\uD83D\uDE2D','\uD83D\uDE14','\uD83D\uDE10','\uD83D\uDE00','\uD83E\uDD29'];
  document.getElementById('popup-date').textContent=fmtDateFromKey(k);
  document.getElementById('popup-title').textContent=tCal>0?tCal+' KCAL':'No food logged';
  const stats=[
    {l:'Protein',v:tP+'g',c:'var(--protein)'},{l:'Carbs',v:tC+'g',c:'var(--carbs)'},
    {l:'Fat',v:tF+'g',c:'var(--fat)'},{l:'Water',v:water+'oz',c:'var(--water)'},
    {l:'Spent',v:'$'+tCost.toFixed(2),c:'var(--cost)'},
    {l:'Weight',v:weight?(weight+' lbs'):'\u2014',c:'var(--accent2)'},
    {l:'BMI',v:(()=>{const b=calcBMI(weight,s2.heightFt||0,s2.heightIn||0);return b?(b.toFixed(1)+' — '+bmiCategory(b).label):'\u2014';})(),c:'var(--journal)'},
    {l:'Sleep',v:sl?(Math.floor(sl.mins/60)+'h '+(sl.mins%60)+'m'):'\u2014',c:'var(--sleep)'},
    {l:'Mood',v:jd.mood?(MOODS[jd.mood]+' '+jd.mood+'/5'):'\u2014',c:'var(--journal)'},
  ];
  document.getElementById('popup-stats').innerHTML=stats.map(s=>'<div class="popup-stat"><div class="ps-label">'+s.l+'</div><div class="ps-val" style="color:'+s.c+'">'+s.v+'</div></div>').join('');
  if(jd.text){
    document.getElementById('popup-stats').innerHTML+=
      `<div class="popup-stat" style="grid-column:span 2"><div class="ps-label">Journal</div><div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5">${jd.text.slice(0,100)+(jd.text.length>100?'...':'')}</div></div>`;
  }
  // Workout completions for this day
  const _pd=new Date(k+'T12:00:00');
  const _dow=_pd.getDay()===0?6:_pd.getDay()-1;
  const _dayName=EX_DAYS[_dow];
  const _plan=WORKOUT_PLAN[_dayName];
  if(_plan&&!_plan.rest){
    const _j4=new Date(_pd.getFullYear(),0,4);
    const _wn=Math.ceil(((_pd-_j4)/86400000+_j4.getDay()+1)/7);
    const _wk=_pd.getFullYear()+'-W'+String(_wn).padStart(2,'0');
    const _ch=getExChecked(_wk);
    const _total=_plan.tasks.length;
    const _done=_plan.tasks.filter((_t,_i)=>_ch[_dayName+'__'+_i]).length;
    if(_total>0){
      let _wHtml='<div class="popup-stat" style="grid-column:span 2"><div class="ps-label">Workout \u2014 '+_plan.label+'</div><div style="margin-top:5px">';
      _plan.tasks.forEach((_t,_i)=>{
        const _checked=!!_ch[_dayName+'__'+_i];
        _wHtml+='<div style="font-size:11px;display:flex;align-items:center;gap:6px;padding:2px 0">'
          +'<span style="color:'+(_checked?'var(--cost)':'var(--muted)')+'">'+(_checked?'\u2713':'\u25cb')+'</span>'
          +'<span style="color:'+(_checked?'var(--text)':'var(--muted)')+'">'+_t.name+'</span></div>';
      });
      _wHtml+='<div style="font-size:10px;color:var(--muted);margin-top:5px;letter-spacing:1px">'+_done+' / '+_total+' completed</div></div></div>';
      document.getElementById('popup-stats').innerHTML+=_wHtml;
    }
  }
  // Show calendar events for this day
  const calEvs = getCalendarEventsForDay(k);
  const evContainer = document.getElementById('popup-events');
  if (evContainer) {
    let evHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:700">Events</div>
      <button onclick="openAddEventModal('${k}')" style="background:none;border:1px solid var(--border);color:var(--accent);font-family:DM Sans;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;cursor:pointer">+ Add</button>
    </div>`;
    if (calEvs.length === 0) {
      evHtml += `<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0">No events. Tap + Add to create one.</div>`;
    } else {
      calEvs.forEach(ev => {
        const st = getCalEventStyle(ev.type);
        evHtml += `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg);margin-bottom:6px;border-left:3px solid ${st.color}">
          <span style="font-size:18px">${st.icon}</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${ev.title}</div>
          ${ev.time?`<div style="font-size:11px;color:var(--muted)">${ev.time} · ${st.label}</div>`:`<div style="font-size:11px;color:var(--muted)">${st.label}</div>`}
          </div>
          <button onclick="deleteCalendarEvent('${k}','${ev.id}');openDayPopup('${k}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:2px 4px">✕</button>
        </div>`;
      });
    }
    evContainer.innerHTML = evHtml;
  }
  document.getElementById('day-popup').classList.add('open');
}
function closePopup(){document.getElementById('day-popup').classList.remove('open');}
function popupChangeDay(d){
  if(!popupDateKey) return;
  const cur = new Date(popupDateKey+'T12:00:00');
  cur.setDate(cur.getDate()+d);
  const newKey = cur.toISOString().split('T')[0];
  // Don't go past today
  if(cur > new Date()) return;
  openDayPopup(newKey);
}
function goToDayView(){
  if(!popupDateKey) return;
  closePopup();
  dayviewKey = popupDateKey;
  openDayView(dayviewKey);
}
function openDayView(k){
  dayviewKey = k;
  // Show day view panel, hide all others
  document.querySelectorAll('.panel').forEach(p=>{ p.classList.remove('active'); p.style.display=''; });
  const dvPanel = document.getElementById('panel-dayview');
  dvPanel.classList.add('active');
  dvPanel.style.display = '';
  // Update nav tabs to show none active
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  renderDayView(k);
}
function backToHistory(){
  document.querySelectorAll('.panel').forEach(p=>{ p.classList.remove('active'); p.style.display=''; });
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  switchTab('calendar');
}
function dayviewChangeDay(d){
  const cur = new Date(dayviewKey+'T12:00:00');
  cur.setDate(cur.getDate()+d);
  if(cur > new Date()) return; // don't go past today
  dayviewKey = cur.toISOString().split('T')[0];
  renderDayView(dayviewKey);
}
function renderDayView(k){
  dayviewKey = k;
  const dt = new Date(k+'T12:00:00');
  const fmtd = dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  document.getElementById('dayview-date-display').textContent = fmtd;

  const s = getSettings();
  const foods = getFoods(k);
  const water = getWater(k);
  const weight = getWeight(k);
  const sleep = getSleep(k);
  const jd = getJournalData(k);
  const bmi = weight ? calcBMI(weight, s.heightFt||0, s.heightIn||0) : null;
  const bmiCat = bmi ? bmiCategory(bmi) : null;

  // Macros
  const tCal = foods.reduce((a,i)=>a+i.cal,0);
  const tP   = foods.reduce((a,i)=>a+i.p,0);
  const tC   = foods.reduce((a,i)=>a+i.c,0);
  const tF   = foods.reduce((a,i)=>a+i.f,0);
  const tCost= foods.reduce((a,i)=>a+(i.cost||0),0);

  // Workout
  const dow = dt.getDay()===0?6:dt.getDay()-1;
  const dayName = EX_DAYS[dow];
  const plan = WORKOUT_PLAN[dayName];
  const j4 = new Date(dt.getFullYear(),0,4);
  const wkNum = Math.ceil(((dt-j4)/86400000+j4.getDay()+1)/7);
  const wkKey = dt.getFullYear()+'-W'+String(wkNum).padStart(2,'0');
  const exChecked = getExChecked(wkKey);

  let html = '';

  // ── Nutrition ──
  html += '<div class="dv-section"><div class="dv-section-title">🍽 Nutrition</div>';
  html += '<div class="dv-stat-grid">';
  html += dvStat('Calories', tCal ? tCal+'<span class="dv-unit"> kcal</span>' : '—', 'var(--accent)');
  html += dvStat('Protein',  tP   ? tP+'<span class="dv-unit"> g</span>'    : '—', 'var(--protein)');
  html += dvStat('Carbs',    tC   ? tC+'<span class="dv-unit"> g</span>'    : '—', 'var(--carbs)');
  html += dvStat('Fat',      tF   ? tF+'<span class="dv-unit"> g</span>'    : '—', 'var(--fat)');
  html += dvStat('Spent',    tCost? '$'+tCost.toFixed(2)                    : '—', 'var(--cost)');
  html += dvStat('Water',    water? (water*getBottleOz())+'<span class="dv-unit"> oz</span>': '—', 'var(--water)');
  html += '</div>';
  if(foods.length > 0){
    html += '<div class="dv-food-list">';
    ['Breakfast','Lunch','Dinner','Snacks'].forEach(meal=>{
      const mfoods = foods.filter(f=>f.meal===meal);
      if(!mfoods.length) return;
      html += '<div class="dv-meal-label">'+meal+'</div>';
      mfoods.forEach(f=>{
        html += '<div class="dv-food-row"><span>'+f.name+'</span><span class="dv-food-cal">'+f.cal+' kcal</span></div>';
      });
    });
    html += '</div>';
  } else {
    html += '<div class="dv-empty">No food logged</div>';
  }
  html += '</div>';

  // ── Body ──
  html += '<div class="dv-section"><div class="dv-section-title">⚖️ Body</div>';
  html += '<div class="dv-stat-grid">';
  html += dvStat('Weight', weight ? weight+'<span class="dv-unit"> lbs</span>' : '—', 'var(--accent2)');
  html += dvStat('BMI', bmi ? bmi.toFixed(1)+'<span class="dv-unit"> '+bmiCat.label+'</span>' : '—', bmiCat ? bmiCat.color : 'var(--muted)');
  html += '</div></div>';

  // ── Sleep ──
  html += '<div class="dv-section"><div class="dv-section-title">😴 Sleep</div>';
  if(sleep && sleep.mins){
    const hrs = Math.floor(sleep.mins/60);
    const mins = sleep.mins%60;
    const QUAL=['','😫','😔','😐','😊','😴'];
    html += '<div class="dv-stat-grid">';
    html += dvStat('Duration', hrs+'h '+mins+'<span class="dv-unit">m</span>', 'var(--sleep)');
    html += dvStat('Bedtime',  sleep.bed||'—', 'var(--sleep)');
    html += dvStat('Wake',     sleep.wake||'—', 'var(--sleep)');
    html += dvStat('Quality',  sleep.quality?(QUAL[sleep.quality]+' '+sleep.quality+'/5'):'—', 'var(--sleep)');
    html += '</div>';
  } else {
    html += '<div class="dv-empty">No sleep logged</div>';
  }
  html += '</div>';

  // ── Workout ──
  html += '<div class="dv-section"><div class="dv-section-title">🏋 Workout — '+dayName+'</div>';
  if(plan && !plan.rest){
    const total = plan.tasks.length;
    const done = plan.tasks.filter((_,i)=>exChecked[dayName+'__'+i]).length;
    html += '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">'+done+' / '+total+' completed — '+plan.label+'</div>';
    html += '<div class="dv-workout-list">';
    plan.tasks.forEach((t,i)=>{
      const checked = !!exChecked[dayName+'__'+i];
      html += '<div class="dv-workout-row'+(checked?' done':'')+'">'
        +'<span class="dv-check">'+(checked?'✓':'○')+'</span>'
        +'<span>'+t.name+'</span></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="dv-empty">Rest day</div>';
  }
  html += '</div>';

  // ── Journal & Mood ──
  html += '<div class="dv-section"><div class="dv-section-title">📓 Journal</div>';
  const MOODS2=['','😫','😔','😐','😊','🤩'];
  html += '<div class="dv-stat-grid">';
  html += dvStat('Mood', jd.mood?(MOODS2[jd.mood]+' '+jd.mood+'/5'):'—', 'var(--journal)');
  html += '</div>';
  if(jd.text){
    html += '<div class="dv-journal-text">'+jd.text+'</div>';
  } else {
    html += '<div class="dv-empty">No journal entry</div>';
  }
  html += '</div>';

  document.getElementById('dayview-content').innerHTML = html;
}
function dvStat(label, valHtml, color){
  return '<div class="dv-stat"><div class="dv-stat-label">'+label+'</div>'
    +'<div class="dv-stat-val" style="color:'+color+'">'+valHtml+'</div></div>';
}
function getMostRecentWeight(){
  // Walk back up to 365 days to find most recent logged weight
  for(let i=0;i<=365;i++){
    const k=dateKey(-i);
    const w=getWeight(k);
    if(w) return {weight:w, key:k};
  }
  return null;
}
function calcBMI(weightLbs, heightFt, heightIn){
  const totalIn = (heightFt*12)+heightIn;
  if(!totalIn||!weightLbs) return null;
  return (703*weightLbs)/(totalIn*totalIn);
}
function bmiCategory(bmi){
  if(bmi<18.5) return {label:'Underweight',color:'var(--water)'};
  if(bmi<25)   return {label:'Healthy',color:'var(--cost)'};
  if(bmi<30)   return {label:'Overweight',color:'var(--carbs)'};
  return         {label:'Obese',color:'var(--accent2)'};
}
function getBMIForKey(k){
  // For a given date key, get weight on or before that day + user height
  const s=getSettings();
  if(!s.heightFt&&!s.heightIn) return null;
  // find weight on or before this date
  const targetDate=new Date(k+'T12:00:00');
  for(let i=0;i<=365;i++){
    const d=new Date(targetDate);d.setDate(d.getDate()-i);
    const dk=dateKeyFromDate(d);
    const w=getWeight(dk);
    if(w) return calcBMI(w,s.heightFt||0,s.heightIn||0);
  }
  return null;
}

// ════════════════════════════════════════
// SETTINGS TAB
// ════════════════════════════════════════
function switchSettingsTab(name){
  // Ensure the settings panel itself is active
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const sp=document.getElementById('panel-settings');
  if(sp) sp.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const settingsBtn=document.getElementById('nav-settings-btn');
  if(settingsBtn){ settingsBtn.classList.add('active'); settingsBtn.classList.add('nav-group-open'); }
  const titleEl=document.getElementById('topbar-title');
  if(titleEl) titleEl.textContent='SETTINGS';
  // Show the right sub-panel
  document.querySelectorAll('.nav-subtab[data-stab]').forEach(b=>b.classList.toggle('active',b.dataset.stab===name));
  document.querySelectorAll('.stab-panel').forEach(p=>p.classList.toggle('active',p.id==='stab-'+name));
  if(name==='goals') setTimeout(renderBodyTargets,50);
  if(name==='features') setTimeout(applyAllFeatureVisibility,50);
  if(name==='profile') setTimeout(renderConditions,50);
  // Keep settings sub-group open + update chevron
  const settingsGroup=document.getElementById('settings-sub-group');
  if(settingsGroup) settingsGroup.classList.add('open');
  const chevron=document.getElementById('nav-settings-chevron');
  if(chevron) chevron.style.transform='rotate(180deg)';
  closeMobileSidebar();
  const mc=document.querySelector('.main-content');
  if(mc) mc.scrollTop=0;
}
function applyColorScheme(scheme){
  const s=getSettings();
  s.colorScheme=scheme;
  lsSet('settings',s);
  document.documentElement.dataset.scheme=scheme==='default'?'':scheme;
  if(scheme!=='default') document.documentElement.setAttribute('data-scheme',scheme);
  else document.documentElement.removeAttribute('data-scheme');
  // Update active state
  document.querySelectorAll('.color-scheme-btn').forEach(b=>b.classList.toggle('active',b.dataset.scheme===scheme));
  showToast('\u2713 Color scheme updated!');
}
function setAIAttitude(attitude){
  const s=getSettings();
  s.aiAttitude=attitude;
  lsSet('settings',s);
  document.querySelectorAll('.ai-attitude-btn').forEach(b=>b.classList.toggle('active',b.dataset.attitude===attitude));
  showToast('✓ AI personality set to '+attitude);
}

function renderSettings(){
  const s=getSettings();
  applyTheme(s.theme||'light');
  if(s.colorScheme && s.colorScheme!=='default'){
    document.documentElement.setAttribute('data-scheme',s.colorScheme);
  } else {
    document.documentElement.removeAttribute('data-scheme');
  }
  document.getElementById('set-cal-goal').value=s.calGoal||'';
  document.getElementById('set-prot-goal').value=s.protGoal||'';
  document.getElementById('set-carb-goal').value=s.carbGoal||'';
  document.getElementById('set-fat-goal').value=s.fatGoal||'';
  document.getElementById('set-water-goal').value=s.waterGoal||'';
  document.getElementById('set-bottle-oz').value=s.bottleOz||24;
  if(document.getElementById('set-name')) document.getElementById('set-name').value=s.name||'';
  if(document.getElementById('set-gender')) document.getElementById('set-gender').value=s.gender||'';
  if(document.getElementById('set-age')) document.getElementById('set-age').value=s.age||'';
  if(document.getElementById('set-height-ft')) document.getElementById('set-height-ft').value=s.heightFt||'';
  if(document.getElementById('set-height-in')) document.getElementById('set-height-in').value=s.heightIn||'';
  updateBMIPreview();
  const gpDate=document.getElementById('gp-target-date');
  if(gpDate&&!gpDate.value){const t=new Date();t.setDate(t.getDate()+7);gpDate.min=t.toISOString().split('T')[0];}
  // Highlight active color scheme
  const activeScheme=s.colorScheme||'default';
  document.querySelectorAll('.color-scheme-btn').forEach(b=>b.classList.toggle('active',b.dataset.scheme===activeScheme));
  // Highlight active AI attitude
  const activeAttitude=s.aiAttitude||'supportive';
  document.querySelectorAll('.ai-attitude-btn').forEach(b=>b.classList.toggle('active',b.dataset.attitude===activeAttitude));
}
function saveGoals(){
  const s=getSettings();
  s.calGoal=parseInt(document.getElementById('set-cal-goal').value)||0;
  s.protGoal=parseInt(document.getElementById('set-prot-goal').value)||0;
  s.carbGoal=parseInt(document.getElementById('set-carb-goal').value)||0;
  s.fatGoal=parseInt(document.getElementById('set-fat-goal').value)||0;
  s.waterGoal=parseInt(document.getElementById('set-water-goal').value)||0;
  lsSet('settings',s);showToast('\u2713 Goals saved!');
}
function saveBottleSize(){
  const s=getSettings();
  const oz=parseInt(document.getElementById('set-bottle-oz').value);
  if(!oz||oz<1){showToast('Enter a valid size');return;}
  s.bottleOz=oz;lsSet('settings',s);showToast('\u2713 Bottle size set to '+oz+'oz');
}
function saveProfile(){
  const s=getSettings();
  s.name=(document.getElementById('set-name').value||'').trim();
  s.gender=document.getElementById('set-gender').value;
  s.age=parseInt(document.getElementById('set-age').value)||0;
  s.heightFt=parseInt(document.getElementById('set-height-ft').value)||0;
  s.heightIn=parseInt(document.getElementById('set-height-in').value)||0;
  lsSet('settings',s);
  updateBMIPreview();
  // Update sidebar with new name
  if(s.name){
    const el=document.getElementById('sidebar-user-name');
    if(el) el.textContent=s.name;
    const av=document.getElementById('sidebar-avatar');
    if(av) av.textContent=s.name.charAt(0).toUpperCase();
  }
  showToast('\u2713 Profile saved!');
}
function updateBMIPreview(){
  const el=document.getElementById('bmi-preview');
  if(!el) return;
  const s=getSettings();
  if(!s.heightFt&&!s.heightIn){el.innerHTML='';return;}
  const recent=getMostRecentWeight();
  if(!recent){
    el.innerHTML='<div style="font-size:12px;color:var(--muted)">Log a weight reading to see your BMI.</div>';
    return;
  }
  const bmi=calcBMI(recent.weight,s.heightFt||0,s.heightIn||0);
  if(!bmi){el.innerHTML='';return;}
  const cat=bmiCategory(bmi);
  const totalIn=(s.heightFt*12)+(s.heightIn||0);
  const fmtDate2=new Date(recent.key+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  el.innerHTML='<div style="background:var(--alt-bg);border:1px solid var(--border);border-radius:10px;padding:14px">'
    +'<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Current BMI</div>'
    +'<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">'
    +'<div style="font-family:Bebas Neue;font-size:44px;color:'+cat.color+';line-height:1">'+bmi.toFixed(1)+'</div>'
    +'<div><div style="font-size:14px;font-weight:600;color:'+cat.color+'">'+cat.label+'</div>'
    +'<div style="font-size:11px;color:var(--muted)">Based on '+recent.weight+'lbs on '+fmtDate2+'</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;height:6px;border-radius:99px;background:var(--border);overflow:hidden;position:relative">'
    +'<div style="position:absolute;left:0;top:0;height:100%;width:'+Math.min(100,Math.max(0,((bmi-10)/30)*100)).toFixed(1)+'%;background:'+cat.color+';border-radius:99px;transition:width .4s"></div>'
    +'<div style="position:absolute;left:'+((8.5/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:2px;background:var(--border)"></div>'
    +'<div style="position:absolute;left:'+((15/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:2px;background:var(--border)"></div>'
    +'<div style="position:absolute;left:'+((20/30)*100).toFixed(1)+'%;top:-2px;bottom:-2px;width:2px;background:var(--border)"></div>'
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:4px">'
    +'<span>10</span><span>Underweight|18.5</span><span>Healthy|25</span><span>Overweight|30</span><span>40</span>'
    +'</div>'
    +'</div>';
}
async function sendContactForm(){
  const subject = document.getElementById('contact-subject').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  if(!message){ showToast('Please enter a message'); return; }
  const s = getSettings();
  const { data: { session } } = await _supabase.auth.getSession();
  const userEmail = session ? session.user.email : 'Unknown';
  // Use mailto as a simple no-backend solution
  const body = encodeURIComponent('From: ' + userEmail + '\n\n' + message);
  const subj = encodeURIComponent('[Vitalog] ' + (subject || 'User message'));
  window.open('mailto:dallaswp13@gmail.com?subject=' + subj + '&body=' + body);
  document.getElementById('contact-subject').value = '';
  document.getElementById('contact-message').value = '';
  showToast('\u2713 Opening your email client...');
}

async function confirmClearData(){
  if(confirm('Delete all your data? This cannot be undone.')){
    // Delete all rows from Supabase for this user
    await _supabase.from('health_data').delete().eq('user_id', _userId);
    clearAllCache();
    location.reload();
  }
}

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
function showToast(msg){
  const t=document.getElementById('toast');t.innerHTML=msg;
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);
}

// ════════════════════════════════════════
// SIGN OUT
// ════════════════════════════════════════
function signOut(){ authSignOut(); }

// ════════════════════════════════════════
// THEME
// ════════════════════════════════════════
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const tog = document.getElementById('theme-toggle');
  if(tog) tog.classList.toggle('light', theme==='light');
}
function toggleTheme(){
  const s = getSettings();
  const next = (s.theme==='light') ? 'dark' : 'light';
  s.theme = next;
  lsSet('settings', s);
  applyTheme(next);
}
function initTheme(){
  const s = getSettings();
  applyTheme(s.theme||'light');
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
document.getElementById('sleep-bed').addEventListener('change',updateSleepDuration);
document.getElementById('sleep-wake').addEventListener('change',updateSleepDuration);

// ════════════════════════════════════════
// SLEEP TAB
// ════════════════════════════════════════
function sleepChangeDay(d){sleepOffset+=d;renderSleep();}
function sleepGoToToday(){sleepOffset=0;renderSleep();}
function renderSleep(){
  const k=dateKey(sleepOffset);
  document.getElementById('sleep-date-display').textContent=fmtDate(sleepOffset);
  document.getElementById('sleep-today-badge').style.display=sleepOffset===0?'':'none';
  const _b=document.getElementById('sleep-back-today');if(_b)_b.style.display=sleepOffset===0?'none':'';
  const sl=getSleep(k);
  if(sl){
    document.getElementById('sleep-bed').value=sl.bed||'22:00';
    document.getElementById('sleep-wake').value=sl.wake||'07:00';
    currentSleepQ=sl.quality||0;
  } else {
    document.getElementById('sleep-bed').value='22:00';
    document.getElementById('sleep-wake').value='07:00';
    currentSleepQ=0;
  }
  document.querySelectorAll('.sq-btn').forEach(b=>b.classList.toggle('selected',parseInt(b.dataset.q)===currentSleepQ));
  updateSleepDuration();
  // Last 7 days strip
  const strip=document.getElementById('sleep-history-strip');
  if(!strip)return;
  let html='<div class="dash-section-title">Last 7 nights</div><div class="sleep-history-row">';
  for(let i=6;i>=0;i--){
    const dk=dateKey(-i);
    const s=getSleep(dk);
    const d=new Date();d.setDate(d.getDate()-i);
    const day=d.toLocaleDateString('en-US',{weekday:'short'});
    const hrs=s?Math.floor(s.mins/60):null;
    const mins=s?s.mins%60:null;
    const label=s?(hrs+'h'+(mins?mins+'m':'')):' — ';
    const pct=s?Math.min(100,Math.round(s.mins/480*100)):0;
    html+=`<div class="sleep-hist-day${-i===sleepOffset?' active':''}">
      <div class="sleep-hist-bar-wrap"><div class="sleep-hist-bar" style="height:${pct}%"></div></div>
      <div class="sleep-hist-val">${label}</div>
      <div class="sleep-hist-label">${day}</div>
    </div>`;
  }
  html+='</div>';
  strip.innerHTML=html;
  renderDreamJournal();
}
// ════════════════════════════════════════

// ═══════════════════════════════════════
// DAYS-OF-WEEK HELPERS FOR CHECKLIST ITEMS
// ═══════════════════════════════════════
const DOW_NAMES = ['S','M','T','W','T','F','S'];
function _makeDayPicker(itemId, currentDays, tabPrefix) {
  const days = currentDays || [0,1,2,3,4,5,6]; // default: all days
  return `<div class="item-day-picker" id="daypick-${itemId}">
    ${DOW_NAMES.map((d,i)=>`<button class="day-pick-btn${days.includes(i)?' active':''}" data-day="${i}"
      onclick="toggleItemDay('${tabPrefix}','${itemId}',${i})">${d}</button>`).join('')}
  </div>`;
}
function _isItemActiveToday(item, offset) {
  const days = item.days;
  if (!days || days.length === 0 || days.length === 7) return true; // all days
  const d = new Date(); d.setDate(d.getDate() + (offset||0));
  return days.includes(d.getDay());
}
function toggleItemDay(tab, itemId, day) {
  let list, save;
  if (tab === 'supp')   { list = getSupplementList()||DEFAULT_SUPPLEMENTS.slice(); save = saveSupplementList; }
  if (tab === 'sc')     { list = getSelfCareList()||DEFAULT_SELFCARE.slice(); save = saveSelfCareList; }
  if (tab === 'clean')  { list = getCleaningList()||DEFAULT_CLEANING.slice(); save = saveCleaningList; }
  if (!list) return;
  const item = list.find(x => x.id === itemId);
  if (!item) return;
  if (!item.days || item.days.length === 7) item.days = [0,1,2,3,4,5,6];
  const i = item.days.indexOf(day);
  if (i >= 0) { item.days.splice(i,1); if(item.days.length===0) item.days=[day]; }
  else item.days.push(day);
  save(list);
  // Update just the picker buttons without full re-render
  const picker = document.getElementById('daypick-'+itemId);
  if (picker) {
    picker.querySelectorAll('.day-pick-btn').forEach(b => {
      b.classList.toggle('active', item.days.includes(parseInt(b.dataset.day)));
    });
  }
  // Re-render the checklist view (not editor)
  if (tab === 'supp')  renderSupplements();
  if (tab === 'sc')    renderSelfCare();
  if (tab === 'clean') renderCleaning();
}

function suppChangeDay(d){suppOffset+=d;renderSupplements();}
function suppGoToToday(){suppOffset=0;renderSupplements();}
function renderSupplements(){
  const k=dateKey(suppOffset);
  document.getElementById('supp-date-display').textContent=fmtDate(suppOffset);
  document.getElementById('supp-today-badge').style.display=suppOffset===0?'':'none';
  const _b=document.getElementById('supp-back-today');if(_b)_b.style.display=suppOffset===0?'none':'';
  const list=getSupplementList()||DEFAULT_SUPPLEMENTS;
  const log=getSupplementLog(k);
  const container=document.getElementById('supp-checklist');
  const activeList=list.filter(s=>_isItemActiveToday(s,suppOffset));
  if(!activeList.length && !list.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No supplements added yet. Add some below.</p>';return;}
  if(!activeList.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No supplements scheduled for today.</p>';
    const editEl2=document.getElementById('supp-items-edit');let ehtml2='';
    list.forEach((s,i)=>{ehtml2+=`<div class="edit-list-row edit-list-row--days"><div class="edit-item-top"><span class="edit-item-name">${s.name}${s.dose?' <em>'+s.dose+'</em>':''}</span><button class="del-btn" onclick="deleteSupplementItem(${i})">&#215;</button></div>${_makeDayPicker(s.id,s.days,'supp')}</div>`;});
    if(editEl2) editEl2.innerHTML=ehtml2||'<p style="font-size:12px;color:var(--muted)">No supplements yet.</p>';return;}
  const done=activeList.filter(s=>log[s.id]).length;
  let html=`<div class="checklist-progress">
    <div class="checklist-progress-top"><span>Today's intake</span><strong>${done} / ${activeList.length}</strong></div>
    <div class="ex-bar"><div class="ex-bar-fill" style="width:${activeList.length?Math.round(done/activeList.length*100):0}%"></div></div>
  </div><div class="checklist-items">`;
  activeList.forEach(s=>{
    const checked=!!log[s.id];
    const buyBtn=s.url?`<a class="buy-btn" href="${s.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🛒 Buy</a>`:'';
    html+=`<div class="checklist-item${checked?' done':''}" onclick="toggleSupp('${s.id}')">
      <div class="checklist-check"></div>
      <div class="checklist-info"><div class="checklist-name">${s.name}</div>${s.dose?`<div class="checklist-sub">${s.dose}</div>`:''}  </div>
      ${buyBtn}
    </div>`;
  });
  html+='</div>';
  container.innerHTML=html;
  // Edit list with day pickers
  const editEl=document.getElementById('supp-items-edit');
  let ehtml='';
  list.forEach((s,i)=>{
    ehtml+=`<div class="edit-list-row edit-list-row--days">
      <div class="edit-item-top">
        <span class="edit-item-name">${s.name}${s.dose?' <em>'+s.dose+'</em>':''}</span>
        <button class="del-btn" onclick="deleteSupplementItem(${i})">&#215;</button>
      </div>
      ${_makeDayPicker(s.id, s.days, 'supp')}
    </div>`;
  });
  if(editEl) editEl.innerHTML=ehtml||'<p style="font-size:12px;color:var(--muted)">No supplements yet.</p>';
}
function toggleSupp(id){
  const k=dateKey(suppOffset);
  const log=getSupplementLog(k);
  log[id]=!log[id];
  setSupplementLog(k,log);
  renderSupplements();
}
function addSupplementItem(){
  const name=(document.getElementById('supp-new-name').value||'').trim();
  if(!name)return;
  const dose=(document.getElementById('supp-new-dose').value||'').trim();
  const url=(document.getElementById('supp-new-url').value||'').trim();
  const list=getSupplementList()||DEFAULT_SUPPLEMENTS.slice();
  list.push({id:'s'+Date.now(),name,dose,url});
  saveSupplementList(list);
  document.getElementById('supp-new-name').value='';
  document.getElementById('supp-new-dose').value='';
  document.getElementById('supp-new-url').value='';
  renderSupplements();
  showToast('\u2713 Supplement added!');
}
function deleteSupplementItem(i){
  const list=getSupplementList()||DEFAULT_SUPPLEMENTS.slice();
  list.splice(i,1);
  saveSupplementList(list);
  renderSupplements();
}

// ════════════════════════════════════════
// SELF CARE TAB
// ════════════════════════════════════════
function scChangeDay(d){scOffset+=d;renderSelfCare();}
function scGoToToday(){scOffset=0;renderSelfCare();}
function renderSelfCare(){
  const k=dateKey(scOffset);
  document.getElementById('sc-date-display').textContent=fmtDate(scOffset);
  document.getElementById('sc-today-badge').style.display=scOffset===0?'':'none';
  const _b=document.getElementById('sc-back-today');if(_b)_b.style.display=scOffset===0?'none':'';
  const list=getSelfCareList()||DEFAULT_SELFCARE;
  const log=getSelfCareLog(k);
  const container=document.getElementById('sc-checklist');
  const activeList=list.filter(c=>_isItemActiveToday(c,scOffset));
  if(!activeList.length && !list.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No routine items yet. Add some below.</p>';return;}
  if(!activeList.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No self care items scheduled for today.</p>';
    const eEl=document.getElementById('sc-items-edit');let eh='';
    list.forEach((c,i)=>{eh+=`<div class="edit-list-row edit-list-row--days"><div class="edit-item-top"><span class="edit-item-name">${c.name}${c.time?' <em>'+c.time+'</em>':''}</span><button class="del-btn" onclick="deleteSelfCareItem(${i})">&#215;</button></div>${_makeDayPicker(c.id,c.days,'sc')}</div>`;});
    if(eEl) eEl.innerHTML=eh||'<p style="font-size:12px;color:var(--muted)">No items yet.</p>';return;}
  const done=activeList.filter(c=>log[c.id]).length;
  let html=`<div class="checklist-progress">
    <div class="checklist-progress-top"><span>Routine progress</span><strong>${done} / ${activeList.length}</strong></div>
    <div class="ex-bar"><div class="ex-bar-fill" style="width:${activeList.length?Math.round(done/activeList.length*100):0}%;background:var(--journal)"></div></div>
  </div><div class="checklist-items">`;
  activeList.forEach(c=>{
    const checked=!!log[c.id];
    const buyBtn=c.url?`<a class="buy-btn buy-btn-sc" href="${c.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🛒 Buy</a>`:'';
    html+=`<div class="checklist-item${checked?' done':''}${checked?' sc-done':''}" onclick="toggleSelfCare('${c.id}')">
      <div class="checklist-check sc-check"></div>
      <div class="checklist-info"><div class="checklist-name">${c.name}</div>${c.time?`<div class="checklist-sub">${c.time}</div>`:''}  </div>
      ${buyBtn}
    </div>`;
  });
  html+='</div>';
  container.innerHTML=html;
  const editEl=document.getElementById('sc-items-edit');
  let ehtml='';
  list.forEach((c,i)=>{
    ehtml+=`<div class="edit-list-row edit-list-row--days">
      <div class="edit-item-top"><span class="edit-item-name">${c.name}${c.time?' <em>'+c.time+'</em>':''}</span>
        <button class="del-btn" onclick="deleteSelfCareItem(${i})">&#215;</button></div>
      ${_makeDayPicker(c.id,c.days,'sc')}
    </div>`;
  });
  if(editEl) editEl.innerHTML=ehtml||'<p style="font-size:12px;color:var(--muted)">No items yet.</p>';
}
function toggleSelfCare(id){
  const k=dateKey(scOffset);
  const log=getSelfCareLog(k);
  log[id]=!log[id];
  setSelfCareLog(k,log);
  renderSelfCare();
}
function addSelfCareItem(){
  const name=(document.getElementById('sc-new-name').value||'').trim();
  if(!name)return;
  const time=(document.getElementById('sc-new-time').value||'').trim();
  const url=(document.getElementById('sc-new-url').value||'').trim();
  const list=getSelfCareList()||DEFAULT_SELFCARE.slice();
  list.push({id:'c'+Date.now(),name,time,url});
  saveSelfCareList(list);
  document.getElementById('sc-new-name').value='';
  document.getElementById('sc-new-time').value='';
  document.getElementById('sc-new-url').value='';
  renderSelfCare();
  showToast('\u2713 Item added!');
}
function deleteSelfCareItem(i){
  const list=getSelfCareList()||DEFAULT_SELFCARE.slice();
  list.splice(i,1);
  saveSelfCareList(list);
  renderSelfCare();
}

// ════════════════════════════════════════
// HOME CLEANING TAB
// ════════════════════════════════════════
function cleanChangeDay(d){cleanOffset+=d;renderCleaning();}
function cleanGoToToday(){cleanOffset=0;renderCleaning();}
function renderCleaning(){
  const k=dateKey(cleanOffset);
  document.getElementById('clean-date-display').textContent=fmtDate(cleanOffset);
  document.getElementById('clean-today-badge').style.display=cleanOffset===0?'':'none';
  const _b=document.getElementById('clean-back-today');if(_b)_b.style.display=cleanOffset===0?'none':'';
  const list=getCleaningList()||DEFAULT_CLEANING;
  const log=getCleaningLog(k);
  const container=document.getElementById('clean-checklist');
  const activeList=list.filter(cl=>_isItemActiveToday(cl,cleanOffset));
  if(!activeList.length && !list.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No tasks added yet. Add some below.</p>';return;}
  if(!activeList.length){container.innerHTML='<p style="color:var(--muted);font-size:13px">No cleaning tasks scheduled for today.</p>';
    const eEl=document.getElementById('clean-items-edit');let eh='';
    list.forEach((cl,i)=>{eh+=`<div class="edit-list-row edit-list-row--days"><div class="edit-item-top"><span class="edit-item-name">${cl.name}${cl.freq?' <em>'+cl.freq+'</em>':''}</span><button class="del-btn" onclick="deleteCleaningItem(${i})">&#215;</button></div>${_makeDayPicker(cl.id,cl.days,'clean')}</div>`;});
    if(eEl) eEl.innerHTML=eh||'<p style="font-size:12px;color:var(--muted)">No tasks yet.</p>';return;}
  const done=activeList.filter(cl=>log[cl.id]).length;
  let html=`<div class="checklist-progress">
    <div class="checklist-progress-top"><span>Tasks complete</span><strong>${done} / ${activeList.length}</strong></div>
    <div class="ex-bar"><div class="ex-bar-fill" style="width:${activeList.length?Math.round(done/activeList.length*100):0}%;background:#60a5fa"></div></div>
  </div><div class="checklist-items">`;
  activeList.forEach(cl=>{
    const checked=!!log[cl.id];
    html+=`<div class="checklist-item${checked?' done':''}" onclick="toggleCleaning('${cl.id}')" style="${checked?'--check-color:#60a5fa':''}">
      <div class="checklist-check" style="border-color:#60a5fa;${checked?'background:#60a5fa':''};"></div>
      <div class="checklist-info"><div class="checklist-name">${cl.name}</div>${cl.freq?`<div class="checklist-sub">${cl.freq}</div>`:''}  </div>
    </div>`;
  });
  html+='</div>';
  container.innerHTML=html;
  const editEl=document.getElementById('clean-items-edit');
  let ehtml='';
  list.forEach((cl,i)=>{
    ehtml+=`<div class="edit-list-row edit-list-row--days">
      <div class="edit-item-top"><span class="edit-item-name">${cl.name}${cl.freq?' <em>'+cl.freq+'</em>':''}</span>
        <button class="del-btn" onclick="deleteCleaningItem(${i})">&#215;</button></div>
      ${_makeDayPicker(cl.id,cl.days,'clean')}
    </div>`;
  });
  if(editEl) editEl.innerHTML=ehtml||'<p style="font-size:12px;color:var(--muted)">No tasks yet.</p>';
}
function toggleCleaning(id){
  const k=dateKey(cleanOffset);
  const log=getCleaningLog(k);
  log[id]=!log[id];
  setCleaningLog(k,log);
  renderCleaning();
}
function addCleaningItem(){
  const name=(document.getElementById('clean-new-name').value||'').trim();
  if(!name)return;
  const freq=(document.getElementById('clean-new-freq').value||'').trim();
  const list=getCleaningList()||DEFAULT_CLEANING.slice();
  list.push({id:'cl'+Date.now(),name,freq});
  saveCleaningList(list);
  document.getElementById('clean-new-name').value='';
  document.getElementById('clean-new-freq').value='';
  renderCleaning();
  showToast('✓ Cleaning task added!');
}
function deleteCleaningItem(i){
  const list=getCleaningList()||DEFAULT_CLEANING.slice();
  list.splice(i,1);
  saveCleaningList(list);
  renderCleaning();
}

// ════════════════════════════════════════
// PARTY FAVORS TAB
// ════════════════════════════════════════
const DEFAULT_PARTY_ITEMS = [
  {id:'p1', name:'Cannabis', dose:'1 puff / 5mg edible', note:''},
  {id:'p2', name:'Microdose', dose:'0.1g', note:'LSD or psilocybin'},
  {id:'p3', name:'MDMA',      dose:'100mg', note:''},
  {id:'p4', name:'Alcohol',   dose:'1–2 drinks', note:''},
];
let partyOffset = 0;
function partyChangeDay(d){partyOffset+=d;renderParty();}
function partyGoToToday(){partyOffset=0;renderParty();}

function applyPartyFavorsVisibility(){
  const s = getSettings();
  const enabled = !!s.partyEnabled;
  const navBtn = document.getElementById('nav-party-tab');
  if(navBtn) navBtn.style.display = enabled ? '' : 'none';
  // Update toggle knob
  const toggle = document.getElementById('party-toggle');
  const knob = document.getElementById('party-knob');
  if(toggle) toggle.classList.toggle('on', enabled);
  if(knob) knob.style.transform = enabled ? 'translateX(22px)' : '';
}

function togglePartyFavors(){
  const s = getSettings();
  s.partyEnabled = !s.partyEnabled;
  lsSet('settings', s);
  applyPartyFavorsVisibility();
  showToast(s.partyEnabled ? '🎉 Party Favors enabled' : 'Party Favors hidden');
}

function renderParty(){
  const k = dateKey(partyOffset);
  const dateEl = document.getElementById('party-date-display');
  if(dateEl) dateEl.textContent = fmtDate(partyOffset);
  const todayBadge = document.getElementById('party-today-badge');
  if(todayBadge) todayBadge.style.display = partyOffset===0?'':'none';
  const backBtn = document.getElementById('party-back-today');
  if(backBtn) backBtn.style.display = partyOffset===0?'none':'';

  const list = getPartyList() || DEFAULT_PARTY_ITEMS;
  const log  = getPartyLog(k);
  const container = document.getElementById('party-checklist');
  if(!container) return;

  const done = list.filter(item => log[item.id]).length;
  let html = `<div class="checklist-progress">
    <div class="checklist-progress-top"><span>Today's use</span><strong>${done} / ${list.length}</strong></div>
    <div class="ex-bar"><div class="ex-bar-fill" style="width:${list.length?Math.round(done/list.length*100):0}%;background:#c084fc"></div></div>
  </div><div class="checklist-items">`;

  list.forEach(item => {
    const checked = !!log[item.id];
    html += `<div class="checklist-item${checked?' done party-done':''}" onclick="togglePartyItem('${item.id}')">
      <div class="checklist-check party-check"></div>
      <div class="checklist-info">
        <div class="checklist-name">${item.name}</div>
        ${item.dose?`<div class="checklist-sub">${item.dose}</div>`:''}
        ${item.note?`<div class="checklist-sub" style="font-style:italic;color:var(--muted)">${item.note}</div>`:''}
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;

  const editEl = document.getElementById('party-items-edit');
  if(editEl){
    let ehtml = '';
    list.forEach((item,i) => {
      ehtml += `<div class="edit-list-row">
        <span>${item.name}${item.dose?' — '+item.dose:''}</span>
        <button class="del-btn" onclick="deletePartyItem(${i})">&#215;</button>
      </div>`;
    });
    editEl.innerHTML = ehtml || '<p style="font-size:12px;color:var(--muted)">No items yet.</p>';
  }
}

function togglePartyItem(id){
  const k = dateKey(partyOffset);
  const log = getPartyLog(k);
  log[id] = !log[id];
  setPartyLog(k, log);
  renderParty();
}
function addPartyItem(){
  const name = (document.getElementById('party-new-name')?.value||'').trim();
  if(!name) return;
  const dose = (document.getElementById('party-new-dose')?.value||'').trim();
  const note = (document.getElementById('party-new-note')?.value||'').trim();
  const list = getPartyList() || DEFAULT_PARTY_ITEMS.slice();
  list.push({id:'p'+Date.now(), name, dose, note});
  savePartyList(list);
  document.getElementById('party-new-name').value = '';
  document.getElementById('party-new-dose').value = '';
  document.getElementById('party-new-note').value = '';
  renderParty();
  showToast('✓ Item added');
}
function deletePartyItem(i){
  const list = getPartyList() || DEFAULT_PARTY_ITEMS.slice();
  list.splice(i,1);
  savePartyList(list);
  renderParty();
}

// ════════════════════════════════════════
// BIOMETRICS TAB
// ════════════════════════════════════════
const BIO_FIELDS = [
  { id:'bp_sys',  label:'Systolic BP',      unit:'mmHg', placeholder:'120', type:'number', icon:'❤️',  ref:[90,120],  warn:[120,140],  high:180,  desc:'Top blood pressure number' },
  { id:'bp_dia',  label:'Diastolic BP',     unit:'mmHg', placeholder:'80',  type:'number', icon:'💙',  ref:[60,80],   warn:[80,90],    high:120,  desc:'Bottom blood pressure number' },
  { id:'hr',      label:'Heart Rate',       unit:'bpm',  placeholder:'65',  type:'number', icon:'💗',  ref:[60,100],  warn:[50,60],    high:160,  desc:'Resting heart rate' },
  { id:'glucose', label:'Blood Glucose',    unit:'mg/dL',placeholder:'95',  type:'number', icon:'🩸',  ref:[70,100],  warn:[100,125],  high:200,  desc:'Fasting blood sugar' },
  { id:'hrv',     label:'HRV',              unit:'ms',   placeholder:'45',  type:'number', icon:'📊',  ref:[20,80],   warn:[10,20],    high:100,  desc:'Heart rate variability' },
  { id:'temp',    label:'Body Temp',        unit:'°F',   placeholder:'98.6',type:'number', icon:'🌡️', ref:[97,99],   warn:[99,100.4], high:104,  desc:'Oral body temperature' },
  { id:'spo2',    label:'Oxygen Saturation',unit:'%',    placeholder:'98',  type:'number', icon:'💨',  ref:[95,100],  warn:[90,95],    high:100,  desc:'Blood oxygen level' },
  { id:'steps',   label:'Steps',            unit:'steps',placeholder:'8000',type:'number', icon:'👟',  ref:[7500,15000],warn:[5000,7500],high:25000,desc:'Daily step count' },
  { id:'resp',    label:'Respiratory Rate', unit:'brpm', placeholder:'14',  type:'number', icon:'🫁',  ref:[12,20],   warn:[20,25],    high:30,   desc:'Breaths per minute' },
];

function _bioStatus(field, val) {
  if (!val) return 'empty';
  const v = parseFloat(val);
  if (v >= field.ref[0] && v <= field.ref[1]) return 'normal';
  if (v >= field.warn[0] && v <= field.warn[1]) return 'warning';
  if (v < field.ref[0] && v >= field.warn[0]) return 'warning';
  if (v < field.warn[0] && field.id !== 'hrv') return 'low';
  if (v > field.high * 0.9) return 'danger';
  return 'warning';
}

const _BIO_STATUS_LABELS = { normal:'Normal', warning:'Borderline', low:'Low', danger:'High', empty:'' };
const _BIO_STATUS_COLORS = { normal:'var(--cost)', warning:'#ffb347', low:'#4fc3f7', danger:'#ef5350', empty:'var(--muted)' };

function bioChangeDay(d){bioOffset+=d;renderBiometrics();}
function bioGoToToday(){bioOffset=0;renderBiometrics();}

function renderBiometrics(){
  const k = dateKey(bioOffset);
  document.getElementById('bio-date-display').textContent = fmtDate(bioOffset);
  document.getElementById('bio-today-badge').style.display = bioOffset===0?'':'none';
  const _b = document.getElementById('bio-back-today');
  if(_b) _b.style.display = bioOffset===0?'none':'';

  const data = getBiometrics(k);
  const form = document.getElementById('bio-form');

  // ── Input grid ──
  let html = `
    <div class="bio-intro">Log your vitals below. Values outside normal range are flagged automatically.</div>
    <div class="bio-grid">`;

  BIO_FIELDS.forEach(f => {
    const val = data[f.id] || '';
    const status = _bioStatus(f, val);
    const statusLabel = _BIO_STATUS_LABELS[status];
    const statusColor = _BIO_STATUS_COLORS[status];
    const refText = `Normal: ${f.ref[0]}–${f.ref[1]} ${f.unit}`;

    html += `
      <div class="bio-card ${val ? 'bio-card--filled' : ''}" id="bio-card-${f.id}">
        <div class="bio-card-top">
          <span class="bio-card-icon">${f.icon}</span>
          <div class="bio-card-labels">
            <div class="bio-card-name">${f.label}</div>
            <div class="bio-card-desc">${f.desc}</div>
          </div>
          ${val ? `<div class="bio-card-badge" style="background:${statusColor}22;color:${statusColor}">${statusLabel}</div>` : ''}
        </div>
        <div class="bio-card-input-row">
          <input type="number" class="bio-input" id="bio-${f.id}" placeholder="${f.placeholder}"
            value="${val}" step="0.1"
            oninput="saveBioField('${f.id}',this.value)"
            onfocus="this.closest('.bio-card').classList.add('bio-card--focus')"
            onblur="this.closest('.bio-card').classList.remove('bio-card--focus')">
          <span class="bio-unit-badge">${f.unit}</span>
        </div>
        ${val ? `
          <div class="bio-range-bar-wrap">
            <div class="bio-range-bar">
              <div class="bio-range-fill" style="width:${Math.min(100,Math.max(0,(parseFloat(val)/f.high)*100)).toFixed(1)}%;background:${statusColor}"></div>
            </div>
            <div class="bio-ref-text">${refText}</div>
          </div>` : `<div class="bio-ref-hint">${refText}</div>`}
      </div>`;
  });

  html += '</div>';

  // ── Quick stats row ──
  const filledFields = BIO_FIELDS.filter(f => data[f.id]);
  const normalCount = filledFields.filter(f => _bioStatus(f, data[f.id]) === 'normal').length;
  const warnCount = filledFields.filter(f => ['warning','low','danger'].includes(_bioStatus(f, data[f.id]))).length;

  if(filledFields.length > 0){
    html += `
      <div class="bio-summary-row">
        <div class="bio-summary-stat">
          <div class="bio-summary-val" style="color:var(--cost)">${normalCount}</div>
          <div class="bio-summary-label">In Normal Range</div>
        </div>
        <div class="bio-summary-divider"></div>
        <div class="bio-summary-stat">
          <div class="bio-summary-val" style="color:#ffb347">${warnCount}</div>
          <div class="bio-summary-label">Need Attention</div>
        </div>
        <div class="bio-summary-divider"></div>
        <div class="bio-summary-stat">
          <div class="bio-summary-val">${filledFields.length}</div>
          <div class="bio-summary-label">Logged Today</div>
        </div>
      </div>`;
  }

  form.innerHTML = html;

  // ── 7-day history ──
  const strip = document.getElementById('bio-history-strip');
  let shtml = '<div class="dash-section-title" style="margin-top:24px">7-Day Trend</div>';

  // Build table data
  const historyDays = [];
  for(let i=6;i>=0;i--){
    const dk = dateKey(-i);
    const d = getBiometrics(dk);
    const date = new Date(); date.setDate(date.getDate()-i);
    historyDays.push({ dk, d, date });
  }

  const hasTrendData = historyDays.some(h => BIO_FIELDS.some(f => h.d[f.id]));
  if(!hasTrendData){
    strip.innerHTML = shtml + '<p style="font-size:12px;color:var(--muted);margin-top:8px">Log data across multiple days to see trends here.</p>';
    return;
  }

  // Trend table
  shtml += '<div class="bio-trend-table-wrap"><table class="bio-trend-table"><thead><tr><th>Metric</th>';
  historyDays.forEach(h => {
    const label = h.date.toLocaleDateString('en-US',{weekday:'short'});
    const isToday = h.dk === dateKey(0);
    shtml += `<th${isToday?' class="bio-today-col"':''}>${label}</th>`;
  });
  shtml += '</tr></thead><tbody>';

  BIO_FIELDS.forEach(f => {
    const anyData = historyDays.some(h => h.d[f.id]);
    if(!anyData) return;
    shtml += `<tr><td class="bio-metric-cell"><span>${f.icon}</span> ${f.label}<span class="bio-unit-small">${f.unit}</span></td>`;
    historyDays.forEach(h => {
      const val = h.d[f.id];
      const status = _bioStatus(f, val);
      const color = val ? _BIO_STATUS_COLORS[status] : 'transparent';
      const isToday = h.dk === dateKey(0);
      shtml += `<td class="${isToday?'bio-today-col':''}" style="color:${color}">
        ${val || '<span style="color:var(--muted);font-size:11px">—</span>'}
      </td>`;
    });
    shtml += '</tr>';
  });

  shtml += '</tbody></table></div>';
  strip.innerHTML = shtml;
}

function saveBioField(id, val){
  const k = dateKey(bioOffset);
  const data = getBiometrics(k);
  if(val !== '' && val !== null) data[id] = val;
  else delete data[id];
  setBiometrics(k, data);
  // Live-update the badge without full re-render
  const field = BIO_FIELDS.find(f => f.id === id);
  if(!field) return;
  const card = document.getElementById('bio-card-'+id);
  if(!card) return;
  const status = _bioStatus(field, val);
  const color = _BIO_STATUS_COLORS[status];
  const label = _BIO_STATUS_LABELS[status];
  let badge = card.querySelector('.bio-card-badge');
  if(val && label){
    if(!badge){ badge = document.createElement('div'); badge.className='bio-card-badge'; card.querySelector('.bio-card-top').appendChild(badge); }
    badge.style.background = color+'22'; badge.style.color = color; badge.textContent = label;
    card.classList.add('bio-card--filled');
  } else if(badge) { badge.remove(); }
}

// ════════════════════════════════════════
// PERSONAL RECORDS
// ════════════════════════════════════════
function renderPRs(){
  const prs=getPRs();
  const keys=Object.keys(prs).sort();
  const el=document.getElementById('pr-list');
  if(!el)return;
  if(!keys.length){el.innerHTML='<p style="font-size:12px;color:var(--muted);margin-bottom:12px">No PRs logged yet. Add your first one below.</p>';return;}
  let html='<div class="pr-grid">';
  keys.forEach(ex=>{
    const records=prs[ex];
    const best=records.reduce((a,b)=>a.weight>b.weight?a:b);
    html+=`<div class="pr-card">
      <div class="pr-exercise">${ex}</div>
      <div class="pr-best"><span class="pr-weight">${best.weight}<span style="font-size:14px">lbs</span></span><span class="pr-reps">${best.reps} reps</span></div>
      <div class="pr-history">`;
    records.slice().reverse().slice(0,3).forEach(r=>{
      const d=new Date(r.date);
      const label=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      const isBest=r.weight===best.weight&&r.reps===best.reps;
      html+=`<div class="pr-hist-row${isBest?' pr-best-row':''}">
        <span class="pr-hist-date">${label}</span>
        <span class="pr-hist-val">${r.weight}lbs × ${r.reps}</span>
        ${isBest?'<span class="pr-badge">🏆 PR</span>':''}
      </div>`;
    });
    html+=`</div>
      <button class="del-btn" style="margin-top:8px;font-size:11px" onclick="deletePR('${ex.replace(/'/g,"\\'")}')">Remove</button>
    </div>`;
  });
  html+='</div>';
  el.innerHTML=html;
}
function logPR(){
  const ex=(document.getElementById('pr-exercise').value||'').trim();
  const weight=parseFloat(document.getElementById('pr-weight').value);
  const reps=parseInt(document.getElementById('pr-reps').value)||1;
  if(!ex||!weight){showToast('Enter an exercise and weight');return;}
  const prs=getPRs();
  if(!prs[ex])prs[ex]=[];
  const prev=prs[ex];
  const isPR=!prev.length||weight>Math.max(...prev.map(r=>r.weight));
  prs[ex].push({weight,reps,date:Date.now()});
  setPRs(prs);
  document.getElementById('pr-exercise').value='';
  document.getElementById('pr-weight').value='';
  document.getElementById('pr-reps').value='';
  renderPRs();
  showToast(isPR?'🏆 New PR! '+weight+'lbs':'✓ Logged '+weight+'lbs × '+reps);
}
function deletePR(ex){
  const prs=getPRs();
  delete prs[ex];
  setPRs(prs);
  renderPRs();
}

// ════════════════════════════════════════
// DAILY AFFIRMATION
// ════════════════════════════════════════
// ════════════════════════════════════════
// AI ASSISTANT TAB
// ════════════════════════════════════════
function renderAITab(){
  // Panel activation handled by switchTab; content persists in DOM
}

function fillTabExample(el){
  const input = document.getElementById('ai-tab-input');
  if(input){ input.value = el.textContent.replace(/^[\u{1F300}-\u{1FAFF}\uFE0F\s]+/u,'').trim(); input.focus(); }
}

async function sendTabMessage(){
  const input = document.getElementById('ai-tab-input');
  const body  = document.getElementById('ai-tab-body');
  if(!input||!body) return;
  const text = input.value.trim();
  const hasPhoto = typeof _aiPhotoData !== 'undefined' && !!_aiPhotoData;
  if(!text && !hasPhoto) return;

  const welcome = body.querySelector('.acp-welcome');
  if(welcome) welcome.remove();

  const photoDataUrl = hasPhoto ? _aiPhotoData : null;
  input.value=''; input.disabled=true;
  if(hasPhoto && typeof removeAIPhoto === 'function') removeAIPhoto();
  const sendBtn=document.getElementById('ai-tab-send');
  if(sendBtn) sendBtn.disabled=true;

  const userDiv=document.createElement('div');
  userDiv.className='ai-tab-msg ai-tab-msg-user';
  if(photoDataUrl){
    userDiv.innerHTML=(text?`<div>${text}</div>`:'')+`<img src="${photoDataUrl}" style="max-height:100px;border-radius:8px;margin-top:4px;display:block">`;
  } else {
    userDiv.textContent=text;
  }
  body.appendChild(userDiv);
  body.scrollTop=body.scrollHeight;

  const thinkDiv=document.createElement('div');
  thinkDiv.className='ai-tab-msg ai-tab-msg-ai ai-tab-thinking';
  thinkDiv.innerHTML='<span></span><span></span><span></span>';
  body.appendChild(thinkDiv);
  body.scrollTop=body.scrollHeight;

  const today=new Date().toISOString().split('T')[0];
  const contextSnap = typeof _buildContextSnapshot === 'function' ? _buildContextSnapshot() : '';
  const attitudeLine = typeof _attitudeSuffix === 'function' ? _attitudeSuffix() : '';
  const system=`You are a health data assistant for Vitalog. Extract health data and return ONLY raw JSON.
${attitudeLine}

Today is ${today}.
${contextSnap}

IMPORTANT — IF AN IMAGE IS PROVIDED:
- If it shows a nutrition label or food packaging: extract serving size, calories, protein, carbs, fat. Log as a food entry with the product name.
- If it shows a meal or food: identify the food and estimate macros.
- If it shows health data (scale, BP monitor, glucose meter, etc.): extract the relevant values.

JSON format (omit keys you cannot determine):
{"date":"YYYY-MM-DD","foods":[{"name":"string","meal":"Breakfast|Lunch|Dinner|Snacks","cal":0,"p":0,"c":0,"f":0,"cost":0}],"water_bottles":0,"weight_lbs":0,"sleep":{"bed":"HH:MM","wake":"HH:MM","quality":1},"exercise":[{"name":"string","detail":"string"}],"mood":1,"journal":"string","mark_supplements":["name"],"mark_selfcare":["name"],"mark_cleaning":["name"],"add_supplement":{"name":"","dose":"","url":""},"add_selfcare":{"name":"","time":"","url":""},"add_cleaning":{"name":"","freq":""}}

Rules: estimate macros for foods. Sleep quality 1-5, mood 1-5. Water in 24oz bottle equivalents. journal = one sentence. If user says they took a supplement or did a self care / cleaning task, add its name to mark_supplements/mark_selfcare/mark_cleaning. If a URL is mentioned alongside a product, set it in add_supplement.url or add_selfcare.url. Return raw JSON only.`;

  try{
    const raw=await callAI(system, text || 'Please analyze this image and extract all health data from it, including nutrition facts if visible.', 1400, photoDataUrl);
    const parsed=parseJSON(raw);
    thinkDiv.remove();
    if(!parsed){
      const e=document.createElement('div'); e.className='ai-tab-msg ai-tab-msg-ai';
      e.textContent="I couldn't parse that. Try describing meals, sleep, weight, workouts, or what supplements you took.";
      body.appendChild(e);
    } else {
      const saved=await saveParsedData(parsed);
      body.appendChild(buildRichLogResponse(parsed,saved));
    }
  }catch(err){
    thinkDiv.remove();
    const e=document.createElement('div'); e.className='ai-tab-msg ai-tab-msg-ai';
    e.textContent='Something went wrong: '+err.message;
    body.appendChild(e);
  }finally{
    input.disabled=false;
    if(sendBtn) sendBtn.disabled=false;
    input.focus();
    body.scrollTop=body.scrollHeight;
  }
}

function buildRichLogResponse(parsed, saved){
  const wrapper=document.createElement('div');
  wrapper.className='ai-tab-msg ai-tab-msg-ai ai-tab-rich';
  if(!saved||!saved.length){
    wrapper.innerHTML='<p style="color:var(--muted);font-size:13px">No health data found. Try mentioning meals, sleep, weight, workouts, or what supplements you took.</p>';
    return wrapper;
  }
  const dateStr=parsed.date?new Date(parsed.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'Today';
  let html=`<div class="rich-header"><span class="rich-check">✓</span> Logged for <strong>${dateStr}</strong></div>`;

  if(parsed.foods&&parsed.foods.length){
    const total=parsed.foods.reduce((a,f)=>a+(f.cal||0),0);
    html+=`<div class="rich-section-title">🍽 Food <span class="rich-tag">${total} kcal</span></div><div class="rich-cards">`;
    parsed.foods.forEach(f=>{
      html+=`<div class="rich-card rich-card-food">
        <div class="rich-card-name">${f.name}</div>
        <div class="rich-card-meta">${f.meal} · ${f.cal||0} kcal</div>
        <div class="rich-card-macros">
          <span style="color:#60a5fa">${f.p||0}g P</span>
          <span style="color:#fbbf24">${f.c||0}g C</span>
          <span style="color:#a78bfa">${f.f||0}g F</span>
        </div></div>`;
    });
    html+=`</div><button class="rich-link-btn" onclick="switchTab('diet')">Open Diet Log →</button>`;
  }
  if(parsed.sleep&&(parsed.sleep.bed||parsed.sleep.wake)){
    const sl=parsed.sleep; let hrs='';
    if(sl.bed&&sl.wake){
      const [bh,bm]=sl.bed.split(':').map(Number),[wh,wm]=sl.wake.split(':').map(Number);
      let m=(wh*60+wm)-(bh*60+bm); if(m<0)m+=1440; hrs=(m/60).toFixed(1)+'h';
    }
    const ql=['','Terrible','Poor','Okay','Good','Great'];
    html+=`<div class="rich-section-title">😴 Sleep</div><div class="rich-cards">
      <div class="rich-card rich-card-sleep">
        <div class="rich-card-name">${hrs} sleep</div>
        <div class="rich-card-meta">${sl.bed||'?'} → ${sl.wake||'?'} · ${ql[sl.quality||3]}</div>
      </div></div><button class="rich-link-btn" onclick="switchTab('sleep')">Open Sleep Log →</button>`;
  }
  if(parsed.weight_lbs){
    html+=`<div class="rich-section-title">⚖️ Weight</div><div class="rich-cards">
      <div class="rich-card rich-card-weight">
        <div class="rich-card-name">${parsed.weight_lbs} lbs</div>
        <div class="rich-card-meta">Saved to weight history</div>
      </div></div>`;
  }
  if(parsed.exercise&&parsed.exercise.length){
    html+=`<div class="rich-section-title">💪 Workout</div><div class="rich-cards">`;
    parsed.exercise.forEach(ex=>{
      html+=`<div class="rich-card rich-card-exercise">
        <div class="rich-card-name">${ex.name}</div>
        ${ex.detail?`<div class="rich-card-meta">${ex.detail}</div>`:''}
      </div>`;
    });
    html+=`</div><button class="rich-link-btn" onclick="switchTab('exercise')">Open Exercise →</button>`;
  }
  if(parsed.mood){
    const moodLabel=['','Rough','Low','Okay','Good','Great'][parsed.mood];
    const moodColor=['','#ef5350','#fb923c','#94a3b8','#4ade80','#facc15'][parsed.mood];
    html+=`<div class="rich-section-title">✦ Mood: <span style="color:${moodColor}">${moodLabel}</span></div>`;
  }
  // Supplements / Self Care / Cleaning marked
  const markedSupp = saved.find(s=>s.includes('supplement'));
  const markedSC   = saved.find(s=>s.includes('self care'));
  const markedClean= saved.find(s=>s.includes('cleaning'));
  if(markedSupp||markedSC||markedClean){
    html+=`<div class="rich-section-title">✓ Checked off</div><div class="rich-cards">`;
    if(markedSupp) html+=`<div class="rich-card" style="border-color:var(--cost)"><div class="rich-card-name" style="color:var(--cost)">💊 ${markedSupp}</div><div class="rich-card-meta">Supplements updated</div></div>`;
    if(markedSC)   html+=`<div class="rich-card" style="border-color:var(--journal)"><div class="rich-card-name" style="color:var(--journal)">✨ ${markedSC}</div><div class="rich-card-meta">Self care updated</div></div>`;
    if(markedClean)html+=`<div class="rich-card" style="border-color:#60a5fa"><div class="rich-card-name" style="color:#60a5fa">🧹 ${markedClean}</div><div class="rich-card-meta">Cleaning updated</div></div>`;
    html+=`</div>`;
  }
  // New items added
  const addedItems = saved.filter(s=>s.includes('added to'));
  if(addedItems.length){
    html+=`<div class="rich-section-title">➕ Added</div><div class="rich-cards">`;
    addedItems.forEach(item=>{
      html+=`<div class="rich-card"><div class="rich-card-name">${item}</div></div>`;
    });
    html+=`</div>`;
  }
  wrapper.innerHTML=html;
  return wrapper;
}

// ════════════════════════════════════════
const DAILY_QUOTES = [
  { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "He who has health has hope, and he who has hope has everything.", author: "Arabian Proverb" },
  { text: "To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.", author: "Buddha" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "The first wealth is health.", author: "Ralph Waldo Emerson" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "It is not length of life, but depth of life.", author: "Ralph Waldo Emerson" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "If you want to change who you are, change what you do.", author: "Naval Ravikant" },
  { text: "Your body hears everything your mind says.", author: "Naomi Judd" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "The groundwork of all happiness is health.", author: "Leigh Hunt" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.", author: "John F. Kennedy" },
  { text: "All truly great thoughts are conceived while walking.", author: "Friedrich Nietzsche" },
  { text: "The doctor of the future will give no medicine, but will interest patients in the care of the human frame, diet, and the cause of disease.", author: "Thomas Edison" },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "Health is a state of complete harmony of the body, mind, and spirit.", author: "B.K.S. Iyengar" },
  { text: "The difference between who you are and who you want to be is what you do.", author: "Bill Phillips" },
  { text: "Movement is medicine for creating change in a person's physical, emotional, and mental states.", author: "Carol Welch" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You have to expect things of yourself before you can do them.", author: "Michael Jordan" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Success is nothing more than a few simple disciplines practiced every day.", author: "Jim Rohn" },
  { text: "The hardest lift of all is lifting your butt off the couch.", author: "Unknown" },
  { text: "Those who think they have no time for exercise will sooner or later have to find time for illness.", author: "Edward Stanley" },
  { text: "Happiness lies in the joy of achievement and the thrill of creative effort.", author: "Franklin D. Roosevelt" },
  { text: "Man's greatest actions are performed in minor struggles.", author: "Victor Hugo" },
  { text: "A healthy outside starts from the inside.", author: "Robert Urich" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "One step at a time is all it takes to get you there.", author: "Emily Dickinson" },
  { text: "The food you eat can be either the safest and most powerful form of medicine, or the slowest form of poison.", author: "Ann Wigmore" },
  { text: "Sleep is the best meditation.", author: "Dalai Lama" },
  { text: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit.", author: "Ralph Marston" },
  { text: "Early to bed and early to rise makes a man healthy, wealthy, and wise.", author: "Benjamin Franklin" },
  { text: "To change your body, you must first change your mind.", author: "Unknown" },
  { text: "We don't stop playing because we grow old; we grow old because we stop playing.", author: "George Bernard Shaw" },
  { text: "Life is not merely to be alive, but to be well.", author: "Marcus Valerius Martial" },
  { text: "Be patient with yourself. Self-growth is tender.", author: "Stephen Covey" },
  { text: "Excellence is the gradual result of always striving to do better.", author: "Pat Riley" },
  { text: "To enjoy the glow of good health, you must exercise.", author: "Gene Tunney" },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito" },
  { text: "Your current body is the only body that can take you to your new body — so be kind to it.", author: "Elaine Moran" },
  { text: "The greatest wealth is health.", author: "Virgil" },
  { text: "Without health, life is not life; it is only a state of langour and suffering.", author: "Francois Rabelais" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "An early morning walk is a blessing for the whole day.", author: "Henry David Thoreau" },
];

function getDailyQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

let _quoteOverrideIdx = null;
function refreshDailyQuote(){
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const base = dayOfYear % DAILY_QUOTES.length;
  // Cycle to next quote each click
  _quoteOverrideIdx = ((_quoteOverrideIdx !== null ? _quoteOverrideIdx : base) + 1) % DAILY_QUOTES.length;
  const quote = DAILY_QUOTES[_quoteOverrideIdx];
  const el = document.getElementById('dash-affirmation-text');
  if(el) el.innerHTML = `"${quote.text}"<span class="dash-quote-author"> — ${quote.author}</span>`;
  // Spin the button briefly
  const btn = document.querySelector('.quote-refresh-btn');
  if(btn){ btn.style.transform='rotate(360deg)'; setTimeout(()=>btn.style.transform='',400); }
}

async function loadDailyAffirmation(){
  const el=document.getElementById('dash-affirmation-text');
  if(!el)return;
  const idx = _quoteOverrideIdx !== null ? _quoteOverrideIdx : null;
  const quote = idx !== null ? DAILY_QUOTES[idx] : getDailyQuote();
  el.innerHTML = `"${quote.text}"<span class="dash-quote-author"> — ${quote.author}</span>`;
}

// ════════════════════════════════════════
// LEARN TAB
// ════════════════════════════════════════
const LEARN_DATA=[
  {
    category:'Endocrine Disruptors',
    icon:'⚗️',
    color:'var(--accent2)',
    items:[
      {name:'BPA (Bisphenol A)',found:'Plastic bottles, food can linings, receipts',effect:'Mimics estrogen, disrupts hormonal balance, linked to fertility issues',avoid:'Choose BPA-free plastics, glass, or stainless steel. Avoid handling thermal receipts.'},
      {name:'Phthalates',found:'Plastic packaging, personal care products, vinyl flooring',effect:'Disrupts testosterone production, linked to developmental issues in children',avoid:'Choose fragrance-free products, avoid plastics labeled #3 (PVC).'},
      {name:'Parabens',found:'Cosmetics, shampoos, lotions, processed foods',effect:'Weak estrogen mimics, linked to breast cancer risk',avoid:'Read labels — look for methylparaben, propylparaben. Choose paraben-free products.'},
      {name:'Triclosan',found:'Antibacterial soaps, toothpastes, some deodorants',effect:'Disrupts thyroid hormones, contributes to antibiotic resistance',avoid:'Use plain soap and water instead of antibacterial products.'},
      {name:'PFAS (Forever Chemicals)',found:'Non-stick cookware, waterproof clothing, food packaging',effect:'Accumulate in body, disrupt thyroid and immune function, linked to cancer',avoid:'Switch to cast iron or stainless steel cookware. Avoid grease-resistant food packaging.'},
      {name:'Atrazine',found:'Tap water in agricultural areas, conventionally grown produce',effect:'Feminizes male animals at very low doses, disrupts reproductive hormones',avoid:'Filter tap water, choose organic produce when possible.'},
    ]
  },
  {
    category:'Harmful Oils & Fats',
    icon:'🫗',
    color:'var(--carbs)',
    items:[
      {name:'Seed Oils (Industrial)',found:'Canola, soybean, corn, sunflower, cottonseed, grapeseed oils',effect:'High in omega-6 linoleic acid, promotes inflammation, oxidizes under heat creating toxic aldehydes',avoid:'Cook with butter, ghee, coconut oil, olive oil, tallow, or avocado oil instead.'},
      {name:'Trans Fats (Partially Hydrogenated Oils)',found:'Margarine, fried fast food, packaged baked goods',effect:'Raises LDL cholesterol, lowers HDL, directly linked to heart disease',avoid:'Check ingredient labels for "partially hydrogenated oil." Now banned in many countries.'},
      {name:'Refined Vegetable Shortening',found:'Commercial baked goods, pie crusts, fried foods',effect:'Highly processed, contains trans fats, promotes inflammation',avoid:'Use butter or coconut oil for baking instead.'},
    ]
  },
  {
    category:'Food Additives to Watch',
    icon:'🧪',
    color:'var(--protein)',
    items:[
      {name:'High Fructose Corn Syrup (HFCS)',found:'Sodas, juices, bread, condiments, processed snacks',effect:'Metabolized differently than glucose, promotes fatty liver, obesity, and insulin resistance',avoid:'Read labels carefully — it hides under names like "corn syrup" or "fructose."'},
      {name:'Artificial Food Dyes',found:'Candy, cereals, sports drinks, mac & cheese',effect:'Linked to hyperactivity in children, some dyes (Red 40, Yellow 5/6) are suspected carcinogens',avoid:'Choose products with natural coloring or no added dyes.'},
      {name:'Sodium Nitrate/Nitrite',found:'Deli meats, hot dogs, bacon, cured meats',effect:'Converts to nitrosamines in the body, which are carcinogenic',avoid:'Choose uncured meats or limit consumption. Vitamin C may reduce conversion.'},
      {name:'MSG (Monosodium Glutamate)',found:'Fast food, chips, soups, seasoning packets, Chinese food',effect:'Can cause headaches and flushing in sensitive individuals ("MSG symptom complex")',avoid:'Look for it on labels; also hides as "yeast extract" or "hydrolyzed protein."'},
      {name:'Carrageenan',found:'Dairy alternatives, deli meats, infant formula, yogurt',effect:'May cause intestinal inflammation, associated with digestive issues',avoid:'Look for carrageenan in ingredient lists, especially in almond/oat milk.'},
      {name:'Artificial Sweeteners',found:'Diet sodas, sugar-free products, some protein bars',effect:'May disrupt gut microbiome, alter insulin response, associated with increased cravings',avoid:'Use natural sweeteners like honey or maple syrup in moderation, or just reduce sweetness overall.'},
      {name:'BHT / BHA (Preservatives)',found:'Cereals, chips, vegetable oils, chewing gum',effect:'BHA is classified as a possible human carcinogen by IARC',avoid:'Choose products preserved with vitamin E (tocopherols) instead.'},
    ]
  },
  {
    category:'Heavy Metals & Contaminants',
    icon:'☠️',
    color:'var(--muted)',
    items:[
      {name:'Lead',found:'Old paint (pre-1978 homes), some ceramics, certain spices, tap water',effect:'Neurotoxin — damages brain development in children, linked to hypertension in adults',avoid:'Test your water, use certified filters. Avoid imported spices not tested for heavy metals.'},
      {name:'Mercury',found:'Large fish (tuna, swordfish, shark), dental amalgam fillings',effect:'Neurotoxin that accumulates in the body, especially harmful during pregnancy',avoid:'Limit large fish consumption. Choose smaller fish like sardines, salmon, mackerel.'},
      {name:'Arsenic',found:'Rice, apple juice, well water in some regions',effect:'Linked to cancer, cardiovascular disease, and diabetes',avoid:'Vary your grains. Rinse rice thoroughly. Test well water annually.'},
      {name:'Cadmium',found:'Leafy vegetables grown in contaminated soil, cigarette smoke',effect:'Accumulates in kidneys, linked to kidney damage and bone loss',avoid:'Buy from reputable sources. Don\'t smoke.'},
    ]
  },
  {
    category:'Household & Environmental',
    icon:'🏠',
    color:'var(--water)',
    items:[
      {name:'Flame Retardants (PBDEs)',found:'Furniture foam, electronics, carpet padding',effect:'Accumulate in body fat and breast milk, disrupt thyroid function',avoid:'Vacuum frequently. Avoid handling old foam furniture that may be deteriorating.'},
      {name:'Pesticide Residues',found:'Conventionally grown produce — especially the "Dirty Dozen"',effect:'Various effects depending on pesticide type, many are endocrine disruptors',avoid:'Prioritize organic for strawberries, spinach, peppers, celery, peaches, and pears.'},
      {name:'Chlorine & Chloramine in Water',found:'Municipal tap water',effect:'Disinfection byproducts (DBPs) are linked to bladder cancer, reproductive issues',avoid:'Use a quality carbon filter for drinking water. Let water sit uncovered to dissipate chlorine.'},
      {name:'Volatile Organic Compounds (VOCs)',found:'New carpets, paint, furniture, air fresheners, cleaning products',effect:'Short-term irritants; some (benzene, formaldehyde) are known carcinogens',avoid:'Ventilate new items thoroughly. Choose low-VOC paints. Use natural cleaning products.'},
    ]
  }
];


// ════════════════════════════════════════
// PERIOD TRACKER  
// ════════════════════════════════════════
let periodOffset = 0;
function periodChangeDay(d){ periodOffset+=d; renderPeriod(); }
function periodGoToToday(){ periodOffset=0; renderPeriod(); }

const PERIOD_ACCENT = '#f472b6';

const PERIOD_SYMPTOMS = [
  { id:'cramps',    label:'Cramps',           icon:'⚡' },
  { id:'bloating',  label:'Bloating',          icon:'💨' },
  { id:'headache',  label:'Headache',          icon:'🤕' },
  { id:'fatigue',   label:'Fatigue',           icon:'😴' },
  { id:'breast',    label:'Breast tenderness', icon:'🌸' },
  { id:'moodswings',label:'Mood swings',       icon:'🌊' },
  { id:'backpain',  label:'Back pain',         icon:'🦴' },
  { id:'nausea',    label:'Nausea',            icon:'🤢' },
  { id:'acne',      label:'Acne',              icon:'🔴' },
  { id:'cravings',  label:'Cravings',          icon:'🍫' },
  { id:'insomnia',  label:'Insomnia',          icon:'🌙' },
  { id:'spotting',  label:'Spotting',          icon:'💧' },
];

const FLOW_LEVELS = [
  { id:'none',     label:'None',    color:'#555555' },
  { id:'spotting', label:'Spotting',color:'#f9a8d4' },
  { id:'light',    label:'Light',   color:'#f472b6' },
  { id:'medium',   label:'Medium',  color:'#ec4899' },
  { id:'heavy',    label:'Heavy',   color:'#be185d' },
];

function _getPeriodConfig(){
  const saved=getPeriodSettings();
  return { cycleLength:(saved&&saved.cycleLength)||28, periodLength:(saved&&saved.periodLength)||5, lastStart:(saved&&saved.lastStart)||null };
}

function _toDaysSinceEpoch(dateStr){
  return Math.floor(new Date(dateStr+'T12:00:00').getTime()/86400000);
}

function _getCyclePhase(dateStr){
  const cfg=_getPeriodConfig();
  if(!cfg.lastStart) return {phase:'unknown',dayInCycle:null,daysUntilNext:null};
  const today=_toDaysSinceEpoch(dateStr);
  const start=_toDaysSinceEpoch(cfg.lastStart);
  const diff=today-start;
  if(diff<0) return {phase:'unknown',dayInCycle:null,daysUntilNext:null};
  const cycleNum=Math.floor(diff/cfg.cycleLength);
  const dayInCycle=diff-cycleNum*cfg.cycleLength;
  let phase;
  if(dayInCycle<cfg.periodLength) phase='period';
  else if(dayInCycle<cfg.periodLength+4) phase='follicular';
  else if(dayInCycle>=cfg.cycleLength-14-2&&dayInCycle<=cfg.cycleLength-14+2) phase='ovulation';
  else if(dayInCycle>cfg.cycleLength-14+2) phase='luteal';
  else phase='follicular';
  const nextPeriodDay=start+(cycleNum+1)*cfg.cycleLength;
  const daysUntilNext=nextPeriodDay-today;
  const nextPeriodDate=new Date(nextPeriodDay*86400000).toISOString().split('T')[0];
  return {phase,dayInCycle:dayInCycle+1,daysUntilNext,nextPeriodDate,cycleNum};
}

function _buildCycleCalendar(){
  const cfg=_getPeriodConfig();
  if(!cfg.lastStart) return null;
  const todayStr=new Date().toISOString().split('T')[0];
  const startMs=_toDaysSinceEpoch(cfg.lastStart);
  const days=[];
  for(let i=0;i<42;i++){
    const ms=startMs+i;
    const dateStr=new Date(ms*86400000).toISOString().split('T')[0];
    const dayInCycle=i%cfg.cycleLength;
    const log=getPeriodLog(dateStr);
    let phase;
    if(dayInCycle<cfg.periodLength) phase='period';
    else if(dayInCycle<cfg.periodLength+4) phase='follicular';
    else if(dayInCycle>=cfg.cycleLength-14-2&&dayInCycle<=cfg.cycleLength-14+2) phase='ovulation';
    else if(dayInCycle>cfg.cycleLength-14+2) phase='luteal';
    else phase='follicular';
    const hasFlow=log.flow&&log.flow!=='none';
    days.push({dateStr,dayInCycle:dayInCycle+1,phase,isToday:dateStr===todayStr,log,hasFlow});
  }
  return days;
}

function _phaseLabel(p){ return {period:'Period',follicular:'Follicular',ovulation:'Ovulation \u2726',luteal:'Luteal',unknown:'Setup needed'}[p]||p; }
function _phaseColor(p){ return {period:'#f472b6',follicular:'#34d399',ovulation:'#fbbf24',luteal:'#a78bfa',unknown:'var(--muted)'}[p]||'var(--muted)'; }
function _phaseDesc(p){ return {period:'Menstrual phase. Your body is shedding the uterine lining. Rest, hydrate, and take it easy.',follicular:'Energy rising. Estrogen climbs as follicles mature. Great time for new projects and harder workouts.',ovulation:'Peak fertility window. LH surge triggers egg release. Energy and libido often at their highest.',luteal:'Progesterone rises. Body prepares for a potential pregnancy. Energy dips near the end and PMS may appear.',unknown:'Enter your last period start date in Cycle Settings below to unlock predictions.'}[p]||''; }
function _flowColor(f){ return FLOW_LEVELS.find(fl=>fl.id===f)?.color||'#f472b6'; }

function renderPeriod(){
  const k=dateKey(periodOffset);
  const dateEl=document.getElementById('period-date-display');
  if(dateEl) dateEl.textContent=fmtDate(periodOffset);
  const todayBadge=document.getElementById('period-today-badge');
  if(todayBadge) todayBadge.style.display=periodOffset===0?'':'none';
  const backBtn=document.getElementById('period-back-today');
  if(backBtn) backBtn.style.display=periodOffset===0?'none':'';
  const cfg=_getPeriodConfig();
  const phase=_getCyclePhase(k);
  const log=getPeriodLog(k);
  const container=document.getElementById('period-content');
  if(!container) return;

  const pc=_phaseColor(phase.phase);

  // Phase banner
  const banner=`<div class="period-phase-banner" style="border-left-color:${pc}">
    <div class="period-phase-left">
      <div class="period-phase-name" style="color:${pc}">${_phaseLabel(phase.phase)}</div>
      ${phase.dayInCycle?`<div class="period-phase-day">Day ${phase.dayInCycle} of ${cfg.cycleLength}</div>`:''}
      <div class="period-phase-desc">${_phaseDesc(phase.phase)}</div>
    </div>
    ${phase.daysUntilNext!==null?`<div class="period-next-pill" style="background:color-mix(in srgb,${pc} 15%,transparent);color:${pc}">
      ${phase.daysUntilNext===0?'Period due today':phase.daysUntilNext<0?Math.abs(phase.daysUntilNext)+'d late':phase.daysUntilNext<=7?phase.daysUntilNext+'d until period':'Next: '+new Date(phase.nextPeriodDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
    </div>`:''}
  </div>`;

  // Calendar
  const calDays=_buildCycleCalendar();
  let calHtml='';
  if(calDays){
    const DOW=['S','M','T','W','T','F','S'];
    const firstDate=new Date(cfg.lastStart+'T12:00:00');
    const startDow=firstDate.getDay();
    const paddedDays=Array(startDow).fill(null).concat(calDays);
    const todayFull=new Date().toISOString().split('T')[0];
    calHtml=`<div class="period-cal-section">
      <div class="period-cal-title">Cycle Calendar</div>
      <div class="period-cal-legend">
        <span class="period-cal-leg" style="--lc:#f472b6">Period</span>
        <span class="period-cal-leg" style="--lc:#34d399">Follicular</span>
        <span class="period-cal-leg" style="--lc:#fbbf24">Ovulation</span>
        <span class="period-cal-leg" style="--lc:#a78bfa">Luteal</span>
      </div>
      <div class="period-cal-grid">
        ${DOW.map(d=>`<div class="period-cal-dow">${d}</div>`).join('')}
        ${paddedDays.map(day=>{
          if(!day) return '<div class="period-cal-day period-cal-empty"></div>';
          const dpc=_phaseColor(day.phase);
          const dt=new Date(day.dateStr+'T12:00:00');
          const dn=dt.getDate();
          const isFuture=day.dateStr>todayFull;
          const isSel=day.dateStr===k;
          return `<div class="period-cal-day${day.isToday?' period-cal-today':''}${isSel?' period-cal-selected':''}${isFuture?' period-cal-future':''}" style="--pc:${dpc}" onclick="periodJumpTo('${day.dateStr}')">
            <div class="period-cal-num">${dn}</div>
            ${day.hasFlow?`<div class="period-cal-dot" style="background:${_flowColor(day.log.flow)}"></div>`:!isFuture?`<div class="period-cal-phase-dot" style="background:${dpc}"></div>`:''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  } else {
    calHtml=`<div class="period-setup-hint"><span>📅</span> Add your last period start date in Cycle Settings below to see your calendar.</div>`;
  }

  // Flow
  const curFlow=log.flow||'none';
  const flowHtml=`<div class="period-section"><div class="period-section-title">Flow</div>
    <div class="period-flow-row">${FLOW_LEVELS.map(f=>`<button class="period-flow-btn${curFlow===f.id?' active':''}" style="--fc:${f.color}" onclick="setPeriodFlow('${f.id}')"><div class="period-flow-dot" style="background:${f.color}"></div>${f.label}</button>`).join('')}</div></div>`;

  // Symptoms
  const curSymps=log.symptoms||[];
  const sympHtml=`<div class="period-section"><div class="period-section-title">Symptoms</div>
    <div class="period-symptoms-grid">${PERIOD_SYMPTOMS.map(s=>`<button class="period-symp-btn${curSymps.includes(s.id)?' active':''}" onclick="togglePeriodSymptom('${s.id}')">${s.icon} ${s.label}</button>`).join('')}</div></div>`;

  // Mood
  const moodVal=log.mood||0;
  const ME=['','😰','😟','😐','😊','😄'];
  const ML=['','Rough','Low','Okay','Good','Great'];
  const moodHtml=`<div class="period-section"><div class="period-section-title">Mood</div>
    <div class="period-mood-row">${[1,2,3,4,5].map(v=>`<button class="period-mood-btn${moodVal===v?' active':''}" onclick="setPeriodMood(${v})"><span style="font-size:22px">${ME[v]}</span><div>${ML[v]}</div></button>`).join('')}</div></div>`;

  // Temp + notes
  const extraHtml=`<div class="period-section"><div class="period-section-title">Basal Body Temp</div>
    <div class="period-input-row"><input type="number" class="period-input" placeholder="97.0" step="0.1" min="96" max="100" value="${log.temp||''}" oninput="savePeriodField('temp',parseFloat(this.value)||null)"><span class="period-input-unit">°F</span></div></div>
    <div class="period-section"><div class="period-section-title">Notes</div>
    <textarea class="period-textarea" placeholder="How are you feeling today?" oninput="savePeriodField('notes',this.value)">${log.notes||''}</textarea></div>`;

  // Insights
  const insHtml=_buildPeriodInsights();

  // Config
  const cfgHtml=`<div class="period-section period-settings-section">
    <div class="period-section-title">⚙️ Cycle Settings</div>
    <div class="period-setting-row"><label class="period-setting-label">Last period started</label>
      <input type="date" class="period-setting-input" value="${cfg.lastStart||''}" onchange="savePeriodSetting('lastStart',this.value)"></div>
    <div class="period-setting-row"><label class="period-setting-label">Average cycle length</label>
      <div class="period-setting-num-row"><input type="number" class="period-setting-input period-setting-num" value="${cfg.cycleLength}" min="20" max="45" oninput="savePeriodSetting('cycleLength',parseInt(this.value)||28)"><span class="period-input-unit">days</span></div></div>
    <div class="period-setting-row"><label class="period-setting-label">Average period length</label>
      <div class="period-setting-num-row"><input type="number" class="period-setting-input period-setting-num" value="${cfg.periodLength}" min="2" max="10" oninput="savePeriodSetting('periodLength',parseInt(this.value)||5)"><span class="period-input-unit">days</span></div></div>
    <p style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.6">Predictions are estimates. Consult a healthcare provider for medical advice.</p>
  </div>`;

  container.innerHTML=banner+calHtml+flowHtml+sympHtml+moodHtml+extraHtml+insHtml+cfgHtml;
}

function _buildPeriodInsights(){
  const logs=[];
  for(let i=0;i<90;i++){
    const k=dateKey(-i);
    const l=getPeriodLog(k);
    if(l.flow&&l.flow!=='none') logs.push({k,...l});
  }
  if(logs.length<3) return '';
  const sympCount={};
  PERIOD_SYMPTOMS.forEach(s=>{sympCount[s.id]=0;});
  logs.forEach(l=>{(l.symptoms||[]).forEach(s=>{if(sympCount[s]!==undefined)sympCount[s]++;});});
  const topSymps=PERIOD_SYMPTOMS.filter(s=>sympCount[s.id]>0).sort((a,b)=>sympCount[b.id]-sympCount[a.id]).slice(0,4);
  const moodLogs=logs.filter(l=>l.mood);
  const avgMood=moodLogs.length?moodLogs.reduce((s,l)=>s+l.mood,0)/moodLogs.length:0;
  const ME=['','😰','😟','😐','😊','😄'];
  return `<div class="period-section period-insights">
    <div class="period-section-title">📊 Last 90 Days</div>
    <div class="period-insight-grid">
      <div class="period-insight-card"><div class="period-insight-val" style="color:#f472b6">${logs.length}</div><div class="period-insight-label">Days logged</div></div>
      <div class="period-insight-card"><div class="period-insight-val">${ME[Math.round(avgMood)]||'—'}</div><div class="period-insight-label">Avg mood</div></div>
      ${topSymps.length?`<div class="period-insight-card" style="grid-column:1/-1">
        <div class="period-insight-label" style="margin-bottom:6px">Most common symptoms</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${topSymps.map(s=>`<span class="period-symp-pill">${s.icon} ${s.label} <span style="opacity:.5">${sympCount[s.id]}x</span></span>`).join('')}</div>
      </div>`:''}
    </div>
  </div>`;
}

function periodJumpTo(dateStr){
  const today=new Date().toISOString().split('T')[0];
  periodOffset=_toDaysSinceEpoch(dateStr)-_toDaysSinceEpoch(today);
  renderPeriod();
}
function setPeriodFlow(flowId){
  const k=dateKey(periodOffset);const log=getPeriodLog(k);
  log.flow=log.flow===flowId?'none':flowId;
  setPeriodLog(k,log);renderPeriod();
}
function togglePeriodSymptom(id){
  const k=dateKey(periodOffset);const log=getPeriodLog(k);
  const s=log.symptoms||[];const i=s.indexOf(id);
  if(i>=0)s.splice(i,1);else s.push(id);
  log.symptoms=s;setPeriodLog(k,log);renderPeriod();
}
function setPeriodMood(val){
  const k=dateKey(periodOffset);const log=getPeriodLog(k);
  log.mood=log.mood===val?0:val;
  setPeriodLog(k,log);renderPeriod();
}
function savePeriodField(field,val){
  const k=dateKey(periodOffset);const log=getPeriodLog(k);
  log[field]=val;setPeriodLog(k,log);
}
function savePeriodSetting(field,val){
  const cfg=getPeriodSettings()||{};cfg[field]=val;
  savePeriodSettings(cfg);renderPeriod();
}
function applyPeriodVisibility(){
  const s=getSettings();const enabled=!!s.periodEnabled;
  const navBtn=document.getElementById('nav-period-tab');
  if(navBtn) navBtn.style.display=enabled?'':'none';
  const toggle=document.getElementById('period-toggle');
  const knob=document.getElementById('period-knob');
  if(toggle) toggle.classList.toggle('on',enabled);
  if(knob) knob.style.transform=enabled?'translateX(22px)':'';
}
function togglePeriodTracking(){
  const s=getSettings();s.periodEnabled=!s.periodEnabled;
  lsSet('settings',s);applyPeriodVisibility();
  showToast(s.periodEnabled?'🩸 Period Tracker enabled':'Period Tracker hidden');
}

// ════════════════════════════════════════
// OPTIONAL FEATURE VISIBILITY TOGGLES
// ════════════════════════════════════════
const OPTIONAL_FEATURES = [
  {key:'sleep',       nav:'nav-sleep-tab',       color:'#818cf8', label:'Sleep'},
  {key:'journal',     nav:'nav-journal-tab',     color:'#fbbf24', label:'Journal'},
  {key:'supplements', nav:'nav-supplements-tab', color:'#fb923c', label:'Supplements'},
  {key:'selfcare',    nav:'nav-selfcare-tab',    color:'#34d399', label:'Self Care'},
  {key:'cleaning',    nav:'nav-cleaning-tab',    color:'#60a5fa', label:'Home Cleaning'},
  {key:'biometrics',  nav:'nav-biometrics-tab',  color:'#f87171', label:'Biometrics'},
  {key:'party',       nav:'nav-party-tab',       color:'#c084fc', label:'Party Favors'},
  {key:'period',      nav:'nav-period-tab',      color:'#f472b6', label:'Period Tracker'},
  {key:'poop',        nav:'nav-poop-tab',        color:'#a16207', label:'Poop Tracker'},
  {key:'sex',         nav:'nav-sex-tab',         color:'#ec4899', label:'Intimacy Tracker'},
  {key:'diet',        nav:'nav-diet-tab',        color:'#4ade80', label:'Diet'},
  {key:'exercise',    nav:'nav-exercise-tab',    color:'#38bdf8', label:'Exercise'},
];

function applyAllFeatureVisibility(){
  const s=getSettings();
  OPTIONAL_FEATURES.forEach(f=>{
    const offByDefault = ['party','period','poop','sex'].includes(f.key);
    const enabled = offByDefault ? !!s['feat_'+f.key] : s['feat_'+f.key] !== false;
    const nav=document.getElementById(f.nav);
    if(nav) nav.style.display=enabled?'':'none';
    const toggle=document.getElementById(f.key+'-toggle');
    const knob=document.getElementById(f.key+'-knob');
    if(toggle) toggle.classList.toggle('on',enabled);
    if(knob) knob.style.transform=enabled?'translateX(22px)':'';
  });
}

function toggleFeature(key){
  const s=getSettings();
  const offByDefault = ['party','period','poop','sex'].includes(key);
  const cur = offByDefault ? !!s['feat_'+key] : s['feat_'+key] !== false;
  s['feat_'+key] = !cur;
  lsSet('settings',s);
  applyAllFeatureVisibility();
  const f=OPTIONAL_FEATURES.find(f=>f.key===key);
  const label=(f&&f.label)||key;
  showToast(!cur?('✓ '+label+' enabled'):(label+' hidden'));
}

// ════════════════════════════════════════
// DREAM JOURNAL
// ════════════════════════════════════════
function getDreamLog(k){ return lsGetSync('dream:'+k)||{}; }
function setDreamLog(k,v){ lsSet('dream:'+k,v); }

function saveDream(){
  const k=dateKey(sleepOffset);
  const text=(document.getElementById('dream-text')?.value||'').trim();
  const log=getDreamLog(k);
  log.text=text;
  setDreamLog(k,log);
  const saved=document.getElementById('dream-saved');
  if(saved){saved.classList.add('visible');setTimeout(()=>saved.classList.remove('visible'),2000);}
}

function toggleDreamTag(tag){
  const k=dateKey(sleepOffset);
  const log=getDreamLog(k);
  const tags=log.tags||[];
  const i=tags.indexOf(tag);
  if(i>=0)tags.splice(i,1);else tags.push(tag);
  log.tags=tags;
  setDreamLog(k,log);
  _updateDreamTagUI(tags);
}

function _updateDreamTagUI(tags){
  document.querySelectorAll('.dream-tag-btn').forEach(b=>{
    b.classList.toggle('active',tags.includes(b.dataset.tag));
  });
}

function renderDreamJournal(){
  const k=dateKey(sleepOffset);
  const log=getDreamLog(k);
  const ta=document.getElementById('dream-text');
  if(ta) ta.value=log.text||'';
  _updateDreamTagUI(log.tags||[]);
}

// ════════════════════════════════════════
// EXERCISE YOUTUBE LINKS
// ════════════════════════════════════════
function getExerciseYouTubeUrl(name){
  const q=encodeURIComponent('how to do '+name+' exercise form tutorial');
  return 'https://www.youtube.com/results?search_query='+q;
}

// ════════════════════════════════════════
// BODY FAT TARGETING
// ════════════════════════════════════════
const BODY_PART_LABELS = {
  face:'Face', shoulders:'Shoulders', chest:'Chest', arms:'Arms',
  core:'Core / Abs', obliques:'Obliques', hips:'Hips / Lower Back',
  glutes:'Glutes', thighs:'Thighs', calves:'Calves'
};

function getBodyTargets(){ return lsGetSync('bodyTargets')||[]; }
function saveBodyTargets(v){ lsSet('bodyTargets',v); }

function toggleBodyPart(part){
  const parts=getBodyTargets();
  const i=parts.indexOf(part);
  if(i>=0) parts.splice(i,1); else parts.push(part);
  saveBodyTargets(parts);
  renderBodyTargets();
}

function renderBodyTargets(){
  const parts=getBodyTargets();
  // Update SVG
  document.querySelectorAll('.body-part').forEach(el=>{
    el.classList.toggle('selected', parts.includes(el.dataset.part));
  });
  // Update legend buttons
  document.querySelectorAll('.body-legend-btn').forEach(el=>{
    el.classList.toggle('active', parts.includes(el.dataset.part));
  });
  // Update selected list
  const list=document.getElementById('body-selected-list');
  if(list){
    if(parts.length===0){
      list.innerHTML='<span class="body-none-label">Tap a body part to select it</span>';
    } else {
      list.innerHTML=parts.map(p=>`<span class="body-selected-tag">${BODY_PART_LABELS[p]||p}<button onclick="toggleBodyPart('${p}')" style="margin-left:4px;background:none;border:none;cursor:pointer;color:inherit;font-size:10px">✕</button></span>`).join('');
    }
  }
}

// ════════════════════════════════════════
// AI PHOTO & MICROPHONE
// ════════════════════════════════════════
let _aiPhotoData = null; // base64 image

function triggerAIPhoto(){
  document.getElementById('ai-photo-input')?.click();
}

function handleAIPhotoUpload(e){
  const file=e.target.files?.[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    _aiPhotoData=ev.target.result; // data URL
    const preview=document.getElementById('ai-photo-preview');
    if(preview){
      preview.style.display='block';
      preview.innerHTML=`<img src="${_aiPhotoData}" style="max-height:120px;max-width:100%;border-radius:10px;object-fit:cover">`
        +`<button class="ai-photo-remove" onclick="removeAIPhoto()">✕ Remove</button>`;
    }
    showToast('📷 Photo attached — describe it or just send');
  };
  reader.readAsDataURL(file);
}

function removeAIPhoto(){
  _aiPhotoData=null;
  const preview=document.getElementById('ai-photo-preview');
  if(preview){preview.style.display='none';preview.innerHTML='';}
  const inp=document.getElementById('ai-photo-input');
  if(inp) inp.value='';
}

let _aiRecognition=null;
let _micActive=false;

function toggleAIMic(){
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){
    showToast('Speech recognition not supported in this browser');return;
  }
  if(_micActive){ _stopMic(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  _aiRecognition=new SR();
  _aiRecognition.continuous=false;
  _aiRecognition.interimResults=true;
  _aiRecognition.lang='en-US';
  _micActive=true;
  const btn=document.getElementById('ai-mic-btn');
  const lbl=document.getElementById('ai-mic-label');
  if(btn) btn.classList.add('active');
  if(lbl) lbl.textContent='Listening…';
  _aiRecognition.onresult=e=>{
    const transcript=Array.from(e.results).map(r=>r[0].transcript).join('');
    const inp=document.getElementById('ai-tab-input');
    if(inp) inp.value=transcript;
  };
  _aiRecognition.onend=()=>_stopMic();
  _aiRecognition.onerror=()=>_stopMic();
  _aiRecognition.start();
}

function _stopMic(){
  _micActive=false;
  if(_aiRecognition){try{_aiRecognition.stop();}catch(e){} _aiRecognition=null;}
  const btn=document.getElementById('ai-mic-btn');
  const lbl=document.getElementById('ai-mic-label');
  if(btn) btn.classList.remove('active');
  if(lbl) lbl.textContent='Speak';
}

// ════════════════════════════════════════
// BIOMETRICS SYNC (UI only — backend TBD)
// ════════════════════════════════════════
function initBioSync(provider){
  const names={apple:'Apple Health',fitbit:'Fitbit',garmin:'Garmin Connect',google:'Google Fit',whoop:'WHOOP',oura:'Oura Ring'};
  const statusEl=document.getElementById('sync-status-'+provider);
  const s=getSettings();
  const key='biosync_'+provider;
  if(s[key]){
    // Disconnect
    s[key]=false; lsSet('settings',s);
    if(statusEl){statusEl.textContent='Connect';statusEl.className='bio-sync-status';}
    showToast(names[provider]+' disconnected');
  } else {
    // Show connect modal
    _showBioSyncModal(provider, names[provider], statusEl, s, key);
  }
}

function _showBioSyncModal(provider,name,statusEl,s,key){
  let modal=document.getElementById('bio-sync-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='bio-sync-modal';
    modal.className='ai-modal-overlay';
    document.body.appendChild(modal);
  }
  const instructions={
    apple:'Apple Health syncs automatically on iOS. Download the Vitalog iOS app (coming soon) to enable HealthKit sync.',
    fitbit:'Sign in to Fitbit and authorize Vitalog access. We\'ll import your heart rate, sleep, and activity data.',
    garmin:'Connect via Garmin Connect IQ. VO2 max, stress score, and body battery will sync daily.',
    google:'Authorize via Google Fit API. Activity, heart rate, and nutrition data will be imported.',
    whoop:'Enter your WHOOP credentials to sync recovery scores, strain, and HRV data.',
    oura:'Authorize with your Oura account to import readiness, sleep stages, and temperature trends.',
  };
  modal.innerHTML=`<div class="ai-modal" style="max-width:420px">
    <div class="ai-modal-header">
      <div class="ai-modal-title">Connect ${name}</div>
      <button class="ai-modal-close" onclick="document.getElementById('bio-sync-modal').classList.remove('open')">✕</button>
    </div>
    <div class="ai-modal-body">
      <p style="font-size:14px;line-height:1.7;color:var(--text);margin-bottom:16px">${instructions[provider]}</p>
      <div class="bio-sync-coming-soon">
        <span>🚀</span>
        <div>
          <div style="font-weight:700;margin-bottom:4px">Coming Soon</div>
          <div style="font-size:12px;color:var(--muted)">Full ${name} integration is in active development. We'll notify you when it's ready.</div>
        </div>
      </div>
    </div>
    <div class="ai-modal-footer">
      <span></span>
      <button class="settings-save-btn" style="margin:0" onclick="document.getElementById('bio-sync-modal').classList.remove('open')">Got it</button>
    </div>
  </div>`;
  modal.classList.add('open');
}

function renderLearn(){
  const container=document.getElementById('learn-content');
  if(!container)return;
  let html='<p style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.7">Knowledge is the first step to protecting your health. Here\'s what to look out for in everyday products, food, and your environment.</p>';
  LEARN_DATA.forEach(cat=>{
    html+=`<div class="learn-category">
      <div class="learn-cat-header">
        <span class="learn-cat-icon">${cat.icon}</span>
        <div>
          <div class="learn-cat-title" style="color:${cat.color}">${cat.category}</div>
          <div class="learn-cat-count">${cat.items.length} items to know</div>
        </div>
      </div>
      <div class="learn-items">`;
    cat.items.forEach(item=>{
      html+=`<div class="learn-item">
        <div class="learn-item-header" onclick="this.parentElement.classList.toggle('open')">
          <div class="learn-item-name">${item.name}</div>
          <div class="learn-item-chevron">›</div>
        </div>
        <div class="learn-item-body">
          <div class="learn-field"><span class="learn-field-label">Found In</span><span>${item.found}</span></div>
          <div class="learn-field"><span class="learn-field-label">Health Effects</span><span>${item.effect}</span></div>
          <div class="learn-field learn-field-avoid"><span class="learn-field-label">✓ How to Avoid</span><span>${item.avoid}</span></div>
        </div>
      </div>`;
    });
    html+='</div></div>';
  });
  container.innerHTML=html;
}

// ════════════════════════════════════════
// SHARE TAB
// ════════════════════════════════════════
let shareOffset = 0;
let shareColorKey = 'midnight';
let shareStyleKey = 'bold';

function shareChangeDay(d){ shareOffset+=d; renderShare(); }
function shareGoToToday(){ shareOffset=0; renderShare(); }

function setShareColor(c){
  shareColorKey=c;
  document.querySelectorAll('.share-color-swatch').forEach(b=>{
    const isActive = b.dataset.scolor===c;
    b.classList.toggle('active', isActive);
  });
  const theme = SHARE_THEMES[c];
  const nameEl = document.getElementById('share-color-name');
  if (nameEl && theme) nameEl.textContent = theme.label || c;
  drawShareCard();
}

function setShareStyle(s){
  shareStyleKey=s;
  document.querySelectorAll('.share-style-btn').forEach(b=>b.classList.toggle('active',b.dataset.sstyle===s));
  drawShareCard();
}

// Keep old setShareTheme as alias for color for backward compat
function setShareTheme(t){ setShareColor(t); }

// Default share item order — journal and party favors added
const SHARE_ITEMS_DEFAULT = [
  { id:'calories',    icon:'🔥', label:'Calories',     checked:true  },
  { id:'macros',      icon:'🥩', label:'Macros',        checked:true  },
  { id:'water',       icon:'💧', label:'Hydration',     checked:true  },
  { id:'exercise',    icon:'💪', label:'Workout',       checked:true  },
  { id:'sleep',       icon:'😴', label:'Sleep',         checked:true  },
  { id:'weight',      icon:'⚖️', label:'Weight',        checked:false },
  { id:'supplements', icon:'💊', label:'Supplements',   checked:false },
  { id:'mood',        icon:'😊', label:'Mood',          checked:false },
  { id:'journal',     icon:'📝', label:'Journal Note',  checked:false },
  { id:'party',       icon:'🎉', label:'Party Favors',  checked:false },
  { id:'affirmation', icon:'✦',  label:'Daily Quote',   checked:false },
];

let shareOrderItems = JSON.parse(JSON.stringify(SHARE_ITEMS_DEFAULT));
// Load saved order, merging any new default items that aren't saved yet
try {
  const saved = localStorage.getItem('shareOrder');
  if(saved){
    const parsed = JSON.parse(saved);
    // Add any new items from defaults that don't exist in saved list
    SHARE_ITEMS_DEFAULT.forEach(def => {
      if(!parsed.find(it=>it.id===def.id)) parsed.push({...def});
    });
    shareOrderItems = parsed;
  }
} catch(e) {}

function saveShareOrder() {
  try { localStorage.setItem('shareOrder', JSON.stringify(shareOrderItems)); } catch(e) {}
}

function renderShareOrderList() {
  const list = document.getElementById('share-order-list');
  if(!list) return;
  const partyEnabled = !!(getSettings().partyEnabled);
  list.innerHTML = shareOrderItems
    .map((item,i) => ({item,i}))
    .filter(({item}) => item.id !== 'party' || partyEnabled)
    .map(({item,i}) => `
    <div class="share-order-item" draggable="true" data-idx="${i}"
      ondragstart="shareDragStart(event,${i})" ondragover="shareDragOver(event,${i})"
      ondrop="shareDrop(event,${i})" ondragend="shareDragEnd()">
      <span class="share-order-drag">⠿</span>
      <span class="share-order-icon">${item.icon}</span>
      <span class="share-order-label">${item.label}</span>
      <label class="share-order-check">
        <input type="checkbox" ${item.checked?'checked':''} onchange="shareToggleItem(${i},this.checked)">
        <span class="share-order-checkmark"></span>
      </label>
    </div>`).join('');
}

let shareDragIdx = null;
function shareDragStart(e, i) { shareDragIdx = i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
function shareDragOver(e, i) { e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function shareDrop(e, i) {
  e.preventDefault();
  if(shareDragIdx===null || shareDragIdx===i) return;
  const arr = shareOrderItems;
  const moved = arr.splice(shareDragIdx, 1)[0];
  arr.splice(i, 0, moved);
  shareDragIdx = null;
  saveShareOrder();
  renderShareOrderList();
  drawShareCard();
}
function shareDragEnd() {
  shareDragIdx = null;
  document.querySelectorAll('.share-order-item').forEach(el=>el.classList.remove('dragging'));
}
function shareToggleItem(i, checked) {
  shareOrderItems[i].checked = checked;
  saveShareOrder();
  drawShareCard();
}

function renderShare(){
  const k = dateKey(shareOffset);
  document.getElementById('share-date-display').textContent = fmtDate(shareOffset);
  document.getElementById('share-today-badge').style.display = shareOffset===0?'':'none';
  const bt = document.getElementById('share-back-today');
  if(bt) bt.style.display = shareOffset===0?'none':'';
  renderShareOrderList();
  drawShareCard();
}

function getShareData(){
  const k = dateKey(shareOffset);
  const s = getSettings();
  const foods = getFoods(k);
  let tCal=0,tP=0,tC=0,tF=0;
  foods.forEach(i=>{tCal+=i.cal||0;tP+=i.p||0;tC+=i.c||0;tF+=i.f||0;});
  const water = getWater(k);
  const rawSleep = getSleep(k);
  // Normalise sleep — may have mins directly or need bed/wake calc
  let sleep = null;
  if(rawSleep){
    if(rawSleep.mins){
      sleep = rawSleep;
    } else if(rawSleep.bed && rawSleep.wake){
      const [bh,bm]=rawSleep.bed.split(':').map(Number);
      const [wh,wm]=rawSleep.wake.split(':').map(Number);
      let mins=(wh*60+wm)-(bh*60+bm);
      if(mins<0)mins+=1440;
      sleep = {...rawSleep, mins};
    }
  }
  const weight = getWeight(k);
  const jd = getJournalData(k) || {};
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayDay = dayNames[new Date(k+'T12:00:00').getDay()];
  const plan = WORKOUT_PLAN[todayDay];
  const exChecked = getExChecked(getWeekKey(shareOffset));
  let exDone=0, exTotal=0;
  if(plan && !plan.rest){
    exTotal = plan.tasks.length;
    exDone = plan.tasks.filter((_,i)=>exChecked[todayDay+'__'+i]).length;
  }
  const suppList = getSupplementList()||DEFAULT_SUPPLEMENTS;
  const suppLog = getSupplementLog(k);
  const suppDone = suppList.filter(sv=>suppLog[sv.id]).length;
  // Journal text for share card
  const journalText = jd.text ? jd.text.substring(0, 120) + (jd.text.length > 120 ? '…' : '') : '';
  // Party favors log
  let partyItems = [];
  try {
    const partyList = getPartyList() || [];
    const partyLog = getPartyLog(k) || {};
    partyItems = partyList.filter(p => partyLog[p.id]);
  } catch(e) {}
  // Use daily philosophical quote for affirmation
  const quoteObj = getDailyQuote();
  const affirmation = quoteObj ? `"${quoteObj.text}" — ${quoteObj.author}` : '';
  return { k, s, tCal, tP, tC, tF, water, sleep, weight, jd, journalText, partyItems, plan, exDone, exTotal, todayDay, suppDone, suppTotal:suppList.length, affirmation };
}

// Theme palettes for the canvas
const SHARE_THEMES = {
  // ── Dark ──
  midnight: { bg:'#0a0a0a', bg2:'#141414', bg3:'#1c1c1c', accent:'#e8ff47', accent2:'#ff6b35', text:'#f2f2f2', muted:'#555555', muted2:'#272727', logo:'#b4dc00', isDark:true, label:'Midnight' },
  neon:     { bg:'#06000f', bg2:'#120028', bg3:'#1a0040', accent:'#c855ff', accent2:'#ff55cc', text:'#f0e8ff', muted:'#6040a0', muted2:'#2a1050', logo:'#c855ff', isDark:true, label:'Neon' },
  ocean:    { bg:'#020d1a', bg2:'#071828', bg3:'#0c2030', accent:'#38bdf8', accent2:'#818cf8', text:'#e0f2fe', muted:'#2a5070', muted2:'#0a1828', logo:'#38bdf8', isDark:true, label:'Ocean' },
  // ── Light ──
  paper:    { bg:'#f7f4ef', bg2:'#ffffff', bg3:'#ede9e2', accent:'#7a8f00', accent2:'#c94a10', text:'#1a1a1a', muted:'#888888', muted2:'#ddd9d2', logo:'#5a6e00', isDark:false, label:'Paper' },
  blush:    { bg:'#fff0f3', bg2:'#ffffff', bg3:'#ffe0e6', accent:'#e11d48', accent2:'#f59e0b', text:'#1a0008', muted:'#b07080', muted2:'#ffd6de', logo:'#e11d48', isDark:false, label:'Blush' },
  sage:     { bg:'#f0f5f1', bg2:'#ffffff', bg3:'#e0ece3', accent:'#166534', accent2:'#0d9488', text:'#0a1f0e', muted:'#6a9070', muted2:'#d4e8d8', logo:'#166534', isDark:false, label:'Sage' },
};
// Legacy key aliases
SHARE_THEMES.dark = SHARE_THEMES.midnight;
SHARE_THEMES.light = SHARE_THEMES.paper;
SHARE_THEMES.vitalog = SHARE_THEMES.neon;
SHARE_THEMES.rose = SHARE_THEMES.blush;

function hexAlpha(hex, alpha){
  // Expand 3-digit hex to 6-digit
  if(hex && hex.length === 4) hex = '#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const r=parseInt(hex.slice(1,3),16)||0;
  const g=parseInt(hex.slice(3,5),16)||0;
  const b=parseInt(hex.slice(5,7),16)||0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawShareCard(){
  const canvas = document.getElementById('share-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const p = SHARE_THEMES[shareColorKey] || SHARE_THEMES.midnight;
  const style = shareStyleKey || 'bold';
  const d = getShareData();

  // ─────────────────────────────────────────
  // HELPERS — all self-contained, use closure ctx/p
  // ─────────────────────────────────────────
  function rr(x,y,w,h,r,fill,stroke,strokeW){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill; ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke; ctx.lineWidth=strokeW||3; ctx.stroke();}
  }
  function bar(x,y,w,h,pct,color){
    const r=h/2;
    rr(x,y,w,h,r,p.muted2);
    if(pct>0){
      const fw=Math.max(h,w*Math.min(1,pct));
      rr(x,y,fw,h,r,color);
      const capX=x+fw-r;
      ctx.beginPath(); ctx.arc(capX,y+r,r+2,0,Math.PI*2);
      ctx.fillStyle=p.isDark?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(capX,y+r,r,0,Math.PI*2);
      ctx.fillStyle=color; ctx.fill();
    }
  }
  function glow(gx,gy,radius,color,alpha){
    const g=ctx.createRadialGradient(gx,gy,0,gx,gy,radius);
    g.addColorStop(0,hexAlpha(color,alpha)); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(gx-radius,gy-radius,radius*2,radius*2);
  }
  function wrapText(x,y,txt,maxW,size,weight,color,lh){
    ctx.font=`${weight} ${size}px DM Sans,sans-serif`;
    ctx.fillStyle=color; ctx.textAlign='left';
    const words=(txt||'').split(' '); let line='', ty=y;
    words.forEach((w,i)=>{
      const t=line+w+' ';
      if(ctx.measureText(t).width>maxW && i>0){ctx.fillText(line.trim(),x,ty); line=w+' '; ty+=lh;}
      else line=t;
    });
    if(line.trim()) ctx.fillText(line.trim(),x,ty);
    return ty;
  }

  // ─── Draw a stat card (bold/minimal/glass) ───────────────────
  function drawCard(s, cx, cy, CW, CH){
    if(style==='bold'){
      rr(cx,cy,CW,CH,24,p.bg2);
      rr(cx,cy,8,CH,4,s.color);
      // Corner glow
      const cg=ctx.createRadialGradient(cx+CW,cy,0,cx+CW,cy,CW);
      cg.addColorStop(0,hexAlpha(s.color,0.12)); cg.addColorStop(1,'transparent');
      ctx.fillStyle=cg;
      ctx.beginPath();
      ctx.moveTo(cx+24,cy); ctx.lineTo(cx+CW-24,cy); ctx.quadraticCurveTo(cx+CW,cy,cx+CW,cy+24);
      ctx.lineTo(cx+CW,cy+CH-24); ctx.quadraticCurveTo(cx+CW,cy+CH,cx+CW-24,cy+CH);
      ctx.lineTo(cx+24,cy+CH); ctx.quadraticCurveTo(cx,cy+CH,cx,cy+CH-24);
      ctx.lineTo(cx,cy+24); ctx.quadraticCurveTo(cx,cy,cx+24,cy);
      ctx.closePath(); ctx.fill();
      // Icon
      ctx.font='34px serif'; ctx.textAlign='left';
      ctx.fillText(s.icon, cx+26, cy+52);
      // Label
      ctx.font='600 20px DM Sans,sans-serif'; ctx.fillStyle=p.muted;
      ctx.letterSpacing='2.5px'; ctx.fillText(s.label, cx+26, cy+90); ctx.letterSpacing='0px';
      // Value
      ctx.font='900 78px DM Sans,sans-serif'; ctx.fillStyle=s.color;
      ctx.fillText(s.value, cx+26, cy+168);
      const vw=ctx.measureText(s.value).width;
      // Unit
      ctx.font='500 28px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.text,0.38);
      ctx.fillText(s.unit, cx+26+vw+6, cy+160);
      // Sub
      if(s.sub){ ctx.font='400 22px DM Sans,sans-serif'; ctx.fillStyle=p.muted; ctx.fillText(s.sub,cx+26,cy+CH-38); }
      if(s.pct!==undefined) bar(cx+26,cy+CH-16,CW-52,8,s.pct,s.color);

    } else if(style==='minimal'){
      ctx.fillStyle=hexAlpha(s.color,0.5); ctx.fillRect(cx,cy,CW,2);
      ctx.font='600 19px DM Sans,sans-serif'; ctx.fillStyle=p.muted;
      ctx.letterSpacing='3px'; ctx.fillText(s.label,cx+4,cy+38); ctx.letterSpacing='0px';
      ctx.font='900 100px DM Sans,sans-serif'; ctx.fillStyle=s.color;
      ctx.fillText(s.value,cx+4,cy+148);
      ctx.font='400 26px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.text,0.4);
      ctx.fillText(s.unit,cx+4,cy+182);
      if(s.sub){ ctx.font='400 22px DM Sans,sans-serif'; ctx.fillStyle=p.muted; ctx.textAlign='right'; ctx.fillText(s.sub,cx+CW-4,cy+CH-12); ctx.textAlign='left'; }
      if(s.pct!==undefined){
        ctx.fillStyle=hexAlpha(p.muted,0.15); ctx.fillRect(cx,cy+CH-6,CW,2);
        ctx.fillStyle=s.color; ctx.fillRect(cx,cy+CH-6,CW*Math.min(1,s.pct),2);
      }

    } else { // glass
      const gf=ctx.createLinearGradient(cx,cy,cx,cy+CH);
      gf.addColorStop(0,hexAlpha(p.text,p.isDark?0.07:0.09));
      gf.addColorStop(1,hexAlpha(p.text,p.isDark?0.03:0.04));
      // Fill with gradient then stroke border
      ctx.beginPath();
      ctx.moveTo(cx+28,cy); ctx.lineTo(cx+CW-28,cy); ctx.quadraticCurveTo(cx+CW,cy,cx+CW,cy+28);
      ctx.lineTo(cx+CW,cy+CH-28); ctx.quadraticCurveTo(cx+CW,cy+CH,cx+CW-28,cy+CH);
      ctx.lineTo(cx+28,cy+CH); ctx.quadraticCurveTo(cx,cy+CH,cx,cy+CH-28);
      ctx.lineTo(cx,cy+28); ctx.quadraticCurveTo(cx,cy,cx+28,cy);
      ctx.closePath();
      ctx.fillStyle=gf; ctx.fill();
      ctx.strokeStyle=hexAlpha(p.text,0.14); ctx.lineWidth=1.5; ctx.stroke();
      // Top shimmer line
      const sh=ctx.createLinearGradient(cx,cy,cx+CW,cy);
      sh.addColorStop(0,'transparent'); sh.addColorStop(0.4,hexAlpha(p.text,0.08)); sh.addColorStop(1,'transparent');
      ctx.fillStyle=sh; ctx.fillRect(cx,cy,CW,1);
      // Icon badge top-right
      rr(cx+CW-72,cy+16,52,52,16,hexAlpha(s.color,0.2));
      ctx.font='26px serif'; ctx.textAlign='center'; ctx.fillText(s.icon,cx+CW-46,cy+50); ctx.textAlign='left';
      // Label
      ctx.font='600 19px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.text,0.5);
      ctx.letterSpacing='2px'; ctx.fillText(s.label,cx+22,cy+44); ctx.letterSpacing='0px';
      // Value
      ctx.font='900 80px DM Sans,sans-serif'; ctx.fillStyle=s.color;
      ctx.fillText(s.value,cx+22,cy+138);
      const vw3=ctx.measureText(s.value).width;
      ctx.font='500 26px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.text,0.35);
      ctx.fillText(s.unit,cx+22+vw3+6,cy+130);
      if(s.sub){ ctx.font='400 22px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.text,0.4); ctx.fillText(s.sub,cx+22,cy+CH-44); }
      if(s.pct!==undefined){
        const bw=CW-44;
        rr(cx+22,cy+CH-20,bw,8,4,hexAlpha(p.text,0.1));
        if(s.pct>0){
          rr(cx+22,cy+CH-20,Math.max(8,bw*Math.min(1,s.pct)),8,4,s.color);
          const bg2=ctx.createLinearGradient(cx+22,0,cx+22+bw,0);
          bg2.addColorStop(0,'transparent'); bg2.addColorStop(1,hexAlpha(s.color,0.4));
          ctx.beginPath();
          ctx.moveTo(cx+22+6,cy+CH-22); ctx.lineTo(cx+22+bw*Math.min(1,s.pct)-6,cy+CH-22);
          ctx.quadraticCurveTo(cx+22+bw*Math.min(1,s.pct),cy+CH-22,cx+22+bw*Math.min(1,s.pct),cy+CH-22+6);
          ctx.lineTo(cx+22+bw*Math.min(1,s.pct),cy+CH-22+6); ctx.quadraticCurveTo(cx+22+bw*Math.min(1,s.pct),cy+CH-22+12,cx+22+bw*Math.min(1,s.pct)-6,cy+CH-22+12);
          ctx.lineTo(cx+22+6,cy+CH-22+12); ctx.quadraticCurveTo(cx+22,cy+CH-22+12,cx+22,cy+CH-22+6);
          ctx.lineTo(cx+22,cy+CH-22+6); ctx.quadraticCurveTo(cx+22,cy+CH-22,cx+22+6,cy+CH-22);
          ctx.closePath();
          ctx.fillStyle=bg2; ctx.fill();
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // BACKGROUND
  // ─────────────────────────────────────────
  ctx.fillStyle=p.bg;
  ctx.fillRect(0,0,W,H);
  glow(W*0.85, H*0.08, 700, p.accent, 0.09);
  glow(W*0.1,  H*0.55, 550, p.accent2||p.accent, 0.06);
  glow(W*0.7,  H*0.85, 500, p.accent, 0.05);
  // Subtle diagonal grain
  ctx.save();
  ctx.strokeStyle=p.isDark?'rgba(255,255,255,0.025)':'rgba(0,0,0,0.03)';
  ctx.lineWidth=1;
  for(let i=-H;i<W+H;i+=48){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke(); }
  ctx.restore();

  const PAD=88;
  let y=0;

  // ─────────────────────────────────────────
  // TOP HEADER — logo, app name, date pill
  // ─────────────────────────────────────────
  const topBarH=8;
  const accentGrad=ctx.createLinearGradient(0,0,W,0);
  accentGrad.addColorStop(0,p.accent); accentGrad.addColorStop(0.5,p.accent2||p.accent); accentGrad.addColorStop(1,p.accent);
  ctx.fillStyle=accentGrad; ctx.fillRect(0,0,W,topBarH);

  y=100;
  const logoX=PAD, logoY=y;
  rr(logoX,logoY,72,72,18,p.accent);
  ctx.font='900 44px DM Sans,sans-serif'; ctx.fillStyle=p.bg; ctx.textAlign='center';
  ctx.fillText('V',logoX+36,logoY+51); ctx.textAlign='left';
  ctx.font='800 42px DM Sans,sans-serif'; ctx.fillStyle=p.text;
  ctx.fillText('MY VITALOG',logoX+92,logoY+30);
  ctx.font='400 28px DM Sans,sans-serif'; ctx.fillStyle=p.muted;
  ctx.fillText('myvitalog.com',logoX+92,logoY+62);
  // Date pill
  const dateStr=new Date(d.k+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  ctx.font='600 26px DM Sans,sans-serif';
  const dateW=ctx.measureText(dateStr).width+40;
  rr(W-PAD-dateW,logoY+12,dateW,46,23,p.bg2);
  ctx.fillStyle=p.muted; ctx.textAlign='center';
  ctx.fillText(dateStr,W-PAD-dateW/2,logoY+43); ctx.textAlign='left';
  y=logoY+120;

  // ─────────────────────────────────────────
  // HERO — big name
  // ─────────────────────────────────────────
  const name=d.s.name?d.s.name.split(' ')[0].toUpperCase():'TODAY';
  ctx.font='900 140px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(p.accent,0.12);
  ctx.fillText(name,PAD-6,y+120);
  ctx.font='900 140px DM Sans,sans-serif'; ctx.fillStyle=p.text;
  ctx.fillText(name,PAD,y+116);
  y+=168;
  // Divider
  const divGrad=ctx.createLinearGradient(PAD,0,W-PAD,0);
  divGrad.addColorStop(0,p.accent); divGrad.addColorStop(1,'transparent');
  ctx.fillStyle=divGrad; ctx.fillRect(PAD,y,W-PAD*2,2);
  y+=48;

  // ─────────────────────────────────────────
  // BUILD STAT LIST — respects user order
  // ─────────────────────────────────────────
  const stats=[];
  shareOrderItems.forEach(item=>{
    if(!item.checked) return;
    const id=item.id;
    if(id==='calories'){
      const pct=d.s.calGoal?Math.min(1,d.tCal/d.s.calGoal):0;
      const rem=(d.s.calGoal||0)-d.tCal;
      stats.push({id,icon:'🔥',label:'CALORIES',value:d.tCal.toLocaleString(),unit:'kcal',
        sub:d.s.calGoal?(rem>=0?rem+' to go':Math.abs(rem)+' over'):'',pct,color:p.accent});
    }
    if(id==='water'){
      const oz=d.water*(d.s.bottleOz||24);
      const pct=d.s.waterGoal?Math.min(1,oz/d.s.waterGoal):0;
      stats.push({id,icon:'💧',label:'HYDRATION',value:d.water,unit:'bottles',sub:oz+'oz today',pct,color:'#4fc3f7'});
    }
    if(id==='exercise'){
      const isRest=d.plan&&d.plan.rest;
      const pct=isRest?1:d.exTotal?Math.min(1,d.exDone/d.exTotal):0;
      stats.push({id,icon:'💪',label:'WORKOUT',value:isRest?'REST':d.exDone+'/'+d.exTotal,
        unit:isRest?'day':'done',sub:d.todayDay+' plan',pct,color:'#69f0ae'});
    }
    if(id==='sleep'&&d.sleep){
      const hr=Math.floor(d.sleep.mins/60),mn=d.sleep.mins%60;
      stats.push({id,icon:'😴',label:'SLEEP',value:hr+'h'+(mn?mn+'m':''),unit:'',
        sub:'Quality '+(d.sleep.quality||'—')+'/5',pct:Math.min(1,d.sleep.mins/480),color:'#ffab40'});
    }
    if(id==='weight'&&d.weight){
      stats.push({id,icon:'⚖️',label:'WEIGHT',value:parseFloat(d.weight).toFixed(1),unit:'lbs',
        sub:'Logged today',pct:undefined,color:'#4dd0e1'});
    }
    if(id==='supplements'){
      const pct=d.suppTotal?Math.min(1,d.suppDone/d.suppTotal):0;
      stats.push({id,icon:'💊',label:'SUPPLEMENTS',value:d.suppDone+'/'+d.suppTotal,
        unit:'taken',sub:Math.round(pct*100)+'% complete',pct,color:'#80cbc4'});
    }
    if(id==='mood'&&d.jd&&d.jd.mood){
      const mc={1:'#ef5350',2:'#ff8a65',3:'#b0bec5',4:'#66bb6a',5:'#d4e157'};
      const mn={1:'ROUGH',2:'LOW',3:'OKAY',4:'GOOD',5:'GREAT'};
      stats.push({id,icon:'✦',label:'MOOD',value:mn[d.jd.mood]||'—',unit:'',
        sub:'How you felt',pct:undefined,color:mc[d.jd.mood]||p.accent});
    }
    if(id==='journal'&&d.journalText){
      stats.push({id,fullWidth:true,type:'journal',text:d.journalText,color:'#b39ddb'});
    }
    if(id==='party'&&d.partyItems&&d.partyItems.length>0){
      // Only show party in share if the user has party favors enabled
      const partyEnabled=!!(getSettings().partyEnabled);
      if(partyEnabled){
        const names=d.partyItems.map(pi=>pi.name).join(' · ');
        stats.push({id,fullWidth:true,type:'party',text:names,color:'#c084fc'});
      }
    }
    if(id==='affirmation'&&d.affirmation){
      stats.push({id,fullWidth:true,type:'quote',text:d.affirmation,color:p.accent});
    }
  });

  // ─────────────────────────────────────────
  // DRAW CARDS — 2-col grid, full-width items break flow
  // ─────────────────────────────────────────
  const GAP=20, CW=(W-PAD*2-GAP)/2, CH=230;
  let rowY=y, pendingLeft=null;

  function flushLeft(){
    if(pendingLeft!==null){
      drawCard(pendingLeft,PAD,rowY,W-PAD*2,CH);
      rowY+=CH+GAP; pendingLeft=null;
    }
  }
  function drawFullWidth(s){
    flushLeft();
    const fwH = s.type==='journal' ? 240 : 200;
    const bgColor = style==='minimal'?'transparent':hexAlpha(p.text,p.isDark?0.05:0.08);
    const borderColor = style==='glass'?hexAlpha(p.text,0.12):null;
    rr(PAD,rowY,W-PAD*2,fwH,24,bgColor,borderColor,1);
    rr(PAD,rowY,6,fwH,3,s.color);
    // Label badge
    ctx.font='600 18px DM Sans,sans-serif'; ctx.fillStyle=hexAlpha(s.color,0.9);
    ctx.letterSpacing='1.5px';
    const labelText = s.type==='journal'?'TODAY\'S NOTE': s.type==='party'?'TONIGHT':'DAILY QUOTE';
    ctx.fillText(labelText,PAD+26,rowY+32); ctx.letterSpacing='0px';
    wrapText(PAD+26,rowY+76,s.text,W-PAD*2-60,s.type==='journal'?28:32,'400',hexAlpha(p.text,0.88),46);
    rowY+=fwH+GAP;
  }

  for(let i=0;i<stats.length;i++){
    const s=stats[i];
    if(s.fullWidth){
      drawFullWidth(s);
    } else {
      if(pendingLeft===null){ pendingLeft=s; }
      else {
        drawCard(pendingLeft,PAD,rowY,CW,CH);
        drawCard(s,PAD+CW+GAP,rowY,CW,CH);
        rowY+=CH+GAP; pendingLeft=null;
      }
    }
  }
  flushLeft();
  y=rowY+12;

  // ─────────────────────────────────────────
  // MACROS PANEL — full-width
  // ─────────────────────────────────────────
  const macrosEnabled=shareOrderItems.find(it=>it.id==='macros'&&it.checked);
  if(macrosEnabled&&(d.tP||d.tC||d.tF)){
    const MH=220;
    rr(PAD,y,W-PAD*2,MH,28,p.bg2);
    rr(PAD,y,W-PAD*2,5,2,hexAlpha(p.accent,0.5));
    ctx.font='700 22px DM Sans,sans-serif'; ctx.letterSpacing='2px'; ctx.fillStyle=p.muted;
    ctx.fillText('MACROS',PAD+32,y+46); ctx.letterSpacing='0px';
    const macroList=[
      {label:'Protein',val:d.tP,goal:d.s.protGoal,color:'#4fc3f7'},
      {label:'Carbs',  val:d.tC,goal:d.s.carbGoal,color:'#ffcc02'},
      {label:'Fat',    val:d.tF,goal:d.s.fatGoal,  color:'#ce93d8'},
    ];
    const mw=(W-PAD*2-64-40)/3;
    macroList.forEach((m,i)=>{
      const mx=PAD+32+i*(mw+20);
      rr(mx,y+62,mw,84,14,hexAlpha(m.color,0.08));
      ctx.font='900 58px DM Sans,sans-serif'; ctx.fillStyle=m.color;
      ctx.fillText(m.val+'g',mx+14,y+120);
      ctx.font='500 24px DM Sans,sans-serif'; ctx.fillStyle=p.muted;
      ctx.fillText(m.label+(m.goal?' / '+m.goal+'g':''),mx+14,y+148);
      bar(mx,y+158,mw,8,m.goal?Math.min(1,m.val/m.goal):0,m.color);
    });
    y+=MH+GAP;
  }

  // ─────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────
  const footerY=H-100;
  const fg=ctx.createLinearGradient(PAD,0,W-PAD,0);
  fg.addColorStop(0,'transparent'); fg.addColorStop(0.3,p.accent);
  fg.addColorStop(0.7,p.accent2||p.accent); fg.addColorStop(1,'transparent');
  ctx.fillStyle=fg; ctx.fillRect(PAD,footerY,W-PAD*2,2);
  ctx.font='800 32px DM Sans,sans-serif'; ctx.fillStyle=p.accent; ctx.textAlign='center';
  ctx.fillText('MY VITALOG',W/2,footerY+46);
  ctx.font='400 24px DM Sans,sans-serif'; ctx.fillStyle=p.muted;
  ctx.fillText('Track · Share · Improve  ·  myvitalog.com',W/2,footerY+78);
  ctx.textAlign='left';
}

function downloadShareCard(){
  drawShareCard();
  const canvas = document.getElementById('share-canvas');
  const link = document.createElement('a');
  const dateStr = dateKey(shareOffset);
  link.download = `vitalog-${dateStr}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('✓ Story saved!');
}

async function copyShareCard(){
  drawShareCard();
  const canvas = document.getElementById('share-canvas');
  try{
    canvas.toBlob(async blob=>{
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      showToast('✓ Copied to clipboard!');
    },'image/png');
  }catch(e){
    showToast('Copy not supported — use Download instead');
  }
}

// ════════════════════════════════════════
// CSV EXPORT
// ════════════════════════════════════════
function exportHealthCSV(){
  // dr-days may not exist in DOM if Settings isn't the active tab — read safely
  const daysEl = document.getElementById('dr-days');
  const days = daysEl ? parseInt(daysEl.value) : 30;
  const rows = [];
  const headers = ['Date','Calories (kcal)','Protein (g)','Carbs (g)','Fat (g)','Food Cost ($)','Water (bottles)','Water (oz)','Sleep (hrs)','Sleep Quality','Weight (lbs)','Mood (1-5)',
    'BP Systolic (mmHg)','BP Diastolic (mmHg)','Heart Rate (bpm)','Blood Glucose (mg/dL)','HRV (ms)','Body Temp (°F)','SpO2 (%)','Steps','Resp Rate (brpm)'];
  rows.push(headers);
  const s = getSettings();
  const bottleOz = s.bottleOz || 24;
  for(let i=0; i<days; i++){
    const k = dateKey(-i);
    const foods = getFoods(k);
    let cal=0,prot=0,carb=0,fat=0,cost=0;
    foods.forEach(f=>{cal+=f.cal||0;prot+=f.p||0;carb+=f.c||0;fat+=f.f||0;cost+=(f.cost||0);});
    const water = getWater(k);
    const sl = getSleep(k);
    let sleepHrs='', sleepQ='';
    if(sl){
      if(sl.mins){ sleepHrs=(sl.mins/60).toFixed(2); sleepQ=sl.quality||''; }
      else if(sl.bed && sl.wake){
        const [bh,bm]=sl.bed.split(':').map(Number);
        const [wh,wm]=sl.wake.split(':').map(Number);
        let mins=(wh*60+wm)-(bh*60+bm);
        if(mins<0)mins+=1440;
        sleepHrs=(mins/60).toFixed(2); sleepQ=sl.quality||'';
      }
    }
    const weight = getWeight(k) || '';
    const jd = getJournalData(k);
    const mood = jd?.mood || '';
    const bio = getBiometrics(k);
    rows.push([
      k, cal||'', prot||'', carb||'', fat||'', cost?cost.toFixed(2):'',
      water||'', water?(water*bottleOz):'',
      sleepHrs, sleepQ, weight, mood,
      bio.bp_sys||'', bio.bp_dia||'', bio.hr||'', bio.glucose||'', bio.hrv||'', bio.temp||'', bio.spo2||'', bio.steps||'', bio.resp||''
    ]);
  }
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vitalog-export-${dateKey(0)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  showToast('✓ CSV downloaded — '+days+' days');
}

// Init: authenticate then preload all data before rendering
(async () => {
  const ok = await authInit();
  if (!ok) return;
  await preloadAllData();
  initTheme();
  initSidebar();
  // Update sidebar name from settings
  const s = getSettings();
  if (s.name) {
    const el = document.getElementById('sidebar-user-name');
    if (el) el.textContent = s.name;
    const av = document.getElementById('sidebar-avatar');
    if (av) av.textContent = s.name.charAt(0).toUpperCase();
  }
  // Apply saved color scheme
  if(s.colorScheme && s.colorScheme!=='default'){
    document.documentElement.setAttribute('data-scheme', s.colorScheme);
  }
  renderAITab();
  renderExercise();
  // Party Favors visibility
  applyPartyFavorsVisibility();
  // Period Tracker visibility
  applyPeriodVisibility();
  // Optional feature visibility
  applyAllFeatureVisibility();
  // AI tab Enter key
  const aiInput = document.getElementById('ai-tab-input');
  if(aiInput) aiInput.addEventListener('keydown', e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter') sendTabMessage();
  });
  // Start tutorial for first-time users
  checkAndStartTutorial();
  // Monday weekly summary
  checkAndShowWeeklySummary();
  // Chat bubble
  initChatBubble();
  // Hide loading screen
  const ls = document.getElementById('loading-screen');
  if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.remove(), 500); }
})();

// ════════════════════════════════════════
// POOP TRACKER
// ════════════════════════════════════════
const BRISTOL_TYPES = [
  {type:1, icon:'🪨', label:'Type 1', desc:'Separate hard lumps', note:'Severe constipation'},
  {type:2, icon:'🫘', label:'Type 2', desc:'Lumpy sausage shape', note:'Mild constipation'},
  {type:3, icon:'🌭', label:'Type 3', desc:'Sausage with cracks', note:'Normal'},
  {type:4, icon:'🍌', label:'Type 4', desc:'Smooth sausage', note:'Ideal'},
  {type:5, icon:'🫐', label:'Type 5', desc:'Soft blobs', note:'Lacking fiber'},
  {type:6, icon:'💧', label:'Type 6', desc:'Mushy, ragged', note:'Mild diarrhea'},
  {type:7, icon:'🌊', label:'Type 7', desc:'Watery, liquid', note:'Severe diarrhea'},
];

const POOP_COLORS = [
  {id:'brown',  label:'Brown',     hex:'#8B4513', note:'Normal'},
  {id:'yellow', label:'Yellow',    hex:'#EAB308', note:'May indicate fast transit or infection'},
  {id:'green',  label:'Green',     hex:'#16A34A', note:'Fast transit or leafy greens'},
  {id:'black',  label:'Black',     hex:'#1F2937', note:'See a doctor if not iron supplements'},
  {id:'red',    label:'Red',       hex:'#DC2626', note:'See a doctor — possible bleeding'},
  {id:'pale',   label:'Pale/Grey', hex:'#9CA3AF', note:'May indicate liver issue'},
];

let poopOffset = 0;
function poopChangeDay(d){poopOffset+=d;renderPoop();}
function poopGoToToday(){poopOffset=0;renderPoop();}

function renderPoop(){
  const k=dateKey(poopOffset);
  const dateEl=document.getElementById('poop-date-display');
  if(dateEl) dateEl.textContent=fmtDate(poopOffset);
  const todayBadge=document.getElementById('poop-today-badge');
  if(todayBadge) todayBadge.style.display=poopOffset===0?'':'none';
  const backBtn=document.getElementById('poop-back-today');
  if(backBtn) backBtn.style.display=poopOffset===0?'none':'';
  const logs=getPoopLog(k);
  const container=document.getElementById('poop-log-list');
  if(!container) return;
  if(logs.length===0){
    container.innerHTML='<div class="dv-empty" style="text-align:center;padding:20px 0;color:var(--muted)">No entries yet today. Log your first below.</div>';
  } else {
    container.innerHTML=logs.map((entry,i)=>`
      <div class="poop-entry-card">
        <div class="poop-entry-top">
          ${entry.time?`<span class="poop-entry-time">${entry.time}</span>`:''}
          <span class="poop-entry-type">${BRISTOL_TYPES.find(b=>b.type===entry.type)?.icon||'💩'} Type ${entry.type||'?'} — ${BRISTOL_TYPES.find(b=>b.type===entry.type)?.note||''}</span>
          ${entry.color?`<span class="poop-color-dot" style="background:${POOP_COLORS.find(c=>c.id===entry.color)?.hex||'#8B4513'}" title="${POOP_COLORS.find(c=>c.id===entry.color)?.label||entry.color}"></span>`:''}
          <button class="del-btn" style="margin-left:auto" onclick="deletePoopEntry(${i})">×</button>
        </div>
        ${entry.notes?`<div class="poop-entry-notes">${entry.notes}</div>`:''}
      </div>
    `).join('');
  }
}

function logPoop(){
  const k=dateKey(poopOffset);
  const timeEl=document.getElementById('poop-time');
  const typeEl=document.getElementById('poop-type');
  const notesEl=document.getElementById('poop-notes');
  const colorEl=document.querySelector('.poop-color-btn.selected');
  const entry={
    time:timeEl?timeEl.value:'',
    type:typeEl?parseInt(typeEl.value)||0:0,
    color:colorEl?colorEl.dataset.color:'',
    notes:notesEl?notesEl.value.trim():'',
    ts:Date.now()
  };
  if(!entry.type){showToast('Select a Bristol type first');return;}
  const logs=getPoopLog(k);
  logs.push(entry);
  setPoopLog(k,logs);
  if(typeEl) typeEl.value='';
  if(notesEl) notesEl.value='';
  document.querySelectorAll('.poop-color-btn').forEach(b=>b.classList.remove('selected'));
  renderPoop();
  showToast('💩 Logged!');
}

function deletePoopEntry(i){
  const k=dateKey(poopOffset);
  const logs=getPoopLog(k);
  logs.splice(i,1);
  setPoopLog(k,logs);
  renderPoop();
}

function selectPoopColor(btn){
  document.querySelectorAll('.poop-color-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ════════════════════════════════════════
// INTIMACY TRACKER
// ════════════════════════════════════════
let sexOffset = 0;
function sexChangeDay(d){sexOffset+=d;renderSex();}
function sexGoToToday(){sexOffset=0;renderSex();}

function renderSex(){
  const k=dateKey(sexOffset);
  const dateEl=document.getElementById('sex-date-display');
  if(dateEl) dateEl.textContent=fmtDate(sexOffset);
  const todayBadge=document.getElementById('sex-today-badge');
  if(todayBadge) todayBadge.style.display=sexOffset===0?'':'none';
  const backBtn=document.getElementById('sex-back-today');
  if(backBtn) backBtn.style.display=sexOffset===0?'none':'';
  const logs=getSexLog(k);
  const container=document.getElementById('sex-log-list');
  if(!container) return;
  if(logs.length===0){
    container.innerHTML='<div class="dv-empty" style="text-align:center;padding:20px 0;color:var(--muted)">No entries yet today.</div>';
  } else {
    const partnerLabels={solo:'Solo',partner:'With Partner',both:'Both'};
    container.innerHTML=logs.map((e,i)=>`
      <div class="sex-entry-card">
        <div class="sex-entry-top">
          ${e.time?`<span class="sex-entry-time">${e.time}</span>`:''}
          ${e.partner?`<span class="sex-entry-stat">👤 ${partnerLabels[e.partner]||e.partner}</span>`:''}
          ${e.duration?`<span class="sex-entry-stat">⏱ ${e.duration} min</span>`:''}
          ${e.protection?`<span class="sex-entry-stat">🛡 Protected</span>`:''}
          ${e.energy?`<span class="sex-entry-stat">⚡ ${e.energy}/5 after</span>`:''}
          <button class="del-btn" style="margin-left:auto" onclick="deleteSexEntry(${i})">×</button>
        </div>
        ${e.notes?`<div class="sex-entry-notes">${e.notes}</div>`:''}
      </div>
    `).join('');
  }
}

function logSex(){
  const k=dateKey(sexOffset);
  const entry={
    time:(document.getElementById('sex-time')?.value)||'',
    partner:(document.getElementById('sex-partner')?.value)||'',
    duration:parseInt(document.getElementById('sex-duration')?.value)||0,
    protection:document.getElementById('sex-protection')?.checked||false,
    energy:parseInt(document.getElementById('sex-energy')?.value)||0,
    notes:(document.getElementById('sex-notes')?.value||'').trim(),
    ts:Date.now()
  };
  const logs=getSexLog(k);
  logs.push(entry);
  setSexLog(k,logs);
  ['sex-time','sex-duration','sex-energy','sex-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const sel=document.getElementById('sex-partner');if(sel)sel.value='';
  const cb=document.getElementById('sex-protection');if(cb)cb.checked=false;
  renderSex();
  showToast('✓ Logged!');
}

function deleteSexEntry(i){
  const k=dateKey(sexOffset);
  const logs=getSexLog(k);
  logs.splice(i,1);
  setSexLog(k,logs);
  renderSex();
}

// ════════════════════════════════════════
// HEALTH CONDITIONS & SENSITIVITIES
// ════════════════════════════════════════
const HEALTH_CONDITIONS = [
  // Allergies
  { id:'gluten',      label:'Gluten / Celiac',          group:'Allergies & Intolerances', icon:'🌾', avoid:'gluten, wheat, barley, rye, spelt, triticale, malt, brewer\'s yeast' },
  { id:'dairy',       label:'Dairy / Lactose',          group:'Allergies & Intolerances', icon:'🥛', avoid:'milk, cheese, butter, cream, lactose, whey, casein, dairy' },
  { id:'nuts',        label:'Tree Nuts',                 group:'Allergies & Intolerances', icon:'🥜', avoid:'almonds, cashews, walnuts, pecans, pistachios, macadamia, Brazil nuts, hazelnuts, tree nuts' },
  { id:'peanuts',     label:'Peanuts',                   group:'Allergies & Intolerances', icon:'🥜', avoid:'peanuts, peanut butter, peanut oil, groundnuts' },
  { id:'shellfish',   label:'Shellfish',                 group:'Allergies & Intolerances', icon:'🦐', avoid:'shrimp, crab, lobster, clams, oysters, scallops, shellfish' },
  { id:'fish',        label:'Fish',                      group:'Allergies & Intolerances', icon:'🐟', avoid:'fish, salmon, tuna, cod, tilapia, bass, flounder, anchovies, fish sauce' },
  { id:'eggs',        label:'Eggs',                      group:'Allergies & Intolerances', icon:'🥚', avoid:'eggs, egg whites, egg yolks, albumin, mayonnaise' },
  { id:'soy',         label:'Soy',                       group:'Allergies & Intolerances', icon:'🫘', avoid:'soy, soybean, edamame, tofu, tempeh, miso, soy sauce, soy lecithin, soy milk' },
  { id:'corn',        label:'Corn',                      group:'Allergies & Intolerances', icon:'🌽', avoid:'corn, corn starch, corn syrup, high fructose corn syrup, popcorn, cornmeal' },
  { id:'sesame',      label:'Sesame',                    group:'Allergies & Intolerances', icon:'🌿', avoid:'sesame, tahini, sesame oil, sesame seeds, hummus' },
  { id:'nightshade',  label:'Nightshades',               group:'Allergies & Intolerances', icon:'🍅', avoid:'tomatoes, peppers, eggplant, potatoes (not sweet potato), goji berries, nightshades' },
  { id:'fructose',    label:'Fructose / FODMAP',         group:'Allergies & Intolerances', icon:'🍎', avoid:'high-fructose foods, onions, garlic, legumes, certain fruits — follow low-FODMAP guidance' },
  // Metabolic & Chronic
  { id:'diabetes',    label:'Type 2 Diabetes',           group:'Metabolic & Chronic',      icon:'🩸', avoid:'high-sugar foods, refined carbs, white bread, sugary drinks, candy — watch glycemic index' },
  { id:'diabetes1',   label:'Type 1 Diabetes',           group:'Metabolic & Chronic',      icon:'🩸', avoid:'unplanned simple sugars — carefully count carbohydrates for insulin dosing' },
  { id:'prediabetes', label:'Pre-Diabetes / IR',         group:'Metabolic & Chronic',      icon:'⚠️', avoid:'refined sugars, white rice, white bread, sugary beverages — favor low-GI foods' },
  { id:'thyroid',     label:'Thyroid Condition',         group:'Metabolic & Chronic',      icon:'🦋', avoid:'excessive raw goitrogenic foods (kale, broccoli, soy) if hypothyroid — consult doctor' },
  { id:'gerd',        label:'GERD / Acid Reflux',        group:'Metabolic & Chronic',      icon:'🔥', avoid:'tomato sauce, citrus, coffee, alcohol, spicy foods, chocolate, fried foods, mint, GERD triggers' },
  { id:'ibs',         label:'IBS / IBD',                 group:'Metabolic & Chronic',      icon:'🫁', avoid:'high-FODMAP foods, raw onions, garlic, legumes, gluten (if sensitive), carbonated drinks' },
  { id:'kidney',      label:'Kidney Disease / CKD',      group:'Metabolic & Chronic',      icon:'🫀', avoid:'high potassium (bananas, potatoes, tomatoes), high phosphorus (dairy, nuts, seeds), excess protein, high sodium' },
  { id:'hypertension',label:'High Blood Pressure',       group:'Metabolic & Chronic',      icon:'💗', avoid:'high-sodium foods, processed meats, canned soups, fast food, pickled foods, excess salt — follow DASH diet' },
  { id:'gout',        label:'Gout / High Uric Acid',    group:'Metabolic & Chronic',      icon:'🦵', avoid:'organ meats, anchovies, sardines, shellfish, red meat, beer, high-fructose corn syrup, alcohol' },
  { id:'high_chol',   label:'High Cholesterol',          group:'Metabolic & Chronic',      icon:'🫀', avoid:'trans fats, saturated fats, fried foods, processed meats, full-fat dairy — favor fiber and omega-3s' },
  // Dietary
  { id:'vegan',       label:'Vegan',                     group:'Dietary Lifestyle',        icon:'🌱', avoid:'all animal products: meat, poultry, fish, dairy, eggs, honey, gelatin, whey, casein' },
  { id:'vegetarian',  label:'Vegetarian',                group:'Dietary Lifestyle',        icon:'🥦', avoid:'meat, poultry, fish, seafood — may include dairy and eggs' },
  { id:'keto',        label:'Keto / Low-Carb',           group:'Dietary Lifestyle',        icon:'🥑', avoid:'bread, pasta, rice, sugar, potatoes, most fruit — keep net carbs under 20–50g/day' },
  { id:'halal',       label:'Halal',                     group:'Dietary Lifestyle',        icon:'☪️', avoid:'pork, alcohol, non-halal-certified meat, blood, carnivorous animals' },
  { id:'kosher',      label:'Kosher',                    group:'Dietary Lifestyle',        icon:'✡️', avoid:'pork, shellfish, mixing meat and dairy, non-kosher-certified products' },
  { id:'histamine',   label:'Histamine Intolerance',     group:'Dietary Lifestyle',        icon:'🤧', avoid:'aged cheeses, fermented foods, wine, beer, vinegar, processed meats, spinach, avocado, tomatoes' },
];

function renderConditions() {
  const grid = document.getElementById('conditions-grid');
  if (!grid) return;
  const s = getSettings();
  const saved = s.conditions || {};
  const groups = {};
  HEALTH_CONDITIONS.forEach(c => {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  });
  let html = '';
  Object.keys(groups).forEach(grp => {
    html += `<div class="condition-group-label">${grp}</div>`;
    groups[grp].forEach(c => {
      const on = !!saved[c.id];
      html += `<div class="condition-chip${on?' condition-chip-on':''}" onclick="toggleCondition('${c.id}',this)" data-id="${c.id}">
        <span class="condition-chip-icon">${c.icon}</span>
        <span class="condition-chip-label">${c.label}</span>
        ${on ? '<span class="condition-chip-check">✓</span>' : ''}
      </div>`;
    });
  });
  grid.innerHTML = html;
}

function toggleCondition(id, el) {
  el.classList.toggle('condition-chip-on');
  const isOn = el.classList.contains('condition-chip-on');
  el.innerHTML = el.innerHTML.replace(/<span class="condition-chip-check">.*?<\/span>/,'');
  if (isOn) el.innerHTML += '<span class="condition-chip-check">✓</span>';
}

function saveConditions() {
  const s = getSettings();
  const chips = document.querySelectorAll('#conditions-grid .condition-chip');
  const conditions = {};
  chips.forEach(chip => {
    conditions[chip.dataset.id] = chip.classList.contains('condition-chip-on');
  });
  s.conditions = conditions;
  lsSet('settings', s);
  showToast('✓ Conditions saved!');
}

function getConditionAvoidList() {
  const s = getSettings();
  const saved = s.conditions || {};
  const active = HEALTH_CONDITIONS.filter(c => saved[c.id]);
  if (!active.length) return '';
  return active.map(c => c.label + ': avoid ' + c.avoid).join('; ');
}