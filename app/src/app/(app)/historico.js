import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Cabecalho, Pagina, Vazio } from '../../components/ui';
import { useApp } from '../../contexto/AppContexto';
import { api } from '../../lib/api';
import { brl, dataHora, TIPOS } from '../../lib/formato';

const ACOES = {
  'conta.criar': 'criou a conta',
  'conta.renomear': 'renomeou a conta para',
  'conta.compartilhar': 'compartilhou a conta com',
  'conta.remover_membro': 'removeu o acesso de',
  'transacao.criar': 'registrou',
  'transacao.editar': 'editou',
  'transacao.pagar': 'deu baixa em',
  'transacao.reabrir': 'reabriu',
  'transacao.excluir': 'excluiu',
  'recorrencia.criar': 'criou a conta mensal',
  'recorrencia.editar': 'editou a conta mensal',
  'recorrencia.encerrar': 'encerrou a conta mensal',
};

function descrever(l) {
  const d = l.detalhes ?? {};
  let alvo = d.descricao ?? d.nome ?? d.email ?? '';
  if (d.tipo && l.acao.startsWith('transacao.')) alvo = `${(TIPOS[d.tipo]?.rotulo ?? 'Saída').toLowerCase()} "${alvo}"`;
  if (d.valor) alvo += ` de ${brl(d.valor)}`;
  if (d.origem === 'chat') alvo += ' pelo chat';
  if (d.mudancas && Object.keys(d.mudancas).length) alvo += ` (${Object.keys(d.mudancas).join(', ')})`;
  return `${ACOES[l.acao] ?? l.acao} ${alvo}`;
}

export default function Historico() {
  const { conta, versao, avisar } = useApp();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api('/logs?limite=200').then(setLogs).catch((e) => avisar(e.message));
  }, [conta?.id, versao, avisar]);

  return (
    <Pagina>
      <Cabecalho titulo="Histórico" subtitulo="Tudo que foi feito nesta conta, com data, hora e quem fez." />
      {logs.length ? (
        <View className="gap-px overflow-hidden rounded-3xl border border-borda bg-borda">
          {logs.map((l) => (
            <View key={l.id} className="flex-row items-start gap-3 bg-cartao px-4 py-3.5">
              <Text className="flex-1 text-sm leading-5 text-tinta">
                <Text className="font-semibold">{l.usuario?.nome?.split(' ')[0] ?? l.usuario?.email ?? 'Alguém'}</Text> {descrever(l)}
              </Text>
              <Text className="text-xs text-tinta-mudo">{dataHora(l.criado_em)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Vazio icone="clock" texto="Nada registrado ainda." />
      )}
    </Pagina>
  );
}
