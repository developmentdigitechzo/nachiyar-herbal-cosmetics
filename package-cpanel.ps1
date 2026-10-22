$ErrorActionPreference = "Stop"

$destination = "nachiyar-herbals-cpanel.zip"
if (Test-Path $destination) {
    Remove-Item $destination -Force
}

$items = @()
Get-ChildItem -Path . -Filter "*.html" | ForEach-Object { $items += $_.Name }
Get-ChildItem -Path . -Filter "*.css" | ForEach-Object { $items += $_.Name }
Get-ChildItem -Path . -Filter "favicon.*" | ForEach-Object { $items += $_.Name }
$items += "app.js"
$items += "server.js"
if (Test-Path "customer-account.js") { $items += "customer-account.js" }
if (Test-Path "admin.js") { $items += "admin.js" }
if (Test-Path "view-reviews.js") { $items += "view-reviews.js" }
if (Test-Path "sitemap.xml") { $items += "sitemap.xml" }
if (Test-Path "robots.txt") { $items += "robots.txt" }
$items += "package.json"
if (Test-Path ".htaccess") { $items += ".htaccess" }
if (Test-Path ".env") { $items += ".env" }
if (Test-Path "firebase-config.js") { $items += "firebase-config.js" }
if (Test-Path ".env.production") { $items += ".env.production" }
if (Test-Path ".env.development") { $items += ".env.development" }
if (Test-Path "assets") { $items += "assets" }
if (Test-Path "data") { $items += "data" }
if (Test-Path "uploads") { $items += "uploads" }
if (Test-Path "server") { $items += "server" }
if (Test-Path "node_modules") { $items += "node_modules" }

Write-Host "Compressing $($items.Count) files/folders into $destination with tar..."
& tar.exe -a -cf $destination @items

if (Test-Path $destination) {
    $zip = Get-Item $destination
    $sizeMb = [math]::Round(($zip.Length / 1MB), 2)
    Write-Host "SUCCESS: $destination created! Size: $sizeMb MB"
} else {
    Write-Error "Failed to create $destination"
}
