# 클로 텔레그램 봇 키를 공용 워커(small-recipe-9345) 시크릿으로 등록하고 텔레그램 웹훅을 연결하는 스크립트
# 실행: powershell -ExecutionPolicy Bypass -File "docs\worker\clo-keys.ps1"
# 키는 화면과 파일 어디에도 남지 않는다 (워커 시크릿에만 저장).

Set-Location -Path $PSScriptRoot

function Read-Secret($prompt) {
  $s = Read-Host $prompt -AsSecureString
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

$botToken = Read-Secret "BotFather 가 준 봇 토큰 붙여넣기"
$ownerId = Read-Host "내 텔레그램 숫자 ID (@userinfobot 이 알려준 Id)"
$whKey = Read-Secret "클로드 콘솔 웹훅 서명키(whsec_ 로 시작) 붙여넣기"

if (-not $botToken -or -not $ownerId -or -not $whKey) { Write-Host "빈 칸이 있어요. 다시 실행해 주세요."; exit 1 }
if (-not $whKey.StartsWith("whsec_")) { Write-Host "서명키는 whsec_ 로 시작해야 해요."; exit 1 }

# 텔레그램이 우리 워커를 부를 때만 붙이는 비밀값(무작위)
$bytes = New-Object byte[] 36
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$tgSecret = [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_").Replace("=", "")

Write-Host "`n[1/5] 봇 토큰 등록 중..."
$botToken | npx wrangler secret put CLO_TELEGRAM_BOT_TOKEN
Write-Host "[2/5] 텔레그램 비밀값 등록 중..."
$tgSecret | npx wrangler secret put CLO_TELEGRAM_SECRET
Write-Host "[3/5] 루카 ID 등록 중..."
$ownerId | npx wrangler secret put CLO_OWNER_CHAT_ID
Write-Host "[4/5] 웹훅 서명키 등록 중..."
$whKey | npx wrangler secret put CLO_AGENT_WEBHOOK_SECRET

Write-Host "[5/5] 텔레그램에 워커 주소 연결 중..."
$body = @{ url = "https://small-recipe-9345.atlia0318.workers.dev/clo/telegram"; secret_token = $tgSecret; allowed_updates = @("message") } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$botToken/setWebhook" -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
if ($res.ok) { Write-Host "`n끝! 클로한테 '등록했어'라고 말해 주세요." } else { Write-Host "텔레그램 연결 실패: $($res.description)" }
