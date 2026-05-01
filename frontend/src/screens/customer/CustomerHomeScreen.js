import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { fetchVenues } from '../../api/venueService';
import { fetchReviewStats } from '../../api/reviewService';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';

const VENUE_TYPES = ['Event Hall', 'Meeting Room', 'Conference Room', 'Banquet Hall', 'Outdoor'];

const buildFetchParams = (q, filters) => {
  const params = {};
  if (q.trim()) params.q = q.trim();
  if (filters.city.trim()) params.city = filters.city.trim();
  if (filters.type) params.type = filters.type;
  if (filters.minCapacity.trim() && /^\d+$/.test(filters.minCapacity.trim())) {
    params.minCapacity = filters.minCapacity.trim();
  }
  return params;
};

const hasActiveFilters = (f) => Boolean(f.city.trim() || f.type || f.minCapacity.trim());

export default function CustomerHomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [venues, setVenues] = useState([]);
  const [reviewStats, setReviewStats] = useState({});
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ city: '', type: '', minCapacity: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({ city: '', type: '', minCapacity: '' });

  const isInitialFocus = useRef(true);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = buildFetchParams(q, filters);
      const [data, stats] = await Promise.all([
        fetchVenues(params),
        fetchReviewStats().catch(() => ({})),
      ]);
      setVenues(data);
      setReviewStats(stats);
    } catch (err) {
      setApiError(err.message || 'Failed to load venues.');
    } finally {
      setRefreshing(false);
    }
  }, [q, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (isInitialFocus.current) {
        isInitialFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

  const openSearch = () => {
    setSearchDraft(q);
    setSearchOpen(true);
  };

  const applySearch = () => {
    setQ(searchDraft);
    setSearchOpen(false);
  };

  const openFilterModal = () => {
    setFilterDraft({ ...filters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...filterDraft });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFilterDraft({ city: '', type: '', minCapacity: '' });
    setFilters({ city: '', type: '', minCapacity: '' });
    setFilterOpen(false);
  };

  const filterActive = hasActiveFilters(filters);

  const listBottomPad = Math.max(insets.bottom, theme.spacing.md) + theme.spacing.xl;

  const renderItem = ({ item }) => {
    const stats = reviewStats[item._id];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VenueDetail', { venueId: item._id })}
        activeOpacity={0.92}
      >
        {item.photos?.[0]?.url ? (
          <Image source={{ uri: item.photos[0].url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleCol}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {item.location?.city} • Capacity {item.capacity}
              </Text>
            </View>
            <View style={styles.cardSideCol}>
              {stats ? (
                <StarRating avgRating={stats.avgRating} count={stats.count} />
              ) : (
                <NoReviews />
              )}
            </View>
          </View>
          <View style={styles.priceBlock}>
            <View style={styles.cardFooter}>
              <Text style={styles.price}>LKR {Number(item.pricePerDay).toLocaleString()}</Text>
              <Text style={styles.perDay}>/day</Text>
            </View>
            {Number(item.pricePerHalfDay) > 0 ? (
              <Text style={styles.halfPrice}>
                Half LKR {Number(item.pricePerHalfDay).toLocaleString()}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer
      edges={['left', 'right']}
      backgroundColor={theme.colors.background}
      statusBarStyle="light"
    >
      <View style={styles.inner}>
        <View style={[styles.hero, { paddingTop: insets.top + theme.spacing.md }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitles}>
              <Text style={styles.hello}>Hello, {user?.name?.split(' ')[0] || 'Guest'}</Text>
              <Text style={styles.heading}>Find your perfect venue</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={openSearch} accessibilityLabel="Search venues">
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.iconBtnSpaced]}
                onPress={openFilterModal}
                accessibilityLabel="Filter venues"
              >
                <Ionicons name="funnel-outline" size={22} color="#fff" />
                {filterActive ? <View style={styles.filterDot} /> : null}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Modal visible={searchOpen} animationType="fade" transparent onRequestClose={() => setSearchOpen(false)}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Search venues</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Search by name..."
                value={searchDraft}
                onChangeText={setSearchDraft}
                returnKeyType="search"
                onSubmitEditing={applySearch}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setSearchOpen(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimary} onPress={applySearch}>
                  <Ionicons name="search" size={18} color="#fff" style={styles.modalPrimaryIcon} />
                  <Text style={styles.modalPrimaryText}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
          <View style={styles.filterBackdrop}>
            <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
              <View style={styles.filterGrab} />
              <Text style={styles.filterTitle}>Filter halls</Text>
              <Text style={styles.filterLabel}>City</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Colombo"
                value={filterDraft.city}
                onChangeText={(t) => setFilterDraft((f) => ({ ...f, city: t }))}
              />
              <Text style={styles.filterLabel}>Venue type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                <TouchableOpacity
                  style={[styles.typeChip, !filterDraft.type && styles.typeChipOn]}
                  onPress={() => setFilterDraft((f) => ({ ...f, type: '' }))}
                >
                  <Text style={[styles.typeChipText, !filterDraft.type && styles.typeChipTextOn]}>Any</Text>
                </TouchableOpacity>
                {VENUE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, filterDraft.type === t && styles.typeChipOn]}
                    onPress={() => setFilterDraft((f) => ({ ...f, type: t }))}
                  >
                    <Text
                      style={[styles.typeChipText, filterDraft.type === t && styles.typeChipTextOn]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.filterLabel}>Minimum capacity</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 50"
                keyboardType="number-pad"
                value={filterDraft.minCapacity}
                onChangeText={(t) => setFilterDraft((f) => ({ ...f, minCapacity: t.replace(/\D/g, '') }))}
              />
              <View style={styles.filterFooter}>
                <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                  <Text style={styles.clearFiltersText}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <FlatList
          data={venues}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          ListHeaderComponent={
            apiError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.bannerText}>{apiError}</Text>
              </View>
            ) : q.trim() || filterActive ? (
              <View style={styles.chipsBar}>
                {q.trim() ? (
                  <View style={styles.activeChip}>
                    <Ionicons name="search" size={14} color={theme.colors.primary} />
                    <Text style={styles.activeChipText} numberOfLines={1}>
                      &ldquo;{q.trim()}&rdquo;
                    </Text>
                    <TouchableOpacity onPress={() => setQ('')} hitSlop={12}>
                      <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                {filterActive ? (
                  <TouchableOpacity style={styles.editFiltersHint} onPress={openFilterModal}>
                    <Text style={styles.editFiltersText}>Edit filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {q.trim() || filterActive
                ? 'No venues match your search or filters.'
                : 'No venues available yet.'}
            </Text>
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1 },
  hero: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  heroTitles: { flex: 1, minWidth: 0 },
  heading: { ...theme.typography.h1, color: '#fff', marginTop: 4 },
  hello: { color: '#E4D9FF' },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpaced: { marginLeft: 10 },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: theme.spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { color: theme.colors.muted, fontWeight: '600' },
  modalPrimary: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  modalPrimaryIcon: { marginRight: 6 },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
  filterBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  filterSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '88%',
  },
  filterGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  filterTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: theme.spacing.md },
  filterLabel: { ...theme.typography.caption, color: theme.colors.muted, marginBottom: 6, marginTop: 8 },
  typeScroll: { flexGrow: 0, marginBottom: 4 },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  typeChipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeChipText: { color: theme.colors.text, fontSize: 13 },
  typeChipTextOn: { color: '#fff', fontWeight: '600' },
  filterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  clearFiltersBtn: { padding: 12 },
  clearFiltersText: { color: theme.colors.danger, fontWeight: '600' },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.radius.md,
  },
  applyBtnText: { color: '#fff', fontWeight: '700' },
  listContent: { padding: theme.spacing.md, flexGrow: 1 },
  chipsBar: { marginBottom: theme.spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '18',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    maxWidth: '100%',
    flexShrink: 1,
  },
  activeChipText: { color: theme.colors.text, fontSize: 12, marginLeft: 6, flexShrink: 1 },
  editFiltersHint: { paddingVertical: 4 },
  editFiltersText: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  cover: { width: '100%', aspectRatio: 16 / 9, maxHeight: 220, minHeight: 140 },
  placeholder: {
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: theme.colors.muted },
  cardBody: { padding: theme.spacing.md, gap: theme.spacing.sm },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardTitleCol: { flex: 1, minWidth: 0 },
  cardSideCol: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '42%' },
  name: { ...theme.typography.h2, color: theme.colors.text },
  meta: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 4 },
  priceBlock: { alignItems: 'flex-end', alignSelf: 'flex-end' },
  cardFooter: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  price: { ...theme.typography.h2, color: theme.colors.primary },
  perDay: { ...theme.typography.caption, color: theme.colors.muted },
  halfPrice: { fontSize: 11, color: theme.colors.muted, marginTop: 2, textAlign: 'right' },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: 60, paddingHorizontal: theme.spacing.lg },
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
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 3,
  },
});

const StarRating = ({ avgRating, count }) => (
  <View style={styles.ratingRow}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
        size={14}
        color={s <= Math.round(avgRating) ? '#F59E0B' : theme.colors.border}
        style={{ marginRight: 1 }}
      />
    ))}
    <Text style={styles.ratingText}>{avgRating}</Text>
    <Text style={styles.reviewCount}>({count})</Text>
  </View>
);

const NoReviews = () => (
  <View style={styles.ratingRow}>
    <Ionicons name="star-outline" size={14} color={theme.colors.border} />
    <Text style={styles.reviewCount}>No reviews yet</Text>
  </View>
);
