import { Alert, Platform } from 'react-native';

// Confirmação com o diálogo do próprio app (components/Confirmacao.js).
// Quem mostra é o "host" montado mais recentemente: o da raiz do app ou, com uma
// folha aberta, o que fica dentro dela (no celular um Modal não abre sobre outro).
const hosts = [];

export function registrarHost(mostrar) {
  hosts.push(mostrar);
  return () => {
    const i = hosts.lastIndexOf(mostrar);
    if (i >= 0) hosts.splice(i, 1);
  };
}

// opcoes: { tom: 'perigo' | 'neutro', icone, resumo (elemento mostrado no meio) }
export function confirmar(titulo, mensagem, textoOk = 'Confirmar', opcoes = {}) {
  const host = hosts.at(-1);
  if (host) return new Promise((resolve) => host({ titulo, mensagem, textoOk, tom: 'perigo', ...opcoes, resolve }));

  // Sem host montado (não deveria acontecer): diálogo do sistema
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  return new Promise((resolve) =>
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoOk, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
