import { Modal, Pressable, Text, View } from 'react-native';
import { colors, glass, radius, spacing, text } from '../utils/theme';

interface Props {
  visible: boolean;
  topGems: boolean;
  onToggleTopGems: () => void;
  onChangeCity: () => void;
  onClose: () => void;
}

export function FilterSheet({ visible, topGems, onToggleTopGems, onChangeCity, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            marginTop: 140,
            marginHorizontal: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: glass.border,
            padding: spacing.md,
          }}
        >
          <Text style={[text.muted, { marginBottom: spacing.md, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }]}>
            Sort & Filter
          </Text>

          <Pressable
            onPress={() => {
              onToggleTopGems();
              onClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <View>
                <Text style={[text.body, { fontWeight: '600' }]}>Top Gems</Text>
                <Text style={text.muted}>Highest voted across all cities</Text>
              </View>
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: topGems ? colors.primary : colors.border,
                backgroundColor: topGems ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {topGems && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.bg }} />}
            </View>
          </Pressable>

          <View style={{ height: 1, backgroundColor: glass.border, marginVertical: spacing.sm }} />

          <Pressable
            onPress={() => {
              onChangeCity();
              onClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          >
            <Text style={{ fontSize: 18 }}>📍</Text>
            <View>
              <Text style={[text.body, { fontWeight: '600' }]}>Change City</Text>
              <Text style={text.muted}>Browse gems in a different city</Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}