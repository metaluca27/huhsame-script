# 나좀봐 앱인토스 포팅 설계 문서

날짜: 2026-07-25
상태: 사용자 승인 (대화로 확정, 콘솔 앱 등록 진행 중)

## 개요

나좀봐 웹앱(vaulted-bus-346411.web.app/look)을 앱인토스(토스 미니앱)로
포팅해 무료 출시한다. 방식은 WebView 미니앱 — 토스 SDK
`@apps-in-toss/web-framework` 프로젝트에 기존 코드를 이식해 번들(.ait)로
제출한다. 기존 URL을 그대로 감싸는 방식은 지원되지 않음(조사 확인).

## 확정 사항

- **무료 출시** — 수익화 없음, 사업자 등록 불필요
- **앱 이름**: 나좀봐 / **appName(고유 ID, 수정 불가)**: `najombwa` / **유형**: 비게임
- 웹 버전(/look)은 그대로 유지, 토스 버전은 형제 버전
- 워커(`/voice/tts`, `/voice/stt`)는 수정 없이 그대로 사용 (외부 API 호출 가능 확인)
- 토스 디자인시스템(TDS)은 적용하지 않음 — 기존 디자인 유지

## 역할 분담

- 사용자: 토스 개발자 콘솔 가입·앱 등록(진행 중), 폰에 샌드박스 테스트 설정,
  심사 요청·출시 버튼
- Claude: 프로젝트 세팅, 코드 이식, 앱 아이콘(512px) 제작, 앱 설명 문구, 빌드

## 기술 구조

### 프로젝트 (2026-07-25 갱신 — 기존 미니앱 공장 발견으로 방식 변경)
- 사용자는 이미 앱인토스 미니앱 9개를 출시한 상태였음. 전부
  `metaluca8560/metaluca8560` 저장소(로컬: `C:\Users\atlia\Documents\metaluca-fresh`)의
  `miniapp-<이름>/` 폴더 패턴으로 관리됨
- 나좀봐도 동일 패턴: `miniapp-look/` 폴더 생성
  - `granite.config.ts`: appName "najombwa"(콘솔 등록값과 일치 필수),
    displayName "나좀봐", primaryColor #38bdf8, icon은 호스팅 URL
  - `package.json`: @apps-in-toss/web-framework + vite, scripts는
    miniapp-tarot과 동일 (web:dev/web:build/dev/build/deploy)
  - `index.html`: landing/look/index.html 그대로 복사 (단일 파일이라 sync.mjs 불필요.
    카톡 배너·데모 모드는 토스 환경에서 발동 안 하므로 그대로 둠 — 원본과 무차이 유지)
- 아이콘: logo600.png를 Firebase(/look/logo600.png)에 올려 URL로 참조
- 개발/테스트: `ait dev` + 토스 샌드박스(사용자가 기존 앱들로 경험 있음)
- 제출: `ait build`/`ait deploy` (기존 앱들과 동일 CLI 플로) → 콘솔에서 검토 요청
- 저장소 관례: 브랜치 + PR로 main 반영 (기존 커밋들 전부 PR 번호 달림)

### 알려진 리스크와 대응

**SpeechRecognition(자막) 미지원 가능성** — 토스 웹뷰에서 마이크
(getUserMedia)는 공식 지원 확인됐으나, 음성인식 API(SpeechRecognition)는
별개이며 일반 웹뷰에는 없는 경우가 많다.
- 샌드박스 테스트를 최우선으로 앞당겨 지원 여부부터 확인한다
- **미지원 시 폴백**: 워커 `/voice/stt`(Gemini 받아적기)로 자막 구현 —
  getUserMedia + MediaRecorder로 몇 초 단위 청크 녹음 → STT → 자막 표시.
  실시간성은 떨어지지만(수 초 지연) 기능은 유지된다
- 앱은 이미 SR 미지원 시 안내 문구 폴백이 있으므로 심사 중 크래시 위험은 없음

## 심사 대비

- 앱 설명(콘솔 제출용): "청각장애인을 위한 대화 도우미. 상대방의 말을 큰
  자막으로 보여주고, 입력한 글을 AI 목소리로 대신 말해줍니다."
- 검수 가이드·체크리스트 확인 후 제출 (콘솔 내 문서)
- 아이콘: 512px PNG, 나좀봐 테마(👀 + 하늘색/보라)로 제작

## 범위 밖 (YAGNI)

- 수익화 (광고·인앱결제) — 필요 시 사업자 등록 후 별도 진행
- TDS 적용, 토스 로그인 연동
- 웹/토스 코드 단일화 빌드 시스템 (일단 복사 이식, 안정화 후 고민)

## 성공 기준

- 토스 샌드박스에서 말하기(TTS)·자막(SR 또는 STT 폴백)이 작동한다
- 심사 통과 후 토스 앱에서 "나좀봐" 미니앱 실행 가능
- 웹 버전은 영향 없이 그대로 작동한다
