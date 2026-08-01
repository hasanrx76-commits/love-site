# Fix: reconstruct source index.html (with external css/js refs) from the built single-file html
$base = $PSScriptRoot
$path = Join-Path $base "index.html"
$src = [System.IO.File]::ReadAllText($path)

# 1. Replace the inline <style>...</style> block with the external stylesheet link
$src = [regex]::Replace($src, '(?s)<style>\r?\n.*?\r?\n</style>', '<link rel="stylesheet" href="css/style.css">', 1)

# 2. Replace inline <script>...</script> blocks (in order) with external script tags
$files = @("storage.js","firebase-config.js","cloud.js","scene.js","heartParticles.js","animations.js","sections.js","customizer.js","games.js","sync.js","app.js")
$i = 0
$src = [regex]::Replace($src, '(?s)<script>\r?\n.*?\r?\n</script>', {
    param($m)
    if ($script:i -lt $files.Count) {
        $tag = '<script src="js/' + $files[$script:i] + '"></script>'
        $script:i++
        return $tag
    }
    return $m.Value
})

[System.IO.File]::WriteAllText($path, $src, [System.Text.UTF8Encoding]::new($false))
Write-Host "Fixed index.html - script refs written: $i"
