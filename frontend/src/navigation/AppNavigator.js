import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import theme from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminVenuesScreen from '../screens/admin/AdminVenuesScreen';
import AddVenueScreen from '../screens/admin/AddVenueScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminCateringScreen from '../screens/admin/AdminCateringScreen';

import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import VenueDetailScreen from '../screens/customer/VenueDetailScreen';
import BookingScreen from '../screens/customer/BookingScreen';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/** Invisible route target; tab press is intercepted to log out instead of navigating. */
function LogoutTabPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
}

// Shared screen options for native-stack navigators.
// NOTE: `statusBarColor` is intentionally omitted — on Android 15 edge-to-edge
// (default in Expo 54 / react-native-screens v4) it is ignored, and the system
// status bar is rendered transparent. We instead rely on `statusBarStyle` to
// control icon color and let each screen paint its own background up to the
// safe-area inset (see ScreenContainer + CustomerHomeScreen hero).
const screenOptions = {
  headerStyle: {
    backgroundColor: theme.colors.primary,
  },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
  statusBarStyle: 'light',
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen
      name="Dashboard"
      component={AdminDashboardScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Venues" component={AdminVenuesScreen} />
    <Stack.Screen name="Bookings" component={AdminBookingsScreen} />
    <Stack.Screen name="Reviews" component={AdminReviewsScreen} />
    <Stack.Screen name="Catering" component={AdminCateringScreen} />
    <Stack.Screen
      name="AddVenue"
      component={AddVenueScreen}
      options={({ route }) => ({
        title: route.params?.venue ? 'Edit Venue' : 'Add Venue',
      })}
    />
  </Stack.Navigator>
);

const CustomerTabs = () => {
  const { logout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'My Bookings':
              iconName = focused ? 'bookmark' : 'bookmark-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="My Bookings" component={MyBookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen
        name="Log out"
        component={LogoutTabPlaceholder}
        options={{
          headerShown: false,
          tabBarLabel: 'Log out',
          tabBarIcon: ({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={theme.colors.danger} />
          ),
          tabBarLabelStyle: { color: theme.colors.danger },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            logout();
          },
        }}
      />
    </Tab.Navigator>
  );
};

const CustomerStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen
      name="CustomerTabs"
      component={CustomerTabs}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="VenueDetail"
      component={VenueDetailScreen}
      options={{ title: 'Venue Details' }}
    />
    <Stack.Screen
      name="Booking"
      component={BookingScreen}
      options={{ title: 'Book Venue' }}
    />
  </Stack.Navigator>
);

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.loadingInner}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.role === 'admin' ? (
        <AdminStack />
      ) : (
        <CustomerStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingSafe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
