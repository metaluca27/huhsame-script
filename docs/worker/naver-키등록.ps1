# 네이버 검색 API 키를 공용 워커(small-recipe-9345) 시크릿으로 등록하는 스크립트
# 실행: powershell -ExecutionPolicy Bypass -File "docs\worker\naver-키등록.ps1"
# 키는 화면과 파일 어디에도 남지 않는다 (워커 시크릿 + 내 PC 사용자 환경변수에만 저장).

Set-Location -Path $PSScriptRoot

$id = Read-Host "네이버 Client ID 붙여넣기"
$secretSecure = Read-Host "네이버 Client Secret 붙여넣기" -AsSecureString
$secret = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure))

if (-not $id -or -not $secret) { Write-Host "ID나 Secret이 비어 있어요. 다시 실행해 주세요."; exit 1 }

# 클로만 워커를 부를 수 있게 하는 출입증(무작위 48자)
$bytes = New-Object byte[] 36
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_")

Write-Host "`n[1/4] Client ID 등록 중..."
$id | npx wrangler secret put NAVER_CLIENT_ID
Write-Host "[2/4] Client Secret 등록 중..."
$secret | npx wrangler secret put NAVER_CLIENT_SECRET
Write-Host "[3/4] 출입증 등록 중..."
$token | npx wrangler secret put NAVER_PROXY_TOKEN

Write-Host "[4/4] 내 PC에 출입증 저장 중..."
[Environment]::SetEnvironmentVariable("NAVER_PROXY_TOKEN", $token, "User")

Write-Host "`n끝! 클로한테 '등록했어'라고 말해 주세요."
