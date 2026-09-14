"use strict";

// ══════════════════════════════════════════════════════════════
//  GT-SIRM — تَحديثٌ مُباشِرٌ يَعرِفُ نَوعَ الحُزمةِ المُثَبَّتة (v1.4)
//  ───────────────────────────────────────────────────────────
//  كانَ التَحديثُ يَفتَحُ صَفحةَ الإصدارِ في المُتَصَفِّحِ ويَترُكُ المُستَخدِمَ
//  يَختارُ الحُزمةَ بِنَفسِه. الآنَ نَكتَشِفُ كَيفَ رُكِّبَ البَرنامَجُ فَنَجلِبُ
//  الحُزمةَ المُوافِقةَ وَحدَها ونُرَكِّبُها — AppImage تَستَبدِلُ نَفسَها،
//  وdeb/rpm يُسَلَّمانِ لِمُديرِ حُزَمِ النِظامِ عَبرَ pkexec. (نَهجُ GMD.)
//
//  التَنزيلُ **يُستَأنَفُ** مِن حَيثُ تَوَقَّف (تَرويسةُ Range): انقِطاعُ الشَبَكةِ
//  لَم يَعُد يَعني البَدءَ مِنَ الصِفر. ولا يُعلَنُ الاكتِمالُ إلّا بَعدَ مُطابَقةِ
//  الطولِ — والجُزءُ النّاقِصُ يَبقى رَصيداً لِلمُحاوَلةِ التالِيةِ لا يُمحى.
//
//  الوَحدةُ نَقيّةٌ مِن Electron عَمداً (لا `app` ولا `ipcMain`) لِتُختَبَرَ
//  بِـnode وَحدَه.
// ══════════════════════════════════════════════════════════════

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const http = require("http");
const { execFile } = require("child_process");

function runCmd(cmd, args, timeout) {
  return new Promise(resolve => {
    try {
      execFile(cmd, args, { timeout: timeout || 15000 }, (err, stdout) =>
        resolve(err ? null : String(stdout || "").trim()));
    } catch (_) { resolve(null); }
  });
}

async function detectPackageKind(env, execPath) {
  const E = env || process.env;
  const exe = execPath || process.execPath;
  // AppImage يُصَدِّرُ APPIMAGE بِمَسارِ الصورةِ العامِلة
  if (E.APPIMAGE && fs.existsSync(E.APPIMAGE)) {
    return { kind: "appimage", target: E.APPIMAGE, ext: ".AppImage" };
  }
  if (await runCmd("dpkg", ["-S", exe])) return { kind: "deb", target: exe, ext: ".deb" };
  if (await runCmd("rpm", ["-qf", exe]))  return { kind: "rpm", target: exe, ext: ".rpm" };
  return { kind: "unknown", target: exe, ext: null };
}

function updatesDir() {
  const d = path.join(os.tmpdir(), "gt-sirm-updates");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function requestOnce(u, have, insecure) {
  return new Promise((resolve, reject) => {
    const mod = /^http:/i.test(u) ? http : https;
    const headers = have > 0 ? { Range: "bytes=" + have + "-" } : {};
    const opts = { headers: headers };
    if (insecure) opts.rejectUnauthorized = false;
    mod.get(u, opts, res => {
      if ([301, 302, 303, 307, 308].indexOf(res.statusCode) !== -1 && res.headers.location) {
        res.resume();
        return resolve(requestOnce(res.headers.location, have, insecure));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      resolve({ res: res, resumed: res.statusCode === 206 && have > 0 });
    }).on("error", reject);
  });
}

/**
 * يُنَزِّلُ حُزمةَ التَحديثِ مُستَأنِفاً ما سَبَق.
 * opts: { url, name, allowInsecure? }  ·  onProgress({received,total,percent,resumed})
 */
async function downloadUpdate(opts, onProgress) {
  const url = opts && opts.url;
  const name = opts && opts.name;
  const insecure = !!(opts && opts.allowInsecure);
  if (!url || !/^https?:/i.test(url)) throw new Error("رابِطُ التَحديثِ غَيرُ صالِح");
  if (!insecure && !/^https:/i.test(url)) throw new Error("رابِطُ التَحديثِ يَجِبُ أن يَكونَ https");

  const dir = (opts && opts.dir) || updatesDir();
  fs.mkdirSync(dir, { recursive: true });
  const safe = String(name || "update").replace(/[^A-Za-z0-9._-]/g, "_");
  const dest = path.join(dir, safe);
  const part = dest + ".part";

  // حُزمةٌ مُكتَمِلةٌ بِنَفسِ الاسمِ مِن قَبل ⇒ لا تُنَزَّلُ مِن جَديد
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0 && !fs.existsSync(part)) {
    return { path: dest, bytes: fs.statSync(dest).size, cached: true, resumed: false };
  }

  let have = fs.existsSync(part) ? fs.statSync(part).size : 0;
  const got = await requestOnce(url, have, insecure);
  const res = got.res;
  const resumed = got.resumed;
  if (!resumed) have = 0;   // رَفَضَ الخادِمُ الاستِئناف ⇒ نَبدَأُ مِن جَديدٍ بِأَمان

  let total = -1;
  const cr = res.headers["content-range"];
  if (resumed && cr && cr.indexOf("/") !== -1) total = parseInt(cr.split("/")[1], 10) || -1;
  if (total < 0) {
    const cl = parseInt(res.headers["content-length"] || "0", 10);
    if (cl > 0) total = cl + have;
  }

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(part, { flags: resumed ? "a" : "w" });
    let received = have, lastEmit = 0, settled = false;

    // ⚠️ الانقِطاعُ يَجِبُ أن يُغلِقَ المَلَفَّ ويَنتَظِرَ إفراغَ المَخزَنِ قَبلَ
    //   الرَفض. بِلا ذلكَ تَضيعُ البايتاتُ المُستَلَمة (قَد لا يُفتَحُ المَلَفُّ
    //   أَصلاً، إذ فَتحُ `createWriteStream` غَيرُ مُتَزامِن) — فَلا يَبقى
    //   جُزءٌ يُستَأنَفُ مِنه، ويَبدَأُ التَنزيلُ التالي مِنَ الصِفرِ رَغمَ الوَعد.
    //   أَمسَكَ هذا اختِبارُ `test_updater.js` قَبلَ أن يَصِلَ المُستَخدِم.
    const done = (err) => {
      if (settled) return;
      settled = true;
      out.end(() => { err ? reject(err) : resolve(); });
    };

    res.on("data", chunk => {
      received += chunk.length;
      const now = Date.now();
      if (onProgress && now - lastEmit > 300) {
        lastEmit = now;
        onProgress({
          received: received, total: total,
          percent: total > 0 ? Math.floor(received * 100 / total) : -1,
          resumed: resumed,
        });
      }
    });
    res.on("error", done);
    res.on("aborted", () => done(new Error("اِنقَطَعَ الاتِّصال")));
    out.on("error", done);
    res.on("end", () => done(null));
    res.pipe(out, { end: false });
  });

  const size = fs.statSync(part).size;
  if (total > 0 && size !== total) {
    // ناقِص: أَبقِ الجُزءَ لِيُستَأنَفَ ولا تَدَّعِ اكتِمالاً
    throw new Error("التَنزيلُ ناقِص (" + size + "/" + total + ") — أَعِد المُحاوَلةَ لِيُستَكمَل");
  }
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(part, dest);
  return { path: dest, bytes: size, resumed: resumed, cached: false };
}

/** يُرَكِّبُ الحُزمةَ بِحَسَبِ نَوعِها. لا يَدَّعي نَجاحاً لَم يَقَع. */
async function installUpdate(opts) {
  const filePath = opts && opts.filePath;
  const kind = opts && opts.kind;
  if (!filePath || !fs.existsSync(filePath)) throw new Error("مَلَفُّ التَحديثِ غَيرُ مَوجود");

  if (kind === "appimage") {
    const target = (opts && opts.target) || process.env.APPIMAGE;
    if (!target) throw new Error("لَم يُعرَف مَسارُ AppImage العامِل");
    fs.copyFileSync(filePath, target + ".new");
    fs.chmodSync(target + ".new", 0o755);
    fs.renameSync(target + ".new", target);
    return { ok: true, kind: kind, needsRestart: true };
  }

  const tries = kind === "deb"
    ? [["apt", ["install", "-y", filePath]], ["dpkg", ["-i", filePath]]]
    : kind === "rpm"
    ? [["dnf", ["install", "-y", filePath]],
       ["zypper", ["--non-interactive", "install", "--allow-unsigned-rpm", filePath]],
       ["rpm", ["-U", "--force", filePath]]]
    : [];

  for (const pair of tries) {
    const ok = await new Promise(resolve => {
      try {
        execFile("pkexec", [pair[0]].concat(pair[1]), { timeout: 300000 }, err => resolve(!err));
      } catch (_) { resolve(false); }
    });
    if (ok) return { ok: true, kind: kind, needsRestart: true };
  }
  return { ok: false, kind: kind, filePath: filePath };
}

/** يَنتَقي الأَصلَ المُوافِقَ لِنَوعِ الحُزمةِ مِن أُصولِ الإصدار. */
function pickAsset(assets, kind) {
  const list = Array.isArray(assets) ? assets : [];
  const by = re => list.find(a => re.test((a && a.name) || "")) || null;
  if (kind === "appimage") return by(/\.AppImage$/i);
  if (kind === "deb")      return by(/\.deb$/i);
  if (kind === "rpm")      return by(/\.rpm$/i);
  return null;
}

module.exports = { detectPackageKind, downloadUpdate, installUpdate, pickAsset, updatesDir };
