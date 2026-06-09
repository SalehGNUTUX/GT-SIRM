# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state (2026-06-09 — نهاية اليوم)

**GT-SIRM (GnuTux Short Islamic Reels Maker)** — at **v0.10.0** (six content modules complete). Twin-version Electron+PWA Islamic reels maker forked from GT-SQRM/GT-SQR v3.0.

### الحال: v0.10.0 منشور على main، يَنتظر بناء الحزم وإصدار release غداً
- آخر commit: `6ca5b7d` — v0.10.0 (الوحدات الثلاث الجديدة).
- آخر release منشور: **v0.9.1 Beta** (التقسيم الذكيّ للأذكار).
- لم يُبنى/يُنشَر بعد: v0.10.0 release (AppImage+DEB+RPM+APK).
- v0.10.0 لم يُختبَر بعد بصرياً — يحتاج تأكيداً من المستخدم قبل إصدار release.

### Latest published versions
| Repo | Version | Latest commit | Release status |
|---|---|---|---|
| **GT-SIRM** | 0.10.0 | `6ca5b7d` | آخر release منشور: v0.9.1 Beta |
| **GT-SQRM** | 3.3.6 | `643996b` | Stable |
| **GT-SQR** | 3.3.6 | `c5908ed` | Web (GitHub Pages) |

### الوحدات المُكتمَلة (impl: true)
| الوحدة | الإصدار | الحالة | المصدر |
|---|---|---|---|
| 📖 القرآن | v0.2 | ✅ موروثة من GT-SQRM | api.alquran.cloud |
| 📜 الحديث الشريف | v0.8.0→v0.8.4 | ✅ 90 حديثاً | الأربعون النووية + رياض الصالحين |
| 🕊️ الأذكار | v0.9.0 | ✅ 267 ذكراً | **GT-HISNMUSLIM** (بإذن المؤلِّف نفسه) |
| ✨ أسماء الله الحسنى | v0.10.0 | ✅ 100 اسماً | حديث الترمذي + ابن القيّم/ابن عثيمين |
| 🤲 الأدعية المأثورة | v0.10.0 | ✅ 32 دعاءً (5 فئات) | القرآن + الصحيحان والسنن |
| 🌟 الحِكَم والمواعظ | v0.10.0 | ✅ 32 قولاً (4 فئات) | الصحابة → ابن تيمية، بإسناد لكلّ قول |

### Sibling repos (kept in sync for portable features)
GT-SIRM features that are portable (chromakey, vtitle, project save, recvid, restart-all-btn) get backported to GT-SQRM/GT-SQR. Features tied to GT-SIRM's architecture (Module Manager, free text, per-slice timing, timing master toggle, Hadith module) are NOT ported.

### Local working directories — sync workflow
- `GT-SIRM/`: real git repo with origin remote → use `git push` directly.
- `GT-SQRM-main/`, `GT-SQR-main/`: NOT git repos locally (zip extracts).
  - To work on them: `git clone --depth 2 https://github.com/SalehGNUTUX/{GT-SQRM,GT-SQR}.git /tmp/{port-name}` → edit → commit + push → `rsync -a --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='package-lock.json' /tmp/{port-name}/ "../{GT-SQRM,GT-SQR}-main/"` to update local for testing.

## Repo layout

```
GT-SIRM/                          ← GitHub repo: SalehGNUTUX/GT-SIRM
├── GT-SIRM-DESKTOP/              ← Electron app (Linux: AppImage/DEB/RPM)
│   ├── src/{main,preload,renderer}/   ← real code, forked from GT-SQRM v3.0
│   ├── scripts/build-all.sh           ← cache-aware build wrapper
│   ├── package.json                   ← v0.7.3
│   └── GT-SIRM-icons/, fonts/
├── GT-SIRM-WEB/                  ← PWA + APK target (Capacitor)
│   ├── app.js, index.html             ← forked from GT-SQR v3.0
│   ├── export-engine-web.js           ← WebCodecs deterministic encoder
│   ├── mp4-muxer.js, webm-muxer.js    ← classic IIFE (file:// compatible)
│   ├── fonts-data.js                  ← inlined fonts for file://
│   ├── sw.js, manifest.json           ← PWA
│   └── capacitor.config.json
├── README.md, ROADMAP.md, CHANGELOG.md, LICENSE
├── index.html                    ← landing page (GitHub Pages root)
└── GT-SIRM-ICON.png, GT-SIRM-ICON-GB.png
```

Sibling repos live at `../GT-SQRM-main/` (desktop) and `../GT-SQR-main/` (web) — these directories are NOT git repos. To push to those projects, clone them to `/tmp/GT-SQRM-port` and `/tmp/GT-SQR-port`, apply changes, commit, push.

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

## Major features added (v0.4 → v0.7)

### Module Manager (v0.3+, v0.5.8 polish)
- `data-module="quran"` tags Quran-specific sections.
- CSS: `[data-module]:not(.module-active) { display: none !important }`.
- `initModuleManager` reads `localStorage[gt_sirm_modules_v1]`, applies `.module-active`.
- When Quran module is OFF: auto-clears `sname-on` checkbox, clears verses, stops reciter, increments `_recGen` to abort fetches.
- Call order: `initEventListeners()` → `initModuleManager()` → `restoreAllSettings()`.

### Free text editor (v0.4.x)
- Section in `tab-rec`: `🔗 تفعيل محرّر النصّ الحرّ` toggle.
- `applyFreeText`: parses textarea → `S.verses` array with `free: true, audio: null`.
- `S.useFreeAsSource = true` switches the playback pipeline.

### Per-slice timing (v0.5.1 → v0.5.5)
- `S.freePerSlice = [{text, dur}, ...]` — per-slice duration override.
- 3 toggles: `free-auto-sync` (default ON) + `free-per-slice` (OFF) + `free-per-slice-lock` (ON).
- `calcEffectiveSliceDuration` respects auto-sync toggle.
- `redistributePerSliceFromEdit`: when editing one slice with lock=ON, redistributes delta proportionally.
- `syncPerSliceToPlayback` (v0.5.3): writes to `S.verses[i].manualDuration` AND `S.ayaDurations[i]` on every edit.
- v0.5.5 fix: `applyFreeText` populates `S.ayaDurations` from manualDuration (preview was reading `S.ayaDurations` which was empty).

### Timing master toggle (v0.5.4)
- `timing-master-on` in 🎬 settings tab.
- When OFF: `getAyaGap()` returns 0, UI dimmed, prevents `aya-gap` from interfering with per-slice precision.

### Video title (v0.5.6)
- Independent custom title at top of canvas. Section `🎬 عنوان المقطع` in tab-txt (top, above surah name).
- IDs: `vtitle-on`, `vtitle-text`, `vtitle-y`, `vtitle-size`, `vtitle-col`, `vtitle-fx`.
- 4 effects: shadow/glow/outline/none.
- `drawVideoTitle(ctx, W, H)` called after `drawSurahName` in drawFrame.

### Project save/load (v0.5.7 → v0.5.8)
- Format `.gtsirm` JSON: `{ format: "GT-SIRM-Project", formatVersion: 1, settings: {byId, byName}, assets: [...] }`.
- Hybrid embedding: ≤50MB embedded as base64 dataURL, larger marked `mode: "missing"`.
- Asset keys: `bgVideo[i]`, `bgImage`, `bgAudio`, `recVideo`, `logo`.
- Desktop: file association in `package.json#build.fileAssociations` + `requestSingleInstanceLock` + `open-file` event in main.js.
- IPC: `project-save-dialog`, `project-open-dialog`, `project-write`, `project-read`.
- **Close confirmation modal** (v0.5.8): `beforeunload` in Electron doesn't support custom dialogs. Solution: `main.js` intercepts `close` event → IPC `request-close-confirm` → renderer shows 3-button modal (إلغاء/حفظ/إنهاء) → IPC `confirm-close` releases the close.
- **Missing assets modal**: per-asset file input for replacement when loading project with missing media.
- **Auto-save** (Settings tab): toggle + interval picker (1/5/10/15/30 min). Desktop writes to last manual path silently. Web writes to `localStorage[gt_sirm_autosave_blob]` (4.5MB cap).
- **Dirty tracking**: `markProjectDirty()` is called on every DOM input change AND every file upload (v0.7.3 fix). Without file dirty tracking, refresh on web doesn't trigger beforeunload warning.

### Chromakey for bg media (v0.6.0)
- Section `🎭 Chromakey` in `tab-scene` (before حركة الخلفية).
- IDs: `chromakey-on`, `chromakey-color`, `chromakey-similarity`, `chromakey-smoothness`, `chromakey-spill`.
- Algorithm: **YCbCr** chroma distance (Cb/Cr Euclidean) + spill suppression by extracting excess channel toward avg of other two.
- `drawBg` modified to use off-screen canvas when chromakey is on: paint gradient → draw media to off-screen → `applyChromakeyToCanvas` → composite onto main ctx.

### Hadith module (v0.8.0 → v0.8.4)
- Toggleable module via `data-module="hadith"`. `MODULES.hadith.impl: true` since v0.8.0.
- Data: `hadith-data.js` classic script → `window.HADITH_DATA = { collections: [{id, name, hadiths: [{n, chapter, narrator, text, source, grade}]}] }`.
- Corpus (v0.8.3): **90 hadiths** — 40 Nawawi + 50 Riyad as-Salihin, each tagged with grade (صحيح/حسن/قدسيّ).
- UI in `tab-rec` after reciter section: collection dropdown + search (`normalizeArabic`) + hadith list + preview pane + apply button.
- **v0.8.4 structure**: `parseHadithStructure(text)` detects 6 regex patterns of "قَالَ رَسُولُ اللهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ" and splits the hadith into 3 parts:
  - **narrator** (e.g., "عَنْ X رَضِيَ اللَّهُ عَنْهُ")
  - **prophetic** ("قَالَ رَسُولُ اللهِ ﷺ")
  - **body** (rest of matn, further split on `[.،؛!؟]+`)
- `applyHadith(h, coll)` reads `hadith-clean-isnad` toggle:
  - ON: skip narrator slice, keep prophetic + body
  - OFF: include all three (narrator + prophetic + body)
- All ﷺ symbols replaced by full phrase `صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ` (98 occurrences across corpus, v0.8.3).
- Formulaic phrases tashkeel'd in v0.8.3: `رَضِيَ اللَّهُ عَنْهُ/عَنْهَا/عَنْهُمَا`, `قَالَ رَسُولُ اللهِ`, `النَّبِيِّ`, `عَنْ`, `سَمِعْتُ`. Matn text body remains partially un-tashkeel'd.
- IDs: `hadith-collection, hadith-search, hadith-select, hadith-preview, hadith-prev-meta, hadith-prev-text, hadith-prev-narrator, hadith-prev-source, apply-hadith-btn, hadith-clean-isnad, open-per-slice-from-hadith`.
- SW caches `hadith-data.js` (OPTIONAL).

### Standalone per-slice timing section (v0.8.3 → v0.8.6)
The per-slice list (was inside Free Text section originally) is now its own `<div class="sec">` placed in `tab-rec` so it serves ANY text source (Free Text, Hadith, future modules).
- `buildPerSliceList()` (v0.8.3): if `S.verses` contains free/hadith items, reads from them; else reads from `free-text-area`. The function is source-agnostic.
- `openPerSliceSmart()` (v0.8.6): unified click handler used by `open-per-slice-from-free` AND `open-per-slice-from-hadith` buttons. Each click clears `S.freePerSlice`, rebuilds, syncs to active audio, scrolls. Without this `S.freePerSlice = null` reset, the button showed stale slices from previously-applied source.
- Adding the same button to a future module (Athkar, Dua, Hikam): wire its click to `openPerSliceSmart`. No new logic needed.

### Audio duration sync — unified (v0.8.5)
The export length mismatch ("sometimes audio repeats, sometimes truncated") was the symptom of `S.verses[i].manualDuration` not matching the active audio duration. The fix:
- `getActiveAudioDuration()` — single source of truth, priority order: **recvid → trim → bgAudio**.
- `calcEffectiveSliceDuration(numSlices, baseDur)` uses it. Returns `audioDur / numSlices` when audio is active; falls back to `baseDur` otherwise.
- `applyHadith` and `applyFreeText` both call `calcEffectiveSliceDuration` → distribution always matches active audio.
- `syncVersesToActiveAudio()` re-distributes existing text slices when audio is uploaded/changed AFTER text was applied. Called from `onBgAudio` (on `loadedmetadata`) and `applyFreeAudioTrim` (v0.8.6).
- Result: `sum(manualDuration) === activeAudioDuration` always → no loop tail, no truncation.

### Free Text section position + default state (v0.8.5)
- The whole section `<div class="sec" data-module="free">` (toggle + textarea + apply + custom audio + trim) is the FIRST `.sec` inside `tab-rec`. Order in tab-rec: Free Text → Quran (surah + reciter) → Hadith → Per-slice → Recvid.
- `free-text-on` toggle is FORCED to `false` at init (no `localStorage` restore). Once user enables it for a session, the editor expands; reopening the app resets to OFF.

### Recitation video (v0.7.0 → v0.7.5)
- Pre-rendered Islamic recitation video (audio + text on solid background). Replaces Quran/free-text completely.
- Section `🎥 فيديو تلاوة جاهز` in `tab-rec`. **In GT-SIRM**: after free text section. **In GT-SQRM/GT-SQR (v3.3.0)**: at top with auto-disable of Quran sources.
- IDs: `recvid-on`, `recvid-file`, `recvid-fit`, `recvid-x`, `recvid-y`, `recvid-scale`, `recvid-bgcolor`, `recvid-threshold`, `recvid-softness`, `recvid-remove`.
- State: `S.recVidEl` (HTMLVideoElement), `S.recVidFile`, `S.recVidAudioSource`.
- `drawRecitationVideo(ctx, W, H)` draws video to off-screen with fit/scale/position, then `removeBgColorFromRegion` removes the bg color, then composite.
- Audio routing: `createMediaElementSource(recVidEl) → ctx.destination + S.analyser + S.exportDest`.
- `S.verses = [{manualDuration: video.duration, free: true, recvid: true}]` so the playback timing follows video duration.
- `startPlayer`: if `recvid-on`, plays recVidEl instead of calling `playRecitationAudio`.
- `pausePlayer`: resets `recVidEl.currentTime = 0`.
- **V2 export sync** (v0.7.3): `seekVideoToTime(S.recVidEl, t)` in export-engine before each `drawFrame(t)`, with timeout 800ms safety. Otherwise the video stays frozen on first frame because `currentTime` doesn't advance in deterministic export.
- **V1 export sync** (v0.7.3): `S.recVidEl.play()` after `mr.start()`, `pause()` in `stopExportSources`.

### Background color removal — unified algorithm
`removeBgColorFromRegion(ctx, x, y, w, h, opts)` is the shared helper for recvid bg removal AND logo chromakey:
- Detects key saturation: `(max - min) < 25` = grayscale.
- **Dark grayscale** (luminance < 60): `Math.max(r,g,b)` threshold — preserves white text on black.
- **Light grayscale** (luminance > 195): `Math.min(r,g,b)` threshold — preserves black text on white.
- **Saturated**: YCbCr distance like chromakey.

### Logo chromakey (v0.7.1)
- Toggle in 🖼️ شعار مخصص section (default OFF).
- `logo-chroma-on`, `logo-chroma-color` (default `#ffffff`), `logo-chroma-threshold`, `logo-chroma-softness`.
- `drawLogo` modified: if toggle on, render to off-screen canvas, run `removeBgColorFromRegion`, composite.

### Auto-disable conflicting sources (v3.3.0 in GT-SQRM/GT-SQR)
- Quran sections wrapped in `<div id="quran-sources-wrap">`.
- When `recvid-on` activates: hide wrap + `stopRecitationAudio` + `_recGen++` + clear S.verses + toast.
- When deactivates: show wrap + call `onSurahChange` to reload current surah.

## Versions and commits

| Repo | Latest version | Latest commit | URL |
|---|---|---|---|
| GT-SIRM | 0.10.0 | `6ca5b7d` | github.com/SalehGNUTUX/GT-SIRM |
| GT-SQRM | 3.3.6 | `643996b` | github.com/SalehGNUTUX/GT-SQRM |
| GT-SQR | 3.3.6 | `c5908ed` | github.com/SalehGNUTUX/GT-SQR |

### تاريخ سلسلة v0.9.x → v0.10.0
- **v0.9.0** (`01bbbf7`) — وحدة الأذكار: استيراد كامل من GT-HISNMUSLIM (132 فئة، 267 ذكراً).
- **v0.9.1** (`90b2a4f`) — التقسيم الذكيّ `splitArabicTextSmart`: يَفهم آيات `﴿﴾`، أقواس `((...))` و `[[...]]`، الترقيم العربيّ، الجُمل القصيرة تُدمَج، الترتيب مَحفوظ بـ `MARK` placeholder. **هذا الإصدار منشور release Beta.**
- **v0.10.0** (`6ca5b7d`) — ثلاث وحدات: أسماء الله الحسنى (100 اسم) + الأدعية المأثورة (32 دعاءً في 5 فئات) + الحِكَم والمواعظ (32 قولاً في 4 فئات). جميعها تَستعمل `splitArabicTextSmart` + المساعد الجديد `clearOtherSourcesUI()`. غداً: بناء+release.

### مهامّ مفتوحة لجلسة الغد
1. **بناء v0.10.0 packages** — AppImage + DEB + RPM + APK Debug، ثمّ `gh release create v0.10.0 --prerelease`.
2. **اختبار بصريّ v0.10.0** — التأكّد أنّ الوحدات الجديدة الثلاث تَظهر صحيحاً في تبويب التلاوة، توگلاتها في الإعدادات تَعمل، المنع المتبادل بينها يَعمل.
3. **(اختياري)** — v0.11.0 ميكروفون + TTS حسب الـROADMAP.
4. **(اختياري)** — تحديث صفحة الموقع (`index.html` في الجذر) لذكر الوحدات الجديدة الثلاث.

### ملاحظات للجلسة القادمة
- `splitArabicTextSmart` (في `app.js`) دالّة موحَّدة تَستعملها 3 وحدات (azkar/duas/hikam). أيّ إصلاح فيها يَفيد الجميع.
- `clearOtherSourcesUI()` (v0.10.0) يَجب استدعاؤها في بداية أيّ `applyX` جديدة لمنع التداخل البصريّ.
- `openPerSliceSmart` (في v0.8.6) هو معالج موحَّد لأزرار 🎚️ من كلّ الوحدات.
- التوگل `mod-azkar` و `mod-asma` و `mod-duas` و `mod-hikam` لا يَحتاج خصائص `checked disabled` بعد الآن — أُزيلت في v0.9.0 و v0.10.0 على التوالي.

GT-SIRM version history (chronological since this session started):
- 0.5.0 — Smart drag-drop + Ctrl+V + video mute + restart button
- 0.5.1 → 0.5.5 — Per-slice timing iterations (auto-sync toggle, lock, sync, ayaDurations fix)
- 0.5.6 — Video title (vtitle)
- 0.5.7 → 0.5.8 — Project save/load (.gtsirm) + auto-save + close modal + missing assets + surah name reposition
- 0.6.0 — Chromakey for bg
- 0.7.0 → 0.7.2 — Recitation video + color picker + logo chromakey + serialize fix
- 0.7.3 — V1+V2 export sync for recvid + dirty tracking on file uploads
- 0.7.4 — REVERTED (autoFitCanvasToVideo was breaking preview + export)
- 0.7.5 — recvid replaces bgAudio in preview + V2 export (no more audio overlap when reopening saved project)
- **0.7.5 published as Beta release** with AppImage + DEB + RPM
- 0.8.0 — Hadith module with Arba'in Nawawi (40 hadiths bundled)
- 0.8.1 — clean-isnad toggle (early, replaced in v0.8.4)
- 0.8.2 — isnad-cleaner anchored to ﷺ / صلى الله عليه وسلم patterns
- 0.8.3 — per-slice section moved OUT of free-text section to standalone (source-agnostic) + mutual exclusivity (apply X disables Y) + ﷺ→full phrase (98 occurrences) + isnad preamble added to all Nawawi hadiths + Riyad as-Salihin corpus added (90 hadiths total) + partial tashkeel on formulaic phrases
- 0.8.4 — `parseHadithStructure()` splits hadith into 3 slices: narrator + "قَالَ رَسُولُ اللهِ ﷺ" + body. clean-isnad now removes ONLY the narrator (keeps prophetic intro). Per-slice section moved above Free Text. 🎚️ button stops auto-activating free-text-on.
- 0.8.5 — Free Text section MOVED to TOP of tab-rec. Toggle always unchecked at startup (no localStorage restore for `free-text-on`). Added 🎚️ button INSIDE Free Text section. `calcEffectiveSliceDuration` now detects recvid as audio source. `applyHadith` uses `calcEffectiveSliceDuration` (was: fixed baseDur). `syncVersesToActiveAudio()` auto-redistributes after bg audio upload. **HTML move script broke layout — fixed in 0.8.7.**
- 0.8.6 — `openPerSliceSmart()` unified handler for both 🎚️ buttons: clears `S.freePerSlice`, forces rebuild from current `S.verses`, syncs to audio. Fixes "🎚️ shows stale hadith slices after applying free text". `applyFreeAudioTrim` calls `syncVersesToActiveAudio`. **Still carries v0.8.5's broken HTML.**
- **0.8.7 HOTFIX (current)** — Restored HTML balance: replaced lone `<` with `</div>` on L555/454, added missing `</div>` to close `#tab-rec` before `#tab-scene`. Both files now 624/624 (desktop) and 551/551 (web). Awaiting user verification of restored layout.

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
python3 -m http.server 8080         # then http://localhost:8080
# Also works under file:// (Service Worker + PWA install gracefully degrade)

# APK via Capacitor (needs Android SDK + Java JDK 17+)
npm install
./scripts/build-apk.sh debug
./scripts/build-apk.sh release
./scripts/build-apk.sh bundle
./scripts/build-apk.sh clean
```

### Cross-version parity check (mandatory before commit)

```bash
# Section ordering in tab-txt
awk '/id="tab-txt"/,/<!-- SCENE -->/' GT-SIRM-DESKTOP/src/renderer/index.html | grep 'class="sec-t"'
awk '/id="tab-txt"/,/<!-- /' GT-SIRM-WEB/index.html | grep 'class="sec-t"'

# Tag counts must match
diff <(grep -oE 'data-module="[a-z]+"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'data-module="[a-z]+"' GT-SIRM-WEB/index.html | sort -u)

# Standard diffs
diff <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-DESKTOP/src/renderer/index.html | sort -u) \
     <(grep -oE 'id="[a-zA-Z][a-zA-Z0-9_-]*"' GT-SIRM-WEB/index.html | sort -u)
diff <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-DESKTOP/src/renderer/app.js | sort -u) \
     <(grep -oE '^function +[a-zA-Z_][a-zA-Z0-9_]*' GT-SIRM-WEB/app.js | sort -u)
```

Expected desktop-only deltas: `batch*`, `dl*`, `yt*`, `export-codec/crf/preset/abr`, `ffmpeg-log`, `bgVidFile`, `_exportBgFrameImg`, plus functions like `getTrimTimes`, `_finishExportUi`, `startExportAsync` — same as parent.

### No tests, no linter
Verify changes via `node --check <file>.js` for syntax + manual smoke-test. Run the app and check DevTools console for errors. The maintainer tests visually.

## Releases workflow

When user asks to publish a release (binary + GitHub release):

```bash
# 1. Build (GT-SIRM-DESKTOP or GT-SQRM-main)
cd "<repo-dir>"
chmod +x scripts/build-all.sh
bash scripts/build-all.sh all 2>&1 | tee /tmp/build.log
# Builds AppImage + DEB + RPM (RPM via alien fallback). Takes ~5 minutes.

# 2. Tag + push
cd "<git-repo-dir>"  # the actual git repo (GT-SIRM/ or /tmp/GT-SQRM-port/)
git -c user.name="SalehGNUTUX" -c user.email="gnutux.arabic@gmail.com" \
  tag -a v<version> -m "<version> — <type>"
git push origin v<version>

# 3. GitHub release (use --prerelease for Beta, omit for Stable)
gh release create v<version> \
  --title "v<version> — <type>" \
  [--prerelease] \
  --notes-file /tmp/release-body.md \
  "<dist>/<AppImage>" "<dist>/<deb>" "<dist>/<rpm>"
```

Asset naming: `{ProductName}-{version}.AppImage`, `{name}_{version}_amd64.deb`, `{name}-{version}-2.x86_64.rpm` (alien adds `-2`).

## Critical localStorage keys

- `gt_sirm_modules_v1` — module on/off map
- `gt_sirm_settings_v2`, `gt_sirm_quran_idx_v1`, `gt_sirm_logo_v1`, `gt_sirm_tpls`, `gt_sirm_reciters_v2`, `gt_sirm_lastExportDir`
- `gt_sirm_autosave_on`, `gt_sirm_autosave_interval`, `gt_sirm_autosave_blob` (web), `gt_sirm_last_project` (desktop)
- `gt_sirm_free_auto_sync`, `gt_sirm_free_per_slice`, `gt_sirm_free_per_slice_lock`, `gt_sirm_timing_master_on`

## Gotchas

### V2 export and HTMLVideoElement
V2 deterministic export iterates frames at fixed timestamps. HTMLVideoElement frames don't advance with `setStateForTime` — they need explicit `currentTime = t` + wait for `seeked` event. Pattern:

```js
// In export loop, before drawFrame(t):
if (S.recVidEl && ge("recvid-on")) {
  await seekVideoToTime(S.recVidEl, t);  // with 800ms timeout
}
drawFrame(t);
```

Bg video uses a different approach: pre-extracted JPEG sequence via ffmpeg (more deterministic but expensive).

### Beforeunload + file uploads
`window.addEventListener("beforeunload", ...)` only fires if `S.projectDirty=true`. The dirty-tracker hooks DOM inputs but skips `type=file`. Solution: call `markProjectDirty()` explicitly in `onBgMedia`, `onBgAudio`, `addBgVidItem`, `onRecVidFile`.

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
When recvid loads, `S.verses = [{recvid: true, free: true, manualDuration: video.duration}]`. If user later toggles recvid OFF, must call `onSurahChange()` to reload Quran verses (v3.3.0 fix in parent repos).

### Web refresh = browser-native dialog only
Browser security prevents custom dialogs in `beforeunload`. The 3-button modal works only in Electron. On web, just `e.preventDefault(); e.returnValue = "..."` for the default browser warning.

### autoFitCanvasToVideo is REJECTED
Attempted in v0.7.4 (and ported to v3.3.3) to auto-size canvas to recvid dimensions. **Broke everything**: distorted preview, distorted export, fast bg video, no waveform, no audio. Reverted in v0.7.4 hotfix and v3.3.4. Do not reintroduce — canvas must stay at chosen FMT preset; recvid renders inside via fit/scale/position controls.

### Audio overlap when loading saved project + uploading new recvid
Old project's bgAudio kept playing alongside new recvid in preview, AND V2 export used old bgAudio (recvid audio not mixed offline). Fix (v0.7.5/v3.3.6): in `startPlayer`, pause bgAudioEl when recvid-on; in V2 export's bgBuffer setup, when recvid is active read `S.recVidFile.arrayBuffer()` and decode as bgBuffer (replacing bgAudio entirely).

### removeBlackBackground alias
`drawRecitationVideo` (in GT-SIRM) calls `removeBlackBackground` which is a backward-compat alias for `removeBgColorFromRegion`. When porting drawRecitationVideo to GT-SQRM/GT-SQR, must also port the alias or you get runtime `ReferenceError`. Fixed in v3.3.5.

### When porting GT-SIRM functions verbatim to GT-SQRM/GT-SQR
Use a Python script that:
1. Extracts each function by name from GT-SIRM (find `function NAME(` → match braces to find end).
2. Finds and replaces the same-named function in target file.
3. Use this for: `drawRecitationVideo, getRecVidCanvas, onRecVidFile, removeRecVid, applyChromakeyToCanvas, removeBgColorFromRegion, hexToRgb, getChromakeyCanvas, getLogoChromaCanvas, removeBlackBackground`.

### Inherited gotchas from GT-SQRM
All gotchas in `../CLAUDE.md` apply: surah name prefix handling, CSP blocks `fetch("blob:")`, fonts must `FontFace.load()`, ffmpeg progress IPC throttling, render loop must yield during V2 export, getImageData buffer no slice, bg playlist reorder reset to 0, web AAC codec fallback chain, web works under file://, electron-builder cache corruption, RPM via alien fallback, electron icon naming.

### إضافة وحدة محتوى جديدة (v0.10.0 pattern)
نمط موحَّد لإضافة أيّ وحدة جديدة (مستقبلاً مثلاً وحدة قصص الأنبياء):
1. **ملفّ بيانات** `X-data.js` (classic script) يَضَع `window.X_DATA = { categories: [{id, name, icon, items: [{n, text, source, ...}]}] }`.
2. **`<script src="X-data.js">`** في `index.html` بعد `hadith-data.js` (سطح المكتب + ويب).
3. **قسم HTML** `<div class="sec" data-module="X">` في `tab-rec` بعد قسم `azkar` بنمط مكرَّر (category select + search + select size=6 + preview + apply button + per-slice button).
4. **توگل في الإعدادات** `<input id="mod-X">` بدون `disabled` ولا `checked` (التوگل في تبويب الإعدادات + entry في `MODULES` بـ `impl: true`).
5. **دوالّ JS**: `initXModule()` يَملأ القائمة ويَربط الـlisteners + `applyX(item, cat)` يَستدعي `clearOtherSourcesUI()` ثمّ `splitArabicTextSmart` ثمّ `calcEffectiveSliceDuration` ثمّ يَملأ `S.verses` و `S.freePerSlice`. زرّ التوقيت يُربَط بـ `openPerSliceSmart`.
6. **نداء `initXModule()`** في تسلسل `DOMContentLoaded` بعد `initAzkarModule()`.
7. **Service Worker** يُضاف `./X-data.js` إلى مصفوفة `OPTIONAL` + cache version bump.
8. **`build-apk.sh`** يَنسخ `X-data.js` إلى `www/`.
9. **توثيق**: README + ROADMAP + CHANGELOG + (اختياري) صفحة الموقع.

### المنع المتبادل بين الوحدات (v0.8.14 + v0.10.0)
- `MODULES` مع `enforceSingleModuleActive(state)` يَضمن وحدة محتوى واحدة فقط مفعَّلة.
- في تطبيق وحدة محتوى (`applyHadith` / `applyAzkar` / `applyAsmaOne` / `applyDua` / `applyHikma`): استدعِ `clearOtherSourcesUI()` كأوّل خطوة. هذا يُخفي معاينات + أزرار الوحدات الأخرى تلقائياً، فلا تَظهر بقايا مُربكة بصرياً.
- النصّ الحرّ (`free-text-on`) ليس وحدة في MODULES بعد v0.8.16 — إنّه أداة دائمة. لكنّه يُلغى تلقائياً عند تطبيق وحدة محتوى (في `clearOtherSourcesUI`).

### Never move large HTML sections with regex (v0.8.5 → 0.8.7 lesson)
v0.8.5 used a Python regex to "cut and paste" the `<div class="sec" data-module="free">` block from the middle of `tab-rec` to the top. The regex matched the FIRST `</div>` it found inside the section, which closed only the toggle's `.tgg` — leaving textarea + apply + custom audio + trim orphaned in the middle of the file, plus a stray `<` character (corrupted `</div>` → `<` after sed substitutions). The user's bug report ("preview is inside the sections") came from the cascading malformation: `#tab-rec` never closed before `#tab-scene`, so the layout collapsed.

**Always verify with a div-balance check after structural HTML edits:**
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

For moves of large blocks, prefer reading the file, identifying the EXACT block boundaries by Read tool (line numbers), then two Edit calls (delete + insert) — not regex-based bulk surgery. Or restore from git after a botched move.

### `S.freePerSlice` reuse trap (v0.8.6 lesson)
The per-slice section reads from `S.freePerSlice` when rendering. If the user applies Hadith → Free Text → clicks 🎚️, the OLD hadith slices in `S.freePerSlice` would render. Solution: `openPerSliceSmart()` does `S.freePerSlice = null` BEFORE calling `buildPerSliceList()`, forcing it to re-derive from `S.verses`. Any new "open per-slice" entry point must follow this clear-then-rebuild pattern.

### Audio duration: priority of sources (v0.8.5)
`getActiveAudioDuration()` checks in strict priority: **recvid → trim → bgAudio**. If you add a new audio source type (e.g., microphone), insert its check in this function and update `syncVersesToActiveAudio` to use it. Do NOT bypass `calcEffectiveSliceDuration` in any new `applyX()` function — it must call it, or duration sync breaks for that module.

### `parseHadithStructure` regex order matters
6 patterns checked in declared order, returning the first match. The fully-tashkeel'd patterns (`قَالَ\s+رَسُولُ\s+اللهِ\s+صَلَّى\s+اللَّهُ\s+عَلَيْهِ\s+وَسَلَّمَ`) come first because hadith-data.js v0.8.3 normalized everything to that form. The un-tashkeel'd fallbacks (`قال\s+رسول\s+الله\s+صلى\s+الله\s+عليه\s+(?:و\s*)?سلم`) are kept for user-pasted hadiths that aren't pre-normalized. If a hadith has dialogue structure (e.g., #2 Jibreel, #16 "أوصني") with no clear "Prophet said" marker, the function returns `null` and `applyHadith` falls back to splitting the entire text on punctuation as one body.

## Commit conventions

The maintainer wants commits attributed to **`SalehGNUTUX` only** — **no `Co-Authored-By: Claude` line**. Continue the pattern: when committing, do NOT add Claude attribution to the message. Sign as:
```bash
git -c user.name="SalehGNUTUX" -c user.email="gnutux.arabic@gmail.com" \
  commit --author="SalehGNUTUX <gnutux.arabic@gmail.com>" -m "..."
```

For porting to sibling repos (GT-SQRM/GT-SQR), clone fresh:
```bash
cd /tmp && rm -rf GT-SQRM-port GT-SQR-port
git clone --depth 3 https://github.com/SalehGNUTUX/GT-SQRM.git GT-SQRM-port
git clone --depth 3 https://github.com/SalehGNUTUX/GT-SQR.git GT-SQR-port
```

## Memory entries to read

- `project-gt-sirm-state-v054` — earlier state (v0.5.4)
- `project-gt-sirm-state-v07x` — current state (v0.7.3) — to be written this session
- `project-gt-sirm-plan` — overall plan
- `project-gt-sirm-disclaimer` — Arabic disclaimer variants
- `feedback-gt-sirm-terminology` — terminology rules
- `feedback-clean-commits` — SalehGNUTUX-only authorship
- `reference-waveform-export-fix` — AnalyserNode parity recipe

## Reference docs

- `README.md` / `CHANGELOG.md` / `ROADMAP.md` — release notes + plan
- `GT-SIRM-DESKTOP/README.md` / `CHANGELOG.md` — desktop-specific
- `GT-SIRM-WEB/README.md` / `CHANGELOG.md` — web-specific
- `../CLAUDE.md` — parent GT-SQRM guide (foundation we inherit from)
