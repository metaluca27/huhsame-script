# 푸름이 상자 시뮬레이터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MuJoCo 세상에서 푸름이(회색 고양이 몸)가 PPO로 상자에 뛰어 들어가는 법을 배우고, 학습 단계별 영상을 세로 숏츠로 뽑는다.

**Architecture:** `pureum_env.py`가 MJCF XML 생성 + Gymnasium 환경(관찰·행동·보상)을 담당. `train.py`가 SB3 PPO로 학습하며 체크포인트 저장. `render_video.py`가 체크포인트별 에피소드를 오프스크린 렌더링해 ffmpeg로 이어 붙인다.

**Tech Stack:** Python 3.14 venv(`tools/pureum-box-sim/.venv`), mujoco 3.16, gymnasium 1.4, stable-baselines3 2.9, torch CPU, imageio-ffmpeg, pytest.

---

## 파일 구조
- `tools/pureum-box-sim/pureum_env.py` — 세상 XML + `PureumBoxEnv`
- `tools/pureum-box-sim/train.py` — PPO 학습, `runs/ckpt_*.zip` 저장
- `tools/pureum-box-sim/render_video.py` — 체크포인트 → `out/*.mp4`
- `tools/pureum-box-sim/tests/test_env.py`
- `tools/pureum-box-sim/requirements.txt`, `README.md`, `.gitignore`

### Task 1: 환경 (세상 + 규칙)
- [ ] 테스트 작성: reset 관찰 크기 11, 행동 0이면 상자 밖 유지, 푸름이를 상자 안 바닥에 놓으면 성공 판정 + 보상 ≥100, 점프 행동 시 z 상승.
- [ ] `pureum_env.py` 구현 (박스 바닥+벽 4개, 푸름이 = 슬라이드 x/y + 힌지 yaw + 슬라이드 z 관절, 액추에이터 대신 `xfrc_applied`/`qfrc_applied`로 힘).
- [ ] `pytest` 통과 확인, 커밋.

### Task 2: 학습
- [ ] `train.py`: `make_vec_env(PureumBoxEnv, n_envs=8, SubprocVecEnv)`, PPO MlpPolicy, `CheckpointCallback`, 시작 시 무작위 모델 `ckpt_0` 저장, `--steps` 인자.
- [ ] 짧게(20k 스텝) 돌려 에러 없는지 확인, 커밋.
- [ ] 본 학습(백그라운드) → 성공률 평가 스크립트로 20회 중 15회 이상 확인. 미달 시 벽 높이 커리큘럼.

### Task 3: 영상
- [ ] `render_video.py`: 체크포인트 목록 → 각 1 에피소드 렌더(1080×1920, 30fps, 추적 카메라), 상단에 "N번째 도전" 라벨(Pillow), ffmpeg concat.
- [ ] 결과 mp4 프레임 확인, 커밋.

### Task 4: 마무리
- [ ] README(루카용 실행법), requirements.txt, .gitignore(.venv, runs, out), 커밋.
