import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter, type Href } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

// Centre "Post (+)" button — an action, not a screen. It intercepts the press
// and opens the listing-creation flow; app/(agent)/post.tsx renders nothing.
function PostTabButton(_props: BottomTabBarButtonProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New listing"
      onPress={() => router.push('/(agent)/listings/create' as Href)}
      style={styles.postButtonSlot}>
      <View style={styles.postButton}>
        <Feather name="plus" size={26} color={colors.white} />
      </View>
    </Pressable>
  );
}

// Tab label with active/inactive font + colour.
function TabBarLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? fonts.semibold : fonts.regular,
        fontSize: 10,
        color: focused ? colors.blue600 : colors.gray400,
        marginTop: 2,
      }}>
      {label}
    </Text>
  );
}

// Agent bottom tab navigator. 5 items: Home, Listings, Post(+), Enquiries,
// Profile. See docs/denhunt-design-system.md (Bottom navigation bar).
export default function AgentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.gray50 },
        tabBarActiveTintColor: colors.blue600,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: ({ focused }) => <TabBarLabel label="Home" focused={focused} />,
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          tabBarLabel: ({ focused }) => <TabBarLabel label="Listings" focused={focused} />,
          tabBarIcon: ({ color }) => <Feather name="list" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <PostTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="enquiries"
        options={{
          tabBarLabel: ({ focused }) => <TabBarLabel label="Enquiries" focused={focused} />,
          tabBarIcon: ({ color }) => <Feather name="message-square" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: ({ focused }) => <TabBarLabel label="Profile" focused={focused} />,
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
      {/* Team is reachable from the dashboard, not the tab bar. */}
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    elevation: 0,
    shadowOpacity: 0,
    height: 60,
    paddingBottom: 0,
    paddingTop: 0,
  },
  postButtonSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.blue600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
