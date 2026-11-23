import { useState } from 'react';
import { Text, View } from 'react-native';
import { SeletorPeriodo } from '../../components/Periodo';
import { Resumo } from '../../components/Resumo';
import { FolhaTransacao, Filtros, ListaTransacoes, darBaixa } from '../../components/Transacoes';
import { Botao, Icone, Pagina, Vazio } from '../../components/ui';
import { useTransacoes } from '../../components/useTransacoes';
import { useApp } from '../../contexto/AppContexto';
import { brl } from '../../lib/formato';

export default function Painel() {
  const { avisar, atualizarDados } = useApp();
  const { lista, vencidas } = useTransacoes({ comVencidas: true });
  const [filtro, setFiltro] = useState('todas');
  const [folha, setFolha] = useState({ visivel: false, transacao: null });

  const abrir = (transacao = null) => setFolha({ visivel: true, transacao });
  const pagar = (t) => darBaixa(t, avisar, atualizarDados);
  const filtrada = lista.filter((t) => (filtro === 'todas' ? true : filtro === 'a_pagar' ? t.status === 'a_pagar' : t.tipo === filtro));
  const totalVencido = vencidas.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);

  return (
    <Pagina>
      <SeletorPeriodo />
      <Resumo lista={lista} />

      {vencidas.length ? (
        <View className="gap-3 rounded-3xl border border-saida/30 bg-saida-fundo p-4">
          <View className="flex-row items-center gap-2">
            <Icone nome="alert-triangle" tamanho={16} cor="saida" />
            <Text className="font-semibold text-saida-texto">
              {vencidas.length} conta{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}
              {totalVencido ? ` · ${brl(totalVencido)}` : ''}
            </Text>
          </View>
          <ListaTransacoes lista={vencidas} aoAbrir={abrir} aoPagar={pagar} />
        </View>
      ) : null}

      <View className="flex-row flex-wrap items-center justify-between gap-3 pt-2">
        <Text className="text-lg font-bold text-tinta">Lançamentos</Text>
        <Botao titulo="Novo" icone="plus" onPress={() => abrir()} />
      </View>
      <Filtros valor={filtro} onChange={setFiltro} />
      <ListaTransacoes
        lista={filtrada}
        aoAbrir={abrir}
        aoPagar={pagar}
        vazio={<Vazio texto={'Nenhum lançamento neste período.\nUse o botão verde para registrar rápido.'} />}
      />

      <FolhaTransacao visivel={folha.visivel} transacao={folha.transacao} aoFechar={() => setFolha({ visivel: false, transacao: null })} />
    </Pagina>
  );
}
