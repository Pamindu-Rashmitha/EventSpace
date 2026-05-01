import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import theme from '../../theme';
import { bookingTypeLabel } from '../../utils/venueFormat';
import { fetchMyBookings, cancelBooking, processPayment } from '../../api/bookingService';
import { fetchMyReviews, createReview, updateReview, deleteReview } from '../../api/reviewService';
import PaymentModal from './PaymentModal';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';

const statusColor = {
  Pending: theme.colors.warning,
  Confirmed: theme.colors.success,
  Cancelled: theme.colors.danger,
};

const StarPicker = ({ rating, onChange, size = 32 }) => (
  <View style={styles.starPickerRow}>
    {[1, 2, 3, 4, 5].map((s) => (
      <TouchableOpacity key={s} onPress={() => onChange(s)} style={styles.starPickerHit}>
        <Ionicons
          name={s <= rating ? 'star' : 'star-outline'}
          size={size}
          color={s <= rating ? '#F59E0B' : theme.colors.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const StarDisplay = ({ rating, size = 13 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= rating ? 'star' : 'star-outline'}
        size={size}
        color={s <= rating ? '#F59E0B' : theme.colors.border}
        style={styles.starIcon}
      />
    ))}
  </View>
);

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [payBooking, setPayBooking] = useState(null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [bookingsData, reviewsData] = await Promise.all([
        fetchMyBookings(),
        fetchMyReviews().catch(() => []),
      ]);
      setBookings(bookingsData);
      setReviews(reviewsData);
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

  const getReviewForBooking = (bookingId) =>
    reviews.find((r) => r.booking === bookingId || r.booking?._id === bookingId);

  const onCancel = (booking) => {
    Alert.alert('Cancel booking?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await cancelBooking(booking._id);
            setBookings((list) =>
              list.map((b) => (b._id === booking._id ? { ...b, status: updated.status } : b))
            );
          } catch (err) {
            setApiError(err.message || 'Failed to cancel booking.');
          }
        },
      },
    ]);
  };

  const onPayNow = (booking) => {
    setPayBooking(booking);
    setShowPayment(true);
  };

  const handlePaymentComplete = async (bookingId, paymentData) => {
    const result = await processPayment(bookingId, paymentData);
    return result;
  };

  const handlePaymentClose = (reason) => {
    setShowPayment(false);
    if (reason === 'success') {
      load();
    }
    setPayBooking(null);
  };

  const openWriteReview = (booking) => {
    setReviewBooking(booking);
    setEditingReview(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewErrors({});
    setReviewModalVisible(true);
  };

  const openEditReview = (booking, review) => {
    setReviewBooking(booking);
    setEditingReview(review);
    setReviewRating(review.rating);
    setReviewComment(review.comment);
    setReviewErrors({});
    setReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setReviewBooking(null);
    setEditingReview(null);
  };

  const validateReview = () => {
    const errors = {};
    if (!reviewRating || reviewRating < 1) errors.rating = 'Please select a rating.';
    if (!reviewComment.trim()) {
      errors.comment = 'Please write a comment.';
    } else if (reviewComment.trim().length < 10) {
      errors.comment = 'Comment must be at least 10 characters.';
    } else if (reviewComment.trim().length > 500) {
      errors.comment = 'Comment cannot exceed 500 characters.';
    } else if (/^\d+$/.test(reviewComment.trim().replace(/\s/g, ''))) {
      errors.comment = 'Comment cannot consist of numbers only.';
    }
    return errors;
  };

  const submitReview = async () => {
    const errors = validateReview();
    setReviewErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setReviewLoading(true);
      if (editingReview) {
        const updated = await updateReview(editingReview._id, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        setReviews((list) => list.map((r) => (r._id === updated._id ? updated : r)));
      } else {
        const created = await createReview({
          bookingId: reviewBooking._id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
        setReviews((list) => [created, ...list]);
      }
      closeReviewModal();
    } catch (err) {
      setReviewErrors({ api: err.response?.data?.message || err.message || 'Failed to save review.' });
    } finally {
      setReviewLoading(false);
    }
  };

  const onDeleteReview = (review) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(review._id);
            setReviews((list) => list.filter((r) => r._id !== review._id));
          } catch (err) {
            setApiError(err.message || 'Failed to delete review.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const review = getReviewForBooking(item._id);
    const canReview = item.status === 'Confirmed';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.venue} numberOfLines={2}>
            {item.venue?.name || 'Venue'}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor[item.status] }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {new Date(item.startDate).toDateString()} → {new Date(item.endDate).toDateString()}
        </Text>
        <Text style={styles.meta}>{bookingTypeLabel(item.bookingType)}</Text>
        <Text style={styles.meta}>Guests: {item.guestCount}</Text>
        {item.eventType ? <Text style={styles.meta}>Event: {item.eventType}</Text> : null}
        <View style={styles.priceRow}>
          <Text style={styles.price}>LKR {item.totalPrice?.toFixed(2)}</Text>
          <View
            style={[
              styles.payBadge,
              {
                backgroundColor:
                  item.paymentStatus === 'Paid' ? theme.colors.success + '20' : theme.colors.warning + '20',
              },
            ]}
          >
            <Ionicons
              name={item.paymentStatus === 'Paid' ? 'checkmark-circle' : 'time-outline'}
              size={13}
              color={item.paymentStatus === 'Paid' ? theme.colors.success : theme.colors.warning}
            />
            <Text
              style={[
                styles.payBadgeText,
                { color: item.paymentStatus === 'Paid' ? theme.colors.success : theme.colors.warning },
              ]}
            >
              {item.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {item.status !== 'Cancelled' && item.paymentStatus !== 'Paid' && (
          <TouchableOpacity style={styles.payNowBtn} onPress={() => onPayNow(item)} activeOpacity={0.9}>
            <Ionicons name="card-outline" size={16} color="#fff" style={styles.payNowIcon} />
            <Text style={styles.payNowText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        {item.status === 'Pending' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item)} activeOpacity={0.9}>
            <Text style={styles.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {canReview && !review && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => openWriteReview(item)} activeOpacity={0.9}>
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} style={styles.reviewBtnIcon} />
            <Text style={styles.reviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        )}

        {review && (
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeader}>
              <Text style={styles.reviewTitle}>Your Review</Text>
              <View style={styles.reviewActions}>
                <TouchableOpacity style={styles.reviewAction} onPress={() => openEditReview(item, review)}>
                  <Ionicons name="pencil-outline" size={15} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.reviewAction} onPress={() => onDeleteReview(review)}>
                  <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <StarDisplay rating={review.rating} />
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        )}
      </View>
    );
  };

  const listPadBottom = tabBarHeight + theme.spacing.lg;

  return (
    <ScreenContainer>
      <FlatList
        style={styles.flex}
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listPadBottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={
          apiError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.bannerText}>{apiError}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>You have no bookings yet. Browse venues to make your first booking!</Text>
        }
      />
      <PaymentModal
        visible={showPayment}
        onClose={handlePaymentClose}
        onPaymentComplete={handlePaymentComplete}
        amount={payBooking?.totalPrice || 0}
        bookingId={payBooking?._id}
      />

      <Modal visible={reviewModalVisible} animationType="slide" transparent onRequestClose={closeReviewModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{editingReview ? 'Edit Review' : 'Write a Review'}</Text>
              <Text style={styles.modalVenue} numberOfLines={2}>
                {reviewBooking?.venue?.name}
              </Text>

              {reviewErrors.api ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.bannerText}>{reviewErrors.api}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Rating</Text>
              <StarPicker rating={reviewRating} onChange={setReviewRating} />
              {reviewErrors.rating ? (
                <View style={styles.inlineErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.colors.danger} />
                  <Text style={styles.inlineErrorText}>{reviewErrors.rating}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Comment</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.commentInput,
                  reviewErrors.comment && styles.inputError,
                ]}
                placeholder="Share your experience... (min 10 characters)"
                placeholderTextColor={theme.colors.placeholder}
                multiline
                value={reviewComment}
                onChangeText={(v) => {
                  setReviewComment(v);
                  if (reviewErrors.comment) setReviewErrors((e) => ({ ...e, comment: undefined }));
                }}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{reviewComment.length}/500</Text>
              {reviewErrors.comment ? (
                <View style={styles.inlineErrorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.colors.danger} />
                  <Text style={styles.inlineErrorText}>{reviewErrors.comment}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, reviewLoading && styles.submitDisabled]}
                onPress={submitReview}
                disabled={reviewLoading}
              >
                <Text style={styles.submitText}>
                  {reviewLoading ? 'Saving...' : editingReview ? 'Update Review' : 'Submit Review'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={closeReviewModal}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    flexGrow: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: theme.spacing.sm,
  },
  venue: { ...theme.typography.h3, color: theme.colors.text, flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill, flexShrink: 0 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  price: { ...theme.typography.h3, color: theme.colors.primary, marginTop: theme.spacing.sm, flexShrink: 1 },
  cancelBtn: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  cancelText: { color: theme.colors.danger, fontWeight: '700' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    flexShrink: 0,
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  payNowBtn: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payNowIcon: { marginRight: 0 },
  payNowText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: {
    textAlign: 'center',
    color: theme.colors.muted,
    marginTop: 80,
    paddingHorizontal: theme.spacing.lg,
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
    flexShrink: 1,
  },
  reviewBtn: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewBtnIcon: { marginRight: 0 },
  reviewBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  reviewCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: theme.spacing.sm,
  },
  reviewTitle: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  reviewActions: { flexDirection: 'row', gap: 6 },
  reviewAction: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },
  reviewComment: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: 6,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    maxHeight: '88%',
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalVenue: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  commentInput: {
    minHeight: 120,
    paddingTop: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  charCount: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  inlineErrorText: {
    color: theme.colors.danger,
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalCancel: {
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginVertical: 12,
    gap: 4,
  },
  starPickerHit: { paddingHorizontal: 4 },
  starRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  starIcon: { marginRight: 1 },
});
