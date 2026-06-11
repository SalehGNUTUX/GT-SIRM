#!/usr/bin/env python3
"""Regenerate all Android icons from GT-SIRM-icon-original.png.

Legacy icons (ic_launcher.png + ic_launcher_round.png): full-square logo.
Adaptive icon foreground (ic_launcher_foreground.png): logo sized to safe area
  (66dp of 108dp viewport = ~61% center) on transparent canvas.
"""
from PIL import Image, ImageDraw
import os

SRC = "GT-SIRM-WEB/GT-SIRM-icons/GT-SIRM-icon-original.png"
RES = "GT-SIRM-WEB/android/app/src/main/res"

# (density, legacy_size, adaptive_size)
DENSITIES = [
    ("mdpi", 48, 108),
    ("hdpi", 72, 162),
    ("xhdpi", 96, 216),
    ("xxhdpi", 144, 324),
    ("xxxhdpi", 192, 432),
]

# Safe-area ratio for adaptive icon foreground:
# 66dp of 108dp viewport = 0.611
# لكنّ الصورة الأصليّة لا تَملك padding، نَجعَل اللوغو يَملأ ~66% من المساحة الفَعّالة
ADAPTIVE_LOGO_RATIO = 0.66

src_img = Image.open(SRC).convert("RGBA")
print(f"المَصدر: {src_img.size} {src_img.mode}")

for density, legacy_sz, adaptive_sz in DENSITIES:
    out_dir = os.path.join(RES, f"mipmap-{density}")
    os.makedirs(out_dir, exist_ok=True)

    # Legacy (square): ic_launcher.png + ic_launcher_round.png
    legacy = src_img.resize((legacy_sz, legacy_sz), Image.LANCZOS)
    legacy.save(os.path.join(out_dir, "ic_launcher.png"), "PNG", optimize=True)

    # Round version: قَصّ دائرة من الأَيقونة المُربّعة
    round_img = legacy.copy()
    mask = Image.new("L", (legacy_sz, legacy_sz), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, legacy_sz, legacy_sz), fill=255)
    round_img.putalpha(mask)
    round_img.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG", optimize=True)

    # Adaptive foreground: logo مَركَزيّ في 66% من المساحة، خَلفيّة شَفّافة
    canvas = Image.new("RGBA", (adaptive_sz, adaptive_sz), (0, 0, 0, 0))
    inner_sz = int(adaptive_sz * ADAPTIVE_LOGO_RATIO)
    inner = src_img.resize((inner_sz, inner_sz), Image.LANCZOS)
    off = (adaptive_sz - inner_sz) // 2
    canvas.paste(inner, (off, off), inner)
    canvas.save(os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG", optimize=True)

    print(f"✅ {density}: legacy={legacy_sz}px adaptive={adaptive_sz}px")

# تَحديث لون الـbackground للأَيقونة التَكيفيّة لِيُطابق سِمة GT-SIRM (أَخضر داكن)
bg_xml = os.path.join(RES, "values", "ic_launcher_background.xml")
with open(bg_xml, "w", encoding="utf-8") as f:
    f.write("""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#040c08</color>
</resources>
""")
print(f"✅ ic_launcher_background.xml → #040c08 (سِمة GT-SIRM)")
