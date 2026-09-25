$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$folder=Join-Path $projectRoot 'output/staad-p7-p147'
$engine='C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe'
$runFolder=Join-Path $folder ('runs/'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runFolder | Out-Null
Copy-Item -LiteralPath (Join-Path $folder 'spec.json') -Destination $runFolder
foreach($name in @('LOAD-METHOD-8','LOAD-METHOD-16','LOAD-METHOD-32')) {
 $inputPath=Join-Path $runFolder ($name+'.STD')
 Copy-Item -LiteralPath (Join-Path $folder ($name+'.STD')) -Destination $inputPath
 $started=Get-Date
 $job=Start-Process -FilePath $engine -ArgumentList ('STAAD "'+$inputPath+'" /s') -WorkingDirectory $runFolder -WindowStyle Hidden -PassThru
 if(!$job.WaitForExit(30000)){throw "Still running PID=$($job.Id) folder=$runFolder; do not restart"}
 if($job.ExitCode -ne 0){throw "Engine exit $($job.ExitCode)"}
 foreach($extension in @('.ANL','.log')) {if((Get-Item -LiteralPath (Join-Path $runFolder ($name+$extension))).LastWriteTime -lt $started.AddSeconds(-2)){throw 'Stale output'}}
 $log=Get-Content -LiteralPath (Join-Path $runFolder ($name+'.log')) -Raw
 if($log -notmatch 'Warning Count: 0, Error Count: 0'){throw "Review errors/warnings in $runFolder"}
}
Write-Output $runFolder
