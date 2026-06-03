import { View } from 'react-native';
import { colors } from '../utils/theme';

/**
 * Soft amber + pink corner wash that sits behind a screen's content to give
 * the "neon glass" feel. Pure translucent Views — no native blur — so it
 * ships over EAS Update. Render it first inside a flex:1 container; siblings
 * drawn after it sit on top.
 */
export function AmbientGlow() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          position: 'absolute',
          top: -120,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.primary,
          opacity: 0.13,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -100,
          right: -90,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: colors.accent,
          opacity: 0.1,
        }}
      />
    </View>
  );
}
