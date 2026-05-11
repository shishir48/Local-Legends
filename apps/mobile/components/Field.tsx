import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { colors, radius, spacing, text } from '../utils/theme';

interface FieldProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
}

export function Field<T extends FieldValues>({
  control,
  name,
  label,
  error,
  style,
  ...inputProps
}: FieldProps<T>) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[text.muted, { marginBottom: spacing.xs }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={colors.textMuted}
            style={[
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderWidth: 1,
                borderColor: error ? colors.danger : colors.border,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                fontSize: 16,
              },
              style,
            ]}
            {...inputProps}
          />
        )}
      />
      {error ? (
        <Text style={[text.muted, { color: colors.danger, marginTop: spacing.xs }]}>{error}</Text>
      ) : null}
    </View>
  );
}
