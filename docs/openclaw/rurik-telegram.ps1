# 루릭 텔레그램 봇(@Luricks2_bot, 표시 이름 Luricks_bot)을 오픈클로에 새로 연결하는 스크립트
# 실행: 루카가 직접 연 PowerShell 창에서 (클로드 앱 안 터미널 X — 게이트웨이가 클로드 자식이 되면 같이 죽는다)
#   powershell -ExecutionPolicy Bypass -File "C:\Users\atlia\Desktop\huhsame-script\docs\openclaw\rurik-telegram.ps1"
#
# 왜: 오픈클로 설정의 텔레그램 "lurick" 칸에는 푸름이 봇(@plumi1_bot) 토큰이 들어 있고,
#     진짜 루릭 봇(@Luricks2_bot) 토큰은 어디에도 없어서 루릭 봇에 말해도 아무도 안 듣고 있었다 (2026-10-30 확인).
# 무엇을: 텔레그램 계정 "rurik"을 새로 만들고(루릭 봇 토큰), 그 계정 메시지를 루릭 에이전트로 보내는 길을 추가.
#         푸름이 쪽("lurick" 칸)과 노바 카톡 길은 건드리지 않는다.
# 토큰은 화면·파일 어디에도 남지 않는다 (오픈클로 설정에만 저장).

$s = Read-Host "BotFather 의 @Luricks2_bot 토큰 붙여넣기 (오른쪽 클릭으로)" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)).Trim()
if (-not $token) { Write-Host "토큰이 비어 있어요. 다시 실행해 주세요."; exit 1 }

Write-Host "`n[1/3] 토큰이 진짜 루릭 봇 것인지 확인 중..."
try {
  $me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe"
} catch {
  Write-Host "텔레그램이 이 토큰을 모른대요. 토큰을 다시 복사해 주세요 (BotFather 메시지에서 토큰을 한 번 클릭하면 정확히 복사돼요)."
  exit 1
}
if ($me.result.username -ne "Luricks2_bot") {
  Write-Host "이 토큰은 @$($me.result.username) 거예요. @Luricks2_bot 토큰이 맞는지 확인해 주세요."
  exit 1
}
Write-Host "      @Luricks2_bot ($($me.result.first_name)) 맞아요."

$patch = @{
  channels = @{ telegram = @{ accounts = @{ rurik = @{
    botToken = $token
    enabled = $true
    dmPolicy = "allowlist"
    allowFrom = @(5142901496)
    defaultTo = "agent:lurick"
    groupPolicy = "open"
    groupAllowFrom = @("5142901496")
  } } } }
  # 배열은 통째로 바뀌므로 기존 노바 카톡 길도 같이 적는다
  bindings = @(
    @{ type = "route"; agentId = "nova"; match = @{ channel = "kakao-talkchannel"; accountId = "default" } },
    @{ type = "route"; agentId = "lurick"; match = @{ channel = "telegram"; accountId = "rurik" } }
  )
} | ConvertTo-Json -Depth 10

Write-Host "[2/3] 설정 미리 검사 중..."
$patch | openclaw config patch --stdin --dry-run *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "설정 검사에서 막혔어요. 클로한테 '루릭 설정 검사 실패'라고 알려 주세요."; exit 1 }

Write-Host "[3/3] 설정 저장 중..."
$patch | openclaw config patch --stdin *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "저장에 실패했어요. 클로한테 '루릭 설정 저장 실패'라고 알려 주세요."; exit 1 }

Write-Host "`n끝! 오픈클로가 바뀐 설정으로 다시 켜지는 데 최대 10분 걸려요 (그동안 푸름이·카톡 노바도 잠깐 쉼)."
Write-Host "10분쯤 뒤 루릭 봇한테 말 걸어 보고, 클로한테 '루릭 연결했어'라고 알려 주세요."
