import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { colors, spacing, text } from '../../utils/theme';
import type { Gem } from '../../services/api';

function FeedHeader({ categories, active, onChange }: {
  categories: { id: string; label: string; emoji: string }[];
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={text.h1}>Hidden gems</Text>
        <Text style={[text.muted, { marginBottom: spacing.sm }]}>
          Voted by locals, ranked by you.
        </Text>
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
          Be the first to submit one in this category.
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
  const [category, setCategory] = useState<string | null>(null);
  const gems = useGems({ category });
  const categories = useCategories();
  const cats = categories.data?.items ?? [];

  if (gems.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <FeedHeader categories={cats} active={category} onChange={setCategory} />
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
        <FeedHeader categories={cats} active={category} onChange={setCategory} />
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={text.body}>Couldn't load gems.</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>Pull down to retry.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FeedHeader categories={cats} active={category} onChange={setCategory} />
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
