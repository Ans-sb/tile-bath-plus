$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "sketchup-extension"
$stage = Join-Path $root "tmp\sketchup-rbz"
$downloads = Join-Path $root "downloads"
$zipPath = Join-Path $downloads "jajaego-sketchup-local.zip"
$rbzPath = Join-Path $downloads "jajaego-sketchup-local.rbz"

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
New-Item -ItemType Directory -Path $downloads -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $source "jajaego_sketchup.rb") -Destination $stage
Copy-Item -LiteralPath (Join-Path $source "jajaego_sketchup") -Destination $stage -Recurse

if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
if (Test-Path -LiteralPath $rbzPath) { Remove-Item -LiteralPath $rbzPath -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -CompressionLevel Optimal
Move-Item -LiteralPath $zipPath -Destination $rbzPath

Write-Output "Built: $rbzPath"
