# KC Finder responsive website

Design source: Figma `dPmnllCbYo3TTBRHN9KNIH`, frame `22:1329`.

Buildless HTML, CSS, JavaScript and Three.js WebGL. Serve `dist/` with any static HTTP server.

## Main files
- `dist/index.html`: accessible page structure and form preview.
- `dist/style.css`: responsive styles at 1200, 900 and 640px breakpoints.
- `dist/app.js`: navigation, certification tabs, privacy dialog, and preview form behavior.
- `dist/globe.js`: OriginKit Globe Mesh adapted to plain JavaScript and Three.js. Transparent canvas so the folder banner background stays unchanged. 1.5 DPR cap, drag rotation, reduced motion, offscreen pause and a pause button. Mobile vertical scrolling stays available.
- `dist/vendor/`: pinned Three.js 0.170.0 and d3-geo 3.1.1 bundled dependencies, with license files.
- `dist/assets/land-50m.json`: Natural Earth land data from the user-supplied source URL; served locally. `globe-fallback.svg` is generated from that data and remains visible when WebGL/loading fails.

The contact form validates locally and does not send or store submissions. Company contact information and production privacy policy must be finalized before accepting real inquiries.

## Licensing
The hero implementation adapts the user-supplied OriginKit Globe source. Its source/design is not original KC Finder IP. Official licensing: https://www.originkit.dev/docs/licensing (reviewed 2026-10-28). The completed client website is the intended deliverable; do not redistribute this source as a component library, template, starter kit, or design asset. Distribution of Figma/design files reproducing the OriginKit component requires separate permission. Original Figma icons and other assets retain their respective licenses. UI8 asset licensing remains subject to the owner's historical subscription terms/support confirmation.
