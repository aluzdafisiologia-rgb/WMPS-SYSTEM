const fs = require('fs');

let txt = fs.readFileSync('app/coach/page.tsx', 'utf8');

// The remaining mojibake patterns
const reps = [
  [/Ã“timo/g, 'Ótimo'],
  [/PÃ“S-TRE/g, 'PÓS-TRE'],
  [/PRÃ‰-TREI/g, 'PRÉ-TREI'],
  [/equaçÃƒÂµes/g, 'equações'],
  [/mediçÃƒÂµes/g, 'medições'],
  [/lesÃƒÂµes/g, 'lesões'],
  [/LesÃƒÂµes/g, 'Lesões'],
  [/culaçÃƒÂµes/g, 'culações'],
  [/SessÃƒÂµes/g, 'Sessões'],
  [/sessÃƒÂµes/g, 'sessões'],
  [/ervaçÃƒÂµes/g, 'ervações'],
  [/AnaerÃ Ã‚³bi/g, 'Anaeróbi'],
  [/aerÃ Ã‚³bi/g, 'aeróbi'],
  [/ÃƒÂ ndi/g, 'Índi'],
  [/Ã Ã‚³ss/g, 'óss'],
  [/Ãšltimo/g, 'Último'],
  [/RIGATÃ“RIA/g, 'RIGATÓRIA'],
  [/Ã“sseo/g, 'Ósseo'],
  [/FORÃ‡A/g, 'FORÇA'],
  [/METABÃ“LICA/g, 'METABÓLICA'],
  [/MECÃ‚NICA/g, 'MECÂNICA'],
  [/Ã /g, 'à'],
  [/Ã‚·/g, '·'],
  [/ÃƒÆ’Ã†'â€šÂ¬Ã…Â¡ÃƒÆ’â€Å¡Ã‚Ã‚°/g, '°'],
  [/ÃƒÆ’Ã†'â€šÂ¬Ã…Â¡ÃƒÆ’â€Å¡Ã‚Ã‚/g, '°'],
  [/ÃƒÆ’â€Å¡Ã‚Ã‚¥/g, '≥'],
  [/ÃƒÆ’ÃƒÆ’â€Å¡Ã‚Ã‚£o/g, 'ão'],
  [/ÃƒÆ’ÃƒÆ’â€Å¡Ã‚Ã‚Â /g, 'í'],
  [/ÃƒÆ’ÃƒÆ’â€Å¡Ã‚Ã‚Â /g, 'á'],
  [/ÃƒÆ’ÃƒÆ’â€Å¡Ã‚Ã‚Â´/g, 'ô'],
  [/ÃƒÆ’ÃƒÆ’â€Å¡Ã‚Ã‚/g, ''],
  [/ÃƒÆ’ÃƒÆ/g, 'ã'], // partial fix for any remaining ÃƒÆ’ÃƒÆ
  [/ÃƒÆ’Ã†'/g, '°'],
  [/â€šÂ¬Ã…Â¡Ã‚Ã/g, ''],
  [/ââ€Å¡Ã‚Â¬Ã‚Ã/g, ''],
  [/â€Å¡Ã‚Â¬Ã‚Ã/g, ''],
  [/ÃƒÆ’âââ€Å¡Ã‚Â¬Ã‚Ã/g, ''],
  [/ÃƒÆ’âââ€Å¡Ã‚Â¬Ãƒ…Ã‚Â¡/g, 'â'],
  [/‚°ÃƒÆ’â€Å¡Ã‚Ã‚¥/g, '≥'],
  [/Ã‚/g, '']
];

let changes = 0;
for (const [regex, replacement] of reps) {
  const match = txt.match(regex);
  if (match) {
    changes += match.length;
    txt = txt.replace(regex, replacement);
  }
}

// Any remaining "Ã" followed by weird chars
txt = txt.replace(/Ã[“‰ƒ‚… Š†‡]/g, match => {
  const map = {
    'Ã“': 'Ó',
    'Ã‰': 'É',
    'Ãš': 'Ú',
    'Ã‡': 'Ç',
    'Ã ': 'à'
  };
  return map[match] || match;
});

// Final cleanup for degree symbol and greater than or equal
txt = txt.replace(/°°+/g, '°');
txt = txt.replace(/≥≥+/g, '≥');
txt = txt.replace(/ã’â€Å¡£o/g, 'ão');
txt = txt.replace(/ã’â€Å¡Â n/g, 'í');
txt = txt.replace(/xplosão'/g, "xplosão'");
txt = txt.replace(/ã’â€Å¡Â /g, 'á');
txt = txt.replace(/padrão/g, 'padrão');
txt = txt.replace(/ã’â€Å¡Â´m/g, 'ôm');
txt = txt.replace(/xtensão/g, 'xtensão');

fs.writeFileSync('app/coach/page.tsx', txt, 'utf8');
console.log(`Made ${changes} explicit corrections in app/coach/page.tsx`);
