/* ============================================================
   myVitalog — App initialization + tab switching + modal
   ============================================================ */

(function () {
  const getData = () => window.VITALOG_DATA;
  const tabs = window.TABS;

  const content = document.getElementById('content');
  const crumbTitle = document.getElementById('crumb-title');
  const crumbEyebrow = document.getElementById('crumb-eyebrow');
  const nav = document.getElementById('rail-nav');
  const boot = document.getElementById('boot');

  let currentTab = 'dashboard';

  // ── Tab switching ─────────────────────────────────────────
  function setTab(name, opts = {}) {
    if (!tabs[name]) return;
    const tab = tabs[name];
    currentTab = name;

    // Update rail active state
    nav.querySelectorAll('.rail-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === name);
    });

    // Update topbar crumbs
    crumbTitle.textContent = tab.title;
    crumbEyebrow.textContent = typeof tab.crumb === 'function' ? tab.crumb(getData()) : (tab.crumb || '');

    // Animate content swap
    if (!opts.skipAnim) {
      content.style.transform = 'translateY(8px)';
      content.style.transition = 'transform .25s ease';
      setTimeout(() => {
        content.innerHTML = tab.render(getData());
        content.style.transition = '';
        requestAnimationFrame(() => {
          content.style.transform = '';
        });
        afterRender();
        if (typeof tab.init === 'function') { try { tab.init(content, getData()); } catch (e) { console.warn('[tab init]', e); } }
      }, 120);
    } else {
      content.innerHTML = tab.render(getData());
      afterRender();
        if (typeof tab.init === 'function') { try { tab.init(content, getData()); } catch (e) { console.warn('[tab init]', e); } }
    }

    // Update URL hash (no scroll)
    if (history.replaceState) {
      history.replaceState(null, '', '#' + name);
    }
  }

  function afterRender() {
    // Animate progress rings: re-set stroke-dashoffset from full to actual
    content.querySelectorAll('.ring circle:nth-child(2)').forEach((c) => {
      const offsetTarget = c.getAttribute('stroke-dashoffset');
      const total = parseFloat(c.getAttribute('stroke-dasharray'));
      c.setAttribute('stroke-dashoffset', total);
      requestAnimationFrame(() => {
        c.style.transition = 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)';
        c.setAttribute('stroke-dashoffset', offsetTarget);
      });
    });

    // Animate progress bars (.bar > i)
    content.querySelectorAll('.bar > i, .kpi-card .bar > i').forEach((el) => {
      const targetWidth = el.style.width;
      el.style.width = '0%';
      requestAnimationFrame(() => {
        el.style.width = targetWidth;
      });
    });

    // Stagger any list-rows inside the content for a softer reveal
    content.querySelectorAll('.list-row').forEach((row, i) => {
      row.style.transform = 'translateY(6px)';
      row.style.transition = `transform .35s cubic-bezier(.2,.7,.2,1) ${0.02 * i}s`;
      requestAnimationFrame(() => {
        row.style.transform = '';
      });
    });

    // Count-up animation for big numbers (.val, .value containing digits)
    // Lightweight — only if data-num attribute present
    content.querySelectorAll('[data-count-up]').forEach((el) => {
      const target = Number(el.getAttribute('data-count-up'));
      animateCount(el, 0, target, 800);
    });

    // Wire chat send (if AI tab)
    const sendBtn = document.getElementById('chat-send');
    if (sendBtn) {
      const ta = document.getElementById('chat-text');
      const stream = document.getElementById('chat-stream');
      const send = () => {
        const text = ta.value.trim();
        if (!text) return;
        ta.value = '';
        const u = document.createElement('div');
        u.className = 'chat-bubble user';
        u.textContent = text;
        stream.appendChild(u);
        // Fake AI reply
        setTimeout(() => {
          const a = document.createElement('div');
          a.className = 'chat-bubble ai';
          a.textContent = "Got it. Logged that for you and added it to today's view. Anything else?";
          stream.appendChild(a);
          stream.scrollTop = stream.scrollHeight;
        }, 700);
        stream.scrollTop = stream.scrollHeight;
      };
      sendBtn.addEventListener('click', send);
      ta.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
      });
    }

    // Supplement / self-care toggles update data + counter
    content.querySelectorAll('[data-supp]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const i = Number(e.target.getAttribute('data-supp'));
        getData().supplements[i].taken = e.target.checked;
        // Update the strikethrough on the label
        const label = e.target.parentElement.querySelector('.label');
        if (label) {
          label.style.color = e.target.checked ? 'var(--muted)' : '';
          label.style.textDecoration = e.target.checked ? 'line-through' : '';
        }
      });
    });
  }

  function animateCount(el, from, to, dur) {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── Rail clicks ───────────────────────────────────────────
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.rail-item');
    if (!btn) return;
    setTab(btn.dataset.tab);
  });

  // ── Quick-add modal ───────────────────────────────────────
  const quickModal = document.getElementById('quick-modal');
  const quickText = document.getElementById('quick-text');
  const quickAddBtn = document.getElementById('quick-add');
  const quickClose = document.getElementById('quick-close');
  const quickCancel = document.getElementById('quick-cancel');
  const quickSave = document.getElementById('quick-save');

  function openQuick() {
    quickModal.hidden = false;
    setTimeout(() => quickText.focus(), 50);
  }
  function closeQuick() {
    quickModal.hidden = true;
    quickText.value = '';
  }
  function fakeSave() {
    quickSave.textContent = 'Working…';
    setTimeout(() => {
      quickSave.textContent = 'Saved ✓';
      setTimeout(() => {
        closeQuick();
        quickSave.textContent = 'Save with AI →';
      }, 500);
    }, 700);
  }
  quickAddBtn.addEventListener('click', openQuick);
  quickClose.addEventListener('click', closeQuick);
  quickCancel.addEventListener('click', closeQuick);
  quickSave.addEventListener('click', fakeSave);
  quickModal.addEventListener('click', (e) => {
    if (e.target === quickModal) closeQuick();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !quickModal.hidden) closeQuick();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !quickModal.hidden) fakeSave();
    // Cmd/Ctrl+K opens quick log
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openQuick(); }
  });

  // Quick-add chip prefills
  document.querySelectorAll('.quick-chips .chip').forEach((c) => {
    c.addEventListener('click', () => {
      quickText.value = quickText.value
        ? quickText.value.trim() + '. ' + c.dataset.quick
        : c.dataset.quick;
      quickText.focus();
    });
  });

  // ── Date pill cycles (Today / Yesterday) ───────────────────
  const datePill = document.getElementById('date-pill');
  let dateState = 0;
  const dateLabels = ['Today', 'Yesterday', 'Mon, May 24', 'Sun, May 23'];
  document.querySelectorAll('.date-nav').forEach((b, i) => {
    b.addEventListener('click', () => {
      dateState = (dateState + (i === 0 ? 1 : -1) + dateLabels.length) % dateLabels.length;
      datePill.textContent = dateLabels[dateState];
    });
  });

  // ── Expose a refresh hook for the live-data layer ──────────
  window.VitalogApp = {
    setTab: setTab,
    refresh: function () { setTab(currentTab, { skipAnim: true }); }
  };

  function hideBoot() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!boot) return;
        boot.classList.add('gone');
        setTimeout(() => boot.remove(), 400);
      }, 100);
    });
  }

  // ── Boot: briefly await live data, then render the first tab ─
  (async function boot() {
    const ready = window.__VITALOG_DATA_READY;
    if (ready && typeof ready.then === 'function') {
      const timeout = new Promise((res) => setTimeout(res, 4000));
      try { await Promise.race([ready, timeout]); } catch (e) {}
    }
    const initial = (location.hash || '').replace(/^#/, '') || 'dashboard';
    setTab(tabs[initial] ? initial : 'dashboard', { skipAnim: true });
    hideBoot();
  })();

  // ── Hash navigation ────────────────────────────────────────
  window.addEventListener('hashchange', () => {
    const t = (location.hash || '').replace(/^#/, '');
    if (tabs[t] && t !== currentTab) setTab(t);
  });
})();
