param(
    [ValidateSet("debug", "release")]
    [string]$Variant = "debug"
)

$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $mobileRoot
$androidRoot = Join-Path $mobileRoot "android"
$defaultJavaHome = Join-Path $env:LOCALAPPDATA "JajaegoMobileTools\jdk21\jdk-21.0.11+10"
$defaultAndroidHome = Join-Path $env:LOCALAPPDATA "Android\Sdk"

if (-not $env:JAVA_HOME -and (Test-Path (Join-Path $defaultJavaHome "bin\java.exe"))) {
    $env:JAVA_HOME = $defaultJavaHome
}
if (-not $env:ANDROID_HOME -and (Test-Path $defaultAndroidHome)) {
    $env:ANDROID_HOME = $defaultAndroidHome
}
if (-not $env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    throw "Java 21 was not found. Set JAVA_HOME before building."
}
if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    throw "Android SDK was not found. Set ANDROID_HOME before building."
}

Push-Location $mobileRoot
try {
    npm.cmd run sync
} finally {
    Pop-Location
}

Push-Location $androidRoot
try {
    if ($Variant -eq "release") {
        .\gradlew.bat bundleRelease
        if ($LASTEXITCODE -ne 0) {
            throw "Android release build failed with exit code $LASTEXITCODE."
        }
        $source = Join-Path $androidRoot "app\build\outputs\bundle\release\app-release.aab"
        $destinationName = "jajaego-release.aab"
    } else {
        .\gradlew.bat assembleDebug
        if ($LASTEXITCODE -ne 0) {
            throw "Android debug build failed with exit code $LASTEXITCODE."
        }
        $source = Join-Path $androidRoot "app\build\outputs\apk\debug\app-debug.apk"
        $destinationName = "jajaego-debug.apk"
    }
} finally {
    Pop-Location
}

if (-not (Test-Path $source)) {
    throw "Android build output was not created: $source"
}

$outputDir = Join-Path $projectRoot "outputs\mobile"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$destination = Join-Path $outputDir $destinationName
Copy-Item -LiteralPath $source -Destination $destination -Force

$artifact = Get-Item -LiteralPath $destination
$hash = Get-FileHash -LiteralPath $destination -Algorithm SHA256

Write-Output "BUILD_OK=$($artifact.FullName)"
Write-Output "SIZE_BYTES=$($artifact.Length)"
Write-Output "SHA256=$($hash.Hash)"
