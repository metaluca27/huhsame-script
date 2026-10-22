# 푸름이 상자 시뮬레이터

AI 푸름이가 상자에 뛰어 들어가는 법을 스스로 배우는 무조코 세상.

## 실행 (이 폴더에서)
```
.venv/Scripts/python -m pytest -q tests        # 세상 규칙 점검
.venv/Scripts/python train.py --steps 1500000  # 연습 (약 7분, runs/에 저장)
.venv/Scripts/python render_video.py 0 200000 1500000   # 영상 → out/pureum_box.mp4
```
처음 설치: `python -m venv .venv` 후 `.venv/Scripts/python -m pip install -r requirements.txt`

## 바꿔볼 것
- 점수 규칙: `pureum_env.py`의 `step()` — 상자 +100, 점프 -0.05, 가까워지면 +
- 벽 높이·점프 힘: 파일 맨 위 `WALL_H`, `JUMP_SPEED`

## 첫 결과 (2026-10-22)
- 다리 단 뒤(10-22 재학습): 20만 번까지 0/20 → 25만 번 20/20 → 150만 번 20/20.
