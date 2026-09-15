import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { useAlertSummary } from '@/features/alerts';
import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme';

function TabBarBackground() {
  const theme = useTheme();

  if (Platform.OS === 'ios' && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={theme.scheme}
        tintColor={theme.colors.surfaceGlass}
        style={{ flex: 1 }}
      />
    );
  }

  return <View style={{ flex: 1, backgroundColor: theme.colors.surfaceGlassStrong }} />;
}

/**
 * The tab bar. Four destinations, matching the sections of the web portal that a reader on a
 * phone actually opens: what is happening now, where, what is warned about, and everything
 * else.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const { data: summary } = useAlertSummary();

  const activeAlerts = summary?.activeCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: theme.colors.borderSubtle,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
        // Fixed-size labels, as UIKit's tab bar has on iOS. Scaled with the Android system font
        // they overflow the 64dp bar and clip at the bottom edge.
        tabBarAllowFontScaling: false,
        // Android resizes the window for the keyboard, which lifts the tab bar on top of it
        // while the district search is focused. iOS overlays the keyboard instead.
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="districts"
        options={{
          title: 'Districts',
          // A list icon, not a map one: the map metaphor belongs to the tab that actually
          // renders a map, and this tab is a searchable list of thirteen districts.
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          // The badge is the reason the summary is fetched here rather than on the alerts
          // screen: a reader needs to see there is a warning without opening the tab.
          tabBarBadge: activeAlerts > 0 ? activeAlerts : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.danger,
            // Named explicitly: the badge is not a Text atom, so it would otherwise render in
            // Roboto on Android and San Francisco on iOS.
            fontFamily: fontFamily.semibold,
            fontSize: 10,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
