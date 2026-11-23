import * as SecureStore from 'expo-secure-store';

// Android/iOS: o identificador da sessão (validada no banco) fica no cofre
// criptografado do aparelho. Nenhum dado financeiro é guardado localmente.
export const ehNativo = true;
const chave = (tipo) => `wesfin_${tipo}`;

export async function lerToken(tipo = 'usuario') {
  return SecureStore.getItemAsync(chave(tipo));
}

export async function gravarToken(tipo = 'usuario', token) {
  if (token) await SecureStore.setItemAsync(chave(tipo), token);
  else await SecureStore.deleteItemAsync(chave(tipo));
}
