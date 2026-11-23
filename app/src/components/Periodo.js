import { Pressable, Text, View } from 'react-native';
import { useApp } from '../contexto/AppContexto';
import { navegar, periodo } from '../lib/formato';
import { Icone, Segmentado } from './ui';

export function usePeriodo() {
  const { modo, ref } = useApp();
  return { modo, ...periodo(modo, ref) };
}

export function SeletorPeriodo() {
  const { modo, ref, setModo, setRef } = useApp();
  const { rotulo } = periodo(modo, ref);
  return (
    // Seleção dia/semana/mês em cima e o período escolhido logo abaixo (cabe em telas estreitas)
    <View className="gap-2">
      <Segmentado
        className="w-full"
        valor={modo}
        onChange={setModo}
        opcoes={[{ valor: 'dia', rotulo: 'Dia' }, { valor: 'semana', rotulo: 'Semana' }, { valor: 'mes', rotulo: 'Mês' }]}
      />
      <View className="w-full flex-row items-center justify-between gap-1">
        <Pressable onPress={() => setRef(navegar(modo, ref, -1))} className="h-10 w-10 items-center justify-center rounded-full active:bg-tinta/5" accessibilityLabel="Período anterior">
          <Icone nome="chevron-left" tamanho={20} />
        </Pressable>
        <Pressable onPress={() => setRef(new Date())} className="flex-1 items-center rounded-full px-3 py-2 active:bg-tinta/5">
          <Text className="font-semibold text-tinta">{rotulo}</Text>
        </Pressable>
        <Pressable onPress={() => setRef(navegar(modo, ref, 1))} className="h-10 w-10 items-center justify-center rounded-full active:bg-tinta/5" accessibilityLabel="Próximo período">
          <Icone nome="chevron-right" tamanho={20} />
        </Pressable>
      </View>
    </View>
  );
}
