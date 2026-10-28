/* Particle Surge — adapted from the OriginKit source supplied by the user.
   https://www.originkit.dev/docs/licensing
   Website-specific implementation; not a redistributable component/template. */
(() => {
'use strict';
const canvas=document.querySelector('#particles'),stage=canvas.parentElement,control=document.querySelector('.motion-control');
const ctx=canvas.getContext('2d');if(!ctx){control.hidden=true;return;}
const TAU=Math.PI*2,PERIOD=5.2,BASE_SPREAD=.29,PERSPECTIVE=3.5;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const hash=i=>(.61803398875*i)%1;
function fibonacci(i,n){const y=1-i/Math.max(1,n-1)*2,r=Math.sqrt(Math.max(0,1-y*y)),theta=2.399963*i;return [Math.cos(theta)*r,y,Math.sin(theta)*r];}
function spin(p,yaw,pitch){const ca=Math.cos(yaw),sa=Math.sin(yaw),rx=p[0]*ca-p[2]*sa,rz=p[0]*sa+p[2]*ca,co=Math.cos(pitch),so=Math.sin(pitch);return [rx,p[1]*co-rz*so,p[1]*so+rz*co];}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let size=0,dpr=1,dots=[],elapsed=.8,raf=0,last=0,paused=reduced.matches,visible=true,dirty=true,frames=0;
const drag={active:false,x:0,y:0,time:0,yaw:0,pitch:0,vx:0,vy:0};
function updateControl(){control.textContent=paused?'▶':'Ⅱ';control.setAttribute('aria-pressed',String(paused));control.setAttribute('aria-label',paused?'파티클 모션 재생':'파티클 모션 일시정지');}
function resize(){size=Math.max(4,stage.getBoundingClientRect().width);dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*dpr);const count=size<280?240:360;dots=Array.from({length:count},(_,i)=>({p:fibonacci(i,count),phase:hash(i)}));dirty=true;request();}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);const half=size/2,scale=size*BASE_SPREAD,ds=(size<=190?.4+(size-46)/144*.6:size<=340?1+(size-190)/150*.55:1.55)*.75;const list=[];
for(const dot of dots){const u=(elapsed/PERIOD+dot.phase)%1,e=Math.min(1,u/.72),radius=1-Math.pow(2,-9*e)*Math.cos(e*Math.PI*4.5);const p=dot.p.map(v=>v*radius);const q=spin(spin(p,elapsed*.22,.35),elapsed*.30+drag.yaw,drag.pitch);const z=q[2],pers=PERSPECTIVE/(PERSPECTIVE-z),depth=clamp((z+1.1)/2.2),r=ds*(.4+1.6*depth)*pers*(.5+1.3*(1-u)),alpha=(.07+.93*Math.pow(depth,1.55))*Math.sqrt(Math.max(0,Math.sin(Math.PI*u)));
list.push({x:half+q[0]*scale*pers,y:half+q[1]*scale*pers,r,alpha,z,color:u<.12?'#E9682E':depth>.7?'#EFF6FF':'#A9CCFF'});}
list.sort((a,b)=>a.z-b.z);for(const p of list){if(p.r<.05||p.alpha<.004)continue;const r=Math.max(.6,p.r),a=p.alpha*(p.r<.6?(p.r/.6)**2:1);ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();}ctx.globalAlpha=1;canvas.dataset.frames=String(++frames);canvas.dataset.particleCount=String(dots.length);stage.classList.add('ready');}
function tick(now){raf=0;if(!visible||document.hidden){last=0;return;}if(!paused){if(last&&now-last<32){request();return;}const dt=last?Math.min((now-last)/1000,.05):0;elapsed+=dt;if(!drag.active){drag.yaw+=drag.vx*dt;drag.pitch=clamp(drag.pitch+drag.vy*dt,-Math.PI/2,Math.PI/2);const decay=Math.exp(-2.4*dt);drag.vx*=decay;drag.vy*=decay;}dirty=true;}last=now;if(dirty){draw();dirty=false;}if(!paused)request();}
function request(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
control.addEventListener('click',()=>{paused=!paused;last=0;dirty=true;updateControl();request();});
reduced.addEventListener('change',e=>{paused=e.matches;last=0;dirty=true;updateControl();request();});
new ResizeObserver(resize).observe(stage);new IntersectionObserver(e=>{visible=e[0].isIntersecting;last=0;if(visible)request();else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'}).observe(stage);
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;Object.assign(drag,{active:true,x:e.clientX,y:e.clientY,time:performance.now(),vx:0,vy:0});canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag.active)return;const now=performance.now(),span=Math.max(1,now-drag.time),k=TAU/size,dx=(e.clientX-drag.x)*k,dy=(e.clientY-drag.y)*k;drag.yaw-=dx;drag.pitch=clamp(drag.pitch+dy,-Math.PI/2,Math.PI/2);drag.vx=-dx/span*1000;drag.vy=dy/span*1000;Object.assign(drag,{x:e.clientX,y:e.clientY,time:now});dirty=true;request();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag.active=false;});
updateControl();resize();
})();
