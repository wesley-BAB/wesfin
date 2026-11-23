import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useCores } from '../lib/tema';
import { HostConfirmacao } from './Confirmacao';

// `cor` aceita um nome do tema (tinta2, saida, ...) ou um hexadecimal fixo.
export function Icone({ nome, tamanho = 18, cor = 'tinta2' }) {
  const cores = useCores();
  return <Feather name={nome} size={tamanho} color={cores[cor] ?? cor} />;
}

const VARIANTES = {
  primario: { caixa: 'bg-marca active:bg-marca-escuro', texto: 'text-white', icone: '#ffffff' },
  zap: { caixa: 'bg-zap active:bg-zap-escuro', texto: 'text-white', icone: '#ffffff' },
  contorno: { caixa: 'bg-cartao border border-borda active:bg-fundo', texto: 'text-tinta', icone: 'tinta' },
  fantasma: { caixa: 'active:bg-fundo', texto: 'text-tinta-2', icone: 'tinta2' },
  perigo: { caixa: 'bg-cartao border border-borda active:bg-saida-fundo', texto: 'text-saida-texto', icone: 'saida' },
};

export function Botao({ titulo, onPress, variante = 'primario', icone, grande = false, className = '', disabled }) {
  const v = VARIANTES[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-full ${grande ? 'px-8 py-4' : 'px-4 py-2.5'} ${v.caixa} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {icone ? <Icone nome={icone} tamanho={grande ? 20 : 16} cor={v.icone} /> : null}
      <Text className={`font-semibold ${grande ? 'text-base' : 'text-sm'} ${v.texto}`}>{titulo}</Text>
    </Pressable>
  );
}

export function BotaoMini({ titulo, onPress, tom = 'neutro', icone }) {
  const cores = {
    neutro: ['bg-cartao border border-borda', 'text-tinta-2', 'tinta2'],
    ok: ['bg-entrada-fundo', 'text-entrada-texto', 'entrada'],
    perigo: ['bg-cartao border border-borda', 'text-saida-texto', 'saida'],
  }[tom];
  return (
    <Pressable onPress={onPress} className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${cores[0]}`}>
      {icone ? <Icone nome={icone} tamanho={13} cor={cores[2]} /> : null}
      <Text className={`text-xs font-semibold ${cores[1]}`}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({ rotulo, className = '', ...props }) {
  const cores = useCores();
  return (
    <View className={`gap-1.5 ${className}`}>
      {rotulo ? <Text className="text-xs font-semibold text-tinta-2">{rotulo}</Text> : null}
      <TextInput
        placeholderTextColor={cores.mudo}
        className="rounded-xl border border-borda bg-cartao px-3.5 py-3 text-[15px] text-tinta"
        {...props}
      />
    </View>
  );
}

// Escolha entre opções (substitui <select>, funciona em todas as plataformas).
export function Opcoes({ rotulo, opcoes, valor, onChange }) {
  return (
    <View className="gap-1.5">
      {rotulo ? <Text className="text-xs font-semibold text-tinta-2">{rotulo}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => onChange(o.valor)}
              className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${ativo ? 'border-tinta bg-tinta' : 'border-borda bg-cartao'}`}
            >
              {o.cor ? <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.cor }} /> : null}
              <Text className={`text-sm ${ativo ? 'font-semibold text-fundo' : 'text-tinta-2'}`}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Segmentado({ opcoes, valor, onChange, className = '' }) {
  return (
    <View className={`flex-row rounded-full bg-tinta/5 p-1 ${className}`}>
      {opcoes.map((o) => (
        <Pressable
          key={o.valor}
          onPress={() => onChange(o.valor)}
          className={`flex-1 items-center rounded-full px-4 py-2 ${o.valor === valor ? 'bg-cartao shadow-sm' : ''}`}
        >
          <Text className={`text-sm font-semibold ${o.valor === valor ? 'text-tinta' : 'text-tinta-mudo'}`}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Cartao = ({ children, className = '' }) => (
  <View className={`rounded-3xl border border-borda bg-cartao p-5 ${className}`}>{children}</View>
);

export function Cabecalho({ titulo, subtitulo, acao }) {
  return (
    <View className="flex-row flex-wrap items-end justify-between gap-3">
      <View className="min-w-[200px] flex-1 gap-1">
        <Text className="text-2xl font-bold tracking-tight text-tinta">{titulo}</Text>
        {subtitulo ? <Text className="text-sm leading-5 text-tinta-2">{subtitulo}</Text> : null}
      </View>
      {acao}
    </View>
  );
}

export const Vazio = ({ texto, icone = 'inbox' }) => (
  <View className="items-center gap-2 py-12">
    <Icone nome={icone} tamanho={28} cor="apagado" />
    <Text className="text-center text-sm text-tinta-mudo">{texto}</Text>
  </View>
);

// Folha modal centralizada (web) / de baixo (celular).
export function Folha({ visivel, aoFechar, titulo, children }) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View className="flex-1">
        <Pressable className="flex-1 items-center justify-end bg-black/40 sm:justify-center" onPress={aoFechar}>
          <Pressable className="max-h-[92%] w-full max-w-[460px] rounded-t-3xl bg-cartao sm:rounded-3xl" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 pb-2 pt-5">
              <Text className="text-lg font-bold text-tinta">{titulo}</Text>
              <Pressable onPress={aoFechar} className="h-9 w-9 items-center justify-center rounded-full active:bg-fundo">
                <Icone nome="x" />
              </Pressable>
            </View>
            <ScrollView contentContainerClassName="gap-4 px-6 pb-6 pt-2" keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
        {/* Confirmações pedidas de dentro da folha aparecem por cima dela */}
        <HostConfirmacao embutido />
      </View>
    </Modal>
  );
}

// Pergunta um texto (renomear, etc.).
export function FolhaTexto({ visivel, titulo, rotulo, valorInicial = '', aoFechar, aoSalvar }) {
  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={titulo}>
      {visivel ? <FormTexto rotulo={rotulo} valorInicial={valorInicial} aoSalvar={aoSalvar} aoFechar={aoFechar} /> : null}
    </Folha>
  );
}

function FormTexto({ rotulo, valorInicial, aoSalvar, aoFechar }) {
  const [texto, setTexto] = useState(valorInicial);
  return (
    <>
      <Campo rotulo={rotulo} value={texto} onChangeText={setTexto} autoFocus onSubmitEditing={() => aoSalvar(texto)} />
      <View className="flex-row justify-end gap-2">
        <Botao titulo="Cancelar" variante="fantasma" onPress={aoFechar} />
        <Botao titulo="Salvar" onPress={() => aoSalvar(texto)} />
      </View>
    </>
  );
}

export const Pagina = ({ children }) => (
  <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-[1040px] gap-5 px-4 pb-32 pt-6">
    {children}
  </ScrollView>
);
