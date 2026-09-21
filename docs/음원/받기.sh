#!/usr/bin/env bash
# 국악방송 전국8도민요 MR 105곡 내려받기
# 사용법:  bash 받기.sh [저장폴더]   (기본: ./wav)
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-wav}"
mkdir -p "$OUT"
n=0; ok=0; fail=0
while IFS=, read -r code name file url; do
  [ "$code" = "코드" ] && continue
  n=$((n+1))
  if [ -s "$OUT/$file" ]; then ok=$((ok+1)); continue; fi
  if curl -sSfL --retry 2 -o "$OUT/$file.part" "$url"; then
    mv "$OUT/$file.part" "$OUT/$file"; ok=$((ok+1))
    printf "[%3d/105] %s\n" "$n" "$file"
  else
    rm -f "$OUT/$file.part"; fail=$((fail+1))
    printf "[%3d/105] 실패: %s\n" "$n" "$file" >&2
  fi
done < 국악방송_민요MR_105곡.csv
printf "\n완료 — 성공 %d, 실패 %d (폴더: %s)\n" "$ok" "$fail" "$OUT"
