param(
    [Parameter(Mandatory)] [string]$Vcvars,
    [Parameter(Mandatory)] [string]$Rustc,
    [Parameter(Mandatory)] [string]$ProbeSource,
    [Parameter(Mandatory)] [string]$Native,
    [Parameter(Mandatory)] [string]$Probe
)

# Feed commands on stdin to keep vcvars and rustc in one cmd process without /c quoting.
$commands = @(
    'echo launcher-diagnostic vcvars-start',
    "call `"$Vcvars`"",
    'set "launcher_exit=%errorlevel%"',
    'echo launcher-diagnostic vcvars-exit=%launcher_exit%',
    'if not "%launcher_exit%"=="0" exit /b %launcher_exit%',
    'echo launcher-diagnostic rustc-start',
    "`"$Rustc`" --edition=2021 -C opt-level=2 `"$ProbeSource`" -L `"native=$Native`" -o `"$Probe`"",
    'set "launcher_exit=%errorlevel%"',
    'echo launcher-diagnostic rustc-exit=%launcher_exit%',
    'exit /b %launcher_exit%'
)
Write-Host "launcher-diagnostic input:"
$commands | ForEach-Object { Write-Host $_ }
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = $env:ComSpec
$info.Arguments = '/d /q'
$info.UseShellExecute = $false
$info.RedirectStandardInput = $true
# Inherit output handles: redirected output pipes could fill and block cmd.
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
$started = $false
$cleanupPending = $false
$clock = [Diagnostics.Stopwatch]::StartNew()
try {
    $started = $process.Start()
    if (!$started) { throw 'cmd start returned false' }
    Write-Host "launcher-diagnostic cmd-pid=$($process.Id)"
    $inputText = ($commands -join "`r`n") + "`r`n"
    $write = $process.StandardInput.WriteAsync($inputText)
    $remaining = [Math]::Max(0, 45000 - [int]$clock.ElapsedMilliseconds)
    if (!$write.Wait($remaining)) { throw 'stdin write timed out' }
    $flush = $process.StandardInput.FlushAsync()
    $remaining = [Math]::Max(0, 45000 - [int]$clock.ElapsedMilliseconds)
    if (!$flush.Wait($remaining)) { throw 'stdin flush timed out' }
    $remaining = [Math]::Max(0, 45000 - [int]$clock.ElapsedMilliseconds)
    if (!$process.WaitForExit($remaining)) { throw 'cmd timed out' }
    Write-Host "launcher-diagnostic cmd-exit=$($process.ExitCode) probe-exists=$(Test-Path -LiteralPath $Probe)"
    if ($process.ExitCode -ne 0) { throw "probe compile failed: $($process.ExitCode)" }
    if (!(Test-Path -LiteralPath $Probe -PathType Leaf)) { throw 'probe compile produced no output' }
} catch {
    Write-Host "launcher-diagnostic error: $_"
    throw
} finally {
    if ($started -and !$process.HasExited) {
        try {
            # Run tree termination separately so cleanup itself has a finite wait.
            $method = [Diagnostics.Process].GetMethod('Kill', [type[]]@([bool]))
            $call = [Linq.Expressions.Expression]::Call(
                [Linq.Expressions.Expression]::Constant($process), $method,
                [Linq.Expressions.Expression[]]@([Linq.Expressions.Expression]::Constant($true)))
            $kill = [Linq.Expressions.Expression]::Lambda([Action], $call, [Linq.Expressions.ParameterExpression[]]@()).Compile()
            $cleanup = [Threading.Tasks.Task]::Run($kill)
            $cleanupPending = !$cleanup.Wait(5000)
            if ($cleanupPending) { Write-Host 'launcher-diagnostic cleanup timed out' }
            else { Write-Host 'launcher-diagnostic tree termination requested' }
        } catch {
            Write-Host "launcher-diagnostic cleanup error: $_"
        }
    }
    if (!$cleanupPending) { $process.Dispose() }
}
