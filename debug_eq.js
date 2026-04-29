const fs = require('fs');
const file = 'app/coach/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find all occurrences of yoyo in the file
let idx = 0;
const occurrences = [];
while ((idx = content.indexOf("yoyo", idx)) !== -1) {
  occurrences.push(idx);
  idx++;
}
console.log('All yoyo occurrences:', occurrences.length);
// Print each one
occurrences.forEach(i => {
  console.log(`\n--- idx ${i} ---`);
  console.log(JSON.stringify(content.slice(i-30, i+150)));
});
