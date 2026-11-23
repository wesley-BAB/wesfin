import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomeMarca, Selo } from '../../components/Marca';
import { MenuSuspenso } from '../../components/Topo';
import { IconeWesia } from '../../components/Wesia';
import { Icone } from '../../components/ui';
import { useApp } from '../../contexto/AppContexto';
import { api } from '../../lib/api';
import { brl, periodo, totais, TIPOS } from '../../lib/formato';

const saudacao = (h) => (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

// Tela inicial: faixa verde com saudação, cartão com o mês e os dois atalhos.
export default function Inicio() {
  const { usuario, conta, versao, avisar, setChatAberto } = useApp();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  const [t, setT] = useState(null);
  const primeiroNome = usuario?.nome?.split(' ')[0];
  const mes = periodo('mes', new Date());

  useEffect(() => {
    if (!conta) return;
    const consulta = `inicio=${encodeURIComponent(mes.inicio.toISOString())}&fim=${encodeURIComponent(mes.fim.toISOString())}`;
    api(`/transacoes?${consulta}`).then((lista) => setT(totais(lista))).catch((e) => avisar(e.message));
  }, [conta, versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas = [
    { tipo: 'saida', destaque: 'Gastos', resto: 'do mês', valor: t?.saidas, detalhe: t?.aPagar ? `+ ${brl(t.aPagar)} a pagar` : null },
    { tipo: 'entrada', destaque: 'Entradas', resto: 'do mês', valor: t?.entradas, detalhe: t?.aReceber ? `+ ${brl(t.aReceber)} a receber` : null },
    { tipo: 'investimento', destaque: 'Investimentos', resto: 'do mês', valor: t?.investimentos, detalhe: null },
  ];
  const saldo = t ? t.entradas - t.saidas - t.investimentos : null;

  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="pb-12">
      <LinearGradient
        colors={['#6cc24a', '#2bb35f']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
      >
        <View className="mx-auto w-full max-w-[480px] px-5">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setMenu(true)}
              accessibilityLabel="Abrir menu"
              className="h-10 w-10 items-center justify-center rounded-full border-2 border-white active:bg-white/20"
            >
              <Icone nome="user" tamanho={20} cor="#ffffff" />
            </Pressable>
            <View className="flex-row items-center gap-2">
              <Selo tamanho={30} />
              <NomeMarca tamanho={15} clara />
            </View>
            <Pressable
              onPress={() => router.push('/graficos')}
              accessibilityLabel="Gráficos"
              className="h-10 w-10 items-center justify-center rounded-full active:bg-white/20"
            >
              <Icone nome="bar-chart-2" tamanho={24} cor="#ffffff" />
            </Pressable>
          </View>

          <View className="items-center pt-10">
            <Text className="text-center text-[30px] font-light leading-[38px] text-white">
              {saudacao(new Date().getHours())},{'\n'}
              <Text className="font-bold">{primeiroNome ?? 'você'}</Text>!
            </Text>
            <Text className="mt-3 text-sm text-white/90">
              Saldo livre de {mes.rotulo.split(' ')[0].toLowerCase()}:{' '}
              <Text className="font-semibold text-white">{saldo === null ? '…' : brl(saldo)}</Text>
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mx-auto -mt-[84px] w-full max-w-[480px] gap-5 px-5">
        <View className="overflow-hidden rounded-2xl bg-cartao shadow-lg shadow-black/10">
          {linhas.map((l, i) => {
            const v = TIPOS[l.tipo];
            return (
              <Pressable
                key={l.tipo}
                onPress={() => router.push('/painel')}
                className={`flex-row items-center gap-4 px-5 py-5 active:bg-fundo ${i ? 'border-t border-borda' : ''}`}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-xl ${v.fundo}`}>
                  <Icone nome={v.icone} tamanho={20} cor={v.tom} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] text-tinta-2" numberOfLines={1}>
                    <Text className="font-bold text-tinta">{l.destaque}</Text> {l.resto}
                  </Text>
                  {l.detalhe ? <Text className="text-xs text-tinta-mudo" numberOfLines={1}>{l.detalhe}</Text> : null}
                </View>
                <Text className="text-base font-bold text-tinta">{l.valor === undefined ? '…' : brl(l.valor)}</Text>
                <Icone nome="chevron-right" tamanho={18} cor="mudo" />
              </Pressable>
            );
          })}
        </View>

        <View className="gap-3">
          <Pressable
            onPress={() => setChatAberto(true)}
            className="flex-row items-center justify-center gap-3 rounded-full bg-marca py-5 shadow-lg shadow-marca/30 active:scale-[0.98] active:bg-marca-escuro"
          >
            <IconeWesia tamanho={26} />
            <Text className="text-lg font-bold text-white">Registre rápido com WESIA</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/painel')}
            className="flex-row items-center justify-center gap-3 rounded-full border border-borda bg-cartao py-5 active:scale-[0.98] active:bg-fundo"
          >
            <Icone nome="pie-chart" tamanho={20} cor="tinta" />
            <Text className="text-lg font-semibold text-tinta">Visualizar financeiro</Text>
          </Pressable>
        </View>
      </View>

      <MenuSuspenso aberto={menu} aoFechar={() => setMenu(false)} lado="esquerda" />
    </ScrollView>
  );
}
