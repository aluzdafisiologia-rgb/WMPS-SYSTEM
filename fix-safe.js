const fs = require('fs');
const path = require('path');

const replacements = {
  // Coach menu and dashboard
  'AvaliaÃ§Ã£o': 'Avaliação',
  'AvaliaÃ§Ãµes': 'Avaliações',
  'ResistÃªncia': 'Resistência',
  'AerÃ³bica': 'Aeróbica',
  'MudanÃ§a': 'Mudança',
  'DireÃ§Ã£o': 'Direção',
  'AntropomÃ©trica': 'Antropométrica',
  'CutÃ¢nea': 'Cutânea',
  'PerÃ­metros': 'Perímetros',
  'HistÃ³rico': 'Histórico',
  'SaÃºde': 'Saúde',
  'MÃ©dia': 'Média',
  'DistÃ¢ncia': 'Distância',
  'MÃ©d.': 'Méd.',
  'ForÃ§a': 'Força',
  'MÃ¡xima': 'Máxima',
  'PotÃªncia': 'Potência',
  'ExplosÃ£o': 'Explosão',
  'PeriodizaÃ§Ã£o': 'Periodização',
  'PrescriÃ§Ã£o': 'Prescrição',
  'SolicitaÃ§Ãµes': 'Solicitações',
  'PÃ©ssimo': 'Péssimo',
  'Ã“timo': 'Ótimo',
  'EstÃ¡vel': 'Estável',
  'ATENÃ‡ÃƒO': 'ATENÇÃO',
  'PÃ©s': 'Pés',
  'pÃ©s': 'pés',
  'PadrÃ£o': 'Padrão',
  'OpÃ§Ãµes': 'Opções',
  'Ã\?rea': 'Área',
  'NÃ£o': 'Não',
  'SessÃ£o': 'Sessão',
  'sessÃ£o': 'sessão',
  'ConcluÃ­da': 'Concluída',
  'PrÃ©': 'Pré',
  'PÃ³s': 'Pós',
  'MÃ³dulo': 'Módulo',
  'FÃ­sica': 'Física',
  'fÃ­sica': 'física',
  'AtuaÃ§Ã£o': 'Atuação',
  'AÃ§Ã£o': 'Ação',
  'aÃ§Ã£o': 'ação',
  'FrequÃªncia': 'Frequência',
  'InformaÃ§Ãµes': 'Informações',
  'AtualizaÃ§Ã£o': 'Atualização',
  'Ãšltima': 'Última',
  'VocÃª': 'Você',
  'DuraÃ§Ã£o': 'Duração',
  'AlteraÃ§Ã£o': 'Alteração',
  'alteraÃ§Ã£o': 'alteração',
  'AlteraÃ§Ãµes': 'Alterações',
  'AvanÃ§ado': 'Avançado',
  'BÃ¡sico': 'Básico',
  'bÃ¡sico': 'básico',
  'TÃ©cnica': 'Técnica',
  'tÃ©cnica': 'técnica',
  'TrÃ­ceps': 'Tríceps',
  'BÃ­ceps': 'Bíceps',
  'MÃ¡ximo': 'Máximo',
  'mÃ¡ximo': 'máximo',
  'mÃ¡xima': 'máxima',
  'MÃ­nimo': 'Mínimo',
  'mÃ­nimo': 'mínimo',
  'DinÃ¢mica': 'Dinâmica',
  'estÃ¡tica': 'estática',
  'MÃ©todo': 'Método',
  'mÃ©todo': 'método',
  'ConcluÃ­do': 'Concluído',
  'NÃ­vel': 'Nível',
  'nÃ­vel': 'nível',
  'InÃ­cio': 'Início',
  'inÃ­cio': 'início',
  'ConfiguraÃ§Ãµes': 'Configurações',
  'configuraÃ§Ãµes': 'configurações',
  'ConfiguraÃ§Ã£o': 'Configuração',
  'SÃ©ries': 'Séries',
  'sÃ©ries': 'séries',
  'RepetiÃ§Ãµes': 'Repetições',
  'repetiÃ§Ãµes': 'repetições',
  'Avaliador': 'Avaliador',
  'UsuÃ¡rio': 'Usuário',
  'usuÃ¡rio': 'usuário',
  'SenhÃ¡': 'Senha',
  'PÃ¡gina': 'Página',
  'pÃ¡gina': 'página',

  // Hooper Index Corrupted Name
  'ÃƒÃƒâ€šÃ‚Â Ã ndice de Hooper': 'Índice de Hooper',
  'Ã ndice de Hooper': 'Índice de Hooper',
  
  // Advanced Bioenergetics and Corrupted Assesssments
  'BIOENERGÃ©TICA': 'BIOENERGÉTICA',
  'POTÃšNCIA DE EXPLOSÃƒO': 'POTÊNCIA DE EXPLOSÃO',
  'ANAERÃ³BICO': 'ANAERÓBICO',
  'ANÃ¡LISE': 'ANÁLISE',
  'Ã NDICE FORÃ‡A REATIVA': 'ÍNDICE FORÇA REATIVA',
  'REFERÃªNCIA CIENTÃ­FICA': 'REFERÊNCIA CIENTÍFICA',
  'PREDIÃ§Ã£O': 'PREDIÇÃO',
  'ATÃ©': 'ATÉ',
  'ACIMADE': 'ACIMA DE',
  'CLÃ­NICOS': 'CLÍNICOS',
  'SAÃºDE': 'SAÚDE',
  'ÃºLTIMO ESTÃ¡GIO': 'ÚLTIMO ESTÁGIO',
  'EstÃ¡gio': 'Estágio',
  'ESTÃ¡GIO': 'ESTÁGIO',
  'EXECUÃ§Ã£O': 'EXECUÇÃO',
  'LÃ©GER': 'LÉGER'
};

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles || [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = [...getAllFiles('app'), ...getAllFiles('components')];

allFiles.forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  let original = text;
  
  for (const [bad, good] of Object.entries(replacements)) {
    text = text.split(bad).join(good);
  }

  // Also replace some common exact string literals for degrees
  text = text.replace(/30-45ǒ''ǃ\?s/g, "30-45°");
  text = text.replace(/40-60ǒ''ǃ\?s/g, "40-60°");
  text = text.replace(/130-150ǒ''ǃ\?s/g, "130-150°");
  text = text.replace(/0ǒ''ǃ\?s/g, "0°");
  text = text.replace(/15-20ǒ''ǃ\?s/g, "15-20°");
  text = text.replace(/45-50ǒ''ǃ\?s/g, "45-50°");
  text = text.replace(/30-40ǒ''ǃ\?s/g, "30-40°");
  text = text.replace(/10-20ǒ''ǃ\?s/g, "10-20°");
  text = text.replace(/70-80ǒ''ǃ\?s/g, "70-80°");
  text = text.replace(/25-35ǒ''ǃ\?s/g, "25-35°");
  text = text.replace(/20-30ǒ''ǃ\?s/g, "20-30°");
  text = text.replace(/180ǒ''ǃ\?s/g, "180°");
  text = text.replace(/\?sǃ\?s 34cm/g, ">= 34cm");
  text = text.replace(/\?sǃ\?s 38cm/g, ">= 38cm");
  text = text.replace(/\?sǃ\?s 15cm/g, ">= 15cm");
  text = text.replace(/\?sǃ\?s 90%/g, ">= 90%");
  text = text.replace(/angle}ǒ''ǃ\?s/g, "angle}°");
  
  if (text !== original) {
    fs.writeFileSync(f, text, 'utf8');
    console.log('Fixed', f);
  }
});
