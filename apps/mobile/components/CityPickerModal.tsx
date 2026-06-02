import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, text } from '../utils/theme';
import { searchCities, INDIAN_CITIES } from '../utils/indianCities';

const POPULAR_CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];

export function CityPickerModal({ onSelect }: { onSelect: (city: string) => void }) {
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
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl }}>
          <Text style={text.h1}>Pick your city</Text>
          <Text style={[text.muted, { marginBottom: spacing.lg }]}>
            We'll show top-voted local gems near you.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {POPULAR_CITIES.map((city) => (
              <Pressable
                key={city}
                onPress={() => pick(city)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${city}`}
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
                  accessibilityRole="button"
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

          {!inputIsValid && input.length === 0 && <View style={{ height: spacing.sm }} />}

          <Pressable
            onPress={() => selected && onSelect(selected)}
            disabled={!inputIsValid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !inputIsValid }}
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
