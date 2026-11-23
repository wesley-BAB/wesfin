import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '../../components/Topo';
import { Botao, BotaoMini, Cabecalho, Campo, Cartao, FolhaTexto, Pagina } from '../../components/ui';
import { useApp } from '../../contexto/AppContexto';
import { api } from '../../lib/api';
import { confirmar } from '../../lib/confirmar';

export default function Compartilhar() {
  const { conta, usuario, avisar, recarregarUsuario, trocarConta } = useApp();
  const [membros, setMembros] = useState([]);
  const [email, setEmail] = useState('');
  const [novaConta, setNovaConta] = useState('');
  const [renomeando, setRenomeando] = useState(false);
  const dono = conta?.papel === 'dono';

  const carregar = useCallback(async () => {
    if (!conta) return;
    try { setMembros(await api(`/contas/${conta.id}/membros`)); } catch (e) { avisar(e.message); }
  }, [conta, avisar]);
  useEffect(() => { carregar(); }, [carregar]);

  async function convidar() {
    try {
      await api(`/contas/${conta.id}/membros`, { metodo: 'POST', corpo: { email } });
      setEmail('');
      avisar('Conta compartilhada');
      carregar();
    } catch (e) { avisar(e.message); }
  }

  async function remover(m) {
    const souEu = m.email === usuario.email;
    if (!(await confirmar(souEu ? 'Sair da conta' : 'Remover acesso', souEu ? `Sair de "${conta.nome}"?` : `Remover o acesso de ${m.email}?`, souEu ? 'Sair' : 'Remover', { icone: souEu ? 'log-out' : 'user-x' }))) return;
    try {
      await api(`/contas/${conta.id}/membros/${m.id}`, { metodo: 'DELETE' });
      if (souEu) await recarregarUsuario();
      else carregar();
    } catch (e) { avisar(e.message); }
  }

  async function renomear(nome) {
    setRenomeando(false);
    if (!nome || nome === conta.nome) return;
    try {
      await api(`/contas/${conta.id}`, { metodo: 'PATCH', corpo: { nome } });
      await recarregarUsuario();
    } catch (e) { avisar(e.message); }
  }

  async function criarConta() {
    try {
      const c = await api('/contas', { metodo: 'POST', corpo: { nome: novaConta } });
      setNovaConta('');
      await recarregarUsuario();
      await trocarConta(c.id);
      avisar(`Conta "${c.nome}" criada`);
    } catch (e) { avisar(e.message); }
  }

  return (
    <Pagina>
      <Cabecalho
        titulo={conta?.nome ?? 'Conta'}
        subtitulo="Compartilhe esta conta com outro Gmail. A pessoa entra com o Google e vê os mesmos lançamentos."
        acao={dono ? <Botao titulo="Renomear" variante="contorno" icone="edit-2" onPress={() => setRenomeando(true)} /> : null}
      />

      {dono ? (
        <Cartao className="gap-3">
          <Campo rotulo="Convidar por e-mail" value={email} onChangeText={setEmail} placeholder="email@gmail.com" keyboardType="email-address" autoCapitalize="none" onSubmitEditing={convidar} />
          <Botao titulo="Compartilhar" icone="user-plus" onPress={convidar} className="self-start" disabled={!email.trim()} />
        </Cartao>
      ) : null}

      <View className="gap-px overflow-hidden rounded-3xl border border-borda bg-borda">
        {membros.map((m) => {
          const souEu = m.email === usuario.email;
          const podeRemover = m.papel !== 'dono' && (dono || souEu);
          return (
            <View key={m.id} className="flex-row items-center gap-3 bg-cartao px-4 py-3.5">
              <Avatar usuario={m.usuario ? { ...m.usuario, email: m.email } : { email: m.email }} tamanho={38} />
              <View className="flex-1">
                <Text className="font-semibold text-tinta" numberOfLines={1}>{m.usuario?.nome ?? m.email}{souEu ? ' (você)' : ''}</Text>
                <Text className="text-xs text-tinta-mudo" numberOfLines={1}>
                  {m.email} · {m.papel === 'dono' ? 'Dono' : 'Pode editar'}{m.usuario ? '' : ' · aguardando 1º acesso'}
                </Text>
              </View>
              {podeRemover ? <BotaoMini titulo={souEu ? 'Sair' : 'Remover'} tom="perigo" onPress={() => remover(m)} /> : null}
            </View>
          );
        })}
      </View>

      <Cartao className="mt-4 gap-3">
        <Text className="text-base font-semibold text-tinta">Outra conta</Text>
        <Text className="text-sm text-tinta-2">Separe finanças (ex.: Casa, Empresa). Troque de conta pelo menu.</Text>
        <Campo value={novaConta} onChangeText={setNovaConta} placeholder="Nome da nova conta" maxLength={60} onSubmitEditing={criarConta} />
        <Botao titulo="Criar conta" variante="contorno" icone="plus" onPress={criarConta} className="self-start" disabled={!novaConta.trim()} />
      </Cartao>

      <FolhaTexto visivel={renomeando} titulo="Renomear conta" rotulo="Nome" valorInicial={conta?.nome} aoFechar={() => setRenomeando(false)} aoSalvar={renomear} />
    </Pagina>
  );
}
