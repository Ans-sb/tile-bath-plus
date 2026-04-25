import json
import re
from pathlib import Path

from pypdf import PdfReader


PDF_PATH = Path(r"C:\Users\asb82\OneDrive\문서\카카오톡 받은 파일\2026 타일앤바스플러스 카달로그.pdf")
ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "products.json"
IMAGE_DIR = ROOT / "images" / "catalog"

TYPE_TO_KIND = {
    "porcelain": "바닥 타일",
    "polishing": "바닥 타일",
    "wall tile": "벽 타일",
    "floor tile": "바닥 타일",
}

TYPE_TO_FINISH = {
    "porcelain": "무광",
    "polishing": "유광",
    "wall tile": "",
    "floor tile": "무광",
}

PRODUCT_RE = re.compile(
    r"(?:NEW\s+)?(\d{3,4})\s*X\s*(\d{3,4})\s+([A-Z]?\d{3,5})\s*(?:I|\||l)\s*"
    r"(Porcelain|Polishing|Wall\s+tile|Floor\s+tile)",
    re.IGNORECASE,
)


def slug(value):
    value = value.lower().replace(" ", "-").replace("*", "-")
    value = re.sub(r"[^a-z0-9가-힣-]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def read_existing_products():
    if not DB_PATH.exists():
        return []
    return json.loads(DB_PATH.read_text(encoding="utf-8"))


def image_extension(name):
    suffix = Path(name).suffix.lower()
    return suffix if suffix in [".jpg", ".jpeg", ".png", ".webp"] else ".jpg"


def extract_page_images(page, page_no):
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, image in enumerate(getattr(page, "images", [])):
        pil_image = getattr(image, "image", None)
        width = getattr(pil_image, "width", 0)
        height = getattr(pil_image, "height", 0)
        if width < 180 or height < 180:
            continue

        ext = image_extension(image.name)
        filename = f"catalog_p{page_no:02d}_img{index:02d}{ext}"
        path = IMAGE_DIR / filename
        path.write_bytes(image.data)
        saved.append({
            "path": f"images/catalog/{filename}",
            "width": width,
            "height": height,
            "area": width * height,
            "name": image.name,
        })
    return saved


def pick_product_images(images):
    if len(images) <= 1:
        return images
    largest_area = max(image["area"] for image in images)
    return [image for image in images if image["area"] < largest_area]


def make_product(match, page_no, image_path):
    width, height, code, raw_type = match.groups()
    catalog_type = re.sub(r"\s+", " ", raw_type).strip().lower()
    size = f"{width}*{height}"
    kind = TYPE_TO_KIND.get(catalog_type, "바닥 타일")
    finish = TYPE_TO_FINISH.get(catalog_type, "")
    type_label = catalog_type.title().replace("Tile", "tile")
    name = f"{code} {type_label}"

    return {
        "id": f"catalog-{slug(catalog_type)}-{size.replace('*', '-')}-{slug(code)}",
        "productType": "tile",
        "kind": kind,
        "name": name,
        "size": size,
        "finish": finish,
        "maker": "타일앤바스플러스 카달로그",
        "unit": "m²",
        "option": catalog_type,
        "costPrice": 0,
        "retailPrice": 0,
        "wholesalePrice": 0,
        "stockQty": 0,
        "image": image_path or "",
        "catalogPage": page_no,
        "catalogCode": code,
        "catalogType": raw_type,
        "imageMatchNote": "PDF 내부 이미지 순서 기준 자동 매칭",
    }


def import_catalog():
    reader = PdfReader(str(PDF_PATH))
    existing = read_existing_products()
    by_id = {product["id"]: product for product in existing}
    seen_catalog_keys = set()
    imported = []
    image_count = 0

    for page_index, page in enumerate(reader.pages):
      page_no = page_index + 1
      text = page.extract_text() or ""
      matches = list(PRODUCT_RE.finditer(text))
      if not matches:
          continue

      images = extract_page_images(page, page_no)
      image_count += len(images)
      product_images = pick_product_images(images)

      for match_index, match in enumerate(matches):
          width, height, code, raw_type = match.groups()
          key = (width, height, code, raw_type.lower())
          if key in seen_catalog_keys:
              continue
          seen_catalog_keys.add(key)

          image_path = product_images[match_index]["path"] if match_index < len(product_images) else ""
          product = make_product(match, page_no, image_path)
          by_id[product["id"]] = product
          imported.append(product)

    merged = list(by_id.values())
    DB_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {
        "pdf": str(PDF_PATH),
        "pages": len(reader.pages),
        "extracted_images": image_count,
        "imported_catalog_products": len(imported),
        "total_products_in_db": len(merged),
        "db": str(DB_PATH),
        "image_dir": str(IMAGE_DIR),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    import_catalog()
