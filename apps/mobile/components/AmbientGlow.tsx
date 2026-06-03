import { useWindowDimensions, View } from 'react-native';
import { colors } from '../utils/theme';

/**
 * Faint amber + pink corner wash behind a screen's content for the "neon
 * glass" feel. Pure translucent Views (no native blur), so it ships over
 * EAS Update. Circles are sized to the screen and pushed mostly off-frame
 * so only a soft curve shows in each corner. Render first inside a flex:1
 * container; later siblings draw on top.
 */
export function AmbientGlow() {
  const { width } = useWindowDimensions();
  const d = Math.round(width * 1.15); // scales with phone size
  const off = -Math.round(d * 0.55);  // keep ~55% off-screen

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: 'absolute',
          top: off,
          left: off,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: colors.primary,
          opacity: 0.06,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: off,
          right: off,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: colors.accent,
          opacity: 0.05,
        }}
      />
    </View>
  );
}
