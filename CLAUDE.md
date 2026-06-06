# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**GT-SIRM (GnuTux Short Islamic Reels Maker)** — currently at v0.1.0 (pre-alpha scaffolding). The v0.2.0 milestone forks from `GT-SQRM-main/` (desktop) and `GT-SQR-main/` (web) — both siblings of this folder.

Until the fork happens in v0.2.0, the technical files in `GT-SIRM-DESKTOP/` and `GT-SIRM-WEB/` are **skeletons** showing the intended structure, NOT functional code.

## Project intent (non-negotiable)

This project is built for the sake of Allah, in service of Islam. Every contribution must align:
- Hadiths must include source + grading (صحيح/حسن/ضعيف)
- Scholar quotes must include attribution
- No features that would enable misuse against the project's intent
- The disclaimer (التبرّؤ) appears in README, LICENSE, About tab, and landing page — never remove or weaken it

## Repo layout

```
GT-SIRM/                          ← repo root (independent GitHub repo: SalehGNUTUX/GT-SIRM)
├── GT-SIRM-DESKTOP/              ← Electron app (Linux: AppImage/DEB/RPM)
│   ├── src/{main,preload,renderer}/
│   ├── scripts/build-all.sh
│   ├── package.json
│   ├── README.md                 ← desktop-specific
│   └── CHANGELOG.md              ← desktop-specific
├── GT-SIRM-WEB/                  ← PWA (vanilla JS, file:// compatible)
│   ├── index.html
│   ├── app.js
│   ├── manifest.json
│   ├── sw.js
│   ├── README.md                 ← web-specific
│   └── CHANGELOG.md              ← web-specific
├── README.md                     ← shared, main project intro + disclaimer
├── CHANGELOG.md                  ← shared, top-level milestones
├── LICENSE                       ← GPLv3 + disclaimer appendix
├── ROADMAP.md                    ← v0.1 → v1.0 plan, shared
├── CLAUDE.md                     ← (this file)
├── index.html                    ← landing page (deployed to GitHub Pages)
└── screenshot/                   ← shared screenshots for README/landing
```

The root `index.html` is the **landing page** served from GitHub Pages root. The PWA itself lives at `GT-SIRM-WEB/index.html` and is launched from the landing page via a button linking to `./GT-SIRM-WEB/`.

## Sibling projects (this folder lives next to them)

```
GT-SQRM/                          ← parent folder
├── GT-SQRM-main/                 ← the source of v0.2.0 fork (desktop)
├── GT-SQR-main/                  ← the source of v0.2.0 fork (web)
├── GT-SIRM/                      ← THIS project
└── CLAUDE.md                     ← parent dev guide (for GT-SQRM)
```

When forking in v0.2.0:
- `cp -r ../GT-SQRM-main/{src,scripts,GT-SQRM-icons,fonts,package.json} GT-SIRM-DESKTOP/` (rename icons)
- `cp -r ../GT-SQR-main/{*.js,*.json,index.html,fonts} GT-SIRM-WEB/` (rename icons)
- `sed -i 's/gt_sqrm_/gt_sirm_/g; s/gt_sqr_/gt_sirm_/g' **/*.js **/*.html`
- Update product name, icons, repo URLs in `package.json` and HTML files

## Critical naming difference vs. GT-SQRM

GT-SQRM uses two different `localStorage` prefixes (`gt_sqrm_` for desktop, `gt_sqr_` for web) because the projects sit in separate repos and need isolation when a user has both.

**GT-SIRM uses a single prefix `gt_sirm_` for BOTH versions** because:
- Single repo, single product identity
- The two folders are platform variants of the same app
- Web and desktop will not run on the same machine at the same time touching the same storage (the desktop runs Electron-isolated storage anyway)

## Module Manager architecture (v0.3.0 design)

GT-SIRM = GT-SQRM features + content module toggles. Each content section in HTML carries `data-module="..."`:

```html
<section data-module="quran" class="sec">...</section>
<section data-module="hadith" class="sec">...</section>
```

CSS gates visibility:
```css
[data-module]:not(.module-active) { display: none; }
```

Module Manager (`src/core/module-manager.js`) reads checkbox preferences from a Settings tab and toggles `.module-active` on matching elements. Modules: `quran`, `hadith`, `azkar`, `asma`, `duas`, `hikam`. The free-text editor (`free` mode) has no toggle — it's always available.

## What's inherited from GT-SQRM v3.0 (do not re-implement)

When forking, these come for free and should NOT be rewritten:
- Deterministic V2 export pipeline (ffmpeg for desktop, WebCodecs for web)
- 16 Arabic Quranic fonts (Amiri, Scheherazade, Lateef, Harmattan, Reem Kufi, Aref Ruqaa...)
- 10 verse-appearance animations + mixed mode
- 9 color modes, 9 wave shapes (with FFT precompute for export)
- Multi-bg playlist with crossfade (xfade in ffmpeg, manual blend in web)
- Per-clip audio (audioOn / audioVol per bgVidItem)
- Arabic search with tashkeel normalization (`normalizeArabic` + `normalizeWithMap`)
- Triple Linux packaging (AppImage + DEB + RPM with alien fallback)
- `build-all.sh` with cache corruption recovery (`runtime-x64`, `fpm` binaries)
- Service Worker + PWA + offline-first
- 30+ reciters, 8 translations (Quran module only)

All gotchas from `../CLAUDE.md` (the GT-SQRM parent guide) carry over. Re-read it before working on V2 export, Chromakey, or anything touching the render pipeline.

## New features in GT-SIRM (need fresh implementation)

| Feature | Notes |
|---|---|
| Module Manager + `data-module` | v0.3.0 |
| Free text editor (multi-line + timing) | v0.4.0 — replaces "verse picker" when Quran module disabled |
| Audio source decoupling | v0.5.0 — strip video audio, use separate audio file |
| Chromakey | v0.6.0 — WebGL shader + ffmpeg `colorkey`/`chromakey` filter |
| Hadith browser | v0.7.0 — Sunnah.com API or local JSON, grading badges |
| Azkar browser | v0.8.0 — import GT-HISNMUSLIM JSON |
| Asma ul-Husna / Duas / Hikam | v0.9.0 — static JSON + topic-categorized |
| Mic recording | v0.10.0 — `getUserMedia` + `MediaRecorder` |
| Arabic TTS | v0.10.0 — Edge TTS (cloud) vs Coqui (local) — undecided |

## Cross-version parity (mandatory)

Same diffs from GT-SQRM apply here:

```bash
# IDs in HTML
diff <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-WEB/index.html | sort -u)

# Functions in app.js
diff <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-DESKTOP/src/renderer/app.js | sort -u) \
     <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-WEB/app.js | sort -u)

# S.* state keys
diff <(grep -oE 'S\.[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-DESKTOP/src/renderer/app.js | sort -u) \
     <(grep -oE 'S\.[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-WEB/app.js | sort -u)
```

Expected desktop-only deltas (same as GT-SQRM): `batch*`, `dl*`, `yt*`, `export-codec/crf/preset/abr`, `ffmpeg-log`, `bgVidFile`, `_exportBgFrameImg`.

## Reference docs

- `README.md` — main project README with disclaimer (شاهد قبل أيّ كود)
- `ROADMAP.md` — v0.2 → v1.0 staged plan
- `GT-SIRM-DESKTOP/README.md` — desktop install + build
- `GT-SIRM-WEB/README.md` — web run + PWA install
- `../CLAUDE.md` — GT-SQRM parent guide (foundation we inherit from)
- `../ROADMAP.md` — GT-SQRM roadmap (what's done, what we inherit)

## Reminders

- **Never weaken the disclaimer** — it appears in 4 places by design
- **Test in both folders** — desktop and web changes go together
- **Add hadith grading** for any new hadith reference
- **Attribute every scholar quote** with source
