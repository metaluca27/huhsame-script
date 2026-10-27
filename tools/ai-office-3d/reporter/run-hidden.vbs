' 보고원을 창 없이 실행 (작업 스케줄러가 3분마다 부름 — 검은 창이 번쩍이지 않게)
Dim here : here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run "pwsh -NoProfile -ExecutionPolicy Bypass -File """ & here & "\office-reporter.ps1""", 0, False
