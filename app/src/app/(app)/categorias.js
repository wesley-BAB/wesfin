import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Botao, BotaoMini, Cabecalho, Campo, Cartao, FolhaTexto, Opcoes, Pagina, Vazio } from '../../components/ui';
import { useApp } from '../../contexto/AppContexto';
import { api } from '../../lib/api';
import { confirmar } from '../../lib/confirmar';
import { PALETA } from '../../lib/formato';

const NOME_TIPO = { entrada: 'Entrada', saida: 'Saída', ambos: 'Entrada e saída', investimento: 'Investimento' };

export default function Categorias() {
  const { categorias, carregarCategorias, avisar } = useApp();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('saida');
  const [cor, setCor] = useState(PALETA[0]);
  const [renomeando, setRenomeando] = useState(null);

  async function criar() {
    try {
      await api('/categorias', { metodo: 'POST', corpo: { nome, tipo, cor } });
      setNome('');
      avisar('Categoria criada');
      carregarCategorias();
    } catch (e) { avisar(e.message); }
  }

  async function renomear(novo) {
    const c = renomeando;
    setRenomeando(null);
    if (!novo || novo === c.nome) return;
    try {
      await api(`/categorias/${c.id}`, { metodo: 'PATCH', corpo: { nome: novo } });
      carregarCategorias();
    } catch (e) { avisar(e.message); }
  }

  async function excluir(c) {
    if (!(await confirmar('Excluir categoria', `Excluir "${c.nome}"? Os lançamentos ficam sem categoria.`, 'Excluir'))) return;
    try {
      await api(`/categorias/${c.id}`, { metodo: 'DELETE' });
      carregarCategorias();
    } catch (e) { avisar(e.message); }
  }

  return (
    <Pagina>
      <Cabecalho
        titulo="Minhas categorias"
        subtitulo='Cada pessoa tem as suas, mesmo em contas compartilhadas. No chat, o nome da categoria na frase já classifica (ex.: "Lazer cinema 40").'
      />

      <Cartao className="gap-4">
        <Campo rotulo="Nova categoria" value={nome} onChangeText={setNome} placeholder="Ex.: Pets" maxLength={40} onSubmitEditing={criar} />
        <Opcoes
          rotulo="Tipo"
          valor={tipo}
          onChange={setTipo}
          opcoes={[{ valor: 'saida', rotulo: 'Saída' }, { valor: 'entrada', rotulo: 'Entrada' }, { valor: 'investimento', rotulo: 'Investimento' }, { valor: 'ambos', rotulo: 'Entrada e saída' }]}
        />
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-tinta-2">Cor</Text>
          <View className="flex-row flex-wrap gap-2">
            {PALETA.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCor(c)}
                accessibilityLabel={`Cor ${c}`}
                className={`h-8 w-8 rounded-full border-2 ${c === cor ? 'border-tinta' : 'border-white'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </View>
        </View>
        <Botao titulo="Adicionar" icone="plus" onPress={criar} className="self-start" disabled={!nome.trim()} />
      </Cartao>

      {categorias.length ? (
        <View className="gap-px overflow-hidden rounded-3xl border border-borda bg-borda">
          {categorias.map((c) => (
            <View key={c.id} className="flex-row items-center gap-3 bg-cartao px-4 py-3.5">
              <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: c.cor }}>
                <Text className="font-bold text-white">{c.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-tinta">{c.nome}</Text>
                <Text className="text-xs text-tinta-mudo">{NOME_TIPO[c.tipo]}</Text>
              </View>
              <BotaoMini titulo="Renomear" onPress={() => setRenomeando(c)} />
              <BotaoMini titulo="Excluir" tom="perigo" onPress={() => excluir(c)} />
            </View>
          ))}
        </View>
      ) : (
        <Vazio icone="tag" texto="Nenhuma categoria ainda." />
      )}

      <FolhaTexto
        visivel={Boolean(renomeando)}
        titulo="Renomear categoria"
        rotulo="Nome"
        valorInicial={renomeando?.nome}
        aoFechar={() => setRenomeando(null)}
        aoSalvar={renomear}
      />
    </Pagina>
  );
}
