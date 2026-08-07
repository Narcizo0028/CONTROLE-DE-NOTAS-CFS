# Copia pasta COMPLETA para a Area de Trabalho (com app/ visivel)
# Use esta pasta para git push — NAO use upload solto no GitHub
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path ([Environment]::GetFolderPath("Desktop")) "CFS-2026-PARA-GITHUB"

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null

$exclude = @('node_modules', '.next', '.git')

Get-ChildItem -Path $root -Force | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
  if ($_.PSIsContainer -and $_.Name -eq 'data') {
    $d = Join-Path $dest 'data'
    New-Item -ItemType Directory -Path $d | Out-Null
    if (Test-Path (Join-Path $root 'data\.gitkeep')) {
      Copy-Item (Join-Path $root 'data\.gitkeep') $d
    }
  } elseif ($_.PSIsContainer) {
    Copy-Item $_.FullName (Join-Path $dest $_.Name) -Recurse -Force
  } else {
    Copy-Item $_.FullName $dest -Force
  }
}

$appPath = Join-Path $dest 'app'
$appOk = Test-Path $appPath
$appFiles = if ($appOk) { (Get-ChildItem $appPath -Recurse -File).Count } else { 0 }

Write-Host ""
Write-Host "Pasta criada:" -ForegroundColor Green
Write-Host $dest
Write-Host ""
if ($appOk) {
  Write-Host "OK - pasta app/ existe com $appFiles arquivos" -ForegroundColor Green
} else {
  Write-Host "ERRO - pasta app/ NAO foi criada!" -ForegroundColor Red
  exit 1
}
Write-Host ""
Write-Host "Proximo passo - abra o Explorer nesta pasta e confirme a pasta amarela 'app'." -ForegroundColor Yellow
Write-Host "Depois execute (se tiver Git instalado):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  cd `"$dest`"" -ForegroundColor Cyan
Write-Host "  git init" -ForegroundColor Cyan
Write-Host "  git add ." -ForegroundColor Cyan
Write-Host "  git commit -m `"CFS 2026 estrutura completa`"" -ForegroundColor Cyan
Write-Host "  git branch -M main" -ForegroundColor Cyan
Write-Host "  git remote add origin https://github.com/Narcizo0028/CONTROLE-DE-NOTAS-CFS.git" -ForegroundColor Cyan
Write-Host "  git push -u origin main --force" -ForegroundColor Cyan
Write-Host ""

explorer $dest
