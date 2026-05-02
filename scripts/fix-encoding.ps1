# WMPS — Correção Global de Encoding (UTF-8 Mojibake → pt-BR correto)
# Executa substituição de todos os padrões corrompidos conhecidos

$files = @(
  "app\admin\actions.ts",
  "app\admin\page.tsx",
  "app\athlete\page.tsx",
  "app\coach\page.tsx",
  "app\components\EvolutionModule.tsx",
  "app\components\ForcePasswordReset.tsx",
  "app\components\ForecastModule.tsx",
  "app\components\PeriodizationWizard.tsx",
  "app\components\WhatIfSimulator.tsx",
  "app\actions.ts",
  "app\page.tsx",
  "lib\periodization-engine.ts",
  "scratch\fix-safe.js",
  "scratch\full-qa-test.ts",
  "scratch\simulador-lesoes.js",
  "scratch\simulador-wmps.js",
  "scratch\test-load-engine.ts",
  "scripts\post-deploy-test.js",
  "scripts\simulate-risk.ts"
)

# Mapa completo: mojibake → UTF-8 correto (pt-BR)
# Gerado a partir do padrão Latin-1/Windows-1252 lido como UTF-8
$replacements = [ordered]@{
  # === SEQUÊNCIAS DE 3+ CHARS (mais específicas primeiro) ===
  'AVALIAÃ‡Ã•ES'       = 'AVALIAÇÕES'
  'PERIODIZAÃ‡ÃƒO'    = 'PERIODIZAÇÃO'
  'PRESCRIÃ‡ÃƒO'      = 'PRESCRIÇÃO'
  'SOLICITAÃ‡Ã•ES'    = 'SOLICITAÇÕES'
  'MANIFESTAÃ‡Ã•ES'   = 'MANIFESTAÇÕES'
  'MANIFESTAÃ‡ÃƒO'    = 'MANIFESTAÇÃO'
  'PERIODIZAÃ‡Ã•ES'   = 'PERIODIZAÇÕES'
  'CONFIGURAÃ‡Ã•ES'   = 'CONFIGURAÇÕES'
  'CONFIGURAÃ‡ÃƒO'    = 'CONFIGURAÇÃO'
  'NOTIFICAÃ‡Ã•ES'    = 'NOTIFICAÇÕES'
  'NOTIFICAÃ‡ÃƒO'     = 'NOTIFICAÇÃO'
  'GERAÃ‡ÃƒO'         = 'GERAÇÃO'
  'POPULAÃ‡ÃƒO'       = 'POPULAÇÃO'
  'CLASSIFICA'        = 'CLASSIFICA'   # mantém, verificar abaixo
  'FORMAÃ‡ÃƒO'        = 'FORMAÇÃO'
  'INFORMAÃ‡ÃƒO'      = 'INFORMAÇÃO'
  'SELEÃ‡ÃƒO'         = 'SELEÇÃO'
  'PROGRESSÃ•ES'      = 'PROGRESSÕES'
  'SESSÃ•ES'          = 'SESSÕES'
  'REPETIÃ‡Ã•ES'      = 'REPETIÇÕES'
  'FUNÃ‡Ã•ES'         = 'FUNÇÕES'
  'INFORMA'           = 'INFORMA'
  'CONDIÃ‡Ã•ES'       = 'CONDIÇÕES'
  'CONDIÃƒO'          = 'CONDIÇÃO'
  'EXCLUÃ­DO'         = 'EXCLUÍDO'
  'EXCLUSÃ•ES'        = 'EXCLUSÕES'
  'ATLETAS'           = 'ATLETAS'
  'INTERVENÃ‡Ã•ES'    = 'INTERVENÇÕES'
  'SOLUÃ‡Ã•ES'        = 'SOLUÇÕES'

  # === PALAVRAS COMUNS CORROMPIDAS ===
  'PÃ"S-TREINO'        = 'PÓS-TREINO'
  'PÃ³s-Treino'       = 'Pós-Treino'
  'PÃ³s-treino'       = 'Pós-treino'
  'PRONTUÃ\x81RIO'    = 'PRONTUÁRIO'
  'ProntuÃ¡rio'       = 'Prontuário'
  'PREVISÃƒO'         = 'PREVISÃO'
  'PrevisÃ£o'         = 'Previsão'
  'previsÃ£o'         = 'previsão'
  'EVOLUÃ‡ÃƒO'        = 'EVOLUÇÃO'
  'EvoluÃ§Ã£o'        = 'Evolução'
  'evoluÃ§Ã£o'        = 'evolução'
  'LESÃ•ES'           = 'LESÕES'
  'LesÃµes'           = 'Lesões'
  'lesÃµes'           = 'lesões'
  'ACWRÃ'             = 'ACWR'
  'TreinÃ¢mento'      = 'Treinamento'
  'treinÃ¢mento'      = 'treinamento'

  # === SEQUÊNCIAS DE 2 CHARS SIMPLES ===
  # Minúsculas
  'Ã¡'  = 'á'
  'Ã©'  = 'é'
  'Ã­'  = 'í'
  'Ã³'  = 'ó'
  'Ãº'  = 'ú'
  'Ã '  = 'à'
  'Ã¢'  = 'â'
  'Ãª'  = 'ê'
  'Ã®'  = 'î'
  'Ã´'  = 'ô'
  'Ã£'  = 'ã'
  'Ãµ'  = 'õ'
  'Ã§'  = 'ç'
  # Maiúsculas
  'Ã '  = 'À'
  'Ã‚'  = 'Â'
  'Ãƒ'  = 'Ã'
  'Ã„'  = 'Ä'
  'Ã†'  = 'Æ'
  'Ã‡'  = 'Ç'
  'Ãˆ'  = 'È'
  'Ã‰'  = 'É'
  'ÃŠ'  = 'Ê'
  'Ã‹'  = 'Ë'
  'ÃŒ'  = 'Ì'
  'Ã'  = 'Í'
  'ÃŽ'  = 'Î'
  'Ã''  = 'Ñ'
  'Ã''  = 'Ò'
  'Ã"'  = 'Ó'
  'Ã"'  = 'Ô'
  'Ã•'  = 'Õ'
  'Ã–'  = 'Ö'
  'Ã˜'  = 'Ø'
  'Ã™'  = 'Ù'
  'Ãš'  = 'Ú'
  'Ã›'  = 'Û'
  'Ãœ'  = 'Ü'
  # Outros símbolos comuns
  'â€™'  = "'"
  'â€œ'  = '"'
  'â€'   = '"'
  'â€"'  = '–'
  'â€"'  = '—'
  'â€¦'  = '…'
  'Â '   = ' '
  'Â©'   = '©'
  'Â®'   = '®'
  'Â°'   = '°'
  'Â·'   = '·'
  'Â»'   = '»'
  'Â«'   = '«'
  'Â½'   = '½'
  'Â¼'   = '¼'
  'Â¾'   = '¾'
  'â‚¬'  = '€'
  'Â£'   = '£'
  'Â¥'   = '¥'
  # Subscript/Superscript numérico
  'Â²'   = '²'
  'Â³'   = '³'
  'Â¹'   = '¹'
  # Letras adicionais
  'Ã¤'   = 'ä'
  'Ã¶'   = 'ö'
  'Ã¼'   = 'ü'
  'Ã±'   = 'ñ'
  'Ã¯'   = 'ï'
  'Ã«'   = 'ë'
  'Ã¹'   = 'ù'
  'Ã¦'   = 'æ'
  'Ã¸'   = 'ø'
  'Ã½'   = 'ý'
  'ÃŸ'   = 'ß'
}

$root = "d:\Server\william-moreira-performance-system (2)"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$totalFixed = 0
$report = @()

foreach ($rel in $files) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) {
    $report += "  [SKIP] $rel — arquivo não encontrado"
    continue
  }

  $original = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $fixed = $original
  $changes = 0

  foreach ($kv in $replacements.GetEnumerator()) {
    if ($fixed.Contains($kv.Key)) {
      $count = ([regex]::Matches($fixed, [regex]::Escape($kv.Key))).Count
      $fixed = $fixed.Replace($kv.Key, $kv.Value)
      $changes += $count
    }
  }

  if ($changes -gt 0) {
    [System.IO.File]::WriteAllText($path, $fixed, $utf8NoBom)
    $report += "  [OK] $rel — $changes substituição(ões)"
    $totalFixed += $changes
  } else {
    $report += "  [--] $rel — sem erros de encoding"
  }
}

Write-Host ""
Write-Host "=== RELATÓRIO DE CORREÇÃO DE ENCODING — WMPS ==="
Write-Host ""
$report | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "=== TOTAL: $totalFixed substituições em $($files.Count) arquivos ==="
