import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import theme from '../../theme';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';
import { createVenue, updateVenue, removeVenuePhoto } from '../../api/venueService';
import { timeStringToDate, dateToTimeString } from '../../utils/venueFormat';

const ONLY_DIGITS = /^\d+$/;
const VENUE_TYPE_OPTIONS = ['Event Hall', 'Meeting Room', 'Conference Room', 'Banquet Hall', 'Outdoor'];

function validateVenueForm(form, ctx = {}) {
  const { newPhotoCount = 0, existingPhotoCount = 0 } = ctx;
  const errors = {};
  const nameTrim = form.name.trim();

  if (!nameTrim) {
    errors.name = 'Venue name is required.';
  } else if (nameTrim.length < 3) {
    errors.name = 'Venue name must be at least 3 characters.';
  } else if (nameTrim.length > 100) {
    errors.name = 'Venue name cannot exceed 100 characters.';
  } else if (ONLY_DIGITS.test(nameTrim)) {
    errors.name = 'Venue name cannot consist only of numbers.';
  }

  if (form.description.trim() && form.description.trim().length < 10) {
    errors.description = 'Description should be at least 10 characters if provided.';
  }

  if (!form.capacity.trim()) {
    errors.capacity = 'Capacity is required.';
  } else if (!ONLY_DIGITS.test(form.capacity.trim())) {
    errors.capacity = 'Capacity must be a whole number.';
  } else {
    const cap = Number(form.capacity);
    if (cap < 1) {
      errors.capacity = 'Capacity must be at least 1.';
    } else if (cap > 100000) {
      errors.capacity = 'Capacity seems too large (max 100,000).';
    }
  }

  const MAX_VENUE_PRICE = 500_000;

  if (!form.pricePerDay.trim()) {
    errors.pricePerDay = 'Price per day is required.';
  } else {
    const price = Number(form.pricePerDay);
    if (isNaN(price) || price < 0) {
      errors.pricePerDay = 'Price cannot be negative.';
    } else if (price > MAX_VENUE_PRICE) {
      errors.pricePerDay = 'Price cannot exceed LKR 500,000.';
    } else if (price === 0) {
      errors.pricePerDay = 'Price per day must be greater than zero.';
    }
  }

  if (!form.pricePerHalfDay.trim()) {
    errors.pricePerHalfDay = 'Price per half day is required.';
  } else {
    const hp = Number(form.pricePerHalfDay);
    if (isNaN(hp) || hp < 0) {
      errors.pricePerHalfDay = 'Price cannot be negative.';
    } else if (hp > MAX_VENUE_PRICE) {
      errors.pricePerHalfDay = 'Price cannot exceed LKR 500,000.';
    } else if (hp === 0) {
      errors.pricePerHalfDay = 'Price per half day must be greater than zero.';
    }
  }

  if (form.openTime && form.closeTime) {
    const o = form.openTime.getHours() * 60 + form.openTime.getMinutes();
    const c = form.closeTime.getHours() * 60 + form.closeTime.getMinutes();
    if (c <= o) {
      errors.hours = 'Close time must be after open time.';
    }
  }

  const addrTrim = form.address.trim();
  if (!addrTrim) {
    errors.address = 'Address is required.';
  } else if (addrTrim.length < 5) {
    errors.address = 'Please enter a complete address.';
  } else if (ONLY_DIGITS.test(addrTrim)) {
    errors.address = 'Address cannot consist only of numbers.';
  }

  if (!form.city.trim()) {
    errors.city = 'City is required.';
  } else if (form.city.trim().length < 2) {
    errors.city = 'City name is too short.';
  } else if (ONLY_DIGITS.test(form.city.trim())) {
    errors.city = 'City name cannot be only numbers.';
  }

  if (form.state.trim() && ONLY_DIGITS.test(form.state.trim())) {
    errors.state = 'State name cannot be only numbers.';
  }

  if (!form.types || !Array.isArray(form.types) || form.types.length < 1) {
    errors.types = 'Select at least one venue type.';
  }

  const amenityParts = String(form.amenities || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!amenityParts.length) {
    errors.amenities = 'At least one amenity is required.';
  }

  if (newPhotoCount + existingPhotoCount < 1) {
    errors.photos = 'At least one photo is required.';
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

export default function AddVenueScreen({ navigation, route }) {
  const existingVenue = route.params?.venue || null;
  const isEditing = !!existingVenue;

  const [form, setForm] = useState({
    name: existingVenue?.name || '',
    description: existingVenue?.description || '',
    types:
      Array.isArray(existingVenue?.types) && existingVenue.types.length > 0
        ? [...existingVenue.types]
        : existingVenue?.type
          ? [existingVenue.type]
          : ['Event Hall'],
    capacity: existingVenue?.capacity ? String(existingVenue.capacity) : '',
    pricePerDay: existingVenue?.pricePerDay ? String(existingVenue.pricePerDay) : '',
    pricePerHalfDay: existingVenue?.pricePerHalfDay != null && existingVenue?.pricePerHalfDay !== '' ? String(existingVenue.pricePerHalfDay) : '',
    openTime: timeStringToDate(existingVenue?.openTime),
    closeTime: timeStringToDate(existingVenue?.closeTime || '18:00'),
    address: existingVenue?.location?.address || '',
    city: existingVenue?.location?.city || '',
    state: existingVenue?.location?.state || '',
    amenities: existingVenue?.amenities ? existingVenue.amenities.join(', ') : '',
  });
  const [showOpenTime, setShowOpenTime] = useState(false);
  const [showCloseTime, setShowCloseTime] = useState(false);
  const [localExistingPhotos, setLocalExistingPhotos] = useState(existingVenue?.photos || []);
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('Permission needed', 'Please grant photo library access.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const picked = result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName,
        mimeType: a.mimeType,
      }));
      setPhotos((p) => [...p, ...picked]);
      setErrors((e) => (e.photos ? { ...e, photos: undefined } : e));
    }
  };

  const onDeleteExistingPhoto = async (photoId) => {
    try {
      setSubmitting(true);
      await removeVenuePhoto(existingVenue._id, photoId);
      setLocalExistingPhotos((prev) => prev.filter((p) => p._id !== photoId));
      setSuccessMsg('Photo removed successfully!');
    } catch (err) {
      setApiError(err.message || 'Failed to remove photo.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteNewPhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleType = (t) => {
    setForm((f) => {
      const has = f.types.includes(t);
      if (has && f.types.length <= 1) {
        return f;
      }
      const next = has ? f.types.filter((x) => x !== t) : [...f.types, t];
      return { ...f, types: next };
    });
    if (errors.types) {
      setErrors((e) => ({ ...e, types: undefined }));
    }
  };

  const onSubmit = async () => {
    const validationErrors = validateVenueForm(form, {
      newPhotoCount: photos.length,
      existingPhotoCount: localExistingPhotos.length,
    });
    setErrors(validationErrors);
    setApiError('');
    setSuccessMsg('');
    if (Object.keys(validationErrors).length) return;

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        types: form.types,
        capacity: Number(form.capacity),
        pricePerDay: Number(form.pricePerDay),
        pricePerHalfDay: Number(form.pricePerHalfDay),
        openTime: dateToTimeString(form.openTime),
        closeTime: dateToTimeString(form.closeTime),
        location: {
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
        },
        amenities: form.amenities,
      };
      if (isEditing) {
        await updateVenue(existingVenue._id, payload, photos);
        setSuccessMsg('Venue updated successfully!');
      } else {
        await createVenue(payload, photos);
        setSuccessMsg('Venue created successfully!');
      }
      setTimeout(() => navigation.goBack(), 1200);
    } catch (err) {
      setApiError(err.message || `Failed to ${isEditing ? 'update' : 'create'} venue.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{
        padding: theme.spacing.lg,
        paddingBottom: 100 + theme.spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {successMsg ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.bannerText}>{successMsg}</Text>
        </View>
      ) : null}
      {apiError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="close-circle" size={16} color="#fff" />
          <Text style={styles.bannerText}>{apiError}</Text>
        </View>
      ) : null}
      <Text style={styles.label}>Venue name *</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={form.name}
        onChangeText={(v) => update('name', v)}
        placeholder="e.g. Grand Ballroom"
      />
      <FieldError message={errors.name} />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, { height: 90 }, errors.description && styles.inputError]}
        multiline
        value={form.description}
        onChangeText={(v) => update('description', v)}
        placeholder="Describe the venue..."
      />
      <FieldError message={errors.description} />

      <Text style={styles.label}>Types (select all that apply) *</Text>
      <View style={styles.chipsRow}>
        {VENUE_TYPE_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, form.types.includes(t) && styles.chipActive]}
            onPress={() => toggleType(t)}
          >
            <Text style={[styles.chipText, form.types.includes(t) && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FieldError message={errors.types} />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.label}>Capacity *</Text>
          <TextInput
            style={[styles.input, errors.capacity && styles.inputError]}
            keyboardType="numeric"
            value={form.capacity}
            onChangeText={(v) => update('capacity', v)}
            placeholder="e.g. 200"
          />
          <FieldError message={errors.capacity} />
        </View>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.label}>Price / day *</Text>
          <TextInput
            style={[styles.input, errors.pricePerDay && styles.inputError]}
            keyboardType="numeric"
            value={form.pricePerDay}
            onChangeText={(v) => update('pricePerDay', v)}
            placeholder="e.g. 5000"
          />
          <FieldError message={errors.pricePerDay} />
        </View>
      </View>

      <Text style={styles.label}>Price / half day *</Text>
      <TextInput
        style={[styles.input, errors.pricePerHalfDay && styles.inputError]}
        keyboardType="numeric"
        value={form.pricePerHalfDay}
        onChangeText={(v) => update('pricePerHalfDay', v)}
        placeholder="e.g. 3000"
      />
      <FieldError message={errors.pricePerHalfDay} />

      <Text style={styles.label}>Open & close (venue hours) *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.timeBox, { marginRight: 6 }, errors.hours && styles.inputError]}
          onPress={() => setShowOpenTime(true)}
        >
          <Text style={styles.timeLabel}>Opens</Text>
          <Text style={styles.timeValue}>{dateToTimeString(form.openTime)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeBox, { marginLeft: 6 }, errors.hours && styles.inputError]}
          onPress={() => setShowCloseTime(true)}
        >
          <Text style={styles.timeLabel}>Closes</Text>
          <Text style={styles.timeValue}>{dateToTimeString(form.closeTime)}</Text>
        </TouchableOpacity>
      </View>
      <FieldError message={errors.hours} />
      {showOpenTime && (
        <DateTimePicker
          value={form.openTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            setShowOpenTime(Platform.OS === 'ios');
            if (d) {
              setForm((f) => ({ ...f, openTime: d }));
              if (errors.hours) setErrors((e) => ({ ...e, hours: undefined }));
            }
          }}
        />
      )}
      {showCloseTime && (
        <DateTimePicker
          value={form.closeTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            setShowCloseTime(Platform.OS === 'ios');
            if (d) {
              setForm((f) => ({ ...f, closeTime: d }));
              if (errors.hours) setErrors((e) => ({ ...e, hours: undefined }));
            }
          }}
        />
      )}

      <Text style={styles.label}>Address *</Text>
      <TextInput
        style={[styles.input, errors.address && styles.inputError]}
        value={form.address}
        onChangeText={(v) => update('address', v)}
        placeholder="e.g. 123 Main Street"
      />
      <FieldError message={errors.address} />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            value={form.city}
            onChangeText={(v) => update('city', v)}
            placeholder="e.g. Colombo"
          />
          <FieldError message={errors.city} />
        </View>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text style={styles.label}>Province</Text>
          <TextInput
            style={[styles.input, errors.state && styles.inputError]}
            value={form.state}
            onChangeText={(v) => update('state', v)}
            placeholder="e.g. Western Province"
          />
          <FieldError message={errors.state} />
        </View>
      </View>

      <Text style={styles.label}>Amenities (comma separated) *</Text>
      <TextInput
        style={[styles.input, errors.amenities && styles.inputError]}
        placeholder="WiFi, Parking, AC"
        value={form.amenities}
        onChangeText={(v) => update('amenities', v)}
      />
      <FieldError message={errors.amenities} />

      <Text style={styles.label}>Photos *</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, errors.photos && styles.uploadBtnError]}
        onPress={pickImages}
      >
        <Text style={styles.uploadText}>Pick Photos</Text>
      </TouchableOpacity>
      <FieldError message={errors.photos} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: theme.spacing.sm }}>
        {isEditing && localExistingPhotos.map((p) => (
          <View key={p._id || Math.random().toString()} style={styles.imageWrapper}>
            <Image source={{ uri: p.url }} style={styles.preview} />
            <Text style={styles.existingBadge}>Current</Text>
            <TouchableOpacity style={styles.removeBtn} onPress={() => onDeleteExistingPhoto(p._id)}>
              <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.map((p, i) => (
          <View key={`new-${i}`} style={styles.imageWrapper}>
             <Image source={{ uri: p.uri }} style={styles.preview} />
             <TouchableOpacity style={styles.removeBtn} onPress={() => onDeleteNewPhoto(i)}>
               <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
             </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submit} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isEditing ? 'Update Venue' : 'Create Venue'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  label: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: 6,
    marginTop: theme.spacing.sm,
  },
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
  row: { flexDirection: 'row' },
  timeBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeLabel: { ...theme.typography.caption, color: theme.colors.muted },
  timeValue: { ...theme.typography.body, color: theme.colors.text, marginTop: 4, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
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
  uploadBtn: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  uploadText: { color: theme.colors.primary, fontWeight: '600' },
  uploadBtnError: {
    borderColor: theme.colors.danger,
  },
  preview: {
    width: 90,
    height: 90,
    borderRadius: theme.radius.sm,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginTop: 6,
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
  submit: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
