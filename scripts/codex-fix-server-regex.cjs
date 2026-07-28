const fs = require('fs');
const p = 'C:/Users/Lucas/Desktop/Turma do Printy Database/server.js';
let s = fs.readFileSync(p, 'utf8');
const target = `  return /^[A-ZÀ-Ý][\\p{L}\\p{M}'’-]*$/u.test(String(word || "").trim());`;
const replacement = `  return /^\\p{Lu}[\\p{L}\\p{M}'�-]*$/u.test(String(word || "").trim());`;
if (!s.includes(target)) {
  const idx = s.indexOf('function startsWithUppercaseWord(word) {');
  if (idx < 0) throw new Error('Funcao nao encontrada');
  const end = s.indexOf('\n}', idx);
  if (end < 0) throw new Error('Fim da funcao nao encontrado');
  s = s.slice(0, idx) + `function startsWithUppercaseWord(word) {\n${replacement}\n}` + s.slice(end + 2);
} else {
  s = s.replace(target, replacement);
}
fs.writeFileSync(p, s, 'utf8');
console.log('patched');
