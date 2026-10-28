/* One Solid Glass: adapted from OriginKit for this KC Finder website.
   OriginKit license: https://www.originkit.dev/docs/licensing
   Not licensed for redistribution as a component, template, or design asset.
   Brand colors, transparency and interaction controls adapted for this site. */
(() => {
'use strict';
const canvas=document.querySelector('#glass'),stage=canvas.parentElement,control=document.querySelector('.motion-control');
let gl;
try { gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'}); } catch { return; }
if(!gl){control.hidden=true;return;}
const VERT="#version 300 es\nvoid main() {\n    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n}";
const FRAG="#version 300 es\nprecision highp float;\nout vec4 outColor;\nuniform vec2 uRes;\nuniform mat3 uRot;\nuniform float uScale;\nuniform vec2 uOffset;\nuniform float uCamDist;\nuniform float uFocal;\nuniform float uRadius;\nuniform float uIor;\nuniform float uSpread;\nuniform int uBounces;\nuniform float uInner;\nuniform float uFresnel;\nuniform float uExposure;\nuniform float uLight;\nuniform float uStripSize;\nuniform float uSoft;\nuniform float uSmoke;\nuniform vec3 uTint;\nuniform vec3 uBg;\nuniform vec3 uPink;\nuniform vec3 uYellow;\nuniform vec3 uBlue;\nuniform vec3 uPeri;\nuniform vec3 uTeal;\nuniform vec3 uWhite;\nuniform vec3 uMauve;\nuniform float uGrain;\nuniform float uVignette;\nuniform float uTime;\n\nfloat sdBox(vec3 p) {\n    float r = uRadius;\n    vec3 q = abs(p) - vec3(0.5 - r);\n    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;\n}\n\nvec3 calcNormal(vec3 p) {\n    const float e = 0.0012;\n    const vec2 k = vec2(1.0, -1.0);\n    return normalize(\n        k.xyy * sdBox(p + k.xyy * e) +\n        k.yyx * sdBox(p + k.yyx * e) +\n        k.yxy * sdBox(p + k.yxy * e) +\n        k.xxx * sdBox(p + k.xxx * e));\n}\n\nvec2 slab(vec3 o, vec3 d) {\n    vec3 dd = mix(d, vec3(1e-6), step(abs(d), vec3(1e-6)));\n    vec3 inv = 1.0 / dd;\n    vec3 t1 = (vec3(-0.5) - o) * inv;\n    vec3 t2 = (vec3(0.5) - o) * inv;\n    vec3 tn = min(t1, t2);\n    vec3 tf = max(t1, t2);\n    return vec2(max(max(tn.x, tn.y), tn.z), min(min(tf.x, tf.y), tf.z));\n}\n\nfloat rect(vec2 a, vec2 c, vec2 hs) {\n    vec2 h = hs * uStripSize;\n    vec2 q = abs(a - c) - h;\n    float s = max(uSoft, 1e-4);\n    return (1.0 - smoothstep(-s, s, q.x)) * (1.0 - smoothstep(-s, s, q.y));\n}\n\n// Studio environment in world space: black, with hard-edged coloured light strips.\nvec3 env(vec3 d) {\n    float az = atan(d.x, -d.z);\n    float el = asin(clamp(d.y, -1.0, 1.0));\n    vec2 a = vec2(az, el);\n    vec3 L = vec3(0.0);\n    L += uBlue * rect(a, vec2(0.05, 0.78), vec2(0.6, 0.16));\n    L += uYellow * rect(a, vec2(-0.82, 0.12), vec2(0.13, 0.42));\n    L += uPink * rect(a, vec2(0.84, -0.02), vec2(0.12, 0.46));\n    L += uPeri * rect(a, vec2(0.3, -0.78), vec2(0.5, 0.14));\n    L += uTeal * rect(a, vec2(-0.4, -0.58), vec2(0.11, 0.13));\n    L += uMauve * rect(a, vec2(1.25, -0.55), vec2(0.16, 0.12));\n    L += uWhite * rect(a, vec2(1.65, 0.35), vec2(0.07, 0.6));\n    L += uWhite * rect(a, vec2(-1.7, -0.25), vec2(0.06, 0.5));\n    L += uWhite * 0.8 * rect(a, vec2(2.6, 0.55), vec2(0.3, 0.06));\n    L += uBlue * rect(a, vec2(-2.65, -0.4), vec2(0.28, 0.08));\n    L += uYellow * 0.7 * rect(a, vec2(-1.3, 0.75), vec2(0.18, 0.1));\n    L += uPink * 0.8 * rect(a, vec2(2.2, -0.6), vec2(0.15, 0.1));\n    float smoke = smoothstep(0.35, 1.3, abs(az)) * (1.0 - abs(el) * 0.63);\n    return uBg + L * uLight + uSmoke * smoke * vec3(0.25, 0.29, 0.35);\n}\n\nvec3 W(vec3 d) { return uRot * d; }\n\nfloat schlick(float c) {\n    float f0 = 0.04;\n    return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);\n}\n\nvec3 shade(vec3 p, vec3 d) {\n    vec3 n = calcNormal(p);\n    float F = clamp(schlick(dot(-d, n)) * uFresnel, 0.0, 1.0);\n    vec3 col = env(W(reflect(d, n))) * F;\n\n    vec3 rd = refract(d, n, 1.0 / max(uIor, 1.0001));\n    vec3 thr = vec3(1.0 - F) * uTint;\n    vec3 pp = p - n * 0.002;\n\n    for (int b = 0; b < 6; b++) {\n        if (b >= uBounces) break;\n        vec3 q = pp + rd * max(slab(pp, rd).y, 0.0);\n        for (int i = 0; i < 12; i++) {\n            float s = sdBox(q);\n            if (s < 0.0004) break;\n            q -= rd * s;\n        }\n        vec3 n2 = calcNormal(q);\n        vec3 dg = refract(rd, -n2, uIor);\n        bool tir = dot(dg, dg) < 0.5;\n        if (!tir) {\n            vec3 dr = refract(rd, -n2, max(uIor - uSpread, 1.0001));\n            vec3 db = refract(rd, -n2, uIor + uSpread);\n            float er = dot(dr, dr) > 0.5 ? env(W(dr)).r : 0.0;\n            float eg = env(W(dg)).g;\n            float eb = dot(db, db) > 0.5 ? env(W(db)).b : 0.0;\n            float Fe = schlick(dot(dg, n2));\n            col += thr * (1.0 - Fe) * vec3(er, eg, eb);\n            thr *= min(Fe * uInner, 1.0) * uTint;\n        } else {\n            thr *= uTint;\n        }\n        rd = reflect(rd, -n2);\n        pp = q - n2 * 0.002;\n    }\n    return col;\n}\n\nvec3 tone(vec3 c) {\n    c *= uExposure;\n    vec3 k = vec3(0.8);\n    vec3 over = max(c - k, 0.0);\n    return min(c, k) + 0.15 * (1.0 - exp(-over / 0.15));\n}\n\nfloat hash(vec2 p) {\n    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);\n}\n\nvoid main() {\n    vec2 frag = gl_FragCoord.xy;\n    float m = max(min(uRes.x, uRes.y), 1.0);\n    vec2 uv = (frag - 0.5 * uRes) / m;\n    uv -= uOffset;\n    uv /= max(uScale, 0.01);\n\n    vec3 ro = vec3(0.0, 0.0, uCamDist);\n    vec3 rdw = normalize(vec3(uv, -uFocal));\n    mat3 inv = transpose(uRot);\n    vec3 o = inv * ro;\n    vec3 d = inv * rdw;\n\n    float alpha = 0.0;\n    vec3 col = uBg;\n    vec2 tb = slab(o, d);\n    if (tb.x < tb.y && tb.y > 0.0) {\n        float t = max(tb.x, 0.0);\n        bool hit = false;\n        for (int i = 0; i < 24; i++) {\n            float s = sdBox(o + d * t);\n            if (s < 0.0004) { hit = true; break; }\n            t += s;\n            if (t > tb.y) break;\n        }\n        if (hit) {\n            vec3 hitPoint = o + d * t;\n            col = tone(shade(hitPoint, d));\n            float facing = abs(dot(-d, calcNormal(hitPoint)));\n            alpha = clamp(0.50 + 0.30 * pow(1.0-facing, 2.0) + 0.22 * max(col.r, max(col.g,col.b)), 0.50, 0.96);\n            float luma = dot(col, vec3(0.2126,0.7152,0.0722));\n            col = mix(col, vec3(luma), 0.22);\n            col = (col - vec3(0.027,0.118,0.357)*(1.0-alpha))/alpha;\n        }\n    }\n\n    vec2 vq = frag / uRes - 0.5;\n    col *= 1.0 - uVignette * smoothstep(0.2, 0.75, length(vq) * 1.2);\n    float g = hash(frag + floor(uTime * 24.0) * 17.31) - 0.5;\n    col += g * uGrain * 0.25;\n    outColor = vec4(clamp(col, 0.0, 1.0), alpha);\n}";
function mul(a, b) {
    const r = new Array(9).fill(0)
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
    return r
}
function rotX(a) {
    const c = Math.cos(a), s = Math.sin(a)
    return [1, 0, 0, 0, c, -s, 0, s, c]
}
function rotY(a) {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, 0, s, 0, 1, 0, -s, 0, c]
}
function rotZ(a) {
    const c = Math.cos(a), s = Math.sin(a)
    return [c, -s, 0, s, c, 0, 0, 0, 1]
}
function axisAngle(k, a) {
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c
    const [x, y, z] = k
    return [
        t * x * x + c, t * x * y - s * z, t * x * z + s * y,
        t * x * y + s * z, t * y * y + c, t * y * z - s * x,
        t * x * z - s * y, t * y * z + s * x, t * z * z + c,
    ]
}
function colMajor(m) {
    return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])
}

function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){gl.deleteShader(sh);throw Error('Shader compilation failed');}return sh;}
let program;
try {program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Link failed');}catch(e){control.hidden=true;return;}
gl.useProgram(program);gl.bindVertexArray(gl.createVertexArray());
const uniforms={};for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(program,i);uniforms[u.name]=gl.getUniformLocation(program,u.name);}
const U=n=>uniforms[n];
const floats={uScale:1.28,uCamDist:4,uFocal:1.575,uRadius:.07,uIor:1.5,uSpread:.012,uInner:2.5,uFresnel:1,uExposure:1.25,uLight:1.45,uStripSize:1,uSoft:.025,uSmoke:.25,uGrain:0,uVignette:0,uTime:0};
for(const [k,v]of Object.entries(floats))gl.uniform1f(U(k),v);
gl.uniform2f(U('uOffset'),0,0);gl.uniform1i(U('uBounces'),3);
const colors={uTint:'#F4F6FF',uBg:'#527DB6',uPink:'#B8D3FA',uYellow:'#E9682E',uBlue:'#2F6BDB',uPeri:'#B8D3FA',uTeal:'#7CAAF0',uWhite:'#FFFFFF',uMauve:'#497CC8'};
for(const [k,v]of Object.entries(colors))gl.uniform3fv(U(k),[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)/255));
const D=Math.PI/180,axis0=[Math.sin(35*D),Math.cos(35*D),Math.sin(20*D)],length=Math.hypot(...axis0),axis=axis0.map(x=>x/length);
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motionQuery.matches,visible=true,angle=55*D,last=0,raf=0,pitch=0,yaw=0,drag=null,hover=0,glow=0,dirty=true,drawCount=0;
function updateControl(){control.textContent=paused?'▶':'Ⅱ';control.setAttribute('aria-pressed',String(paused));control.setAttribute('aria-label',paused?'큐브 모션 재생':'큐브 모션 일시정지');}
function resize(){const r=stage.getBoundingClientRect();const px=Math.max(1,Math.round(r.width*Math.min(devicePixelRatio||1,1.5)));canvas.width=px;canvas.height=px;gl.viewport(0,0,px,px);gl.uniform2f(U('uRes'),px,px);dirty=true;request();}
function draw(){const base=mul(rotX(pitch*D),mul(rotY(yaw*D),mul(rotZ(-40*D),mul(rotX(12*D),rotY(18*D)))));const r=mul(axisAngle(axis,angle),base);gl.uniformMatrix3fv(U('uRot'),false,colMajor(r));gl.uniform1f(U('uFresnel'),1+glow*.12);gl.uniform1f(U('uLight'),1.45+glow*.16);gl.drawArrays(gl.TRIANGLES,0,3);if(!drawCount++)stage.classList.add('ready');canvas.dataset.frames=String(drawCount);}
function tick(now){raf=0;if(!visible||document.hidden){last=0;return;}if(!paused){if(last&&now-last<32){request();return;}const dt=last?Math.min((now-last)/1000,.07):0;angle+=dt*.16;glow+=(hover-glow)*.12;dirty=true;}last=now;if(dirty){draw();dirty=false;}if(!paused)request();}
function request(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
control.addEventListener('click',()=>{paused=!paused;last=0;updateControl();dirty=true;request();});
motionQuery.addEventListener('change',e=>{paused=e.matches;last=0;updateControl();dirty=true;request();});
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible)request();else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'}).observe(stage);
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
stage.addEventListener('pointerenter',()=>{hover=1});stage.addEventListener('pointerleave',()=>{hover=0});
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;drag={x:e.clientX,y:e.clientY,pitch,yaw};stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.35;pitch=drag.pitch+(e.clientY-drag.y)*.35;dirty=true;request();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>{drag=null});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;stage.classList.remove('ready');control.hidden=true;if(raf)cancelAnimationFrame(raf);});
updateControl();resize();
})();
