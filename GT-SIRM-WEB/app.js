// ═══════════════════════════════════════════════════════
//  GT-SIRM v2.0 — GnuTux Short Islamic Reels
//  Author: SalehGNUTUX | License: GPLv3
//  آخر تحديث: 2026 - نسخة الويب مع مزايا سطح المكتب
// ═══════════════════════════════════════════════════════
"use strict";

// ── RECITERS REGISTRY ──────────────────────────────────
const RECITERS_LIST = [
  { id: "alafasy",    name: "مشاري العفاسي",            flag: "🇰🇼", folder: "Alafasy_128kbps" },
{ id: "ghamdi",     name: "سعد الغامدي",               flag: "🇸🇦", folder: "Ghamadi_40kbps" },
{ id: "minshawi",   name: "المنشاوي مرتل",             flag: "🇪🇬", folder: "Minshawy_Murattal_128kbps" },
{ id: "husary",     name: "محمود الحصري",              flag: "🇪🇬", folder: "Husary_128kbps" },
{ id: "shaatri",    name: "أبو بكر الشاطري",           flag: "🇸🇦", folder: "abu_bakr_ash-shaatree_128kbps" },
{ id: "maher",      name: "ماهر المعيقلي",             flag: "🇸🇦", folder: "MaherAlMuaiqly128kbps" },
{ id: "yassin_w",   name: "ياسين الجزائري (ورش)",      flag: "🇩🇿", folder: "warsh/warsh_yassin_al_jazaery_64kbps" },
{ id: "hussary_w",  name: "الحصري مرتل (ورش)",         flag: "🇪🇬", folder: "warsh/Husary_Murattal_warsh_128kbps" },
];

function buildAudioUrl(folder, surahNum, ayaNum) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  return `${AUDIO_BASE}/${cleanFolder}/${String(surahNum).padStart(3,"0")}${String(ayaNum).padStart(3,"0")}.mp3`;
}

const BUILT_IN_FONTS = [
  { id: "amiri",     name: "Amiri Quran",     css: "'Amiri Quran'",       sample: "بِسْمِ اللَّهِ" },
{ id: "reem",      name: "Reem Kufi",        css: "'Reem Kufi'",         sample: "بِسْمِ اللَّهِ" },
{ id: "scheher",   name: "Scheherazade",     css: "'Scheherazade New'",  sample: "بِسْمِ اللَّهِ" },
{ id: "cairo",     name: "Cairo Bold",       css: "'Cairo'",             sample: "بِسْمِ اللَّهِ" },
{ id: "noto",      name: "Noto Naskh",       css: "'Noto Naskh Arabic'", sample: "بِسْمِ اللَّهِ" },
{ id: "lateef",    name: "Lateef",           css: "'Lateef'",            sample: "بِسْمِ اللَّهِ" },
{ id: "harmattan", name: "Harmattan",        css: "'Harmattan'",         sample: "بِسْمِ اللَّهِ" },
{ id: "markazi",   name: "Markazi Text",     css: "'Markazi Text'",      sample: "بِسْمِ اللَّهِ" },
{ id: "ruqaa",     name: "Aref Ruqaa",       css: "'Aref Ruqaa'",        sample: "بِسْمِ اللَّهِ" },
];

const THEMES = {
  emerald: { gc1: "#0a2e1e", gc2: "#020d06", tc: "#ffffff", oc: "#c9a227" },
  gold:    { gc1: "#2a1a00", gc2: "#0d0800", tc: "#f5e6b0", oc: "#f0c842" },
  night:   { gc1: "#050a1e", gc2: "#020510", tc: "#e0e8ff", oc: "#4a9fd5" },
  rose:    { gc1: "#2a0d18", gc2: "#0d0408", tc: "#ffe0ef", oc: "#e85d8a" },
  ocean:   { gc1: "#002233", gc2: "#00080f", tc: "#d0f0ff", oc: "#00bcd4" },
  desert:  { gc1: "#2e1e06", gc2: "#100900", tc: "#f0e0c0", oc: "#d4a017" },
  purple:  { gc1: "#1a0a2e", gc2: "#08020f", tc: "#e8d8ff", oc: "#9c5cd4" },
  dark:    { gc1: "#111111", gc2: "#000000", tc: "#ffffff", oc: "#888888" },
};

const QURAN_API  = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://everyayah.com/data";

// ── PWA Install Banner ───────────────────────────────
let _pwaPrompt = null;
function initPwaInstall() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    _pwaPrompt = e;
    showPwaBanner();
    console.log("[PWA] Install prompt captured");
  });
  window.addEventListener("appinstalled", () => {
    _pwaPrompt = null;
    hidePwaBanner();
    toast("✅ تم تثبيت GT-SIRM بنجاح!", "success");
  });
}
function showPwaBanner() {
  const bar = document.getElementById("pwa-bar");
  if (bar) bar.style.display = "flex";
}
function hidePwaBanner() {
  const bar = document.getElementById("pwa-bar");
  if (bar) bar.style.display = "none";
}
async function installPwa() {
  if (!_pwaPrompt) {
    toast("⚠️ التثبيت غير متاح في هذا المتصفح أو التطبيق مثبت مسبقاً", "info");
    return;
  }
  _pwaPrompt.prompt();
  const { outcome } = await _pwaPrompt.userChoice;
  if (outcome === "accepted") toast("⏳ جاري التثبيت…", "info");
  else                         toast("تم الإلغاء", "info");
  _pwaPrompt = null;
  hidePwaBanner();
}

// ── نظام كتم المعاينة + كتم التصدير (مماثل للمكتبية) ───
function togglePreviewMute() {
  S.previewMuted = !S.previewMuted;
  _applyPreviewMute();
  const btn = document.getElementById("mute-preview-btn");
  if (btn) {
    btn.textContent = S.previewMuted ? "🔇" : "🔊";
    btn.title       = S.previewMuted ? "رفع كتم المعاينة" : "كتم صوت المعاينة";
    btn.classList.toggle("btn-muted", S.previewMuted);
  }
}
function _applyPreviewMute() {
  const muted = !!S.previewMuted;
  // كتم/رفع الصوت لمصادر التلاوة وصوت الخلفية الصوتي
  if (S.recAudioEl) S.recAudioEl.muted = muted;
  if (S.bgAudioEl)  S.bgAudioEl.muted  = muted;
  // كتم صوت فيديوهات الخلفية (مع احترام تفعيل صوت كل مقطع)
  if (Array.isArray(S.bgVidItems)) {
    S.bgVidItems.forEach(it => {
      if (it.vid) it.vid.muted = muted || !it.audioEnabled;
    });
  }
}

function initExportMuteState() {
  // اقرأ الإعداد من checkbox وطبّقه على المسار MediaRecorder القديم
  const cb = document.getElementById("mute-on-export");
  S.exportMuted = (cb && cb.checked) || S.muteOnExport;
  _applyExportMute();
}
function cleanupExportMute() {
  S.exportMuted = false;
  _applyExportMute();
}
function _applyExportMute() {
  // المسار V2 صامت دائماً (لا audio playback)؛ هذه للـ MediaRecorder fallback
  if (S.recAudioEl) S.recAudioEl.muted = S.exportMuted || S.previewMuted;
  if (S.bgAudioEl)  S.bgAudioEl.muted  = S.exportMuted || S.previewMuted;
}

// ── GLOBAL STATE ───────────────────────────────────────
const S = {
  surahs: [], verses: [], translations: [],
  currentAya: 0, playing: false,
  elapsed: 0, lastRafTs: null,
  ayaDurations: [],
  bgImg: null, bgVid: null,
  bgVidItems: [], // [{file, vid, name, dur, url}] — playlist لخلفية الفيديو
  mixedAnimsOrder: [],  // ترتيب التأثيرات المُفعَّلة في وضع "مختلط"
  bgVidActiveIdx: 0,
  bgVidNext: null,
  bgVidFadeProgress: 0,
  bgMotionT: 0,
  audioCtx: null, analyser: null, exportDest: null,
  recAudioEl: null, recAudioSource: null, recGainNode: null,
  logoVid: null,
  bgAudioEl: null, bgAudioSource: null,
  waveData: new Uint8Array(64).fill(0),
  stars: [], bokeh: [],
  exportCancel: false, mediaRecorder: null, exportChunks: [],
  exportCancelRef: null, // مرجع إلغاء محرك WebCodecs V2
  muteOnExport: false,     // الإعداد من checkbox
  exportMuted:  false,     // الحالة الحالية
  previewMuted: false,     // كتم المعاينة فقط
  exporting: false, exportSources: [],
  templates: [], reciters: [...RECITERS_LIST],
  allFonts: [...BUILT_IN_FONTS],
  rafId: null,
  logoImg: null,
  filteredSurahs: [],
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initThemeChips();
  renderFontGrid();
  restoreReciters();
  renderReciters();
  loadTemplates();
  generateParticles();
  initCanvas();
  checkOffline();
  startRenderLoop();
  await loadLocalFonts(false);
  await loadSurahList();
  // ⚠️ الترتيب: سجّل المستمعين أولاً، ثم استعد الإعدادات حتى تصل أحداث change إلى المعالجات
  initEventListeners();
  initModuleManager();   // v0.3.0 — يجب أن يأتي قبل restoreAllSettings
  initFreeTextEditor();  // v0.4.0 — محرّر النصّ الحرّ
  initHadithModule();    // v0.8.0 — وحدة الحديث الشريف
  initAzkarModule();     // v0.9.0 — وحدة الأذكار (مأخوذة من GT-HISNMUSLIM)
  initAsmaModule();      // v0.10.0 — وحدة أسماء الله الحسنى
  initDuasModule();      // v0.10.0 — وحدة الأدعية المأثورة
  initHikamModule();     // v0.10.0 — وحدة الحِكَم والمواعظ
  initAudioFXControls(); // v0.11.0 — محرّك المؤثّرات الصوتيّة
  initMicRecorder();     // v0.13.0 — تَسجيل الميكروفون
  initTTS();             // v0.13.1 — Edge TTS
  initSilentMode();      // v0.14 — الوَضع الصامت
  initShareButton();     // v0.14 — زرّ المُشاركة
  initInputEnhancements(); // v1.0 — select-all + paste/clear buttons
  initSmartDrop();       // v0.5.0 — drag-drop ذكيّ وlصق الحافظة
  restoreAllSettings();
  restoreLogo();
  restoreMixedAnimsOrder();
  initAutoSave();
  initCapacitor();       // v0.13.2 — Android: زرّ الرُجوع + فَتح ملفّات .gtsirm
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
  initMobileLayout();
  initPwaInstall();
  // حمّل فهرس القرآن الكامل في الخلفية للعمل دون اتصال
  preloadQuranIndex();
});

// ══════════════════════════════════════════════════════
//  MODULE MANAGER (v0.3.0)
//  يدير تفعيل/إلغاء وحدات المحتوى الإسلاميّ:
//  quran · hadith · azkar · asma · duas · hikam
//  النصّ الحرّ (free) متاح دائماً ولا توگل له.
// ══════════════════════════════════════════════════════
// v0.8.16 — النصّ الحرّ أداة دائمة لا وحدة
const MODULES = {
  quran:  { default: true,  label: "القرآن الكريم",        impl: true  },
  hadith: { default: false, label: "الحديث الشريف",         impl: true  },
  azkar:  { default: false, label: "الأذكار",               impl: true  },
  asma:   { default: false, label: "أسماء الله الحسنى",     impl: true  },
  duas:   { default: false, label: "الأدعية المأثورة",      impl: true  },
  hikam:  { default: false, label: "الحِكَم والمواعظ",       impl: true  },
};
const MODULES_KEY = "gt_sirm_modules_v1";
const FREE_TPL_KEY = "gt_sirm_free_templates_v1";

function loadModuleStates() {
  try {
    const stored = JSON.parse(localStorage.getItem(MODULES_KEY) || "{}");
    const state = {};
    for (const key of Object.keys(MODULES)) {
      state[key] = (key in stored) ? !!stored[key] : MODULES[key].default;
      if (MODULES[key].alwaysOn) state[key] = true;
    }
    return state;
  } catch (_) {
    const state = {};
    for (const key of Object.keys(MODULES)) state[key] = MODULES[key].default;
    return state;
  }
}

function persistModuleStates(state) {
  try { localStorage.setItem(MODULES_KEY, JSON.stringify(state)); } catch (_) {}
}

function applyModuleVisibility(state) {
  document.querySelectorAll("[data-module]").forEach(el => {
    const mod = el.dataset.module;
    const active = !!state[mod];
    el.classList.toggle("module-active", active);
  });

  if (!state.quran) {
    // v0.5.8 — ألغِ تفعيل اسم السورة تلقائياً
    const snameOn = document.getElementById("sname-on");
    if (snameOn && snameOn.checked) {
      snameOn.checked = false;
      const snameCtrl = document.getElementById("sname-ctrl");
      if (snameCtrl) snameCtrl.style.display = "none";
    }
    const recBtn = document.querySelector('.tab-btn[data-tab="rec"]');
    if (recBtn && recBtn.classList.contains("on")) {
      const sceneBtn = document.querySelector('.tab-btn[data-tab="scene"]');
      if (sceneBtn) sceneBtn.click();
    }
    if (typeof stopRecitationAudio === "function") {
      try { stopRecitationAudio(); } catch (_) {}
    }
    if (typeof _recGen !== "undefined") { try { _recGen++; } catch (_) {} }
    const hasQuranVerses = S.verses?.some(v => !v.free);
    if (hasQuranVerses) {
      if (S.playing) { try { togglePlay(); } catch (_) {} }
      S.verses = [];
      S.translations = [];
      S.currentAya = 0;
      S.elapsed = 0;
      S.ayaDurations = [];
      const ayaInfo = document.getElementById("aya-info");
      if (ayaInfo) ayaInfo.textContent = "⏸️ وحدة القرآن مُلغاة — لا توجد آيات محمّلة";
      if (typeof updateAyaUI === "function") updateAyaUI();
    }
  }
}

function isModuleActive(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(MODULES_KEY) || "{}");
    if (key in stored) return !!stored[key];
    return !!MODULES[key]?.default;
  } catch (_) { return !!MODULES[key]?.default; }
}

function initModuleManager() {
  const state = loadModuleStates();
  enforceSingleModuleActive(state);
  applyModuleVisibility(state);

  for (const key of Object.keys(MODULES)) {
    const cb = document.getElementById(`mod-${key}`);
    if (!cb) continue;
    cb.checked = state[key];
    if (!MODULES[key].impl) {
      cb.disabled = true;
      cb.checked = state[key];
    }
    cb.addEventListener("change", () => {
      // v0.8.14 — المنع المتبادل
      if (cb.checked) {
        for (const otherKey of Object.keys(MODULES)) {
          if (otherKey === key) continue;
          if (state[otherKey]) {
            state[otherKey] = false;
            const otherCb = document.getElementById(`mod-${otherKey}`);
            if (otherCb && otherCb.checked) otherCb.checked = false;
          }
        }
      }
      state[key] = cb.checked;
      persistModuleStates(state);
      applyModuleVisibility(state);
      if (typeof toast === "function") {
        const verb = cb.checked ? "تفعيل" : "إلغاء";
        toast(`${verb} وحدة ${MODULES[key].label}`, "info", 1800);
      }
    });
  }
  console.log("[SIRM] Module Manager initialized (mutex):", state);
}

function enforceSingleModuleActive(state) {
  let found = null;
  for (const key of Object.keys(MODULES)) {
    if (state[key]) {
      if (found === null) found = key;
      else state[key] = false;
    }
  }
  if (found === null) state.quran = true;
}

// ══════════════════════════════════════════════════════
//  FREE TEXT EDITOR (v0.4.0)
// ══════════════════════════════════════════════════════
function parseFreeText(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean);
}

function updateFreeTextStats() {
  const ta = document.getElementById("free-text-area");
  const stats = document.getElementById("free-text-stats");
  if (!ta || !stats) return;
  const slices = parseFreeText(ta.value);
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);
  const total = slices.length * effDur;
  let suffix = "";
  if (Math.abs(effDur - baseDur) > 0.05 && slices.length > 0) {
    suffix = ` · 🔄 مُتزامن مع الصوت (${effDur.toFixed(1)}s/شريحة)`;
  }
  stats.textContent = `${slices.length} شريحة · ${total.toFixed(1)} ثانية${suffix}`;
}

function calcEffectiveSliceDuration(numSlices, baseDur) {
  if (numSlices <= 0) return baseDur;
  const autoSync = !!ge("free-auto-sync");
  if (!autoSync) return baseDur;
  const targetTotal = getActiveAudioDuration();
  if (targetTotal == null) return baseDur;
  return Math.max(0.5, targetTotal / numSlices);
}

// v0.8.5 — مصدر صوتيّ نشط مُوحَّد
function getActiveAudioDuration() {
  // v0.14 — الوَضع الصامت: المدّة من silent-total-dur
  if (ge("silent-mode")) {
    const dur = parseFloat(document.getElementById("silent-total-dur")?.value || 30);
    return Math.max(1, dur);
  }
  if (ge("recvid-on") && S.recVidEl && isFinite(S.recVidEl.duration) && S.recVidEl.duration > 0.5) {
    return S.recVidEl.duration;
  }
  if (S.freeAudioTrim && ge("free-audio-trim-on")) {
    return Math.max(0.5, S.freeAudioTrim.end - S.freeAudioTrim.start);
  }
  if (S.bgAudioEl && isFinite(S.bgAudioEl.duration) && S.bgAudioEl.duration > 0.5 && ge("free-audio-on")) {
    return S.bgAudioEl.duration;
  }
  return null;
}

// v0.8.6 — معالج موحَّد لزرّ "🎚️"
function openPerSliceSmart() {
  // v0.13.0 — افتح الـ<details class="sec"> الحاوية إن كانت مَطويّة
  const perSliceCb = document.getElementById("free-per-slice");
  const sec = perSliceCb?.closest("details.sec");
  if (sec && !sec.open) sec.open = true;
  if (perSliceCb && !perSliceCb.checked) {
    perSliceCb.checked = true;
    perSliceCb.dispatchEvent(new Event("change", { bubbles: true }));
  }
  S.freePerSlice = null;
  if (typeof buildPerSliceList === "function") buildPerSliceList();
  if (typeof syncVersesToActiveAudio === "function") syncVersesToActiveAudio();
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  setTimeout(() => {
    const t = document.getElementById("free-per-slice-ctrl") || document.getElementById("free-per-slice-list") || sec;
    if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 150);
}

function syncVersesToActiveAudio() {
  if (!Array.isArray(S.verses) || !S.verses.length) return false;
  const isText = S.verses.every(v => v && (v.free || v.hadith) && !v.recvid);
  if (!isText) return false;
  const audioDur = getActiveAudioDuration();
  if (audioDur == null) return false;
  if (!Array.isArray(S.ayaDurations)) S.ayaDurations = [];
  // v0.13.0 — احترام التَجميد
  const items = S.freePerSlice || [];
  const hasLocks = items.length === S.verses.length && items.some(it => it.locked);
  if (hasLocks) {
    const lockedSum = items.reduce((s, it) =>
      (it.locked && it.enabled !== false) ? s + (it.dur || 0) : s, 0);
    const unlockedCount = items.filter(it => !it.locked && it.enabled !== false).length;
    const remaining = Math.max(0, audioDur - lockedSum);
    const perUnlocked = unlockedCount > 0 ? Math.max(0.5, remaining / unlockedCount) : 0;
    items.forEach((it, i) => {
      if (it.enabled === false) it.dur = 0.001;
      else if (!it.locked) it.dur = perUnlocked;
      const dur = it.dur;
      if (S.verses[i]) S.verses[i].manualDuration = dur;
      S.ayaDurations[i] = dur;
    });
    return true;
  }
  const enabled = S.verses.map((v, i) => v.enabled !== false ? i : -1).filter(i => i >= 0);
  if (!enabled.length) return false;
  const per = audioDur / enabled.length;
  S.verses.forEach((v, i) => {
    if (v.enabled === false) { v.manualDuration = 0.001; S.ayaDurations[i] = 0.001; }
    else { v.manualDuration = per; S.ayaDurations[i] = per; }
  });
  if (Array.isArray(S.freePerSlice) && S.freePerSlice.length === S.verses.length) {
    S.freePerSlice.forEach((s, i) => { if (s.enabled !== false) s.dur = per; });
  }
  return true;
}

// ── v0.5.1 — التوقيت التفصيلي ──
// v0.8.3 — يبني القائمة من المصدر النشط
function buildPerSliceList() {
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const old = Array.isArray(S.freePerSlice) ? S.freePerSlice : [];
  if (Array.isArray(S.verses) && S.verses.length && S.verses.every(v => v && (v.free || v.hadith))) {
    S.freePerSlice = S.verses.map((v, i) => ({
      text: v.text || "",
      dur: (old[i] && old[i].text === v.text) ? old[i].dur : (v.manualDuration || baseDur),
      enabled: v.enabled !== false,
      locked: !!(old[i] && old[i].text === v.text && old[i].locked),
    }));
    return S.freePerSlice;
  }
  const ta = document.getElementById("free-text-area");
  if (!ta) return [];
  const slices = parseFreeText(ta.value);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);
  S.freePerSlice = slices.map((text, i) => ({
    text,
    dur: (old[i] && old[i].text === text) ? old[i].dur : effDur,
    enabled: true,
    locked: !!(old[i] && old[i].text === text && old[i].locked),
  }));
  return S.freePerSlice;
}

function renderPerSliceList() {
  const list = document.getElementById("free-per-slice-list");
  if (!list) return;
  const items = S.freePerSlice || [];
  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--t3);padding:12px;font-size:11px">اكتب نصّاً أعلاه ثم اضغط 🔄 توليد القائمة</div>';
    const s = document.getElementById("free-per-slice-stats");
    if (s) s.textContent = "";
    return;
  }
  list.innerHTML = items.map((it, i) => {
    const en = it.enabled !== false;
    const lk = !!it.locked;
    return `
    <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--b1);${en ? "" : "opacity:0.45"}${lk ? ";background:rgba(220,180,30,0.06)" : ""}">
      <input type="checkbox" data-slice-enable="${i}" ${en ? "checked" : ""} title="تفعيل/إلغاء الشريحة" style="flex-shrink:0;cursor:pointer">
      <span style="color:var(--al);font-size:10px;font-weight:700;flex-shrink:0;width:24px;text-align:center">${i + 1}</span>
      <span style="flex:1;font-size:11px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl" title="${escapeHtml(it.text)}">${escapeHtml(it.text)}</span>
      <button type="button" data-slice-lock="${i}" title="${lk ? "إلغاء التَجميد — السَماح بإعادة التَوزيع" : "تَجميد المدّة — لا تَتَغيَّر عند تَعديل شَرائح أخرى"}" style="padding:2px 6px;flex-shrink:0;font-size:13px;background:${lk ? "rgba(220,180,30,0.2)" : "var(--bg2)"};border:1px solid ${lk ? "#dcb41e" : "var(--b1)"};border-radius:4px;cursor:pointer;color:${lk ? "#dcb41e" : "var(--t2)"}">${lk ? "🔒" : "🔓"}</button>
      <input type="number" min="0.5" max="60" step="0.1" value="${it.dur.toFixed(1)}" data-slice-idx="${i}" class="fc" style="width:64px;font-size:11px;padding:3px 5px" ${(en && !lk) ? "" : "disabled"}>
      <span style="font-size:9px;color:var(--t3)">ث</span>
    </div>
  `;
  }).join("");
  list.querySelectorAll("input[data-slice-idx]").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.dataset.sliceIdx);
      const v = Math.max(0.5, parseFloat(inp.value) || 0);
      if (!S.freePerSlice[idx]) return;
      if (S.freePerSlice[idx].locked) return;
      const lock = !!ge("free-per-slice-lock");
      if (lock) {
        redistributePerSliceFromEdit(idx, v);
        renderPerSliceList();
      } else {
        S.freePerSlice[idx].dur = v;
        updatePerSliceStats();
      }
      syncPerSliceToPlayback();
    });
  });
  list.querySelectorAll("input[data-slice-enable]").forEach(cb => {
    cb.addEventListener("change", () => {
      const idx = parseInt(cb.dataset.sliceEnable);
      if (!S.freePerSlice[idx]) return;
      S.freePerSlice[idx].enabled = cb.checked;
      if (S.verses[idx]) S.verses[idx].enabled = cb.checked;
      renderPerSliceList();
      updatePerSliceStats();
    });
  });
  // v0.13.0 — زرّ تَجميد لكلّ شريحة
  list.querySelectorAll("button[data-slice-lock]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.sliceLock);
      if (!S.freePerSlice[idx]) return;
      S.freePerSlice[idx].locked = !S.freePerSlice[idx].locked;
      renderPerSliceList();
      updatePerSliceStats();
    });
  });
  updatePerSliceStats();
}

function syncPerSliceToPlayback() {
  const items = S.freePerSlice || [];
  if (!items.length) return;
  if (!Array.isArray(S.verses) || !S.verses.length) return;
  const allFree = S.verses.every(v => v && (v.free === true || v.audio === null));
  if (!allFree || S.verses.length !== items.length) return;
  items.forEach((it, i) => {
    if (S.verses[i]) S.verses[i].manualDuration = it.dur;
    S.ayaDurations[i] = it.dur;
  });
  if (typeof updateAyaUI === "function") updateAyaUI();
}

// v0.13.0 — إعادة توزيع مع احترام الشَرائح المُجمَّدة
function redistributePerSliceFromEdit(changedIdx, newDur) {
  const items = S.freePerSlice || [];
  if (!items.length || changedIdx < 0 || changedIdx >= items.length) return;
  const MIN = 0.5;
  const total = items.reduce((s, it) => s + (it.dur || 0), 0);
  const absorbers = items
    .map((it, i) => ({ it, i }))
    .filter(({ it, i }) => i !== changedIdx && !it.locked && it.enabled !== false);
  const fixedSum = items.reduce((s, it, i) =>
    (i !== changedIdx && (it.locked || it.enabled === false)) ? s + (it.dur || 0) : s, 0);
  if (absorbers.length === 0) {
    items[changedIdx].dur = Math.max(MIN, total - fixedSum);
    return;
  }
  const maxNew = total - fixedSum - absorbers.length * MIN;
  const finalNew = Math.max(MIN, Math.min(maxNew, newDur));
  items[changedIdx].dur = finalNew;
  const remainder = total - finalNew - fixedSum;
  const absorbersSum = absorbers.reduce((s, a) => s + (a.it.dur || 0), 0);
  absorbers.forEach(({ it }) => {
    const share = absorbersSum > 0 ? (it.dur / absorbersSum) : (1 / absorbers.length);
    it.dur = Math.max(MIN, remainder * share);
  });
  const actualTotal = items.reduce((s, it) => s + (it.dur || 0), 0);
  const drift = total - actualTotal;
  if (Math.abs(drift) > 0.001) {
    for (let i = absorbers.length - 1; i >= 0; i--) {
      const candidate = absorbers[i].it.dur + drift;
      if (candidate >= MIN) { absorbers[i].it.dur = candidate; break; }
    }
  }
}

function updatePerSliceStats() {
  const stats = document.getElementById("free-per-slice-stats");
  if (!stats) return;
  const items = S.freePerSlice || [];
  const total = items.reduce((sum, it) => sum + (it.dur || 0), 0);
  let audioInfo = "";
  if (S.freeAudioTrim && ge("free-audio-trim-on")) {
    const a = S.freeAudioTrim.end - S.freeAudioTrim.start;
    const diff = total - a;
    audioInfo = ` · 🎵 صوت: ${a.toFixed(1)}s · فرق: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}s`;
  } else if (S.bgAudioEl && isFinite(S.bgAudioEl.duration) && ge("free-audio-on")) {
    const a = S.bgAudioEl.duration;
    const diff = total - a;
    audioInfo = ` · 🎵 صوت: ${a.toFixed(1)}s · فرق: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}s`;
  }
  stats.textContent = `${items.length} شريحة · إجمالي: ${total.toFixed(1)}s${audioInfo}`;
}

function distributePerSlice() {
  const items = S.freePerSlice || [];
  if (!items.length) return;
  let audioDur = null;
  if (S.freeAudioTrim && ge("free-audio-trim-on")) {
    audioDur = S.freeAudioTrim.end - S.freeAudioTrim.start;
  } else if (S.bgAudioEl && isFinite(S.bgAudioEl.duration) && ge("free-audio-on")) {
    audioDur = S.bgAudioEl.duration;
  }
  if (audioDur == null) {
    toast?.("⚠️ لا يوجد صوت مخصّص للتوزيع عليه", "warn", 1800);
    return;
  }
  const each = audioDur / items.length;
  items.forEach(it => it.dur = each);
  renderPerSliceList();
  syncPerSliceToPlayback();
  toast?.(`⚖️ تمّ التوزيع: ${each.toFixed(1)}s/شريحة`, "success", 1500);
}

function togglePerSliceVisibility() {
  const cb = document.getElementById("free-per-slice");
  const ctrl = document.getElementById("free-per-slice-ctrl");
  if (!cb || !ctrl) return;
  ctrl.style.display = cb.checked ? "block" : "none";
  if (cb.checked) {
    buildPerSliceList();
    renderPerSliceList();
  }
  try { localStorage.setItem("gt_sirm_free_per_slice", cb.checked ? "1" : "0"); } catch (_) {}
}

function applyFreeText() {
  const ta = document.getElementById("free-text-area");
  if (!ta) return;
  const slices = parseFreeText(ta.value);
  if (!slices.length) {
    toast?.("⚠️ لا يوجد نصّ لتطبيقه", "warn", 2000);
    return;
  }
  // v0.8.3
  const hadithPrev = document.getElementById("hadith-preview");
  const hadithApply = document.getElementById("apply-hadith-btn");
  const hadithSlices = document.getElementById("open-per-slice-from-hadith");
  if (hadithPrev) hadithPrev.style.display = "none";
  if (hadithApply) hadithApply.style.display = "none";
  if (hadithSlices) hadithSlices.style.display = "none";
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const source = document.getElementById("free-source")?.value?.trim() || "";
  const perSliceMode = !!ge("free-per-slice") && Array.isArray(S.freePerSlice) && S.freePerSlice.length === slices.length;
  const dur = calcEffectiveSliceDuration(slices.length, baseDur);
  const adjusted = !perSliceMode && Math.abs(dur - baseDur) > 0.05;

  S.verses = slices.map((text, i) => ({
    text,
    numberInSurah: i + 1,
    number: i + 1,
    audio: null,
    audioSecondary: [],
    manualDuration: perSliceMode ? (S.freePerSlice[i]?.dur || dur) : dur,
    free: true,
    source,
  }));
  S.currentAya = 0;
  S.elapsed = 0;
  S.useFreeAsSource = true;

  // ✨ تنظيف بقايا جلسة سابقة
  S.translations = [];
  // v0.5.5 — ملء ayaDurations من manualDuration لكلّ شريحة (المعاينة تقرأ منها)
  S.ayaDurations = S.verses.map(v => v.manualDuration || dur);

  if (S.recAudioEl) { try { S.recAudioEl.pause(); S.recAudioEl.src = ""; } catch (_) {} }
  if (S.recAudioSource) {
    try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (_) {}
    S.recAudioSource = null;
  }
  if (S.bgAudioEl) {
    try {
      S.bgAudioEl.pause();
      S.bgAudioEl.currentTime = S.freeAudioTrim?.start || 0;
    } catch (_) {}
  }

  const autoDurCb = document.getElementById("auto-dur");
  const ayaDurEl = document.getElementById("aya-dur");
  if (autoDurCb && autoDurCb.checked) {
    autoDurCb.checked = false;
    autoDurCb.dispatchEvent(new Event("change"));
  }
  if (ayaDurEl) {
    ayaDurEl.value = dur;
    ayaDurEl.dispatchEvent(new Event("input"));
  }

  if (S.playing) { try { togglePlay(); } catch (_) {} }
  if (typeof updateAyaInfo === "function") updateAyaInfo();

  // v0.8.5
  const freeSlicesBtn = document.getElementById("open-per-slice-from-free");
  if (freeSlicesBtn) freeSlicesBtn.style.display = "block";

  const totalSec = perSliceMode
    ? S.verses.reduce((sum, v) => sum + (v.manualDuration || 0), 0).toFixed(1)
    : (slices.length * dur).toFixed(1);
  const msg = perSliceMode
    ? `⏱️ تطبيق ${slices.length} شريحة بتوقيت تفصيليّ (إجمالي ${totalSec}s)`
    : adjusted
      ? `🔗 تطبيق ${slices.length} شريحة · ${dur.toFixed(1)}s/شريحة (مُتزامن مع الصوت) · إجمالي ${totalSec}s`
      : `🔗 تطبيق ${slices.length} شريحة كمصدر التلاوة (${totalSec}s)`;
  toast?.(msg, "success", 2500);
}

function restartFreeText() {
  if (!S.verses || !S.verses.length) {
    toast?.("⚠️ لا يوجد نصّ حرّ مطبَّق", "warn", 1500);
    return;
  }
  const wasPlaying = !!S.playing;
  if (S.playing) { try { togglePlay(); } catch (_) {} }

  S.currentAya = 0;
  S.elapsed = 0;

  if (S.bgAudioEl) {
    try {
      S.bgAudioEl.pause();
      S.bgAudioEl.currentTime = S.freeAudioTrim?.start || 0;
    } catch (_) {}
  }
  if (S.recAudioEl) {
    try { S.recAudioEl.pause(); S.recAudioEl.currentTime = 0; } catch (_) {}
  }
  if (S.bgVid) {
    try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {}
  }

  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();

  toast?.("↺ إعادة من البداية", "info", 1500);

  if (wasPlaying) {
    setTimeout(() => { try { togglePlay(); } catch (_) {} }, 50);
  }
}

// ↺ زرّ "إعادة من البداية" في المشغّل — يُعيد كلّ شيء (نصّ + صوت + خلفية)
function restartAll() {
  // v0.13.1 — اِسمَح بالإعادة لمُجرَّد الصَوت بدون آيات
  const hasCustomAudio = ge("free-audio-on") && S.bgAudioEl;
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!S.verses.length && !hasCustomAudio && !recvidActive) {
    toast?.("⚠️ لا توجد آيات/شرائح للتشغيل", "warn", 1500);
    return;
  }
  const wasPlaying = !!S.playing;
  if (S.playing) { try { togglePlay(); } catch (_) {} }

  S.currentAya = 0;
  S.elapsed = 0;

  if (S.recAudioEl) {
    try { S.recAudioEl.pause(); S.recAudioEl.currentTime = 0; } catch (_) {}
  }
  if (S.recAudioSource) {
    try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (_) {}
    S.recAudioSource = null;
  }
  if (S.bgAudioEl) {
    try {
      S.bgAudioEl.pause();
      S.bgAudioEl.currentTime = S.freeAudioTrim?.start || 0;
    } catch (_) {}
  }
  if (S.bgVid) {
    try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {}
  }
  if (Array.isArray(S.bgVidItems) && S.bgVidItems.length) {
    S.bgVidActiveIdx = 0;
    S.bgVidItems.forEach(it => {
      if (it.vid) {
        try {
          it.vid.pause();
          it.vid.currentTime = (typeof getBgClipTrimStart === "function") ? getBgClipTrimStart(it) : 0;
        } catch (_) {}
      }
    });
    // v1.2 fix — S.bgVid يَجِب أن يُشير لِلمَقطع الأَوّل بَعد restart
    S.bgVid = S.bgVidItems[0].vid;
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
    const prev = $("bg-vid-preview");
    if (prev) prev.src = S.bgVidItems[0].url;
  }
  // v1.1.0 — فيديو التِلاوة الجاهز (نُعيده صَراحةً هُنا لأنّ pausePlayer لَم يَعُد يُعيده)
  if (S.recVidEl) {
    try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {}
  }

  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();

  toast?.("↺ إعادة الكلّ من البداية", "info", 1500);

  if (wasPlaying) {
    setTimeout(() => { try { togglePlay(); } catch (_) {} }, 60);
  }
}

function disableFreeAsSource() {
  S.useFreeAsSource = false;
  S.verses = [];
  S.currentAya = 0;
  S.elapsed = 0;
  if (S.playing) { try { togglePlay(); } catch (_) {} }
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof loadVerses === "function") {
    try { loadVerses(); } catch (_) {}
  }
}

function handleFreeAudioFile(file) {
  if (!file) return;
  const info = document.getElementById("free-audio-info");

  // أظهر الاسم فوراً
  if (info) info.textContent = `📁 ${file.name} · ${(file.size / 1e6).toFixed(1)}MB · جاري القراءة...`;

  if (S.freeAudioUrl) {
    try { URL.revokeObjectURL(S.freeAudioUrl); } catch (_) {}
  }
  const url = URL.createObjectURL(file);
  S.freeAudioFile = file;
  S.freeAudioUrl = url;

  const probe = new Audio();
  probe.addEventListener("loadedmetadata", () => {
    if (!isFinite(probe.duration)) return;
    const min = Math.floor(probe.duration / 60);
    const sec = Math.round(probe.duration % 60);
    if (info) info.textContent = `📁 ${file.name} · ${min}:${String(sec).padStart(2, "0")} · ${(file.size / 1e6).toFixed(1)}MB`;
    const endInp = document.getElementById("free-audio-trim-end");
    if (endInp) {
      const cur = parseFloat(endInp.value);
      if (cur === 30 || cur === 0 || !isFinite(cur)) {
        endInp.value = probe.duration.toFixed(1);
      }
    }
  }, { once: true });
  probe.addEventListener("error", () => {
    if (info) info.textContent = `📁 ${file.name} · ${(file.size / 1e6).toFixed(1)}MB`;
  }, { once: true });
  probe.src = url;

  // اربطه عبر onBgAudio الموجود
  if (typeof onBgAudio === "function") {
    try { onBgAudio({ files: [file] }); } catch (e) { console.warn("[SIRM] onBgAudio failed:", e); }
  }

  const removeBtn = document.getElementById("free-audio-remove-btn");
  if (removeBtn) removeBtn.style.display = "inline-block";
  const restartBtn = document.getElementById("free-audio-restart-btn");
  if (restartBtn) restartBtn.style.display = "inline-block";

  setTimeout(() => {
    if (ge("free-audio-trim-on")) applyFreeAudioTrim();
  }, 120);

  toast?.(`🎵 تمّ تحميل: ${file.name}`, "success", 1800);
}

function restartFreeAudio() {
  if (!S.bgAudioEl) {
    toast?.("⚠️ لا يوجد صوت مخصّص محمَّل", "warn", 1500);
    return;
  }
  const start = S.freeAudioTrim?.start || 0;
  const wasPlaying = !S.bgAudioEl.paused;
  try {
    S.bgAudioEl.pause();
    S.bgAudioEl.currentTime = start;
    if (wasPlaying) S.bgAudioEl.play().catch(() => {});
  } catch (_) {}
  toast?.(`↺ إعادة الصوت إلى ${start.toFixed(1)}s`, "info", 1500);
}

function removeFreeAudio() {
  if (S.freeAudioUrl) {
    try { URL.revokeObjectURL(S.freeAudioUrl); } catch (_) {}
  }
  S.freeAudioFile = null;
  S.freeAudioUrl = null;
  if (S.bgAudioEl) {
    try { S.bgAudioEl.pause(); S.bgAudioEl.src = ""; } catch (_) {}
    S.bgAudioEl = null;
  }
  if (S.bgAudioSource) {
    try { S.bgAudioSource.disconnect(); } catch (_) {}
    S.bgAudioSource = null;
  }
  const input = document.getElementById("free-audio-file");
  if (input) input.value = "";
  const info = document.getElementById("free-audio-info");
  if (info) info.textContent = "";
  const bgInfo = document.getElementById("bg-audio-info");
  if (bgInfo) bgInfo.textContent = "";
  const removeBtn = document.getElementById("free-audio-remove-btn");
  if (removeBtn) removeBtn.style.display = "none";
  const restartBtn = document.getElementById("free-audio-restart-btn");
  if (restartBtn) restartBtn.style.display = "none";

  clearFreeAudioTrim();
  const trimCb = document.getElementById("free-audio-trim-on");
  if (trimCb && trimCb.checked) {
    trimCb.checked = false;
    const trimCtrl = document.getElementById("free-audio-trim-ctrl");
    if (trimCtrl) trimCtrl.style.display = "none";
  }

  toast?.("🗑️ أُزيل ملفّ الصوت", "info", 1500);
}

function toggleFreeTextVisibility() {
  const cb = document.getElementById("free-text-on");
  const ctrl = document.getElementById("free-text-ctrl");
  if (!cb || !ctrl) return;
  ctrl.style.display = cb.checked ? "block" : "none";
  if (!cb.checked && S.useFreeAsSource && !ge("quran-text-only")) {
    // v1.2 — النَصّ في textarea مَحفوظ، فَقط المَشهد يَعود
    disableFreeAsSource();
    toast?.("👁️‍🗨️ أُخفِيَ النَصّ الحرّ — نَصّك مَحفوظ في الحَقل لاستخدامه لاحِقاً", "info", 2200);
  } else if (cb.checked) {
    // v1.2 — تَفعيل: طَبِّق النَصّ تلقائياً إن كان مَوجوداً
    const ta = document.getElementById("free-text-area");
    if (ta && ta.value.trim() && typeof applyFreeText === "function") {
      setTimeout(() => { try { applyFreeText(); } catch (_) {} }, 100);
      toast?.("✅ استعادة النَصّ الحرّ من الحَقل", "success", 1400);
    }
  }
  try { localStorage.setItem("gt_sirm_free_text_on", cb.checked ? "1" : "0"); } catch (_) {}
}

function toggleFreeAudioVisibility() {
  const cb = document.getElementById("free-audio-on");
  const ctrl = document.getElementById("free-audio-ctrl");
  if (!cb || !ctrl) return;
  ctrl.style.display = cb.checked ? "block" : "none";
  if (!cb.checked && S.freeAudioFile) {
    removeFreeAudio();
  }
  try { localStorage.setItem("gt_sirm_free_audio_on", cb.checked ? "1" : "0"); } catch (_) {}
}

function toggleFreeAudioTrim() {
  const cb = document.getElementById("free-audio-trim-on");
  const ctrl = document.getElementById("free-audio-trim-ctrl");
  if (!cb || !ctrl) return;
  ctrl.style.display = cb.checked ? "block" : "none";
  if (cb.checked) applyFreeAudioTrim();
  else clearFreeAudioTrim();
}

function applyFreeAudioTrim() {
  const startInp = document.getElementById("free-audio-trim-start");
  const endInp = document.getElementById("free-audio-trim-end");
  const info = document.getElementById("free-audio-trim-info");
  if (!startInp || !endInp) return;
  let start = Math.max(0, parseFloat(startInp.value) || 0);
  let end = Math.max(start + 0.1, parseFloat(endInp.value) || start + 1);
  if (S.bgAudioEl && isFinite(S.bgAudioEl.duration) && S.bgAudioEl.duration > 0) {
    if (end > S.bgAudioEl.duration) { end = S.bgAudioEl.duration; endInp.value = end.toFixed(1); }
    if (start >= end) { start = Math.max(0, end - 0.1); startInp.value = start.toFixed(1); }
  }
  S.freeAudioTrim = { start, end };
  if (info) info.textContent = `📐 المدّة المختارة: ${(end - start).toFixed(1)}s`;
  // v0.8.6 — أعِد التوزيع
  if (typeof syncVersesToActiveAudio === "function" && syncVersesToActiveAudio()) {
    if (typeof renderPerSliceList === "function") renderPerSliceList();
    if (typeof updateAyaInfo === "function") updateAyaInfo();
    if (typeof updateAyaUI === "function") updateAyaUI();
  }
  // v0.8.13 — تعطيل loop الأصليّ + لفّ يدويّ داخل [start, end]
  if (S.bgAudioEl) {
    try {
      S.bgAudioEl.loop = false;
      S.bgAudioEl.currentTime = start;
    } catch (_) {}
    if (S.bgAudioEl._freeTrimHandler) {
      try { S.bgAudioEl.removeEventListener("timeupdate", S.bgAudioEl._freeTrimHandler); } catch (_) {}
    }
    if (S.bgAudioEl._freeTrimEndedHandler) {
      try { S.bgAudioEl.removeEventListener("ended", S.bgAudioEl._freeTrimEndedHandler); } catch (_) {}
    }
    S.bgAudioEl._freeTrimHandler = () => {
      if (!S.freeAudioTrim) return;
      if (S.bgAudioEl.currentTime >= S.freeAudioTrim.end - 0.05) {
        try {
          S.bgAudioEl.currentTime = S.freeAudioTrim.start;
          if (S.bgAudioEl.paused && !S.bgAudioEl.ended) {
            S.bgAudioEl.play().catch(() => {});
          }
        } catch (_) {}
      }
    };
    S.bgAudioEl.addEventListener("timeupdate", S.bgAudioEl._freeTrimHandler);
    S.bgAudioEl._freeTrimEndedHandler = () => {
      if (!S.freeAudioTrim) return;
      try {
        S.bgAudioEl.currentTime = S.freeAudioTrim.start;
        S.bgAudioEl.play().catch(() => {});
      } catch (_) {}
    };
    S.bgAudioEl.addEventListener("ended", S.bgAudioEl._freeTrimEndedHandler);
  }
}

function clearFreeAudioTrim() {
  S.freeAudioTrim = null;
  const info = document.getElementById("free-audio-trim-info");
  if (info) info.textContent = "";
  if (S.bgAudioEl) {
    if (S.bgAudioEl._freeTrimHandler) {
      try { S.bgAudioEl.removeEventListener("timeupdate", S.bgAudioEl._freeTrimHandler); } catch (_) {}
      S.bgAudioEl._freeTrimHandler = null;
    }
    if (S.bgAudioEl._freeTrimEndedHandler) {
      try { S.bgAudioEl.removeEventListener("ended", S.bgAudioEl._freeTrimEndedHandler); } catch (_) {}
      S.bgAudioEl._freeTrimEndedHandler = null;
    }
    try { S.bgAudioEl.loop = ge("bg-loop"); } catch (_) {}
  }
}

function clearFreeText() {
  const ta = document.getElementById("free-text-area");
  if (ta) ta.value = "";
  updateFreeTextStats();
}

function loadFreeTemplates() {
  try { return JSON.parse(localStorage.getItem(FREE_TPL_KEY) || "[]"); }
  catch (_) { return []; }
}

function persistFreeTemplates(arr) {
  try { localStorage.setItem(FREE_TPL_KEY, JSON.stringify(arr)); } catch (_) {}
}

function renderFreeTemplates() {
  const list = document.getElementById("free-tpl-list");
  if (!list) return;
  const tpls = loadFreeTemplates();
  if (!tpls.length) {
    list.innerHTML = `<div style="color:var(--t3);font-size:11px;padding:6px">لا توجد قوالب محفوظة بعد</div>`;
    return;
  }
  list.innerHTML = tpls.map((t, i) => `
    <div style="display:flex;gap:4px;align-items:center;background:var(--bg2);border:1px solid var(--b1);border-radius:var(--r);padding:5px 8px">
      <span style="flex:1;font-size:11px;color:var(--t1)">${escapeHtml(t.name || "بدون اسم")}</span>
      <span style="font-size:9px;color:var(--t3)">${(t.slices || 0)} شريحة</span>
      <button class="btn btn-g bsm" data-tpl-load="${i}" style="padding:2px 8px">↩</button>
      <button class="btn btn-g bsm" data-tpl-del="${i}" style="padding:2px 8px;color:var(--danger)">✕</button>
    </div>
  `).join("");
  list.querySelectorAll("[data-tpl-load]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.tplLoad, 10);
      const tpl = loadFreeTemplates()[idx];
      if (tpl && tpl.text != null) {
        document.getElementById("free-text-area").value = tpl.text;
        if (tpl.source != null) document.getElementById("free-source").value = tpl.source;
        if (tpl.dur != null) {
          const s = document.getElementById("free-slice-dur");
          if (s) { s.value = tpl.dur; s.dispatchEvent(new Event("input")); }
        }
        updateFreeTextStats();
        if (typeof toast === "function") toast(`📂 تمّ تحميل القالب: ${tpl.name}`, "info", 1500);
      }
    });
  });
  list.querySelectorAll("[data-tpl-del]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.tplDel, 10);
      const arr = loadFreeTemplates();
      arr.splice(idx, 1);
      persistFreeTemplates(arr);
      renderFreeTemplates();
      if (typeof toast === "function") toast("🗑️ حُذف القالب", "info", 1200);
    });
  });
}

function saveFreeTemplate() {
  const name = (document.getElementById("free-tpl-name")?.value || "").trim();
  const text = (document.getElementById("free-text-area")?.value || "").trim();
  const source = (document.getElementById("free-source")?.value || "").trim();
  const dur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  if (!name) { toast?.("⚠️ أدخل اسم القالب", "warn", 1800); return; }
  if (!text) { toast?.("⚠️ لا يوجد نصّ لحفظه", "warn", 1800); return; }
  const slices = parseFreeText(text).length;
  const arr = loadFreeTemplates();
  arr.push({ name, text, source, dur, slices, savedAt: Date.now() });
  persistFreeTemplates(arr);
  document.getElementById("free-tpl-name").value = "";
  renderFreeTemplates();
  toast?.(`💾 حُفظ القالب: ${name}`, "success", 1500);
}

// ══════════════════════════════════════════════════════
//  v0.8.0 — وحدة الحديث الشريف
// ══════════════════════════════════════════════════════
function initHadithModule() {
  const data = window.HADITH_DATA;
  if (!data || !Array.isArray(data.collections)) return;
  const collSel = document.getElementById("hadith-collection");
  const searchInp = document.getElementById("hadith-search");
  const hadithSel = document.getElementById("hadith-select");
  const preview = document.getElementById("hadith-preview");
  const applyBtn = document.getElementById("apply-hadith-btn");
  const slicesBtn = document.getElementById("open-per-slice-from-hadith");
  if (!collSel || !searchInp || !hadithSel) return;

  collSel.innerHTML = '<option value="">🔍 جميع المصادر (للبحث الموحَّد)</option>' +
    data.collections.map(c => `<option value="${c.id}">📜 ${c.name} (${c.hadiths.length})</option>`).join("");

  let currentColl = null;
  let currentHadiths = [];
  let selectedKey = null;

  const renderList = (list) => {
    if (!list.length) { hadithSel.innerHTML = '<option disabled>(لا نتائج)</option>'; return; }
    hadithSel.innerHTML = list.map(entry => {
      const h = entry.h || entry;
      const coll = entry.coll;
      const collTag = coll ? `[${coll.name.slice(0, 12)}] ` : "";
      const p = h.text.slice(0, 50).replace(/\s+/g, " ");
      const key = `${coll ? coll.id : currentColl?.id}#${h.n}`;
      return `<option value="${key}">${collTag}${h.n}. ${p}…</option>`;
    }).join("");
  };

  const showPreview = (h, coll) => {
    if (!h || !preview) {
      if (preview) preview.style.display = "none";
      if (applyBtn) applyBtn.style.display = "none";
      if (slicesBtn) slicesBtn.style.display = "none";
      return;
    }
    document.getElementById("hadith-prev-meta").innerHTML =
      `<span style="background:var(--bg2);padding:2px 6px;border-radius:3px">${coll ? coll.name + " · " : ""}حديث ${h.n}</span>` +
      `<span style="background:#1f4d2b;color:#bff5cf;padding:2px 6px;border-radius:3px">${h.grade || "صحيح"}</span>` +
      `<span style="color:var(--t2)">${h.chapter || ""}</span>`;
    document.getElementById("hadith-prev-text").textContent = h.text;
    document.getElementById("hadith-prev-narrator").textContent = "📖 " + (h.narrator || "");
    document.getElementById("hadith-prev-source").textContent = "📚 " + (h.source || "");
    preview.style.display = "block";
    if (applyBtn) applyBtn.style.display = "block";
  };

  const performSearch = () => {
    const q = normalizeArabic(searchInp.value.trim());
    if (currentColl) {
      if (!q) currentHadiths = currentColl.hadiths.map(h => ({ h, coll: currentColl }));
      else currentHadiths = currentColl.hadiths.filter(h => {
        const t = normalizeArabic(h.text + " " + (h.chapter || "") + " " + (h.narrator || ""));
        return t.includes(q);
      }).map(h => ({ h, coll: currentColl }));
    } else {
      const all = [];
      for (const coll of data.collections) {
        for (const h of coll.hadiths) {
          if (!q) { all.push({ h, coll }); continue; }
          const t = normalizeArabic(h.text + " " + (h.chapter || "") + " " + (h.narrator || ""));
          if (t.includes(q)) all.push({ h, coll });
        }
      }
      currentHadiths = all;
    }
    renderList(currentHadiths);
    showPreview(null);
  };

  collSel.addEventListener("change", () => {
    const id = collSel.value;
    currentColl = id ? (data.collections.find(c => c.id === id) || null) : null;
    searchInp.value = "";
    performSearch();
  });

  searchInp.addEventListener("input", performSearch);
  performSearch();

  hadithSel.addEventListener("change", () => {
    const key = hadithSel.value;
    if (!key) return;
    selectedKey = key;
    const [collId, nStr] = key.split("#");
    const n = parseInt(nStr);
    const coll = data.collections.find(c => c.id === collId);
    const h = coll ? coll.hadiths.find(x => x.n === n) : null;
    if (h) showPreview(h, coll);
  });

  if (applyBtn) applyBtn.addEventListener("click", () => {
    if (!selectedKey) { toast("⚠️ اختر حديثاً أوّلاً", "warn", 1500); return; }
    const [collId, nStr] = selectedKey.split("#");
    const n = parseInt(nStr);
    const coll = data.collections.find(c => c.id === collId);
    const h = coll ? coll.hadiths.find(x => x.n === n) : null;
    if (!h || !coll) { toast("⚠️ تعذّر إيجاد الحديث", "warn", 1500); return; }
    applyHadith(h, coll);
    if (slicesBtn) slicesBtn.style.display = "block";
  });

  // v0.8.6 — زرّ "🎚️" من الحديث: ذكيّ
  if (slicesBtn) slicesBtn.addEventListener("click", openPerSliceSmart);
}

// v0.8.4 — تركيب الحديث: راوي + قال رسول الله + متن
function parseHadithStructure(text) {
  const propheticPatterns = [
    /قَالَ\s+رَسُولُ\s+اللهِ\s+صَلَّى\s+اللَّهُ\s+عَلَيْهِ\s+وَسَلَّمَ/u,
    /قَالَ\s+رَسُولُ\s+الله\s+صَلَّى\s+الله\s+عَلَيْهِ\s+و?سَلَّمَ/u,
    /قَالَ\s+النَّبِيُّ\s+صَلَّى\s+اللَّهُ\s+عَلَيْهِ\s+وَسَلَّمَ/u,
    /قَالَ\s+رَسُولُ\s+الله\s+ﷺ/u,
    /قال\s+رسول\s+الله\s+صلى\s+الله\s+عليه\s+(?:و\s*)?سلم/u,
    /قال\s+النبيّ?\s+صلى\s+الله\s+عليه\s+(?:و\s*)?سلم/u,
  ];
  for (const pat of propheticPatterns) {
    const m = text.match(pat);
    if (!m) continue;
    const idx = m.index;
    let narratorPart = text.slice(0, idx).trim();
    const propheticPart = m[0].trim();
    let body = text.slice(idx + m[0].length).trim();
    body = body.replace(/^[\s:،]+/u, '').trim();
    narratorPart = narratorPart.replace(/\s*(?:قَالَ|قال)\s*$/u, '').trim();
    if (!narratorPart || !body) return null;
    return { narrator: narratorPart, prophetic: propheticPart, body };
  }
  return null;
}

function cleanHadithIsnad(text) {
  const struct = parseHadithStructure(text);
  if (struct) return `${struct.prophetic}: ${struct.body}`;
  const patterns = [
    /^.{0,250}?صَلَّى\s+اللَّهُ\s+عَلَيْهِ\s+وَسَلَّمَ\s*:\s*/u,
    /^.{0,250}?صلّ?ى\s+الله\s+عليه\s+و\s*سلّ?م\s*:\s*/u,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[0].length > 5 && m[0].length < text.length * 0.7) {
      const cleaned = text.slice(m[0].length).trim();
      if (cleaned.length > 10) return cleaned;
    }
  }
  return text;
}

// ══════════════════════════════════════════════════════
//  وحدة الأذكار (v0.9.0) — مأخوذة من GT-HISNMUSLIM
// ══════════════════════════════════════════════════════
function initAzkarModule() {
  const data = window.AZKAR_DATA;
  if (!data || !Array.isArray(data.categories)) return;
  const catSel = document.getElementById("azkar-category");
  const searchInp = document.getElementById("azkar-search");
  const azkarSel = document.getElementById("azkar-select");
  const preview = document.getElementById("azkar-preview");
  const applyBtn = document.getElementById("apply-azkar-btn");
  const slicesBtn = document.getElementById("open-per-slice-from-azkar");
  const searchClear = document.getElementById("azkar-search-clear");
  if (!catSel || !searchInp || !azkarSel) return;

  catSel.innerHTML = "";
  data.categories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat.id;
    o.textContent = `${cat.icon || "🕊️"} ${cat.name} (${cat.items.length})`;
    catSel.appendChild(o);
  });

  let currentCat = data.categories[0];
  let currentZikr = null;

  function renderAzkarList(filter) {
    azkarSel.innerHTML = "";
    const normFilter = filter ? normalizeArabic(filter.trim()) : "";
    let items = currentCat.items;
    if (normFilter) items = items.filter(it => normalizeArabic(it.text).includes(normFilter));
    items.forEach((it) => {
      const o = document.createElement("option");
      o.value = it.n;
      const previewT = it.text.length > 80 ? it.text.slice(0, 78) + "…" : it.text;
      o.textContent = `${it.n}. ${previewT}`;
      azkarSel.appendChild(o);
    });
    if (!items.length) {
      const o = document.createElement("option");
      o.disabled = true;
      o.textContent = "— لا نتائج —";
      azkarSel.appendChild(o);
    }
  }

  function selectZikr() {
    const id = parseInt(azkarSel.value);
    const it = currentCat.items.find(x => x.n === id);
    if (!it) return;
    currentZikr = it;
    const metaEl = document.getElementById("azkar-prev-meta");
    const textEl = document.getElementById("azkar-prev-text");
    const countEl = document.getElementById("azkar-prev-count");
    if (metaEl) metaEl.textContent = `${currentCat.icon || "🕊️"} ${currentCat.name} · ذكر رقم ${it.n}`;
    if (textEl) textEl.textContent = it.text;
    if (countEl) countEl.textContent = it.count > 1 ? `🔁 يُكرَّر ${it.count} مرّات` : "";
    preview.style.display = "block";
    applyBtn.style.display = "block";
    slicesBtn.style.display = "none";
  }

  catSel.addEventListener("change", () => {
    const id = parseInt(catSel.value);
    currentCat = data.categories.find(c => c.id === id) || data.categories[0];
    searchInp.value = "";
    if (searchClear) searchClear.style.display = "none";
    renderAzkarList("");
    preview.style.display = "none";
    applyBtn.style.display = "none";
    slicesBtn.style.display = "none";
  });

  searchInp.addEventListener("input", () => {
    renderAzkarList(searchInp.value);
    if (searchClear) searchClear.style.display = searchInp.value ? "inline-block" : "none";
  });
  if (searchClear) searchClear.addEventListener("click", () => {
    searchInp.value = "";
    searchClear.style.display = "none";
    renderAzkarList("");
  });

  azkarSel.addEventListener("change", selectZikr);
  azkarSel.addEventListener("dblclick", () => {
    selectZikr();
    if (currentZikr) applyAzkar(currentZikr, currentCat);
  });
  applyBtn.addEventListener("click", () => { if (currentZikr) applyAzkar(currentZikr, currentCat); });
  slicesBtn.addEventListener("click", openPerSliceSmart);

  renderAzkarList("");
}

// v0.9.1 — تقسيم ذكيّ للنصّ العربيّ يَحفظ ترتيب الجُمل والآيات
function splitArabicTextSmart(text, opts) {
  const { minLen = 18 } = opts || {};
  if (!text) return [];
  let s = String(text);
  const MARK = ' AYAH ';
  const ayahs = [];
  s = s.replace(/﴿([^﴾]+)﴾/gu, (_m, content) => {
    ayahs.push(content.trim());
    return ` ${MARK} `;
  });
  s = s.replace(/\(\(/g, ' ').replace(/\)\)/g, ' ');
  s = s.replace(/\[\[/g, ' ').replace(/\]\]/g, ' ');
  s = s.replace(/\(([^)]+)\)/g, ' $1 ');
  s = s.replace(/\[([^\]]+)\]/g, ' $1 ');
  s = s.replace(/\s+/g, ' ').trim();
  const segments = s.split(MARK);
  const all = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].trim();
    if (seg) {
      const parts = seg.split(/[.،؛؟!]+\s*/u).map(p => p.trim()).filter(Boolean);
      all.push(...parts);
    }
    if (i < ayahs.length) {
      const subs = ayahs[i].split(/[*۝۞]+\s*/u).map(p => p.trim()).filter(Boolean);
      all.push(...(subs.length ? subs : [ayahs[i]]));
    }
  }
  const out = [];
  for (const p of all) {
    if (out.length && p.length < minLen) out[out.length - 1] += '، ' + p;
    else out.push(p);
  }
  return out.length ? out : [s];
}

function applyAzkar(z, cat) {
  const freeTextOn = document.getElementById("free-text-on");
  if (freeTextOn && freeTextOn.checked) {
    freeTextOn.checked = false;
    freeTextOn.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const hadithPrev = document.getElementById("hadith-preview");
  const hadithApply = document.getElementById("apply-hadith-btn");
  const hadithSlices = document.getElementById("open-per-slice-from-hadith");
  if (hadithPrev) hadithPrev.style.display = "none";
  if (hadithApply) hadithApply.style.display = "none";
  if (hadithSlices) hadithSlices.style.display = "none";

  const text = z.text.trim();
  const repeatSlices = !!ge("azkar-repeat-slices");
  const smartSplit = !!ge("azkar-smart-split");
  const base = smartSplit ? splitArabicTextSmart(text) : [text];
  const slices = [];
  if (z.count > 1 && repeatSlices) {
    for (let i = 1; i <= z.count; i++) slices.push(...base);
  } else if (z.count > 1) {
    slices.push(`${text}\n\n(${z.count}× مرّات)`);
  } else {
    slices.push(...base);
  }

  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);

  S.verses = slices.map((t, i) => ({
    text: t, numberInSurah: i + 1, number: i + 1,
    audio: null, audioSecondary: [],
    manualDuration: effDur,
    free: true, azkar: true, enabled: true,
    source: `حصن المسلم · ${cat.name} · رقم ${z.n}${z.count > 1 ? " (×" + z.count + ")" : ""}`,
  }));
  S.ayaDurations = S.verses.map(v => v.manualDuration);
  S.currentAya = 0; S.elapsed = 0;
  S.useFreeAsSource = true; S.translations = [];

  S.freePerSlice = slices.map(t => ({ text: t, dur: effDur, enabled: true }));
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();

  const slicesBtn = document.getElementById("open-per-slice-from-azkar");
  if (slicesBtn) slicesBtn.style.display = "block";

  const audioActive = getActiveAudioDuration() != null;
  const msg = audioActive
    ? `🕊️ تمّ تطبيق الذكر (${slices.length} شريحة، ${effDur.toFixed(1)}s/شريحة 🔄 متزامن مع الصوت)`
    : `🕊️ تمّ تطبيق الذكر (${slices.length} شريحة، ${effDur.toFixed(1)}s)`;
  toast(msg, "success", 3000);
}

// v0.10.0 — مساعد موحَّد لتنظيف بقايا الوحدات الأخرى
function clearOtherSourcesUI() {
  const freeTextOn = document.getElementById("free-text-on");
  if (freeTextOn && freeTextOn.checked) {
    freeTextOn.checked = false;
    freeTextOn.dispatchEvent(new Event("change", { bubbles: true }));
  }
  ["hadith", "azkar", "asma", "duas", "hikam"].forEach(key => {
    const prev = document.getElementById(`${key}-preview`);
    const applyB = document.getElementById(`apply-${key}-btn`);
    const slicesB = document.getElementById(`open-per-slice-from-${key}`);
    if (prev) prev.style.display = "none";
    if (applyB) applyB.style.display = "none";
    if (slicesB) slicesB.style.display = "none";
  });
}

// ══════════════════════════════════════════════════════
//  وحدة أسماء الله الحسنى (v0.10.0)
// ══════════════════════════════════════════════════════
function initAsmaModule() {
  const data = window.ASMA_DATA;
  if (!data || !Array.isArray(data.items)) return;
  const searchInp = document.getElementById("asma-search");
  const asmaSel = document.getElementById("asma-select");
  const preview = document.getElementById("asma-preview");
  const applyBtn = document.getElementById("apply-asma-btn");
  const applyAllBtn = document.getElementById("apply-asma-all-btn");
  const slicesBtn = document.getElementById("open-per-slice-from-asma");
  const searchClear = document.getElementById("asma-search-clear");
  if (!searchInp || !asmaSel) return;
  let currentName = null;
  function renderList(filter) {
    asmaSel.innerHTML = "";
    const nf = filter ? normalizeArabic(filter.trim()) : "";
    let items = data.items;
    if (nf) items = items.filter(it => normalizeArabic(it.name).includes(nf) || normalizeArabic(it.meaning).includes(nf));
    items.forEach(it => {
      const o = document.createElement("option");
      o.value = it.n; o.textContent = `${it.n}. ${it.name}`;
      asmaSel.appendChild(o);
    });
    if (!items.length) { const o = document.createElement("option"); o.disabled = true; o.textContent = "— لا نتائج —"; asmaSel.appendChild(o); }
  }
  function selectName() {
    const id = parseInt(asmaSel.value);
    const it = data.items.find(x => x.n === id);
    if (!it) return;
    currentName = it;
    document.getElementById("asma-prev-name").textContent = it.name;
    document.getElementById("asma-prev-meaning").textContent = it.meaning;
    document.getElementById("asma-prev-ref").textContent = it.ref || "";
    preview.style.display = "block"; applyBtn.style.display = "block"; slicesBtn.style.display = "none";
  }
  searchInp.addEventListener("input", () => { renderList(searchInp.value); if (searchClear) searchClear.style.display = searchInp.value ? "inline-block" : "none"; });
  if (searchClear) searchClear.addEventListener("click", () => { searchInp.value = ""; searchClear.style.display = "none"; renderList(""); });
  asmaSel.addEventListener("change", selectName);
  asmaSel.addEventListener("dblclick", () => { selectName(); if (currentName) applyAsmaOne(currentName); });
  applyBtn.addEventListener("click", () => { if (currentName) applyAsmaOne(currentName); });
  applyAllBtn.addEventListener("click", () => applyAsmaAll(data.items));
  slicesBtn.addEventListener("click", openPerSliceSmart);
  renderList("");
}

function applyAsmaOne(item) {
  clearOtherSourcesUI();
  const text = `${item.name}\n\n${item.meaning}${item.ref ? "\n\n" + item.ref : ""}`;
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 6);
  const effDur = calcEffectiveSliceDuration(1, baseDur);
  S.verses = [{ text, numberInSurah: 1, number: 1, audio: null, audioSecondary: [], manualDuration: effDur, free: true, asma: true, enabled: true, source: `أسماء الله الحسنى · ${item.name}` }];
  S.ayaDurations = [effDur]; S.currentAya = 0; S.elapsed = 0;
  S.useFreeAsSource = true; S.translations = [];
  S.freePerSlice = [{ text, dur: effDur, enabled: true }];
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  const sBtn = document.getElementById("open-per-slice-from-asma");
  if (sBtn) sBtn.style.display = "block";
  toast(`✨ تمّ تطبيق "${item.name}"`, "success", 2500);
}

function applyAsmaAll(items) {
  clearOtherSourcesUI();
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 5);
  const effDur = calcEffectiveSliceDuration(items.length, baseDur);
  S.verses = items.map((it, i) => ({
    text: `${it.name}\n\n${it.meaning}`,
    numberInSurah: i + 1, number: i + 1, audio: null, audioSecondary: [],
    manualDuration: effDur, free: true, asma: true, enabled: true,
    source: `أسماء الله الحسنى · ${it.name}`,
  }));
  S.ayaDurations = S.verses.map(v => v.manualDuration);
  S.currentAya = 0; S.elapsed = 0; S.useFreeAsSource = true; S.translations = [];
  S.freePerSlice = S.verses.map(v => ({ text: v.text, dur: effDur, enabled: true }));
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  const sBtn = document.getElementById("open-per-slice-from-asma");
  if (sBtn) sBtn.style.display = "block";
  toast(`✨ تمّ تطبيق كلّ الأسماء (${items.length} شريحة)`, "success", 3000);
}

// ══════════════════════════════════════════════════════
//  وحدة الأدعية المأثورة (v0.10.0)
// ══════════════════════════════════════════════════════
function initDuasModule() {
  const data = window.DUAS_DATA;
  if (!data || !Array.isArray(data.categories)) return;
  const catSel = document.getElementById("duas-category");
  const searchInp = document.getElementById("duas-search");
  const duasSel = document.getElementById("duas-select");
  const preview = document.getElementById("duas-preview");
  const applyBtn = document.getElementById("apply-duas-btn");
  const slicesBtn = document.getElementById("open-per-slice-from-duas");
  const searchClear = document.getElementById("duas-search-clear");
  if (!catSel || !searchInp || !duasSel) return;
  catSel.innerHTML = "";
  data.categories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat.id;
    o.textContent = `${cat.icon || "🤲"} ${cat.name} (${cat.items.length})`;
    catSel.appendChild(o);
  });
  let currentCat = data.categories[0];
  let currentDua = null;
  function renderDuasList(filter) {
    duasSel.innerHTML = "";
    const nf = filter ? normalizeArabic(filter.trim()) : "";
    let items = currentCat.items;
    if (nf) items = items.filter(it => normalizeArabic(it.text).includes(nf));
    items.forEach(it => {
      const o = document.createElement("option");
      o.value = it.n;
      const prev = it.text.length > 80 ? it.text.slice(0, 78) + "…" : it.text;
      o.textContent = `${it.n}. ${prev}`;
      duasSel.appendChild(o);
    });
    if (!items.length) { const o = document.createElement("option"); o.disabled = true; o.textContent = "— لا نتائج —"; duasSel.appendChild(o); }
  }
  function selectDua() {
    const id = parseInt(duasSel.value);
    const it = currentCat.items.find(x => x.n === id);
    if (!it) return;
    currentDua = it;
    document.getElementById("duas-prev-meta").textContent = `${currentCat.icon || "🤲"} ${currentCat.name} · رقم ${it.n}`;
    document.getElementById("duas-prev-text").textContent = it.text;
    document.getElementById("duas-prev-source").textContent = `📖 ${it.source}`;
    document.getElementById("duas-prev-context").textContent = it.context ? `💡 ${it.context}` : "";
    preview.style.display = "block"; applyBtn.style.display = "block"; slicesBtn.style.display = "none";
  }
  catSel.addEventListener("change", () => {
    const id = parseInt(catSel.value);
    currentCat = data.categories.find(c => c.id === id) || data.categories[0];
    searchInp.value = ""; if (searchClear) searchClear.style.display = "none";
    renderDuasList(""); preview.style.display = "none"; applyBtn.style.display = "none"; slicesBtn.style.display = "none";
  });
  searchInp.addEventListener("input", () => { renderDuasList(searchInp.value); if (searchClear) searchClear.style.display = searchInp.value ? "inline-block" : "none"; });
  if (searchClear) searchClear.addEventListener("click", () => { searchInp.value = ""; searchClear.style.display = "none"; renderDuasList(""); });
  duasSel.addEventListener("change", selectDua);
  duasSel.addEventListener("dblclick", () => { selectDua(); if (currentDua) applyDua(currentDua, currentCat); });
  applyBtn.addEventListener("click", () => { if (currentDua) applyDua(currentDua, currentCat); });
  slicesBtn.addEventListener("click", openPerSliceSmart);
  renderDuasList("");
}

function applyDua(d, cat) {
  clearOtherSourcesUI();
  const text = d.text.trim();
  const smartSplit = !!ge("duas-smart-split");
  const slices = smartSplit ? splitArabicTextSmart(text) : [text];
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);
  S.verses = slices.map((t, i) => ({
    text: t, numberInSurah: i + 1, number: i + 1, audio: null, audioSecondary: [],
    manualDuration: effDur, free: true, dua: true, enabled: true,
    source: `${cat.name} · ${d.source}`,
  }));
  S.ayaDurations = S.verses.map(v => v.manualDuration);
  S.currentAya = 0; S.elapsed = 0; S.useFreeAsSource = true; S.translations = [];
  S.freePerSlice = slices.map(t => ({ text: t, dur: effDur, enabled: true }));
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  const sBtn = document.getElementById("open-per-slice-from-duas");
  if (sBtn) sBtn.style.display = "block";
  toast(`🤲 تمّ تطبيق الدعاء (${slices.length} شريحة)`, "success", 2500);
}

// ══════════════════════════════════════════════════════
//  وحدة الحِكَم والمواعظ (v0.10.0)
// ══════════════════════════════════════════════════════
function initHikamModule() {
  const data = window.HIKAM_DATA;
  if (!data || !Array.isArray(data.categories)) return;
  const catSel = document.getElementById("hikam-category");
  const searchInp = document.getElementById("hikam-search");
  const hikamSel = document.getElementById("hikam-select");
  const preview = document.getElementById("hikam-preview");
  const applyBtn = document.getElementById("apply-hikam-btn");
  const slicesBtn = document.getElementById("open-per-slice-from-hikam");
  const searchClear = document.getElementById("hikam-search-clear");
  if (!catSel || !searchInp || !hikamSel) return;
  catSel.innerHTML = "";
  data.categories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat.id;
    o.textContent = `${cat.icon || "🌟"} ${cat.name} (${cat.items.length})`;
    catSel.appendChild(o);
  });
  let currentCat = data.categories[0];
  let currentHikma = null;
  function renderHikamList(filter) {
    hikamSel.innerHTML = "";
    const nf = filter ? normalizeArabic(filter.trim()) : "";
    let items = currentCat.items;
    if (nf) items = items.filter(it => normalizeArabic(it.text).includes(nf) || normalizeArabic(it.sayer || "").includes(nf));
    items.forEach(it => {
      const o = document.createElement("option");
      o.value = it.n;
      const prev = it.text.length > 70 ? it.text.slice(0, 68) + "…" : it.text;
      o.textContent = `${it.n}. ${prev}`;
      hikamSel.appendChild(o);
    });
    if (!items.length) { const o = document.createElement("option"); o.disabled = true; o.textContent = "— لا نتائج —"; hikamSel.appendChild(o); }
  }
  function selectHikma() {
    const id = parseInt(hikamSel.value);
    const it = currentCat.items.find(x => x.n === id);
    if (!it) return;
    currentHikma = it;
    document.getElementById("hikam-prev-text").textContent = it.text;
    document.getElementById("hikam-prev-sayer").textContent = it.sayer ? `— ${it.sayer}` : "";
    document.getElementById("hikam-prev-source").textContent = it.source ? `📖 ${it.source}` : "";
    preview.style.display = "block"; applyBtn.style.display = "block"; slicesBtn.style.display = "none";
  }
  catSel.addEventListener("change", () => {
    const id = parseInt(catSel.value);
    currentCat = data.categories.find(c => c.id === id) || data.categories[0];
    searchInp.value = ""; if (searchClear) searchClear.style.display = "none";
    renderHikamList(""); preview.style.display = "none"; applyBtn.style.display = "none"; slicesBtn.style.display = "none";
  });
  searchInp.addEventListener("input", () => { renderHikamList(searchInp.value); if (searchClear) searchClear.style.display = searchInp.value ? "inline-block" : "none"; });
  if (searchClear) searchClear.addEventListener("click", () => { searchInp.value = ""; searchClear.style.display = "none"; renderHikamList(""); });
  hikamSel.addEventListener("change", selectHikma);
  hikamSel.addEventListener("dblclick", () => { selectHikma(); if (currentHikma) applyHikma(currentHikma, currentCat); });
  applyBtn.addEventListener("click", () => { if (currentHikma) applyHikma(currentHikma, currentCat); });
  slicesBtn.addEventListener("click", openPerSliceSmart);
  renderHikamList("");
}

function applyHikma(h, cat) {
  clearOtherSourcesUI();
  const text = h.text.trim();
  const smartSplit = !!ge("hikam-smart-split");
  const baseSlices = smartSplit ? splitArabicTextSmart(text) : [text];
  const slices = [...baseSlices];
  if (h.sayer) slices.push(`— ${h.sayer}`);
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);
  S.verses = slices.map((t, i) => ({
    text: t, numberInSurah: i + 1, number: i + 1, audio: null, audioSecondary: [],
    manualDuration: effDur, free: true, hikma: true, enabled: true,
    source: `${cat.name} · ${h.sayer || ""} · ${h.source || ""}`.trim(),
  }));
  S.ayaDurations = S.verses.map(v => v.manualDuration);
  S.currentAya = 0; S.elapsed = 0; S.useFreeAsSource = true; S.translations = [];
  S.freePerSlice = slices.map(t => ({ text: t, dur: effDur, enabled: true }));
  if (typeof renderPerSliceList === "function") renderPerSliceList();
  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  const sBtn = document.getElementById("open-per-slice-from-hikam");
  if (sBtn) sBtn.style.display = "block";
  toast(`🌟 تمّ تطبيق الحكمة (${slices.length} شريحة)`, "success", 2500);
}

function applyHadith(h, coll) {
  // v0.8.3 — منع التداخل
  const freeTextOn = document.getElementById("free-text-on");
  if (freeTextOn && freeTextOn.checked) {
    freeTextOn.checked = false;
    freeTextOn.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // v0.8.4 — حلِّل لـ 3 أجزاء
  const cleanIsnad = ge("hadith-clean-isnad");
  const text = h.text.trim();
  const struct = parseHadithStructure(text);
  const slices = [];
  if (struct) {
    if (!cleanIsnad) slices.push(struct.narrator);
    slices.push(struct.prophetic);
    const bodySlices = struct.body.split(/[.،؛!؟]+\s*/u).map(s => s.trim()).filter(s => s.length > 1);
    slices.push(...(bodySlices.length ? bodySlices : [struct.body]));
  } else {
    const rawSlices = text.split(/[.،؛!؟]+\s*/u).map(s => s.trim()).filter(s => s.length > 1);
    slices.push(...(rawSlices.length ? rawSlices : [text]));
  }
  // v0.8.5 — اضبط المدد لتُطابق الصوت النشط
  const baseDur = parseFloat(document.getElementById("free-slice-dur")?.value || 4);
  const effDur = calcEffectiveSliceDuration(slices.length, baseDur);
  S.verses = slices.map((t, i) => ({
    text: t, numberInSurah: i + 1, number: i + 1,
    audio: null, audioSecondary: [],
    manualDuration: effDur,
    free: true, hadith: true, enabled: true,
    source: `${coll.name} · حديث ${h.n}${h.grade ? " (" + h.grade + ")" : ""}`,
  }));
  S.ayaDurations = S.verses.map(v => v.manualDuration);
  S.currentAya = 0;
  S.elapsed = 0;
  S.useFreeAsSource = true;
  S.translations = [];

  S.freePerSlice = slices.map(t => ({ text: t, dur: effDur, enabled: true }));
  if (typeof renderPerSliceList === "function") renderPerSliceList();

  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();

  const hadSlicesBtn = document.getElementById("open-per-slice-from-hadith");
  if (hadSlicesBtn) hadSlicesBtn.style.display = "block";

  const audioActive = getActiveAudioDuration() != null;
  const msg = audioActive
    ? `📜 تمّ تطبيق الحديث (${slices.length} شريحة، ${effDur.toFixed(1)}s/شريحة 🔄 متزامن مع الصوت)`
    : `📜 تمّ تطبيق الحديث (${slices.length} شريحة، ${effDur.toFixed(1)}s)`;
  toast(msg, "success", 3000);
}

function initFreeTextEditor() {
  const ta = document.getElementById("free-text-area");
  if (!ta) return;
  ta.addEventListener("input", updateFreeTextStats);
  const slider = document.getElementById("free-slice-dur");
  if (slider) slider.addEventListener("input", updateFreeTextStats);
  document.getElementById("free-apply-btn")?.addEventListener("click", applyFreeText);
  document.getElementById("free-restart-btn")?.addEventListener("click", restartFreeText);
  document.getElementById("free-clear-btn")?.addEventListener("click", clearFreeText);
  document.getElementById("free-tpl-save-btn")?.addEventListener("click", saveFreeTemplate);

  // v0.8.6 — زرّ "🎚️" داخل النصّ الحرّ: ذكيّ
  document.getElementById("open-per-slice-from-free")?.addEventListener("click", openPerSliceSmart);

  const textCb = document.getElementById("free-text-on");
  if (textCb) {
    // v0.8.5 — دائماً غير مفعّل افتراضياً
    textCb.checked = false;
    textCb.addEventListener("change", toggleFreeTextVisibility);
    toggleFreeTextVisibility();
  }
  const audioCb = document.getElementById("free-audio-on");
  if (audioCb) {
    try { audioCb.checked = localStorage.getItem("gt_sirm_free_audio_on") === "1"; } catch (_) {}
    audioCb.addEventListener("change", toggleFreeAudioVisibility);
    toggleFreeAudioVisibility();
  }

  const audioInput = document.getElementById("free-audio-file");
  if (audioInput) {
    audioInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) handleFreeAudioFile(f);
    });
  }
  document.getElementById("free-audio-remove-btn")?.addEventListener("click", removeFreeAudio);
  document.getElementById("free-audio-restart-btn")?.addEventListener("click", restartFreeAudio);

  const trimCb = document.getElementById("free-audio-trim-on");
  if (trimCb) trimCb.addEventListener("change", toggleFreeAudioTrim);
  ["free-audio-trim-start", "free-audio-trim-end"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => {
      if (ge("free-audio-trim-on")) applyFreeAudioTrim();
    });
  });
  // v0.8.13 — زرّ "📏" يملأ حقل النهاية بالمدّة الكاملة
  document.getElementById("free-audio-trim-end-max")?.addEventListener("click", () => {
    const endInp = document.getElementById("free-audio-trim-end");
    if (!endInp) return;
    if (!S.bgAudioEl || !isFinite(S.bgAudioEl.duration) || S.bgAudioEl.duration <= 0) {
      toast?.("⚠️ ارفع الصوت أوّلاً ليُحسَب مدّته", "warn", 2000);
      return;
    }
    endInp.value = S.bgAudioEl.duration.toFixed(1);
    endInp.dispatchEvent(new Event("input", { bubbles: true }));
    toast?.(`📏 المدّة الكاملة: ${S.bgAudioEl.duration.toFixed(1)}s`, "info", 1500);
  });

  const autoSyncCb = document.getElementById("free-auto-sync");
  if (autoSyncCb) {
    try { autoSyncCb.checked = localStorage.getItem("gt_sirm_free_auto_sync") !== "0"; } catch (_) {}
    autoSyncCb.addEventListener("change", () => {
      try { localStorage.setItem("gt_sirm_free_auto_sync", autoSyncCb.checked ? "1" : "0"); } catch (_) {}
      updateFreeTextStats();
      toast?.(autoSyncCb.checked
        ? "🔄 المزامنة التلقائيّة مع الصوت مُفعَّلة"
        : "✋ تحكّم يدويّ كامل في مدّة الشرائح", "info", 1800);
    });
  }

  const perSliceCb = document.getElementById("free-per-slice");
  if (perSliceCb) {
    try { perSliceCb.checked = localStorage.getItem("gt_sirm_free_per_slice") === "1"; } catch (_) {}
    perSliceCb.addEventListener("change", togglePerSliceVisibility);
    togglePerSliceVisibility();
  }
  document.getElementById("free-per-slice-rebuild")?.addEventListener("click", () => {
    buildPerSliceList();
    renderPerSliceList();
    toast?.("🔄 تمّ توليد القائمة من النصّ الحاليّ", "info", 1500);
  });
  document.getElementById("free-per-slice-distribute")?.addEventListener("click", distributePerSlice);

  const lockCb = document.getElementById("free-per-slice-lock");
  if (lockCb) {
    try { lockCb.checked = localStorage.getItem("gt_sirm_free_per_slice_lock") !== "0"; } catch (_) {}
    lockCb.addEventListener("change", () => {
      try { localStorage.setItem("gt_sirm_free_per_slice_lock", lockCb.checked ? "1" : "0"); } catch (_) {}
      toast?.(lockCb.checked
        ? "🔒 الإجمالي مُثبَّت — التعديل يُوزَّع على الباقي"
        : "🔓 تعديل حرّ — الإجمالي يتغيَّر", "info", 1800);
    });
  }
  const dropZone = document.getElementById("free-audio-drop");
  if (dropZone) {
    ["dragover", "dragenter"].forEach(ev => dropZone.addEventListener(ev, e => {
      e.preventDefault(); dropZone.style.borderColor = "var(--al)";
    }));
    ["dragleave", "drop"].forEach(ev => dropZone.addEventListener(ev, e => {
      dropZone.style.borderColor = "";
    }));
    dropZone.addEventListener("drop", e => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFreeAudioFile(f);
    });
  }

  renderFreeTemplates();
  updateFreeTextStats();
  console.log("[SIRM] Free Text Editor initialized");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// ══════════════════════════════════════════════════════
//  SMART DRAG-DROP + CLIPBOARD PASTE (v0.5.0)
// ══════════════════════════════════════════════════════
function routeDroppedFile(file) {
  if (!file || !file.type) return false;
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) {
    const inp = document.getElementById("bg-img-input");
    if (inp) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        inp.files = dt.files;
        inp.dispatchEvent(new Event("change"));
        const r = document.getElementById("bgt2");
        if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event("change")); }
        toast?.(`🖼️ تطبيق الصورة: ${file.name}`, "success", 1800);
        return true;
      } catch (e) { console.warn("[SIRM] image route failed:", e); }
    }
  }
  if (mime.startsWith("video/")) {
    const inp = document.getElementById("bg-vid-input");
    if (inp) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        inp.files = dt.files;
        inp.dispatchEvent(new Event("change"));
        const r = document.getElementById("bgt3");
        if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event("change")); }
        toast?.(`🎥 تطبيق الفيديو: ${file.name}`, "success", 1800);
        return true;
      } catch (e) { console.warn("[SIRM] video route failed:", e); }
    }
  }
  if (mime.startsWith("audio/")) {
    const cb = document.getElementById("free-audio-on");
    if (cb && !cb.checked) {
      cb.checked = true;
      try { localStorage.setItem("gt_sirm_free_audio_on", "1"); } catch (_) {}
      if (typeof toggleFreeAudioVisibility === "function") toggleFreeAudioVisibility();
    }
    if (typeof handleFreeAudioFile === "function") {
      handleFreeAudioFile(file);
      return true;
    }
  }
  return false;
}

function showSmartDropOverlay(show) {
  const ov = document.getElementById("smart-drop-overlay");
  if (!ov) return;
  ov.classList.toggle("active", !!show);
}

function initSmartDrop() {
  let dragCounter = 0;
  document.addEventListener("dragenter", e => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
    dragCounter++;
    showSmartDropOverlay(true);
  });
  document.addEventListener("dragleave", e => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; showSmartDropOverlay(false); }
  });
  document.addEventListener("dragover", e => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  document.addEventListener("drop", e => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    dragCounter = 0;
    showSmartDropOverlay(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    let routed = 0;
    for (const f of files) { if (routeDroppedFile(f)) routed++; }
    if (routed === 0) toast?.("⚠️ لم يُتعرَّف على نوع الملفّ", "warn", 2000);
  });

  document.addEventListener("paste", e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && routeDroppedFile(file)) {
          e.preventDefault();
          return;
        }
      }
    }
  });

  const muteCb = document.getElementById("bg-vid-mute-audio");
  if (muteCb) {
    try { muteCb.checked = localStorage.getItem("gt_sirm_bg_vid_mute") === "1"; } catch (_) {}
    muteCb.addEventListener("change", () => {
      try { localStorage.setItem("gt_sirm_bg_vid_mute", muteCb.checked ? "1" : "0"); } catch (_) {}
      applyBgVidMute();
      toast?.(muteCb.checked
        ? "🔇 كُتم صوت فيديو الخلفية"
        : "🔊 صوت فيديو الخلفية مُفعَّل", "info", 1500);
    });
    applyBgVidMute();
  }

  console.log("[SIRM] Smart Drop + Clipboard Paste initialized");
}

function applyBgVidMute() {
  if (Array.isArray(S.bgVidItems)) {
    S.bgVidItems.forEach(it => applyBgVidItemAudio(it));
  } else if (S.bgVid) {
    try { S.bgVid.muted = !!ge("bg-vid-mute-audio"); } catch (_) {}
  }
}

// ══════════════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════════════
function initEventListeners() {
  // أزرار التبويبات
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      goTab(e.currentTarget.dataset.tab);
      if (window.innerWidth <= 760) openMobilePanel();
    });
  });

  // أزرار التحكم
  const loadVersesBtn = $("load-verses-btn");
  if (loadVersesBtn) loadVersesBtn.addEventListener("click", loadVerses);
  // v0.4.3 — استعد + احفظ توگل "نصّ فقط"
  const textOnlyCb = $("quran-text-only");
  if (textOnlyCb) {
    try { textOnlyCb.checked = localStorage.getItem("gt_sirm_quran_text_only") === "1"; } catch (_) {}
    textOnlyCb.addEventListener("change", () => {
      try { localStorage.setItem("gt_sirm_quran_text_only", textOnlyCb.checked ? "1" : "0"); } catch (_) {}
      toast?.(textOnlyCb.checked
        ? "🔇 وضع النصّ فقط مُفعَّل — اضغط 'تحميل الآيات' لتطبيقه"
        : "🔊 وضع النصّ فقط مُلغى — التحميل التالي يشمل صوت القارئ", "info", 2200);
    });
  }

  const toggleAddReciterBtn = $("toggle-add-reciter-btn");
  if (toggleAddReciterBtn) toggleAddReciterBtn.addEventListener("click", toggleAddReciter);

  const addCustomReciterBtn = $("add-custom-reciter-btn");
  if (addCustomReciterBtn) addCustomReciterBtn.addEventListener("click", addCustomReciter);

  const refreshFontsBtn = $("refresh-fonts-btn");
  if (refreshFontsBtn) refreshFontsBtn.addEventListener("click", () => loadLocalFonts(true));

  const customFontsInput = $("custom-fonts-input");
  if (customFontsInput) customFontsInput.addEventListener("change", (e) => loadCustomFonts(e.target));

  const togglePlayBtn = $("toggle-play-btn");
  if (togglePlayBtn) togglePlayBtn.addEventListener("click", togglePlay);
  const mutePreviewBtn = $("mute-preview-btn");
  if (mutePreviewBtn) mutePreviewBtn.addEventListener("click", togglePreviewMute);
  const muteOnExportCb = $("mute-on-export");
  if (muteOnExportCb) muteOnExportCb.addEventListener("change", (e) => { S.muteOnExport = e.target.checked; });

  // PWA install banner
  const installPwaBtn = $("install-pwa-btn");
  if (installPwaBtn) installPwaBtn.addEventListener("click", installPwa);
  const hidePwaBtn = $("hide-pwa-banner-btn");
  if (hidePwaBtn) hidePwaBtn.addEventListener("click", hidePwaBanner);
  const btnPlay = $("btn-play");
  if (btnPlay) btnPlay.addEventListener("click", togglePlay);

  const prevAyaBtn = $("prev-aya-btn");
  if (prevAyaBtn) prevAyaBtn.addEventListener("click", prevAya);
  const nextAyaBtn = $("next-aya-btn");
  if (nextAyaBtn) nextAyaBtn.addEventListener("click", nextAya);
  const restartAllBtn = $("restart-all-btn");
  if (restartAllBtn) restartAllBtn.addEventListener("click", restartAll);

  // v1.2 Feature #3/#4 — Undo/Redo + استعادة مَحذوف
  $("bgv-undo-btn")?.addEventListener("click", historyUndo);
  $("bgv-redo-btn")?.addEventListener("click", historyRedo);
  $("bgv-restore-deleted-btn")?.addEventListener("click", restoreLastDeletedBgVid);
  document.addEventListener("keydown", (e) => {
    const tag = (e.target?.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      historyUndo();
    } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
               ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) {
      e.preventDefault();
      historyRedo();
    }
  });
  updateHistoryUI();

  const pbar = $("pbar");
  if (pbar) pbar.addEventListener("click", seekClick);

  const openTplModalBtn = $("open-tpl-modal-btn");
  if (openTplModalBtn) openTplModalBtn.addEventListener("click", () => openModal("tpl-modal"));
  const openTplModalFromTab = $("open-tpl-modal-from-tab");
  if (openTplModalFromTab) openTplModalFromTab.addEventListener("click", () => openModal("tpl-modal"));
  const closeTplModalBtn = $("close-tpl-modal-btn");
  if (closeTplModalBtn) closeTplModalBtn.addEventListener("click", () => closeModal("tpl-modal"));
  const confirmSaveTemplateBtn = $("confirm-save-template-btn");
  if (confirmSaveTemplateBtn) confirmSaveTemplateBtn.addEventListener("click", confirmSaveTemplate);

  const cancelExportBtn = $("cancel-export-btn");
  if (cancelExportBtn) cancelExportBtn.addEventListener("click", cancelExport);

  const resetSettingsBtn = $("reset-settings-btn");
  if (resetSettingsBtn) resetSettingsBtn.addEventListener("click", resetAllSettings);

  // Radio buttons
  document.querySelectorAll('input[name="fmt"]').forEach(radio => {
    radio.addEventListener("change", onFmtChange);
  });
  // v0.14 — نسبة العرض في الإعدادات (name="ratio") تُحدِّث fmt + canvas
  document.querySelectorAll('input[name="ratio"]').forEach(r => {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      const fmtRadios = document.querySelectorAll('input[name="fmt"]');
      fmtRadios.forEach(f => { f.checked = f.value === r.value; });
      if (typeof onFmtChange === "function") onFmtChange();
    });
  });
  document.querySelectorAll('input[name="bgt"]').forEach(radio => {
    radio.addEventListener("change", onBgTypeChange);
  });
  document.querySelectorAll('input[name="tanim"]').forEach(radio => {
    radio.addEventListener("change", onTanimChange);
  });
  document.querySelectorAll(".mix-anim").forEach(cb => {
    cb.addEventListener("change", onMixAnimChange);
  });
  // قالب جاهز
  const presetSel = $("preset-sel");
  if (presetSel) presetSel.addEventListener("change", onPresetChange);

  // إظهار/إخفاء لوحة إعدادات اسم السورة
  const snameOn = $("sname-on");
  if (snameOn) snameOn.addEventListener("change", (e) => {
    const ctrl = $("sname-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v0.5.6 — عنوان المقطع
  const vtitleOn = $("vtitle-on");
  if (vtitleOn) vtitleOn.addEventListener("change", (e) => {
    const ctrl = $("vtitle-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v0.6.0 — Chromakey
  const chromaOn = $("chromakey-on");
  if (chromaOn) chromaOn.addEventListener("change", (e) => {
    const ctrl = $("chromakey-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v0.7.0 — فيديو التلاوة
  const recvidOn = $("recvid-on");
  if (recvidOn) recvidOn.addEventListener("change", (e) => {
    const ctrl = $("recvid-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked) {
      toast("🎥 وضع فيديو التلاوة مُفعَّل — ارفع فيديو لتفعيل العرض", "info", 2200);
    } else if (S.recVidEl) {
      try { S.recVidEl.pause(); } catch (_) {}
    }
  });
  // v1.1.0 — توگل إظهار النَصّ فَوق الفيديو
  const recvidShowText = $("recvid-showtext");
  if (recvidShowText) recvidShowText.addEventListener("change", (e) => {
    if (e.target.checked) {
      toast("📝 سَيُعرَض النَصّ فَوق الفيديو — أعِد تَحميل الفيديو بعد اختيار النَصّ", "info", 2600);
    } else {
      toast("🎬 الفيديو يَحلّ محلّ النَصّ — أعِد تَحميل الفيديو لِمَسح النَصّ", "info", 2600);
    }
  });
  const recvidFile = $("recvid-file");
  if (recvidFile) recvidFile.addEventListener("change", (e) => onRecVidFile(e.target));
  $("recvid-remove")?.addEventListener("click", () => {
    removeRecVid();
    toast("🗑️ تمّت إزالة الفيديو", "info", 1500);
  });
  // v0.7.1 — presets ألوان خلفيّة الفيديو
  const setRecvidBg = (hex) => {
    const inp = $("recvid-bgcolor"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); }
  };
  $("recvid-bgcolor-black")?.addEventListener("click", () => setRecvidBg("#000000"));
  $("recvid-bgcolor-white")?.addEventListener("click", () => setRecvidBg("#ffffff"));
  $("recvid-bgcolor-green")?.addEventListener("click", () => setRecvidBg("#00b140"));
  $("recvid-bgcolor-blue")?.addEventListener("click", () => setRecvidBg("#0047bb"));

  // v0.7.1 — Chromakey للشعار
  const logoChromaOn = $("logo-chroma-on");
  if (logoChromaOn) logoChromaOn.addEventListener("change", (e) => {
    const ctrl = $("logo-chroma-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  const setLogoChroma = (hex) => {
    const inp = $("logo-chroma-color"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); }
  };
  $("logo-chroma-white")?.addEventListener("click", () => setLogoChroma("#ffffff"));
  $("logo-chroma-black")?.addEventListener("click", () => setLogoChroma("#000000"));
  $("logo-chroma-green")?.addEventListener("click", () => setLogoChroma("#00b140"));
  $("chromakey-preset-green")?.addEventListener("click", () => {
    const inp = $("chromakey-color"); if (inp) { inp.value = "#00b140"; inp.dispatchEvent(new Event("change")); }
  });
  $("chromakey-preset-blue")?.addEventListener("click", () => {
    const inp = $("chromakey-color"); if (inp) { inp.value = "#0047bb"; inp.dispatchEvent(new Event("change")); }
  });
  const surahSel = $("surah-sel");
  if (surahSel) surahSel.addEventListener("change", onSurahChange);
  const transSel = $("trans-sel");
  if (transSel) transSel.addEventListener("change", onTransChange);
  const autoDur = $("auto-dur");
  if (autoDur) autoDur.addEventListener("change", toggleManualDur);

  const timingMaster = $("timing-master-on");
  const timingCtrl = $("timing-master-ctrl");
  if (timingMaster && timingCtrl) {
    try { timingMaster.checked = localStorage.getItem("gt_sirm_timing_master_on") !== "0"; } catch (_) {}
    // v0.8.16 — إخفاء كامل عند الإلغاء (ترشيد المساحة)
    const applyTimingMaster = () => {
      timingCtrl.style.display = timingMaster.checked ? "" : "none";
      try { localStorage.setItem("gt_sirm_timing_master_on", timingMaster.checked ? "1" : "0"); } catch (_) {}
    };
    timingMaster.addEventListener("change", () => {
      applyTimingMaster();
      toast?.(timingMaster.checked
        ? "🔛 قسم التوقيت العامّ مُفعَّل"
        : "⏸️ قسم التوقيت العامّ مُعطَّل — لن يُضاف فاصل صمت", "info", 1800);
    });
    applyTimingMaster();
  }

  // Range sliders
  const sliders = [
    { id: "aya-dur", outId: "aya-dur-v", unit: "s" },
    { id: "trans-dur", outId: "trans-dur-v", unit: "s" },
    { id: "aya-gap", outId: "aya-gap-v", unit: "s" },
    { id: "wave-gain", outId: "wave-gain-v", unit: "%" },
    { id: "sname-y", outId: "sname-y-v", unit: "%" },
    { id: "text-y-offset", outId: "text-y-offset-v", unit: "%" },
    { id: "sname-size", outId: "sname-size-v", unit: "%" },
    { id: "vtitle-y", outId: "vtitle-y-v", unit: "%" },
    { id: "vtitle-size", outId: "vtitle-size-v", unit: "%" },
    { id: "chromakey-similarity", outId: "chromakey-similarity-v", unit: "" },
    { id: "chromakey-smoothness", outId: "chromakey-smoothness-v", unit: "" },
    { id: "chromakey-spill", outId: "chromakey-spill-v", unit: "" },
    { id: "recvid-x", outId: "recvid-x-v", unit: "%" },
    { id: "recvid-y", outId: "recvid-y-v", unit: "%" },
    { id: "recvid-scale", outId: "recvid-scale-v", unit: "%" },
    { id: "recvid-threshold", outId: "recvid-threshold-v", unit: "" },
    { id: "recvid-softness", outId: "recvid-softness-v", unit: "" },
    { id: "logo-chroma-threshold", outId: "logo-chroma-threshold-v", unit: "" },
    { id: "logo-chroma-softness", outId: "logo-chroma-softness-v", unit: "" },
    { id: "orn-op", outId: "orn-op-v", unit: "%" },
    { id: "dim", outId: "dim-v", unit: "%" },
    { id: "bright", outId: "bright-v", unit: "%" },
    { id: "satur", outId: "satur-v", unit: "%" },
    { id: "fsize", outId: "fsize-v", unit: "%" },
    { id: "lh", outId: "lh-v", unit: "" },
    { id: "wm-size", outId: "wm-size-v", unit: "px" },
    { id: "rec-vol", outId: "rec-vol-v", unit: "%" },
    { id: "bg-vol", outId: "bg-vol-v", unit: "%" },
    { id: "logo-size", outId: "logo-size-v", unit: "px" },
    { id: "logo-opacity", outId: "logo-opacity-v", unit: "%" },
    { id: "wave-h", outId: "wave-h-v", unit: "px" },
    { id: "vig-str", outId: "vig-str-v", unit: "%" },
    { id: "ov-op", outId: "ov-op-v", unit: "%" },
    { id: "export-vbr", outId: "export-vbr-v", unit: " Mbps" },
    { id: "pixel-size", outId: "pixel-size-v", unit: "" },
    { id: "mosaic-size", outId: "mosaic-size-v", unit: "" },
    { id: "ripple-amp", outId: "ripple-amp-v", unit: "" },
    { id: "wave-amp", outId: "wave-amp-v", unit: "" },
    { id: "swirl-factor", outId: "swirl-factor-v", unit: "" },
    { id: "kaleido-segments", outId: "kaleido-segments-v", unit: "" },
    { id: "glitch-intensity", outId: "glitch-intensity-v", unit: "" },
    { id: "word-fade-ms", outId: "word-fade-ms-v", unit: "ms" },
    { id: "bg-crossfade-ms", outId: "bg-crossfade-ms-v", unit: "ms" },
    { id: "bg-transition-softness", outId: "bg-transition-softness-v", unit: "%" },
    { id: "wm-y-offset", outId: "wm-y-offset-v", unit: "%" },
  ];
  sliders.forEach(s => {
    const el = $(s.id);
    if (el) {
      el.addEventListener("input", (e) => sv(e.target, s.outId, s.unit));
      sv(el, s.outId, s.unit);
    }
  });

  // Color picker + text sync
  const syncPairs = [
    { pick: "gc1", text: "gc1t" },
    { pick: "gc2", text: "gc2t" },
  ];
  syncPairs.forEach(p => {
    const pick = $(p.pick);
    const text = $(p.text);
    if (pick && text) {
      pick.addEventListener("input", () => syncCP(p.pick, p.text));
      text.addEventListener("input", () => syncCT(p.pick, p.text));
    }
  });

  // File inputs
  const bgImgInput = $("bg-img-input");
  if (bgImgInput) bgImgInput.addEventListener("change", (e) => onBgMedia(e.target, "image"));
  const bgVidInput = $("bg-vid-input");
  if (bgVidInput) bgVidInput.addEventListener("change", (e) => onBgMedia(e.target, "video"));
  const bgAudioInput = $("bg-audio-input");
  if (bgAudioInput) bgAudioInput.addEventListener("change", (e) => onBgAudio(e.target));

  // تقطيع زمني للوسائط المحلية (نفس النهج في النسختين)
  const bgVidTrimOn = $("bg-vid-trim-on");
  if (bgVidTrimOn) bgVidTrimOn.addEventListener("change", (e) => {
    const row = $("bg-vid-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgVid) applyBgVidTrim();
  });
  ["bg-vid-trim-start","bg-vid-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-vid-trim-on")) applyBgVidTrim(); });
  });
  const bgAudioTrimOn = $("bg-audio-trim-on");
  if (bgAudioTrimOn) bgAudioTrimOn.addEventListener("change", (e) => {
    const row = $("bg-audio-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgAudioEl) applyBgAudioTrim();
  });
  ["bg-audio-trim-start","bg-audio-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-audio-trim-on")) applyBgAudioTrim(); });
  });
  const logoUpload = $("logo-upload");
  if (logoUpload) logoUpload.addEventListener("change", (e) => onLogoUpload(e.target));
  const removeLogoBtn = $("remove-logo-btn");
  if (removeLogoBtn) removeLogoBtn.addEventListener("click", removeLogo);

  // Search (surah name + verse content)
  const surahSearch = $("surah-search");
  if (surahSearch) surahSearch.addEventListener("input", (e) => filterSurahs(e.target.value));

  const verseSearchInp = $("verse-search-inp");
  if (verseSearchInp) {
    const debouncedSearch = debounce(onVerseSearchInput, 200);
    verseSearchInp.addEventListener("input", debouncedSearch);
    verseSearchInp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { clearVerseSearch(); verseSearchInp.blur(); }
    });
  }
  const verseSearchClear = $("verse-search-clear-btn");
  if (verseSearchClear) verseSearchClear.addEventListener("click", clearVerseSearch);

  // Mobile
  const panelSizeSlider = $("panel-size-slider");
  if (panelSizeSlider) panelSizeSlider.addEventListener("input", (e) => onPanelSizeChange(e.target.value));
  const layVert = $("lay-vert");
  if (layVert) layVert.addEventListener("click", () => setMobLayout("vert"));
  const layHoriz = $("lay-horiz");
  if (layHoriz) layHoriz.addEventListener("click", () => setMobLayout("horiz"));
  const layFull = $("lay-full");
  if (layFull) layFull.addEventListener("click", () => setMobLayout("full"));
  const mobToggle = $("mob-toggle");
  if (mobToggle) mobToggle.addEventListener("click", toggleMobilePanel);
  const panelHandle = $("panel-handle");
  if (panelHandle) panelHandle.addEventListener("touchstart", initPanelSwipe);
  const mobBackdrop = $("mob-backdrop");
  if (mobBackdrop) mobBackdrop.addEventListener("click", closeMobilePanel);

  // Export
  const exportWebmBtn = $("export-webm-btn");
  if (exportWebmBtn) exportWebmBtn.addEventListener("click", () => startExport("webm"));
  const exportMp4Btn = $("export-mp4-btn");
  if (exportMp4Btn) exportMp4Btn.addEventListener("click", () => startExport("mp4"));
}

// ══════════════════════════════════════════════════════
//  حفظ واستعادة الإعدادات
// ══════════════════════════════════════════════════════
const SETTINGS_KEY = "gt_sirm_settings_v2";
const RECITERS_KEY = "gt_sirm_reciters_v2";

const SETTINGS_SKIP = new Set([
  "tpl-name-inp","surah-sel","from-aya","to-aya","surah-search","verse-search-inp","preset-sel",
  "bg-img-input","bg-vid-input","bg-audio-input",
  "custom-fonts-input","logo-upload",
  "ar-name","ar-flag","ar-folder",
  "f1","f2","f3","panel-size-slider"
]);

function saveAllSettings() {
  const saved = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.id || SETTINGS_SKIP.has(el.id)) return;
    if (el.type === "checkbox") saved[el.id] = el.checked;
    else if (el.type === "radio") { if (el.checked) saved["__radio_" + el.name] = el.value; }
    else saved[el.id] = el.value;
  });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved)); } catch(e) {}
}

function restoreAllSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch(e) {}
  if (!Object.keys(saved).length) return;

  Object.entries(saved).forEach(([key, val]) => {
    if (key.startsWith("__radio_")) {
      const name = key.replace("__radio_", "");
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change")); }
    } else {
      const el = $(key);
      if (!el) return;
      if (el.type === "file") return;
      if (el.type === "checkbox") {
        el.checked = !!val;
        el.dispatchEvent(new Event("change"));
      } else {
        el.value = val;
        el.dispatchEvent(new Event("input"));
        el.dispatchEvent(new Event("change"));
      }
    }
  });
}

function saveReciters() {
  try { localStorage.setItem(RECITERS_KEY, JSON.stringify(S.reciters)); } catch(e) {}
}

function restoreReciters() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECITERS_KEY) || "null");
    if (saved && Array.isArray(saved) && saved.length > 0) {
      S.reciters = saved;
      renderReciters();
    }
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  v0.13.2 — Capacitor (Android APK): زرّ الرُجوع + ملفّات .gtsirm
//  يَعمل فقط داخل WebView (window.Capacitor مَوجود). في المُتصفّح يَتجاوَز.
// ══════════════════════════════════════════════════════
S.isNativeAndroid = !!(typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

async function _handleAppExitConfirm() {
  // إن لم تَكن هُناك تَغييرات، اخرُج مُباشَرةً
  if (!S.projectDirty) {
    try { await window.Capacitor.Plugins.App.exitApp(); } catch (_) {}
    return;
  }
  // اعرض مُربّع تَأكيد مَركَزيّ
  const old = document.getElementById("android-exit-confirm");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "android-exit-confirm";
  modal.style.cssText = "position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="background:var(--bg0);border:2px solid var(--p);border-radius:var(--r);padding:22px;max-width:420px;width:92%;direction:rtl;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.6)">
      <div style="font-size:42px;margin-bottom:12px">⚠️</div>
      <h3 style="margin:0 0 12px 0;color:var(--al);font-size:17px">تَغييرات غَير محفوظة</h3>
      <p style="font-size:13px;color:var(--t1);line-height:1.8;margin:0 0 16px 0">لديك تَعديلات في المشروع لم تَحفَظها بَعد. ماذا تُريد أن تَفعل؟</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-a" id="x-save" style="font-weight:700;padding:10px">💾 احفظ ثُمَّ اخرُج</button>
        <button class="btn btn-d" id="x-exit" style="padding:10px">⚠️ اخرُج بدون حِفظ</button>
        <button class="btn btn-g" id="x-cancel" style="padding:10px">↩️ إلغاء — اِبقَ في البَرنامج</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#x-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#x-exit").addEventListener("click", async () => {
    modal.remove();
    try { await window.Capacitor.Plugins.App.exitApp(); } catch (_) {}
  });
  modal.querySelector("#x-save").addEventListener("click", async () => {
    modal.remove();
    try {
      await saveProjectInteractive();
      // اِنتَظِر قَليلاً ثُمَّ اخرُج
      setTimeout(() => {
        if (!S.projectDirty) {
          try { window.Capacitor.Plugins.App.exitApp(); } catch (_) {}
        }
      }, 500);
    } catch (e) {
      toast?.(`❌ فَشِل الحِفظ: ${e.message}`, "error", 3000);
    }
  });
}

async function _handleIncomingFile(uri) {
  if (!uri) return;
  try {
    const { Filesystem } = window.Capacitor.Plugins;
    // اِقرَأ الملفّ كـtext
    const result = await Filesystem.readFile({
      path: uri,
      encoding: "utf8",
    });
    const text = (typeof result.data === "string") ? result.data : await new Blob([result.data]).text();
    // أَنشئ Blob ثُمَّ مَرِّره للـopener
    const fname = uri.split("/").pop().split("?")[0] || "imported.gtsirm";
    const blob = new Blob([text], { type: "application/json" });
    const file = new File([blob], fname, { type: "application/json" });
    if (typeof openProjectFromBlob === "function") {
      await openProjectFromBlob(file);
    } else {
      toast?.(`📂 وَصَل ملفّ: ${fname}`, "info", 2500);
    }
  } catch (e) {
    console.warn("[capacitor] file open failed:", e);
    toast?.(`❌ فَشِل فَتح الملفّ: ${e.message}`, "error", 3000);
  }
}

function initCapacitor() {
  if (!S.isNativeAndroid) return;
  console.log("[GT-SIRM] Capacitor Android mode");
  const { App } = window.Capacitor.Plugins;
  if (!App) {
    console.warn("[capacitor] App plugin مَفقود");
    return;
  }
  // زرّ الرُجوع: اعرض مُربّع تَأكيد بَدلاً من الخُروج المُباشِر
  App.addListener("backButton", async (ev) => {
    // إن كان هُناك مُربّع مَفتوح، أَغلِقه أوّلاً
    const openModals = document.querySelectorAll("[id$='-confirm-modal'], [id$='-warning'], #android-exit-confirm");
    for (const m of openModals) {
      if (m.style.display !== "none" && getComputedStyle(m).display !== "none") {
        m.remove();
        return;
      }
    }
    // إن كان هُناك tab-panel مَفتوح في المُحرّك المُتنقّل، اِسمَح للـWebView بإغلاقه
    if (ev.canGoBack && typeof window.history !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    await _handleAppExitConfirm();
  });
  // فَتح ملفّ .gtsirm من Intent
  App.addListener("appUrlOpen", async (data) => {
    if (!data || !data.url) return;
    console.log("[capacitor] appUrlOpen:", data.url);
    if (data.url.includes(".gtsirm") || data.url.startsWith("content://") || data.url.startsWith("file://")) {
      await _handleIncomingFile(data.url);
    }
  });
  // اِفحَص launch intent (لو فُتح البَرنامج عَبر النَقر على ملفّ)
  App.getLaunchUrl().then((res) => {
    if (res && res.url) {
      console.log("[capacitor] launch url:", res.url);
      _handleIncomingFile(res.url);
    }
  }).catch(() => {});
}

function initAutoSave() {
  const debouncedSave = debounce(saveAllSettings, 500);
  document.addEventListener("input", debouncedSave, true);
  document.addEventListener("change", debouncedSave, true);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ══════════════════════════════════════════════════════
//  ALWAYS-RUNNING RENDER LOOP
// ══════════════════════════════════════════════════════
function startRenderLoop() {
  function loop(ts) {
    S.rafId = requestAnimationFrame(loop);
    const dt = S.lastRafTs ? Math.min((ts - S.lastRafTs) / 1000, .1) : 0;
    S.lastRafTs = ts;
    if (S.playing) {
      S.elapsed += dt;
      S.bgMotionT += dt;
      checkAyaAdvance();
      updateProgressUI();
    }
    drawFrame(ts / 1000);
  }
  S.rafId = requestAnimationFrame(loop);
}

// ── فاصل صمت بين الآيات ──────────────────────────────
function isTimingMasterOn() {
  const el = document.getElementById("timing-master-on");
  return el ? el.checked : true;
}
function getAyaGap() {
  if (!isTimingMasterOn()) return 0;
  return Math.max(0, parseFloat(gv("aya-gap")) || 0);
}
function getEffectiveDur(i) {
  const audioDur = (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : (parseFloat(gv("aya-dur")) || 6);
  return audioDur + getAyaGap();
}

function checkAyaAdvance() {
  if (S.exporting) return;
  const dur = getEffectiveDur(S.currentAya);
  if (S.elapsed >= dur) {
    if (S.currentAya < S.verses.length - 1) {
      S.currentAya++;
      S.elapsed = 0;
      playRecitationAudio();
      updateAyaUI();
    } else {
      pausePlayer();
      S.currentAya = 0; S.elapsed = 0;
      updateAyaUI();
    }
  }
}

// ══════════════════════════════════════════════════════
//  CANVAS SETUP
// ══════════════════════════════════════════════════════
function initCanvas() { onFmtChange(); }

const FMT_SIZES = {
  "9:16": { w: 720,  h: 1280 },
  "16:9": { w: 1280, h: 720  },
  "1:1":  { w: 1080, h: 1080 },
  "4:5":  { w: 1080, h: 1350 },
};

function onFmtChange() {
  const fmt = radioVal("fmt");
  const cv = $("cv");
  const sz = FMT_SIZES[fmt] || FMT_SIZES["9:16"];
  cv.width = sz.w; cv.height = sz.h;
  const lbl = $("fmt-lbl");
  if (lbl) lbl.textContent = fmt;
  fitCanvas();
}

// ── القوالب الجاهزة للمنصات الشهيرة ──────────────────
const PRESETS = {
  "reel-fhd": { fmt: "9:16", w: 1080, h: 1920, fps: 30, vbr: 10, label: "Reels/Shorts/TikTok 1080×1920" },
  "reel-hd":  { fmt: "9:16", w: 720,  h: 1280, fps: 30, vbr: 6,  label: "Reels 720×1280 (سريع)" },
  "yt-fhd":   { fmt: "16:9", w: 1920, h: 1080, fps: 30, vbr: 12, label: "YouTube 1920×1080" },
  "yt-hd":    { fmt: "16:9", w: 1280, h: 720,  fps: 30, vbr: 8,  label: "YouTube 1280×720" },
  "ig-sq":    { fmt: "1:1",  w: 1080, h: 1080, fps: 30, vbr: 8,  label: "Instagram Square 1080" },
  "ig-port":  { fmt: "4:5",  w: 1080, h: 1350, fps: 30, vbr: 8,  label: "Instagram Portrait 1080×1350" },
  "cinema":   { fmt: "16:9", w: 2560, h: 1080, fps: 30, vbr: 15, label: "Cinema 2560×1080 (21:9)" },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  FMT_SIZES[p.fmt] = { w: p.w, h: p.h };
  const fmtRadio = document.querySelector(`input[name="fmt"][value="${p.fmt}"]`);
  if (fmtRadio) fmtRadio.checked = true;
  const cv = $("cv");
  cv.width = p.w; cv.height = p.h;
  const lbl = $("fmt-lbl");
  if (lbl) lbl.textContent = p.fmt;
  fitCanvas();
  const fpsEl = $("export-fps");
  if (fpsEl) fpsEl.value = String(p.fps);
  const vbrEl = $("export-vbr");
  if (vbrEl) { vbrEl.value = String(p.vbr); if (typeof sv === "function") sv(vbrEl, "export-vbr-v", " Mbps"); }
  toast(`✅ تم تطبيق قالب: ${p.label}`, "success", 3000);
}

function onPresetChange(e) {
  const v = e.target.value;
  if (!v) return;
  applyPreset(v);
  // v0.12.6 — يَبقى الاختيار ظاهراً
}

function fitCanvas() {
  const preview = $("preview");
  const cv = $("cv");
  if (!preview || !cv) return;
  const maxH = preview.clientHeight - 90;
  const maxW = preview.clientWidth - 20;
  if (maxH <= 0 || maxW <= 0) return;
  const ratio = cv.width / cv.height;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  cv.style.width = Math.floor(w) + "px";
  cv.style.height = Math.floor(h) + "px";
}
window.addEventListener("resize", fitCanvas);

// ══════════════════════════════════════════════════════
//  MAIN DRAW
// ══════════════════════════════════════════════════════
function drawFrame(ts) {
  const cv = $("cv");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);

  // v0.7.0 — فيديو التلاوة الجاهز؛ v1.1.0 — إظهار النَصّ فَوقه + تَطبيق تَأثيرات المَشهد عليه اختياريّاً
  const recvidActive = ge("recvid-on") && S.recVidEl;
  const recvidShowText = recvidActive && ge("recvid-showtext");
  const recvidApplyColor = recvidActive && ge("recvid-apply-color");
  const recvidApplyLight = recvidActive && ge("recvid-apply-light");
  const recvidPos = recvidActive
    ? (recvidApplyColor ? "early" : (recvidApplyLight ? "mid" : "late"))
    : "none";

  drawBg(ctx, W, H, ts);
  if (recvidPos === "early") drawRecitationVideo(ctx, W, H);
  applyColorFilter(ctx, W, H);
  if (recvidPos === "mid") drawRecitationVideo(ctx, W, H);
  if (ge("fx-bokeh")) drawBokeh(ctx, W, H, ts);
  applyDim(ctx, W, H);
  applyOvColor(ctx, W, H);
  drawOrnament(ctx, W, H, ts);
  if (ge("fx-stars")) drawStars(ctx, W, H, ts);
  if (ge("fx-rays")) drawRays(ctx, W, H, ts);
  // التأثيرات الإضافية (per-pixel — قد تكون ثقيلة)
  if (ge("fx-pixel"))   applyPixelate(ctx, W, H);
  if (ge("fx-mosaic"))  applyMosaic(ctx, W, H);
  if (ge("fx-ripple"))  applyRipple(ctx, W, H, ts);
  if (ge("fx-wave"))    applyWave(ctx, W, H, ts);
  if (ge("fx-swirl"))   applySwirl(ctx, W, H);
  if (ge("fx-kaleido")) applyKaleido(ctx, W, H);
  if (ge("fx-glitch"))  applyGlitch(ctx, W, H);
  if (ge("fx-oldfilm")) applyOldFilm(ctx, W, H, ts);
  if (recvidPos === "late") drawRecitationVideo(ctx, W, H);
  // اِرسِم النَصّ إن لَم يَكُن الفيديو فَعّالاً، أَو كان فَعّالاً مع تَوگل "إظهار النَصّ فَوق الفيديو"
  if (S.verses.length && (!recvidActive || recvidShowText) && !(S.verses.length === 1 && S.verses[0]?.recvid)) drawVerse(ctx, W, H, ts);
  drawSurahName(ctx, W, H);
  drawVideoTitle(ctx, W, H);
  drawWave(ctx, W, H, ts);
  drawLogo(ctx, W, H);
  drawWatermark(ctx, W, H);
  if (ge("fx-vig")) drawVignette(ctx, W, H);
  if (ge("fx-gold")) drawGoldBorder(ctx, W, H, ts);
  if (ge("fx-grain")) drawGrain(ctx, W, H);
}

// ══════════════════════════════════════════════════════
//  BACKGROUND
// ══════════════════════════════════════════════════════
function drawBg(ctx, W, H, ts) {
  const bgt = radioVal("bgt");
  const bgm = radioVal("bgm");
  const bright = gv("bright") / 100;
  const chromaOn = ge("chromakey-on");

  ctx.save();
  ctx.filter = `brightness(${bright}) saturate(${gv("satur") / 100})`;

  // v0.6.0 — رسم الوسائط على canvas منفصل عند تفعيل Chromakey
  const drawMediaToCanvas = (targetCtx, applyMotion) => {
    if (bgt === "image" && S.bgImg) {
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      imgCover(targetCtx, S.bgImg, 0, 0, W, H);
      targetCtx.restore();
      return true;
    } else if (bgt === "video" && S.bgVid) {
      if (S.bgVid.readyState < 2) return false;
      updateBgVidCrossfade();
      const alpha = S.bgVidFadeProgress;
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      // v1.2 — نَمط الاِنتقال (per-clip إن حُدّد، وإلا العامّ) + نُعومة الحَواف
      const hasNext = S.bgVidNext && S.bgVidNext.readyState >= 2 && alpha > 0;
      drawBgTransition(targetCtx, S.bgVid, hasNext ? S.bgVidNext : null, alpha, W, H, getEffectiveBgTransition(), getBgTransitionSoftness());
      targetCtx.restore();
      return true;
    }
    return false;
  };

  const hasMedia = (bgt === "image" && S.bgImg) || (bgt === "video" && S.bgVid && S.bgVid.readyState >= 2);
  if (bgt === "gradient" || !hasMedia) {
    drawGradient(ctx, W, H);
  } else if (chromaOn) {
    drawGradient(ctx, W, H);
    const tmp = getChromakeyCanvas(W, H);
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, W, H);
    tctx.filter = ctx.filter;
    const drawn = drawMediaToCanvas(tctx, true);
    tctx.filter = "none";
    if (drawn) {
      applyChromakeyToCanvas(tctx, W, H);
      ctx.filter = "none";
      ctx.drawImage(tmp, 0, 0);
    }
  } else {
    drawMediaToCanvas(ctx, true) || drawGradient(ctx, W, H);
  }
  ctx.restore();
  ctx.filter = "none";
}

// v0.6.0 — Chromakey support
let _chromakeyCanvas = null;
function getChromakeyCanvas(W, H) {
  if (!_chromakeyCanvas) _chromakeyCanvas = document.createElement("canvas");
  if (_chromakeyCanvas.width !== W) _chromakeyCanvas.width = W;
  if (_chromakeyCanvas.height !== H) _chromakeyCanvas.height = H;
  return _chromakeyCanvas;
}
function hexToRgb(hex) {
  const m = (hex || "#00b140").replace("#", "");
  return { r: parseInt(m.substr(0, 2), 16), g: parseInt(m.substr(2, 2), 16), b: parseInt(m.substr(4, 2), 16) };
}
function applyChromakeyToCanvas(ctx, W, H) {
  const colorHex = $("chromakey-color")?.value || "#00b140";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const similarity = (parseFloat(gv("chromakey-similarity")) || 30);
  const smoothness = (parseFloat(gv("chromakey-smoothness")) || 15);
  const spill = (parseFloat(gv("chromakey-spill")) || 20) / 100;

  const keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128;
  const keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128;
  const sim = similarity * 1.5;
  const smooth = Math.max(0.5, smoothness * 1.5);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    const dx = cb - keyCb, dy = cr - keyCr;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let alpha = 1;
    if (dist < sim) alpha = 0;
    else if (dist < sim + smooth) alpha = (dist - sim) / smooth;
    d[i + 3] = d[i + 3] * alpha;
    if (alpha > 0 && spill > 0) {
      if (kG > kR && kG > kB) {
        const avg = (r + b) / 2;
        if (g > avg) d[i + 1] = g + (avg - g) * spill;
      } else if (kB > kR && kB > kG) {
        const avg = (r + g) / 2;
        if (b > avg) d[i + 2] = b + (avg - b) * spill;
      } else if (kR > kG && kR > kB) {
        const avg = (g + b) / 2;
        if (r > avg) d[i] = r + (avg - r) * spill;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawGradient(ctx, W, H) {
  const c1 = $("gc1").value, c2 = $("gc2").value;
  const dir = $("grad-dir").value;
  let gr;
  if (dir === "radial") {
    gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .75);
  } else {
    const map = { tb: [W / 2, 0, W / 2, H], bt: [W / 2, H, W / 2, 0], diag: [0, 0, W, H], rdiag: [W, 0, 0, H] };
    const [x0, y0, x1, y1] = map[dir] || map.tb;
    gr = ctx.createLinearGradient(x0, y0, x1, y1);
  }
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function applyBgMotion(ctx, W, H, bgm, ts) {
  const t = S.bgMotionT;
  if (bgm === "drift") { const d = t * 12 % 80; ctx.translate(d * .5, d * .3); ctx.scale(1.15, 1.15); ctx.translate(-W * .075, -H * .06); }
  if (bgm === "zoom") { const sc = 1 + ((t * .04) % 0.15); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); }
  if (bgm === "pan") { const p = (Math.sin(t * .25) + 1) / 2; ctx.translate(-p * 60, 0); ctx.scale(1.12, 1); }
}

function imgCover(ctx, src, x, y, w, h) {
  const sw = src.naturalWidth || src.videoWidth || w;
  const sh = src.naturalHeight || src.videoHeight || h;
  if (!sw || !sh) return;
  const ir = sw / sh, cr = w / h;
  let dw, dh, dx, dy;
  if (ir > cr) { dh = h; dw = dh * ir; dx = x - (dw - w) / 2; dy = y; }
  else { dw = w; dh = dw / ir; dy = y - (dh - h) / 2; dx = x; }
  ctx.drawImage(src, dx, dy, dw, dh);
}

// ══════════════════════════════════════════════════════
//  COLOR FILTER
// ══════════════════════════════════════════════════════
function applyColorFilter(ctx, W, H) {
  const cf = radioVal("cf");
  if (cf === "none") return;
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  const len = d.length;
  switch (cf) {
    case "bw":
      for (let i = 0; i < len; i += 4) {
        const g = d[i] * .3 + d[i+1] * .59 + d[i+2] * .11;
        d[i] = d[i+1] = d[i+2] = g;
      }
      break;
    case "warm":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i] * 1.12);
        d[i+2] = Math.max(0,   d[i+2] * .88);
      }
      break;
    case "cold":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0,   d[i] * .88);
        d[i+2] = Math.min(255, d[i+2] * 1.12);
      }
      break;
    case "sepia":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, r * .393 + g * .769 + b * .189);
        d[i+1] = Math.min(255, r * .349 + g * .686 + b * .168);
        d[i+2] = Math.min(255, r * .272 + g * .534 + b * .131);
      }
      break;
    case "negative":
      for (let i = 0; i < len; i += 4) {
        d[i]   = 255 - d[i];
        d[i+1] = 255 - d[i+1];
        d[i+2] = 255 - d[i+2];
      }
      break;
    case "saturated":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, Math.max(0, gray + (r - gray) * 1.6));
        d[i+1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.6));
        d[i+2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.6));
      }
      break;
    case "faded":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, gray + (r - gray) * 0.4 + 20);
        d[i+1] = Math.min(255, gray + (g - gray) * 0.4 + 20);
        d[i+2] = Math.min(255, gray + (b - gray) * 0.4 + 20);
      }
      break;
    case "dreamy":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i]   * 0.85 + 38);
        d[i+1] = Math.min(255, d[i+1] * 0.85 + 38);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 50);
      }
      break;
    case "night":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0, d[i]   * 0.55);
        d[i+1] = Math.max(0, d[i+1] * 0.65);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 25);
      }
      break;
  }
  ctx.putImageData(id, 0, 0);
}

function applyDim(ctx, W, H) {
  const d = gv("dim") / 100;
  if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${d})`; ctx.fillRect(0, 0, W, H); }
}

function applyOvColor(ctx, W, H) {
  const op = gv("ov-op") / 100;
  if (op <= 0) return;
  const [r, g, b] = hex2rgb($("ov-col").value);
  ctx.fillStyle = `rgba(${r},${g},${b},${op})`; ctx.fillRect(0, 0, W, H);
}

// ══════════════════════════════════════════════════════
//  ORNAMENTS
// ══════════════════════════════════════════════════════
function drawOrnament(ctx, W, H, ts) {
  const type = radioVal("orn"); if (type === "none") return;
  const op = gv("orn-op") / 100, col = $("orn-col").value;
  ctx.save(); ctx.globalAlpha = op;
  if (type === "hex") drawHexGrid(ctx, W, H, col);
  if (type === "geo") drawGeoPattern(ctx, W, H, col);
  if (type === "stars") drawIslamicStars(ctx, W, H, col);
  if (type === "arch") drawArch(ctx, W, H, col);
  if (type === "frame") drawOrnateFrame(ctx, W, H, col, ts);
  ctx.restore();
}

function drawHexGrid(ctx, W, H, col) {
  const s = 45, h = s * Math.sqrt(3) / 2;
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / h + 2; r++) for (let c = -1; c < W / (s * 1.5) + 2; c++) {
    const x = c * s * 1.5, y = r * h * 2 + (c % 2 === 0 ? 0 : h);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.lineTo(x + s * .9 * Math.cos(a), y + s * .9 * Math.sin(a)); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawGeoPattern(ctx, W, H, col) {
  const s = 55; ctx.strokeStyle = col; ctx.lineWidth = .7;
  for (let r = 0; r < H / s + 2; r++) for (let c = 0; c < W / s + 2; c++) {
    const x = c * s, y = r * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s / 2, y + s); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
  }
}

function drawIslamicStars(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / 80 + 2; r++) for (let c = -1; c < W / 80 + 2; c++) {
    const x = c * 80 + (r % 2) * 40, y = r * 80;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 === 0 ? 32 : 14; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawArch(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  const cx = W / 2, aw = W * .6;
  ctx.beginPath(); ctx.moveTo(cx - aw / 2, H * .86); ctx.lineTo(cx - aw / 2, H * .4);
  ctx.arc(cx, H * .4, aw / 2, Math.PI, 0); ctx.lineTo(cx + aw / 2, H * .86); ctx.stroke();
  ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(cx, H * .37, 14, 0, Math.PI * 2); ctx.stroke();
}

function drawOrnateFrame(ctx, W, H, col, ts) {
  const p = 12, pulse = 1 + Math.sin(ts * .8) * .012;
  ctx.strokeStyle = col; ctx.lineWidth = 1.5 * pulse;
  rRect(ctx, p, p, W - p * 2, H - p * 2, 14); ctx.stroke();
  ctx.lineWidth = .6; rRect(ctx, p + 7, p + 7, W - (p + 7) * 2, H - (p + 7) * 2, 8); ctx.stroke();
  const cs = 28;
  [[p, p], [W - p, p], [p, H - p], [W - p, H - p]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-cs, 0); ctx.lineTo(0, 0); ctx.lineTo(0, -cs);
    ctx.stroke(); ctx.restore();
  });
}

function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// ══════════════════════════════════════════════════════
//  FX
// ══════════════════════════════════════════════════════
function generateParticles() {
  S.stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * .9 + .2, alpha: Math.random() * .6 + .3, phase: Math.random() * Math.PI * 2 }));
  S.bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 35 + 10, alpha: Math.random() * .1 + .03, vy: Math.random() * .0003 + .0001 }));
}

function drawStars(ctx, W, H, ts) {
  S.stars.forEach(s => {
    const a = s.alpha * (.5 + .5 * Math.sin(ts * 1.8 + s.phase));
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${a})`; ctx.fill();
  });
}

function drawRays(ctx, W, H, ts) {
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const cx = W / 2, cy = H * .2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + ts * .04, len = Math.max(W, H) * 1.2;
    const alpha = .025 + .015 * Math.sin(ts * .7 + i);
    const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    gr.addColorStop(0, `rgba(255,235,170,${alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - .02) * len, cy + Math.sin(a - .02) * len);
    ctx.lineTo(cx + Math.cos(a + .02) * len, cy + Math.sin(a + .02) * len);
    ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
  }
  ctx.restore();
}

function drawBokeh(ctx, W, H, ts) {
  S.bokeh.forEach(p => {
    const y = ((p.y + ts * p.vy) % 1) * H;
    const gr = ctx.createRadialGradient(p.x * W, y, 0, p.x * W, y, p.r);
    gr.addColorStop(0, `rgba(200,220,200,${p.alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(p.x * W, y, p.r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
  });
}

function drawVignette(ctx, W, H) {
  const str = gv("vig-str") / 100;
  const gr = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75);
  gr.addColorStop(0, "transparent"); gr.addColorStop(1, `rgba(0,0,0,${str * .85})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function drawGoldBorder(ctx, W, H, ts) {
  const pulse = .5 + .5 * Math.sin(ts * 1.5);
  // اللون مستقل عن لون الزخرفة — gold-col أولاً ثم orn-col للتوافق
  const goldEl = $("gold-col");
  const colorHex = (goldEl && goldEl.value) || $("orn-col").value || "#f0c842";
  const [r, g, b] = hex2rgb(colorHex);
  ctx.save();
  ctx.shadowColor = `rgba(${r},${g},${b},${.5 + pulse * .3})`; ctx.shadowBlur = 20 + pulse * 10;
  ctx.strokeStyle = `rgba(${r},${g},${b},.85)`; ctx.lineWidth = 2;
  rRect(ctx, 8, 8, W - 16, H - 16, 13); ctx.stroke();
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - .5) * 28;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(id, 0, 0);
}

// ===== التأثيرات الجديدة (per-pixel — قد تبطئ الواجهة عند تفعيل عدة منها معاً) =====
function applyPixelate(ctx, W, H) {
  const size = parseInt(gv("pixel-size")) || 8;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      const idx = (y * W + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = r; data[nidx + 1] = g; data[nidx + 2] = b;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyMosaic(ctx, W, H) {
  const size = parseInt(gv("mosaic-size")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            rSum += data[nidx]; gSum += data[nidx + 1]; bSum += data[nidx + 2]; count++;
          }
        }
      }
      const rAvg = Math.round(rSum / count), gAvg = Math.round(gSum / count), bAvg = Math.round(bSum / count);
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = rAvg; data[nidx + 1] = gAvg; data[nidx + 2] = bAvg;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyRipple(ctx, W, H, ts) {
  const amp = parseFloat(gv("ripple-amp")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const centerX = W / 2, centerY = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) + Math.sin(dist * 0.05 + ts * 5) * amp * 0.1;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyWave(ctx, W, H, ts) {
  const amp = parseFloat(gv("wave-amp")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const offsetX = Math.sin(y * 0.05 + ts * 5) * amp;
      const srcX = Math.min(W - 1, Math.max(0, x + offsetX));
      const srcIdx = (y * W + srcX) * 4, dstIdx = (y * W + x) * 4;
      newData[dstIdx] = data[srcIdx];
      newData[dstIdx + 1] = data[srcIdx + 1];
      newData[dstIdx + 2] = data[srcIdx + 2];
      newData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applySwirl(ctx, W, H) {
  const factor = parseFloat(gv("swirl-factor")) || 3;
  const centerX = W / 2, centerY = H / 2;
  const maxDist = Math.min(centerX, centerY);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const amount = (maxDist - dist) / maxDist * factor;
        const angle = Math.atan2(dy, dx) + amount;
        const srcX = Math.round(centerX + Math.cos(angle) * dist);
        const srcY = Math.round(centerY + Math.sin(angle) * dist);
        if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
          const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
          newData[dstIdx] = data[srcIdx];
          newData[dstIdx + 1] = data[srcIdx + 1];
          newData[dstIdx + 2] = data[srcIdx + 2];
          newData[dstIdx + 3] = data[srcIdx + 3];
          continue;
        }
      }
      const dstIdx = (y * W + x) * 4;
      newData[dstIdx]     = data[dstIdx];
      newData[dstIdx + 1] = data[dstIdx + 1];
      newData[dstIdx + 2] = data[dstIdx + 2];
      newData[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyKaleido(ctx, W, H) {
  const segments = parseInt(gv("kaleido-segments")) || 6;
  const centerX = W / 2, centerY = H / 2;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const angleStep = (Math.PI * 2) / segments;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX, dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);
      angle = angle % (angleStep * 2);
      if (angle < 0) angle += angleStep * 2;
      if (angle > angleStep) angle = angleStep * 2 - angle;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4, dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyGlitch(ctx, W, H) {
  const intensity = parseInt(gv("glitch-intensity")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const shift = Math.floor(intensity / 2);
  for (let y = 0; y < H; y += intensity * 2) {
    const offset = (Math.random() - 0.5) * shift;
    for (let x = 0; x < W; x++) {
      const srcX = Math.min(W - 1, Math.max(0, x + offset));
      const srcIdx = (y * W + srcX) * 4, dstIdx = (y * W + x) * 4;
      data[dstIdx]     = data[srcIdx];
      data[dstIdx + 1] = data[srcIdx + 1];
      data[dstIdx + 2] = data[srcIdx + 2];
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyOldFilm(ctx, W, H, ts) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i]     * 0.9 + 20);
    data[i + 1] = Math.min(255, data[i + 1] * 0.7 + 10);
    data[i + 2] = Math.min(255, data[i + 2] * 0.5 + 5);
    data[i]     += (Math.random() - 0.5) * 15;
    data[i + 1] += (Math.random() - 0.5) * 15;
    data[i + 2] += (Math.random() - 0.5) * 15;
  }
  if (Math.random() < 0.02) {
    const scratchY = Math.floor(Math.random() * H);
    for (let x = 0; x < W; x++) {
      const idx = (scratchY * W + x) * 4;
      for (let c = 0; c < 3; c++) data[idx + c] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ══════════════════════════════════════════════════════
//  LOGO
// ══════════════════════════════════════════════════════
const LOGO_PERSIST_KEY = "gt_sirm_logo_v1";

function onLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const isVideo = /\.(mov|mp4|webm)$/i.test(file.name) || file.type.startsWith("video/");

  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;

  if (isVideo) {
    const vid = document.createElement("video");
    vid.src = url;
    vid.loop = true; vid.muted = true; vid.playsInline = true; vid.autoplay = true;
    vid.onloadeddata = () => {
      S.logoVid = vid;
      vid.play().catch(() => {});
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = "";
      $("logo-vid-preview").src = url;
      $("logo-vid-preview").style.display = "block";
      $("logo-img-preview").style.display = "none";
      toast("✅ شعار فيديو تم تحميله (الفيديو لا يُحفظ — حجمه كبير)", "info", 5000);
      try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
    };
    vid.onerror = () => toast("❌ فشل تحميل الفيديو", "error");
    vid.load();
  } else {
    const img = new Image();
    img.onload = () => {
      S.logoImg = img;
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = url;
      $("logo-img-preview").style.display = "block";
      $("logo-vid-preview").style.display = "none";
      toast("✅ تم تحميل الشعار — سيُحفظ تلقائياً للمشاريع القادمة", "success");
    };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;

    // احفظ الشعار كـ dataURL لاستعادته في الجلسات القادمة
    const fr = new FileReader();
    fr.onload = () => {
      try { localStorage.setItem(LOGO_PERSIST_KEY, fr.result); }
      catch (e) {
        console.warn("Logo too large for localStorage:", e);
        toast("⚠️ الشعار يعمل لهذه الجلسة لكن حجمه يتجاوز سعة الحفظ — لن يُستعاد لاحقاً", "info", 4000);
      }
    };
    fr.readAsDataURL(file);
  }
}

function removeLogo() {
  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;
  $("logo-preview").style.display = "none";
  $("logo-upload").value = "";
  try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
  toast("🗑️ تمت إزالة الشعار", "info");
}

function restoreLogo() {
  let dataUrl = null;
  try { dataUrl = localStorage.getItem(LOGO_PERSIST_KEY); } catch (_) {}
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => {
    S.logoImg = img;
    const prevEl = $("logo-preview");
    const imgPrev = $("logo-img-preview");
    const vidPrev = $("logo-vid-preview");
    if (prevEl) prevEl.style.display = "block";
    if (imgPrev) { imgPrev.src = dataUrl; imgPrev.style.display = "block"; }
    if (vidPrev) vidPrev.style.display = "none";
  };
  img.onerror = () => { try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {} };
  img.src = dataUrl;
}

function drawLogo(ctx, W, H) {
  const src = S.logoVid || S.logoImg;
  if (!src) return;

  const pos = $("logo-pos").value;
  const size = parseInt(gv("logo-size")) || 60;
  const opacity = (parseInt(gv("logo-opacity")) || 80) / 100;

  if (S.logoVid && S.logoVid.readyState < 2) return;

  const natW = src.naturalWidth || src.videoWidth || size;
  const natH = src.naturalHeight || src.videoHeight || size;

  let drawW = size;
  let drawH = natH / natW * size;
  if (drawH > size * 2.5) { drawH = size; drawW = natW / natH * size; }

  let x, y;
  const pad = 15;
  switch (pos) {
    case "br": x = W - drawW - pad; y = H - drawH - pad; break;
    case "bl": x = pad; y = H - drawH - pad; break;
    case "tr": x = W - drawW - pad; y = pad; break;
    case "tl": x = pad; y = pad; break;
    case "center": x = (W - drawW) / 2; y = (H - drawH) / 2; break;
    default: x = W - drawW - pad; y = H - drawH - pad;
  }

  // v0.7.1 — Chromakey للشعار
  const chromaOn = ge("logo-chroma-on");
  if (chromaOn) {
    const tmp = getLogoChromaCanvas(Math.ceil(drawW), Math.ceil(drawH));
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(src, 0, 0, drawW, drawH);
    removeBgColorFromRegion(tctx, 0, 0, Math.ceil(drawW), Math.ceil(drawH), {
      colorHex: $("logo-chroma-color")?.value || "#ffffff",
      threshold: parseFloat(gv("logo-chroma-threshold")) || 25,
      softness: parseFloat(gv("logo-chroma-softness")) || 10,
    });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(tmp, x, y);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(src, x, y, drawW, drawH);
    ctx.restore();
  }
}

let _logoChromaCanvas = null;
function getLogoChromaCanvas(w, h) {
  if (!_logoChromaCanvas) _logoChromaCanvas = document.createElement("canvas");
  if (_logoChromaCanvas.width !== w) _logoChromaCanvas.width = w;
  if (_logoChromaCanvas.height !== h) _logoChromaCanvas.height = h;
  return _logoChromaCanvas;
}

// ══════════════════════════════════════════════════════
//  VERSE RENDERING
// ══════════════════════════════════════════════════════
// ── رسم اسم السورة في أعلى المقطع ─────────────────
// v0.5.6 — عنوان مخصّص للمقطع (مستقلّ، مع توگل لتجنّب التعارض مع اسم السورة)
// v0.7.0 — فيديو التلاوة الجاهز
let _recVidCanvas = null;
function getRecVidCanvas(W, H) {
  if (!_recVidCanvas) _recVidCanvas = document.createElement("canvas");
  if (_recVidCanvas.width !== W) _recVidCanvas.width = W;
  if (_recVidCanvas.height !== H) _recVidCanvas.height = H;
  return _recVidCanvas;
}
function drawRecitationVideo(ctx, W, H) {
  const v = S.recVidEl;
  if (!v || v.readyState < 2) return;
  const sw = v.videoWidth, sh = v.videoHeight;
  if (!sw || !sh) return;
  const fit = $("recvid-fit")?.value || "contain";
  const xPct = parseFloat(gv("recvid-x")) || 0;
  const yPct = parseFloat(gv("recvid-y")) || 0;
  const scale = (parseFloat(gv("recvid-scale")) || 100) / 100;
  let dw, dh;
  const ir = sw / sh, cr = W / H;
  if (fit === "stretch") { dw = W; dh = H; }
  else if (fit === "actual") { dw = sw; dh = sh; }
  else if (fit === "cover") {
    if (ir > cr) { dh = H; dw = dh * ir; } else { dw = W; dh = dw / ir; }
  } else {
    if (ir > cr) { dw = W; dh = dw / ir; } else { dh = H; dw = dh * ir; }
  }
  dw *= scale; dh *= scale;
  const dx = (W - dw) / 2 + (xPct / 100) * W;
  const dy = (H - dh) / 2 + (yPct / 100) * H;
  const tmp = getRecVidCanvas(W, H);
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.clearRect(0, 0, W, H);
  tctx.drawImage(v, dx, dy, dw, dh);
  const rx = Math.max(0, Math.floor(dx)), ry = Math.max(0, Math.floor(dy));
  const rw = Math.min(W - rx, Math.ceil(dw)), rh = Math.min(H - ry, Math.ceil(dh));
  if (rw > 0 && rh > 0) removeBlackBackground(tctx, rx, ry, rw, rh);
  ctx.drawImage(tmp, 0, 0);
}
// v0.7.1 — خوارزميّة موحّدة (أسود/أبيض → سطوع، ألوان → YCbCr)
function removeBgColorFromRegion(ctx, x, y, w, h, opts) {
  const colorHex = opts.colorHex || "#000000";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const threshold = opts.threshold ?? 25;
  const softness = opts.softness ?? 10;
  const maxCh = Math.max(kR, kG, kB);
  const minCh = Math.min(kR, kG, kB);
  const isGrayscale = (maxCh - minCh) < 25;
  const isDark = isGrayscale && maxCh < 60;
  const isLight = isGrayscale && minCh > 195;

  let mode, lo, hi, range, keyCb, keyCr, sim, smooth;
  if (isDark) {
    mode = "dark";
    lo = threshold * 2.55;
    hi = lo + softness * 2.55;
    range = Math.max(0.5, hi - lo);
  } else if (isLight) {
    mode = "light";
    hi = 255 - threshold * 2.55;
    lo = hi - softness * 2.55;
    range = Math.max(0.5, hi - lo);
  } else {
    mode = "ycbcr";
    keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128;
    keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128;
    sim = threshold * 1.5;
    smooth = Math.max(0.5, softness * 1.5);
  }

  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let alpha;
    if (mode === "dark") {
      const lum = Math.max(r, g, b);
      if (lum <= lo) alpha = 0;
      else if (lum >= hi) alpha = 1;
      else alpha = (lum - lo) / range;
    } else if (mode === "light") {
      const lum = Math.min(r, g, b);
      if (lum >= hi) alpha = 0;
      else if (lum <= lo) alpha = 1;
      else alpha = (hi - lum) / range;
    } else {
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
      const dx = cb - keyCb, dy = cr - keyCr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < sim) alpha = 0;
      else if (dist < sim + smooth) alpha = (dist - sim) / smooth;
      else alpha = 1;
    }
    d[i + 3] = d[i + 3] * alpha;
  }
  ctx.putImageData(img, x, y);
}

function removeBlackBackground(ctx, x, y, w, h) {
  removeBgColorFromRegion(ctx, x, y, w, h, {
    colorHex: $("recvid-bgcolor")?.value || "#000000",
    threshold: parseFloat(gv("recvid-threshold")) || 25,
    softness: parseFloat(gv("recvid-softness")) || 10,
  });
}
function onRecVidFile(input) {
  const file = input.files[0];
  if (!file) return;
  removeRecVid();
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
  v.onloadedmetadata = () => {
    const sec = isFinite(v.duration) ? v.duration : 0;
    const info = $("recvid-info");
    if (info) info.textContent = `✅ ${file.name} · ${v.videoWidth}×${v.videoHeight} · ${sec.toFixed(1)}s · ${(file.size / 1e6).toFixed(1)}MB`;
    resumeAudioCtx().then(ctx => {
      try {
        const src = ctx.createMediaElementSource(v);
        src.connect(ctx.destination);
        src.connect(S.analyser);
        src.connect(S.exportDest);
        S.recVidAudioSource = src;
        if (typeof applyRecVidFXLive === "function") applyRecVidFXLive();
      } catch (_) {}
    }).catch(console.warn);
    // v1.1.0 — إن كان توگل "إظهار النَصّ فوق الفيديو" مُفعَّلاً ولَدَينا آيات مُحمَّلة، احفَظها ووَزِّع مُدّة الفيديو
    const keepText = ge("recvid-showtext") && S.verses.length && !(S.verses.length === 1 && S.verses[0]?.recvid);
    if (keepText) {
      const perVerse = sec / S.verses.length;
      S.verses = S.verses.map(v => ({ ...v, manualDuration: perVerse, audio: null, audioSecondary: [] }));
      S.ayaDurations = S.verses.map(() => perVerse);
    } else {
      S.verses = [{ text: "", numberInSurah: 1, number: 1, audio: null, audioSecondary: [], manualDuration: sec, free: true, recvid: true }];
      S.ayaDurations = [sec];
    }
    S.currentAya = 0; S.elapsed = 0;
    if (typeof updateAyaUI === "function") updateAyaUI();
    toast(`🎥 تمّ تحميل فيديو التلاوة (${sec.toFixed(1)}s)`, "success", 2200);
  };
  v.onerror = () => toast("❌ فشل تحميل الفيديو", "error", 2500);
  S.recVidEl = v;
  S.recVidFile = file;
  if (typeof markProjectDirty === "function") markProjectDirty();
  input.value = "";
}
function removeRecVid() {
  if (S.recVidAudioSource) { try { S.recVidAudioSource.disconnect(); } catch (_) {} S.recVidAudioSource = null; }
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.src = ""; } catch (_) {} S.recVidEl = null; }
  S.recVidFile = null;
  const info = $("recvid-info"); if (info) info.textContent = "";
}

function drawVideoTitle(ctx, W, H) {
  if (!ge("vtitle-on")) return;
  const text = ($("vtitle-text")?.value || "").trim();
  if (!text) return;

  const font = fontVal();
  const fsz = W * 0.055 * ((parseFloat(gv("vtitle-size")) || 90) / 100);
  const yPct = parseFloat(gv("vtitle-y")) || 6;
  const y = (yPct / 100) * H + fsz;
  const col = $("vtitle-col")?.value || "#ffe082";
  const fx = $("vtitle-fx")?.value || "shadow";

  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";

  if (fx === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,.75)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillText(text, W / 2, y);
  } else if (fx === "glow") {
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
    ctx.fillText(text, W / 2, y);
    ctx.shadowBlur = 0;
    ctx.fillText(text, W / 2, y);
  } else if (fx === "outline") {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, fsz * 0.06);
    ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.strokeText(text, W / 2, y);
    ctx.fillText(text, W / 2, y);
  } else {
    ctx.fillText(text, W / 2, y);
  }
  ctx.restore();
}

function drawSurahName(ctx, W, H) {
  if (!ge("sname-on")) return;
  if (!S.surahs || !S.surahs.length) return;
  const surahNum = parseInt($("surah-sel")?.value) || 1;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (!surah) return;

  const prefix = $("sname-prefix")?.value || "surah";
  const rawName = surah.name || "";
  const cleanName = rawName.replace(/^\s*(?:سُورَةُ|سُورَة|سُورة|سورة)\s+/u, "");
  const label = prefix === "surah" ? `سُورَةُ ${cleanName}`
              : prefix === "hizb"  ? `حِزْبُ ${cleanName}`
              :                       cleanName;

  const font = fontVal();
  const fsz = W * 0.05 * ((parseFloat(gv("sname-size")) || 80) / 100);
  const yPct = parseFloat(gv("sname-y")) || 5;
  const y = (yPct / 100) * H + fsz;
  const col = $("sname-col")?.value || "#f0c842";

  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = 10;
  ctx.fillText(label, W / 2, y);
  ctx.restore();
}

function drawVerse(ctx, W, H, ts) {
  const aya = S.verses[S.currentAya]; if (!aya) return;
  // v0.8.1 — تجاهل الشرائح المعطّلة
  if (aya.enabled === false) return;
  const font = fontVal();
  const txtCol = $("txt-col").value;
  const shdCol = $("shd-col").value;
  const fsz = W * .062 * (gv("fsize") / 100);
  const lh = parseFloat(gv("lh"));
  const tpos = radioVal("tpos");
  const textEff = radioVal("te");
  let animType = radioVal("tanim");
  // في وضع "مختلط": اختر التأثير الفعلي للآية الحالية
  if (animType === "mix") animType = getMixedAnimForCurrentAya();
  const dur = S.ayaDurations[S.currentAya] || 6;

  let alpha = 1;
  let trX = 0, trY = 0, scX = 1, scY = 1, blurPx = 0, glowBoost = 0;

  if (animType !== "none" && animType !== "word") {
    const w = (S.elapsed % dur) / dur;
    const easeIn = (p) => 1 - Math.pow(1 - p, 3);
    const IN_END = 0.15, OUT_START = 0.85;

    if (animType === "fade") {
      if (w < IN_END)        alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "slide") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trX = (1 - easeIn(p)) * W * 0.4;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        trX = -(1 - p) * W * 0.4;
      }
    }
    else if (animType === "zoom") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        scX = scY = 0.55 + 0.45 * easeIn(p);
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        scX = scY = 1 + (1 - p) * 0.35;
      }
    }
    else if (animType === "drop") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trY = -(1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "rise") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        trY = (1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "blur") {
      if (w < IN_END) {
        const p = w / IN_END; alpha = p;
        blurPx = (1 - p) * 18;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START); alpha = p;
        blurPx = (1 - p) * 12;
      }
    }
    else if (animType === "glow") {
      if (w < IN_END) alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
      glowBoost = 12 + 16 * (0.5 + 0.5 * Math.sin(ts * 4));
    }
  }

  ctx.save();
  ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.globalAlpha = alpha;
  if (blurPx > 0.5) ctx.filter = `blur(${blurPx}px)`;
  if (trX || trY || scX !== 1 || scY !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.translate(trX, trY);
    ctx.scale(scX, scY);
    ctx.translate(-W / 2, -H / 2);
  }
  ctx.font = `${fsz}px ${font}`; ctx.fillStyle = txtCol;
  const drawTxt = setTextFx(ctx, textEff, txtCol, shdCol);
  if (glowBoost) ctx.shadowBlur = (ctx.shadowBlur || 0) + glowBoost;

  const lines = wrapText(ctx, aya.text, W * .85, fsz, font);
  const lineH = fsz * lh, totalH = lines.length * lineH;
  const hasT = S.translations[S.currentAya];
  let startY;
  if (tpos === "top") startY = H * .1 + fsz;
  else if (tpos === "bottom") startY = H * .82 - totalH + fsz;
  else startY = H * .5 - totalH * (hasT ? .4 : .5) + fsz;
  // v0.8.1 — إزاحة عموديّة يدويّة
  const yOffsetPct = parseFloat(gv("text-y-offset")) || 0;
  startY += (yOffsetPct / 100) * H;

  if (animType === "word") {
    drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt);
  } else {
    lines.forEach((line, i) => drawTxt(W / 2, startY + i * lineH, line));
  }

  if (hasT) {
    const tfsPct = gv("tfs") / 100;
    const tfs = W * .03 * tfsPct * 1.6;
    ctx.font = `${tfs}px 'Cairo',sans-serif`;
    ctx.fillStyle = $("trans-col").value;
    ctx.globalAlpha = alpha * .75;
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    const tLines = wrapText(ctx, hasT, W * .8, tfs, "Cairo");
    const tStart = startY + totalH + tfs * 1.2;
    tLines.forEach((tl, i) => ctx.fillText(tl, W / 2, tStart + i * tfs * 1.4));
  }

  // رقم الآية يظهر فقط للآيات القرآنيّة الحقيقيّة (ليس للنصّ الحرّ)
  if (!aya.free) {
    ctx.globalAlpha = alpha * .6;
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    ctx.font = `bold ${W * .022}px 'Cairo'`;
    ctx.fillStyle = $("orn-col").value;
    ctx.fillText(`❴ ${aya.numberInSurah} ❵`, W / 2, startY + totalH + (hasT ? 0 : W * .04));
  }

  ctx.restore();
}

// ── الكشف التدريجي للكلمات ─────────────────────────────
function drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt) {
  const fadeMs = parseInt(gv("word-fade-ms") || "180");
  const keepPrev = ge("word-keep");
  const paceVal = $("word-pace")?.value || "auto";

  const wordList = [];
  lines.forEach((line, lineIdx) => {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((w, wIdx) => wordList.push({ text: w, lineIdx, wIdx }));
  });

  const N = wordList.length;
  if (N === 0) return;

  const wordDuration = (paceVal === "auto") ? (dur / N) : parseFloat(paceVal);
  const spaceW = ctx.measureText(" ").width;

  const linePositions = lines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const widths = words.map(w => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    const xRight = W / 2 + lineW / 2;
    const xs = [];
    let cur = xRight;
    for (let i = 0; i < words.length; i++) { xs.push(cur); cur -= widths[i] + spaceW; }
    return xs;
  });

  const oldAlign = ctx.textAlign;
  ctx.textAlign = "right";

  for (let k = 0; k < N; k++) {
    const wordStart = k * wordDuration;
    if (S.elapsed < wordStart) continue;
    if (!keepPrev) {
      const wordEnd = wordStart + wordDuration;
      if (S.elapsed >= wordEnd) continue;
    }
    const sinceStart = S.elapsed - wordStart;
    let a = 1;
    if (fadeMs > 0 && sinceStart * 1000 < fadeMs) a = (sinceStart * 1000) / fadeMs;
    if (!keepPrev) {
      const fadeOutStart = wordDuration - fadeMs / 1000;
      if (fadeMs > 0 && sinceStart > fadeOutStart) {
        a = Math.min(a, (wordDuration - sinceStart) / (fadeMs / 1000));
      }
    }
    a = Math.max(0, Math.min(1, a));

    const w = wordList[k];
    const xs = linePositions[w.lineIdx];
    if (!xs) continue;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = txtCol;
    if (typeof drawTxt === "function") drawTxt(xs[w.wIdx], startY + w.lineIdx * lineH, w.text);
    else                                ctx.fillText(w.text, xs[w.wIdx], startY + w.lineIdx * lineH);
    ctx.restore();
  }
  ctx.textAlign = oldAlign;
}

function onTanimChange() {
  const v = radioVal("tanim");
  const wordCtrl = $("word-mode-ctrl");
  if (wordCtrl) wordCtrl.style.display = (v === "word" || (v === "mix" && S.mixedAnimsOrder.includes("word"))) ? "block" : "none";
  // عدة لوحات mix-anims-ctrl (في النصوص + FX) — أظهرها كلها
  document.querySelectorAll(".mix-anims-ctrl").forEach(el => {
    el.style.display = v === "mix" ? "block" : "none";
  });
  // مزامنة كل راديوهات tanim (في القسمَين) مع بعضها
  document.querySelectorAll(`input[name="tanim"]`).forEach(r => { r.checked = (r.value === v); });
}

// ── إدارة وضع "مختلط" ────────────────────────────────
function onMixAnimChange(e) {
  const v = e.target.value;
  const order = S.mixedAnimsOrder;
  if (e.target.checked) {
    if (!order.includes(v)) order.push(v);
  } else {
    const idx = order.indexOf(v);
    if (idx >= 0) order.splice(idx, 1);
  }
  updateMixAnimsUI();
  try { localStorage.setItem("gt_sirm_mixed_anims", JSON.stringify(order)); } catch (_) {}
  onTanimChange();
}

function updateMixAnimsUI() {
  const order = S.mixedAnimsOrder;
  document.querySelectorAll(".mix-anim").forEach(cb => {
    const idx = order.indexOf(cb.value);
    cb.checked = idx >= 0;
    const numEl = cb.parentElement.querySelector(".mix-num");
    if (numEl) numEl.textContent = idx >= 0 ? `[${idx + 1}]` : "";
  });
  const labels = { fade:"تلاشي", slide:"انزلاق", zoom:"تكبير", drop:"سقوط", rise:"صعود", blur:"ضبابي", glow:"توهج", word:"كلمة-بكلمة" };
  const text = order.length
    ? "الترتيب: " + order.map((v, i) => `${i+1}. ${labels[v] || v}`).join(" ← ")
    : "— اختر تأثيراً أو أكثر —";
  document.querySelectorAll(".mix-anims-summary").forEach(el => { el.textContent = text; });
}

function getMixedAnimForCurrentAya() {
  const order = S.mixedAnimsOrder;
  if (!order.length) return "fade";
  return order[(S.currentAya || 0) % order.length];
}

function restoreMixedAnimsOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem("gt_sirm_mixed_anims") || "[]");
    if (Array.isArray(saved)) S.mixedAnimsOrder = saved.filter(v => typeof v === "string");
  } catch (_) {}
  updateMixAnimsUI();
}

// ── تأثيرات النص — يُهيِّئ ctx ويُرجع دالة رسم تتعامل
//    مع التأثيرات التي تحتاج عدة fillText/strokeText
function setTextFx(ctx, eff, txtCol, shdCol) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const [sr, sg, sb] = hex2rgb(shdCol);
  const simple = (x, y, text) => ctx.fillText(text, x, y);

  switch (eff) {
    case "glow":
      ctx.shadowColor = "#f0c842"; ctx.shadowBlur = 28;
      return simple;
    case "neon":
      ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 22;
      return (x, y, text) => { ctx.fillText(text, x, y); ctx.fillText(text, x, y); };
    case "outline":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        ctx.save();
        ctx.lineJoin = "round"; ctx.miterLimit = 2;
        ctx.strokeStyle = shdCol || "#000";
        ctx.lineWidth = Math.max(3, fontSize * 0.08);
        ctx.strokeText(text, x, y);
        ctx.restore();
        ctx.fillText(text, x, y);
      };
    case "shadow3d":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const layers = 10;
        const maxOff = Math.max(3, fontSize * 0.09);
        const oldFill = ctx.fillStyle;
        for (let i = layers; i >= 1; i--) {
          const p = i / layers;
          const off = maxOff * p;
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.55 * p})`;
          ctx.fillText(text, x + off, y + off);
        }
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };
    case "emboss":
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };
    case "carved":
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.globalCompositeOperation = "multiply";
        ctx.fillText(text, x, y);
        ctx.globalCompositeOperation = "source-over";
      };
    case "gold":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y - fontSize, x, y + fontSize * 0.2);
        grad.addColorStop(0,    "#fff5b0");
        grad.addColorStop(0.3,  "#f0c842");
        grad.addColorStop(0.55, "#b8860b");
        grad.addColorStop(0.8,  "#f0c842");
        grad.addColorStop(1,    "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };
    case "fire":
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y + fontSize * 0.3, x, y - fontSize);
        grad.addColorStop(0,   "#7a0000");
        grad.addColorStop(0.3, "#e63b00");
        grad.addColorStop(0.7, "#ffb700");
        grad.addColorStop(1,   "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(230,59,0,.7)"; ctx.shadowBlur = 18;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };
    case "soft":
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.5)`; ctx.shadowBlur = 16;
      return simple;
    case "none":
    default:
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.7)`; ctx.shadowBlur = 12;
      return simple;
  }
}

function wrapText(ctx, text, maxW, fsz, font) {
  ctx.font = `${fsz}px ${font}`;
  const words = text.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ══════════════════════════════════════════════════════
//  WAVEFORM
// ══════════════════════════════════════════════════════
function getWaveData(ts) {
  // أثناء تصدير V2: استخدم بيانات FFT المُحسوبة مسبقاً من mixed buffer
  if (S._exportWaveData) {
    S.waveData = S._exportWaveData;
    return;
  }
  if (S.analyser) {
    const full = new Uint8Array(S.analyser.frequencyBinCount);
    S.analyser.getByteFrequencyData(full);
    if (full.some(v => v > 15)) {
      const voiceStart = 1;
      const voiceEnd = Math.min(35, full.length - 1);
      const voiceBins = full.slice(voiceStart, voiceEnd + 1);
      const out = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        const srcIdx = Math.floor(i / 64 * voiceBins.length);
        out[i] = voiceBins[srcIdx];
      }
      S.waveData = out;
      return;
    }
  }
  const n = 64;
  const data = new Uint8Array(n);
  const active = S.playing || (S.bgAudioEl && !S.bgAudioEl.paused);
  if (active) {
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const fund = Math.exp(-Math.pow(f - 0.25, 2) / 0.018) * 0.90;
      const harm1 = Math.exp(-Math.pow(f - 0.48, 2) / 0.022) * 0.70;
      const harm2 = Math.exp(-Math.pow(f - 0.70, 2) / 0.025) * 0.45;
      const sublow = f < 0.10 ? (1 - f / 0.10) * 0.55 : 0;
      const envelope = fund + harm1 + harm2 + sublow;
      const pulse = 0.65 + 0.35 * Math.sin(ts * 4.2 + i * 0.4);
      const slow = 0.55 + 0.45 * Math.sin(ts * 1.3 + i * 0.2 + 1.1);
      const noise = Math.random() * 0.05;
      const val = (pulse * 0.50 + slow * 0.40 + noise + 0.10) * envelope;
      data[i] = Math.min(255, Math.floor(val * 300));
    }
  }
  S.waveData = data;
}

function drawWave(ctx, W, H, ts) {
  if (!ge("wave-on")) return;
  getWaveData(ts);
  const shape = radioVal("ws");
  const col = $("wave-col").value;
  const pos = $("wave-pos").value;
  const gain = (parseInt(gv("wave-gain")) || 100) / 100;
  const wh = parseInt(gv("wave-h")) * gain;
  const n = S.waveData.length;
  const [cr, cg, cb] = hex2rgb(col);

  ctx.save();

  const BASE = pos === "top" ? 4 + wh : H - 4;
  const SIGN = pos === "top" ? 1 : -1;

  if (shape === "bars") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.78, bh);
    }
  } else if (shape === "wave") {
    ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.moveTo(0, BASE); ctx.lineTo(W, BASE); ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n);
      const y = BASE + SIGN * bh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = col;
    ctx.lineTo(W, BASE); ctx.lineTo(0, BASE); ctx.closePath(); ctx.fill();
  } else if (shape === "dots") {
    for (let i = 0; i < n; i += 2) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n) + (W / n);
      const y = BASE + SIGN * bh;
      const r = 1.8 + (S.waveData[i] / 255) * 3.2;
      ctx.globalAlpha = 0.55 + 0.4 * (S.waveData[i] / 255);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x - 1, Math.min(y, BASE), 2, bh);
    }
  } else if (shape === "mirror") {
    const cy = pos === "top" ? 4 + wh / 2 : H - 4 - wh / 2;
    const hw = wh / 2;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    for (let i = n - 1; i >= 0; i--) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.closePath(); ctx.fill();
  } else if (shape === "circle") {
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.09;
    ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const amp = (S.waveData[idx] / 255) * wh * 0.5;
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = baseR + amp;
      i === 0 ? ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
      : ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    const gr = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, baseR + wh * 0.55);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
    gr.addColorStop(1, `rgba(${cr},${cg},${cb},0.9)`);
    ctx.strokeStyle = gr; ctx.stroke();
    ctx.globalAlpha = 0.06; ctx.fillStyle = col; ctx.fill();
  } else if (shape === "spectrum") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const hue = (i / n) * 200 + 140;
      const alpha = 0.35 + 0.6 * (S.waveData[i] / 255);
      ctx.fillStyle = `hsla(${hue},80%,62%,${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.82, bh);
      if (bh > 4) {
        ctx.fillStyle = `hsla(${hue},100%,90%,${alpha * 0.75})`;
        ctx.fillRect(i * bw, yTop, bw * 0.82, 2);
      }
    }
  } else if (shape === "rays") {
    const cx = W / 2;
    const cy = (pos === "top") ? 4 + wh : H - 4;
    ctx.lineWidth = 2; ctx.lineCap = "round";
    const halfArc = Math.PI * 0.85;
    const startAngle = (pos === "top") ? (Math.PI / 2 - halfArc / 2) : (-Math.PI / 2 - halfArc / 2);
    for (let i = 0; i < n; i++) {
      const amp = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      const a = startAngle + (i / (n - 1)) * halfArc;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * amp, cy + Math.sin(a) * amp);
      ctx.stroke();
    }
  } else if (shape === "triangles") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      if (bh < 1) continue;
      const alpha = 0.45 + 0.5 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const cxBar = i * bw + bw * 0.5;
      const yTip = BASE + SIGN * bh;
      ctx.beginPath();
      ctx.moveTo(cxBar - bw * 0.4, BASE);
      ctx.lineTo(cxBar + bw * 0.4, BASE);
      ctx.lineTo(cxBar, yTip);
      ctx.closePath(); ctx.fill();
    }
  } else if (shape === "rings") {
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.06;
    const numRings = Math.min(n, 12);
    for (let r = 0; r < numRings; r++) {
      const idx = Math.floor((r / numRings) * n);
      const amp = (S.waveData[idx] / 255) * wh * 0.6;
      const radius = baseR + r * (Math.min(W, H) * 0.025) + amp;
      const alpha = (0.4 + 0.5 * (S.waveData[idx] / 255)) * (1 - r / numRings);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.lineWidth = 1.5 + 1.5 * (S.waveData[idx] / 255);
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (shape === "mountains") {
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, BASE);
    const step = W / (n - 1);
    for (let i = 0; i < n - 1; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const nb = (S.waveData[i + 1] / 255) * wh;
      const x = i * step, y = BASE + SIGN * bh;
      const xN = (i + 1) * step, yN = BASE + SIGN * nb;
      const cpX = (x + xN) / 2;
      ctx.quadraticCurveTo(cpX, y, xN, yN);
    }
    ctx.lineTo(W, BASE);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  WATERMARK
// ══════════════════════════════════════════════════════
function drawWatermark(ctx, W, H) {
  const wmOn = document.getElementById("wm-on");
  if (wmOn && !wmOn.checked) return;
  const text = $("wm-text").value.trim(); if (!text) return;
  const sz = parseInt(gv("wm-size")), pos = $("wm-pos").value, col = $("wm-col").value;
  // v1.2 — اِرتفاع من الحافّة
  const _yOffPct = Math.max(0, Math.min(40, parseFloat(gv("wm-y-offset") || "0"))) / 100;
  const _yOff = H * _yOffPct;
  ctx.save(); ctx.font = `bold ${sz}px 'Cairo'`; ctx.fillStyle = col; ctx.globalAlpha = .72;
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
  const pad = sz + 8;
  const pm = {
    br: ["right", W - pad, H - pad - _yOff],
    bl: ["left",  pad,     H - pad - _yOff],
    tr: ["right", W - pad, pad + sz + _yOff],
    tl: ["left",  pad,     pad + sz + _yOff],
  };
  const [align, x, y] = pm[pos] || pm.br;
  ctx.textAlign = align; ctx.fillText(text, x, y);
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════════════════════
function ensureAudioCtx() {
  if (!S.audioCtx || S.audioCtx.state === "closed") {
    S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    S.exportDest = S.audioCtx.createMediaStreamDestination();
    S.analyser = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 512;
    S.analyser.smoothingTimeConstant = .82;
    S.analyser.connect(S.exportDest);
  }
  return S.audioCtx;
}

async function resumeAudioCtx() {
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

let _recGen = 0;

async function playRecitationAudio() {
  if (S.exporting) return;
  stopRecitationAudio();
  if (!S.verses.length || !S.playing) return;
  // v0.4.1 — في وضع النصّ الحرّ كمصدر: لا نشغّل أيّ صوت قارئ من القرآن
  if (S.useFreeAsSource) {
    $("audio-status").textContent = "✍️ نصّ حرّ — التوقيت اليدويّ";
    return;
  }
  const aya = S.verses[S.currentAya];
  if (!aya) return;
  if (aya.free || aya.audio === null) {
    $("audio-status").textContent = "✍️ شريحة نصّ حرّ";
    return;
  }

  const myGen = ++_recGen;
  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
  $("audio-status").textContent = `⏳ جاري التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;

  const onEnded = () => {
    if (!S.playing || myGen !== _recGen) return;
    // الانتظار حسب فاصل الصمت قبل الانتقال للآية التالية
    const gap = getAyaGap();
    const advance = () => {
      if (!S.playing || myGen !== _recGen) return;
      if (S.currentAya < S.verses.length - 1) {
        S.currentAya++; S.elapsed = 0; playRecitationAudio(); updateAyaUI();
      } else {
        pausePlayer(); S.currentAya = 0; S.elapsed = 0; updateAyaUI();
      }
    };
    if (gap > 0) setTimeout(advance, gap * 1000);
    else advance();
  };

  try {
    const ctx = await resumeAudioCtx();
    if (myGen !== _recGen) return;

    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();
    if (myGen !== _recGen) return;

    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    if (myGen !== _recGen) return;

    S.ayaDurations[S.currentAya] = audioBuf.duration;

    const gainNode = ctx.createGain();
    gainNode.gain.value = gv("rec-vol") / 100;
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.connect(S.analyser);
    // v1.2 — استَأنِف من مَوضِع التوقّف داخِل الآية (S.elapsed) بَدَل البِداية دائماً
    const resumeOffset = Math.max(0, Math.min(S.elapsed || 0, audioBuf.duration - 0.05));
    source.start(0, resumeOffset);
    source.onended = onEnded;
    S.recAudioSource = source;
    S.recGainNode = gainNode;
    $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  } catch (err) {
    if (myGen !== _recGen) return;
    console.warn("AudioBuffer fetch failed, using HTMLAudioElement:", err.message);
    const a = new Audio();
    a.crossOrigin = null;
    a.volume = gv("rec-vol") / 100;
    a.onloadedmetadata = () => {
      if (myGen === _recGen) {
        S.ayaDurations[S.currentAya] = a.duration || 6;
        // v1.2 — استَأنِف من مَوضِع التوقّف
        const off = Math.max(0, Math.min(S.elapsed || 0, (a.duration || 0) - 0.05));
        if (off > 0.05) { try { a.currentTime = off; } catch (_) {} }
      }
    };
      a.onended = onEnded;
      a.onerror = () => {
        if (myGen !== _recGen) return;
        S.ayaDurations[S.currentAya] = parseFloat(gv("aya-dur")) || 6;
        $("audio-status").textContent = `❌ فشل التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;
      };
      a.src = url;
      a.play().catch(() => {});
      S.recAudioEl = a;
      $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  }
}

function stopRecitationAudio() {
  if (S.recAudioSource) {
    try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (e) { }
    S.recAudioSource = null;
  }
  if (S.recGainNode) {
    try { S.recGainNode.disconnect(); } catch (e) { }
    S.recGainNode = null;
  }
  if (S.recAudioEl) {
    S.recAudioEl.pause();
    S.recAudioEl.src = "";
    S.recAudioEl = null;
  }
}

// ── تقطيع نطاق زمني للوسائط المحلية ───────────────────
function getBgVidTrim() {
  // v1.2 — الأَولويّة لِتَقليم المَقطع النَشِط (per-clip)
  const item = S.bgVidItems[S.bgVidActiveIdx];
  if (item && hasBgClipTrim(item)) {
    return { start: getBgClipTrimStart(item), end: getBgClipTrimEnd(item) };
  }
  // fallback: التَقليم العالميّ (legacy)
  if (!ge("bg-vid-trim-on") || !S.bgVid) return null;
  const s = Math.max(0, parseFloat(gv("bg-vid-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-vid-trim-end")) || s + 1);
  const dur = S.bgVid.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}
function getBgAudioTrim() {
  // الأولوية الأولى: trim الخاصّ بالنصّ الحرّ (v0.4.4)
  if (S.freeAudioTrim && ge("free-audio-trim-on") && S.bgAudioEl) {
    const s = Math.max(0, S.freeAudioTrim.start || 0);
    const e = Math.max(s + 0.1, S.freeAudioTrim.end || s + 1);
    const dur = S.bgAudioEl.duration;
    return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
  }
  if (!ge("bg-audio-trim-on") || !S.bgAudioEl) return null;
  const s = Math.max(0, parseFloat(gv("bg-audio-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-audio-trim-end")) || s + 1);
  const dur = S.bgAudioEl.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}
function applyBgVidTrim() {
  const t = getBgVidTrim();
  if (!t || !S.bgVid) return;
  if (S.bgVid.currentTime < t.start || S.bgVid.currentTime > t.end) {
    try { S.bgVid.currentTime = t.start; } catch (_) {}
  }
  // v1.2 Bug#2 — أُزيل timeupdate handler السابق (كان يَقفِل clip 0 في playlist)
  //   updateBgVidCrossfade تُدير حُدود trim + switchToNextBgVid تلقائيّاً
}
function applyBgAudioTrim() {
  const t = getBgAudioTrim();
  if (!t || !S.bgAudioEl) return;
  if (S.bgAudioEl.currentTime < t.start || S.bgAudioEl.currentTime > t.end) {
    try { S.bgAudioEl.currentTime = t.start; } catch (_) {}
  }
  if (!S.bgAudioEl._trimHandler) {
    S.bgAudioEl._trimHandler = () => {
      const tt = getBgAudioTrim();
      if (!tt) return;
      if (S.bgAudioEl.currentTime >= tt.end - 0.05) {
        try { S.bgAudioEl.currentTime = tt.start; } catch (_) {}
      }
    };
    S.bgAudioEl.addEventListener("timeupdate", S.bgAudioEl._trimHandler);
  }
}

// ══════════════════════════════════════════════════════
//  محرّك المؤثّرات الصوتيّة (v0.11.0)
// ══════════════════════════════════════════════════════
const REVERB_PRESETS = {
  "room":      { duration: 0.3, decay: 4   },
  "studio":    { duration: 0.5, decay: 3   },
  "masjid-sm": { duration: 1.5, decay: 2.5 },
  "masjid-lg": { duration: 3.0, decay: 2   },
  "hall":      { duration: 5.0, decay: 1.5 },
};

function createImpulseResponse(ctx, preset) {
  const p = REVERB_PRESETS[preset] || REVERB_PRESETS["masjid-lg"];
  const length = Math.max(1, Math.floor(ctx.sampleRate * p.duration));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, p.decay);
    }
  }
  return buffer;
}

function buildAudioFXChain(ctx, sourceNode, cfg) {
  const inputGain = ctx.createGain();
  inputGain.gain.value = cfg.volume;
  sourceNode.connect(inputGain);

  const eqLow = ctx.createBiquadFilter();
  eqLow.type = "lowshelf"; eqLow.frequency.value = 200; eqLow.gain.value = cfg.eqLow;
  const eqMid = ctx.createBiquadFilter();
  eqMid.type = "peaking"; eqMid.frequency.value = 1000; eqMid.Q.value = 1; eqMid.gain.value = cfg.eqMid;
  const eqHigh = ctx.createBiquadFilter();
  eqHigh.type = "highshelf"; eqHigh.frequency.value = 5000; eqHigh.gain.value = cfg.eqHigh;
  inputGain.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);

  const mixer = ctx.createGain(); mixer.gain.value = 1;
  const dryGain = ctx.createGain();
  const wetTotal = Math.min(1, (cfg.reverbAmt || 0) + (cfg.echoAmt || 0));
  dryGain.gain.value = 1 - wetTotal * 0.4;
  eqHigh.connect(dryGain); dryGain.connect(mixer);

  if (cfg.reverbType && cfg.reverbType !== "none" && (cfg.reverbAmt || 0) > 0) {
    const conv = ctx.createConvolver();
    try { conv.buffer = createImpulseResponse(ctx, cfg.reverbType); } catch (_) {}
    const wetGain = ctx.createGain(); wetGain.gain.value = cfg.reverbAmt;
    eqHigh.connect(conv); conv.connect(wetGain); wetGain.connect(mixer);
  }

  if ((cfg.echoAmt || 0) > 0) {
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = Math.max(0.05, Math.min(2.0, cfg.echoTime || 0.25));
    const feedback = ctx.createGain();
    feedback.gain.value = Math.max(0, Math.min(0.85, cfg.echoFb || 0));
    const echoWet = ctx.createGain(); echoWet.gain.value = cfg.echoAmt;
    eqHigh.connect(delay); delay.connect(feedback); feedback.connect(delay);
    delay.connect(echoWet); echoWet.connect(mixer);
  }
  return mixer;
}

function getFXConfig(prefix) {
  return {
    enabled: !!ge(`${prefix}-fx-on`),
    volume: (parseFloat(gv(`${prefix}-fx-vol`)) || 100) / 100,
    reverbType: document.getElementById(`${prefix}-fx-reverb-type`)?.value || "masjid-lg",
    reverbAmt: (parseFloat(gv(`${prefix}-fx-reverb-amt`)) || 0) / 100,
    echoAmt:   (parseFloat(gv(`${prefix}-fx-echo-amt`))   || 0) / 100,
    echoTime:  (parseFloat(gv(`${prefix}-fx-echo-time`))  || 250) / 1000,
    echoFb:    (parseFloat(gv(`${prefix}-fx-echo-fb`))    || 0) / 100,
    eqLow:      parseFloat(gv(`${prefix}-fx-eq-low`))  || 0,
    eqMid:      parseFloat(gv(`${prefix}-fx-eq-mid`))  || 0,
    eqHigh:     parseFloat(gv(`${prefix}-fx-eq-high`)) || 0,
  };
}

function applyBgAudioFXLive() {
  if (!S.bgAudioSource) return;
  const ctx = S.bgAudioSource.context;
  const cfg = getFXConfig("free");
  try { S.bgAudioSource.disconnect(); } catch (_) {}
  if (S.bgFxChainOutput) { try { S.bgFxChainOutput.disconnect(); } catch (_) {} S.bgFxChainOutput = null; }
  if (cfg.enabled) {
    const fxOut = buildAudioFXChain(ctx, S.bgAudioSource, cfg);
    fxOut.connect(ctx.destination);
    if (S.analyser) fxOut.connect(S.analyser);
    if (S.exportDest) fxOut.connect(S.exportDest);
    S.bgFxChainOutput = fxOut;
  } else {
    S.bgAudioSource.connect(ctx.destination);
    if (S.analyser) S.bgAudioSource.connect(S.analyser);
    if (S.exportDest) S.bgAudioSource.connect(S.exportDest);
  }
}

function applyRecVidFXLive() {
  if (!S.recVidAudioSource) return;
  const ctx = S.recVidAudioSource.context;
  const cfg = getFXConfig("recvid");
  try { S.recVidAudioSource.disconnect(); } catch (_) {}
  if (S.recVidFxChainOutput) { try { S.recVidFxChainOutput.disconnect(); } catch (_) {} S.recVidFxChainOutput = null; }
  if (cfg.enabled) {
    const fxOut = buildAudioFXChain(ctx, S.recVidAudioSource, cfg);
    fxOut.connect(ctx.destination);
    if (S.analyser) fxOut.connect(S.analyser);
    if (S.exportDest) fxOut.connect(S.exportDest);
    S.recVidFxChainOutput = fxOut;
  } else {
    S.recVidAudioSource.connect(ctx.destination);
    if (S.analyser) S.recVidAudioSource.connect(S.analyser);
    if (S.exportDest) S.recVidAudioSource.connect(S.exportDest);
  }
}

function initAudioFXControls() {
  const wireToggle = (prefix, applyFn) => {
    const cb = document.getElementById(`${prefix}-fx-on`);
    const ctrl = document.getElementById(`${prefix}-fx-ctrl`);
    if (!cb || !ctrl) return;
    const sync = () => { ctrl.style.display = cb.checked ? "block" : "none"; applyFn(); };
    cb.addEventListener("change", sync);
    sync();
  };
  wireToggle("free", applyBgAudioFXLive);
  wireToggle("recvid", applyRecVidFXLive);
  const wireField = (id, suffix, applyFn) => {
    const el = document.getElementById(id);
    const out = document.getElementById(id + "-v");
    if (!el) return;
    const update = () => { if (out) out.textContent = el.value + suffix; applyFn(); };
    el.addEventListener("input", update);
    el.addEventListener("change", update);
    update();
  };
  ["free", "recvid"].forEach(p => {
    const apply = p === "free" ? applyBgAudioFXLive : applyRecVidFXLive;
    wireField(`${p}-fx-vol`,        "%",  apply);
    wireField(`${p}-fx-reverb-amt`, "%",  apply);
    wireField(`${p}-fx-echo-amt`,   "%",  apply);
    wireField(`${p}-fx-echo-time`,  "ms", apply);
    wireField(`${p}-fx-echo-fb`,    "%",  apply);
    wireField(`${p}-fx-eq-low`,     "dB", apply);
    wireField(`${p}-fx-eq-mid`,     "dB", apply);
    wireField(`${p}-fx-eq-high`,    "dB", apply);
    document.getElementById(`${p}-fx-reverb-type`)?.addEventListener("change", apply);
  });
}

// ══════════════════════════════════════════════════════
//  v0.13.0 — تَسجيل الميكروفون (نسخة الويب) — نَفس التَصميم
//  الفَرق الوَحيد: زرّ "تَنزيل" بَدلاً من "حِفظ في مجلّد العَمل"
// ══════════════════════════════════════════════════════
S.micStream = null;
S.micRecorder = null;
S.micChunks = [];
S.micBlob = null;
S.micAudioCtx = null;
S.micSourceNode = null;
S.micAnalyser = null;
S.micMonitorOut = null;
S.micStartTime = 0;
S.micPausedDur = 0;
S.micPauseStart = 0;
S.micIsPaused = false;
S.micTimerInt = null;
S.micRaf = null;

async function _initMicChain() {
  if (S.micAudioCtx) return;
  try {
    S.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
  } catch (e) {
    toast(`❌ تَعذَّر الوُصول للميكروفون: ${e.message || e.name}`, "error", 3500);
    throw e;
  }
  S.micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  S.micSourceNode = S.micAudioCtx.createMediaStreamSource(S.micStream);
  S.micAnalyser = S.micAudioCtx.createAnalyser();
  S.micAnalyser.fftSize = 1024;
  S.micAnalyser.smoothingTimeConstant = 0.85;
  S.micSourceNode.connect(S.micAnalyser);
  _wireMicMonitor();
  _startMicVisuals();
}

function _wireMicMonitor() {
  try { if (S.micMonitorOut) { S.micMonitorOut.disconnect(); S.micMonitorOut = null; } } catch (_) {}
  const monitorOn = !!ge("mic-monitor-on");
  if (!monitorOn || !S.micAudioCtx || !S.micSourceNode) return;
  const useFX = !!ge("mic-monitor-fx");
  let outNode;
  if (useFX) {
    const cfg = (typeof getFXConfig === "function") ? getFXConfig("free") : null;
    outNode = cfg ? buildAudioFXChain(S.micAudioCtx, S.micSourceNode, cfg) : S.micSourceNode;
  } else {
    outNode = S.micSourceNode;
  }
  outNode.connect(S.micAudioCtx.destination);
  S.micMonitorOut = outNode;
}

function _startMicVisuals() {
  const canvas = document.getElementById("mic-wave-canvas");
  const levelBar = document.getElementById("mic-level-bar");
  if (!canvas || !S.micAnalyser) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const tdata = new Uint8Array(S.micAnalyser.fftSize);
  const fdata = new Uint8Array(S.micAnalyser.frequencyBinCount);
  const draw = () => {
    if (!S.micAnalyser) return;
    S.micAnalyser.getByteTimeDomainData(tdata);
    S.micAnalyser.getByteFrequencyData(fdata);
    ctx.fillStyle = "rgba(2, 11, 5, 0.9)";
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#0ad07a";
    ctx.beginPath();
    const sliceW = W / tdata.length;
    let x = 0;
    for (let i = 0; i < tdata.length; i++) {
      const v = tdata[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.stroke();
    if (levelBar) {
      let sum = 0;
      for (let i = 0; i < fdata.length; i++) sum += fdata[i];
      const pct = Math.min(100, (sum / fdata.length / 100) * 100);
      levelBar.style.width = pct + "%";
    }
    S.micRaf = requestAnimationFrame(draw);
  };
  draw();
}

function _stopMicVisuals() {
  if (S.micRaf) { cancelAnimationFrame(S.micRaf); S.micRaf = null; }
}

function _stopMicChain() {
  _stopMicVisuals();
  try { if (S.micMonitorOut) S.micMonitorOut.disconnect(); } catch (_) {}
  S.micMonitorOut = null;
  if (S.micStream) {
    S.micStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    S.micStream = null;
  }
  if (S.micAudioCtx) {
    try { S.micAudioCtx.close(); } catch (_) {}
    S.micAudioCtx = null;
  }
  S.micSourceNode = null;
  S.micAnalyser = null;
  const canvas = document.getElementById("mic-wave-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(2, 11, 5, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const lb = document.getElementById("mic-level-bar");
  if (lb) lb.style.width = "0%";
}

async function startMicRecording() {
  try { await _initMicChain(); } catch (_) { return; }
  const mimeCandidates = [
    "audio/webm;codecs=opus", "audio/webm",
    "audio/ogg;codecs=opus", "audio/ogg",
  ];
  let mimeType = "";
  for (const m of mimeCandidates) {
    if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
  }
  try {
    S.micRecorder = mimeType
      ? new MediaRecorder(S.micStream, { mimeType })
      : new MediaRecorder(S.micStream);
  } catch (e) {
    toast(`❌ MediaRecorder: ${e.message}`, "error", 3500);
    return;
  }
  S.micChunks = [];
  S.micRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) S.micChunks.push(e.data);
  };
  S.micRecorder.onstop = onMicRecorderStop;
  S.micRecorder.start(250);
  S.micStartTime = Date.now();
  S.micPausedDur = 0;
  S.micIsPaused = false;
  document.getElementById("mic-pre").style.display = "none";
  document.getElementById("mic-during").style.display = "block";
  document.getElementById("mic-post").style.display = "none";
  S.micTimerInt = setInterval(() => {
    if (S.micIsPaused) return;
    const sec = Math.floor((Date.now() - S.micStartTime - S.micPausedDur) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    const el = document.getElementById("mic-rec-time");
    if (el) el.textContent = `${mm}:${ss}`;
  }, 250);
}

function pauseResumeMicRecording() {
  if (!S.micRecorder) return;
  const btn = document.getElementById("mic-rec-pause");
  const dot = document.getElementById("mic-rec-dot");
  if (S.micRecorder.state === "recording") {
    S.micRecorder.pause();
    S.micPauseStart = Date.now();
    S.micIsPaused = true;
    if (btn) btn.textContent = "▶️";
    if (dot) dot.style.color = "var(--t3)";
  } else if (S.micRecorder.state === "paused") {
    S.micRecorder.resume();
    if (S.micPauseStart) S.micPausedDur += Date.now() - S.micPauseStart;
    S.micPauseStart = 0;
    S.micIsPaused = false;
    if (btn) btn.textContent = "⏸️";
    if (dot) dot.style.color = "var(--danger)";
  }
}

function stopMicRecording() {
  if (!S.micRecorder) return;
  if (S.micRecorder.state !== "inactive") S.micRecorder.stop();
}

function onMicRecorderStop() {
  if (S.micTimerInt) { clearInterval(S.micTimerInt); S.micTimerInt = null; }
  const mimeType = S.micChunks[0]?.type || "audio/webm";
  S.micBlob = new Blob(S.micChunks, { type: mimeType });
  const url = URL.createObjectURL(S.micBlob);
  const audio = document.getElementById("mic-preview");
  if (audio) { audio.src = url; }
  const durSec = Math.floor((Date.now() - S.micStartTime - S.micPausedDur) / 1000);
  const mm = String(Math.floor(durSec / 60)).padStart(2, "0");
  const ss = String(durSec % 60).padStart(2, "0");
  const info = document.getElementById("mic-info");
  if (info) {
    const sizeKB = (S.micBlob.size / 1024).toFixed(1);
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    info.textContent = `📊 المدّة: ${mm}:${ss} · الحجم: ${sizeKB} KB · النَوع: .${ext}`;
  }
  document.getElementById("mic-pre").style.display = "none";
  document.getElementById("mic-during").style.display = "none";
  document.getElementById("mic-post").style.display = "block";
  _stopMicChain();
}

function redoMicRecording() {
  if (S.micBlob) {
    const audio = document.getElementById("mic-preview");
    if (audio && audio.src) { try { URL.revokeObjectURL(audio.src); } catch (_) {} audio.src = ""; }
    S.micBlob = null;
  }
  document.getElementById("mic-pre").style.display = "flex";
  document.getElementById("mic-during").style.display = "none";
  document.getElementById("mic-post").style.display = "none";
  const t = document.getElementById("mic-rec-time"); if (t) t.textContent = "00:00";
}

function applyMicRecording() {
  if (!S.micBlob) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ext = (S.micBlob.type.includes("ogg")) ? "ogg" : "webm";
  const file = new File([S.micBlob], `mic-${ts}.${ext}`, { type: S.micBlob.type });
  const fauInput = document.getElementById("free-audio-file");
  if (!fauInput) {
    toast("❌ مَيدان الصوت المُخصّص غَير موجود", "error", 2500);
    return;
  }
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    fauInput.files = dt.files;
    fauInput.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) {
    if (typeof onFreeAudio === "function") onFreeAudio({ files: [file] });
  }
  const toggle = document.getElementById("free-audio-on");
  if (toggle && !toggle.checked) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  }
  toast(`✅ اُعتُمِد التَسجيل (${file.name}) كصَوت تَلاوة`, "success", 2500);
}

function downloadMicRecording() {
  if (!S.micBlob) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ext = (S.micBlob.type.includes("ogg")) ? "ogg" : "webm";
  const url = URL.createObjectURL(S.micBlob);
  const a = document.createElement("a");
  a.href = url; a.download = `recording-${ts}.${ext}`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast(`⬇️ تَنزيل: recording-${ts}.${ext}`, "info", 2000);
}

// v0.13.0 — مَفاتيح المؤثّرات المُتزامِنة بَين mic-fx و free-fx
const MIC_FX_SYNC_KEYS = [
  "fx-on", "fx-vol", "fx-reverb-type", "fx-reverb-amt",
  "fx-echo-amt", "fx-echo-time", "fx-echo-fb",
  "fx-eq-low", "fx-eq-mid", "fx-eq-high",
];
let _micFXSyncBusy = false;

function _copyValue(fromEl, toEl) {
  if (fromEl.type === "checkbox") toEl.checked = fromEl.checked;
  else toEl.value = fromEl.value;
}

function setupMicFXMirror() {
  for (const key of MIC_FX_SYNC_KEYS) {
    const micEl = document.getElementById(`mic-${key}`);
    const freeEl = document.getElementById(`free-${key}`);
    if (!micEl || !freeEl) continue;
    const onMicChange = () => {
      if (_micFXSyncBusy) return;
      _micFXSyncBusy = true;
      try {
        _copyValue(micEl, freeEl);
        freeEl.dispatchEvent(new Event("input", { bubbles: true }));
        freeEl.dispatchEvent(new Event("change", { bubbles: true }));
      } finally { _micFXSyncBusy = false; }
    };
    micEl.addEventListener("input", onMicChange);
    micEl.addEventListener("change", onMicChange);
    const onFreeChange = () => {
      if (_micFXSyncBusy) return;
      _micFXSyncBusy = true;
      try {
        _copyValue(freeEl, micEl);
        const micOut = document.getElementById(`mic-${key}-v`);
        const freeOut = document.getElementById(`free-${key}-v`);
        if (micOut && freeOut) micOut.textContent = freeOut.textContent;
        if (key === "fx-on") {
          const micCtrl = document.getElementById("mic-fx-ctrl");
          if (micCtrl) micCtrl.style.display = micEl.checked ? "block" : "none";
        }
      } finally { _micFXSyncBusy = false; }
    };
    freeEl.addEventListener("input", onFreeChange);
    freeEl.addEventListener("change", onFreeChange);
    _copyValue(freeEl, micEl);
  }
  document.getElementById("mic-fx-on")?.addEventListener("change", (e) => {
    const ctrl = document.getElementById("mic-fx-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  const initOn = document.getElementById("mic-fx-on")?.checked;
  const micCtrlInit = document.getElementById("mic-fx-ctrl");
  if (micCtrlInit) micCtrlInit.style.display = initOn ? "block" : "none";
  for (const key of MIC_FX_SYNC_KEYS) {
    const micOut = document.getElementById(`mic-${key}-v`);
    const freeOut = document.getElementById(`free-${key}-v`);
    if (micOut && freeOut) micOut.textContent = freeOut.textContent;
  }
}

function initMicRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    const summary = document.querySelector('[id="mic-on"]')?.closest("details");
    if (summary) summary.style.display = "none";
    return;
  }
  const micOn = document.getElementById("mic-on");
  const micCtrl = document.getElementById("mic-ctrl");
  micOn?.addEventListener("change", () => {
    if (micCtrl) micCtrl.style.display = micOn.checked ? "block" : "none";
    if (!micOn.checked) {
      if (S.micRecorder && S.micRecorder.state !== "inactive") {
        try { S.micRecorder.stop(); } catch (_) {}
      }
      _stopMicChain();
    } else {
      _initMicChain().catch(() => {});
    }
  });
  document.getElementById("mic-monitor-on")?.addEventListener("change", _wireMicMonitor);
  document.getElementById("mic-monitor-fx")?.addEventListener("change", _wireMicMonitor);
  document.getElementById("mic-rec-start")?.addEventListener("click", startMicRecording);
  document.getElementById("mic-rec-pause")?.addEventListener("click", pauseResumeMicRecording);
  document.getElementById("mic-rec-stop")?.addEventListener("click", stopMicRecording);
  document.getElementById("mic-redo")?.addEventListener("click", redoMicRecording);
  document.getElementById("mic-apply")?.addEventListener("click", applyMicRecording);
  document.getElementById("mic-download")?.addEventListener("click", downloadMicRecording);
  setupMicFXMirror();
}

// ══════════════════════════════════════════════════════
//  v0.13.1 — TTS مُتعدّد المَصادر (StreamElements أساس + Web Speech احتياط)
//  Edge TTS غَير مُتاح في الويب (يَحتاج headers مَخصّصة).
// ══════════════════════════════════════════════════════
const TTS_MAX_TEXT_LEN = 5000;

S.ttsBlob = null;
S.ttsGenerating = false;
S.ttsAbortRef = { cancelled: false };

async function _ttsGenerateBrowser(text, onProgress) {
  if (!("speechSynthesis" in window)) throw new Error("المُتصفّح لا يَدعم Web Speech");
  let voices = speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(r => {
      const t = setTimeout(r, 1500);
      speechSynthesis.onvoiceschanged = () => { clearTimeout(t); r(); };
    });
    voices = speechSynthesis.getVoices();
  }
  const arVoices = voices.filter(v => v.lang.startsWith("ar"));
  if (!arVoices.length) throw new Error("لا تَوجد أَصوات عَربيّة مُثبَّتة");
  onProgress?.("🔊 Web Speech: يُسمَع فقط (المُتصفّح لا يَدعم تَصدير الصَوت)");
  const utt = new SpeechSynthesisUtterance(text);
  utt.voice = arVoices[0];
  utt.lang = arVoices[0].lang;
  return new Promise((resolve, reject) => {
    utt.onend = () => reject(new Error("Web Speech لا يَدعم تَصدير الصَوت — استَخدِم نُسخة سَطح المكتب لاستخدام Google/Edge TTS"));
    utt.onerror = (e) => reject(new Error(`Web Speech: ${e.error}`));
    speechSynthesis.speak(utt);
  });
}

async function generateTTS(text, voice, rate, pitch, pauseMs, engine, onProgress) {
  if (!text || !text.trim()) throw new Error("لا يوجد نَصّ");
  if (text.length > TTS_MAX_TEXT_LEN) {
    throw new Error(`النَصّ طَويل جدّاً (${text.length} حرف، الحدّ ${TTS_MAX_TEXT_LEN})`);
  }
  S.ttsAbortRef = { cancelled: false };
  // الويب لا يَستطيع الوُصول لـGoogle/Edge بسَبب CORS
  if (engine !== "auto" && engine !== "browser") {
    throw new Error(`المَصدر "${engine}" غَير مُتاح في الويب — استَخدِم نُسخة سَطح المكتب`);
  }
  try {
    return await _ttsGenerateBrowser(text, onProgress);
  } catch (e) {
    throw new Error(`browser: ${e.message}`);
  }
}

function _ttsGetSourceText() {
  const src = document.getElementById("tts-source")?.value;
  if (src === "custom") return (document.getElementById("tts-custom-text")?.value || "").trim();
  if (src === "freetext") return (document.getElementById("free-text-area")?.value || "").trim();
  if (Array.isArray(S.verses) && S.verses.length && S.verses.every(v => v && (v.free || v.hadith))) {
    return S.verses.map(v => v.text || "").filter(Boolean).join("\n");
  }
  return (document.getElementById("free-text-area")?.value || "").trim();
}

function _ttsUpdateSourcePreview() {
  const text = _ttsGetSourceText();
  const prev = document.getElementById("tts-source-preview");
  if (!prev) return;
  if (!text) { prev.textContent = "— لا يوجد نَصّ —"; return; }
  prev.textContent = text.length > 200 ? text.slice(0, 200) + "..." : text;
}

async function startTTSGeneration() {
  if (S.ttsGenerating) return;
  // v0.13.2 — تَحذير شَرعيّ مَرّة لكلّ جَلسة
  _showTTSQuranWarning();
  const text = _ttsGetSourceText();
  if (!text) { toast("⚠️ لا يوجد نَصّ للتَوليد", "warn", 2000); return; }
  const voice = document.getElementById("tts-voice")?.value || "ar-SA-HamedNeural";
  const rate = parseInt(document.getElementById("tts-rate")?.value || 0);
  const pitch = parseInt(document.getElementById("tts-pitch")?.value || 0);
  const pauseMs = parseInt(document.getElementById("tts-pause")?.value || 300);
  const engine = document.getElementById("tts-engine")?.value || "auto";

  S.ttsGenerating = true;
  document.getElementById("tts-pre").style.display = "none";
  document.getElementById("tts-during").style.display = "block";
  document.getElementById("tts-post").style.display = "none";
  document.getElementById("tts-progress").textContent = "📡 جارٍ الاتّصال...";
  document.getElementById("tts-progress-bar").style.width = "10%";

  try {
    const blob = await generateTTS(text, voice, rate, pitch, pauseMs, engine, (msg, received) => {
      const el = document.getElementById("tts-progress");
      if (el) el.textContent = msg;
      const bar = document.getElementById("tts-progress-bar");
      if (bar && received) {
        const pct = Math.min(90, 10 + (received / 1024) * 0.5);
        bar.style.width = pct + "%";
      }
    });
    if (S.ttsAbortRef.cancelled) {
      document.getElementById("tts-during").style.display = "none";
      document.getElementById("tts-pre").style.display = "block";
      S.ttsGenerating = false;
      return;
    }
    S.ttsBlob = blob;
    const url = URL.createObjectURL(blob);
    document.getElementById("tts-preview").src = url;
    const sizeKB = (blob.size / 1024).toFixed(1);
    document.getElementById("tts-info").textContent = `📊 الحجم: ${sizeKB} KB · ${text.length} حرف · صَوت: ${voice.replace("Neural", "")}`;
    document.getElementById("tts-during").style.display = "none";
    document.getElementById("tts-post").style.display = "block";
    toast(`✅ تَمَّ توليد القِراءة (${sizeKB} KB)`, "success", 2500);
  } catch (e) {
    document.getElementById("tts-during").style.display = "none";
    document.getElementById("tts-pre").style.display = "block";
    toast(`❌ فَشِل التَوليد: ${e.message}`, "error", 4000);
    console.warn("[tts] generate error:", e);
  } finally {
    S.ttsGenerating = false;
  }
}

function cancelTTSGeneration() {
  S.ttsAbortRef.cancelled = true;
  toast("✕ إلغاء التَوليد", "info", 1500);
}

function redoTTS() {
  if (S.ttsBlob) {
    const audio = document.getElementById("tts-preview");
    if (audio && audio.src) { try { URL.revokeObjectURL(audio.src); } catch (_) {} audio.src = ""; }
    S.ttsBlob = null;
  }
  document.getElementById("tts-post").style.display = "none";
  document.getElementById("tts-during").style.display = "none";
  document.getElementById("tts-pre").style.display = "block";
}

function applyTTSAsRecitation() {
  if (!S.ttsBlob) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = new File([S.ttsBlob], `tts-${ts}.mp3`, { type: "audio/mpeg" });
  const fauInput = document.getElementById("free-audio-file");
  if (!fauInput) { toast("❌ مَيدان الصَوت المُخصّص غَير موجود", "error", 2500); return; }
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    fauInput.files = dt.files;
    fauInput.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) {
    if (typeof onFreeAudio === "function") onFreeAudio({ files: [file] });
  }
  const toggle = document.getElementById("free-audio-on");
  if (toggle && !toggle.checked) {
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  }
  // v0.13.2 — عَرض النَصّ في المعاينة (toggle)
  const showText = !!document.getElementById("tts-show-text")?.checked;
  if (showText) {
    const text = _ttsGetSourceText();
    const freeTextArea = document.getElementById("free-text-area");
    const freeTextOn = document.getElementById("free-text-on");
    if (freeTextArea && text) {
      freeTextArea.value = text;
      freeTextArea.dispatchEvent(new Event("input", { bubbles: true }));
      if (freeTextOn && !freeTextOn.checked) {
        freeTextOn.checked = true;
        freeTextOn.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setTimeout(() => {
        if (typeof applyFreeText === "function") {
          try { applyFreeText(); } catch (e) { console.warn("[tts] applyFreeText:", e); }
        }
      }, 300);
    }
  }
  toast(`✅ اُعتُمِد التَوليد كصَوت قِراءة${showText ? " مع النَصّ" : ""}`, "success", 2500);
}

function downloadTTS() {
  if (!S.ttsBlob) return;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const url = URL.createObjectURL(S.ttsBlob);
  const a = document.createElement("a");
  a.href = url; a.download = `tts-${ts}.mp3`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function _ttsUpdateEngineStatus() {
  const el = document.getElementById("tts-engine-status");
  const engine = document.getElementById("tts-engine")?.value || "auto";
  if (!el) return;
  const messages = {
    auto: "🤖 الويب: Web Speech فقط (يُسمَع، لا يُصدِّر). للتَصدير: استَخدِم نُسخة سَطح المكتب",
    google: "⚠️ غَير مُتاح في الويب — يَحتاج سَطح المكتب",
    edge: "⚠️ غَير مُتاح في الويب — يَحتاج سَطح المكتب",
    browser: "🔊 يُسمَع فقط — لا يَدعم تَصدير صَوت",
  };
  el.textContent = messages[engine] || "";
}

// v0.13.2 — تَحذير شَرعيّ مَركَزيّ (مَرّة لكلّ جَلسة)
function _showTTSQuranWarning() {
  if (sessionStorage.getItem("gt_sirm_tts_quran_warn_shown") === "1") return;
  try { sessionStorage.setItem("gt_sirm_tts_quran_warn_shown", "1"); } catch (_) {}
  const old = document.getElementById("tts-quran-warning");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "tts-quran-warning";
  modal.style.cssText = "position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="background:var(--bg0);border:2px solid var(--danger);border-radius:var(--r);padding:24px;max-width:500px;width:92%;direction:rtl;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.7)">
      <div style="font-size:54px;margin-bottom:14px">⚠️</div>
      <h3 style="margin:0 0 14px 0;color:var(--danger);font-size:18px;font-weight:800">تَحذير شَرعيّ</h3>
      <p style="font-size:14px;color:var(--t1);line-height:1.9;margin:0 0 16px 0;text-align:justify">
        <strong style="color:var(--al)">لا تَستعمل ميزة تَوليد الصَوت (TTS) لتَلاوة القرآن الكَريم.</strong>
        التَلاوة المُتقَنة عبادة لها أَحكام تَجويد لا تُحاكيها الأَصوات المُولَّدة آليّاً.
        خَصِّص هذه الميزة للحَديث الشَريف، الأذكار، الأدعية، الحِكَم، والنُصوص الحُرّة.
      </p>
      <p style="font-size:11px;color:var(--t3);margin:0 0 18px 0;background:var(--bg1);padding:8px;border-radius:var(--r)">
        📖 للقرآن الكَريم: استَخدِم قسم "<strong>القرآن الكَريم</strong>" في تَبويب التَلاوة مع قارئ حَقيقيّ.
      </p>
      <button class="btn btn-p bfw" id="tts-warn-ok" style="font-weight:700;padding:10px">✅ فَهمت — مُتابعة</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#tts-warn-ok").addEventListener("click", () => { modal.remove(); });
}

function _ttsApplyVisibilitySetting() {
  let visible = false;
  try { visible = localStorage.getItem("gt_sirm_tts_section_visible") === "1"; } catch (_) {}
  const sec = document.querySelector('[id="tts-on"]')?.closest("details.sec");
  if (sec) sec.style.display = visible ? "" : "none";
  if (!visible) {
    const ttsOn = document.getElementById("tts-on");
    if (ttsOn && ttsOn.checked) {
      ttsOn.checked = false;
      ttsOn.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

function _initTTSSettingsTab() {
  const vis = document.getElementById("tts-section-visible");
  if (vis) {
    try { vis.checked = localStorage.getItem("gt_sirm_tts_section_visible") === "1"; } catch (_) {}
    vis.addEventListener("change", () => {
      try { localStorage.setItem("gt_sirm_tts_section_visible", vis.checked ? "1" : "0"); } catch (_) {}
      _ttsApplyVisibilitySetting();
      toast?.(vis.checked ? "👁️ ظَهَر قسم توليد القِراءة التَجريبيّ" : "🙈 أُخفي قسم توليد القِراءة", "info", 1500);
    });
  }
  const fields = ["url", "method", "body", "headers"];
  for (const f of fields) {
    const el = document.getElementById(`tts-custom-${f}`);
    if (!el) continue;
    try {
      const saved = localStorage.getItem(`gt_sirm_tts_custom_${f}`);
      if (saved !== null) el.value = saved;
    } catch (_) {}
    const save = () => {
      try { localStorage.setItem(`gt_sirm_tts_custom_${f}`, el.value); } catch (_) {}
    };
    el.addEventListener("input", save);
    el.addEventListener("change", save);
  }
  const methodEl = document.getElementById("tts-custom-method");
  const bodyWrap = document.getElementById("tts-custom-body-wrap");
  const updateBody = () => {
    if (bodyWrap) bodyWrap.style.display = methodEl?.value === "POST" ? "" : "none";
  };
  methodEl?.addEventListener("change", updateBody);
  updateBody();
}

function initTTS() {
  const ttsOn = document.getElementById("tts-on");
  const ttsCtrl = document.getElementById("tts-ctrl");
  ttsOn?.addEventListener("change", () => {
    if (ttsCtrl) ttsCtrl.style.display = ttsOn.checked ? "block" : "none";
    if (ttsOn.checked) { _ttsUpdateSourcePreview(); _ttsUpdateEngineStatus(); }
  });
  document.getElementById("tts-engine")?.addEventListener("change", _ttsUpdateEngineStatus);
  _ttsUpdateEngineStatus();
  const srcSel = document.getElementById("tts-source");
  const customTA = document.getElementById("tts-custom-text");
  srcSel?.addEventListener("change", () => {
    if (customTA) customTA.style.display = srcSel.value === "custom" ? "block" : "none";
    _ttsUpdateSourcePreview();
  });
  customTA?.addEventListener("input", _ttsUpdateSourcePreview);
  ["tts-rate", "tts-pitch", "tts-pause"].forEach(id => {
    const el = document.getElementById(id);
    const out = document.getElementById(id + "-v");
    if (!el || !out) return;
    const suffix = id === "tts-pause" ? "ms" : "%";
    const update = () => {
      const v = el.value;
      out.textContent = (v >= 0 && id !== "tts-pause" ? "+" : "") + v + suffix;
    };
    el.addEventListener("input", update);
    update();
  });
  document.getElementById("tts-generate")?.addEventListener("click", startTTSGeneration);
  document.getElementById("tts-cancel")?.addEventListener("click", cancelTTSGeneration);
  document.getElementById("tts-apply")?.addEventListener("click", applyTTSAsRecitation);
  document.getElementById("tts-download")?.addEventListener("click", downloadTTS);
  document.getElementById("tts-redo")?.addEventListener("click", redoTTS);
  // v0.13.2 — إعدادات + إظهار/إخفاء
  _initTTSSettingsTab();
  _ttsApplyVisibilitySetting();
}

// ══════════════════════════════════════════════════════
//  v0.14 — الوَضع الصامت + زرّ المُشاركة (نُسخة الويب)
// ══════════════════════════════════════════════════════
function initSilentMode() {
  const cb = document.getElementById("silent-mode");
  const ctrl = document.getElementById("silent-mode-ctrl");
  const slider = document.getElementById("silent-total-dur");
  const out = document.getElementById("silent-total-dur-v");
  if (!cb) return;
  cb.addEventListener("change", () => {
    if (ctrl) ctrl.style.display = cb.checked ? "block" : "none";
    if (cb.checked) {
      ["recvid-on", "tts-on"].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) {
          el.checked = false;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      if (S.micRecorder && S.micRecorder.state !== "inactive") {
        try { S.micRecorder.stop(); } catch (_) {}
      }
      toast?.("🤫 الوَضع الصامت مُفَعَّل — لا تَلاوة، لا ميكروفون، لا TTS", "info", 2500);
    }
    if (typeof syncVersesToActiveAudio === "function") syncVersesToActiveAudio();
    if (typeof renderPerSliceList === "function") renderPerSliceList();
    if (typeof updateAyaInfo === "function") updateAyaInfo();
  });
  if (slider && out) {
    const update = () => {
      out.textContent = slider.value + "s";
      if (cb.checked && typeof syncVersesToActiveAudio === "function") {
        syncVersesToActiveAudio();
        if (typeof renderPerSliceList === "function") renderPerSliceList();
      }
    };
    slider.addEventListener("input", update);
    update();
  }
}

async function shareApp() {
  // v0.14.1 — مَنشور المُشاركة الكامِل
  const fullText = `🌙 GT-SIRM — صانع ريلز إسلاميّة

صانع ريلز إسلاميّة بجودة احترافيّة لخدمة الإسلام والمسلمين.

📚 6 وَحدات محتوى مُكتمَلة (6557 عُنصراً):
• القرآن الكريم (114 سورة + قُرّاء + ترجمات)
• الحديث الشَريف (90 حَديثاً مع التصحيح)
• الأذكار (267 ذكراً في 132 فئة)
• أسماء الله الحسنى (100 اسماً)
• الأدعية المأثورة (32 دعاءً)
• الحِكَم والمواعظ (32 قولاً)

🎨 مَزايا تقنيّة:
• يَعمل بدون إنترنت
• مَفتوح المَصدر (GPLv3)
• 3 منصّات: Linux + Android + المُتصفّحات
• وَضع صامت يَجتنب الموسيقى — لِمَحتوى مُوافِق لِضَوابط الشَّرع

🔗 الموقع: https://salehgnutux.github.io/GT-SIRM/
📁 المُستودع: https://github.com/SalehGNUTUX/GT-SIRM
📦 الإصدارات: https://github.com/SalehGNUTUX/GT-SIRM/releases

#GT_SIRM #GNUTUX #ريلز_إسلامية #إسلام #برمجيات_مفتوحة`;

  const shareData = {
    title: "GT-SIRM — صانع ريلز إسلاميّة",
    text: fullText,
    url: "https://salehgnutux.github.io/GT-SIRM/",
  };
  // v0.14.1 — Capacitor Share على Android (يَفتح قائمة تَطبيقات التَواصل)
  if (S.isNativeAndroid && window.Capacitor?.Plugins?.Share) {
    try {
      await window.Capacitor.Plugins.Share.share({
        title: shareData.title,
        text: fullText,
        dialogTitle: "شارك GT-SIRM",
      });
      // نَنسخ أيضاً للحافظة كاحتياط
      try { await navigator.clipboard.writeText(fullText); } catch (_) {}
      toast?.("✅ شُكراً لمُشاركة البَرنامج", "success", 2000);
      return;
    } catch (e) {
      if (e.message?.includes("canceled")) return;
      console.warn("[share:capacitor]", e);
    }
  }
  // المُتصفّحات الحَديثة + iOS
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      try { await navigator.clipboard.writeText(fullText); } catch (_) {}
      toast?.("✅ شُكراً لمُشاركة البَرنامج", "success", 2000);
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
    console.warn("[share]", e);
  }
  // fallback: clipboard
  try {
    await navigator.clipboard.writeText(fullText);
    toast?.("📋 نُسِخ مَنشور المُشاركة الكامِل — أَلصِقه في أيّ تَطبيق", "success", 3000);
  } catch (e) {
    toast?.(`❌ تَعذَّر النَسخ: ${e.message}`, "error", 3000);
  }
}

function initShareButton() {
  document.getElementById("share-app-btn")?.addEventListener("click", shareApp);
  document.getElementById("share-app-btn-about")?.addEventListener("click", shareApp);
}

// ══════════════════════════════════════════════════════
//  v1.0 — تَحسينات الـinputs: select-all عَلى النَقر + paste/clear buttons
// ══════════════════════════════════════════════════════
function _installInputSelectAll() {
  // عَلى focus لـtext/number/search: حَدِّد كلّ النَصّ.
  // إن نَقَر المُستخدم مَرّة أخرى وَالـinput مُركَّز، يَضع المُتصفّح المُؤشّر تلقائيّاً.
  const sel = 'input[type="text"], input[type="number"], input[type="search"], input[type="tel"], input[type="url"], input[type="email"], input:not([type])';
  const handler = (e) => {
    const t = e.target;
    if (!t.matches(sel)) return;
    // تَجاوَز ميكروفون/file/readonly
    if (t.readOnly || t.disabled) return;
    // تَأخير قَصير ليَنتهي default focus
    setTimeout(() => { try { t.select(); } catch (_) {} }, 0);
  };
  document.addEventListener("focus", handler, true);
}

// يَفحَص parent للـinput عن أزرار paste/clear مَوجودة مُسبقاً ويُضيف فَقط الناقِص.
function _hasPasteClearBtns(parent) {
  if (!parent) return { paste: false, clear: false };
  const buttons = parent.querySelectorAll("button");
  let paste = false, clear = false;
  for (const b of buttons) {
    const id = (b.id || "").toLowerCase();
    const title = (b.title || "").toLowerCase();
    const text = (b.textContent || "").toLowerCase();
    if (id.includes("paste") || text.includes("📋") || title.includes("لصق")) paste = true;
    if (id.includes("clear") || text.includes("✕") || text.includes("🗑") || title.includes("مسح") || title.includes("حذف") || title.includes("إلغاء")) clear = true;
  }
  return { paste, clear };
}

function _addPasteClearButtons(elementId, opts = {}) {
  const el = document.getElementById(elementId);
  if (!el || el._pasteClearAdded) return;
  el._pasteClearAdded = true;

  // v1.0 — تَجاوَز حُقول النَصّ داخل .cpg (لون hex مع color picker — التَداخُل البَصريّ)
  if (el.parentNode?.classList?.contains("cpg")) return;

  const parents = [el.parentNode, el.parentNode?.parentNode].filter(Boolean);
  let existing = { paste: false, clear: false };
  for (const p of parents) {
    const e = _hasPasteClearBtns(p);
    existing.paste = existing.paste || e.paste;
    existing.clear = existing.clear || e.clear;
  }
  if (existing.paste && existing.clear) return;

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:3px;margin-top:3px;align-items:center";

  if (!existing.paste) {
    const pasteBtn = document.createElement("button");
    pasteBtn.type = "button";
    pasteBtn.className = "btn btn-g bsm";
    pasteBtn.style.cssText = "padding:3px 8px;font-size:11px;flex:1";
    pasteBtn.innerHTML = "📋 لصق";
    pasteBtn.addEventListener("click", async () => {
      try {
        const txt = await navigator.clipboard.readText();
        el.value = txt;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.focus();
        toast?.("📋 تَمَّ اللصق", "success", 1200);
      } catch (e) { toast?.(`❌ تَعذَّر اللصق: ${e.message}`, "error", 2000); }
    });
    wrap.appendChild(pasteBtn);
  }
  if (!existing.clear) {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn btn-g bsm";
    clearBtn.style.cssText = "padding:3px 8px;font-size:11px;color:var(--danger);flex:1";
    clearBtn.innerHTML = "✕ حذف";
    clearBtn.addEventListener("click", () => {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.focus();
    });
    wrap.appendChild(clearBtn);
  }
  if (wrap.children.length > 0) el.parentNode.insertBefore(wrap, el.nextSibling);
}

function _installPasteClearButtons() {
  const targets = [
    "free-text-area",
    "free-source",
    "tts-custom-text",
    "tts-custom-url",
    "tts-custom-headers",
    "tts-custom-body",
    "verse-search-inp",
    "surah-search",
    "hadith-search",
    "azkar-search",
    "asma-search",
    "duas-search",
    "hikam-search",
    "recvid-dl-url",
    "bgdl-url",
    "free-audio-dl-url",
    "ytdlp-url",
    "dl-save-path",
    "bgdl-path",
    "recvid-dl-path",
    "free-audio-dl-path",
    "wm-text",
    "vtitle-text",
    "ar-name",
    "ar-folder",
    "gc1t",
    "gc2t",
    "free-tpl-name",
    "tpl-name-inp",
  ];
  for (const id of targets) _addPasteClearButtons(id);
}

function initInputEnhancements() {
  _installInputSelectAll();
  _installPasteClearButtons();
  _installCustomColorPicker(); // v1.0 — يُلغي مُشكلة overflow في الويب/الـPWA
}

// ══════════════════════════════════════════════════════
//  v1.0 — Custom Color Picker للويب
//  المُشكلة: <input type="color"> النَّاتج يَخرج خارج إطار الشاشة في PWA/ملء الشاشة.
//  الحلّ: نَعرض modal مَركَزيّ يَحوي native picker — مَوضِعه دائماً مَرئيّ.
// ══════════════════════════════════════════════════════
const PRESET_COLORS = [
  "#000000", "#ffffff", "#7f7f7f", "#c0c0c0",
  "#0a2e1e", "#020d06", "#0a5c36", "#1ba360",
  "#3ddc84", "#f0c842", "#ff9500", "#ffd700",
  "#e85d8a", "#9c5cd4", "#4a9fd5", "#00b140",
  "#d4a017", "#2a1a00", "#1a0a2e", "#050a1e",
  "#ff0000", "#00ff00", "#0000ff", "#ffff00",
];

function _showCustomColorPicker(targetInput) {
  const oldModal = document.getElementById("ccp-modal");
  if (oldModal) oldModal.remove();
  const initial = targetInput.value || "#000000";
  const modal = document.createElement("div");
  modal.id = "ccp-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="background:var(--bg0);border:1px solid var(--p);border-radius:var(--r);padding:18px;max-width:340px;width:92%;direction:rtl;box-shadow:0 8px 32px rgba(0,0,0,.6)">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--al)">🎨 اختر اللَون</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
        <input type="color" id="ccp-native" value="${initial}" style="width:50px;height:50px;border:1px solid var(--b1);border-radius:6px;cursor:pointer;background:none;padding:2px">
        <input type="text" id="ccp-hex" class="fc" value="${initial}" maxlength="7" style="flex:1;font-family:monospace;font-size:13px;text-align:center">
      </div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:6px">ألوان جاهزة:</div>
      <div id="ccp-palette" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:14px"></div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-p" id="ccp-ok" style="flex:1;padding:8px;font-weight:700">✅ تَطبيق</button>
        <button class="btn btn-g" id="ccp-cancel" style="padding:8px">✕ إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const native = modal.querySelector("#ccp-native");
  const hex = modal.querySelector("#ccp-hex");
  const palette = modal.querySelector("#ccp-palette");
  // ألوان جاهزة
  for (const c of PRESET_COLORS) {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.style.cssText = `background:${c};border:1px solid var(--b1);border-radius:4px;width:100%;aspect-ratio:1;cursor:pointer;padding:0`;
    sw.title = c;
    sw.addEventListener("click", () => {
      native.value = c;
      hex.value = c;
    });
    palette.appendChild(sw);
  }
  native.addEventListener("input", () => { hex.value = native.value; });
  hex.addEventListener("input", () => {
    let v = hex.value.trim();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) native.value = v;
  });
  const close = () => modal.remove();
  modal.querySelector("#ccp-cancel").addEventListener("click", close);
  modal.querySelector("#ccp-ok").addEventListener("click", () => {
    const finalColor = native.value;
    targetInput.value = finalColor;
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    // أَيضاً حدِّث الـhex text المُجاوِر إن وُجد
    const sibling = targetInput.parentNode?.querySelector('input[type="text"]');
    if (sibling) {
      sibling.value = finalColor;
      sibling.dispatchEvent(new Event("input", { bubbles: true }));
      sibling.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
  });
  // إغلاق عند النقر خارج الـcard
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
}

function _installCustomColorPicker() {
  // يَعمل في الويب والأَندرويد — يَحلّ مُشكلة overflow عند fullscreen/PWA.
  // أَطبَق عَلى كلّ color inputs الموجودة (والمُستقبَليّة عَبر MutationObserver)
  const apply = (input) => {
    if (input._customPickerHooked) return;
    input._customPickerHooked = true;
    input.addEventListener("click", (e) => {
      e.preventDefault();
      _showCustomColorPicker(input);
    });
    // اِلتَقِط أيضاً touchstart للـsafari/mobile
    input.addEventListener("touchstart", (e) => {
      e.preventDefault();
      _showCustomColorPicker(input);
    }, { passive: false });
  };
  document.querySelectorAll('input[type="color"]').forEach(apply);
  // مُراقبة العَناصر المُضافة لاحقاً
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('input[type="color"]')) apply(n);
        n.querySelectorAll?.('input[type="color"]').forEach(apply);
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function onBgAudio(input) {
  const file = input.files[0];
  if (!file) return;
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.src = ""; }
  const url = URL.createObjectURL(file);
  const a = new Audio(url);
  a.loop = ge("bg-loop");
  a.volume = gv("bg-vol") / 100;
  S.bgAudioEl = a;
  S.bgAudioFile = file; // v0.5.8
  if (typeof markProjectDirty === "function") markProjectDirty();
  resumeAudioCtx().then(ctx => {
    try {
      const src = ctx.createMediaElementSource(a);
      src.connect(ctx.destination);
      src.connect(S.analyser);
      src.connect(S.exportDest);
      S.bgAudioSource = src;
      if (typeof applyBgAudioFXLive === "function") applyBgAudioFXLive();
    } catch (e) {
      console.warn("Could not connect background audio to context", e);
    }
  }).catch(console.warn);
  $("bg-audio-info").textContent = `✅ ${file.name} (${(file.size / 1e6).toFixed(1)}MB)`;
  toast("🎵 تم تحميل صوت الخلفية", "success");

  // v0.8.5 / v0.13.0 — أعِد توزيع مدد الشرائح لتُطابق مدّة الصوت
  // WebM/Opus من MediaRecorder تَفتقد duration metadata — حلّ بحيلة الـseek
  const _doResync = () => {
    if (syncVersesToActiveAudio()) {
      if (typeof renderPerSliceList === "function") renderPerSliceList();
      if (typeof updateAyaInfo === "function") updateAyaInfo();
      if (typeof updateAyaUI === "function") updateAyaUI();
      toast(`🔄 أُعيد توزيع الشرائح (${a.duration.toFixed(1)}s)`, "info", 2500);
    }
  };
  const tryResync = () => {
    if (a.duration === Infinity) {
      const fix = () => {
        a.currentTime = 0;
        setTimeout(() => { if (isFinite(a.duration) && a.duration > 0.5) _doResync(); }, 50);
      };
      a.addEventListener("timeupdate", fix, { once: true });
      try { a.currentTime = 1e101; } catch (_) { fix(); }
      return;
    }
    if (!isFinite(a.duration) || a.duration <= 0.5) return;
    _doResync();
  };
  if (isFinite(a.duration) && a.duration > 0.5 && a.duration !== Infinity) tryResync();
  else a.addEventListener("loadedmetadata", tryResync, { once: true });
}

function updateVolumes() {
  if (S.recGainNode) S.recGainNode.gain.value = gv("rec-vol") / 100;
  if (S.recAudioEl) S.recAudioEl.volume = gv("rec-vol") / 100;
  if (S.bgAudioEl) S.bgAudioEl.volume = gv("bg-vol") / 100;
}

// ══════════════════════════════════════════════════════
//  MEDIA BACKGROUNDS
// ══════════════════════════════════════════════════════
function onBgMedia(input, type) {
  if (type === "image") {
    const file = input.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { S.bgImg = img; toast("🖼️ تم تحميل الصورة", "success"); };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;
    S.bgImgFile = file; // v0.5.8
    if (typeof markProjectDirty === "function") markProjectDirty();
    const thumb = $("bg-img-thumb");
    $("bg-img-preview").src = url;
    thumb.style.display = "block";
  } else {
    // رفع متعدد للفيديو
    const files = Array.from(input.files || []);
    if (!files.length) return;
    files.forEach(f => addBgVidItem(f));
    input.value = "";
  }
}

// ── نِظام Undo/Redo عامّ (v1.2) — تَجريبيّاً في multi-bg ──
S._history = { undo: [], redo: [], max: 30 };
function historyPush(action) {
  if (!action || typeof action.undo !== "function" || typeof action.redo !== "function") return;
  S._history.undo.push(action);
  while (S._history.undo.length > S._history.max) S._history.undo.shift();
  S._history.redo.length = 0;
  updateHistoryUI();
}
function historyUndo() {
  const action = S._history.undo.pop();
  if (!action) { toast?.("↩️ لا يوجد ما يُتراجَع عنه", "info", 1200); return; }
  try { action.undo(); } catch (e) { console.warn("undo failed:", e); }
  S._history.redo.push(action);
  updateHistoryUI();
  toast?.(`↩️ تَراجُع: ${action.label || "إجراء"}`, "info", 1200);
}
function historyRedo() {
  const action = S._history.redo.pop();
  if (!action) { toast?.("↪️ لا يوجد ما يُعاد", "info", 1200); return; }
  try { action.redo(); } catch (e) { console.warn("redo failed:", e); }
  S._history.undo.push(action);
  updateHistoryUI();
  toast?.(`↪️ إعادة: ${action.label || "إجراء"}`, "info", 1200);
}
function updateHistoryUI() {
  const ub = document.getElementById("bgv-undo-btn");
  const rb = document.getElementById("bgv-redo-btn");
  const cb = document.getElementById("bgv-restore-deleted-btn");
  if (ub) { ub.disabled = !S._history.undo.length; ub.title = S._history.undo.length ? `تَراجُع: ${S._history.undo[S._history.undo.length-1].label}` : "لا يوجد ما يُتراجَع عنه"; }
  if (rb) { rb.disabled = !S._history.redo.length; rb.title = S._history.redo.length ? `إعادة: ${S._history.redo[S._history.redo.length-1].label}` : "لا يوجد ما يُعاد"; }
  if (cb) {
    const hasDeleted = S._history.undo.some(a => a.type === "bgVidDelete");
    cb.disabled = !hasDeleted;
    cb.title = hasDeleted ? "استعادة آخر مَقطع مَحذوف" : "لا يوجد مَقطع مَحذوف لِلاستعادة";
  }
}
function restoreLastDeletedBgVid() {
  for (let i = S._history.undo.length - 1; i >= 0; i--) {
    if (S._history.undo[i].type === "bgVidDelete") {
      const action = S._history.undo.splice(i, 1)[0];
      try { action.undo(); } catch (e) { console.warn("restore-deleted failed:", e); }
      updateHistoryUI();
      toast?.(`♻️ استعادة: ${action.label}`, "success", 1400);
      return;
    }
  }
  toast?.("لا يوجد مَقطع مَحذوف لِلاستعادة", "info", 1200);
}

// ── إدارة قائمة مقاطع الخلفية (playlist) — مطابق لنسخة المكتبية ──
// v1.2 — إعماء (hidden) لكُلّ مَقطع: يَبقى في القائمة، يُتَخطّى في التَبديل/الـcrossfade/التَصدير
function getNextVisibleBgVidIdx(fromIdx) {
  const n = S.bgVidItems.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIdx + step) % n;
    if (!S.bgVidItems[idx].hidden) return idx;
  }
  return -1;
}
function getFirstVisibleBgVidIdx() {
  const n = S.bgVidItems.length;
  for (let i = 0; i < n; i++) if (!S.bgVidItems[i].hidden) return i;
  return -1;
}
function toggleBgVidHidden(idx) {
  if (idx < 0 || idx >= S.bgVidItems.length) return;
  const it = S.bgVidItems[idx];
  it.hidden = !it.hidden;
  if (it.hidden && idx === S.bgVidActiveIdx) {
    const nxt = getFirstVisibleBgVidIdx();
    if (nxt >= 0) activateBgVidByIndex(nxt, true);
    else { try { it.vid.pause(); } catch (_) {} }
  }
  if (typeof markProjectDirty === "function") markProjectDirty();
  renderBgVidList();
  toast(it.hidden ? "👁️‍🗨️ أُعمِيَ المَقطع (يَبقى مَحفوظاً)" : "👁️ أُعيدَ إظهار المَقطع", "info", 1500);
}

// v1.2 Feature #2 — per-clip trim
function getBgClipTrimStart(item) {
  const s = parseFloat(item?.trimStart);
  return isFinite(s) && s > 0 ? s : 0;
}
function getBgClipTrimEnd(item) {
  if (!item) return 0;
  // v1.2 fix — استخدم vid.duration الحيَّة إن كانت item.dur غير صالِحة
  let dur = item.dur || 0;
  if ((!dur || !isFinite(dur)) && item.vid && isFinite(item.vid.duration) && item.vid.duration > 0) {
    dur = item.vid.duration;
    item.dur = dur;
  }
  const e = parseFloat(item.trimEnd);
  if (isFinite(e) && e > 0) {
    return dur > 0 ? Math.min(e, dur) : e;
  }
  return dur;
}
function getBgClipEffectiveDur(item) {
  return Math.max(0.1, getBgClipTrimEnd(item) - getBgClipTrimStart(item));
}
function hasBgClipTrim(item) {
  if (!item) return false;
  const s = getBgClipTrimStart(item), e = getBgClipTrimEnd(item), dur = item.dur || 0;
  return (s > 0.001) || (e < dur - 0.001);
}
function setBgVidClipTrim(idx, which, value) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  const dur = item.dur || 0;
  let v = parseFloat(value); if (!isFinite(v)) v = 0;
  v = Math.max(0, Math.min(v, dur));
  if (which === "trim-start") {
    item.trimStart = v;
    const curEnd = getBgClipTrimEnd(item);
    if (curEnd <= v + 0.1) item.trimEnd = Math.min(dur, v + 0.1);
  } else {
    item.trimEnd = v <= getBgClipTrimStart(item) + 0.1 ? getBgClipTrimStart(item) + 0.1 : v;
  }
  if (idx === S.bgVidActiveIdx && item.vid) {
    const s = getBgClipTrimStart(item), e = getBgClipTrimEnd(item);
    try { if (item.vid.currentTime < s || item.vid.currentTime > e) item.vid.currentTime = s; } catch (_) {}
  }
  if (typeof markProjectDirty === "function") markProjectDirty();
  renderBgVidList();
}
function resetBgVidClipTrim(idx) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.trimStart = 0;
  item.trimEnd = null;
  if (typeof markProjectDirty === "function") markProjectDirty();
  renderBgVidList();
  toast("↺ أُعيدَ تَقليم المَقطع", "info", 1200);
}

// v1.2 — يُعيد Promise<item|null> لِيَتَمَكَّن الاستعادة من الـawait التَتابُعيّ
function addBgVidItem(file, opts = {}) {
  const silent = !!opts.silent;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.src = url; vid.muted = true; vid.playsInline = true; vid.preload = "auto";
    vid.addEventListener("ended", () => switchToNextBgVid());
    vid.onloadeddata = () => {
      const item = {
        file, vid, name: file.name,
        dur: isFinite(vid.duration) ? vid.duration : 0,
        url,
        audioEnabled: false,
        audioGain: 0.5,
        audioBuffer: null,
        hidden: false,
        trimStart: 0,
        trimEnd: null,
        transition: "",        // v1.2 — نَمط اِنتقال per-clip
      };
      S.bgVidItems.push(item);
      if (typeof markProjectDirty === "function") markProjectDirty();
      if (!S.bgVid) {
        S.bgVid = vid;
        S.bgVidActiveIdx = S.bgVidItems.length - 1;
        const thumb = $("bg-vid-thumb"); if (thumb) thumb.style.display = "block";
        const prev = $("bg-vid-preview"); if (prev) prev.src = url;
        try { vid.pause(); vid.currentTime = 0; } catch (_) {}
      }
      renderBgVidList();
      if (!silent) {
        if (S.bgVidItems.length === 1) {
          toast("🎥 تم رفع المقطع — يمكن إضافة المزيد لتتابع الخلفيات", "success", 3500);
        } else {
          toast(`🎥 أُضيف المقطع (${S.bgVidItems.length} مجموع)`, "success", 2000);
        }
      }
      resolve(item);
    };
    vid.onerror = () => {
      if (!silent) toast(`❌ فشل تحميل ${file.name}`, "error");
      resolve(null);
    };
    vid.load();
  });
}

function switchToNextBgVid() {
  const visibleCount = S.bgVidItems.filter(it => !it.hidden).length;
  if (visibleCount < 2) {
    if (S.bgVid) {
      const item = S.bgVidItems[S.bgVidActiveIdx];
      const s = item ? getBgClipTrimStart(item) : 0;
      try { S.bgVid.currentTime = s; S.bgVid.play().catch(() => {}); } catch (_) {}
    }
    return;
  }
  const nextIdx = getNextVisibleBgVidIdx(S.bgVidActiveIdx);
  if (nextIdx < 0) return;
  const oldVid = S.bgVid;
  // v1.2 fix — تَحقَّق من هَلْ crossfade مُسبَق شَغَّل المَقطع الجَديد من trimStart
  const active = S.bgVidItems[nextIdx];
  const hadCrossfade = (S.bgVidNext === active.vid);
  S.bgVidActiveIdx = nextIdx;
  S.bgVid = active.vid;
  // v1.2 fix — اِضبِط currentTime لِلمَقطع الجَديد إن لم يَكُن قَد شُغِّل بـcrossfade،
  //   أَو إن كان خارج نِطاق trim (يَمنَع switch مُتَتالِياً)
  if (!hadCrossfade) {
    const tStart = (typeof getBgClipTrimStart === "function") ? getBgClipTrimStart(active) : 0;
    try { active.vid.currentTime = tStart; } catch (_) {}
  } else {
    const tStart = (typeof getBgClipTrimStart === "function") ? getBgClipTrimStart(active) : 0;
    const tEnd   = (typeof getBgClipTrimEnd   === "function") ? getBgClipTrimEnd(active)   : (active.vid.duration || 0);
    try {
      if (active.vid.currentTime < tStart || active.vid.currentTime >= tEnd - 0.05) {
        active.vid.currentTime = tStart;
      }
    } catch (_) {}
  }
  S.bgVidNext = null;
  S.bgVidFadeProgress = 0;
  if (S.playing || S._exportingV2) {
    try { active.vid.play().catch(() => {}); } catch (_) {}
  }
  if (oldVid && oldVid !== active.vid) {
    try { oldVid.pause(); } catch (_) {}
  }
}

// ── Crossfade سلس قبل انتهاء المقطع — مدة قابلة للضبط + easing ──
function getCrossfadeDur() {
  const ms = parseInt(gv("bg-crossfade-ms") || "1000");
  return Math.max(0, ms) / 1000;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// v1.2 — أَنماط الاِنتقالات بَين مقاطع الخَلفيّة (مِرآة parity مَع سَطح المكتب)
function getBgTransition() {
  return (document.getElementById("bg-transition")?.value || "fade");
}
function getBgTransitionSoftness() {
  const v = parseFloat(document.getElementById("bg-transition-softness")?.value);
  return isFinite(v) ? Math.max(0, Math.min(100, v)) / 100 : 0.3;
}
function getEffectiveBgTransition() {
  const it = S.bgVidItems[S.bgVidActiveIdx];
  if (it && typeof it.transition === "string" && it.transition) return it.transition;
  return getBgTransition();
}
const BG_TRANSITION_TYPES = ["fade", "wipeleft", "wiperight", "slideleft", "slideright", "slideup", "slidedown", "circleopen", "circleclose", "radial", "dissolve"];

function drawBgTransition(ctx, srcCur, srcNext, alpha, W, H, type, softness) {
  alpha = Math.max(0, Math.min(1, alpha));
  softness = Math.max(0, Math.min(1, softness ?? 0));
  const drawSrc = (s) => imgCover(ctx, s, 0, 0, W, H);

  if (type === "fade" || !srcNext) {
    ctx.globalAlpha = 1 - alpha;
    drawSrc(srcCur);
    if (srcNext) {
      ctx.globalAlpha = alpha;
      drawSrc(srcNext);
    }
    return;
  }

  const curAlpha = 1 - alpha * softness;
  ctx.globalAlpha = curAlpha;
  drawSrc(srcCur);

  ctx.save();
  ctx.beginPath();
  if (type === "wipeleft") {
    const x = W * (1 - alpha);
    ctx.rect(x, 0, W - x, H);
  } else if (type === "wiperight") {
    const w = W * alpha;
    ctx.rect(0, 0, w, H);
  } else if (type === "slideleft") {
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(-W * alpha, 0);
    drawSrc(srcCur);
    ctx.restore();
    ctx.save();
    ctx.translate(W * (1 - alpha), 0);
    drawSrc(srcNext);
    ctx.restore();
    return;
  } else if (type === "slideright") {
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(W * alpha, 0);
    drawSrc(srcCur);
    ctx.restore();
    ctx.save();
    ctx.translate(-W * (1 - alpha), 0);
    drawSrc(srcNext);
    ctx.restore();
    return;
  } else if (type === "slideup") {
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(0, -H * alpha);
    drawSrc(srcCur);
    ctx.restore();
    ctx.save();
    ctx.translate(0, H * (1 - alpha));
    drawSrc(srcNext);
    ctx.restore();
    return;
  } else if (type === "slidedown") {
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(0, H * alpha);
    drawSrc(srcCur);
    ctx.restore();
    ctx.save();
    ctx.translate(0, -H * (1 - alpha));
    drawSrc(srcNext);
    ctx.restore();
    return;
  } else if (type === "circleopen") {
    const cx = W / 2, cy = H / 2;
    const rMax = Math.sqrt(W * W + H * H) / 2;
    ctx.arc(cx, cy, rMax * alpha, 0, Math.PI * 2);
  } else if (type === "circleclose") {
    const cx = W / 2, cy = H / 2;
    const rMax = Math.sqrt(W * W + H * H) / 2;
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, rMax * (1 - alpha), 0, Math.PI * 2, true);
  } else if (type === "radial") {
    const cx = W / 2, cy = H / 2;
    const rMax = Math.sqrt(W * W + H * H);
    const ang = Math.PI * 2 * alpha;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rMax, -Math.PI / 2, -Math.PI / 2 + ang);
    ctx.closePath();
  } else if (type === "dissolve") {
    ctx.restore();
    ctx.globalAlpha = 1 - alpha;
    drawSrc(srcCur);
    ctx.globalAlpha = alpha;
    drawSrc(srcNext);
    return;
  } else {
    ctx.restore();
    ctx.globalAlpha = 1 - alpha;
    drawSrc(srcCur);
    ctx.globalAlpha = alpha;
    drawSrc(srcNext);
    return;
  }
  ctx.clip();
  ctx.globalAlpha = 1;
  drawSrc(srcNext);
  ctx.restore();
  // v1.2 — نُعومة إضافيّة: طَبَقة fade مُصاحِبة تَخفِّف الحَواف الحادّة
  if (softness > 0.02) {
    ctx.save();
    ctx.globalAlpha = alpha * softness;
    drawSrc(srcNext);
    ctx.restore();
  }
}
function updateBgVidCrossfade() {
  // v1.2 Bug#1 — في تَصدير V2 نُدير S.bgVid/Next/FadeProgress يَدويّاً بـdeterministic seek
  if (S._exportingV2) return;
  const visibleCount = S.bgVidItems.filter(it => !it.hidden).length;
  if (!S.bgVid || visibleCount < 1) {
    S.bgVidNext = null; S.bgVidFadeProgress = 0; return;
  }
  const cur = S.bgVid;
  if (!isFinite(cur.duration) || cur.duration <= 0) return;

  // v1.2 Feature#2 — trimEnd الفَعّال (per-clip) أَو duration
  const curItem = S.bgVidItems[S.bgVidActiveIdx];
  const endPoint = curItem ? getBgClipTrimEnd(curItem) : cur.duration;
  const remaining = endPoint - cur.currentTime;

  // v1.2 — عند بُلوغ نِهاية المَقطع: انتقل فَوراً بَدَل انتظار ended (يُصلِح وَميض المَقطع القَديم)
  if (remaining <= 0) {
    if (visibleCount >= 2) {
      switchToNextBgVid();
    } else if (curItem && hasBgClipTrim(curItem)) {
      try { cur.currentTime = getBgClipTrimStart(curItem); cur.play().catch(() => {}); } catch (_) {}
    }
    S.bgVidNext = null; S.bgVidFadeProgress = 0;
    return;
  }

  if (visibleCount < 2) { S.bgVidNext = null; S.bgVidFadeProgress = 0; return; }

  const xf = getCrossfadeDur();
  if (xf <= 0) { S.bgVidNext = null; S.bgVidFadeProgress = 0; return; }

  if (remaining <= xf && remaining > 0) {
    const nextIdx = getNextVisibleBgVidIdx(S.bgVidActiveIdx);
    if (nextIdx < 0) { S.bgVidNext = null; S.bgVidFadeProgress = 0; return; }
    const nextItem = S.bgVidItems[nextIdx];
    if (S.bgVidNext !== nextItem.vid) {
      S.bgVidNext = nextItem.vid;
      const nextStart = getBgClipTrimStart(nextItem);
      try { nextItem.vid.currentTime = nextStart; nextItem.vid.play().catch(() => {}); } catch (_) {}
    }
    const linear = Math.max(0, Math.min(1, 1 - (remaining / xf)));
    S.bgVidFadeProgress = easeInOutCubic(linear);
  } else {
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
  }
}

function activateBgVidByIndex(idx, resetTime = true) {
  if (!S.bgVidItems.length) {
    S.bgVid = null; S.bgVidActiveIdx = 0;
    const prev = $("bg-vid-preview"); if (prev) prev.src = "";
    return;
  }
  idx = Math.max(0, Math.min(idx, S.bgVidItems.length - 1));
  if (S.bgVid) { try { S.bgVid.pause(); } catch (_) {} }
  const item = S.bgVidItems[idx];
  S.bgVidActiveIdx = idx;
  S.bgVid          = item.vid;
  const prev = $("bg-vid-preview");
  if (prev) prev.src = item.url;
  if (resetTime) {
    try {
      const t = (typeof getBgVidTrim === "function") ? getBgVidTrim() : null;
      item.vid.currentTime = t ? t.start : 0;
    } catch (_) {}
  }
  if (S.playing) { try { item.vid.play().catch(() => {}); } catch (_) {} }
  // v1.2 — تَحديث الحاشية الخَضراء عَلى الصَفّ النَشِط
  if (typeof renderBgVidList === "function") renderBgVidList();
}

// v1.2 — الحَذف الأَصليّ (بدون Undo history) — يُستَخدَم من الـundo/redo
function _removeBgVidItemCore(idx) {
  if (idx < 0 || idx >= S.bgVidItems.length) return null;
  const item = S.bgVidItems[idx];
  try { item.vid.pause(); } catch (_) {}
  // v1.2 — لا نُلغي URL.revokeObjectURL هُنا: نُبقيه حَيّاً لِسَماح undo
  S.bgVidItems.splice(idx, 1);
  if (S.bgVidItems.length === 0) {
    S.bgVid = null;
    const thumb = $("bg-vid-thumb"); if (thumb) thumb.style.display = "none";
    const prev = $("bg-vid-preview"); if (prev) prev.src = "";
  } else {
    activateBgVidByIndex(0, true);
  }
  renderBgVidList();
  return item;
}

function removeBgVidItem(idx) {
  if (idx < 0 || idx >= S.bgVidItems.length) return;
  const item = S.bgVidItems[idx];
  const wasActiveIdx = S.bgVidActiveIdx;
  _removeBgVidItemCore(idx);
  historyPush({
    type: "bgVidDelete",
    label: `مَقطع «${item.name || "بلا اسم"}»`,
    undo: () => {
      S.bgVidItems.splice(idx, 0, item);
      if (typeof markProjectDirty === "function") markProjectDirty();
      if (wasActiveIdx === idx || !S.bgVid) {
        activateBgVidByIndex(idx, true);
      } else {
        renderBgVidList();
      }
    },
    redo: () => {
      const i = S.bgVidItems.indexOf(item);
      if (i >= 0) _removeBgVidItemCore(i);
    },
  });
}

// v1.2 — تَمييز بَصريّ لِلمَقطع بَعد نَقله
function highlightMovedBgVidItem(idx) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`.bgv-item[data-idx="${idx}"]`);
    if (!el) return;
    el.classList.remove("bgv-just-moved");
    void el.offsetWidth;
    el.classList.add("bgv-just-moved");
    try { el.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) {}
    setTimeout(() => el.classList.remove("bgv-just-moved"), 1500);
  });
}

function _moveBgVidItemCore(fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= S.bgVidItems.length || toIdx >= S.bgVidItems.length) return;
  const [moved] = S.bgVidItems.splice(fromIdx, 1);
  S.bgVidItems.splice(toIdx, 0, moved);
  activateBgVidByIndex(0, true);
  renderBgVidList();
  highlightMovedBgVidItem(toIdx);
}

function moveBgVidItem(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= S.bgVidItems.length) return;
  const item = S.bgVidItems[idx];
  _moveBgVidItemCore(idx, newIdx);
  historyPush({
    type: "bgVidMove",
    label: `نَقل «${item.name || "بلا اسم"}» ${dir < 0 ? "↑" : "↓"}`,
    undo: () => _moveBgVidItemCore(newIdx, idx),
    redo: () => _moveBgVidItemCore(idx, newIdx),
  });
}

// تطبيق إعدادات صوت العنصر على عنصر الفيديو
function applyBgVidItemAudio(item) {
  if (!item || !item.vid) return;
  // v0.5.0 — يحترم توگل "كتم صوت الفيديو" العام
  const globalMute = !!ge("bg-vid-mute-audio");
  item.vid.muted = globalMute || !item.audioEnabled;
  item.vid.volume = Math.max(0, Math.min(1, item.audioGain));
}

// تفعيل/تعطيل صوت عنصر معين + فكّ ترميز buffer للاستخدام في V2
async function toggleBgVidAudio(idx) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioEnabled = !item.audioEnabled;
  applyBgVidItemAudio(item);
  // فكّ ترميز buffer عند أول تفعيل (lazy) — يستخدم في تصدير V2
  if (item.audioEnabled && !item.audioBuffer) {
    try {
      const ctx = await resumeAudioCtx();
      const ab = await item.file.arrayBuffer();
      item.audioBuffer = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) {
      console.warn("decode bg-vid audio failed:", e);
      toast("⚠️ تعذّر فكّ صوت المقطع — سيعمل في المعاينة فقط", "info", 3500);
    }
  }
  renderBgVidList();
}

function setBgVidVolume(idx, value) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioGain = Math.max(0, Math.min(1, value / 100));
  applyBgVidItemAudio(item);
}

function renderBgVidList() {
  const el = $("bg-vid-list");
  if (!el) return;
  if (!S.bgVidItems.length) { el.innerHTML = ""; return; }
  el.innerHTML = S.bgVidItems.map((it, i) => {
    const sz = (it.file.size / 1e6).toFixed(1);
    const dur = it.dur ? it.dur.toFixed(1) + "ث" : "—";
    const audioOn = it.audioEnabled;
    const volPct = Math.round((it.audioGain || 0) * 100);
    const hidden = !!it.hidden;
    const active = (i === S.bgVidActiveIdx);
    const rowStyle = (hidden ? 'opacity:.45;' : '') + (active ? 'outline:2px solid var(--acc,#4caf50);' : '') + 'cursor:pointer';
    // v1.2 Feature#2 — per-clip trim
    const tStart = getBgClipTrimStart(it);
    const tEnd   = getBgClipTrimEnd(it);
    const trimActive = hasBgClipTrim(it);
    const durMax = (it.dur || 0).toFixed(2);
    return `<div class="bgv-item${hidden ? ' bgv-hidden' : ''}${active ? ' bgv-active' : ''}" data-idx="${i}" style="${rowStyle}" title="اِنقر لعرض المُعاينة">
      <span class="bgv-idx">${i + 1}</span>
      <span class="bgv-name" title="${escHtml(it.name)}">${escHtml(it.name)}</span>
      <span class="bgv-dur">${dur} · ${sz}MB</span>
      <button data-act="hide" class="${hidden ? 'on' : ''}" title="${hidden ? 'إعادة إظهار المَقطع' : 'إعماء المَقطع (يَبقى مَحفوظاً)'}">${hidden ? '👁️‍🗨️' : '👁️'}</button>
      <button data-act="audio" class="${audioOn ? 'on' : ''}" title="${audioOn ? 'كتم صوت المقطع' : 'تفعيل صوت المقطع'}">${audioOn ? '🔊' : '🔇'}</button>
      <input type="range" class="bgv-vol" min="0" max="100" value="${volPct}" data-act="vol" title="مستوى صوت المقطع: ${volPct}%" ${audioOn ? '' : 'style="visibility:hidden"'}>
      <button data-act="up"     ${i === 0 ? "disabled" : ""} title="أعلى">▲</button>
      <button data-act="down"   ${i === S.bgVidItems.length - 1 ? "disabled" : ""} title="أسفل">▼</button>
      <button data-act="remove" title="إزالة">✕</button>
      <span class="bgv-trim-block${trimActive ? ' on' : ''}" title="تَقليم مُدّة المَقطع + نَمط الاِنتقال">
        <span title="تَقليم">✂️</span>
        <input type="number" min="0" max="${durMax}" step="0.1" value="${tStart.toFixed(2)}" data-act="trim-start" title="بَدء المَقطع (ث)">
        <span>→</span>
        <input type="number" min="0" max="${durMax}" step="0.1" value="${tEnd.toFixed(2)}" data-act="trim-end" title="نِهاية المَقطع (ث)">
        <button data-act="trim-reset" title="إفراغ التَقليم (المَقطع كامِلاً)" ${trimActive ? '' : 'disabled'}>↺</button>
        <span title="نَمط اِنتقال">🎞️</span>
        <select data-act="clip-transition" title="نَمط اِنتقال هذا المَقطع (— عامّ — = يَتبَع الإعداد العامّ)">
          <option value="">— عامّ —</option>
          <option value="fade">✨ ناعم</option>
          <option value="wipeleft">◀️ مَسح يَسار</option>
          <option value="wiperight">▶️ مَسح يَمين</option>
          <option value="slideleft">⬅️ اِنزلاق يَسار</option>
          <option value="slideright">➡️ اِنزلاق يَمين</option>
          <option value="slideup">⬆️ اِنزلاق أَعلى</option>
          <option value="slidedown">⬇️ اِنزلاق أَسفل</option>
          <option value="circleopen">⚪ دائرة تَنفَتِح</option>
          <option value="circleclose">⚫ دائرة تَنغَلِق</option>
          <option value="radial">🌀 قَطاعيّ</option>
          <option value="dissolve">💫 مُذَوَّب</option>
        </select>
      </span>
    </div>`;
  }).join("");
  // v1.2 — نَقر على صَفّ (خارج الأَزرار/الشَريط) يُفَعِّل المُعاينَة
  el.querySelectorAll(".bgv-item").forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("input")) return;
      const idx = parseInt(row.dataset.idx);
      if (!isNaN(idx) && !S.bgVidItems[idx]?.hidden) {
        activateBgVidByIndex(idx, true);
      }
    });
  });
  el.querySelectorAll(".bgv-item button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();  // v1.2 — لا يُفَعِّل الصَفّ
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      const act = e.currentTarget.dataset.act;
      if (act === "up")              moveBgVidItem(idx, -1);
      else if (act === "down")       moveBgVidItem(idx, +1);
      else if (act === "remove")     removeBgVidItem(idx);
      else if (act === "audio")      toggleBgVidAudio(idx);
      else if (act === "hide")       toggleBgVidHidden(idx);
      else if (act === "trim-reset") resetBgVidClipTrim(idx);
    });
  });
  // v1.2 — حَقلا trim
  el.querySelectorAll(".bgv-item input[data-act='trim-start'], .bgv-item input[data-act='trim-end']").forEach(inp => {
    inp.addEventListener("change", (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      setBgVidClipTrim(idx, e.currentTarget.dataset.act, e.currentTarget.value);
    });
  });
  // v1.2 — dropdown اِنتقال per-clip
  el.querySelectorAll(".bgv-item select[data-act='clip-transition']").forEach(sel => {
    const idx = parseInt(sel.closest(".bgv-item").dataset.idx);
    const it = S.bgVidItems[idx];
    if (it && typeof it.transition === "string") sel.value = it.transition;
    sel.addEventListener("change", (e) => {
      e.stopPropagation();
      const i = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      if (S.bgVidItems[i]) {
        S.bgVidItems[i].transition = e.currentTarget.value || "";
        if (typeof markProjectDirty === "function") markProjectDirty();
      }
    });
    sel.addEventListener("click", (e) => e.stopPropagation());
  });
  el.querySelectorAll(".bgv-item input.bgv-vol").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      setBgVidVolume(idx, parseFloat(e.currentTarget.value));
    });
  });
}

function onBgTypeChange() {
  const v = radioVal("bgt");
  $("bg-grad-ctrl").style.display = v === "gradient" ? "block" : "none";
  $("bg-img-ctrl").style.display = v === "image" ? "block" : "none";
  $("bg-vid-ctrl").style.display = v === "video" ? "block" : "none";
}

// ══════════════════════════════════════════════════════
//  PLAY / PAUSE
// ══════════════════════════════════════════════════════
function togglePlay() {
  if (S.playing) pausePlayer(); else startPlayer();
}

function startPlayer() {
  const recvidActive = ge("recvid-on") && S.recVidEl;
  const hasCustomAudio = ge("free-audio-on") && S.bgAudioEl;
  const silentMode = ge("silent-mode"); // v0.14
  if (!recvidActive && !S.verses.length && !hasCustomAudio && !silentMode) {
    toast("⚠️ لا توجد آيات مُحمَّلة", "error");
    return;
  }
  S.playing = true;
  $("btn-play").textContent = "⏸️";
  resumeAudioCtx().catch(console.warn);
  // v0.14 — الوَضع الصامت
  if (silentMode) {
    const allowBg = ge("silent-allow-bg-audio");
    if (S.bgAudioEl && allowBg) { S.bgAudioEl.loop = ge("bg-loop"); S.bgAudioEl.play().catch(() => {}); }
    else if (S.bgAudioEl) { try { S.bgAudioEl.pause(); } catch (_) {} }
    if (S.bgVid) { try { S.bgVid.play().catch(() => {}); } catch (_) {} }
    return;
  }
  // v0.7.5 — في وضع recvid: لا تُشغّل صوت الخلفية
  if (S.bgAudioEl && !recvidActive) { S.bgAudioEl.loop = ge("bg-loop"); S.bgAudioEl.play().catch(() => { }); }
  else if (S.bgAudioEl && recvidActive) { try { S.bgAudioEl.pause(); } catch (_) {} }
  if (S.bgVid) { try { S.bgVid.play().catch(() => {}); } catch (_) {} }
  // v1.2 — استَأنِف المَقطع القادِم في الـcrossfade (إن كان مُعَلَّقاً)
  if (S.bgVidNext) { try { S.bgVidNext.play().catch(() => {}); } catch (_) {} }
  if (recvidActive) { try { S.recVidEl.play().catch(() => {}); } catch (_) {} }
  else if (S.verses.length) playRecitationAudio();
}

function pausePlayer() {
  S.playing = false;
  $("btn-play").textContent = "▶️";
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();
  if (S.bgVid) { try { S.bgVid.pause(); } catch (_) {} }
  // v1.2 — أوقف أَيضاً المَقطع القادِم في الـcrossfade
  if (S.bgVidNext) { try { S.bgVidNext.pause(); } catch (_) {} }
  // v1.1.0 — أوقف فيديو التِلاوة فقط دون إعادة لِلبداية (لِيَستأنِف من موضعه)
  if (S.recVidEl) { try { S.recVidEl.pause(); } catch (_) {} }
}

// v1.1.0 — مَجموع تَوقيتات الآيات السابقة (+ الفَجَوات) لِمُزامَنة مَوضِع فيديو التِلاوة
function getCumulativeAyaTime(idx) {
  let t = 0;
  const gap = typeof getAyaGap === "function" ? getAyaGap() : 0;
  for (let i = 0; i < idx && i < S.ayaDurations.length; i++) {
    t += (S.ayaDurations[i] || 6) + gap;
  }
  return t;
}

// v1.1.0 — يُزامِن مَوضِع فيديو التِلاوة مع الآية الحاليّة
function syncRecVidToCurrentAya() {
  if (!S.recVidEl) return;
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!recvidActive) return;
  try {
    const t = getCumulativeAyaTime(S.currentAya) + (S.elapsed || 0);
    S.recVidEl.currentTime = Math.max(0, Math.min(t, S.recVidEl.duration || t));
  } catch (_) {}
}

function prevAya() {
  if (S.currentAya > 0) {
    S.currentAya--; S.elapsed = 0;
    syncRecVidToCurrentAya();
    updateAyaUI();
    if (S.playing) playRecitationAudio();
  }
}
function nextAya() {
  if (S.currentAya < S.verses.length - 1) {
    S.currentAya++; S.elapsed = 0;
    syncRecVidToCurrentAya();
    updateAyaUI();
    if (S.playing) playRecitationAudio();
  }
}

function seekClick(e) {
  const bar = $("pbar"), ratio = e.offsetX / bar.offsetWidth;
  const total = S.verses.length * (S.ayaDurations[0] || 6);
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    const d = S.ayaDurations[i] || 6;
    if (acc + d >= ratio * total) { S.currentAya = i; S.elapsed = (ratio * total - acc); break; }
    acc += d;
  }
  syncRecVidToCurrentAya();
  updateAyaUI();
  if (S.playing) playRecitationAudio();
}

function updateProgressUI() {
  const totalDur = S.verses.length * (S.ayaDurations[0] || 6) || 1;
  const passed = S.ayaDurations.slice(0, S.currentAya).reduce((a, b) => a + b, 0) + S.elapsed;
  const pct = Math.min(100, (passed / totalDur) * 100);
  $("pfill").style.width = pct + "%";
  $("ptime").textContent = `${fmt(passed)} / ${fmt(totalDur)}`;
}

function updateAyaUI() {
  $("aya-ind").textContent = `الآية ${S.currentAya + 1}/${S.verses.length}`;
}
function fmt(s) { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

// ══════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════
async function startExport(type) {
  if (!S.verses.length) { toast("⚠️ لا توجد آيات", "error"); return; }

  S.exportCancel = false;
  S.exportChunks = [];
  S.exporting = true;
  initExportMuteState();  // طبّق إعداد كتم التصدير قبل بدء الترميز
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();

  $("rec-ov").classList.add("on");
  $("rec-fill").style.width = "0%";
  $("rec-pct").textContent = "0%";
  $("rec-sub").textContent = "⏳ جاري تحميل الصوتيات…";

  const ctx = await resumeAudioCtx();
  const manualDur = parseFloat(gv("aya-dur")) || 6;
  const getDur = (i) => {
    const aya = S.verses[i];
    if (aya?.free || aya?.audio === null) return aya.manualDuration || manualDur;
    return (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : manualDur;
  };

  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const gainVal = gv("rec-vol") / 100;
  const skipReciter = !!S.useFreeAsSource || S.verses.every(v => v?.free || v?.audio === null);
  let loaded = 0;

  const audioBuffers = await Promise.all(S.verses.map(async (aya, i) => {
    if (skipReciter || aya?.free || aya?.audio === null) {
      S.ayaDurations[i] = aya?.manualDuration || manualDur;
      loaded++;
      $("rec-sub").textContent = `⏳ تحضير الشرائح… ${loaded}/${S.verses.length}`;
      return null;
    }
    const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
      return buf;
    } catch (e1) {
      try {
        const res2 = await fetch(url, { cache: "no-store", mode: "cors" });
        if (!res2.ok) throw new Error("HTTP " + res2.status);
        const ab2 = await res2.arrayBuffer();
        const buf2 = await ctx.decodeAudioData(ab2);
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
        return buf2;
      } catch (e2) {
        try {
          const dur = await new Promise((res, rej) => {
            const a = new Audio();
            a.crossOrigin = "anonymous";
            a.onloadedmetadata = () => res(a.duration);
            a.onerror = () => {
              const a2 = new Audio(url);
              a2.onloadedmetadata = () => res(a2.duration);
              a2.onerror = () => rej(new Error("audio load failed"));
              a2.load();
            };
            a.src = url;
            a.load();
            setTimeout(() => rej(new Error("timeout")), 8000);
          });
          if (dur > 0) S.ayaDurations[i] = dur;
        } catch (_) {}
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length} ⚠️`;
        return null;
      }
    }
  }));

  const loadedCount = audioBuffers.filter(b => b !== null).length;
  // v0.5.1 — لا تُظهر التحذير في وضع النصّ الحرّ (لا صوت قارئ مقصود)
  if (loadedCount === 0 && !skipReciter) {
    toast("⚠️ تعذر جلب الصوت عبر fetch — سيتم التصدير بالصوت الأساسي", "info");
  }

  if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }

  audioBuffers.forEach((buf, i) => { if (buf) S.ayaDurations[i] = buf.duration; });

  const ayaGap = getAyaGap();
  const ayaStarts = [];
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    ayaStarts.push(acc);
    acc += getDur(i) + ayaGap;
  }
  const totalDuration = acc;
  const FPS = parseInt(gv("export-fps") || "30") || 30;
  const FRAME_MS = 1000 / FPS;
  const totalFrames = Math.ceil(totalDuration * FPS);

  const cv = $("cv");

  // ═══════════════════════════════════════════════════
  //  V2: المسار الحتمي عبر WebCodecs (إن كان مدعوماً)
  //  لا تقطّع، لا انجراف زمني — مكافئ للنسخة المكتبية
  // ═══════════════════════════════════════════════════
  let v2Completed = false;  // علم صارم: إن صار true → ممنوع MediaRecorder
  if (typeof startWebExportV2 === "function" && typeof isWebCodecsSupported === "function" && isWebCodecsSupported()) {
    try {
      $("rec-sub").textContent = "🚀 محرّك حتمي V2 (WebCodecs)…";
      // فكّ ترميز صوت الخلفية لخلطه في OfflineAudioContext
      let bgBuffer = null;
      // v0.7.5 — في وضع recvid: استخدم صوت فيديو التلاوة بدل bgAudio
      const _recvidActive = ge("recvid-on") && S.recVidFile;
      if (_recvidActive) {
        try {
          const ab = await S.recVidFile.arrayBuffer();
          bgBuffer = await ctx.decodeAudioData(ab.slice(0));
        } catch (e) { console.warn("recvid audio decode failed:", e); }
      } else if (S.bgAudioEl && S.bgAudioEl.src) {
        try {
          const r = await fetch(S.bgAudioEl.src);
          const ab = await r.arrayBuffer();
          bgBuffer = await ctx.decodeAudioData(ab.slice(0));
        } catch (e) { console.warn("bg audio decode failed:", e); }
      }
      const cancelRef = { canceled: false };
      S.exportCancelRef = cancelRef;

      // setStateForTime: يضبط الآية + المنقضي + bgMotionT لإطار معيّن
      const getAyaAt = (t) => {
        for (let i = 0; i < S.verses.length; i++) {
          if (t < ayaStarts[i] + getDur(i) + ayaGap) return i;
        }
        return S.verses.length - 1;
      };
      const setStateForTime = (t) => {
        const idx = getAyaAt(Math.min(t, totalDuration - 1e-4));
        S.currentAya = idx;
        S.elapsed    = Math.max(0, t - ayaStarts[idx]);
        S.bgMotionT  = t;
      };

      await window.startWebExportV2({
        canvas: cv,
        drawFrame,
        setStateForTime,
        totalDuration,
        fps: FPS,
        audioBuffers,
        ayaStarts,
        bgBuffer,
        bgGain: (gv("bg-vol") || 0) / 100,
        bgLoop: ge("bg-loop"),
        recGain: gainVal,
        bgVideo: S.bgVid,
        // v0.11.1 — المؤثّرات الصوتيّة (recvid أولاً، ثمّ free-audio)
        bgFXConfig: (ge("recvid-on") && getFXConfig("recvid").enabled)
          ? getFXConfig("recvid")
          : (getFXConfig("free").enabled ? getFXConfig("free") : null),
        codecKey: (type === "mp4" ? "mp4-h264" : "webm-vp9"),
        videoBitrate: parseInt(gv("export-vbr") || "8") || 8,
        audioBitrate: "192k",
        cancelRef,
        onProgress: (pct, label) => {
          const cp = Math.max(0, Math.min(100, Math.round(pct)));
          $("rec-fill").style.width = cp + "%";
          $("rec-pct").textContent  = cp + "%";
          if (label) $("rec-sub").textContent = label;
        },
      });
      v2Completed = true;  // ⚠️ مهم: V2 أنتج الملف بنجاح
      toast("✅ تم التصدير بنجاح! (محرّك V2 حتمي)", "success");
    } catch (e) {
      if (e && e.message === "cancelled") {
        toast("تم إلغاء التصدير", "info");
        v2Completed = true;  // المستخدم ألغى عمداً — لا fallback
      } else {
        console.warn("V2 export failed, falling back to MediaRecorder:", e);
        toast("⚠️ V2 فشل: " + String(e.message).slice(0, 80) + " — جاري المحاولة بالطريقة القديمة", "info", 4000);
      }
    } finally {
      S.exportCancelRef = null;
    }
    // تنظيف صارم بعد V2 — في كل الأحوال (نجاح/إلغاء)
    if (v2Completed) {
      $("rec-ov").classList.remove("on");
      if (typeof cleanupExportMute === "function") cleanupExportMute();
      stopRecitationAudio();
      if (S.bgAudioEl) { try { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; } catch (_) {} }
      if (S.bgVid)     { try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {} }
      S.exporting = false;
      S.playing   = false;
      if (typeof updateAyaUI === "function") updateAyaUI();
      return;  // ⛔ لا MediaRecorder
    }
  }

  // ═══════════════════════════════════════════════════
  //  المسار القديم (MediaRecorder) — fallback فقط إن V2
  //  لم يُنتج ملفاً وفشل بأخطاء غير "cancelled"
  // ═══════════════════════════════════════════════════
  if (v2Completed) return;  // belt-and-suspenders
  const stream = cv.captureStream(FPS);
  const tracks = [...stream.getTracks()];
  if (S.exportDest && S.exportDest.stream.getAudioTracks().length)
    tracks.push(...S.exportDest.stream.getAudioTracks());

  const mime4 = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
  const mime_w = "video/webm;codecs=vp9,opus";
  const mimeT = type === "mp4" ? mime4 : mime_w;
  const mime = MediaRecorder.isTypeSupported(mimeT) ? mimeT : "video/webm";

  const vbrMbps = parseInt(gv("export-vbr") || "8") || 8;
  const mr = new MediaRecorder(new MediaStream(tracks), {
    mimeType: mime, videoBitsPerSecond: vbrMbps * 1_000_000, audioBitsPerSecond: 128_000
  });
  S.mediaRecorder = mr;
  mr.ondataavailable = e => { if (e.data.size > 0) S.exportChunks.push(e.data); };
  mr.onstop = () => {
    stopExportSources();
    if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }
    const blob = new Blob(S.exportChunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `GT-SIRM_${Date.now()}.${type === "mp4" ? "mp4" : "webm"}`;
    a.click();
    $("rec-ov").classList.remove("on");
    toast("✅ تم التصدير بنجاح!", "success");
  };

  mr.start(100);

  await new Promise(r => setTimeout(r, 150));
  if (S.exportCancel) { mr.stop(); return; }

  const audioStartTime = ctx.currentTime + 0.05;
  S.exportSources = [];

  const hasBuffers = audioBuffers.some(b => b !== null);

  if (hasBuffers) {
    audioBuffers.forEach((buf, i) => {
      if (!buf) return;
      const gain = ctx.createGain();
      gain.gain.value = gainVal;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);
      gain.connect(S.analyser);
      src.start(audioStartTime + ayaStarts[i]);
      S.exportSources.push({ src, gain });
    });
  } else {
    console.warn("Export: using HTMLAudioElement fallback (fetch CORS failed)");
    $("rec-sub").textContent = "⚠️ وضع الصوت البديل (CORS) — الجودة ستنخفض قليلاً";

    const playExportAya = (idx) => {
      if (idx >= S.verses.length || S.exportCancel) return;
      const aya2 = S.verses[idx];
      // v0.4.7 — تخطّى صوت القارئ للنصّ الحرّ
      if (aya2?.free || aya2?.audio === null || skipReciter) {
        setTimeout(() => playExportAya(idx + 1), (aya2.manualDuration || manualDur) * 1000);
        return;
      }
      const url2 = buildAudioUrl(reciter.folder, surahNum, aya2.numberInSurah);
      const a2 = new Audio(url2);
      a2.volume = gainVal;
      try {
        const msrc = ctx.createMediaElementSource(a2);
        const gain2 = ctx.createGain();
        gain2.gain.value = gainVal;
        msrc.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.connect(S.analyser);
        S.exportSources.push({ src: { stop: () => { try{a2.pause();}catch(_){} }, onended: null }, gain: gain2 });
      } catch (_) {}
      a2.onended = () => playExportAya(idx + 1);
      a2.play().catch(() => {});
    };
    setTimeout(() => playExportAya(0), 50);
  }

  if (S.bgAudioEl) { S.bgAudioEl.currentTime = 0; S.bgAudioEl.play().catch(() => {}); }

  // v0.7.3 — V1: شغّل فيديو التلاوة الجاهز من البداية
  if (ge("recvid-on") && S.recVidEl) {
    try { S.recVidEl.currentTime = 0; S.recVidEl.play().catch(() => {}); } catch (_) {}
  }

  const savedAya = S.currentAya;
  const savedElapsed = S.elapsed;
  const savedPlaying = S.playing;
  S.playing = true;

  const getAyaAt = (t) => {
    let idx = S.verses.length - 1;
    for (let i = 0; i < S.verses.length; i++) {
      if (t < ayaStarts[i] + getDur(i) + ayaGap) { idx = i; break; }
    }
    return idx;
  };

  let exportTimer = null;
  let lastDrawnFrame = -1;
  let exportDone = false;

  const doExportFrame = () => {
    if (S.exportCancel || exportDone) return;

    const projectTime = ctx.currentTime - audioStartTime;

    if (projectTime >= totalDuration) {
      exportDone = true;
      if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
      setTimeout(() => { mr.stop(); restoreExportState(); }, 200);
      return;
    }

    const targetFrame = Math.floor(projectTime * FPS);

    if (targetFrame > lastDrawnFrame) {
      const t = targetFrame / FPS;
      const ci = getAyaAt(Math.min(t, totalDuration - 0.001));
      S.currentAya = ci;
      S.elapsed = Math.max(0, t - ayaStarts[ci]);
      drawFrame(t);
      lastDrawnFrame = targetFrame;

      const pct = Math.min(99, Math.round((projectTime / totalDuration) * 100));
      $("rec-fill").style.width = pct + "%";
      $("rec-pct").textContent = pct + "%";
      $("rec-sub").textContent =
      `🎬 ${targetFrame}/${totalFrames} — الآية ${ci + 1}/${S.verses.length} — ${fmt(projectTime)} / ${fmt(totalDuration)}`;
      updateAyaUI();
    }

    const msToNextFrame = Math.max(4, FRAME_MS - ((projectTime * 1000) % FRAME_MS));
    exportTimer = setTimeout(doExportFrame, msToNextFrame);
  };

  const onVisChange = () => {
    if (!document.hidden && !exportDone && !S.exportCancel) {
      if (exportTimer) { clearTimeout(exportTimer); exportTimer = null; }
      doExportFrame();
    }
  };
  document.addEventListener("visibilitychange", onVisChange);

  exportTimer = setTimeout(doExportFrame, 0);

  function restoreExportState() {
    exportDone = true;
    if (exportTimer !== null) { clearTimeout(exportTimer); exportTimer = null; }
    document.removeEventListener("visibilitychange", onVisChange);
    S.exporting = false;
    S.playing = savedPlaying;
    S.currentAya = savedAya;
    S.elapsed = savedElapsed;
    $("rec-ov").classList.remove("on");
    updateAyaUI();
  }
}

function stopExportSources() {
  S.exportSources.forEach(s => {
    try { s.src.onended = null; s.src.stop(0); } catch (_) {}
    try { s.gain.disconnect(); } catch (_) {}
  });
  S.exportSources = [];
  // v0.7.3 — أوقف فيديو التلاوة عند نهاية التصدير الحيّ
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }
}

function cancelExport() {
  S.exportCancel = true;
  S.exporting = false;
  // محرك V2 للويب (WebCodecs)
  if (S.exportCancelRef) S.exportCancelRef.canceled = true;
  // المسار القديم (MediaRecorder)
  stopExportSources();
  stopRecitationAudio();
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
  if (S.mediaRecorder && S.mediaRecorder.state !== "inactive") {
    try { S.mediaRecorder.stop(); } catch (_) {}
  }
  $("rec-ov").classList.remove("on");
  toast("تم إلغاء التصدير", "info");
}

// ══════════════════════════════════════════════════════
//  QURAN DATA  (مع تخزين محلي دائم للعمل دون اتصال)
// ══════════════════════════════════════════════════════
//   - قائمة السور:   localStorage["gt_sirm_surahs_v1"]    (دائمة)
//   - نص القرآن:     localStorage["gt_sirm_quran_idx_v1"] (يُحمَّل في الخلفية)
//   - الترجمات:      localStorage["gt_sirm_trans_{ed}_{n}"] (بالطلب)
const SURAHS_KEY = "gt_sirm_surahs_v1";

async function loadSurahList() {
  const sel = $("surah-sel");
  // 1) جرّب localStorage الدائم
  let surahs = null;
  try {
    const cached = JSON.parse(localStorage.getItem(SURAHS_KEY) || "null");
    if (Array.isArray(cached) && cached.length === 114) surahs = cached;
  } catch (_) {}
  // 2) جرّب sessionStorage (احتياط من نسخة قديمة)
  if (!surahs) {
    try {
      const old = JSON.parse(sessionStorage.getItem("gt_surahs") || "null");
      if (Array.isArray(old) && old.length === 114) {
        surahs = old;
        try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
      }
    } catch (_) {}
  }

  if (surahs) {
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    renderSurahList(surahs);
    await loadVerses();
    return;
  }

  // 3) لا يوجد كاش — حمّل من الـ API
  sel.innerHTML = `<option>⏳ جاري التحميل…</option>`;
  try {
    const r = await fetch(`${QURAN_API}/surah`);
    const d = await r.json();
    surahs = d.data;
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
    renderSurahList(surahs);
    await loadVerses();
  } catch (e) {
    sel.innerHTML = `<option value="1">1. سورة الفاتحة</option>`;
    loadOfflineFallback();
  }
}

function renderSurahList(surahs) {
  const sel = $("surah-sel");
  sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.name} — ${s.englishName}</option>`).join("");
}

function filterSurahs(query) {
  if (!S.surahs) return;
  const raw = (query || "").trim();
  if (!raw) {
    S.filteredSurahs = S.surahs;
  } else {
    // تطبيع المدخل والمقارنة على الأسماء العربية المطبَّعة كذلك
    const nq = normalizeArabic(raw);
    const lq = raw.toLowerCase();
    S.filteredSurahs = S.surahs.filter(s => {
      const arNorm = normalizeArabic(s.name || "");
      const enLow  = (s.englishName || "").toLowerCase();
      return arNorm.includes(nq)
          || enLow.includes(lq)
          || s.number.toString().includes(raw);
    });
  }
  renderSurahList(S.filteredSurahs);
}

function loadOfflineFallback() {
  S.verses = [
    { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  ];
  $("aya-info").textContent = "⚠️ وضع غير متصل — سورة الفاتحة";
  updateAyaUI();
}

function onSurahChange() { loadVerses(); }
async function loadVerses() {
  // v1.2 — أثناء استعادة مَشروع، runtime snapshot سيَملأ S.verses مُباشَرةً
  if (S._restoring) return;
  if (typeof isModuleActive === "function" && !isModuleActive("quran")) {
    toast?.("⚠️ وحدة القرآن مُلغاة من الإعدادات — لا يمكن جلب الآيات", "warn", 2500);
    return;
  }
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (surah) { const max = surah.numberOfAyahs; if (to > max) $("to-aya").value = max; }
  $("aya-info").textContent = "⏳ جاري تحميل الآيات…";

  let verses = null;
  let source = "";

  // 1) جرّب فهرس القرآن المحلي الكامل (الأسرع — يعمل دون اتصال)
  if (_quranIdx?.verses?.length) {
    const matched = _quranIdx.verses
      .filter(v => v.s === surahNum && v.a >= from && v.a <= to)
      .map(v => ({ numberInSurah: v.a, text: v.t }));
    if (matched.length) { verses = matched; source = "📚 محلي"; }
  }

  // 2) جرّب sessionStorage (كاش جلسة سابقة)
  if (!verses) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(`gt_v_${surahNum}_${from}_${to}`) || "null");
      if (Array.isArray(cached) && cached.length) { verses = cached; source = "🗂 جلسة"; }
    } catch (_) {}
  }

  // 3) آخر حل: API الخارجي
  if (!verses) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
      const d = await r.json();
      verses = d.data.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to)
                            .map(a => ({ numberInSurah: a.numberInSurah, text: a.text }));
      try { sessionStorage.setItem(`gt_v_${surahNum}_${from}_${to}`, JSON.stringify(verses)); } catch (_) {}
      source = "🌐 شبكة";
    } catch (e) {
      $("aya-info").textContent = "⚠️ فشل التحميل (لا توجد بيانات محلية أو اتصال)";
      if (!S.verses.length) loadOfflineFallback();
      return;
    }
  }

  // v0.4.3 — وضع "النصّ فقط"
  const textOnly = !!ge("quran-text-only");
  if (textOnly) {
    const dur = parseFloat(gv("aya-dur")) || 6;
    verses = verses.map(v => ({
      ...v,
      audio: null,
      audioSecondary: [],
      manualDuration: dur,
      free: true,
      source: `سورة ${surah?.name || ""} (نصّ فقط)`,
    }));
    S.useFreeAsSource = true;
    if (S.recAudioEl) { try { S.recAudioEl.pause(); S.recAudioEl.src = ""; } catch (_) {} }
    if (S.recAudioSource) {
      try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (_) {}
      S.recAudioSource = null;
    }
    const audioCb = document.getElementById("free-audio-on");
    if (audioCb && !audioCb.checked) {
      audioCb.checked = true;
      try { localStorage.setItem("gt_sirm_free_audio_on", "1"); } catch (_) {}
      if (typeof toggleFreeAudioVisibility === "function") toggleFreeAudioVisibility();
    }
    const autoDurCb = document.getElementById("auto-dur");
    if (autoDurCb && autoDurCb.checked) {
      autoDurCb.checked = false;
      autoDurCb.dispatchEvent(new Event("change"));
    }
  } else {
    S.useFreeAsSource = false;
  }

  S.verses = verses; S.currentAya = 0; S.elapsed = 0; S.ayaDurations = [];
  const suffix = textOnly ? " · 🔇 نصّ فقط" : "";
  $("aya-info").textContent = `✅ ${verses.length} آية من سورة ${surah?.name || ""} ${source}${suffix}`;
  updateAyaUI();
  await loadTranslations();
}

function onTransChange() {
  const v = $("trans-sel").value;
  $("trans-opts").style.display = v === "none" ? "none" : "block";
  loadTranslations();
}
async function loadTranslations() {
  if (typeof isModuleActive === "function" && !isModuleActive("quran")) {
    S.translations = [];
    return;
  }
  const edition = $("trans-sel").value; if (edition === "none") { S.translations = []; return; }
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  // كاش لكل (سورة، نسخة) في localStorage — يبقى بين الجلسات
  const persistKey = `gt_sirm_trans_${edition}_${surahNum}`;
  let allAyahs = null;

  try {
    const cached = JSON.parse(localStorage.getItem(persistKey) || "null");
    if (Array.isArray(cached) && cached.length) allAyahs = cached;
  } catch (_) {}

  if (!allAyahs) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/${edition}`);
      const d = await r.json();
      allAyahs = d.data.ayahs.map(a => ({ n: a.numberInSurah, t: a.text }));
      try { localStorage.setItem(persistKey, JSON.stringify(allAyahs)); } catch (_) {}
    } catch (e) { S.translations = []; return; }
  }

  S.translations = allAyahs
    .filter(a => a.n >= from && a.n <= to)
    .map(a => a.t);
}

// ══════════════════════════════════════════════════════
//  بحث الآيات مع تطبيع التشكيل (نسخة الويب)
// ══════════════════════════════════════════════════════
const QURAN_INDEX_KEY = "gt_sirm_quran_idx_v1";

function normalizeArabic(s) {
  if (!s) return "";
  return s
    .replace(/[ً-ْٰؐ-ؚۖ-ۭ]/g, "")
    .replace(/[أإآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/ء/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeWithMap(s) {
  if (!s) return { norm: "", map: [] };
  let out = "";
  const map = [];
  let lastSpace = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/[ً-ْٰؐ-ؚۖ-ۭـء]/.test(c)) continue;
    let r;
    if (/[إأآٱا]/.test(c)) r = "ا";
    else if (c === "ى") r = "ي";
    else if (c === "ة") r = "ه";
    else if (/\s/.test(c)) {
      if (lastSpace) continue;
      r = " ";
    } else {
      r = c.toLowerCase();
    }
    out += r;
    map.push(i);
    lastSpace = (r === " ");
  }
  return { norm: out, map };
}

let _quranIdx = null;
let _quranIdxLoading = null;

async function loadQuranIndex() {
  if (_quranIdx) return _quranIdx;
  if (_quranIdxLoading) return _quranIdxLoading;

  _quranIdxLoading = (async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
      if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
        _quranIdx = cached;
        return cached;
      }
    } catch (_) {}

    const r = await fetch(`${QURAN_API}/quran/quran-uthmani`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const sd = d.data?.surahs || [];
    const verses = [];
    for (const s of sd) {
      for (const a of s.ayahs) {
        verses.push({
          s:  s.number,
          sn: s.name,
          a:  a.numberInSurah,
          t:  a.text,
          n:  normalizeArabic(a.text),
        });
      }
    }
    const out = { v: 1, verses };
    try { localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(out)); } catch (_) {}
    _quranIdx = out;
    return out;
  })();

  return _quranIdxLoading;
}

function preloadQuranIndex() {
  try {
    const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
    if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
      _quranIdx = cached;
      console.log(`[Quran] Index ready from cache: ${cached.verses.length} verses`);
      if (!S.verses.length) loadVerses();
      return;
    }
  } catch (_) {}
  loadQuranIndex()
    .then(idx => {
      console.log(`[Quran] Index downloaded: ${idx.verses.length} verses, cached for offline`);
      toast("📚 تم تحميل القرآن كاملاً للعمل دون اتصال", "success", 3500);
    })
    .catch(err => console.warn("[Quran] Index preload failed:", err));
}

function searchVerses(query, limit = 80) {
  if (!_quranIdx) return [];
  const nq = normalizeArabic(query);
  if (!nq) return [];
  const out = [];
  for (const v of _quranIdx.verses) {
    const idx = v.n.indexOf(nq);
    if (idx >= 0) {
      out.push({ s: v.s, sn: v.sn, a: v.a, t: v.t, matchIdx: idx, matchLen: nq.length });
      if (out.length >= limit) break;
    }
  }
  return out;
}

function highlightVerseMatch(text, matchIdx, matchLen) {
  const { map } = normalizeWithMap(text);
  if (matchIdx < 0 || matchIdx >= map.length) return escHtml(text);
  const start = map[matchIdx];
  const end   = matchIdx + matchLen - 1 < map.length ? (map[matchIdx + matchLen - 1] + 1) : text.length;
  return escHtml(text.slice(0, start))
       + "<mark>" + escHtml(text.slice(start, end)) + "</mark>"
       + escHtml(text.slice(end));
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

async function onVerseSearchInput(e) {
  const q = e.target.value || "";
  const resultsEl = $("verse-search-results");
  const clearBtn  = $("verse-search-clear-btn");
  if (clearBtn) clearBtn.style.display = q ? "" : "none";
  if (!q.trim()) {
    if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
    return;
  }

  if (!_quranIdx) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-loading">⏳ تحميل فهرس القرآن (مرّة واحدة فقط)…</div>`;
    try {
      await loadQuranIndex();
    } catch (err) {
      resultsEl.innerHTML = `<div class="vs-empty">❌ فشل تحميل الفهرس: ${escHtml(err.message)}</div>`;
      return;
    }
  }

  const results = searchVerses(q);
  if (!results.length) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-empty">لا توجد نتائج تطابق "${escHtml(q)}"</div>`;
    return;
  }

  resultsEl.style.display = "block";
  resultsEl.innerHTML = results.map(r =>
    `<div class="vs-item" data-s="${r.s}" data-a="${r.a}">
       <div class="vs-head"><span>${escHtml(r.sn)} • آية ${r.a}</span><span>📖 ${r.s}:${r.a}</span></div>
       <div class="vs-text">${highlightVerseMatch(r.t, r.matchIdx, r.matchLen)}</div>
     </div>`
  ).join("");

  resultsEl.querySelectorAll(".vs-item").forEach(it => {
    it.addEventListener("click", () => {
      const s = parseInt(it.dataset.s);
      const a = parseInt(it.dataset.a);
      jumpToVerse(s, a);
    });
  });
}

async function jumpToVerse(surahNum, ayaNum) {
  const sel = $("surah-sel");
  if (sel) sel.value = surahNum;
  const fromEl = $("from-aya"), toEl = $("to-aya");
  if (fromEl) fromEl.value = ayaNum;
  if (toEl) {
    const cur = S.surahs.find(s => s.number === surahNum);
    const max = cur?.numberOfAyahs || ayaNum;
    toEl.value = Math.min(max, ayaNum + 2);
  }
  const resultsEl = $("verse-search-results");
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  const inp = $("verse-search-inp");
  if (inp) inp.value = "";
  const clr = $("verse-search-clear-btn");
  if (clr) clr.style.display = "none";
  await loadVerses();
  toast(`📖 الانتقال إلى ${ayaNum}:${surahNum}`, "success", 1800);
}

function clearVerseSearch() {
  const inp = $("verse-search-inp");
  const resultsEl = $("verse-search-results");
  const clr = $("verse-search-clear-btn");
  if (inp) inp.value = "";
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  if (clr) clr.style.display = "none";
}

// ══════════════════════════════════════════════════════
//  FONTS
// ══════════════════════════════════════════════════════
function renderFontGrid() {
  const grid = $("font-grid"); grid.innerHTML = "";
  S.allFonts.forEach((f, i) => {
    const div = document.createElement("div"); div.className = "font-card";
    div.innerHTML = `<input type="radio" name="font" id="fn${i}" value="${f.css}" ${i === 0 ? "checked" : ""}>
    <label for="fn${i}"><span class="fs" style="font-family:${f.css}">${f.sample || "بِسْمِ اللَّهِ"}</span><span class="fn">${f.name}</span></label>`;
    grid.appendChild(div);
  });
}

async function loadLocalFonts(showToast = false) {
  try {
    // 1) جرّب window.FONTS_DATA (مُضمَّن في fonts-data.js — يعمل تحت file://)
    let list = (Array.isArray(window.FONTS_DATA) ? window.FONTS_DATA : null);
    // 2) fallback لـ fetch (للعمل عبر HTTP server)
    if (!list) {
      const r = await fetch("./fonts/fonts.json");
      if (!r.ok) throw new Error("HTTP " + r.status);
      list = await r.json();
    }
    if (!Array.isArray(list)) return;
    let added = 0;
    let reloaded = 0;
    for (const item of list) {
      if (!item.name || !item.file) continue;
      try {
        let rawFile = item.file;
        try { rawFile = decodeURIComponent(rawFile); } catch(_) {}
        const fontUrl = `./fonts/${rawFile.split('/').map(encodeURIComponent).join('/')}`;
        // حمّل FontFace دائماً — حتى لو الاسم في BUILT_IN_FONTS
        // (كان dedup السابق يمنع تحميل ملف الخط الفعلي)
        const face = new FontFace(item.name, `url(${fontUrl})`);
        await face.load();
        document.fonts.add(face);
        if (!S.allFonts.find(x => x.name === item.name)) {
          S.allFonts.push({
            id: "local_" + item.name,
            name: item.name,
            css: `'${item.name}'`,
            sample: item.sample || "بِسْمِ اللَّهِ"
          });
          added++;
        } else {
          reloaded++;
        }
      } catch (e) {
        console.warn("Font load failed:", item.name, e);
      }
    }
    renderFontGrid();
    const total = added + reloaded;
    if (showToast) toast(total > 0 ? `✅ ${added} خط جديد + ${reloaded} مُعاد ربطها` : "لا توجد خطوط في fonts/", "info");
  } catch (e) {
    console.warn("fonts.json error:", e);
    if (showToast) toast("📁 تأكد من وجود ملف fonts/fonts.json", "info");
  }
}

function loadCustomFonts(input) {
  Array.from(input.files).forEach(file => {
    const name = file.name.replace(/\.[^.]+$/, "");
    const reader = new FileReader();
    reader.onload = e => {
      const face = new FontFace(name, e.target.result);
      face.load().then(ff => {
        document.fonts.add(ff);
        if (!S.allFonts.find(x => x.name === name)) {
          S.allFonts.push({ id: "custom_" + name, name, css: `'${name}'`, sample: "بِسْمِ اللَّهِ" });
          renderFontGrid();
        }
        toast(`✅ خط: ${name}`, "success");
      }).catch(() => toast(`❌ فشل: ${file.name}`, "error"));
    };
    reader.readAsArrayBuffer(file);
  });
}

// ══════════════════════════════════════════════════════
//  RECITERS
// ══════════════════════════════════════════════════════
function renderReciters() {
  const grid = $("reciters-grid");
  grid.innerHTML = "";
  S.reciters.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "rctr-card";
    div.innerHTML = `
    <input type="radio" name="reciter" id="rc${i}" value="${r.id}" ${i === 0 ? "checked" : ""}>
    <label for="rc${i}">
    <span class="rf">${r.flag}</span>${r.name}
    <span class="edit-reciter" data-id="${r.id}" data-name="${r.name}" data-flag="${r.flag}" data-folder="${r.folder}">✏️</span>
    <span class="del-reciter" data-id="${r.id}">🗑️</span>
    </label>
    `;
    grid.appendChild(div);
  });
  document.querySelectorAll(".del-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      deleteReciter(btn.dataset.id);
    });
  });
  document.querySelectorAll(".edit-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      openEditReciterForm(btn.dataset);
    });
  });
}

function deleteReciter(id) {
  if (S.reciters.length <= 1) {
    toast("⚠️ لا يمكن حذف آخر قارئ", "error");
    return;
  }
  S.reciters = S.reciters.filter(r => r.id !== id);
  renderReciters();
  saveReciters();
  toast("🗑️ تم حذف القارئ", "info");
}

function openEditReciterForm(data) {
  $("ar-name").value = data.name;
  const flagSelect = $("ar-flag");
  for (let opt of flagSelect.options) if (opt.value === data.flag) { opt.selected = true; break; }
  $("ar-folder").value = data.folder;
  $("add-reciter-form").classList.add("on");
  $("add-reciter-form").dataset.editId = data.id;
}

function addCustomReciter() {
  const name = $("ar-name").value.trim();
  const flag = $("ar-flag").value;
  const folder = $("ar-folder").value.trim();
  if (!name || !folder) { toast("⚠️ أدخل الاسم والمجلد", "error"); return; }
  const editId = $("add-reciter-form").dataset.editId;
  if (editId) {
    const index = S.reciters.findIndex(r => r.id === editId);
    if (index !== -1) S.reciters[index] = { ...S.reciters[index], name, flag, folder };
    delete $("add-reciter-form").dataset.editId;
    toast(`✅ تم تحديث: ${name}`, "success");
  } else {
    const id = "custom_" + Date.now();
    S.reciters.push({ id, name, flag, folder });
    toast(`✅ تمت إضافة: ${name}`, "success");
  }
  renderReciters();
  saveReciters();
  $("add-reciter-form").classList.remove("on");
  $("ar-name").value = ""; $("ar-folder").value = "";
}

function toggleAddReciter() {
  const f = $("add-reciter-form");
  f.classList.toggle("on");
  if (f.classList.contains("on")) {
    delete f.dataset.editId;
    $("ar-name").value = ""; $("ar-folder").value = "";
  }
}

// ══════════════════════════════════════════════════════
//  THEMES
// ══════════════════════════════════════════════════════
const THEME_LABELS = { emerald: "💚 زمرد", gold: "👑 ذهبي", night: "🌌 ليلي", rose: "🌸 وردي", ocean: "🌊 محيط", desert: "🏜️ صحراء", purple: "🔮 بنفسجي", dark: "⚫ أسود" };

function initThemeChips() {
  const wrap = $("theme-chips");
  Object.keys(THEMES).forEach((k, i) => {
    const d = document.createElement("div"); d.className = "tc-chip" + (i === 0 ? " on" : ""); d.dataset.t = k;
    d.textContent = THEME_LABELS[k] || k;
    d.onclick = () => applyTheme(d, k);
    wrap.appendChild(d);
  });
}

function applyTheme(el, key) {
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.remove("on")); el.classList.add("on");
  const t = THEMES[key];
  setCol("gc1", t.gc1); setCol("gc2", t.gc2);
  setCol("txt-col", t.tc); setCol("orn-col", t.oc);
  if ($("gc1t")) $("gc1t").value = t.gc1;
  if ($("gc2t")) $("gc2t").value = t.gc2;
  // v0.12.7 — اختيار سمة يَفترض خلفيّة "تَدرّج"
  const gradRadio = document.getElementById("bgt1");
  if (gradRadio && !gradRadio.checked) {
    gradRadio.checked = true;
    gradRadio.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ══════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════
function openModal(id) { $(id).classList.add("on"); }
function closeModal(id) { $(id).classList.remove("on"); }

function confirmSaveTemplate() {
  const name = $("tpl-name-inp").value.trim() || "قالب " + new Date().toLocaleDateString("ar");
  S.templates.push({ name, date: new Date().toLocaleDateString("ar-SA"), state: captureState() });
  persistTemplates(); renderTemplates();
  closeModal("tpl-modal"); $("tpl-name-inp").value = "";
  toast(`✅ تم حفظ: ${name}`, "success");
}

function captureState() {
  return {
    surah: $("surah-sel").value, from: $("from-aya").value, to: $("to-aya").value,
    reciter: radioVal("reciter"), fmt: radioVal("fmt"),
    gc1: $("gc1").value, gc2: $("gc2").value,
    font: radioVal("font"), txtCol: $("txt-col").value,
    wm: $("wm-text").value, orn: radioVal("orn"),
    fxVig: ge("fx-vig"), fxGold: ge("fx-gold"), fxStars: ge("fx-stars"),
    theme: document.querySelector(".tc-chip.on")?.dataset?.t || "emerald",
  };
}

function applyState(st) {
  setV("surah-sel", st.surah); setV("from-aya", st.from); setV("to-aya", st.to);
  setR("reciter", st.reciter); setR("fmt", st.fmt); setR("orn", st.orn);
  setCol("gc1", st.gc1); setCol("gc2", st.gc2);
  if ($("gc1t")) $("gc1t").value = st.gc1 || ""; if ($("gc2t")) $("gc2t").value = st.gc2 || "";
  setCol("txt-col", st.txtCol);
  if ($("wm-text")) $("wm-text").value = st.wm || "";
  if (st.fxVig) ge_el("fx-vig").checked = true;
  if (st.fxGold) ge_el("fx-gold").checked = true;
  if (st.fxStars) ge_el("fx-stars").checked = true;
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.toggle("on", c.dataset.t === st.theme));
  loadVerses(); onFmtChange();
}

// v0.12.8 — قوالب: CSP يَمنع onclick → delegated + تَطبيق-وَتَعديل + تَراجع
function renderTemplates() {
  const grid = $("tpl-grid"), emp = $("tpl-empty");
  if (!S.templates.length) { grid.innerHTML = ""; emp.style.display = "block"; return; }
  emp.style.display = "none";
  grid.innerHTML = S.templates.map((t, i) => `
  <div class="tpl-card" data-tpl-idx="${i}">
    <div class="tpl-name">📁 ${escapeHtml(t.name)}</div>
    <div class="tpl-date">${escapeHtml(t.date)}</div>
    <div class="tpl-actions">
      <button class="btn btn-p bsm" data-tpl-apply="${i}">✅ تطبيق</button>
      <button class="btn btn-g bsm" data-tpl-edit="${i}">✏️ تَعديل</button>
      <button class="btn btn-d bsm" data-tpl-del="${i}">🗑️</button>
    </div>
  </div>`).join("");
  grid.querySelectorAll("[data-tpl-apply]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.tplApply);
      const t = S.templates[idx];
      if (!t) return;
      applyState(t.state);
      if (typeof goTab === "function") goTab("rec");
    });
  });
  grid.querySelectorAll("[data-tpl-del]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.tplDel);
      if (Number.isFinite(idx)) delTemplate(idx);
    });
  });
  grid.querySelectorAll("[data-tpl-edit]").forEach(b => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.dataset.tplEdit);
      const t = S.templates[idx];
      if (!t) return;
      startTemplateEdit(idx);
    });
  });
}

// v0.12.9 — التَعديل يَنقل لـtab-scene (السمات وأدوات المظهر)
function startTemplateEdit(idx) {
  const t = S.templates[idx];
  if (!t) return;
  applyState(t.state);
  if (typeof goTab === "function") goTab("scene");
  showTemplateEditBanner(idx);
}

function showTemplateEditBanner(idx) {
  const t = S.templates[idx];
  if (!t) return;
  let host = document.getElementById("tpl-edit-banner");
  if (!host) {
    host = document.createElement("div");
    host.id = "tpl-edit-banner";
    host.style.cssText = "position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9998;background:linear-gradient(135deg,var(--pd),var(--pl));color:#fff;padding:8px 14px;border-radius:var(--r);box-shadow:0 4px 16px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;font-size:13px;max-width:90%;flex-wrap:wrap";
    document.body.appendChild(host);
  }
  host.innerHTML = "";
  const msg = document.createElement("span");
  msg.innerHTML = `🛠️ تُعدِّل قالب "<strong></strong>" — اضبط ما تُريد ثمّ احفظ`;
  msg.querySelector("strong").textContent = t.name;
  const nameInp = document.createElement("input");
  nameInp.type = "text";
  nameInp.value = t.name;
  nameInp.placeholder = "اسم القالب";
  nameInp.style.cssText = "padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.2);color:#fff;font-size:12px";
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-a bsm";
  saveBtn.textContent = "💾 احفظ التَعديلات";
  saveBtn.addEventListener("click", () => {
    const newName = nameInp.value.trim();
    if (newName) t.name = newName;
    try {
      t.state = captureState();
      t.date = new Date().toLocaleDateString("ar-SA");
      persistTemplates();
      renderTemplates();
      toast?.(`✅ تمّ تَحديث "${t.name}"`, "success", 2000);
    } catch (e) {
      toast?.(`❌ فَشل الحفظ: ${e.message}`, "error", 3000);
      return;
    }
    host.remove();
  });
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-g bsm";
  cancelBtn.textContent = "❌ إلغاء";
  cancelBtn.addEventListener("click", () => { host.remove(); });
  host.appendChild(msg);
  host.appendChild(nameInp);
  host.appendChild(saveBtn);
  host.appendChild(cancelBtn);
}

// مَهلة تَراجع 5 ثوانٍ عند الحذف
let _pendingDelTimer = null;
let _pendingDelTemplate = null;
function delTemplate(i) {
  const t = S.templates[i];
  if (!t) return;
  if (_pendingDelTimer) { clearTimeout(_pendingDelTimer); _pendingDelTimer = null; }
  _pendingDelTemplate = { template: t, index: i };
  S.templates.splice(i, 1);
  persistTemplates();
  renderTemplates();
  showUndoToast(`🗑️ حُذف "${t.name}"`, () => {
    if (_pendingDelTemplate) {
      const { template, index } = _pendingDelTemplate;
      S.templates.splice(index, 0, template);
      persistTemplates();
      renderTemplates();
      _pendingDelTemplate = null;
      toast?.("↩️ تمّ التَراجع", "success", 1500);
    }
  });
  _pendingDelTimer = setTimeout(() => {
    _pendingDelTemplate = null;
    _pendingDelTimer = null;
  }, 5000);
}

function showUndoToast(message, onUndo) {
  let host = document.getElementById("undo-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "undo-toast-host";
    host.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--p);border-radius:var(--r);padding:10px 14px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.4)";
    document.body.appendChild(host);
  }
  host.innerHTML = "";
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  const undoBtn = document.createElement("button");
  undoBtn.className = "btn btn-p bsm";
  undoBtn.textContent = "↩️ تَراجع";
  undoBtn.addEventListener("click", () => {
    try { onUndo?.(); } catch (_) {}
    host.remove();
  });
  host.appendChild(msgSpan);
  host.appendChild(undoBtn);
  setTimeout(() => { try { host.remove(); } catch (_) {} }, 5000);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function loadTemplates() { try { S.templates = JSON.parse(localStorage.getItem("gt_sirm_tpls") || "[]"); } catch (e) { S.templates = []; } renderTemplates(); }
function persistTemplates() { try { localStorage.setItem("gt_sirm_tpls", JSON.stringify(S.templates)); } catch (e) { } }

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      goTab(btn.dataset.tab);
      if (window.innerWidth <= 760) openMobilePanel();
    });
  });
}
function goTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".tp").forEach(p => p.classList.toggle("on", p.id === "tab-" + name));
}

// ── MOBILE PANEL ────────────────────────────────────
let _mobLayout = localStorage.getItem("mob_layout") || "vert";
let _panelSize = parseInt(localStorage.getItem("panel_size") || "62");

function initMobileLayout() {
  if (window.innerWidth > 760) return;
  setMobLayout(_mobLayout, false);
  applyPanelSize(_panelSize);
  const sl = $("panel-size-slider");
  const lb = $("panel-size-lbl");
  if (sl) sl.value = _panelSize;
  if (lb) lb.textContent = _panelSize + "٪";
}

function setMobLayout(mode, save = true) {
  _mobLayout = mode;
  if (save) localStorage.setItem("mob_layout", mode);
  document.body.classList.remove("mob-horiz");
  ["lay-vert","lay-horiz","lay-full"].forEach(id => {
    const btn = $(id); if (btn) btn.classList.remove("on");
  });
  if (mode === "horiz") {
    document.body.classList.add("mob-horiz");
    const btn = $("lay-horiz"); if (btn) btn.classList.add("on");
  } else if (mode === "full") {
    applyPanelSize(90);
    const btn = $("lay-full"); if (btn) btn.classList.add("on");
    openMobilePanel();
    return;
  } else {
    const btn = $("lay-vert"); if (btn) btn.classList.add("on");
  }
  applyPanelSize(_panelSize);
}

function applyPanelSize(pct) {
  const isHoriz = document.body.classList.contains("mob-horiz");
  if (isHoriz) {
    document.documentElement.style.setProperty("--panel-w", pct + "vw");
  } else {
    document.documentElement.style.setProperty("--panel-h", pct + "vh");
  }
}

function onPanelSizeChange(val) {
  _panelSize = parseInt(val);
  localStorage.setItem("panel_size", _panelSize);
  const lb = $("panel-size-lbl");
  if (lb) lb.textContent = _panelSize + "٪";
  applyPanelSize(_panelSize);
}

function toggleMobilePanel() {
  const panel = $("panel");
  if (panel.classList.contains("mob-open")) closeMobilePanel();
  else openMobilePanel();
}
function openMobilePanel() {
  $("panel").classList.add("mob-open");
  $("mob-backdrop").classList.add("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "✕ إغلاق"; t.classList.add("active"); }
}
function closeMobilePanel() {
  $("panel").classList.remove("mob-open");
  $("mob-backdrop").classList.remove("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "🛠 الأدوات"; t.classList.remove("active"); }
}

function initPanelSwipe(e) {
  const startY = e.touches[0].clientY;
  const panel = $("panel");
  let diff = 0;
  const onMove = ev => {
    diff = ev.touches[0].clientY - startY;
    if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
  };
  const onEnd = () => {
    panel.style.transform = "";
    if (diff > 70) closeMobilePanel();
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
  };
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd);
}

// ══════════════════════════════════════════════════════
//  SETTINGS FUNCTIONS
// ══════════════════════════════════════════════════════
function resetAllSettings() {
  if (!confirm("⚠️ سيتم إعادة جميع الإعدادات للافتراضي — هل تريد المتابعة؟")) return;
  localStorage.clear();
  location.reload();
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function ge(id) { const e = $(id); return e && e.checked; }
function ge_el(id) { return $(id); }
function gv(id) { const e = $(id); return e ? e.value : 0; }
function radioVal(name) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : ""; }
function fontVal() { return radioVal("font") || "'Amiri Quran'"; }
function sv(el, outId, unit = "") { $(outId).textContent = el.value + unit; }
function setCol(id, val) { const e = $(id); if (e) e.value = val; }
function setV(id, val) { const e = $(id); if (e) e.value = val; }
function setR(name, val) { const e = document.querySelector(`input[name="${name}"][value="${val}"]`); if (e) e.checked = true; }
function syncCP(pickId, txtId) { const e = $(pickId); if (e && $(txtId)) $(txtId).value = e.value; }
function syncCT(pickId, txtId) { const val = $(txtId).value; if (/^#[0-9a-fA-F]{6}$/.test(val)) { setCol(pickId, val); } }
function hex2rgb(hex) { const h = hex.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toggleManualDur() { $("manual-dur").style.display = ge("auto-dur") ? "none" : "block"; }
function checkOffline() {
  const u = () => document.body.classList.toggle("offline", !navigator.onLine);
  window.addEventListener("online", u); window.addEventListener("offline", u); u();
}
function toast(msg, type = "info", duration = 3600) {
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg;
  $("toast-c").appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ═══════════════════════════════════════════════════════
//  v0.5.7 — حفظ/فتح المشاريع (.gtsirm)
// ═══════════════════════════════════════════════════════

const PROJECT_FORMAT = "GT-SIRM-Project";
const PROJECT_FORMAT_VERSION = 1;
const ASSET_EMBED_MAX = 50 * 1024 * 1024;
const PROJECT_APP_VERSION = "0.5.7";
const IS_DESKTOP_BUILD = false;

let _autoSaveTimer = null;

function markProjectDirty() {
  S.projectDirty = true;
  updateProjectTitle();
}
function clearProjectDirty() {
  S.projectDirty = false;
  updateProjectTitle();
}
function updateProjectTitle() {
  const base = S.projectFileName || "بدون اسم";
  const dirty = S.projectDirty ? " ●" : "";
  document.title = `${base}${dirty} — GT-SIRM`;
  const subtitle = document.getElementById("app-subtitle");
  if (subtitle && S.projectFileName) {
    subtitle.textContent = `📁 ${base}${dirty}`;
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
function dataURLToBlob(dataURL) {
  const [meta, b64] = dataURL.split(",");
  const mime = (meta.match(/data:([^;]+)/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function serializeProject() {
  const byId = {}, byName = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (el.type === "file" || el.type === "button" || el.type === "submit") return;
    if (el.type === "checkbox" || el.type === "radio") {
      if (el.id) byId[el.id] = el.checked;
      if (el.name && (el.type !== "radio" || el.checked)) byName[el.name] = el.value;
    } else {
      if (el.id) byId[el.id] = el.value;
    }
  });

  let modules = {};
  try { modules = JSON.parse(localStorage.getItem("gt_sirm_modules_v1") || "{}"); } catch (_) {}

  const freeText = {
    text: document.getElementById("free-text-area")?.value || "",
    perSlice: S.freePerSlice ? JSON.parse(JSON.stringify(S.freePerSlice)) : [],
    audioTrim: S.freeAudioTrim ? { start: S.freeAudioTrim.start, end: S.freeAudioTrim.end } : null,
  };

  // v1.2 — حالة الأَقسام القابِلة للطَيّ (details) بحَسب التَرتيب
  const detailsOpen = Array.from(document.querySelectorAll("details")).map(d => !!d.open);

  // v1.2 — لَقطة كامِلة من حالة المُحتوى (S.verses + الحُقول المُصاحِبة)
  const runtimeSnapshot = {
    verses:          Array.isArray(S.verses) ? JSON.parse(JSON.stringify(S.verses)) : [],
    translations:    Array.isArray(S.translations) ? JSON.parse(JSON.stringify(S.translations)) : [],
    currentAya:      S.currentAya || 0,
    ayaDurations:    Array.isArray(S.ayaDurations) ? [...S.ayaDurations] : [],
    mixedAnimsOrder: Array.isArray(S.mixedAnimsOrder) ? [...S.mixedAnimsOrder] : [],
    useFreeAsSource: !!S.useFreeAsSource,
    bgVidActiveIdx:  S.bgVidActiveIdx || 0,
  };

  const assets = [];
  if (Array.isArray(S.bgVidItems)) {
    for (let i = 0; i < S.bgVidItems.length; i++) {
      const item = S.bgVidItems[i];
      const a = {
        key: `bgVideo[${i}]`,
        name: item.name || `video-${i}.mp4`,
        size: item.file?.size || 0,
        mime: item.file?.type || "video/mp4",
        active: i === S.bgVidActiveIdx,
        audioEnabled: !!item.audioEnabled,
        audioGain: item.audioGain ?? 0.5,
        hidden: !!item.hidden,   // v1.2
        trimStart: item.trimStart ?? 0,     // v1.2 Feature#2
        trimEnd: item.trimEnd ?? null,      //
        transition: item.transition || "",  // v1.2 — per-clip transition
      };
      if (item.file && item.file.size <= ASSET_EMBED_MAX) {
        a.mode = "embedded";
        a.dataURL = await fileToDataURL(item.file);
      } else {
        a.mode = "missing";
        a.reason = item.file ? "حجم أكبر من 50MB" : "غير متوفّر";
      }
      assets.push(a);
    }
  }
  if (S.bgImgFile) {
    const a = {
      key: "bgImage",
      name: S.bgImgFile.name || "bg.jpg",
      size: S.bgImgFile.size || 0,
      mime: S.bgImgFile.type || "image/jpeg",
    };
    if (S.bgImgFile.size <= ASSET_EMBED_MAX) {
      a.mode = "embedded";
      a.dataURL = await fileToDataURL(S.bgImgFile);
    } else {
      a.mode = "missing";
      a.reason = "حجم أكبر من 50MB";
    }
    assets.push(a);
  }
  if (S.bgAudioFile) {
    const a = {
      key: "bgAudio",
      name: S.bgAudioFile.name || "audio.mp3",
      size: S.bgAudioFile.size || 0,
      mime: S.bgAudioFile.type || "audio/mpeg",
    };
    if (S.bgAudioFile.size <= ASSET_EMBED_MAX) {
      a.mode = "embedded";
      a.dataURL = await fileToDataURL(S.bgAudioFile);
    } else {
      a.mode = "missing";
      a.reason = "حجم أكبر من 50MB";
    }
    assets.push(a);
  }
  // v0.7.2 — فيديو التلاوة الجاهز
  if (S.recVidFile) {
    const a = {
      key: "recVideo",
      name: S.recVidFile.name || "recitation.mp4",
      size: S.recVidFile.size || 0,
      mime: S.recVidFile.type || "video/mp4",
    };
    if (S.recVidFile.size <= ASSET_EMBED_MAX) {
      a.mode = "embedded";
      a.dataURL = await fileToDataURL(S.recVidFile);
    } else {
      a.mode = "missing";
      a.reason = "حجم أكبر من 50MB";
    }
    assets.push(a);
  }
  const logoDataURL = localStorage.getItem("gt_sirm_logo_v1");
  if (logoDataURL) {
    assets.push({ key: "logo", name: "logo.png", mode: "embedded", dataURL: logoDataURL });
  }

  return {
    format: PROJECT_FORMAT,
    formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: PROJECT_APP_VERSION,
    platform: "web",
    savedAt: new Date().toISOString(),
    settings: { byId, byName },
    modules,
    freeText,
    detailsOpen,   // v1.2 — حالة الأَقسام القابِلة للطَيّ
    runtime: runtimeSnapshot,   // v1.2 — لَقطة S.verses وما يُصاحِبها
    assets,
  };
}

async function deserializeProject(proj) {
  if (!proj || proj.format !== PROJECT_FORMAT) throw new Error("ملفّ مشروع غير صالح");
  // v1.2 — حارس ضِدّ سِباق مَع loadVerses/applyFreeText
  S._restoring = true;

  const byId = proj.settings?.byId || {};
  const byName = proj.settings?.byName || {};
  for (const [id, value] of Object.entries(byId)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!value;
    else if (el.type === "radio") { }
    else el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  for (const [name, value] of Object.entries(byName)) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      if (el.type === "radio") {
        el.checked = (el.value === value);
        if (el.checked) el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  if (proj.modules) {
    try { localStorage.setItem("gt_sirm_modules_v1", JSON.stringify(proj.modules)); } catch (_) {}
    if (typeof initModuleManager === "function") initModuleManager();
  }

  if (proj.freeText) {
    const ta = document.getElementById("free-text-area");
    if (ta && proj.freeText.text) ta.value = proj.freeText.text;
    S.freePerSlice = proj.freeText.perSlice ? JSON.parse(JSON.stringify(proj.freeText.perSlice)) : [];
    if (proj.freeText.audioTrim) S.freeAudioTrim = proj.freeText.audioTrim;
    if (typeof renderPerSliceList === "function") renderPerSliceList();
  }

  const missing = [];
  for (const a of (proj.assets || [])) {
    if (a.mode === "embedded" && a.dataURL) {
      await restoreAssetFromDataURL(a);
    } else {
      missing.push(a);
    }
  }
  if (missing.length) showMissingAssetsModal(missing);

  // v1.2 — استعادة حالة الأَقسام القابِلة للطَيّ (details) بحَسب التَرتيب
  if (Array.isArray(proj.detailsOpen)) {
    const allDetails = document.querySelectorAll("details");
    proj.detailsOpen.forEach((wasOpen, i) => {
      if (allDetails[i]) allDetails[i].open = !!wasOpen;
    });
  }

  // v1.2 fix — تَطبيق النَصّ الحرّ فَقط إن كان توگل free-text-on مُفَعَّلاً وقت الحَفظ.
  //   قَبل هذا الإصلاح كان يُطبَّق طالما وُجِد نَصّ في textarea ولَو كان التوگل مُغلَقاً،
  //   مِمّا يَستَبدِل آيات القرآن بالنَصّ الحرّ رُغماً عن المُستَخدِم.
  const savedText = proj.freeText?.text?.trim();
  const freeTextOnAtSave = !!(proj.settings?.byId?.["free-text-on"]);
  if (savedText && freeTextOnAtSave && typeof applyFreeText === "function") {
    setTimeout(() => {
      try {
        applyFreeText();
        if (proj.freeText.perSlice) {
          S.freePerSlice = JSON.parse(JSON.stringify(proj.freeText.perSlice));
          if (typeof syncPerSliceToPlayback === "function") syncPerSliceToPlayback();
          if (typeof renderPerSliceList === "function") renderPerSliceList();
        }
      } catch (_) {}
    }, 400);
  }

  // v1.2 — استعادة لَقطة المُحتوى (S.verses وما يُصاحِبها) بَعد إعادة تَحميل الوَحدات
  const hasRuntimeVerses = !!(proj.runtime && Array.isArray(proj.runtime.verses) && proj.runtime.verses.length);
  setTimeout(() => {
    try {
      if (hasRuntimeVerses) {
        S.verses          = JSON.parse(JSON.stringify(proj.runtime.verses));
        S.translations    = Array.isArray(proj.runtime.translations) ? JSON.parse(JSON.stringify(proj.runtime.translations)) : [];
        S.currentAya      = Math.min(proj.runtime.currentAya || 0, S.verses.length - 1);
        S.ayaDurations    = Array.isArray(proj.runtime.ayaDurations) ? [...proj.runtime.ayaDurations] : [];
        S.mixedAnimsOrder = Array.isArray(proj.runtime.mixedAnimsOrder) ? [...proj.runtime.mixedAnimsOrder] : (S.mixedAnimsOrder || []);
        S.useFreeAsSource = !!proj.runtime.useFreeAsSource;
        if (proj.runtime.bgVidActiveIdx != null && S.bgVidItems[proj.runtime.bgVidActiveIdx]) {
          if (typeof activateBgVidByIndex === "function") activateBgVidByIndex(proj.runtime.bgVidActiveIdx, true);
        }
        if (typeof updateAyaUI === "function") updateAyaUI();
      }
    } catch (e) { console.warn("runtime snapshot restore failed:", e); }
    S._restoring = false;
    if (!hasRuntimeVerses && typeof loadVerses === "function") {
      loadVerses().catch(_ => {});
    }
  }, 500);

  clearProjectDirty();
  return { restored: (proj.assets || []).length - missing.length, missing: missing.length };
}

async function restoreAssetFromDataURL(asset) {
  const blob = dataURLToBlob(asset.dataURL);
  const file = new File([blob], asset.name, { type: asset.mime || blob.type });
  const fakeInput = { files: [file], value: "" };

  if (asset.key === "logo") {
    try { localStorage.setItem("gt_sirm_logo_v1", asset.dataURL); } catch (_) {}
    if (typeof restoreLogo === "function") restoreLogo();
  } else if (asset.key === "bgImage") {
    if (typeof onBgMedia === "function") onBgMedia(fakeInput, "image");
  } else if (asset.key === "bgAudio") {
    if (typeof onBgAudio === "function") onBgAudio(fakeInput);
  } else if (asset.key === "recVideo") {
    if (typeof onRecVidFile === "function") onRecVidFile(fakeInput);
  } else if (asset.key && asset.key.startsWith("bgVideo[")) {
    if (typeof addBgVidItem === "function") {
      // v1.2 fix — await التَتابُعيّ يَحفَظ التَرتيب. الإعدادات تُطَبَّق على
      //   الـitem المُعاد بالضَبط (لا افتراض 'آخر مُضاف').
      const item = await addBgVidItem(file, { silent: true });
      if (item) {
        if (asset.audioEnabled !== undefined) item.audioEnabled = !!asset.audioEnabled;
        if (asset.audioGain !== undefined) item.audioGain = asset.audioGain;
        if (asset.hidden !== undefined) item.hidden = !!asset.hidden;
        if (asset.trimStart !== undefined) item.trimStart = asset.trimStart;
        if (asset.trimEnd !== undefined) item.trimEnd = asset.trimEnd;
        if (asset.transition !== undefined) item.transition = asset.transition;
        // v1.2 fix — طَبِّق إعدادات الصَوت + فَكّ ترميز buffer (كان يَبقى مَكتوماً)
        if (typeof applyBgVidItemAudio === "function") applyBgVidItemAudio(item);
        if (item.audioEnabled && !item.audioBuffer && item.file) {
          try {
            const ctx = await resumeAudioCtx();
            const ab = await item.file.arrayBuffer();
            item.audioBuffer = await ctx.decodeAudioData(ab.slice(0));
          } catch (e) { console.warn("decode bg-vid audio failed (restore):", e); }
        }
        if (typeof renderBgVidList === "function") renderBgVidList();
      }
    }
  }
}

function showMissingAssetsModal(missing) {
  const modal = document.getElementById("missing-assets-modal");
  const list = document.getElementById("missing-assets-list");
  if (!modal || !list) return;
  const replacements = new Map();
  list.innerHTML = missing.map((a, i) => {
    const acceptByKey = a.key === "bgImage" ? "image/*"
                      : a.key === "bgAudio" ? "audio/*"
                      : (a.key || "").startsWith("bgVideo") ? "video/*"
                      : a.key === "logo" ? "image/*" : "*/*";
    return `
      <div style="padding:8px;background:var(--bg1);border-radius:var(--r);border:1px solid var(--b1)">
        <div style="font-size:11px;color:var(--t1);margin-bottom:4px"><b style="color:var(--al)">${a.key}</b> — ${a.name || ""}</div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:6px">السبب: ${a.reason || "غير متوفّر"}</div>
        <input type="file" data-missing-idx="${i}" accept="${acceptByKey}" style="font-size:10px;width:100%">
      </div>
    `;
  }).join("");
  list.querySelectorAll("input[data-missing-idx]").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(inp.dataset.missingIdx);
      const f = e.target.files?.[0];
      if (f) replacements.set(idx, f);
    });
  });
  modal.style.display = "flex";

  const close = () => { modal.style.display = "none"; };
  document.getElementById("missing-assets-skip").onclick = () => {
    toast(`⏭️ تمّ تخطّي ${missing.length} مصدر`, "info", 1800);
    close();
  };
  document.getElementById("missing-assets-apply").onclick = async () => {
    let n = 0;
    for (const [idx, file] of replacements.entries()) {
      const orig = missing[idx];
      const fakeAsset = { ...orig, dataURL: await fileToDataURL(file), mode: "embedded", name: file.name, mime: file.type };
      await restoreAssetFromDataURL(fakeAsset);
      n++;
    }
    toast(`✅ تمّ استبدال ${n} مصدر`, "success", 2000);
    close();
  };
}

async function saveProjectToPath(_filePath) {
  const proj = await serializeProject();
  const json = JSON.stringify(proj, null, 2);
  // v1.1.0 — إن كان لَدَينا FSA handle، اِكتُب مُباشرةً بلا حِوار (حَفظ صامِت)
  if (typeof HAS_FSA !== "undefined" && HAS_FSA && S.projectFileHandle) {
    try {
      const perm = await S.projectFileHandle.queryPermission?.({ mode: "readwrite" });
      if (perm !== "granted") {
        const req = await S.projectFileHandle.requestPermission?.({ mode: "readwrite" });
        if (req !== "granted") throw new Error("permission denied");
      }
      const writable = await S.projectFileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      S.projectFileName = S.projectFileHandle.name || S.projectFileName;
      clearProjectDirty();
      return true;
    } catch (e) {
      console.warn("FSA write failed, falling back to download:", e);
      S.projectFileHandle = null; // handle expired أو مَرفوض — أَعِد للـfallback
    }
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fname = (S.projectFileName || `gt-sirm-project-${Date.now()}.gtsirm`).replace(/\.json$/, ".gtsirm");
  a.href = url; a.download = fname;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  S.projectFileName = fname;
  clearProjectDirty();
  return true;
}

// v1.1.0 — كَشف File System Access API (يُتيح الحَفظ الصامِت المُباشِر في نَفس المَلفّ)
const HAS_FSA = typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";

async function saveProjectInteractive(forcePrompt = false) {
  // v1.1.0 — إن كان لَدَينا FSA handle مَعروف، احفَظ فيه مُباشرةً بلا حِوار
  if (!forcePrompt && HAS_FSA && S.projectFileHandle) {
    const ok = await saveProjectToPath(null);
    if (ok) {
      toast(`💾 حُفظ: ${S.projectFileName}`, "success", 1500);
      _ensureAutoSaveOn();
    }
    return;
  }

  // FSA save-as (يَحفَظ handle لِلاستخدام لاحِقاً)
  if (HAS_FSA) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: S.projectFileName || "GT-SIRM-Project.gtsirm",
        types: [{ description: "GT-SIRM Project", accept: { "application/json": [".gtsirm"] } }]
      });
      S.projectFileHandle = handle;
      S.projectFileName = handle.name;
      const ok = await saveProjectToPath(null);
      if (ok) {
        toast(`💾 تمّ الحَفظ: ${handle.name}`, "success", 2200);
        _ensureAutoSaveOn();
      }
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
      console.warn("FSA save failed:", e);
    }
  }

  // Fallback: تَنزيل blob (السُلوك القَديم — لا يُتيح حَفظاً تلقائيّاً صامتاً)
  const ok = await saveProjectToPath(null);
  if (ok) toast("💾 تمّ تنزيل ملفّ المشروع", "success", 2200);
}

// v1.1.0 — يُفعِّل الحَفظ التلقائيّ بَعد أوّل حَفظ ناجِح
function _ensureAutoSaveOn() {
  S._autoSavePromptDismissed = false;
  const cb = document.getElementById("autosave-on");
  if (cb && !cb.checked) {
    cb.checked = true;
    cb.dispatchEvent(new Event("change"));
  } else if (cb && cb.checked) {
    startAutoSave();
  }
}

async function openProjectInteractive() {
  if (S.projectDirty) {
    if (!confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  }
  // v1.1.0 — استخدم FSA لِلحُصول عَلى handle قابِل لِلكتابة (لاحِقاً)
  if (HAS_FSA) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "GT-SIRM Project", accept: { "application/json": [".gtsirm"] } }],
        multiple: false
      });
      const file = await handle.getFile();
      await openProjectFromBlob(file, handle);
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
      console.warn("FSA open failed, fallback to input:", e);
    }
  }
  document.getElementById("proj-open-input")?.click();
}

async function openProjectFromBlob(file, handle = null) {
  if (S.projectDirty) {
    if (!confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  }
  const text = await file.text();
  try {
    const proj = JSON.parse(text);
    const result = await deserializeProject(proj);
    S.projectFileName = file.name;
    // v1.1.0 — احفَظ الـFSA handle إن تَوفَّر (لِلحَفظ التلقائيّ الصامِت)
    if (handle) S.projectFileHandle = handle;
    updateProjectTitle();
    if (handle && typeof _ensureAutoSaveOn === "function") _ensureAutoSaveOn();
    const suffix = handle ? " — الحَفظ التلقائيّ فَعّال" : "";
    toast(`📂 ${file.name} (${result.restored} مصدر${result.missing ? ` · ⚠️ ${result.missing} مفقود` : ""})${suffix}`, result.missing ? "warn" : "success", 2800);
  } catch (e) {
    toast(`❌ ملفّ غير صالح: ${e.message}`, "error", 3000);
  }
}

function startAutoSave() {
  stopAutoSave();
  const enabled = ge("autosave-on");
  const intervalMin = parseInt(document.getElementById("autosave-interval")?.value || 5);
  const status = document.getElementById("autosave-status");
  if (!enabled) {
    if (status) status.textContent = "⏸️ غير مُفعَّل";
    try { localStorage.setItem("gt_sirm_autosave_on", "0"); } catch (_) {}
    return;
  }
  try {
    localStorage.setItem("gt_sirm_autosave_on", "1");
    localStorage.setItem("gt_sirm_autosave_interval", String(intervalMin));
  } catch (_) {}
  const intervalMs = intervalMin * 60 * 1000;
  if (status) status.textContent = `🟢 مُفعَّل — كلّ ${intervalMin} دقيقة (المتصفّح)`;
  _autoSaveTimer = setInterval(async () => {
    if (!S.projectDirty) return;
    // v1.1.0 — إن كان FSA handle مَعروفاً، احفَظ صامِتاً إلى نَفس المَلفّ
    if (typeof HAS_FSA !== "undefined" && HAS_FSA && S.projectFileHandle) {
      try {
        const ok = await saveProjectToPath(null);
        if (ok) { toast(`💾 حفظ تلقائيّ — ${new Date().toLocaleTimeString("ar")}`, "info", 1500); return; }
      } catch (_) {}
    }
    // v1.1.0 — لا handle بَعد. توگَل نَبِّه المُستخدم مَرّة واحدة (المُتَصفّح لا يَسمَح بِطلَب FSA مِن setInterval)
    if (typeof HAS_FSA !== "undefined" && HAS_FSA && !S._autoSavePromptDismissed) {
      S._autoSavePromptDismissed = true;
      toast("💡 اضغط زرّ 💾 لِحَفظ المَشروع أَوّل مَرّة — بَعدها يَعمَل الحَفظ التلقائيّ صامِتاً", "warn", 4000);
    }
    // Fallback / إضافيّ: نَسخة احتياطيّة في localStorage
    try {
      const proj = await serializeProject();
      const json = JSON.stringify(proj);
      if (json.length < 4_500_000) {
        localStorage.setItem("gt_sirm_autosave_blob", json);
        toast(`💾 نَسخة احتياطيّة في المتصفّح — ${new Date().toLocaleTimeString("ar")}`, "info", 1800);
      } else {
        toast("⚠️ المشروع كبير جداً للحفظ في المتصفّح — صدّر يدوياً", "warn", 2200);
      }
    } catch (_) {}
  }, intervalMs);
}
function stopAutoSave() {
  if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
}

// v0.5.8 — modal تأكيد الإغلاق (الويب يستخدم beforeunload للحماية الأساسية،
// و modal للأزرار اليدويّة من داخل التطبيق)
function showCloseConfirmModal(onQuit) {
  const modal = document.getElementById("close-confirm-modal");
  if (!modal) {
    if (confirm("لديك تغييرات غير محفوظة. حفظ قبل الإغلاق؟")) {
      saveProjectInteractive().then(() => { if (onQuit) onQuit(); });
    } else {
      if (onQuit) onQuit();
    }
    return;
  }
  modal.style.display = "flex";
  const close = () => { modal.style.display = "none"; };
  document.getElementById("close-confirm-cancel").onclick = close;
  document.getElementById("close-confirm-quit").onclick = () => { close(); if (onQuit) onQuit(); };
  document.getElementById("close-confirm-save").onclick = async () => {
    close();
    await saveProjectInteractive();
    if (!S.projectDirty && onQuit) onQuit();
  };
}

function initProjectSystem() {
  document.getElementById("proj-save-btn")?.addEventListener("click", saveProjectInteractive);
  document.getElementById("proj-open-btn")?.addEventListener("click", openProjectInteractive);
  document.getElementById("proj-open-input")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0]; if (f) openProjectFromBlob(f);
    e.target.value = "";
  });

  const autosaveOn = document.getElementById("autosave-on");
  if (autosaveOn) {
    // v0.11.3 — مُفعَّل افتراضياً
    try {
      const stored = localStorage.getItem("gt_sirm_autosave_on");
      autosaveOn.checked = (stored === null) ? true : (stored === "1");
    } catch (_) { autosaveOn.checked = true; }
    autosaveOn.addEventListener("change", () => {
      const ctrl = document.getElementById("autosave-ctrl");
      if (ctrl) ctrl.style.display = autosaveOn.checked ? "block" : "none";
      startAutoSave();
    });
    autosaveOn.dispatchEvent(new Event("change"));
  }
  document.getElementById("autosave-interval")?.addEventListener("change", () => {
    if (ge("autosave-on")) startAutoSave();
  });
  try {
    const savedIv = localStorage.getItem("gt_sirm_autosave_interval");
    if (savedIv && document.getElementById("autosave-interval")) {
      document.getElementById("autosave-interval").value = savedIv;
    }
  } catch (_) {}

  // v0.14 — مَعالَجة beforeunload المُحسَّنة:
  // - في الـPWA (display:standalone)، beforeunload لا يَعمل دائماً → نَستعمل modal مَركَزيّ
  // - في المُتصفّح العادي، نَستعمل beforeunload + modal كَاحتياط
  // - مُهمّ: e.preventDefault() قَبل e.returnValue، وعَدم return string (يَكسر Chrome 119+)
  const _isPWAStandalone = window.matchMedia && (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
  window.addEventListener("beforeunload", (e) => {
    if (!S.projectDirty) return; // لا تَنبيه إن لا تَوجد تَغييرات
    e.preventDefault();
    e.returnValue = ""; // Chrome 119+ يَتطلّب سَلسلة فارغة
    return ""; // backward compat للمُتصفّحات القَديمة
  });
  // v0.14 — في الـPWA + الهاتف، beforeunload قد لا يَعمل. اعرض modal مَركَزيّ.
  if (_isPWAStandalone || S.isNativeAndroid) {
    // ضَع flag في الـsession كي لا نُكَرّر الـdialog
    let _refreshGuardArmed = false;
    document.addEventListener("keydown", (e) => {
      if ((e.key === "F5" || (e.ctrlKey && e.key.toLowerCase() === "r")) && S.projectDirty) {
        e.preventDefault();
        if (!_refreshGuardArmed) {
          _refreshGuardArmed = true;
          if (confirm("⚠️ لديك تَغييرات غَير محفوظة. هل تُريد فِعلاً تَحديث الصَفحة؟ سَتَخسر كلّ ما لم تَحفظه.")) {
            S.projectDirty = false;
            location.reload();
          } else {
            setTimeout(() => { _refreshGuardArmed = false; }, 1000);
          }
        }
      }
    });
  }

  const trackInputs = () => {
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el._dirtyTracked) return;
      if (el.type === "button" || el.type === "submit" || el.type === "file") return;
      el._dirtyTracked = true;
      const handler = () => markProjectDirty();
      el.addEventListener("change", handler);
      if (el.type !== "checkbox" && el.type !== "radio") el.addEventListener("input", handler);
    });
  };
  trackInputs();
  setTimeout(trackInputs, 2000);

  updateProjectTitle();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(initProjectSystem, 100));
} else {
  setTimeout(initProjectSystem, 100);
}
