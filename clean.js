
const fs = require('fs');

const files = ['app/coach/page.tsx', 'app/athlete/page.tsx', 'app/page.tsx'];

const replacements = {
    'ÃƒÂ§ÃƒÂµes': 'ções',
    'ÃƒÂ§ÃƒÂ£o': 'ção',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ©': 'é',
    'ÃƒÂ­': 'í',
    'ÃƒÂó': 'ó',
    'ÃƒÂº': 'ú',
    'ÃƒÂ¢': 'â',
    'ÃƒÂª': 'ê',
    'ÃƒÂ´': 'ô',
    'ÃƒÂ£': 'ã',
    'ÃƒÂµ': 'õ',
    'ÃƒÂ§': 'ç',
    'Ãƒâ€¡': 'Ç',
    'ÃƒÆ’': 'Ã',
    'Ãƒâ€°': 'É',
    'ÃƒÂ': 'à',
    'Ã§Ãµes': 'ções',
    'Ã§Ã£o': 'ção',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ã´': 'ô',
    'Ã£': 'ã',
    'Ãµ': 'õ',
    'Ã§': 'ç',
    'Ã rea': 'Área',
    'Ã“timo': 'Ótimo',
    'PÃ©ssimo': 'Péssimo',
    'MÃ©dia': 'Média',
    'DistÃ¢ncia': 'Distância',
    'ReferÃªncia': 'Referência',
    'Ã ndice': 'Índice',
    'disponÃ­vel': 'disponível',
    'MÃ³dulo': 'Módulo',
    'AvaliaÃ§Ãµes': 'Avaliações',
    'PeriodizaÃ§Ã£o': 'Periodização',
    'PrescriÃ§Ã£o': 'Prescrição',
    'SolicitaÃ§Ãµes': 'Solicitações',
    'EstÃ¡vel': 'Estável'
};

files.forEach(path => {
    if (fs.existsSync(path)) {
        let content = fs.readFileSync(path, 'utf8');
        for (const [bad, good] of Object.entries(replacements)) {
            content = content.split(bad).join(good);
        }
        fs.writeFileSync(path, content, 'utf8');
        console.log(`Limpeza concluída para ${path}`);
    }
});
