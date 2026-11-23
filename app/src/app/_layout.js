import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HostConfirmacao } from '../components/Confirmacao';
import { AppProvider, useApp } from '../contexto/AppContexto';
import { useCores } from '../lib/tema';

function Aviso() {
  const { aviso } = useApp();
  if (!aviso) return null;
  return (
    <View pointerEvents="none" className="absolute bottom-24 left-0 right-0 items-center px-4">
      <View className="rounded-2xl bg-tinta px-5 py-3 shadow-lg">
        <Text className="text-sm text-fundo">{aviso}</Text>
      </View>
    </View>
  );
}

function Telas() {
  const { tema } = useApp();
  const cores = useCores();
  return (
    <>
      <StatusBar style={tema === 'escuro' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
      <Aviso />
      <HostConfirmacao />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Telas />
      </AppProvider>
    </SafeAreaProvider>
  );
}
