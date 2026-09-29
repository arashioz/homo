#!/usr/bin/env python3
"""Process catalog products to extract white and black switch images and populate real galleries and color variants."""
import json
import os
import glob
import re
from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(ROOT, "uploads", "catalog-products")
PUBLIC_DIR = os.path.join(ROOT, "public", "products")
DATA_FILE = os.path.join(ROOT, "data", "products.json")

os.makedirs(CATALOG_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

with open(DATA_FILE, "r", encoding="utf-8") as f:
    catalog = json.load(f)

products = catalog.get("products", [])

def make_square_centered(img):
    w, h = img.size
    side = max(w, h)
    new_img = Image.new("RGB", (side, side), (255, 255, 255))
    offset = ((side - w) // 2, (side - h) // 2)
    new_img.paste(img, offset)
    return new_img

dual_processed = 0

for p in products:
    pid = p.get("id")
    img_path = os.path.join(CATALOG_DIR, f"p-{pid}.jpg")
    
    cat = p.get("category", "") or ""
    title = p.get("title", "") or ""
    blob = f"{cat} {title}"
    is_switch = any(k in blob for k in ["کلید", "پریز", "دیمر", "شاسی", "پنل"])
    
    if not os.path.exists(img_path):
        if is_switch:
            p["colors"] = ["سفید", "مشکی"]
        continue
    
    try:
        im = Image.open(img_path)
        w, h = im.size
        
        is_dual = False
        left_is_black = True
        
        if w > h * 1.05:
            mid = w // 2
            left = im.crop((0, 0, mid, h))
            right = im.crop((mid, 0, w, h))
            stat_l = ImageStat.Stat(left.convert("L"))
            stat_r = ImageStat.Stat(right.convert("L"))
            mean_l = stat_l.mean[0]
            mean_r = stat_r.mean[0]
            
            if abs(mean_l - mean_r) > 25:
                is_dual = True
                left_is_black = mean_l < mean_r
            elif is_switch and w >= h * 1.15:
                is_dual = True
                left_is_black = mean_l <= mean_r

        if is_dual:
            mid = w // 2
            left = im.crop((0, 0, mid, h))
            right = im.crop((mid, 0, w, h))
            
            black_crop = left if left_is_black else right
            white_crop = right if left_is_black else left
            
            black_sq = make_square_centered(black_crop)
            white_sq = make_square_centered(white_crop)
            
            black_name = f"p-{pid}-black.jpg"
            white_name = f"p-{pid}-white.jpg"
            
            black_path = os.path.join(CATALOG_DIR, black_name)
            white_path = os.path.join(CATALOG_DIR, white_name)
            
            black_sq.save(black_path, quality=95)
            white_sq.save(white_path, quality=95)
            
            # Also mirror to public/products for universal compatibility
            black_sq.save(os.path.join(PUBLIC_DIR, black_name), quality=95)
            white_sq.save(os.path.join(PUBLIC_DIR, white_name), quality=95)
            
            black_url = f"/api/uploads/catalog-products/{black_name}"
            white_url = f"/api/uploads/catalog-products/{white_name}"
            full_url = f"/api/uploads/catalog-products/p-{pid}.jpg"
            
            p["colors"] = ["سفید", "مشکی"]
            p["images"] = [full_url, white_url, black_url]
            p["colorImages"] = {
                "سفید": white_url,
                "مشکی": black_url
            }
            dual_processed += 1
        else:
            base_url = f"/api/uploads/catalog-products/p-{pid}.jpg"
            gallery = [base_url]
            
            pub_jpg = os.path.join(PUBLIC_DIR, f"p-{pid}.jpg")
            pub_png = os.path.join(PUBLIC_DIR, f"p-{pid}.png")
            if os.path.exists(pub_jpg):
                gallery.append(f"/products/p-{pid}.jpg")
            elif os.path.exists(pub_png):
                gallery.append(f"/products/p-{pid}.png")
                
            p["images"] = list(dict.fromkeys(gallery))
            if is_switch:
                p["colors"] = ["سفید", "مشکی"]
            elif not p.get("colors"):
                p["colors"] = []
    except Exception as e:
        print(f"Error processing pid {pid}: {e}")

with open(DATA_FILE, "w", encoding="utf-8") as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {dual_processed} dual switch/socket products with white & black image crops and galleries!")
