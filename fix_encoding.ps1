
$path = "app/coach/page.tsx"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$content = $content -replace 'Ã rea', 'Área'
$content = $content -replace 'Ã§Ã£o', 'ção'
$content = $content -replace 'Ãµes', 'ões'
$content = $content -replace 'Ã¡', 'á'
$content = $content -replace 'Ã©', 'é'
$content = $content -replace 'Ã­', 'í'
$content = $content -replace 'Ã³', 'ó'
$content = $content -replace 'Ãº', 'ú'
$content = $content -replace 'Ãª', 'ê'
$content = $content -replace 'Ã¢', 'â'
$content = $content -replace 'Ã§', 'ç'
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
