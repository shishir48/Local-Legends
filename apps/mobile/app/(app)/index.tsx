import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGems, useCategories } from '../../hooks/useGems';
import { GemCard } from '../../components/GemCard';
import { GemCardSkeleton } from '../../components/GemCardSkeleton';
import { CategoryFilter } from '../../components/CategoryFilter';
import { colors, spacing, text } from '../../utils/theme';

export default function FeedScreen() {
  const [category, setCategory] = useState<string | null>(null);
  const gems = useGems({ category });
  const categories = useCategories();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={[text.h1]}>Hidden gems</Text>
        <Text style={[text.muted, { marginBottom: spacing.sm }]}>
          Voted by locals, ranked by you.
        </Text>
      </View>

      <CategoryFilter
        categories={categories.data?.items ?? []}
        active={category}
        onChange={setCategory}
      />

      {gems.isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <GemCardSkeleton />
          <GemCardSkeleton />
          <GemCardSkeleton />
        </View>
      ) : gems.isError ? (
        <View style={{ alignItems: 'center', padding: spacing.xl }}>
          <Text style={text.body}>Couldn't load gems.</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>
            Pull down to retry.
          </Text>
        </View>
      ) : (gems.data?.items.length ?? 0) === 0 ? (
        <View style={{ alignItems: 'center', padding: spacing.xxl }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📭</Text>
          <Text style={text.h2}>No gems yet</Text>
          <Text style={[text.muted, { marginTop: spacing.xs, textAlign: 'center' }]}>
            Be the first to submit one in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={gems.data!.items}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GemCard gem={item} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          refreshControl={
            <RefreshControl
              refreshing={gems.isFetching && !gems.isLoading}
              onRefresh={gems.refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
