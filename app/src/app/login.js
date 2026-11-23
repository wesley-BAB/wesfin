import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotaoGoogle } from '../components/BotaoGoogle';
import { Marca, NomeMarca } from '../components/Marca';
import { useApp } from '../contexto/AppContexto';

export default function Login() {
  const { usuario, carregando, entrar } = useApp();
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  const aoReceberToken = useCallback(async (credential) => {
    setErro(null);
    setEntrando(true);
    try {
      await entrar(credential);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEntrando(false);
    }
  }, [entrar]);

  if (!carregando && usuario) return <Redirect href="/" />;

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-fundo px-6">
      <View className="w-full max-w-[360px] items-center gap-3">
        <Marca altura={80} />
        <View className="mt-4"><NomeMarca tamanho={32} /></View>
        <Text className="text-center text-base text-tinta-2">Entradas, saídas e investimentos,{'\n'}simples assim.</Text>
        <View className="mt-8 w-full items-center gap-3">
          {entrando ? <ActivityIndicator color="#1f7d3b" /> : <BotaoGoogle aoReceberToken={aoReceberToken} aoErro={setErro} />}
        </View>
        {erro ? <Text className="text-center text-sm text-saida-texto">{erro}</Text> : null}
        <Text className="mt-6 text-center text-xs leading-5 text-tinta-mudo">
          Entre com qualquer conta Google.{'\n'}No primeiro acesso sua conta é criada automaticamente.
        </Text>
      </View>
    </SafeAreaView>
  );
}
