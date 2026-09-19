# 울주 AI 영상 부문 제작 킷 — 「돌에서 나온 고래」

> 대상 공모: 2026「울주에 숏며들다」숏폼 영상 공모전(가을·AI편) · AI 영상 부문
> 툴 스택: **Nano Banana (이미지, 무제한) → Higgsfield의 Kling 3.0 (영상)**
> 업로드: **인스타 릴스 @lucax8560 (주) + 유튜브 쇼츠 (병행)** — 8절
> 계정: 게시 @lucax8560 (서브) · 확산 @metaluca2750 (본계정) — 8절
> 요건 근거: 울주군 공고 제2026-2364호

---

## 0. 먼저 — 기존 계정 분석과 스펙 갭

### 확인한 것 (업로드해주신 영상 2편)
| 항목 | 현재 |
|---|---|
| 해상도 | **404×720** |
| 길이 | **5.04초** |
| 프레임 | 24fps, H.264 |
| 포맷 | 단일 컷, 컷 전환 없음 |
| 스타일 | 실사풍 항공 앵글 + 실제 랜드마크가 거대 생물로 변형 |

영상 1 = 반구대 암각화 절벽에서 혹등고래 떼가 튀어나와 대곡천으로 뛰어듦, 전망대 관광객이 올려다봄.
영상 2 = 해안 암반이 용머리로 변하고 입에서 폭포가 쏟아짐, 눈에 주황 발광.

### ⚠️ 스펙 갭 3가지 — 이것부터 해결

**1. ~~해상도가 규격 미달이다~~ → 해결됨 (2026-09-17)**
앞서 받은 404×720은 인스타에서 다시 받은 압축본이었다. **힉스필드 원본은 2176×3808 (4K 세로, 24fps, 31Mbps)로 확인.** 규격 문제 없음.

→ 다만 **최종 제출본은 1080×1920으로 내보낼 것.** 공고가 규격을 그렇게 명시했다.
→ 2176×3808은 4:7(0.571)이고 정확한 9:16은 2142×3808이다. **가로 34px(좌우 17px씩) 크롭 후 1080×1920으로 스케일**하면 된다.

**2. 5초 콘텐츠와 15~60초 콘텐츠는 다른 물건이다**
지금 만드는 건 "한 컷 스펙터클"이다. 임팩트는 강하지만 5초다. 공모전은 최소 15초, 본심 배점에 **기획·전달력 10점**이 따로 있다. 컷을 이어 붙이는 순간 서사가 필요해진다. 이 킷의 핵심이 그 부분이다.

**3. 이미 올린 영상을 다시 쓰지 말 것**
공고상 필수 해시태그 3종을 달아 접수기간에 새로 업로드해야 하고, 정량지표도 그 게시물 기준으로 집계된다. 기존 게시물 재활용은 리스크만 크다. **새로 만들어 10월 1일에 올린다.**

### 반대로, 계정은 강력한 자산이다
예비심사의 절반이 `조회수 + (좋아요×10)`이다. **매일 올리는 계정이 있다는 건 이 공모전에서 가장 큰 무기다.** 신규 계정 참가자는 이 지표에서 시작부터 진다. 아래 8절에 이 자산을 쓰는 법을 따로 정리했다.

---

## 1. 컨셉 — 왜 다시 고래인가, 그리고 뭐가 달라지는가

### 고래를 버리지 않는 이유 (심사에 직결)
- **반구천의 암각화는 작년 유네스코 세계유산에 등재됐고, 지금이 등재 1주년이다.** 울주군이 가장 밀고 있는 소재다 → 본심 **공공 활용성 10점**, **주제 적합성 10점**에 정면으로 맞는다.
- 2026. 9. 15. 뉴스: **"고래뼈에 박힌 사슴뿔 작살촉"이 국가유산으로 지정**됐다. 암각화 속 고래가 상상이 아니라 실제 선사시대 포경의 기록이었다는 실물 근거다. 훅 문구가 여기서 나온다.
- 이미 그 그림을 만들어본 경험이 있다 = 프롬프트 리스크가 가장 낮다.

> ※ 위 두 사실은 2026년 9월 기준 국내 언론 보도로 확인했다. 인용 문구를 영상 자막에 넣을 거라면 울주군 홍보팀에 한 번 더 확인하는 걸 권한다.

### 기존 영상과 달라지는 지점 — **여정** (2026-09-17 확정)

> 초안에서는 "고래가 돌에서 생명으로 변한다"는 전이 구조를 밀었으나, 마스터 이미지 생성 결과가 더 나은 답을 줘서 **전이를 폐기했다.**

생성된 마스터 이미지에서 고래는 처음부터 살아있고, **암각화 문양은 벽에 남은 채로** 고래만 빠져나온다. 이쪽이 원안보다 낫다.

| | 폐기한 원안 | 확정안 |
|---|---|---|
| 서사 | 돌고래가 단계별로 생명체가 된다 | **벽에 새겨져 있던 고래가 빠져나와 울주를 가로지른다** |
| 일관성 | 컷마다 질감이 달라져야 함 → 이 작업 최대 난관 | 고래가 안 변함 → **난관 소멸** |
| 가독성 | 변화를 알아채려면 시간 필요 | 한 컷에 즉시 읽힘 |
| 마스터 | A(석재) + B(생명체) 2장 | **1장** |

**약한 전이만 남긴다**: 초반 컷에는 몸에 돌가루와 파편이 붙어 있고, 여정을 거치며 씻겨나가 후반에는 깨끗해진다. 일관성을 해치지 않으면서 변화는 남는다.

**5초로 못 하는 것**이라는 명분은 전이가 아니라 **여정**이 맡는다. 5초짜리로는 다섯 장소를 갈 수 없다.

## 2. 컷 구성 (9컷 · 약 45초)

| # | 장소 | 그림 | 돌가루 | 자막 | 상태 |
|---|---|---|---|---|---|
| 1 | 반구천 암각화 | 각석 고래 클로즈업, 홈에서 빛이 맥동 | — | *(없음)* | 이미지 진행 중 |
| 2 | 반구천 절벽 | **고래가 벽을 뚫고 나옴. 문양은 벽에 남음** | 최대 | `7천 년 만에` | ✅ **영상 완료** |
| 3 | 대곡천 | 물길 위를 낮게, 전망대의 사람들이 올려다봄 | 많음 | `반구천의 고래가` | 다음 |
| 4 | 간월재 억새평원 | 억새 위를 스침, 지나간 자리가 금빛 | 줄어듦 | `깨어났다` | 다음 |
| 5 | 신불산 운해 | 구름바다를 뚫고 상승 | 약간 | *(없음)* | 확장분 |
| 6 | 외고산 옹기마을 | 항아리들이 차례로 불을 켬 | 거의 없음 | `울주를 지나` | 확장분 |
| 7 | 석남사 단풍길 | 단풍 터널 위, 낙엽이 소용돌이 | 없음 | *(없음)* | 확장분 |
| 8 | 간절곶 등대 | 일출을 향해 나아감 | 없음 | `가장 먼저 해가 뜨는 곳으로` | 다음 |
| 9 | 울주 전경 | 빛 입자로 흩어져 `울주` | — | CTA | 별도 |

### 컷 1은 0.8초로 줄인다

원래 1.5초 무음으로 버티는 구성이었으나 바꾼다. **릴스는 0.5초 안에 판단되고, 이 계정 히트작은 전부 첫 프레임부터 스펙터클이었다**(해운대 파도 9,000회도 첫 컷이 파도). 첫 화면에 평범한 바위를 1.5초 두는 건 위험하다.

컷 1은 숨 한 번 쉬는 정도로 짧게 두고 **바로 컷 2를 때린다.** 빼지는 않는다 — 컷 1이 있어야 "각석이 살아났다"가 성립한다.

### 최소 완성본 = 6컷 30초
`1 → 2 → 3 → 4 → 8 → 9`
컷 5·6·7은 45초로 늘리는 확장분이지 필수가 아니다.

## 3. 마스터와 파생 규칙 (2026-09-17 갱신)

### 마스터 = 컷 2 영상의 후반 프레임

처음엔 컷 2 생성 이미지를 마스터로 잡았으나, **영상 후반 프레임이 더 낫다.** 고래가 완전히 나와 공중에 떠 있고 문양도 다 보인다. 컷 3~8은 전부 "날고 있는 고래"라 이쪽이 맞다.

- 추출: 컷 2 영상 3.4초 / 4.2초 지점, 각 **2176×3808**
- 원본 생성 이미지(768×1344, 벽에 반쯤 박힌 상태)는 컷 1~2 연결용으로만 보관

### 고래의 신원 표식 — 암각화 문양

마스터 이미지에서는 금빛 암각화 문양이 **절벽 벽면**에 있었는데, Kling이 이를 **고래 몸의 무늬**로 해석해 5초 내내 유지했다. 의도하지 않았지만 결과가 더 좋다.

**이 문양이 고래의 신원이다.** 컷 3~8에서 이것만 같으면 누가 봐도 같은 개체로 읽힌다. 파생 지시문에 반드시 포함할 것.

### 파생 지시문 템플릿 (갱신)

```
Keep this exact same whale — identical body proportions, identical pectoral fin shape,
identical head and jaw texture, identical skin tone and barnacle pattern,
identical glowing amber petroglyph markings on its flank.
Place it [동작] [배경 묘사].
[돌가루 상태]
Aerial cinematic photograph, photorealistic, vertical 9:16 composition.
```

**항상 마스터를 레퍼런스로 물린다.** 직전 컷을 연쇄로 물리면 갈수록 원본에서 멀어진다.

### 돌가루 문구 (컷 순서대로 줄여나간다)

| 컷 | 넣을 문구 |
|---|---|
| 3 | `Rock dust and small stone fragments still cling to its back and slide off as it moves.` |
| 4 | `A little rock dust still clings to its back, trailing behind it.` |
| 5 | `Faint traces of rock dust remain on its back.` |
| 6~8 | *(문구 없음 — 깨끗한 상태)* |

## 4-1. 툴 — 바꾸지 않는다

**Higgsfield에서 Kling 3.0.** 기존 쇼츠(반구대 고래, 대왕암 용머리, 해운대 파도, 골리앗 크레인)를 전부 이 조합으로 만들었다. 결과물 퀄리티가 이미 검증됐고 프롬프트 감각도 몸에 붙어 있다. **공모전 3주 전에 툴을 바꾸는 건 그 자체가 리스크다.**

Midjourney는 이 문서 초안에서 내가 기본값으로 가정했던 것뿐이다. **재구독할 이유가 없다.** 그 예산은 힉스필드 크레딧으로 돌리는 게 맞다 — 9컷에 재생성까지 하면 크레딧이 꽤 나간다.

### 다만 결제 전에 3개만 확인할 것

공고에 AI 부문 특기사항이 명시돼 있다.

> "생성형 AI 툴을 활용하여 제작된 영상의 경우, **AI 플랫폼의 상업적 이용 라이선스 규정을 준수**해야 하며 저작권 분쟁 소지가 없는 프롬프트 및 리소스를 사용해야 함."

| # | 확인할 것 | 상태 |
|---|---|---|
| 1 | **유료 플랜의 상업적 이용 라이선스** | 유료 플랜에 포함되고 무료 플랜은 제외되는 구조로 보인다. 출품작은 반드시 유료 플랜에서 생성할 것 |
| 2 | **워터마크 없음** | 정보가 엇갈린다 — 공식 헬프센터는 무료 계정에 워터마크가 붙는다고 안내하는 반면 마케팅 페이지 표현은 다르다. **최종 출품본은 눈으로 직접 확인** |
| 3 | **다운로드 해상도 1080×1920** | ⚠️ 받은 파일이 404×720이었다. 힉스필드에서 받을 때 최고 해상도로 내려받고 있는지 확인할 것 |

> 위 1·2번은 2026년 9월 기준 3자 블로그와 공식 헬프센터를 훑은 결과이고 약관은 자주 바뀐다. **[공식 요금제 페이지](https://higgsfield.ai/pricing)에서 결제 전 직접 확인할 것.**

### 3번이 제일 급하다

제출물에 "숏폼 원본 영상 파일"이 포함되고, 심사 중 원본·제작 증빙을 추가로 요구할 수 있다(공고 명시). 404×720은 **규격 미달로 접수 자체가 흔들릴 수 있다.** 다음 영상 뽑을 때 힉스필드 다운로드 설정부터 점검할 것.

### 이번 작업의 최대 난관은 컷 간 일관성이다

기존 콘텐츠는 전부 단일 컷이라 일관성 문제가 없었다. 이번엔 **9컷을 같은 고래로 유지**해야 한다. 이게 이 작업에서 유일하게 새로운 기술 과제다.

→ **본 작업 전에 반드시 테스트**: 컷 1(암각화 상태)과 컷 6(생명체 상태)을 먼저 뽑아 같은 개체로 보이는지 확인한다. 안 되면 3절 고정 묘사 블록을 더 길고 구체적으로 쓰고, 힉스필드의 레퍼런스 이미지 기능을 붙인다.

## 4-2. 이미지 생성 프롬프트 (컷별 · 그대로 붙여넣기)

힉스필드 이미지 생성에 넣는다. **화면비는 UI에서 9:16(1080×1920)으로 설정**하고, 컷 2부터는 컷 1의 확정 이미지를 레퍼런스로 물린다.

> 클링 3.0 text-to-video로 바로 가는 방식을 쓰고 있다면, 아래 프롬프트에 5절의 모션 문장을 이어 붙여 하나로 넣으면 된다. 다만 **9컷 일관성 때문에 이미지를 먼저 확정하고 image-to-video로 가는 쪽을 권한다.** 시작 프레임이 고정되면 고래 모양이 컷마다 흔들리지 않는다.

### 컷 1 — 암각화 절벽 클로즈업
```
extreme close-up of an ancient riverside rock cliff face in Korea, weathered grey granite covered in prehistoric petroglyph carvings of whales, boats and hunters, deep chiselled grooves faintly glowing with warm amber light, morning mist, dew on stone, shallow depth of field, cinematic photorealistic, muted earth tones, soft directional dawn light, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 2 — 고래가 바위를 뚫고 나옴
```
a colossal humpback whale, 40 meters long, its entire body surfaced in weathered grey granite carved with prehistoric petroglyph line-art of whales and hunting boats, deep chiselled grooves glowing with warm amber light from within, wet stone sheen, barnacle-like rock texture along the jaw, long pectoral fins, bursting head-first out of a towering riverside cliff face, shattered rock fragments and dust cascading down, a narrow green river below, dense Korean forest, dramatic scale, aerial cinematic photography, photorealistic, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 3 — 대곡천 물길, 전망대의 사람들
```
a colossal humpback whale, 40 meters long, half granite half living whale skin, the stone dissolving into dark wet flesh from the tail forward, deep chiselled petroglyph grooves glowing with warm amber light from within, long pectoral fins, gliding low above a narrow emerald river between limestone cliffs, a small wooden observation deck below with a dozen tiny tourists in colourful jackets looking up in awe, autumn forest, aerial cinematic photography, photorealistic, sense of immense scale, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 4 — 간월재 억새평원
```
a colossal humpback whale, 40 meters long, half granite half living whale skin, the stone dissolving into dark wet flesh from the tail forward, petroglyph grooves glowing warm amber, long pectoral fins, skimming just above a vast silver pampas grass plateau on a Korean mountain ridge at golden hour, the grass turning luminous gold in a wave where the whale passes, layered blue mountain ridgelines behind, low sun flare, aerial cinematic photography, photorealistic, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 5 — 신불산 운해 돌파
```
a colossal humpback whale, 40 meters long, mostly living whale skin with only faint petroglyph scars remaining glowing amber, long pectoral fins, rising vertically through a dense sea of clouds above Korean mountain peaks at dawn, cloud vortices trailing from its fins, warm sunrise light breaking above the cloud layer, aerial cinematic photography, photorealistic, epic scale, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 6 — 외고산 옹기마을
```
a colossal humpback whale, 40 meters long, dark slate-blue living whale skin with faint luminous petroglyph scars still glowing along its flank, long pectoral fins, gliding above a traditional Korean pottery village at dusk, hundreds of large dark earthenware onggi jars arranged in rows across terraced yards, each jar lighting up one by one with warm amber glow as the whale passes, tiny golden lights rising from the jar mouths into the air, tiled roofs, blue hour sky, aerial cinematic photography, photorealistic, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 7 — 석남사 단풍길
```
a colossal humpback whale, 40 meters long, dark slate-blue living whale skin with faint luminous petroglyph scars glowing along its flank, long pectoral fins, gliding low above a winding mountain road tunnelled by brilliant red and orange autumn maple trees, a traditional Korean temple gate visible below, swirling vortex of fallen leaves spiralling up in the whale's wake, soft afternoon backlight, aerial cinematic photography, photorealistic, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 8 — 간절곶 일출
```
a colossal humpback whale, 40 meters long, dark slate-blue living whale skin with faint luminous petroglyph scars glowing along its flank, long pectoral fins, arcing around a tall white coastal lighthouse on a grassy headland and heading out toward a blazing sunrise on the open sea horizon, golden light path across the water, low clouds, silhouette rim light on the whale, aerial cinematic photography, photorealistic, hopeful epic mood, photorealistic, cinematic, vertical 9:16 composition
```

### 컷 9 — 빛으로 환원
```
a colossal humpback whale dissolving into thousands of drifting amber light particles high above a wide Korean landscape of mountains, river and coastline at dawn, the particles drifting and beginning to gather into a luminous shape in the sky, deep blue pre-dawn atmosphere, warm particle glow, aerial cinematic photography, photorealistic, serene and grand, photorealistic, cinematic, vertical 9:16 composition
```

> 컷 9의 `울주` 글자는 AI로 만들지 말 것. 한글은 이미지 생성 모델이 거의 확실히 뭉갠다. **입자만 생성하고 글자는 편집 단계에서 타이포로 얹는다.**

---

## 4-3. 파이프라인 재설계 — 이미지가 무제한이면 전략이 바뀐다

**Nano Banana로 이미지를 무제한 생성할 수 있다.** 이게 세 가지를 바꾼다.

| | 이전 계획 | 지금 |
|---|---|---|
| 이미지 | 힉스필드에서 크레딧 소모 | **무료·무제한. 마음에 들 때까지 반복** |
| 470 크레딧 | 이미지 + 영상에 분산 | **전부 Kling 3.0 영상에만** |
| 일관성 확보 | 프롬프트 고정 블록에 의존 | **마스터 이미지에서 파생** ← 가장 큰 변화 |

### 일관성 문제가 사실상 풀린다

이 작업의 최대 난관은 9컷을 같은 고래로 유지하는 것이었다. Nano Banana는 **레퍼런스 이미지를 주고 자연어로 편집을 지시하는 방식**이 강점이라, 여기에 정확히 맞는다.

**마스터 2장만 확정하면 나머지는 전부 파생시킨다.**

```
마스터 A (석재 고래)  ─┬→ 컷 2  바위에서 나오는 순간
                      ├→ 컷 3  대곡천 (꼬리부터 살로 전이 시작)
                      └→ 컷 4  억새평원 (전이 중)
                              ↓ 전이 완료
마스터 B (생명체 고래) ─┬→ 컷 5  운해 돌파
                      ├→ 컷 6  옹기마을
                      ├→ 컷 7  석남사
                      └→ 컷 8  간절곶

컷 1 (암각화)  — 독립. 고래가 평면 각석이라 마스터와 무관
컷 9 (빛 입자) — 독립. 형체가 해체되므로 일관성 불필요
```

### 작업 순서

**1단계 — 마스터 A 확정 (무제한, 시간만 쓴다)**
석재 고래 전신이 또렷하게 보이는 이미지 한 장. 이게 이후 6컷의 기준이 되므로 **여기서만큼은 완벽주의를 해도 된다.** 몸 비율, 가슴지느러미 길이, 턱 라인, 암각화 문양 위치가 마음에 들 때까지 반복한다.

**2단계 — 마스터 A에서 컷 3·4 파생**
마스터 A를 레퍼런스로 넣고 배경만 바꾸라고 지시한다.
> "Keep this exact same stone whale — identical body proportions, identical pectoral fin shape, identical petroglyph groove pattern. Place it gliding above [배경 묘사]."

전이 단계는 여기에 한 줄 더 붙인다.
> "The stone surface is beginning to turn into dark wet living whale skin, starting from the tail and spreading forward about one third of the body."

**3단계 — 마스터 B 만들기**
마스터 A를 레퍼런스로 "같은 고래인데 완전히 살아있는 피부로" 지시한다. 암각화 홈은 **빛나는 흉터로 남긴다.**
> "Keep this exact same whale — identical proportions and fin shape. Change the granite surface to dark slate-blue living whale skin. The petroglyph grooves remain as faint glowing amber scars along the same positions on its flank."

**4단계 — 마스터 B에서 컷 5·6·7·8 파생** (2단계와 같은 방식)

**5단계 — 9장 확정 후 Kling 3.0에 투입.** 470 크레딧을 여기에 전부 쓴다.

### 크레딧 배분 (영상만, 470)

| 순서 | 대상 | 배분 | 이유 |
|---|---|---:|---|
| 1 | **컷 2** (폭발·풀백) | ~15% | 실패율 최상. 안 되면 연출을 바꿔야 하므로 가장 먼저 |
| 2 | **컷 9** (입자 해체) | ~15% | 두 번째로 위험 |
| 3 | 컷 1·3·4·8 | ~35% | 여기까지면 **6컷 30초 완성본** |
| 4 | 컷 5·6·7 | ~20% | 45초 확장분 |
| 예비 | 재생성 | ~15% | 반드시 남길 것 |

> 생성 1회당 크레딧은 모델·길이·해상도에 따라 다르다. **첫 생성 후 실제 차감량을 보고 다시 계산할 것.**

### Nano Banana도 라이선스를 확인해야 한다

공고 요건은 툴을 가리지 않는다 — "AI 플랫폼의 상업적 이용 라이선스 규정을 준수".

- [ ] **어디서 쓰고 있는지** (구독 플랜 / API / 제3자 서비스)에 따라 이용 조건이 다르다. 해당 서비스 약관에서 상업적 이용 가부를 확인할 것
- [ ] **가시 워터마크가 붙는지** 눈으로 확인. 무료 티어에 워터마크가 들어가는 경우가 있다
- [ ] **서식 1의 "사용 AI 프로그램"란에 Nano Banana와 Kling 3.0을 모두 기재**

## 5. Kling 3.0 모션 프롬프트 (컷별)

각 컷의 확정 이미지를 Kling 3.0 이미지-투-비디오에 넣고 아래를 붙인다. 모든 컷 공통 네거티브:

```
negative: morphing, warping, distorted anatomy, extra fins, flickering, text, watermark, people's faces, jitter, sudden cuts
```

| # | 모션 프롬프트 |
|---|---|
| 1 | `The carved whale in the rock surface shifts almost imperceptibly, the glowing grooves pulsing once like a slow heartbeat. Camera pushes in very slowly. Dust motes drift in the air.` |
| 2 | `The stone whale bursts forward out of the cliff face toward the camera, rock fragments and dust exploding outward and falling. Camera pulls back rapidly to reveal the full scale of the cliff.` |
| 3 | `The whale glides forward smoothly above the river from right to left, its body slowly rippling. Camera tracks alongside it. The tiny people on the deck below turn their heads to follow it.` |
| 4 | `The whale skims forward just above the pampas grass, the grass bending and turning gold in a spreading wave beneath it. Camera follows from behind and slightly above. Grass sways in wind.` |
| 5 | `The whale rises vertically through the cloud layer, clouds parting and swirling around its fins. Camera tilts up following the ascent. Sunlight grows brighter as it breaks through.` |
| 6 | `The whale glides slowly over the pottery village. The jars light up in sequence beneath it, warm sparks rising upward. Camera moves forward slowly at low altitude.` |
| 7 | `The whale glides over the maple tunnel. Fallen leaves lift and spiral upward in its wake. Camera follows from behind, descending slightly toward the road.` |
| 8 | `The whale banks gracefully around the lighthouse and heads toward the sunrise on the horizon, growing smaller. Camera holds steady and slowly pushes in. Waves move below.` |
| 9 | `The whale dissolves into countless drifting amber particles that float upward and slowly begin to converge. Camera holds steady, very slow push in. Particles drift gently.` |

**작업 순서 팁**: 컷 2, 6, 9가 가장 실패율이 높다(폭발·연쇄 발광·입자 해체). 이 셋을 먼저 돌려서 되는지 확인한 뒤 나머지를 생성할 것. 안 되면 컷 2는 "이미 튀어나온 상태"의 이미지로 시작해 카메라 풀백만 주는 식으로 난이도를 낮춘다.

---

## 6. 편집 스펙

| 항목 | 값 |
|---|---|
| 출력 | **1080×1920** · MP4(H.264) · 24fps (소스가 24fps) |
| 소스 | 2176×3808 → 가로 34px 크롭 후 1080×1920으로 스케일 |
| 길이 | 45초 (15~60초 범위 내) |
| 컷 전환 | 하드컷 금지. 컷마다 고래의 진행 방향을 맞추고 0.3초 디졸브 또는 화이트 플래시 |
| 자막 위치 | **화면 상단 15%·하단 25%를 비울 것** — 인스타 UI와 군청 재업로드 시 잘림 방지. 본심 "공공 활용성 10점"이 여기서 갈린다 |
| 자막 서체 | 굵은 고딕 계열, 흰색 + 약한 그림자. 밈체·유행어 금지(군청 톤과 안 맞으면 감점) |
| 워터마크 | **넣지 말 것.** 개인 계정 로고가 박히면 군청이 못 쓴다 |
| 음원 | 상업적 이용 가능한 무료 음원만. 인스타 제공 인기 음원은 **원본 파일 제출 시 라이선스 문제가 된다** |
| 사운드 디자인 | 0~3초 무음 → 컷 2에서 저음 임팩트 한 번 → 이후 현악 크레셴도. 고래 울음소리는 저작권 프리 소스만 |

---

## 7. 훅과 CTA — 좋아요 1개 = 조회수 10회

### 0~3초 훅 (여기서 다 결정된다)
컷 1을 **무음 + 자막 없이** 1.5초 버틴 뒤, 컷 2 임팩트와 동시에 자막을 때린다. 첫 화면에 텍스트를 도배하지 않는 게 이 영상의 승부수다 — 바위가 꿈틀거리는 그림 자체가 훅이다.

자막 후보 (컷 2 시점):
- A) `7천 년 만에` → 컷 3 `반구천의 고래가` → 컷 4 `깨어났다` **(권장 — 세 컷에 걸쳐 완성되는 한 문장이라 끝까지 보게 된다)**
- B) `이 고래는 상상이 아니었다`
- C) `작년 세계유산이 된 그림이 움직이기 시작했다`

### 마지막 5초 CTA — 좋아요를 1순위로
```
(컷 9, 울주 타이포 등장 후)

자막 1:  울주 · 반구천의 암각화
자막 2:  세계유산 등재 1주년
자막 3:  고래가 계속 헤엄치길 바라면 ❤️
```

**저장·팔로우보다 좋아요를 먼저, 명시적으로 요청한다.** 지표가 `조회수 + (좋아요×10)`이기 때문이다. 댓글 유도는 캡션에서 따로 한다.

### 캡션 (릴스 본문)
```
7천 년 전 반구천 바위에 새겨진 고래.
작년 유네스코 세계유산이 됐고,
며칠 전엔 그 고래를 실제로 잡았다는 증거까지 국가유산이 됐습니다.

상상이 아니었던 겁니다.

그래서 한 번 꺼내봤습니다. AI로.

📍 반구천 암각화 · 간월재 · 옹기마을 · 석남사 · 간절곶 (전부 울산 울주)
어디부터 가보고 싶으세요? 댓글로 알려주세요

#울주에숏며들다AI편 #울주AI #울주군
#반구천의암각화 #세계유산 #울주여행 #영남알프스 #간절곶 #AI영상 #생성형AI
```

> 필수 해시태그 3종(`#울주에숏며들다AI편` `#울주AI` `#울주군`)은 **반드시 전부** 들어가야 한다. 누락 시 접수 자체가 무효다.

---

## 8. 업로드 채널 전략 — 실측 데이터 기준

### 계정 현황 (@lucax8560 「루칵스 — 있을 수 없는 대한민국」)
컨셉: "AI로 만든 상상 속 풍경. 실제 상황 아님. 매일 저녁 8시, 한 장소씩"
X · 틱톡 · 유튜브 쇼츠 · 인스타 릴스 4채널 동시 운영, 팔로워 사실상 없음(틱톡 8).

> **공고가 인정하는 채널은 유튜브 쇼츠와 인스타그램 릴스뿐이다. 틱톡과 X는 접수 대상이 아니다.**

### 같은 영상, 채널별 실측 조회수

| 소재 | 틱톡 | 유튜브 쇼츠 | 인스타 |
|---|---:|---:|---:|
| 해운대 파도 | 1,153 | **1,300** | **9,000** |
| 한강 빙하 | 597 | **1,400** | 253 |
| 광안대교 달 | 323 | 709 | 155 (여수편) |
| 첨성대 빛기둥 | 330 | 273 | — |
| 제주 부유섬 | 876 | 208 | — |
| 광화문 정글 | 399 | 261 | 356 |
| 태화강 대숲 | 969 | 26 | 1,000 |
| 조선소 크레인 | **3,461** | 15 | — |
| 해안 용머리 | 977 | 9 | — |
| 반구대 고래 | 1,177 | 6 | — |

### 유튜브 서브계정은 현재 도달이 죽어 있다

@lucax8560 유튜브 채널: **구독자 2명.** 업로드 순서대로 조회수를 보면 회복이 아니라 붕괴다.

| 시기 | 조회수 |
|---|---|
| 초기 | **1,400 · 1,300 · 709 · 273 · 261 · 208** |
| 중간 | 26 · 18 · 15 |
| 최근 | **9 · 6 · 5 · 2 · 1 · 0** |
| 예약분 | 3 · 1 · 1 |

초기에 1.4천까지 갔던 채널이 지금은 한 자릿수다. 예약 업로드까지 1회에 머문다. **알고리즘이 이 채널에 트래픽을 주지 않고 있다.**

원인은 단정하기 어렵다. 구독자 2명이라 기반 신호가 없고, 초기 시청 지속률이 낮아 확산이 끊겼을 가능성, 같은 포맷을 매일 반복해 신호가 희석됐을 가능성이 있다. **다만 원인이 뭐든, 2주 예열로 1.4천 수준까지 돌아온다는 보장은 없다.**

### 그래서 인스타 릴스가 현실적으로 유일한 접수 채널이다

접수 가능한 두 채널의 현재 상태를 보면 선택의 여지가 없다.

| 채널 | 접수 가능 | 최근 실적 | 판단 |
|---|---|---|---|
| **인스타 릴스 @lucax8560** | ✅ | 155 ~ 9,000 (최근 150~250) | **주 채널** |
| 유튜브 쇼츠 @lucax8560 | ✅ | 최근 1~26 | 병행하되 기대 안 함 |
| 틱톡 | ❌ | 969 ~ 3,461 (가장 안정적) | 접수 불가 |

아이러니하게도 **가장 잘 나오는 틱톡이 접수 대상이 아니고, 가장 안 나오는 유튜브가 접수 대상이다.**

**그래도 유튜브에 같이 올린다.** 업로드 비용이 사실상 0이고, 만에 하나 이 영상이 채널을 깨울 수도 있다. 다만 접수 링크는 **인스타를 기본으로 놓고**, 11월 초에 유튜브가 예상 밖으로 터졌을 때만 갈아탄다. 접수는 11/13까지니 판단할 시간이 있다(집계는 11/20 이후라 제출을 늦춰도 지표 손해가 없다).

### 본계정 vs 서브계정 — 서브계정이 맞다

| | 본계정 @metaluca2750 | 서브계정 @lucax8560 |
|---|---|---|
| 정체성 | 비개발자 AI 앱 · 전자책 · 냥이봇 (주제 혼재) | 있을 수 없는 대한민국 (단일 주제) |
| 팔로워 | **2,109** | 사실상 0 |
| 팔로잉 | 1,742 | 0 |
| 게시물 | 421 | 10여 개 |
| 최근 30일 계정 총 조회 | **1,600회** | — |
| 게시물당 조회수 | 74 ~ 784 (대체로 100~400) | 155 ~ **9,000** |

**팔로워 2,109명 계정의 30일 총 조회수(1,600)보다, 팔로워 없는 서브계정의 릴스 한 편(9,000)이 더 많다.**

인스타 릴스 도달은 팔로워 수가 아니라 **콘텐츠와 오디언스의 매칭**이 결정한다. 본계정이 안 터지는 이유는 팔로워가 부족해서가 아니라 주제가 섞여 있어서다. AI 앱 개발, 전자책, 냥이봇, 웹소설, 갤러리, 애드센스가 한 계정에 있으면 알고리즘이 이 게시물을 누구에게 보여줘야 할지 판단하지 못한다. 반대로 서브계정은 "한국 랜드마크 AI 판타지" 하나로 통일돼 있어서 타겟이 명확하다. 그래서 9천이 났다.

팔로잉 1,742도 신호다. 맞팔 기반 팔로워는 릴스 초기 노출에서 반응하지 않고, 반응이 없으면 알고리즘이 확산을 멈춘다. **팔로워가 오히려 발목을 잡는 구조다.**

공모전은 평균 조회수 싸움이 아니라 **한 편의 최대치 싸움**이다. 피크가 날 가능성은 서브계정이 압도적으로 높다.

### 그래서 두 계정을 이렇게 나눠 쓴다

| 계정 | 역할 |
|---|---|
| **서브 @lucax8560** | **게시 채널.** 여기에 본편을 올리고, 이 링크로 접수한다 |
| **본계정 @metaluca2750** | **확산 채널.** 서브계정 릴스를 스토리·피드에 공유해 초기 유입을 만든다 |

2,109 팔로워는 버리는 게 아니라 **트래픽을 보내는 데 쓴다.** 본계정에 원본을 올리면 "비개발자 AI 앱" 브랜드와도 안 맞고 알고리즘 타겟도 흐려진다. 공유는 정상적인 확산이라 공고의 조작 금지 조항과도 무관하다.

> 다만 이건 실측 기반 판단이지 확정은 아니다. 10/1에 서브계정으로 올린 뒤 24시간 안에 도달이 죽어 있으면, 본계정 게시를 2차 카드로 쓸 수 있다. 접수는 11월 초에 하면 되므로 판단할 시간이 있다.

### 진짜 병목은 채널이 아니라 좋아요율이다

정량지표는 `조회수 + (좋아요 × 10)`인데, 현재 계정의 좋아요율은 이렇다.

| 게시물 | 조회수 | 좋아요 | 좋아요율 | 정량지표 |
|---|---:|---:|---:|---:|
| 해운대 파도 (인스타) | 9,000 | 17 | **0.19%** | 9,170 |
| 태화강 대숲 (인스타) | 1,000 | 6 | **0.6%** | 1,060 |

**좋아요가 지표에 거의 기여하지 않고 있다.** 10배 가중치를 통째로 버리는 중이다. 같은 9천 조회에서 좋아요율만 3%로 올리면:

> 9,000 + (270 × 10) = **11,700** — 조회수를 30% 늘린 것과 같은 효과

조회수 9천을 1만2천으로 만드는 것보다, 좋아요 17개를 270개로 만드는 게 훨씬 통제 가능한 일이다. **이번 영상에서 손대야 할 1순위가 여기다.**

### 좋아요율이 낮은 이유 — 세 가지 다 고칠 수 있다

**1. 좋아요를 요청한 적이 없다**
캡션이 전부 질문형이다("한강이 이렇게 얼면 어떻게 될까요?", "마린시티는 버틸까요?"). 댓글을 유도하는 문장이지 좋아요를 유도하는 문장이 아니다. 실제로 댓글도 안 붙었다.
→ 이번엔 **영상 마지막 화면에 좋아요를 명시적으로 요청**한다. 7절 CTA가 그래서 `고래가 계속 헤엄치길 바라면 ❤️`다.

**2. 5초는 좋아요를 누를 시간이 없다**
놀라고, 끝난다. 감정이 쌓일 구간이 없다. 손가락이 하트로 가기 전에 다음 영상으로 넘어간다.
→ 45초 구성 자체가 좋아요율 대책이다. 고래가 변해가는 걸 지켜본 사람은 끝에서 뭔가 누르고 싶어진다.

**3. 감정의 방향이 좋아요와 안 맞는다**
현재 콘텐츠는 재난·기이함 계열이다. 파도가 도시를 덮치고, 한강이 얼어붙고, 사람이 사라진 광화문. **놀라움은 조회수를 만들지만 좋아요를 만들지는 않는다.** 좋아요는 애정·자부심·감동에서 나온다.
→ 울주 고래는 방향이 다르다. "우리 동네가 이렇게 근사하다"는 자부심 쪽이다. **지역 자부심 콘텐츠는 좋아요 전환율이 높다.** 이번 건이 기존 콘텐츠보다 좋아요율이 잘 나올 구조적 이유가 여기 있다.

### 계정 정체성과도 맞는다

"있을 수 없는 대한민국"이라는 계정 컨셉에 **7천 년 전 암각화에서 고래가 걸어나오는 울주**는 정확히 들어맞는다. 알고리즘이 학습한 주제에서 벗어나지 않으면서, 감정 방향만 재난에서 자부심으로 튼다. 계정 일관성을 깨지 않고 좋아요율을 올리는 자리다.

또 바이오의 "AI로 만든 상상 속 풍경. 실제 상황 아님." 고지는 그대로 유지할 것. AI 부문 출품작에서도 이 태도가 심사에 불리할 일이 없다.

### 확산 실무 (조작 금지선 안에서)
- **9월 남은 기간: 인스타를 우선으로 관리한다.** 유튜브 예열도 해보되, 위 수치를 보면 회복을 전제로 계획을 짜면 안 된다.
- **9월 말 2~3일: 티저.** 컷 1 또는 컷 2만 5초로 잘라 평소처럼 올린다. 계정 페이스를 깨지 않으면서 소재를 예고한다.
- **10/1: 인스타 릴스(주) + 유튜브 쇼츠(병행) 동시 업로드.** 양쪽 다 필수 해시태그 3종.
- 업로드 직후 3시간이 도달의 분수령이다. 댓글에 직접 답을 단다.
- 울산·울주 지역 커뮤니티와 여행 커뮤니티에 공유한다. 세계유산 등재 1주년이라는 명분이 있는 소재다.
- **틱톡·X에도 올린다.** 지표에는 안 들어가지만 계정 루틴을 깨지 않는 편이 낫고, 틱톡은 이 계정에서 가장 안정적인 채널이다.
- 매크로·계정 구매·유료 프로모션·품앗이 이벤트는 절대 금지. 적발 시 수상 취소 및 시상금 전액 환수다.
- **12/10 결과발표일까지 양쪽 게시물 전체공개 유지.**

### 불편한 관찰 — 히트작은 전부 "전국구 유명 장소"였다

인스타 게시 순서대로 조회수를 보면 패턴이 하나 나온다.

| 날짜 | 소재 | 인스타 조회 |
|---|---|---:|
| 9/6 | 한강 빙하 | 253 |
| 9/7 | 광화문 정글 | 356 |
| 9/8 | **해운대 파도** | **9,000** |
| 9/11 | 여수 밤바다 달 | 155 |
| 9/12 | 태화강 대숲 | 1,000 |
| 9/13 | 울산 골리앗 크레인 | 217 |
| 9/14 | 대왕암 용머리 | 161 |
| 9/15 | **반구대 고래** | **175** |
| 최근 | 독도 | 32 |

두 가지를 인정하고 가야 한다.

**1. 반구대 고래는 인스타에서 175회였다.** 틱톡에서는 1,177이었지만 접수 가능한 채널에서는 안 터졌다. 내가 이 소재를 미는 이유는 심사 적합성(세계유산 1주년·공공 활용성) 때문이지, 조회수 실적 때문이 아니다. 그 구분은 명확히 해두자.

**2. 터진 건 해운대·한강·광화문 — 전국 누구나 아는 장소다.** 반구대·대왕암·독도·여수는 낮았다. **장소 인지도가 조회수를 가른다.** 울주 소재는 이 점에서 구조적으로 불리하다.

### 그래서 훅을 이렇게 바꾼다

장소 이름을 앞세우면 "내가 모르는 동네 얘기"가 되어 스크롤된다. **현상을 먼저, 장소는 나중에.**

| | 훅 |
|---|---|
| ❌ | `울주 반구천 암각화가 깨어났다` — 모르는 지명이 첫 화면 |
| ✅ | `7천 년 전에 그린 그림이 움직이기 시작했다` — 지명 없이 보편적 호기심 |

7절의 자막 순서(`7천 년 만에` → `반구천의 고래가` → `깨어났다`)가 이 원칙에 맞다. **지명은 세 번째 컷에 가서야 나온다.** 그때는 이미 붙잡은 뒤다.

### 냉정한 전제

팔로워가 없으면 **정량지표 상위 8편 진입은 운이 섞인다.** 해운대 9천이 최고 기록인데, 지역 공모전에 팔로워 수만 명짜리 계정이 들어오면 지표로는 못 이긴다. 두 루트를 나눠 생각해야 한다.

| 루트 | 결정 요인 | 통제력 |
|---|---|---|
| 정량지표 상위 8편 | 조회수 + 좋아요×10 | 낮음 — 조기 업로드와 좋아요율로 기댓값만 올림 |
| 내부 심사 우수작 7편 | 작품 완성도와 군정 활용성 | **높음** |

→ **작품 퀄리티에 힘을 몰아라.** 6절의 자막 안전영역·무워터마크·군청 톤 규칙이 그래서 중요하다. 내부 심사는 "이거 우리가 바로 쓸 수 있나"를 본다. 5초 스펙터클이 아니라 45초 완결 서사를 내미는 것 자체가 이 루트에서 강점이다.

## 9. 제출 체크리스트 (AI 부문)

- [ ] **1080×1920** MP4 또는 MOV, **15~60초** (현재 파이프라인 404×720 → 마스터 확인 필수)
- [ ] 2025. 1. 1. 이후 제작한 신규 창작물 (기존 게시물 재활용 아님)
- [ ] 인스타 릴스 @lucax8560 **전체공개** 업로드 (10/1) — 기본 접수 링크
- [ ] 유튜브 쇼츠도 같이 업로드 (병행, 기대치 낮음)
- [ ] 필수 해시태그 3종 전부: `#울주에숏며들다AI편` `#울주AI` `#울주군`
- [ ] 워터마크·개인 로고 없음, 자막 안전영역 확보
- [ ] **서식 1** 참가신청서 — 부문 `AI편` 체크 + **사용 AI 프로그램란에 `Nano Banana` · `Higgsfield (Kling 3.0)` 모두 명시**
- [ ] **서식 2** 개인정보 동의서 + 저작물 이용 동의서 (2장 모두 서명)
- [ ] **Nano Banana와 힉스필드 양쪽의 상업적 이용 라이선스 확인** (공고 명시 요건) — 4-3절
- [ ] **최종 출력물에 워터마크 없는지 눈으로 확인**
- [ ] 생성 원본·프롬프트 기록 보관 (심사 중 제작 증빙 추가 요구 가능)
- [ ] 음원 라이선스 확인
- [ ] 이메일 제목: `2026 울주숏폼공모전_AI편_[이름]`
- [ ] 본문에 릴스 URL 기입 + 원본 파일 첨부 → ulju_contest@naver.com
- [ ] 접수 확인 회신 받기
- [ ] 12/10까지 전체공개 유지

## 10. 지금 막힌 것

- **양 채널 동시 업로드 후 한쪽 링크만 제출해도 되는지** (공고에 링크가 단수 표기)
- **1인 출품 편수 제한 / 두 부문 중복 출품 가능 여부**가 공고에 없다. AI 부문에 2편을 넣을 수 있다면 기대값이 크게 달라진다 (AI 부문 수상 8명 / 예비심사 통과 15편 내외). ulju_contest@naver.com에 확인할 것.
- Kling 마스터 파일의 실제 해상도 확인.
