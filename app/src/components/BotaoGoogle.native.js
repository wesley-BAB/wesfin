import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { api } from '../lib/api';
import { Botao } from './ui';

// Android/iOS: login nativo do Google. Exige um build de desenvolvimento
// (não roda no Expo Go) e os Client IDs Android/iOS no Google Cloud (ver README).
export function BotaoGoogle({ aoReceberToken, aoErro }) {
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    try {
      const { googleClientId } = await api('/config');
      GoogleSignin.configure({ webClientId: googleClientId });
      await GoogleSignin.hasPlayServices();
      const resposta = await GoogleSignin.signIn();
      if (isSuccessResponse(resposta) && resposta.data.idToken) aoReceberToken(resposta.data.idToken);
    } catch (e) {
      aoErro?.(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return <Botao titulo="Continuar com Google" icone="log-in" variante="contorno" grande onPress={entrar} disabled={carregando} />;
}
