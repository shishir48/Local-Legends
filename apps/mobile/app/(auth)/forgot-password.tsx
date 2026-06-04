import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { AmbientGlow } from '../../components/AmbientGlow';
import { useForgotPassword, useResetPassword } from '../../hooks/useAuth';
import { colors, radius, spacing, text, CONTENT_MAX_WIDTH } from '../../utils/theme';

const EmailSchema = z.object({ email: z.string().email('Enter a valid email') });
type EmailInput = z.infer<typeof EmailSchema>;

const ResetSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters'),
});
type ResetInput = z.infer<typeof ResetSchema>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'request' | 'reset'>('request');

  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetInput>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const onRequest = (values: EmailInput) =>
    forgot.mutate(values, {
      onSuccess: () => {
        setEmail(values.email);
        setPhase('reset');
      },
    });

  const onReset = (values: ResetInput) =>
    reset.mutate({ email, ...values });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}
      >
        <Text style={[text.h1, { marginBottom: spacing.sm }]}>Reset password</Text>

        {phase === 'request' ? (
          <>
            <Text style={[text.muted, { marginBottom: spacing.xl }]}>
              Enter your email and we'll send you a 6-digit reset code.
            </Text>
            <Field
              control={emailForm.control}
              name="email"
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
            />
            {forgot.isError ? (
              <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
                Something went wrong. Try again.
              </Text>
            ) : null}
            <Pressable
              onPress={emailForm.handleSubmit(onRequest)}
              disabled={forgot.isPending}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: spacing.lg,
                borderRadius: radius.md,
                alignItems: 'center',
                opacity: pressed || forgot.isPending ? 0.7 : 1,
              })}
            >
              <Text style={text.cta}>{forgot.isPending ? 'Sending…' : 'Send code'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[text.muted, { marginBottom: spacing.xl }]}>
              We sent a code to {email}. Enter it below with your new password.
            </Text>
            <Field
              control={resetForm.control}
              name="code"
              label="6-digit code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              error={resetForm.formState.errors.code?.message}
            />
            <Field
              control={resetForm.control}
              name="newPassword"
              label="New password"
              secureTextEntry
              autoCapitalize="none"
              error={resetForm.formState.errors.newPassword?.message}
            />
            {reset.isError ? (
              <Text style={[text.muted, { color: colors.danger, marginBottom: spacing.md }]}>
                Invalid or expired code.
              </Text>
            ) : null}
            <Pressable
              onPress={resetForm.handleSubmit(onReset)}
              disabled={reset.isPending}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: spacing.lg,
                borderRadius: radius.md,
                alignItems: 'center',
                opacity: pressed || reset.isPending ? 0.7 : 1,
              })}
            >
              <Text style={text.cta}>{reset.isPending ? 'Resetting…' : 'Reset password'}</Text>
            </Pressable>
          </>
        )}

        <Link
          href="/(auth)/login"
          style={{ color: colors.primarySoft, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg }}
        >
          Back to sign in
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
