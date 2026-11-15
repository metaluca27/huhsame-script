#!/bin/bash
# 사용: gen.sh 컷이름 "프롬프트" 참조그림...
name="$1"; prompt="$2"; shift 2
refs=(); for r in "$@"; do refs+=(--image "$r"); done
STYLE="Warm hand-painted anime illustration with soft watercolor textures, same art style and same character as the reference image. Full bleed image filling the entire vertical frame, no paper border, no white margin, no frame. No text, no letters, no signboard writing, no watermark. Korean traditional Joseon architecture only, not Chinese, not Japanese."
out=$(higgsfield generate create nano_banana_2 --prompt "$prompt $STYLE" "${refs[@]}" --aspect_ratio 9:16 --wait --wait-timeout 15m --json 2>&1)
url=$(echo "$out" | grep -o '"result_url": *"[^"]*"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')
if [ -n "$url" ]; then curl -s -o "images/$name.png" "$url" && ffmpeg -loglevel error -y -i "images/$name.png" -vf scale=432:-1 "images/_preview_$name.jpg" && echo "$name OK"; else echo "$name FAIL: $(echo "$out" | tail -5)"; fi
echo "$name | $prompt" >> build/prompts.txt
