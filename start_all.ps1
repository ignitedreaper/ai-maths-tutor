# ============================================================
# MathTutor + Local MathsLLM Startup Script
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  MATH TUTOR - Starting Local LLM & Web App" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MathsLLMDir = "C:\Users\K.Manoj kumar\OneDrive\Desktop\MathsLLM"
$VenvPython = Join-Path $MathsLLMDir ".venv\Scripts\python.exe"

# 1. Check / Start FastAPI Backend on Port 8000
$backendRunning = $false
try {
    $res = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop
    if ($res.status -eq "ok") {
        $backendRunning = $true
        Write-Host "[1/2] Local MathsLLM backend is already running on port 8000." -ForegroundColor Green
    }
} catch {
    $backendRunning = $false
}

if (-not $backendRunning) {
    Write-Host "[1/2] Starting Local MathsLLM backend (port 8000)..." -ForegroundColor Yellow
    $backendCmd = "cd '$MathsLLMDir'; & '$VenvPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
    Write-Host "       Waiting for model to load into GPU..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 10
}

# 2. Start Next.js Frontend
Write-Host "[2/2] Starting Next.js frontend (port 3000)..." -ForegroundColor Green
cd $CurrentDir
npm run dev
