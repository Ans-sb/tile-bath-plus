# 자재GO 플랫폼 안정화 재구성 계획

## 현재 상태

현재 플랫폼은 순수 `HTML/CSS/JavaScript` 프론트엔드와 `Node.js` 서버, Supabase, Railway 배포 구조로 동작한다.

가장 큰 기술 리스크는 언어 자체가 아니라 파일과 책임이 커진 점이다.

- `app.js`: 화면, 로그인, 상품검색, 장바구니, 마이페이지, 3D, 실사보정, 관리자 기능이 한 파일에 집중되어 있다.
- `server.js`: API 라우팅, Supabase 연동, 인증, 파일 업로드, 관리자 기능이 한 파일에 집중되어 있다.
- 상품 데이터는 `data/products.json`, `products-db.js`, Supabase가 함께 쓰이고 있어 데이터 출처가 섞일 수 있다.

이 상태에서 기능을 계속 추가하면 작은 수정이 다른 화면을 깨뜨릴 가능성이 높아진다.

## 목표 구조

단기 목표는 전체 리라이트가 아니라 “기능별 경계 분리”다.

장기 목표는 아래 구조다.

```text
src/
  client/
    pages/
    features/
      auth/
      products/
      cart/
      mypage/
      proposal/
      tile-finder/
      taxonomy/
    shared/
      dom/
      format/
      storage/
      validators/
  server/
    routes/
    services/
      auth/
      products/
      business/
      storage/
      admin/
    repositories/
      supabase/
    dto/
  shared/
    types/
    constants/
    taxonomy/
scripts/
  audits/
  imports/
  exports/
data/
  products.snapshot.json
  products.normalized.json
```

## 기술 방향

### 1순위: JavaScript 유지 + 모듈 분리

지금 바로 TypeScript나 Next.js로 옮기면 배포와 기능 안정성이 흔들릴 수 있다.
먼저 기존 JavaScript를 기능별 모듈로 나눈다.

우선순위:

1. 상품 검색/필터
2. 회원/로그인/사업자 인증
3. 장바구니/주문
4. 마이페이지/거래처관리
5. 관리자/DB 관리
6. 3D/실사보정

### 2순위: DTO 분리

고객용과 관리자용 데이터는 반드시 분리한다.

고객용 응답에는 아래 값이 절대 포함되면 안 된다.

- `internal_brand_id`
- `internal_brand_code`
- `internal_brand_name`
- `supplier_name`
- `margin_grade`
- `quality_grade`

관리자용 응답은 내부 브랜드와 원가/마진/공급처 정보를 포함할 수 있다.

### 3순위: TypeScript 점진 도입

모듈 분리 후 TypeScript를 도입한다.

처음부터 전체 변환하지 않고 아래 데이터부터 타입을 고정한다.

- Product
- NormalizedTileProduct
- AuthUser
- BusinessProfile
- CartItem
- SearchIntent
- CustomerTileResult
- AdminTileResult

### 4순위: Supabase 중심 DB 정리

최종적으로 상품/회원/가격/재고/검색 로그는 Supabase PostgreSQL이 기준이어야 한다.

JSON 파일은 아래 용도로만 둔다.

- 백업
- 로컬 테스트
- 대량 import 전 검수
- 배포 장애 시 읽기 전용 fallback

## 단계별 실행 계획

### Phase 0. 안정화 기준 고정

- 현재 구조 문서화
- 아키텍처 감사 스크립트 추가
- 고객용 브랜드 비노출 정책 유지
- `npm run check` 유지

### Phase 1. 서버 API 분리

`server.js`에서 라우팅과 서비스를 분리한다.

목표:

```text
server.js
src/server/routes/products.js
src/server/routes/auth.js
src/server/routes/admin.js
src/server/services/supabaseClient.js
src/server/services/businessProfiles.js
```

효과:

- 인증 오류와 상품 오류가 서로 영향을 덜 준다.
- Supabase 컬럼 오류를 한 곳에서 처리할 수 있다.
- 온라인 배포 오류 추적이 쉬워진다.

### Phase 2. 상품/검색 모듈 분리

`app.js`에서 상품 검색과 렌더링을 분리한다.

목표:

```text
src/client/features/products/productFilters.js
src/client/features/products/productCards.js
src/client/features/taxonomy/searchIntent.js
src/client/features/tile-finder/imageSimilarity.js
```

효과:

- 상품 페이지 속도 개선 작업이 로그인/마이페이지를 건드리지 않는다.
- 이미지 검색의 크기/마감 절대 필터 정책을 독립적으로 테스트할 수 있다.

### Phase 3. 회원/마이페이지 분리

회원가입, 소셜 로그인, 사업자 인증, 명함 정보, 마이페이지를 분리한다.

목표:

```text
src/client/features/auth/authSession.js
src/client/features/auth/socialSignup.js
src/client/features/business/businessVerification.js
src/client/features/mypage/contactInfo.js
```

효과:

- 로그인 후 화면 전환 오류를 독립적으로 검증할 수 있다.
- 사업자 인증 전 가격 비공개 정책을 한 곳에서 관리할 수 있다.

### Phase 4. 데이터 import 파이프라인 분리

거래처별 크롤링/import 스크립트를 공통 스키마로 통일한다.

목표:

```text
scripts/imports/common/normalize-product.mjs
scripts/imports/common/validate-product.mjs
scripts/imports/sources/tile114.mjs
scripts/imports/sources/sgcera.mjs
```

효과:

- 브랜드별 누락 필드, 마감 미확인, 이미지 누락을 같은 기준으로 점검할 수 있다.
- 상품 DB 품질이 검색 품질로 직접 이어진다.

## 리팩터링 원칙

1. 한 번에 전체 리라이트하지 않는다.
2. 기능 하나를 옮길 때마다 `npm run check`를 통과시킨다.
3. 고객용 브랜드 비노출 정책은 매 단계 유지한다.
4. DB 스키마 변경은 반드시 migration 파일로 남긴다.
5. 온라인 배포 전 로컬 JSON과 Supabase 응답을 모두 확인한다.
6. 상품/회원/가격/재고는 같은 함수에서 섞어 처리하지 않는다.

## 당장 적용할 기준

다음 작업부터는 새 기능을 추가하기 전 아래를 먼저 확인한다.

- 이 기능이 고객용인지 관리자용인지
- 브랜드/공급처/원가가 고객에게 노출되는지
- Supabase 컬럼이 실제 존재하는지
- 로컬 fallback 데이터와 온라인 DB 데이터가 같은 구조인지
- 검색/상품/회원/장바구니 중 어떤 모듈에 속하는지

