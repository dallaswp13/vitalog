// doctor-report.js — Vitalog Health Report PDF Generator
// Uses jsPDF (loaded via CDN) to build a professional PDF entirely client-side.
// No health data ever leaves the browser during PDF generation.

async function generateDoctorReport() {
  const btn = document.getElementById('dr-generate-btn');
  const status = document.getElementById('dr-status');

  btn.disabled = true;
  btn.textContent = '⏳ Building report…';
  status.style.display = 'block';
  status.textContent = 'Collecting your data…';

  try {
    // ── Gather settings ───────────────────────────────
    const days        = parseInt(document.getElementById('dr-days').value) || 30;
    const doctorName  = (document.getElementById('dr-doctor-name').value || '').trim();
    const incNutrition = document.getElementById('dr-inc-nutrition').checked;
    const incWeight    = document.getElementById('dr-inc-weight').checked;
    const incSleep     = document.getElementById('dr-inc-sleep').checked;
    const incExercise  = document.getElementById('dr-inc-exercise').checked;
    const incMood      = document.getElementById('dr-inc-mood').checked;
    const incWater     = document.getElementById('dr-inc-water').checked;

    if (!incNutrition && !incWeight && !incSleep && !incExercise && !incMood && !incWater) {
      showToast('Select at least one data type to include');
      btn.disabled = false;
      btn.innerHTML = '&#128203; Generate &amp; Download PDF';
      status.style.display = 'none';
      return;
    }

    const s = getSettings();
    const userName = s.name || 'Patient';
    const today = new Date();

    // ── Collect date range ────────────────────────────
    const dateKeys = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().split('T')[0]);
    }
    dateKeys.reverse(); // oldest first

    // ── Aggregate data ────────────────────────────────
    status.textContent = 'Processing health data…';
    await new Promise(r => setTimeout(r, 10));

    const rows = dateKeys.map(k => {
      const foods  = getFoods(k);
      const cal    = foods.reduce((a, f) => a + (f.cal || 0), 0);
      const prot   = foods.reduce((a, f) => a + (f.p   || 0), 0);
      const carbs  = foods.reduce((a, f) => a + (f.c   || 0), 0);
      const fat    = foods.reduce((a, f) => a + (f.f   || 0), 0);
      const water  = getWater(k);
      const weight = getWeight(k);
      const sleep  = getSleep(k);
      const jd     = getJournalData(k);

      // BMI
      let bmi = null;
      if (weight && s.heightFt) {
        const totalIn = (parseInt(s.heightFt) * 12) + parseInt(s.heightIn || 0);
        if (totalIn > 0) bmi = +((703 * weight) / (totalIn * totalIn)).toFixed(1);
      }

      return {
        date: k,
        cal:    cal    || null,
        prot:   prot   || null,
        carbs:  carbs  || null,
        fat:    fat    || null,
        water:  water  || null,
        weight: weight || null,
        bmi,
        sleepHrs:     sleep && sleep.mins ? +(sleep.mins / 60).toFixed(1) : null,
        sleepQuality: sleep ? sleep.quality : null,
        sleepBed:     sleep ? sleep.bed   : null,
        sleepWake:    sleep ? sleep.wake  : null,
        mood: jd.mood || null,
      };
    });

    // Compute averages (skip nulls)
    const avg = (arr, key) => {
      const vals = arr.map(r => r[key]).filter(v => v !== null && v !== undefined);
      return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    };
    const pct = (arr, key) => {
      const vals = arr.map(r => r[key]).filter(v => v !== null);
      return vals.length ? Math.round((vals.length / arr.length) * 100) : 0;
    };

    // ── Build PDF ─────────────────────────────────────
    status.textContent = 'Building PDF…';
    await new Promise(r => setTimeout(r, 10));

    // Ensure jsPDF is loaded
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      throw new Error('PDF library not loaded. Please refresh and try again.');
    }
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PW = 210; // page width mm
    const PH = 297; // page height mm
    const ML = 18;  // margin left
    const MR = 18;  // margin right
    const CW = PW - ML - MR; // content width
    let y = 0;

    // Color palette
    const C = {
      black:    [15,  15,  15],
      dark:     [30,  30,  30],
      muted:    [120, 120, 120],
      light:    [200, 200, 200],
      bg:       [248, 248, 244],
      accent:   [138, 158, 0],
      accentDark:[90,105,0],
      accent2:  [217, 79,  26],
      white:    [255, 255, 255],
      rowAlt:   [245, 245, 242],
    };

    const setFill   = (rgb) => doc.setFillColor(...rgb);
    const setStroke = (rgb) => doc.setDrawColor(...rgb);
    const setTxt    = (rgb) => doc.setTextColor(...rgb);
    const setFont   = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };

    // ── PAGE BREAK HELPER ─────────────────────────────
    const checkPage = (needed = 20) => {
      if (y + needed > PH - 16) {
        doc.addPage();
        y = 18;
        _drawPageFooter();
      }
    };

    const _drawPageFooter = () => {
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      setFont('normal', 8);
      setTxt(C.muted);
      doc.text(`Vitalog Health Report — ${userName}`, ML, PH - 8);
      doc.text(`Page ${pageNum}`, PW - MR, PH - 8, { align: 'right' });
      setStroke(C.light);
      doc.setLineWidth(0.3);
      doc.line(ML, PH - 12, PW - MR, PH - 12);
    };

    // ── SECTION HEADER HELPER ─────────────────────────
    const sectionHeader = (emoji, title) => {
      checkPage(24);
      y += 6;
      setFill(C.black);
      doc.roundedRect(ML, y, CW, 10, 2, 2, 'F');
      setFont('bold', 11);
      setTxt(C.white);
      doc.text(`${emoji}  ${title}`, ML + 5, y + 6.8);
      y += 16;
    };

    // ── TABLE HELPER ──────────────────────────────────
    const drawTable = (headers, rows, colWidths) => {
      const rowH = 7;
      const totalW = colWidths.reduce((a, b) => a + b, 0);

      // Header row
      checkPage(rowH + 4);
      setFill(C.accentDark);
      doc.rect(ML, y, totalW, rowH, 'F');
      setFont('bold', 8);
      setTxt(C.white);
      let x = ML;
      headers.forEach((h, i) => {
        doc.text(h, x + 2.5, y + 4.8);
        x += colWidths[i];
      });
      y += rowH;

      // Data rows
      rows.forEach((row, ri) => {
        checkPage(rowH + 2);
        if (ri % 2 === 0) {
          setFill(C.rowAlt);
          doc.rect(ML, y, totalW, rowH, 'F');
        }
        setFont('normal', 7.5);
        setTxt(C.dark);
        let x = ML;
        row.forEach((cell, ci) => {
          const text = cell !== null && cell !== undefined ? String(cell) : '—';
          doc.text(text, x + 2.5, y + 4.8);
          x += colWidths[ci];
        });
        // Light row border
        setStroke(C.light);
        doc.setLineWidth(0.1);
        doc.line(ML, y + rowH, ML + totalW, y + rowH);
        y += rowH;
      });

      // Border around whole table
      setStroke(C.light);
      doc.setLineWidth(0.3);
      doc.rect(ML, y - rowH * (rows.length + 1), totalW, rowH * (rows.length + 1), 'S');
      y += 4;
    };

    // ── STAT BOX HELPER ───────────────────────────────
    const statBoxRow = (stats) => {
      // stats = [{label, value, unit}]
      const boxW = CW / stats.length;
      const boxH = 18;
      checkPage(boxH + 6);
      stats.forEach((st, i) => {
        const bx = ML + i * boxW;
        setFill(C.rowAlt);
        doc.roundedRect(bx + 1, y, boxW - 2, boxH, 2, 2, 'F');
        setFont('bold', 14);
        setTxt(C.accent);
        doc.text(st.value !== null ? String(st.value) : '—', bx + boxW / 2, y + 10, { align: 'center' });
        setFont('normal', 7);
        setTxt(C.muted);
        doc.text(st.label + (st.unit ? ` (${st.unit})` : ''), bx + boxW / 2, y + 15, { align: 'center' });
      });
      y += boxH + 6;
    };

    // ═════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ═════════════════════════════════════════════════

    // Dark header band
    setFill(C.black);
    doc.rect(0, 0, PW, 58, 'F');

    // Accent stripe
    setFill(C.accent);
    doc.rect(0, 58, PW, 3, 'F');

    // Logo text
    setFont('bold', 32);
    setTxt(C.white);
    doc.text('MY', ML, 24);
    setTxt([180, 220, 0]);
    doc.text('VITALOG.', ML + 21, 24);

    setFont('normal', 11);
    setTxt([160, 160, 160]);
    doc.text('Personal Health Report', ML, 34);

    // Report meta (top right)
    setFont('normal', 9);
    setTxt([160, 160, 160]);
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${dateStr}`, PW - MR, 22, { align: 'right' });
    doc.text(`Period: Last ${days} days`, PW - MR, 30, { align: 'right' });

    y = 74;

    // Patient info box
    setFill(C.rowAlt);
    doc.roundedRect(ML, y, CW, 38, 3, 3, 'F');
    setStroke(C.light);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, CW, 38, 3, 3, 'S');

    setFont('bold', 9);
    setTxt(C.muted);
    doc.text('PATIENT', ML + 8, y + 8);
    setFont('bold', 16);
    setTxt(C.dark);
    doc.text(userName, ML + 8, y + 18);

    // Profile fields
    const profileFields = [];
    if (s.age)      profileFields.push(`Age: ${s.age}`);
    if (s.gender)   profileFields.push(`Sex: ${s.gender.charAt(0).toUpperCase() + s.gender.slice(1)}`);
    if (s.heightFt) profileFields.push(`Height: ${s.heightFt}ft ${s.heightIn || 0}in`);
    if (doctorName) profileFields.push(`Prepared for: ${doctorName}`);

    setFont('normal', 9);
    setTxt(C.muted);
    doc.text(profileFields.join('   ·   '), ML + 8, y + 28);

    setFont('normal', 8);
    doc.text(`Report covers: ${dateKeys[0]}  →  ${dateKeys[dateKeys.length - 1]}`, ML + 8, y + 35);

    y += 48;

    // Summary stats row
    if (incNutrition || incWeight || incSleep || incExercise) {
      setFont('bold', 10);
      setTxt(C.dark);
      doc.text('AT A GLANCE', ML, y);
      setFill(C.accent);
      doc.rect(ML, y + 2, 28, 0.8, 'F');
      y += 10;

      const glanceStats = [];
      if (incNutrition) glanceStats.push({ label: 'Avg Calories', value: avg(rows, 'cal'), unit: 'kcal' });
      if (incNutrition) glanceStats.push({ label: 'Avg Protein',  value: avg(rows, 'prot'), unit: 'g' });
      if (incWeight)    glanceStats.push({ label: 'Avg Weight',   value: avg(rows, 'weight'), unit: 'lbs' });
      if (incSleep)     glanceStats.push({ label: 'Avg Sleep',    value: avg(rows, 'sleepHrs'), unit: 'hrs' });
      if (incMood)      glanceStats.push({ label: 'Avg Mood',     value: avg(rows, 'mood'), unit: '/5' });
      if (incWater)     glanceStats.push({ label: 'Avg Water',    value: avg(rows, 'water') ? +(avg(rows, 'water') * getBottleOz()).toFixed(0) : null, unit: 'oz' });

      // Draw in rows of 4
      const chunkSize = 4;
      for (let i = 0; i < glanceStats.length; i += chunkSize) {
        statBoxRow(glanceStats.slice(i, i + chunkSize));
      }
    }

    // Disclaimer box
    checkPage(28);
    y += 4;
    setFill([255, 248, 245]);
    setStroke([255, 200, 180]);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, 26, 2, 2, 'FD');
    setFont('bold', 8);
    setTxt(C.accent2);
    doc.text('MEDICAL DISCLAIMER', ML + 5, y + 7);
    setFont('normal', 7.5);
    setTxt([160, 80, 40]);
    const disclaimer = 'This report was self-generated by the patient using Vitalog, a personal health tracking application. Data reflects self-reported entries and has not been clinically validated. AI-assisted estimates (nutrition values) may contain approximations. This document is intended to supplement, not replace, clinical assessment.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, CW - 10);
    doc.text(disclaimerLines, ML + 5, y + 13);
    y += 32;

    _drawPageFooter();

    // ═════════════════════════════════════════════════
    // SECTION: NUTRITION
    // ═════════════════════════════════════════════════
    if (incNutrition) {
      doc.addPage(); y = 18; _drawPageFooter();
      sectionHeader('🍽', 'NUTRITION SUMMARY');

      // Averages callout
      statBoxRow([
        { label: 'Avg Daily Calories', value: avg(rows, 'cal'),   unit: 'kcal' },
        { label: 'Avg Protein',        value: avg(rows, 'prot'),  unit: 'g'    },
        { label: 'Avg Carbs',          value: avg(rows, 'carbs'), unit: 'g'    },
        { label: 'Avg Fat',            value: avg(rows, 'fat'),   unit: 'g'    },
      ]);

      if (s.calGoal) {
        setFont('normal', 8.5);
        setTxt(C.muted);
        doc.text(`Patient's daily calorie goal: ${s.calGoal} kcal   ·   Protein goal: ${s.protGoal || '—'}g`, ML, y);
        y += 8;
      }

      // Daily nutrition table
      const nutRows = rows.filter(r => r.cal).map(r => [
        r.date,
        r.cal    !== null ? r.cal    : '—',
        r.prot   !== null ? r.prot   : '—',
        r.carbs  !== null ? r.carbs  : '—',
        r.fat    !== null ? r.fat    : '—',
      ]);

      if (nutRows.length > 0) {
        drawTable(
          ['Date', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)'],
          nutRows,
          [38, 38, 36, 36, 36]
        );
      } else {
        setFont('italic', 9); setTxt(C.muted);
        doc.text('No nutrition data logged in this period.', ML, y); y += 10;
      }
    }

    // ═════════════════════════════════════════════════
    // SECTION: WEIGHT & BMI
    // ═════════════════════════════════════════════════
    if (incWeight) {
      checkPage(60);
      sectionHeader('⚖️', 'WEIGHT & BMI');

      const weightRows = rows.filter(r => r.weight);
      const firstWeight = weightRows.length ? weightRows[0].weight : null;
      const lastWeight  = weightRows.length ? weightRows[weightRows.length - 1].weight : null;
      const change      = (firstWeight && lastWeight) ? +(lastWeight - firstWeight).toFixed(1) : null;

      statBoxRow([
        { label: 'Starting Weight', value: firstWeight, unit: 'lbs' },
        { label: 'Current Weight',  value: lastWeight,  unit: 'lbs' },
        { label: 'Change',          value: change !== null ? (change > 0 ? '+' + change : change) : null, unit: 'lbs' },
        { label: 'Avg BMI',         value: avg(rows, 'bmi'), unit: '' },
      ]);

      const wtRows = rows.filter(r => r.weight).map(r => {
        const bmiCat = r.bmi ? (r.bmi < 18.5 ? 'Underweight' : r.bmi < 25 ? 'Normal' : r.bmi < 30 ? 'Overweight' : 'Obese') : '—';
        return [r.date, r.weight, r.bmi || '—', bmiCat];
      });

      if (wtRows.length > 0) {
        drawTable(['Date', 'Weight (lbs)', 'BMI', 'BMI Category'], wtRows, [45, 40, 30, 59]);
      } else {
        setFont('italic', 9); setTxt(C.muted);
        doc.text('No weight data logged in this period.', ML, y); y += 10;
      }
    }

    // ═════════════════════════════════════════════════
    // SECTION: SLEEP
    // ═════════════════════════════════════════════════
    if (incSleep) {
      checkPage(60);
      sectionHeader('😴', 'SLEEP');

      const sleepRows = rows.filter(r => r.sleepHrs);
      const qualityLabels = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

      statBoxRow([
        { label: 'Avg Duration',       value: avg(rows, 'sleepHrs'),    unit: 'hrs' },
        { label: 'Avg Quality',        value: avg(rows, 'sleepQuality'), unit: '/5'  },
        { label: 'Days Logged',        value: sleepRows.length,          unit: `of ${days}` },
        { label: 'Logging Rate',       value: pct(rows, 'sleepHrs') + '%', unit: '' },
      ]);

      const slRows = rows.filter(r => r.sleepHrs).map(r => [
        r.date,
        r.sleepBed  || '—',
        r.sleepWake || '—',
        r.sleepHrs  !== null ? r.sleepHrs + 'h' : '—',
        r.sleepQuality ? `${r.sleepQuality}/5 (${qualityLabels[r.sleepQuality] || '—'})` : '—',
      ]);

      if (slRows.length > 0) {
        drawTable(['Date', 'Bedtime', 'Wake Time', 'Duration', 'Quality'], slRows, [35, 30, 30, 28, 51]);
      } else {
        setFont('italic', 9); setTxt(C.muted);
        doc.text('No sleep data logged in this period.', ML, y); y += 10;
      }
    }

    // ═════════════════════════════════════════════════
    // SECTION: EXERCISE
    // ═════════════════════════════════════════════════
    if (incExercise) {
      checkPage(40);
      sectionHeader('🏋', 'EXERCISE');
      setFont('normal', 9); setTxt(C.muted);
      doc.text('Exercise completions are tracked as percentage of planned workout tasks completed each day.', ML, y);
      y += 10;

      // Weekly exercise summary
      const today2 = new Date();
      const exWeeks = [];
      for (let w = 0; w < Math.ceil(days / 7); w++) {
        const wDate = new Date(today2); wDate.setDate(wDate.getDate() - w * 7);
        const jan4  = new Date(wDate.getFullYear(), 0, 4);
        const wkNum = Math.ceil(((wDate - jan4) / 86400000 + jan4.getDay() + 1) / 7);
        const wkKey = `${wDate.getFullYear()}-W${String(wkNum).padStart(2,'0')}`;
        const exChecked = getExChecked(wkKey);
        const completed = Object.values(exChecked).filter(Boolean).length;
        const weekStart = new Date(wDate); weekStart.setDate(wDate.getDate() - wDate.getDay() + 1);
        exWeeks.push([
          weekStart.toISOString().split('T')[0],
          wkKey,
          `${completed} tasks`,
        ]);
      }
      exWeeks.reverse();
      if (exWeeks.length > 0) {
        drawTable(['Week Starting', 'Week ID', 'Tasks Completed'], exWeeks, [50, 50, 74]);
      }
    }

    // ═════════════════════════════════════════════════
    // SECTION: MOOD
    // ═════════════════════════════════════════════════
    if (incMood) {
      checkPage(40);
      sectionHeader('😊', 'MOOD TRACKING');

      const moodLabels = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };
      statBoxRow([
        { label: 'Avg Mood Score', value: avg(rows, 'mood'),  unit: '/5' },
        { label: 'Days Logged',    value: rows.filter(r => r.mood).length, unit: `of ${days}` },
        { label: 'Most Common',    value: (() => {
            const counts = {}; rows.forEach(r => r.mood && (counts[r.mood] = (counts[r.mood]||0)+1));
            const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
            return top ? moodLabels[top[0]] : null;
          })(), unit: '' },
      ]);

      const moodRows = rows.filter(r => r.mood).map(r => [
        r.date,
        `${r.mood}/5`,
        moodLabels[r.mood] || '—',
      ]);
      if (moodRows.length > 0) {
        drawTable(['Date', 'Score', 'Description'], moodRows, [50, 30, 94]);
      } else {
        setFont('italic', 9); setTxt(C.muted);
        doc.text('No mood data logged in this period.', ML, y); y += 10;
      }
    }

    // ═════════════════════════════════════════════════
    // SECTION: WATER INTAKE
    // ═════════════════════════════════════════════════
    if (incWater) {
      checkPage(40);
      sectionHeader('💧', 'WATER INTAKE');
      const bottleOz = getBottleOz();
      const waterGoalOz = s.waterGoal || null;

      statBoxRow([
        { label: 'Avg Daily Water',   value: avg(rows, 'water') ? +(avg(rows, 'water') * bottleOz).toFixed(0) : null, unit: 'oz' },
        { label: 'Avg Bottles',       value: avg(rows, 'water'), unit: `×${bottleOz}oz` },
        { label: 'Daily Goal',        value: waterGoalOz, unit: 'oz' },
      ]);

      const waterRows = rows.filter(r => r.water).map(r => [
        r.date,
        r.water,
        `${r.water * bottleOz} oz`,
        waterGoalOz ? (r.water * bottleOz >= waterGoalOz ? '✓ Met' : 'Below goal') : '—',
      ]);
      if (waterRows.length > 0) {
        drawTable(['Date', 'Bottles', 'Fluid (oz)', 'Goal Status'], waterRows, [45, 30, 35, 64]);
      } else {
        setFont('italic', 9); setTxt(C.muted);
        doc.text('No water data logged in this period.', ML, y); y += 10;
      }
    }

    // ── Save PDF ──────────────────────────────────────
    status.textContent = 'Finalizing…';
    await new Promise(r => setTimeout(r, 10));

    const filename = `vitalog-report-${userName.replace(/\s+/g,'-').toLowerCase()}-${today.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

    status.textContent = `✓ Report downloaded: ${filename}`;
    status.style.color = 'var(--accent)';
    showToast('✓ Health report downloaded!');

  } catch (err) {
    console.error('PDF generation error:', err);
    status.textContent = `Error: ${err.message}`;
    status.style.color = 'var(--accent2)';
    showToast('Could not generate report — try again');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '&#128203; Generate &amp; Download PDF';
  }
}
