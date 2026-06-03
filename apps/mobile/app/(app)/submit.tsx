import { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { PlacesSearchField, type PlaceResult } from '../../components/PlacesSearchField';
import { AmbientGlow } from '../../components/AmbientGlow';
import { gemsApi, type Gem } from '../../services/api';
import { logger } from '../../services/logger';
import { useCategories } from '../../hooks/useGems';
import { colors, glass, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const SubmitSchema = z.object({
  name: z.string().min(1, 'Search and select a business'),
  category: z.string().min(1, 'Pick a category'),
  description: z.string().min(1, 'Required').max(500),
  address: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
});
type SubmitInput = z.infer<typeof SubmitSchema>;

interface PickedPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}

export default function SubmitScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [place, setPlace] = useState<PlaceResult | null>(null);

  const { control, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<SubmitInput>({
    resolver: zodResolver(SubmitSchema),
    defaultValues: { name: '', category: '', description: '', address: '', city: '' },
  });

  const selectedCategory = watch('category');

  useFocusEffect(
    useCallback(() => {
      reset({ name: '', category: '', description: '', address: '', city: '' });
      setPlace(null);
      setPhoto(null);
    }, [])
  );

  const handlePlaceSelect = (p: PlaceResult) => {
    setPlace(p);
    setValue('name', p.name, { shouldValidate: true });
    setValue('address', p.address, { shouldValidate: true });
    setValue('city', p.city, { shouldValidate: true });
  };

  const handlePlaceClear = () => {
    setPlace(null);
    setValue('name', '', { shouldValidate: false });
    setValue('address', '', { shouldValidate: false });
    setValue('city', '', { shouldValidate: false });
  };

  const create = useMutation({
    mutationFn: async (values: SubmitInput) => {
      if (!place) throw new Error('Select a business from the dropdown');
      const form = new FormData();
      form.append('name', values.name);
      form.append('category', values.category);
      form.append('description', values.description);
      form.append('address', values.address);
      form.append('city', values.city);
      form.append('mapsUrl', place.mapsUrl);
      form.append('lat', String(place.lat));
      form.append('lng', String(place.lng));
      if (photo) {
        form.append('photo', {
          uri: photo.uri,
          name: photo.fileName,
          type: photo.mimeType,
        } as unknown as Blob);
      }
      return gemsApi.create(form);
    },
    onSuccess: (gem: Gem) => {
      qc.invalidateQueries({ queryKey: ['gems'] });
      logger.event('gem_submitted', { gemId: gem.id, name: gem.name });
      router.replace(`/gems/${gem.id}`);
    },
    onError: (err: Error) => {
      Alert.alert('Could not submit', err.message);
    },
  });

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setPhoto({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? `gem-${Date.now()}.jpg`,
    });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={text.h1}>Submit a gem</Text>
          <Text style={[text.muted, { marginBottom: spacing.lg }]}>
            Share a place locals love.
          </Text>

          <PlacesSearchField
            selected={place}
            onSelect={handlePlaceSelect}
            onClear={handlePlaceClear}
            error={errors.name?.message}
          />

          {place && (
            <View
              style={{
                backgroundColor: glass.fill,
                borderWidth: 1,
                borderColor: glass.border,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <Text style={[text.muted, { marginBottom: spacing.xs }]}>Address</Text>
              <Text style={text.body}>{place.address}</Text>
              <Text style={[text.muted, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>City</Text>
              <Text style={text.body}>{place.city}</Text>
            </View>
          )}

          <Text style={[text.muted, { marginBottom: spacing.xs }]}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {(categories.data?.items ?? []).map((c) => {
              const isActive = c.id === selectedCategory;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setValue('category', c.id, { shouldValidate: true })}
                  style={{
                    backgroundColor: isActive ? colors.primary : glass.fill,
                    borderColor: isActive ? colors.primary : glass.border,
                    borderWidth: 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    marginRight: spacing.sm,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={{ color: isActive ? colors.bg : colors.text, fontWeight: '600' }}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.category ? (
            <Text style={[text.muted, { color: colors.danger, marginTop: -spacing.md, marginBottom: spacing.lg }]}>
              {errors.category.message}
            </Text>
          ) : null}

          <Field
            control={control}
            name="description"
            label="Why is it a gem?"
            multiline
            numberOfLines={4}
            returnKeyType="done"
            blurOnSubmit
            error={errors.description?.message}
            style={{ minHeight: 100 }}
          />

          <Text style={[text.muted, { marginBottom: spacing.xs }]}>Photo (optional)</Text>
          <Pressable
            onPress={pickPhoto}
            style={{
              backgroundColor: glass.fill,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: glass.border,
              padding: spacing.md,
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 180, borderRadius: radius.sm }} />
            ) : (
              <Text style={text.body}>+ Pick a photo</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSubmit((v) => create.mutate(v))}
            disabled={create.isPending || !place}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingVertical: spacing.lg,
              borderRadius: radius.md,
              alignItems: 'center',
              opacity: pressed || create.isPending || !place ? 0.6 : 1,
            })}
          >
            <Text style={text.cta}>{create.isPending ? 'Submitting…' : 'Submit gem'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
