# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state (2026-06-10)

**GT-SIRM (GnuTux Short Islamic Reels Maker)** — at **v0.12.12** (UI fully collapsible + KDE/GNOME native file dialogs). Twin-version Electron+PWA Islamic reels maker forked from GT-SQRM/GT-SQR v3.0.

### Current state
- آخر commit: `441ffa9` — fix(tab-rec) لتَداخُل قسم التوقيت التَفصيلي
- آخر إصدار منشور: **v0.12.12 Beta** على GitHub (AppImage + DEB + RPM + APK)
- جميع الوحدات الستّ مُكتمَلة: قرآن + 90 حديثاً + 267 ذكراً + 100 اسماً + 32 دعاءً + 32 حكمة
- v0.13 (ميكروفون + TTS) هي الخُطوة الموالية المُقترحة

### Latest versions
| Repo | Version | Latest commit |
|---|---|---|
| **GT-SIRM** | 0.12.12 | `441ffa9` |
| **GT-SQRM** | 3.3.6 | `643996b` |
| **GT-SQR** | 3.3.6 | `c5908ed` |

### Sibling repos workflow (kept in sync for portable features)
GT-SIRM features that are portable (chromakey, vtitle, project save, recvid, restart-all-btn) get backported to GT-SQRM/GT-SQR. Features tied to GT-SIRM's architecture (Module Manager, free text, per-slice timing, timing master toggle, content modules, work dir, collapsible UI) are NOT ported.

- `GT-SIRM/`: real git repo with origin remote → use `git push` directly.
- `GT-SQRM-main/`, `GT-SQR-main/`: NOT git repos locally (zip extracts).
  - To work on them: `git clone --depth 2 https://github.com/SalehGNUTUX/{GT-SQRM,GT-SQR}.git /tmp/{port-name}` → edit → commit + push → `rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='package-lock.json' /tmp/{port-name}/ "../{GT-SQRM,GT-SQR}-main/"` to update local for testing.

## Repo layout

```
GT-SIRM/                          ← GitHub repo: SalehGNUTUX/GT-SIRM
├── GT-SIRM-DESKTOP/              ← Electron app (Linux: AppImage/DEB/RPM)
│   ├── src/{main,preload,renderer}/   ← real code, forked from GT-SQRM v3.0
│   ├── scripts/build-all.sh           ← cache-aware build wrapper
│   ├── package.json                   ← v0.12.12
│   └── GT-SIRM-icons/, fonts/
├── GT-SIRM-WEB/                  ← PWA + APK target (Capacitor)
│   ├── app.js, index.html             ← forked from GT-SQR v3.0
│   ├── export-engine-web.js           ← WebCodecs deterministic encoder
│   ├── mp4-muxer.js, webm-muxer.js    ← classic IIFE (file:// compatible)
│   ├── fonts-data.js                  ← inlined fonts for file://
│   ├── sw.js, manifest.json           ← PWA (CACHE_VER bump every release)
│   ├── scripts/build-apk.sh           ← Capacitor APK builder
│   └── capacitor.config.json
├── README.md, ROADMAP.md, CHANGELOG.md, LICENSE
├── index.html                    ← landing page (GitHub Pages root)
└── GT-SIRM-ICON.png, GT-SIRM-ICON-GB.png
```

## Project intent (non-negotiable)

Built for the sake of Allah, in service of Islam. Every contribution must align:
- Hadiths must include source + grading (صحيح/حسن/ضعيف)
- Scholar quotes must include attribution
- The disclaimer (التبرّؤ) appears in README, LICENSE, About tab, and landing page — never remove or weaken it

## Terminology rules (enforced — replaces casual writing)

| Wrong | Right | Reason |
|---|---|---|
| `موسيقى` (any form) | `مؤثرات صوتية` / `أصوات خلفية` | Religious sensitivity |
| `موسيقي` / `موسيقيّ` | `صوتي` / `صوتيّ` | Same |
| `الأسماء الحسنى` | `أسماء الله الحسنى` | Full canonical Islamic term |
| `gt_sqrm_` / `gt_sqr_` (in GT-SIRM) | `gt_sirm_` | Single unified prefix |
| `window.SQRM` | `window.SIRM` | Renamed IPC namespace |

Verify with:
```bash
grep -rn "موسيق\|الأسماء الحسنى\|أسماء حسنى\|gt_sqrm_\|gt_sqr_\|SQRM" . \
  --include="*.md" --include="*.html" --include="*.js" --include="*.json" \
  | grep -v node_modules
```

## Major features (v0.4 → v0.12)

### Module Manager (v0.3+)
- `data-module="quran"` tags content-specific sections.
- CSS: `[data-module]:not(.module-active) { display: none !important }`.
- `initModuleManager` reads `localStorage[gt_sirm_modules_v1]`, applies `.module-active`.
- Call order: `initEventListeners()` → `initModuleManager()` → `restoreAllSettings()`.

### Content modules (six complete, MODULES.X.impl=true)
| Module | Version | Count | Source |
|---|---|---|---|
| 📖 Quran | v0.2 | 6236 verses | api.alquran.cloud |
| 📜 Hadith | v0.8 | 90 hadiths | Arba'in Nawawi + Riyad as-Salihin |
| 🕊️ Azkar | v0.9 | 267 across 132 categories | GT-HISNMUSLIM (author permission) |
| ✨ Asma | v0.10 | 100 names | Tirmidhi + ibn al-Qayyim |
| 🤲 Duas | v0.10 | 32 in 5 categories | Quran + Sahihayn |
| 🌟 Hikam | v0.10 | 32 in 4 categories | Salaf with isnad per quote |

### Free text editor + per-slice timing (v0.4 → v0.8.6)
- `applyFreeText`: parses textarea → `S.verses` with `free: true, audio: null`.
- `S.useFreeAsSource = true` switches the playback pipeline.
- Per-slice timing in standalone section, source-agnostic (works with hadith/azkar/etc.).
- `openPerSliceSmart()` — unified handler clears `S.freePerSlice` before rebuild.
- `calcEffectiveSliceDuration` uses `getActiveAudioDuration()` (recvid → trim → bgAudio priority).

### Recitation video (recvid, v0.7)
- Pre-rendered Islamic recitation video. Audio routes through `S.exportDest`.
- Bg color removal via `removeBgColorFromRegion` (YCbCr + luminance for grayscale).
- V2 export uses `seekVideoToTime(S.recVidEl, t)` before each `drawFrame(t)`.

### Project save/load (v0.5.7+, `.gtsirm` format)
- JSON with embedded assets (base64 dataURL ≤50MB).
- Auto-save (toggle + interval) in Settings tab.
- Custom close confirmation modal (Electron beforeunload doesn't support custom dialogs).

### Work folder (v0.12.0+, desktop only)
- Default path: `~/Documents/مجلد عمل ريلز إسلامية/`
- Subfolders by media type: projects/bg-videos/bg-audio/recitations/custom-audio/logos/exports/recordings
- yt-dlp downloads route to correct subfolder via `workdirSubfolderKey` IPC arg.
- File upload interceptor (`installWorkdirInputInterceptor`) replaces native file picker with native KDE/GNOME dialog opened in correct subfolder.

### Audio FX (v0.11)
- Reverb (5 presets) + Echo + 3-band EQ on bgAudio and recvid.
- Synthetic impulse response generation, `OfflineAudioContext` preprocessing in V2 export.
- Default OFF, controls hidden until enabled.

### Collapsible UI (v0.12.12 — current)
- Every `<div class="sec">` → `<details class="sec">`, every `<div class="sec-t">` → `<summary class="sec-t">`.
- First section in each tab has `open` attribute (default-visible).
- 57 sections desktop / 46 sections web, all flat (no nested `.sec` inside `.sec`).
- CSS for collapsible markers at lines ~110 (desktop) / ~90 (web):
  ```css
  details.sec > summary.sec-t{cursor:pointer;list-style:none;user-select:none}
  details.sec > summary.sec-t::after{content:"▸";opacity:.5;margin-inline-start:auto}
  details.sec[open] > summary.sec-t::after{content:"▾"}
  ```

## Commands

### Desktop (`GT-SIRM-DESKTOP/`)
```bash
npm install                         # electron + electron-builder
NODE_ENV=development npm run dev    # devtools open
npm start                           # production-style run
npm run build                       # AppImage only (via build-all.sh)
npm run build:deb / build:rpm       # individual targets
npm run build:all                   # AppImage + DEB + RPM
npm run build:clean                 # purge dist/ and corrupted electron-builder caches
```

**Before running `build-all.sh all`**: delete OLD versioned files in `dist/` first, or the alien RPM fallback may pick up a stale DEB and produce a wrong-version RPM:
```bash
rm -f dist/gt-sirm-{OLDVER}-*.rpm dist/gt-sirm_{OLDVER}_*.deb dist/GT-SIRM-{OLDVER}.AppImage
```

### Web (`GT-SIRM-WEB/`)
```bash
python3 -m http.server 8080         # then http://localhost:8080
# Also works under file:// (Service Worker + PWA install gracefully degrade)

# APK via Capacitor (needs Android SDK + Java JDK 17+)
npm install
./scripts/build-apk.sh debug
./scripts/build-apk.sh release
./scripts/build-apk.sh bundle
./scripts/build-apk.sh clean
```

### Cross-version parity check (before commit)

```bash
# tags counts must match
diff <(grep -oE 'data-module="[a-z]+"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'data-module="[a-z]+"' GT-SIRM-WEB/index.html | sort -u)

diff <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-WEB/index.html | sort -u)

diff <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-DESKTOP/src/renderer/app.js | sort -u) \
     <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-WEB/app.js | sort -u)
```

Expected desktop-only deltas: `batch*`, `dl*`, `yt*`, `export-codec/crf/preset/abr`, `ffmpeg-log`, `bgVidFile`, `_exportBgFrameImg`, `workdir*`, plus IPC-wrapping functions.

### HTML structure check (mandatory after `<details>` edits)
```bash
python3 -c "
import re
for p in ['GT-SIRM-DESKTOP/src/renderer/index.html', 'GT-SIRM-WEB/index.html']:
    with open(p) as f: c = f.read()
    o = len(re.findall(r'<div\b', c)); cl = len(re.findall(r'</div>', c))
    od = len(re.findall(r'<details\b', c)); cd = len(re.findall(r'</details>', c))
    so = len(re.findall(r'<summary\b', c)); sc = len(re.findall(r'</summary>', c))
    print(f'{p}: div={o}/{cl} details={od}/{cd} summary={so}/{sc}')
"
# All three must balance.
```

Also check `.sec` nesting per tab — only 1 expected:
```python
# Use the script at: see "Section nesting check" gotcha below.
```

### No tests, no linter
Verify changes via `node --check <file>.js` for syntax + manual smoke-test.

## Releases workflow

```bash
# 1. Clean old version artifacts first (alien RPM fallback bug)
cd GT-SIRM-DESKTOP
rm -f dist/gt-sirm-{OLDVER}-*.rpm dist/gt-sirm_{OLDVER}_*.deb dist/GT-SIRM-{OLDVER}.AppImage

# 2. Build desktop + APK in parallel (run as background tasks)
chmod +x scripts/build-all.sh
bash scripts/build-all.sh all 2>&1 | tee /tmp/build-vX.log
# In parallel:
cd ../GT-SIRM-WEB && chmod +x scripts/build-apk.sh && bash scripts/build-apk.sh debug

# 3. Verify RPM is correct version (alien sometimes picks stale DEB)
ls -lah dist/*.rpm  # must match current version
# If wrong, clean and re-run RPM only: bash scripts/build-all.sh rpm

# 4. Rename APK to versioned filename
cd ../GT-SIRM-WEB/dist-apk
cp GT-SIRM-debug.apk GT-SIRM-{VER}-debug.apk

# 5. Tag + push
cd ../..
git -c user.name="SalehGNUTUX" -c user.email="gnutux.arabic@gmail.com" \
  tag -a v{VER} -m "v{VER} — <short>"
git push origin v{VER}

# 6. GitHub release (--prerelease for Beta)
gh release create v{VER} --title "..." --prerelease \
  --notes-file /tmp/release-vX.md \
  "GT-SIRM-DESKTOP/dist/GT-SIRM-{VER}.AppImage" \
  "GT-SIRM-DESKTOP/dist/gt-sirm_{VER}_amd64.deb" \
  "GT-SIRM-DESKTOP/dist/gt-sirm-{VER}-2.x86_64.rpm" \
  "GT-SIRM-WEB/dist-apk/GT-SIRM-{VER}-debug.apk"
```

## Critical localStorage keys

- `gt_sirm_modules_v1` — module on/off map
- `gt_sirm_settings_v2`, `gt_sirm_quran_idx_v1`, `gt_sirm_logo_v1`, `gt_sirm_tpls`, `gt_sirm_reciters_v2`
- `gt_sirm_autosave_on`, `gt_sirm_autosave_interval`, `gt_sirm_autosave_blob` (web), `gt_sirm_last_project` (desktop)
- `gt_sirm_free_auto_sync`, `gt_sirm_free_per_slice`, `gt_sirm_free_per_slice_lock`, `gt_sirm_timing_master_on`
- `gt_sirm_workdir_import_prompt` (desktop)

## Gotchas

### Linux Electron+GTK ignores `defaultPath` in `dialog.showOpenDialog`
Confirmed bug on both KDE/Plasma and GNOME: passing `defaultPath` as a directory does NOT navigate the file picker there — GTK falls back to the last-used folder. **Solution (v0.12.11)**: bypass Electron dialog on Linux entirely and spawn `kdialog` (KDE) or `zenity` (GNOME) directly. Both respect their `--filename` / positional path argument.

Implementation in `main.js` `dialog-open` IPC:
- Detect both binaries at startup (`detectNativeDialog`).
- KDE session (`XDG_CURRENT_DESKTOP` / `KDE_FULL_SESSION` / `DESKTOP_SESSION=plasma`) → try kdialog first.
- Otherwise → try zenity first.
- Sentinel `_DLG_UNAVAILABLE` distinguishes "tool failed to spawn" from "user cancelled". Cancellation MUST short-circuit without falling back to the next tool — otherwise user sees multiple dialogs in sequence.
- Electron `showOpenDialog` is only used if NO native helper exists.

For save dialogs (`dialog-save`), Electron's `showSaveDialog` works because the path includes a filename, which GTK uses correctly.

### File input interceptor (v0.12.11)
The interceptor replaces the native browser file picker with native KDE/GNOME dialog opened in the correct workdir subfolder. Triggered via `installWorkdirInputInterceptor` after 500ms boot delay.

- Listener on BOTH `input` and `.fu-area` parent (capture phase, `stopImmediatePropagation`).
- `input.style.pointerEvents = "none"` prevents Chromium from opening native picker.
- `_workdirInstalled` flag prevents double-attachment.
- `_bypassWorkdir` flag for the fallback path when workdir lookup fails.
- Map at `FILE_INPUT_WORKDIR_MAP` defines input id → subfolder key + filters.

### Collapsible sections: pre-existing HTML imbalance in tab-rec
The original HTML had a missing `</div>` for the per-slice timing section. When sections were `<div>`, this was invisible visually (all `.sec` divs had `margin-bottom:13px` so they appeared as siblings). **After conversion to `<details>`, the broken nesting became functional** — collapsing per-slice timing collapsed recvid and Quran timing with it.

**Fix applied (v0.12.12)**: added `</details>` after `free-per-slice-stats` div, removed redundant closing `</details>` before `<!-- SCENE -->`.

**Lesson**: after any structural HTML conversion, run a nesting check on `.sec` sections per tab:
```python
import re
with open('GT-SIRM-DESKTOP/src/renderer/index.html') as f: text = f.read()
tabs = re.finditer(r'<div\s+class="tp(?:\s+on)?"\s+id="(tab-[\w-]+)"', text)
for tm in tabs:
    # extract body, count <details class="sec"> depth — must be 1
    ...
```
A nesting depth > 1 means a `.sec` is wrongly inside another `.sec`.

### Regex `\b` after "sec" matches "sec-t"
When converting `<div class="sec">` to `<details>`, regex `class="sec\b[^"]*"` ALSO matches `class="sec-t"` because `\b` is a word boundary at `-`. **Use negative lookahead**: `class="sec(?!-)[^"]*"`. Otherwise sec-t divs get incorrectly converted to `<details>` too.

### Never move large HTML sections with regex (v0.8.7 lesson)
Use Read + Edit with exact strings, or two-step approach (delete original + insert new). Regex-based bulk surgery on nested HTML loses brace tracking.

### Verify HTML balance after every structural edit
```bash
python3 -c "
import re
for p in ['GT-SIRM-DESKTOP/src/renderer/index.html', 'GT-SIRM-WEB/index.html']:
    with open(p) as f: c = f.read()
    o = len(re.findall(r'<div\b', c)); cl = len(re.findall(r'</div>', c))
    print(f'{p}: {o}/{cl} diff={o-cl}')
"
# Both diffs MUST be 0.
```

### V2 export and HTMLVideoElement (recvid)
V2 deterministic export iterates frames at fixed timestamps. HTMLVideoElement frames don't advance with `setStateForTime` — need explicit `currentTime = t` + wait for `seeked` event with `seekVideoToTime(S.recVidEl, t)` (800ms timeout).

### Beforeunload + file uploads
`window.addEventListener("beforeunload", ...)` only fires if `S.projectDirty=true`. The dirty-tracker hooks DOM inputs but skips `type=file`. Call `markProjectDirty()` explicitly in `onBgMedia`, `onBgAudio`, `addBgVidItem`, `onRecVidFile`.

### Custom close dialog (Electron)
`beforeunload` in Electron renderer cannot show custom dialogs. Pattern:
1. `main.js` listens to `mainWindow.on("close", e => { if (!_allowClose) e.preventDefault(); send IPC })`
2. Renderer shows 3-option modal, on confirm sends IPC `confirm-close`
3. Main sets `_allowClose = true` and calls `mainWindow.close()`

### YCbCr distance can't distinguish black from white
Both pure black `(0,0,0)` and pure white `(255,255,255)` have Cb=128, Cr=128. So plain YCbCr chromakey fails for grayscale keys. Solution: detect saturation `(max-min)<25` → use luminance-mode (max for dark, min for light) instead of YCbCr.

### Asset serialization needs S.bgImgFile / S.bgAudioFile / S.recVidFile
Original `onBgMedia` only set `S.bgImg = img` (an Image), discarding the File. To make project save work, file handlers MUST store the original `File` on S:
```js
S.bgImgFile = file;   // in onBgMedia
S.bgAudioFile = file; // in onBgAudio
S.recVidFile = file;  // in onRecVidFile
```

### onRecVidFile sets S.verses
When recvid loads, `S.verses = [{recvid: true, free: true, manualDuration: video.duration}]`. If user later toggles recvid OFF, must call `onSurahChange()` to reload Quran verses.

### Web refresh = browser-native dialog only
Browser security prevents custom dialogs in `beforeunload`. The 3-button modal works only in Electron. On web, just `e.preventDefault(); e.returnValue = "..."` for the default browser warning.

### autoFitCanvasToVideo is REJECTED
Attempted in v0.7.4 (and ported to v3.3.3) to auto-size canvas to recvid dimensions. **Broke everything**: distorted preview, distorted export, fast bg video, no waveform, no audio. Do not reintroduce.

### Audio overlap when loading saved project + uploading new recvid
Fix (v0.7.5/v3.3.6): in `startPlayer`, pause bgAudioEl when recvid-on; in V2 export's bgBuffer setup, when recvid is active read `S.recVidFile.arrayBuffer()` and decode as bgBuffer (replacing bgAudio entirely).

### `S.freePerSlice` reuse trap (v0.8.6)
The per-slice section reads from `S.freePerSlice` when rendering. If user applies Hadith → Free Text → clicks 🎚️, the OLD hadith slices would render. `openPerSliceSmart()` does `S.freePerSlice = null` BEFORE calling `buildPerSliceList()`, forcing it to re-derive from `S.verses`. Any new "open per-slice" entry point must follow this clear-then-rebuild pattern.

### Audio duration: priority of sources (v0.8.5)
`getActiveAudioDuration()` checks in strict priority: **recvid → trim → bgAudio**. Insert new audio sources here AND update `syncVersesToActiveAudio` to use it. Do NOT bypass `calcEffectiveSliceDuration` in any new `applyX()` function.

### RPM build picks stale DEB (alien fallback)
The `build-all.sh` alien fallback shells out to `alien -r -g <newest-deb>`. If an older versioned DEB is in `dist/`, alien may pick the wrong one. **Always delete old version artifacts before building.**

### Inherited gotchas from GT-SQRM
All gotchas in `../CLAUDE.md` apply: surah name prefix handling, CSP blocks `fetch("blob:")`, fonts must `FontFace.load()`, ffmpeg progress IPC throttling, render loop must yield during V2 export, web AAC codec fallback chain, web works under file://, electron-builder cache corruption.

### Adding a new content module (v0.10 pattern, 9 steps)
1. **Data file** `X-data.js` (classic script): `window.X_DATA = { categories: [{id, name, icon, items: [{n, text, source, ...}]}] }`.
2. **`<script src="X-data.js">`** in `index.html` after `hadith-data.js` (both versions).
3. **HTML section** `<details class="sec" data-module="X">` in `tab-rec` after azkar, with the standard layout (category select + search + select size=6 + preview + apply button + per-slice button).
4. **Settings toggle** `<input id="mod-X">` in module manager section + entry in `MODULES` with `impl: true`.
5. **JS functions**: `initXModule()` populates UI + listeners. `applyX(item, cat)` calls `clearOtherSourcesUI()` → `splitArabicTextSmart` → `calcEffectiveSliceDuration` → fills `S.verses` + `S.freePerSlice`. Timing button wired to `openPerSliceSmart`.
6. **Call `initXModule()`** in `DOMContentLoaded` sequence after `initAzkarModule()`.
7. **Service Worker** adds `./X-data.js` to `OPTIONAL` array + cache version bump.
8. **`build-apk.sh`** copies `X-data.js` to `www/`.
9. **Docs**: README + ROADMAP + CHANGELOG.

### Module mutual exclusion (v0.8.14 + v0.10.0)
`MODULES` with `enforceSingleModuleActive(state)` ensures only one content module active. At the start of every `applyX` function, call `clearOtherSourcesUI()` — hides other modules' previews/buttons so no stale visuals.

Free text (`free-text-on`) is NOT a module in MODULES since v0.8.16 — it's a permanent tool. But it's auto-disabled when applying a content module (inside `clearOtherSourcesUI`).

## Commit conventions

**`SalehGNUTUX` only** — **no `Co-Authored-By: Claude` line**. All commits, CHANGELOG entries, READMEs in Arabic Fusha:

```bash
git -c user.name="SalehGNUTUX" -c user.email="gnutux.arabic@gmail.com" \
  commit --author="SalehGNUTUX <gnutux.arabic@gmail.com>" -m "..."
```

For porting to sibling repos:
```bash
cd /tmp && rm -rf GT-SQRM-port GT-SQR-port
git clone --depth 3 https://github.com/SalehGNUTUX/GT-SQRM.git GT-SQRM-port
git clone --depth 3 https://github.com/SalehGNUTUX/GT-SQR.git GT-SQR-port
```

## Memory entries to read

- `project-gt-sirm-state-v0100` — earlier state snapshot
- `project-gt-sirm-plan` — overall plan
- `project-gt-sirm-disclaimer` — Arabic disclaimer variants
- `feedback-gt-sirm-terminology` — terminology rules
- `feedback-clean-commits` — SalehGNUTUX-only authorship
- `feedback-arabic-commits` — all commits/docs in Arabic
- `reference-waveform-export-fix` — AnalyserNode parity recipe

## Reference docs

- `README.md` / `CHANGELOG.md` / `ROADMAP.md` — release notes + plan
- `GT-SIRM-DESKTOP/README.md` / `CHANGELOG.md` — desktop-specific
- `GT-SIRM-WEB/README.md` / `CHANGELOG.md` — web-specific
- `../CLAUDE.md` — parent GT-SQRM guide (foundation we inherit from)

## Next session priorities

1. **Visual test of v0.12.12** in all tabs — confirm collapsible behavior is clean across all sections.
2. **v0.13 — مَصادر الصَوت الجديدة** (per ROADMAP):
   - Microphone recording via `getUserMedia` + `MediaRecorder`, save to workdir `recordings/`, expose as custom audio source.
   - TTS (Arabic) — decision needed: Edge TTS (cloud, high quality) vs Coqui (local, full privacy).
   - Silent mode with bg sounds only (for إيقاع without effects).
3. **(Optional)** Update root `index.html` (GitHub Pages landing) to mention v0.10-v0.12 features.
