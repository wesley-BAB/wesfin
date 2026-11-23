import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../contexto/AppContexto';
import { api } from '../lib/api';
import { usePeriodo } from './Periodo';

// Lançamentos do período selecionado; recarrega quando muda período, conta ou dados.
export function useTransacoes({ comVencidas = false } = {}) {
  const { conta, versao, avisar } = useApp();
  const p = usePeriodo();
  const [lista, setLista] = useState([]);
  const [vencidas, setVencidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const inicio = p.inicio.toISOString();
  const fim = p.fim.toISOString();

  const recarregar = useCallback(async () => {
    if (!conta) return;
    setCarregando(true);
    try {
      const consulta = `inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
      const [l, v] = await Promise.all([
        api(`/transacoes?${consulta}`),
        comVencidas ? api('/transacoes/vencidas') : Promise.resolve([]),
      ]);
      setLista(l);
      setVencidas(v);
    } catch (e) {
      avisar(e.message);
    } finally {
      setCarregando(false);
    }
  }, [conta, inicio, fim, comVencidas, avisar]);

  useEffect(() => { recarregar(); }, [recarregar, versao]);

  return { lista, vencidas, carregando, recarregar, periodo: p };
}
