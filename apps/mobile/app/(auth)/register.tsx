import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Pressable, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AxiosError } from 'axios';
import { Field } from '../../components/Field';
import { AmbientGlow } from '../../components/AmbientGlow';
import { useRegister } from '../../hooks/useAuth';
import { colors, radius, spacing, text } from '../../utils/theme';

const RegisterSchema = z.object({
  displayName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(72),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

export default function RegisterScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });
  const register = useRegister();

  const onSubmit = (values: RegisterInput) => register.mutate(values);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }}
      >
        <Text style={[text.h1, { marginBottom: spacing.sm }]}>Create account</Text>
        <Text style={[text.muted, { marginBottom: spacing.xl }]}>
          Welcome to the legendary side of town.
        </Text>

        <Field
          control={control}
          name="displayName"
          label="Display name"
          autoCapitalize="words"
          error={errors.displayName?.message}
        />
        <Field
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email?.message}
        />
        <Field
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={errors.password?.message}
        />

        {register.isError ? (
          <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
            {(register.error as AxiosError)?.response?.status === 409
              ? 'That email is already registered.'
              : 'Something went wrong. Please try again.'}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={register.isPending}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            alignItems: 'center',
            opacity: pressed || register.isPending ? 0.7 : 1,
          })}
        >
          <Text style={text.cta}>{register.isPending ? 'Creating…' : 'Create account'}</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
          <Text style={text.muted}>Already have one? </Text>
          <Link href="/(auth)/login" style={{ color: colors.primarySoft, fontWeight: '600' }}>
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
