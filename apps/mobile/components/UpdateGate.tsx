import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { checkForUpdate, applyOtaUpdate, openStore, type UpdateKind } from '../lib/appUpdate';
import { colors, radius, spacing, text } from '../utils/theme';

/**
 * Checks for an update on mount and, if one is pending, shows a dismissible
 * modal nudging the user to update — OTA (applied in-app) or a Play Store
 * version (opens the store). "Later" dismisses; it returns next launch.
 */
export function UpdateGate() {
  const [kind, setKind] = useState<UpdateKind>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    checkForUpdate().then((k) => {
      if (active) setKind(k);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!kind) return null;

  const isOta = kind === 'ota';
  const title = isOta ? 'Update ready ✨' : 'Please update 🙏';
  const body = isOta
    ? "A fresh version of Local Legend is ready. Update now — it takes a second and keeps everything running smoothly."
    : "You're on an old version. Please update from the Play Store so you don't miss new gems and features. 🙏";
  const cta = isOta ? 'Update now' : 'Update';

  const onUpdate = async () => {
    setBusy(true);
    try {
      if (isOta) {
        await applyOtaUpdate(); // fetches + relaunches into the new bundle
      } else {
        await openStore();
        setKind(null);
      }
    } catch {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => setKind(null)}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl }}>
          <Text style={text.h1}>{title}</Text>
          <Text style={[text.body, { marginTop: spacing.sm, lineHeight: 22 }]}>{body}</Text>

          <Pressable
            onPress={onUpdate}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
              marginTop: spacing.xl,
              opacity: pressed || busy ? 0.5 : 1,
            })}
          >
            {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={text.cta}>{cta}</Text>}
          </Pressable>

          <Pressable
            onPress={() => setKind(null)}
            disabled={busy}
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
