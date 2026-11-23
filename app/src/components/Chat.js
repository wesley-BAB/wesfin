import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexto/AppContexto';
import { api } from '../lib/api';
import { hora } from '../lib/formato';
import { useCores } from '../lib/tema';
import { useDitado } from '../lib/voz';
import { AvatarWesia, NOME_WESIA } from './Wesia';
import { Icone } from './ui';

// Usado só se a API não responder; o texto oficial vem do banco (robo_respostas).
const INICIO_PADRAO = {
  boas_vindas: 'Olá! Eu sou a WESIA.\nEscreva o lançamento como uma mensagem.\nSempre tipo + descrição + valor.\nEx.: "Saida Futebol 50".',
  sugestoes: ['Saida Futebol 50', 'Entrada Salário 3500', 'saldo'],
};

let proximoId = 1;
const mensagem = (texto, autor, extra = {}) => ({ id: proximoId++, texto, autor, hora: new Date(), ...extra });

// Lançamento rápido em formato de conversa (estilo mensageiro).
export function Chat() {
  const { chatAberto, setChatAberto, conta, atualizarDados, carregarCategorias } = useApp();
  const [mensagens, setMensagens] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const rolagem = useRef(null);
  const campo = useRef(null);
  const insets = useSafeAreaInsets();
  const cores = useCores();

  // Devolve o cursor ao campo sempre que é a vez da pessoa digitar.
  const focar = () => setTimeout(() => campo.current?.focus(), 60);

  useEffect(() => {
    if (!conta) return;
    api('/chat/inicio')
      .catch(() => INICIO_PADRAO)
      .then((r) => {
        setMensagens([mensagem(r.boas_vindas, 'bot')]);
        setSugestoes(r.sugestoes);
      });
  }, [conta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Falar o lançamento: o texto aparece no campo enquanto fala e é enviado ao terminar.
  const voz = useDitado({
    aoParcial: setTexto,
    aoTerminar: (falado) => (falado ? enviar(falado, { voz: true }) : setTexto('')),
    aoErro: (erro) => setMensagens((m) => [...m, mensagem(erro, 'bot', { erro: true })]),
  });

  useEffect(() => {
    if (chatAberto) focar();
    else voz.cancelar();
  }, [chatAberto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pergunta do robô ainda sem resposta (só a última vale).
  const pendente = [...mensagens].reverse().find((m) => m.pergunta && !m.resposta);

  const marcar = (id, resposta) => setMensagens((lista) => lista.map((x) => (x.id === id ? { ...x, resposta } : x)));

  async function conversar(corpo, pergunta) {
    setEnviando(true);
    try {
      const r = await api('/chat', { metodo: 'POST', corpo });
      // Respondeu a pergunta com sim/não aceito? Senão ela fica encerrada e os botões somem de ação.
      if (pergunta) marcar(pergunta.id, r.confirmacao ?? 'encerrada');
      const extra = r.pergunta ? { pergunta: r.pergunta, original: corpo.mensagem } : {};
      setMensagens((m) => [...m, mensagem(r.resposta, 'bot', { erro: r.erro, transacao: r.transacao, ...extra })]);
      if (r.transacao) {
        atualizarDados();
        if (r.categoriaCriada) carregarCategorias();
      }
    } catch (e) {
      if (pergunta) marcar(pergunta.id, null); // falhou: a pergunta continua valendo
      setMensagens((m) => [...m, mensagem(e.message, 'bot', { erro: true })]);
    } finally {
      setEnviando(false);
      focar();
    }
  }

  // Texto digitado: se há pergunta pendente, vai junto para o robô decidir se é sim/não.
  async function enviar(conteudo = texto, extra = {}) {
    const msg = conteudo.trim();
    if (!msg || enviando) return;
    setTexto('');
    setMensagens((m) => [...m, mensagem(msg, 'eu', extra)]);
    if (pendente) {
      marcar(pendente.id, 'respondendo');
      await conversar({ mensagem: msg, confirmando: pendente.original }, pendente);
    } else {
      await conversar({ mensagem: msg });
    }
  }

  // Botões Sim / Não
  async function responder(m, sim) {
    if (m.resposta || enviando) return;
    marcar(m.id, 'respondendo');
    setMensagens((lista) => [...lista, mensagem(sim ? 'Sim' : 'Não', 'eu')]);
    await conversar({ mensagem: sim ? 'Sim' : 'Não', confirmando: m.original, resposta: sim }, m);
  }

  async function desfazer(id, transacaoId) {
    try {
      await api(`/transacoes/${transacaoId}`, { metodo: 'DELETE' });
      setMensagens((m) => m.map((x) => (x.id === id ? { ...x, desfeito: true } : x)));
      atualizarDados();
    } catch (e) {
      setMensagens((m) => [...m, mensagem(e.message, 'bot', { erro: true })]);
    }
    focar();
  }

  return (
    <Modal visible={chatAberto} transparent animationType="slide" onRequestClose={() => setChatAberto(false)}>
      <View className="flex-1 items-end justify-end bg-black/30 sm:p-6">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="h-full w-full overflow-hidden bg-zap-fundo sm:h-[600px] sm:w-[400px] sm:rounded-3xl sm:shadow-2xl"
        >
          <View className="flex-row items-center gap-3 bg-zap-escuro px-4 pb-3" style={{ paddingTop: Math.max(insets.top, 12) }}>
            <AvatarWesia tamanho={40} />
            <View className="flex-1">
              <Text className="text-base font-bold tracking-wide text-white">{NOME_WESIA}</Text>
              {enviando ? (
                <Text className="text-xs italic text-white/90">digitando…</Text>
              ) : (
                <Text className="text-xs text-white/90">online · {conta?.nome}</Text>

              )}
            </View>
            <Pressable onPress={() => setChatAberto(false)} className="h-9 w-9 items-center justify-center rounded-full active:bg-white/20">
              <Icone nome="x" cor="#ffffff" />
            </Pressable>
          </View>

          <ScrollView
            ref={rolagem}
            className="flex-1"
            contentContainerClassName="gap-1.5 px-3 py-4"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}
          >
            {mensagens.map((m) => (
              <View
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 pb-1.5 pt-2 shadow-sm ${m.autor === 'eu' ? 'self-end rounded-tr-sm bg-zap-bolha' : 'self-start rounded-tl-sm bg-cartao'} ${m.erro ? 'border-l-4 border-saida' : ''}`}
              >
                <Text className="text-[15px] leading-5 text-tinta">{m.texto}</Text>
                {m.transacao ? (
                  <Pressable disabled={m.desfeito} onPress={() => desfazer(m.id, m.transacao.id)} className="pt-1">
                    <Text className={`text-sm font-bold ${m.desfeito ? 'text-tinta-mudo' : 'text-marca-texto'}`}>{m.desfeito ? 'Desfeito' : 'Desfazer'}</Text>
                  </Pressable>
                ) : null}
                {m.pergunta ? <BotoesPergunta m={m} aoResponder={responder} /> : null}
                <View className="mt-0.5 flex-row items-center gap-1 self-end">
                  {m.voz ? <Icone nome="mic" tamanho={10} cor="mudo" /> : null}
                  <Text className="text-[10px] text-tinta-mudo">{hora(m.hora)}</Text>
                </View>
              </View>
            ))}
            {enviando ? <Digitando /> : null}
            {mensagens.length === 1 ? (
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {sugestoes.map((s) => (
                  <Pressable key={s} onPress={() => { setTexto(s); focar(); }} className="rounded-full border border-borda bg-cartao px-3 py-1.5">
                    <Text className="text-xs text-tinta-2">{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {voz.ouvindo ? <Ouvindo aoCancelar={voz.cancelar} /> : null}
          <View className="flex-row items-center gap-2 px-2 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
            <TextInput
              ref={campo}
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={() => enviar()}
              blurOnSubmit={false}
              editable={!voz.ouvindo}
              placeholder={voz.ouvindo ? 'Fale agora… ex.: gasto Monster 50' : pendente ? 'Responda Sim ou Não' : 'Ex.: Saida Futebol 50'}
              placeholderTextColor={cores.mudo}
              autoFocus
              returnKeyType="send"
              maxLength={200}
              className="flex-1 rounded-full bg-cartao px-4 py-3 text-[15px] text-tinta"
            />
            {voz.ouvindo ? (
              <Pressable
                onPress={voz.parar}
                accessibilityLabel="Parar e enviar"
                className="h-12 w-12 items-center justify-center rounded-full bg-saida active:opacity-80"
              >
                <Icone nome="square" cor="#ffffff" />
              </Pressable>
            ) : voz.disponivel && !texto.trim() ? (
              <Pressable
                onPress={voz.ouvir}
                disabled={enviando}
                accessibilityLabel={`Falar com ${NOME_WESIA}`}
                className={`h-12 w-12 items-center justify-center rounded-full bg-zap-escuro active:opacity-80 ${enviando ? 'opacity-50' : ''}`}
              >
                <Icone nome="mic" cor="#ffffff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => enviar()}
                disabled={enviando}
                accessibilityLabel="Enviar"
                className={`h-12 w-12 items-center justify-center rounded-full bg-zap-escuro active:opacity-80 ${enviando ? 'opacity-50' : ''}`}
              >
                <Icone nome="send" cor="#ffffff" />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Sim / Não da pergunta do robô. Depois de qualquer resposta (aceita ou não) ficam inativos.
function BotoesPergunta({ m, aoResponder }) {
  const ativo = !m.resposta;
  const escolhido = (qual) => m.resposta === qual;
  return (
    <View className="gap-1 pb-1 pt-2.5">
      <View className="flex-row gap-2">
        <Pressable
          disabled={!ativo}
          onPress={() => aoResponder(m, true)}
          className={`min-w-[84px] items-center rounded-full px-4 py-2 ${ativo || escolhido('sim') ? 'bg-marca active:bg-marca-escuro' : 'bg-tinta/5'} ${ativo ? '' : 'opacity-50'}`}
        >
          <Text className={`text-sm font-bold ${ativo || escolhido('sim') ? 'text-white' : 'text-tinta-mudo'}`}>Sim</Text>
        </Pressable>
        <Pressable
          disabled={!ativo}
          onPress={() => aoResponder(m, false)}
          className={`min-w-[84px] items-center rounded-full border px-4 py-2 ${escolhido('nao') ? 'border-saida bg-saida-fundo' : 'border-borda bg-cartao active:bg-fundo'} ${ativo ? '' : 'opacity-50'}`}
        >
          <Text className={`text-sm font-bold ${escolhido('nao') ? 'text-saida-texto' : ativo ? 'text-tinta' : 'text-tinta-mudo'}`}>Não</Text>
        </Pressable>
      </View>
      {m.resposta === 'encerrada' ? <Text className="text-[11px] text-tinta-mudo">Pergunta encerrada</Text> : null}
    </View>
  );
}

// Faixa acima do campo enquanto o microfone está aberto.
function Ouvindo({ aoCancelar }) {
  const cores = useCores();
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const nativo = Platform.OS !== 'web';
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(pulso, { toValue: 0.25, duration: 500, useNativeDriver: nativo }),
      Animated.timing(pulso, { toValue: 1, duration: 500, useNativeDriver: nativo }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [pulso]);

  return (
    <View className="mx-2 mt-2 flex-row items-center gap-2.5 rounded-2xl bg-cartao px-4 py-2.5 shadow-sm">
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cores.saida, opacity: pulso }} />
      <Text className="flex-1 text-sm text-tinta-2">Ouvindo… fale o lançamento e toque em ■ para enviar</Text>
      <Pressable onPress={aoCancelar} className="rounded-full px-2 py-1 active:bg-fundo">
        <Text className="text-sm font-semibold text-tinta-mudo">Cancelar</Text>
      </Pressable>
    </View>
  );
}

// Três pontinhos pulsando enquanto o robô responde.
function Digitando() {
  const cores = useCores();
  const valores = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const nativo = Platform.OS !== 'web';
    const pulso = (v) => Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: nativo }),
      Animated.timing(v, { toValue: 0.3, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: nativo }),
    ]);
    const laco = Animated.loop(Animated.stagger(150, valores.map(pulso)));
    laco.start();
    return () => laco.stop();
  }, [valores]);

  return (
    <View className="self-start flex-row items-center gap-2.5 rounded-2xl rounded-tl-sm bg-cartao px-4 py-3 shadow-sm" accessibilityLabel={`${NOME_WESIA} digitando`}>
      <Text className="text-xs font-semibold text-tinta-2">{NOME_WESIA} digitando</Text>
      <View className="flex-row items-center gap-1 pt-1">
        {valores.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: cores.mudo,
              opacity: v,
              transform: [{ translateY: v.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) }],
            }}
          />
        ))}
      </View>
    </View>
  );
}
