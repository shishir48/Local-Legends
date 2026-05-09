import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useGems } from '../../hooks/useGems';
import type { Gem } from '../../services/api';
import { categoryEmoji, formatVotes } from '../../utils/format';
import { colors, radius, spacing, text } from '../../utils/theme';

const FALLBACK_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const gems = useGems();
  const router = useRouter();
  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  const [selected, setSelected] = useState<Gem | null>(null);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });
      } catch {
        // permission denied or no GPS — keep fallback
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  if (gems.isLoading || locating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        onPress={() => setSelected(null)}
      >
        {(gems.data?.items ?? []).map((g) => {
          const [lng, lat] = g.location.coordinates;
          return (
            <Marker
              key={g.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={(e) => {
                e.stopPropagation?.();
                setSelected(g);
              }}
              title={g.name}
            />
          );
        })}
      </MapView>

      {selected ? (
        <Pressable
          onPress={() => router.push(`/gems/${selected.id}`)}
          style={{
            position: 'absolute',
            left: spacing.lg,
            right: spacing.lg,
            bottom: spacing.xl,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {selected.photoUrl ? (
            <Image source={{ uri: selected.photoUrl }} style={{ width: 64, height: 64, borderRadius: radius.md, marginRight: spacing.md, backgroundColor: colors.surfaceAlt }} />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: radius.md, marginRight: spacing.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28 }}>{categoryEmoji(selected.category)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[text.h2, { fontSize: 16 }]} numberOfLines={1}>
              {selected.name}
            </Text>
            <Text style={text.muted} numberOfLines={1}>
              {selected.address}
            </Text>
            <Text style={[text.muted, { marginTop: 2 }]}>▲ {formatVotes(selected.voteCount)}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
