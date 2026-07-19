# 리버스 스와이프 게임 — SDD 진행 원장

Plan: docs/superpowers/plans/2026-07-04-reverse-swipe-game.md
Note: 비 git 프로젝트 — 커밋 없음, 파일 저장 기준. 리뷰 diff는 git diff --no-index로 생성.

## 진행 상황

Task 1: complete (img/pureum.png 400x400 149KB, img/ruric.png 400x400 145KB, review clean)
Task 2: complete (landing/game/index.html 신규, launch.json game 서버 추가, review clean)
Task 3: complete (게임플레이 로직, 리뷰 Important 1건 — startGame rAF 중복 루프 — cancelAnimationFrame 한 줄 픽스로 해소·검증됨. 계획서 코드 대비 의도적 편차 1줄: startGame 첫 줄 cancelAnimationFrame(state.rafId))
Task 4: complete (피버 모드 CSS+JS 6곳, review clean)
Task 5: complete (루릭 대사·푸름이 결과 카드·localStorage 최고점수, review clean)
Task 6: complete (모바일 375px·통합 플레이·콘솔/네트워크·다크모드 검증, 코드 변경 없음. 프리뷰 도구 한계로 스크린샷 대신 bounding-rect 검증)
Minor findings 누적: 없음 (Task 3 Important는 픽스 완료)
최종 리뷰(Opus): 스펙 전 항목 구현 확인. Important 1건(localStorage 무방어 → 사파리 프라이빗 모드 프리즈 위험) → loadBest/endGame try/catch 픽스 적용, 정상+예외 경로 검증 통과. Minor 3건(피버 클래스 1프레임 지연, 규칙 카드 이모지 톤, 동일 화살표 연속 가능)은 비차단 — 미반영.
상태: 딜리버리 완료. 배포는 firebase deploy --only hosting (사용자 실행 대기).
(추가: 배포 완료 + OG 태그/이미지 + 효과음/공유/컨페티 + 이미지 절대경로 픽스까지 반영됨, 2026-07-04)

---

# 다락방 짝꿍 찾기 — SDD 진행 원장 (2026-07-05)

Plan: docs/superpowers/plans/2026-07-04-attic-cards-game.md
Note: 비 git — 커밋 없음. 리뷰 diff는 git diff --no-index. 프리뷰 서버 "game" (port 3457, landing 루트) 재사용 — /cards/ 접근.

## 진행 상황

Cards Task 1: complete (이미지 7장, luka 크롭 최종 (140,330,590,1870), review clean. Minor: jujuya 베이지 배경 — 소스 특성)
(사용자 요청 후속: luka.png 배경 flood-fill 투명 처리(tol 20) + 우상단 소매/우측 베이지 정밀 제거, og.png 재생성 — 컨트롤러가 직접 수행, 육안 확인 완료)
Cards Task 2: complete (landing/cards/index.html 신규 — 브리프와 바이트 일치, review clean)
Cards Task 3: complete (카드 로직. 리뷰 Important 1건 — flip setTimeout이 레벨 전환 생존하는 레이스 — state.flipTimer 추적+startLevel clearTimeout 픽스, 검증 통과. 계획서 대비 의도적 편차 3줄)
Cards Task 4: complete (신기록 저장/표시, verbatim, review clean)
Cards Task 5: complete (팝업·사운드·공유, verbatim, review clean)
(사용자 요청 후속: 루카 새 컷 KakaoTalk_20260705_003409065.png으로 교체 — 그라데이션 flood-fill 배경 제거(194x400), og.png 재생성 — 컨트롤러 직접 수행, 육안 확인 완료)
(사용자 요청 후속 2: 푸름이·루릭 배경 투명 처리 성공. 주주야는 크림 털≈베이지 배경이라 flood-fill 실패(유령화) → 원본 베이지 배경으로 복원. 사용자가 투명 컷 주면 교체 가능. og.png 최종 재생성)
Cards Task 6: complete (모바일 375px fits, 3레벨 통합 {"totalStars":9,"record":true}, 콘솔/네트워크 0건, 타임아웃 경로 확인(수동 tick — rAF 백그라운드 쓰로틀은 환경 제약), 코드 수정 없음)
최종 리뷰(Opus): Ready to deliver. Critical/Important 0건. Minor 3건 — 전부 실동작 무해(방어가 startLevel 클린업으로 커버) 기록만.
상태: 딜리버리 완료. 배포 대기 (사용자 확인 후 firebase deploy --only hosting → /cards). 주주야 투명 컷은 사용자 제공 시 교체 예정.

---

# 심연의 타로 — SDD 진행 원장 (2026-07-05)

Plan: docs/superpowers/plans/2026-07-05-tarot-app.md
Note: 비 git — 커밋 없음. 리뷰 diff는 git diff --no-index 또는 신규 파일 직접 리뷰. 프리뷰 서버 "game" (port 3457, landing 루트) 재사용 — /tarot/ 접근.

## 진행 상황

Tarot Task 1: complete (index.html/styles.css/app.js/images/pureum.png 신규, review clean. Minor 기록: viewport user-scalable=no 임의 추가 — 접근성 재검토 후보, showScreen/pureumSay 조용한 no-op)
Tarot Task 2: complete (78장 실제 RWS 스캔, 4.83MB, 400px q60. 1차 구현이 마이너 56장을 플레이스홀더로 메꿈 → 픽스 에이전트가 Wikimedia 실스캔 교체+전체 리사이즈. 컨트롤러 독립 육안검증 3장(cu05/waqu/ar13) 통과. Minor 기록: 메이저 22장 이중 인코딩(원본 백업 없음), q60 열화 경미)
Tarot Task 3: complete (cards-data.js — 78장·NUMEROLOGY 11키·ZODIAC 12궁·SPREAD 5포지션. 리뷰: 골든던 대응 22장 전수 일치, 표본 15장 RWS 의미 부합, 어투 일관, Critical/Important/Minor 0건)
Tarot Task 4: complete (입력 UI+getZodiac/getLifePath+state, review clean·Approved. 브리프 오타(12/31→사수) 구현자가 데이터 기준으로 올바르게 처리(염소). Minor 기록: btn-start 조건 다소 방어적 — 무해)
Tarot Task 5: complete (셔플+부채꼴 78장+5장 선택+drawn. 리뷰 Important 1건 — 재진입 생존 타이머(rAF/150/400/800/500ms) — selectSession 토큰 가드 8지점 픽스, 재검토 Approved. 레이스 경로 2종 실검증 통과)
Tarot Task 6: complete (startReveal 실구현+상세패널+요약바+reduceToCore/getReadingNumber, readingSession 가드 완비, review Approved. Minor 기록: reduceNumberForDisplay 데드코드(app.js:154-157), 오버레이 정리 로직이 startReveal에만 있음 — 향후 화면 이동 경로 추가 시 유의)
Tarot Task 7: complete-코드준비 (docs/worker/worker.js — /tarot 추가 완성본, 기존 3라우트 diff 검증 무변경(옵션 파라미터 기본값 4줄만, 값 동일), 프롬프트 7항목+인젝션 완화, review Approved. Minor 기록: /tarot만 405 관례(브리프 요구), Response 재파싱. ⚠️ Cloudflare 배포는 사용자 수동 대기 — 배포 후 curl 실검증 필요)
Tarot Task 7 후속: 사용자 Cloudflare 배포 완료 → 컨트롤러 실검증 통과 (/tarot 200 완결 리딩 12.5s, null축 미언급 확인, /recipe 회귀 200 정상). Minor 기록: 별자리 궁합 언급이 호출별 변동(모델 특성).
Tarot Task 8: complete (심층 리딩 fetch+로딩/에러 UX. 리뷰 Important 1건 — 전역 loading 플래그 세션 경쟁 — 소유권 토큰(releaseLoadingIfOwner) 픽스 + 재시도 버튼 중복 해소, 재검토 Approved. 모킹 4경로+경쟁 경로 실검증 통과)
최종 리뷰(Opus): 배포 가능 판정. 스펙 커버리지 완전, 통합 정합, 이미지 지연 로딩 확인(실로드 5장뿐), 366일 별자리 전수검증 통과. Important 1건(Anthropic 폴백 빈 리딩이 성공 표시) → 컨트롤러가 프론트 가드 한 줄(!data.reading.trim()) 픽스 + 프리뷰 실검증 통과(에러 UI 수렴, 콘솔 0). Minor 7건 전부 배포 보류 OK 판정(triage 완료).
상태: 배포 대기 — firebase deploy --only hosting → /tarot
Tarot Task 9: complete (firebase deploy 성공 — /tarot 200, 이미지 200, 메인 "다락방 놀이터" 섹션+타로 카드 반영. 사용자 PC 로컬 확인 후 배포. 폰 실기기 확인은 사용자 진행)
상태: 딜리버리 완료. https://vaulted-bus-346411.web.app/tarot
배포 후 픽스: /tarot(슬래시 없음) 리다이렉트로 상대 경로 자산 전부 404 → 폰/웹 백지 (사용자 제보). index.html 6곳+app.js 1곳 절대 경로(/tarot/...) 전환, 재배포, 전 자산 200 확인. /game 때와 동일 함정 — 메모리에 재발 방지 기록.
후속: OG 완성 (tarot/images/og.png 1200x630 — 카드 3장 부채꼴+푸름이, PowerShell System.Drawing 합성, 스크립트 scratchpad/make-og.ps1) + og/twitter 메타 태그 배포. Netlify 프로필(luca-darakbang)에도 타로 링크 등록됨. 카톡 미리보기 정상 확인.
