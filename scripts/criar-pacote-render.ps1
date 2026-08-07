# Gera ZIP limpo para GitHub/Render (sem node_modules, .next, banco local)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$destName = "CFS-2026-NOTAS-RENDER-v1.0.2"
$staging = Join-Path $env:TEMP $destName
$zipPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "$destName.zip"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

$excludeDirs = @('node_modules', '.next', '.git')
$excludeFiles = @('*.db', '*.db-wal', '*.db-shm', '.env', '.env.local')

Get-ChildItem -Path $root -Force | Where-Object {
    $_.Name -notin $excludeDirs
} | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($_.Name -eq 'data') {
            $dataDest = Join-Path $staging 'data'
            New-Item -ItemType Directory -Path $dataDest | Out-Null
            Copy-Item (Join-Path $root 'data\.gitkeep') $dataDest -ErrorAction SilentlyContinue
        } else {
            Copy-Item $_.FullName (Join-Path $staging $_.Name) -Recurse -Force
        }
    } else {
        Copy-Item $_.FullName $staging -Force
    }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force

Write-Host ""
Write-Host "Pacote criado:" -ForegroundColor Green
Write-Host $zipPath
Write-Host ""
Write-Host "Envie o conteudo do ZIP para a raiz do repositorio GitHub." -ForegroundColor Yellow
Write-Host "No Render: New -> Blueprint -> conecte o repo." -ForegroundColor Yellow
