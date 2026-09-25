$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$folder=Join-Path $projectRoot 'output/staad-p7-p107'
$engine='C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe'
$runFolder=Join-Path $folder ('runs/'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runFolder | Out-Null
foreach($case in @('PLATE_SS_4','PLATE_SS_8','PLATE_SS_16')) {
 $inputPath=Join-Path $runFolder ($case+'.STD')
 Copy-Item -LiteralPath (Join-Path $folder ($case+'.STD')) -Destination $inputPath
 $job=Start-Process -FilePath $engine -ArgumentList ('STAAD "'+$inputPath+'" /s') -WorkingDirectory $runFolder -WindowStyle Hidden -PassThru
 if(!$job.WaitForExit(30000)){throw "Still running PID=$($job.Id) folder=$runFolder; do not restart"}
 if($job.ExitCode -ne 0){throw "Engine exit $($job.ExitCode)"}
 $log=Get-Content (Join-Path $runFolder ($case+'.log')) -Raw
 if($log -notmatch 'Warning Count: 0, Error Count: 0'){throw "Review errors/warnings: $case in $runFolder"}
}
Write-Output $runFolder
