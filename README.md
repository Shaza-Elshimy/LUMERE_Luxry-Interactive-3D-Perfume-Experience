# LUMIÈRE — 360° Perfume Reveal

A luxury fragrance experience built with React, TypeScript, Vite, Tailwind, Three.js, React Three Fiber, drei, and GSAP. The original glass bottle geometry, amber liquid, gold cap, materials, label, particles, mouse tilt, and floating motion are preserved.

## Run

```sh
npm install
npm run dev
```

Open **http://localhost:5173/** at the top of the page to start the reveal. Vite uses `strictPort: true`, so it reports a busy port instead of silently opening a different preview. Restart an existing preview after configuration changes if it is serving outdated styles.

```sh
npm run build
npm run preview
```

## Opening sequence

The opening uses one bounded sticky track before the rest of the website:

1. The original Three.js bottle is centered in a dedicated intro.
2. Scrolling drives exactly one full revolution around its Y axis. The presentation group's rotation changes from `-0.16` to `2π - 0.16`; the quarter-turn checkpoints are 90°, 180°, 270°, and 360°.
3. The last portion of the track moves the same bottle instance into its actual Hero visual area. The Hero copy fades in after the bottle has moved clear of the headline. No additional rotation is added during this handoff.
4. The opening track releases naturally. Hero scrolls out and Story, Notes, Collection, Final Showcase, Newsletter, and Footer remain in normal document flow. They no longer reposition the WebGL bottle.

During the turn, the bottle now follows a four-part traveling arc: left/up/forward, right/down/back, left/up/forward, then back to its upright center. Pitch, roll, and a subtle size change reinforce the depth motion while preserving the exact 360° yaw. Mobile travel is gentler. Projected bounds constrain translation to the available visual area, so fitting does not cancel the movement or let it cross text.

There is no body scroll lock or wheel/touch hijacking. The track is 350 small-viewport-height units on desktop and 320 on mobile. Its intro, canvas, navigation, and final Hero share a grid cell with sticky positioning; unrelated sections are outside this container. The mobile Hero fits the viewport so the completed reveal and headline remain composed together.

The progress line and angle indicator follow the actual reveal timeline. Skip and Home links lead to the completed Hero. A URL ending in `#home` intentionally skips the opening; use `/` without that hash, or scroll back to the top, to replay it. Reverse scrolling reverses both the turn and handoff. Reduced-motion preferences bypass the long intro and show the Hero directly.

## Root cause of the previous behavior

The old controller spread bottle poses across five content sections, which could not provide a single pre-Hero 360° reveal. The layout also selected visual regions independently from the scrubbed animation. The updated experience has one timeline and one shared handoff value for both presentation and positioning.

The running port-5173 preview was also serving an outdated transformed stylesheet even though component changes were visible. That process was verified as this project and restarted on the requested port; the served stylesheet was then checked for the new reveal rules.

## Animation and coordinates

`RevealExperience.tsx` creates the single `perfume-reveal` timeline and `perfume-reveal-scroll` ScrollTrigger with `scrub: 0.6`. The named stages are `reveal`, `rotationComplete`, and `hero`. The first 78% completes the turn; the remaining 22% performs the handoff. This controller also works with the static visual fallback when WebGL is unavailable.

`revealController.ts` shares the timeline and the handoff value with the lazy-loaded scene. Once the original bottle is mounted, `PerfumeScene.tsx` adds its real Object3D and camera tweens to that timeline. This avoids duplicate scroll controllers and preserves the same mesh instance through loading, scrolling, and resizing.

Transform ownership is separated:

- `perfume-layout`: responsive DOM-to-world positioning and fitting.
- `perfume-presentation`: GSAP owns the actual 360° rotation, depth, and scale.
- `perfume-interaction`: `useFrame` owns damped pointer tilt and idle floating.
- Camera position, look-at target, lighting, and atmospheric presentation remain coordinated by GSAP.

`useBottleLayout.ts` measures the intro and Hero rectangles relative to the actual canvas. It interpolates those rectangles using the timeline's shared handoff value, maps their centers through the camera field of view and distance into world space, and fits the projected geometry to the presentation area. It does not guess fixed world coordinates or select later sections by viewport proximity. Clipping protects nearby text, and the transparent canvas has `pointer-events: none`, preserving buttons and navigation.

The layout parent keeps its world orientation, so camera-angle changes remain visible. Fitting preserves the interaction child's float instead of centering it away. Native ScrollTrigger refresh handles resizing; late scene loading seeks to the current reveal progress. Timeline contexts, subscriptions, DOM listeners, observers, textures, and font callbacks are cleaned up.

## Files

- `src/App.tsx`: original Hero, navigation, sections, and demo interactions; the opening wrapper is before the remaining site.
- `src/components/RevealExperience.tsx`: intro markup, single timeline, UI transitions, accessibility, Skip/Home navigation.
- `src/components/revealController.ts`: shared timeline contract and rotation-complete checkpoint.
- `src/components/PerfumeScene.tsx`: scroll reveal, real 3D rotation, camera, lighting, pointer handling, rendering lifecycle.
- `src/components/PerfumeBottle.tsx`: shared original geometry and local label texture, with Gold, Noir, and Blanc material palettes.
- `src/components/ProductViewer.tsx`: independently mounted 3D product inspector with mouse/touch orbit controls.
- `src/components/useBottleLayout.ts`: responsive intro-to-Hero layout mapping.
- `src/style.css`: opening sticky track, responsive composition, original brand styling.
- `vite.config.ts`: stable development port 5173.
- `tests/scroll-experience.mjs`: browser regression checks.

## Validation

With the Vite server running:

```sh
npm run test:scroll
```

The harness uses installed Google Chrome; override `CHROME_PATH` or `TEST_URL` if needed. It checks the real React Three Fiber scene at desktop (1280 × 900), portrait tablet (820 × 1180), and mobile (390 × 844) sizes. Assertions cover exact quarter-turns and a full 360°, no extra rotation during handoff, Hero text clearance, geometry bounds, stable model identity, reverse scrolling, mouse tilt, Skip, normal page scrolling afterward, reduced-motion changes, one reveal trigger, and resizing. The suite collects browser errors. Headless software rendering uses a lower pixel ratio; it is not a benchmark of a physical device's GPU.

TypeScript checking and the production build pass. The lazy-loaded 3D chunk retains Vite's existing size warning (approximately 264 KB gzipped). Production pixel ratio is capped at 1.6, and rendering pauses outside the opening track or when the document is hidden. Google Fonts has system fallbacks; the bottle label is a local canvas texture.

The products and prices are fictional. Shopping-bag state lasts for the session, with no payments or orders. Newsletter validation explicitly states that the demo does not send or store email addresses.

### Reload/loading behavior

The intro and Hero static bottle fallbacks are hidden from the first CSS paint, including while the lazy scene chunk is still downloading. They are shown only after an explicit WebGL-unavailable result. This prevents a different perfume illustration flashing before the real model on reload, without removing static visuals from the product collection. `node tests/loading-experience.mjs` tests delayed scene delivery, reload, and unavailable-WebGL fallback behavior.

### Product inspection with drag

Opening a fragrance displays a genuine Three.js bottle built from the same shared geometry as the reveal. Gold, Noir, and Blanc use their corresponding materials. Mouse dragging or a touch swipe rotates the camera around the product; hovering alone does not rotate it. Horizontal rotation is unrestricted, vertical rotation is bounded, and pan/zoom are disabled to keep the bottle framed. Arrow keys rotate the focused viewer, and Home or the reset button restores the original view with drag momentum cleared.

The viewer is lazy-loaded only while the product dialog is open, uses on-demand rendering and capped pixel ratio, and is disposed when the dialog closes. Loading shows neutral text rather than a substitute perfume image. The modal's focus trap includes the keyboard-accessible viewer, and its shopping controls remain operational.

Run `node tests/product-viewer.mjs` with the Vite server running to check real geometry and variant materials, mouse dragging, camera reset, keyboard controls, cart actions, mobile touch swiping, and dialog closure. The reload/no-placeholder test also passes after the shared-geometry extraction.
