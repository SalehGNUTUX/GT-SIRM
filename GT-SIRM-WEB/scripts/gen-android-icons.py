#!/usr/bin/env python3
"""تَوليد كامِل لِأُصول Android من شِعار GT-SIRM الأَصليّ.

يَتضمَّن:
  • Mipmap: 5 كَثافات × 3 أنواع (legacy square + round + adaptive foreground)
  • Drawable splash: 5 كَثافات × 2 توجيهات (portrait + landscape) + drawable عامّ
  • تَحديث ic_launcher_background.xml إلى سِمة GT-SIRM
"""
from PIL import Image, ImageDraw
import os

SRC = "GT-SIRM-WEB/GT-SIRM-icons/GT-SIRM-icon-original.png"
RES = "GT-SIRM-WEB/android/app/src/main/res"
BG_COLOR = (4, 12, 8, 255)  # #040c08 — سِمة GT-SIRM

# (density, legacy_size, adaptive_size, port_w, port_h, land_w, land_h)
DENSITIES = [
    ("mdpi", 48, 108, 320, 480, 480, 320),
    ("hdpi", 72, 162, 480, 800, 800, 480),
    ("xhdpi", 96, 216, 720, 1280, 1280, 720),
    ("xxhdpi", 144, 324, 960, 1600, 1600, 960),
    ("xxxhdpi", 192, 432, 1280, 1920, 1920, 1280),
]

ADAPTIVE_LOGO_RATIO = 0.66

src_img = Image.open(SRC).convert("RGBA")
print(f"المَصدر: {src_img.size} {src_img.mode}")


def make_splash(width, height, logo):
    """خَلفيّة GT-SIRM + شِعار في الوَسط بـ40% من أصغر بُعد."""
    canvas = Image.new("RGBA", (width, height), BG_COLOR)
    logo_size = int(min(width, height) * 0.40)
    logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
    off_x = (width - logo_size) // 2
    off_y = (height - logo_size) // 2
    canvas.paste(logo_resized, (off_x, off_y), logo_resized)
    return canvas


for density, legacy_sz, adaptive_sz, port_w, port_h, land_w, land_h in DENSITIES:
    # ── Mipmap (أَيقونات المُشغّل) ──
    mp_dir = os.path.join(RES, f"mipmap-{density}")
    os.makedirs(mp_dir, exist_ok=True)
    legacy = src_img.resize((legacy_sz, legacy_sz), Image.LANCZOS)
    legacy.save(os.path.join(mp_dir, "ic_launcher.png"), "PNG", optimize=True)
    # دائريّ
    round_img = legacy.copy()
    mask = Image.new("L", (legacy_sz, legacy_sz), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, legacy_sz, legacy_sz), fill=255)
    round_img.putalpha(mask)
    round_img.save(os.path.join(mp_dir, "ic_launcher_round.png"), "PNG", optimize=True)
    # Adaptive
    canvas = Image.new("RGBA", (adaptive_sz, adaptive_sz), (0, 0, 0, 0))
    inner_sz = int(adaptive_sz * ADAPTIVE_LOGO_RATIO)
    inner = src_img.resize((inner_sz, inner_sz), Image.LANCZOS)
    off = (adaptive_sz - inner_sz) // 2
    canvas.paste(inner, (off, off), inner)
    canvas.save(os.path.join(mp_dir, "ic_launcher_foreground.png"), "PNG", optimize=True)

    # ── Drawable splash (شاشة البَدء) ──
    port_dir = os.path.join(RES, f"drawable-port-{density}")
    land_dir = os.path.join(RES, f"drawable-land-{density}")
    os.makedirs(port_dir, exist_ok=True)
    os.makedirs(land_dir, exist_ok=True)
    splash_port = make_splash(port_w, port_h, src_img)
    splash_land = make_splash(land_w, land_h, src_img)
    splash_port.convert("RGB").save(os.path.join(port_dir, "splash.png"), "PNG", optimize=True)
    splash_land.convert("RGB").save(os.path.join(land_dir, "splash.png"), "PNG", optimize=True)

    print(f"✅ {density}: mipmap + splash port {port_w}×{port_h} + land {land_w}×{land_h}")

# Splash عامّ في drawable/
drawable_dir = os.path.join(RES, "drawable")
os.makedirs(drawable_dir, exist_ok=True)
make_splash(480, 320, src_img).convert("RGB").save(
    os.path.join(drawable_dir, "splash.png"), "PNG", optimize=True)
print("✅ drawable/splash.png (افتراضيّ)")

# تَحديث لون الـbackground للأَيقونة التَكيفيّة
bg_xml = os.path.join(RES, "values", "ic_launcher_background.xml")
with open(bg_xml, "w", encoding="utf-8") as f:
    f.write("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#040c08</color>
</resources>
""")
print("✅ ic_launcher_background.xml → #040c08")
