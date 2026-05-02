const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'lib', 'components', 'sql', 'scripts', 'scratch'];
const targetFiles = ['next.config.ts', 'tailwind.config.ts', 'package.json', 'tsconfig.json'];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.sql', '.md', '.txt'];

let convertedCount = 0;
let alreadyUtf8Count = 0;

function processFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check if it has BOM (EF BB BF)
    let hasBom = false;
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      hasBom = true;
    }

    let content = buffer.toString('utf8');
    
    // If it had a BOM, the string might have \uFEFF at the start in some Node versions, or we just strip it from the buffer.
    // toString('utf8') on a buffer with BOM usually keeps the BOM character in the string.
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      hasBom = true;
    }

    if (hasBom) {
      // Write it back as standard UTF-8 (Node.js writeFile with 'utf8' does not add BOM)
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[CONVERTED - REMOVED BOM] ${filePath}`);
      convertedCount++;
    } else {
      // Re-saving it anyway just to enforce UTF-8 without BOM natively on disk
      fs.writeFileSync(filePath, content, 'utf8');
      alreadyUtf8Count++;
    }
  } catch (err) {
    console.error(`Erro ao processar ${filePath}: ${err.message}`);
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        processDirectory(fullPath);
      }
    } else {
      if (extensions.includes(path.extname(fullPath).toLowerCase())) {
        processFile(fullPath);
      }
    }
  }
}

// Process Directories
for (const dir of targetDirs) {
  processDirectory(path.join(__dirname, dir));
}

// Process single files
for (const file of targetFiles) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  }
}

console.log(`\n=== RELATÓRIO DE CONVERSÃO ===`);
console.log(`Arquivos com BOM convertido: ${convertedCount}`);
console.log(`Arquivos validados e reescritos (UTF-8 sem BOM): ${alreadyUtf8Count}`);
