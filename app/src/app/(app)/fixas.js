import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FolhaTransacao } from '../../components/Transacoes';
import { Botao, BotaoMini, Cabecalho, Campo, Folha, Icone, Opcoes, Pagina, Vazio } from '../../components/ui';
import { useApp } from '../../contexto/AppContexto';
import { api } from '../../lib/api';
import { confirmar } from '../../lib/confirmar';
import { brl, lerNumero, TIPOS } from '../../lib/formato';

export default function Fixas() {
  const { conta, versao, categorias, avisar } = useApp();
  const [fixas, setFixas] = useState([]);
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try { setFixas(await api('/recorrencias')); } catch (e) { avisar(e.message); }
  }, [avisar]);
  useEffect(() => { carregar(); }, [carregar, conta?.id, versao]);

  async function encerrar(r) {
    const ok = await confirmar('Encerrar conta mensal', `Encerrar "${r.descricao}"? O histórico é mantido e os próximos meses em aberto são removidos.`, 'Encerrar', { icone: 'stop-circle' });
    if (!ok) return;
    try {
      await api(`/recorrencias/${r.id}`, { metodo: 'DELETE' });
      avisar('Conta mensal encerrada');
      carregar();
    } catch (e) { avisar(e.message); }
  }

  return (
    <Pagina>
      <Cabecalho
        titulo="Contas mensais"
        subtitulo='Aluguel, luz, internet, salário… Cada mês gera um lançamento "a pagar" para você dar baixa.'
        acao={<Botao titulo="Conta mensal" icone="plus" onPress={() => setNova(true)} />}
      />
      {fixas.length ? (
        <View className="gap-px overflow-hidden rounded-3xl border border-borda bg-borda">
          {fixas.map((r) => (
            <View key={r.id} className={`flex-row items-center gap-3 bg-cartao px-4 py-4 ${r.ativo ? '' : 'opacity-50'}`}>
              <View className={`h-10 w-10 items-center justify-center rounded-full ${(TIPOS[r.tipo] ?? TIPOS.saida).fundo}`}>
                <Icone nome="repeat" tamanho={16} cor={(TIPOS[r.tipo] ?? TIPOS.saida).tom} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold text-tinta" numberOfLines={1}>{r.descricao}</Text>
                <Text className="text-xs text-tinta-mudo">
                  Todo dia {r.dia_vencimento}{r.categoria ? ` · ${r.categoria.nome}` : ''}{r.ativo ? '' : ' · encerrada'}
                </Text>
              </View>
              <View className="items-end gap-1.5">
                <Text className="font-bold text-tinta">{brl(r.valor)}</Text>
                {r.ativo ? (
                  <View className="flex-row gap-1.5">
                    <BotaoMini titulo="Editar" onPress={() => setEditando(r)} />
                    <BotaoMini titulo="Encerrar" tom="perigo" onPress={() => encerrar(r)} />
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Vazio icone="repeat" texto={'Nenhuma conta mensal.\nNo chat: "Internet 120 mensal pendente".'} />
      )}

      <FolhaTransacao visivel={nova} preset={{ recorrencia: 'mensal', status: 'a_pagar' }} aoFechar={() => setNova(false)} />
      <FolhaFixa recorrencia={editando} categorias={categorias} aoFechar={() => setEditando(null)} aoSalvar={carregar} />
    </Pagina>
  );
}

function FolhaFixa({ recorrencia: r, categorias, aoFechar, aoSalvar }) {
  const { avisar, atualizarDados } = useApp();
  const [f, setF] = useState({});
  useEffect(() => {
    if (r) setF({ descricao: r.descricao, valor: String(r.valor).replace('.', ','), categoria_id: r.categoria_id, dia: String(r.dia_vencimento) });
  }, [r]);
  const mudar = (c) => (v) => setF((x) => ({ ...x, [c]: v }));

  const opcoes = [{ valor: null, rotulo: 'Sem categoria' }]
    .concat(categorias.filter((c) => !r || c.tipo === r.tipo || c.tipo === 'ambos').map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor })));
  if (r?.categoria && !opcoes.some((o) => o.valor === r.categoria.id)) opcoes.push({ valor: r.categoria.id, rotulo: r.categoria.nome, cor: r.categoria.cor });

  async function salvar() {
    try {
      await api(`/recorrencias/${r.id}`, {
        metodo: 'PATCH',
        corpo: { descricao: f.descricao, valor: lerNumero(f.valor), categoria_id: f.categoria_id, dia_vencimento: Number(f.dia) },
      });
      avisar('Conta mensal atualizada');
      atualizarDados();
      aoSalvar();
      aoFechar();
    } catch (e) { avisar(e.message); }
  }

  return (
    <Folha visivel={Boolean(r)} aoFechar={aoFechar} titulo="Editar conta mensal">
      <Campo rotulo="Descrição" value={f.descricao} onChangeText={mudar('descricao')} />
      <Campo rotulo="Valor (R$)" value={f.valor} onChangeText={mudar('valor')} keyboardType="decimal-pad" />
      <Opcoes rotulo="Categoria" opcoes={opcoes} valor={f.categoria_id} onChange={mudar('categoria_id')} />
      <Campo rotulo="Dia do vencimento" value={f.dia} onChangeText={mudar('dia')} keyboardType="number-pad" maxLength={2} />
      <Text className="text-xs text-tinta-mudo">Alterações valem para os meses em aberto a partir do mês atual.</Text>
      <View className="flex-row justify-end gap-2">
        <Botao titulo="Cancelar" variante="fantasma" onPress={aoFechar} />
        <Botao titulo="Salvar" onPress={salvar} />
      </View>
    </Folha>
  );
}
