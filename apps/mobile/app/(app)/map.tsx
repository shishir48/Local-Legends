import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { colors, radius, spacing, text } from '../../utils/theme';

const FALLBACK = { latitude: 12.9716, longitude: 77.5946 };

export default function MapScreen() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setCoords(FALLBACK); return; }
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        setCoords(FALLBACK);
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  const openMaps = () => {
    const { latitude, longitude } = coords ?? FALLBACK;
    Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
  };

  if (locating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl }}>
      <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>🗺️</Text>
      <Text style={[text.h2, { textAlign: 'center', marginBottom: spacing.xs }]}>Map View</Text>
      <Text style={[text.muted, { textAlign: 'center', marginBottom: spacing.xl }]}>
        Opens Google Maps near your location.
      </Text>
      <Pressable
        onPress={openMaps}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.primarySoft : colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.lg,
        })}
      >
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 16 }}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}
