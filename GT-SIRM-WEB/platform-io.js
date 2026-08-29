"use strict";
// ═══════════════════════════════════════════════════════════════
//  GT-SIRM — طَبَقةُ المِلَفّاتِ واليَقَظة (v1.2.1)   platform-io.js
//  ───────────────────────────────────────────────────────────────
//  تَحُلُّ ثَلاثَ عِلَلٍ أَبلَغَ عَنها المُستَخدِمُ في نُسخَتَي الهاتِفِ والويب:
//
//  1) «بَعدَ انتِهاءِ التَصديرِ لا أَجِدُ لِلمَلَفِّ أَثَراً»
//     السَبَب: التَصديرُ كانَ يُسَلِّمُ الناتِجَ بِـ`<a download>` وَحدَه. داخِلَ
//     WebView (نُسخةُ الهاتِف) لا مُدير تَنزيلاتٍ يَلتَقِطُهُ فَيَضيعُ صامِتاً،
//     وفي الويبِ المُثَبَّتِ (standalone PWA) يَفشَلُ كَذلِكَ أَحياناً.
//     الحَلّ: سِلسِلةُ تَسليمٍ مُتَدَرِّجة — MediaStore الأَصليّ ← Capacitor
//     Filesystem ← File System Access ← `<a download>` — مَعَ الاحتِفاظِ
//     بِالناتِجِ في الذاكِرةِ وزِرِّ حَفظٍ يَدَويٍّ فلا يَضيعُ عَمَلُ ساعة.
//
//  2) «إن أَغلَقتُ الشاشةَ أو فَتَحتُ بَرنامَجاً آخَرَ يَقِفُ التَصدير»
//     السَبَب: النِظامُ يُجَمِّدُ الـWebView ويَخنُقُ المُؤَقِّتاتِ في الخَلفيّة.
//     الحَلّ: قُفلُ يَقَظةِ الشاشة (الويب) + خِدمةُ مُقَدِّمةٍ ذاتُ إشعارٍ
//     و PARTIAL_WAKE_LOCK (Android) + إبقاءُ الشاشةِ مُضاءة.
//
//  3) «الحَفظُ لا يَعمَلُ في نُسخةِ الهاتِف»
//     نَفسُ سَبَبِ (1): حِفظُ المَشروعِ .gtsirm كانَ يَمُرُّ بِـ`<a download>`.
//
//  يَعمَلُ المَلَفُّ تَحتَ file:// و http:// و WebView — سُكونٌ تامٌّ إن غابَت
//  كُلُّ القُدُراتِ الأَصليّة (يَسقُطُ إلى سُلوكِ المُتَصَفِّحِ المُعتاد).
// ═══════════════════════════════════════════════════════════════

(function () {

  // ── كَشفُ المِنَصّة ──────────────────────────────────────────
  function isNativeAndroid() {
    try {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    } catch (_) { return false; }
  }
  function nativePlugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GtsirmNative) || null; }
    catch (_) { return null; }
  }
  function capFilesystem() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) || null; }
    catch (_) { return null; }
  }
  function capShare() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) || null; }
    catch (_) { return null; }
  }
  const HAS_FSA_SAVE = (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function");

  // ── base64 بِلا إنهاكِ المَكدَس ────────────────────────────
  //   `String.fromCharCode(...u8)` يَنهارُ فَوقَ ~125 أَلفَ بايت،
  //   فَنُقَطِّعُ عَلى 32 كيلو.
  function bytesToBase64(u8) {
    let s = "";
    const STEP = 0x8000;
    for (let i = 0; i < u8.length; i += STEP) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + STEP));
    }
    return btoa(s);
  }

  // حَجمُ القِطعة: يَجِبُ أن يَقبَلَ القِسمةَ عَلى 3 حَتّى لا تَظهَرَ حَشوةُ
  // base64 (=) في وَسَطِ المَجرى فَيَفسُدَ المَلَفّ عِندَ الإلحاق.
  const CHUNK = 768 * 1024;   // 786432 بايت — يَقبَلُ القِسمةَ عَلى 3

  async function* blobChunks(blob, size) {
    for (let off = 0; off < blob.size; off += size) {
      const buf = await blob.slice(off, Math.min(off + size, blob.size)).arrayBuffer();
      yield new Uint8Array(buf);
    }
  }

  // ── 1) الحَفظُ عَبرَ الجِسرِ الأَصليّ (MediaStore) ─────────────
  async function saveViaNative(blob, filename, mime, kind, onProgress) {
    const P = nativePlugin();
    if (!P) return null;
    let token = null;
    try {
      const begun = await P.beginWrite({ name: filename, mime, kind });
      token = begun.token;
      let done = 0;
      for await (const chunk of blobChunks(blob, CHUNK)) {
        await P.appendChunk({ token, data: bytesToBase64(chunk) });
        done += chunk.length;
        if (onProgress) onProgress(done / blob.size);
      }
      const res = await P.endWrite({ token });
      return { method: "native", path: res.displayPath, uri: res.uri, bytes: res.bytes };
    } catch (e) {
      if (token) { try { await P.cancelWrite({ token }); } catch (_) {} }
      console.warn("[PIO] الحَفظُ الأَصليُّ فَشِل:", e);
      return null;
    }
  }

  // ── 2) الحَفظُ عَبرَ Capacitor Filesystem (احتِياطٌ لِـAndroid) ──
  //   يَكتُبُ في مُجَلَّدِ البَرنامَجِ الخارِجيّ — مَضمونُ الكِتابةِ بِلا أُذونات.
  async function saveViaCapacitorFS(blob, filename, onProgress) {
    const FS = capFilesystem();
    if (!FS) return null;
    const path = `GT-SIRM/${filename}`;
    const directory = "EXTERNAL";      // Directory.External
    try {
      let first = true, done = 0;
      for await (const chunk of blobChunks(blob, CHUNK)) {
        const data = bytesToBase64(chunk);
        if (first) {
          await FS.writeFile({ path, data, directory, recursive: true });
          first = false;
        } else {
          await FS.appendFile({ path, data, directory });
        }
        done += chunk.length;
        if (onProgress) onProgress(done / blob.size);
      }
      let uri = null;
      try { uri = (await FS.getUri({ path, directory })).uri; } catch (_) {}
      return { method: "capacitor-fs", path, uri, bytes: blob.size };
    } catch (e) {
      console.warn("[PIO] كِتابةُ Capacitor Filesystem فَشِلَت:", e);
      return null;
    }
  }

  // ── 3) الحَفظُ عَبرَ File System Access (مُتَصَفِّحُ سَطحِ المَكتَب) ──
  //   ⚠️ showSaveFilePicker يَتَطَلَّبُ إيماءةَ مُستَخدِمٍ حَديثة، ولا تَبقى
  //   بَعدَ تَصديرٍ يَستَغرِقُ دَقائِق — لِذا نَطلُبُ الوِجهةَ قَبلَ البَدء
  //   عَبرَ prepareSaveTarget ثُمَّ نَكتُبُ إلَيها هُنا.
  async function saveViaHandle(handle, blob) {
    try {
      const perm = await handle.queryPermission?.({ mode: "readwrite" });
      if (perm && perm !== "granted") {
        const req = await handle.requestPermission?.({ mode: "readwrite" });
        if (req !== "granted") throw new Error("الإذنُ مَرفوض");
      }
      const w = await handle.createWritable();
      await w.write(blob);
      await w.close();
      return { method: "fsa", path: handle.name, bytes: blob.size };
    } catch (e) {
      console.warn("[PIO] الكِتابةُ عَبرَ FSA فَشِلَت:", e);
      return null;
    }
  }

  // ── 4) آخِرُ المَطاف: تَنزيلُ المُتَصَفِّح ──────────────────────
  function saveViaDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(url); a.remove(); } catch (_) {} }, 60000);
      return { method: "download", path: filename, bytes: blob.size };
    } catch (e) {
      console.warn("[PIO] تَنزيلُ المُتَصَفِّحِ فَشِل:", e);
      return null;
    }
  }

  /**
   * كِتابةُ مَلَفٍّ نَصّيٍّ في مُجَلَّدِ البَرنامَجِ الخارِجيّ، بِاستِبدالٍ لا إضافة.
   * تُستَعمَلُ لِلحَفظِ التِلقائيّ في الهاتِف: المِلَفُّ حَقيقيٌّ عَلى القُرصِ
   * (يَنجو مِن مَسحِ بَياناتِ المُتَصَفِّح) وباسمٍ ثابِتٍ فَلا تَتَراكَمُ النُسَخ
   * كَما يَحدُثُ لَو مَرَّت كُلُّ مَرّةٍ بِـMediaStore.
   */
  async function writeAppTextFile(relPath, text) {
    const FS = capFilesystem();
    if (!FS) return null;
    try {
      await FS.writeFile({
        path: relPath, data: text, directory: "EXTERNAL",
        encoding: "utf8", recursive: true,
      });
      let uri = null;
      try { uri = (await FS.getUri({ path: relPath, directory: "EXTERNAL" })).uri; } catch (_) {}
      return { path: relPath, uri };
    } catch (e) {
      console.warn("[PIO] كِتابةُ المَلَفِّ النَصّيِّ فَشِلَت:", e);
      return null;
    }
  }

  /**
   * يَطلُبُ وِجهةَ الحَفظِ مُسبَقاً (تَحتَ إيماءةِ المُستَخدِم) قَبلَ عَمَليّةٍ طَويلة.
   * يُعيدُ واصِفَ وِجهةٍ يُمَرَّرُ لاحِقاً إلى deliverFile، أو null إن تَعَذَّر.
   */
  async function prepareSaveTarget(filename, mime, accept) {
    // في الهاتِفِ لا حاجةَ لِلحَجز — الكِتابةُ الأَصليّةُ لا تَحتاجُ إيماءة
    if (isNativeAndroid()) return null;
    if (!HAS_FSA_SAVE) return null;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: accept ? [accept] : undefined,
      });
      return { kind: "fsa", handle };
    } catch (e) {
      if (e && e.name === "AbortError") return { kind: "aborted" };
      return null;
    }
  }

  /**
   * يُسَلِّمُ مَلَفّاً إلى تَخزينِ المُستَخدِم عَبرَ أَفضَلِ وَسيلةٍ مُتاحة.
   *   blob/filename/mime — المَلَفّ
   *   opts.kind      — "video" لِلمَعرِض (Movies/GT-SIRM)، وإلّا Download/GT-SIRM
   *   opts.target    — واصِفُ وِجهةٍ مِن prepareSaveTarget (اختِياريّ)
   *   opts.onProgress— دالّةُ تَقَدُّمٍ (0..1) لِلنَقلِ إلى الأَصليّ
   * يُعيد: { method, path, uri?, bytes } أو null إن فَشِلَت كُلُّ الوَسائل.
   */
  async function deliverFile(blob, filename, mime, opts) {
    opts = opts || {};
    const kind = opts.kind || "file";

    if (opts.target && opts.target.kind === "fsa" && opts.target.handle) {
      const r = await saveViaHandle(opts.target.handle, blob);
      if (r) return r;
    }

    if (isNativeAndroid()) {
      const r1 = await saveViaNative(blob, filename, mime, kind, opts.onProgress);
      if (r1) return r1;
      const r2 = await saveViaCapacitorFS(blob, filename, opts.onProgress);
      if (r2) return r2;
    }

    return saveViaDownload(blob, filename);
  }

  /**
   * يُشارِكُ الناتِجَ مِنَ الذاكِرةِ مُباشَرةً عَبرَ Web Share Level 2.
   * أَهَمِّيّتُها لِنُسخةِ الويبِ عَلى الهاتِف: هُناكَ لا جِسرَ أَصليَّ، و`<a download>`
   * قَد يَفشَلُ صامِتاً في وَضعِ PWA المُستَقِلّ — بَينَما ورَقةُ المُشارَكةِ تُتيحُ
   * لِلمُستَخدِمِ حِفظَ المَلَفِّ في «المِلَفّات» أو المَعرِضِ أو إرسالَه.
   */
  async function shareBlob(blob, filename, mime) {
    try {
      if (typeof File !== "function" || !navigator.share || !navigator.canShare) return false;
      const file = new File([blob], filename, { type: mime });
      if (!navigator.canShare({ files: [file] })) return false;
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return true;   // أَلغى المُستَخدِمُ — لَيسَ فَشَلاً
      console.warn("[PIO] مُشارَكةُ المَلَفِّ فَشِلَت:", e);
      return false;
    }
  }

  /** هَل يَقدِرُ هذا الجِهازُ عَلى مُشارَكةِ مَلَفٍّ (لِإظهارِ الزِرِّ مِن عَدَمِه)؟ */
  function canShareFiles() {
    try {
      if (capShare()) return true;                      // جِسرُ Capacitor
      if (typeof File !== "function" || !navigator.canShare) return false;
      return navigator.canShare({ files: [new File([new Uint8Array(1)], "x.mp4", { type: "video/mp4" })] });
    } catch (_) { return false; }
  }

  /**
   * يَفتَحُ ورَقةَ المُشارَكةِ الأَصليّةَ لِمَلَفٍّ حُفِظَ تَوّاً (Android).
   *
   * ⚠️ v1.2.2 — لِمَ لا نَبدَأُ بِـ@capacitor/share؟
   * لأنَّ SharePlugin.java يَرفُضُ صَراحةً كُلَّ عُنوانٍ لا يَبدَأُ بِـ`file:` أو
   * `http:` («Unsupported url»)، وعَناوينُ MediaStore التي نَحفَظُ بِها تَبدَأُ
   * بِـ`content:` — فَكانَ زِرُّ المُشارَكةِ يَفشَلُ ولا تَظهَرُ قائِمةُ التَطبيقات.
   * لِذا نُقَدِّمُ جِسرَنا الأَصليَّ (GtsirmNative.shareFile) الذي يَبني
   * ACTION_SEND بِنَفسِهِ ويَمنَحُ إذنَ القِراءة، ونُبقي Capacitor احتِياطاً
   * لِعَناوينِ file: وَحدَها.
   */
  async function shareSavedFile(uri, title, mime) {
    if (!uri) return false;
    const P = nativePlugin();
    if (P && P.shareFile) {
      try {
        await P.shareFile({ uri, mime: mime || "*/*", title: title || "GT-SIRM" });
        return true;
      } catch (e) {
        console.warn("[PIO] المُشارَكةُ الأَصليّةُ فَشِلَت:", e);
      }
    }
    const Sh = capShare();
    if (Sh && /^file:/i.test(uri)) {
      try { await Sh.share({ title: title || "GT-SIRM", url: uri }); return true; }
      catch (e) { console.warn("[PIO] مُشارَكةُ Capacitor فَشِلَت:", e); }
    }
    return false;
  }

  /**
   * «حِفظٌ باسم» عَبرَ مُنتَقي النِظام: يَختارُ المُستَخدِمُ المُجَلَّدَ والاسمَ
   * (ذاكِرةٌ خارِجيّة، Drive، أَيُّ مُزَوِّد). يُعيدُ { canceled } أو { uri }.
   */
  async function saveAsDialog(uri, name, mime) {
    const P = nativePlugin();
    if (P && P.saveAs && uri) {
      try { return await P.saveAs({ uri, name, mime: mime || "application/octet-stream" }); }
      catch (e) { console.warn("[PIO] «حِفظٌ باسم» فَشِل:", e); }
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════
  //  اليَقَظة — إبقاءُ التَصديرِ يَعمَلُ والشاشةِ مُضاءة
  // ══════════════════════════════════════════════════════════

  let _screenLock = null;
  let _visHandler = null;
  let _awakeDepth = 0;

  async function _requestScreenLock() {
    try {
      if (!navigator.wakeLock || document.visibilityState !== "visible") return;
      _screenLock = await navigator.wakeLock.request("screen");
      _screenLock.addEventListener("release", () => { _screenLock = null; });
    } catch (e) {
      // مَرفوضٌ أو غَيرُ مَدعوم — لا يُعَطِّلُ التَصدير
      console.warn("[PIO] قُفلُ يَقَظةِ الشاشةِ غَيرُ مُتاح:", e && e.message);
    }
  }

  /**
   * يَبدَأُ وَضعَ «لا تَنَم». يَجمَعُ ثَلاثَ طَبَقات:
   *   • Screen Wake Lock (الويب و PWA) — الشاشةُ لا تَنطَفِئ
   *   • FLAG_KEEP_SCREEN_ON (Android) — نَفسُ الأَثَرِ داخِلَ WebView
   *   • خِدمةُ مُقَدِّمةٍ + PARTIAL_WAKE_LOCK — العَمَلُ يَستَمِرُّ حينَ
   *     يُغادِرُ المُستَخدِمُ البَرنامَجَ فِعلاً
   */
  async function keepAwakeStart(text) {
    _awakeDepth++;
    if (_awakeDepth > 1) return;

    await _requestScreenLock();
    // قُفلُ الشاشةِ يَسقُطُ تِلقائيّاً عِندَ إخفاءِ الصَفحة — أَعِدهُ عِندَ العَودة
    _visHandler = () => {
      if (document.visibilityState === "visible" && _awakeDepth > 0 && !_screenLock) {
        _requestScreenLock();
      }
    };
    document.addEventListener("visibilitychange", _visHandler);

    const P = nativePlugin();
    if (P) {
      try { await P.keepAwake({ on: true }); } catch (_) {}
      try { await P.startExportService({ text: text || "جارٍ تَصديرُ الفيديو…" }); } catch (_) {}
    }
  }

  /** يُحَدِّثُ إشعارَ الخِدمةِ بِنِسبةِ التَقَدُّم (Android فَقَط، وبِخُنوقٍ داخِليّ). */
  let _lastNotifTick = 0;
  function keepAwakeProgress(progress, text) {
    const P = nativePlugin();
    if (!P || _awakeDepth <= 0) return;
    const now = Date.now();
    if (now - _lastNotifTick < 1500) return;      // الإشعارُ لا يَحتاجُ أَكثَر
    _lastNotifTick = now;
    try { P.updateExportService({ progress: Math.round(progress), text: text || "" }); } catch (_) {}
  }

  async function keepAwakeStop() {
    _awakeDepth = Math.max(0, _awakeDepth - 1);
    if (_awakeDepth > 0) return;

    if (_visHandler) { document.removeEventListener("visibilitychange", _visHandler); _visHandler = null; }
    if (_screenLock) { try { await _screenLock.release(); } catch (_) {} _screenLock = null; }

    const P = nativePlugin();
    if (P) {
      try { await P.keepAwake({ on: false }); } catch (_) {}
      try { await P.stopExportService(); } catch (_) {}
    }
  }

  // ══════════════════════════════════════════════════════════
  //  مِهماز: تَنازُلٌ عَنِ المُعالِجِ بِلا setTimeout
  //  ───────────────────────────────────────────────────────
  //  المُتَصَفِّحاتُ تَخنُقُ setTimeout إلى نِداءٍ واحِدٍ كُلَّ ثانيةٍ حينَ تَكونُ
  //  الصَفحةُ مَخفيّة. حَلقةُ التَصديرِ كانَت تَستَعمِلُ setTimeout(5) لِضَبطِ
  //  ضَغطِ المُرَمِّز، فَتَهبِطُ في الخَلفيّةِ إلى ~إطارٍ في الثانية.
  //  MessageChannel لا يُخنَقُ فَيُبقي الحَلقةَ تَجري بِسُرعَتِها.
  // ══════════════════════════════════════════════════════════
  const _mc = (typeof MessageChannel === "function") ? new MessageChannel() : null;
  const _yieldQueue = [];
  if (_mc) {
    _mc.port1.onmessage = () => {
      const fn = _yieldQueue.shift();
      if (fn) fn();
    };
    _mc.port1.start && _mc.port1.start();
  }
  function yieldToBrowser() {
    if (!_mc) return new Promise(r => setTimeout(r, 0));
    return new Promise(resolve => {
      _yieldQueue.push(resolve);
      _mc.port2.postMessage(0);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  التَحديثُ الذاتيّ مِن مُستَودَعِ GitHub
  //  ───────────────────────────────────────────────────────
  //  نَقرَأُ آخِرَ إصدارٍ مِن واجِهةِ GitHub، ونُقارِنُهُ بِإصدارِ البَرنامَجِ الحاليّ.
  //  في الهاتِف: نُنَزِّلُ الحُزمةَ ونَفتَحُ شاشةَ تَثبيتِ النِظام (المُستَخدِمُ
  //  يُؤَكِّدُ بِنَفسِه — لا تَثبيتَ صامِتاً أَبَداً).
  //  في سَطحِ المَكتَبِ والويب: نَعرِضُ رابِطَ صَفحةِ الإصدار.
  // ══════════════════════════════════════════════════════════
  const GITHUB_REPO = "SalehGNUTUX/GT-SIRM";

  // يُقارِنُ "1.2.10" و"1.2.9" مُقارَنةً رَقَميّةً لا نَصّيّة
  function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, "").split(/[.\-+]/);
    const pb = String(b).replace(/^v/i, "").split(/[.\-+]/);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = parseInt(pa[i] || "0", 10) || 0;
      const nb = parseInt(pb[i] || "0", 10) || 0;
      if (na !== nb) return na > nb ? 1 : -1;
    }
    return 0;
  }

  /**
   * يَسأَلُ GitHub عَن آخِرِ إصدار.
   * يُعيد: { available, latest, current, notes, url, apkUrl, apkName, size }
   */
  async function checkForUpdate(currentVersion) {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { "Accept": "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rel = await r.json();
    const latest = String(rel.tag_name || "").replace(/^v/i, "");
    if (!latest) throw new Error("لا وَسمَ لِلإصدار");

    // اختَر حُزمةَ APK المُناسِبةَ مِن مُرفَقاتِ الإصدار.
    //   نُفَضِّلُ حُزمةَ release عَلى debug إن وُجِدَتا مَعاً.
    const apks = (rel.assets || []).filter(a => /\.apk$/i.test(a.name || ""));
    const apk = apks.find(a => !/debug/i.test(a.name)) || apks[0] || null;
    return {
      available: compareVersions(latest, currentVersion) > 0,
      latest,
      current: String(currentVersion),
      notes: rel.body || "",
      url: rel.html_url,
      publishedAt: rel.published_at,
      apkUrl: apk ? apk.browser_download_url : null,
      apkName: apk ? apk.name : null,
      apkSize: apk ? apk.size : 0,
    };
  }

  /** يُنَزِّلُ الحُزمةَ (بِتَقَدُّمٍ) ثُمَّ يَفتَحُ مُثَبِّتَ النِظام. */
  async function downloadAndInstall(apkUrl, apkName, onProgress) {
    const P = nativePlugin();
    if (!P || !P.downloadUpdate) throw new Error("التَثبيتُ المُباشَرُ غَيرُ مُتاحٍ في هذه النُسخة");
    let handle = null;
    if (onProgress && window.Capacitor && window.Capacitor.Plugins) {
      try {
        handle = await P.addListener("updateProgress", (ev) => {
          onProgress(ev.percent, ev.received, ev.total);
        });
      } catch (_) {}
    }
    try {
      const res = await P.downloadUpdate({ url: apkUrl, name: apkName });
      const inst = await P.installApk({ path: res.path });
      return { path: res.path, needsPermission: !!inst.needsPermission };
    } finally {
      if (handle && handle.remove) { try { await handle.remove(); } catch (_) {} }
    }
  }

  // ══════════════════════════════════════════════════════════
  //  v1.2.6 — تَنزيلُ رابِطٍ مُباشِرٍ إلى مَلَفٍّ داخِلَ البَرنامَج
  //  ───────────────────────────────────────────────────────
  //  في الهاتِف يَجري التَنزيلُ أَصليّاً: الـWebView عَلى أَصلِ https://localhost
  //  فَأَيُّ `fetch` إلى نِطاقٍ آخَرَ يَخضَعُ لِـCORS، وأَكثَرُ خَوادِمِ الوَسائِطِ
  //  لا تُرسِلُ الرَأسَ المَطلوب. الطَبَقةُ الأَصليّةُ لا تَعرِفُ CORS.
  //  ثُمَّ نَقرَأُ المَلَفَّ عَبرَ `Capacitor.convertFileSrc` — فَيَصيرُ عَلى نَفسِ
  //  الأَصلِ ويُقرَأُ بِـfetch عادِيّةٍ بِلا base64 ولا نَقلٍ عَبرَ الجِسر.
  //  في المُتَصَفِّحِ نَستَعمِلُ fetch مُباشَرةً (يَنجَحُ إن سَمَحَ الخادِمُ بِـCORS).
  // ══════════════════════════════════════════════════════════
  function guessNameFromUrl(url) {
    try {
      const u = new URL(url);
      const last = (u.pathname.split("/").pop() || "").trim();
      return last || "download";
    } catch (_) { return "download"; }
  }

  async function downloadDirect(url, onProgress) {
    if (!/^https?:\/\//i.test(url)) throw new Error("رابِطٌ غَيرُ صالِح — يَجِبُ أن يَبدَأَ بِـhttp أو https");

    const P = nativePlugin();
    if (P && P.downloadFile) {
      let handle = null;
      try {
        if (onProgress) {
          try {
            handle = await P.addListener("downloadProgress",
              (ev) => onProgress(ev.percent, ev.received, ev.total));
          } catch (_) {}
        }
        const res = await P.downloadFile({ url });
        // اقرَأِ المَلَفَّ عَبرَ أَصلِ التَطبيقِ نَفسِه
        const src = (window.Capacitor && window.Capacitor.convertFileSrc)
          ? window.Capacitor.convertFileSrc(res.path) : res.path;
        const r = await fetch(src);
        if (!r.ok) throw new Error("تَعَذَّرَت قِراءةُ المَلَفِّ المُنَزَّل (HTTP " + r.status + ")");
        const blob = await r.blob();
        return new File([blob], res.name || guessNameFromUrl(url),
                        { type: res.mime || blob.type || "application/octet-stream" });
      } finally {
        if (handle && handle.remove) { try { await handle.remove(); } catch (_) {} }
      }
    }

    // المُتَصَفِّح: fetch مَعَ تَقَدُّمٍ إن أَمكَن
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const total = parseInt(r.headers.get("content-length") || "0", 10);
    let blob;
    if (r.body && total > 0 && onProgress) {
      const reader = r.body.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        onProgress(Math.floor(got * 100 / total), got, total);
      }
      blob = new Blob(chunks, { type: r.headers.get("content-type") || "" });
    } else {
      blob = await r.blob();
    }
    return new File([blob], guessNameFromUrl(url),
                    { type: blob.type || "application/octet-stream" });
  }

  // ══════════════════════════════════════════════════════════
  //  v1.2.7 — yt-dlp داخِلَ تَطبيقِ أندرويد
  //  ───────────────────────────────────────────────────────
  //  عَبرَ io.github.junkfood02.youtubedl-android (أَساسُ YTDLnis): تُضَمَّنُ
  //  Python مَعَ yt-dlp وتُهَيَّأُ عِندَ أَوَّلِ استِعمال (فَكُّ ضَغطٍ يَستَغرِقُ
  //  ثَوانِيَ — لِذا نُهَيِّئُ عِندَ الطَلَبِ لا عِندَ الإقلاع).
  //  بِلا ffmpeg: نَطلُبُ صيَغاً مَدموجةً مُسبَقاً (اُنظُر GtsirmYtdlp.java).
  // ══════════════════════════════════════════════════════════
  function ytdlpPlugin() {
    try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GtsirmYtdlp) || null; }
    catch (_) { return null; }
  }

  function hasYtdlp() { return !!ytdlpPlugin(); }

  async function ytdlpVersion() {
    const P = ytdlpPlugin();
    if (!P) return null;
    try { return (await P.version()).version || null; } catch (_) { return null; }
  }

  async function ytdlpUpdate() {
    const P = ytdlpPlugin();
    if (!P) throw new Error("yt-dlp غَيرُ مُضَمَّنٍ في هذه الحُزمة");
    return await P.update();
  }

  /** يُنَزِّلُ عَبرَ yt-dlp ويُعيدُ File جاهِزاً لِمُعالِجِ القِسم. */
  async function ytdlpDownload(url, kind, onProgress) {
    const P = ytdlpPlugin();
    if (!P) throw new Error("yt-dlp غَيرُ مُضَمَّنٍ في هذه الحُزمة");
    let handle = null;
    try {
      if (onProgress) {
        try {
          handle = await P.addListener("ytdlpProgress",
            (ev) => onProgress(ev.percent, ev.line || "", ev.eta));
        } catch (_) {}
      }
      const res = await P.download({ url, kind: kind || "video" });
      const src = (window.Capacitor && window.Capacitor.convertFileSrc)
        ? window.Capacitor.convertFileSrc(res.path) : res.path;
      const r = await fetch(src);
      if (!r.ok) throw new Error("تَعَذَّرَت قِراءةُ المَلَفِّ المُنَزَّل (HTTP " + r.status + ")");
      const blob = await r.blob();
      return new File([blob], res.name || "download",
                      { type: res.mime || blob.type || "application/octet-stream" });
    } finally {
      if (handle && handle.remove) { try { await handle.remove(); } catch (_) {} }
    }
  }

  async function ytdlpCancel() {
    const P = ytdlpPlugin();
    if (P) { try { await P.cancel(); } catch (_) {} }
  }

  // ── التَصدير ────────────────────────────────────────────────
  window.PIO = {
    downloadDirect,
    hasYtdlp,
    ytdlpVersion,
    ytdlpUpdate,
    ytdlpDownload,
    ytdlpCancel,
    checkForUpdate,
    downloadAndInstall,
    compareVersions,
    GITHUB_REPO,
    isNativeAndroid,
    hasNativeBridge: () => !!nativePlugin(),
    HAS_FSA_SAVE,
    prepareSaveTarget,
    deliverFile,
    shareSavedFile,
    saveAsDialog,
    shareBlob,
    canShareFiles,
    writeAppTextFile,
    saveViaDownload,
    keepAwakeStart,
    keepAwakeProgress,
    keepAwakeStop,
    yieldToBrowser,
    bytesToBase64,
  };
})();
