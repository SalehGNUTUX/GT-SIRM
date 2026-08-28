"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SIRM — Web Deterministic Export Engine (V2)
//  مكافئ للمكتبية: VideoEncoder + AudioEncoder من WebCodecs
//  بدل MediaRecorder + captureStream — لا تقطّع، لا انجراف
//  ───────────────────────────────────────────────────────
//  المتطلبات (تُكتشف تلقائياً، fallback لـ MediaRecorder):
//    - VideoEncoder + AudioEncoder (Chrome 94+, Edge, Safari 16.4+, Firefox 130+)
//    - mp4-muxer (محمَّل كـ ES module في window.Mp4Muxer)
//    - webm-muxer (احتياط لو AAC غير مدعوم) في window.WebmMuxer
// ═══════════════════════════════════════════════════════

// ── جدول الكوديكات الممكنة ────────────────────────────
//   AAC غير مدعوم في Firefox لأسباب براءات اختراع → نسقط على Opus داخل MP4
//   H.264 hardware-encoded غير متاح في كل المتصفحات → نسقط على VP9 داخل WebM
const WEB_EXPORT_CODECS = {
  "mp4-h264": {
    ext: "mp4", muxer: "mp4",
    videoTries: [
      // v1.2.3 — جَوّد قَبلَ أن تَتَنازَل: كانَ الخِيارُ الوَحيدُ هُوَ Baseline،
      //   وهُوَ أَدنى مِلَفّاتِ H.264 جَودةً عِندَ نَفسِ مُعَدَّلِ البِتّ (لا CABAC
      //   ولا إطاراتِ B). High ثُمَّ Main يُعطِيانِ صورةً أَنقى بِنَفسِ الحَجم،
      //   ويُسقَطُ إلى Baseline إن لَم يَدعَمهُما الجِهاز.
      { videoCodec: "avc", videoCodecStr: "avc1.640028" },  // High 4.0
      { videoCodec: "avc", videoCodecStr: "avc1.4D0028" },  // Main 4.0
      { videoCodec: "avc", videoCodecStr: "avc1.42E01F" },  // Baseline (احتياط)
    ],
    audioTries: [
      { audioCodec: "aac",  audioCodecStr: "mp4a.40.2" },   // AAC LC (الأفضل قبولاً)
      { audioCodec: "opus", audioCodecStr: "opus"      },   // Opus داخل MP4 (مدعوم منذ 2014)
    ],
  },
  "webm-vp9": {
    ext: "webm", muxer: "webm",
    videoTries: [
      { videoCodec: "vp9", videoCodecStr: "vp09.02.10.10" },  // Profile 2، عُمقُ 10 بِت
      { videoCodec: "vp9", videoCodecStr: "vp09.00.10.08" },
      { videoCodec: "vp8", videoCodecStr: "vp8" },
    ],
    audioTries: [
      { audioCodec: "opus", audioCodecStr: "opus" },
    ],
  },
};

// ── اختر أول كوديك يدعمه المتصفح فعلياً ───────────────
async function pickSupportedVideoCodec(tries, baseCfg) {
  for (const t of tries) {
    const cfg = { ...baseCfg, codec: t.videoCodecStr };
    const sup = await VideoEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
    if (sup.supported) return { ...t, config: cfg };
  }
  return null;
}
async function pickSupportedAudioCodec(tries, baseCfg) {
  for (const t of tries) {
    const cfg = { ...baseCfg, codec: t.audioCodecStr };
    const sup = await AudioEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
    if (sup.supported) return { ...t, config: cfg };
  }
  return null;
}

// ── فحص دعم WebCodecs والمكسرات ──────────────────────
function isWebCodecsSupported() {
  return typeof VideoEncoder !== "undefined"
      && typeof AudioEncoder !== "undefined"
      && typeof VideoFrame   !== "undefined"
      && typeof AudioData    !== "undefined"
      && (window.Mp4Muxer || window.WebmMuxer);
}

// v0.7.3 — seek HTMLVideoElement مع انتظار اكتمال الإطار
// v1.2.1 — تَسريع: تَخَطَّ الـseek إذا كانَ الهَدَفُ داخِلَ نَفسِ إطارِ المَصدَر.
//   الـseek أَغلى ما في حَلقةِ التَصدير (يُعيدُ فَكَّ التَرميزِ مِن آخِرِ مِفتاح)،
//   وحينَ يَكونُ إطارُ التَصديرِ أَسرَعَ مِن إطارِ المَصدَر (30 مِن 25 مَثَلاً)
//   تَقَعُ إطاراتٌ مُتَتالِيةٌ عَلى نَفسِ إطارِ المَصدَر — فَلا داعِيَ لِتَكرارِه.
//   السَماحُ الافتِراضيُّ 20ms (سُلوكُ ما قَبل v1.2.1) ما لَم يُمَرَّر غَيرُه.
// v1.2.2 — يُعيدُ الآنَ وَصفاً لِما جَرى، لِيَعرِفَ المُصَدِّرُ أَينَ يَضيعُ الزَمَن:
//   { skipped } لَم يَلزَمِ النَقل · { timedOut } انقَضَتِ المُهلةُ ولَم يَصِل
//   حَدَثُ seeked (الإطارُ المَرسومُ عِندَئِذٍ قَديم) · { ms } الزَمَنُ المُستَغرَق.
function seekVideoToTimeWeb(v, t, tolerance, guardMs, noWait) {
  return new Promise(resolve => {
    if (!v || !isFinite(v.duration)) return resolve({ skipped: true, ms: 0 });
    const tol = (typeof tolerance === "number" && tolerance > 0) ? tolerance : 0.02;
    const target = Math.min(t, Math.max(0, v.duration - 1e-4));
    if (Math.abs(v.currentTime - target) < tol) return resolve({ skipped: true, ms: 0 });
    // v1.2.3 — «تَقَدَّم عِندَ الجاهِزيّة» بَدَلَ «أَطلِق وانسَ».
    //   الصيغةُ الأُولى (v1.2.2) كانَت تُسنِدُ currentTime في كُلِّ إطار، فَتُلغي
    //   كُلُّ إسنادٍ النَقلةَ التي قَبلَه: لا تَكتَمِلُ نَقلةٌ واحِدةٌ أَبَداً،
    //   فَتَتَجَمَّدُ الخَلفيّةُ عَلى أَوَّلِ إطارٍ — وهُوَ ما ظَهَرَ في الناتِج.
    //   الصَحيحُ ألّا نَطلُبَ نَقلةً جَديدةً حَتّى تَنتَهيَ الجارية: فَتَتَقَدَّمُ
    //   الخَلفيّةُ بِأَقصى ما يَسمَحُ بِهِ فاكُّ التَرميز، وتُعيدُ الإطاراتُ
    //   البَينيّةُ آخِرَ إطارٍ مَفكوك. النَتيجة: خَلفيّةٌ مُتَحَرِّكةٌ بِمُعَدَّلِ
    //   إطاراتٍ أَقَلّ، بِلا انتِظارٍ في الحَلقة.
    if (noWait) {
      if (v._sirmSeeking) return resolve({ skipped: true, ms: 0 });
      v._sirmSeeking = true;
      const clear = () => {
        v._sirmSeeking = false;
        try { v.removeEventListener("seeked", clear); } catch (_) {}
        if (v._sirmSeekGuard) { clearTimeout(v._sirmSeekGuard); v._sirmSeekGuard = null; }
      };
      v.addEventListener("seeked", clear);
      // حارِسٌ لِئَلّا يَبقى العَلَمُ مَرفوعاً لَو ضاعَ حَدَثُ seeked
      v._sirmSeekGuard = setTimeout(clear, 1500);
      try { v.currentTime = target; } catch (_) { clear(); }
      return resolve({ skipped: false, noWait: true, ms: 0 });
    }
    const t0 = performance.now();
    let done = false;
    let timer = null;
    const finish = (timedOut) => {
      if (done) return;
      done = true;
      if (timer) { clearTimeout(timer); timer = null; }
      try { v.removeEventListener("seeked", onSeeked); } catch (_) {}
      resolve({ skipped: false, timedOut: !!timedOut, ms: performance.now() - t0 });
    };
    const onSeeked = () => finish(false);
    v.addEventListener("seeked", onSeeked);
    try { v.currentTime = target; } catch (_) { finish(false); return; }
    timer = setTimeout(() => finish(true), guardMs || 800);
  });
}

// v1.2.1 — تَقديرُ مُدّةِ إطارِ فيديو المَصدَر، لِضَبطِ سَماحِ الـseek أَعلاه.
//   لا تَكشِفُ المُتَصَفِّحاتُ مُعَدَّلَ إطاراتِ الفيديو مُباشَرةً؛ نَستَعمِلُ
//   webkitDecodedFrameCount إن وُجِد، وإلّا نَفتَرِضُ 30 إطاراً (سَماحٌ مُحافِظ).
function estimateFrameDurWeb(v) {
  try {
    if (v && v.getVideoPlaybackQuality) {
      const q = v.getVideoPlaybackQuality();
      if (q && q.totalVideoFrames > 10 && v.currentTime > 0.5) {
        const fps = q.totalVideoFrames / v.currentTime;
        if (fps > 5 && fps < 121) return 1 / fps;
      }
    }
  } catch (_) {}
  return 1 / 30;
}

// v1.2.1 — انتِظارُ انحِسارِ طابورِ المُرَمِّزِ بِلا setTimeout.
//   setTimeout يُخنَقُ إلى نِداءٍ كُلَّ ثانيةٍ حينَ تَكونُ الصَفحةُ مَخفيّة،
//   فَكانَ التَصديرُ يَهبِطُ إلى ~إطارٍ في الثانِيةِ بِمُجَرَّدِ مُغادَرةِ البَرنامَج.
//   حَدَثُ dequeue لا يُخنَق.
function waitForEncoderQueue(enc, maxQueue) {
  if (!enc || enc.encodeQueueSize <= maxQueue) return Promise.resolve();
  if (typeof enc.addEventListener !== "function") {
    return (window.PIO ? window.PIO.yieldToBrowser() : Promise.resolve());
  }
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      try { enc.removeEventListener("dequeue", onDequeue); } catch (_) {}
      resolve();
    };
    const onDequeue = () => { if (enc.encodeQueueSize <= maxQueue) finish(); };
    // شَبَكةُ أَمان: لَو تَعَثَّرَ المُرَمِّزُ فَلَم يُطلِق dequeue أَبَداً، لا نُعَلِّقُ
    //   التَصديرَ إلى الأَبَد — نَمضي بَعدَ ثانِيَتَين.
    const guard = setTimeout(finish, 2000);
    enc.addEventListener("dequeue", onDequeue);
    onDequeue();
  });
}

// ── v0.11.1 — محرّك المؤثّرات الصوتيّة (للتصدير V2 offline) ───────
const WEB_EXPORT_REVERB_PRESETS = {
  "room":      { duration: 0.3, decay: 4   },
  "studio":    { duration: 0.5, decay: 3   },
  "masjid-sm": { duration: 1.5, decay: 2.5 },
  "masjid-lg": { duration: 3.0, decay: 2   },
  "hall":      { duration: 5.0, decay: 1.5 },
};

function _webExportCreateIR(ctx, preset) {
  const p = WEB_EXPORT_REVERB_PRESETS[preset] || WEB_EXPORT_REVERB_PRESETS["masjid-lg"];
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

function _webExportBuildFXChain(ctx, sourceNode, cfg) {
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
    try { conv.buffer = _webExportCreateIR(ctx, cfg.reverbType); } catch (_) {}
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

// v0.11.2 — FX مَرّة واحدة على كامل bgBuffer (مع التَكرار) لتَجنّب تَراكب IRs العشوائيّة
async function _webPreprocessBgBufferWithFX(bgBuffer, cfg, bgLoop, totalDuration, sampleRate) {
  const tailSec = 4;
  const channels = bgBuffer.numberOfChannels || 2;
  const totalSamples = Math.max(1, Math.floor((totalDuration + tailSec) * sampleRate));
  const preCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);
  const mixer = preCtx.createGain();
  mixer.gain.value = 1;
  const dur = bgBuffer.duration;
  let t = 0, safety = 0;
  while (t < totalDuration && safety++ < 4096) {
    const src = preCtx.createBufferSource();
    src.buffer = bgBuffer;
    src.connect(mixer);
    const remaining = totalDuration - t;
    if (remaining < dur) src.start(t, 0, remaining);
    else                 src.start(t);
    if (!bgLoop) break;
    t += dur;
  }
  const fxOut = _webExportBuildFXChain(preCtx, mixer, cfg);
  fxOut.connect(preCtx.destination);
  return await preCtx.startRendering();
}

// ── خلط الصوت (مشترك مع المكتبية، لكن منسوخ هنا للويب) ──
async function mixAudioToBufferWeb({
  audioBuffers, ayaStarts,
  bgBuffer, bgGain, bgLoop,
  bgVidAudioItems,          // [{buffer, gain, dur}] لخلفيات الفيديو مع صوت مفعَّل
  bgVidCrossfadeSec,        // مدة الـ crossfade لاحتساب overlap بين المقاطع
  totalDuration, recGain, sampleRate = 44100,
  bgFXConfig,               // v0.11.1
}) {
  const channels = 2;
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const oac = new OfflineAudioContext(channels, length, sampleRate);

  (audioBuffers || []).forEach((buf, i) => {
    if (!buf) return;
    const src = oac.createBufferSource();
    src.buffer = buf;
    const gain = oac.createGain();
    gain.gain.value = recGain ?? 1;
    src.connect(gain); gain.connect(oac.destination);
    src.start(ayaStarts[i] ?? 0);
  });

  // v0.11.2 — FX مَرّة واحدة على كامل bgBuffer (لا في كلّ تَكرار)
  if (bgBuffer) {
    if (bgFXConfig && bgFXConfig.enabled) {
      const effectiveBuffer = await _webPreprocessBgBufferWithFX(
        bgBuffer, bgFXConfig, bgLoop, totalDuration, sampleRate
      );
      const src = oac.createBufferSource();
      src.buffer = effectiveBuffer;
      const gain = oac.createGain();
      gain.gain.value = bgGain ?? 0.3;
      src.connect(gain); gain.connect(oac.destination);
      src.start(0);
    } else {
      const dur = bgBuffer.duration;
      let t = 0, safety = 0;
      while (t < totalDuration && safety++ < 4096) {
        const src = oac.createBufferSource();
        src.buffer = bgBuffer;
        const gain = oac.createGain();
        gain.gain.value = bgGain ?? 0.3;
        src.connect(gain); gain.connect(oac.destination);
        const remaining = totalDuration - t;
        if (remaining < dur) src.start(t, 0, remaining);
        else src.start(t);
        if (!bgLoop) break;
        t += dur;
      }
    }
  }

  // ── أصوات خلفيات الفيديو (لكل مقطع صوت مستقل + مستوى) ──
  //   يحترم crossfade overlap: المقطع التالي يبدأ قبل نهاية الحالي بـ xf ث
  if (Array.isArray(bgVidAudioItems) && bgVidAudioItems.length) {
    const xf = Math.max(0, bgVidCrossfadeSec || 0);
    // احسب أوقات بداية كل مقطع في دورة واحدة من الـ playlist
    const starts = [];
    let cum = 0;
    for (let i = 0; i < bgVidAudioItems.length; i++) {
      starts.push(cum);
      cum += Math.max(0.1, (bgVidAudioItems[i].dur || 0) - xf);
    }
    const cycleDur = cum + xf;  // المدة الكلية للدورة كاملة

    // كرّر الـ playlist حتى تغطّي totalDuration
    let cycleStart = 0;
    let safety = 0;
    while (cycleStart < totalDuration && safety++ < 100) {
      for (let i = 0; i < bgVidAudioItems.length; i++) {
        const it = bgVidAudioItems[i];
        if (!it.buffer) continue;
        const startTime = cycleStart + starts[i];
        if (startTime >= totalDuration) break;
        const src = oac.createBufferSource();
        src.buffer = it.buffer;
        const gain = oac.createGain();
        gain.gain.value = it.gain ?? 0.5;
        src.connect(gain); gain.connect(oac.destination);
        // v1.2 Feature#2 — offset في buffer = trimStart، مُدّة = it.dur الفَعّالة
        const bufOffset = Math.max(0, Math.min(it.trimStart || 0, it.buffer.duration));
        const clipMaxPlay = Math.max(0.05, it.buffer.duration - bufOffset);
        const wantDur = Math.min(clipMaxPlay, it.dur || clipMaxPlay);
        const remaining = totalDuration - startTime;
        const playDur = Math.min(wantDur, remaining);
        if (playDur > 0.02) src.start(startTime, bufOffset, playDur);
      }
      if (cycleDur <= 0.1) break; // أمان
      cycleStart += cycleDur;
    }
  }

  return await oac.startRendering();
}

// ── المحرّك الرئيسي ───────────────────────────────────
// ── FFT صغير (Cooley-Tukey radix-2) لتحليل طيف الصوت ──
//   يُستخدم لحساب بيانات الموجة الصوتية لكل إطار في V2
function fftMagnitudes(input) {
  const N = input.length;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = input[i];
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cRe = 1, cIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tRe = cRe * re[b] - cIm * im[b];
        const tIm = cRe * im[b] + cIm * re[b];
        re[b] = re[a] - tRe; im[b] = im[a] - tIm;
        re[a] += tRe; im[a] += tIm;
        const ncr = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = ncr;
      }
    }
  }
  const mag = new Float32Array(N >> 1);
  for (let i = 0; i < (N >> 1); i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N;
  return mag;
}

// ── حساب بيانات الموجة لكل إطار (V2 export) ─────────
//   نأخذ نافذة 512 عينة (بـ Hann) لكل إطار، نُحلّلها FFT
//   ثم نأخذ النطاق الصوتي (~80Hz - 3kHz) في 64 بن للعرض
function precomputeWaveDataForExport(mixed, totalFrames, FPS) {
  // يحاكي تماماً سلوك AnalyserNode المُستخدم في المعاينة:
  //   fftSize=512, smoothingTimeConstant=0.82
  //   minDecibels=-100, maxDecibels=-30 (افتراضيّات Web Audio API)
  // الناتج: ذبذبات هابطة بانسيابيّة مطابقة للمعاينة.
  const sr = mixed.sampleRate;
  const ch0 = mixed.getChannelData(0);
  const ch1 = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : null;
  const N = 512;
  const halfN = N >> 1;
  const bins = 64;

  // نافذة Blackman (المستخدمة فعلياً في AnalyserNode — أدقّ من Hann)
  const blackman = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    blackman[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
                       + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
  }

  // نطاق الصوت البشريّ (مطابق للمعاينة)
  const voiceStart = 1;
  const voiceEnd = Math.min(35, halfN - 1);
  const voiceLen = voiceEnd - voiceStart + 1;

  const SMOOTHING = 0.82;
  const MIN_DB = -100;
  const MAX_DB = -30;
  const DB_RANGE = MAX_DB - MIN_DB;

  const smoothedDB = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) smoothedDB[i] = MIN_DB;

  const window = new Float32Array(N);
  const out = new Array(totalFrames);

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / FPS;
    const startSample = Math.max(0, Math.floor(t * sr) - halfN);
    for (let i = 0; i < N; i++) {
      const idx = startSample + i;
      let s = 0;
      if (idx < ch0.length) {
        s = ch0[idx];
        if (ch1) s = (s + ch1[idx]) * 0.5;
      }
      window[i] = s * blackman[i];
    }

    const mag = fftMagnitudes(window);

    for (let i = 0; i < halfN; i++) {
      const m = Math.max(mag[i], 1e-10);
      const db = 20 * Math.log10(m);
      smoothedDB[i] = SMOOTHING * smoothedDB[i] + (1 - SMOOTHING) * db;
    }

    const data = new Uint8Array(bins);
    for (let b = 0; b < bins; b++) {
      const srcIdx = voiceStart + Math.floor((b / bins) * voiceLen);
      const normalized = (smoothedDB[srcIdx] - MIN_DB) / DB_RANGE;
      data[b] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
    }
    out[frame] = data;
  }
  return out;
}

// ── ضبط معدّل تشغيل فيديو الخلفية ليطابق سرعة الترميز ──
// v1.2 Bug#1 — deterministic seek لِخَلفيّة الفيديو في التَصدير
// كان النَهج القَديم (syncBgVidPlayback) يَضبُط playbackRate حتى 16× → تَسريع مَرئيّ
// + عَدَم تَزامُن بَين الحاليّ والقادم في الـcrossfade. الآن نَحسِب مَوضِع كُلّ إطار
// حَتميّاً ثُمّ نَستَخدِم seekVideoToTimeWeb — نَفس نَمط recvid.
//
// الوقت في timeline المُدمَج:
//   clip i يَبدأ عند start(i) = Σ D[k<i] − i·xf
//   وينتهي عند start(i) + D[i]
//   يَتَزامَن مَع بَداية clip i+1 عند start(i) + D[i] − xf (نافذة الـxfade)
//   cycleDur = ΣD − (N−1)·xf
function getBgClipAtTimeWeb(t, clipDurations, xf) {
  const N = clipDurations.length;
  if (N === 0) return null;
  if (N === 1) {
    const dur = clipDurations[0];
    if (!(dur > 0)) return { clipIndex: 0, localTime: 0, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
    return { clipIndex: 0, localTime: t % dur, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
  }
  const totalCycle = clipDurations.reduce((a, b) => a + b, 0) - (N - 1) * xf;
  if (totalCycle > 0 && t >= totalCycle) t = t % totalCycle;

  let cum = 0;
  for (let i = 0; i < N; i++) {
    const clipEnd = cum + clipDurations[i];
    if (t < clipEnd) {
      const localTime = t - cum;
      const remaining = clipEnd - t;
      const inXfade = (remaining <= xf && i < N - 1 && xf > 0);
      let nextClipIndex = -1, nextLocalTime = 0, xfadeAlpha = 0;
      if (inXfade) {
        nextClipIndex = i + 1;
        const nextStart = cum + clipDurations[i] - xf;
        nextLocalTime = Math.max(0, t - nextStart);
        xfadeAlpha = Math.max(0, Math.min(1, 1 - remaining / xf));
      }
      return { clipIndex: i, localTime, inXfade, nextClipIndex, nextLocalTime, xfadeAlpha };
    }
    cum += clipDurations[i] - xf;
  }
  return { clipIndex: N - 1, localTime: clipDurations[N-1] || 0, inXfade: false, nextClipIndex: -1, nextLocalTime: 0, xfadeAlpha: 0 };
}

async function startWebExportV2(opts) {
  const {
    canvas, drawFrame, setStateForTime,
    totalDuration, fps,
    audioBuffers, ayaStarts, bgBuffer, bgGain, bgLoop, recGain,
    bgVideo,                  // HTMLVideoElement لخلفية الفيديو (يحتاج seek)
    codecKey, videoBitrate, audioBitrate,
    onProgress, cancelRef,
  } = opts;

  if (!isWebCodecsSupported()) {
    throw new Error("WebCodecs غير مدعوم في هذا المتصفح");
  }

  // ترتيب المحاولة: المطلوب أولاً ثم WebM/VP9 كاحتياط شامل
  const tryOrder = codecKey === "webm-vp9"
    ? ["webm-vp9"]
    : ["mp4-h264", "webm-vp9"];

  const FPS = Math.max(1, Math.floor(fps || 30));
  const W = canvas.width, H = canvas.height;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * FPS));
  const sampleRate = 44100;
  const channels   = 2;

  // ── 1) اختيار كوديك مدعوم فعلياً (مع fallback) ──────
  onProgress(2, "🔍 فحص دعم الكوديك في المتصفح…");
  const baseVideoCfg = {
    width: W, height: H,
    bitrate: (videoBitrate || 8) * 1_000_000,
    framerate: FPS,
    // v1.2.3 — التَصديرُ لَيسَ بَثّاً حَيّاً: أَخبِرِ المُرَمِّزَ أن يُؤثِرَ الجَودةَ
    //   عَلى زَمَنِ الاستِجابة (يُتيحُ نَظَراً أَمامِيّاً وإطاراتِ B حَيثُ تُدعَم).
    latencyMode: "quality",
    bitrateMode: "variable",
  };
  const baseAudioCfg = {
    numberOfChannels: channels,
    sampleRate,
    bitrate: parseInt((audioBitrate || "192k")) * 1000,
  };

  let fmt = null, pickedV = null, pickedA = null;
  // v1.2.3 — `latencyMode`/`bitrateMode` حَديثانِ نِسبيّاً. إن رَفَضَهُما مُحَرِّكٌ
  //   أَقدَم لَرُفِضَت كُلُّ الكوديكاتِ وفَشِلَ التَصديرُ كامِلاً — فَنُعيدُ المُحاوَلةَ
  //   بِإعدادٍ أَدنى بَدَلَ أن نَستَسلِم.
  const videoCfgTries = [baseVideoCfg, {
    width: W, height: H,
    bitrate: (videoBitrate || 8) * 1_000_000,
    framerate: FPS,
  }];
  for (const vcfg of videoCfgTries) {
  for (const key of tryOrder) {
    const candidate = WEB_EXPORT_CODECS[key];
    if (!candidate) continue;
    const MuxerLib = (candidate.muxer === "mp4") ? window.Mp4Muxer : window.WebmMuxer;
    if (!MuxerLib) continue;
    const v = await pickSupportedVideoCodec(candidate.videoTries, vcfg);
    const a = await pickSupportedAudioCodec(candidate.audioTries, baseAudioCfg);
    if (v && a) {
      fmt = candidate; pickedV = v; pickedA = a;
      console.log(`[V2] codec: ${v.videoCodecStr} + ${a.audioCodecStr} (${candidate.muxer})`);
      if (key !== codecKey) {
        // إن كان المختار مختلفاً عمّا طلب المستخدم → أبلغه
        const reqName = codecKey === "mp4-h264" ? "MP4" : "WebM";
        const useName = key === "mp4-h264" ? "MP4" : "WebM";
        if (typeof toast === "function") {
          toast(`ℹ️ ${reqName} غير مدعوم بالكامل — استخدام ${useName} (${a.audioCodecStr})`, "info", 4500);
        }
      }
      break;
    }
  }
  if (fmt) break;
  console.warn("[V2] لَم يُقبَل أَيُّ كوديكٍ بِالإعدادِ المُجَوَّد — إعادةُ المُحاوَلةِ بِإعدادٍ أَدنى");
  }
  if (!fmt) {
    throw new Error("لا يدعم المتصفح أي كوديك متاح. حاول Chrome/Edge أحدث.");
  }

  // ── 2) إعداد الـ muxer ──────────────────────────────
  const MuxerLib = (fmt.muxer === "mp4") ? window.Mp4Muxer : window.WebmMuxer;
  const muxer = new MuxerLib.Muxer({
    target: new MuxerLib.ArrayBufferTarget(),
    video: {
      codec: pickedV.videoCodec,
      width: W, height: H,
      frameRate: FPS,
    },
    audio: {
      codec: pickedA.audioCodec,
      numberOfChannels: channels,
      sampleRate,
    },
    fastStart: (fmt.muxer === "mp4") ? "in-memory" : undefined,
  });

  // ── 3) إعداد المُرَمِّزات ─────────────────────────────
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder error:", e),
  });
  videoEncoder.configure(pickedV.config);

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error("AudioEncoder error:", e),
  });
  audioEncoder.configure(pickedA.config);

  // ── 4) خلط الصوت ────────────────────────────────────
  onProgress(5, "🎵 جاري خلط المسار الصوتي…");
  // اجمع buffers صوتية للمقاطع المُفعّل صوتها (إن وجدت)
  // v0.5.0 — يحترم توگل "كتم صوت الفيديو" العام
  const globalMute = document.getElementById("bg-vid-mute-audio")?.checked;
  // v1.2 — تَجاهُل المُعمّاة (hidden). Feature#2 — trim per-clip
  // v1.2 fix — لا نُصَفّي بحَسب audioEnabled: المَقاطع الصامِتة تُبقي مَواضِعها في
  //   timeline (starts + cycleDur)، لكنّ buffer=null فتَتَخَطّاها الحَلقة.
  //   يُصلِح: صَوت مَقطع واحد يَستَمِرّ عَلى طول الفيديو المُصَدَّر.
  const _getEff = typeof getBgClipEffectiveDur === "function" ? getBgClipEffectiveDur : (it => it.dur || 0);
  const _getTs  = typeof getBgClipTrimStart    === "function" ? getBgClipTrimStart    : (_  => 0);
  const bgVidAudioItems = globalMute ? [] : (S.bgVidItems || [])
    .filter(it => !it.hidden)
    .map(it => ({
      buffer: (it.audioEnabled && it.audioBuffer) ? it.audioBuffer : null,
      gain: it.audioGain,
      dur: _getEff(it),
      trimStart: _getTs(it),
    }));
  const mixed = await mixAudioToBufferWeb({
    audioBuffers, ayaStarts, bgBuffer, bgGain, bgLoop,
    bgVidAudioItems,
    bgVidCrossfadeSec: (typeof getCrossfadeDur === "function") ? getCrossfadeDur() : 0,
    totalDuration, recGain, sampleRate,
    bgFXConfig: opts.bgFXConfig,        // v0.11.1
  });
  if (cancelRef?.canceled) { try { videoEncoder.close(); audioEncoder.close(); } catch (_) {} throw new Error("cancelled"); }

  // ── 4.5) احسب بيانات الموجة الصوتية لكل إطار ────────
  //   حتى تظهر ذبذبات الصوت في المخرج (vs أنّها فارغة)
  //   v1.2.1 — تَخَطَّ الحِسابَ كامِلاً إن كانَتِ الموجاتُ مُطفَأة: FFT لِكُلِّ
  //   إطارٍ (آلافُ التَحويلات) بِلا فائِدةٍ تُذكَر، وهي مِن أَسبابِ البُطء.
  const _waveNeeded = !(typeof ge === "function") || ge("wave-on");
  let exportWaveData = null;
  if (_waveNeeded) {
    onProgress(6, "📊 حساب بيانات الموجة الصوتية…");
    exportWaveData = precomputeWaveDataForExport(mixed, totalFrames, FPS);
  }

  // ── 5) ترميز الصوت (مقطع-بمقطع) ─────────────────────
  onProgress(7, "🔊 جاري ترميز الصوت…");
  const audioChunkSamples = 1024;
  const audioFrameDuration = audioChunkSamples / sampleRate;
  // ادمج القنوات في مصفوفة interleaved Float32 (AudioData يتوقع planar أو interleaved حسب layout)
  const chans = [];
  for (let c = 0; c < channels; c++) chans.push(mixed.getChannelData(c));
  let _aChunk = 0;
  for (let off = 0; off < mixed.length; off += audioChunkSamples) {
    if (cancelRef?.canceled) break;
    // v1.2.1 — كانَ هذا الطَورُ يَحقِنُ آلافَ AudioData دُفعةً واحِدةً دونَ
    //   تَنازُلٍ عَنِ المُعالِج: تَتَضَخَّمُ الذاكِرةُ وتَتَجَمَّدُ الواجِهةُ عَلى الهاتِف.
    if ((++_aChunk % 64) === 0) {
      await waitForEncoderQueue(audioEncoder, 32);
      if (window.PIO) await window.PIO.yieldToBrowser();
    }
    const len = Math.min(audioChunkSamples, mixed.length - off);
    // planar: كل قناة في جزء منفصل من البافر
    const data = new Float32Array(len * channels);
    for (let c = 0; c < channels; c++) {
      const src = chans[c];
      const dst = data.subarray(c * len, c * len + len);
      for (let i = 0; i < len; i++) dst[i] = src[off + i];
    }
    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: len,
      numberOfChannels: channels,
      timestamp: Math.round((off / sampleRate) * 1_000_000),
      data,
    });
    audioEncoder.encode(audioData);
    audioData.close();
  }

  // ── 6) ترميز الفيديو (إطار-بإطار، حتمي) ─────────────
  const savedAya         = S.currentAya;
  const savedElapsed     = S.elapsed;
  const savedBgT         = S.bgMotionT;
  const savedBgVid       = S.bgVid;             // v1.2 Bug#1 — استعادة بَعد التَصدير
  const savedBgVidNext   = S.bgVidNext;
  const savedBgFadeProg  = S.bgVidFadeProgress;
  let lastUiTick = 0;
  let lastYieldTick = 0;

  // علم: يَمنَع updateBgVidCrossfade من العَبَث بحالة الـcrossfade خلال التَصدير
  S._exportingV2 = true;

  // v1.2 Bug#1 — تَحضير قائمة المقاطع المَرئيّة (تَجاهُل المُعمّاة)
  //   Feature#2 — استخدام المُدَد الفَعّالة بَعد trim
  const visibleBgClips = (S.bgVidItems || []).filter(it => !it.hidden && it.vid);
  const _effV = typeof getBgClipEffectiveDur === "function" ? getBgClipEffectiveDur : (it => it.dur || 0);
  const _tsV  = typeof getBgClipTrimStart    === "function" ? getBgClipTrimStart    : (_  => 0);
  const bgClipDurations = visibleBgClips.map(_effV);
  const bgClipTrimStarts = visibleBgClips.map(_tsV);
  const bgXf = (typeof getCrossfadeDur === "function") ? getCrossfadeDur() : 0;

  // أَوقِف كُلّ فيديوهات الخَلفيّة — نُدير مَواقعها بالـseek
  for (const it of (S.bgVidItems || [])) {
    try { it.vid.pause(); it.vid.playbackRate = 1; } catch (_) {}
  }
  // اِبدأ الفيديو الأَوّل المَرئيّ من trimStart
  if (visibleBgClips.length) {
    try { visibleBgClips[0].vid.currentTime = bgClipTrimStarts[0]; } catch (_) {}
    S.bgVid = visibleBgClips[0].vid;
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
  }

  // v1.2.1 — سَماحُ الـseek = مُدّةُ إطارِ المَصدَر. الطَلَبُ الواقِعُ داخِلَ
  //   الإطارِ نَفسِهِ لا يُغَيِّرُ البِكسِلاتِ فَلا داعِيَ لِإعادةِ فَكِّ التَرميز.
  const bgSeekTol   = visibleBgClips.length ? estimateFrameDurWeb(visibleBgClips[0].vid) * 0.9 : 0.02;
  const recSeekTol  = S.recVidEl ? estimateFrameDurWeb(S.recVidEl) * 0.9 : 0.02;
  const recVidOn    = !!(S.recVidEl && typeof ge === "function" && ge("recvid-on"));
  const tStartMs    = performance.now();

  // v1.2.2 — مِقياسٌ لِكُلِّ طَورٍ داخِلَ الحَلقة. بِلا هذا يَبقى «التَصديرُ بَطيء»
  //   تَخميناً: النَقلُ (seek) والرَسمُ والتَرميزُ لَها كُلَفٌ تَختَلِفُ عَشَراتِ
  //   الأَضعافِ بِاختِلافِ المَشروعِ والجِهاز.
  const prof = {
    seek: 0, draw: 0, encode: 0, wait: 0, yield: 0,
    seeks: 0, seekTimeouts: 0, seekSkips: 0, seekNoWait: 0, frames: 0, bgFrames: 0,
  };
  window._sirmExportProfile = prof;
  let seekDisabled = false;

  // v1.2.2 — وَضعُ الخَلفيّةِ السَريع + مُهلةُ نَقلٍ أَقصَر.
  //   صارَ تَقصيرُ المُهلةِ آمِناً بَعدَ ذاكِرةِ آخِرِ إطارٍ صالِح: أَسوَأُ ما يَقَعُ
  //   عِندَ انقِضائِها تَكرارُ إطارٍ، لا ظُهورُ الخَلفيّةِ المُتَدَرِّجةِ كَما كان.
  const bgFastMode = (typeof ge === "function") ? ge("export-bg-fast") : false;
  const BG_SEEK_GUARD = 400;
  if (bgFastMode && visibleBgClips.length) {
    console.log("[V2] وَضعُ خَلفيّةٍ سَريع: لا انتِظارَ لِنَقلِ الفيديو");
  }

  for (let i = 0; i < totalFrames; i++) {
    if (cancelRef?.canceled) break;
    const t = i / FPS;

    // v1.2 Bug#1 — deterministic seek لِمَقطع(مَقاطع) الخَلفيّة
    // v1.2.1 — تُجرى نَقَلاتُ الخَلفيّةِ وفيديو التِلاوةِ مَعاً لا تَعاقُباً:
    //   الـseek هُوَ عُنُقُ الزُجاجةِ الأَوَّلُ في التَصدير، وانتِظارُهُما
    //   بِالتَوازي يَحذِفُ نِصفَ زَمَنِ الانتِظارِ حينَ يَجتَمِعان.
    const seekJobs = [];
    // v1.2.2 — صِمامُ أَمان: إن كانَ العُنصُرُ <video> عاجِزاً عَنِ النَقلِ في هذه
    //   البيئة (تَنقَضي المُهلةُ ولا يَصِلُ حَدَثُ seeked)، فَنَحنُ نَدفَعُ 800ms
    //   لِكُلِّ إطارٍ ثُمَّ نَرسُمُ إطاراً قَديماً عَلى أَيّ حال — خَسارةٌ خالِصة.
    //   بَعدَ 10 مُحاوَلاتٍ أَغلَبُها فاشِل: أَوقِفِ النَقلَ وأَبلِغِ المُستَخدِم.
    if (!seekDisabled && prof.seeks >= 10 && prof.seekTimeouts / prof.seeks > 0.5) {
      seekDisabled = true;
      console.warn("[V2] النَقلُ (seek) يَفشَلُ في هذه البيئة — أُوقِفَ لِتَسريعِ التَصدير");
      if (typeof toast === "function") {
        toast("⚠️ تَعَذَّرَ نَقلُ فيديو الخَلفيّةِ إطاراً بِإطار عَلى هذا الجِهاز — " +
              "سَيُكمِلُ التَصديرُ بِلا تَحريكِ الفيديو (أَسرَعُ بِكَثير). " +
              "لِنَتيجةٍ أَفضَل: استَعمِل صورةَ خَلفيّة، أو صَدِّر مِن نُسخةِ سَطحِ المَكتَب.",
              "warn", 9000);
      }
    }
    if (!seekDisabled && visibleBgClips.length) {
      const cinfo = getBgClipAtTimeWeb(t, bgClipDurations, bgXf);
      if (cinfo) {
        S.bgVid = visibleBgClips[cinfo.clipIndex].vid;
        // Feature#2 — seek إلى (trimStart + localTime)
        const seekPos = bgClipTrimStarts[cinfo.clipIndex] + cinfo.localTime;
        seekJobs.push(seekVideoToTimeWeb(S.bgVid, seekPos, bgSeekTol, BG_SEEK_GUARD, bgFastMode));
        if (cinfo.inXfade) {
          S.bgVidNext = visibleBgClips[cinfo.nextClipIndex].vid;
          const nextSeekPos = bgClipTrimStarts[cinfo.nextClipIndex] + cinfo.nextLocalTime;
          seekJobs.push(seekVideoToTimeWeb(S.bgVidNext, nextSeekPos, bgSeekTol, BG_SEEK_GUARD, bgFastMode));
          const ease = (typeof easeInOutCubic === "function") ? easeInOutCubic : (x => x);
          S.bgVidFadeProgress = ease(cinfo.xfadeAlpha);
        } else {
          S.bgVidNext = null;
          S.bgVidFadeProgress = 0;
        }
      }
    }
    // v0.7.3 — مزامنة فيديو التلاوة مع زمن الإطار
    // فيديو التِلاوةِ يَبقى دَقيقاً دائِماً — تَأخُّرُهُ يَعني اختِلالَ المُزامَنةِ مَعَ الصَوت
    if (!seekDisabled && recVidOn) seekJobs.push(seekVideoToTimeWeb(S.recVidEl, t, recSeekTol));
    if (seekJobs.length) {
      const tSeek = performance.now();
      const results = await Promise.all(seekJobs);
      prof.seek += performance.now() - tSeek;
      for (const r of results) {
        if (!r) continue;
        if (r.skipped) prof.seekSkips++;
        else if (r.noWait) prof.seekNoWait++;
        else { prof.seeks++; if (r.timedOut) prof.seekTimeouts++; }
      }
    }

    // بيانات الموجة الصوتية للإطار الحالي (null إن كانَتِ الموجاتُ مُطفَأة)
    S._exportWaveData = exportWaveData ? exportWaveData[i] : null;
    if (setStateForTime) setStateForTime(t);
    const tDraw = performance.now();
    drawFrame(t);
    prof.draw += performance.now() - tDraw;

    // VideoFrame من الـ canvas بـ timestamp دقيق
    const tEnc = performance.now();
    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round(t * 1_000_000),
      duration:  Math.round(1_000_000 / FPS),
    });
    // مفتاح كل ثانية (يحسّن seek والـ scrubbing)
    const keyFrame = (i % FPS === 0);
    videoEncoder.encode(videoFrame, { keyFrame });
    videoFrame.close();
    prof.encode += performance.now() - tEnc;
    prof.frames++;

    // v1.2.1 — ضَغطُ الطابورِ عَبرَ حَدَثِ dequeue بَدَلَ setTimeout المَخنوق،
    //   ثُمَّ تَنازُلٌ واحِدٌ عَنِ المُعالِجِ عَبرَ MessageChannel (لا يُخنَقُ في
    //   الخَلفيّة) حَتّى تَجريَ رُدودُ المُرَمِّزِ وتَتَحَدَّثَ الواجِهة.
    const tWait = performance.now();
    await waitForEncoderQueue(videoEncoder, 8);
    prof.wait += performance.now() - tWait;

    // v1.2.3 — التَنازُلُ عَنِ المُعالِجِ كَلَّفَ 36ms لِلإطارِ في قِياسِ المُستَخدِم
    //   (30% مِنَ الزَمَن): كُلُّ تَنازُلٍ يَسمَحُ لِلمُتَصَفِّحِ بِتَركيبِ اللَوحةِ
    //   كامِلةً عَلى الشاشة. لا نَحتاجُ ذلِكَ لِكُلِّ إطار — يَكفي كُلَّ 120ms
    //   لِتَبقى الواجِهةُ حَيّةً ويَجريَ رَدُّ المُرَمِّز.
    const nowY = performance.now();
    if (window.PIO && (nowY - lastYieldTick > 120 || i === totalFrames - 1)) {
      lastYieldTick = nowY;
      const tY = performance.now();
      await window.PIO.yieldToBrowser();
      prof.yield += performance.now() - tY;
    }

    const now = performance.now();
    if (now - lastUiTick > 200 || i === totalFrames - 1) {
      lastUiTick = now;
      const pct = 10 + Math.round(((i + 1) / totalFrames) * 85);
      // v1.2.1 — زَمَنٌ مُتَبَقٍّ مُقَدَّرٌ: التَصديرُ عَلى الهاتِفِ طَويل،
      //   ومَعرِفةُ المُدّةِ خَيرٌ مِنَ انتِظارٍ مَجهول.
      let eta = "";
      if (i > 4) {
        const per = (now - tStartMs) / (i + 1);
        const left = Math.round((per * (totalFrames - i - 1)) / 1000);
        eta = `  ·  مُتَبَقٍّ ~${formatTime(left)}`;
      }
      // v1.2.2 — مُتَوَسِّطُ كُلِّ طَورٍ بِالمِلِّي ثانية لِكُلِّ إطار: يَكشِفُ أَينَ
      //   يَذهَبُ الزَمَنُ فِعلاً بَدَلَ التَخمين. «نقل» = نَقلُ الفيديو (seek).
      const n = Math.max(1, prof.frames);
      const ms = (x) => Math.round(x / n);
      const to = prof.seekTimeouts ? ` ⚠️مُهلة×${prof.seekTimeouts}` : "";
      const perf = `⏱ نقل ${ms(prof.seek)} · رسم ${ms(prof.draw)} · ترميز ${ms(prof.encode)} · انتظار ${ms(prof.wait)}${to}`;
      onProgress(pct, `🎞 إطار ${i + 1}/${totalFrames}  ·  ${formatTime(t)} / ${formatTime(totalDuration)}${eta}\n${perf}`);
      // أَبقِ إشعارَ الخِدمةِ (Android) مُواكِباً حَتّى والبَرنامَجُ في الخَلفيّة
      if (window.PIO) window.PIO.keepAwakeProgress(pct, `إطار ${i + 1}/${totalFrames}${eta}`);
    }
  }

  // استعادة حالة الواجهة
  S.currentAya = savedAya;
  S.elapsed    = savedElapsed;
  S.bgMotionT  = savedBgT;
  S.bgVid              = savedBgVid;             // v1.2 Bug#1
  S.bgVidNext          = savedBgVidNext;
  S.bgVidFadeProgress  = savedBgFadeProg;
  S._exportWaveData = null;   // عد إلى analyser/synthetic للمعاينة
  S._exportingV2 = false;
  // أَوقِف كُلّ فيديوهات الخَلفيّة (كانت مُسَلَّمة للـseek)
  for (const it of (S.bgVidItems || [])) {
    try {
      it.vid.pause();
      // v1.2.3 — أَسقِط أَعلامَ «نَقلةٌ جارية» حَتّى لا تَمنَعَ تَصديراً لاحِقاً
      it.vid._sirmSeeking = false;
      if (it.vid._sirmSeekGuard) { clearTimeout(it.vid._sirmSeekGuard); it.vid._sirmSeekGuard = null; }
    } catch (_) {}
  }

  if (cancelRef?.canceled) {
    try { videoEncoder.close(); audioEncoder.close(); } catch (_) {}
    throw new Error("cancelled");
  }

  // ── 7) Flush + finalize ─────────────────────────────
  onProgress(96, "📦 جاري إنهاء التغليف…");
  await videoEncoder.flush();
  await audioEncoder.flush();
  muxer.finalize();
  videoEncoder.close();
  audioEncoder.close();

  // ── 8) تَسليمُ الناتِج ───────────────────────────────
  //  ⚠️ v1.2.1 — كانَ هذا الطَورُ يَكتَفي بِـ`<a download>`. داخِلَ WebView
  //     (نُسخةُ الهاتِف) لا مُديرَ تَنزيلاتٍ يَلتَقِطُه، فَكانَ الفيديو يَختَفي
  //     صامِتاً بَعدَ تَصديرٍ طَويل — وهُوَ عَينُ ما أَبلَغَ بِهِ المُستَخدِم.
  //     الآنَ نَمُرُّ بِطَبَقةِ PIO: MediaStore ← Capacitor FS ← FSA ← تَنزيل.
  const buffer = muxer.target.buffer;
  const mime = (fmt.muxer === "mp4") ? "video/mp4" : "video/webm";
  const blob = new Blob([buffer], { type: mime });
  const filename = (opts.filenameBase || `GT-SIRM_${Date.now()}`) + "." + fmt.ext;

  onProgress(97, "💾 جارٍ حِفظُ المَلَفّ…");
  let saved = null;
  if (window.PIO) {
    saved = await window.PIO.deliverFile(blob, filename, mime, {
      kind: "video",
      target: opts.saveTarget,
      onProgress: (r) => onProgress(97 + Math.round(r * 3), `💾 حِفظُ المَلَفّ… ${Math.round(r * 100)}%`),
    });
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    saved = { method: "download", path: filename };
  }

  onProgress(100, "✅ اكتمل التصدير!");
  // نُعيدُ الـblob كَذلِك: يَحتَفِظُ بِهِ التَطبيقُ لِزِرِّ «احفَظ مَرّةً أُخرى»
  // فَلا يَضيعُ الناتِجُ إن فَشِلَت وَسيلةُ الحَفظِ المُختارة.
  return { ok: true, size: buffer.byteLength, blob, filename, mime, saved, profile: prof };
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

// ── تصدير عمومي ─────────────────────────────────────
window.WEB_EXPORT_CODECS    = WEB_EXPORT_CODECS;
window.startWebExportV2     = startWebExportV2;
window.isWebCodecsSupported = isWebCodecsSupported;
