param([string]$SourceFolder='output/staad-p7-p121',[string]$Basename='PM-I-C1-RIGID-REFERENCE')
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$folder=(Resolve-Path (Join-Path $projectRoot $SourceFolder)).Path
if(!$folder.StartsWith((Join-Path $projectRoot 'output')+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Source must be within project output'}
$engine='C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe'
$runFolder=Join-Path $folder ('runs/'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runFolder | Out-Null
if($Basename -notmatch '^[A-Za-z0-9-]+$'){throw 'Invalid input basename'}
$inputPath=Join-Path $runFolder ($Basename+'.STD')
Copy-Item -LiteralPath (Join-Path $folder ($Basename+'.STD')) -Destination $inputPath
Copy-Item -LiteralPath (Join-Path $folder 'study-spec.json') -Destination $runFolder
$job=Start-Process -FilePath $engine -ArgumentList ('STAAD "'+$inputPath+'" /s') -WorkingDirectory $runFolder -WindowStyle Hidden -PassThru
if(!$job.WaitForExit(30000)){throw "Still running PID=$($job.Id) folder=$runFolder; do not restart"}
if($job.ExitCode -ne 0){throw "Engine exit $($job.ExitCode) in $runFolder"}
$log=Get-Content (Join-Path $runFolder ($Basename+'.log')) -Raw
if($log -notmatch 'Warning Count: 0, Error Count: 0'){throw "Review errors/warnings in $runFolder"}
Write-Output $runFolder
