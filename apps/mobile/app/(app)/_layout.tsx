import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../../utils/theme';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

function PlusIcon() {
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -12,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.bg }}>+</Text>
    </View>
  );
}

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon icon="📍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon icon="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarLabel: () => null,
          tabBarIcon: () => <PlusIcon />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gems/[id]"
        options={{ href: null, title: 'Gem' }}
      />
    </Tabs>
  );
}
