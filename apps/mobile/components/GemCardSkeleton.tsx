import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, radius, spacing } from '../utils/theme';

export function GemCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
        opacity,
      }}
    >
      <View style={{ height: 160, backgroundColor: colors.surfaceAlt }} />
      <View style={{ padding: spacing.lg }}>
        <View style={{ height: 18, backgroundColor: colors.surfaceAlt, borderRadius: 4, marginBottom: spacing.sm, width: '60%' }} />
        <View style={{ height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 4, marginBottom: spacing.xs, width: '90%' }} />
        <View style={{ height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 4, width: '40%' }} />
      </View>
    </Animated.View>
  );
}
