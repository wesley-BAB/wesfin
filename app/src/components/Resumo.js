import { Text, View } from 'react-native';
import { brl, totais } from '../lib/formato';
import { Icone } from './ui';

// Cartão principal com o saldo livre + cartões menores de entradas, saídas, investimentos e pendências.
export function Resumo({ lista }) {
  const t = totais(lista);
  const saidaTotal = t.saidas + t.investimentos;
  const saldo = t.entradas - saidaTotal;
  const usoPct = t.entradas > 0 ? Math.min(100, Math.round((saidaTotal / t.entradas) * 100)) : saidaTotal > 0 ? 100 : 0;

  return (
    <View className="gap-3">
      <View className="overflow-hidden rounded-[28px] bg-marca p-6">
        <View className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <View className="absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-white/10" />
        <Text className="text-sm font-medium text-white/80">Saldo livre do período</Text>
        <Text className="mt-1 text-4xl font-bold tracking-tight text-white">{brl(saldo)}</Text>

        <View className="mt-5 gap-2">
          <View className="h-2 overflow-hidden rounded-full bg-white/20">
            <View className="h-full rounded-full bg-white" style={{ width: `${usoPct}%` }} />
          </View>
          <Text className="text-xs text-white/90">
            {t.entradas > 0
              ? `${usoPct}% do que entrou foi gasto ou investido`
              : saidaTotal > 0 ? 'Saídas sem entradas neste período' : 'Nenhum movimento pago ainda'}
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <Mini icone="arrow-down-left" rotulo="Entradas" valor={t.entradas} detalhe={t.aReceber ? `+ ${brl(t.aReceber)} a receber` : 'recebido'} tom="entrada" />
        <Mini icone="arrow-up-right" rotulo="Saídas" valor={t.saidas} detalhe="pago" tom="saida" />
        <Mini icone="trending-up" rotulo="Investimentos" valor={t.investimentos} detalhe="aplicado" tom="investimento" />
        <Mini
          icone="clock"
          rotulo="A pagar"
          valor={t.aPagar}
          detalhe={t.qtdAPagar ? `${t.qtdAPagar} conta${t.qtdAPagar > 1 ? 's' : ''} em aberto` : 'tudo em dia'}
          tom="pendente"
        />
      </View>
    </View>
  );
}

const TONS = {
  entrada: { fundo: 'bg-entrada-fundo', icone: 'entrada' },
  saida: { fundo: 'bg-saida-fundo', icone: 'saida' },
  investimento: { fundo: 'bg-investimento-fundo', icone: 'investimento' },
  pendente: { fundo: 'bg-pendente-fundo', icone: 'pendente' },
};

function Mini({ icone, rotulo, valor, detalhe, tom }) {
  const c = TONS[tom];
  return (
    <View className="min-w-[150px] flex-1 gap-3 rounded-3xl border border-borda bg-cartao p-4">
      <View className="flex-row items-center gap-2">
        <View className={`h-8 w-8 items-center justify-center rounded-full ${c.fundo}`}>
          <Icone nome={icone} tamanho={16} cor={c.icone} />
        </View>
        <Text className="text-sm font-medium text-tinta-2">{rotulo}</Text>
      </View>
      <View>
        <Text className="text-xl font-bold text-tinta" numberOfLines={1}>{brl(valor)}</Text>
        <Text className="text-xs text-tinta-mudo" numberOfLines={1}>{detalhe}</Text>
      </View>
    </View>
  );
}
