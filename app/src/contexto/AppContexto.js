import { colorScheme } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, definirContaAtual, entrarComGoogle, quandoSessaoExpirar, sairDaConta } from '../lib/api';

const Contexto = createContext(null);
export const useApp = () => useContext(Contexto);

// Estado do app vem sempre do banco (via API). Preferências como conta atual e
// visão do período e tema também são gravadas no banco, não no aparelho:
// o usuário encontra a mesma configuração em qualquer dispositivo.
export function AppProvider({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [contas, setContas] = useState([]);
  const [conta, setConta] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [modo, setModoEstado] = useState('mes');
  const [tema, setTemaEstado] = useState('claro');
  const [ref, setRef] = useState(() => new Date());
  const [versao, setVersao] = useState(0); // muda quando um lançamento é criado/alterado
  const [chatAberto, setChatAberto] = useState(false);
  const [aviso, setAviso] = useState(null);
  const timerAviso = useRef();

  const avisar = useCallback((texto) => {
    setAviso(texto);
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 3000);
  }, []);

  const carregarCategorias = useCallback(async () => {
    setCategorias(await api('/categorias'));
  }, []);

  const aplicarDados = useCallback(async ({ usuario: u, contas: cs, preferencias = {} }) => {
    const escolhida = cs.find((c) => c.id === preferencias.conta_atual) ?? cs.find((c) => c.papel === 'dono') ?? cs[0];
    definirContaAtual(escolhida?.id ?? null);
    setUsuario(u);
    setContas(cs);
    setConta(escolhida ?? null);
    setModoEstado(preferencias.modo_periodo ?? 'mes');
    setTemaEstado(preferencias.tema === 'escuro' ? 'escuro' : 'claro');
    await carregarCategorias();
  }, [carregarCategorias]);

  const recarregarUsuario = useCallback(async () => {
    try {
      await aplicarDados(await api('/auth/me'));
    } catch {
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, [aplicarDados]);

  useEffect(() => {
    quandoSessaoExpirar(() => setUsuario(null));
    recarregarUsuario();
  }, [recarregarUsuario]);

  useEffect(() => {
    colorScheme.set(tema === 'escuro' ? 'dark' : 'light');
  }, [tema]);

  const valor = useMemo(() => ({
    carregando,
    usuario,
    contas,
    conta,
    categorias,
    modo,
    tema,
    ref,
    versao,
    chatAberto,
    aviso,
    avisar,
    setRef,
    setChatAberto,
    carregarCategorias,
    recarregarUsuario,
    atualizarDados: () => setVersao((v) => v + 1),
    async entrar(credential) {
      await entrarComGoogle(credential);
      setCarregando(true);
      await recarregarUsuario();
    },
    async sair() {
      await sairDaConta().catch(() => {});
      definirContaAtual(null);
      setUsuario(null);
    },
    async trocarConta(id) {
      const nova = contas.find((c) => c.id === id);
      if (!nova) return;
      definirContaAtual(nova.id);
      setConta(nova);
      setVersao((v) => v + 1);
      await api('/auth/preferencias', { metodo: 'PATCH', corpo: { conta_atual: nova.id } }).catch(() => {});
    },
    async setModo(novo) {
      setModoEstado(novo);
      await api('/auth/preferencias', { metodo: 'PATCH', corpo: { modo_periodo: novo } }).catch(() => {});
    },
    async setTema(novo) {
      const anterior = tema;
      setTemaEstado(novo);
      try {
        await api('/auth/preferencias', { metodo: 'PATCH', corpo: { tema: novo } });
      } catch (e) {
        setTemaEstado(anterior);
        avisar(e.message);
      }
    },
  }), [carregando, usuario, contas, conta, categorias, modo, tema, ref, versao, chatAberto, aviso, avisar, carregarCategorias, recarregarUsuario]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
