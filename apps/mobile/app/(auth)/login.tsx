import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Pressable, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { useLogin } from '../../hooks/useAuth';
import { colors, radius, spacing, text } from '../../utils/theme';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useLogin();

  const onSubmit = (values: LoginInput) => login.mutate(values);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, justifyContent: 'center' }}
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
          error={errors.email?.message}
        />
        <Field
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          error={errors.password?.message}
        />

        {login.isError ? (
          <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
            Invalid credentials
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

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
          <Text style={text.muted}>No account yet? </Text>
          <Link href="/(auth)/register" style={{ color: colors.primarySoft, fontWeight: '600' }}>
            Register
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
