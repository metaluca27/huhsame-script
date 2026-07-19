# 막장 드라마 대본 작성 워크스페이스 by 허세임

4인 에이전트 팀이 협업해서 **숏폼 드라마 10화 대본**을 텍스트로만 뽑는 워크스페이스. 

## 자연어 트리거 (커맨드 없음)

다음 키워드가 오면 **메인 클로드가 자동으로 4인 팀을 띄운다**:

- "[주제]로 **드라마 대본** 만들어줘"
- "**드라마 대본팀** 띄워서 [주제]"
- "**막장 드라마 대본** [주제]"
- "**팀으로** [주제]" / "**멀티에이전트팀으로** [주제]"
- "**숏폼 드라마 대본** [주제]"

## 핵심 설정

### 스토리
| 항목 | 값 |
|------|-----|
| 주인공 | 60대 한국 할머니 |
| 시점 | 1인칭 (하소연/경험담 톤, 존댓말 독백) |
| 장르 | 막장 (재벌·복수·불륜·환생·사기·출생의 비밀 등 콤보) |
| 결말 | 사이다/욕망 충족 |
| 화수 | 10화 |
| 화당 문장 | 10~12문장 |
| 독백:대사 | 30:70 |
| 첫 문장 | 이전 화 연결 독백 |
| 마지막 문장 | 클리프행어 (의미심장한 독백) |

### 캐릭터
| 항목 | 값 |
|------|-----|
| 주요 인물 | 최대 5명 |
| 한 장면 동시 등장 | 최대 3명 |
| 이름 | 한국 흔한 이름 |
| 외모 룰 | 주인공/선역=예쁘게, 악역=못생기게 |

### 이미지 프롬프트 (텍스트만 작성, PNG 생성 X)
- 비율 9:16 (숏폼 세로), 해상도 1K
- 영문 프롬프트, 사실적/드라마틱 스타일
- 화당 10개 구도 (각 문장에 매핑·재활용)

## 4인 팀

| 에이전트 | 역할 | teammate name |
|----------|------|---------------|
| ✍️ **story-writer** | 막장 스토리, 10화 구조, 제목, 전체 나레이션 초안 | `storyWriter` |
| 🎨 **character-designer** | 캐릭터/배경 상세 설정, 영문 이미지 프롬프트 | `charDesigner` |
| 🎭 **scene-director** | 화별 나레이션, 감정 태그, 화당 10개 구도 프롬프트 | `sceneDirector` |
| 🎬 **showrunner** | 드라마 PD 검수 — 일관성·막장도·클리프행어·30:70·1인칭 톤 | `showrunner` |

## 팀 스폰 시퀀스 (메인 클로드가 수행)

환경변수 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 설정

1. **TeamCreate** — 팀명 예: `drama-script-{주제slug}`
2. **teammate 4명 직접 스폰** (producer 안 거침):
   - `storyWriter` — subagent_type=`story-writer`
   - `charDesigner` — subagent_type=`character-designer`
   - `sceneDirector` — subagent_type=`scene-director`
   - `showrunner` — subagent_type=`showrunner`
3. **task 의존성**:
   - task 1: storyWriter — story.md + full_narration.md (deps: 없음)
   - task 2: charDesigner — characters/, backgrounds/ (deps: 1)
   - task 3: sceneDirector — episodes/ep01~10/ (deps: 1, 2)
     - 화 단위 완성 시마다 **품질 루프 2단계 실행**:
       1. showrunner → 막장도 점수 (80점 미만 시 1회 재작성)
       2. charDesigner → 캐릭터 일관성 체크 (충돌 시 1회 수정)
     - 두 루프 완료 후 다음 화 진행
   - task 4: showrunner — 막장도 체크 + 최종 전체 검수 (SendMessage로 트리거)

## 협업 룰

- **teammate ↔ teammate 직접 SendMessage**. lead 안 거치고 핑퐁.
- 산출물 1개 완성 시마다 작성자가 `showrunner`에 검수 요청 SendMessage.
- showrunner는 일관성·30:70·클리프행어·막장도·1인칭 60대 톤 체크.
- 같은 주제로 핑퐁 3회 이상 감지 시 메인 lead에 "정리 요청" SendMessage.
- **사용자 검수 게이트 X** — 완전 자동, 끝나면 lead가 사용자에게 보고.
- 백그라운드 디스패치는 `~/.claude/scripts/inject-narration.sh` 훅이 narration·협업 룰 자동 주입 → prompt에 별도 박지 말 것.

## 산출물 구조

```
projects/{드라마제목}/
├── story.md                         # 자극적 제목, 로그라인, 10화 구조, 인물·배경 리스트
├── full_narration.md                # 1~10화 전체 나레이션 (화당 10~12문장)
├── characters/{이름}/profile.md     # 외모·의상·성격·관계 + 영문 이미지 프롬프트
├── backgrounds/settings.md          # 주요 배경 + 영문 이미지 프롬프트
├── episodes/ep{N}/
│   ├── narration.md                 # 문장 1~12 + 감정 태그 + 이미지 매핑 + 행동 묘사
│   └── images.md                    # 화당 10개 구도 영문 프롬프트 (9:16)
└── _review/showrunner-notes.md      # 검수 노트 누적
```

**생성 안 함**: `*.png`, `audio/*.mp3`, `episode.mp4`, `subtitles.ass`, `cost_log.md`, `voice_config.md`

## 품질 체크

- [ ] 화당 10~12문장
- [ ] 1인칭 60대 할머니 존댓말 독백 톤
- [ ] 독백:대사 30:70
- [ ] 각 화 마지막 문장 클리프행어
- [ ] 각 화 첫 문장 이전 화 연결
- [ ] 캐릭터 5명 이내, 한 장면 동시 등장 3명 이내
- [ ] 주인공/선역 예쁘게, 악역 못생기게 묘사
- [ ] 영문 이미지 프롬프트 9:16 / 사실적·드라마틱
- [ ] 각 화 10개 구도 + 문장별 매핑

## 시작하기

```
사용자: "전기차충전소에서 만난 첫사랑이란 주제로 드라마 대본 만들어줘"
        ↓
메인:   TeamCreate → 4명 스폰 → 자동 협업 → 완성 보고
        ↓
산출물: projects/전기차충전소에서만난첫사랑/...
```
