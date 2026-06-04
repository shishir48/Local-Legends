import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { placesApi, type PlacePrediction } from '../services/api';
import { colors, radius, spacing, text } from '../utils/theme';

export interface PlaceResult {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  mapsUrl: string;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
  onClear: () => void;
  selected: PlaceResult | null;
  city: string | null;
  error?: string;
}

// Lightweight session token (no extra dep) to group autocomplete + details
// calls into one Google billing session.
function newSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PlacesSearchField({ onSelect, onClear, selected, city, error }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickError, setPickError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<string | null>(null);

  const disabled = !city;

  const handleChange = (val: string) => {
    setQuery(val);
    setPickError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || !city) { setSuggestions([]); return; }
    if (!sessionRef.current) sessionRef.current = newSessionToken();
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await placesApi.autocomplete(val.trim(), city, sessionRef.current ?? undefined);
        setSuggestions(data.status === 'OK' ? data.predictions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handlePick = async (prediction: PlacePrediction) => {
    setSuggestions([]);
    setPickError(false);
    // Nominatim fallback returns detail inline; Google mode needs a details call.
    if (prediction.detail) {
      setQuery('');
      sessionRef.current = null;
      onSelect(prediction.detail);
      return;
    }
    setLoading(true);
    try {
      const detail = await placesApi.details(prediction.place_id, sessionRef.current ?? undefined);
      setQuery('');
      sessionRef.current = null;
      onSelect(detail);
    } catch {
      setPickError(true);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.success,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[text.body, { fontWeight: '700' }]}>{selected.name}</Text>
          <Text style={[text.muted, { marginTop: spacing.xs }]}>{selected.address}</Text>
        </View>
        <Pressable onPress={onClear} style={{ paddingLeft: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[text.muted, { marginBottom: spacing.xs }]}>Business name</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: error ? colors.danger : colors.border,
          borderWidth: 1,
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          borderBottomLeftRadius: suggestions.length > 0 ? 0 : radius.md,
          borderBottomRightRadius: suggestions.length > 0 ? 0 : radius.md,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          value={query}
          onChangeText={handleChange}
          editable={!disabled}
          placeholder={disabled ? 'Pick a city first' : 'Search business on map…'}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={{ flex: 1, color: disabled ? colors.textMuted : colors.text, paddingVertical: spacing.sm }}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {suggestions.length > 0 && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderTopWidth: 0,
            borderBottomLeftRadius: radius.md,
            borderBottomRightRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((p, idx) => (
            <Pressable
              key={p.place_id}
              onPress={() => handlePick(p)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: colors.border,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
              })}
            >
              <Text style={[text.body, { fontWeight: '600' }]}>
                {p.structured_formatting.main_text}
              </Text>
              <Text style={text.muted}>{p.structured_formatting.secondary_text}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {pickError && (
        <Text style={[text.muted, { color: colors.danger, marginTop: spacing.xs }]}>
          Couldn't load that place, try another.
        </Text>
      )}

      {query.length > 1 && suggestions.length === 0 && !loading && !pickError && (
        <Text style={[text.muted, { color: colors.textMuted, marginTop: spacing.xs }]}>
          No results. Try a different name.
        </Text>
      )}

      {error && (
        <Text style={[text.muted, { color: colors.danger, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}
