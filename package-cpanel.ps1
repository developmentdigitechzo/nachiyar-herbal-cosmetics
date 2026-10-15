$ErrorActionPreference = "Stop"

$destination = "nachiyar-herbals-cpanel.zip"
if (Test-Path $destination) {
    Remove-Item $destination -Force
}

$items = @()
Get-ChildItem -Path . -Filter "*.html" | ForEach-Object { $items += $_.FullName }
Get-ChildItem -Path . -Filter "*.css" | ForEach-Object { $items += $_.FullName }
Get-ChildItem -Path . -Filter "favicon.*" | ForEach-Object { $items += $_.FullName }
$items += (Get-Item "app.js").FullName
$items += (Get-Item "server.js").FullName
if (Test-Path "customer-account.js") { $items += (Get-Item "customer-account.js").FullName }
if (Test-Path "admin.js") { $items += (Get-Item "admin.js").FullName }
$items += (Get-Item "package.json").FullName
if (Test-Path ".env.production") { $items += (Get-Item ".env.production").FullName }
if (Test-Path ".env.development") { $items += (Get-Item ".env.development").FullName }
if (Test-Path "assets") { $items += (Get-Item "assets").FullName }
if (Test-Path "server") { $items += (Get-Item "server").FullName }
if (Test-Path "node_modules") { $items += (Get-Item "node_modules").FullName }

Write-Host "Compressing $($items.Count) files/folders into $destination..."
Compress-Archive -Path $items -DestinationPath $destination -CompressionLevel Optimal -Force

$zip = Get-Item $destination
$sizeMb = [math]::Round(($zip.Length / 1MB), 2)
Write-Host "SUCCESS: $destination created! Size: $sizeMb MB"
