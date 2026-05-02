const fs = require('fs');
const path = require('path');

const replacements = [
  [/Ã\srea/g, 'Área'],
  [/Ã\s/g, 'à '],
  [/í/g, 'í'],
  [/á/g, 'á'],
  [/ó/g, 'ó'],
  [/ç/g, 'ç'],
  [/ã/g, 'ã'],
  [/ê/g, 'ê'],
  [/Ã /g, 'à'],
  [/é/g, 'é'],
  [/ú/g, 'ú'],
  [/ô/g, 'ô'],
  [/â/g, 'â'],
  [/Ãndice/g, 'Índice'],
  [/sÃƒÃƒâ€šÃ‚£o/g, 'são'],
  [/padrÃƒÃƒâ€šÃ‚£o/g, 'padrão'],
  [/Ãƒâââ€šÂ¬Ã‚Â¦strand/g, 'Åstrand'],
  [/AerÃ ³bico/g, 'Aeróbico'],
  [/AnaerÃ ³bico/g, 'Anaeróbico'],
  [/Bioenergética/g, 'Bioenergética'],
  [/Eficiência/g, 'Eficiência'],
  [/Referência/g, 'Referência'],
  [/Transferência/g, 'Transferência'],
  [/Científica/g, 'Científica'],
  [/ÃƒÃƒâ€šÃ‚Â/g, '']
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      walk(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      replacements.forEach(([regex, replacement]) => {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
      }
    }
  });
}

walk(path.join(process.cwd(), 'app'));
walk(path.join(process.cwd(), 'lib'));
