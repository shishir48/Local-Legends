import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { CityPickerModal } from '../../components/CityPickerModal';
import { AmbientGlow } from '../../components/AmbientGlow';
import { colors, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const CITY_KEY = 'll.city';

function FeedHeader({
  city,
  categories,
  active,
  onChange,
  onChangeCity,
}: {
  city: string;
  categories: { id: string; label: string; emoji: string }[];
  active: string | null;
  onChange: (id: string | null) => void;
  onChangeCity: () => void;
}) {
  return (
    <View>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={text.h1}>Hidden gems</Text>
          <Text style={[text.muted, { marginBottom: spacing.sm }]}>
            📍 {city} · Voted by locals, ranked by you.
          </Text>
        </View>
        <Pressable
          onPress={onChangeCity}
          accessibilityRole="button"
          accessibilityLabel="Change city"
          style={{ paddingTop: spacing.xs }}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Change</Text>
        </Pressable>
      </View>
      <CategoryFilter categories={categories} active={active} onChange={onChange} />
    </View>
  );
}

function EmptyFeed() {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl }}>
      <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📭</Text>
      <Text style={text.h2}>No gems yet</Text>
      <Text style={[text.muted, { marginTop: spacing.xs, textAlign: 'center' }]}>
        Be the first to submit one in this city.
      </Text>
    </View>
  );
}

export default function FeedScreen() {
  const [city, setCity] = useState<string | null>(null);
  const [cityHydrated, setCityHydrated] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const gems = useGems({ category, city });
  const categories = useCategories();
  const cats = categories.data?.items ?? [];

  useEffect(() => {
    SecureStore.getItemAsync(CITY_KEY).then((stored) => {
      if (stored) setCity(stored);
      setCityHydrated(true);
    });
  }, []);

  const selectCity = async (chosen: string) => {
    await SecureStore.setItemAsync(CITY_KEY, chosen);
    setCity(chosen);
    setShowPicker(false);
  };

  if (!cityHydrated) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!city || showPicker) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <CityPickerModal onSelect={selectCity} />
      </SafeAreaView>
    );
  }

  const header = (
    <FeedHeader
      city={city}
      categories={cats}
      active={category}
      onChange={setCategory}
      onChangeCity={() => setShowPicker(true)}
    />
  );

  if (gems.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <AmbientGlow />
        {header}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <GemCardSkeleton />
          <GemCardSkeleton />
          <GemCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  const items = gems.data?.items ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item, index }) => <GemCard gem={item} highlight={index === 0} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          gems.isError ? (
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Text style={text.body}>Couldn't load gems.</Text>
              <Text style={[text.muted, { marginTop: spacing.xs }]}>Pull down to retry.</Text>
            </View>
          ) : (
            <EmptyFeed />
          )
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={gems.isFetching && !gems.isLoading}
            onRefresh={gems.refetch}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}
