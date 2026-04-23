import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

const GALLERY_HEIGHT = 220;

export default function CateringDetailModal({ visible, onClose, catering }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (visible) setGalleryIndex(0);
  }, [visible, catering?._id]);

  if (!catering) return null;

  const bottomPad = Math.max(insets.bottom, theme.spacing.md) + theme.spacing.lg;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.gallery}
                onMomentumScrollEnd={(e) => {
                  const w = Math.max(width, 1);
                  const idx = Math.round(e.nativeEvent.contentOffset.x / w);
                  setGalleryIndex(idx);
                }}
              >
                {catering.images && catering.images.length > 0 ? (
                  catering.images.map((img, i) => (
                    <Image key={i} source={{ uri: img.url }} style={[styles.cover, { width }]} />
                  ))
                ) : (
                  <View style={[styles.cover, styles.placeholder, { width }]}>
                    <Text style={styles.placeholderText}>No Photo Available</Text>
                  </View>
                )}
              </ScrollView>
              {catering.images && catering.images.length > 1 && (
                <View style={styles.dotsRow} pointerEvents="none">
                  {catering.images.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === galleryIndex && styles.dotActive]}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.closeBtn, { top: Math.max(insets.top, theme.spacing.md) }]}
                onPress={onClose}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={32} color={theme.colors.surface} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.title}>{catering.name}</Text>
              <Text style={styles.meta}>
                {catering.mealType}
                {catering.cuisine ? ` • ${catering.cuisine}` : ''}
              </Text>

              <View style={styles.row}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>LKR {Number(catering.pricePerPerson).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Per Person</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{catering.minServings}</Text>
                  <Text style={styles.statLabel}>Min. Servings</Text>
                </View>
              </View>

              {catering.description ? (
                <>
                  <Text style={styles.section}>Description</Text>
                  <Text style={styles.body1}>{catering.description}</Text>
                </>
              ) : null}

              {catering.menuItems && catering.menuItems.length > 0 && (
                <>
                  <Text style={styles.section}>Menu Items</Text>
                  <View style={styles.menuListContainer}>
                    {catering.menuItems.map((item, i) => (
                      <View
                        key={i}
                        style={[styles.menuListItem, i !== catering.menuItems.length - 1 && styles.menuListBorder]}
                      >
                        <Text style={styles.menuItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.9}>
                <Text style={styles.doneText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
  },
  gallery: { height: GALLERY_HEIGHT },
  cover: {
    height: GALLERY_HEIGHT,
  },
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
  placeholderText: { color: theme.colors.muted },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  body: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  meta: {
    color: theme.colors.muted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    gap: theme.spacing.sm,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  body1: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  menuListContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuListItem: {
    paddingVertical: 14,
  },
  menuListBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  menuItemText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  doneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
