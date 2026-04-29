
$path = "app/coach/page.tsx"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Lista de correções para codificação dupla e simples
$map = @{
    'ÃƒÂ§ÃƒÂµes' = 'ções'
    'ÃƒÂ§ÃƒÂ£o'  = 'ção'
    'ÃƒÂ¡'       = 'á'
    'ÃƒÂ©'       = 'é'
    'ÃƒÂ­'       = 'í'
    'ÃƒÂ³'       = 'ó'
    'ÃƒÂº'       = 'ú'
    'ÃƒÂ¢'       = 'â'
    'ÃƒÂª'       = 'ê'
    'ÃƒÂ´'       = 'ô'
    'ÃƒÂ£'       = 'ã'
    'ÃƒÂµ'       = 'õ'
    'ÃƒÂ§'       = 'ç'
    'Ãƒâ€¡'      = 'Ç'
    'ÃƒÆ’'      = 'Ã'
    'Ãƒâ€°'      = 'É'
    'ÃƒÂ'       = 'à'
    'Ã§Ãµes'     = 'ções'
    'Ã§Ã£o'      = 'ção'
    'Ã¡'         = 'á'
    'Ã©'         = 'é'
    'Ã­'         = 'í'
    'Ã³'         = 'ó'
    'Ãº'         = 'ú'
    'Ã¢'         = 'â'
    'Ãª'         = 'ê'
    'Ã´'         = 'ô'
    'Ã£'         = 'ã'
    'Ãµ'         = 'õ'
    'Ã§'         = 'ç'
    'Ã rea'      = 'Área'
    'Ã“timo'     = 'Ótimo'
    'PÃ©ssimo'   = 'Péssimo'
    'MÃ©dia'     = 'Média'
    'DistÃ¢ncia' = 'Distância'
    'ReferÃªncia'= 'Referência'
    'Ã ndice'    = 'Índice'
    'disponÃ­vel'= 'disponível'
    'MÃ³dulo'    = 'Módulo'
    'AvaliaÃ§Ãµes' = 'Avaliações'
    'PeriodizaÃ§Ã£o' = 'Periodização'
    'PrescriÃ§Ã£o' = 'Prescrição'
    'SolicitaÃ§Ãµes' = 'Solicitações'
    'EstÃ¡vel'   = 'Estável'
}

foreach ($key in $map.Keys) {
    $content = $content.Replace($key, $map[$key])
}

[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
