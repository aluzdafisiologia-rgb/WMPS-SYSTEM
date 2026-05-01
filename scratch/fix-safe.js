const fs = require('fs');
const path = require('path');

const replacements = [
  [/Ã\srea/g, 'Área'],
  [/Ã\s/g, 'à '],
  [/Ã­/g, 'í'],
  [/Ã¡/g, 'á'],
  [/Ã³/g, 'ó'],
  [/Ã§/g, 'ç'],
  [/Ã£/g, 'ã'],
  [/Ãª/g, 'ê'],
  [/Ã /g, 'à'],
  [/Ã©/g, 'é'],
  [/Ãº/g, 'ú'],
  [/Ã´/g, 'ô'],
  [/Ã¢/g, 'â'],
  [/Ãndice/g, 'Índice'],
  [/sÃƒÃƒâ€šÃ‚Â£o/g, 'são'],
  [/padrÃƒÃƒâ€šÃ‚Â£o/g, 'padrão'],
  [/ÃƒÃ¢Ã¢â€šÂ¬Ã‚Â¦strand/g, 'Åstrand'],
  [/AerÃ Â³bico/g, 'Aeróbico'],
  [/AnaerÃ Â³bico/g, 'Anaeróbico'],
  [/BioenergÃ©tica/g, 'Bioenergética'],
  [/EficiÃªncia/g, 'Eficiência'],
  [/ReferÃªncia/g, 'Referência'],
  [/TransferÃªncia/g, 'Transferência'],
  [/CientÃ­fica/g, 'Científica'],
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
