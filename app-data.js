/* ============================================================
   Sample data for the Vitalog prototype.
   In production this is replaced by real user data from
   localStorage / Supabase.
   ============================================================ */

window.VITALOG_DATA = {
  user: {
    name: 'Dallas',
    email: 'dallaswp13@gmail.com',
    initial: 'D',
    goals: { kcal: 2200, protein: 160, carbs: 220, fat: 70, water: 100, weight: 168 },
    conditions: ['Lactose Intolerance', 'High Cholesterol'],
  },

  today: {
    date: 'Tuesday · May 26',
    kcal: { used: 1840, goal: 2200 },
    protein: { used: 128, goal: 160 },
    carbs: { used: 168, goal: 220 },
    fat: { used: 58, goal: 70 },
    water: { used: 72, goal: 100, unit: 'oz' },
    weight: 172.6,
    weightDelta: -0.2,
    sleepLast: { hours: 7.4, quality: 4, bedtime: '23:18', wake: '06:42' },
    mood: 4,
    energy: 4,
    streakDays: 23,
  },

  meals: [
    { time: '07:12', type: 'Breakfast', name: 'Oats, blueberries, walnuts, honey',  kcal: 412, p: 14, c: 64, f: 12, cost: 3.40 },
    { time: '10:30', type: 'Snack',     name: 'Greek yogurt + flax',                kcal: 180, p: 18, c: 12, f: 5,  cost: 1.80 },
    { time: '12:45', type: 'Lunch',     name: 'Chicken bowl, greens, avocado',      kcal: 624, p: 42, c: 58, f: 24, cost: 11.20 },
    { time: '15:20', type: 'Coffee',    name: 'Oat milk latte',                     kcal: 92,  p: 4,  c: 14, f: 3,  cost: 5.50 },
    { time: '18:50', type: 'Dinner',    name: 'Salmon, rice, broccoli, lemon',      kcal: 532, p: 50, c: 42, f: 18, cost: 14.80 },
  ],

  weightSeries: [175.0, 174.6, 174.2, 174.5, 173.8, 173.5, 173.7, 173.1, 172.9, 173.0, 172.6, 172.4, 172.6, 172.4, 172.6],
  kcalSeries:   [2050, 1980, 2240, 1820, 2010, 1950, 1840],
  proteinSeries:[145, 132, 168, 124, 152, 138, 128],
  sleepSeries:  [6.2, 7.1, 6.8, 7.4, 7.9, 7.6, 8.2, 7.4],
  hrvSeries:    [42, 45, 41, 48, 51, 47, 49, 52],
  restingHRSeries:[58, 59, 57, 56, 56, 55, 54, 55],

  workouts: [
    { day: 'Mon', name: 'Push · Chest + shoulders', planned: true, done: true,  minutes: 52 },
    { day: 'Tue', name: 'Pull · Day 4',             planned: true, done: false, minutes: 45, active: true },
    { day: 'Wed', name: 'Easy run · 4 mi',          planned: true, done: false, minutes: 36 },
    { day: 'Thu', name: 'Legs · Squat day',         planned: true, done: false, minutes: 60 },
    { day: 'Fri', name: 'Rest',                     planned: false, done: false, minutes: 0 },
    { day: 'Sat', name: 'Long run · 8 mi',          planned: true, done: false, minutes: 72 },
    { day: 'Sun', name: 'Mobility + yoga',          planned: true, done: false, minutes: 30 },
  ],
  // Sets for the active Pull workout
  pullSession: [
    { n: 1, name: 'Deadlift',        sets: 4, reps: 5,  weight: 245, done: 4 },
    { n: 2, name: 'Pull-up',         sets: 4, reps: 8,  weight: 'BW + 15', done: 3 },
    { n: 3, name: 'Row, barbell',    sets: 4, reps: 8,  weight: 135, done: 1, active: true },
    { n: 4, name: 'Face pull',       sets: 3, reps: 12, weight: 40, done: 0 },
    { n: 5, name: 'Curl',            sets: 3, reps: 10, weight: 30, done: 0 },
    { n: 6, name: 'Plank',           sets: 3, reps: '45s', weight: '—', done: 0 },
  ],

  prs: [
    { lift: 'Deadlift',   weight: 245, reps: 5, when: 'Today',       up: 10 },
    { lift: 'Bench',      weight: 185, reps: 5, when: '3 days ago',  up: 5 },
    { lift: 'Squat',      weight: 265, reps: 5, when: '1 week ago',  up: 15 },
    { lift: 'Overhead',   weight: 115, reps: 5, when: '2 weeks ago', up: 5 },
    { lift: 'Row, barbell', weight: 135, reps: 8, when: '3 weeks ago', up: 10 },
  ],

  supplements: [
    { name: 'Vitamin D3',   dose: '5,000 IU',  time: 'AM',  taken: true },
    { name: 'Magnesium glycinate', dose: '400 mg', time: 'PM', taken: false },
    { name: 'Omega 3',      dose: '2 g',       time: 'AM',  taken: true },
    { name: 'Creatine',     dose: '5 g',       time: 'AM',  taken: true },
    { name: 'Zinc',         dose: '15 mg',     time: 'PM',  taken: false },
    { name: 'Probiotic',    dose: '50 B CFU',  time: 'AM',  taken: true },
  ],

  selfCare: [
    { name: 'Morning skincare', time: 'AM', done: true },
    { name: 'Meditation · 10m', time: 'AM', done: true },
    { name: 'Stretching · 15m', time: 'PM', done: false },
    { name: 'Evening skincare', time: 'PM', done: false },
    { name: 'Read · 20m',       time: 'PM', done: false },
  ],

  biometrics: [
    { key:'weight',  label:'Weight',         unit:'lb',   value:172.6, delta:-0.2, series:[175,174.6,174.2,174.5,173.8,173.5,173.7,173.1,172.9,172.6,172.4,172.6] },
    { key:'bf',      label:'Body fat',       unit:'%',    value:16.4,  delta:-0.3, series:[17.4,17.2,17.0,16.9,16.7,16.6,16.4,16.4] },
    { key:'bp',      label:'Blood pressure', unit:'',     value:'118/74', delta:null, series:[122,120,121,119,118,118,117,118] },
    { key:'rhr',     label:'Resting HR',     unit:'bpm',  value:55,    delta:-2,  series:[58,59,57,56,56,55,54,55] },
    { key:'hrv',     label:'HRV',            unit:'ms',   value:52,    delta:+4,  series:[42,45,41,48,51,47,49,52] },
    { key:'spo2',    label:'SpO₂',           unit:'%',    value:98,    delta:null, series:[97,98,98,97,98,98,99,98] },
    { key:'gluc',    label:'Glucose',        unit:'mg/dL',value:92,    delta:null, series:[95,98,94,97,93,95,92,92] },
    { key:'waist',   label:'Waist',          unit:'in',   value:32.5,  delta:-0.5, series:[33.5,33.4,33.2,33.0,33.0,32.8,32.6,32.5] },
  ],

  insightThisWeek: {
    title: 'You slept 52 min more on evenings you finished eating before 8 pm.',
    body:  'Mood scores tracked the same way — averaging 4.2 on early-dinner nights vs 3.5 on late nights. Worth experimenting with for the next week or two.',
    correlations: [
      { l: 'Protein vs strength',    v: '+0.74', dir: 'pos' },
      { l: 'Late meals vs sleep',    v: '−0.61', dir: 'neg' },
      { l: 'Steps vs mood',          v: '+0.42', dir: 'pos' },
      { l: 'Caffeine after 2pm vs sleep', v: '−0.38', dir: 'neg' },
    ],
  },

  chat: [
    { who: 'ai',   text: "Good morning Dallas. You're 360 kcal and 32g protein into your goal — about average for a Tuesday. Anything to log?" },
    { who: 'user', text: "Had oats with blueberries, walnuts, and a drizzle of honey. Going for a 4 mile run after work." },
    { who: 'ai',   text: "Logged. That breakfast comes to ~412 kcal · 14g P · 64g C · 12g F. I'll pencil in a 4 mile easy run for tonight — based on your pace last week that should run ~38 min and ~410 kcal. Want me to remind you at 17:30?" },
  ],

  journalToday: {
    morning: "Slept hard. Long run felt easy yesterday. Feeling clear and ready to lift heavy.",
    dream: "Hiking in a place that looked like the Dolomites. Stopped at a hut for coffee.",
  },

  history: [
    { date: 'Mon, May 25', kcal: 1950, protein: 138, water: 88, weight: 172.8, sleep: 7.6, mood: 4 },
    { date: 'Sun, May 24', kcal: 2010, protein: 152, water: 92, weight: 173.0, sleep: 7.9, mood: 5 },
    { date: 'Sat, May 23', kcal: 1820, protein: 124, water: 76, weight: 173.1, sleep: 7.4, mood: 3 },
    { date: 'Fri, May 22', kcal: 2240, protein: 168, water: 104, weight: 173.5, sleep: 6.8, mood: 4 },
    { date: 'Thu, May 21', kcal: 1980, protein: 132, water: 90, weight: 173.7, sleep: 7.1, mood: 4 },
  ],
};
