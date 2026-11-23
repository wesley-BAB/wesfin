import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { useCores } from '../lib/tema';

// WESIA: a assistente do registro rápido.
export const NOME_WESIA = 'WESIA';

// Ícone de robô (aceita nome de cor do tema ou hexadecimal, como Icone).
export function IconeWesia({ tamanho = 22, cor = '#ffffff' }) {
  const cores = useCores();
  return <MaterialCommunityIcons name="robot-happy-outline" size={tamanho} color={cores[cor] ?? cor} />;
}

// Avatar redondo com a bolinha verde de "online", como nos mensageiros.
export function AvatarWesia({ tamanho = 40, online = true }) {
  const bolinha = Math.round(tamanho * 0.3);
  return (
    <View style={{ width: tamanho, height: tamanho }}>
      <View className="flex-1 items-center justify-center rounded-full bg-[#0f1f15]">
        <IconeWesia tamanho={tamanho * 0.58} cor="#6cc24a" />
      </View>
      {online ? (
        <View
          className="absolute rounded-full border-2 border-zap-escuro bg-[#4be07a]"
          style={{ width: bolinha, height: bolinha, right: -1, bottom: -1 }}
        />
      ) : null}
    </View>
  );
}
