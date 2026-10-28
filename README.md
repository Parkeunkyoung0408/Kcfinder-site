# KC Finder responsive website

Design source: Figma `dPmnllCbYo3TTBRHN9KNIH`, frame `22:1329`.

Buildless HTML, CSS, JavaScript and Canvas 2D. Serve `dist/` with any static HTTP server.

## Main files
- `dist/index.html`: accessible page structure and form preview.
- `dist/style.css`: responsive styles at 1200, 900 and 640px breakpoints.
- `dist/app.js`: navigation, certification tabs, FAQ and preview form behavior.
- `dist/particles.js`: Particle Surge sphere using Canvas 2D and plain JavaScript, capped at 30fps and 1.5 DPR. Pauses offscreen, supports reduced motion and pause control. Desktop pointer drag rotates the particles with inertia. Mobile vertical scrolling stays available.

The contact form validates locally and does not send or store submissions. Company contact information and production privacy policy must be finalized before accepting real inquiries.

## Licensing
The hero implementation adapts the user-supplied OriginKit Particle Surge source. Its source/design is not original KC Finder IP. Official licensing: https://www.originkit.dev/docs/licensing (reviewed 2026-10-28). The completed client website is the intended deliverable; do not redistribute this source as a component library, template, starter kit, or design asset. Distribution of Figma/design files reproducing the OriginKit component requires separate permission. Original Figma icons and other assets retain their respective licenses. UI8 asset licensing remains subject to the owner's historical subscription terms/support confirmation.
