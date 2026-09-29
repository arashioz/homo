#!/usr/bin/env python3
"""Parse the Ronash/Homo PDF catalog into products and cropped upload assets."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("Install pypdf: pip3 install pypdf", file=sys.stderr)
    sys.exit(1)

try:
    import pymupdf as fitz
except ImportError:
    print("Install pymupdf: pip3 install pymupdf", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Install pillow: pip3 install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "products.json"
UPLOAD_IMG_DIR = ROOT / "uploads" / "catalog-products"
UPLOAD_IMAGE_PATH = "/api/uploads/catalog-products"

CATEGORY_RULES = [
    (r"پک\s*\d|پکیج|پک\d", "پکیج‌های خانه هوشمند"),
    (
        r"دستگیره|قفل|S-lock|Slock|\bC1[0-9]?\b|\bC7\b|\bC8\b|\bC10\b|\bC11\b|\bC16\b|\bAi0|\bT01\b|\bY56\b",
        "قفل و دستگیره هوشمند",
    ),
    (r"آیفون|Akuvox|آکووکس", "آیفون تصویری"),
    (r"ترموستات|شیر ترمو|سرمایش|گرمایش|فن کوئل", "سرمایش و گرمایش"),
    (r"سنسور|دزدگیر|دوربین", "امنیت و نظارت"),
    (r"ریل پرده|موتور پرده|پرده برقی", "پرده برقی"),
    (r"هاب|gateway|گیتوی|ZHub|ZHUB", "هاب مرکزی"),
    (r"پنل صوتی|اسپیکر|بلندگو|آمپلی", "سیستم صوتی"),
    (r"کنترلر", "کنترلر IR"),
    (r"پریز", "پریز هوشمند"),
    (r"کلید", "کلیدهای هوشمند"),
    (r"رله\s*(تک|دو|سه|چهار|پرده|کانال)|^رله", "رله و ماژول"),
]


def guess_category(title: str, specs: str) -> str:
    for blob in (title, f"{title} {specs}"):
        for pat, cat in CATEGORY_RULES:
            if re.search(pat, blob, re.I):
                return cat
    return "سایر"


def clean_text(full: str) -> str:
    for n in [
        r"کدRonash800503[^\n]*",
        r"ثبت سفارش[^\n]*",
        r"ردیفتصویر محصول[^\n]*",
        r"عنوان محصولمشخصات محصولقیمت[^\n]*",
        r"کاتالوگ قیمت[^\n]*",
    ]:
        full = re.sub(n, "\n", full)
    return full


def parse_products(text: str) -> list[dict]:
    item_re = re.compile(
        r"(?:^|\n)\s*(\d{1,3})\s*\n((?:(?!\n\s*\d{1,3}\s*\n).)*?)(?:\n)\s*(\d{1,3}(?:,\d{3})+|استعلام[^\n]*)\s*(?=\n|$)",
        re.S,
    )
    products: list[dict] = []
    seen: set[int] = set()
    skip = (
        r"قابلیت|نصب در|رله\s*\d|پروتکل|دارای|مناسب برای|ابعاد|ورودی|"
        r"خروجی جریان|بدنه|صفحه نمایش|RAM|ROM|سیستم عامل"
    )
    for m in item_re.finditer(text):
        rid = int(m.group(1))
        body = m.group(2).strip()
        price_raw = m.group(3).strip()
        if rid in seen or rid < 1 or rid > 400 or len(body) < 6:
            continue
        lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
        if not lines:
            continue
        title_parts: list[str] = []
        rest: list[str] = []
        for i, ln in enumerate(lines):
            if i < 3 and len(ln) < 50 and not re.search(skip, ln):
                title_parts.append(ln)
            else:
                rest.append(ln)
        if not title_parts:
            title_parts, rest = [lines[0]], lines[1:]
        title = re.sub(r"\s+", " ", " ".join(title_parts)).strip()
        if re.fullmatch(r"[\d\s,]+", title):
            continue
        features = rest[:12]
        specs = " | ".join(features)
        if price_raw.startswith("استعلام"):
            price, price_label = None, "استعلام قیمت"
        else:
            price, price_label = int(price_raw.replace(",", "")), None
        seen.add(rid)
        blob = f"{title} {specs}"
        if re.search(r"Zigbee|زیگبی", blob, re.I):
            protocol = "Zigbee"
        elif re.search(r"Wi-?Fi\s*\+\s*RF|WIFI\+RF", blob, re.I):
            protocol = "Wi-Fi+RF"
        elif re.search(r"Wi-?Fi|WIFI", blob, re.I):
            protocol = "Wi-Fi"
        else:
            protocol = None
        products.append(
            {
                "id": rid,
                "title": title,
                "specs": specs,
                "features": [s for s in features if s],
                "price": price,
                "priceLabel": price_label,
                "category": guess_category(title, specs),
                "protocol": protocol,
                "image": None,
            }
        )
    return products


def parse_compact_rows(text: str, known_ids: set[int]) -> list[dict]:
    """Recover catalog rows where the PDF joins a row number or price to text.

    The Ronash PDF has a handful of rows such as ``5کلید`` and
    ``نصب1,900,000``.  The primary parser intentionally stays conservative,
    so this fallback walks the ordered row numbers and fills only entries it
    could not read in the first pass.
    """
    excluded_after_id = (
        r"پل|فاز|نول|آمپر|خروجی|عدد|اینچ|کانال|ولت|وات|کیلو|سانت|"
        r"مگاپیکسل|سیم|متر|درصد|GB|میلی"
    )
    starts: list[tuple[int, int]] = []
    for match in re.finditer(r"(?m)^(\d{1,3})(?!,)(?=\s*[^\d\s])", text):
        rid = int(match.group(1))
        after = text[match.end() : match.end() + 48].replace("\n", " ")
        if not 1 <= rid <= 400 or re.match(rf"\s*(?:{excluded_after_id})", after, re.I):
            continue
        starts.append((rid, match.start()))

    # Catalog rows are numbered in order. Selecting each next row number
    # avoids confusing a number inside the previous product's specifications
    # with a product row.
    ordered: list[tuple[int, int]] = []
    cursor = 0
    for rid in range(1, 401):
        candidate = next((item for item in starts if item[0] == rid and item[1] >= cursor), None)
        if candidate is None:
            continue
        ordered.append(candidate)
        cursor = candidate[1] + 1

    recovered: list[dict] = []
    skip = (
        r"قابلیت|نصب در|رله\s*\d|پروتکل|دارای|مناسب برای|ابعاد|ورودی|"
        r"خروجی جریان|بدنه|صفحه نمایش|RAM|ROM|سیستم عامل"
    )
    price_re = re.compile(r"\d{1,3}(?:,\d{3})+|استعلام[^\n]*")
    for index, (rid, start) in enumerate(ordered):
        if rid in known_ids:
            continue
        end = ordered[index + 1][1] if index + 1 < len(ordered) else len(text)
        body = text[start + len(str(rid)) : end].strip()
        prices = list(price_re.finditer(body))
        if not prices:
            continue
        price_match = prices[-1]
        price_raw = price_match.group(0).strip()
        body = f"{body[:price_match.start()]}\n{body[price_match.end():]}".strip()
        lines = [line.strip() for line in body.splitlines() if line.strip()]
        if not lines:
            continue
        title_parts: list[str] = []
        rest: list[str] = []
        for line_index, line in enumerate(lines):
            if line_index < 3 and len(line) < 50 and not re.search(skip, line):
                title_parts.append(line)
            else:
                rest.append(line)
        if not title_parts:
            title_parts, rest = [lines[0]], lines[1:]
        title = re.sub(r"\s+", " ", " ".join(title_parts)).strip()
        if len(title) < 3 or re.fullmatch(r"[\d\s,]+", title):
            continue
        features = rest[:12]
        specs = " | ".join(features)
        if price_raw.startswith("استعلام"):
            price, price_label = None, "استعلام قیمت"
        else:
            price, price_label = int(price_raw.replace(",", "")), None
        blob = f"{title} {specs}"
        if re.search(r"Zigbee|زیگبی", blob, re.I):
            protocol = "Zigbee"
        elif re.search(r"Wi-?Fi\s*\+\s*RF|WIFI\+RF", blob, re.I):
            protocol = "Wi-Fi+RF"
        elif re.search(r"Wi-?Fi|WIFI", blob, re.I):
            protocol = "Wi-Fi"
        else:
            protocol = None
        recovered.append(
            {
                "id": rid,
                "title": title,
                "specs": specs,
                "features": [feature for feature in features if feature],
                "price": price,
                "priceLabel": price_label,
                "category": guess_category(title, specs),
                "protocol": protocol,
                "image": None,
            }
        )
    return recovered


def product_ids_per_page(reader: PdfReader) -> list[list[int]]:
    """Read ordered product row IDs even when PDF text joins words and IDs."""
    excluded_after_id = (
        r"پل|فاز|نول|آمپر|خروجی|عدد|اینچ|کانال|ولت|وات|کیلو|سانت|"
        r"مگاپیکسل|سیم|متر|درصد|GB|میلی"
    )
    expected_id = 1
    result: list[list[int]] = []
    for source_page in reader.pages:
        text = source_page.extract_text() or ""
        page_ids: list[int] = []
        for match in re.finditer(r"(?m)^(\d{1,3})(?!,)(?=\s*[^\d\s])", text):
            rid = int(match.group(1))
            after = text[match.end() : match.end() + 48].replace("\n", " ")
            if re.match(rf"\s*(?:{excluded_after_id})", after, re.I):
                continue
            if rid == expected_id:
                page_ids.append(rid)
                expected_id += 1
        result.append(page_ids)
    return result


def table_lines(page, *, horizontal: bool) -> list[float]:
    values: set[float] = set()
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            if item[0] != "l":
                continue
            start, end = item[1], item[2]
            if horizontal and abs(start.y - end.y) < 0.1 and start.x < 40 and end.x > 560:
                values.add(round(start.y, 2))
            if not horizontal and abs(start.x - end.x) < 0.1 and abs(start.y - end.y) > 400:
                values.add(round(start.x, 2))
    return sorted(values)


def raster_table_lines(page, *, horizontal: bool) -> list[float]:
    """Fallback for PDF pages whose table borders are flattened into artwork."""
    pixmap = page.get_pixmap(alpha=False)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples).convert("L")
    width, height = image.size
    pixels = image.load()
    hits: list[int] = []
    if horizontal:
        x0, x1 = max(0, int(width * 0.05)), min(width, int(width * 0.96))
        threshold = int((x1 - x0) * 0.55)
        for y in range(int(height * 0.07), int(height * 0.99)):
            if sum(pixels[x, y] < 180 for x in range(x0, x1)) >= threshold:
                hits.append(y)
    else:
        y0, y1 = int(height * 0.07), int(height * 0.99)
        threshold = int((y1 - y0) * 0.2)
        for x in range(int(width * 0.05), int(width * 0.98)):
            if sum(pixels[x, y] < 180 for y in range(y0, y1)) >= threshold:
                hits.append(x)

    groups: list[list[int]] = []
    for hit in hits:
        if not groups or hit > groups[-1][-1] + 1:
            groups.append([hit])
        else:
            groups[-1].append(hit)
    return [sum(group) / len(group) for group in groups]


def row_id_centers(page) -> dict[int, float]:
    centers: dict[int, float] = {}
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            x0, y0, _x1, y1 = line["bbox"]
            if x0 <= 480 or not re.fullmatch(r"\d{1,3}", text):
                continue
            rid = int(text)
            if 1 <= rid <= 400:
                centers.setdefault(rid, (y0 + y1) / 2)
    return centers


def extract_catalog_crops(
    doc, page_product_ids: list[list[int]], product_ids: set[int], *, clear_existing: bool = True
) -> dict[int, str]:
    """Crop the PDF's product-image column and store its rendered appearance.

    Rendering each table cell preserves the exact crop and paired-product
    layouts shown in the catalog, rather than relying on the raw embedded
    image bytes.
    """
    UPLOAD_IMG_DIR.mkdir(parents=True, exist_ok=True)
    if clear_existing:
        for old in UPLOAD_IMG_DIR.glob("p-*.jpg"):
            old.unlink()

    mapping: dict[int, str] = {}
    for page_index, page in enumerate(doc):
        rows = page_product_ids[page_index] if page_index < len(page_product_ids) else []
        if not rows:
            continue
        horizontal = table_lines(page, horizontal=True)
        intervals = [(top, bottom) for top, bottom in zip(horizontal, horizontal[1:]) if bottom - top >= 50]
        if len(intervals) < len(rows):
            horizontal = raster_table_lines(page, horizontal=True)
            intervals = [(top, bottom) for top, bottom in zip(horizontal, horizontal[1:]) if bottom - top >= 50]
        if len(intervals) < len(rows):
            print(f"  skip page {page_index + 1}: catalog table not detected", file=sys.stderr)
            continue

        # The Ronash catalog keeps this column fixed on every page. Using its
        # fixed bounds prevents decorative lines inside a product photo from
        # being mistaken for a table border.
        image_left, image_right = 385.33, 536.80
        centers = row_id_centers(page)
        row_intervals: dict[int, tuple[float, float]] = {}
        used_intervals: set[int] = set()
        for rid in rows:
            center = centers.get(rid)
            if center is None:
                continue
            interval_index = next(
                (index for index, (top, bottom) in enumerate(intervals) if top <= center <= bottom),
                None,
            )
            if interval_index is not None:
                row_intervals[rid] = intervals[interval_index]
                used_intervals.add(interval_index)

        remaining_intervals = [interval for index, interval in enumerate(intervals) if index not in used_intervals]
        for rid in rows:
            if rid not in row_intervals and remaining_intervals:
                row_intervals[rid] = remaining_intervals.pop(0)

        for rid in rows:
            if rid not in product_ids:
                continue
            bounds = row_intervals.get(rid)
            if bounds is None:
                continue
            top, bottom = bounds
            crop = fitz.Rect(
                image_left + 5,
                top + 5,
                image_right - 5,
                bottom - 5,
            )
            if crop.is_empty or crop.is_infinite:
                continue
            try:
                pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=crop, alpha=False)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                destination = UPLOAD_IMG_DIR / f"p-{rid}.jpg"
                image.save(destination, "JPEG", quality=92, optimize=True, progressive=True)
                mapping[rid] = f"{UPLOAD_IMAGE_PATH}/p-{rid}.jpg"
            except Exception as error:
                print(f"  skip crop for product {rid}: {error}", file=sys.stderr)
    return mapping


def import_pdf(pdf_path: Path, *, existing: dict | None = None, append_only: bool = False) -> dict:
    reader = PdfReader(str(pdf_path))
    full = "\n".join((p.extract_text() or "") for p in reader.pages)
    full = clean_text(full)

    by_id = {p["id"]: p for p in parse_products(full)}
    glued = re.sub(r"(?:^|\n)(\d{1,3})([\u0600-\u06FFA-Za-z])", r"\n\1\n\2", full)
    for p in parse_products(glued):
        by_id.setdefault(p["id"], p)
    for p in parse_compact_rows(full, set(by_id)):
        by_id.setdefault(p["id"], p)

    if append_only and existing:
        existing_products = existing.get("products", [])
        existing_ids = {int(p.get("id")) for p in existing_products if str(p.get("id", "")).isdigit()}
        existing_titles = {normalize_title(str(p.get("title", ""))) for p in existing_products}
        by_id = {
            rid: p
            for rid, p in by_id.items()
            if rid not in existing_ids and normalize_title(p.get("title", "")) not in existing_titles
        }

    page_product_ids = product_ids_per_page(reader)
    doc = fitz.open(str(pdf_path))
    images = extract_catalog_crops(
        doc,
        page_product_ids,
        set(by_id.keys()),
        clear_existing=not append_only,
    )
    doc.close()

    for rid, img in images.items():
        if rid in by_id:
            by_id[rid]["image"] = img

    products = sorted(by_id.values(), key=lambda x: x["id"])
    if append_only and existing:
        merged = [*existing.get("products", []), *products]
        meta = dict(existing.get("meta", {}))
        meta.update(
            {
                "updatedAt": datetime.now().isoformat(timespec="seconds"),
                "productCount": len(merged),
                "imageCount": len([p for p in merged if p.get("image")]),
                "sourceFile": f"{existing.get('meta', {}).get('sourceFile') or 'کاتالوگ'} + append-only PDF",
            }
        )
        return {
            "meta": meta,
            "products": sorted(merged, key=lambda x: int(x.get("id", 0))),
            "addedProducts": products,
        }
    return {
        "meta": {
            "brand": "هومو",
            "tagline": "خانه هوشمند هومو",
            "catalogCode": "Ronash800503",
            "updatedAt": datetime.now().isoformat(timespec="seconds"),
            "contactPhone": "09356545158",
            "contactName": "حسین",
            "productCount": len(products),
            "imageCount": len(images),
            "sourceFile": "کاتالوگ هوشمندسازی روناش",
        },
        "products": products,
    }


def normalize_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title or "").strip().lower()
    title = title.replace("ي", "ی").replace("ك", "ک")
    return title


def main() -> None:
    append_only = "--append-only" in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != "--append-only"]
    pdf = Path(args[0]) if args else next(ROOT.glob("*.pdf"))
    existing = None
    if append_only and OUT.exists():
        existing = json.loads(OUT.read_text(encoding="utf-8"))
    data = import_pdf(pdf, existing=existing, append_only=append_only)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    added_count = len(data.pop("addedProducts", []))
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    if append_only:
        print(
            f"Append-only import added {added_count} new products. "
            f"Catalog now has {data['meta']['productCount']} products, "
            f"{data['meta']['imageCount']} images → {OUT}"
        )
    else:
        print(
            f"Wrote {data['meta']['productCount']} products, "
            f"{data['meta']['imageCount']} images → {OUT}"
        )


if __name__ == "__main__":
    main()
