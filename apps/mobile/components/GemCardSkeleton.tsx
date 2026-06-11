import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { glass, radius, spacing } from '../utils/theme';

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

  const bar = (w: DimensionValue, h: number) => ({
    height: h,
    width: w,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
  });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        backgroundColor: glass.fill,
        borderWidth: 1,
        borderColor: glass.border,
        opacity,
      }}
    >
      <View style={{ width: 60, height: 60, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.10)' }} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={bar('70%', 15)} />
        <View style={bar('45%', 11)} />
      </View>
      <View style={{ width: 50, height: 46, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)' }} />
    </Animated.View>
  );
}
