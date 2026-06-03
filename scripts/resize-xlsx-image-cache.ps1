param(
  [string]$CacheDir = "tmp\xlsx-image-cache",
  [int]$Size = 92
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path ".").Path
$sourceDir = Join-Path $root $CacheDir
$thumbDir = Join-Path $sourceDir "thumbs"
New-Item -ItemType Directory -Force -Path $thumbDir | Out-Null

$files = Get-ChildItem -LiteralPath $sourceDir -Filter "*.image" -File
$total = $files.Count
$done = 0
$success = 0
$failed = 0

foreach ($file in $files) {
  $done += 1
  $target = Join-Path $thumbDir ($file.BaseName + ".png")
  if (Test-Path -LiteralPath $target) {
    $success += 1
    if (($done % 500) -eq 0) { Write-Host "[thumb] $done/$total" }
    continue
  }

  $stream = $null
  $image = $null
  $bitmap = $null
  $graphics = $null
  try {
    $stream = [System.IO.File]::OpenRead($file.FullName)
    $image = [System.Drawing.Image]::FromStream($stream, $false, $false)
    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F6F8F9"))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $scale = [Math]::Min($Size / $image.Width, $Size / $image.Height)
    $width = [Math]::Max(1, [Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [Math]::Round($image.Height * $scale))
    $left = [Math]::Round(($Size - $width) / 2)
    $top = [Math]::Round(($Size - $height) / 2)
    $graphics.DrawImage($image, $left, $top, $width, $height)
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $success += 1
  } catch {
    $failed += 1
  } finally {
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($image) { $image.Dispose() }
    if ($stream) { $stream.Dispose() }
  }

  if (($done % 500) -eq 0) { Write-Host "[thumb] $done/$total" }
}

Write-Host "[thumb] completed total=$total success=$success failed=$failed dir=$thumbDir"
