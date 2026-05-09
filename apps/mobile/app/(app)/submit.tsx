import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { gemsApi, type Gem } from '../../services/api';
import { useCategories } from '../../hooks/useGems';
import { colors, radius, spacing, text } from '../../utils/theme';

const SubmitSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  category: z.string().min(1, 'Pick a category'),
  description: z.string().min(1, 'Required').max(500),
  address: z.string().min(1, 'Required').max(200),
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<SubmitInput>({
    resolver: zodResolver(SubmitSchema),
    defaultValues: { name: '', category: '', description: '', address: '' },
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const create = useMutation({
    mutationFn: async (values: SubmitInput) => {
      if (!coords) throw new Error('Location unavailable');
      const form = new FormData();
      form.append('name', values.name);
      form.append('category', values.category);
      form.append('description', values.description);
      form.append('address', values.address);
      form.append('lat', String(coords.lat));
      form.append('lng', String(coords.lng));
      if (photo) {
        // RN FormData accepts a { uri, name, type } file shape.
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
          <Text style={text.h1}>Submit a gem</Text>
          <Text style={[text.muted, { marginBottom: spacing.lg }]}>
            Share a place locals love.
          </Text>

          <Field control={control} name="name" label="Name" error={errors.name?.message} />

          <Text style={[text.muted, { marginBottom: spacing.xs }]}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {(categories.data?.items ?? []).map((c) => {
              const isActive = c.id === selectedCategory;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setValue('category', c.id, { shouldValidate: true })}
                  style={{
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
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
            error={errors.description?.message}
            style={{ minHeight: 100 }}
          />
          <Field control={control} name="address" label="Address" error={errors.address?.message} />

          <Text style={[text.muted, { marginBottom: spacing.xs }]}>Photo (optional)</Text>
          <Pressable
            onPress={pickPhoto}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
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

          {!coords ? (
            <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
              Location unavailable — enable location to submit.
            </Text>
          ) : (
            <Text style={[text.muted, { marginBottom: spacing.md }]}>
              📍 Will attach your current location ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
            </Text>
          )}

          <Pressable
            onPress={handleSubmit((v) => create.mutate(v))}
            disabled={create.isPending || !coords}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingVertical: spacing.lg,
              borderRadius: radius.md,
              alignItems: 'center',
              opacity: pressed || create.isPending || !coords ? 0.6 : 1,
            })}
          >
            <Text style={text.cta}>{create.isPending ? 'Submitting…' : 'Submit gem'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
