# 3D 사무실 보고원 설치 — 루카가 한 번만 실행
# 실행(PowerShell 7 = pwsh 로 — 옛 powershell 은 한글이 깨짐):
#   pwsh -ExecutionPolicy Bypass -File "C:\Users\atlia\Desktop\huhsame-script\tools\ai-office-3d\reporter\설치.ps1"
#  1) 무작위 출입증(OFFICE_TOKEN)을 만들어 공용 워커 시크릿 + 내 PC 사용자 환경변수에 저장 (화면·파일에 안 남김)
#  2) 작업 스케줄러에 "다락방 사무실 보고원" 등록 — 로그인할 때 + 3분마다, 창 없이 실행
#  3) 한 번 바로 보고해서 연결 확인
# 지우려면: Unregister-ScheduledTask -TaskName "다락방 사무실 보고원" -Confirm:$false

$here = $PSScriptRoot
$worker = Join-Path $here '..\..\..\docs\worker'

$bytes = New-Object byte[] 36
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_")

Write-Host "[1/3] 출입증을 워커에 등록 중..."
Push-Location $worker
$token | npx wrangler secret put OFFICE_TOKEN
$ok = $LASTEXITCODE -eq 0
Pop-Location
if (-not $ok) { Write-Host "워커 등록에 실패했어요. 화면 내용을 클로에게 보여 주세요."; exit 1 }
[Environment]::SetEnvironmentVariable("OFFICE_TOKEN", $token, "User")

Write-Host "[2/3] 작업 스케줄러에 보고원 등록 중..."
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$here\run-hidden.vbs`""
$every3 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 3)
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "다락방 사무실 보고원" -Action $action -Trigger @($every3, $logon) -Settings $settings `
  -Description "디지털 다락방 3D 사무실(/office)에 직원 7명 마지막 활동 시각 보고 — tools\ai-office-3d\reporter" -Force | Out-Null

Write-Host "[3/3] 첫 보고 보내는 중..."
pwsh -NoProfile -ExecutionPolicy Bypass -File "$here\office-reporter.ps1"
if ($LASTEXITCODE -eq 0) { Write-Host "`n끝! 클로한테 '설치했어'라고 말해 주세요." }
else { Write-Host "`n보고가 실패했어요. 화면 내용을 클로에게 보여 주세요." }
