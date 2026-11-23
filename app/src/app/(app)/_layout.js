import { Redirect, Slot, usePathname } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Chat } from '../../components/Chat';
import { Topo } from '../../components/Topo';
import { IconeWesia } from '../../components/Wesia';
import { useApp } from '../../contexto/AppContexto';

// Área logada: topo com menu suspenso, conteúdo e o chat de registro rápido.
// A tela inicial tem o próprio topo (faixa verde), por isso fica sem a barra.
export default function LayoutApp() {
  const { usuario, carregando, setChatAberto } = useApp();
  const caminho = usePathname();
  const inicio = caminho === '/';

  if (carregando) {
    return (
      <View className="flex-1 items-center justify-center bg-fundo">
        <ActivityIndicator color="#1f7d3b" />
      </View>
    );
  }
  if (!usuario) return <Redirect href="/login" />;

  return (
    <View className="flex-1 bg-fundo">
      {inicio ? null : <Topo />}
      <View className="flex-1">
        <Slot />
      </View>

      {/* No início o botão grande já cumpre esse papel */}
      {inicio ? null : (
        <Pressable
          onPress={() => setChatAberto(true)}
          accessibilityLabel="Registre rápido com WESIA"
          className="absolute bottom-6 right-5 h-16 w-16 items-center justify-center rounded-full bg-marca shadow-lg active:scale-95"
        >
          <IconeWesia tamanho={32} />
        </Pressable>
      )}

      <Chat />
    </View>
  );
}
