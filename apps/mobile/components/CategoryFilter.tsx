import { FlatList, Pressable, Text } from 'react-native';
import type { Category } from '../services/api';
import { colors, radius, spacing } from '../utils/theme';

interface Props {
  categories: Category[];
  active: string | null;
  onChange: (id: string | null) => void;
}

type FilterItem = { id: string | null; label: string; emoji: string };

export function CategoryFilter({ categories, active, onChange }: Props) {
  const data: FilterItem[] = [{ id: null, label: 'All', emoji: '✨' }, ...categories];

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(c) => c.id ?? 'all'}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
      renderItem={({ item: c }) => {
        const isActive = c.id === active;
        return (
          <Pressable
            onPress={() => onChange(c.id)}
            style={{
              backgroundColor: isActive ? colors.primary : colors.surface,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              marginRight: spacing.sm,
              borderWidth: 1,
              borderColor: isActive ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: isActive ? colors.bg : colors.text, fontWeight: '600' }}>
              {c.emoji} {c.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
