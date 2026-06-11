"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, execFile, exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

const isDev = process.env.NODE_ENV === "development";

// ── ضبط هويّة التطبيق على Linux (مهمّ للـ WM_CLASS وأيقونة taskbar) ──
// يجب أن يأتي قبل أيّ شيء آخر
app.setName("GT-SIRM");
process.title = "GT-SIRM";
app.commandLine.appendSwitch("class", "GT-SIRM");

// مسار الأيقونة المُعتمَد
const ICON_PATH = path.join(__dirname, "../..", "GT-SIRM-icons", "all", "512x512", "GT-SIRM-icon.png");
const APP_ICON = (() => {
  try { return nativeImage.createFromPath(ICON_PATH); } catch (_) { return null; }
})();

// ── تثبيت .desktop file مؤقّت في وضع التطوير على Linux ─────────────
// السبب: في dev mode، مدير النوافذ لا يجد الأيقونة من BrowserWindow.icon
// الحلّ: نسجّل ملفّاً مؤقّتاً في ~/.local/share/applications/ يربط WM_CLASS=GT-SIRM
// بمسار الأيقونة، فيلتقطه GNOME/KDE/Cinnamon... تلقائياً.
// عند الحزم في AppImage/DEB/RPM يتولّى electron-builder توليد .desktop صحيح،
// فيتمّ تجاوز هذا الجزء.
function installDevDesktopFile() {
  if (process.platform !== "linux" || !isDev) return;
  try {
    const appsDir = path.join(os.homedir(), ".local", "share", "applications");
    fs.mkdirSync(appsDir, { recursive: true });
    const desktopPath = path.join(appsDir, "gt-sirm-dev.desktop");
    const content = `[Desktop Entry]
Name=GT-SIRM (dev)
Comment=GnuTux Short Islamic Reels Maker — Development Mode
Exec=electron .
Icon=${ICON_PATH}
Terminal=false
Type=Application
StartupWMClass=GT-SIRM
Categories=AudioVideo;Video;GTK;
NoDisplay=true
`;
    fs.writeFileSync(desktopPath, content, "utf8");
    // محاولة تحديث icon cache (يعمل على Cinnamon/GNOME، فشله غير مهمّ)
    try {
      exec(`update-desktop-database "${appsDir}" 2>/dev/null`);
    } catch (_) {}
    console.log("[GT-SIRM] Dev .desktop file installed:", desktopPath);
  } catch (e) {
    console.warn("[GT-SIRM] Could not install dev .desktop file:", e.message);
  }
}

installDevDesktopFile();

// خريطة لتخزين المسارات بعد العثور عليها (تخزين مؤقت)
const binaryPaths = {
  ffmpeg: null,
  "yt-dlp": null
};

// قائمة بالمسارات الإضافية للبحث (بجانب PATH)
const EXTRA_PATHS = [
  "/usr/bin",
"/usr/local/bin",
"/opt/bin",
path.join(os.homedir(), ".local/bin"),
path.join(os.homedir(), "bin"),
// في حالة AppImage، المسار النسبي للمجلد bin بجانب التنفيذي
];

/**
 * البحث عن ملف تنفيذي في PATH وفي المسارات الإضافية
 * @param {string} name - اسم الملف التنفيذي (مثل 'ffmpeg' أو 'yt-dlp')
 * @returns {Promise<string|null>} المسار الكامل أو null إذا لم يوجد
 */
async function findBinary(name) {
  // إذا كان مخزناً مؤقتاً، أعده مباشرة
  if (binaryPaths[name]) return binaryPaths[name];

  // 1. البحث في PATH باستخدام which
  try {
    const { stdout } = await execPromise(`which ${name}`);
    const pathFromWhich = stdout.trim();
    if (pathFromWhich && fs.existsSync(pathFromWhich)) {
      binaryPaths[name] = pathFromWhich;
      return pathFromWhich;
    }
  } catch (e) {
    // which فشل، تابع البحث
  }

  // 2. البحث في المسارات الإضافية
  for (const base of EXTRA_PATHS) {
    const fullPath = path.join(base, name);
    if (fs.existsSync(fullPath)) {
      binaryPaths[name] = fullPath;
      return fullPath;
    }
  }

  // 3. في وضع الإنتاج (AppImage) ابحث بجانب التطبيق
  if (!isDev) {
    const appDir = path.dirname(app.getPath("exe"));
    const localBin = path.join(appDir, "bin", name);
    if (fs.existsSync(localBin)) {
      binaryPaths[name] = localBin;
      return localBin;
    }
  }

  // لم يتم العثور
  return null;
}

/**
 * الحصول على مسار الملف التنفيذي (مع تخزين مؤقت)
 */
async function getBinPath(name) {
  if (isDev) {
    // في وضع التطوير، نفضل البحث في PATH أولاً ثم الإضافية
    return await findBinary(name);
  } else {
    // في الإنتاج، نفضل المجلد المحلي أولاً، ثم النظام
    const appDir = path.dirname(app.getPath("exe"));
    const localBin = path.join(appDir, "bin", name);
    if (fs.existsSync(localBin)) return localBin;
    return await findBinary(name);
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "GT-SIRM — GnuTux Short Islamic Reels Maker",
    icon: APP_ICON || ICON_PATH,
    backgroundColor: "#020b05",
                                 webPreferences: {
                                   preload: path.join(__dirname, "../preload/preload.js"),
                                 contextIsolation: true,
                                 nodeIntegration: false,
                                 sandbox: false,
                                 webSecurity: true,
                                 allowRunningInsecureContent: false,
                                 },
  });

  // تطبيق الأيقونة صراحةً (مهمّ على Linux في وضع التطوير)
  if (APP_ICON) {
    try { mainWindow.setIcon(APP_ICON); } catch (_) {}
    // إعادة تطبيق بعد ready-to-show لأنّ بعض WMs لا يلتقطون الأيقونة قبل العرض الأوّل
    mainWindow.once("ready-to-show", () => {
      try { mainWindow.setIcon(APP_ICON); } catch (_) {}
    });
  }

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.webContents.on("console-message", (_e, level, msg) => {
    if (isDev) console.log(`[Renderer] ${msg}`);
  });

  // قائمة سياقية محسنة للنسخ واللصق في أي مكان
  mainWindow.webContents.on("context-menu", (_e, params) => {
    const { editFlags, isEditable, linkURL, selectionText } = params;
    const { Menu, MenuItem } = require("electron");
    const menu = new Menu();

    // إذا كان هناك نص محدد، أضف خيار نسخ
    if (selectionText) {
      menu.append(new MenuItem({ label: "نسخ النص", role: "copy" }));
    }
    // إذا كان هناك رابط، أضف خيار نسخ الرابط
    if (linkURL) {
      menu.append(new MenuItem({
        label: "نسخ الرابط",
        click: () => { clipboard.writeText(linkURL); }
      }));
    }
    // خيارات التحرير للحقول القابلة للتحرير
    if (isEditable) {
      if (editFlags.canCut)   menu.append(new MenuItem({ label: "قص",   role: "cut" }));
      if (editFlags.canCopy)  menu.append(new MenuItem({ label: "نسخ",  role: "copy" }));
      if (editFlags.canPaste) menu.append(new MenuItem({ label: "لصق",  role: "paste" }));
      menu.append(new MenuItem({ type: "separator" }));
      if (editFlags.canSelectAll) menu.append(new MenuItem({ label: "تحديد الكل", role: "selectAll" }));
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow });
    }
  });

  // v0.5.8 — حماية الإغلاق مع modal مخصّص
  mainWindow.on("close", (e) => {
    if (mainWindow._allowClose) return;
    e.preventDefault();
    mainWindow.webContents.send("request-close-confirm");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("confirm-close", () => {
  if (mainWindow) {
    mainWindow._allowClose = true;
    mainWindow.close();
  }
});

// ══════════════════════════════════════════════════════
//  v0.12.0 — إدارة مجلّد العمل (Work Directory)
// ══════════════════════════════════════════════════════
const WORK_DIR_CONFIG_FILE = path.join(app.getPath("userData"), "work-dir-config.json");
const WORK_DIR_SUBFOLDERS = [
  { key: "projects",     name: "projects",     emoji: "📁", desc: "ملفّات المشاريع .gtsirm" },
  { key: "bgVideos",     name: "bg-videos",    emoji: "🎬", desc: "فيديوهات الخلفيّة (يدويّ + yt-dlp)" },
  { key: "bgAudio",      name: "bg-audio",     emoji: "🎵", desc: "صوت الخلفيّة" },
  { key: "recitations",  name: "recitations",  emoji: "🎥", desc: "فيديوهات التَلاوة الجاهزة" },
  { key: "customAudio",  name: "custom-audio", emoji: "🎤", desc: "الصوت المخصّص المُنزَّل (OGG)" },
  { key: "logos",        name: "logos",        emoji: "🖼️", desc: "الشعارات المخصّصة" },
  { key: "exports",      name: "exports",      emoji: "📤", desc: "المقاطع المُصدَّرة" },
  { key: "recordings",   name: "recordings",   emoji: "🎙️", desc: "تَسجيلات الميكروفون" },
];

function getDefaultWorkDir() {
  // مَسار افتراضيّ: ~/Documents/مجلد عمل ريلز إسلامية/
  const folderName = "مجلد عمل ريلز إسلامية";
  try {
    return path.join(app.getPath("documents"), folderName);
  } catch (_) {
    return path.join(os.homedir(), "Documents", folderName);
  }
}

function loadWorkDirConfig() {
  try {
    if (fs.existsSync(WORK_DIR_CONFIG_FILE)) {
      const raw = fs.readFileSync(WORK_DIR_CONFIG_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function saveWorkDirConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(WORK_DIR_CONFIG_FILE), { recursive: true });
    fs.writeFileSync(WORK_DIR_CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch (_) { return false; }
}

function ensureWorkDirStructure(rootPath) {
  fs.mkdirSync(rootPath, { recursive: true });
  for (const f of WORK_DIR_SUBFOLDERS) {
    fs.mkdirSync(path.join(rootPath, f.name), { recursive: true });
  }
  // README مساعِد للمستخدم
  const readmePath = path.join(rootPath, "اقرأني.md");
  if (!fs.existsSync(readmePath)) {
    const readme = "# مجلّد عمل ريلز إسلامية — GT-SIRM\n\n" +
      "هذا المجلّد يَحوي كلّ مَصادر مَشاريعك الإسلاميّة في مَكان واحد:\n\n" +
      WORK_DIR_SUBFOLDERS.map(f => `- ${f.emoji} **${f.name}/** — ${f.desc}`).join("\n") +
      "\n\n## نقل المجلّد\n\nمن داخل البرنامج: **الإعدادات → مجلّد العمل → 🚚 نقل المجلّد**.\n\n" +
      "بُنِيَ ابتغاءَ وجه الله الكريم — اللهمّ تَقبَّل من كلّ مُساهم.\n";
    try { fs.writeFileSync(readmePath, readme, "utf8"); } catch (_) {}
  }
  return true;
}

// IPC: يَعود بمَسار مجلّد العمل الحاليّ (أو ينشئه على المسار الافتراضيّ)
ipcMain.handle("workdir-get", () => {
  const cfg = loadWorkDirConfig();
  const dir = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
  const subfolders = {};
  for (const f of WORK_DIR_SUBFOLDERS) subfolders[f.key] = path.join(dir, f.name);
  return {
    path: dir,
    isDefault: !(cfg && cfg.path),
    exists: fs.existsSync(dir),
    subfolders,
    structure: WORK_DIR_SUBFOLDERS,
  };
});

// IPC: ينشئ بنية المجلّد على المَسار الحاليّ
ipcMain.handle("workdir-ensure", async () => {
  const cfg = loadWorkDirConfig();
  const dir = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
  try {
    ensureWorkDirStructure(dir);
    if (!cfg) saveWorkDirConfig({ path: dir });
    return { ok: true, path: dir };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// IPC: نَقل المجلّد إلى مَسار جديد (مع نَسخ المحتويات إن طُلب)
ipcMain.handle("workdir-move", async (_e, opts) => {
  const { newPath, copyContents } = opts || {};
  if (!newPath) return { ok: false, error: "newPath مَطلوب" };
  const oldCfg = loadWorkDirConfig();
  const oldPath = (oldCfg && oldCfg.path) ? oldCfg.path : getDefaultWorkDir();
  try {
    ensureWorkDirStructure(newPath);
    if (copyContents && fs.existsSync(oldPath) && oldPath !== newPath) {
      // نسخ المُحتوى من القديم للجديد (لا حذف)
      for (const f of WORK_DIR_SUBFOLDERS) {
        const src = path.join(oldPath, f.name);
        const dst = path.join(newPath, f.name);
        if (!fs.existsSync(src)) continue;
        for (const item of fs.readdirSync(src)) {
          const srcItem = path.join(src, item);
          const dstItem = path.join(dst, item);
          if (fs.existsSync(dstItem)) continue;
          try { fs.copyFileSync(srcItem, dstItem); } catch (_) {}
        }
      }
    }
    saveWorkDirConfig({ path: newPath });
    return { ok: true, path: newPath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// IPC: نَسخ ملفّ خارجيّ إلى المجلّد الفرعيّ المناسب من مجلّد العمل
// v0.13.0 — حِفظ buffer مُباشَر في مجلّد عَمل فَرعيّ (تَسجيلات الميكروفون)
ipcMain.handle("workdir-save-buffer", async (_e, opts) => {
  const { buffer, filename, subfolderKey } = opts || {};
  if (!buffer || !filename || !subfolderKey) {
    return { ok: false, error: "buffer / filename / subfolderKey مَطلوبة" };
  }
  const cfg = loadWorkDirConfig();
  const root = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
  const subfolder = WORK_DIR_SUBFOLDERS.find(f => f.key === subfolderKey);
  if (!subfolder) return { ok: false, error: "subfolderKey غير معروف" };
  const targetDir = path.join(root, subfolder.name);
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    let targetPath = path.join(targetDir, filename);
    if (fs.existsSync(targetPath)) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      let n = 1;
      while (fs.existsSync(path.join(targetDir, `${base}-${n}${ext}`)) && n < 1000) n++;
      targetPath = path.join(targetDir, `${base}-${n}${ext}`);
    }
    fs.writeFileSync(targetPath, Buffer.from(buffer));
    return { ok: true, path: targetPath };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

ipcMain.handle("workdir-import-file", async (_e, opts) => {
  const { sourcePath, subfolderKey, moveFile } = opts || {};
  if (!sourcePath || !subfolderKey) return { ok: false, error: "sourcePath و subfolderKey مَطلوبان" };
  const cfg = loadWorkDirConfig();
  const root = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
  const subfolder = WORK_DIR_SUBFOLDERS.find(f => f.key === subfolderKey);
  if (!subfolder) return { ok: false, error: "subfolderKey غير معروف" };
  const targetDir = path.join(root, subfolder.name);
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const fileName = path.basename(sourcePath);
    const targetPath = path.join(targetDir, fileName);
    if (fs.existsSync(targetPath)) {
      // اسم مكرَّر — أضِف رقم
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      let n = 1;
      let candidate;
      do {
        candidate = path.join(targetDir, `${base}-${n}${ext}`);
        n++;
      } while (fs.existsSync(candidate) && n < 100);
      if (moveFile) fs.renameSync(sourcePath, candidate);
      else          fs.copyFileSync(sourcePath, candidate);
      return { ok: true, path: candidate };
    } else {
      if (moveFile) fs.renameSync(sourcePath, targetPath);
      else          fs.copyFileSync(sourcePath, targetPath);
      return { ok: true, path: targetPath };
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// IPC: فَتح المجلّد في file manager للنظام
ipcMain.handle("workdir-open", async () => {
  const cfg = loadWorkDirConfig();
  const dir = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
  try {
    const { shell } = require("electron");
    await shell.openPath(dir);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
});

// v0.5.7 — فتح ملفّ .gtsirm من سطر الأوامر (Linux/Windows) أو File Association
let _pendingProjectFile = null;
function extractProjectFileArg(argv) {
  for (const a of argv.slice(1)) {
    if (a && a.toLowerCase().endsWith(".gtsirm") && fs.existsSync(a)) return a;
  }
  return null;
}
_pendingProjectFile = extractProjectFileArg(process.argv);

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("project-open-from-disk", filePath);
  } else {
    _pendingProjectFile = filePath;
  }
});

// منع تشغيل عدّة نسخ: تمرير ملفّ المشروع للنسخة الموجودة
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const f = extractProjectFileArg(argv);
    if (f && mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("project-open-from-disk", f);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  if (_pendingProjectFile && mainWindow) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send("project-open-from-disk", _pendingProjectFile);
      _pendingProjectFile = null;
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ═══════════════════════════════════════════════════════
//  IPC HANDLERS
// ═══════════════════════════════════════════════════════

ipcMain.handle("check-deps", async () => {
  const results = {};

  // ffmpeg: يكتب الإصدار في stderr (الأمر الصحيح هو -version)
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) {
    results["ffmpeg"] = { ok: false, version: null };
  } else {
    try {
      // ffmpeg يكتب مخرجاته في stderr
      const { stdout, stderr } = await execPromise(
        `"${ffmpegPath}" -version`,
        { timeout: 5000 }
      ).catch(err => ({ stdout: err.stdout || "", stderr: err.stderr || "" }));
      const combined = (stdout + " " + stderr).trim();
      const ver = combined.split("\n")[0].trim();
      results["ffmpeg"] = { ok: !!ver, version: ver };
    } catch (_) {
      results["ffmpeg"] = { ok: false, version: null };
    }
  }

  // yt-dlp: يكتب الإصدار في stdout مع --version
  const ytdlpPath = await getBinPath("yt-dlp");
  if (!ytdlpPath) {
    results["yt-dlp"] = { ok: false, version: null };
  } else {
    try {
      const { stdout } = await execPromise(
        `"${ytdlpPath}" --version`,
        { timeout: 8000 }
      );
      const ver = stdout.trim().split("\n")[0];
      results["yt-dlp"] = { ok: !!ver, version: ver };
    } catch (err) {
      // حتى لو exit code != 0، إذا وجد path فهو موجود
      results["yt-dlp"] = { ok: !!ytdlpPath, version: "installed" };
    }
  }

  return results;
});

// ═══════════════════════════════════════════════════════
//  FRAME-PIPE ENCODER (محرك حتمي إطار-بإطار)
//  يستقبل إطارات JPEG عبر IPC ويضخّها لـ stdin
//  مع ملف صوت WAV لمزامنة الفيديو والصوت إلى إخراج واحد
// ═══════════════════════════════════════════════════════
const pipeState = { proc: null, stderr: "", canceled: false, drainResolver: null, lastProgressSent: 0 };

function awaitDrain(stream) {
  if (!stream || stream.writableNeedDrain === false) return Promise.resolve();
  return new Promise(res => stream.once("drain", res));
}

ipcMain.handle("ffmpeg-pipe-start", async (event, opts) => {
  const {
    fps, audioPath, outputPath,
    codec, crf, preset,
    audioCodec, audioBitrate,
    width, height,
    pixFormat,   // "rgba" (افتراضي/أسرع) | "mjpeg"
  } = opts;

  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) throw new Error("ffmpeg not found");

  if (pipeState.proc) {
    try { pipeState.proc.kill("SIGTERM"); } catch (_) {}
    pipeState.proc = null;
  }
  pipeState.stderr = "";
  pipeState.canceled = false;

  const isMp4 = /libx264|libx265/.test(codec);
  const fmt = pixFormat === "mjpeg" ? "mjpeg" : "rgba";
  const args = [
    "-y",
    "-loglevel", "info",
    "-thread_queue_size", "1024",
  ];
  if (fmt === "rgba") {
    // مدخل خام: أسرع بكثير، لا ترميز JPEG في المتصفح ولا فكّه في ffmpeg
    if (!width || !height) throw new Error("width/height required for rawvideo");
    args.push(
      "-f", "rawvideo",
      "-pix_fmt", "rgba",
      "-s", `${width}x${height}`,
      "-r", String(fps),
      "-i", "pipe:0",
    );
  } else {
    args.push(
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "-r", String(fps),
      "-i", "pipe:0",
    );
  }

  if (audioPath) {
    args.push("-i", audioPath);
  }

  args.push(
    "-map", "0:v:0",
  );
  if (audioPath) args.push("-map", "1:a:0");

  args.push(
    "-c:v", codec,
    "-crf", String(crf),
    "-preset", preset,
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
  );

  if (audioPath) {
    args.push(
      "-c:a", audioCodec,
      "-b:a", audioBitrate,
      "-shortest",
    );
  }

  if (isMp4) args.push("-movflags", "+faststart");
  args.push(outputPath);

  const proc = spawn(ffmpegPath, args);
  pipeState.proc = proc;

  pipeState.lastProgressSent = 0;
  proc.stderr.on("data", chunk => {
    const s = chunk.toString();
    pipeState.stderr += s;
    if (pipeState.stderr.length > 200000) {
      pipeState.stderr = pipeState.stderr.slice(-100000);
    }
    // throttle: 250ms على الأكثر بين رسائل التقدم — لتجنب فيضان IPC
    const now = Date.now();
    if (now - pipeState.lastProgressSent < 250) return;
    pipeState.lastProgressSent = now;
    const matches = s.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/g);
    const time = matches ? matches[matches.length - 1].replace("time=", "") : null;
    try { event.sender.send("ffmpeg-progress", { time, log: s }); } catch (_) {}
  });

  proc.stdin.on("error", err => {
    if (err.code !== "EPIPE") {
      console.error("[ffmpeg-pipe] stdin error:", err);
    }
  });

  return { ok: true, pid: proc.pid };
});

ipcMain.handle("ffmpeg-pipe-frame", async (_event, arrayBuffer) => {
  const proc = pipeState.proc;
  if (!proc) throw new Error("pipe not started");
  if (pipeState.canceled) throw new Error("cancelled");
  if (proc.exitCode !== null) {
    throw new Error(`ffmpeg exited prematurely (code ${proc.exitCode})\n${pipeState.stderr.slice(-600)}`);
  }
  const buf = Buffer.from(arrayBuffer);
  const ok = proc.stdin.write(buf);
  if (!ok) await awaitDrain(proc.stdin);
  return true;
});

ipcMain.handle("ffmpeg-pipe-end", async () => {
  const proc = pipeState.proc;
  if (!proc) return { ok: true };
  return new Promise((resolve, reject) => {
    proc.once("close", code => {
      pipeState.proc = null;
      if (pipeState.canceled) { reject(new Error("cancelled")); return; }
      if (code === 0) resolve({ ok: true });
      else reject(new Error(`ffmpeg exited with code ${code}\n${pipeState.stderr.slice(-1500)}`));
    });
    proc.once("error", err => { pipeState.proc = null; reject(err); });
    try { proc.stdin.end(); } catch (_) {}
  });
});

ipcMain.on("ffmpeg-pipe-cancel", () => {
  pipeState.canceled = true;
  if (pipeState.proc) {
    try { pipeState.proc.kill("SIGTERM"); } catch (_) {}
  }
});

// ── استخراج إطارات فيديو الخلفية مسبقاً (مرة واحدة) ───
//    أسرع وأكثر استقراراً من seek على HTMLVideoElement
ipcMain.handle("extract-bg-frames", async (event, opts) => {
  const { videoBytes, videoBytesList, clipDurations, crossfadeSec, fps, width, height, totalDuration, trimStart, trimEnd } = opts;
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) throw new Error("ffmpeg not found");

  // ── دعم رفع متعدد للفيديوهات: نضمّها مسبقاً في ملف واحد ───
  let inputPath;
  const inputsToClean = [];
  const list = Array.isArray(videoBytesList) && videoBytesList.length ? videoBytesList : (videoBytes ? [videoBytes] : []);
  if (!list.length) throw new Error("no video data");

  if (list.length === 1) {
    inputPath = path.join(os.tmpdir(), `gt-sirm-bg-${Date.now()}.bin`);
    fs.writeFileSync(inputPath, Buffer.from(list[0]));
    inputsToClean.push(inputPath);
  } else {
    // 1) اكتب كل مقطع في ملف مؤقت
    const tempFiles = list.map((bytes, i) => {
      const p = path.join(os.tmpdir(), `gt-sirm-bg-src-${Date.now()}-${i}.bin`);
      fs.writeFileSync(p, Buffer.from(bytes));
      inputsToClean.push(p);
      return p;
    });
    // 2) ادمجها عبر filter_complex إلى ملف concat واحد
    const concatPath = path.join(os.tmpdir(), `gt-sirm-bg-concat-${Date.now()}.mp4`);
    inputsToClean.push(concatPath);
    const W12 = Math.round(width * 1.2), H12 = Math.round(height * 1.2);
    const filterInputs = tempFiles.map((_, i) =>
      `[${i}:v:0]scale=${W12}:${H12}:force_original_aspect_ratio=increase,crop=${W12}:${H12},setsar=1,fps=${fps},format=yuv420p[v${i}]`
    ).join(";");

    // ── crossfade أو concat صلب ────────────────────────
    const xf = (typeof crossfadeSec === "number" && crossfadeSec > 0
                && Array.isArray(clipDurations) && clipDurations.length === tempFiles.length) ? crossfadeSec : 0;

    let chain;
    if (xf > 0 && tempFiles.length >= 2) {
      // xfade متسلسل: [v0][v1]xfade=offset=D0-xf[x1]; [x1][v2]xfade=offset=D0+D1-2*xf[x2]; ...
      const segs = [];
      let prev = "v0";
      let cum = 0;
      for (let i = 1; i < tempFiles.length; i++) {
        cum += Math.max(0.1, clipDurations[i - 1] - xf);
        const out = (i === tempFiles.length - 1) ? "outv" : `x${i}`;
        segs.push(`[${prev}][v${i}]xfade=transition=fade:duration=${xf}:offset=${cum.toFixed(3)}[${out}]`);
        prev = out;
      }
      chain = `${filterInputs};${segs.join(";")}`;
    } else {
      // concat صلب (افتراضي)
      const concatLabels = tempFiles.map((_, i) => `[v${i}]`).join("");
      chain = `${filterInputs};${concatLabels}concat=n=${tempFiles.length}:v=1[outv]`;
    }

    const concatArgs = ["-y", "-loglevel", "error"];
    tempFiles.forEach(p => { concatArgs.push("-i", p); });
    concatArgs.push(
      "-filter_complex", chain,
      "-map", "[outv]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p",
      concatPath
    );
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, concatArgs);
      let err = "";
      proc.stderr.on("data", d => { err += d.toString(); });
      proc.on("close", code => code === 0 ? resolve() : reject(new Error(`concat failed (${code}): ${err.slice(-400)}`)));
      proc.on("error", reject);
    });
    inputPath = concatPath;
  }

  // مجلد للإطارات
  const outDir = path.join(os.tmpdir(), `gt-sirm-bgframes-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  // 1.2× يكفي لجميع حركات الخلفية (drift/zoom/pan)
  // -q:v 6 جودة جيدة بصرياً وأسرع 30-40% في فكّ ترميز ImageBitmap
  const scaleW = Math.round(width  * 1.2);
  const scaleH = Math.round(height * 1.2);
  const totalFrames = Math.ceil(totalDuration * fps);
  const pattern = path.join(outDir, "f_%05d.jpg");

  // عند تفعيل التقطيع: -ss/-to قبل الإدخال + -stream_loop يكرّر الجزء المُقتطع فقط
  const trimArgs = [];
  if (typeof trimStart === "number" && trimStart >= 0) {
    trimArgs.push("-ss", String(trimStart));
  }
  if (typeof trimEnd === "number" && trimEnd > (trimStart || 0)) {
    trimArgs.push("-to", String(trimEnd));
  }

  const args = [
    "-y", "-loglevel", "error",
    "-stream_loop", "-1",
    ...trimArgs,
    "-i", inputPath,
    "-vf", `fps=${fps},scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH}`,
    "-frames:v", String(totalFrames),
    "-q:v", "6",
    pattern,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => {
      inputsToClean.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
      if (code !== 0) {
        try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
        reject(new Error(`bg extract failed (code ${code}): ${stderr.slice(-400)}`));
        return;
      }
      // اجمع المسارات الموجودة فعلاً (قد يقلّ عدد المخرجات إن فشلت فقرات)
      try {
        const files = fs.readdirSync(outDir)
          .filter(f => f.startsWith("f_") && f.endsWith(".jpg"))
          .sort()
          .map(f => path.join(outDir, f));
        resolve({ dir: outDir, files, width: scaleW, height: scaleH });
      } catch (e) {
        reject(e);
      }
    });
    proc.on("error", err => reject(err));
  });
});

ipcMain.handle("cleanup-bg-frames", async (_e, dir) => {
  if (!dir) return true;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
  return true;
});

// قراءة ملف من /tmp فقط (للإطارات المستخرَجة) — تتجاوز قيود SOP لـ file:// fetch
ipcMain.handle("read-tmp-file", async (_e, filePath) => {
  if (!filePath || typeof filePath !== "string") return null;
  // أمان: لا تسمح إلا بقراءة من os.tmpdir()
  const tmpRoot = os.tmpdir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(tmpRoot + path.sep) && resolved !== tmpRoot) {
    throw new Error("read-tmp-file: path must be under tmpdir");
  }
  return fs.readFileSync(resolved);
});

// v0.8.8 — قراءة ملف من أيّ مسار (للوسائط التي ينزّلها yt-dlp إلى مسار يختاره المستخدم)
// يعيد {buffer, name, size} حتى يستطيع الـrenderer بناء File منه
ipcMain.handle("read-downloaded-file", async (_e, filePath) => {
  if (!filePath || typeof filePath !== "string") return null;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error("file does not exist: " + resolved);
  const buf = fs.readFileSync(resolved);
  return { buffer: buf, name: path.basename(resolved), size: buf.length };
});

ipcMain.handle("ffmpeg-encode", async (event, opts) => {
  const { inputPath, outputPath, codec, crf, preset, audioCodec, audioBitrate } = opts;
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) {
    throw new Error("ffmpeg not found");
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-y", "-i", inputPath,
      "-c:v", codec, "-crf", String(crf), "-preset", preset,
                     "-c:a", audioCodec, "-b:a", audioBitrate,
                     "-movflags", "+faststart", outputPath
    ];

    const proc = spawn(ffmpegPath, args);
    let stderr = "";

    proc.stderr.on("data", chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/g);
      if (match) {
        const last = match[match.length - 1].replace("time=", "");
        event.sender.send("ffmpeg-progress", { time: last, log: chunk.toString() });
      }
    });

    proc.on("close", code => {
      if (code === 0) resolve({ ok: true, outputPath });
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-1000)}`));
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ffmpeg-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

ipcMain.handle("ytdlp-download", async (event, opts) => {
  const { url, type, quality, startTime, endTime, dlSaveMode, dlSavePath, audioFormat, workdirSubfolderKey } = opts;
  const ytdlpPath = await getBinPath("yt-dlp");
  if (!ytdlpPath) throw new Error("yt-dlp not found");

  // v0.12.2 — تَحديد مجلّد الحفظ
  // الأولويّة: workdirSubfolderKey (تَوجيه ذكيّ تلقائيّ) → dlSavePath (يدويّ) → /tmp
  let saveDir = os.tmpdir();
  if (workdirSubfolderKey) {
    // تَوجيه ذكيّ: استَخدم مجلّد العمل + المجلّد الفرعيّ المناسب
    try {
      const cfg = loadWorkDirConfig();
      const root = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
      const subfolder = WORK_DIR_SUBFOLDERS.find(f => f.key === workdirSubfolderKey);
      if (subfolder) {
        const target = path.join(root, subfolder.name);
        fs.mkdirSync(target, { recursive: true });
        saveDir = target;
        event.sender.send("ytdlp-progress", { line: `📁 ${subfolder.emoji} مجلّد العمل/${subfolder.name}: ${saveDir}` });
      } else {
        event.sender.send("ytdlp-progress", { line: `⚠️ subfolderKey غير معروف — استَخدم /tmp` });
      }
    } catch (err) {
      event.sender.send("ytdlp-progress", { line: `⚠️ فَشِل تَوجيه مجلّد العمل: ${err.message} — استَخدم /tmp` });
    }
  } else if (dlSaveMode === "permanent") {
    if (dlSavePath) {
      try {
        if (!fs.existsSync(dlSavePath)) {
          fs.mkdirSync(dlSavePath, { recursive: true });
        }
        saveDir = dlSavePath;
        event.sender.send("ytdlp-progress", { line: `📁 مجلد الحفظ: ${saveDir}` });
      } catch (err) {
        event.sender.send("ytdlp-progress", { line: `⚠️ فشل استخدام المجلد ${dlSavePath}: ${err.message} — سيُستخدم /tmp` });
      }
    } else {
      event.sender.send("ytdlp-progress", { line: "⚠️ لم يُحدد مجلد للحفظ — سيُستخدم /tmp" });
    }
  } else {
    event.sender.send("ytdlp-progress", { line: `📁 مجلد مؤقت: ${saveDir}` });
  }

  const outTmpl = path.join(saveDir, "gt-sirm-%(id)s-%(title).30B.%(ext)s");

  let args;
  if (type === "audio") {
    // v0.8.9 — اسمح بتحديد صيغة الصوت (افتراضياً mp3)
    // v0.8.11 — yt-dlp لا يقبل "ogg" مباشرة؛ الكوديك المناسب لحاوية OGG هو "vorbis" (الناتج .ogg)
    let af = (audioFormat || "mp3").toLowerCase();
    if (af === "ogg") af = "vorbis";
    // قائمة الصيغ المدعومة في yt-dlp
    const allowed = ["best", "aac", "alac", "flac", "m4a", "mp3", "opus", "vorbis", "wav"];
    if (!allowed.includes(af)) af = "mp3";
    args = ["-x", "--audio-format", af, "--audio-quality", "0", "-o", outTmpl, url];
  } else {
    args = [
      "-f", quality || "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
      "--merge-output-format", "mp4",
      "-o", outTmpl, url
    ];
  }

  if (startTime || endTime) {
    const s = startTime || "00:00:00";
    const e = endTime   || "99:59:59";
    args.push("--download-sections", `*${s}-${e}`);
    args.push("--force-keyframes-at-cuts");
    event.sender.send("ytdlp-progress", { line: `✂️ القطع: ${s} → ${e}` });
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, args);
    let stdout = "", stderr = "";

    proc.stdout.on("data", chunk => {
      stdout += chunk.toString();
      const lines = chunk.toString().split("\n").filter(Boolean);
      lines.forEach(line => event.sender.send("ytdlp-progress", { line }));
    });

    proc.stderr.on("data", chunk => {
      stderr += chunk.toString();
      chunk.toString().split("\n").filter(Boolean).forEach(line =>
      event.sender.send("ytdlp-progress", { line }));
    });

    proc.on("close", code => {
      // yt-dlp قد يعيد exit code != 0 في حالات بسيطة — نتحقق أولاً من الملف
      // استخرج مسار الملف من مخرجات yt-dlp (سطر [download] Destination: أو already been downloaded)
      const destMatch = stderr.match(/\[download\] Destination: (.+)/m)
      || stderr.match(/\[download\] (.+?) has already been downloaded/m);
      if (destMatch) {
        const filePath = destMatch[1].trim();
        if (fs.existsSync(filePath)) {
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
          return;
        }
      }
      const destMatchOut = stdout.match(/\[download\] Destination: (.+)/m)
      || stdout.match(/\[download\] (.+?) has already been downloaded/m);
      if (destMatchOut) {
        const filePath = destMatchOut[1].trim();
        if (fs.existsSync(filePath)) {
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
          return;
        }
      }
      if (code !== 0) { reject(new Error(stderr.slice(-800))); return; }
      // احتياط: ابحث عن أحدث ملف gt-sirm في saveDir
      try {
        const files = fs.readdirSync(saveDir)
        .filter(f => f.startsWith("gt-sirm-"))
        .map(f => ({ f, t: fs.statSync(path.join(saveDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
        if (files.length > 0) {
          const filePath = path.join(saveDir, files[0].f);
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
        } else {
          reject(new Error("لم يُعثر على الملف المحمّل في " + saveDir));
        }
      } catch (e) {
        reject(new Error("خطأ في البحث عن الملف: " + e.message));
      }
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ytdlp-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

// ── تحميل رابط مباشر عبر wget أو aria2c ──────────────
ipcMain.handle("direct-download", async (event, opts) => {
  const { url, tool, type, dlSaveMode, dlSavePath } = opts;

  // تحديد الأداة المتاحة
  let chosenTool = tool || "wget";
  let toolPath   = await getBinPath(chosenTool);

  // احتياطي: إذا طُلبت أداة غير موجودة، جرّب الأخرى
  if (!toolPath) {
    const fallback = chosenTool === "wget" ? "aria2c" : "wget";
    toolPath = await getBinPath(fallback);
    if (toolPath) {
      chosenTool = fallback;
      event.sender.send("ytdlp-progress", {
        line: `⚠️ ${tool} غير متاح — سيُستخدم ${fallback} بدلاً`
      });
    } else {
      throw new Error(`لا توجد أداة تحميل (wget أو aria2c) — ثبّتها أولاً`);
    }
  }

  // تحديد امتداد الملف من الرابط
  let ext = path.extname(new URL(url).pathname).toLowerCase().replace(".", "") || "";
  if (!ext) {
    if (type === "video") ext = "mp4";
    else if (type === "audio") ext = "mp3";
    else ext = "jpg";
  }

  // تحديد مجلد الحفظ
  let saveDir = os.tmpdir();
  if (dlSaveMode === "permanent" && dlSavePath) {
    try {
      if (!fs.existsSync(dlSavePath)) fs.mkdirSync(dlSavePath, { recursive: true });
      saveDir = dlSavePath;
    } catch (err) {
      event.sender.send("ytdlp-progress", { line: `⚠️ فشل المجلد — يُستخدم /tmp` });
    }
  }
  event.sender.send("ytdlp-progress", { line: `📁 مجلد الحفظ: ${saveDir}` });
  const tmpFile = path.join(saveDir, `gt-sirm-direct-${Date.now()}.${ext}`);

  // بناء الأوامر
  let args;
  if (chosenTool === "wget") {
    args = ["-O", tmpFile, "--progress=dot:default", url];
  } else { // aria2c
    args = [
      "-o", path.basename(tmpFile),
               "-d", path.dirname(tmpFile),
               "--show-console-readout=true",
               "--summary-interval=1",
               url
    ];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(toolPath, args);
    let outBuf = "";

    const onData = chunk => {
      outBuf += chunk.toString();
      const lines = outBuf.split(/[\r\n]/);
      outBuf = lines.pop();
      lines.filter(Boolean).forEach(line => {
        event.sender.send("ytdlp-progress", { line });
      });
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData); // wget يكتب في stderr

    proc.on("close", code => {
      if (code === 0 && fs.existsSync(tmpFile)) {
        event.sender.send("ytdlp-progress", { line: `✅ تم التحميل: ${tmpFile}` });
        resolve({ ok: true, filePath: tmpFile });
      } else {
        reject(new Error(`${chosenTool} انتهى بكود ${code}`));
      }
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ytdlp-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

ipcMain.handle("dialog-save", async (_e, opts) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: opts.title || "حفظ الملف",
    defaultPath: opts.defaultPath || `GT-SIRM-output.${opts.ext || "mp4"}`,
      filters: opts.filters || [{ name: "Video", extensions: ["mp4", "webm", "mkv"] }],
  });
  return result.canceled ? null : result.filePath;
});

// v0.12.11 — تَجاوز bug Electron+GTK الذي يَتجاهل defaultPath ويَعود
// لآخر مجلّد استَخدمه المُستخدم. الحلّ: استعمال أدوات النِظام التي تَحترم
// المَسار: kdialog على KDE/Dolphin، zenity على GNOME/غيرها.
function _which(bin) {
  for (const p of [`/usr/bin/${bin}`, `/usr/local/bin/${bin}`, `/bin/${bin}`]) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  try {
    const out = require("child_process").execSync(`which ${bin}`, { encoding: "utf8" }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch (_) {}
  return null;
}

let _KDIALOG_PATH = null;
let _ZENITY_PATH = null;
let _DIALOG_CHECKED = false;
function detectNativeDialog() {
  if (_DIALOG_CHECKED) return { kdialog: _KDIALOG_PATH, zenity: _ZENITY_PATH };
  _DIALOG_CHECKED = true;
  if (process.platform !== "linux") return { kdialog: null, zenity: null };
  _KDIALOG_PATH = _which("kdialog");
  _ZENITY_PATH  = _which("zenity");
  console.log(`[dialog] native helpers — kdialog=${_KDIALOG_PATH || "—"} zenity=${_ZENITY_PATH || "—"}`);
  return { kdialog: _KDIALOG_PATH, zenity: _ZENITY_PATH };
}

function _isKdeSession() {
  const xdg = (process.env.XDG_CURRENT_DESKTOP || "").toUpperCase();
  if (xdg.includes("KDE")) return true;
  if (process.env.KDE_FULL_SESSION) return true;
  if ((process.env.DESKTOP_SESSION || "").toLowerCase().includes("plasma")) return true;
  return false;
}

function _ensureTrailingSlash(p) {
  if (!p) return p;
  try {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      return p.endsWith("/") ? p : (p + "/");
    }
  } catch (_) {}
  return p;
}

// SENTINEL: يُميِّز "الأداة فَشلت في التَشغيل" عن "المُستخدم ألغى"
const _DLG_UNAVAILABLE = Symbol("unavailable");

function kdialogFileSelect({ defaultPath, multiple, filters, title, directory }) {
  const { kdialog } = detectNativeDialog();
  if (!kdialog) return Promise.resolve(_DLG_UNAVAILABLE);
  const args = [];
  if (directory) {
    args.push("--getexistingdirectory", defaultPath || os.homedir());
  } else {
    if (multiple) { args.push("--multiple", "--separate-output"); }
    args.push("--getopenfilename", _ensureTrailingSlash(defaultPath) || os.homedir());
    if (Array.isArray(filters) && filters.length) {
      const parts = filters.filter(f => f.extensions?.length).map(f =>
        `${f.name || "Files"} (${f.extensions.map(e => "*." + e).join(" ")})`
      );
      parts.push("جميع الملفّات (*)");
      args.push(parts.join("\n"));
    }
  }
  if (title) args.push("--title", title);
  return new Promise((resolve) => {
    let resolved = false;
    const proc = spawn(kdialog, args);
    let out = "";
    proc.stdout.on("data", d => out += d.toString());
    proc.on("close", code => {
      if (resolved) return; resolved = true;
      // exit 0 + output → ملفّات؛ exit !=0 أو لا output → المُستخدم ألغى (null)
      if (code === 0 && out.trim()) {
        resolve(out.trim().split("\n").map(s => s.trim()).filter(Boolean));
      } else {
        resolve(null); // cancelled — لا تَنتقل لـfallback
      }
    });
    proc.on("error", err => {
      if (resolved) return; resolved = true;
      console.warn("[kdialog] spawn error:", err);
      resolve(_DLG_UNAVAILABLE);
    });
  });
}

function zenityFileSelect({ defaultPath, multiple, filters, title, directory }) {
  const { zenity } = detectNativeDialog();
  if (!zenity) return Promise.resolve(_DLG_UNAVAILABLE);
  const args = ["--file-selection"];
  if (title) args.push(`--title=${title}`);
  if (directory) args.push("--directory");
  if (multiple) { args.push("--multiple"); args.push("--separator=\n"); }
  if (defaultPath) args.push(`--filename=${_ensureTrailingSlash(defaultPath)}`);
  if (Array.isArray(filters) && !directory) {
    for (const f of filters) {
      if (!f.extensions?.length) continue;
      const pats = f.extensions.map(ext => `*.${ext}`).join(" ");
      args.push(`--file-filter=${f.name || "Files"} | ${pats}`);
    }
    args.push("--file-filter=الكلّ | *");
  }
  return new Promise((resolve) => {
    let resolved = false;
    const proc = spawn(zenity, args);
    let out = "";
    proc.stdout.on("data", d => out += d.toString());
    proc.on("close", code => {
      if (resolved) return; resolved = true;
      if (code === 0 && out.trim()) {
        resolve(out.trim().split("\n").map(s => s.trim()).filter(Boolean));
      } else {
        resolve(null); // cancelled — لا fallback
      }
    });
    proc.on("error", err => {
      if (resolved) return; resolved = true;
      console.warn("[zenity] spawn error:", err);
      resolve(_DLG_UNAVAILABLE);
    });
  });
}

// تَرتيب التَفضيل: KDE → kdialog؛ غير ذلك → zenity. الإلغاء يُعيد null بدون fallback.
async function nativeFileSelect(payload) {
  const { kdialog, zenity } = detectNativeDialog();
  const tryOrder = _isKdeSession()
    ? [kdialog && kdialogFileSelect, zenity && zenityFileSelect]
    : [zenity && zenityFileSelect, kdialog && kdialogFileSelect];
  for (const fn of tryOrder) {
    if (!fn) continue;
    const res = await fn(payload);
    if (res === _DLG_UNAVAILABLE) continue; // الأداة فَشلت — جَرِّب التالي
    return res; // null (المُستخدم ألغى) أو [paths]
  }
  return _DLG_UNAVAILABLE; // لا أداة عَملت — Electron fallback
}

ipcMain.handle("dialog-open", async (_e, opts) => {
  const isDir = opts.properties?.includes("openDirectory");
  const multiple = opts.properties?.includes("multiSelections") || opts.multiple;
  let defaultPath = opts.defaultPath;
  try {
    if (defaultPath && !fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }
  } catch (_) { defaultPath = undefined; }

  // v0.12.11 — على لينُكس استَعمِل kdialog/zenity (يَحترم defaultPath)
  if (process.platform === "linux") {
    const payload = {
      defaultPath,
      multiple,
      directory: isDir,
      filters: isDir ? null : (opts.filters || [{ name: "Files", extensions: ["*"] }]),
      title: opts.title || (isDir ? "اختر مجلداً" : "اختر ملفاً"),
    };
    const paths = await nativeFileSelect(payload);
    if (paths !== _DLG_UNAVAILABLE) {
      return paths; // null (cancelled) أو array (selected) — لا fallback
    }
  }

  // fallback: Electron dialog
  if (defaultPath && !isDir) {
    try {
      const stat = fs.statSync(defaultPath);
      if (stat.isDirectory()) {
        defaultPath = path.join(defaultPath, "اختر-ملفاً");
      }
    } catch (_) {}
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      opts.title || (isDir ? "اختر مجلداً" : "اختر ملفاً"),
    defaultPath,
    properties: opts.properties || (multiple ? ["openFile", "multiSelections"] : ["openFile"]),
    filters:    isDir ? undefined : (opts.filters || [{ name: "All Files", extensions: ["*"] }]),
  });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle("open-folder", async (_e, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("write-temp-file", async (_e, arrayBuffer) => {
  const tmpFile = path.join(os.tmpdir(), `gt-sirm-tmp-${Date.now()}.webm`);
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tmpFile, buffer);
  return tmpFile;
});

ipcMain.handle("write-temp-buffer", async (_e, arrayBuffer, ext) => {
  const safeExt = (ext || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const tmpFile = path.join(os.tmpdir(), `gt-sirm-buf-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`);
  fs.writeFileSync(tmpFile, Buffer.from(arrayBuffer));
  return tmpFile;
});

ipcMain.handle("read-local-file", async (_e, relPath) => {
  // مسارات نسبية تحت مجلد renderer فقط (الخطوط/الموارد المحلية)
  const safe = String(relPath || "").replace(/\\/g, "/").replace(/\.\.+/g, "");
  const full = path.join(__dirname, "..", "renderer", safe);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full);
});

ipcMain.handle("delete-temp-file", async (_e, filePath) => {
  try { fs.unlinkSync(filePath); } catch (_) { }
  return true;
});

ipcMain.handle("sys-info", () => ({
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
                                  totalMem: Math.round(os.totalmem() / 1024 / 1024 / 1024) + " GB",
                                  tmpDir: os.tmpdir(),
                                  home: os.homedir(),
                                  appVer: app.getVersion(),
}));

// ═══════════════════════════════════════════════════════
//  v0.5.7 — حفظ/فتح المشاريع (.gtsirm)
// ═══════════════════════════════════════════════════════

// v0.12.5 — مساعد: مَسار مجلّد فَرعيّ من مجلّد العمل (إن أمكن)
function workdirSubPath(subKey) {
  try {
    const cfg = loadWorkDirConfig();
    const root = (cfg && cfg.path) ? cfg.path : getDefaultWorkDir();
    const sub = WORK_DIR_SUBFOLDERS.find(f => f.key === subKey);
    if (sub) return path.join(root, sub.name);
  } catch (_) {}
  return null;
}

ipcMain.handle("project-save-dialog", async (_e, defaultName) => {
  // v0.12.5 — يَفتح في mvolada projects/ إذا لم يَكن لاسم مَسار صَريح
  let defaultPath = defaultName;
  if (!defaultPath) {
    const projDir = workdirSubPath("projects");
    const fileName = `gt-sirm-project-${Date.now()}.gtsirm`;
    defaultPath = projDir ? path.join(projDir, fileName) : fileName;
  } else if (!path.isAbsolute(defaultPath)) {
    const projDir = workdirSubPath("projects");
    if (projDir) defaultPath = path.join(projDir, defaultPath);
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "حفظ المشروع",
    defaultPath,
    filters: [{ name: "GT-SIRM Project", extensions: ["gtsirm"] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("project-open-dialog", async () => {
  // v0.12.5 — يَفتح في projects/ افتراضياً
  const projDir = workdirSubPath("projects");
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "فتح مشروع",
    defaultPath: projDir || undefined,
    properties: ["openFile"],
    filters: [
      { name: "GT-SIRM Project", extensions: ["gtsirm"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("project-write", async (_e, filePath, jsonStr) => {
  try {
    fs.writeFileSync(filePath, jsonStr, "utf8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("project-read", async (_e, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("project-asset-check", async (_e, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return { exists: stats.isFile(), size: stats.size };
  } catch (_) {
    return { exists: false };
  }
});

ipcMain.handle("project-asset-read", async (_e, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    return { ok: true, buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
