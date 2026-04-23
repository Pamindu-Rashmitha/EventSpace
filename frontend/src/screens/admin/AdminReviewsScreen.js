import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../../theme';
import ScreenContainer from '../../components/ScreenContainer';
import { fetchAllReviews, adminDeleteReview } from '../../api/reviewService';

const StarDisplay = ({ rating, size = 14 }) => (
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

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setApiError('');
      const data = await fetchAllReviews();
      setReviews(data);
    } catch (err) {
      setApiError(err.message || 'Failed to load reviews.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = (review) => {
    Alert.alert(
      'Remove Review',
      `Remove this review by ${review.user?.name || 'user'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteReview(review._id);
              setReviews((list) => list.filter((r) => r._id !== review._id));
            } catch (err) {
              setApiError(err.message || 'Failed to delete review.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.user?.name || 'Anonymous'}</Text>
          <Text style={styles.userEmail}>{item.user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="business-outline" size={13} color={theme.colors.muted} />
        <Text style={styles.venueName}>{item.venue?.name || 'Unknown Venue'}</Text>
      </View>

      <View style={styles.ratingRow}>
        <StarDisplay rating={item.rating} size={16} />
        <Text style={styles.ratingText}>{item.rating}/5</Text>
      </View>

      <Text style={styles.comment}>{item.comment}</Text>

      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </View>
  );

  const listPadBottom = theme.spacing.lg + theme.spacing.md;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <FlatList
        style={styles.list}
        data={reviews}
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
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.border} />
            <Text style={styles.empty}>No reviews yet.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  starIcon: { marginRight: 1 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  userEmail: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.danger + '12',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueName: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginLeft: 4,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
    marginLeft: 6,
  },
  comment: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
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
