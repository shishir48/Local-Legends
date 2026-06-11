import { useEffect, useRef } from 'react';
import { Animated, useWindowDimensions, View, type DimensionValue } from 'react-native';
import { glass, radius, rf, spacing } from '../utils/theme';

interface Props {
  highlight?: boolean;
}

export function GemCardSkeleton({ highlight = false }: Props) {
  const { width } = useWindowDimensions();
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

  const bar = (w: DimensionValue, h: number, c?: string) => ({
    height: h,
    width: w,
    backgroundColor: c ?? 'rgba(255,255,255,0.10)',
    borderRadius: 4,
  });

  // Hero skeleton for the top gem
  if (highlight) {
    const cardWidth = width - spacing.lg * 2;
    const cardHeight = Math.round(cardWidth * 0.72);

    return (
      <Animated.View
        style={{
          width: '100%',
          height: cardHeight,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
          backgroundColor: 'rgba(30,41,59,0.6)',
          overflow: 'hidden',
          opacity,
        }}
      >
        {/* Top accent line */}
        <View style={{ height: 2, width: '40%', backgroundColor: 'rgba(245,158,11,0.25)' }} />

        {/* Badge skeleton */}
        <View
          style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            width: 80,
            height: 22,
            borderRadius: radius.pill,
            backgroundColor: 'rgba(245,158,11,0.12)',
          }}
        />

        {/* Bottom content skeletons */}
        <View
          style={{
            position: 'absolute',
            bottom: spacing.lg,
            left: spacing.lg,
            right: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <View style={bar('70%', 20, 'rgba(255,255,255,0.08)')} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={bar(100, 26, 'rgba(255,255,255,0.06)')} />
            <View style={bar(80, 26, 'rgba(255,255,255,0.06)')} />
          </View>
          <View style={bar(120, 14, 'rgba(255,255,255,0.05)')} />
        </View>
      </Animated.View>
    );
  }

  // Regular skeleton
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
      <View
        style={{
          width: rf(80),
          height: rf(80),
          borderRadius: radius.md,
          backgroundColor: 'rgba(255,255,255,0.10)',
        }}
      />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={bar('70%', 15)} />
        <View style={bar('40%', 11)} />
        <View style={bar('55%', 11)} />
      </View>
      <View
        style={{
          width: 50,
          height: 46,
          borderRadius: radius.md,
          backgroundColor: 'rgba(245,158,11,0.06)',
        }}
      />
    </Animated.View>
  );
}
