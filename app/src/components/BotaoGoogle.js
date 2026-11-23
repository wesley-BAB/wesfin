import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { api } from '../lib/api';

// Web: botão oficial do Google (Google Identity Services).
export function BotaoGoogle({ aoReceberToken, aoErro }) {
  const caixa = useRef(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { googleClientId } = await api('/config');
        await carregarScript();
        if (!ativo) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }) => aoReceberToken(credential),
        });
        window.google.accounts.id.renderButton(caixa.current, {
          theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'pt-BR', width: 280,
        });
        setPronto(true);
      } catch (e) {
        aoErro?.(e.message);
      }
    })();
    return () => { ativo = false; };
  }, [aoReceberToken, aoErro]);

  return (
    <>
      <div ref={caixa} style={{ minHeight: 44, display: 'flex', justifyContent: 'center' }} />
      {!pronto ? <Text className="text-center text-xs text-tinta-mudo">Carregando login do Google…</Text> : null}
    </>
  );
}

let promessaScript;
function carregarScript() {
  promessaScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { promessaScript = null; reject(new Error('Não foi possível carregar o login do Google')); };
    document.head.append(s);
  });
  return promessaScript;
}
