#!/usr/bin/env python3
"""Extract product photos from an .xlsx catalog and attach them to products.json.

Expected layout (flexible):
  - A column with numeric product id (کد / ردیف / id)
  - Embedded images anchored to those rows
  - Optional column with image URL / file path

Usage:
  python3 scripts/import-excel-images.py path/to/catalog.xlsx
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    from openpyxl import load_workbook
except ImportError:
    print("Install openpyxl: pip3 install openpyxl", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image as PILImage
except ImportError:
    PILImage = None  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_PATH = ROOT / "data" / "products.json"
IMG_DIR = ROOT / "public" / "products"

ID_HEADERS = ("کد", "ردیف", "id", "شناسه", "شماره", "row")
IMG_HEADERS = ("تصویر", "عکس", "image", "photo", "img")


def col_index_by_header(ws, names: tuple[str, ...]) -> int | None:
    for cell in ws[1]:
        val = str(cell.value or "").strip().lower()
        if any(n.lower() in val for n in names):
            return cell.column
    return None


def row_ids(ws, id_col: int) -> dict[int, int]:
    """Excel row number (1-based) → product id."""
    mapping: dict[int, int] = {}
    for row in range(1, ws.max_row + 1):
        raw = ws.cell(row=row, column=id_col).value
        if raw is None:
            continue
        text = str(raw).strip()
        m = re.search(r"\d{1,3}", text)
        if not m:
            continue
        pid = int(m.group(0))
        if 1 <= pid <= 999:
            mapping[row] = pid
    return mapping


def save_image_bytes(data: bytes, dest_base: Path) -> str | None:
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    dest = dest_base.with_suffix(".jpg")
    if PILImage is not None:
        try:
            from io import BytesIO

            img = PILImage.open(BytesIO(data))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            else:
                img = img.convert("RGB")
            img.save(dest, "JPEG", quality=92)
            return f"/products/{dest.name}"
        except Exception as e:
            print(f"  pillow skip {dest_base.name}: {e}", file=sys.stderr)
    dest = dest_base.with_suffix(".bin")
    dest.write_bytes(data)
    # try common extensions
    for ext in (".jpg", ".png", ".webp"):
        guess = dest_base.with_suffix(ext)
        guess.write_bytes(data)
        dest.unlink(missing_ok=True)
        return f"/products/{guess.name}"
    return None


def extract_embedded(ws, id_by_row: dict[int, int]) -> dict[int, str]:
    images = getattr(ws, "_images", []) or []
    mapping: dict[int, str] = {}
    for img in images:
        anchor = getattr(img, "anchor", None)
        if anchor is None:
            continue
        src = getattr(anchor, "_from", None) or getattr(anchor, "from_", None)
        if src is None:
            continue
        excel_row = int(getattr(src, "row", 0)) + 1
        pid = id_by_row.get(excel_row)
        if pid is None:
            # header offset: image on data row without id cell — try nearby
            pid = id_by_row.get(excel_row + 1) or id_by_row.get(excel_row - 1)
        if pid is None:
            continue
        data = getattr(img, "_data", None)
        if callable(data):
            blob = data()
        else:
            blob = data
        if not blob:
            continue
        path = save_image_bytes(blob, IMG_DIR / f"p-{pid}")
        if path:
            mapping[pid] = path
    return mapping


def extract_url_column(ws, id_col: int, img_col: int) -> dict[int, str]:
    mapping: dict[int, str] = {}
    for row in range(2, ws.max_row + 1):
        raw_id = ws.cell(row=row, column=id_col).value
        raw_img = ws.cell(row=row, column=img_col).value
        if raw_id is None or not raw_img:
            continue
        m = re.search(r"\d{1,3}", str(raw_id))
        if not m:
            continue
        pid = int(m.group(0))
        url = str(raw_img).strip()
        if url.startswith("/") or url.startswith("http"):
            mapping[pid] = url
    return mapping


def import_excel(xlsx: Path) -> dict:
    wb = load_workbook(xlsx, data_only=True)
    ws = wb.active
    id_col = col_index_by_header(ws, ID_HEADERS) or 1
    img_col = col_index_by_header(ws, IMG_HEADERS)

    ids = row_ids(ws, id_col)
    mapping = extract_embedded(ws, ids)
    if img_col:
        mapping.update(extract_url_column(ws, id_col, img_col))

    catalog = json.loads(PRODUCTS_PATH.read_text(encoding="utf-8"))
    attached = 0
    for p in catalog.get("products", []):
        path = mapping.get(p["id"])
        if path:
            p["image"] = path
            attached += 1

    catalog.setdefault("meta", {})
    catalog["meta"]["imageCount"] = sum(1 for p in catalog["products"] if p.get("image"))
    catalog["meta"]["updatedAt"] = datetime.now().isoformat(timespec="seconds")
    catalog["meta"]["excelFile"] = xlsx.name
    PRODUCTS_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "embedded": len(mapping),
        "attached": attached,
        "imageCount": catalog["meta"]["imageCount"],
        "rows": len(ids),
    }


def main() -> None:
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else next(ROOT.glob("*.xlsx"), None)
    if xlsx is None or not xlsx.exists():
        print("Excel file not found", file=sys.stderr)
        sys.exit(1)
    result = import_excel(xlsx)
    print(
        f"Excel rows={result['rows']} images={result['embedded']} "
        f"attached={result['attached']} total={result['imageCount']}"
    )


if __name__ == "__main__":
    main()
