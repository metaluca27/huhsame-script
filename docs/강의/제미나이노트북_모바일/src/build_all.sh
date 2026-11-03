#!/usr/bin/env bash
# 사용법: NODE_PATH=<pptxgenjs 등이 있는 node_modules> PPTX_SKILL=<pptx 스킬 폴더> bash build_all.sh
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DECK="$SRC/../제미나이노트북_모바일_강의.pptx"
node "$SRC/build_deck.js" "$DECK"
PYTHONIOENCODING=utf-8 python "$SRC/add_motion.py" "$DECK" > /dev/null
PYTHONIOENCODING=utf-8 python "$PPTX_SKILL/scripts/office/validate.py" "$DECK"
