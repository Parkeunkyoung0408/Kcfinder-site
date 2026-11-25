/* Brand motion: event-driven, bounded, and disabled for touch/reduced motion. */
(() => {
  const hero = document.querySelector('.brand-hero');
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (pointer: fine)');
  let frame = 0, visible = true, x = 0, y = 0;
  const paint = () => {
    frame = 0;
    const enabled = !reduced.matches && desktop.matches;
    hero.style.setProperty('--brand-x', (enabled ? x : 0) + 'px');
    hero.style.setProperty('--brand-y', (enabled ? y : 0) + 'px');
    hero.style.setProperty('--brand-scroll', (enabled ? Math.min(32, Math.max(0, -hero.getBoundingClientRect().top) * .055) : 0) + 'px');
  };
  const request = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(paint); };
  hero.addEventListener('pointermove', e => {
    if (reduced.matches || !desktop.matches) return;
    const r = hero.getBoundingClientRect();
    x = ((e.clientX - r.left) / r.width - .5) * 12;
    y = ((e.clientY - r.top) / r.height - .5) * 8;
    request();
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { x = y = 0; request(); });
  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', request);
  reduced.addEventListener('change', paint);
  desktop.addEventListener('change', paint);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) request(); }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else request();
  });
  request();
})();
