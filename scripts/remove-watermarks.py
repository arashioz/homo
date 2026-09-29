#!/usr/bin/env python3
"""Remove Tuya / Wi-Fi / +RF logo watermarks from product photos (bottom strip)."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "public" / "products"


def has_bottom_logo(im: Image.Image) -> tuple[bool, int]:
    """Detect brand logos typically stamped on the bottom white margin."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    strip_h = max(56, min(140, int(h * 0.13)))
    region = rgb.crop((0, h - strip_h, w, h))
    pixels = list(region.getdata())
    n = len(pixels) or 1
    orange = sum(1 for r, g, b in pixels if r > 175 and g < 145 and b < 90)
    dark = sum(1 for r, g, b in pixels if max(r, g, b) < 55)
    white = sum(1 for r, g, b in pixels if r > 242 and g > 242 and b > 242)
    # Logos sit on mostly-white footer; orange Tuya badge is a strong signal.
    if orange >= 25 and white / n >= 0.35:
        return True, strip_h
    if dark >= 120 and white / n >= 0.45 and orange >= 8:
        return True, strip_h
    # Dense dark text (+RF / Wi-Fi) on white footer
    if white / n >= 0.55 and dark >= 200:
        return True, strip_h
    return False, strip_h


def clean(im: Image.Image) -> Image.Image | None:
    hit, strip_h = has_bottom_logo(im)
    if not hit:
        return None
    out = im.convert("RGB")
    w, h = out.size
    draw = ImageDraw.Draw(out)
    # Slightly taller wipe so shadow/halo under logos disappears
    y0 = h - strip_h - max(4, int(h * 0.01))
    draw.rectangle([0, y0, w, h], fill=(255, 255, 255))
    return out


def main() -> int:
    paths = sorted(
        [
            *IMG_DIR.glob("*.jpg"),
            *IMG_DIR.glob("*.jpeg"),
            *IMG_DIR.glob("*.png"),
            *IMG_DIR.glob("*.webp"),
        ]
    )
    fixed = 0
    skipped = 0
    for path in paths:
        if path.name.startswith("."):
            continue
        try:
            im = Image.open(path)
        except Exception as e:
            print(f"skip {path.name}: {e}", file=sys.stderr)
            skipped += 1
            continue
        cleaned = clean(im)
        if not cleaned:
            skipped += 1
            continue
        dest = path if path.suffix.lower() in {".jpg", ".jpeg"} else path.with_suffix(".jpg")
        cleaned.save(dest, "JPEG", quality=92, optimize=True, progressive=True)
        if dest != path and path.exists():
            path.unlink(missing_ok=True)
        fixed += 1
        print(f"cleaned {path.name}", flush=True)
    print(json_result := __import__("json").dumps({"cleaned": fixed, "skipped": skipped}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
