$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$archivePath = Join-Path $projectRoot 'output\Modular_ILU_R00.zip'
if (Test-Path -LiteralPath $archivePath) { throw 'Archive already exists; choose a versioned filename.' }
$archiveFiles = @()
$archiveFiles += Get-Item -LiteralPath (Join-Path $projectRoot 'MODULAR_ILU_R00.md')
$archiveFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot 'knowledge\modular-segments-r00') -File
$archiveFiles += Get-ChildItem -LiteralPath (Join-Path $projectRoot 'output\ilu-standard-r00') -File
$registryPath = Join-Path $projectRoot 'knowledge\modular-segments-r00\variant_register.json'
$registry = Get-Content -LiteralPath $registryPath -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($item in $registry) {
 if ($item.type -eq 'I') {
  $archiveFiles += Get-Item -LiteralPath ([System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $registryPath) $item.image)))
 }
}
$archiveFiles = $archiveFiles | Sort-Object -Property FullName -Unique
$zip = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
 foreach ($entryFile in $archiveFiles) {
  if (-not $entryFile.FullName.StartsWith($projectRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing outside project.' }
  $entryName = $entryFile.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $entryFile.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
 }
} finally { $zip.Dispose() }
$verify = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
 $entryCount = $verify.Entries.Count
 $pngCount = @($verify.Entries | Where-Object { $_.FullName.EndsWith('.png') }).Count
 foreach ($entry in $verify.Entries) {
  $entryStream = $entry.Open()
  try { $entryStream.CopyTo([System.IO.Stream]::Null) } finally { $entryStream.Dispose() }
 }
 if ($pngCount -ne 52) { throw "Expected 52 PNGs; got $pngCount." }
} finally { $verify.Dispose() }
$archiveInfo = Get-Item -LiteralPath $archivePath
[PSCustomObject]@{Path=$archivePath; Entries=$entryCount; PNGs=$pngCount; Bytes=$archiveInfo.Length; SHA256=(Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash} | ConvertTo-Json

