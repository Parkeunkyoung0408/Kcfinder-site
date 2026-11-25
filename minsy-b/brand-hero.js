/* Hero-only camera drift. No scroll pinning or changes to other sections. */
(() => {
  const hero = document.querySelector('.brand-hero');
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 901px) and (pointer: fine)');
  let frame = 0, visible = true, last = 0;
  let targetX = 0, targetY = 0, x = 0, y = 0, progress = 0;
  const clamp = n => Math.max(0, Math.min(1, n));
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    targetX = targetY = x = y = progress = 0;
    ['--brand-x','--brand-y','--brand-scroll','--brand-scale','--brand-logo-y','--brand-copy-y'].forEach(key => hero.style.removeProperty(key));
  };
  const paint = time => {
    frame = 0;
    if (reduced.matches || document.hidden || !visible) return;
    const rect = hero.getBoundingClientRect();
    const targetProgress = clamp(-rect.top / Math.max(1, rect.height));
    const alpha = 1 - Math.exp(-Math.min(50, last ? time - last : 16) / 110);
    last = time;
    x += ((desktop.matches ? targetX : 0) - x) * alpha;
    y += ((desktop.matches ? targetY : 0) - y) * alpha;
    progress += (targetProgress - progress) * alpha;
    if (Math.abs(targetProgress - progress) < .0001) progress = targetProgress;
    if (Math.abs(x - (desktop.matches ? targetX : 0)) < .01) x = desktop.matches ? targetX : 0;
    if (Math.abs(y - (desktop.matches ? targetY : 0)) < .01) y = desktop.matches ? targetY : 0;
    const large = desktop.matches;
    hero.style.setProperty('--brand-x', x.toFixed(2) + 'px');
    hero.style.setProperty('--brand-y', y.toFixed(2) + 'px');
    hero.style.setProperty('--brand-scroll', (progress * (large ? 36 : 10)).toFixed(2) + 'px');
    hero.style.setProperty('--brand-scale', (1.025 + progress * (large ? .10 : .025)).toFixed(4));
    hero.style.setProperty('--brand-logo-y', (-progress * (large ? 22 : 6)).toFixed(2) + 'px');
    hero.style.setProperty('--brand-copy-y', (-progress * (large ? 42 : 12)).toFixed(2) + 'px');
    if (progress !== targetProgress || x !== (large ? targetX : 0) || y !== (large ? targetY : 0)) frame = requestAnimationFrame(paint);
  };
  const request = () => {
    if (!frame && visible && !document.hidden && !reduced.matches) { last = 0; frame = requestAnimationFrame(paint); }
  };
  hero.addEventListener('pointermove', e => {
    if (!desktop.matches || reduced.matches) return;
    const rect = hero.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - .5) * 12;
    targetY = ((e.clientY - rect.top) / rect.height - .5) * 8;
    request();
  }, {passive:true});
  hero.addEventListener('pointerleave', () => { targetX = targetY = 0; request(); });
  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', request);
  reduced.addEventListener('change', () => { reset(); request(); });
  desktop.addEventListener('change', () => { targetX = targetY = 0; request(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    else request();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; } else request();
  });
  request();
})();
