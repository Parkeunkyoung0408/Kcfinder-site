/* ==========================================================================
   MINSY — Tactile UI Interactions, Filament Simulator & Optical Loupe
   ========================================================================== */

(() => {
  document.documentElement.classList.add('js');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ------------------------------------------------------------------------
     1. SCROLL REVEAL OBSERVER
     ------------------------------------------------------------------------ */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('shown');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* ------------------------------------------------------------------------
     2. HEADER SCROLL STATE, PAGE PROGRESS BAR & SCROLL-SPY
     ------------------------------------------------------------------------ */
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('page-progress-bar');
  const navLinks = [...document.querySelectorAll('nav a[data-nav]')];
  const spySections = navLinks
    .map((a) => ({ link: a, el: document.getElementById(a.dataset.nav) }))
    .filter((item) => item.el);

  function updateScrollChrome() {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 18);

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, (y / maxScroll) * 100)}%`;
    }

    const probe = y + header.getBoundingClientRect().bottom + 24;
    const ordered = spySections
      .map((item) => ({ ...item, top: item.el.getBoundingClientRect().top + y }))
      .sort((a, b) => a.top - b.top);
    let current = null;
    for (const item of ordered) {
      if (probe >= item.top) current = item.link;
    }
    navLinks.forEach((a) => {
      a.classList.toggle('is-active', a === current);
      if (a === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  addEventListener('scroll', updateScrollChrome, { passive: true });
  addEventListener('resize', updateScrollChrome);
  updateScrollChrome();

  /* ------------------------------------------------------------------------
     3. MOBILE MENU
     ------------------------------------------------------------------------ */
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('navigation');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    const closeMenu = () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    };
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menuBtn.focus(); }
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !menuBtn.contains(event.target)) closeMenu();
    });
    matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------------
     4. LIVE FORMULA THEME SWITCHER (FLUORIDE <-> NANO-HYDROXYAPATITE)
     ------------------------------------------------------------------------ */
  const FORMULAS = {
    fluoride: {
      title: 'Fluoride',
      desc: 'Formulated with Sodium Fluoride and Sodium Monofluorophosphate.',
      pantone: 'Fluoride formula',
      boxSrc: 'assets/fluoride-0.jpg',
      boxAlt: 'MINSY Fluoride box',
    },
    nhap: {
      title: 'Nano-Hydroxyapatite',
      desc: 'Formulated with Nano-Hydroxyapatite.',
      pantone: 'Nano-Hydroxyapatite formula',
      boxSrc: 'assets/nhap-0.jpg',
      boxAlt: 'MINSY Nano-Hydroxyapatite box',
    },
  };

  const heroPair = document.getElementById('hero-pair');
  const heroBoxBody = document.getElementById('hero-box-body');
  const heroBoxLid = document.getElementById('hero-lid-art');
  const heroDispenser = document.getElementById('hero-dispenser');
  const heroFormulaTitle = document.getElementById('hero-formula-title');
  const heroFormulaDesc = document.getElementById('hero-formula-desc');
  const heroPantoneTag = document.getElementById('hero-pantone-tag');

  function setFormula(key) {
    const info = FORMULAS[key];
    if (!info) return;

    document.body.dataset.formula = key;
    const caption = document.getElementById('hero-selected-formula');
    if (caption) caption.textContent = info.title;

    document.querySelectorAll('[data-set-formula]').forEach((btn) => {
      const active = btn.dataset.setFormula === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    if (heroPair) {
      heroPair.classList.toggle('fluoride', key === 'fluoride');
      heroPair.classList.toggle('nhap', key === 'nhap');
    }
    if (heroDispenser) {
      heroDispenser.classList.toggle('fluoride', key === 'fluoride');
      heroDispenser.classList.toggle('nhap', key === 'nhap');
      heroDispenser.setAttribute('viewBox', key === 'fluoride' ? '500 195 330 395' : '90 195 330 395');
    }
    if (heroBoxBody) {
      heroBoxBody.setAttribute('href', info.boxSrc);
      heroBoxBody.setAttribute('aria-label', info.boxAlt);
    }
    if (heroBoxLid) {
      heroBoxLid.setAttribute('href', info.boxSrc);
    }
    if (heroFormulaTitle) {
      heroFormulaTitle.innerHTML = `${info.title}<span class="period-accent">.</span>`;
    }
    if (heroFormulaDesc) {
      heroFormulaDesc.textContent = info.desc;
    }
    if (heroPantoneTag) {
      heroPantoneTag.textContent = info.pantone;
    }

    window.dispatchEvent(new CustomEvent('minsy:formula-change', { detail: { formula: key } }));
  }

  document.querySelectorAll('[data-set-formula]').forEach((btn) => {
    btn.addEventListener('click', () => setFormula(btn.dataset.setFormula));
  });

  /* ------------------------------------------------------------------------
     6. BEFORE / AFTER REAL PHOTO COMPARISON CURTAIN
     ------------------------------------------------------------------------ */
  const photoCompare = document.getElementById('photo-compare');
  const compareRange = document.getElementById('compare-range');
  const compareJumpBtns = [...document.querySelectorAll('[data-compare-jump]')];

  function setCompareSplit(pct, mode = 'split') {
    if (!photoCompare || !compareRange) return;
    const clamped = mode === 'rest' ? 100 : mode === 'after' ? 0 : Math.max(8, Math.min(92, Number(pct)));
    photoCompare.dataset.view = mode;
    photoCompare.style.setProperty('--split', `${clamped}%`);
    compareRange.hidden = mode !== 'split';
    compareRange.disabled = mode !== 'split';
    if (mode === 'split') compareRange.value = String(clamped);
    photoCompare.querySelector('.layer-before').setAttribute('aria-hidden', String(mode === 'after'));
    photoCompare.querySelector('.layer-after').setAttribute('aria-hidden', String(mode === 'rest'));
    compareJumpBtns.forEach((btn) => {
      const selected = Number(btn.dataset.compareJump) === (mode === 'rest' ? 100 : mode === 'after' ? 0 : 50);
      btn.classList.toggle('is-active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }
  if (compareRange) {
    compareRange.addEventListener('input', (e) => setCompareSplit(e.target.value));
    compareJumpBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = Number(btn.dataset.compareJump);
        setCompareSplit(value, value === 100 ? 'rest' : value === 0 ? 'after' : 'split');
      });
    });
    setCompareSplit(50);
    let compareWidth=photoCompare.clientWidth;
    new ResizeObserver(() => {
      const width=photoCompare.clientWidth;
      if(Math.abs(width-compareWidth)>1){compareWidth=width;setCompareSplit(50);}
    }).observe(photoCompare);
  }

  /* ------------------------------------------------------------------------
     9. SUBTLE 3D TILT ON FORMULA CARDS & MAGNETIC PILLS
     ------------------------------------------------------------------------ */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('[data-tilt-card]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1100px) rotateX(${(-y * 4.5).toFixed(2)}deg) rotateY(${(x * 5.5).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });

    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     10. ACCESSIBLE SHOP ON AMAZON MODAL
     ------------------------------------------------------------------------ */
  const dialog = document.getElementById('shop-dialog');
  const dialogCopy = document.getElementById('shop-dialog-copy');

  if (dialog) {
    document.querySelectorAll('[data-shop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.shopFormula;
        if (dialogCopy) {
          dialogCopy.textContent = chosen
            ? `An Amazon purchase link for ${chosen} is not available on this website yet.`
            : 'An Amazon purchase link is not available on this website yet.';
        }
        dialog.showModal();
      });
    });

    dialog.querySelectorAll('.dialog-close, .close-dialog').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
          dialog.close();
        }
      }
    });
  }
})();
