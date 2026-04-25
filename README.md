# 타일앤바스플러스 플랫폼

타일, 위생도기, 부자재 상품 DB를 운영하고 원하는 상품을 장바구니에 담아 제안서와 견적서로 전환하는 플랫폼입니다.

## 실행

```powershell
npm.cmd start
```

브라우저에서 `http://localhost:4173`을 엽니다.

서버 연결이 불안정하면 `index.html`을 직접 열어도 상품 DB를 볼 수 있습니다. `products-db.js`에 현재 상품 DB가 함께 들어 있어 서버 없이도 상품 페이지와 장바구니 기능을 사용할 수 있습니다. 단, 서버 없이 DB 등록을 하면 브라우저 임시 저장소에만 저장됩니다.

## Supabase 연결

`.env`에 아래 값을 넣으면 서버가 상품 DB를 `data/products.json` 대신 Supabase `public.products` 테이블에서 우선 읽습니다.

```env
SUPABASE_URL=https://프로젝트ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

테이블 생성:

```powershell
scripts\supabase-products-schema.sql
```

SQL Editor에서 위 파일 내용을 실행한 뒤, 기존 상품 데이터를 올리려면 아래 명령을 실행합니다.

```powershell
node scripts\sync-products-to-supabase.mjs
```

현재 Supabase로 옮긴 온라인 저장 대상:

- `products`: 상품 DB
- `approval_settings`: 가입 승인 기준
- `signup_requests`: 회원가입 신청/승인 상태
- `carts`: 로그인 회원 장바구니

즉 상품, 승인기준, 회원가입 정보, 로그인 회원 장바구니는 서버가 Supabase를 우선 저장소로 사용합니다. 브라우저 `localStorage`는 서버 장애 시 임시 캐시/폴백 용도로만 남겨두었습니다.

## 화면 구조

- `메인`: 타일, 위생도기, 부자재 대분류 진입
- `상품`: 상품 검색, 종류/규격/옵션 필터, 장바구니 담기
- `DB 등록`: 상품 DB 입력
- `장바구니`: 수량, 견적 금액 직접 수정, 원가 확인
- `제안서·견적서`: 장바구니 항목으로 문서 생성
- `실사 보정`: 추후 API 연결 예정 서비스 안내와 임시 ChatGPT 링크

## 상품 DB

상품 DB는 `data/products.json`에 저장됩니다. 앱에서 바로 읽을 수 있도록 같은 내용이 `products-db.js`에도 생성됩니다.

현재 DB 현황:

- 전체 상품: 581개
- 이미지 연결 상품: 478개
- 깨진 이미지 경로: 0개
- 단가표 매칭 상품: 101개
- 직접/기존 샘플 및 2026 카탈로그: 211개
- 2025브랜드타일: 238개
- 에스지세라 24 18T: 51개
- 에스지세라 대형사이즈: 30개
- 에스지세라 300각600각: 51개

카탈로그 PDF를 다시 가져오려면 아래 명령을 실행합니다.

```powershell
& "C:\Users\asb82\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\import_catalog_pdf.py
& "C:\Users\asb82\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\import_additional_catalogs.py
& "C:\Users\asb82\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\apply_price_list.py
```

추출 이미지는 `images/catalog` 폴더에 저장되고, DB 상품의 `image` 필드와 연결됩니다.

## DB 입력 필드

타일 DB 입력 필드:

- 종류: `바닥 타일`, `벽 타일`, `부자재`
- 품명
- 규격: `600*600`, `300*600`, `600*1200`, `300*300`, `200*200`, `100*300`, `800*800`, `400*800`, `100*100`, `150*600`
- 제조사
- 단위
- 유광/무광
- 단가
- 소매가
- 도매가
- 재고량

위생도기 DB 입력 필드:

- 종류: `양변기`, `비데`, `소변기`, `세면대`, `수전 금구`, `악세사리`
- 품명
- 규격
- 제조사
- 단위
- 옵션
- 단가
- 소매가
- 도매가
- 재고량

## 장바구니와 견적서

상품을 장바구니에 넣으면 기본 견적 금액은 `소매가`로 들어갑니다. 장바구니 페이지에서 견적 금액을 직접 수정할 수 있고, 수정한 금액이 견적서에 반영됩니다.

원가는 장바구니와 상품 카드에서 내부 확인용으로만 표시합니다. 견적서에는 견적 금액만 표시됩니다.

## 실사 보정 서비스

현장사진과 선택 상품 이미지를 기반으로 바닥, 벽, 포인트 공간에 타일이나 위생도기를 실사 보정하는 기능은 추후 API 연결 대상으로 남겨두었습니다. 현재는 `타일이미지 적용해보기` 버튼으로 임시 ChatGPT 링크를 열 수 있습니다.

## 검증

```powershell
npm.cmd run check
```
