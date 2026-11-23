import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { brl, diaSemana } from '../lib/formato';

const COR_ENTRADA = '#1baf7a';
const COR_SAIDA = '#e34948';
const COR_INVESTIMENTO = '#2a78d6';
const COR_OUTRAS = '#898781';
const ALTURA = 180;

function fatias(modo, inicio, fim) {
  if (modo === 'dia') {
    return Array.from({ length: 24 }, (_, h) => ({ rotulo: `${h}h`, titulo: `${h}h às ${h + 1}h`, pertence: (d) => d.getHours() === h }));
  }
  const lista = [];
  for (let d = new Date(inicio); d < fim; d.setDate(d.getDate() + 1)) {
    const dia = new Date(d);
    lista.push({
      rotulo: modo === 'semana' ? diaSemana(dia) : String(dia.getDate()),
      titulo: `${diaSemana(dia)}, ${dia.getDate()}/${dia.getMonth() + 1}`,
      pertence: (x) => x.toDateString() === dia.toDateString(),
    });
  }
  return lista;
}

// Valor "redondo" para o topo do eixo.
function topoEixo(max) {
  if (max <= 0) return 100;
  const passo = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / passo) * passo;
}

const Legenda = ({ itens }) => (
  <View className="flex-row flex-wrap gap-4">
    {itens.map((i) => (
      <View key={i.rotulo} className="flex-row items-center gap-1.5">
        <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.cor }} />
        <Text className="text-xs text-tinta-2">{i.rotulo}</Text>
      </View>
    ))}
  </View>
);

// Barras agrupadas de entradas, saídas e investimentos ao longo do período.
export function GraficoFluxo({ lista, periodo }) {
  const [foco, setFoco] = useState(null);
  const grupos = useMemo(() => {
    const fs = fatias(periodo.modo, periodo.inicio, periodo.fim);
    return fs.map((g) => {
      const doGrupo = lista.filter((t) => g.pertence(new Date(t.data)));
      const soma = (tipo) => doGrupo.filter((t) => t.tipo === tipo).reduce((s, t) => s + Number(t.valor), 0);
      return { ...g, entrada: soma('entrada'), saida: soma('saida'), investimento: soma('investimento') };
    });
  }, [lista, periodo.modo, periodo.inicio, periodo.fim]);

  const topo = topoEixo(Math.max(0, ...grupos.map((g) => Math.max(g.entrada, g.saida, g.investimento))));
  const marcarRotulo = grupos.length > 12 ? Math.ceil(grupos.length / 8) : 1;
  const ativo = foco !== null ? grupos[foco] : null;

  return (
    <View className="gap-4">
      <View className="min-h-[40px] flex-row items-start justify-between gap-3">
        <Legenda itens={[{ rotulo: 'Entradas', cor: COR_ENTRADA }, { rotulo: 'Saídas', cor: COR_SAIDA }, { rotulo: 'Investimentos', cor: COR_INVESTIMENTO }]} />
        {ativo ? (
          <View className="items-end">
            <Text className="text-xs font-semibold text-tinta">{ativo.titulo}</Text>
            <Text className="text-right text-xs text-tinta-2">Entradas {brl(ativo.entrada)} · Saídas {brl(ativo.saida)}{'\n'}Investimentos {brl(ativo.investimento)}</Text>
          </View>
        ) : (
          <Text className="text-xs text-tinta-mudo">Toque numa barra para ver os valores</Text>
        )}
      </View>

      <View className="flex-row gap-2">
        <View className="justify-between pb-5" style={{ height: ALTURA + 20 }}>
          <Text className="text-[10px] text-tinta-mudo">{brl(topo).replace(',00', '')}</Text>
          <Text className="text-[10px] text-tinta-mudo">{brl(topo / 2).replace(',00', '')}</Text>
          <Text className="text-[10px] text-tinta-mudo">R$ 0</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-end border-b border-tinta/25" style={{ height: ALTURA }}>
            <View className="absolute left-0 right-0 top-0 border-t border-tinta/10" />
            <View className="absolute left-0 right-0 border-t border-tinta/10" style={{ top: ALTURA / 2 }} />
            {grupos.map((g, i) => (
              <Pressable
                key={i}
                onPress={() => setFoco(foco === i ? null : i)}
                onHoverIn={() => setFoco(i)}
                className={`h-full flex-1 flex-row items-end justify-center gap-[2px] rounded-t-md px-[1px] ${foco === i ? 'bg-tinta/5' : ''}`}
              >
                <Barra valor={g.entrada} topo={topo} cor={COR_ENTRADA} />
                <Barra valor={g.saida} topo={topo} cor={COR_SAIDA} />
                <Barra valor={g.investimento} topo={topo} cor={COR_INVESTIMENTO} />
              </Pressable>
            ))}
          </View>
          <View className="h-5 flex-row">
            {grupos.map((g, i) => (
              <Text key={i} className="flex-1 pt-1 text-center text-[10px] text-tinta-mudo" numberOfLines={1}>
                {i % marcarRotulo === 0 ? g.rotulo : ''}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const Barra = ({ valor, topo, cor }) => (
  <View
    className="max-w-[16px] flex-1 rounded-t-[4px]"
    style={{ height: valor > 0 ? Math.max(2, (valor / topo) * ALTURA) : 0, backgroundColor: cor }}
  />
);

// Gastos por categoria: barras horizontais ordenadas (mais fácil de comparar que pizza).
export function GraficoCategorias({ lista }) {
  const itens = useMemo(() => {
    const mapa = new Map();
    for (const t of lista.filter((x) => x.tipo === 'saida')) {
      const chave = t.categoria?.id ?? 'sem';
      const atual = mapa.get(chave) ?? { nome: t.categoria?.nome ?? 'Sem categoria', cor: t.categoria?.cor ?? COR_OUTRAS, total: 0, qtd: 0 };
      atual.total += Number(t.valor);
      atual.qtd += 1;
      mapa.set(chave, atual);
    }
    let ordenados = [...mapa.values()].sort((a, b) => b.total - a.total);
    if (ordenados.length > 7) {
      const resto = ordenados.slice(6);
      ordenados = [...ordenados.slice(0, 6), { nome: 'Outras', cor: COR_OUTRAS, total: resto.reduce((s, i) => s + i.total, 0), qtd: resto.reduce((s, i) => s + i.qtd, 0) }];
    }
    return ordenados;
  }, [lista]);

  const total = itens.reduce((s, i) => s + i.total, 0);
  const maior = itens[0]?.total ?? 0;
  if (!itens.length) return <Text className="py-8 text-center text-sm text-tinta-mudo">Nenhuma saída no período.</Text>;

  return (
    <View className="gap-4">
      {itens.map((i) => (
        <View key={i.nome} className="gap-1.5">
          <View className="flex-row items-baseline justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.cor }} />
              <Text className="text-sm font-medium text-tinta" numberOfLines={1}>{i.nome}</Text>
              <Text className="text-xs text-tinta-mudo">{i.qtd}x</Text>
            </View>
            <Text className="text-sm font-semibold text-tinta">{brl(i.total)}</Text>
            <Text className="w-10 text-right text-xs text-tinta-mudo">{Math.round((i.total / total) * 100)}%</Text>
          </View>
          <View className="h-2.5 overflow-hidden rounded-full bg-tinta/5">
            <View className="h-full rounded-full" style={{ width: `${(i.total / maior) * 100}%`, backgroundColor: i.cor }} />
          </View>
        </View>
      ))}
    </View>
  );
}
