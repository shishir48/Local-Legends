import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Pressable, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import type { AxiosError } from 'axios';
import { Field } from '../../components/Field';
import { AmbientGlow } from '../../components/AmbientGlow';
import { useLogin } from '../../hooks/useAuth';
import { colors, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const DEMO_CREDENTIALS = { email: 'maya@example.com', password: 'password123' };

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useLogin();

  const onSubmit = (values: LoginInput) => login.mutate(values);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
      >
        <Text style={[text.h1, { marginBottom: spacing.sm }]}>📍 Local Legend</Text>
        <Text style={[text.muted, { marginBottom: spacing.xl }]}>
          Sign in to share your favourite hidden gems.
        </Text>

        <Field
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          error={errors.email?.message}
        />
        <Field
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={errors.password?.message}
        />

        {login.isError ? (
          <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
            {(() => {
              const err = login.error as AxiosError<{ error?: string }>;
              const status = err?.response?.status;
              if (status === 429) return 'Too many attempts. Please wait.';
              if (!err?.response) return 'Network error. Check your connection.';
              return err.response?.data?.error ?? 'Invalid credentials';
            })()}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={login.isPending}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            alignItems: 'center',
            opacity: pressed || login.isPending ? 0.7 : 1,
          })}
        >
          <Text style={text.cta}>{login.isPending ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setValue('email', DEMO_CREDENTIALS.email);
            setValue('password', DEMO_CREDENTIALS.password);
          }}
          style={({ pressed }) => ({
            marginTop: spacing.md,
            padding: spacing.sm,
            borderRadius: radius.md,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'dashed',
          })}
        >
          <Text style={[text.muted, { fontSize: 13 }]}>
            Demo: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
          <Text style={text.muted}>No account yet? </Text>
          <Link href="/(auth)/register" style={{ color: colors.primarySoft, fontWeight: '600' }}>
            Register
          </Link>
        </View>

        <Link
          href="/(auth)/forgot-password"
          style={{ color: colors.primarySoft, fontWeight: '600', textAlign: 'center', marginTop: spacing.md }}
        >
          Forgot password?
        </Link>

        <Text style={[text.muted, { textAlign: 'center', marginTop: spacing.xl, fontSize: 11 }]}>
          v{Constants.expoConfig?.version ?? '—'}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
