import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors, glass, radius, spacing, text } from '../utils/theme';

interface FieldProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  /** If true, renders an eye toggle inside the input to show/hide the password. */
  showPasswordToggle?: boolean;
}

export function Field<T extends FieldValues>({
  control,
  name,
  label,
  error,
  showPasswordToggle,
  style,
  secureTextEntry,
  ...inputProps
}: FieldProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const effectiveSecureTextEntry = showPasswordToggle ? !showPassword : secureTextEntry;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[text.muted, { marginBottom: spacing.xs }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={{ position: 'relative' }}>
            <TextInput
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={effectiveSecureTextEntry}
              style={[
                {
                  backgroundColor: glass.fill,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: error ? colors.danger : glass.border,
                  borderRadius: radius.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingRight: showPasswordToggle ? spacing.lg + 36 : spacing.lg,
                  fontSize: 16,
                },
                style,
              ]}
              {...inputProps}
            />
            {showPasswordToggle ? (
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: spacing.md,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  padding: spacing.xs,
                }}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        )}
      />
      {error ? (
        <Text style={[text.muted, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      ) : null}
    </View>
  );
}
