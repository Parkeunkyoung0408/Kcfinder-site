/* Scroll-controlled unboxing: open the lid, then raise the dispenser. */
(() => {
  const scene = document.querySelector('.scroll-scene');
  const main = document.querySelector('main');
  const hero = document.querySelector('.hero');
  const pair = document.getElementById('hero-pair');
  const lid = document.getElementById('hero-box-lid');
  const dispenser = document.getElementById('hero-dispenser');
  if (!main || !scene || !hero || !pair || !lid || !dispenser) return;
  const overview = new URLSearchParams(location.search).get('view') === 'overview';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = n => Math.max(0, Math.min(1,n));
  const smooth = n => { n=clamp(n); if(n<1e-6)return 0; if(n>1-1e-6)return 1; return n*n*n*(n*(n*6-15)+10); };
  const segment = (p,a,b) => smooth((p-a)/(b-a));
  let current=0, frame=0, last=0, sticky=false, travel=700, heroStart=0;
  function scrollProgress() {
    if(reduced.matches || overview) return .80;
    // Start from a closed box, even in short desktop viewports.
    // Viewport visibility alone must never complete the sequence on page load.
    return clamp((scrollY-heroStart)/travel) * .80;
  }
  function paintProduct(pair,lid,dispenser,inside,progress) {
    const opened=segment(progress,.05,.32);
    const lift=segment(progress,.36,.78);
    pair.style.setProperty('--lift',lift.toFixed(4));
    // Project a rigid lid around the original rear edge; do not stretch the bitmap.
    const angle=opened*Math.PI*45/180;
    const ex=721, ey=118, fx=-182, fy=70;
    const dx=fx*Math.cos(angle), dy=fy*Math.cos(angle)-400*Math.sin(angle);
    const determinant=ex*fy-ey*fx;
    const a=(ex*fy-dx*ey)/determinant;
    const b=(ey*fy-dy*ey)/determinant;
    const c=(dx*ex-ex*fx)/determinant;
    const d=(dy*ex-ey*fx)/determinant;
    const hx=930, hy=301;
    lid.setAttribute('transform',`matrix(${a} ${b} ${c} ${d} ${hx-a*hx-c*hy} ${hy-b*hx-d*hy})`);
    dispenser.setAttribute('y',String(430-lift*335));
    inside?.setAttribute('opacity',dy<0?'1':'0');

  }
  const finale=document.querySelector('.end-product-display');
  const finaleProducts=[...document.querySelectorAll('[data-unbox]')].map(pair=>{
    const prefix='finale-'+pair.dataset.unbox;
    return {pair,lid:pair.querySelector('#'+prefix+'-box-lid'),dispenser:pair.querySelector('#'+prefix+'-dispenser'),inside:pair.querySelector('#'+prefix+'-lid-inside')};
  });
  let finaleCurrent=0;
  function finaleProgress(){
    if(reduced.matches || overview)return .8;
    if(!finale)return 0;
    return clamp((innerHeight*.95-finale.getBoundingClientRect().top)/Math.min(480,innerHeight*.55));
  }
  function paint() {
    paintProduct(pair,lid,dispenser,document.getElementById('hero-lid-inside'),current);
    finaleProducts.forEach(p=>paintProduct(p.pair,p.lid,p.dispenser,p.inside,finaleCurrent));
  }
  function tick(time) {
    frame=0;
    const target=scrollProgress();
    const dt=last?Math.min(50,time-last):16;last=time;
    current=(reduced.matches || overview)?target:current+(target-current)*(1-Math.exp(-dt/150));
    if(Math.abs(current-target)<.0005)current=target;
    const endTarget=finaleProgress();
    finaleCurrent=(reduced.matches || overview)?endTarget:finaleCurrent+(endTarget-finaleCurrent)*(1-Math.exp(-dt/150));
    if(Math.abs(finaleCurrent-endTarget)<.0005)finaleCurrent=endTarget;
    paint();
    if((current!==target||finaleCurrent!==endTarget)&&!document.hidden) frame=requestAnimationFrame(tick);
  }
  function request(){ if(!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);} }
  function measure(){
    // Animate inside the section without reserving an empty pinning runway.
    sticky=false;
    travel=Math.min(240,innerHeight*.28);
    document.body.classList.toggle('flowing-hero',sticky);
    scene.style.setProperty('--flow-travel',`${travel}px`);
    heroStart=sticky
      ? scrollY+scene.getBoundingClientRect().top
      : Math.max(0,scrollY+scene.getBoundingClientRect().top-innerHeight*.45);
    request();
  }
  document.getElementById('hero-explore')?.addEventListener('click',()=>{
    if(sticky){window.scrollTo({top:scrollY+scene.getBoundingClientRect().top-80+travel,behavior:reduced.matches?'instant':'smooth'});}
    else document.getElementById('why')?.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
  });
  addEventListener('scroll',request,{passive:true});addEventListener('resize',measure);
  addEventListener('load',measure);reduced.addEventListener('change',measure);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();});
  window.addEventListener('minsy:formula-change',request);
  const geometryObserver = new ResizeObserver(request);
  geometryObserver.observe(hero);
  geometryObserver.observe(main);
  lid.addEventListener('load',request);
  document.getElementById('hero-lid-art')?.addEventListener('load',request);
  document.fonts?.ready.then(measure);
  measure();
})();
