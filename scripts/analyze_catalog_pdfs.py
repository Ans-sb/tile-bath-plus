import json
from pathlib import Path

from pypdf import PdfReader


PDFS = [
    Path(r"C:\Users\asb82\OneDrive\문서\카카오톡 받은 파일\2025브랜드타일 카탈로그.pdf"),
    Path(r"C:\Users\asb82\OneDrive\문서\카카오톡 받은 파일\에스지세라-24_18T_카탈로그_e-catalog.pdf"),
    Path(r"C:\Users\asb82\OneDrive\문서\카카오톡 받은 파일\에스지세라 -대형사이즈타일_e-카달로그.pdf"),
    Path(r"C:\Users\asb82\OneDrive\문서\카카오톡 받은 파일\에스지세라 -300각600각_카달로그.pdf"),
]


def image_info(page):
    infos = []
    for image in getattr(page, "images", []):
        pil = getattr(image, "image", None)
        infos.append({
            "name": image.name,
            "width": getattr(pil, "width", None),
            "height": getattr(pil, "height", None),
            "bytes": len(image.data),
        })
    return infos


summary = {}
for pdf in PDFS:
    reader = PdfReader(str(pdf))
    pages = []
    total_text = 0
    total_images = 0
    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        images = image_info(page)
        total_text += len(text.strip())
        total_images += len(images)
        if index < 12:
            pages.append({
                "page": index + 1,
                "chars": len(text.strip()),
                "images": len(images),
                "sample": text.strip()[:600],
                "imageSample": images[:5],
            })
    summary[pdf.name] = {
        "pages": len(reader.pages),
        "total_text_chars": total_text,
        "total_images": total_images,
        "first_pages": pages,
    }

print(json.dumps(summary, ensure_ascii=False, indent=2))
