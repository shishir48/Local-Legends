import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { useGem } from '../../../hooks/useGems';
import { VoteButton } from '../../../components/VoteButton';
import { categoryEmoji, formatTimeAgo } from '../../../utils/format';
import { colors, radius, spacing, text } from '../../../utils/theme';

export default function GemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gem = useGem(id);

  if (gem.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (gem.isError || !gem.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl }}>
        <Text style={text.h2}>Couldn't find that gem</Text>
        <Text style={text.muted}>It may have been removed.</Text>
      </View>
    );
  }

  const g = gem.data;
  const submitter = typeof g.submittedBy === 'object' ? g.submittedBy : null;
  const [lng, lat] = g.location.coordinates;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <Stack.Screen options={{ title: g.name }} />

      {g.photoUrl ? (
        <Image source={{ uri: g.photoUrl }} style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt }} />
      ) : (
        <View style={{ width: '100%', height: 280, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 80 }}>{categoryEmoji(g.category)}</Text>
        </View>
      )}

      <View style={{ padding: spacing.lg }}>
        <Text style={text.h1}>{g.name}</Text>
        <Text style={[text.muted, { marginTop: spacing.xs }]}>
          {categoryEmoji(g.category)} {g.category} · {formatTimeAgo(g.createdAt)}
        </Text>

        <Text style={[text.body, { marginTop: spacing.lg, lineHeight: 22 }]}>{g.description}</Text>

        <View style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md }}>
          <Text style={text.muted}>Address</Text>
          <Text style={[text.body, { marginTop: spacing.xs }]}>{g.address}</Text>
        </View>

        <View style={{ marginTop: spacing.lg, borderRadius: radius.md, overflow: 'hidden' }}>
          <MapView
            style={{ width: '100%', height: 180 }}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} />
          </MapView>
        </View>

        {submitter ? (
          <Text style={[text.muted, { marginTop: spacing.lg }]}>
            Submitted by {submitter.displayName}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <VoteButton gemId={g.id} voteCount={g.voteCount} hasVoted={!!g.hasVoted} />
        </View>
      </View>
    </ScrollView>
  );
}
