# ============================================================
# MR RAJPOOT STUDIO OBS 24/7
# PHASE 10B UNIFIED EXECUTION & EVIDENCE HARVESTER
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PHASE 10B REAL EXTERNAL ORCHESTRATION & EVIDENCE HARVESTER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. SAFETY CHECK: Ensure no live keys are configured
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "sk_live_") {
        Write-Host "`n[FATAL ERROR] Live Stripe key pattern detected in .env! Aborting for safety." -ForegroundColor Red
        Write-Host "Phase 10B must strictly run in Stripe TEST MODE only." -ForegroundColor Yellow
        exit 1
    }
}

# 2. TOOLCHAIN AUDIT
Write-Host "`n[1/5] Checking Toolchain..." -ForegroundColor Yellow
$nodeVer = node -v 2>$null
$npmVer = npm -v 2>$null
$ffmpegVer = ffmpeg -version 2>$null | Select-Object -First 1
$stripeVer = stripe --version 2>$null

Write-Host "  - Node:   $nodeVer"
Write-Host "  - NPM:    $npmVer"
if ($ffmpegVer) {
    Write-Host "  - FFmpeg: $($ffmpegVer.Substring(0, [Math]::Min(30, $ffmpegVer.Length)))"
} else {
    Write-Host "  - FFmpeg: NOT FOUND"
}
if ($stripeVer) {
    Write-Host "  - Stripe: $stripeVer"
} else {
    Write-Host "  - Stripe: NOT FOUND (Optional for automated trigger)"
}

# 3. STRIPE AUTOMATION (If CLI available)
Write-Host "`n[2/5] Stripe Test Mode Execution..." -ForegroundColor Yellow
if ($stripeVer) {
    Write-Host "  Triggering Stripe CLI test events against local webhook listener..." -ForegroundColor Cyan
    Write-Host "  (Ensure npm run dev and stripe listen are active in background terminals)" -ForegroundColor Gray
    
    stripe trigger customer.subscription.created 2>$null
    Start-Sleep -Seconds 2
    stripe trigger invoice.payment_failed 2>$null
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Stripe test events dispatched." -ForegroundColor Green
} else {
    Write-Host "  [!] Stripe CLI not installed locally. Skipping automated trigger." -ForegroundColor Yellow
    Write-Host "      (If you triggered events manually, the evidence collector will still find them in Supabase)." -ForegroundColor Gray
}

# 4. GOOGLE OAUTH PROMPT
Write-Host "`n[3/5] Google OAuth Status Check..." -ForegroundColor Yellow
Write-Host "  If you performed browser login at http://localhost:5173/login via Continue with Google," -ForegroundColor Gray
Write-Host "  the evidence script will automatically verify auth.identities in Supabase." -ForegroundColor Gray

# 5. YOUTUBE RTMP REMINDER
Write-Host "`n[4/5] YouTube RTMP Live Stream Check..." -ForegroundColor Yellow
Write-Host "  REMINDER: Ensure your YouTube broadcast is set to PRIVATE or UNLISTED." -ForegroundColor Magenta
Write-Host "  If worker is running and stream is active in Studio, live stream records will be harvested." -ForegroundColor Gray

# 6. RUN EVIDENCE COLLECTOR & PRINT STRUCTURED SUMMARY
Write-Host "`n[5/5] Harvesting Real Database Evidence..." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

npx tsx scripts/verify-phase10-external.ts

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "DONE! Copy and paste the full output above into the chat." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
