# Auriga Simracing Cable Management (MVP)

A minimal web app (Vite + TypeScript + Three.js) that loads an STL of a 4040 extrusion cable guide, lets you set a target length along a chosen axis, and exports a baked STL.

This project is inspired by [`bracket.engineer`](https://github.com/wesbos/bracket.engineer) and uses a model originally published on Thingiverse.

- Base model: "4040 cable guide" by [HeavyMetalGuy](https://www.thingiverse.com/HeavyMetalGuy)
- License: [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/)
- Non-commercial use only. Please attribute the original author. Derivatives must be shared alike.

## Getting started

1) Install deps

```bash
npm i
```

2) Provide the STL asset

Place your STL at `public/model/4040_cableguide.stl`.
The app auto-loads this path at startup and does not allow user uploads.

3) Run dev server

```bash
npm run dev
```

Open the printed URL in your browser (Vite dev server).

4) Adjust length

- Choose axis X/Y/Z, or enable "Auto-detect longest axis".
- Enter target length (mm) and click "Apply Length".
- Use "Reset" to return to the original geometry (no cumulative scaling).

5) Export STL

- Click "Download STL". The file is exported with transforms baked into the geometry.

## Project structure

- `index.html` — UI layout and attribution footer
- `styles.css` — Minimal dark theme styles
- `src/main.ts` — Three.js scene, STL loader/exporter, scaling logic
- `public/model/4040_cableguide.stl` — The provided STL that is auto-loaded at startup
- `public/` — static assets served at the root

## Deploy to Vercel

- Push this repository to GitHub.
- In Vercel, create a New Project, import the repo.
- Framework preset: "Vite" (or "Other")
- Build command: `npm run build`
- Output directory: `dist`

Vercel will automatically deploy.

## Notes

- This MVP scales only along a single axis. For more advanced, parametric edits (channel count/width, fillets, holes), we can add Manifold 3D and rebuild the geometry in TypeScript.
- Ensure you respect the original model's license (CC BY-NC-SA 4.0) when sharing builds or derivatives.
