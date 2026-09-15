"""허허서방 롱폼 공용: 대본.md 파싱, 장면 태그 해석, 이미지 프롬프트 조립.

대본.md 형식:  | 001 | S01 | 내레이션 한두 문장 |
prompts.json 형식:
  {"styles": {"base": "...", "sil": "...", "web": "..."},
   "characters": {"DOLSOE": "영문 옷차림 묘사", ...},
   "scenes": {"S01": "장면 묘사", "S02": "[SIL] ...", "S03": "[WEB] ...", "S04": "[HUH:부채탁]"}}
"""
import re
from pathlib import Path

ROW = re.compile(r"^\|\s*(\d{3})\s*\|\s*(S\d{2})\s*\|\s*(.+?)\s*\|\s*$")
DATA_ROW_LIKE = re.compile(r"^\|\s*\d")
MAX_LINE_CHARS = 200  # 워커 TTS 한 번 호출 단위
TAG = re.compile(r"^\[(SIL|WEB|HUH:[^\]]+)\]\s*")
Z_MAX = 800  # Z Image는 약 800자 넘으면 job failed (루릭 2편에서 확인)


def parse_script(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = ROW.match(line)
        if not m:
            if DATA_ROW_LIKE.match(line):
                raise ValueError(f"대본 형식이 잘못된 줄: {line.strip()}")
            continue
        num, scene, text = m.groups()
        if len(text) > MAX_LINE_CHARS:
            raise ValueError(f"{num}번 줄이 {len(text)}자예요 (최대 {MAX_LINE_CHARS}자)")
        rows.append({"num": num, "scene": scene, "text": text})
    seen, dupes = set(), set()
    for r in rows:
        (dupes if r["num"] in seen else seen).add(r["num"])
    if dupes:
        raise ValueError(f"대본 번호가 중복돼요: {sorted(dupes)}")
    return rows


def scene_kind(raw):
    m = TAG.match(raw)
    if not m:
        return "base", raw
    tag, rest = m.group(1), raw[m.end():]
    if tag.startswith("HUH:"):
        return "huh", tag[4:]
    return tag.lower(), rest


def build_prompt(p, sid):
    kind, body = scene_kind(p["scenes"][sid])
    if kind == "huh":
        return kind, body
    for key in sorted(p["characters"], key=len, reverse=True):
        body = body.replace(key, p["characters"][key])
    prompt = f"{p['styles'][kind]} Scene: {body}"
    if kind != "web" and len(prompt) >= Z_MAX:
        raise ValueError(f"{sid} 프롬프트가 {len(prompt)}자예요 — Z Image는 {Z_MAX}자 미만")
    return kind, prompt
