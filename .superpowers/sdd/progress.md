# 용돈 속도계 진행 기록

계획: docs/superpowers/plans/2026-08-27-용돈속도계.md
작업 저장소: C:\Users\atlia\Documents\metaluca-fresh (main 브랜치, 사용자 승인함)

Task 1: complete (commits d39a144..c696d3e, review clean)
  Minor 소견 (최종 리뷰에서 취사선택):
  - dailyAverage의 elapsedDays>0 가드는 사실상 죽은 코드 (day는 항상 1 이상)
  - onTrack 경계값(diff == 예산의 정확히 2%)이 테스트에 없음
  - over 상태에서 runOutDay/perDayLeft/dailyAverage 값이 검증되지 않음
Task 2: complete (commits c696d3e..71fc59e, review clean 재리뷰 후)
  수정된 것: prompt 취소 시 잔액이 0으로 저장되던 Critical 버그,
             백원 내림을 "앱이 계산한 금액에만" 적용 (사용자 결정)
Task 3: complete (commits 71fc59e..8b6e325, review clean 재리뷰 후)
  수정된 것: 바꿀래요 중도포기 시 지난달 숫자가 이번 달로 보이던 문제,
             예산 변경 시 lastResult가 지워지던 문제
Task 4: complete (commits 8b6e325..c0ad637, review clean 수정 후)
  수정된 것: sync.mjs 부분치환 미검출, 외부링크 검사가 src 누락
Task 5 (계획 외 추가): complete (commit e486d8d)
  prompt/alert/confirm 전부 제거하고 인앱 입력 패널로 교체.
  토스 웹뷰가 네이티브 다이얼로그를 지원 안 하면 앱이 무용지물이 될 위험 때문 (사용자 결정)
최종 전체 리뷰: Critical 1건 + Important 2건 발견, 전부 수정 (commit 853b857)
  - 1일이 아닌 날 첫 설치 시 없는 여유를 만들어내던 문제 (startDay 도입)
  - 잔액 정확히 0일 때 "0원 넘었어요"라는 엉뚱한 문구
  - 잔액이 예산보다 큰 입력을 막지 않던 문제
  테스트 7개 → 14개. 남은 Minor(월 건너뜀 문구, sync 따옴표 검사, 광고 자리 미구현)는 미착수.
전체 완료 (d39a144..853b857)

# 구독료 다이어트 진행 기록
계획: docs/superpowers/plans/2026-08-28-구독료다이어트.md
작업 저장소: C:\Users\atlia\Documents\metaluca-fresh (main 브랜치, 사용자 승인 유효)
[구독료] Task 1: complete (commits 853b857..fa1fa1b, review clean 수정 후)
  수정: 유튜브 프리미엄·애플TV+에 "이미 포함" 역방향 안내 추가 (중복 계산 경고가 한쪽에만 있었음)
  Minor(미수정): 네이버플러스 안내가 "함께 나와요"로 다른 쌍과 표현이 다름. 의미는 전달됨
  Minor(미수정): ids 배열에 중복이 들어오면 이중 계산됨. UI가 중복을 안 넘기는 구조라 실제 위험은 낮음
[구독료] Task 2: complete (commits fa1fa1b..8b27d43, review clean 재리뷰 후)
  수정: 금액 입력 중 이탈 시 금액 없는 항목이 선택된 채 저장되던 Critical,
        중복 계산 경고가 정작 필요한 곳(가격이 이미 있는 호스트)에서 안 뜨던 Important.
        includedIn 필드를 데이터에 넣고 양쪽 다 선택했을 때만 경고하도록 바꿈
  Minor(Task 3에서 처리): 경고 문구의 한글 조사가 '은(는)' 하드코딩이라 어색함
[구독료] Task 3: complete (commits 8b27d43..7ebee3f, review clean, Critical/Important 0건)
  구현자 판단 두 가지 모두 리뷰에서 타당하다고 확인:
  - 선택 해제된 항목이 unused에 남아 절약액을 부풀리던 것을 화면 진입 시 걸러냄
  - 한글 조사(은/는) 받침 판별 헬퍼 추가
  Minor(미수정): renderDiet에서 save가 중복 호출됨. 무해함
[구독료] Task 4: complete (commits 7ebee3f..4dac181, review clean, 지적 0건)
[구독료] 최종 전체 리뷰: Critical 1 + Important 3 + 스펙 누락 2건 발견, 전부 수정 (commit 588bdf0)
  - Critical: "눌러서 고칠 수 있어요"라고 써놓고 가격이 이미 있는 항목은 고칠 방법이 없었음.
    넷플릭스 프리미엄 쓰는 사람이 연 42,000원 적게 잡히던 문제. 칩을 이름/금액 두 칸으로 나눠 해결
  - 중복 계산 경고가 정작 숫자를 보여주는 결과 화면엔 없었음
  - 공유 문구에 앱으로 돌아올 링크가 없었음 (공유가 유일한 유입 경로인데)
  - includedIn 무결성을 지키는 테스트가 없었음 (이 부분만 두 번 회귀)
  - 스펙에 있던 "정리할 게 없네요 👏" 빈 상태 누락
  - 깨진 localStorage가 화면을 영구 백지로 만들던 문제
  테스트 13 → 16개. 남은 Minor: SDK share 함수가 3.1.1에서 deprecated(동작은 함),
  소수점 금액 입력 시 칩 합계와 총액이 미세하게 다름, 깨진 상태를 조용히 버림
[구독료] 전체 완료 (853b857..588bdf0)
