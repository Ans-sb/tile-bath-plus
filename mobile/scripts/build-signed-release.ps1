$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $mobileRoot "android"
$keyPropertiesPath = Join-Path $androidRoot "keystore.properties"

if (-not (Test-Path $keyPropertiesPath)) {
    throw "Android signing metadata was not found: $keyPropertiesPath"
}

Write-Host ""
Write-Host "JAJAEGO signed Android release build" -ForegroundColor Cyan
Write-Host "The signing password is used only for this process and is not saved." -ForegroundColor Yellow
Write-Host ""

$password = Read-Host "Enter the upload signing password" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new("", $password).Password

try {
    if (-not $plainPassword) {
        throw "The signing password is required."
    }

    $env:JAJAEGO_KEYSTORE_PASSWORD = $plainPassword
    $env:JAJAEGO_KEY_PASSWORD = $plainPassword

    & (Join-Path $PSScriptRoot "build-android.ps1") -Variant release
    if ($LASTEXITCODE -ne 0) {
        throw "The signed Android release build failed."
    }
} finally {
    $env:JAJAEGO_KEYSTORE_PASSWORD = $null
    $env:JAJAEGO_KEY_PASSWORD = $null
    $plainPassword = $null
    $password = $null
}
