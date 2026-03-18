<div align="center">

<img src="icons/icon-192.png" alt="Vitalog Logo" width="80" />

# VITALOG

### Your personal health operating system.

**Track everything that matters — diet, exercise, sleep, biometrics, supplements, self care, and more — in one beautifully simple app.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-myvitalog.com-E8FF47?style=for-the-badge&logo=vercel&logoColor=black)](https://myvitalog.com)
[![Built with JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Powered by Claude AI](https://img.shields.io/badge/AI-Claude%20by%20Anthropic-E8FF47?style=for-the-badge)](https://anthropic.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa)](https://myvitalog.com)

---

![Vitalog Dashboard](docs/screenshots/dashboard.png)

</div>

---

## 🌟 What is Vitalog?

Vitalog is a **full-featured personal health tracker** built as a progressive web app (PWA). It combines AI-powered natural language logging with detailed manual tracking across every dimension of personal health — all without subscriptions, ads, or data harvesting.

The goal is simple: **give individuals a private, beautiful, all-in-one health dashboard** that feels as powerful as the tools used by professional athletes and health-obsessed founders, but accessible to everyone.

> *Built from scratch as a solo full-stack project. Every line of code, every design decision, every feature shipped by one developer.*

---

## ✨ Core Features

### 🤖 AI Health Assistant
Log anything in plain English. The AI understands context — your goals, conditions, dietary restrictions, past logs — and saves everything structured in the background.

> *"Had scrambled eggs and coffee for breakfast, went for a 3 mile run, feeling a bit tired today"*

The assistant parses meals, workouts, sleep, mood, weight, and water in a single message and logs it all at once. It also generates daily summaries, answers health questions, and offers personalized recommendations based on your full health profile.

![AI Assistant](docs/screenshots/ai_assistant.png)

---

### 🥗 Diet & Nutrition Tracking
- Log meals manually or via the Quick Add panel
- Full macro breakdown: calories, protein, carbs, fat
- Daily calorie and protein goal progress rings
- Meal cost tracking per item
- Visual daily summary with remaining macros
- Full meal history by date

![Diet Tracking](docs/screenshots/diet.png)

---

### 💪 Exercise & Workout Logging
- Pre-built weekly workout plan (fully customizable per day)
- Custom workout builder — create and save your own routines
- **Workout session logger** — log exercise name, sets, reps, weight, duration, distance
- **Automatic PR detection** — when you beat your previous best weight on any lift, it's flagged as a Personal Record instantly
- Personal Records board with full history

![Exercise](docs/screenshots/exercise.png)

---

### 💧 Water & Hydration
- Tap-to-add hydration logging with custom bottle sizes
- Daily water goal with visual progress
- Quick-add presets for common amounts
- Full history by date

---

### 😴 Sleep Tracker
- Log bedtime, wake time, and sleep quality
- Duration calculated automatically
- Mood and energy on wake tracked
- Sleep notes and trends over time

![Sleep](docs/screenshots/sleep.png)

---

### 📊 Biometrics
Track the numbers that matter most:
- Weight, body fat %, BMI
- Blood pressure, resting heart rate
- Blood glucose, HRV, SpO2
- Body measurements (waist, chest, arms, etc.)
- Custom biometric entries
- Trend charts with historical data

![Biometrics](docs/screenshots/biometrics.png)

---

### 💊 Supplements
- Build your full supplement stack with dosage info
- Daily check-off system
- Amazon reorder links per item (one-tap reorder)
- Never forget a supplement again

---

### ✨ Self Care & Home Cleaning
- Custom self care routines (skincare, meditation, stretching, etc.)
- Daily check-off with AM/PM scheduling
- Home cleaning task tracker with frequency tags (daily, weekly, monthly)
- Everything resets cleanly each day

---

### 📓 Journal
- Full daily journal with rich text notes
- Dream journal with separate entries
- Date navigation — browse any past entry instantly

---

### 📈 Metrics & History
- **Metrics dashboard** — charts for weight, calories, protein, water, sleep, and more over 7/30/90 days
- **Full history view** — browse every logged day in reverse chronological order
- All data stored locally — you own it completely

![Metrics](docs/screenshots/metrics.png)

---

### 🩺 AI Health Report (Doctor Export)
Generate a structured, professional health summary PDF to share with a healthcare provider — covering diet trends, sleep patterns, biometrics, supplements, and exercise. One button, ready to print.

---

### 🔗 Device Sync *(Beta)*
Connect wearables to auto-import data:
- **Oura Ring** — sleep, HRV, readiness, activity
- **Fitbit** — steps, heart rate, sleep, calories
- **Garmin** — GPS activity, VO2 max, stress, body battery
- **Google Fit** — activity, heart points
- **Apple Health** — coming soon (iOS app required)

---

### 🔒 Private Sections *(opt-in)*
Hidden by default, enabled in Settings → Features:
- **Period Tracker** — cycle logging with symptom and mood tracking
- **Poop Tracker** — Bristol scale, color, notes (gut health matters)
- **Intimacy Tracker** — private wellness logging
- **Party Favors** — harm reduction logging

---

### 📱 Progressive Web App (PWA)
- Installable on iOS, Android, and desktop — works like a native app
- Offline support via service worker caching
- No App Store required — install straight from the browser

---

## ⚙️ Settings & Customization

| Setting | What it does |
|---|---|
| **Profile** | Name, age, height, gender, health conditions & sensitivities |
| **Goals** | Calorie, protein, carb, fat, water, weight targets |
| **Features** | Toggle every tab on or off — only see what you use |
| **Appearance** | Light / dark / system theme |
| **Body Targets** | Set goal measurements and track progress toward them |
| **Export Data** | Download your full data as JSON |
| **Sync** | Connect wearable devices |

### 🏥 Health Conditions & Sensitivities
27 conditions supported — the AI adapts its recommendations accordingly:
`Diabetes` `Hypertension` `Celiac` `Lactose Intolerance` `Nut Allergy` `Vegan` `Vegetarian` `Keto` `IBS` `Crohn's` `Thyroid Condition` `Heart Disease` `Kidney Disease` `GERD` `High Cholesterol` `Anxiety` `Depression` `ADHD` `PCOS` `Osteoporosis` `Arthritis` `Asthma` `Migraines` `Sleep Apnea` `Low Iron` `Soy Allergy` `Shellfish Allergy`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES2022), HTML5, CSS3 |
| **UI** | Custom design system — DM Sans + Bebas Neue, CSS variables, dark/light themes |
| **AI** | Anthropic Claude API (claude-sonnet) via secure Vercel serverless proxy |
| **Auth & Data** | Supabase (PostgreSQL + Row Level Security) |
| **Charts** | Chart.js |
| **PDF Export** | jsPDF |
| **Deployment** | Vercel (serverless + static) |
| **PWA** | Service Worker, Web App Manifest |

---

## 🏗️ Architecture

```
vitalog/
├── app.html          # Single-page application shell
├── app.js            # Core application logic (~4,400 lines)
├── ai.js             # AI assistant, context builder, chat engine
├── sync.js           # Data layer — localStorage + Supabase sync
├── style.css         # Full design system (~2,200 lines)
├── tutorial.js       # Interactive onboarding checklist
├── metrics.js        # Chart rendering and analytics
├── doctor-report.js  # PDF health report generator
├── api/
│   └── chat.js       # Vercel serverless Claude API proxy
├── icons/            # PWA icons (8 sizes)
├── manifest.json     # PWA manifest
└── sw.js             # Service worker
```

**No build step. No framework. No bundler.** Pure HTML/CSS/JS — fast, auditable, zero dependencies beyond what's loaded from CDN.

---

## 🔐 Privacy First

- All personal health data is stored **locally in your browser** by default
- Supabase sync is opt-in — your data never leaves your device unless you enable it
- No ads. No tracking. No data sold.
- The AI proxy never logs your health data — requests pass through and are immediately discarded
- You can export and delete all your data at any time

---

## 🚀 Getting Started

Visit **[myvitalog.com](https://myvitalog.com)** and create a free account.

**To install as an app:**
- **iOS Safari** → Share → Add to Home Screen
- **Android Chrome** → Menu → Add to Home Screen
- **Desktop Chrome** → Address bar → Install icon

**First time setup (2 minutes):**
1. Add your name and profile info in Settings → Profile
2. Set your calorie and protein goals in Settings → Goals
3. Enable any optional features in Settings → Features
4. Start logging via the AI Assistant or any manual tab

---

## 📸 Screenshots

| | |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![AI Assistant](docs/screenshots/ai_assistant.png) |
| **Dashboard** | **AI Assistant** |
| ![Diet](docs/screenshots/diet.png) | ![Exercise](docs/screenshots/exercise.png) |
| **Diet Tracking** | **Exercise & PRs** |
| ![Sleep](docs/screenshots/sleep.png) | ![Biometrics](docs/screenshots/biometrics.png) |
| **Sleep Tracker** | **Biometrics** |
| ![Metrics](docs/screenshots/metrics.png) | ![Settings](docs/screenshots/settings.png) |
| **Metrics & Charts** | **Settings** |

---

## 🗺️ Roadmap

- [ ] Native iOS / Android app (React Native)
- [ ] Apple Health deep integration
- [ ] Social / accountability features (share streaks with friends)
- [ ] Nutrition database search (barcode scanning)
- [ ] Blood test result import & tracking
- [ ] Meal planning & grocery list generation
- [ ] Coach / trainer portal view
- [ ] Stripe-based Pro tier with advanced AI insights

---

## 👤 About

Vitalog is an independent project. Built because existing health apps are either too narrow (only steps, only diet, only sleep), too expensive, or too creepy with your data.

The vision: **one app that knows everything about your health and actually helps you improve it.**

---

<div align="center">

**[myvitalog.com](https://myvitalog.com)** · Built with ♥ and Claude AI

</div>
