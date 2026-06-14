import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useGems, useTopGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { CityPickerModal } from '../../components/CityPickerModal';
import { FilterSheet } from '../../components/FilterSheet';
import { AmbientGlow } from '../../components/AmbientGlow';
import { colors, rf, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const CITY_KEY = 'll.city';

function FeedHeader({
  city,
  categories,
  active,
  topGems,
  onChange,
  onOpenFilter,
}: {
  city: string;
  categories: { id: string; label: string; emoji: string }[];
  active: string | null;
  topGems: boolean;
  onChange: (id: string | null) => void;
  onOpenFilter: () => void;
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
            {topGems ? '🏆 Top-rated across all cities' : `📍 ${city} · Voted by locals, ranked by you.`}
          </Text>
        </View>
        <Pressable
          onPress={onOpenFilter}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: topGems ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: topGems ? colors.primary : colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing.xs,
          }}
        >
          <Text style={{ fontSize: 13 }}>⚙️</Text>
          <Text style={{ marginLeft: spacing.xs, color: topGems ? colors.bg : colors.text, fontWeight: '600', fontSize: rf(13) }}>
            Filters
          </Text>
        </Pressable>
      </View>
      <CategoryFilter categories={categories} active={active} onChange={onChange} />
    </View>
  );
}

function EmptyFeed({ isTopGems }: { isTopGems?: boolean }) {
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl }}>
      <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📭</Text>
      <Text style={text.h2}>No gems yet</Text>
      <Text style={[text.muted, { marginTop: spacing.xs, textAlign: 'center' }]}>
        {isTopGems ? 'No gems have been submitted yet.' : 'Be the first to submit one in this city.'}
      </Text>
    </View>
  );
}

export default function FeedScreen() {
  const [city, setCity] = useState<string | null>(null);
  const [cityHydrated, setCityHydrated] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [topGems, setTopGems] = useState(false);
  const gems = useGems({ category, city });
  const topGemsQuery = useTopGems();
  const categories = useCategories();
  const cats = categories.data?.items ?? [];

  const data = topGems ? topGemsQuery : gems;

  useEffect(() => {
    SecureStore.getItemAsync(CITY_KEY).then((stored) => {
      if (stored) setCity(stored);
      setCityHydrated(true);
    });
  }, []);

  const selectCity = async (chosen: string) => {
    await SecureStore.setItemAsync(CITY_KEY, chosen);
    setCity(chosen);
    setTopGems(false);
    setShowPicker(false);
  };

  if (!cityHydrated) {
    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!city || showPicker) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <CityPickerModal
          onSelect={selectCity}
          // Closable only when changing an already-picked city; the first-run
          // picker stays mandatory (nothing to fall back to yet).
          onClose={city ? () => setShowPicker(false) : undefined}
        />
      </SafeAreaView>
    );
  }

  const header = (
    <FeedHeader
      city={city}
      categories={cats}
      active={topGems ? null : category}
      topGems={topGems}
      onChange={(id) => {
        setCategory(id);
        if (topGems) setTopGems(false);
      }}
      onOpenFilter={() => setShowFilter(true)}
    />
  );

  if (data.isLoading) {
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

  const items = data.data?.items ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        renderItem={({ item, index }) => <GemCard gem={item} highlight={!topGems && index === 0} showTopBadge={topGems} />}
        ListHeaderComponent={header}
ListEmptyComponent={
          data.isError ? (
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Text style={text.body}>Couldn't load gems.</Text>
              <Text style={[text.muted, { marginTop: spacing.xs }]}>Pull down to retry.</Text>
            </View>
          ) : (
            <EmptyFeed isTopGems={topGems} />
          )
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isFetching && !data.isLoading}
            onRefresh={data.refetch}
            tintColor={colors.primary}
          />
        }
      />
      <FilterSheet
        visible={showFilter}
        topGems={topGems}
        onToggleTopGems={() => {
          setTopGems((prev) => !prev);
          setCategory(null);
        }}
        onChangeCity={() => setShowPicker(true)}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}
