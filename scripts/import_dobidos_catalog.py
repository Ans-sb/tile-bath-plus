import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS_DIR = Path.home() / "Downloads"
DB_PATH = ROOT / "data" / "products.json"
PRODUCTS_JS_PATH = ROOT / "products-db.js"
IMAGE_ROOT = ROOT / "images" / "catalog" / "dobidos"
PDF_PATH = next(DOWNLOADS_DIR.glob("2025cata1*.pdf"))

CATALOG_SOURCE = "2025 대림 도비도스 카다로그"
MAKER = "대림도비도스"

PREFIXES = [
    "GFB", "GFL", "GFS",
    "DBF", "ZFB",
    "DDO", "DEL", "DTC", "DPE", "DDH", "DDS",
    "DC", "DL", "DU", "DS", "FU", "FC", "DB",
    "FL", "FB", "FS", "FX", "PF", "FA", "FM", "FE",
    "PB", "PP", "PD", "PR",
]
PREFIXES.sort(key=len, reverse=True)
PREFIX_PATTERN = "(?:" + "|".join(PREFIXES) + r"|P(?=\d))"
CODE_PATTERN = re.compile(rf"({PREFIX_PATTERN})\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)")
DIMENSION_PATTERN = re.compile(r"(\d+(?:\.\d+)?\s*[×xX]\s*\d+(?:\.\d+)?(?:\s*[×xX]\s*\d+(?:\.\d+)?)?\s*㎜?)")

SECTION_TITLES = {
    "Water Closet",
    "Wash Basin",
    "Urinal",
    "Flush Valve",
    "Dobidos Play",
    "Bidet",
    "Faucet Series",
    "Sensor Faucet",
    "GF & SUS Faucet",
    "Sink",
    "Thermostat",
    "Euro Class",
    "Shower",
    "Shower Head",
    "Balcony",
    "Accessory Series",
    "Slide bar / Accessories",
    "Parts",
    "Bath Cabinet & Mirror",
    "Shower Booth",
    "Toilet Partition",
    "Inner Gate",
    "Bathtub",
    "BATH CLEAN UNIT",
}

PAGE_TEXT_REPLACEMENTS = {
    "PF 167CPF 173CPF 179C": "PF 167C\nPF 173C\nPF 179C",
    "PF 158CPF 159CPF 165C": "PF 158C\nPF 159C\nPF 165C",
    "PF 077CPF 079C": "PF 077C\nPF 079C",
    "PF 093C PF 076C": "PF 093C\nPF 076C",
    "PF 116CPF 121CPF 128C PF 102C": "PF 116C\nPF 121C\nPF 128C\nPF 102C",
    "FB 1667FB 1669": "FB 1667\nFB 1669",
    "FA 195MB FA 180C": "FA 195MB\nFA 180C",
    "FL 255-15C PD 142S": "FL 255-15C\nPD 142S",
    "DTC HP0300 DTC MF0100": "DTC HP0300\nDTC MF0100",
    "DDO 101DEL 101DEL 101-1": "DDO 101\nDEL 101\nDEL 101-1",
    "DDH 201DDS 303": "DDH 201\nDDS 303",
    "DDS 201DDS 101": "DDS 201\nDDS 101",
    "DTC UB0100DTC DS0100": "DTC UB0100\nDTC DS0100",
    "DB 952S DB 953S": "DB 952S\nDB 953S",
    "DB 950-7DB 950-1": "DB 950-7\nDB 950-1",
}


def slug(value):
    value = str(value).strip().lower()
    value = value.replace("×", "x").replace("*", "x").replace("/", "-")
    value = re.sub(r"[^a-z0-9가-힣]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def normalize_line(value):
    value = str(value or "")
    value = re.sub(r"[\x00-\x1f]", " ", value)
    value = value.replace("\u02a1", " ")
    value = value.replace("\u200b", " ")
    value = value.replace("\u200e", " ")
    value = value.replace("\u200f", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def preprocess_page_text(text):
    text = str(text or "")
    for source, target in PAGE_TEXT_REPLACEMENTS.items():
        text = text.replace(source, target)
    return text


def save_page_images(page, page_no):
    page_dir = IMAGE_ROOT / f"p{page_no:03d}"
    page_dir.mkdir(parents=True, exist_ok=True)
    saved = []

    for index, image in enumerate(getattr(page, "images", [])):
        pil = getattr(image, "image", None)
        width = getattr(pil, "width", 0)
        height = getattr(pil, "height", 0)
        if width < 90 or height < 90:
            continue

        aspect_ratio = max(width / max(height, 1), height / max(width, 1))
        if aspect_ratio > 4.2:
            continue

        filename = f"img{index:02d}.jpg"
        path = page_dir / filename
        try:
            flatten_image_on_white(pil).save(path, "JPEG", quality=90, optimize=True)
        except Exception:
            raw = getattr(image, "data", b"")
            if raw:
                flattened = flatten_image_on_white(Image.open(BytesIO(raw)))
                flattened.save(path, "JPEG", quality=90, optimize=True)
            else:
                with BytesIO() as buffer:
                    flatten_image_on_white(pil).save(buffer, "JPEG", quality=90)
                    path.write_bytes(buffer.getvalue())

        saved.append({
            "path": path.relative_to(ROOT).as_posix(),
            "width": width,
            "height": height,
            "area": width * height,
            "aspect_ratio": aspect_ratio,
        })

    return saved


def flatten_image_on_white(image):
    rgba = image.convert("RGBA")
    bg_rgb = detect_background_rgb(image)
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox() or detect_rgb_content_bbox(image, bg_rgb) or (0, 0, rgba.width, rgba.height)
    bbox = expand_bbox(bbox, rgba.width, rgba.height, max(2, round(max(rgba.width, rgba.height) * 0.02)))

    cropped = rgba.crop(bbox)
    pad_x = max(12, round(cropped.width * 0.14))
    pad_y = max(12, round(cropped.height * 0.14))
    canvas = Image.new("RGB", (cropped.width + (pad_x * 2), cropped.height + (pad_y * 2)), bg_rgb)
    canvas.paste(cropped, (pad_x, pad_y), mask=cropped.getchannel("A"))
    return canvas


def detect_background_rgb(image):
    rgba = image.convert("RGBA")
    width, height = rgba.size
    corners = [
        rgba.getpixel((0, 0)),
        rgba.getpixel((max(width - 1, 0), 0)),
        rgba.getpixel((0, max(height - 1, 0))),
        rgba.getpixel((max(width - 1, 0), max(height - 1, 0))),
    ]
    if sum(pixel[3] for pixel in corners) / len(corners) < 12:
        return (255, 255, 255)
    return tuple(round(sum(pixel[index] for pixel in corners) / len(corners)) for index in range(3))


def detect_rgb_content_bbox(image, background_rgb, threshold=8):
    rgb = image.convert("RGB")
    width, height = rgb.size
    min_x = width
    min_y = height
    max_x = -1
    max_y = -1

    for y in range(height):
        for x in range(width):
            pixel = rgb.getpixel((x, y))
            if max(abs(pixel[index] - background_rgb[index]) for index in range(3)) <= threshold:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def expand_bbox(bbox, width, height, padding):
    left, top, right, bottom = bbox
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def pick_product_images(images):
    filtered = []
    for image in images:
        width = image["width"]
        height = image["height"]
        area = image["area"]
        if area < 14000:
            continue
        if width >= 700 and height <= 280:
            continue
        if width <= 120 and height <= 120:
            continue
        filtered.append(image)

    return filtered or images


def image_for_group(images, group_index):
    if not images:
        return ""
    if group_index < len(images):
        return images[group_index]["path"]
    if len(images) == 1:
        return images[0]["path"]
    return images[-1]["path"]


def insert_code_delimiters(line):
    return re.sub(rf"(?:(?<=\s)|(?<=[0-9]))(?={PREFIX_PATTERN}\s*[A-Z0-9])", "|", line)


def line_starts_with_code(line):
    return bool(re.match(rf"^{PREFIX_PATTERN}\s*[A-Z0-9]", normalize_line(line)))


def normalize_code(prefix, body):
    return f"{prefix} {body}".strip()


def expand_comma_variant(base_code, variant_suffix):
    match = re.match(r"^([A-Z]+)\s*([A-Z0-9-]+)$", base_code)
    if not match:
      return ""
    prefix, body = match.groups()
    variant_suffix = variant_suffix.strip()
    if re.fullmatch(r"[A-Z]+", variant_suffix):
      body = re.sub(r"[A-Z]+$", "", body) + variant_suffix
    elif re.fullmatch(r"\d+[A-Z]*", variant_suffix):
      body = variant_suffix
    else:
      return ""
    return normalize_code(prefix, body)


def extract_code_entries(line):
    normalized = insert_code_delimiters(normalize_line(line))
    entries = []

    for segment in [piece.strip() for piece in normalized.split("|") if piece.strip()]:
        match = re.match(
            rf"^({PREFIX_PATTERN})\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)(?:\s*,\s*([A-Z0-9]+))?(?:\s*\(([^)]+)\))?(?:\s+(.*))?$",
            segment,
        )
        if not match:
            continue

        prefix, body, comma_variant, inline_note, inline_text = match.groups()
        base_code = normalize_code(prefix, body)
        codes = [base_code]

        if comma_variant:
            expanded = expand_comma_variant(base_code, comma_variant)
            if expanded:
                codes.append(expanded)

        entries.append({
            "codes": codes,
            "inline_note": normalize_line(inline_note or ""),
            "inline_text": normalize_line(inline_text or ""),
        })

    return entries


def is_noise_line(line):
    if not line:
        return True
    if line in SECTION_TITLES:
        return True
    if line == "Dobidos Total Collections":
        return True
    if re.fullmatch(r"\d+", line):
        return True
    if re.fullmatch(r"[0-9A-Z'.,\-\/ ()×㎜~:]+", line) and not re.search(r"[A-Z]{2,}\s*\d", line):
        return True
    if line in {"W.L", "F.L", "OFF", "ON", "AUTO", "FLUSHING"}:
        return True
    if "SANITARY WARES" in line or "FAUCETSensor" in line or "ACCESSORIESSlide" in line or "BATHROOM CABINET" in line:
        return True
    return False


def page_context(page_no):
    if 6 <= page_no <= 7:
        return "water-closet"
    if 8 <= page_no <= 12:
        return "wash-basin"
    if 13 <= page_no <= 14:
        return "urinal-flush"
    if page_no == 15:
        return "dobidos-play"
    if 18 <= page_no <= 19:
        return "bidet"
    if 23 <= page_no <= 33:
        return "faucet-series"
    if page_no == 34:
        return "sensor"
    if page_no == 35:
        return "gf-sus"
    if page_no == 36:
        return "sink"
    if 37 <= page_no <= 38:
        return "thermostat"
    if page_no == 39:
        return "euro-class"
    if 40 <= page_no <= 44:
        return "shower"
    if 45 <= page_no <= 47:
        return "shower-head"
    if 48 <= page_no <= 49:
        return "balcony"
    if 52 <= page_no <= 58:
        return "accessory"
    if 59 <= page_no <= 63:
        return "parts"
    if 64 <= page_no <= 66:
        return "bath-cabinet"
    if page_no == 67:
        return "booth-partition"
    if page_no == 68:
        return "partition-gate"
    if page_no == 69:
        return "bathtub"
    return ""


def default_descriptor(kind, context, code):
    if kind == "양변기":
        return "양변기"
    if kind == "세면대":
        return "세면기"
    if kind == "소변기":
        if code.startswith("FU "):
            return "소변기 세척밸브"
        return "소변기"
    if kind == "비데":
        return "비데"
    if kind == "수전 금구":
        mapping = {
            "faucet-series": "수전",
            "sensor": "센서 수전",
            "gf-sus": "수전",
            "sink": "싱크 수전",
            "thermostat": "자동온도조절 수전",
            "euro-class": "수전",
            "shower": "샤워 수전",
            "shower-head": "샤워 헤드",
            "balcony": "발코니 수전",
            "dobidos-play": "유아용 수전",
            "urinal-flush": "세척밸브",
        }
        return mapping.get(context, "수전")
    mapping = {
        "accessory": "욕실 악세사리",
        "parts": "부품",
        "bath-cabinet": "욕실장",
        "booth-partition": "샤워부스 / 파티션",
        "partition-gate": "파티션 / 게이트",
        "bathtub": "욕조",
        "dobidos-play": "유아용 욕실 악세사리",
    }
    return mapping.get(context, "악세사리")


def classify_kind(page_no, code, descriptor):
    context = page_context(page_no)
    descriptor = descriptor or ""

    if code.startswith("DC "):
        return "양변기"
    if code.startswith("DL ") or code.startswith("DS "):
        return "세면대"
    if code.startswith("DU "):
        return "소변기"
    if code.startswith("DB ") and context == "bidet":
        return "비데"
    if code.startswith("FU ") or code.startswith("FC "):
        return "수전 금구"
    if context in {"faucet-series", "sensor", "gf-sus", "sink", "thermostat", "euro-class", "shower", "shower-head", "balcony"}:
        return "수전 금구"
    if code.startswith(("FL ", "FB ", "FS ", "FX ", "PF ", "FM ", "FE ", "GFB ", "GFL ", "GFS ")):
        if context == "dobidos-play" and ("거울" in descriptor or "장" in descriptor):
            return "악세사리"
        return "수전 금구"
    if context in {"accessory", "parts", "bath-cabinet", "booth-partition", "partition-gate", "bathtub"}:
        return "악세사리"
    if code.startswith(("FA ", "ZFB ", "PB ", "PP ", "PD ", "PR ", "P", "DBF ", "DDO ", "DEL ", "DTC ", "DPE ", "DDH ", "DDS ")):
        return "악세사리"
    if "비데" in descriptor:
        return "비데"
    if "소변기" in descriptor:
        return "소변기"
    if "세면" in descriptor or "수채" in descriptor:
        return "세면대"
    if "양변기" in descriptor:
        return "양변기"
    return "악세사리"


def looks_like_spec(line):
    return bool(
        DIMENSION_PATTERN.search(line)
        or re.search(r"(규격|SIZE|시공 ?hole|배관간격|설치간격|사용수량|담수량|전압|급수압력|길이|편심간격|색상|옵션|Function)", line, re.IGNORECASE)
        or "Ø" in line
    )


def extract_size(block_lines):
    for line in block_lines:
        match = re.search(r"(규격\s*[:：]\s*.+)$", line, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    for line in block_lines:
        match = re.search(r"(SIZE\s*[:：]\s*.+)$", line, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    for line in block_lines:
        if "(" in line and any(keyword in line for keyword in ["시공hole", "배관간격", "설치간격"]):
            return line.strip()
    for line in block_lines:
        match = DIMENSION_PATTERN.search(line)
        if match:
            return match.group(1).replace("x", "×").replace("X", "×").strip()
    for line in block_lines:
        if "Ø" in line:
            return line.strip()
    return ""


def extract_descriptor(block_lines, last_descriptor, kind, context, code):
    candidates = []
    for line in block_lines:
        if is_noise_line(line):
            continue
        if looks_like_spec(line):
            continue
        if line.startswith("ㆍ"):
            continue
        candidates.append(line)

    if candidates:
        return candidates[0]
    if last_descriptor and len(block_lines) <= 2:
        return last_descriptor
    return default_descriptor(kind, context, code)


def extract_option(block_lines, descriptor, inline_note):
    options = []
    if inline_note:
        options.append(inline_note)

    for line in block_lines:
        if is_noise_line(line) or line == descriptor:
            continue
        if not re.search(r"[A-Za-z가-힣Ø×㎜]", line):
            continue
        if re.fullmatch(r"[0-9.×㎜~/ ()Ø-]+", line):
            continue
        if looks_like_spec(line):
            options.append(line)
            continue
        if len(line) <= 2:
            continue
        options.append(line)

    deduped = []
    seen = set()
    for item in options:
        key = item.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(key)
    return " · ".join(deduped[:6])


def build_product(page_no, code, block_lines, inline_note, last_descriptor):
    context = page_context(page_no)
    raw_descriptor = extract_descriptor(block_lines, last_descriptor, "악세사리", context, code)
    kind = classify_kind(page_no, code, raw_descriptor)
    descriptor = extract_descriptor(block_lines, last_descriptor, kind, context, code)
    size = extract_size(block_lines)
    option = extract_option(block_lines, descriptor, inline_note)

    name = f"{code} {descriptor}".strip()
    return {
        "id": f"catalog-dobidos-{slug(code)}",
        "productType": "sanitary",
        "kind": kind,
        "name": name,
        "size": size,
        "finish": "",
        "maker": MAKER,
        "unit": "개",
        "option": option,
        "costPrice": 0,
        "retailPrice": 0,
        "wholesalePrice": 0,
        "stockQty": 0,
        "image": "",
        "catalogSource": CATALOG_SOURCE,
        "catalogPage": page_no,
        "catalogCode": code,
        "_descriptor": descriptor,
    }


def parse_pdf_products():
    reader = PdfReader(str(PDF_PATH))
    parsed = []

    for page_index, page in enumerate(reader.pages):
        page_no = page_index + 1
        context = page_context(page_no)
        if not context:
            continue

        last_descriptor = ""
        page_images = pick_product_images(save_page_images(page, page_no))
        page_text = preprocess_page_text(page.extract_text() or "")
        lines = [normalize_line(line) for line in page_text.splitlines()]
        lines = [line for line in lines if line]
        i = 0
        group_index = 0

        while i < len(lines):
            if not line_starts_with_code(lines[i]):
                i += 1
                continue
            entries = extract_code_entries(lines[i])
            if not entries:
                i += 1
                continue

            block_lines = []
            for entry in entries:
                if entry["inline_text"]:
                    block_lines.append(entry["inline_text"])

            j = i + 1
            while j < len(lines):
                if line_starts_with_code(lines[j]) and extract_code_entries(lines[j]):
                    break
                block_lines.append(lines[j])
                j += 1

            clean_block = [line for line in (normalize_line(item) for item in block_lines) if line]
            group_image = image_for_group(page_images, group_index)
            for entry in entries:
                for code in entry["codes"]:
                    product = build_product(page_no, code, clean_block, entry["inline_note"], last_descriptor)
                    product["image"] = group_image
                    last_descriptor = product["_descriptor"]
                    parsed.append(product)

            group_index += 1
            i = j

    by_id = {}
    for product in parsed:
        existing = by_id.get(product["id"])
        if not existing or product_score(product) > product_score(existing):
            by_id[product["id"]] = product
    return list(by_id.values())


def product_score(product):
    score = 0
    if product.get("size"):
        score += 3
    if product.get("option"):
        score += min(len(str(product.get("option"))), 80) / 80
    if product.get("catalogPage"):
        score += 0.01
    return score


def load_products():
    return json.loads(DB_PATH.read_text(encoding="utf-8")) if DB_PATH.exists() else []


def save_products(products):
    DB_PATH.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PRODUCTS_JS_PATH.write_text(
        "window.PRODUCTS_DB = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


def merge_products(imported):
    existing = load_products()
    kept = [
        product
        for product in existing
        if product.get("catalogSource") != CATALOG_SOURCE
        and not str(product.get("id", "")).startswith("catalog-dobidos-")
    ]
    for product in imported:
        product.pop("_descriptor", None)
    merged = kept + imported
    save_products(merged)
    return merged


def summarize(products):
    kinds = {}
    for product in products:
        kinds[product["kind"]] = kinds.get(product["kind"], 0) + 1
    return {
        "pdf": str(PDF_PATH),
        "catalogSource": CATALOG_SOURCE,
        "imported": len(products),
        "kinds": kinds,
    }


def main():
    imported = parse_pdf_products()
    merge_products(imported)
    print(json.dumps(summarize(imported), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
