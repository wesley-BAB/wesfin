import { Text, View } from 'react-native';
import { GraficoCategorias, GraficoFluxo } from '../../components/Graficos';
import { SeletorPeriodo } from '../../components/Periodo';
import { Cartao, Pagina } from '../../components/ui';
import { useTransacoes } from '../../components/useTransacoes';
import { brl, dataCurta } from '../../lib/formato';

export default function Graficos() {
  const { lista, periodo } = useTransacoes();
  const maiores = lista.filter((t) => t.tipo === 'saida').sort((a, b) => b.valor - a.valor).slice(0, 5);

  return (
    <Pagina>
      <View className="gap-1">
        <Text className="text-2xl font-bold tracking-tight text-tinta">Gráficos</Text>
        <Text className="text-sm text-tinta-2">Inclui lançamentos pagos e em aberto do período.</Text>
      </View>
      <SeletorPeriodo />

      <Cartao className="gap-4">
        <Text className="text-base font-semibold text-tinta">
          Movimento {periodo.modo === 'dia' ? 'por hora' : 'por dia'}
        </Text>
        <GraficoFluxo lista={lista} periodo={periodo} />
      </Cartao>

      <View className="flex-row flex-wrap gap-5">
        <Cartao className="min-w-[280px] flex-1 gap-4">
          <Text className="text-base font-semibold text-tinta">Gastos por categoria</Text>
          <GraficoCategorias lista={lista} />
        </Cartao>

        <Cartao className="min-w-[280px] flex-1 gap-3">
          <Text className="text-base font-semibold text-tinta">Maiores gastos</Text>
          {maiores.length ? (
            maiores.map((t, i) => (
              <View key={t.id} className="flex-row items-center gap-3 border-b border-borda pb-3 last:border-b-0">
                <Text className="w-5 text-sm font-bold text-tinta-mudo">{i + 1}</Text>
                <View className="flex-1">
                  <Text className="font-medium text-tinta" numberOfLines={1}>{t.descricao}</Text>
                  <Text className="text-xs text-tinta-mudo">{dataCurta(t.data)}{t.categoria ? ` · ${t.categoria.nome}` : ''}</Text>
                </View>
                <Text className="font-semibold text-tinta">{brl(t.valor)}</Text>
              </View>
            ))
          ) : (
            <Text className="py-8 text-center text-sm text-tinta-mudo">Nenhuma saída no período.</Text>
          )}
        </Cartao>
      </View>
    </Pagina>
  );
}
