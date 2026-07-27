# 해외 타일 상품 상세페이지 기반 이미지 판별 지식베이스

- 조사일: 2026-07-27 (UTC)
- 범위: 제조사 7곳 + 글로벌 판매처 1곳, 공개 상품/컬렉션 상세페이지 16개와 제조사 기술 설명 7개
- 방법: 실제 페이지의 상품명·설명·규격/마감·기술표를 읽고, 각 페이지 대표 이미지는 **패턴·광택·그림자·줄눈 등 보이는 단서만** 육안 비교했다. 이미지와 본문은 복제하지 않고 요약만 기록했다.
- 주의: `effect/look`는 **모사한 외관**, `material`은 **실제 재료**, `finish/surface`는 **표면 처리**, `anti-slip`은 대체로 **성능**이다. 서로 다른 축이므로 하나의 라벨 공간에 섞으면 안 된다.

## 1. 조사 사이트와 상품 상세페이지

| ID | 사이트(국가/성격) | 실제 상세페이지와 확인 내용 | 지식베이스에 주는 근거 |
|---|---|---|---|
| S1 | Atlas Concorde (이탈리아, 제조) | [Marvel Gala Crystal White](https://www.atlasconcorde.com/en/ac-collection/marvel-gala/crystal-white): 같은 흰 대리석 무늬에 `Lappato`, `Silk`, Bookmatch, 여러 두께/규격을 별도 SKU로 제시 | **무늬는 같아도 마감은 다를 수 있음**. Lappato와 Silk는 동의어가 아니다. Bookmatch는 재료/마감이 아니라 배열 속성이다. |
| S2 | Florim (이탈리아, 제조) | [Metal Burnished](https://www.florim.com/en/products/all-collections/metal/metal-burnished): 금속 효과 대형 포세린 슬래브, `Matte - Naturale`, 두께 6/12 mm. [Metal 컬렉션](https://www.florim.com/en/products/all-collections/metal)은 raw metal 영감과 얼룩·열·스크래치 성능을 설명 | 산화·그을음 같은 외관만으로 실제 금속이라 판단하면 안 됨. `Naturale`는 여기서 표면명, `Natural (pressed)`는 edge 항목이라 같은 “natural”도 필드가 다르다. |
| S3 | Marazzi USA (미국, 제조) | [D_Segni Terrazzo](https://www.marazziusa.com/products/concrete-look/d_segni-terrazzo): terrazzo 빈티지 룩과 encaustic 패턴의 결합, 8×8, solid/pattern 혼합. [Alterations Cotton](https://www.marazziusa.com/products/fabric-look/alterations/cotton): 교차 직조 그래픽의 fabric-look, `Matte`, V2, DCOF/흡수율/강도/경도 등 표 제공 | Terrazzo와 geometric/encaustic은 중첩 라벨 가능. 직조 그래픽은 보이지만 DCOF·흡수율·Mohs는 이미지에서 보이지 않는다. |
| S4 | Daltile (미국, 제조) | [Fabric Art](https://www.daltile.com/products/fabric-look/fabric-art): woven/linear/kaleidoscope texture와 빛 반응을 설명하고 실제 재료는 ColorBody porcelain으로 명시 | fabric은 실제 섬유가 아니라 **look**일 수 있다. 반복 직조·선형·카레이도스코프 패턴은 보이지만 ColorBody 여부는 단면/문서 없이는 판별 불가. |
| S5 | TileBar (미국, 판매) | [Hikari Bamboo](https://www.tilebar.com/product/hikari-bamboo-chalk-white-24x48-limestone-look-textured-matte-porcelain-tile.html): limestone-look, `Textured Matte`, 종이 같은 서로 다른 face, DCOF 0.49. [Boscato polished](https://www.tilebar.com/product/boscato-cream-white-24x48-polished-porcelain-tile.html): marble-look polished, V4, 흡수율 <0.5%. [Kinetic Circles honed](https://www.tilebar.com/product/kinetic-asian-statuary-circles-honed-finish-marble-tiles.html): 원형 기하 모자이크, honed marble. [Autograph satin](https://www.tilebar.com/product/autograph-arabescato-white-48x48-marble-look-satin-porcelain-tile.html): marble-look satin porcelain | 한 판매처 안에서도 polished/honed/satin/textured matte가 구분된다. `look`·실재료·형상·마감은 다중 라벨로 저장해야 한다. |
| S6 | Ragno (이탈리아, 제조) | [Maiora Concrete Effect](https://www.ragno.it/collezioni/maiora-concrete-effect/): 얇은 concrete-effect 포세린, `Natural Rectified`, 동결/마모 정보. [Woodsense](https://www.ragno.it/collezioni/woodsense/): wood-effect, 자연 색조와 물질감, StepWise의 부드러운 촉감+미끄럼 저항. [Woodchoice](https://www.ragno.it/collezioni/woodchoice/): wood-effect를 Chevron 규격으로 재해석 | concrete/wood는 외관이고 실제 재료는 포세린. Chevron은 wood와 공존하는 geometric/laying 속성. 미끄럼 저항은 거친 외관과 1:1 대응하지 않는다. |
| S7 | Casalgrande Padana (이탈리아, 제조) | [Marmora](https://www.casalgrandepadana.com/product/marmora): 퇴적암의 low-relief veining을 포세린에 재현. [Terrazzo](https://www.casalgrandepadana.com/product/terrazzo): 불규칙·랜덤 패턴, `seminato` 테마, 색 대비가 있는 stone-like texture. [Metalwood](https://www.casalgrandepadana.com/product/metalwood): metal과 wood 효과가 결합된 컬렉션 | vein의 색뿐 아니라 얕은 relief가 단서일 수 있다. `seminato`는 terrazzo 계열 핵심어. Metalwood처럼 단일 클래스 강제 분류가 부적절한 하이브리드가 존재한다. |
| S8 | RAK Ceramics (UAE, 제조) | [Absolute Matt](https://www.rakceramics.com/europe/en/tiles-floors-coverings/absolute-matt/): extra-matt, zero reflection/non-glossy. [Antislip Barefoot Plus](https://www.rakceramics.com/europe/en/tiles-floors-coverings/antislip-barefoot-plus/): indoor/outdoor non-slip 성능과 “촉감으로 알아채기 어려운 특수 거칠기”를 설명. [Tech Marble](https://www.rakceramics.com/europe/en/tiles-floors-coverings/tech-marble/) | matte는 반사 외관 축, anti-slip은 마찰 성능 축이다. **보이지 않고 촉감으로도 거의 안 느껴지는 anti-slip**이 제조사 설명에 실제 존재한다. |

> 사이트 수 산정은 S1~S8의 서로 다른 도메인 8곳 기준이다. 컬렉션 페이지는 제조사가 색상·규격·표면·기술 사양을 SKU 단위로 제공하는 제품 상세 허브라 조사 대상 PDP로 취급했다.

## 2. 외관 계열 비교: 이미지에서 보이는 것 vs 보이지 않는 것

| 계열 | 이미지에서 비교적 강한 단서 | 자주 겹치는/오인되는 계열 | 이미지로 확정 불가한 물성·메타데이터 | 대표 근거 |
|---|---|---|---|---|
| **marble** | 배경을 가로지르는 vein/맥, 굵고 가는 선의 분기, 구름 같은 농담, bookmatch 대칭, 밝은 바탕과 강한 색 대비 | onyx·travertine·일반 stone; 인쇄 콘크리트의 균열 패턴 | 천연 대리석인지 marble-look 포세린인지, 산 민감성, 흡수율, 실러 필요, 관통 무늬 여부 | S1, S5 Boscato, S7 Marmora, S8 Tech Marble |
| **stone** | 입자·층리·화석/공극처럼 보이는 점, slate cleft, limestone의 잔잔한 반점, 불규칙 방향성; relief가 있으면 사광에서 미세 그림자 | concrete, terrazzo(미세 칩), marble, 종이/회벽 효과 | 실제 암종, 천연석/포세린, 밀도·흡수율·동결저항·굽힘강도 | S5 Hikari, S7 Marmora |
| **concrete** | 저대비 회색/베이지 mottling, 흙손 자국 같은 넓은 번짐, 미세 pinhole/기포 모사, 대체로 큰 무방향 면 | limestone, plaster/resin, 단색 matte | 실제 시멘트계인지 포세린인지, 균열·수축, 얼룩/화학 저항, 관통색 | S6 Maiora, S3 D_Segni |
| **wood** | 길이 방향 grain, 결의 굴곡과 knot, plank 비율, 보드 간 색 변화, saw/aged 자국 | linear fabric, travertine vein-cut, 금속 브러시 결 | 실제 목재/포세린, 촉감·열감, 함수율·팽창, 내수성, 반복 face 수 | S6 Woodsense/Woodchoice |
| **terrazzo** | 단색 matrix 안에 크기·색·형상이 다른 무작위 chip/aggregate; 칩 밀도와 입도 분포 | speckled granite, ceppo di gré stone, confetti 프린트, encaustic geometric | 진짜 시멘트/레진 terrazzo인지 프린트 포세린인지, 골재 깊이, binder, 연마·실러 | S3 D_Segni Terrazzo, S7 Terrazzo |
| **metal** | 산화/patina, 번짐·그을음·스케일, 녹/청동색 변화, 방향성 brushed line, 금속 같은 강한/국부 반사 | 짙은 concrete/stone, reactive glaze, rust-look 프린트 | 실제 금속인지 포세린인지, 전기·열전도, 자성, 부식, 코팅, 스크래치 성능 | S2, S7 Metalwood |
| **fabric** | warp/weft 교차선, 규칙적 직조, 실 굵기 같은 미세 선, linear/kaleidoscope 반복, 부드럽게 산란하는 외관 | wood grain, paper, brushed metal, fine geometric | 실제 섬유/포세린, 부드러움, 방오·흡수, 섬유 조성, 표면 마찰 | S3 Alterations, S4 Fabric Art |
| **geometric** | 원·육각·chevron·arabesque·격자 등 명시적 반복, 대칭축, 모듈 경계와 줄눈, 고대비 모티프 | terrazzo(칩), encaustic, mosaic, 3D relief | 프린트인지 절단 조각인지, mesh backing, 모듈 규격, 단차, 실제 줄눈 여부 | S3 D_Segni, S5 Kinetic, S6 Woodchoice |

### 분류 운영 규칙

1. **멀티라벨**: `D_Segni Terrazzo = terrazzo + geometric/encaustic`, `Metalwood = metal + wood`, `Woodchoice = wood + chevron/geometric`처럼 중첩 허용.
2. **재료와 효과 분리**: `visual_effect=marble`, `body_material=porcelain`, `finish=polished`처럼 별도 필드 사용. 이미지 모델은 우선 `visual_effect`만 예측하고 본문/스펙으로 재료를 보강한다.
3. **형상과 그래픽 분리**: hexagon 타일의 외곽 형상과 타일 위 hexagon 프린트는 각각 `piece_shape`와 `surface_pattern`으로 분리한다.
4. **장면보다 근접컷 우선**: 원거리 room scene은 줄눈·원근·조명이 패턴과 광택을 왜곡한다. face 정면컷, 사광컷, SKU 간 동일 조명 비교가 필요하다.

## 3. 마감·표면 용어 비교

| 표준 라벨 | 제조사/판매처 사용 예 | 이미지에서 보일 수 있는 단서 | 이미지에서 절대 확정하면 안 되는 것 | 관계/주의 |
|---|---|---|---|---|
| **polished** | S1의 polished 계열, S5 Boscato `Polished`; MSI 설명은 glossy finish와 색·맥 강조 | 선명한 specular highlight, 램프/창 반사, 높은 명암·색 포화 | 실제 광택도(GU), 연마 공정, 젖은 상태 DCOF, 스크래치/오염성 | `glossy/high-gloss`와 시각적으로 근접하나, 유약 gloss와 기계 polished는 공정상 다를 수 있음 |
| **honed** | S5 Kinetic `Honed`; MSI는 “satin smooth, no gloss” | 평탄해 보이고 반사가 흐리며 vein은 보이되 거울상 없음 | 손촉감의 매끈함, 실제 연마 단계, 미끄럼 성능 | `matte`와 외관이 겹침. MSI 문장의 `satin smooth`는 촉감 형용사이지 finish 라벨 `satin`과 자동 동의어가 아님 |
| **matte / matt** | S2 `Matte - Naturale`, S3 Alterations `Matte`, S5 Hikari `Textured Matte`, S8 `Absolute Matt` | 넓고 diffuse한 하이라이트, 거울상 부재, 색이 비교적 균일 | zero-gloss 여부, 미세 거칠기, 방오성·DCOF | 철자만 다른 `matte=matt`는 정확 동의어. `natural/naturale`은 브랜드 문맥에서만 근접 매핑 |
| **satin** | S5 Autograph `Satin`; Tubądzin은 velvet touch와 low light reflection 설명 | matte보다 약한 부드러운 sheen, 흐린 반사 띠 | 기계 연마 방식, 촉감, slip 성능 | 보통 polished와 matte 사이지만 브랜드별 범위 차이. `silk/soft`는 후보 동의어일 뿐 정확 동의어로 고정 금지 |
| **lappato** | S1 Crystal White `Lappato`; Atlas Plan과 MSI는 부분/반연마, glossy+matte 혼합으로 설명 | 각도에 따라 일부 영역만 반짝이는 patchy/nuanced shimmer | 부분 연마 공정, slip 향상 정도, 내마모 | `semi-polished`는 강한 동의어. fully polished·honed와는 구별 |
| **textured** | S5 Hikari `Textured Matte`; Atlas Concorde wood-effect outdoor의 non-slip textured | 사광에서 미세 그림자, 표면 패턴의 굴곡, 반복 요철 | 손에 느껴지는 정도, 높이/조도 파라미터, DCOF/R 등급 | 넓은 상위어. rough, relief, embossed, tactile 등이 하위/근접어지만 성능은 별개 |
| **structured** | Atlas Concorde [Block Bianco Structured](https://www.atlasconcorde.com/en/ac-solution-collection/block/bianco/structured-30x60-8-d500); Keope는 pressing/firing으로 만든 3D raised texture로 설명 | 명확한 micro-relief/raised pattern, 사광 그림자, 배수 홈 | 제조 공정, 영구성, R10/R11, 실제 마찰 | `textured`의 하위 유형으로 보는 것이 안전. 모든 textured가 structured는 아님 |
| **anti-slip** | S8 Barefoot Plus `Antislip/non-slip`; S6 StepWise; S3의 DCOF 적용표 | 일부 제품은 grit·거친 relief·홈이 보일 수 있음 | **DCOF, R9–R13, P/PTV, wet barefoot class, 용도 적합성**. S8은 거칠기가 촉감으로도 거의 인지되지 않는다고 명시 | 표면 외관 라벨보다 성능 태그. `non-slip/slip-resistant/grip`과 검색 동의어지만 “절대 안 미끄러움”을 뜻하지 않음 |

### 이미지 판별의 현실적 신뢰도

- **높음**: 큰 vein, wood grain/knot, 큰 terrazzo chip, 명확한 원/chevron 모듈, 거울상 수준 polished.
- **중간**: concrete vs limestone, metal patina vs dark stone, fabric vs paper, matte vs honed.
- **낮음**: satin vs silk vs honed, lappato vs 조명에 의한 부분 반사, textured vs structured의 미세 차이.
- **판별 불가**: anti-slip 등급, DCOF, 흡수율, 동결저항, 내마모, 본체 재료/통체색, 실러 필요성, 실제 촉감·두께.

## 4. 동의어·관련어 사전

`=` 정확/강한 동의어, `≈` 브랜드 문맥에 따라 근접, `⊂` 하위 개념, `≠` 혼동 금지.

| canonical | 동의어·관련어 | 정규화 제안 | 근거/주의 |
|---|---|---|---|
| marble effect | marble-look = effetto marmo(IT) ≈ marmo look; veined stone look | `visual_effect: marble` | S1/S5/S7. 실제 material `marble`과 분리 |
| stone effect | stone-look = effetto pietra(IT) | `visual_effect: stone` | S5/S7. limestone/slate/travertine 등 subtype 별도 |
| concrete effect | concrete-look = cement look ≈ effetto cemento(IT) ≈ resin/concrete look | `visual_effect: concrete` + 원문 보존 | S6. cement와 concrete는 상품 필터에서 합쳐지기도 하지만 재료 정의상 동일어는 아님 |
| wood effect | wood-look = effetto legno(IT) | `visual_effect: wood` | S6. plank/chevron은 shape 또는 laying pattern |
| terrazzo | seminato(IT) ≈ terrazzo-look = speckled aggregate look | `visual_effect: terrazzo` | S7이 seminato 테마를 명시. ceppo/granite는 별도 후보 |
| metal effect | metal-look = metallic-look ≈ effetto metallo(IT), oxidized/rusted/burnished/brushed | `visual_effect: metal`; patina subtype | S2/S7. `burnished`는 색·가공 느낌이지 항상 광택 finish는 아님 |
| fabric effect | fabric-look = textile-look = woven/linen look ≈ effetto tessuto(IT) | `visual_effect: fabric` | S3/S4. `linen`은 색명일 수도 있어 필드 문맥 확인 |
| geometric | geometric pattern ≈ encaustic pattern, chevron, hexagon, arabesque, kaleidoscope | `pattern_family: geometric`; 세부 motif 별도 | S3/S4/S5/S6. encaustic는 제작법/스타일도 포함하므로 완전 동의어 아님 |
| polished | polished ≈ glossy/high-gloss; lucido(IT), levigato(IT, 브랜드 확인) | `finish: polished`는 원문 polished/lucido에만 확정 | MSI marble finish, STN. gloss glaze와 기계 polishing 공정은 다를 수 있음 |
| honed | honed ≈ smooth matte/low-sheen; levigato가 honed 또는 polished로 번역될 수 있음 | `finish: honed`; `appearance: low_sheen_smooth` | MSI: satin smooth but no gloss. `satin` finish와 자동 병합 금지 |
| matte | matte = matt; opaque/non-glossy ≈ natural/naturale | `finish: matte`; natural은 `source_finish` 보존 | S8 zero reflection, S2 Matte-Naturale. `natural`은 edge/재료 의미도 있음 |
| satin | satin = satinato(IT) ≈ silk/soft/velvet/low-reflection | `finish: satin`; silk는 별도 alias 후보 | Tubądzin, S1/S5. honed와 시각 중첩하나 공정/브랜드 정의 다름 |
| lappato | lappato = lapato(철자 변형) = semi-polished ≈ semi-lucidato/part-polished | `finish: lappato` | Atlas Plan: part glossy/part matt; MSI: semi-polished. polished/honed와 병합 금지 |
| textured | textured ≈ rough/tactile/relief/embossed | `surface_texture: textured` | S5/Atlas wood page. 강도·형성법이 넓게 섞이는 상위어 |
| structured | structured ⊂ textured; raised/3D/micro-relief | `surface_texture: structured` + `texture_level` | Keope: pressing/firing 중 형성된 3D raised texture |
| anti-slip | anti-slip = antislip ≈ non-slip = slip-resistant ≈ grip; StepWise/Barefoot Plus는 상표 | `performance: slip_resistant`; 시험값 별도 | S8/S6/S3. `non-slip`도 무조건 안전을 보증하는 절대어로 해석 금지 |
| bookmatch | bookmatched/mirror-matched | `layout: bookmatch` | S1. marble 계열에서 강한 시각 단서지만 finish나 material이 아님 |
| rectified | rettificato(IT) | `edge: rectified` | S6. 표면 finish가 아니라 모서리 가공 |
| natural | naturale(IT) | 필드에 따라 `finish`, `edge`, `material_claim`로 분기 | S2에서 Matte-Naturale와 Natural(pressed)이 서로 다른 열에 등장 |

## 5. 보이지 않는 물성: 반드시 스펙/OCR·본문으로 결합할 필드

| 속성 | 필요한 출처/표현 예 | 이미지 단독 추정 금지 이유 |
|---|---|---|
| 실제 body/material | porcelain, ColorBody, natural marble, cement/resin terrazzo | 표면 인쇄가 천연 재료를 매우 정밀하게 모사 |
| 물흡수율 | ASTM C373, `<0.5%` 등 | 표면 광택·색과 상관관계가 약함 |
| 미끄럼 | DCOF wet, R9–R13, P/PTV, barefoot class | RAK 사례처럼 특수 거칠기가 눈·촉감에 거의 안 잡힐 수 있음 |
| 내마모/경도/강도 | PEI, deep abrasion, Mohs, breaking strength | 같은 외관·마감이라도 body와 제조법에 따라 다름 |
| 동결·외부 적합성 | frost resistant/ingelivo, exterior use | 사진 장면은 스타일링일 뿐 인증이 아님 |
| 화학·오염·스크래치 저항 | ASTM C650, stain resistance, 제조사 기술표 | polished/matte의 시각적 인상으로 성능을 역추론할 수 없음 |
| 치수·두께·edge | nominal/actual size, thickness, rectified/pressed | 원근과 줄눈 때문에 측정 불가. `natural`이 edge에 쓰이는 사례도 있음 |
| shade variation | V1–V4, face 수 | 한 장의 렌더/샘플은 전체 로트 분포를 대표하지 않음 |
| 실러·유지관리 | sealing requirement, cleaning instructions | 천연석과 look-alike porcelain을 이미지로 구분하기 어려움 |
| through-body/관통 무늬 | full-body, ColorBody, through-body veining | 정면 이미지로 단면·칩 발생 후 상태를 알 수 없음 |

## 6. 자재GO용 권장 스키마와 판별 순서

```yaml
visual_effect: [marble, stone, concrete, wood, terrazzo, metal, fabric]
pattern_family: [organic_vein, aggregate, woven, geometric, linear_grain, mottled]
pattern_motif: [chevron, hexagon, circle, encaustic, bookmatch, null]
piece_shape: [rectangle, plank, square, hexagon, mosaic, slab, unknown]
finish_source: "상품 원문"
finish_normalized: [polished, honed, matte, satin, lappato, other, unknown]
surface_texture: [smooth, textured, structured, unknown]
gloss_visual: [high, medium, low, mixed, unknown]
performance_slip_resistant: [true, false, unknown]
slip_test: {standard: null, value_or_class: null}
body_material: [porcelain, ceramic, natural_stone, terrazzo_cement, terrazzo_resin, metal, unknown]
evidence: {image: [], page_text: [], technical_sheet: []}
confidence: {visual_effect: 0.0, finish: 0.0, material: 0.0, slip: 0.0}
```

1. 정면 근접 이미지에서 `visual_effect`, `pattern_family`, `piece_shape`를 멀티라벨 추론.
2. 사광/반사 이미지가 있을 때만 `gloss_visual`과 macro texture를 추론.
3. `finish_normalized`는 페이지 원문을 우선하고 이미지 예측은 보조 신호로 사용.
4. material·DCOF·흡수율·강도·외부 적합성은 상세페이지/기술표에서만 채우고 없으면 `unknown`.
5. `matte↔honed↔satin`, `lappato↔polished`, `stone↔concrete`, `terrazzo↔granite/ceppo`는 hard negative 세트로 운영.

## 7. 용어 정의 보조 출처

- [Atlas Plan — Lappato tiles: meaning, pros and cons](https://www.atlasplan.com/en-US/news/lappato-tiles/): 불완전 연마, part glossy/part matt 정의.
- [MSI — Lappato Semi-Polished Finish](https://www.msisurfaces.com/lappato/): semi-polished, matte+glossy texture와 light play.
- [MSI — Marble Tile Finishes](https://www.msisurfaces.com/marble-tile-finish/): polished는 glossy, honed는 satin-smooth but no gloss로 대조.
- [Tubądzin — Satin-finish tiles](https://www.tubadzin.pl/en/tip/what-is-the-difference-between-satin-finish-ceramic-tiles-and-other-tiles-391157): velvet touch, special mechanical polishing, low reflection.
- [Ceramiche Keope — Structured porcelain tiles](https://www.keope.com/en/magazine/structured-porcelain-tiles): pressing/firing 중 형성되는 3D raised texture, micro-relief와 friction 설명.
- [STN Cerámica — Polished vs satin](https://stnceramica.es/en/differences-between-polished-and-satin-finished-tiles/): polished의 high-gloss/거울 같은 특성, lappato의 gloss+matte 설명.
- [Atlas Concorde — Wood-effect tiles](https://www.atlasconcorde.com/en/wood-effect-tiles): outdoor 9 mm 제품의 non-slip textured finish 예시와 보이지 않는 내구·유지관리 성능.

## 결론

- 계열 분류는 **외관 효과**, 마감 분류는 **반사/표면**, anti-slip은 **시험 성능**으로 분리해야 한다.
- 사진으로 가장 안정적인 것은 큰 패턴과 형상이며, 마감은 조명 의존성이 크고 물성은 대부분 보이지 않는다.
- 특히 `matte/honed/satin`, `lappato/polished`, `textured/structured/anti-slip`을 단순 동의어로 합치면 데이터 오염이 발생한다.
- 원문 alias를 보존하면서 canonical label과 시험값을 별도 저장하는 방식이 해외 브랜드 간 용어 차이를 가장 안전하게 흡수한다.
