import json
import math
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


ROOT = Path.cwd()
PRODUCTS_PATH = ROOT / "data" / "products.json"
CACHE_DIR = ROOT / "tmp" / "xlsx-image-cache"
OUTPUT_DIR = ROOT / "outputs" / "finish-image-review"
MAX_WORKERS = 12


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    products = json.loads(PRODUCTS_PATH.read_text(encoding="utf-8"))
    targets = [
        product for product in products
        if product.get("productType") == "tile"
        and not str(product.get("finish") or product.get("surface") or "").strip()
    ]

    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(analyze_product, product) for product in targets]
        for index, future in enumerate(as_completed(futures), start=1):
            results.append(future.result())
            if index % 500 == 0:
                print(f"[image-finish] {index}/{len(targets)}", flush=True)

    results.sort(key=lambda item: (item.get("brand") or "", item.get("productName") or ""))
    summary = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "targetCount": len(targets),
        "withImageAnalysis": sum(1 for item in results if item["status"] == "ok"),
        "byPrediction": count_by(results, "prediction"),
        "byBrand": count_by(results, "brand"),
        "results": results,
    }
    output_path = OUTPUT_DIR / f"image-finish-candidates-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output_path)


def analyze_product(product):
    brand = brand_code(product)
    image_path = cached_image_path(product)
    base = {
        "id": str(product.get("id") or ""),
        "brand": brand,
        "productName": str(product.get("name") or product.get("modelName") or ""),
        "modelName": str(product.get("modelName") or product.get("name") or ""),
        "size": str(product.get("size") or ""),
        "sourceCategoryName": str(product.get("sourceCategoryName") or product.get("option") or ""),
        "features": str(product.get("features") or ""),
        "imageUrl": str(product.get("image") or ""),
        "sourceUrl": str(product.get("sourceUrl") or ""),
        "cacheImagePath": str(image_path) if image_path else "",
        "thumbPath": str(cached_thumb_path(product)),
    }
    if not image_path:
        return {
            **base,
            "status": "no_cached_image",
            "prediction": "판단보류",
            "confidence": 0,
            "reason": "캐시된 이미지 파일이 없어 이미지 분석을 하지 못했습니다.",
            "metrics": {},
        }
    try:
        metrics = image_metrics(image_path)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        return {
            **base,
            "status": "image_error",
            "prediction": "판단보류",
            "confidence": 0,
            "reason": f"이미지 분석 실패: {exc}",
            "metrics": {},
        }

    prediction, confidence, reason = classify_finish(metrics)
    return {
        **base,
        "status": "ok",
        "prediction": prediction,
        "confidence": confidence,
        "reason": reason,
        "metrics": metrics,
    }


def image_metrics(path):
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((320, 320))
        arr = np.asarray(image, dtype=np.float32) / 255.0
    if arr.size == 0:
        raise ValueError("empty image")

    rgb_max = arr.max(axis=2)
    rgb_min = arr.min(axis=2)
    luma = (0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2])
    saturation = np.where(rgb_max > 0, (rgb_max - rgb_min) / np.maximum(rgb_max, 1e-6), 0)

    # Ignore pure white page/background margins when the tile occupies a smaller center area.
    content_mask = np.logical_or(luma < 0.965, saturation > 0.05)
    if content_mask.sum() < max(100, luma.size * 0.18):
      content_mask = np.ones_like(luma, dtype=bool)

    useful_luma = luma[content_mask]
    useful_sat = saturation[content_mask]
    bright_specular = np.logical_and(useful_luma > 0.955, useful_sat < 0.22)
    very_bright = useful_luma > 0.985

    p50, p75, p85, p90, p95, p99 = np.percentile(useful_luma, [50, 75, 85, 90, 95, 99])
    metrics = {
        "width": int(arr.shape[1]),
        "height": int(arr.shape[0]),
        "contentRatio": round(float(content_mask.mean()), 4),
        "meanLuma": round(float(useful_luma.mean()), 4),
        "meanSaturation": round(float(useful_sat.mean()), 4),
        "p50Luma": round(float(p50), 4),
        "p75Luma": round(float(p75), 4),
        "p85Luma": round(float(p85), 4),
        "p90Luma": round(float(p90), 4),
        "p95Luma": round(float(p95), 4),
        "p99Luma": round(float(p99), 4),
        "highlightRatio": round(float(bright_specular.mean()), 4),
        "veryBrightRatio": round(float(very_bright.mean()), 4),
        "highlightDelta": round(float(p99 - p85), 4),
        "contrast": round(float(p95 - p50), 4),
    }
    return metrics


def classify_finish(metrics):
    highlight_ratio = metrics["highlightRatio"]
    very_bright_ratio = metrics["veryBrightRatio"]
    highlight_delta = metrics["highlightDelta"]
    p99 = metrics["p99Luma"]
    p95 = metrics["p95Luma"]
    p90 = metrics["p90Luma"]
    contrast = metrics["contrast"]
    mean_luma = metrics["meanLuma"]
    content_ratio = metrics["contentRatio"]

    if content_ratio < 0.22:
        return "판단보류", 0.25, "타일 영역보다 배경 비중이 커서 이미지 기반 판단을 보류했습니다."

    if (
        p99 >= 0.975
        and highlight_ratio >= 0.006
        and very_bright_ratio <= 0.22
        and highlight_delta >= 0.09
    ):
        confidence = clamp(0.56 + highlight_ratio * 1.7 + highlight_delta * 0.6, 0.58, 0.86)
        return (
            "유광 후보",
            round(confidence, 2),
            f"좁고 강한 밝은 반사 영역이 감지됨: highlight={highlight_ratio:.3f}, delta={highlight_delta:.3f}",
        )

    if (
        p99 >= 0.99
        and highlight_ratio >= 0.018
        and p99 - p90 >= 0.07
        and very_bright_ratio <= 0.28
    ):
        confidence = clamp(0.55 + highlight_ratio * 1.2, 0.56, 0.78)
        return (
            "유광 후보",
            round(confidence, 2),
            f"상위 밝기 구간에 반사성 하이라이트가 있음: highlight={highlight_ratio:.3f}, p99-p90={p99 - p90:.3f}",
        )

    if highlight_ratio <= 0.0025 and p95 <= 0.91 and contrast <= 0.34:
        confidence = clamp(0.52 + (0.91 - p95) * 0.55 + (0.0025 - highlight_ratio) * 18, 0.53, 0.74)
        return (
            "무광 후보",
            round(confidence, 2),
            f"강한 반사 하이라이트가 거의 없음: highlight={highlight_ratio:.4f}, p95={p95:.3f}",
        )

    if highlight_ratio <= 0.004 and mean_luma <= 0.72 and highlight_delta <= 0.17:
        confidence = clamp(0.5 + (0.004 - highlight_ratio) * 14, 0.51, 0.68)
        return (
            "무광 후보",
            round(confidence, 2),
            f"전반 밝기와 반사 차이가 낮음: highlight={highlight_ratio:.4f}, delta={highlight_delta:.3f}",
        )

    return (
        "판단보류",
        0.4,
        f"유광/무광 신호가 애매함: highlight={highlight_ratio:.3f}, delta={highlight_delta:.3f}, p95={p95:.3f}",
    )


def cached_image_path(product):
    cache_key = safe_file_name(product.get("id") or product.get("sourceProductId") or product.get("name") or "")
    candidates = [
        CACHE_DIR / f"{cache_key}.image",
        CACHE_DIR / "thumbs" / f"{cache_key}.png",
    ]
    for path in candidates:
        if path.exists() and path.stat().st_size > 0:
            return path
    return None


def cached_thumb_path(product):
    cache_key = safe_file_name(product.get("id") or product.get("sourceProductId") or product.get("name") or "")
    path = CACHE_DIR / "thumbs" / f"{cache_key}.png"
    return path if path.exists() else ""


def safe_file_name(value):
    return re.sub(r"[^0-9a-zA-Z가-힣_-]", "_", str(value or "image"))[:90]


def brand_code(product):
    return str(product.get("catalogSource") or product.get("kind") or product.get("maker") or product.get("majorCategory") or "미확인").strip() or "미확인"


def count_by(items, key):
    result = {}
    for item in items:
        value = item.get(key) or "미확인"
        result[value] = result.get(value, 0) + 1
    return dict(sorted(result.items(), key=lambda pair: (-pair[1], pair[0])))


def clamp(value, min_value, max_value):
    if math.isnan(value):
        return min_value
    return max(min_value, min(max_value, value))


if __name__ == "__main__":
    sys.exit(main())
