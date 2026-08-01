# Build ONLINE single-file HTML (CSS + JS inlined, Three.js/GSAP/fonts from CDN)
# Uses literal .Replace() to avoid PowerShell regex/$ substitution issues
# Usage: powershell -ExecutionPolicy Bypass -File build-online.ps1

$base = $PSScriptRoot

$html = [System.IO.File]::ReadAllText((Join-Path $base "index.html"))

# 1. Inline CSS (literal replace)
$css = [System.IO.File]::ReadAllText((Join-Path $base "css\style.css"))
$html = $html.Replace('<link rel="stylesheet" href="css/style.css">', "<style>`n$css`n</style>")

# 2. Inline all local JS files (literal replace)
$jsFiles = @("storage.js","firebase-config.js","cloud.js","scene.js","heartParticles.js","animations.js","sections.js","customizer.js","games.js","sync.js","app.js")
foreach ($jsFile in $jsFiles) {
    $js = [System.IO.File]::ReadAllText((Join-Path $base "js\$jsFile"))
    $html = $html.Replace("<script src=""js/$jsFile""></script>", "<script>`n$js`n</script>")
}

# 3. Disable service worker registration (keep code balanced - make it dead)
$html = $html.Replace("  // --- Service Worker for PWA ---`n  if ('serviceWorker' in navigator) {", "  // SW disabled in single-file build`n  if (false && 'serviceWorker' in navigator) {")

# Output
$outPath = Join-Path $base "our-love-story-online.html"
[System.IO.File]::WriteAllText($outPath, $html, [System.Text.UTF8Encoding]::new($false))
# GitHub Pages deploy copy (so the URL is clean: https://user.github.io/repo/)
[System.IO.File]::WriteAllText((Join-Path $base "index.html"), $html, [System.Text.UTF8Encoding]::new($false))
$size = (Get-Item -LiteralPath $outPath).Length
Write-Host "Created: $outPath"
Write-Host ("Size: {0:N1} KB" -f ($size / 1024))
