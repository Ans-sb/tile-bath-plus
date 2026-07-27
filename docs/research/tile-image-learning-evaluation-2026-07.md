# 자재GO 타일 이미지 판별 학습·평가 설계 조사

## 0. 결론

1. **상품명 분류기가 아니라 `이미지 → 속성 + 카탈로그 검색` 구조로 설계**한다. 학습 시 제조사 SKU 라벨을 그대로 정답으로 믿지 말고, 규격·마감 같은 구조화 속성, 색/패턴/모티프 같은 시각 속성, 이미지 역할(정면/디테일/시공컷)을 분리한다.
2. 사용자가 고른 **규격과 마감은 후보 생성 단계의 절대필터**다. 필터를 통과한 후보만 색상·패턴·가시적 모티프·국소 특징으로 재순위화한다. 필터와 이미지 추론이 충돌하면 자동 완화하지 말고 “선택 조건과 사진이 맞지 않음/후보 없음”으로 거부한다.
3. 공개 상세페이지는 좋은 시작점이지만 완전한 정답 데이터는 아니다. 제조사 페이지도 정면 제품컷, 여러 장을 합친 5-up 보드, 디테일, 시공컷을 한 SKU 아래 섞고, 시공컷에는 다른 자재와 조명·그라우트·소품이 들어간다. 판매처의 `look/style`은 마케팅 다중라벨이며, 이미지별 역할 라벨은 대개 없다.
4. **정확 SKU 확신과 속성 확신을 분리**해야 한다. 특히 V3/V4, 천연석/우드룩, 로트 차이, 시공컷 한 장만 있는 경우에는 색·스타일 Top-5는 가능해도 정확 SKU 단정은 거부해야 한다.
5. 평가는 단일 Top-5 정확도만 보면 안 된다. `Hard-filter pass rate`, `Exact SKU Recall@5`, `허용정답군 Recall@5`, `nDCG@5`, `MRR`, `거부 정밀도/커버리지/AURC`, 속성별 보정(ECE)을 함께 고정한다.

---

## 1. 공개 페이지에서 확인한 실제 이미지·라벨 구조

### A. TileBar — 한 SKU 안에 거의 모든 이미지 유형이 섞이는 사례

- 상품: **Kenridge Ribbon Maple Brown 24x48 Wood Look Matte Fluted Porcelain Tile**  
  https://www.tilebar.com/product/kenridge-ribbon-maple-24x48-matte-porcelain-tile.html
- 페이지의 구조화/명시 속성: SKU `TLIBELNRBMP24X48`, Colorbody Porcelain, 24×48 inch, Matte, Brown, Wood Look, rectified, V3 등.
- 갤러리에서 확인되는 역할:
  - 흰/단색 배경의 정면 제품 텍스처
  - 욕실·세면대·선반이 포함된 시공컷 여러 장
  - 원근이 강한 근접 표면/홈 디테일
  - 사람이 지나가는 스케일 컷
  - 타일 3장을 나열한 shade/variation 보드
  - 컬렉션의 서로 다른 색·형상을 함께 보여주는 컬렉션 합성컷
  - 원근 3D 제품 렌더 및 단면/모서리 디테일
- **학습 위험:** 페이지 단위로 모든 이미지를 SKU 정답으로 학습하면 컬렉션 합성컷의 다른 제품, 시공컷 배경, 사람·세면대, 렌더링 특성을 해당 SKU 특징으로 오학습한다. 이미지별 `view_type`, `target_bbox/mask`, `is_composite`, `target_coverage`, `contains_other_tile` 라벨이 필요하다.

### B. Daltile — 규격·마감·variation 라벨은 좋지만 이미지 의미가 다름

- SKU 페이지: **Memoir / Cosmo Blue / 12×12 Matte**  
  https://www.daltile.com/products/concrete-look/memoir/cosmo-blue-square-12x12-matte
- 페이지에서 확인되는 필드: Color Code `ME29`, Color Name `Cosmo Blue`, Color Family `Blue`, nominal 12×12, actual 11.819×11.819, Matte, Ceramic, V2 Medium Variation.
- 컬렉션 페이지:  
  https://www.daltile.com/products/concrete-look/memoir
- **좋은 점:** nominal/actual size, finish, body, color code, variation처럼 검색 필터에 직접 쓸 수 있는 구조화 정보가 있다.
- **주의:** nominal size와 actual size를 같은 필드로 합치면 안 된다. 컬렉션·색상·형상/SKU 계층도 분리해야 한다. 제조사 정면 이미지가 한 장짜리 타일인지, 패턴 반복을 보여주는 보드인지도 이미지 라벨에서 구분해야 한다.

### C. Marazzi — V4와 5-up/시공컷의 대표 사례

- 상품: **Treverksoul / Brown**  
  https://www.marazziusa.com/products/wood-look/treverksoul/brown
- 페이지에서 확인되는 필드: Color Code `TR61`, nominal 4×21, Matte, V4 Random, Italy.
- 공개 자산에는 `MZ_TR61_4x21_Brown_5Up.jpg` 같은 여러 장 배열 이미지와 `roomscenes/...Brown_COM...jpg` 시공컷이 함께 존재한다.
- **학습 위험:** V4는 타일 간 색·무늬 차이가 의도적으로 크므로 한 장의 crop을 “그 SKU의 대표 색”으로 고정하면 안 된다. 5-up은 SKU 수준 variation 분포 학습에는 유용하지만, 단일 타일 검출/크기 추정 데이터에는 부적합하다.

### D. Daltile Delegate — 색상 페이지 아래 여러 형상·원산지가 존재

- 색상 페이지: **Delegate / Light Grey**  
  https://www.daltile.com/products/stone-look/delegate/light-grey
- 같은 색상 페이지 안에서도 field tile/mosaic 등 형상별 nominal size·두께·원산지가 다를 수 있고, 확인된 예에는 Matte, V3 High가 표시된다.
- **학습 위험:** URL 한 개를 하나의 SKU로 취급하면 색상 variant와 판매 SKU를 혼동한다. `collection_id → color_variant_id → sku_id(shape×size×finish)` 계층이 필요하다.

---

## 2. 라벨 품질 평가

아래 수치는 경험적 진실확률이 아니라 **우선순위 결정을 위한 초기 정책값**이다. 실제 오류 표본을 이중 검수한 뒤 출처·필드별 precision으로 재보정한다.

| 라벨/출처 | 기본 신뢰도 | 이유와 처리 |
|---|---:|---|
| 제조사 SKU/code, actual size, finish, body, 원산지 | A (0.98) | 해당 SKU 명세에서 직접 추출. 단, 색상 페이지에 여러 SKU가 있으면 SKU 행과 이미지 연결 검증 필요 |
| 제조사 collection/color, nominal size, V-rating | A− (0.95) | 명시값은 강함. nominal과 actual 분리, V-rating은 개별 사진의 색 정답이 아니라 분포 속성 |
| 판매처 SKU, size, finish, material | B+ (0.90) | 구조화되어 유용하나 제조사와 충돌 시 제조사 우선. 샘플 SKU와 본품 SKU 분리 |
| 판매처 color/look/style | B− (0.75) | Brown/Wood Look은 비교적 유용하지만 style은 마케팅 다중라벨. 통제 어휘로 매핑하고 원문 보존 |
| 파일명 기반 이미지 역할(예: roomscene, 5Up) | B (0.85) | 강한 약지도이지만 반드시 표본 검수. 파일명 없는 갤러리에는 비전 분류 필요 |
| 시공컷의 정확 SKU | C+ (0.65) | 한 장에 여러 자재·색상 variant가 공존할 수 있음. 제품 mask/ROI 및 사람이 확인한 target 필요 |
| 이미지에서 추정한 material/finish/size | C 이하 | 유약 세라믹과 포세린, 무광과 새틴, 실제 규격은 한 장으로 식별 불가한 경우가 많음. 사용자 선택/명세를 우선 |
| 웹 이미지의 절대 RGB/Lab 색 | C (0.50) | 조명, white balance, 톤매핑, 압축, 렌더 여부가 불명. `color_reliability`를 별도 저장 |

### 라벨 저장 원칙

모든 속성은 단순 값이 아니라 다음 구조로 저장한다.

```json
{
  "value": "matte",
  "ontology_id": "finish:matte",
  "evidence": "explicit_spec",
  "source_type": "manufacturer_sku_page",
  "source_url": "https://...",
  "source_text": "Finish: Matte",
  "label_confidence": 0.98,
  "review_status": "auto_verified",
  "observed_at": "YYYY-MM-DD"
}
```

- `label_confidence`(정답 품질)와 `model_confidence`(모델 예측 확률)를 절대 합치지 않는다.
- 충돌은 덮어쓰지 않고 모두 보존하고 `preferred_assertion`만 지정한다.
- 제품 페이지가 바뀔 수 있으므로 원문 snippet/hash와 수집 시점을 저장한다.

---

## 3. 조명·원근·로트가 만드는 실제 오류

### 조명/반사

- Daltile 조명 가이드는 벽 가까운 조명이 표면·줄눈의 작은 불규칙에 강한 그림자를 만들며, 같은 벽·카메라 각도에서도 조명 위치만 24인치 옮겨 외관이 크게 달라진다고 설명한다.  
  https://digitalassets.daltile.com/content/dam/Daltile/website/resources/products/product-catalogs/DAL_LightingPlacement.pdf
- 따라서 `relief/texture/finish`는 조명 방향과 결합된 관측값이다. 무광/새틴/유광 판별은 최소 두 시점 또는 spec evidence가 없으면 보수적으로 거부한다.
- 색은 illuminant, 카메라 white balance/ISP, 화면 렌더링의 함수다. CIE는 관찰자 변화에 따른 special metamerism index를 별도 표준 문서로 다룬다.  
  https://cie.co.at/publications/special-metamerism-index-change-observer
- 권장 전처리: 타일 ROI 검출 → 회색/백색 기준이 있을 때만 white-balance 보정 → 원본과 보정본을 둘 다 임베딩. 기준이 없으면 절대 색 대신 색상 bin과 상대 패턴 대비를 사용하고 `color_reliability=low`로 둔다.

### 원근/스케일

- 시공컷은 사선 촬영, 광각 왜곡, 가구 가림, 줄눈의 vanishing point 때문에 패턴 간격과 형상 비율이 달라진다.
- 네 모서리/줄눈 격자를 신뢰성 있게 찾을 수 있을 때만 homography로 rectification한다. OpenCV는 네 대응점에서 perspective transform을 계산하고 `warpPerspective`를 제공한다.  
  https://docs.opencv.org/4.13.0/da/d54/group__imgproc__transform.html
- 물리 기준물 또는 사용자 규격이 없으면 사진만으로 실제 600×1200과 300×600을 구분하지 않는다. 사용자가 선택한 규격을 필터로 사용하되, 이미지가 그 규격을 “증명했다”고 기록하지 않는다.

### 로트와 의도적 shade variation

- Daltile은 shade variation이 타일 내부와 타일 간에 존재하며 V0(균일/단색)부터 V4(타일 간 상당한 변화)까지라고 설명한다.  
  https://www.daltile.com/how-to/how-to-choose-the-right-tile/factors-to-consider-while-selecting-tile
- Floor & Decor는 가마 내부 온도 차이로 glaze 색조가 달라질 수 있어 공장이 색조 코드로 분리하며, 설치 전 동일 dye lot인지 확인해야 한다고 설명한다.  
  https://www.flooranddecor.com/help-center/product-questions/help-product-tile/hc-what-is-a-dye-lot.html
- Statements Tile은 batch/dye lot 간 차이 때문에 showroom/sample과 실제 주문품이 조금 다를 수 있다고 명시한다.  
  https://www.statementstile.com/blog/understanding-shade-variation
- 결과적으로 SKU별 하나의 색 centroid가 아니라 `lot_id(알면 저장)`, `V_rating`, 여러 face/box의 색·무늬 분포를 저장해야 한다. 학습 batch에는 같은 SKU의 여러 face·lot을 넣고, 평가에는 **미관측 lot**을 별도 strata로 둔다.

---

## 4. 자재GO 권장 라벨 스키마

### 4.1 제품 계층

- `manufacturer_id`, `brand_id`
- `collection_id`
- `color_variant_id`
- `sku_id` = 판매 가능한 shape × nominal/actual size × finish 조합
- `lot_id`, `shade_code`, `caliber_code` (미상 허용)
- `source_product_url`, `source_assertions[]`

### 4.2 절대필터 속성

- `nominal_width_mm`, `nominal_length_mm`, `actual_width_mm`, `actual_length_mm`, `thickness_mm`
- `shape`: square, rectangle, hexagon, chevron, mosaic, irregular…
- `finish`: matte, honed, satin, polished, glossy, textured, grip…
- 원문 finish도 `finish_raw`에 보존하고, 통제 어휘 매핑에는 confidence를 둔다.
- 사용자 선택값과 단위 정규화된 값이 **정확히 호환되는 후보만** retrieval index에 투입한다. 허용오차는 nominal/actual 혼동을 막기 위해 속성 타입별 정책으로 관리한다.

### 4.3 시각 속성

- `material_declared`: porcelain, ceramic, natural stone, glass, cement… (주로 명세 기반)
- `look`: stone, marble, wood, concrete, terrazzo, zellige, metal, solid…
- `base_color_bins[]`, `accent_color_bins[]`; calibration이 있는 경우에만 `Lab_mean/covariance`
- `pattern_family`: plain, veined, speckled, aggregate, grain, geometric, encaustic, floral…
- `motifs[]`: stripe, rib/flute, chevron, hex, arch, leaf, star 등
- `texture_relief`: flat, microtexture, ribbed, carved, hammered…
- `directionality`, `repeat_scale`, `vein_density`, `contrast`, `edge_style`, `V_rating`, `faces_count`(알면)

### 4.4 이미지 단위 라벨

- `view_type` 다중라벨: `front_single`, `front_multi_face`, `detail_macro`, `oblique_product`, `installed_scene`, `scale_with_person/object`, `collection_composite`, `packaging/sample`, `render`
- `target_sku_ids[]`, `primary_target_sku_id`, `target_mask/bbox`, `target_coverage`
- `tile_count_visible`, `contains_other_tile`, `is_composite`, `is_render`, `grout_visible`, `occlusion_fraction`
- `perspective_severity`, `rectifiable`, `blur_score`, `glare_fraction`, `shadow_severity`, `white_balance_reliability`, `color_reliability`
- `capture_domain`: manufacturer_studio, retailer, showroom, jobsite, user_phone
- `duplicate_group_id`, `scene_group_id`, `source_page_id`

---

## 5. 신뢰도 산출·노출

### 5.1 분리해야 할 세 신뢰도

1. **라벨 신뢰도**: 출처와 명시성에 기반한 정답 품질.
2. **속성 예측 신뢰도**: 색/패턴/모티프/finish 각 head의 calibrated probability.
3. **검색 신뢰도**: Top 후보의 유사도, 후보 간 margin, 여러 crop/augmentation 간 일치도, gallery coverage를 결합한 선택 신뢰도.

### 5.2 운영 방식

- temperature scaling 또는 isotonic regression을 view type별로 적용한다. 시공컷과 정면컷을 한 calibration bin에 섞지 않는다.
- API는 `top5[]`와 함께 `decision={accept, partial, abstain}`, `reason_codes[]`, `reliable_attributes[]`, `unreliable_attributes[]`를 반환한다.
- 예: 색·ribbed motif는 높고 exact SKU는 낮으면, “우드룩/브라운/리브드 후보 5개”를 보여주되 1위 확정 문구는 쓰지 않는다.

---

## 6. 판별 거부 규칙(배포 v0)

### A. 입력/ROI 거부

다음 중 하나면 재촬영 또는 crop을 요청한다.

- 타일 검출 확률이 검증셋에서 정한 임계값 미만.
- 주 타일 ROI가 전체의 15% 미만이거나, 가림 없는 연속 표면 patch가 256×256 px 미만.
- 두 개 이상 서로 다른 타일 표면이 있고 최대 mask 점유율이 타일 영역의 60% 미만.
- 심한 blur/압축, ROI의 30% 이상 clipping/glare, 강한 색조명으로 색상 reliability가 `unusable`.
- 사선도가 매우 큰데 네 모서리/줄눈 격자를 못 찾아 rectification할 수 없음.

고정 수치는 시작점일 뿐이며, 실제 임계값은 거부 검증셋에서 목표 accepted precision을 만족하도록 재설정한다.

### B. 속성별 거부

- **규격:** 기준물/메타데이터 없이 이미지에서 추정하지 않는다. 사용자 선택값만 사용.
- **마감:** 명세가 없고 정반사 단서가 부족한 단일 정면/시공컷이면 `unknown`.
- **절대색:** white balance reliability가 낮으면 세부 색명/ΔE 비교를 금지하고 넓은 색 bin만 사용.
- **정확 SKU:** V3/V4 한 장, 시공컷의 작은 ROI, collection composite만 있는 경우에는 독특한 모티프/국소 일치가 충분하지 않으면 exact 판정을 거부.
- **재료:** porcelain vs ceramic처럼 시각적으로 불충분한 구분은 명세가 없으면 거부.

### C. 검색/필터 거부

- 사용자 규격·마감과 일치하는 catalog candidate가 0개면 필터를 자동 완화하지 않고 “조건 일치 상품 없음”.
- Top-1 score가 validation에서 정한 임계값 미만, Top-1/2 margin이 작음, crop별 Top-5가 불안정, ensemble disagreement가 큼 중 둘 이상이면 exact 판정을 거부하고 Top-5만 제시.
- 이미지에서 강하게 관측된 shape/motif가 필터 후보 전체와 모순되면 “선택 조건 재확인”.
- OOD(목재, 벽지, 석재 slab, 카펫, 벽돌, 타일 포장만 보임) score가 높으면 제품 검색을 거부.

---

## 7. Top-5 평가셋 설계

### 7.1 고정 gallery와 query

- **Gallery:** 평가 시점 catalog snapshot의 각 SKU마다 정면 single/multi-face와 detail을 분리 저장. 시공컷만 있는 SKU는 `gallery_coverage=weak` 표시.
- **Known-product query 6,000장 제안:**
  - front single/multi-face 1,200
  - detail/oblique 1,200
  - installed scene 2,400
  - 실제 user-phone 재촬영 600
  - hard-negative known product 600 (동일 collection의 인접 color/finish/size, 유사 경쟁사 제품)
- **Reject/OOD 1,200장 별도:** non-tile 400, 다른 건축표면 300, 품질불량 250, 다중 타일/모호 scene 150, 잘못 선택된 규격·마감 조건 100.
- 공개 웹 이미지만으로 끝내지 말고 동의받은 현장/쇼룸 촬영을 포함한다. 웹 이미지와 사용자 사진의 domain gap을 따로 측정한다.

### 7.2 분할과 누수 방지

- `duplicate_group_id`의 perceptual duplicate, crop, 리사이즈는 동일 split.
- 같은 시공 공간/촬영 세션은 `scene_group_id`로 묶어 동일 split.
- **Unseen-SKU/collection split**을 주 지표로 삼되, held-out SKU의 gallery reference는 검색 대상으로만 제공하고 학습에는 넣지 않는다.
- 보조로 seen-SKU/new-image split도 보고해 운영 상한을 확인한다.
- 제조사/판매처 도메인 holdout을 둬 로고·배경·렌더 스타일 암기를 탐지한다.
- 크기·마감·색·look·pattern·V0–V4·view type·lot seen/unseen를 층화하고, 동일 SKU의 인기 이미지가 평가를 지배하지 않도록 SKU macro 평균을 함께 보고한다.

### 7.3 정답 정의

- `exact_sku_gt`: 이미지에 실제 사용된 SKU가 증빙된 경우만.
- `acceptable_set_gt`: 동일 제조사 color/collection 안에서 사진만으로 구분 불가능하거나 복수 SKU가 실제 등장한 경우의 허용 정답 집합. 사람 2인 검수+불일치 adjudication.
- `attribute_gt`: 보이는 속성과 명세 속성을 분리. 예를 들어 size는 user-selected/spec GT이고 visual GT가 아니다.
- 근거가 없는 인테리어 이미지는 exact-SKU 평가에서 제외하고 style/attribute 또는 rejection 평가에만 사용한다.

### 7.4 필수 지표

1. **Hard-filter integrity:** 정답 SKU가 조건에 맞을 때 filter survival 100% 목표; 조건이 틀리면 no-result accuracy.
2. **Exact retrieval:** Recall@1, Recall@5, MRR; SKU macro와 query micro 모두.
3. **허용정답군:** acceptable Recall@5, nDCG@5. exact와 섞어 하나의 수치로 숨기지 않는다.
4. **속성:** hierarchical F1/look·pattern·motif, color-bin macro F1, finish accuracy(단, 관측 가능 subset).
5. **거부/보정:** accepted precision 대 coverage 곡선, AURC, OOD AUROC/AUPR, ECE/Brier. view type과 V-rating별로 분해.
6. **강건성 slice:** 조명(주광/전구/혼합), 강한 사선, 반사/그림자, V3/V4, unseen lot, user phone, 작은 ROI, composite, 유사 SKU hard negative.

### 7.5 통과 기준 예시

- 규격·마감 필터 위반 상품이 Top-5에 들어오는 비율: 0.
- accepted exact-SKU 결과는 목표 precision(예: 95%)을 먼저 정하고, 그때의 coverage를 경쟁 지표로 사용.
- 전체 Recall@5뿐 아니라 `installed_scene`, `V3/V4`, `unseen_lot`, `user_phone` 각 slice의 하한을 릴리스 게이트로 둔다.
- 임계값은 test에서 맞추지 않고 별도 calibration/validation split에서 고정한다.

---

## 8. 학습 파이프라인 권고

1. 제조사/판매처 crawler가 제품 계층과 source assertion을 보존하여 수집.
2. 이미지 중복 제거 후 weak label(file path의 roomscene/5Up 등) 생성.
3. 이미지 역할 분류 + tile segmentation으로 시공컷 ROI 생성; composite/다중 제품은 자동 제외 또는 사람 검수 queue.
4. 명세 기반 hard attributes와 이미지 기반 visual attributes를 분리 학습.
5. contrastive retrieval은 같은 SKU의 서로 다른 view를 positive로 쓰되 V3/V4에서는 다양한 face를 포함. 같은 collection의 인접 색/finish/size를 hard negative로 사용.
6. 검색 시 `(사용자 규격 ∩ 사용자 마감)` index partition → 이미지 embedding 유사도 → color/pattern/motif reranker → calibrated rejection.
7. 결과에는 정확 SKU 확정 여부와 상관없이 근거 속성·불확실성·재촬영 가이드를 노출.

---

## 출처 목록

1. TileBar, Kenridge Ribbon Maple Brown 상품 상세/갤러리/명세  
   https://www.tilebar.com/product/kenridge-ribbon-maple-24x48-matte-porcelain-tile.html
2. Daltile, Memoir Cosmo Blue 12×12 Matte SKU  
   https://www.daltile.com/products/concrete-look/memoir/cosmo-blue-square-12x12-matte
3. Daltile, Memoir collection  
   https://www.daltile.com/products/concrete-look/memoir
4. Marazzi, Treverksoul Brown  
   https://www.marazziusa.com/products/wood-look/treverksoul/brown
5. Daltile, Delegate Light Grey  
   https://www.daltile.com/products/stone-look/delegate/light-grey
6. Daltile, Factors to Consider While Selecting Tile — shade variation V0–V4 설명  
   https://www.daltile.com/how-to/how-to-choose-the-right-tile/factors-to-consider-while-selecting-tile
7. Daltile, Lighting Placement PDF — 조명 위치와 그림자/표면 외관  
   https://digitalassets.daltile.com/content/dam/Daltile/website/resources/products/product-catalogs/DAL_LightingPlacement.pdf
8. Floor & Decor, What is a dye lot? — kiln/색조 코드/동일 lot 확인  
   https://www.flooranddecor.com/help-center/product-questions/help-product-tile/hc-what-is-a-dye-lot.html
9. Statements Tile, Understanding Tile Shade Variation — batch/dye lot와 sample/order 차이, V1–V4  
   https://www.statementstile.com/blog/understanding-shade-variation
10. CIE, Special metamerism index: Change in observer  
    https://cie.co.at/publications/special-metamerism-index-change-observer
11. OpenCV, Geometric Image Transformations — perspective transform/warpPerspective  
    https://docs.opencv.org/4.13.0/da/d54/group__imgproc__transform.html
