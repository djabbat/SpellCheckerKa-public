#!/usr/bin/env python3
"""Генерирует PNG-иконки для extension из SVG."""
import subprocess, pathlib, sys

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="12" fill="#000080"/>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
        font-family="'Noto Sans Georgian', serif" font-size="72" fill="white">✓</text>
  <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle"
        font-family="'Noto Sans Georgian', serif" font-size="22" fill="#c9a84c">GE</text>
</svg>"""

out = pathlib.Path(__file__).parent
(out / "icon.svg").write_text(SVG)

for size in [16, 48, 128]:
    target = out / f"icon{size}.png"
    result = subprocess.run(
        ["convert", "-background", "none", "-size", f"{size}x{size}",
         str(out / "icon.svg"), str(target)],
        capture_output=True
    )
    if result.returncode == 0:
        print(f"✓ icon{size}.png")
    else:
        # Fallback: rsvg-convert
        result2 = subprocess.run(
            ["rsvg-convert", "-w", str(size), "-h", str(size),
             "-o", str(target), str(out / "icon.svg")],
            capture_output=True
        )
        if result2.returncode == 0:
            print(f"✓ icon{size}.png (rsvg)")
        else:
            print(f"⚠ icon{size}.png — установите imagemagick или librsvg2-bin")

print("Готово. Иконки:", list(out.glob("icon*.png")))
