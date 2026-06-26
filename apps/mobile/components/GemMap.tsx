import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import type { Gem } from '../services/api';
import { colors, radius, spacing, text } from '../utils/theme';

interface Props {
  gems: Gem[];
  onClose: () => void;
  onGemPress: (gemId: string) => void;
}

export default function GemMap({ gems, onClose, onGemPress }: Props) {
  const [loading, setLoading] = useState(true);

  const coords = gems
    .filter((g) => g.location?.coordinates?.length === 2)
    .map((g) => ({
      id: g.id,
      name: g.name,
      latitude: g.location.coordinates[1],
      longitude: g.location.coordinates[0],
    }));

  const initialRegion: Region | undefined = coords.length > 0
    ? {
        latitude: coords.reduce((s, c) => s + c.latitude, 0) / coords.length,
        longitude: coords.reduce((s, c) => s + c.longitude, 0) / coords.length,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header bar */}
      <View
        style={{
          paddingTop: 50,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          backgroundColor: colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={text.h2}>Map view</Text>
        <Pressable onPress={onClose} hitSlop={8} style={{ padding: spacing.xs }}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      {coords.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={text.muted}>No gems with location data.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            onMapReady={() => setLoading(false)}
            showsUserLocation
          >
            {coords.map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                title={c.name}
                onPress={() => onGemPress(c.id)}
              />
            ))}
          </MapView>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 }}
            />
          ) : null}

          <Text
            style={[
              text.muted,
              { textAlign: 'center', paddingVertical: spacing.sm, fontSize: 11 },
            ]}
          >
            {coords.length} gem{coords.length !== 1 ? 's' : ''} on the map
          </Text>
        </View>
      )}
    </View>
  );
}