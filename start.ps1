# Lancer l’API FastAPI et l’application Angular dans deux fenêtres.
$root = $PSScriptRoot
$candidates = @(
    (Join-Path $root ".venv\Scripts\python.exe"),
    (Join-Path $root ".venv-cpython\Scripts\python.exe")
)
$python = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $python) {
    Write-Host "Environnement Python introuvable. Créez-le avec : python -m venv .venv" -ForegroundColor Red
    Write-Host "Puis installez les dépendances : .venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm est introuvable. Installez Node.js et pnpm, puis relancez le script." -ForegroundColor Red
    exit 1
}
$apiCommand = "Set-Location -LiteralPath '$root'; & '$python' -m uvicorn api.main:app --reload --port 8000"
$webRoot = Join-Path $root "frontend"
$webCommand = "Set-Location -LiteralPath '$webRoot'; pnpm start"
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $apiCommand)
Start-Sleep -Seconds 2
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $webCommand)
Write-Host "API : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Site: http://localhost:4200" -ForegroundColor Cyan
Write-Host "Gardez les deux fenêtres PowerShell ouvertes."

