import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../contexto/AppContexto';
import { api } from '../lib/api';
import { confirmar } from '../lib/confirmar';
import { brl, dataCurta, dataHora, diaSemana, hora, lerCampoData, lerNumero, paraCampoData, TIPOS } from '../lib/formato';
import { Botao, BotaoMini, Campo, Folha, Icone, Opcoes, Segmentado } from './ui';

export function ItemTransacao({ t, aoAbrir, aoPagar }) {
  const { usuario } = useApp();
  const aberto = t.status === 'a_pagar';
  const atrasado = aberto && new Date(t.data) < new Date();
  const entrada = t.tipo === 'entrada';
  const visual = TIPOS[t.tipo] ?? TIPOS.saida;
  const outroAutor = t.autor && t.autor.email !== usuario?.email;

  return (
    <Pressable
      onPress={() => aoAbrir(t)}
      className="flex-row items-center gap-3.5 rounded-2xl border border-borda bg-cartao px-4 py-4 active:opacity-70"
    >
      <View className={`h-11 w-11 items-center justify-center rounded-2xl ${visual.fundo}`}>
        <Icone nome={visual.icone} tamanho={19} cor={visual.tom} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-[15px] font-semibold text-tinta" numberOfLines={1}>{t.descricao}</Text>
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="text-xs text-tinta-mudo">{hora(t.data)}</Text>
          {t.categoria ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-tinta/5 px-2 py-0.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: t.categoria.cor }} />
              <Text className="text-xs text-tinta-2">{t.categoria.nome}</Text>
            </View>
          ) : null}
          {t.recorrencia_id ? <Text className="text-xs text-tinta-mudo">↻ mensal</Text> : null}
          {outroAutor ? <Text className="text-xs text-tinta-mudo">por {t.autor.nome?.split(' ')[0] ?? t.autor.email}</Text> : null}
        </View>
      </View>
      <View className="items-end gap-1.5">
        <Text className={`text-[15px] font-bold ${entrada ? 'text-entrada-texto' : t.tipo === 'investimento' ? 'text-investimento-texto' : 'text-tinta'}`}>{visual.sinal} {brl(t.valor)}</Text>
        {aberto ? (
          <View className="flex-row items-center gap-1.5">
            <Text className={`text-[11px] font-semibold ${atrasado ? 'text-saida-texto' : 'text-pendente-texto'}`}>
              {atrasado ? '⚠ vencida' : entrada ? 'a receber' : t.tipo === 'investimento' ? 'a aplicar' : 'a pagar'}
            </Text>
            <BotaoMini titulo={entrada ? 'Recebi' : t.tipo === 'investimento' ? 'Apliquei' : 'Pagar'} icone="check" tom="ok" onPress={() => aoPagar(t)} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// Agrupa por dia (na ordem em que vierem), com o saldo do dia ao lado da data.
function porDia(lista) {
  const grupos = [];
  for (const t of lista) {
    const chave = new Date(t.data).toDateString();
    let g = grupos.at(-1);
    if (!g || g.chave !== chave) grupos.push((g = { chave, data: t.data, itens: [] }));
    g.itens.push(t);
  }
  return grupos;
}

function rotuloDia(d) {
  const dia = new Date(d).toDateString();
  const hoje = new Date();
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const base = `${diaSemana(d)}, ${dataCurta(d)}`;
  if (dia === hoje.toDateString()) return `Hoje · ${base}`;
  if (dia === ontem.toDateString()) return `Ontem · ${base}`;
  if (dia === amanha.toDateString()) return `Amanhã · ${base}`;
  return base;
}

const sinalDoTipo = { entrada: 1, saida: -1, investimento: -1 };

export function ListaTransacoes({ lista, aoAbrir, aoPagar, vazio }) {
  if (!lista.length) return vazio;
  return (
    <View className="gap-5">
      {porDia(lista).map((g) => {
        const saldo = g.itens.reduce((s, t) => s + (sinalDoTipo[t.tipo] ?? -1) * Number(t.valor), 0);
        return (
          <View key={g.chave} className="gap-2">
            <View className="flex-row items-baseline justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-tinta-mudo">{rotuloDia(g.data)}</Text>
              <Text className="text-xs font-medium text-tinta-mudo">
                {saldo > 0 ? '+ ' : saldo < 0 ? '− ' : ''}{brl(Math.abs(saldo))}
              </Text>
            </View>
            {g.itens.map((t) => <ItemTransacao key={t.id} t={t} aoAbrir={aoAbrir} aoPagar={aoPagar} />)}
          </View>
        );
      })}
    </View>
  );
}

// Cartão do lançamento mostrado no diálogo de exclusão.
function ResumoLancamento({ t }) {
  const visual = TIPOS[t.tipo] ?? TIPOS.saida;
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-borda bg-fundo px-4 py-3.5">
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${visual.fundo}`}>
        <Icone nome={visual.icone} tamanho={18} cor={visual.tom} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-tinta" numberOfLines={1}>{t.descricao}</Text>
        <Text className="text-xs text-tinta-mudo" numberOfLines={1}>
          {dataHora(t.data)}{t.categoria ? ` · ${t.categoria.nome}` : ''}
        </Text>
      </View>
      <Text className="font-bold text-tinta">{visual.sinal} {brl(t.valor)}</Text>
    </View>
  );
}

export async function darBaixa(t, avisar, atualizar) {
  try {
    await api(`/transacoes/${t.id}/pagar`, { metodo: 'POST', corpo: {} });
    avisar({ entrada: 'Recebimento confirmado', investimento: 'Aplicação confirmada' }[t.tipo] ?? 'Conta paga');
    atualizar();
  } catch (e) {
    avisar(e.message);
  }
}

// Formulário de novo lançamento / edição.
export function FolhaTransacao({ visivel, transacao, preset = {}, aoFechar }) {
  const { categorias, avisar, atualizarDados } = useApp();
  const [f, setF] = useState({});
  const editar = Boolean(transacao);

  useEffect(() => {
    if (!visivel) return;
    const t = transacao;
    setF({
      tipo: t?.tipo ?? preset.tipo ?? 'saida',
      valor: t ? String(t.valor).replace('.', ',') : '',
      descricao: t?.descricao ?? '',
      categoria_id: t?.categoria_id ?? null,
      data: paraCampoData(t?.data ?? new Date()),
      status: t?.status ?? preset.status ?? 'pago',
      recorrencia: preset.recorrencia ?? 'unica',
    });
  }, [visivel, transacao]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (campo) => (valor) => setF((x) => ({ ...x, [campo]: valor }));
  const entrada = f.tipo === 'entrada';

  const opcoesCategoria = [{ valor: null, rotulo: 'Sem categoria' }]
    .concat(categorias.filter((c) => c.tipo === f.tipo || c.tipo === 'ambos').map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor })));
  if (transacao?.categoria && !opcoesCategoria.some((o) => o.valor === transacao.categoria.id)) {
    opcoesCategoria.push({ valor: transacao.categoria.id, rotulo: `${transacao.categoria.nome} (de outro membro)`, cor: transacao.categoria.cor });
  }

  async function salvar() {
    const valor = lerNumero(f.valor);
    const data = lerCampoData(f.data);
    if (!(valor > 0)) return avisar('Informe um valor válido');
    if (!f.descricao.trim()) return avisar('Informe a descrição');
    if (!data) return avisar('Data inválida. Use dd/mm/aaaa hh:mm');
    const corpo = { tipo: f.tipo, valor, descricao: f.descricao, categoria_id: f.categoria_id, data: data.toISOString(), status: f.status };
    try {
      if (editar) await api(`/transacoes/${transacao.id}`, { metodo: 'PATCH', corpo });
      else await api('/transacoes', { metodo: 'POST', corpo: { ...corpo, recorrencia: f.recorrencia } });
      avisar('Salvo');
      atualizarDados();
      aoFechar();
    } catch (e) {
      avisar(e.message);
    }
  }

  async function excluir() {
    const ok = await confirmar(
      'Excluir lançamento?',
      transacao.recorrencia_id
        ? 'Só este mês será apagado. Para parar a conta mensal, use "Contas mensais".'
        : 'Ele sai dos totais e dos gráficos. Não é possível desfazer.',
      'Excluir',
      { resumo: <ResumoLancamento t={transacao} /> },
    );
    if (!ok) return;
    try {
      await api(`/transacoes/${transacao.id}`, { metodo: 'DELETE' });
      avisar('Lançamento excluído');
      atualizarDados();
      aoFechar();
    } catch (e) {
      avisar(e.message);
    }
  }

  const titulo = editar ? 'Editar lançamento' : f.recorrencia === 'mensal' ? 'Nova conta mensal' : 'Novo lançamento';

  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={titulo}>
      <Segmentado
        valor={f.tipo}
        onChange={(tipo) => setF((x) => ({ ...x, tipo, categoria_id: null }))}
        opcoes={[{ valor: 'saida', rotulo: 'Saída' }, { valor: 'entrada', rotulo: 'Entrada' }, { valor: 'investimento', rotulo: 'Investimento' }]}
      />
      <Campo rotulo="Valor (R$)" value={f.valor} onChangeText={mudar('valor')} keyboardType="decimal-pad" placeholder="0,00" autoFocus={!editar} />
      <Campo rotulo="Descrição" value={f.descricao} onChangeText={mudar('descricao')} maxLength={120} placeholder="Ex.: Mercado" />
      <Opcoes rotulo="Categoria" opcoes={opcoesCategoria} valor={f.categoria_id} onChange={mudar('categoria_id')} />
      <Campo rotulo="Data e hora" value={f.data} onChangeText={mudar('data')} placeholder="dd/mm/aaaa hh:mm" />
      <Opcoes
        rotulo="Situação"
        valor={f.status}
        onChange={mudar('status')}
        opcoes={
          f.tipo === 'investimento'
            ? [{ valor: 'pago', rotulo: 'Aplicado' }, { valor: 'a_pagar', rotulo: 'A aplicar' }]
            : [{ valor: 'pago', rotulo: entrada ? 'Recebido' : 'Pago' }, { valor: 'a_pagar', rotulo: entrada ? 'A receber' : 'A pagar' }]
        }
      />
      {!editar ? (
        <Opcoes
          rotulo="Repetição"
          valor={f.recorrencia}
          onChange={mudar('recorrencia')}
          opcoes={[{ valor: 'unica', rotulo: 'Única' }, { valor: 'mensal', rotulo: 'Todo mês' }]}
        />
      ) : null}
      {editar ? (
        <Text className="text-xs leading-5 text-tinta-mudo">
          {transacao.recorrencia_id ? 'Lançamento de conta mensal; para mudar os próximos meses use "Contas mensais". ' : ''}
          Criado em {dataHora(transacao.criado_em)}{transacao.autor ? ` por ${transacao.autor.nome ?? transacao.autor.email}` : ''}.
          {transacao.pago_em ? ` Baixa em ${dataHora(transacao.pago_em)}.` : ''}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-2 pt-2">
        {editar ? <Botao titulo="Excluir" variante="perigo" icone="trash-2" onPress={excluir} /> : null}
        <View className="flex-1" />
        <Botao titulo="Cancelar" variante="fantasma" onPress={aoFechar} />
        <Botao titulo="Salvar" onPress={salvar} />
      </View>
    </Folha>
  );
}

export function Filtros({ valor, onChange }) {
  const opcoes = [
    { valor: 'todas', rotulo: 'Todas' },
    { valor: 'entrada', rotulo: 'Entradas' },
    { valor: 'saida', rotulo: 'Saídas' },
    { valor: 'investimento', rotulo: 'Investimentos' },
    { valor: 'a_pagar', rotulo: 'Em aberto' },
  ];
  return (
    <View className="flex-row flex-wrap gap-2">
      {opcoes.map((o) => (
        <Pressable
          key={o.valor}
          onPress={() => onChange(o.valor)}
          className={`rounded-full px-4 py-2 ${o.valor === valor ? 'bg-tinta' : 'border border-borda bg-cartao'}`}
        >
          <Text className={`text-sm ${o.valor === valor ? 'font-semibold text-fundo' : 'text-tinta-2'}`}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}
