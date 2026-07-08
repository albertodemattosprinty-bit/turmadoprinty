const fs = require('fs');
const path = require('path');

const sourceDir = 'C:/Users/Lucas/Pictures/DeHoje/SVG HUB';
const outputPaths = [
  'C:/Users/Lucas/Desktop/Turma do Printy Database/public/200/svg-hub-manifest.json',
  'C:/Users/Lucas/Desktop/Turma do Printy Database/mobile-200/www/200/svg-hub-manifest.json'
];

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function cleanKeyword(value) {
  return String(value || '')
    .replace(/\.svg$/i, '')
    .replace(/\(\d+\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const phraseRepairs = new Map([
  ['l mina', 'lâmina'],
  ['seguran a', 'segurança'],
  ['alien gena', 'alienígena'],
  ['alto-falante, som, udio', 'alto-falante, som, áudio'],
  ['alto-falante', 'alto-falante'],
  ['udio', 'áudio'],
  ['beb ', 'bebê'],
  ['beb', 'bebê'],
  ['cone', 'ícone'],
  ['s mbolo', 'símbolo'],
  ['nfora', 'ânfora'],
  ['anota es', 'anotações'],
  ['apaixonado', 'apaixonado'],
  ['arco- ris', 'arco-íris'],
  ['b ssola', 'bússola'],
  ['bal o de conversa', 'balão de conversa'],
  ['autom vel', 'automóvel'],
  ['caf ', 'café'],
  ['ch ', 'chá'],
  ['c rebro', 'cérebro'],
  ['seguran a', 'segurança'],
  ['crian a', 'criança'],
  ['inf ncia', 'infância'],
  ['comemora o', 'comemoração'],
  ['configura es', 'configurações'],
  ['dire o', 'direção'],
  ['emo o', 'emoção'],
  ['eleg ncia', 'elegância'],
  ['esta o', 'estação'],
  ['estat stica', 'estatística'],
  ['estrat gia', 'estratégia'],
  ['ex rcito', 'exército'],
  ['exerc cio', 'exercício'],
  ['explos o', 'explosão'],
  ['express o', 'expressão'],
  ['f ', 'fé'],
  ['finan as', 'finanças'],
  ['for a', 'força'],
  ['gr fico', 'gráfico'],
  ['hist ria', 'história'],
  ['hor rio', 'horário'],
  ['ioi ', 'ioiô'],
  ['l ngua', 'língua'],
  ['la o', 'laço'],
  ['laborat rio', 'laboratório'],
  ['lan amento', 'lançamento'],
  ['lan ar', 'lançar'],
  ['latic nio', 'laticínio'],
  ['lavar as m os', 'lavar as mãos'],
  ['lentid o', 'lentidão'],
  ['localiza o', 'localização'],
  ['m os erguidas', 'mãos erguidas'],
  ['m quina', 'máquina'],
  ['m sica', 'música'],
  ['manuten o', 'manutenção'],
  ['minera o', 'mineração'],
  ['muscula o', 'musculação'],
  ['nata o', 'natação'],
  ['navega o', 'navegação'],
  ['neg cios', 'negócios'],
  ['notifica o', 'notificação'],
  ['ora o', 'oração'],
  ['organiza o', 'organização'],
  ['p lula', 'pílula'],
  ['p o', 'pão'],
  ['palha o', 'palhaço'],
  ['pe a', 'peça'],
  ['pe o', 'peão'],
  ['pol cia', 'polícia'],
  ['pr -hist ria', 'pré-história'],
  ['preserva o', 'preservação'],
  ['previs o', 'previsão'],
  ['prote o', 'proteção'],
  ['quebra-cabe a', 'quebra-cabeça'],
  ['r ptil', 'réptil'],
  ['r tulo', 'rótulo'],
  ['refei o', 'refeição'],
  ['reflex o', 'reflexão'],
  ['rel gio', 'relógio'],
  ['religi o', 'religião'],
  ['rem dio', 'remédio'],
  ['resid ncia', 'residência'],
  ['rvore de natal', 'árvore de natal'],
  ['sab o', 'sabão'],
  ['sal o', 'salão'],
  ['sandu che', 'sanduíche'],
  ['sa de', 'saúde'],
  ['servi o', 'serviço'],
  ['super-her i', 'super-herói'],
  ['ta a', 'taça'],
  ['telef rico', 'teleférico'],
  ['televis o', 'televisão'],
  ['ter o', 'terço'],
  ['tr nsito', 'trânsito'],
  ['trof u', 'troféu'],
  ['vestu rio', 'vestuário'],
  ['vis o', 'visão'],
  ['vit ria', 'vitória'],
  ['vulc o', 'vulcão'],
  ['mãe', 'mãe']
]);

function repairPortugueseText(value) {
  let next = cleanKeyword(value);
  for (const [from, to] of phraseRepairs.entries()) {
    next = next.replaceAll(from, to);
  }
  return next
    .replace(/\s+,/g, ',')
    .replace(/,\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(fileName) {
  const baseName = repairPortugueseText(fileName);
  const splitByComma = baseName.split(',').map((item) => cleanKeyword(item)).filter(Boolean);
  if (splitByComma.length >= 2) {
    return splitByComma;
  }
  return baseName
    .split(/[\s_-]+/g)
    .map((item) => cleanKeyword(item))
    .filter((item) => item.length >= 2);
}

function main() {
  const files = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.svg$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));

  const usedIds = new Set();
  const assets = files.map((fileName) => {
    const keywords = [...new Set(extractKeywords(fileName))];
    const primaryLabel = repairPortugueseText(keywords[0] || fileName);
    let id = slugify(primaryLabel || fileName) || 'icone';
    if (usedIds.has(id)) {
      let index = 2;
      while (usedIds.has(`${id}-${index}`)) {
        index += 1;
      }
      id = `${id}-${index}`;
    }
    usedIds.add(id);
    return {
      id,
      fileName,
      label: primaryLabel,
      keywords
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    assetPrefix: 'project200/svg-hub',
    total: assets.length,
    assets
  };

  for (const outputPath of outputPaths) {
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  console.log(`Manifesto gerado com ${assets.length} SVGs.`);
}

main();
