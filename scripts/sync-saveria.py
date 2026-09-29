#!/usr/bin/env python3
"""Sync products/prices/images from saveriasmarthome.com into data/products.json.

Also lifts black studio backgrounds to white and resaves sharper JPEGs.
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import deque
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image, ImageFilter, ImageEnhance
except ImportError:
    print("Install pillow: pip3 install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "products.json"
IMG_DIR = ROOT / "public" / "products"
BASE = "https://saveriasmarthome.com/wp-json/wc/store/v1/products"
UA = "HomoCatalogSync/1.0 (+https://homo.ir)"

CATEGORY_RULES = [
    (r"پک\s*\d|پکیج|پک\d", "پکیج‌های خانه هوشمند"),
    (r"دستگیره|قفل|S-lock|Slock", "قفل و دستگیره هوشمند"),
    (r"آیفون|Akuvox|آکووکس", "آیفون تصویری"),
    (r"ترموستات|شیر ترمو|سرمایش|گرمایش|فن کوئل", "سرمایش و گرمایش"),
    (r"سنسور|دزدگیر|دوربین", "امنیت و نظارت"),
    (r"ریل پرده|موتور پرده|پرده برقی", "پرده برقی"),
    (r"هاب|gateway|گیتوی|ZHub|تاچ پنل|تاچ‌پنل", "هاب مرکزی"),
    (r"پنل صوتی|اسپیکر|بلندگو|آمپلی|سقف", "سیستم صوتی"),
    (r"کنترلر", "کنترلر IR"),
    (r"سنتی", "لوازم ساختمانی"),
    (r"پریز", "پریز هوشمند"),
    (r"کلید", "کلیدهای هوشمند"),
    (r"رله|مکانیزم", "رله و ماژول"),
]

STOP = {
    "و",
    "با",
    "از",
    "در",
    "برای",
    "تا",
    "به",
    "یا",
    "مدل",
    "تویا",
    "tuya",
    "هوشمند",
}


def guess_category(title: str, specs: str, remote_cats: list[str]) -> str:
    blob = f"{title} {specs} {' '.join(remote_cats)}"
    for pat, cat in CATEGORY_RULES:
        if re.search(pat, blob, re.I):
            return cat
    if remote_cats:
        return remote_cats[0]
    return "سایر"


def guess_protocol(blob: str) -> str | None:
    z = bool(re.search(r"zigbee|زیگبی", blob, re.I))
    w = bool(re.search(r"wi-?fi|وای.?فای", blob, re.I))
    if z and w:
        return "Zigbee / Wi-Fi"
    if z:
        return "Zigbee"
    if w:
        return "Wi-Fi"
    return None


def strip_html(raw: str) -> str:
    text = html.unescape(raw or "")
    text = re.sub(r"</(p|li|h\d|div)>", "\n", text, flags=re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def features_from_html(raw: str) -> list[str]:
    items = re.findall(r"<li[^>]*>(.*?)</li>", raw or "", flags=re.I | re.S)
    out = []
    for item in items:
        t = strip_html(item)
        if t:
            out.append(t[:180])
    return out[:12]


def norm(s: str) -> str:
    s = (s or "").lower()
    s = s.replace("ي", "ی").replace("ك", "ک").replace("‌", " ")
    s = re.sub(r"[^\w\u0600-\u06FF]+", " ", s, flags=re.UNICODE)
    return re.sub(r"\s+", " ", s).strip()


def tokens(s: str) -> set[str]:
    return {t for t in norm(s).split() if len(t) > 1 and t not in STOP}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as res:
        payload = json.loads(res.read().decode("utf-8"))
        return payload, res.headers


def fetch_all_remote() -> list[dict]:
    items: list[dict] = []
    page = 1
    total_pages = 1
    while page <= total_pages:
        url = f"{BASE}?per_page=20&page={page}"
        data, headers = fetch_json(url)
        if page == 1:
            total_pages = int(headers.get("X-WP-TotalPages") or 1)
            print(f"Saveria: {headers.get('X-WP-Total')} products, {total_pages} pages", flush=True)
        if not isinstance(data, list):
            raise RuntimeError("unexpected API payload")
        items.extend(data)
        page += 1
        time.sleep(0.15)
    return items


def parse_price(remote: dict) -> tuple[int | None, str | None]:
    prices = remote.get("prices") or {}
    raw = str(prices.get("price") or prices.get("regular_price") or "").strip()
    if not raw or raw in {"0", "00"}:
        return None, "استعلام قیمت"
    try:
        return int(float(raw)), None
    except ValueError:
        return None, "استعلام قیمت"


def best_image_url(remote: dict) -> str | None:
    images = remote.get("images") or []
    if not images:
        return None
    src = images[0].get("src") or images[0].get("thumbnail")
    return src


def download_bytes(url: str) -> bytes | None:
    parts = urllib.parse.urlsplit(url)
    path = urllib.parse.quote(urllib.parse.unquote(parts.path), safe="/")
    encoded = urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))
    last: Exception | None = None
    for target in (encoded, url):
        try:
            req = urllib.request.Request(target, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as res:
                return res.read()
        except Exception as e:
            last = e
    print(f"  image fail: {last}", flush=True)
    return None


def lift_black_background(im: Image.Image, thresh: int = 46) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    def lum(x: int, y: int) -> float:
        r, g, b = px[x, y]
        return (r + g + b) / 3

    corners = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    dark_corners = sum(1 for x, y in corners if lum(x, y) < thresh + 12)
    if dark_corners < 3:
        return rgb

    q: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()
    for x in range(w):
        for y in (0, h - 1):
            if lum(x, y) < thresh:
                q.append((x, y))
                seen.add((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if lum(x, y) < thresh and (x, y) not in seen:
                q.append((x, y))
                seen.add((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (248, 247, 244)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and lum(nx, ny) < thresh:
                seen.add((nx, ny))
                q.append((nx, ny))
    return rgb


def polish_image(data: bytes) -> Image.Image | None:
    try:
        im = Image.open(BytesIO(data))
    except Exception:
        return None
    if im.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", im.size, (248, 247, 244))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = lift_black_background(im)
    w, h = im.size
    shortest = min(w, h)
    if shortest < 900:
        scale = 900 / shortest
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=3))
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.05)
    return im


def save_polished(im: Image.Image, dest: Path) -> str:
    dest = dest.with_suffix(".jpg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(dest, "JPEG", quality=92, optimize=True, progressive=True)
    return dest.name


def fix_local_images(catalog: dict) -> int:
    n = 0
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    for p in catalog["products"]:
        rel = p.get("image")
        if not rel:
            continue
        src = ROOT / "public" / rel.lstrip("/")
        if not src.exists():
            continue
        try:
            polished = polish_image(src.read_bytes())
        except Exception:
            continue
        if not polished:
            continue
        name = save_polished(polished, IMG_DIR / f"p-{p['id']}")
        p["image"] = f"/products/{name}"
        n += 1
    print(f"Fixed {n} local images", flush=True)
    return n


def find_match(remote: dict, products: list[dict]) -> dict | None:
    sku = str(remote.get("sku") or "").strip()
    title = remote.get("name") or ""
    nt = norm(title)
    rt = tokens(title)
    if sku:
        for p in products:
            if str(p.get("sku") or "") == sku:
                return p
            if sku.isdigit() and sku == str(p.get("id")):
                continue
            if sku and sku in str(p.get("title") or ""):
                if len(sku) >= 4:
                    return p
    for p in products:
        local = p.get("title") or ""
        nl = norm(local)
        if nt and nl and (nt == nl or nt in nl or nl in nt):
            if min(len(nt), len(nl)) >= 10:
                return p
        score = jaccard(rt, tokens(local))
        if score >= 0.58 and len(rt & tokens(local)) >= 3:
            return p
    return None


def apply_remote(local: dict, remote: dict, image_path: str | None) -> None:
    price, label = parse_price(remote)
    desc = strip_html(remote.get("description") or "")
    short = strip_html(remote.get("short_description") or "")
    feats = features_from_html(remote.get("short_description") or "")
    cats = [c.get("name") or "" for c in (remote.get("categories") or [])]
    blob = f"{remote.get('name')} {short} {desc}"
    local["title"] = remote.get("name") or local["title"]
    local["price"] = price
    local["priceLabel"] = label
    local["sku"] = str(remote.get("sku") or local.get("sku") or "") or None
    local["description"] = desc[:1800] or local.get("description")
    if feats:
        local["features"] = feats
        local["specs"] = " | ".join(feats)
    elif short:
        local["specs"] = short[:400]
    local["protocol"] = guess_protocol(blob) or local.get("protocol")
    local["category"] = guess_category(local["title"], local.get("specs") or "", cats)
    local["source"] = "saveria"
    if image_path:
        local["image"] = image_path
        imgs = [image_path] + [x for x in (local.get("images") or []) if x != image_path]
        local["images"] = imgs[:6]


def new_product(remote: dict, next_id: int, image_path: str | None) -> dict:
    price, label = parse_price(remote)
    desc = strip_html(remote.get("description") or "")
    short = strip_html(remote.get("short_description") or "")
    feats = features_from_html(remote.get("short_description") or "")
    cats = [c.get("name") or "" for c in (remote.get("categories") or [])]
    title = remote.get("name") or f"محصول {next_id}"
    specs = " | ".join(feats) if feats else short[:400]
    return {
        "id": next_id,
        "title": title,
        "specs": specs or title,
        "description": desc[:1800] or None,
        "features": feats or None,
        "price": price,
        "priceLabel": label,
        "category": guess_category(title, specs, cats),
        "protocol": guess_protocol(f"{title} {specs} {desc}"),
        "image": image_path,
        "images": [image_path] if image_path else [],
        "sku": str(remote.get("sku") or "") or None,
        "source": "saveria",
    }


def store_image(local_id: int, url: str | None) -> str | None:
    if not url:
        return None
    raw = download_bytes(url)
    if not raw:
        return None
    polished = polish_image(raw)
    if not polished:
        return None
    name = save_polished(polished, IMG_DIR / f"p-{local_id}")
    return f"/products/{name}"


def load_catalog() -> dict:
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    return {"meta": {}, "products": []}


def save_catalog(catalog: dict, extra: dict) -> None:
    catalog.setdefault("meta", {})
    catalog["meta"]["productCount"] = len(catalog["products"])
    catalog["meta"]["imageCount"] = sum(1 for p in catalog["products"] if p.get("image"))
    catalog["meta"]["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    catalog["meta"]["sourceFile"] = "saveriasmarthome.com"
    catalog["meta"].update(extra)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")


def sync() -> dict:
    catalog = load_catalog()
    products: list[dict] = catalog.get("products") or []
    remote_list = fetch_all_remote()
    matched = added = updated = images = 0
    next_id = max((p.get("id") or 0) for p in products) + 1 if products else 1

    for i, remote in enumerate(remote_list, 1):
        title = remote.get("name") or "?"
        url = best_image_url(remote)
        found = find_match(remote, products)
        if found:
            matched += 1
            img = store_image(found["id"], url)
            if img:
                images += 1
            apply_remote(found, remote, img or found.get("image"))
            updated += 1
            print(f"[{i}/{len(remote_list)}] match #{found['id']} {title[:48]}", flush=True)
        else:
            img = store_image(next_id, url)
            if img:
                images += 1
            products.append(new_product(remote, next_id, img))
            print(f"[{i}/{len(remote_list)}] add #{next_id} {title[:48]}", flush=True)
            added += 1
            next_id += 1
        time.sleep(0.05)

    catalog["products"] = products
    summary = {
        "fetched": len(remote_list),
        "matched": matched,
        "updated": updated,
        "added": added,
        "images": images,
    }
    save_catalog(catalog, {"saveriaSync": summary})
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return summary


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "sync"
    catalog = load_catalog()
    if mode in {"fix", "fix-local"}:
        n = fix_local_images(catalog)
        save_catalog(catalog, {})
        print(json.dumps({"fixed": n}, ensure_ascii=False))
        return
    if mode == "sync":
        fix_local_images(catalog)
        save_catalog(catalog, {})
        sync()
        return
    print("usage: sync-saveria.py [sync|fix]", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
