import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { fetchVenues } from '../../api/venueService';
import { fetchAllBookings } from '../../api/bookingService';
import { fetchAllReviews } from '../../api/reviewService';
import { fetchCatering } from '../../api/cateringService';
import ScreenContainer from '../../components/ScreenContainer';

const QUICK_GAP = 12;
const GRID_GAP = 12;

const QuickActionCard = ({ icon, label, onPress, color, widthStyle }) => (
  <TouchableOpacity style={[styles.quickActionCard, widthStyle]} onPress={onPress} activeOpacity={0.92}>
    <Ionicons name={icon} size={28} color={color} style={styles.quickActionIcon} />
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ManagementGridItem = ({ icon, label, onPress, color, bgColor, widthStyle }) => (
  <TouchableOpacity style={[styles.gridItemContainer, widthStyle]} onPress={onPress} activeOpacity={0.92}>
    <View style={[styles.gridIconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.gridItemLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    venues: 0,
    reviews: 0,
    catering: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    revenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const horizontalPad = theme.spacing.lg * 2;
  const quickCardWidth = Math.max(96, (windowWidth - horizontalPad - QUICK_GAP * 2) / 3);
  const gridCellWidth = Math.max(72, (windowWidth - horizontalPad - GRID_GAP * 3) / 4);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [venues, bookings, reviews, catering] = await Promise.all([
        fetchVenues(),
        fetchAllBookings(),
        fetchAllReviews().catch(() => []),
        fetchCatering(),
      ]);
      const pending = bookings.filter((b) => b.status === 'Pending').length;
      const confirmed = bookings.filter((b) => b.status === 'Confirmed').length;
      const cancelled = bookings.filter((b) => b.status === 'Cancelled').length;
      const revenue = bookings
        .filter((b) => b.status === 'Confirmed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      setStats({
        venues: venues.length,
        reviews: reviews.length,
        catering: catering.length,
        pending,
        confirmed,
        cancelled,
        revenue,
      });
    } catch (err) {
      // Leave the last-known stats on screen if the refresh fails.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const scrollBottom = Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.xl;

  return (
    <ScreenContainer backgroundColor="#FAFAFC" statusBarStyle="dark">
      <ScrollView
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: scrollBottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <Text style={styles.appName}>EVENT SPACE</Text>
            <Text style={styles.screenTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} accessibilityLabel="Log out">
            <Ionicons name="log-out-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.financialCard}>
          <View style={styles.financialHeaderRow}>
            <Ionicons name="wallet-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.financialTitle}>FINANCIAL SUMMARY</Text>
          </View>

          <Text style={styles.financialSubLabel}>Total Revenue</Text>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueAmount}>LKR {stats.revenue.toLocaleString()}</Text>
            <View style={styles.chipPositive}>
              <Ionicons name="trending-up" size={12} color={theme.colors.success} />
              <Text style={styles.chipPositiveText}>PROFIT</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.financialBottomRow}>
            <View style={styles.bottomCol}>
              <Text style={styles.bottomLabel}>Confirmed Bookings</Text>
              <Text style={styles.bottomValue}>{stats.confirmed}</Text>
            </View>
            <View style={styles.bottomCol}>
              <Text style={styles.bottomLabel}>Pending Bookings</Text>
              <Text style={styles.bottomValueError}>{stats.pending}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickActionCard
            icon="add-circle-outline"
            label="Add Venue"
            onPress={() => navigation.navigate('AddVenue')}
            color={theme.colors.primary}
            widthStyle={{ width: quickCardWidth }}
          />
          <QuickActionCard
            icon="calendar-outline"
            label="Bookings"
            onPress={() => navigation.navigate('Bookings')}
            color={theme.colors.warning}
            widthStyle={{ width: quickCardWidth }}
          />
          <QuickActionCard
            icon="restaurant-outline"
            label="Catering"
            onPress={() => navigation.navigate('Catering')}
            color={theme.colors.accent}
            widthStyle={{ width: quickCardWidth }}
          />
        </View>

        <Text style={styles.sectionHeading}>Management Center</Text>
        <View style={styles.gridWrapper}>
          <ManagementGridItem
            icon="business-outline"
            label="Venues"
            onPress={() => navigation.navigate('Venues')}
            color={theme.colors.warning}
            bgColor="rgba(243, 156, 18, 0.15)"
            widthStyle={{ width: gridCellWidth }}
          />
          <ManagementGridItem
            icon="reader-outline"
            label="Bookings"
            onPress={() => navigation.navigate('Bookings')}
            color="#0984e3"
            bgColor="rgba(9, 132, 227, 0.15)"
            widthStyle={{ width: gridCellWidth }}
          />
          <ManagementGridItem
            icon="star-outline"
            label="Reviews"
            onPress={() => navigation.navigate('Reviews')}
            color={theme.colors.danger}
            bgColor="rgba(214, 48, 49, 0.15)"
            widthStyle={{ width: gridCellWidth }}
          />
          <ManagementGridItem
            icon="fast-food-outline"
            label="Catering"
            onPress={() => navigation.navigate('Catering')}
            color={theme.colors.primary}
            bgColor="rgba(108, 92, 231, 0.15)"
            widthStyle={{ width: gridCellWidth }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollInner: {
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerTitles: { flex: 1, minWidth: 0 },
  appName: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  logoutBtn: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  financialCard: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 32,
    ...theme.shadow.card,
    elevation: 3,
  },
  financialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1,
    marginLeft: 8,
  },
  financialSubLabel: {
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 6,
    fontWeight: '500',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  revenueAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
    flexShrink: 1,
  },
  chipPositive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
  },
  chipPositiveText: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  financialBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  bottomCol: { flex: 1, minWidth: 120 },
  bottomLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  bottomValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  bottomValueError: {
    color: theme.colors.danger,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: QUICK_GAP,
    flexWrap: 'wrap',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minWidth: 96,
  },
  quickActionIcon: { marginBottom: 12 },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: GRID_GAP,
    marginBottom: theme.spacing.lg,
  },
  gridItemContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
