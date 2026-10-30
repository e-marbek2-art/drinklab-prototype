# DrinkLab

A local React + TypeScript + Vite prototype with three selectable energy drinks, separate ingredient experiences and an evidence-based ingredient library.

Routes: `/`, `/drinks/red-bull`, `/drinks/monster`, `/drinks/red-bull-sugarfree`, `/ingredients`, `/ingredients/:id`, `/about`. Browser Back/Forward and direct page refresh are supported through Vite's SPA fallback. There are no scroll-anchor navigation links.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173). To open on an iPhone, connect it to the computer's Wi-Fi network and use Vite's Network URL. If Windows asks, allow Node.js on private networks. Guest Wi-Fi or router client isolation can block access between devices.

```sh
npm run build
npm run preview
```

## Project map

- `src/Scene.tsx`: lathed thick-wall glass, studio environment, liquid stream deformation, ripple shader, instanced ingredients, bubbles, splash droplets and camera.
- `src/data.ts`: drink metadata, formulation-specific stage timing and product sources.
- `src/ingredients.ts`: ingredient guides, useful roles, downsides, evidence limits and health sources.
- `src/main.tsx`: shared playback clock, homepage, ingredient panels and controls.
- `src/styles.css` and `src/pages.css`: responsive presentation, drink selection, separate pages and mobile layout.

The glass uses a closed curved profile, physical refractive transmission with back-face capture, studio light panels, a ring-meshed reflective liquid surface and animated meniscus. Render-buffer resolution and sampling adapt to narrow canvases. Ingredient stages and particle patterns vary by drink. This remains a visual approximation, not a photorealistic offline render or physical fluid solver.

Red Bull Original and Sugarfree use Norwegian manufacturer information. Monster's manufacturer confirms serving size, caffeine and calories, while extra ingredient chapters are based on an older Norwegian retailer label and explicitly marked as label-dependent. Unverified quantities are not invented. Product pictures may depict packaging from another market.

One mutable playback clock drives both the scene and UI. Pause, replay, stage selection and timeline scrubbing do not recreate or reset the clock. The fluid effect is an artistic real-time approximation, not a fluid solver. Particle size, ingredient colours, pouring order and water level do not represent manufacturing or measured ingredient volumes.

Manufacturer data: https://www.redbull.com/no-no/energydrink/products/red-bull-energy-drink-ingredients-list

Norwegian ingredient label including taurine 0.4%: https://www.encon.no/red-bull-energidrikk-250-ml/5637146308.p

The local product image is from Red Bull's official Norwegian product page / Storyblok CDN. DrinkLab is an independent educational prototype, not affiliated with Red Bull. Google Fonts are optional remote resources; system fonts are used when offline.

No deployment, backend, accounts, telemetry or automated test suite is included. A production build checks TypeScript and bundling. Visual quality and physical iPhone performance need manual evaluation.

## GitHub Pages

The included Pages workflow builds this project under its repository subpath and writes static entry points for each drink and ingredient route. In repository Settings → Pages, select GitHub Actions. The workflow publishes on pushes to main.

Product images are manufacturer assets; no republication permission has been verified. The application does not grant a licence to these images or brand marks. Health guides are educational summaries and link to their sources.
