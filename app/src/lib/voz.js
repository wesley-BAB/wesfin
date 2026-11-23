import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Ditado por voz: o aparelho (ou o navegador) transforma a fala em texto, e o texto
// segue para a WESIA como se tivesse sido digitado. Sem suporte (Expo Go, Firefox),
// `disponivel` fica falso e o microfone não aparece.
let Modulo = null;
try {
  Modulo = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  Modulo = null;
}

function suportado() {
  try {
    return Boolean(Modulo?.isRecognitionAvailable());
  } catch {
    return false;
  }
}

const ERROS = {
  'not-allowed': 'Permita o uso do microfone para falar com a WESIA.',
  'service-not-allowed': 'O reconhecimento de voz está desativado neste aparelho.',
  'no-speech': 'Não ouvi nada. Toque no microfone e fale de novo.',
  'speech-timeout': 'Não ouvi nada. Toque no microfone e fale de novo.',
  network: 'Sem conexão para reconhecer a voz. Tente de novo.',
  'audio-capture': 'Não encontrei um microfone funcionando.',
  busy: 'O microfone está em uso por outro app.',
  'language-not-supported': 'O reconhecimento em português não está disponível neste aparelho.',
};

// aoParcial(texto): enquanto fala. aoTerminar(texto): quando termina (texto vazio se nada foi entendido).
export function useDitado({ aoParcial, aoTerminar, aoErro }) {
  const [disponivel] = useState(suportado);
  const [ouvindo, setOuvindo] = useState(false);
  const texto = useRef('');
  const callbacks = useRef({});
  callbacks.current = { aoParcial, aoTerminar, aoErro };

  useEffect(() => {
    if (!disponivel) return undefined;
    const assinaturas = [
      Modulo.addListener('start', () => setOuvindo(true)),
      Modulo.addListener('result', (e) => {
        texto.current = e.results?.[0]?.transcript ?? texto.current;
        callbacks.current.aoParcial?.(texto.current);
      }),
      Modulo.addListener('error', (e) => {
        if (e.error === 'aborted') return;
        callbacks.current.aoErro?.(ERROS[e.error] ?? 'Não consegui entender o áudio. Tente de novo.');
      }),
      Modulo.addListener('end', () => {
        setOuvindo(false);
        const final = texto.current.trim();
        texto.current = '';
        callbacks.current.aoTerminar?.(final);
      }),
    ];
    return () => {
      assinaturas.forEach((a) => a.remove());
      try { Modulo.abort(); } catch { /* já parado */ }
    };
  }, [disponivel]);

  async function ouvir() {
    if (!disponivel || ouvindo) return;
    // No navegador quem pede a permissão é o próprio navegador, ao começar a ouvir.
    const permissao = Platform.OS === 'web' ? { granted: true } : await Modulo.requestPermissionsAsync().catch(() => ({ granted: false }));
    if (!permissao.granted) {
      callbacks.current.aoErro?.(ERROS['not-allowed']);
      return;
    }
    texto.current = '';
    setOuvindo(true);
    Modulo.start({ lang: 'pt-BR', interimResults: true, continuous: false, addsPunctuation: false });
  }

  // Parar: encerra e envia o que já foi entendido. Cancelar: descarta.
  const parar = () => { try { Modulo?.stop(); } catch { /* já parado */ } };
  const cancelar = () => {
    texto.current = '';
    try { Modulo?.abort(); } catch { /* já parado */ }
    setOuvindo(false);
  };

  return { disponivel, ouvindo, ouvir, parar, cancelar };
}
