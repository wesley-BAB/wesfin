import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { apiAdmin } from '../lib/api';
import { confirmar } from '../lib/confirmar';
import { dataHora } from '../lib/formato';
import { useCores } from '../lib/tema';
import { Botao, BotaoMini, Campo, Cartao, Folha, Opcoes, Segmentado, Vazio } from './ui';
import { IconeWesia } from './Wesia';

// Treinamento da WESIA no /admin: o que cada palavra significa e os textos que ela responde.
export function TreinamentoIA({ avisar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState('palavras');

  const carregar = useCallback(async () => {
    try {
      setDados(await apiAdmin('/robo'));
      setErro(null);
    } catch (e) {
      setErro(e.message);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#0f1f15]">
          <IconeWesia tamanho={28} cor="#6cc24a" />
        </View>
        <View className="min-w-[220px] flex-1">
          <Text className="text-2xl font-bold tracking-tight text-tinta">Treinamento da IA</Text>
          <Text className="text-sm text-tinta-2">O que a WESIA entende e responde. As mudanças valem na próxima mensagem.</Text>
        </View>
      </View>

      <Segmentado
        className="w-full max-w-[420px]"
        valor={aba}
        onChange={setAba}
        opcoes={[{ valor: 'palavras', rotulo: 'Vocabulário' }, { valor: 'respostas', rotulo: 'Respostas' }]}
      />

      {erro ? (
        <View className="gap-2 rounded-3xl border border-saida/40 bg-saida-fundo p-5">
          <Text className="font-semibold text-saida-texto">Não foi possível carregar o treinamento</Text>
          <Text className="text-sm text-tinta-2">{erro}</Text>
        </View>
      ) : !dados ? (
        <Text className="text-sm text-tinta-mudo">Carregando…</Text>
      ) : aba === 'palavras' ? (
        <Vocabulario dados={dados} recarregar={carregar} avisar={avisar} />
      ) : (
        <Respostas dados={dados} recarregar={carregar} avisar={avisar} />
      )}
    </View>
  );
}

// ---------- Vocabulário (robo_palavras) ----------

function Vocabulario({ dados, recarregar, avisar }) {
  const cores = useCores();
  const significados = Object.entries(dados.significados).map(([valor, rotulo]) => ({ valor, rotulo }));
  const [novoSignificado, setNovoSignificado] = useState('tipo_saida');
  const [novaPalavra, setNovaPalavra] = useState('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null);

  async function executar(acao, sucesso) {
    try {
      await acao();
      if (sucesso) avisar(sucesso);
      await recarregar();
      return true;
    } catch (e) {
      avisar(e.message);
      return false;
    }
  }

  const adicionar = () =>
    executar(async () => {
      await apiAdmin('/robo/palavras', { metodo: 'POST', corpo: { significado: novoSignificado, palavra: novaPalavra } });
      setNovaPalavra('');
    }, 'Palavra adicionada');

  const alternar = (p) => executar(() => apiAdmin(`/robo/palavras/${p.id}`, { metodo: 'PATCH', corpo: { ativo: !p.ativo } }));

  async function excluir(p) {
    const ok = await confirmar('Excluir palavra?', `A WESIA deixa de entender "${p.palavra}" como ${dados.significados[p.significado].toLowerCase()}.`, 'Excluir');
    if (ok) executar(() => apiAdmin(`/robo/palavras/${p.id}`, { metodo: 'DELETE' }), 'Palavra excluída');
  }

  const termo = busca.trim().toLowerCase();
  const filtradas = dados.palavras.filter((p) => !termo || p.palavra.includes(termo) || dados.significados[p.significado].toLowerCase().includes(termo));

  return (
    <View className="gap-5">
      <Cartao className="gap-4">
        <Text className="text-base font-semibold text-tinta">Ensinar uma palavra</Text>
        <Opcoes rotulo="Significado" opcoes={significados} valor={novoSignificado} onChange={setNovoSignificado} />
        <View className="flex-row flex-wrap items-end gap-3">
          <Campo
            className="min-w-[220px] flex-1"
            rotulo="Palavra ou expressão"
            value={novaPalavra}
            onChangeText={setNovaPalavra}
            placeholder='Ex.: torrei, "a pagar"'
            maxLength={40}
            autoCapitalize="none"
            onSubmitEditing={adicionar}
          />
          <Botao titulo="Adicionar" icone="plus" onPress={adicionar} disabled={!novaPalavra.trim()} />
        </View>
      </Cartao>

      <TextInput
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar palavra ou significado"
        placeholderTextColor={cores.mudo}
        className="w-full max-w-[360px] rounded-full border border-borda bg-cartao px-4 py-2.5 text-sm text-tinta"
      />

      {filtradas.length ? (
        significados
          .map((s) => ({ ...s, itens: filtradas.filter((p) => p.significado === s.valor) }))
          .filter((g) => g.itens.length)
          .map((g) => (
            <View key={g.valor} className="gap-2">
              <View className="flex-row items-baseline justify-between px-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-tinta-mudo">{g.rotulo}</Text>
                <Text className="text-xs text-tinta-mudo">{g.itens.length}</Text>
              </View>
              {g.itens.map((p) => (
                <View key={p.id} className={`flex-row flex-wrap items-center gap-3 rounded-2xl border border-borda bg-cartao px-4 py-3 ${p.ativo ? '' : 'opacity-60'}`}>
                  <Text className="min-w-[120px] flex-1 font-semibold text-tinta">{p.palavra}</Text>
                  <Interruptor ligado={p.ativo} aoMudar={() => alternar(p)} />
                  <BotaoMini titulo="Alterar" icone="edit-2" onPress={() => setEditando(p)} />
                  <BotaoMini titulo="Excluir" icone="trash-2" tom="perigo" onPress={() => excluir(p)} />
                </View>
              ))}
            </View>
          ))
      ) : (
        <Vazio icone="book-open" texto={dados.palavras.length ? 'Nenhuma palavra encontrada.' : 'Nenhuma palavra cadastrada ainda.'} />
      )}

      <FolhaPalavra
        palavra={editando}
        significados={significados}
        aoFechar={() => setEditando(null)}
        aoSalvar={(corpo) =>
          executar(() => apiAdmin(`/robo/palavras/${editando.id}`, { metodo: 'PATCH', corpo }), 'Palavra alterada').then((ok) => ok && setEditando(null))
        }
      />
    </View>
  );
}

function FolhaPalavra({ palavra, significados, aoFechar, aoSalvar }) {
  const [texto, setTexto] = useState('');
  const [significado, setSignificado] = useState('');
  useEffect(() => {
    if (palavra) {
      setTexto(palavra.palavra);
      setSignificado(palavra.significado);
    }
  }, [palavra]);

  return (
    <Folha visivel={Boolean(palavra)} aoFechar={aoFechar} titulo="Alterar palavra">
      <Campo rotulo="Palavra ou expressão" value={texto} onChangeText={setTexto} maxLength={40} autoCapitalize="none" autoFocus />
      <Opcoes rotulo="Significado" opcoes={significados} valor={significado} onChange={setSignificado} />
      <View className="flex-row justify-end gap-2 pt-2">
        <Botao titulo="Cancelar" variante="fantasma" onPress={aoFechar} />
        <Botao titulo="Salvar" onPress={() => aoSalvar({ palavra: texto, significado })} disabled={!texto.trim()} />
      </View>
    </Folha>
  );
}

const Interruptor = ({ ligado, aoMudar }) => (
  <Pressable onPress={aoMudar} accessibilityRole="switch" accessibilityState={{ checked: ligado }} className="flex-row items-center gap-2">
    <Text className="text-xs text-tinta-mudo">{ligado ? 'Ativa' : 'Inativa'}</Text>
    <View className={`h-6 w-11 justify-center rounded-full px-0.5 ${ligado ? 'items-end bg-marca' : 'items-start bg-tinta/20'}`}>
      <View className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </View>
  </Pressable>
);

// ---------- Respostas (robo_respostas) ----------

function Respostas({ dados, recarregar, avisar }) {
  const [editando, setEditando] = useState(null);

  async function salvar(chave, corpo, sucesso) {
    try {
      await apiAdmin(`/robo/respostas/${chave}`, { metodo: 'PATCH', corpo });
      avisar(sucesso);
      setEditando(null);
      await recarregar();
    } catch (e) {
      avisar(e.message);
    }
  }

  async function restaurar(r) {
    const ok = await confirmar('Restaurar texto original?', `O texto de "${r.descricao ?? r.chave}" volta a ser o padrão da WESIA.`, 'Restaurar', {
      tom: 'neutro',
      icone: 'rotate-ccw',
    });
    if (ok) salvar(r.chave, { restaurar: true }, 'Texto restaurado');
  }

  return (
    <View className="gap-3">
      <Text className="text-sm text-tinta-2">
        Textos que a WESIA usa nas conversas. Trechos entre chaves, como {'{categoria}'} e {'{itens}'}, são preenchidos por ela.
      </Text>
      {dados.respostas.map((r) => (
        <View key={r.chave} className="gap-3 rounded-2xl border border-borda bg-cartao p-4">
          <View className="flex-row flex-wrap items-start justify-between gap-2">
            <View className="min-w-[200px] flex-1">
              <Text className="font-semibold text-tinta">{r.descricao ?? r.chave}</Text>
              <Text className="text-xs text-tinta-mudo">{r.chave} · alterado em {dataHora(r.atualizado_em)}</Text>
            </View>
            <View className="flex-row gap-2">
              <BotaoMini titulo="Alterar" icone="edit-2" onPress={() => setEditando(r)} />
              <BotaoMini titulo="Restaurar" icone="rotate-ccw" onPress={() => restaurar(r)} />
            </View>
          </View>
          <Text className="rounded-xl bg-fundo px-3 py-2.5 text-sm leading-5 text-tinta-2">{r.texto}</Text>
        </View>
      ))}

      <FolhaResposta resposta={editando} aoFechar={() => setEditando(null)} aoSalvar={(texto) => salvar(editando.chave, { texto }, 'Texto salvo')} />
    </View>
  );
}

function FolhaResposta({ resposta, aoFechar, aoSalvar }) {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    if (resposta) setTexto(resposta.texto);
  }, [resposta]);

  return (
    <Folha visivel={Boolean(resposta)} aoFechar={aoFechar} titulo={resposta?.descricao ?? 'Alterar resposta'}>
      <Campo
        rotulo="Texto"
        value={texto}
        onChangeText={setTexto}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        style={{ minHeight: 160 }}
        autoFocus
      />
      <View className="flex-row justify-end gap-2 pt-2">
        <Botao titulo="Cancelar" variante="fantasma" onPress={aoFechar} />
        <Botao titulo="Salvar" onPress={() => aoSalvar(texto)} disabled={!texto.trim()} />
      </View>
    </Folha>
  );
}
