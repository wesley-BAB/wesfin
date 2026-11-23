// Conhecimento padrão da WESIA (o robô do registro rápido). A fonte de verdade é
// o banco (robo_palavras e robo_respostas, migração 005); isto só é usado se as
// tabelas não existirem ainda e pelos testes. Mantenha igual ao que a migração insere.

export const VOCABULARIO_PADRAO = {
  tipo_saida: ['saida', 'saidas', 's', 'gasto', 'gastei', 'despesa', 'paguei', 'pago', '-'],
  tipo_entrada: ['entrada', 'entradas', 'e', 'receita', 'recebi', 'ganho', 'ganhei', '+'],
  tipo_investimento: ['investimento', 'investimentos', 'investi', 'investir', 'invest', 'i', 'aporte', 'aportei', 'apliquei', 'aplicacao'],
  mensal: ['mensal', 'fixa', 'fixo'],
  pendente: ['pendente', 'apagar', 'areceber', 'a pagar', 'a receber'],
  ontem: ['ontem'],
  anteontem: ['anteontem'],
  hoje: ['hoje'],
  sim: ['sim', 's', 'ss', 'pode', 'claro', 'ok', 'confirmo', 'yes'],
  nao: ['nao', 'n', 'cancela', 'cancelar', 'no'],
  ajuda: ['ajuda', 'help', '?', 'oi', 'ola'],
  saldo: ['saldo', 'resumo'],
};

export const TEXTOS_PADRAO = {
  boas_vindas: 'Olá! Eu sou a WESIA, sua assistente do registro rápido.\nEscreva o lançamento como uma mensagem.\nSempre tipo + descrição + valor.\nEx.: "Saida Futebol 50" ou "Entrada Salário 3500".',
  sugestoes: 'Saida Futebol 50\nEntrada Salário 3500\nInvestimento Tesouro 500\nSaida Luz 180 mensal pendente\nsaldo',
  ajuda: [
    'Envie sempre tipo + descrição + valor:',
    '• Saida Futebol 50',
    '• Entrada Salário 3500',
    '• Investimento Tesouro 500',
    '• Saida Luz 180 mensal pendente  (conta mensal a pagar)',
    '• Saida Mercado 120,50 #Alimentação  (força a categoria)',
    '• Saida Pizza 60 ontem',
    'Comandos: "saldo" mostra o resumo do mês.',
  ].join('\n'),
  faltou: 'Faltou {itens}. Use tipo + descrição + valor, ex.: "Saida Futebol 50"',
  faltou_tipo: 'o tipo no início (saida, entrada ou investimento)',
  faltou_descricao: 'a descrição',
  faltou_valor: 'o valor',
  pergunta_categoria: 'A categoria "{categoria}" não existe nas suas categorias.\nDeseja criar a categoria e registrar o lançamento?',
  cancelado: 'Lançamento cancelado.',
};
