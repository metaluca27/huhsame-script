# 한쇼로 PPT를 열어 슬라이드 이미지를 뽑고, 등장 효과와 전환 효과를 한쇼가 읽었는지 확인한다.
param([string]$Deck, [string]$OutDir)
New-Item -ItemType Directory -Force $OutDir | Out-Null
Get-ChildItem $OutDir -Filter "*.png" -ErrorAction SilentlyContinue | Remove-Item -Force
$h = New-Object -ComObject HShow.Application
try {
    # 경고창이 뜨면 자동화가 멈추므로 메시지 창을 자동으로 넘긴다.
    try { [void]$h.SetMessageBoxMode(1) } catch { "메시지 모드 설정 실패" }
    "Open: " + $h.Open($Deck, $true)
    $p = $h.ActivePresentation
    "Slides: " + $p.Slides.Count
    for ($i = 1; $i -le $p.Slides.Count; $i++) {
        $s = $p.Slides.Item($i)
        $seq = "?"; $trans = "?"; $pics = 0
        try { $seq = $s.TimeLine.MainSequence.Count } catch { $seq = "err" }
        try { $trans = $s.SlideShowTransition.EntryEffect } catch { $trans = "err" }
        try { $s.Export((Join-Path $OutDir ("s{0:D2}.png" -f $i)), "PNG", 1600, 900) } catch { "export err ${i}: $($_.Exception.Message)" }
        "slide $i shapes=$($s.Shapes.Count) animations=$seq transition=$trans"
    }
    $p.Close()
} finally {
    $h.Quit()
}
Get-ChildItem $OutDir -Filter "*.png" | Select-Object Name, Length
Get-ChildItem $OutDir -Recurse -Directory | Select-Object FullName
