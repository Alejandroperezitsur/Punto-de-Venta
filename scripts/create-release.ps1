# Script para crear GitHub Release con instalador
# Ejecutar despues de autenticar con: gh auth login

$ErrorActionPreference = "Stop"

$tag = "v1.0.0"
$title = "POS Pro v1.0.0"
$installer = "dist-electron\POS Pro Setup 1.0.0.exe"

if (-not (Test-Path $installer)) {
    Write-Host "ERROR: No se encontro el instalador en $installer" -ForegroundColor Red
    Write-Host "Ejecuta primero: npm run build:desktop:win" -ForegroundColor Yellow
    exit 1
}

Write-Host "Creando release $tag..." -ForegroundColor Cyan

$notes = @"
## POS Pro v1.0.0 - Instalador Windows

### Instalacion
1. Descargar ``POS Pro Setup 1.0.0.exe``
2. Ejecutar el instalador
3. Seguir el asistente de instalacion
4. Abrir POS Pro desde el escritorio o menu inicio

### Credenciales por defecto (modo offline)
- **Admin:** admin / admin123
- **Cajero:** cajero / cajero123
- **Supervisor:** supervisor / super123

### Que incluye
- Sistema completo de punto de venta
- Modo offline-first
- Caja, inventario, clientes, reportes
- Soporte PWA y Electron

### Requisitos
- Windows 10 o superior
- 4 GB RAM minimum
- 200 MB espacio en disco

---
Desarrollado por **Alejandro Perez Vasquez** - APV Labs
"@

# Crear tag si no existe
$existingTag = git tag -l $tag 2>$null
if (-not $existingTag) {
    git tag -a $tag -m "Release $tag"
    git push origin $tag
    Write-Host "Tag $tag creado y pushed" -ForegroundColor Green
}

# Crear release con gh
gh release create $tag $installer --title $title --notes $notes --latest

Write-Host ""
Write-Host "Release creado exitosamente!" -ForegroundColor Green
Write-Host "Los usuarios pueden descargar desde:" -ForegroundColor Cyan
Write-Host "https://github.com/Alejandroperezitsur/Punto-de-Venta/releases/latest" -ForegroundColor Yellow
