import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexto/AppContexto';
import { Marca, NomeMarca } from './Marca';
import { Icone } from './ui';

export const MENU = [
  { rota: '/', titulo: 'Início', icone: 'home' },
  { rota: '/painel', titulo: 'Financeiro', icone: 'credit-card' },
  { rota: '/graficos', titulo: 'Gráficos', icone: 'bar-chart-2' },
  { rota: '/fixas', titulo: 'Contas mensais', icone: 'repeat' },
  { rota: '/categorias', titulo: 'Minhas categorias', icone: 'tag' },
  { rota: '/compartilhar', titulo: 'Compartilhar conta', icone: 'users' },
  { rota: '/historico', titulo: 'Histórico', icone: 'clock' },
];


export function Avatar({ usuario, tamanho = 30 }) {
  const estilo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  if (usuario?.foto_url) return <Image source={{ uri: usuario.foto_url }} style={estilo} />;
  return (
    <View className="items-center justify-center bg-marca-claro" style={estilo}>
      <Text className="font-bold text-marca-texto">{(usuario?.nome || usuario?.email || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// Barra do topo das telas internas: logo e um botão que abre o menu suspenso.
export function Topo() {
  const { usuario } = useApp();
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const atual = MENU.find((m) => m.rota === caminho);
  const insets = useSafeAreaInsets();

  return (
    <View className="z-10 flex-row items-center gap-3 border-b border-borda bg-cartao px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
      <Pressable onPress={() => router.push('/')} className="flex-row items-center gap-2">
        <Marca altura={26} />
        <NomeMarca tamanho={15} />
      </Pressable>
      {atual ? <Text className="text-sm font-medium text-tinta-mudo">/ {atual.titulo}</Text> : null}

      <Pressable
        onPress={() => setAberto(true)}
        accessibilityLabel="Abrir menu"
        className="ml-auto flex-row items-center gap-2 rounded-full border border-borda bg-cartao py-1 pl-1 pr-3 active:bg-fundo"
      >
        <Avatar usuario={usuario} />
        <Icone nome="menu" />
      </Pressable>

      <MenuSuspenso aberto={aberto} aoFechar={() => setAberto(false)} lado="direita" />
    </View>
  );
}

// Menu suspenso: usuário, troca de conta, navegação e sair.
export function MenuSuspenso({ aberto, aoFechar, lado = 'direita' }) {
  const { usuario, contas, conta, trocarConta, sair, tema, setTema } = useApp();
  const caminho = usePathname();
  const insets = useSafeAreaInsets();
  const escuro = tema === 'escuro';

  const ir = (rota) => {
    aoFechar();
    router.push(rota);
  };

  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable className="flex-1 bg-black/20" onPress={aoFechar}>
        <Pressable
          onPress={() => {}}
          style={{ top: insets.top + 56 }}
          className={`absolute ${lado === 'esquerda' ? 'left-3' : 'right-3'} w-[300px] max-w-[92%] gap-1 rounded-3xl border border-borda bg-cartao p-2 shadow-xl`}
        >
          <View className="flex-row items-center gap-3 px-3 py-3">
            <Avatar usuario={usuario} tamanho={38} />
            <View className="flex-1">
              <Text className="font-semibold text-tinta" numberOfLines={1}>{usuario?.nome}</Text>
              <Text className="text-xs text-tinta-2" numberOfLines={1}>{usuario?.email}</Text>
            </View>
          </View>

          {contas.length > 1 ? (
            <View className="gap-1.5 border-t border-borda px-3 py-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-tinta-mudo">Conta</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {contas.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => trocarConta(c.id)}
                    className={`rounded-full border px-3 py-1.5 ${c.id === conta?.id ? 'border-marca bg-marca-claro' : 'border-borda'}`}
                  >
                    <Text className={`text-xs ${c.id === conta?.id ? 'font-semibold text-marca-texto' : 'text-tinta-2'}`}>
                      {c.nome}{c.papel === 'dono' ? '' : ' · compartilhada'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="border-t border-borda py-1">
            {MENU.map((m) => {
              const ativo = m.rota === caminho;
              return (
                <Pressable
                  key={m.rota}
                  onPress={() => ir(m.rota)}
                  className={`flex-row items-center gap-3 rounded-2xl px-3 py-2.5 ${ativo ? 'bg-marca-claro' : 'active:bg-fundo'}`}
                >
                  <Icone nome={m.icone} tamanho={17} cor={ativo ? 'marcaTexto' : 'tinta2'} />
                  <Text className={`text-[15px] ${ativo ? 'font-semibold text-marca-texto' : 'text-tinta'}`}>{m.titulo}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setTema(escuro ? 'claro' : 'escuro')}
            accessibilityRole="switch"
            accessibilityState={{ checked: escuro }}
            className="flex-row items-center gap-3 rounded-2xl border-t border-borda px-3 py-3 active:bg-fundo"
          >
            <Icone nome={escuro ? 'moon' : 'sun'} tamanho={17} />
            <Text className="flex-1 text-[15px] text-tinta">Modo escuro</Text>
            <View className={`h-6 w-11 justify-center rounded-full px-0.5 ${escuro ? 'items-end bg-marca' : 'items-start bg-tinta/20'}`}>
              <View className="h-5 w-5 rounded-full bg-white shadow-sm" />
            </View>
          </Pressable>

          <Pressable
            onPress={() => { aoFechar(); sair(); }}
            className="flex-row items-center gap-3 rounded-2xl border-t border-borda px-3 py-3 active:bg-saida-fundo"
          >
            <Icone nome="log-out" tamanho={17} cor="saida" />
            <Text className="text-[15px] text-saida-texto">Sair</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
