
// v1.4 — بَعدَ التَصدير: أَعِدِ الفيديو إلى حالِهِ الطَبيعيّ. تَركُ
//   `playbackRate` مَضبوطاً عَلى سُرعةِ التَصديرِ يَجعَلُ المُعايَنةَ التالِيةَ
//   تَعمَلُ بِسُرعةٍ غَريبةٍ بِلا سَبَبٍ ظاهِرٍ لِلمُستَخدِم.
function _restoreRecVidAfterExport() {
  try {
    const v = S.recVidEl;
    if (!v) return;
    v.pause();
    v.playbackRate = 1;
  } catch (_) {}
}
"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SIRM — Export Engine V2 (Deterministic frame-pipe)
//  يرسم كل إطار يدوياً عند t = i/FPS، يحوّله إلى JPEG،
//  ويرسله مباشرةً إلى ffmpeg عبر stdin مع مسار صوتي WAV
//  مختلَط مسبقاً عبر OfflineAudioContext.
//  النتيجة: لا تقطّع، لا انجراف زمني، جودة احترافية.
// ═══════════════════════════════════════════════════════

const EXPORT_CODECS = {
  "mp4-h264":  { label: "MP4 — H.264 (متوافق عالمياً)", ext: "mp4", codec: "libx264",    audioCodec: "aac",     defaultCrf: 20, presets: ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"] },
  "mp4-h265":  { label: "MP4 — H.265/HEVC (أصغر حجماً)", ext: "mp4", codec: "libx265",    audioCodec: "aac",     defaultCrf: 25, presets: ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"] },
  "webm-vp9":  { label: "WebM — VP9 (مفتوح المصدر)",     ext: "webm",codec: "libvpx-vp9", audioCodec: "libopus", defaultCrf: 31, presets: ["realtime","good","best"] },
  "mkv-av1":   { label: "MKV — AV1 (أعلى كفاءة - بطيء)",  ext: "mkv", codec: "libaom-av1", audioCodec: "libopus", defaultCrf: 32, presets: ["realtime","good","best"] },
};

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

function precomputeWaveDataForExport(mixed, totalFrames, FPS) {
  // يحاكي تماماً سلوك AnalyserNode المُستخدم في المعاينة:
  //   fftSize=512, smoothingTimeConstant=0.82
  //   minDecibels=-100, maxDecibels=-30 (افتراضيّات Web Audio API)
  // الناتج: ذبذبات هابطة بانسيابيّة (slow falling) مطابقة للمعاينة.
  const sr = mixed.sampleRate;
  const ch0 = mixed.getChannelData(0);
  const ch1 = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : null;
  const N = 512;
  const halfN = N >> 1;
  const bins = 64;

  // نافذة Blackman (المستخدمة في AnalyserNode فعلياً — أدقّ من Hann)
  const blackman = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    blackman[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
                       + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
  }

  // نطاق الصوت البشريّ — يطابق المعاينة (voiceStart=1, voiceEnd=35)
  const voiceStart = 1;
  const voiceEnd = Math.min(35, halfN - 1);
  const voiceLen = voiceEnd - voiceStart + 1;

  // ثوابت AnalyserNode
  const SMOOTHING = 0.82;
  const MIN_DB = -100;
  const MAX_DB = -30;
  const DB_RANGE = MAX_DB - MIN_DB;

  // dB المُلَّسة بين الإطارات (تبدأ بـ -∞ ≡ MIN_DB)
  const smoothedDB = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) smoothedDB[i] = MIN_DB;

  const window = new Float32Array(N);
  const out = new Array(totalFrames);

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / FPS;
    const startSample = Math.max(0, Math.floor(t * sr) - halfN);
    // عيّنة مزيج القناتَين (mono) مع نافذة Blackman
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

    // طبّق dB scale + temporal smoothing لكل bin
    for (let i = 0; i < halfN; i++) {
      // magnitude → dB (مع إقصاء قاع المخروط)
      const m = Math.max(mag[i], 1e-10);
      const db = 20 * Math.log10(m);
      // smoothing بنفس صيغة AnalyserNode:
      //   smoothed = SMOOTHING * smoothed + (1-SMOOTHING) * current
      smoothedDB[i] = SMOOTHING * smoothedDB[i] + (1 - SMOOTHING) * db;
    }

    // اقتطع نطاق الصوت البشريّ ثمّ خرِّط 64 شريطاً (نفس منطق المعاينة)
    const data = new Uint8Array(bins);
    for (let b = 0; b < bins; b++) {
      const srcIdx = voiceStart + Math.floor((b / bins) * voiceLen);
      // تحويل dB → 0..255 بنفس صيغة getByteFrequencyData
      const normalized = (smoothedDB[srcIdx] - MIN_DB) / DB_RANGE;
      data[b] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
    }
    out[frame] = data;
  }
  return out;
}

// ── v0.11.1 — محرّك المؤثّرات الصوتيّة (للتصدير V2 offline) ───────
const EXPORT_REVERB_PRESETS = {
  "room":      { duration: 0.3, decay: 4   },
  "studio":    { duration: 0.5, decay: 3   },
  "masjid-sm": { duration: 1.5, decay: 2.5 },
  "masjid-lg": { duration: 3.0, decay: 2   },
  "hall":      { duration: 5.0, decay: 1.5 },
};

function _exportCreateIR(ctx, preset) {
  const p = EXPORT_REVERB_PRESETS[preset] || EXPORT_REVERB_PRESETS["masjid-lg"];
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

// نفس buildAudioFXChain لكن مع OfflineAudioContext (مُتطابق المنطق)
function _exportBuildFXChain(ctx, sourceNode, cfg) {
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
    try { conv.buffer = _exportCreateIR(ctx, cfg.reverbType); } catch (_) {}
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

// v0.11.2 — تَطبيق سلسلة FX مَرّة واحدة على كامل bgBuffer (مع التَكرار إن لزم)
// يَعود buffer أطول قليلاً من totalDuration (للسماح بـreverb tail).
// لماذا؟ في v0.11.1 كانت FX تُطبَّق في كلّ تَكرار، فتُولَّد IRs عشوائيّة مختلفة
// تَتراكَب وتُسبّب تَشويشاً. هنا IR واحد فقط على كامل المُحتوى.
async function preprocessBgBufferWithFX(bgBuffer, cfg, bgLoop, totalDuration, sampleRate) {
  const tailSec = 4;
  const channels = bgBuffer.numberOfChannels || 2;
  const totalSamples = Math.max(1, Math.floor((totalDuration + tailSec) * sampleRate));
  const preCtx = new OfflineAudioContext(channels, totalSamples, sampleRate);

  // mixer يَجمع كلّ التَكرارات قبل سلسلة FX
  const mixer = preCtx.createGain();
  mixer.gain.value = 1;

  const dur = bgBuffer.duration;
  let t = 0;
  let safety = 0;
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

  // سلسلة FX على mixer مَرّة واحدة (IR واحد لكامل المُحتوى)
  const fxOut = _exportBuildFXChain(preCtx, mixer, cfg);
  fxOut.connect(preCtx.destination);

  return await preCtx.startRendering();
}

// ── خلط الصوت إلى AudioBuffer واحد ───────────────────
async function mixAudioToBuffer({
  audioBuffers, ayaStarts,
  bgBuffer, bgGain, bgLoop,
  bgVidAudioItems,          // [{buffer, gain, dur}] لخلفيات الفيديو مع صوت
  bgVidCrossfadeSec,
  totalDuration, recGain, sampleRate = 44100,
  bgFXConfig,               // v0.11.1 — المؤثّرات على الصوت المخصّص/recvid
}) {
  const channels = 2;
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const oac = new OfflineAudioContext(channels, length, sampleRate);

  // 1) المسار الرئيسي (التلاوة)
  (audioBuffers || []).forEach((buf, i) => {
    if (!buf) return;
    const src = oac.createBufferSource();
    src.buffer = buf;
    const gain = oac.createGain();
    gain.gain.value = recGain ?? 1;
    src.connect(gain);
    gain.connect(oac.destination);
    src.start(ayaStarts[i] ?? 0);
  });

  // 2) صوت الخلفية (مع التكرار إن طُلب) + المؤثّرات الصوتيّة
  // v0.11.2 — إن كانت المؤثّرات مفعَّلة، نَطبّقها **مرّة واحدة** على كامل bgBuffer
  // المُكرَّر، لا في كلّ تَكرار. كلّ تطبيق يُولّد IR عشوائيّاً مختلفاً —
  // تَطبيق عدّة مرّات يُكدّس IRs مختلفة فينتج تَشويش.
  if (bgBuffer) {
    let effectiveBuffer = bgBuffer;
    if (bgFXConfig && bgFXConfig.enabled) {
      effectiveBuffer = await preprocessBgBufferWithFX(
        bgBuffer, bgFXConfig, bgLoop, totalDuration, sampleRate
      );
      // effectiveBuffer جاهز مع المؤثّرات مُدمَجة + tail — نَضعه كـsource واحد
      const src = oac.createBufferSource();
      src.buffer = effectiveBuffer;
      const gain = oac.createGain();
      gain.gain.value = bgGain ?? 0.3;
      src.connect(gain);
      gain.connect(oac.destination);
      src.start(0);
    } else {
      // المسار العاديّ بدون مؤثّرات — حلقة التَكرار كالسابق
      const dur = bgBuffer.duration;
      let t = 0;
      let safety = 0;
      while (t < totalDuration && safety++ < 4096) {
        const src = oac.createBufferSource();
        src.buffer = bgBuffer;
        const gain = oac.createGain();
        gain.gain.value = bgGain ?? 0.3;
        src.connect(gain);
        gain.connect(oac.destination);
        const remaining = totalDuration - t;
        if (remaining < dur) src.start(t, 0, remaining);
        else                 src.start(t);
        if (!bgLoop) break;
        t += dur;
      }
    }
  }

  // 3) أصوات خلفيات الفيديو (per-clip) — تحترم crossfade overlap
  if (Array.isArray(bgVidAudioItems) && bgVidAudioItems.length) {
    const xf = Math.max(0, bgVidCrossfadeSec || 0);
    const starts = [];
    let cum = 0;
    for (let i = 0; i < bgVidAudioItems.length; i++) {
      starts.push(cum);
      cum += Math.max(0.1, (bgVidAudioItems[i].dur || 0) - xf);
    }
    const cycleDur = cum + xf;
    let cycleStart = 0, safety = 0;
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
        // v1.2 Feature#2 — offset في buffer = trimStart لِلمَقطع، مُدّة = it.dur الفَعّالة
        const bufOffset = Math.max(0, Math.min(it.trimStart || 0, it.buffer.duration));
        const clipMaxPlay = Math.max(0.05, it.buffer.duration - bufOffset);
        const wantDur = Math.min(clipMaxPlay, it.dur || clipMaxPlay);
        const remaining = totalDuration - startTime;
        const playDur = Math.min(wantDur, remaining);
        if (playDur > 0.02) src.start(startTime, bufOffset, playDur);
      }
      if (cycleDur <= 0.1) break;
      cycleStart += cycleDur;
    }
  }

  return await oac.startRendering();
}

// ── قطع AudioBuffer لنطاق زمني محدّد ────────────────
function sliceAudioBuffer(buf, startSec, endSec) {
  const sr = buf.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sr));
  const endSample   = Math.min(buf.length, Math.floor(endSec * sr));
  const length = Math.max(1, endSample - startSample);
  // إنشاء AudioBuffer جديد عبر OfflineAudioContext (تجنّب new AudioBuffer مباشرة)
  const ctx = new OfflineAudioContext(buf.numberOfChannels, length, sr);
  const newBuf = ctx.createBuffer(buf.numberOfChannels, length, sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch);
    const dst = newBuf.getChannelData(ch);
    for (let i = 0; i < length; i++) dst[i] = src[startSample + i];
  }
  return newBuf;
}

// ── تحويل AudioBuffer إلى WAV (PCM 16-bit) ───────────
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, "WAVE");
  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);           // PCM chunk size
  view.setUint16(20, 1, true);            // format = PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);           // bits per sample
  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // interleave + clamp
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = chans[c][i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return ab;
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ── الالتقاط الخام من canvas (RGBA) ───────────────────
//   getImageData على canvas بـ willReadFrequently:true سريع جداً
//   ولا يمر عبر ترميز/فكّ JPEG — هذا هو طريق الأداء العالي
function canvasToRgbaBuffer(ctx, W, H) {
  const data = ctx.getImageData(0, 0, W, H).data;
  // الـ ImageData الجديد دائماً يبدأ في byteOffset=0 ويملك بافر بطول W*H*4 بالضبط
  // → نُرسل البافر مباشرة دون نسخة إضافية. IPC سيقوم بنسخه مرة واحدة فقط.
  return data.buffer;
}

// ── تحميل JPEG من القرص كـ ImageBitmap ─────────────────
//   نستخدم IPC لقراءة البايتات لأن fetch("file://...") محظور
//   تحت webSecurity:true (Chromium يعتبر كل URL مختلف origin)
async function loadBitmapFromPath(filePath) {
  const buf = await window.SIRM.readTmpFile(filePath);
  if (!buf) throw new Error("readTmpFile returned null for " + filePath);
  // Buffer من Node يصل كـ Uint8Array في الـ renderer
  const blob = new Blob([buf], { type: "image/jpeg" });
  return await createImageBitmap(blob);
}

// v0.7.3 — seek HTMLVideoElement مع انتظار اكتمال الإطار
// ══════════════════════════════════════════════════════
//  v1.4 — مُزامَنةُ فيديو التِلاوةِ بِالتَشغيلِ لا بِالنَقل
//  ───────────────────────────────────────────────────
//  كانَ التَصديرُ يَنقُلُ (seek) الفيديو نَقلةً لِكُلِّ إطار، و`seekVideoToTime`
//  تَستَسلِمُ بَعدَ 800ms **وتَمضي بِلا إبلاغ** — فَيُرسَمُ الإطارُ القَديمُ نَفسُه
//  مِراراً: يَخرُجُ المَقطَعُ المُصَدَّرُ والفيديو فيهِ مُتَجَمِّدٌ أَو مُتَقَطِّعٌ بَينَما
//  يَعمَلُ النَصُّ والتَأثيراتُ والصَوتُ بِطَبيعَتِها. ولا يَظهَرُ في المُعايَنةِ
//  لِأَنَّها **تُشَغِّلُ** الفيديو (فَكُّ تَرميزٍ تَتابُعيٌّ سَريع).
//  والمَقاطِعُ المُنَزَّلةُ مِن مَواقِعِ التَواصُلِ مُتَباعِدةُ الإطاراتِ المِفتاحيّة،
//  فَكُلُّ نَقلةٍ تَفُكُّ تَرميزَ ما بَينَ مِفتاحَين — ولِذا تَنقَضي المُهلة.
//
//  الآنَ نُشَغِّلُهُ بِسُرعةٍ تُطابِقُ تَقَدُّمَ التَصدير، ولا نَنقُلُ إلّا لِتَصحيحِ
//  انحِرافٍ يَتَجاوَزَ 0.12 ثانِية (حَدُّ ما تُلاحِظُهُ العَينُ في تَزامُنِ الشِفاه).
// ══════════════════════════════════════════════════════
function createRecVidSync() {
  return { lastWant: -1, resyncs: 0, playFailed: false, playAborts: 0,
           lastCurTime: -1, stalled: 0, slowSeek: false };
}

async function syncRecVidByPlayback(st, vid, wantTime, mediaDone, wallSec) {
  if (!vid || !isFinite(vid.duration)) return;
  const RESYNC_EPS = 0.12, SEEK_EPS = 0.03;
  const RATE_MIN = 0.25, RATE_MAX = 4, STALL_LIMIT = 6;

  const jumped = (wantTime + 0.05 < st.lastWant);
  st.lastWant = wantTime;
  const drift = vid.currentTime - wantTime;

  // هَل يَتَقَدَّمُ الفيديو فِعلاً؟ لا نَثِقُ بِأَنَّ play() نَجَحَ لِأَنَّهُ لَم يَرمِ خَطَأً
  if (!st.slowSeek && !jumped && st.lastCurTime >= 0) {
    if (Math.abs(vid.currentTime - st.lastCurTime) < 1e-4) {
      if (++st.stalled >= STALL_LIMIT) st.slowSeek = true;
    } else st.stalled = 0;
  }
  st.lastCurTime = vid.currentTime;

  const base = (wallSec > 0.4) ? (mediaDone / wallSec) : 0.5;
  let rate = base - drift * 1.2;
  if (!isFinite(rate)) rate = base;

  // أَبطَأُ مِمّا يُطيقُهُ التَشغيل ⇒ اِنقُل بَدَلَ أَن تُشَغِّل
  if (rate < RATE_MIN || st.slowSeek || st.playFailed) {
    if (!vid.paused) { try { vid.pause(); } catch (_) {} }
    if (jumped || Math.abs(drift) > SEEK_EPS) {
      st.resyncs++;
      await seekVideoToTime(vid, wantTime);
      st.lastCurTime = vid.currentTime;
    }
    return;
  }

  if (jumped || Math.abs(drift) > RESYNC_EPS) {
    st.resyncs++;
    try { vid.pause(); } catch (_) {}
    await seekVideoToTime(vid, wantTime);
    st.lastCurTime = vid.currentTime;
  }

  rate = Math.max(RATE_MIN, Math.min(RATE_MAX, rate));
  if (Math.abs(vid.playbackRate - rate) > 0.03) {
    try { vid.playbackRate = rate; } catch (_) {}
  }
  if (vid.paused) {
    try { vid.muted = true; await vid.play(); st.playAborts = 0; }
    catch (e) {
      // AbortError سَبَبُهُ pause() الذي نَستَدعيهِ نَحنُ — لا مَنعٌ مِنَ المُحَرِّك
      const name = (e && e.name) || "";
      if (name === "NotAllowedError" || name === "NotSupportedError") st.playFailed = true;
      else if (++st.playAborts >= 12) st.playFailed = true;
    }
  }
}

function seekVideoToTime(v, t) {
  return new Promise(resolve => {
    if (!v || !isFinite(v.duration)) return resolve();
    const target = Math.min(t, Math.max(0, v.duration - 1e-4));
    if (Math.abs(v.currentTime - target) < 0.02) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { v.removeEventListener("seeked", onSeeked); } catch (_) {}
      resolve();
    };
    const onSeeked = () => finish();
    v.addEventListener("seeked", onSeeked);
    try { v.currentTime = target; } catch (_) { finish(); return; }
    // أمان: timeout بعد 800ms
    setTimeout(finish, 800);
  });
}

// ── استخراج بايتات الفيديو من HTMLVideoElement ─────────
async function fetchVideoBytes(vid) {
  if (!vid || !vid.src) return null;
  try {
    const res = await fetch(vid.src);
    const ab  = await res.arrayBuffer();
    return ab;
  } catch (_) { return null; }
}

// ═══════════════════════════════════════════════════════
//  المحرّك الرئيسي (V2)
// ═══════════════════════════════════════════════════════
async function startDesktopExportV2(opts) {
  const {
    canvas,
    drawFrame,           // (t, frameIndex) => void  — يرسم على canvas مباشرة
    setStateForTime,     // (t) => void              — يحدّث S.currentAya/elapsed للواجهة
    setBgFrameImage,     // (img) => void            — يضع إطار الخلفية الحالي
    totalDuration,
    fps,
    audioBuffers,
    ayaStarts,
    bgBuffer,            // AudioBuffer لصوت الخلفية (اختياري)
    bgGain,
    bgLoop,
    recGain,
    bgVideo,             // HTMLVideoElement لخلفية الفيديو (اختياري)
    bgVideoBytes,        // ArrayBuffer واحد للفيديو
    bgVideoBytesList,    // Array<ArrayBuffer> لـ playlist (يضمّ في ffmpeg)
    bgClipDurations,     // مدد المقاطع الفَعّالة بَعد trim (للـ xfade)
    bgClipTrims,         // v1.2 Feature#2 — [{start,end}] لكُلّ مَقطع
    bgTransition,        // v1.2 — نَمط xfade transition (عامّ fallback)
    bgClipTransitions,   // v1.2 — [name,...] per-clip transition (فارِغ = عامّ)
    bgCrossfadeSec,      // مدة الـ crossfade بالثواني
    bgVidTrim,           // {start,end} لتقطيع فيديو الخلفية (اختياري)
    bgAudioTrim,         // {start,end} لتقطيع صوت الخلفية (اختياري)
    bgFXConfig,          // v0.11.1 — المؤثّرات الصوتيّة (recvid أو free-audio)
    codecKey,
    crf,
    preset,
    audioBitrate,
    outputPath,
    onProgress,          // (pct, label, log?) => void
    cancelRef,           // { canceled: boolean }
  } = opts;

  const fmt = EXPORT_CODECS[codecKey] || EXPORT_CODECS["mp4-h264"];
  const FPS = Math.max(1, Math.floor(fps || 30));
  const totalFrames = Math.max(1, Math.ceil(totalDuration * FPS));
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // ── 1) خلط الصوت ──────────────────────────────────
  // قطع مقطع صوت الخلفية حسب نطاق التقطيع (إن وُجد) قبل الخلط
  let bgBufferTrimmed = bgBuffer;
  if (bgBuffer && bgAudioTrim && bgAudioTrim.end > bgAudioTrim.start) {
    bgBufferTrimmed = sliceAudioBuffer(bgBuffer, bgAudioTrim.start, bgAudioTrim.end);
  }
  onProgress(2, "🎵 جاري خلط المسار الصوتي…");
  // اجمع صوت خلفيات الفيديو المُفعّل صوتها
  // v0.5.0 — يحترم توگل "كتم صوت الفيديو" العام (bg-vid-mute-audio)
  const globalMute = (typeof document !== "undefined")
    && document.getElementById("bg-vid-mute-audio")?.checked;
  // v1.2 — تَجاهُل المُعمّاة (hidden). Feature#2 — trim per-clip (dur الفَعّالة + start أَصليّ)
  // v1.2 fix — لا نُصَفّي بحَسب audioEnabled هُنا. المَقاطع الصامِتة تُبقي مَواضِعها في
  //   timeline (starts + cycleDur)، لكنّ buffer=null فتَتَخَطّاها الحَلقة الداخِليّة.
  //   قَبل الإصلاح: تَصفية audioEnabled كانت تَجعَل الحَلقة تَعتَقِد أنّ playlist أَقصر،
  //   فتُكَرِّر المَقطع النَاطِق لِمَلء totalDuration (مِثل: 30ث مَطر مُستَمِرّ).
  const _getEff = typeof getBgClipEffectiveDur === "function" ? getBgClipEffectiveDur : (it => it.dur || 0);
  const _getTs  = typeof getBgClipTrimStart    === "function" ? getBgClipTrimStart    : (_  => 0);
  const bgVidAudioItems = (typeof S !== "undefined" && Array.isArray(S.bgVidItems) && !globalMute)
    ? S.bgVidItems
        .filter(it => !it.hidden)
        .map(it => ({
          buffer: (it.audioEnabled && it.audioBuffer) ? it.audioBuffer : null,
          gain: it.audioGain,
          dur: _getEff(it),
          trimStart: _getTs(it),
        }))
    : [];
  const mixed = await mixAudioToBuffer({
    audioBuffers, ayaStarts,
    bgBuffer: bgBufferTrimmed, bgGain, bgLoop,
    bgVidAudioItems,
    bgVidCrossfadeSec: bgCrossfadeSec || 0,
    totalDuration, recGain,
    bgFXConfig,        // v0.11.1
  });
  const wavAb = audioBufferToWav(mixed);
  if (cancelRef?.canceled) throw new Error("cancelled");

  // ── 1.5) بيانات الموجة الصوتية لكل إطار (FFT مسبق) ──
  onProgress(3, "📊 حساب بيانات الموجة الصوتية…");
  const exportWaveData = precomputeWaveDataForExport(mixed, totalFrames, FPS);

  // ── 2) كتابة الصوت في ملف مؤقت ─────────────────────
  onProgress(4, "💾 حفظ المسار الصوتي…");
  const audioPath = await window.SIRM.writeTempBuffer(wavAb, "wav");

  // ── 3) استخراج إطارات فيديو الخلفية مسبقاً (إن وُجد) ──
  let bgFramesDir = null;
  let bgFramePaths = null;
  const hasMulti = Array.isArray(bgVideoBytesList) && bgVideoBytesList.length > 1;
  if (bgVideo || bgVideoBytes || hasMulti) {
    try {
      if (hasMulti) {
        onProgress(5, `🎥 ضمّ ${bgVideoBytesList.length} مقاطع خلفية…`);
      } else {
        onProgress(5, "🎥 جاري قراءة فيديو الخلفية…");
      }
      const vidBytes = !hasMulti ? (bgVideoBytes || (bgVideo ? await fetchVideoBytes(bgVideo) : null)) : null;
      if (vidBytes || hasMulti) {
        onProgress(6, "🎞 استخراج إطارات الخلفية مسبقاً عبر ffmpeg…");
        const extracted = await window.SIRM.extractBgFrames({
          videoBytes: vidBytes,
          videoBytesList: hasMulti ? bgVideoBytesList : null,
          clipDurations:  hasMulti ? bgClipDurations : null,
          clipTrims:      hasMulti ? bgClipTrims : null,      // v1.2 Feature#2
          transition:     hasMulti ? (bgTransition || "fade") : null,
          clipTransitions: hasMulti ? (bgClipTransitions || null) : null,  // v1.2 per-clip
          crossfadeSec:   hasMulti ? bgCrossfadeSec  : 0,
          fps: FPS,
          width:  W,
          height: H,
          totalDuration,
          trimStart: hasMulti ? undefined : bgVidTrim?.start,
          trimEnd:   hasMulti ? undefined : bgVidTrim?.end,
        });
        bgFramesDir  = extracted.dir;
        bgFramePaths = extracted.files;
        console.log(`[V2] bg frames extracted: ${bgFramePaths?.length || 0} files (expected ~${totalFrames})`);
        if (!bgFramePaths || bgFramePaths.length < 2) {
          console.warn("[V2] only", bgFramePaths?.length, "bg frames produced — bg will appear static");
        }
      } else {
        console.warn("Could not fetch bg video bytes — falling back to live video element");
      }
    } catch (e) {
      console.warn("bg frame extraction failed:", e);
      bgFramesDir = null; bgFramePaths = null;
    }
  }
  if (cancelRef?.canceled) {
    if (bgFramesDir) { try { await window.SIRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    try { await window.SIRM.deleteTempFile(audioPath); } catch (_) {}
    throw new Error("cancelled");
  }

  // ── 4) تشغيل ffmpeg ─ raw RGBA ───────────────────
  onProgress(7, "🎬 بدء ffmpeg…");
  await window.SIRM.ffmpegPipeStart({
    fps: FPS,
    audioPath,
    outputPath,
    codec:        fmt.codec,
    crf:          (crf != null) ? crf : fmt.defaultCrf,
    preset:       preset || "medium",
    audioCodec:   fmt.audioCodec,
    audioBitrate: audioBitrate || "192k",
    width:        W,
    height:       H,
    pixFormat:    "rgba",
  });

  // ── 5) حلقة الإطارات (حتمية وسريعة) ────────────────
  //    تحميل الـ ImageBitmap مسبقاً بـ 6 إطارات أمام
  //    لإخفاء كلفة IPC + JPEG decode خلف الترميز
  const PREFETCH = 6;
  const bmpCache = new Map();   // index -> Promise<ImageBitmap | null>

  let bmpLoadErrors = 0;
  const prefetch = (idx) => {
    if (!bgFramePaths) return;
    for (let k = idx; k < Math.min(bgFramePaths.length, idx + PREFETCH); k++) {
      if (!bmpCache.has(k)) {
        bmpCache.set(k, loadBitmapFromPath(bgFramePaths[k]).catch(err => {
          if (bmpLoadErrors++ < 3) console.warn("bg bmp load failed:", bgFramePaths[k], err);
          return null;
        }));
      }
    }
  };

  let lastUiTick = 0;
  const recSync = createRecVidSync();          // v1.4
  const recSyncT0 = performance.now();

  // v1.4 — تَشريحُ زَمَنِ التَصدير. نُسخةُ الهاتِفِ تَعرِضُ هذا مُنذُ v1.2.2،
  //   وسَطحُ المَكتَبِ كانَ يَعرِضُ شَريطَ تَقَدُّمٍ لا غَير. بِلا قِياسٍ لا يُعرَفُ
  //   أَينَ تَذهَبُ الثَواني، وكُلُّ «تَسريعٍ» بَعدَهُ تَخمين.
  const _dtProf = {
    frames: 0, bgLoad: 0, recSync: 0, draw: 0, readback: 0, pipe: 0,
    t0: performance.now(),
  };
  try {
    for (let i = 0; i < totalFrames; i++) {
      if (cancelRef?.canceled) throw new Error("cancelled");

      const t = i / FPS;

      // إطار الخلفية المسبق
      const _tBg = performance.now();
      if (bgFramePaths) {
        const idx = Math.min(i, bgFramePaths.length - 1);
        prefetch(idx);
        const bmp = await bmpCache.get(idx);
        if (setBgFrameImage) setBgFrameImage(bmp || null);
        // حرّر القديم لتفادي تضخم الذاكرة
        const oldKey = idx - PREFETCH;
        if (bmpCache.has(oldKey)) {
          const old = await bmpCache.get(oldKey);
          if (old && old.close) try { old.close(); } catch (_) {}
          bmpCache.delete(oldKey);
        }
      }
      _dtProf.bgLoad += performance.now() - _tBg;

      // بيانات الموجة الصوتية للإطار الحالي (V2 يخلط الصوت offline فلا توجد analyser data)
      S._exportWaveData = exportWaveData[i];
      if (setStateForTime) setStateForTime(t);
      // v1.4 — مُزامَنةُ فيديو التِلاوةِ بِالتَشغيلِ (اُنظُر syncRecVidByPlayback)
      if (S.recVidEl && typeof ge === "function" && ge("recvid-on")) {
        const _tRec = performance.now();
        const _src = (typeof recvidSourceTime === "function") ? recvidSourceTime(t) : t;
        await syncRecVidByPlayback(recSync, S.recVidEl, _src, t,
                                   (performance.now() - recSyncT0) / 1000);
        _dtProf.recSync += performance.now() - _tRec;
      }
      const _tDraw = performance.now();
      drawFrame(t);
      _dtProf.draw += performance.now() - _tDraw;

      const _tRead = performance.now();
      const frameBuf = canvasToRgbaBuffer(ctx, W, H);
      _dtProf.readback += performance.now() - _tRead;

      const _tPipe = performance.now();
      await window.SIRM.ffmpegPipeFrame(frameBuf);
      _dtProf.pipe += performance.now() - _tPipe;
      _dtProf.frames++;

      const now = performance.now();
      if (now - lastUiTick > 200 || i === totalFrames - 1) {
        lastUiTick = now;
        const encodePct = Math.round(((i + 1) / totalFrames) * 90);
        onProgress(7 + encodePct, `🎞 إطار ${i + 1}/${totalFrames}  ·  ${formatTime(t)} / ${formatTime(totalDuration)}`);
      }
    }
  } catch (err) {
    try { window.SIRM.ffmpegPipeCancel(); } catch (_) {}
    try { await window.SIRM.deleteTempFile(audioPath); } catch (_) {}
    if (bgFramesDir) { try { await window.SIRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    if (setBgFrameImage) setBgFrameImage(null);
    S._exportWaveData = null;
    throw err;
  }

  // ── 6) إغلاق وإنهاء ffmpeg ─────────────────────────
  // v1.4 — اِنشُرِ القِياسَ لِتَعرِضَهُ نافِذةُ النَتيجةِ كَما في الهاتِف
  _dtProf.wall = performance.now() - _dtProf.t0;
  _dtProf.recResyncs = recSync.resyncs;
  _dtProf.recMode = recSync.playFailed ? "نَقل (تَعَذَّرَ التَشغيل)"
                  : recSync.slowSeek   ? "نَقل (التَشغيلُ لَم يَتَقَدَّم)"
                  : "تَشغيل";
  S._lastExportProfile = _dtProf;

  onProgress(98, "📦 جاري إنهاء التغليف…");
  try {
    await window.SIRM.ffmpegPipeEnd();
  } finally {
    _restoreRecVidAfterExport();   // v1.4
    try { await window.SIRM.deleteTempFile(audioPath); } catch (_) {}
    if (bgFramesDir) { try { await window.SIRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    if (setBgFrameImage) setBgFrameImage(null);
    S._exportWaveData = null;
    // أغلق جميع ImageBitmaps المتبقية
    for (const v of bmpCache.values()) {
      try { const bmp = await v; if (bmp && bmp.close) bmp.close(); } catch (_) {}
    }
    bmpCache.clear();
  }

  onProgress(100, "✅ اكتمل التصدير!");
  return { ok: true, outputPath };
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

// ── تصدير عمومي ───────────────────────────────────────
window.EXPORT_CODECS         = EXPORT_CODECS;
window.startDesktopExportV2  = startDesktopExportV2;
window.audioBufferToWav      = audioBufferToWav;
