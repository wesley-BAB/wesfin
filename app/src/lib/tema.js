import { useColorScheme } from 'nativewind';

// Cores em hexadecimal para o que não aceita className (ícones, indicadores, StatusBar).
// Mesmos valores das variáveis de global.css.
const CORES = {
  claro: {
    fundo: '#f6f6f3',
    cartao: '#ffffff',
    borda: '#e7e6e1',
    tinta: '#0b0b0b',
    tinta2: '#52514e',
    mudo: '#898781',
    apagado: '#c3c2b7',
    marcaTexto: '#1f7d3b',
    entrada: '#006300',
    saida: '#b42323',
    pendente: '#8a5a00',
    investimento: '#1c5aa6',
  },
  escuro: {
    fundo: '#0d110f',
    cartao: '#181d1a',
    borda: '#2c332f',
    tinta: '#ecf0ed',
    tinta2: '#b2bab5',
    mudo: '#828c86',
    apagado: '#4a524d',
    marcaTexto: '#78ce78',
    entrada: '#5cd6a0',
    saida: '#ff8c89',
    pendente: '#f0be5a',
    investimento: '#80b0f2',
  },
};

export function useCores() {
  const { colorScheme } = useColorScheme();
  return CORES[colorScheme === 'dark' ? 'escuro' : 'claro'];
}
