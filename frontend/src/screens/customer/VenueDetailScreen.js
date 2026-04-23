import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import theme from '../../theme';
import { fetchVenue } from '../../api/venueService';
import { formatVenueOpenHours, formatVenueTypes } from '../../utils/venueFormat';
import { fetchCatering } from '../../api/cateringService';
import { fetchVenueReviews } from '../../api/reviewService';
import CateringDetailModal from './CateringDetailModal';
import ScreenContainer from '../../components/ScreenContainer';

const GALLERY_HEIGHT = 260;

const StarDisplay = ({ rating, size = 13 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= rating ? 'star' : s - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color={s <= rating || s - 0.5 <= rating ? '#F59E0B' : theme.colors.border}
        style={styles.starIcon}
      />
    ))}
  </View>
);

export default function VenueDetailScreen({ route, navigation }) {
  const { venueId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const [galleryWidth, setGalleryWidth] = useState(windowWidth);
  const [venue, setVenue] = useState(null);
  const [caterings, setCaterings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedCatering, setSelectedCatering] = useState(null);
  const [isCateringModalVisible, setCateringModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);

  const cateringCardWidth = useMemo(() => {
    const w = Math.min(windowWidth - theme.spacing.lg * 2, 420);
    return Math.max(160, w * 0.52);
  }, [windowWidth]);

  const scrollBottomPad = useMemo(() => {
    const footerEstimate = 100 + theme.spacing.md;
    return footerEstimate + theme.spacing.lg;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [venueData, cateringData, reviewsData] = await Promise.all([
          fetchVenue(venueId),
          fetchCatering({ venueId }),
          fetchVenueReviews(venueId).catch(() => []),
        ]);
        setVenue(venueData);
        setCaterings(cateringData || []);
        setReviews(reviewsData || []);
      } catch (err) {
        setLoadError(err.message || 'Failed to load venue details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [venueId]);

  useEffect(() => {
    setGalleryWidth(windowWidth);
  }, [windowWidth]);

  if (loading) {
    return (
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!venue) {
    return (
      <ScreenContainer edges={['left', 'right', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError || 'Venue not found.'}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const avgReview =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']} backgroundColor={theme.colors.background}>
      <View style={styles.layout}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollInner, { paddingBottom: scrollBottomPad }]}
        >
          <View
            style={styles.galleryWrap}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setGalleryWidth(w);
            }}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
              onMomentumScrollEnd={(e) => {
                const w = Math.max(galleryWidth, 1);
                const idx = Math.round(e.nativeEvent.contentOffset.x / w);
                setGalleryIndex(idx);
              }}
            >
              {venue.photos?.length ? (
                venue.photos.map((p, i) => (
                  <Image
                    key={i}
                    source={{ uri: p.url }}
                    style={[styles.cover, { width: Math.max(galleryWidth, 1) }]}
                  />
                ))
              ) : (
                <View style={[styles.cover, styles.placeholder, { width: Math.max(galleryWidth, 1) }]}>
                  <Text style={styles.placeholderLabel}>No Photos</Text>
                </View>
              )}
            </ScrollView>
            {venue.photos?.length > 1 && (
              <View style={styles.dotsRow} pointerEvents="none">
                {venue.photos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === galleryIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.name}>{venue.name}</Text>
              <Text style={styles.meta}>
                {formatVenueTypes(venue)} • {venue.location?.city}
                {venue.location?.state ? `, ${venue.location.state}` : ''}
              </Text>
            </View>
            <View style={styles.ratingSummary}>
              {reviews.length > 0 ? (
                <>
                  <StarDisplay rating={avgReview} size={15} />
                  <Text style={styles.ratingSummaryText}>
                    {avgReview.toFixed(1)}{' '}
                    <Text style={styles.ratingMuted}>({reviews.length})</Text>
                  </Text>
                </>
              ) : (
                <>
                  <StarDisplay rating={0} size={15} />
                  <Text style={styles.noReviewsLabel}>No reviews</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{venue.capacity}</Text>
              <Text style={styles.statLabel}>Capacity</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>LKR {Number(venue.pricePerDay).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Full day</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {Number(venue.pricePerHalfDay) > 0
                  ? `LKR ${Number(venue.pricePerHalfDay).toLocaleString()}`
                  : '—'}
              </Text>
              <Text style={styles.statLabel}>Half day</Text>
            </View>
          </View>

          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={18} color={theme.colors.primary} style={styles.hoursIcon} />
            <Text style={styles.hoursText}>{formatVenueOpenHours(venue)}</Text>
          </View>
          {venue.amenities?.length > 0 ? (
            <Text style={styles.amenityCount}>{venue.amenities.length} amenities</Text>
          ) : null}

          <Text style={styles.section}>About</Text>
          <Text style={styles.body1}>{venue.description || 'No description provided.'}</Text>

          {venue.amenities?.length > 0 && (
            <>
              <Text style={styles.section}>Amenities</Text>
              <View style={styles.amenityWrap}>
                {venue.amenities.map((a, i) => (
                  <View key={i} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.section}>Location</Text>
          <Text style={styles.body1}>
            {venue.location?.address}, {venue.location?.city}
            {venue.location?.state ? `, ${venue.location.state}` : ''}
          </Text>

          {caterings.length > 0 && (
            <>
              <Text style={styles.section}>Available Catering Options</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cateringScrollContent}
                style={styles.cateringScroll}
              >
                {caterings.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[styles.cateringCard, { width: cateringCardWidth }]}
                    onPress={() => {
                      setSelectedCatering(cat);
                      setCateringModalVisible(true);
                    }}
                    activeOpacity={0.92}
                  >
                    {cat.images && cat.images.length > 0 ? (
                      <Image source={{ uri: cat.images[0].url }} style={styles.cateringImage} />
                    ) : (
                      <View style={[styles.cateringImage, styles.placeholder]}>
                        <Text style={styles.cateringPlaceholderText}>No Photo</Text>
                      </View>
                    )}
                    <View style={styles.cateringBody}>
                      <Text style={styles.cateringName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <Text style={styles.cateringMeta}>{cat.mealType}</Text>
                      <Text style={styles.cateringPrice}>LKR {cat.pricePerPerson}/person</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.section}>Reviews</Text>
          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={theme.colors.border} />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map((rev) => (
              <View key={rev._id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthor}>
                    <Text style={styles.reviewerName}>{rev.user?.name || 'Anonymous'}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(rev.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <StarDisplay rating={rev.rating} size={14} />
                </View>
                <Text style={styles.reviewText}>{rev.comment}</Text>
              </View>
            ))
          )}
        </View>
        </ScrollView>

      <CateringDetailModal
        visible={isCateringModalVisible}
        onClose={() => setCateringModalVisible(false)}
        catering={selectedCatering}
      />

      <View style={styles.footer}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.footerPrice}>LKR {Number(venue.pricePerDay).toLocaleString()}</Text>
          <Text style={styles.footerLabel}>full day</Text>
          {Number(venue.pricePerHalfDay) > 0 ? (
            <Text style={styles.footerSub}>
              LKR {Number(venue.pricePerHalfDay).toLocaleString()} half day
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => navigation.navigate('Booking', { venue })}
          activeOpacity={0.9}
        >
          <Text style={styles.bookText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  errorText: { color: theme.colors.danger, textAlign: 'center' },
  scrollInner: { flexGrow: 1 },
  galleryWrap: { width: '100%', position: 'relative' },
  gallery: { height: GALLERY_HEIGHT, width: '100%' },
  cover: { height: GALLERY_HEIGHT },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  placeholder: {
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLabel: { color: theme.colors.muted },
  body: { padding: theme.spacing.lg },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  titleCol: { flex: 1, minWidth: 0 },
  name: { ...theme.typography.h1, color: theme.colors.text },
  meta: { color: theme.colors.muted, marginTop: 4 },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '100%',
  },
  ratingSummaryText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  ratingMuted: { fontWeight: '400', color: theme.colors.muted },
  noReviewsLabel: { fontSize: 13, color: theme.colors.muted, marginLeft: 6 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  stat: { flex: 1, minWidth: '28%', alignItems: 'center' },
  statValue: { ...theme.typography.h2, color: theme.colors.primary, fontSize: 15, textAlign: 'center' },
  statLabel: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2, textAlign: 'center' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md },
  hoursIcon: { marginRight: 6 },
  hoursText: { ...theme.typography.body, color: theme.colors.text, fontWeight: '600', flex: 1 },
  amenityCount: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 4 },
  section: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  body1: { color: theme.colors.text, lineHeight: 22 },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  amenityText: { color: theme.colors.primary, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    flexShrink: 0,
  },
  footerPriceCol: { flex: 1, minWidth: 0, marginRight: theme.spacing.sm },
  footerPrice: { ...theme.typography.h2, color: theme.colors.primary, flexShrink: 1 },
  footerLabel: { ...theme.typography.caption, color: theme.colors.muted },
  footerSub: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  bookBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
  },
  bookText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cateringScroll: {
    marginTop: theme.spacing.sm,
  },
  cateringScrollContent: {
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  cateringCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    overflow: 'hidden',
  },
  cateringImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  cateringPlaceholderText: { color: theme.colors.muted, fontSize: 10 },
  cateringBody: {
    padding: theme.spacing.sm,
  },
  cateringName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  cateringMeta: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  cateringPrice: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 6,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  noReviewsText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 6,
  },
  reviewItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: theme.spacing.sm,
  },
  reviewAuthor: { flex: 1, minWidth: 0 },
  reviewerName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 14,
  },
  reviewDate: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 1,
  },
  reviewText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  starIcon: { marginRight: 1 },
});
