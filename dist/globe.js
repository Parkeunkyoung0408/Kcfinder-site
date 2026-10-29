// 지구본 — 점과 와이어프레임. 캔버스는 투명해서 폴더 뒤의 메인 배경이 비칩니다.
// https://www.originkit.dev/docs/licensing
(async () => {
  // 1. 화면 요소 — 무대, 캔버스, 일시정지 버튼이 없으면 그리지 않습니다
  const stage = document.querySelector('.globe-stage');
  const canvas = document.querySelector('#globe');
  const control = document.querySelector('.motion-control');
  if (!stage || !canvas || !control) return;

  // 2. 기본값 — 색, 밀도, 회전은 여기서만 고치고 settingsFor가 셰이더 숫자로 바꿉니다
  const PERSPECTIVE = 0.15;
  const SOURCES = 3;
  const CAGE = 1.18;
  const DRAG = 0.021;
  const DEFAULTS = {
    dot: '#FFFFFF',
    net: '#26FF00',
    density: 20,
    spin: 20,
    spinDir: 'right',
    hoverOn: true,
    sizePercent: 100,
    dots: { size: 8, wobble: 6, flicker: 7 },
    cage: { detail: 1, spread: 8, glow: 11 },
    shimmer: { color: '#D8CCFF', speed: 9, style: 'sweep', angle: 90, width: 7 },
    waves: { color: '#6FA8FF', color2: '#FF5E8F', size: 9, glow: 11, speed: 7 },
    hover: { fill: 9, glow: 11, reach: 9 },
  };

  // 3. 설정 바꾸기 — 0~20 값을 점 크기와 회전 속도로 바꿉니다
  const clamp = (v, lo, hi, fallback) => {
    const n = typeof v === 'number' && isFinite(v) ? v : fallback;
    return Math.max(lo, Math.min(hi, n));
  };

  function settingsFor(cfg) {
    const d = cfg.dots || DEFAULTS.dots;
    const cg = cfg.cage || DEFAULTS.cage;
    const sh = cfg.shimmer || DEFAULTS.shimmer;
    const wv = cfg.waves || DEFAULTS.waves;
    const hv = cfg.hover || DEFAULTS.hover;
    const on = cfg.hoverOn === false ? 0 : 1;
    const density = clamp(cfg.density, 1, 20, DEFAULTS.density);
    const cageSpread = clamp(cg.spread, 1, 20, DEFAULTS.cage.spread);
    return {
      points: Math.round(300 + density * density * 22),
      dotSize: 0.004 + clamp(d.size, 1, 20, DEFAULTS.dots.size) * 0.0013,
      wobble: clamp(d.wobble, 0, 20, DEFAULTS.dots.wobble) * 0.0055,
      flicker: clamp(d.flicker, 0, 20, DEFAULTS.dots.flicker) * 0.042,
      detail: Math.round(clamp(cg.detail, 0, 4, DEFAULTS.cage.detail)),
      cage: CAGE + (cageSpread - 8) * 0.022,
      netGlow: clamp(cg.glow, 0, 20, DEFAULTS.cage.glow) * 0.075,
      shimmer: clamp(sh.speed, 0, 20, DEFAULTS.shimmer.speed) * 0.03,
      edgeMix: sh.style === 'sweep' ? 0 : 1,
      sweepMix: sh.style === 'sweep' ? 1 : 0,
      sweepAxis: clamp(sh.angle, 0, 360, DEFAULTS.shimmer.angle) * (Math.PI / 180),
      sweepWidth: 0.05 + clamp(sh.width, 1, 20, DEFAULTS.shimmer.width) * 0.022,
      spread: 0.12 + clamp(wv.size, 1, 20, DEFAULTS.waves.size) * 0.045,
      intensity: clamp(wv.glow, 0, 20, DEFAULTS.waves.glow) * 0.075,
      wave: clamp(wv.speed, 0, 20, DEFAULTS.waves.speed) * 0.11,
      hoverFill: on * clamp(hv.fill, 0, 20, DEFAULTS.hover.fill) * 0.007,
      hoverGlow: on * clamp(hv.glow, 0, 20, DEFAULTS.hover.glow) * 0.09,
      hoverArc: 0.25 + clamp(hv.reach, 1, 20, DEFAULTS.hover.reach) * 0.055,
      hoverOn: on,
      spin: clamp(cfg.spin, 0, 20, DEFAULTS.spin) * 0.055 * (cfg.spinDir === 'left' ? -1 : 1),
      radius: 1,
    };
  }

  // 4. 셰이더 — 빛의 파동, 점, 케이지 선, 호버 면을 그립니다
  const SOURCE_GLSL = `
    #define SOURCES ${SOURCES}
    uniform vec3 uSource[SOURCES];
    uniform vec3 uSourceColor[SOURCES];
    uniform float uSpread;
    uniform float uIntensity;
    uniform float uWave;
    uniform float uTime;
    uniform vec3 uHoverDir;
    uniform float uHover;
    uniform float uHoverArc;

    vec3 sourceLight(vec3 dir) {
      vec3 lit = vec3(0.0);
      for (int i = 0; i < SOURCES; i++) {
        float ang = acos(clamp(dot(dir, uSource[i]), -1.0, 1.0));
        float reach = smoothstep(uSpread, 0.0, ang);
        float ripple = 0.5 + 0.5 * sin(ang * 9.0 - uTime * uWave * 3.0);
        lit += uSourceColor[i] * reach * (0.55 + ripple * 0.75);
      }
      return lit * uIntensity;
    }

    float hoverNear(vec3 dir) {
      float ang = acos(clamp(dot(dir, uHoverDir), -1.0, 1.0));
      return smoothstep(uHoverArc, 0.0, ang) * uHover;
    }
  `;

  const SWEEP_GLSL = `
    uniform float uSweepAxis;
    float sweepCoord(vec3 worldDir) {
      return dot(worldDir, vec3(cos(uSweepAxis), sin(uSweepAxis), 0.0));
    }
  `;

  const BAND_GLSL = `
    uniform float uSweepWidth;
    uniform float uSweepMix;
    float sweepBand(float coord, float time, float rate) {
      float head = mix(1.3, -1.3, fract(time * rate * 0.5));
      float d = coord - head;
      return exp(-(d * d) / (uSweepWidth * uSweepWidth)) * uSweepMix;
    }
  `;

  const POINT_VERTEX = `
    attribute vec3 aDir;
    attribute float aSeed;
    uniform float uRadius;
    uniform float uDotSize;
    uniform float uWobble;
    uniform float uFlicker;
    uniform float uViewHeight;
    varying float vFacing;
    varying float vLit;
    varying vec3 vGlow;
    varying float vSeed;
    varying float vNear;
    varying float vFlick;
    ${SOURCE_GLSL}
    void main() {
      vec3 glow = sourceLight(aDir);
      vGlow = glow;
      vLit = min(1.0, max(max(glow.r, glow.g), glow.b));
      vSeed = aSeed;
      vNear = hoverNear(aDir);
      float w =
        sin(aDir.x * 4.1 + uTime * 1.7) *
        cos(aDir.y * 3.3 - uTime * 1.3) *
        sin(aDir.z * 3.9 + uTime * 0.9 + aSeed * 0.6);
      float rate = 1.4 + aSeed * 4.6;
      float f =
        sin(uTime * rate + aSeed * 61.0) * 0.6 +
        sin(uTime * rate * 1.7 + aSeed * 23.0) * 0.4;
      vFlick = 1.0 - uFlicker * (1.0 - (0.5 + 0.5 * f));
      float r = uRadius * (1.0 + w * uWobble + vLit * 0.03 + vNear * 0.02);
      vec4 mv = modelViewMatrix * vec4(aDir * r, 1.0);
      vec3 n = normalize((modelViewMatrix * vec4(aDir, 0.0)).xyz);
      vFacing = dot(n, normalize(-mv.xyz));
      float size = uDotSize * (1.0 + vLit * 0.5 + vNear * 0.6) * mix(1.0, vFlick, 0.35);
      gl_PointSize = max(size * (uViewHeight * projectionMatrix[1][1]) / (-2.0 * mv.z), 0.0);
      gl_Position = projectionMatrix * mv;
    }
  `;

  const POINT_FRAGMENT = `
    precision highp float;
    uniform vec3 uDot;
    varying float vFacing;
    varying float vLit;
    varying vec3 vGlow;
    varying float vSeed;
    varying float vNear;
    varying float vFlick;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float core = 1.0 - smoothstep(0.0, 0.45, d);
      float halo = exp(-d * d * 2.5);
      float depth = mix(0.25, 1.0, smoothstep(-0.6, 0.65, vFacing));
      float grain = 0.7 + 0.3 * vSeed;
      vec3 col = uDot * grain + vGlow;
      float a = (core * 0.8 + halo * 0.35) * depth * vFlick * (0.85 + vLit * 0.9 + vNear * 0.8);
      if (a < 0.002) discard;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  const CAGE_VERTEX = `
    attribute float aEdge;
    attribute float aSeed;
    varying float vFacing;
    varying float vEdge;
    varying float vSeed;
    varying vec3 vGlow;
    varying float vNear;
    varying float vSweep;
    ${SOURCE_GLSL}
    ${SWEEP_GLSL}
    void main() {
      vec3 dir = normalize(position);
      vEdge = aEdge;
      vSeed = aSeed;
      vGlow = sourceLight(dir);
      vNear = hoverNear(dir);
      vSweep = sweepCoord(normalize((modelMatrix * vec4(position, 1.0)).xyz));
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
      vFacing = dot(n, normalize(-mv.xyz));
      gl_Position = projectionMatrix * mv;
    }
  `;

  const CAGE_FRAGMENT = `
    precision highp float;
    uniform vec3 uNet;
    uniform vec3 uShimmerColor;
    uniform float uNetGlow;
    uniform float uShimmer;
    uniform float uHoverGlow;
    uniform float uEdgeMix;
    uniform float uTime;
    varying float vFacing;
    varying float vEdge;
    varying float vSeed;
    varying vec3 vGlow;
    varying float vNear;
    varying float vSweep;
    ${BAND_GLSL}
    void main() {
      float depth = mix(0.32, 1.0, smoothstep(-0.9, 0.8, vFacing));
      float head = fract(vSeed + uTime * uShimmer);
      float run = smoothstep(0.3, 0.0, abs(vEdge - head)) * uEdgeMix;
      float sweep = sweepBand(vSweep, uTime, uShimmer);
      float twinkle = 0.5 + 0.5 * sin(vSeed * 43.0 + uTime * uShimmer * 5.0);
      float spark = clamp(run * 1.1 + sweep * 1.2 + twinkle * 0.35, 0.0, 1.0);
      vec3 col = mix(uNet, uShimmerColor, spark) + vGlow * 0.6;
      float a = uNetGlow * depth * (0.4 + run * 1.5 + sweep * 1.9 + twinkle * 0.3);
      a += vNear * uHoverGlow * depth;
      if (a < 0.002) discard;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  const PANEL_VERTEX = `
    attribute vec3 aFace;
    attribute float aSeed;
    varying float vFacing;
    varying float vSeed;
    varying float vNear;
    varying vec3 vGlow;
    varying float vSweep;
    ${SOURCE_GLSL}
    ${SWEEP_GLSL}
    void main() {
      vec3 dir = normalize(aFace);
      vSeed = aSeed;
      vNear = hoverNear(dir);
      vGlow = sourceLight(dir);
      vSweep = sweepCoord(normalize((modelMatrix * vec4(aFace, 0.0)).xyz));
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize((modelViewMatrix * vec4(dir, 0.0)).xyz);
      vFacing = dot(n, normalize(-mv.xyz));
      gl_Position = projectionMatrix * mv;
    }
  `;

  const PANEL_FRAGMENT = `
    precision highp float;
    uniform vec3 uNet;
    uniform vec3 uShimmerColor;
    uniform float uFill;
    uniform float uShimmer;
    uniform float uEdgeMix;
    uniform float uTime;
    varying float vFacing;
    varying float vSeed;
    varying float vNear;
    varying vec3 vGlow;
    varying float vSweep;
    ${BAND_GLSL}
    void main() {
      float depth = mix(0.12, 1.0, smoothstep(-0.4, 0.7, vFacing));
      float pulse = (0.5 + 0.5 * sin(vSeed * 31.0 + uTime * uShimmer * 4.0)) * uEdgeMix;
      pulse = clamp(pulse + sweepBand(vSweep, uTime, uShimmer) * 1.2, 0.0, 1.0);
      vec3 col = mix(uNet, uShimmerColor, pulse * 0.7) + vGlow * 0.5;
      float a = uFill * depth * vNear * (0.45 + pulse * 0.9);
      if (a < 0.002) discard;
      gl_FragColor = vec4(col * a, a);
    }
  `;

  let renderer;
  try {
    const THREE = await import('./vendor/three.module.min.js');
    const cfg = {
      ...DEFAULTS,
      dots: { ...DEFAULTS.dots },
      cage: { ...DEFAULTS.cage },
      shimmer: { ...DEFAULTS.shimmer },
      waves: { ...DEFAULTS.waves },
      hover: { ...DEFAULTS.hover },
    };
    const S = settingsFor(cfg);

    // 5. 점 배치 — 황금각으로 구 위에 고르게 뿌립니다
    function buildPoints(count) {
      const dirs = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const y = 1 - (i / Math.max(1, count - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const a = golden * i;
        dirs[i * 3] = Math.cos(a) * r;
        dirs[i * 3 + 1] = y;
        dirs[i * 3 + 2] = Math.sin(a) * r;
        seeds[i] = Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(dirs, 3));
      geometry.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
      return geometry;
    }

    // 6. 케이지 만들기 — 면의 모서리는 선으로, 면 중심은 호버 빛으로 씁니다
    function buildCage(radius, detail) {
      const solid = new THREE.IcosahedronGeometry(radius, detail);
      const edges = new THREE.EdgesGeometry(solid);
      const pos = edges.attributes.position;
      const n = pos.count;
      const param = new Float32Array(n);
      const edgeSeed = new Float32Array(n);
      for (let i = 0; i < n; i += 2) {
        param[i] = 0;
        param[i + 1] = 1;
        const mx = (pos.getX(i) + pos.getX(i + 1)) * 0.5;
        const my = (pos.getY(i) + pos.getY(i + 1)) * 0.5;
        const mz = (pos.getZ(i) + pos.getZ(i + 1)) * 0.5;
        const seed = Math.abs(Math.sin(mx * 127.1 + my * 311.7 + mz * 74.7) * 43758.5453) % 1;
        edgeSeed[i] = seed;
        edgeSeed[i + 1] = seed;
      }
      edges.setAttribute('aEdge', new THREE.BufferAttribute(param, 1));
      edges.setAttribute('aSeed', new THREE.BufferAttribute(edgeSeed, 1));

      const facePosition = solid.attributes.position;
      const verts = facePosition.count;
      const face = new Float32Array(verts * 3);
      const faceSeed = new Float32Array(verts);
      for (let i = 0; i < verts; i += 3) {
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let k = 0; k < 3; k++) {
          cx += facePosition.getX(i + k);
          cy += facePosition.getY(i + k);
          cz += facePosition.getZ(i + k);
        }
        cx /= 3;
        cy /= 3;
        cz /= 3;
        const seed = Math.abs(Math.sin(cx * 269.5 + cy * 183.3 + cz * 246.1) * 43758.5453) % 1;
        for (let k = 0; k < 3; k++) {
          face[(i + k) * 3] = cx;
          face[(i + k) * 3 + 1] = cy;
          face[(i + k) * 3 + 2] = cz;
          faceSeed[i + k] = seed;
        }
      }
      solid.setAttribute('aFace', new THREE.BufferAttribute(face, 3));
      solid.setAttribute('aSeed', new THREE.BufferAttribute(faceSeed, 1));
      return { edges, panels: solid };
    }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
    const group = new THREE.Group();
    scene.add(group);

    const sources = [
      new THREE.Vector3(-0.6, -0.45, 0.65),
      new THREE.Vector3(0.72, 0.35, 0.6),
      new THREE.Vector3(0.1, 0.9, -0.42),
    ].map((vector) => vector.normalize());
    const axes = [
      new THREE.Vector3(0.2, 1, 0.1),
      new THREE.Vector3(-0.8, 0.4, 0.3),
      new THREE.Vector3(0.3, -0.5, 0.9),
    ].map((vector) => vector.normalize());

    const waveA = new THREE.Color(cfg.waves.color);
    const waveB = new THREE.Color(cfg.waves.color2);
    const sourceColors = [waveA.clone(), waveB.clone(), waveA.clone().lerp(waveB, 0.35)];
    const hoverDir = new THREE.Vector3(0, 0, 1);
    const shared = {
      uTime: { value: 0 },
      uSpread: { value: S.spread },
      uIntensity: { value: S.intensity },
      uWave: { value: S.wave },
      uSource: { value: sources.map((vector) => vector.clone()) },
      uSourceColor: { value: sourceColors },
      uHoverDir: { value: hoverDir },
      uHover: { value: 0 },
      uHoverArc: { value: S.hoverArc },
    };
    const cageColors = {
      uNet: { value: new THREE.Color(cfg.net) },
      uShimmerColor: { value: new THREE.Color(cfg.shimmer.color) },
      uShimmer: { value: S.shimmer },
      uEdgeMix: { value: S.edgeMix },
      uSweepMix: { value: S.sweepMix },
      uSweepAxis: { value: S.sweepAxis },
      uSweepWidth: { value: S.sweepWidth },
    };
    const materialOptions = {
      glslVersion: THREE.GLSL1,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    };
    const pointMat = new THREE.ShaderMaterial({
      ...materialOptions,
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      uniforms: {
        ...shared,
        uRadius: { value: S.radius },
        uDotSize: { value: S.dotSize },
        uWobble: { value: S.wobble },
        uFlicker: { value: S.flicker },
        uViewHeight: { value: 600 },
        uDot: { value: new THREE.Color(cfg.dot) },
      },
    });
    const cageMat = new THREE.ShaderMaterial({
      ...materialOptions,
      vertexShader: CAGE_VERTEX,
      fragmentShader: CAGE_FRAGMENT,
      uniforms: { ...shared, ...cageColors, uNetGlow: { value: S.netGlow }, uHoverGlow: { value: S.hoverGlow } },
    });
    const panelMat = new THREE.ShaderMaterial({
      ...materialOptions,
      vertexShader: PANEL_VERTEX,
      fragmentShader: PANEL_FRAGMENT,
      uniforms: { ...shared, ...cageColors, uFill: { value: S.hoverFill } },
      side: THREE.DoubleSide,
    });

    const pointGeo = buildPoints(S.points);
    const points = new THREE.Points(pointGeo, pointMat);
    points.frustumCulled = false;
    group.add(points);
    const built = buildCage(S.radius * S.cage, S.detail);
    const cage = new THREE.LineSegments(built.edges, cageMat);
    const panels = new THREE.Mesh(built.panels, panelMat);
    cage.frustumCulled = false;
    panels.frustumCulled = false;
    group.add(panels);
    group.add(cage);

    let width = 0;
    let height = 0;
    let halfHeight = 1.5;
    let time = 0;
    let spinAngle = 0;
    let dragX = 0;
    let dragY = 0;
    let velX = 0;
    let velY = 0;
    let grip = 0;
    let targetGrip = 0;
    let aimX = 0;
    let aimY = 0;
    let paused = reduced.matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    let drag = null;

    // 7. 그리기 — 화면 밖에 있거나 멈추면 프레임을 돌리지 않습니다
    const updateControl = () => {
      control.hidden = false;
      control.textContent = paused ? '▶' : 'Ⅱ';
      control.setAttribute('aria-pressed', String(paused));
      control.setAttribute('aria-label', paused ? '지구본 회전 재생' : '지구본 회전 일시정지');
    };

    const updateCamera = () => {
      const aspect = Math.max(1, width) / Math.max(1, height);
      const distance = 1 / PERSPECTIVE;
      const sizePct = clamp(cfg.sizePercent, 20, 200, DEFAULTS.sizePercent);
      const settings = settingsFor(cfg);
      const span = settings.radius * settings.cage * 2.55 * (100 / sizePct);
      const visibleHeight = aspect < 1 ? span / aspect : span;
      halfHeight = visibleHeight / 2;
      camera.aspect = aspect;
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
      camera.near = Math.max(0.1, distance - 20);
      camera.far = distance + 20;
      camera.updateProjectionMatrix();
    };

    const setSize = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      width = rect.width;
      height = rect.height;
      renderer.setSize(width, height, false);
      pointMat.uniforms.uViewHeight.value = height * dpr;
      updateCamera();
    };

    const updateHoverDir = () => {
      const aspect = Math.max(1, width) / Math.max(1, height);
      const distance = 1 / PERSPECTIVE;
      const halfW = halfHeight * aspect;
      const oz = distance;
      let dx = aimX * halfW;
      let dy = aimY * halfHeight;
      let dz = -oz;
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;
      const settings = settingsFor(cfg);
      const radius = settings.radius * settings.cage;
      const b = oz * dz;
      const c = oz * oz - radius * radius;
      const disc = b * b - c;
      const t = disc > 0 ? -b - Math.sqrt(disc) : -b;
      const hit = new THREE.Vector3(dx * t, dy * t, oz + dz * t);
      group.updateMatrixWorld();
      group.worldToLocal(hit);
      if (hit.lengthSq() > 1e-8) hoverDir.copy(hit.normalize());
    };

    const moving = () =>
      visible &&
      !document.hidden &&
      (!paused || drag?.active || Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001 || Math.abs(grip - targetGrip) > 0.001);

    const render = () => renderer.render(scene, camera);

    const step = (now) => {
      raf = 0;
      if (!moving()) {
        last = 0;
        return;
      }
      if (last && now - last < 1000 / 30) {
        raf = requestAnimationFrame(step);
        return;
      }
      let dt = last ? (now - last) / 1000 : 1 / 30;
      last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;
      const settings = settingsFor(cfg);
      if (!paused) time += dt;
      const live = pointMat.uniforms.uSource.value;
      for (let i = 0; i < SOURCES; i++) {
        if (!paused) sources[i].applyAxisAngle(axes[i], dt * settings.wave * (0.35 + i * 0.12)).normalize();
        live[i].copy(sources[i]);
      }
      if (!drag?.active && !paused) {
        const decay = Math.exp(-dt * 3);
        dragY += velY;
        dragX += velX;
        velX *= decay;
        velY *= decay;
        spinAngle += settings.spin * dt;
      }
      pointMat.uniforms.uTime.value = time;
      group.rotation.y = spinAngle + dragY;
      group.rotation.x = clamp(dragX * 0.5, -1, 1, 0);
      grip += (targetGrip * settings.hoverOn - grip) * (1 - Math.exp(-dt * 5));
      pointMat.uniforms.uHover.value = grip;
      if (grip > 0.001) updateHoverDir();
      render();
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (!raf && moving()) raf = requestAnimationFrame(step);
    };

    // 8. 조작 연결 — 일시정지, 줄어든 모션, 드래그는 같은 그리기 루프를 다시 켭니다
    const events = new AbortController();
    const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
    listen(control, 'click', () => {
      paused = !paused;
      velX = 0;
      velY = 0;
      updateControl();
      start();
    });
    listen(reduced, 'change', () => {
      paused = reduced.matches;
      velX = 0;
      velY = 0;
      updateControl();
      start();
    });
    listen(document, 'visibilitychange', start);
    listen(canvas, 'pointerenter', (event) => {
      if (event.pointerType === 'mouse') targetGrip = 1;
      start();
    });
    listen(canvas, 'pointerleave', () => {
      targetGrip = 0;
      if (drag && !drag.active) drag = null;
      start();
    });
    listen(canvas, 'pointerdown', (event) => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: event.pointerType === 'mouse' };
      velX = 0;
      velY = 0;
      if (drag.active) canvas.setPointerCapture(event.pointerId);
      start();
    });
    listen(canvas, 'pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      if (rect.width && rect.height) {
        aimX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        aimY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      }
      if (!drag || event.pointerId !== drag.id) {
        start();
        return;
      }
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
          drag = null;
          return;
        }
        if (Math.abs(dx) < 6) return;
        drag.active = true;
        canvas.setPointerCapture(event.pointerId);
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
      dragY += dx * DRAG;
      dragX += dy * DRAG;
      velY = dx * DRAG;
      velX = dy * DRAG;
      start();
    });
    const endDrag = () => {
      drag = null;
      start();
    };
    listen(canvas, 'pointerup', endDrag);
    listen(canvas, 'pointercancel', endDrag);
    listen(canvas, 'lostpointercapture', endDrag);

    const resize = new ResizeObserver(() => {
      setSize();
      render();
    });
    resize.observe(stage);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    intersection.observe(stage);
    listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      paused = true;
      stage.classList.remove('ready');
      control.hidden = true;
    });
    listen(window, 'pagehide', (event) => {
      if (event.persisted) return;
      cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      events.abort();
      pointGeo.dispose();
      built.edges.dispose();
      built.panels.dispose();
      pointMat.dispose();
      cageMat.dispose();
      panelMat.dispose();
      renderer.dispose();
    });

    // 9. 시작 — 크기를 맞춘 뒤 한 번 그리고, 준비되면 폴백 그림을 숨깁니다
    setSize();
    render();
    stage.classList.add('ready');
    updateControl();
    start();
  } catch (error) {
    renderer?.dispose();
    stage.classList.remove('ready');
    control.hidden = true;
    console.warn('Globe: displaying static fallback.', error);
  }
})();
