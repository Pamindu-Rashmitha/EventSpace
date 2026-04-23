import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../../theme';
import ScreenContainer from '../../components/ScreenContainer';
import { bookingTypeLabel } from '../../utils/venueFormat';
import {
  fetchAllBookings,
  updateBookingStatus,
  deleteBooking,
} from '../../api/bookingService';

const statusColor = {
  Pending: theme.colors.warning,
  Confirmed: theme.colors.success,
  Cancelled: theme.colors.danger,
};

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchAllBookings();
      setBookings(data);
    } catch (err) {
      setApiError(err.message || 'Failed to load bookings.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onChangeStatus = async (booking, status) => {
    try {
      const updated = await updateBookingStatus(booking._id, status);
      setBookings((list) =>
        list.map((b) => (b._id === booking._id ? { ...b, status: updated.status } : b))
      );
    } catch (err) {
      setApiError(err.message || 'Failed to update status.');
    }
  };

  const onDelete = (booking) => {
    Alert.alert('Delete booking', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBooking(booking._id);
            setBookings((list) => list.filter((b) => b._id !== booking._id));
          } catch (err) {
            setApiError(err.message || 'Failed to delete booking.');
          }
        },
      },
    ]);
  };

  const filtered = filter === 'All' ? bookings : bookings.filter((b) => b.status === filter);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.venue}>{item.venue?.name || 'Venue'}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor[item.status] }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {item.user?.name} • {item.user?.email}
      </Text>
      <Text style={styles.meta}>
        {new Date(item.startDate).toDateString()} → {new Date(item.endDate).toDateString()}
      </Text>
      <Text style={styles.meta}>{bookingTypeLabel(item.bookingType)}</Text>
      <Text style={styles.meta}>Guests: {item.guestCount}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>LKR {item.totalPrice?.toFixed(2)}</Text>
        <View style={[
          styles.payBadge,
          { backgroundColor: item.paymentStatus === 'Paid' ? theme.colors.success + '20' : theme.colors.warning + '20' }
        ]}>
          <Ionicons
            name={item.paymentStatus === 'Paid' ? 'checkmark-circle' : 'time-outline'}
            size={13}
            color={item.paymentStatus === 'Paid' ? theme.colors.success : theme.colors.warning}
          />
          <Text style={[
            styles.payBadgeText,
            { color: item.paymentStatus === 'Paid' ? theme.colors.success : theme.colors.warning }
          ]}>
            {item.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {item.status === 'Pending' && item.paymentStatus === 'Paid' && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.success }]}
            onPress={() => onChangeStatus(item, 'Confirmed')}
          >
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.warning }]}
            onPress={() => onChangeStatus(item, 'Cancelled')}
          >
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.danger }]}
            onPress={() => onDelete(item)}
          >
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const listPadBottom = theme.spacing.lg + theme.spacing.md;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
    <View style={styles.inner}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
        keyboardShouldPersistTaps="handled"
      >
        {['All', 'Pending', 'Confirmed', 'Cancelled'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filter, filter === s && styles.filterActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listPadBottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={apiError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.bannerText}>{apiError}</Text>
          </View>
        ) : null}
        ListEmptyComponent={<Text style={styles.empty}>No bookings found.</Text>}
      />
    </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, backgroundColor: theme.colors.background },
  list: { flex: 1 },
  listContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  filterScroll: {
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
  },
  filter: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { color: theme.colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  venue: { ...theme.typography.h3, color: theme.colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  price: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.spacing.sm },
  btn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginRight: 6,
    marginTop: 6,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: 60 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
});
