import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, Text, View } from 'react-native';
import { shouldShowDailyPrompt, markPromptShown } from '../lib/push';
import { colors, glass, radius, spacing, text } from '../utils/theme';

export function PushGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    shouldShowDailyPrompt().then((show) => {
      if (active && show) setVisible(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const openSettings = async () => {
    await Linking.openSettings();
    setVisible(false);
    await markPromptShown();
  };

  const later = async () => {
    setVisible(false);
    await markPromptShown();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={later}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl }}>
          <Text style={text.h1}>Enable notifications 🙏</Text>
          <Text style={[text.body, { marginTop: spacing.sm, lineHeight: 22 }]}>
            Local Legend uses notifications to let you know when your gems get upvotes. 
            Please enable notifications in Settings so you don't miss a thing.
          </Text>

          <Pressable
            onPress={openSettings}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
              marginTop: spacing.xl,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={text.cta}>Open Settings</Text>
          </Pressable>

          <Pressable
            onPress={later}
            accessibilityRole="button"
            style={{ paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs }}
          >
            <Text style={[text.muted, { color: colors.textMuted }]}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}