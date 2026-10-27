# 디지털 다락방 3D 사무실 보고원 — 직원 7명이 "마지막으로 일한 시각"을 공용 워커에 알린다.
# 작업 스케줄러가 3분마다 실행 (설치: 설치.ps1). 직접 확인: pwsh -File office-reporter.ps1 -DryRun
#
# 보는 것은 파일이 "언제 바뀌었는지"뿐. 대화 내용·파일 이름은 밖으로 보내지 않는다.
#   헤르미 = 헤르메스 텔레그램 게이트웨이·세션 기록 + 이름이 "헤르미"로 시작하는 예약 작업 결과
#   루나·노바(예약 작업) = 이름이 "루나"/"노바"로 시작하는 헤르메스 예약 작업 결과
#   노바 = 코덱스 세션 기록도 함께
#   주주야·푸름이·루릭 = 오픈클로 에이전트 jujuya / main / lurick 폴더
#   CLO = 클로드 코드 프로젝트 대화 기록
param([switch]$DryRun)

$ErrorActionPreference = 'SilentlyContinue'
$URL = 'https://small-recipe-9345.atlia0318.workers.dev/office/status'
$H = $env:USERPROFILE
$HERMES = Join-Path $env:LOCALAPPDATA 'hermes'

function Latest([string[]]$paths, [switch]$Recurse, [string]$Filter = '*') {
  $best = $null
  foreach ($p in $paths) {
    if (-not (Test-Path $p)) { continue }
    $item = Get-Item $p
    $files = if ($item.PSIsContainer) { Get-ChildItem $p -File -Filter $Filter -Recurse:$Recurse } else { @($item) }
    foreach ($f in $files) { if (-not $best -or $f.LastWriteTimeUtc -gt $best) { $best = $f.LastWriteTimeUtc } }
  }
  return $best
}

$last = @{}
function Put([string]$owner, $utc) {
  if (-not $utc) { return }
  if (-not $last[$owner] -or $utc -gt $last[$owner]) { $last[$owner] = $utc }
}

# 헤르메스 예약 작업: 이름 앞머리로 직원 구분
$PREFIX = @{ '헤르미' = 'hermi'; '루나' = 'luna'; '노바' = 'nova'; '주주야' = 'jujuya'; '푸름' = 'pureum'; '루릭' = 'rurik' }
$jobsFile = Join-Path $HERMES 'cron\jobs.json'
if (Test-Path $jobsFile) {
  $j = Get-Content $jobsFile -Raw -Encoding utf8 | ConvertFrom-Json
  $jobs = if ($j.jobs) { $j.jobs } else { $j }
  foreach ($job in $jobs) {
    foreach ($k in $PREFIX.Keys) {
      if ("$($job.name)".StartsWith($k)) { Put $PREFIX[$k] (Latest @(Join-Path $HERMES "cron\output\$($job.id)")) }
    }
  }
}
Put 'hermi' (Latest @((Join-Path $HERMES 'logs\gateway.log'), (Join-Path $HERMES 'sessions')))

# 오픈클로 에이전트
$OC = @{ 'jujuya' = 'jujuya'; 'main' = 'pureum'; 'lurick' = 'rurik' }
foreach ($id in $OC.Keys) { Put $OC[$id] (Latest @("$H\.openclaw\agents\$id") -Recurse) }

# 코덱스 = 노바, 클로드 코드 = CLO (프로젝트 폴더 바로 아래 대화 기록만 — 하위 폴더까지 뒤지면 느림)
Put 'nova' (Latest @("$H\.codex\sessions") -Recurse)
$claude = Get-ChildItem "$H\.claude\projects" -Directory | ForEach-Object { $_.FullName }
Put 'clo' (Latest $claude -Filter '*.jsonl')

$agents = [ordered]@{}
foreach ($o in $last.Keys | Sort-Object) {
  $agents[$o] = [int64]([DateTimeOffset]$last[$o]).ToUnixTimeMilliseconds()
}
$body = @{ agents = $agents } | ConvertTo-Json -Compress

if ($DryRun) {
  foreach ($o in $agents.Keys) { "{0,-7} {1}" -f $o, $last[$o].ToLocalTime() }
  return
}

$token = [Environment]::GetEnvironmentVariable('OFFICE_TOKEN', 'User')
if (-not $token) { Write-Error 'OFFICE_TOKEN 환경변수가 없어요 — 설치.ps1 을 먼저 실행하세요.'; exit 1 }
$ErrorActionPreference = 'Stop'
Invoke-RestMethod -Uri $URL -Method Post -Body $body -ContentType 'application/json' -Headers @{ 'X-Office-Token' = $token } -TimeoutSec 20 | Out-Null
