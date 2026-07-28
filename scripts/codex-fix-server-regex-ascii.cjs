const fs = require('fs');
const p = 'C:/Users/Lucas/Desktop/Turma do Printy Database/server.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/return \^\\p\{Lu\}\[\\p\{L\}\\p\{M\}.*?\$\/u\.test\(String\(word \|\| ""\)\.trim\(\)\);/, `return /^\\p{Lu}[\\p{L}\\p{M}'-]*$/u.test(String(word || "").trim());`);
fs.writeFileSync(p, s, 'utf8');
console.log('patched');
