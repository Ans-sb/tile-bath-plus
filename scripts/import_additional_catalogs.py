import json
import re
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "products.json"
PRODUCTS_JS = ROOT / "products-db.js"
IMAGE_ROOT = ROOT / "images" / "catalog"
KAKAO_DIR = Path.home() / "OneDrive" / "문서" / "카카오톡 받은 파일"

CATALOGS = [
    {
        "file": "2025브랜드타일 카탈로그.pdf",
        "source": "2025브랜드타일",
        "maker": "브랜드타일",
        "mode": "text",
    },
    {
        "file": "에스지세라-24_18T_카탈로그_e-catalog.pdf",
        "source": "에스지세라 24 18T",
        "maker": "에스지세라",
        "mode": "image_page",
        "size": "18T",
    },
    {
        "file": "에스지세라 -대형사이즈타일_e-카달로그.pdf",
        "source": "에스지세라 대형사이즈",
        "maker": "에스지세라",
        "mode": "image_page",
        "size": "대형사이즈",
    },
    {
        "file": "에스지세라 -300각600각_카달로그.pdf",
        "source": "에스지세라 300각600각",
        "maker": "에스지세라",
        "mode": "image_page",
        "size": "300*300 / 300*600",
    },
]

BRAND_PRODUCT_RE = re.compile(
    r"^([A-Z]{1,4}(?:\s+[A-Z]{1,4})?(?:[-\s][A-Z0-9]+)*\s*\d{2,6}[A-Z]*(?:\s*\([^)]+\))?)\s*/\s*(.*)$"
)


def catalog_path(catalog):
    path = KAKAO_DIR / catalog["file"]
    if not path.exists():
        matches = list(KAKAO_DIR.glob(f"*{catalog['file'][-12:]}"))
        if matches:
            return matches[0]
    return path


def slug(value):
    value = str(value).lower().replace("*", "-").replace("/", "-").replace(" ", "-")
    value = re.sub(r"[^a-z0-9가-힣]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def save_page_images(page, page_no, source_slug):
    out_dir = IMAGE_ROOT / source_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = []

    for index, image in enumerate(getattr(page, "images", [])):
        pil = getattr(image, "image", None)
        width = getattr(pil, "width", 0)
        height = getattr(pil, "height", 0)
        if width < 220 or height < 220:
            continue

        filename = f"p{page_no:03d}_img{index:02d}.jpg"
        path = out_dir / filename
        try:
            pil.convert("RGB").save(path, "JPEG", quality=90, optimize=True)
            byte_size = path.stat().st_size
        except Exception:
            raw = image.data
            try:
                path.write_bytes(raw)
            except Exception:
                # Last-resort path for uncommon image wrappers.
                with BytesIO() as buffer:
                    pil.convert("RGB").save(buffer, "JPEG", quality=90)
                    raw = buffer.getvalue()
                path.write_bytes(raw)
            byte_size = path.stat().st_size

        saved.append({
            "path": path.relative_to(ROOT).as_posix(),
            "width": width,
            "height": height,
            "area": width * height,
            "bytes": byte_size,
        })
    return saved


def infer_size_from_text(page_text, name):
    normalized = page_text.lower().replace(" ", "")
    compact_name = re.sub(r"[^a-z0-9]", "", name.lower())

    for size in [
        "600x1200",
        "800x800",
        "600x600",
        "400x800",
        "300x600",
        "300x300",
        "250x400",
        "200x200",
        "100x300",
        "100x100",
        "150x600",
    ]:
        if size in normalized or size.replace("x", "") in compact_name:
            return size.replace("x", "*")

    # Brand tile product codes often embed size-family hints.
    if "612" in compact_name:
        return "600*1200"
    if "880" in compact_name or compact_name.endswith("88"):
        return "800*800"
    if "660" in compact_name or compact_name.endswith("66"):
        return "600*600"
    return ""


def infer_kind(size, page_text):
    text = page_text.lower()
    if "wall" in text or "벽타일" in page_text or "벽 타일" in page_text:
        if size in ["300*600", "250*400", "100*300", "400*800"]:
            return "벽 타일"
    if "floor" in text or "바닥타일" in page_text or "바닥 타일" in page_text:
        return "바닥 타일"
    if size in ["300*600", "250*400", "400*800", "100*300"]:
        return "벽 타일"
    return "바닥 타일"


def infer_finish(name, page_text):
    text = f"{name} {page_text}".lower()
    if "glossy" in text or "유광" in page_text:
        return "유광"
    if "matt" in text or "무광" in page_text or "사틴" in page_text:
        return "무광"
    return ""


def product_images_for_page(images):
    if not images:
        return []
    largest = max(image["area"] for image in images)
    if len(images) > 1:
        product_cuts = [image for image in images if image["area"] < largest and image["area"] > 60000]
        return product_cuts or images
    return images


def extract_brand_text_products(reader, catalog):
    source_slug = slug(catalog["source"])
    products = []

    for page_index, page in enumerate(reader.pages):
        page_no = page_index + 1
        text = page.extract_text() or ""
        if not text.strip():
            continue

        images = product_images_for_page(save_page_images(page, page_no, source_slug))
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        product_names = []

        for line in lines:
            match = BRAND_PRODUCT_RE.match(line)
            if not match:
                continue
            name = re.sub(r"\s+", " ", match.group(1).strip())
            option = match.group(2).strip()
            if len(name) < 4 or name.lower().startswith(("ver", "new")):
                continue
            product_names.append((name, option))

        for index, (name, option) in enumerate(product_names):
            size = infer_size_from_text(text, name)
            image = images[index]["path"] if index < len(images) else ""
            products.append({
                "id": f"catalog-{source_slug}-{slug(name)}",
                "productType": "tile",
                "kind": infer_kind(size, text),
                "name": name,
                "size": size,
                "finish": infer_finish(name, text),
                "maker": catalog["maker"],
                "unit": "m²",
                "option": option,
                "costPrice": 0,
                "retailPrice": 0,
                "wholesalePrice": 0,
                "stockQty": 0,
                "image": image,
                "catalogSource": catalog["source"],
                "catalogPage": page_no,
                "imageMatchNote": "텍스트 상품 순서와 PDF 이미지 순서 기준 자동 매칭",
            })
    return products


def extract_image_page_products(reader, catalog):
    source_slug = slug(catalog["source"])
    products = []

    for page_index, page in enumerate(reader.pages):
        page_no = page_index + 1
        images = save_page_images(page, page_no, source_slug)
        if not images:
            continue

        image = sorted(images, key=lambda item: item["area"], reverse=True)[0]
        name = f"{catalog['source']} P{page_no:03d}"
        products.append({
            "id": f"catalog-{source_slug}-p{page_no:03d}",
            "productType": "tile",
            "kind": "바닥 타일",
            "name": name,
            "size": catalog["size"],
            "finish": "",
            "maker": catalog["maker"],
            "unit": "m²",
            "option": "스캔 카탈로그 이미지 기반 등록",
            "costPrice": 0,
            "retailPrice": 0,
            "wholesalePrice": 0,
            "stockQty": 0,
            "image": image["path"],
            "catalogSource": catalog["source"],
            "catalogPage": page_no,
            "imageMatchNote": "텍스트 추출 불가 PDF의 페이지 대표 이미지로 자동 등록",
        })
    return products


def load_db():
    return json.loads(DB.read_text(encoding="utf-8")) if DB.exists() else []


def save_db(products):
    DB.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PRODUCTS_JS.write_text(
        "window.PRODUCTS_DB = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


def main():
    existing = load_db()
    by_id = {item["id"]: item for item in existing}
    report = []

    for catalog in CATALOGS:
        path = catalog_path(catalog)
        if not path.exists():
            report.append({"source": catalog["source"], "error": f"파일 없음: {path}"})
            continue

        reader = PdfReader(str(path))
        if catalog["mode"] == "text":
            new_products = extract_brand_text_products(reader, catalog)
        else:
            new_products = extract_image_page_products(reader, catalog)

        for product in new_products:
            by_id[product["id"]] = product
        report.append({
            "source": catalog["source"],
            "file": str(path),
            "pages": len(reader.pages),
            "imported": len(new_products),
        })

    merged = list(by_id.values())
    save_db(merged)
    print(json.dumps({
        "sources": report,
        "total_products": len(merged),
        "db": str(DB),
        "products_js": str(PRODUCTS_JS),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
