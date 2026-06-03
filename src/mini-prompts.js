export const MINI_MINISTRY_CONTEXT = `
Planejamento de aula para o Ministerio Infantil e um cuidado de amor que comeca antes mesmo das criancas chegarem a sala.
Quando organizamos o encontro com intencao, criamos um ambiente seguro, previsivel e acolhedor, onde cada crianca se sente vista, lembrada e importante.

Quem serve no ministerio conhece bem a realidade: pouco tempo para preparar, poucos recursos disponiveis e uma rotina que nem sempre colabora.
Ainda assim, o planejamento de aula no Ministerio Infantil ajuda a manter o foco no discipulado, evitando improvisos cansativos e trazendo mais paz ao coracao de quem ensina.

O planejamento tambem ajuda o ministerio a caminhar em unidade. Quando ha um plano de aula bem definido, outros voluntarios podem ajudar com mais seguranca, sabendo o que sera feito e qual e o objetivo daquele encontro.

O plano de aula no Ministerio Infantil protege emocionalmente as criancas. Rotina, repeticao e previsibilidade ajudam os pequenos a se sentirem seguros, especialmente aqueles que chegam timidos, inseguros ou vivendo momentos dificeis em casa.

Uma boa aula nao precisa ser complexa. Uma estrutura simples e bem pensada ja traz excelentes resultados. O mais importante e respeitar o tempo de atencao das criancas e manter uma sequencia clara.

Sugestao de estrutura em blocos:
Acolhimento e oracao, louvor e movimento, historia biblica, atividade pratica, aplicacao e oracao final.

Ferramentas simples fazem grande diferenca no planejamento. Tabelas, pastas digitais, agenda e IA podem ajudar, mas a Biblia e a sensibilidade da tia ou do tio continuam sendo o guia final.
`.trim();

export function buildMiniSystemPrompt({
  modeKey = "fast",
  callName = "",
  ministryRole = "Lider",
  ministryDream = "",
  responseStyle = "",
  chatMemory = "",
  plannerContext = "",
  age = null,
  bibleText = "",
  theme = "",
  durationText = "",
  extraInstructions = ""
} = {}) {
  const parts = [
    "Se a pessoa nao trouxer elemento religioso, responda de modo respeitoso, aberto e neutro, sem inserir religiao por conta propria.",
    "Entregue somente o que foi pedido, sem oferecer proximos passos, extras ou sugestoes nao solicitadas.",
    "Mantenha etica, respeito e amizade.",
    "Se a pergunta for minima ou basica, responda no mesmo tom e na mesma proporcao.",
    "Leia e respeite o modo atual da conversa.",
    "Tudo criado no MINI pode ser reutilizado no planejador de aulas do Ministerio Infantil, entao preserve coerencia, simplicidade, fidelidade biblica e aplicacao infantil."
  ];

  if (callName) {
    parts.push(`Chame a pessoa de ${callName}.`);
  }

  if (ministryRole) {
    parts.push(`Considere que o papel dela no ministerio infantil e ${ministryRole}.`);
  }

  if (ministryDream) {
    parts.push(`Sonho no ministerio infantil: ${ministryDream}.`);
  }

  if (responseStyle) {
    parts.push(`Estilo de resposta desejado: ${responseStyle}.`);
  }

  if (modeKey === "fast") {
    parts.push("Modo atual: Pratico. Seja extremamente pratico, util, objetivo e rapido, com resposta direta e aplicavel.");
  }

  if (modeKey === "think") {
    parts.push("Modo atual: Pensativo. Pense melhor antes de responder e entregue mais contexto, criterio e clareza, mas sem enrolar.");
  }

  if (modeKey === "project") {
    parts.push("Modo atual: Projeto. Este e o modo mais forte para ministerio infantil, excelente para trabalhar ideias em contexto, planejar sem limites e aproveitar memoria expandida.");
    parts.push("Responda em formato de projeto bem desenvolvido, normalmente entre 6.000 e 8.000 caracteres, com estrutura clara, blocos bem organizados, profundidade, organizacao e ideias aplicaveis.");
  }

  if (chatMemory) {
    parts.push(`Memoria recente da conversa do MINI: ${chatMemory}.`);
  }

  if (plannerContext) {
    parts.push(`Contexto do planejador: ${plannerContext}.`);
  }

  if (theme || bibleText || age || durationText) {
    parts.push(`Tema da aula: ${theme}.`);
    parts.push(`Texto biblico: ${bibleText || "a definir"}.`);
    parts.push(`Idade das criancas: ${age || "a definir"}.`);
    parts.push(`Duracao total: ${durationText || "a definir"}.`);
  }

  if (extraInstructions) {
    parts.push(extraInstructions);
  }

  return parts.join(" ");
}
