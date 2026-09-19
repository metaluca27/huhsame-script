# 컷 1 — 반구천 암각화 (0~3초 훅)

> 툴: Higgsfield 이미지 생성 → Kling 3.0 이미지-투-비디오
> 화면비: **9:16 / 1080×1920** (UI에서 먼저 설정)
> 이 컷은 **자막 없음 · 무음 1.5초**. 그림 하나로 버텨야 한다.

## 이 컷이 해야 할 일

첫 1.5초 안에 "어? 저게 움직였나?"가 들어와야 한다. 설명 자막도, 음악도 없이.
**바위에 새겨진 고래가 고래로 읽혀야 하고, 홈에서 새어나오는 빛이 보여야 한다.** 이 둘만 되면 성공이다.

---

## A안 — 극단적 클로즈업 (권장)

고래 각석 하나가 화면을 가득 채운다. 무엇인지 몰라도 이상함이 먼저 온다.

```
Extreme close-up of an ancient vertical rock face, weathered grey granite. Carved into the stone is a large prehistoric petroglyph of a whale, rendered in simple pecked outline with a rounded head and a broad tail, the carved grooves cutting deep into the rock. Warm amber light glows faintly from inside the chiselled grooves, as if something is lit behind the stone. Fine morning mist drifts across the surface, dew beading on the rock, lichen and mineral staining in the crevices. Shallow depth of field, the carving sharp in the centre and the rock falling soft at the edges. Photorealistic, cinematic, cold blue dawn light against the warm glow, muted earth tones, vertical composition.
```

## B안 — 미디엄 (여러 각석 중 하나만 빛남)

맥락이 보인다. "선사시대 암각화"라는 정보가 전달된다.

```
Close-up of an ancient riverside cliff face in Korea, weathered grey granite covered with dozens of prehistoric petroglyphs pecked into the stone — whales, deer, boats and tiny human hunter figures, all in simple outline. One large whale carving near the centre glows with warm amber light seeping from its chiselled grooves while every other carving stays dark stone. Morning mist drifting, wet rock sheen, lichen in the crevices. Photorealistic, cinematic, cold dawn light, muted earth tones, vertical composition.
```

## C안 — 광각 (절벽 전체)

스케일이 보인다. 다만 고래가 작아져서 훅으로는 약하다.

```
An ancient riverside cliff face in Korea at dawn, a tall wall of weathered grey granite rising above a narrow green river, the rock surface covered with prehistoric petroglyph carvings of whales, deer and boats. Scattered points of warm amber light glow from within the carved grooves across the cliff face. Thick morning mist drifting low over the water, dense autumn forest on the far bank, cold blue pre-dawn atmosphere. Photorealistic, aerial cinematic photograph, immense scale, vertical composition.
```

---

## 어느 걸 고를까

**A안으로 가고, 안 나오면 B안.** 숏폼 첫 화면에서 광각은 불리하다. 작은 화면에서 뭐가 뭔지 안 보이면 그냥 넘긴다. **A안은 뭔지 몰라도 질감과 빛 때문에 손가락이 멈춘다.**

C안은 훅으로 쓰지 말고, 나중에 **컷 2의 풀백 도착 지점**으로 쓰면 좋다.

## 자주 실패하는 지점

| 증상 | 손볼 곳 |
|---|---|
| 동굴벽화처럼 그려진 그림이 나옴 | `pecked outline`, `carved grooves cutting deep into the rock`를 강조. `painted`, `pigment` 같은 단어가 들어가지 않게 |
| 고래가 물고기나 돌고래로 보임 | `rounded head and a broad tail`를 `a blunt rounded head, a thick body and a wide horizontal tail fluke` 로 늘린다 |
| 빛이 너무 세서 판타지처럼 됨 | `glows faintly`, `seeping`으로 약하게. `neon`, `bright`는 금지 |
| 바위가 매끈한 콘크리트처럼 나옴 | `lichen`, `mineral staining`, `dew beading`를 유지하고 `rough granular granite texture` 추가 |

---

## Kling 3.0 모션

확정된 이미지를 넣고:

```
The carved whale in the rock surface shifts almost imperceptibly, as if taking a single slow breath. The amber light inside the grooves pulses once, slowly brightening and dimming. Thin mist drifts across the stone. The camera pushes in very slowly and steadily.
```

```
negative: morphing, warping, melting stone, the rock surface deforming, distorted anatomy, flickering, fast motion, text, watermark, jitter, sudden cuts, camera shake
```

**이 컷의 모션은 "거의 안 움직이는 것"이 정답이다.** 크게 움직이면 바위가 녹아내리듯 변형된다. 빛 맥동 한 번 + 느린 푸시인이면 충분하고, 오히려 그게 더 섬뜩하다.

**그래도 바위가 흐물거리면** 고래 움직임을 빼고 빛만 남긴다:

```
The amber light inside the carved grooves pulses once, slowly brightening and dimming. Thin mist drifts across the stone surface. The camera pushes in very slowly. The rock itself remains completely still.
```

---

## 뽑고 나서 확인할 것

- [ ] 1080×1920으로 다운로드되는가 (기존 파일이 404×720이었다)
- [ ] 워터마크 없는가
- [ ] 생성 1회당 크레딧 몇 개 빠지는가 → 470 배분 재계산
- [ ] 프롬프트 저장 (심사 중 제작 증빙 요구 가능)

## 다음 단계

컷 1이 나오면 **바로 컷 2 + 컷 6**을 돌린다. 그 둘이 일관성 테스트다.
→ `docs/ulju-ai-step1-test.md`
