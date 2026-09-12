import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useAlertSummary } from '@/features/alerts';
import { fontFamily } from '@/theme/fonts';
import { useTheme } from '@/theme';

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
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
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
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger, fontSize: 10 },
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
