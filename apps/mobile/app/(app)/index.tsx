import { useEffect, useRef, useState } from 'react';
import { FlatList, ActivityIndicator, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useGems, useTopGems, useNewGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { CityPickerModal } from '../../components/CityPickerModal';
import { FilterSheet } from '../../components/FilterSheet';
import { AmbientGlow } from '../../components/AmbientGlow';
import GemMap from '../../components/GemMap';
import { colors, glass, rf, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const CITY_KEY = 'll.city';

function FeedHeader({
  city,
  categories,
  active,
  topGems,
  searchQuery,
  searchFocused,
  searchFetching,
  searchInputRef,
  onChange,
  onOpenFilter,
  onSearchChange,
  onSearchFocus,
}: {
  city: string;
  categories: { id: string; label: string; emoji: string }[];
  active: string | null;
  topGems: boolean;
  searchQuery: string;
  searchFocused: boolean;
  searchFetching: boolean;
  searchInputRef: React.RefObject<TextInput | null>;
  onChange: (id: string | null) => void;
  onOpenFilter: () => void;
  onSearchChange: (q: string) => void;
  onSearchFocus: (focused: boolean) => void;
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
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
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
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: glass.fill,
          borderWidth: 1,
          borderColor: searchFocused ? colors.primary : glass.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
        }}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          {searchFetching && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: spacing.xs }} />
          )}
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => onSearchFocus(true)}
            onBlur={() => onSearchFocus(false)}
            placeholder="Search gems…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 14,
              paddingVertical: spacing.sm,
              paddingLeft: spacing.sm,
            }}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => { onSearchChange(''); searchInputRef.current?.blur(); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
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
  const [newGems, setNewGems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();

  // Debounce search — wait 300ms after the user stops typing before firing the API call
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery === '') {
      // Clear immediately when search is emptied
      setDebouncedQuery('');
    } else if (searchQuery.trim().length >= 2) {
      // Only debounce queries with 2+ characters
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(searchQuery.trim());
      }, 300);
    } else {
      // Short queries (< 2 chars) also clear immediately
      setDebouncedQuery('');
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const isSearching = debouncedQuery.trim().length >= 2;
  const gems = useGems({ category: isSearching ? null : category, city, q: isSearching ? debouncedQuery.trim() : undefined, sort: isSearching ? 'search' : undefined });
  const topGemsQuery = useTopGems();
  const newGemsQuery = useNewGems(newGems && !isSearching ? city : null);
  const categories = useCategories();
  const cats = categories.data?.items ?? [];

  // Show search results when searching, new gems / top gems when toggled, otherwise normal feed
  const isTopGemsView = topGems && !isSearching;
  const isNewGemsView = newGems && !isSearching;
  const data = isSearching ? gems : (isNewGemsView ? newGemsQuery : (isTopGemsView ? topGemsQuery : gems));

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
    setNewGems(false);
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
      active={isTopGemsView ? null : category}
      topGems={isTopGemsView}
      searchQuery={searchQuery}
      searchFocused={searchFocused}
      searchFetching={isSearching && data.isFetching}
      onChange={(id) => {
        setCategory(id);
        if (topGems) setTopGems(false);
        if (newGems) setNewGems(false);
      }}
      onOpenFilter={() => setShowFilter(true)}
      onSearchChange={setSearchQuery}
      onSearchFocus={setSearchFocused}
      searchInputRef={searchInputRef}
    />
  );

  if (data.isLoading && !isSearching) {
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
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
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
        newGems={newGems}
        onToggleTopGems={() => {
          setTopGems((prev) => !prev);
          setNewGems(false);
          setCategory(null);
        }}
        onToggleNewGems={() => {
          setNewGems((prev) => !prev);
          setTopGems(false);
          setCategory(null);
        }}
        onChangeCity={() => setShowPicker(true)}
        onClose={() => setShowFilter(false)}
      />
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <GemMap
          gems={items}
          onClose={() => setShowMap(false)}
          onGemPress={(gemId) => {
            setShowMap(false);
            router.push(`/gems/${gemId}`);
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}
