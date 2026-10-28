param(
    [string]$NativeDir = "apps/ultra/build",
    [string]$StagedDir = "apps/ultra/src-tauri/target/x86_64-pc-windows-msvc/release",
    [string]$ResultsDir = "test-results/windows-master-resolver"
)
$ErrorActionPreference = "Stop"
$sourceDir = $PSScriptRoot
$results = [IO.Path]::GetFullPath($ResultsDir)
if (Test-Path $results) { throw "Refusing to overwrite existing results: $results" }
New-Item -ItemType Directory -Path $results | Out-Null
Start-Transcript -Path (Join-Path $results "report.txt") | Out-Null
try {
    $native = (Resolve-Path $NativeDir).Path
    $staged = (Resolve-Path $StagedDir).Path
    Write-Host "native=$native staged=$staged results=$results"
    Write-Host "rustc=$(rustc --version) cmake=$(cmake --version | Select-Object -First 1)"
    $build = Join-Path $results "build"
    & cmake -S $sourceDir -B $build -G "Visual Studio 17 2022" -A x64
    if ($LASTEXITCODE -ne 0) { throw "fixture CMake configure failed: $LASTEXITCODE" }
    & cmake --build $build --config Release
    if ($LASTEXITCODE -ne 0) { throw "fixture CMake build failed: $LASTEXITCODE" }

    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio/Installer/vswhere.exe"
    $vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($LASTEXITCODE -ne 0 -or !$vs) { throw "Visual Studio C++ tools not found" }
    $vcvars = Join-Path $vs "VC/Auxiliary/Build/vcvars64.bat"
    $rustc = (Get-Command rustc).Source
    $probe = Join-Path $results "master_resolver_probe.exe"
    $probeSource = Join-Path $sourceDir "master_resolver_probe.rs"
    $command = "call `"$vcvars`" >nul && `"$rustc`" --edition=2021 -C opt-level=2 `"$probeSource`" -L `"native=$native`" -o `"$probe`""
    & cmd.exe /d /s /c "`"$command`""
    if ($LASTEXITCODE -ne 0) { throw "probe compile failed: $LASTEXITCODE" }

    $failed = @()
    foreach ($case in @("real", "full", "old", "partial", "forwarded", "bad_limits")) {
        try {
            $dir = Join-Path $results $case
            New-Item -ItemType Directory -Path $dir | Out-Null
            Copy-Item $probe (Join-Path $dir "master_resolver_probe.exe")
            if ($case -eq "real") {
                Copy-Item (Join-Path $staged "ultra_native.dll") $dir
                foreach ($name in Get-Content (Join-Path $native "windows-runtime-libraries.txt")) {
                    if ($name -ne [IO.Path]::GetFileName($name)) { throw "Invalid runtime name: $name" }
                    Copy-Item (Join-Path $native $name) $dir
                }
            } else {
                Copy-Item (Join-Path $build "$case/ultra_native.dll") $dir
                if ($case -eq "forwarded") { Copy-Item (Join-Path $build "forwarded/master_forward_target.dll") $dir }
            }
            $dll = Join-Path $dir "ultra_native.dll"
            $sourceDll = if ($case -eq "real") { Join-Path $staged "ultra_native.dll" } else { Join-Path $build "$case/ultra_native.dll" }
            $sourceHash = (Get-FileHash -Algorithm SHA256 $sourceDll).Hash
            $stagedHash = (Get-FileHash -Algorithm SHA256 $dll).Hash
            Write-Host "source=$sourceDll SHA256=$sourceHash staged=$dll SHA256=$stagedHash"
            if ($sourceHash -ne $stagedHash) { throw "Staged DLL hash differs from source" }
            Get-FileHash -Algorithm SHA256 (Join-Path $dir "*.dll") | Format-Table -AutoSize | Out-String | Write-Host
            & (Join-Path $dir "master_resolver_probe.exe") $case $dll
            if ($LASTEXITCODE -ne 0) { throw "probe failed: $LASTEXITCODE" }
            Write-Host "PASS $case"
        } catch {
            Write-Host "FAIL $case : $_"
            $failed += $case
        }
    }
    if ($failed.Count) { throw "Fixture cases failed: $($failed -join ', ')" }
} finally {
    Stop-Transcript | Out-Null
}
