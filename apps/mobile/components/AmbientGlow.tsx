import { useWindowDimensions, View } from 'react-native';
import { colors } from '../utils/theme';

/**
 * Faint amber + pink corner wash for the "neon glass" feel. RN has no blur,
 * so instead of one hard-edged disc we stack concentric translucent circles
 * centered on each corner: overlap builds intensity toward the (off-screen)
 * centre and fades to nothing at the outer ring — a soft radial falloff made
 * of plain Views, so it still ships over EAS Update.
 */
const RINGS = 6;

function Blob({ size, color, corner }: { size: number; color: string; corner: 'tl' | 'br' }) {
  const anchor = corner === 'tl' ? { top: 0, left: 0 } : { bottom: 0, right: 0 };
  return (
    <View style={[{ position: 'absolute', width: 1, height: 1 }, anchor]}>
      {Array.from({ length: RINGS }).map((_, i) => {
        const d = size * (1 - i / RINGS); // largest first, shrinking inward
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity: 0.05,
              // keep every ring centred on the same corner point
              ...(corner === 'tl' ? { top: -d / 2, left: -d / 2 } : { bottom: -d / 2, right: -d / 2 }),
            }}
          />
        );
      })}
    </View>
  );
}

export function AmbientGlow() {
  const { width } = useWindowDimensions();
  const size = Math.round(width * 1.1);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <Blob size={size} color={colors.primary} corner="tl" />
      <Blob size={size} color={colors.accent} corner="br" />
    </View>
  );
}
