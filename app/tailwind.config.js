/** @type {import('tailwindcss').Config} */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  // Tema escolhido pelo usuário (salvo no banco), não pelo sistema
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Verde da marca (degradê do topo: lima -> verde). Cores sem v() são iguais nos dois temas.
        marca: { DEFAULT: '#2e9d4f', escuro: '#1f7d3b', claro: v('marca-claro'), texto: v('marca-texto'), lima: '#6cc24a', fim: '#2bb35f' },
        // Chat de registro rápido, no mesmo verde da marca
        zap: { DEFAULT: '#2e9d4f', escuro: '#1f7d3b', bolha: v('zap-bolha'), fundo: v('zap-fundo') },
        // Entrada/saída/investimento: trio validado para daltonismo, sempre com rótulo/ícone junto.
        entrada: { DEFAULT: '#1baf7a', texto: v('entrada-texto'), fundo: v('entrada-fundo') },
        saida: { DEFAULT: '#e34948', texto: v('saida-texto'), fundo: v('saida-fundo') },
        investimento: { DEFAULT: '#2a78d6', texto: v('investimento-texto'), fundo: v('investimento-fundo') },
        pendente: { DEFAULT: '#eda100', texto: v('pendente-texto'), fundo: v('pendente-fundo') },
        tinta: { DEFAULT: v('tinta'), 2: v('tinta-2'), mudo: v('tinta-mudo') },
        fundo: v('fundo'),
        cartao: v('cartao'),
        borda: v('borda'),
      },
    },
  },
  plugins: [],
};
