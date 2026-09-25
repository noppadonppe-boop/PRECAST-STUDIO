param([string]$SourceFolder='output/staad-p7-p148',[string]$RunRoot='')
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$candidate=if([IO.Path]::IsPathRooted($SourceFolder)){$SourceFolder}else{Join-Path $projectRoot $SourceFolder}
$folder=(Resolve-Path $candidate).Path
$engine='C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe'
$runBase=if($RunRoot){$RunRoot}else{Join-Path $folder 'runs'}
New-Item -ItemType Directory -Force -Path $runBase | Out-Null
$runFolder=Join-Path $runBase ([Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runFolder | Out-Null
Copy-Item -LiteralPath (Join-Path $folder 'spec.json') -Destination $runFolder
$names=@((Get-Content -LiteralPath (Join-Path $folder 'spec.json') -Raw | ConvertFrom-Json).cases.id)
foreach($name in $names) {
 $inputPath=Join-Path $runFolder ($name+'.STD');Copy-Item -LiteralPath (Join-Path $folder ($name+'.STD')) -Destination $inputPath
 $started=Get-Date;$job=Start-Process -FilePath $engine -ArgumentList ('STAAD "'+$inputPath+'" /s') -WorkingDirectory $runFolder -WindowStyle Hidden -PassThru
 if(!$job.WaitForExit(30000)){throw "Still running PID=$($job.Id) folder=$runFolder; do not restart"}
 if($job.ExitCode -ne 0){throw "Engine exit $($job.ExitCode): $name"}
 foreach($extension in @('.ANL','.log')){$f=Join-Path $runFolder ($name+$extension);if(!(Test-Path -LiteralPath $f)){throw "Missing $f"};if((Get-Item -LiteralPath $f).LastWriteTime -lt $started.AddSeconds(-2)){throw "Stale $f"}}
 if((Get-Content -LiteralPath (Join-Path $runFolder ($name+'.log')) -Raw) -notmatch 'Warning Count: 0, Error Count: 0'){throw "Review warnings/errors: $name"}
}
Write-Output $runFolder
