# -*- coding: utf-8 -*-
"""把 Unicode 音乐谱号字形渲染成透明 PNG，供网页内 SVG 使用。

输出：assets/treble-clef.png、assets/bass-clef.png
运行：python tools/make_clefs.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
os.makedirs(OUT, exist_ok=True)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\seguisym.ttf",
    r"C:\Windows\Fonts\Bravura.otf",
    "/usr/share/fonts/truetype/noto/NotoMusic-Regular.ttf",
]

GLYPHS = {
    "treble-clef": "\U0001D11E",   # 𝄞
    "bass-clef": "\U0001D122",     # 𝄢
}


def pick_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit("找不到音乐符号字体（seguisym.ttf / Bravura / NotoMusic）")


def render(glyph, font_path, out_path, target_h=560):
    size = target_h * 2
    canvas = Image.new("L", (size * 3, size * 3), 0)
    d = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(font_path, size)
    d.text((size, size), glyph, font=font, fill=255)
    bbox = canvas.getbbox()
    if not bbox:
        raise SystemExit("字形为空，字体可能不含该码位：%s" % glyph)
    glyph_img = canvas.crop(bbox)

    scale = target_h / glyph_img.height
    glyph_img = glyph_img.resize(
        (max(1, round(glyph_img.width * scale)), target_h), Image.LANCZOS
    )
    rgba = Image.new("RGBA", glyph_img.size, (0, 0, 0, 0))
    rgba.putalpha(glyph_img)
    rgba.save(out_path, "PNG", optimize=True)
    print("%-28s %dx%d  ratio=%.4f" % (os.path.basename(out_path), *rgba.size,
                                      rgba.width / rgba.height))


if __name__ == "__main__":
    fp = pick_font()
    for name, glyph in GLYPHS.items():
        render(glyph, fp, os.path.join(OUT, name + ".png"))
