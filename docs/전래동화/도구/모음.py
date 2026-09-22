"""완성된 편들을 이어 붙여 '몰아보기' 한 편으로 만든다.

야담 시장에서 조회수가 붙는 건 20분 단편이 아니라 1~7시간 몰아보기다(잠들며 듣는 수요).
새로 만들 것 없이 이미 만든 영상을 그대로 이어 붙이고, 챕터 시간만 계산해 준다.

사용법 (docs/전래동화 폴더에서):
  python 도구/모음.py 01 02 03 04 05
  python 도구/모음.py 01 02 03 04 05 --out 허허서방_1-5편_몰아보기.mp4
"""
import argparse, json, subprocess, sys
from pathlib import Path


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def seconds(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def episode_video(prefix):
    """'01' → 그 편 폴더의 완성 영상 (허허서방_N편_*.mp4)."""
    folders = sorted(Path(".").glob(f"{prefix}_*"))
    if not folders:
        sys.exit(f"{prefix}번 편 폴더를 못 찾았어요")
    videos = [v for v in folders[0].glob("허허서방_*.mp4") if "썸네일" not in v.name]
    if not videos:
        sys.exit(f"{folders[0].name} 안에 완성 영상이 없어요 (build.py video부터 하세요)")
    return sorted(videos, key=lambda v: v.stat().st_size)[-1]


def title_of(prefix):
    """배포문구.md 제목 줄에서 앞부분만 떼어 챕터 이름으로."""
    folders = sorted(Path(".").glob(f"{prefix}_*"))
    doc = folders[0] / "배포문구.md"
    if doc.exists():
        lines = doc.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            if line.startswith("## 제목") and i + 1 < len(lines):
                return lines[i + 1].split("|")[0].strip()
    return folders[0].name.split("_", 1)[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episodes", nargs="+", help="편 번호 앞자리 (예: 01 02 03)")
    ap.add_argument("--out", default="")
    a = ap.parse_args()

    videos = [episode_video(e) for e in a.episodes]
    out = a.out or f"허허서방_{a.episodes[0].lstrip('0')}-{a.episodes[-1].lstrip('0')}편_몰아보기.mp4"

    listing = "".join(f"file '{v.resolve().as_posix()}'\n" for v in videos)
    work = Path("_몰아보기")
    work.mkdir(exist_ok=True)
    (work / "list.txt").write_text(listing, encoding="utf-8")
    print("이어 붙이는 중…", ", ".join(v.parent.name for v in videos), file=sys.stderr)
    ff("-f", "concat", "-safe", 0, "-i", work / "list.txt", "-c", "copy", out)

    # 챕터: 각 편 시작 시각
    rows, t = [], 0.0
    for prefix, v in zip(a.episodes, videos):
        m, s = divmod(int(t), 60)
        h, m = divmod(m, 60)
        stamp = f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"
        rows.append(f"{stamp} {int(prefix)}편 {title_of(prefix)}")
        t += seconds(v)
    total_m = int(t // 60)
    doc = [f"# {out} 업로드 문구", "",
           f"- 길이: {total_m // 60}시간 {total_m % 60}분", "",
           "## 챕터", ""] + rows
    Path("모음_배포문구.md").write_text("\n".join(doc) + "\n", encoding="utf-8")
    print(f"{out} 완성 — {total_m // 60}시간 {total_m % 60}분, 챕터 {len(rows)}개 (모음_배포문구.md)")


if __name__ == "__main__":
    main()
