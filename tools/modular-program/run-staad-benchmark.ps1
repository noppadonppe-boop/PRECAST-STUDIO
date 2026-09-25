# Run using an approved execution context outside the restricted sandbox.
# Does not alter licensing, installation, system permissions or the source STD.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sourceStd = Join-Path $projectRoot 'output/staad-p7-p105/benchmark/BEAM_QA.STD'
$enginePath = 'C:/Program Files/Bentley/Engineering/STAAD.Pro 2023/STAAD/SProStaad/SProStaad.exe'
if (!(Test-Path -LiteralPath $enginePath)) { throw 'STAAD engine not found' }
$runFolder = Join-Path $projectRoot ('output/staad-p7-p105/benchmark-runs/' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runFolder | Out-Null
$inputPath = Join-Path $runFolder 'BEAM_QA.STD'
Copy-Item -LiteralPath $sourceStd -Destination $inputPath
$started = Get-Date
$job = Start-Process -FilePath $enginePath -ArgumentList ('STAAD "' + $inputPath + '" /s') -WorkingDirectory $runFolder -WindowStyle Hidden -PassThru
if (!$job.WaitForExit(30000)) { throw "STAAD still running PID=$($job.Id); inspect before retrying; directory=$runFolder" }
if ($job.ExitCode -ne 0) { throw "STAAD process exit $($job.ExitCode); directory=$runFolder" }
$anlPath = Join-Path $runFolder 'BEAM_QA.ANL'
$logPath = Join-Path $runFolder 'BEAM_QA.log'
foreach ($f in @($anlPath,$logPath)) {
 if (!(Test-Path -LiteralPath $f)) { throw "Missing result $f" }
 if ((Get-Item -LiteralPath $f).LastWriteTime -lt $started.AddSeconds(-2)) { throw 'Stale result' }
}
$analysis = Get-Content -LiteralPath $anlPath -Raw
$runLog = Get-Content -LiteralPath $logPath -Raw
if ($analysis -notmatch 'END OF THE STAAD.Pro RUN') { throw 'Missing completion marker' }
if ($runLog -notmatch 'Warning Count: 0, Error Count: 0') { throw 'Warnings or errors require review' }
& node (Join-Path $PSScriptRoot 'verify-staad-beam.mjs') $runFolder
if ($LASTEXITCODE -ne 0) { throw 'Numerical benchmark failed' }
