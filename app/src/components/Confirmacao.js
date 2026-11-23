import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, Text, View } from 'react-native';
import { registrarHost } from '../lib/confirmar';
import { Icone } from './ui';

// Mostra os pedidos de confirmar(). `embutido`: desenha por cima do conteúdo atual
// (usado dentro de folhas, que já são um Modal) em vez de abrir outro Modal.
export function HostConfirmacao({ embutido = false }) {
  const [pedido, setPedido] = useState(null);
  useEffect(() => registrarHost(setPedido), []);

  if (!pedido) return null;
  const fechar = (ok) => {
    pedido.resolve(ok);
    setPedido(null);
  };
  const dialogo = <Dialogo pedido={pedido} aoFechar={fechar} />;

  if (embutido) return <View className="absolute inset-0 z-50">{dialogo}</View>;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => fechar(false)}>
      {dialogo}
    </Modal>
  );
}

const TONS = {
  perigo: { icone: 'trash-2', cor: 'saida', fundo: 'bg-saida-fundo', botao: 'bg-saida active:opacity-85' },
  neutro: { icone: 'help-circle', cor: 'marcaTexto', fundo: 'bg-marca-claro', botao: 'bg-marca active:bg-marca-escuro' },
};

function Dialogo({ pedido, aoFechar }) {
  const tom = TONS[pedido.tom] ?? TONS.perigo;
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [entrada]);

  return (
    <Pressable className="flex-1 items-center justify-center bg-black/45 px-6" onPress={() => aoFechar(false)}>
      <Animated.View
        style={{
          width: '100%',
          maxWidth: 380,
          opacity: entrada,
          transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}
      >
        <Pressable onPress={() => {}} className="items-center gap-4 rounded-[28px] bg-cartao px-6 pb-6 pt-7 shadow-2xl">
          <View className={`h-16 w-16 items-center justify-center rounded-full ${tom.fundo}`}>
            <Icone nome={pedido.icone ?? tom.icone} tamanho={28} cor={tom.cor} />
          </View>

          <View className="items-center gap-1.5">
            <Text className="text-center text-xl font-bold text-tinta">{pedido.titulo}</Text>
            {pedido.mensagem ? <Text className="text-center text-sm leading-5 text-tinta-2">{pedido.mensagem}</Text> : null}
          </View>

          {pedido.resumo ? <View className="w-full">{pedido.resumo}</View> : null}

          <View className="w-full flex-row gap-3 pt-2">
            <Pressable
              onPress={() => aoFechar(false)}
              className="flex-1 items-center rounded-full border border-borda bg-cartao py-3.5 active:bg-fundo"
            >
              <Text className="text-[15px] font-semibold text-tinta">Cancelar</Text>
            </Pressable>
            <Pressable onPress={() => aoFechar(true)} className={`flex-1 items-center rounded-full py-3.5 ${tom.botao}`}>
              <Text className="text-[15px] font-bold text-white">{pedido.textoOk}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}
