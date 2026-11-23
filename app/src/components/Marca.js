import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useApp } from '../contexto/AppContexto';
import { ARREDONDAR, BARRAS, CAIXA, FAIXA, GRADIENTES, SETA, caminho } from '../lib/marca';

const PROPORCAO = CAIXA.largura / CAIXA.altura;

// Símbolo da marca. `faixa`: 'auto' (grafite no tema claro, branca no escuro),
// 'clara' (para fundos escuros/verdes) ou 'grafite'.
export function Marca({ altura = 32, faixa = 'auto' }) {
  const { tema } = useApp() ?? {};
  const tom = faixa === 'auto' ? (tema === 'escuro' ? 'claro' : 'grafite') : faixa === 'clara' ? 'claro' : 'grafite';
  const [v0, v1, v2] = GRADIENTES.verde;
  const [c0, c1] = GRADIENTES[tom];
  const baixo = CAIXA.y + CAIXA.altura;
  const contorno = (cor) => ({ fill: cor, stroke: cor, strokeWidth: ARREDONDAR, strokeLinejoin: 'round' });

  return (
    <Svg width={altura * PROPORCAO} height={altura} viewBox={`${CAIXA.x} ${CAIXA.y} ${CAIXA.largura} ${CAIXA.altura}`}>
      {/* ids por variante: na web os gradientes de todos os SVGs dividem o mesmo documento */}
      <Defs>
        <LinearGradient id={`verde-${tom}`} gradientUnits="userSpaceOnUse" x1={CAIXA.x} y1={baixo} x2={CAIXA.x + CAIXA.largura * 0.4} y2={CAIXA.y}>
          <Stop offset="0" stopColor={v0} />
          <Stop offset="0.45" stopColor={v1} />
          <Stop offset="1" stopColor={v2} />
        </LinearGradient>
        <LinearGradient id={`faixa-${tom}`} gradientUnits="userSpaceOnUse" x1="0" y1={CAIXA.y} x2="0" y2={baixo}>
          <Stop offset="0" stopColor={c0} />
          <Stop offset="1" stopColor={c1} />
        </LinearGradient>
        <LinearGradient id={`barra-${tom}`} gradientUnits="userSpaceOnUse" x1="0" y1={baixo} x2="0" y2={CAIXA.y + CAIXA.altura * 0.55}>
          <Stop offset="0" stopColor={v1} />
          <Stop offset="1" stopColor={v2} />
        </LinearGradient>
      </Defs>
      {FAIXA.map((s, i) => (
        <Path key={i} d={caminho(s.pontos)} {...contorno(s.cor === 'verde' ? `url(#verde-${tom})` : `url(#faixa-${tom})`)} />
      ))}
      <Path d={caminho(SETA)} {...contorno(`url(#verde-${tom})`)} />
      {BARRAS.map((b, i) => (
        <Rect key={i} x={b.x} y={b.y} width={b.largura} height={b.altura} rx={1} fill={`url(#barra-${tom})`} />
      ))}
    </Svg>
  );
}

// Nome escrito: "WES" na cor do texto + "FIN" em verde.
export function NomeMarca({ tamanho = 16, clara = false }) {
  return (
    <Text className={`font-extrabold ${clara ? 'text-white' : 'text-tinta'}`} style={{ fontSize: tamanho, letterSpacing: tamanho * 0.12 }}>
      WES<Text className={clara ? 'text-white/80' : 'text-marca'}>FIN</Text>
    </Text>
  );
}

// Selo: símbolo branco/verde sobre o fundo escuro do ícone do app (para fundos verdes).
export function Selo({ tamanho = 32 }) {
  return (
    <View className="items-center justify-center bg-[#0f1f15]" style={{ width: tamanho, height: tamanho, borderRadius: tamanho * 0.28 }}>
      <Marca altura={tamanho * 0.56} faixa="clara" />
    </View>
  );
}
