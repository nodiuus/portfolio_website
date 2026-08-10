# Nisan Full-Screen XMB Portfolio

A full-viewport SolidJS/Vite portfolio using PSP XMB navigation grammar, supplied icon assets, the animated blue wave environment, and the reference runtime's New Rodin-compatible typography stack. The decorative PSP hardware frame is intentionally omitted.

## Run locally

```bash
npm install
npm run dev -- --port 5174 --strictPort
```

Open `http://localhost:5174/`.

## Production build

```bash
npx tsc --noEmit
npm run build
npm run preview
```

## Portfolio content

All portfolio data is in:

- `src/data/portfolio.ts`
- `src/data/availability.ts`
- `src/data/media.ts`
- `src/data/themes.ts`

The portfolio is populated from Nisan's supplied software-engineering resume and public GitHub profile. Identity values at the top of the file control the display name, site handle, email, GitHub profile, and LinkedIn profile.

The deployable resume is stored at `public/resume.pdf` and linked from the Contact category.

Experience entries use a structured `resume` object with `organization`, `period`, `location`, and concise `highlights`. This keeps role details readable as a résumé instead of presenting one undifferentiated text block.

About uses a timeline-style profile sidebar. Education and Coursework use the verified Queens College record. Availability retains broad scheduling windows without claiming exact hours.

## Availability and booking

Availability exposes three selectable broad scheduling windows without inventing exact hours. The booking modal deliberately remains disconnected until Nisan's real booking URL is configured:

```bash
VITE_BOOKING_URL="https://your-real-booking-page" npm run dev -- --port 5174 --strictPort
```

When configured, **Continue to 20.com** opens the booking provider in a user-initiated popup. When it is absent, the action clearly reports that the link is not connected.

## Media and music

The media experience remains implemented but is currently hidden from the main XMB category bar. It can be restored later without rebuilding the player.

Localized cover art lives in `public/media/tracks/`.

## Theme settings

The top-right Settings icon opens a translucent XMB glass panel with two independent controls. **Theme** changes the runtime animation system between the Original waves and procedural Liquid Flow. **Color** chooses Ocean or January through December and recolors whichever animation is active as well as lightly tinting interface surfaces. Both choices persist independently in local storage, and reduced-motion preferences render a still frame instead of continuously animating.

### Adding a Shadertoy theme

Drop a Shadertoy Image-pass fragment shader into `src/themes/shaders/` with a `.frag` extension. The filename becomes its menu label (`neon-grid.frag` becomes **Neon Grid**), and Vite automatically adds it to the Theme picker—no TypeScript registry edit is needed.

Paste the shader's **Image** pass containing `mainImage(out vec4 fragColor, in vec2 fragCoord)`. The runtime supplies the standard `iResolution`, `iTime`, `iTimeDelta`, `iFrame`, `iMouse`, `iDate`, and `iSampleRate` uniforms. It also supplies `iThemeColorA` and `iThemeColorB`; use those `vec3` values when the shader should respond to the XMB Color setting. See `src/themes/shaders/liquid-flow.frag` for a working example.

Color availability is automatic. If none of a theme's Image or Buffer passes use `iThemeColorA` or `iThemeColorB`, its Color row is locked and keyboard navigation skips it. Add `// @xmb-color: enabled` or `// @xmb-color: locked` anywhere in the bundle to override detection.

Multipass shaders use matching filenames. For example, `neon-grid.frag` can be accompanied by `neon-grid.buffer-a.frag` through `neon-grid.buffer-d.frag`. The loader groups them automatically, renders each pass into ping-pong feedback textures, and exposes Buffer A–D as `iChannel0`–`iChannel3` to later buffers and the Image pass. `ps2-menu2.frag` plus its Buffer A/B files provide a working example.

External image textures, cubemaps, video, and audio channels are not assigned automatically and still need their assets adapted.

`ps2-menu.frag` is a self-contained adaptation of [Shadertoy `ldc3z4`](https://www.shadertoy.com/view/ldc3z4); `ps2-menu2.frag` exercises the multipass path using the supplied Buffer A and Buffer B source.

## Project library

Projects follow the PSP's nested Game behavior rather than using a free-floating image preview:

```text
Game
└── Project Library
    ├── Door Alert System
    ├── Nocturne
    ├── Code for All Events API
    └── NDIF
```

Open **Project Library** to reveal the project entries. Each entry supports:

- `art.src` and `art.alt`: PSP-style game artwork
- `label`: project title
- `description`: short project type
- `completed`: verified completion/addition date
- `body`, `meta`, and `actions`: technical detail and links

Project artwork lives in:

- `public/projects/door-alert.svg`
- `public/projects/nocturne.svg`
- `public/projects/events-api.svg`
- `public/projects/ndif.svg`

## Typography and XMB assets

The live reference runtime uses:

```css
"FOT-NewRodin Pro DB", "New Rodin", "M PLUS 1p", "Segoe UI", sans-serif
```

M PLUS 1p—the reference's available fallback—is bundled locally at weights 400, 500, and 700 under `public/psp/fonts/`. Inter is not used for the XMB interface.

- Parent-category, child-detail, system-navigation, and arrow icons: `public/psp/icons/`
- Extracted official PS3 icon subset and provenance: `public/psp/icons/ps3/`
- Locally bundled fonts: `public/psp/fonts/`

Custom PSP-style child icons include:

- custom and PS3 system icons for the grouped Skills entries
- `email.svg`, `github.svg`, and `pdf.svg` for Contact entries

All visible XMB navigation and detail icons are rendered through one flat white PS3 treatment. TypeScript, SolidJS, and Vite use bordered silhouettes with opacity-based internal separation, so their forms remain distinct after monochrome rendering. Brand geometry remains recognizable, but gradients and mixed metallic fills are removed from the live interface.

Academic and portfolio-specific icons without a truthful PS3 equivalent are generated from original editable geometry by:

```bash
python3 scripts/generate-portfolio-icons.py
```

Parent icons communicate the top-level portfolio category; child icons describe the specific detail beneath that category. Profile, Experience, Projects, Skills, Contact, Search, Settings, and user-account surfaces use transparent 128×128 assets extracted from the white PS3 Color Icon Pack linked in `SOURCE.txt`. Education and coursework remain custom flat white SVGs because the official pack has no truthful academic equivalent. The generated family avoids universal circular or rounded-tile backplates. Parent labels render at full width so names such as **Experience** never collapse to an ellipsis.

The main XMB bar contains the portfolio categories and **Media**. The fixed system navigation contains Search, Settings, Profile, and a 24-hour `HH:MM` clock on the right. It has no dropdown or quick-menu overlay.

The interface fills the complete browser viewport on desktop and mobile. It does not load or render PSP shell assets.

## Controls

- `Left` / `Right`: category
- `Up` / `Down`: category item, project game, availability window, theme color, or media track
- `Enter` or `X`: open folder, project, detail, booking prompt, or media player
- `Escape`, `Backspace`, or `O`: back one level
- `Home`: return to Profile
- Main XMB bar: `Media` opens music; Settings opens Theme Settings; Profile returns home
- Categories, folders, project entries, and detail actions are clickable/touchable

The nested back stack is:

```text
Project detail → Project Library → Projects category → Profile
```

## Acceptance test

Start the site on port 5174, then run:

```bash
npm run visual:check
```

Evidence is written to `artifacts/xmb-game-acceptance/`.
