#!/bin/bash
# 사용: clip.sh 이름 "프롬프트" 시작그림 [끝그림]
name="$1"; prompt="$2"; start="$3"; end="$4"
args=(--start-image "$start"); [ -n "$end" ] && args+=(--end-image "$end")
out=$(higgsfield generate create kling3_0 --prompt "$prompt Keep the hand-painted watercolor anime illustration style, no text, no subtitles." "${args[@]}" --aspect_ratio 9:16 --duration 5 --mode std --sound off --wait --wait-timeout 20m --json 2>&1)
url=$(echo "$out" | grep -o '"result_url": *"[^"]*"' | head -1 | sed 's/.*"\(http[^"]*\)"/\1/')
if [ -n "$url" ]; then curl -s -o "clips/$name.mp4" "$url" && echo "$name OK"; else echo "$name FAIL: $(echo "$out" | tail -6)"; fi
echo "$name | $prompt" >> build/prompts.txt
