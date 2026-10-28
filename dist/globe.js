/* Globe — adapted from user-supplied OriginKit source for KC Finder.
   Website-specific implementation; https://www.originkit.dev/docs/licensing */
(async () => {
  const stage = document.querySelector('.globe-stage');
  const canvas = document.querySelector('#globe');
  const control = document.querySelector('.motion-control');
  if (!stage || !canvas || !control) return;
  let renderer;
  try {
    const [THREE, { geoEquirectangular, geoPath }, response] = await Promise.all([
      import('./vendor/three.module.min.js'),
      import('./vendor/d3-geo.bundle.mjs'),
      fetch('./assets/land-50m.json'),
    ]);
    if (!response.ok) throw new Error('Land data unavailable');
    const land = await response.json();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 2.8;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const globe = new THREE.Group();
    globe.rotation.set(23 * Math.PI / 180, -23 * Math.PI / 180, 0);
    scene.add(globe);
    // Hide the far hemisphere without painting an ocean-colored disk.
    // The transparent canvas reveals the actual banner background exactly.
    const ocean = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }));
    ocean.renderOrder = -1;
    globe.add(ocean);
    const position = (lng, lat, radius = 1.003) => {
      const a = lat * Math.PI / 180, b = lng * Math.PI / 180;
      return new THREE.Vector3(Math.cos(a) * Math.sin(b) * radius,
        Math.sin(a) * radius, Math.cos(a) * Math.cos(b) * radius);
    };
    const line = (points, material) => {
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    };
    const gridMaterial = new THREE.LineBasicMaterial({ color: '#aac5e8', transparent: true, opacity: 0.28 });
    for (let lat = -75; lat <= 75; lat += 15) {
      const points = [];
      for (let lng = -180; lng <= 180; lng += 3) points.push(position(lng, lat));
      line(points, gridMaterial);
    }
    for (let lng = -180; lng < 180; lng += 15) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 3) points.push(position(lng, lat));
      line(points, gridMaterial);
    }
    const outlineMaterial = new THREE.LineBasicMaterial({ color: '#e7f2ff', transparent: true, opacity: 0.8 });
    for (const feature of land.features) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const polygon of polygons) {
        const ring = polygon[0];
        const sampled = ring.filter((_, i) => i % 3 === 0);
        if (sampled.length < 3) continue;
        sampled.push(sampled[0]);
        line(sampled.map(([lng, lat]) => position(lng, lat, 1.006)), outlineMaterial);
      }
    }
    // Original equirectangular bitmap sampling keeps dots on land only.
    const bitmap = document.createElement('canvas');
    bitmap.width = 2048; bitmap.height = 1024;
    const ctx = bitmap.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');
    const projection = geoEquirectangular().fitSize([2048, 1024], { type: 'Sphere' });
    const path = geoPath(projection, ctx);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 2048, 1024);
    ctx.fillStyle = '#fff'; ctx.beginPath();
    land.features.forEach(feature => path(feature)); ctx.fill();
    const pixels = ctx.getImageData(0, 0, 2048, 1024).data;
    const points = [];
    const spacing = (24 + (8 - 1) / 9 * (8 - 24)) * 0.08;
    for (let lat = -89; lat < 90; lat += spacing) {
      const step = spacing / Math.max(0.3, Math.cos(lat * Math.PI / 180));
      for (let lng = -180; lng < 180; lng += step) {
        const [px, py] = projection([lng, lat]);
        const x = Math.max(0, Math.min(2047, Math.round(px)));
        const y = Math.max(0, Math.min(1023, Math.round(py)));
        if (pixels[(y * 2048 + x) * 4] > 128) points.push(position(lng, lat, 1.008));
      }
    }
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0032, 4, 4),
      new THREE.MeshBasicMaterial({ color: '#ffffff' }), points.length);
    const matrix = new THREE.Matrix4();
    points.forEach((point, i) => { matrix.makeTranslation(point.x, point.y, point.z); dots.setMatrixAt(i, matrix); });
    dots.instanceMatrix.needsUpdate = true;
    globe.add(dots);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, visible = true, hovering = false, raf = 0, last = 0;
    let drag = null, velocity = 0, targetYaw = globe.rotation.y, targetPitch = globe.rotation.x;
    const events = new AbortController();
    const listen = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
    const render = () => renderer.render(scene, camera);
    const updateControl = () => {
      control.hidden = false;
      control.textContent = paused ? '▶' : 'Ⅱ';
      control.setAttribute('aria-pressed', String(paused));
      control.setAttribute('aria-label', paused ? '지구본 회전 재생' : '지구본 회전 일시정지');
    };
    const active = () => visible && !document.hidden && (!paused && !hovering || drag?.active || Math.abs(targetYaw - globe.rotation.y) > 0.0001 || Math.abs(targetPitch - globe.rotation.x) > 0.0001);
    const tick = (time) => {
      raf = 0;
      if (!active()) { last = 0; return; }
      if (last && time - last < 1000 / 30) { raf = requestAnimationFrame(tick); return; }
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 30;
      last = time;
      if (!drag?.active && !paused && !hovering) {
        targetYaw -= 0.108 * dt;
        targetYaw += velocity; velocity *= Math.pow(0.9, dt * 60);
      }
      const smoothing = 1 - Math.exp(-10 * dt);
      globe.rotation.y += (targetYaw - globe.rotation.y) * smoothing;
      globe.rotation.x += (targetPitch - globe.rotation.x) * smoothing;
      render(); raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && active()) raf = requestAnimationFrame(tick); };
    const stopMotion = () => { velocity = 0; targetYaw = globe.rotation.y; targetPitch = globe.rotation.x; };
    listen(control, 'click', () => { paused = !paused; stopMotion(); updateControl(); start(); });
    listen(reduced, 'change', () => { paused = reduced.matches; stopMotion(); updateControl(); start(); });
    listen(document, 'visibilitychange', start);
    listen(canvas, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; stopMotion(); } });
    listen(canvas, 'pointerleave', () => { hovering = false; start(); });
    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: event.pointerType === 'mouse' };
      velocity = 0;
      canvas.setPointerCapture(event.pointerId);
    });
    listen(canvas, 'pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { drag = null; return; }
        if (Math.abs(dx) < 6) return;
        drag.active = true;
      }
      targetYaw += dx * 0.008;
      targetPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetPitch + dy * 0.008));
      velocity = reduced.matches ? 0 : dx * 0.001;
      drag.x = event.clientX; drag.y = event.clientY; start();
    });
    const endDrag = () => { drag = null; start(); };
    listen(canvas, 'pointerup', endDrag);
    listen(canvas, 'pointercancel', endDrag);
    listen(canvas, 'lostpointercapture', endDrag);
    const resize = new ResizeObserver(() => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    });
    resize.observe(stage);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); });
    intersection.observe(stage);
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault(); cancelAnimationFrame(raf); raf = 0;
      paused = true; stage.classList.remove('ready'); control.hidden = true;
    });
    listen(canvas, 'webglcontextrestored', () => { render(); stage.classList.add('ready'); updateControl(); });
    listen(window, 'pagehide', event => {
      if (event.persisted) return;
      cancelAnimationFrame(raf); resize.disconnect(); intersection.disconnect(); events.abort();
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); renderer.dispose();
    });
    render(); stage.classList.add('ready'); updateControl(); start();
  } catch (error) {
    renderer?.dispose();
    stage.classList.remove('ready'); control.hidden = true;
    console.warn('Globe: displaying static fallback.', error);
  }
})();
