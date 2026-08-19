# Nisan — XMB Portfolio

A full-viewport portfolio built with SolidJS and Vite, styled after the PSP's XMB (Cross Media Bar) navigation — no hardware frame, just the interface.

## Run locally

```bash
npm install
npm run dev -- --port 5174 --strictPort
```

Open `http://localhost:5174/`.

## Build

```bash
npx tsc --noEmit
npm run build
npm run preview
```

## Deploy

Pushing to `main` triggers a GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) that SSHes into the production VPS and redeploys via [deploy.sh](deploy.sh).

## Content

All portfolio data lives in `src/data/`:

- `portfolio.ts` — identity, experience, skills, contact info
- `availability.ts` — scheduling windows
- `media.ts` — music player tracks
- `themes.ts` — theme/color registry

Experience entries use a structured `resume` object (`organization`, `period`, `location`, `highlights`) rather than one text blob. The résumé PDF is served from `public/resume.pdf`.

## Booking

The booking modal stays disconnected until a real booking URL is set:

```bash
VITE_BOOKING_URL="https://your-real-booking-page" npm run dev -- --port 5174 --strictPort
```

Without it, the modal clearly states the link isn't connected instead of failing silently.

## Themes

The Settings panel controls **Theme** (background animation) and **Color** (palette), each persisted independently in `localStorage`. Reduced-motion preferences render a still frame instead of animating.

### Adding a Shadertoy theme

Drop a Shadertoy Image-pass shader into `src/themes/shaders/*.frag` — Vite picks it up automatically and the filename becomes its menu label (`neon-grid.frag` → **Neon Grid**). The runtime supplies the standard uniforms (`iResolution`, `iTime`, `iMouse`, etc.) plus `iThemeColorA`/`iThemeColorB` for Color-reactive themes; Color availability is auto-detected, or forced with `// @xmb-color: enabled|locked`.

Multipass shaders follow the same base filename: `neon-grid.buffer-a.frag` through `-d.frag` are grouped automatically and exposed as `iChannel0`–`iChannel3`. See `ps2-menu2.frag` for a working example. External textures, cubemaps, video, and audio channels aren't wired up automatically.

## Projects

Projects live under Game → Project Library, each with `art`, `label`, `description`, `completed`, `body`, `meta`, and `actions` fields. Artwork lives in `public/projects/`.

## Icons and fonts

- Nav/UI icons: `public/psp/icons/` (PS3 icon pack subset in `ps3/`, provenance in `SOURCE.txt`)
- Fonts: `public/psp/fonts/` (M PLUS 1p, bundled locally as the New Rodin fallback)
- Icons without a faithful PS3 equivalent are generated via `python3 scripts/generate-portfolio-icons.py`

## Controls

- `Left` / `Right` — category
- `Up` / `Down` — item, project, availability window, theme color, or track
- `Enter` / `X` — open
- `Escape` / `Backspace` / `O` — back
- `Home` — return to Profile

Everything is also clickable/touchable.

## Acceptance test

With the site running on port 5174:

```bash
npm run visual:check
```

Evidence is written to `artifacts/xmb-game-acceptance/`.
