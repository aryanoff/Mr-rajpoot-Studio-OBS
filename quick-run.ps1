$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host "  MR RAJPOOT STUDIO OBS 24/7 - QUICK RUN" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Magenta
Write-Host ""

# --- Check Node ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed or is not on PATH."
    exit 1
}

$nodeVersion = node -v
Write-Host "Node: $nodeVersion" -ForegroundColor Green

if ($nodeVersion -notmatch '^v22\.') {
    Write-Warning "This project is currently standardized on Node 22 LTS."
    Write-Warning "Detected: $nodeVersion"
    Write-Warning "Continue only if you intentionally use a compatible environment."
}

# --- Check npm ---
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed or is not on PATH."
    exit 1
}

Write-Host "npm: $(npm -v)" -ForegroundColor Green

# --- Ensure dependencies ---
$viteEntry = Join-Path $Root "node_modules\vite\bin\vite.js"

if (-not (Test-Path $viteEntry)) {
    Write-Host ""
    Write-Host "Dependencies are missing/incomplete. Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed."
        exit $LASTEXITCODE
    }
}

# --- Verify Vite ---
if (-not (Test-Path $viteEntry)) {
    Write-Error "Vite is still missing after npm install."
    exit 1
}

Write-Host ""
Write-Host "Starting Vite development server..." -ForegroundColor Cyan
Write-Host "Keep this window open while testing the application." -ForegroundColor DarkYellow
Write-Host ""

npm run dev -- --host 127.0.0.1
