import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../../theme';
import ScreenContainer from '../../components/ScreenContainer';
import { fetchVenues, deleteVenue } from '../../api/venueService';
import { formatVenueTypes } from '../../utils/venueFormat';

const CARD_MARGIN = theme.spacing.md;

export default function AdminVenuesScreen({ navigation }) {
  const [venues, setVenues] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setApiError('');
      const data = await fetchVenues();
      setVenues(data);
    } catch (err) {
      setApiError(err.message || 'Failed to load venues.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = (venue) => {
    Alert.alert('Delete venue', `Delete "${venue.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVenue(venue._id);
            setVenues((list) => list.filter((v) => v._id !== venue._id));
          } catch (err) {
            setApiError(err.message || 'Failed to delete venue.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('AddVenue', { venue: item })}
    >
      {/* Cover image */}
      {item.photos?.[0]?.url ? (
        <Image source={{ uri: item.photos[0].url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Ionicons name="image-outline" size={40} color={theme.colors.border} />
          <Text style={styles.placeholderText}>No Photo</Text>
        </View>
      )}

      {/* Gradient overlay with venue type badge */}
      <View style={styles.coverOverlay}>
        <View style={styles.typeBadge}>
          <Ionicons name="business-outline" size={12} color="#fff" />
          <Text style={styles.typeBadgeText} numberOfLines={2}>
            {formatVenueTypes(item)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardBody, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location?.city}{item.location?.state ? `, ${item.location.state}` : ''}
            </Text>
          </View>

          <View style={[styles.statsRow, { marginBottom: 0 }]}>
            <View style={styles.statChip}>
              <Ionicons name="people-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statText}>{item.capacity}</Text>
            </View>
            {item.amenities?.length > 0 && (
              <View style={styles.statChip}>
                <Ionicons name="checkmark-circle-outline" size={13} color={theme.colors.accent} />
                <Text style={styles.statText}>{item.amenities.length}</Text>
              </View>
            )}
            {item.photos?.length > 1 && (
              <View style={styles.statChip}>
                <Ionicons name="images-outline" size={13} color={theme.colors.warning} />
                <Text style={styles.statText}>{item.photos.length}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.price}>LKR {Number(item.pricePerDay).toLocaleString()}</Text>
              <Text style={[styles.priceLabel, { marginLeft: 4 }]}>/ day</Text>
            </View>
            {Number(item.pricePerHalfDay) > 0 ? (
              <Text style={styles.halfPrice}>Half LKR {Number(item.pricePerHalfDay).toLocaleString()}</Text>
            ) : null}
          </View>

          <View style={styles.iconActions}>
            <TouchableOpacity
              style={[styles.iconBtn, styles.editBtn]}
              onPress={() => navigation.navigate('AddVenue', { venue: item })}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.deleteBtn]}
              onPress={() => onDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={venues}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 100 + theme.spacing.md },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={apiError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.bannerText}>{apiError}</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={50} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>No venues yet</Text>
            <Text style={styles.emptyText}>Tap + to add your first venue</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { bottom: theme.spacing.lg }]}
        onPress={() => navigation.navigate('AddVenue')}
        activeOpacity={0.92}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { flex: 1 },
  listContent: {
    padding: CARD_MARGIN,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadow.card,
    elevation: 4,
  },
  cover: {
    width: '100%',
    height: 170,
  },
  placeholder: {
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.border,
    fontSize: 12,
    marginTop: 4,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: theme.spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  cardBody: {
    padding: theme.spacing.md,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginLeft: 4,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  statText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  price: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  priceLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 1,
  },
  halfPrice: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
    textAlign: 'right',
  },
  iconActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#EDE9FE',
  },
  deleteBtn: {
    backgroundColor: '#FDE8E8',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
    elevation: 6,
  },
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
