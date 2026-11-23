import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marca, NomeMarca } from '../components/Marca';
import { Avatar } from '../components/Topo';
import { TreinamentoIA } from '../components/TreinamentoIA';
import { Botao, BotaoMini, Campo, Icone, Vazio } from '../components/ui';
import { IconeWesia } from '../components/Wesia';
import { apiAdmin, entrarAdmin, sairAdmin } from '../lib/api';
import { confirmar } from '../lib/confirmar';
import { dataHora } from '../lib/formato';

// Área do administrador: login próprio (tabela administradores), sessão no banco.
export default function Admin() {
  const [admin, setAdmin] = useState(undefined); // undefined = verificando
  useEffect(() => {
    apiAdmin('/me').then((r) => setAdmin(r.usuario)).catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) {
    return <View className="flex-1 items-center justify-center bg-fundo"><ActivityIndicator color="#1f7d3b" /></View>;
  }
  return admin ? <PainelAdmin admin={admin} aoSair={() => setAdmin(null)} /> : <LoginAdmin aoEntrar={setAdmin} />;
}

function LoginAdmin({ aoEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);

  async function entrar() {
    setErro(null);
    try {
      const r = await entrarAdmin(usuario, senha);
      setSenha('');
      aoEntrar(r.usuario);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-fundo px-6">
      <View className="w-full max-w-[360px] gap-4 rounded-[28px] border border-borda bg-cartao p-8">
        <View className="items-center gap-2 pb-2">
          <Marca altura={60} />
          <View className="mt-2"><NomeMarca tamanho={24} /></View>
          <Text className="text-sm text-tinta-2">Área do administrador</Text>
        </View>
        <Campo rotulo="Usuário" value={usuario} onChangeText={setUsuario} autoCapitalize="none" autoComplete="username" />
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="current-password" onSubmitEditing={entrar} />
        <Botao titulo="Entrar" onPress={entrar} grande disabled={!usuario || !senha} />
        {erro ? <Text className="text-center text-sm text-saida-texto">{erro}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function PainelAdmin({ admin, aoSair }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState(null);
  const [aba, setAba] = useState('usuarios');
  const timerAviso = useRef();

  const avisar = useCallback((texto) => {
    setAviso(texto);
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 4000);
  }, []);

  const carregar = useCallback(async () => {
    try { setUsuarios(await apiAdmin('/usuarios')); } catch (e) { avisar(e.message); }
  }, [avisar]);
  useEffect(() => { carregar(); }, [carregar]);

  async function excluir(u) {
    const ok = await confirmar(
      `Excluir ${u.nome || u.email}?`,
      `Serão apagadas as ${u.contas} conta(s) das quais é dono, com todos os lançamentos (inclusive para quem as compartilha), e as categorias dele. Não pode ser desfeito.`,
      'Excluir',
    );
    if (!ok) return;
    try {
      await apiAdmin(`/usuarios/${u.id}`, { metodo: 'DELETE' });
      avisar('Usuário excluído');
      carregar();
    } catch (e) { avisar(e.message); }
  }

  async function sair() {
    await sairAdmin().catch(() => {});
    aoSair();
  }

  const termo = busca.trim().toLowerCase();
  const lista = usuarios.filter((u) => !termo || `${u.nome} ${u.email}`.toLowerCase().includes(termo));

  return (
    <SafeAreaView className="flex-1 bg-fundo">
      <View className="flex-row items-center gap-3 border-b border-borda bg-cartao px-4 py-3">
        <Marca altura={26} />
        <NomeMarca tamanho={15} />
        <Text className="text-sm text-tinta-mudo">/ Admin</Text>
        <Text className="ml-auto text-sm text-tinta-2">{admin}</Text>
        <Botao titulo="Sair" variante="contorno" icone="log-out" onPress={sair} />
      </View>

      {/* Menu do admin */}
      <View className="flex-row gap-1 border-b border-borda bg-cartao px-3">
        <AbaAdmin ativa={aba === 'usuarios'} onPress={() => setAba('usuarios')} titulo="Usuários" icone={<Icone nome="users" tamanho={17} cor={aba === 'usuarios' ? 'marcaTexto' : 'tinta2'} />} />
        <AbaAdmin ativa={aba === 'ia'} onPress={() => setAba('ia')} titulo="Treinamento da IA" icone={<IconeWesia tamanho={19} cor={aba === 'ia' ? 'marcaTexto' : 'tinta2'} />} />
      </View>

      <ScrollView contentContainerClassName="mx-auto w-full max-w-[1040px] gap-5 px-4 pb-16 pt-6">
        {aviso ? (
          <View className="self-start rounded-full bg-tinta px-4 py-2">
            <Text className="text-sm text-fundo">{aviso}</Text>
          </View>
        ) : null}

        {aba === 'ia' ? (
          <TreinamentoIA avisar={avisar} />
        ) : (
          <>
            <View className="flex-row flex-wrap items-end justify-between gap-3">
              <View>
                <Text className="text-2xl font-bold tracking-tight text-tinta">Usuários do sistema</Text>
                <Text className="text-sm text-tinta-2">{usuarios.length} cadastrado{usuarios.length === 1 ? '' : 's'}</Text>
              </View>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar por nome ou e-mail"
                placeholderTextColor="#898781"
                className="w-full max-w-[320px] rounded-full border border-borda bg-cartao px-4 py-2.5 text-sm text-tinta"
              />
            </View>

            {lista.length ? (
              <View className="gap-px overflow-hidden rounded-3xl border border-borda bg-borda">
                {lista.map((u) => (
                  <View key={u.id} className="flex-row flex-wrap items-center gap-x-4 gap-y-2 bg-cartao px-4 py-4">
                    <View className="min-w-[220px] flex-1 flex-row items-center gap-3">
                      <Avatar usuario={u} tamanho={38} />
                      <View className="flex-1">
                        <Text className="font-semibold text-tinta" numberOfLines={1}>{u.nome || '—'}</Text>
                        <Text className="text-xs text-tinta-2" numberOfLines={1}>{u.email}</Text>
                      </View>
                    </View>
                    <Info rotulo="Cadastro" valor={dataHora(u.criado_em)} />
                    <Info rotulo="Último acesso" valor={u.ultimo_login ? dataHora(u.ultimo_login) : '—'} />
                    <Info rotulo="Contas" valor={u.contas} />
                    <Info rotulo="Lançamentos" valor={u.lancamentos} />
                    <BotaoMini titulo="Excluir" icone="trash-2" tom="perigo" onPress={() => excluir(u)} />
                  </View>
                ))}
              </View>
            ) : (
              <Vazio icone="users" texto="Nenhum usuário encontrado." />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const AbaAdmin = ({ ativa, onPress, titulo, icone }) => (
  <Pressable onPress={onPress} className={`flex-row items-center gap-2 border-b-2 px-3 py-3 ${ativa ? 'border-marca' : 'border-transparent'}`}>
    {icone}
    <Text className={`text-sm ${ativa ? 'font-semibold text-marca-texto' : 'text-tinta-2'}`}>{titulo}</Text>
  </Pressable>
);

const Info = ({ rotulo, valor }) => (
  <View className="min-w-[90px]">
    <Text className="text-[10px] font-semibold uppercase tracking-wider text-tinta-mudo">{rotulo}</Text>
    <Text className="text-sm text-tinta">{valor}</Text>
  </View>
);
