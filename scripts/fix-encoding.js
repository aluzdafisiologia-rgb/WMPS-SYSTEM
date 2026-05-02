const fs = require('fs');
const path = require('path');

const files = [
  "app/admin/actions.ts",
  "app/admin/page.tsx",
  "app/athlete/page.tsx",
  "app/coach/page.tsx",
  "app/components/EvolutionModule.tsx",
  "app/components/ForcePasswordReset.tsx",
  "app/components/ForecastModule.tsx",
  "app/components/PeriodizationWizard.tsx",
  "app/components/WhatIfSimulator.tsx",
  "app/actions.ts",
  "app/page.tsx",
  "lib/periodization-engine.ts",
  "scratch/fix-safe.js",
  "scratch/full-qa-test.ts",
  "scratch/simulador-lesoes.js",
  "scratch/simulador-wmps.js",
  "scratch/test-load-engine.ts",
  "scripts/post-deploy-test.js",
  "scripts/simulate-risk.ts"
];

const replacements = {
  // Complex specific
  'AVALIAÃ‡Ã•ES': 'AVALIAÇÕES',
  'PERIODIZAÃ‡ÃƒO': 'PERIODIZAÇÃO',
  'PRESCRIÃ‡ÃƒO': 'PRESCRIÇÃO',
  'SOLICITAÃ‡Ã•ES': 'SOLICITAÇÕES',
  'MANIFESTAÃ‡Ã•ES': 'MANIFESTAÇÕES',
  'MANIFESTAÃ‡ÃƒO': 'MANIFESTAÇÃO',
  'PERIODIZAÃ‡Ã•ES': 'PERIODIZAÇÕES',
  'CONFIGURAÃ‡Ã•ES': 'CONFIGURAÇÕES',
  'CONFIGURAÃ‡ÃƒO': 'CONFIGURAÇÃO',
  'NOTIFICAÃ‡Ã•ES': 'NOTIFICAÇÕES',
  'NOTIFICAÃ‡ÃƒO': 'NOTIFICAÇÃO',
  'GERAÃ‡ÃƒO': 'GERAÇÃO',
  'POPULAÃ‡ÃƒO': 'POPULAÇÃO',
  'FORMAÃ‡ÃƒO': 'FORMAÇÃO',
  'INFORMAÃ‡ÃƒO': 'INFORMAÇÃO',
  'SELEÃ‡ÃƒO': 'SELEÇÃO',
  'PROGRESSÃ•ES': 'PROGRESSÕES',
  'SESSÃ•ES': 'SESSÕES',
  'REPETIÃ‡Ã•ES': 'REPETIÇÕES',
  'FUNÃ‡Ã•ES': 'FUNÇÕES',
  'CONDIÃ‡Ã•ES': 'CONDIÇÕES',
  'EXCLUÃ\xADDO': 'EXCLUÍDO',
  'EXCLUSÃ•ES': 'EXCLUSÕES',
  'INTERVENÃ‡Ã•ES': 'INTERVENÇÕES',
  'SOLUÃ‡Ã•ES': 'SOLUÇÕES',

  'PÃ"S-TREINO': 'PÓS-TREINO',
  'PÃ³s-Treino': 'Pós-Treino',
  'PÃ³s-treino': 'Pós-treino',
  'PRONTUÃ\x81RIO': 'PRONTUÁRIO',
  'ProntuÃ¡rio': 'Prontuário',
  'PREVISÃƒO': 'PREVISÃO',
  'PrevisÃ£o': 'Previsão',
  'previsÃ£o': 'previsão',
  'EVOLUÃ‡ÃƒO': 'EVOLUÇÃO',
  'EvoluÃ§Ã£o': 'Evolução',
  'evoluÃ§Ã£o': 'evolução',
  'LESÃ•ES': 'LESÕES',
  'LesÃµes': 'Lesões',
  'lesÃµes': 'lesões',
  'ACWRÃ\x81': 'ACWR',
  'TreinÃ¢mento': 'Treinamento',
  'treinÃ¢mento': 'treinamento',

  // 2 chars simple
  'Ã¡': 'á',
  'Ã©': 'é',
  'Ã\xAD': 'í',
  'Ã³': 'ó',
  'Ãº': 'ú',
  'Ã ': 'à',
  'Ã¢': 'â',
  'Ãª': 'ê',
  'Ã®': 'î',
  'Ã´': 'ô',
  'Ã£': 'ã',
  'Ãµ': 'õ',
  'Ã§': 'ç',

  'Ã\x81': 'Á',
  'Ã\x82': 'Â',
  'Ã\x83': 'Ã',
  'Ã\x87': 'Ç',
  'Ã\x89': 'É',
  'Ã\x8A': 'Ê',
  'Ã\x8D': 'Í',
  'Ã\x93': 'Ó',
  'Ã\x94': 'Ô',
  'Ã\x95': 'Õ',
  'Ã\x9A': 'Ú',

  'â€™': "'",
  'â€œ': '"',
  'â€\x9D': '"',
  'â€“': '–',
  'â€”': '—',
  'â€¦': '…',
  'Â ': ' ',
  'Â©': '©',
  'Â®': '®',
  'Â°': '°',
  'Â·': '·',
  'Â»': '»',
  'Â«': '«',
  'Â½': '½',
  'Â¼': '¼',
  'Â¾': '¾',
  'â‚¬': '€',
  'Â£': '£',
  'Â¥': '¥',
  'Â²': '²',
  'Â³': '³',
  'Â¹': '¹'
};

let totalFixed = 0;

for (const rel of files) {
  const fullPath = path.join('d:/Server/william-moreira-performance-system (2)', rel);
  if (!fs.existsSync(fullPath)) {
    console.log(`[SKIP] ${rel} - not found`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changes = 0;

  for (const [key, value] of Object.entries(replacements)) {
    if (content.includes(key)) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (content.match(regex) || []).length;
      content = content.replace(regex, value);
      changes += count;
    }
  }

  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`[OK] ${rel} - ${changes} substitutions`);
    totalFixed += changes;
  } else {
    console.log(`[--] ${rel} - no encoding errors`);
  }
}

console.log(`\nTOTAL: ${totalFixed} substitutions`);
