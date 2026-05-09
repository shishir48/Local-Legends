import { Pressable, ScrollView, Text } from 'react-native';
import type { Category } from '../services/api';
import { colors, radius, spacing } from '../utils/theme';

interface Props {
  categories: Category[];
  active: string | null;
  onChange: (id: string | null) => void;
}

export function CategoryFilter({ categories, active, onChange }: Props) {
  const all = [{ id: null as string | null, label: 'All', emoji: '✨' }, ...categories];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
    >
      {all.map((c) => {
        const isActive = c.id === active;
        return (
          <Pressable
            key={c.id ?? 'all'}
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
            <Text
              style={{
                color: isActive ? colors.bg : colors.text,
                fontWeight: '600',
              }}
            >
              {c.emoji} {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
