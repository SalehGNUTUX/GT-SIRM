# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status (2026-06-06)

**GT-SIRM (GnuTux Short Islamic Reels Maker)** — at v0.3.0. The codebase is **real, not skeleton** — forked from GT-SQRM v3.0 (desktop) and GT-SQR v3.0 (web), rebranded, and extended with the Module Manager.

Repository: https://github.com/SalehGNUTUX/GT-SIRM — published as v0.2.0 (commit `a4e8619`). **v0.3.0 is local-only; not yet pushed**.

## Project intent (non-negotiable)

Built for the sake of Allah, in service of Islam. Every contribution must align:
- Hadiths must include source + grading (صحيح/حسن/ضعيف)
- Scholar quotes must include attribution
- The disclaimer (التبرّؤ) appears in README, LICENSE, About tab, and landing page — never remove or weaken it

## Terminology rules (enforced — replaces casual writing)

These are **search-and-replace rules** the maintainer enforces. Re-introducing any of the left-hand forms is a regression.

| Wrong | Right | Reason |
|---|---|---|
| `موسيقى` (or any form) | `مؤثرات صوتية` (effect) / `أصوات خلفية` (background) | Religious sensitivity |
| `موسيقي` / `موسيقيّ` (adjective) | `صوتي` / `صوتيّ` | Same |
| `الأسماء الحسنى` | `أسماء الله الحسنى` | Full canonical Islamic term |
| `أسماء حسنى` | `أسماء الله الحسنى` | Same |
| `gt_sqrm_` / `gt_sqr_` (in this repo) | `gt_sirm_` | Single unified prefix |
| `window.SQRM` | `window.SIRM` | Renamed IPC namespace |

Verify with:
```bash
grep -rn "موسيق\|الأسماء الحسنى\|أسماء حسنى\|gt_sqrm_\|gt_sqr_\|SQRM" . \
  --include="*.md" --include="*.html" --include="*.js" --include="*.json" \
  | grep -v node_modules
# should be empty (except 3 intentional refs in README/CHANGELOG to GT-SQRM as the parent project, and `[[ -d GT-SQRM-icons ]]` etc — verify case-by-case)
```

## Repo layout

```
GT-SIRM/                          ← GitHub repo: SalehGNUTUX/GT-SIRM
├── GT-SIRM-DESKTOP/              ← Electron app (Linux: AppImage/DEB/RPM)
│   ├── src/{main,preload,renderer}/   ← real code, forked from GT-SQRM v3.0
│   ├── scripts/build-all.sh           ← cache-aware build wrapper
│   ├── package.json                   ← v0.2.0, electron-builder configured
│   ├── GT-SIRM-icons/                 ← 14 sizes generated from icon-original.png
│   └── fonts/                         ← 16 Arabic Quranic fonts
├── GT-SIRM-WEB/                  ← PWA + APK target (Capacitor)
│   ├── index.html, app.js             ← forked from GT-SQR v3.0
│   ├── export-engine-web.js           ← WebCodecs deterministic encoder
│   ├── mp4-muxer.js, webm-muxer.js    ← classic IIFE (file:// compatible)
│   ├── fonts-data.js                  ← inlined fonts for file://
│   ├── manifest.json, sw.js           ← PWA
│   ├── capacitor.config.json          ← Android APK target
│   ├── package.json                   ← Capacitor scripts
│   ├── scripts/build-apk.sh           ← Android build wrapper
│   └── fonts/, GT-SIRM-icons/         ← same as desktop
├── README.md, ROADMAP.md, CHANGELOG.md, LICENSE, CLAUDE.md
├── index.html                    ← landing page (GitHub Pages root)
├── favicon.ico
└── GT-SIRM-ICON.png, GT-SIRM-ICON-GB.png  ← brand assets
```

## Sibling projects (this folder lives next to them)

```
GT-SQRM/                          ← parent folder, separate git repo
├── GT-SQRM-main/                 ← THE source of fork (GT-SIRM-DESKTOP came from here)
├── GT-SQR-main/                  ← THE source of fork (GT-SIRM-WEB came from here)
└── GT-SIRM/                      ← THIS project (own git repo)
```

When the user references "the parent project" or "what GT-SQRM does", they mean `../GT-SQRM-main/` (desktop) or `../GT-SQR-main/` (web) — these are mature, battle-tested, and the architectural reference. The `../CLAUDE.md` (parent guide) documents their gotchas, which **all carry over** to GT-SIRM.

## Module Manager (v0.3.0) — the new architectural pillar

GT-SIRM's defining feature vs. GT-SQRM: **content modules are toggleable** via the Settings tab. The pattern:

### 1. Tag the HTML
Every Quran-specific section (and the التلاوة tab button) carries `data-module="quran"`. There are **7 tagged elements** in each version's HTML — keep them in sync. Future modules will use `data-module="hadith"`, `"azkar"`, `"asma"`, `"duas"`, `"hikam"`.

### 2. CSS rule
```css
[data-module]:not(.module-active) { display: none !important }
```
By default, tagged elements are hidden. The Module Manager adds `.module-active` to those whose module is enabled.

### 3. JavaScript (`initModuleManager` in `app.js`)
- Reads `localStorage[gt_sirm_modules_v1]` (per-module on/off map)
- Applies `.module-active` to all `[data-module]` elements
- Wires checkboxes `id="mod-{key}"` in Settings tab
- Auto-switches away from التلاوة tab if Quran disabled
- Module registry `MODULES = { quran, hadith, azkar, asma, duas, hikam }` with `default` + `impl` flags

### 4. Call order
```js
initEventListeners();    // first — register listeners
initModuleManager();     // second — must come before restoreAllSettings
restoreAllSettings();    // third — fires change events into now-registered handlers
```

The disabled toggles in HTML (`disabled` attribute) for `hadith`/`azkar`/`asma`/`duas`/`hikam` are forward-compatible placeholders — `MODULES[key].impl === false` keeps them frozen until those modules ship.

## What's inherited from GT-SQRM v3.0

Do NOT re-implement these. They come for free from the fork and are mature:

- Deterministic V2 export pipeline (ffmpeg for desktop, WebCodecs for web)
- 16 Arabic Quranic fonts (Amiri, Scheherazade, Lateef, Harmattan, Reem Kufi, Aref Ruqaa...)
- 10 verse-appearance animations + mixed mode
- 9 color modes, 9 wave shapes (with FFT precompute for export)
- Multi-bg playlist with crossfade (xfade in ffmpeg, manual blend in web)
- Per-clip audio
- Arabic search with tashkeel normalization
- Triple Linux packaging (AppImage + DEB + RPM with alien fallback)
- `build-all.sh` with cache corruption recovery
- Service Worker + PWA + offline-first
- 30+ reciters, 8 translations (Quran module only)

All gotchas from `../CLAUDE.md` (the parent GT-SQRM guide) apply here verbatim. Re-read it before touching V2 export, the render pipeline, or the Quran module internals.

## What's new in GT-SIRM (own implementation)

| Feature | Status | Notes |
|---|---|---|
| Module Manager + `data-module` | ✅ v0.3.0 done | 7 tagged elements per version |
| Free text editor | ⏳ v0.4.0 next | Multi-line + per-slice timing; shown when Quran disabled |
| Audio source decoupling | ⏳ v0.5.0 | Strip video audio, use separate audio file |
| Chromakey | ⏳ v0.6.0 | WebGL shader + ffmpeg `colorkey` filter |
| Hadith browser | ⏳ v0.7.0 | Sunnah.com API or local JSON, grading badges |
| Azkar browser | ⏳ v0.8.0 | Import GT-HISNMUSLIM JSON |
| Asma' Allah al-Husna / Duas / Hikam | ⏳ v0.9.0 | Static JSON + topic-categorized |
| Mic recording + Arabic TTS | ⏳ v0.10.0 | `getUserMedia` + Edge TTS / Coqui (undecided) |

## Critical localStorage key

**`gt_sirm_modules_v1`** — JSON map of module on/off states. Schema:
```json
{ "quran": true, "hadith": true, "azkar": true, "asma": true, "duas": true, "hikam": true }
```
Missing keys fall back to `MODULES[key].default` (all `true` currently).

All other keys follow the parent project's schema with the prefix changed: `gt_sirm_settings_v2`, `gt_sirm_quran_idx_v1`, `gt_sirm_logo_v1`, `gt_sirm_tpls`, `gt_sirm_reciters_v2`, `gt_sirm_lastExportDir`.

## Commands

### Desktop (`GT-SIRM-DESKTOP/`)
```bash
npm install                         # electron + electron-builder
NODE_ENV=development npm run dev    # or: ./node_modules/.bin/electron .
npm start                           # production-style run
npm run build                       # AppImage only (via build-all.sh)
npm run build:deb / build:rpm       # individual targets
npm run build:all                   # AppImage + DEB + RPM
npm run build:clean                 # purge dist/ and corrupted electron-builder caches
```

### Web (`GT-SIRM-WEB/`)
```bash
# Web (no build step — vanilla JS classic scripts)
python3 -m http.server 8080         # then http://localhost:8080
# Also works under file:// (Service Worker + PWA install gracefully degrade)

# APK via Capacitor (needs Android SDK + Java JDK 17+)
npm install                         # Capacitor CLI
./scripts/build-apk.sh debug        # debug APK
./scripts/build-apk.sh release      # signed release APK (needs keystore/)
./scripts/build-apk.sh bundle       # AAB for Google Play
./scripts/build-apk.sh clean        # remove android/ and node_modules/
```

### No tests, no linter
Verify changes via `node --check <file>.js` for syntax, then run the app and check the DevTools console for errors. The maintainer tests visually.

## Cross-version parity (mandatory — same as parent)

```bash
# Tag counts must match
diff <(grep -oE 'data-module="[a-z]+"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'data-module="[a-z]+"' GT-SIRM-WEB/index.html | sort -u)

# Module checkbox IDs
diff <(grep -oE 'id="mod-[a-z]+"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'id="mod-[a-z]+"' GT-SIRM-WEB/index.html | sort -u)
# both should output 6 IDs (quran, hadith, azkar, asma, duas, hikam)

# Standard diffs from parent
diff <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-WEB/index.html | sort -u)
diff <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-DESKTOP/src/renderer/app.js | sort -u) \
     <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-WEB/app.js | sort -u)
```

Expected desktop-only deltas: `batch*`, `dl*`, `yt*`, `export-codec/crf/preset/abr`, `ffmpeg-log`, `bgVidFile`, `_exportBgFrameImg` — same as parent. Anything else is drift.

## Known issues / pending decisions (pre-v1.0)

These are tracked in detail in the `project-gt-sirm-state-v03` memory note. Brief summary:

### Batch export tab — decision pending
Inherited from GT-SQRM. Two options:
- **(a)** Remove `#tab-batch` entirely (the simplest — keeps GT-SIRM focused)
- **(b)** Treat batch as a module: add `data-module="batch"` to the tab button and section, add `mod-batch` toggle in Settings (default ON for backward-compat) — **recommended**

Decide before v0.4.0 work begins.

### App icon doesn't show in Linux taskbar (dev mode only)
Already attempted: `app.setName("GT-SIRM")` + `commandLine.appendSwitch("class", ...)` + `nativeImage.createFromPath()` + `mainWindow.setIcon()`. Linux WMs typically read the icon from the installed `.desktop` file, not from `BrowserWindow.icon`. **Expected to resolve automatically** once `electron-builder` generates the `.desktop` file in AppImage/DEB/RPM. Verify by building AppImage and running it before v1.0.

## Commit conventions

The maintainer wants commits attributed to **`SalehGNUTUX` only** — **no `Co-Authored-By: Claude` line**. The initial commit (`a4e8619`) follows this. Continue the pattern: when committing, do NOT add Claude attribution to the message.

## Reference docs

- `README.md` — disclaimer, install, intro — read before any code change
- `ROADMAP.md` — v0.2 → v1.0 staged plan
- `CHANGELOG.md` — release-by-release log
- `GT-SIRM-DESKTOP/README.md` / `CHANGELOG.md` — desktop-specific
- `GT-SIRM-WEB/README.md` / `CHANGELOG.md` — web-specific
- `../CLAUDE.md` — parent GT-SQRM guide (foundation we inherit from — all gotchas apply)
- `../ROADMAP.md` — parent GT-SQRM roadmap (what's done in the foundation)

## Memory entries to read

- `project-gt-sirm-plan` — overall plan and architectural decisions
- `project-gt-sirm-state-v03` — current state, pending TODOs, restart point
- `project-gt-sirm-disclaimer` — the three Arabic disclaimer variants and where they go
- `feedback-gt-sirm-terminology` — the terminology rules above (canonical source)
- `project-gt-sqrm-v2` — the parent project context
