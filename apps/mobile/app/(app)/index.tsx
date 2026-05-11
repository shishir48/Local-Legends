import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { colors, radius, spacing, text } from '../../utils/theme';
import { searchCities, INDIAN_CITIES } from '../../utils/indianCities';
import type { Gem } from '../../services/api';

const CITY_KEY = 'll.city';

const POPULAR_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];

function CityPickerModal({ onSelect }: { onSelect: (city: string) => void }) {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const suggestions = searchCities(input);
  const inputIsValid = INDIAN_CITIES.includes(selected ?? '');

  const handleType = (val: string) => {
    setInput(val);
    setSelected(null); // invalidate until user picks from list
  };

  const pick = (city: string) => {
    setInput(city);
    setSelected(city);
  };

  return (
    <Modal transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            borderRadius: radius.lg,
            padding: spacing.xl,
          }}
        >
          <Text style={text.h1}>Pick your city</Text>
          <Text style={[text.muted, { marginBottom: spacing.lg }]}>
            We'll show top-voted local gems near you.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {POPULAR_CITIES.map((city) => (
              <Pressable
                key={city}
                onPress={() => pick(city)}
                style={{
                  backgroundColor: selected === city ? colors.primary : colors.surface,
                  borderColor: selected === city ? colors.primary : colors.border,
                  borderWidth: 1,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  marginRight: spacing.sm,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ color: selected === city ? colors.bg : colors.text, fontWeight: '600' }}>
                  {city}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[text.muted, { marginBottom: spacing.xs }]}>Search city</Text>
          <TextInput
            value={input}
            onChangeText={handleType}
            placeholder="Type to search…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            style={{
              backgroundColor: colors.surface,
              borderColor: inputIsValid ? colors.success : colors.border,
              borderWidth: 1,
              borderBottomLeftRadius: suggestions.length > 0 && !inputIsValid ? 0 : radius.md,
              borderBottomRightRadius: suggestions.length > 0 && !inputIsValid ? 0 : radius.md,
              borderTopLeftRadius: radius.md,
              borderTopRightRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.text,
            }}
          />

          {suggestions.length > 0 && !inputIsValid && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderTopWidth: 0,
                borderBottomLeftRadius: radius.md,
                borderBottomRightRadius: radius.md,
                marginBottom: spacing.sm,
                overflow: 'hidden',
              }}
            >
              {suggestions.map((city, idx) => (
                <Pressable
                  key={city}
                  onPress={() => pick(city)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                  })}
                >
                  <Text style={{ color: colors.text }}>{city}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {input.length > 1 && suggestions.length === 0 && !inputIsValid && (
            <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.sm, marginTop: spacing.xs }]}>
              No matching city found.
            </Text>
          )}

          {!inputIsValid && input.length === 0 && (
            <View style={{ height: spacing.sm }} />
          )}

          <Pressable
            onPress={() => selected && onSelect(selected)}
            disabled={!inputIsValid}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
              opacity: pressed || !inputIsValid ? 0.4 : 1,
              marginTop: spacing.sm,
            })}
          >
            <Text style={text.cta}>
              {inputIsValid ? `Explore ${selected}` : 'Select a city to continue'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
        <Pressable onPress={onChangeCity} style={{ paddingTop: spacing.xs }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Change</Text>
        </Pressable>
      </View>
      <CategoryFilter categories={categories} active={active} onChange={onChange} />
    </View>
  );
}

function GemList({ items }: { items: Gem[] }) {
  if (items.length === 0) {
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
  return (
    <View>
      {items.map((g) => (
        <View key={g.id} style={{ paddingHorizontal: spacing.lg }}>
          <GemCard gem={g} />
        </View>
      ))}
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

  if (gems.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <FeedHeader
          city={city}
          categories={cats}
          active={category}
          onChange={setCategory}
          onChangeCity={() => setShowPicker(true)}
        />
        <View style={{ paddingHorizontal: spacing.lg }}>
          <GemCardSkeleton />
          <GemCardSkeleton />
          <GemCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (gems.isError) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <FeedHeader
          city={city}
          categories={cats}
          active={category}
          onChange={setCategory}
          onChangeCity={() => setShowPicker(true)}
        />
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={text.body}>Couldn't load gems.</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>Pull down to retry.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FeedHeader
        city={city}
        categories={cats}
        active={category}
        onChange={setCategory}
        onChangeCity={() => setShowPicker(true)}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={gems.isFetching && !gems.isLoading}
            onRefresh={gems.refetch}
            tintColor={colors.primary}
          />
        }
      >
        <GemList items={gems.data?.items ?? []} />
      </ScrollView>
    </SafeAreaView>
  );
}
