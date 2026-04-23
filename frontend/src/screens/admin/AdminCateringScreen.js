import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import theme from '../../theme';
import {
  fetchCatering,
  createCatering,
  updateCatering,
  deleteCatering,
  removeCateringPhoto,
} from '../../api/cateringService';
import { fetchVenues } from '../../api/venueService';
import ScreenContainer from '../../components/ScreenContainer';

const MAX_IMAGES = 5;

const emptyForm = {
  name: '',
  description: '',
  cuisine: '',
  mealType: 'Buffet',
  pricePerPerson: '',
  minServings: '',
  menuItems: '',
  venues: [],
};

const ONLY_DIGITS = /^\d+$/;

function validateCateringForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Package name is required.';
  } else if (form.name.trim().length < 3) {
    errors.name = 'Package name must be at least 3 characters.';
  } else if (form.name.trim().length > 80) {
    errors.name = 'Package name cannot exceed 80 characters.';
  }

  if (form.cuisine.trim() && form.cuisine.trim().length < 2) {
    errors.cuisine = 'Cuisine name is too short.';
  } else if (form.cuisine.trim() && ONLY_DIGITS.test(form.cuisine.trim())) {
    errors.cuisine = 'Cuisine cannot be only numbers.';
  }

  if (form.description.trim() && form.description.trim().length < 10) {
    errors.description = 'Description should be at least 10 characters if provided.';
  }

  const MAX_PRICE_LKR = 500_000;

  if (!form.pricePerPerson.trim()) {
    errors.pricePerPerson = 'Price per person is required.';
  } else {
    const price = Number(form.pricePerPerson);
    if (isNaN(price) || price < 0) {
      errors.pricePerPerson = 'Price cannot be negative.';
    } else if (price > MAX_PRICE_LKR) {
      errors.pricePerPerson = 'Price cannot exceed LKR 500,000.';
    } else if (price === 0) {
      errors.pricePerPerson = 'Price per person must be greater than zero.';
    }
  }

  if (form.minServings.trim()) {
    if (!ONLY_DIGITS.test(form.minServings.trim())) {
      errors.minServings = 'Min servings must be a whole number.';
    } else {
      const min = Number(form.minServings);
      if (min < 1) {
        errors.minServings = 'Min servings must be at least 1.';
      } else if (min > 10000) {
        errors.minServings = 'Min servings seems too high (max 10,000).';
      }
    }
  }

  return errors;
}

const FieldError = ({ message }) => {
  if (!message) return null;
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={14} color={theme.colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};

export default function AdminCateringScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [availableVenues, setAvailableVenues] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [localExistingImages, setLocalExistingImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const [cateringData, venueData] = await Promise.all([
        fetchCatering(),
        fetchVenues(),
      ]);
      setItems(cateringData);
      setAvailableVenues(venueData || []);
    } catch (err) {
      setApiError(err.message || 'Failed to load data.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImages([]);
    setLocalExistingImages([]);
    setErrors({});
    setApiError('');
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      cuisine: item.cuisine || '',
      mealType: item.mealType,
      pricePerPerson: String(item.pricePerPerson),
      minServings: String(item.minServings || ''),
      menuItems: (item.menuItems || []).join(', '),
      venues: (item.venues || []).map(v => typeof v === 'object' ? v._id : v),
    });
    setImages([]);
    setLocalExistingImages(item.images || []);
    setErrors({});
    setApiError('');
    setModalVisible(true);
  };

  const updateField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const toggleVenue = (venueId) => {
    setForm((f) => {
      const current = f.venues || [];
      if (current.includes(venueId)) {
        return { ...f, venues: current.filter((id) => id !== venueId) };
      }
      return { ...f, venues: [...current, venueId] };
    });
  };

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      return setApiError(`You can add up to ${MAX_IMAGES} images.`);
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName,
        mimeType: a.mimeType,
      }));
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDeleteExistingPhoto = async (photoId) => {
    try {
      await removeCateringPhoto(editing._id, photoId);
      setLocalExistingImages((prev) => prev.filter((p) => p._id !== photoId));
      
      // Update the main items list so the card preview reflects the change immediately
      setItems((list) => list.map((item) => {
        if (item._id === editing._id) {
          return { ...item, images: item.images.filter(p => p._id !== photoId) };
        }
        return item;
      }));
    } catch (err) {
      setApiError(err.message || 'Failed to remove photo.');
    }
  };

  const save = async () => {
    const validationErrors = validateCateringForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        cuisine: form.cuisine.trim(),
        pricePerPerson: Number(form.pricePerPerson),
        minServings: Number(form.minServings || 10),
      };
      if (editing) {
        const updated = await updateCatering(editing._id, payload, images);
        setItems((list) => list.map((i) => (i._id === updated._id ? updated : i)));
      } else {
        const created = await createCatering(payload, images);
        setItems((list) => [created, ...list]);
      }
      setModalVisible(false);
    } catch (err) {
      setApiError(err.message || 'Failed to save catering package.');
    }
  };

  const onDelete = (item) => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCatering(item._id);
            setItems((list) => list.filter((i) => i._id !== item._id));
          } catch (err) {
            setApiError(err.message || 'Failed to delete catering package.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const thumb = item.images && item.images.length > 0 ? item.images[0] : null;
    return (
      <View style={styles.card}>
        {/* Cover image */}
        {thumb?.url ? (
          <Image source={{ uri: thumb.url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Ionicons name="restaurant-outline" size={40} color={theme.colors.border} />
            <Text style={{ color: theme.colors.border, fontSize: 12, marginTop: 4 }}>No Photo</Text>
          </View>
        )}

        {/* Gradient overlay with badge */}
        <View style={styles.coverOverlay}>
          <View style={styles.typeBadge}>
            <Ionicons name="restaurant-outline" size={12} color="#fff" />
            <Text style={styles.typeBadgeText}>{item.mealType || 'Buffet'}</Text>
          </View>
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="pizza-outline" size={14} color={theme.colors.muted} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.cuisine ? `${item.cuisine} Cuisine` : 'General Catering'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="location-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.statText}>
                {item.venues?.length || 0} Venues linked
              </Text>
            </View>
            {item.minServings ? (
              <View style={styles.statChip}>
                <Ionicons name="people-outline" size={13} color={theme.colors.accent} />
                <Text style={styles.statText}>Min. {item.minServings}</Text>
              </View>
            ) : null}
            {item.images?.length > 1 && (
              <View style={styles.statChip}>
                <Ionicons name="images-outline" size={13} color={theme.colors.warning} />
                <Text style={styles.statText}>{item.images.length} photos</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomRow}>
            <View>
              <Text style={styles.price}>LKR {Number(item.pricePerPerson).toLocaleString()}</Text>
              <Text style={styles.priceLabel}>per person</Text>
            </View>
            <View style={styles.iconActions}>
              <TouchableOpacity
                style={[styles.iconBtn, styles.editBtn]}
                onPress={() => openEdit(item)}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.deleteActionBtn]}
                onPress={() => onDelete(item)}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 100 + theme.spacing.md },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={apiError && !modalVisible ? (
          <View style={styles.errorBanner}>
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.bannerText}>{apiError}</Text>
          </View>
        ) : null}
        ListEmptyComponent={<Text style={styles.empty}>No catering packages yet.</Text>}
      />
      <TouchableOpacity
        style={[styles.fab, { bottom: theme.spacing.lg }]}
        onPress={openCreate}
        activeOpacity={0.92}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[
              styles.modalScroll,
              {
                paddingTop: Math.max(insets.top, theme.spacing.lg) + theme.spacing.md,
                paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.xl,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.modalTitle}>
            {editing ? 'Edit Package' : 'New Catering Package'}
          </Text>

          {apiError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.bannerText}>{apiError}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Package name *"
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
          />
          <FieldError message={errors.name} />

          <TextInput
            style={[styles.input, errors.cuisine && styles.inputError]}
            placeholder="Cuisine (e.g. Italian)"
            value={form.cuisine}
            onChangeText={(v) => updateField('cuisine', v)}
          />
          <FieldError message={errors.cuisine} />

          <View style={styles.chipsRow}>
            {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Buffet', 'Cocktail'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, form.mealType === c && styles.chipActive]}
                onPress={() => updateField('mealType', c)}
              >
                <Text
                  style={[styles.chipText, form.mealType === c && styles.chipTextActive]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { height: 80 }, errors.description && styles.inputError]}
            placeholder="Description"
            multiline
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
          />
          <FieldError message={errors.description} />

          <TextInput
            style={styles.input}
            placeholder="Menu items (comma separated)"
            value={form.menuItems}
            onChangeText={(v) => updateField('menuItems', v)}
          />

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <TextInput
                style={[styles.input, errors.pricePerPerson && styles.inputError]}
                placeholder="Price / person *"
                keyboardType="numeric"
                value={form.pricePerPerson}
                onChangeText={(v) => updateField('pricePerPerson', v)}
              />
              <FieldError message={errors.pricePerPerson} />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <TextInput
                style={[styles.input, errors.minServings && styles.inputError]}
                placeholder="Min servings"
                keyboardType="numeric"
                value={form.minServings}
                onChangeText={(v) => updateField('minServings', v)}
              />
              <FieldError message={errors.minServings} />
            </View>
          </View>

          {availableVenues.length > 0 && (
            <>
              <Text style={styles.imageLabel}>Applicable Venues</Text>
              <View style={styles.chipsRow}>
                {availableVenues.map((v) => {
                  const isActive = form.venues.includes(v._id);
                  return (
                    <TouchableOpacity
                      key={v._id}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => toggleVenue(v._id)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {v.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Images section */}
          <Text style={styles.imageLabel}>
            Photos ({images.length}/{MAX_IMAGES})
          </Text>

          {/* Show existing images when editing and no new images picked */}
          {editing && images.length === 0 && localExistingImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {localExistingImages.map((img, i) => (
                <View key={`existing-${img._id || i}`} style={styles.imageWrapper}>
                  <Image source={{ uri: img.url }} style={styles.preview} />
                  <Text style={styles.existingBadge}>Current</Text>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => onDeleteExistingPhoto(img._id)}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Show newly picked images */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {images.map((img, i) => (
                <View key={`new-${i}`} style={styles.imageWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.preview} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.uploadBtn, images.length >= MAX_IMAGES && { opacity: 0.4 }]}
            onPress={pickImages}
            disabled={images.length >= MAX_IMAGES}
          >
            <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.uploadText}>
              {images.length > 0 ? ' Add More Photos' : ' Pick Photos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submit} onPress={save}>
            <Text style={styles.submitText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { flex: 1 },
  listContent: {
    padding: theme.spacing.md,
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
  cover: { width: '100%', height: 170 },
  placeholderCover: {
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
    height: 170,
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
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  cardBody: { padding: theme.spacing.md },
  name: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { ...theme.typography.caption, color: theme.colors.muted, marginLeft: 4, flex: 1 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 },
  statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.pill },
  statText: { fontSize: 11, color: theme.colors.text, fontWeight: '600', marginLeft: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
  price: { ...theme.typography.h3, color: theme.colors.primary, fontWeight: '800' },
  priceLabel: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 1 },
  iconActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  editBtn: { backgroundColor: '#EDE9FE' },
  deleteActionBtn: { backgroundColor: '#FDE8E8' },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: 60 },
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalScroll: {
    paddingHorizontal: theme.spacing.lg,
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
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
  modalTitle: { ...theme.typography.h1, marginBottom: theme.spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 4,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text },
  chipTextActive: { color: '#fff' },
  imageLabel: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  imageRow: {
    marginBottom: theme.spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.sm,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  existingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  uploadText: { color: theme.colors.primary, fontWeight: '600' },
  submit: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancel: {
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
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
