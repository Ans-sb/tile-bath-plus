param(
    [string]$KeyAlias = "jajaego-upload",
    [string]$DistinguishedName = "CN=JAJAEGO, OU=Mobile, O=JAJAEGO, L=Seoul, ST=Seoul, C=KR"
)

$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $mobileRoot
$androidRoot = Join-Path $mobileRoot "android"
$defaultJavaHome = Join-Path $env:LOCALAPPDATA "JajaegoMobileTools\jdk21\jdk-21.0.11+10"
$signingRoot = Join-Path $env:USERPROFILE ".jajaego\signing"
$keyStorePath = Join-Path $signingRoot "jajaego-upload.jks"
$keyPropertiesPath = Join-Path $androidRoot "keystore.properties"

if (-not $env:JAVA_HOME -and (Test-Path (Join-Path $defaultJavaHome "bin\keytool.exe"))) {
    $env:JAVA_HOME = $defaultJavaHome
}

$keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
if (-not $env:JAVA_HOME -or -not (Test-Path $keytool)) {
    throw "Java keytool was not found. Set JAVA_HOME to the JDK 21 directory."
}

if (Test-Path $keyStorePath) {
    throw "The upload key already exists and was not overwritten: $keyStorePath"
}

Write-Host ""
Write-Host "JAJAEGO Android upload signing key" -ForegroundColor Cyan
Write-Host "This password is not saved. Keep it in a secure password manager." -ForegroundColor Yellow
Write-Host "Use at least 12 characters with letters, numbers, and symbols." -ForegroundColor Yellow
Write-Host ""

$password = Read-Host "Enter a new signing password" -AsSecureString
$passwordConfirm = Read-Host "Enter the same password again" -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new("", $password).Password
$plainPasswordConfirm = [System.Net.NetworkCredential]::new("", $passwordConfirm).Password

try {
    if ($plainPassword.Length -lt 12) {
        throw "The signing password must be at least 12 characters."
    }
    if ($plainPassword -cne $plainPasswordConfirm) {
        throw "The two passwords do not match."
    }

    New-Item -ItemType Directory -Path $signingRoot -Force | Out-Null
    $env:JAJAEGO_KEYSTORE_PASSWORD = $plainPassword
    $env:JAJAEGO_KEY_PASSWORD = $plainPassword

    & $keytool `
        -genkeypair `
        -v `
        -keystore $keyStorePath `
        -storetype JKS `
        -alias $KeyAlias `
        -keyalg RSA `
        -keysize 4096 `
        -validity 10000 `
        -dname $DistinguishedName `
        -storepass:env JAJAEGO_KEYSTORE_PASSWORD `
        -keypass:env JAJAEGO_KEY_PASSWORD

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $keyStorePath)) {
        throw "Android upload key generation failed."
    }

    $gradleStorePath = $keyStorePath.Replace("\", "/")
    @"
# Local release signing metadata. Passwords are never stored here.
storeFile=$gradleStorePath
keyAlias=$KeyAlias
"@ | Set-Content -LiteralPath $keyPropertiesPath -Encoding ASCII

    Write-Host ""
    Write-Host "Upload key created. Building the signed release bundle..." -ForegroundColor Green
    & (Join-Path $PSScriptRoot "build-android.ps1") -Variant release
    if ($LASTEXITCODE -ne 0) {
        throw "The release bundle build failed."
    }

    Write-Host ""
    Write-Host "Signing setup completed." -ForegroundColor Green
    Write-Host "Key: $keyStorePath"
    Write-Host "Bundle: $(Join-Path $projectRoot 'outputs\mobile\jajaego-release.aab')"
    Write-Host ""
    Write-Host "Back up the .jks file and password separately before Play Console upload." -ForegroundColor Yellow
} finally {
    $env:JAJAEGO_KEYSTORE_PASSWORD = $null
    $env:JAJAEGO_KEY_PASSWORD = $null
    $plainPassword = $null
    $plainPasswordConfirm = $null
    $password = $null
    $passwordConfirm = $null
}
