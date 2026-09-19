# 1단계 테스트 — 컷 2 · 컷 6 (일관성 + 난이도)

> 툴: Higgsfield 이미지 생성 → Kling 3.0 이미지-투-비디오
> 목적: ① 두 컷의 고래가 같은 개체로 보이는가 ② 컷 2의 폭발 연출이 되는가
> 화면비는 UI에서 **9:16 / 1080×1920**으로 먼저 설정할 것

---

## STEP 1 — 컷 2 이미지

```
Aerial cinematic photograph, photorealistic. A colossal humpback whale, 40 meters long, its entire body surfaced in weathered grey granite carved with prehistoric petroglyph line-art of whales and hunting boats, deep chiselled grooves glowing with warm amber light from within, wet stone sheen, barnacle-like rock texture along the jaw, long pectoral fins. The stone whale is bursting head-first out of a towering riverside cliff face, shattered rock fragments and dust cascading down its flanks. A narrow green river winds below between limestone cliffs, dense Korean forest on both banks, soft overcast morning light. Immense sense of scale, shot on full-frame drone camera, sharp detail, muted earth tones, vertical composition.
```

## STEP 2 — 컷 6 이미지

**굵게 표시한 부분만 컷 2와 다르다. 나머지 묘사는 토씨 하나 바꾸지 말 것.**

```
Aerial cinematic photograph, photorealistic. A colossal humpback whale, 40 meters long, dark slate-blue living whale skin with faint luminous petroglyph scars still glowing amber along its flank, wet skin sheen, barnacle texture along the jaw, long pectoral fins. The whale is gliding through the air above a traditional Korean pottery village at dusk, hundreds of large dark earthenware onggi jars arranged in rows across terraced yards, each jar lighting up one by one with warm amber glow beneath the whale, tiny golden lights rising from the jar mouths into the air, tiled roofs, deep blue hour sky. Immense sense of scale, shot on full-frame drone camera, sharp detail, vertical composition.
```

## STEP 3 — 판정

두 이미지를 나란히 놓고 본다. 체크할 것은 **네 가지뿐**이다.

| 항목 | 기준 |
|---|---|
| 몸 비율 | 머리:몸통:꼬리 비율이 비슷한가 |
| 가슴지느러미 | 길이와 각도가 비슷한가 |
| 턱 라인 | 주름·따개비 질감 위치가 비슷한가 |
| 암각화 문양 | 컷 2의 파인 홈 패턴이 컷 6에서 흉터로 남아 있는가 |

**4개 중 3개 이상 일치 → 통과.** 전이 구조 그대로 간다.
**2개 이하 → 재시도 1회.** 고정 묘사에 몸 비율 수치를 추가한다 (예: `head occupying one third of the body length, pectoral fins one quarter of body length`).
**두 번째도 실패 → 기획을 굽힌다.** 전이를 포기하고 처음부터 끝까지 석재 고래로 통일한다. 변화 대신 여정이 축이 되고, 영상은 그대로 성립한다. **여기서 크레딧을 더 태우지 말 것.**

## STEP 4 — 컷 2 모션 (Kling 3.0)

컷 2 이미지를 넣고:

```
The stone whale bursts forward out of the cliff face toward the camera, rock fragments and dust exploding outward and falling away. The camera pulls back rapidly to reveal the full scale of the cliff and the river below.
```
```
negative: morphing, warping, distorted anatomy, extra fins, flickering, text, watermark, jitter, sudden cuts
```

**실패하면 (고래가 뭉개지거나 바위가 녹아내리듯 변형되면)** — 폭발을 포기하고 난이도를 낮춘다. 이미 바위 밖으로 나온 상태의 이미지로 시작해서 카메라 풀백만 준다.

```
The whale hangs in mid-air in front of the shattered cliff face. Dust and small rock fragments drift down slowly. The camera pulls back steadily to reveal the full cliff and the river below.
```

## STEP 5 — 컷 6 모션 (Kling 3.0)

```
The whale glides slowly forward over the pottery village. The jars light up in sequence beneath it, warm sparks rising upward. The camera moves forward slowly at low altitude, following the whale.
```
```
negative: morphing, warping, distorted anatomy, extra fins, flickering, text, watermark, jitter, sudden cuts
```

---

## 이 단계에서 같이 확인할 것

- [ ] **다운로드 해상도가 1080×1920인가** — 기존 파일이 404×720이었다. 최고 해상도로 받고 있는지 설정 확인
- [ ] **워터마크가 없는가** — 유료 플랜 생성물인지 눈으로 확인
- [ ] **생성 1회당 크레딧이 몇인가** — 실제 차감량을 보고 470 배분을 다시 계산
- [ ] 생성에 쓴 프롬프트를 전부 따로 저장 — 심사 중 제작 증빙을 요구할 수 있다(공고 명시)
