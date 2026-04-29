const fs = require('fs');
const file = 'app/coach/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix Yo-Yo UI at index 91726
// The section is: {testType === 'yoyo' && (\n                  <div className="grid grid-cols-2 gap-4">...
const YOYO_START = 91726;
const YOYO_END_MARKER = "                )}\n\n                {testType === 'vift'";
const endIdx = content.indexOf(YOYO_END_MARKER, YOYO_START);
const endPos = endIdx + "                )}".length; // just the closing of yoyo block

const yoyoSection = content.slice(YOYO_START, endPos);
console.log('Section found:\n', JSON.stringify(yoyoSection));

const YOYO_NEW = `{testType === 'yoyo' && (
                  <div className="space-y-2">
                    <InputField label="Dist\u00e2ncia Total Percorrida (m)" value={yoyoLevel} set={setYoyoLevel} />
                    <p className="text-[9px] text-slate-600 font-bold italic">* Dist. total acumulada da folha de resultado (ex: 1120m)</p>
                  </div>
                )}`;

content = content.slice(0, YOYO_START) + YOYO_NEW + content.slice(endPos);
fs.writeFileSync(file, content, 'utf8');
console.log('Done. New length:', content.length);
