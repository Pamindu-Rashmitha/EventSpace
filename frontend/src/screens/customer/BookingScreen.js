import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import theme from '../../theme';
import { fetchCatering } from '../../api/cateringService';
import { checkAvailability, createBooking, processPayment } from '../../api/bookingService';
import PaymentModal from './PaymentModal';
import { formatVenueOpenHours, formatVenueAddress, venueMapsSearchUrl } from '../../utils/venueFormat';
import { getEventTypeChipsForVenue } from '../../constants/eventTypeOptions';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';
import { useHeaderHeight } from '@react-navigation/elements';

const oneDayMs = 24 * 60 * 60 * 1000;
const ONLY_DIGITS = /^\d+$/;

function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validateBooking(form, venue, catering, selectedCatering) {
  const errors = {};

  if (form.endDate < form.startDate) {
    errors.dates = 'End date must be on or after the start date.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (form.startDate < today) {
    errors.dates = 'Start date cannot be in the past.';
  }

  if (!form.guestCount.trim()) {
    errors.guestCount = 'Guest count is required.';
  } else if (!ONLY_DIGITS.test(form.guestCount.trim())) {
    errors.guestCount = 'Guest count must be a whole number.';
  } else {
    const count = Number(form.guestCount);
    if (count < 1) {
      errors.guestCount = 'Guest count must be at least 1.';
    } else if (count > venue.capacity) {
      errors.guestCount = `Exceeds venue capacity of ${venue.capacity}.`;
    }
  }

  if (!form.selectedEventType) {
    errors.eventType = 'Please select an event type.';
  } else if (form.selectedEventType === 'Other') {
    const other = (form.otherEventType || '').trim();
    if (!other) {
      errors.eventType = 'Please describe your event.';
    } else if (other.length < 3) {
      errors.eventType = 'Description must be at least 3 characters.';
    }
  }

  if (form.bookingType === 'half_day' && (!venue.pricePerHalfDay || Number(venue.pricePerHalfDay) <= 0)) {
    errors.bookingType = 'Half-day booking is not available for this venue.';
  }

  if (form.selectedCatering) {
    for (const [id, servings] of Object.entries(form.selectedCatering)) {
      if (servings && servings !== '') {
        if (!ONLY_DIGITS.test(servings) || Number(servings) < 0) {
          errors.catering = 'Servings must be positive whole numbers.';
          break;
        }
        const pkg = catering.find((c) => c._id === id);
        if (pkg && Number(servings) > 0 && Number(servings) < pkg.minServings) {
          errors.catering = `${pkg.name} requires at least ${pkg.minServings} servings.`;
          break;
        }
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

export default function BookingScreen({ route, navigation }) {
  const { venue } = route.params;
  const headerHeight = useHeaderHeight();
  const [bookingType, setBookingType] = useState('full_day');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [guestCount, setGuestCount] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [otherEventType, setOtherEventType] = useState('');
  const [notes, setNotes] = useState('');

  const [catering, setCatering] = useState([]);
  const [selectedCatering, setSelectedCatering] = useState({});

  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPayment, setShowPayment] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ct = await fetchCatering({ venueId: venue._id });
        setCatering(ct);
      } catch (err) {
        /* optional catering */
      }
    })();
  }, [venue]);

  const eventTypeChips = useMemo(() => getEventTypeChipsForVenue(venue), [venue]);

  const numberOfDays = useMemo(() => {
    const [y0, m0, d0] = toLocalYMD(startDate).split('-').map(Number);
    const [y1, m1, d1] = toLocalYMD(endDate).split('-').map(Number);
    const t0 = new Date(y0, m0 - 1, d0);
    const t1 = new Date(y1, m1 - 1, d1);
    return Math.max(1, Math.round((t1 - t0) / oneDayMs) + 1);
  }, [startDate, endDate]);

  const totalEstimate = useMemo(() => {
    const isHalf = bookingType === 'half_day';
    const dayRate = isHalf ? Number(venue.pricePerHalfDay) || 0 : Number(venue.pricePerDay) || 0;
    let total = dayRate * numberOfDays;
    catering.forEach((c) => {
      const servings = Number(selectedCatering[c._id] || 0);
      if (servings > 0) total += c.pricePerPerson * servings;
    });
    return Math.round(total * 100) / 100;
  }, [venue, numberOfDays, bookingType, catering, selectedCatering]);

  const clearFieldError = (key) => {
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const effectiveEventType = useMemo(() => {
    if (selectedEventType === 'Other') return otherEventType.trim();
    return selectedEventType.trim();
  }, [selectedEventType, otherEventType]);

  const verifyAvailability = async () => {
    if (endDate < startDate) {
      setErrors((e) => ({ ...e, dates: 'End date must be after start date.' }));
      return;
    }
    clearFieldError('dates');
    setApiError('');
    try {
      setChecking(true);
      const res = await checkAvailability({
        venueId: venue._id,
        startDate: toLocalYMD(startDate),
        endDate: toLocalYMD(endDate),
      });
      setAvailability(res.available);
    } catch (err) {
      setApiError(err.message || 'Could not check availability.');
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    const validationErrors = validateBooking(
      {
        startDate,
        endDate,
        guestCount,
        selectedEventType,
        otherEventType,
        selectedCatering,
        bookingType,
      },
      venue,
      catering,
      selectedCatering
    );
    setErrors(validationErrors);
    setApiError('');
    setSuccessMsg('');
    if (Object.keys(validationErrors).length) return;

    try {
      setSubmitting(true);
      const payload = {
        venue: venue._id,
        startDate: toLocalYMD(startDate),
        endDate: toLocalYMD(endDate),
        guestCount: Number(guestCount),
        eventType: effectiveEventType,
        notes: notes.trim(),
        bookingType,
        catering: Object.entries(selectedCatering)
          .filter(([, servings]) => Number(servings) > 0)
          .map(([pkg, servings]) => ({ package: pkg, servings: Number(servings) })),
      };
      const booking = await createBooking(payload);
      setCreatedBookingId(booking._id);
      setShowPayment(true);
    } catch (err) {
      setApiError(err.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentComplete = async (bookingId, paymentData) => {
    const result = await processPayment(bookingId, paymentData);
    return result;
  };

  const handlePaymentClose = (reason) => {
    setShowPayment(false);
    if (reason === 'success') {
      setSuccessMsg('Payment received! Your booking is pending admin approval.');
      setTimeout(() => navigation.navigate('CustomerTabs'), 1500);
    } else if (createdBookingId) {
      setSuccessMsg('Booking created! Pay from My Bookings to proceed with admin approval.');
      setTimeout(() => navigation.navigate('CustomerTabs'), 2000);
    }
  };

  const fmt = (d) => d.toDateString();

  const bottomPad = theme.spacing.xl + theme.spacing.md;

  return (
    <ScreenContainer>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
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
        <Text style={styles.venueName}>{venue.name}</Text>
        <Text style={styles.venueMeta}>
          Capacity {venue.capacity} • {formatVenueOpenHours(venue)}
        </Text>
        <Text style={styles.venueMeta}>
          LKR {Number(venue.pricePerDay || 0).toLocaleString()}/day •{' '}
          {Number(venue.pricePerHalfDay) > 0
            ? `LKR ${Number(venue.pricePerHalfDay).toLocaleString()}/half day`
            : 'Half-day rate not set'}
        </Text>
        {formatVenueAddress(venue.location) ? (
          <Text style={styles.venueMeta}>{formatVenueAddress(venue.location)}</Text>
        ) : null}
        {venueMapsSearchUrl(venue.location) ? (
          <TouchableOpacity
            style={styles.mapsLinkRow}
            onPress={() => Linking.openURL(venueMapsSearchUrl(venue.location))}
            accessibilityRole="link"
            accessibilityLabel="Open location in maps"
          >
            <Ionicons name="map-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.mapsLinkText}>Open in maps</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.section}>Booking type</Text>
        <View style={styles.typeRow}>
          {[
            { id: 'full_day', label: 'Full day' },
            { id: 'half_day', label: 'Half day' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.typeChip, bookingType === opt.id && styles.typeChipActive]}
              onPress={() => {
                setBookingType(opt.id);
                setAvailability(null);
                if (errors.bookingType) setErrors((e) => ({ ...e, bookingType: undefined }));
              }}
              disabled={opt.id === 'half_day' && (!venue.pricePerHalfDay || Number(venue.pricePerHalfDay) <= 0)}
            >
              <Text style={[styles.typeChipText, bookingType === opt.id && styles.typeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FieldError message={errors.bookingType} />
        <Text style={styles.hintText}>
          Venue hire is per calendar day. Full day uses the full-day rate; half day uses the half-day rate (same
          day-based availability).
        </Text>

        <Text style={styles.section}>Dates</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateBox, errors.dates && styles.inputError]}
            onPress={() => setShowStart(true)}
          >
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={styles.dateValue}>{fmt(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateBox, errors.dates && styles.inputError]}
            onPress={() => setShowEnd(true)}
          >
            <Text style={styles.dateLabel}>End</Text>
            <Text style={styles.dateValue}>{fmt(endDate)}</Text>
          </TouchableOpacity>
        </View>
        <FieldError message={errors.dates} />
        {showStart && (
          <DateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowStart(Platform.OS === 'ios');
              if (d) {
                setStartDate(d);
                if (endDate < d) setEndDate(d);
                setAvailability(null);
                clearFieldError('dates');
              }
            }}
          />
        )}
        {showEnd && (
          <DateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={(e, d) => {
              setShowEnd(Platform.OS === 'ios');
              if (d) {
                setEndDate(d);
                setAvailability(null);
                clearFieldError('dates');
              }
            }}
          />
        )}

        <TouchableOpacity style={styles.availBtn} onPress={verifyAvailability} disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.availText}>Check Availability</Text>
          )}
        </TouchableOpacity>
        {availability !== null && (
          <Text
            style={[
              styles.availResult,
              { color: availability ? theme.colors.success : theme.colors.danger },
            ]}
          >
            {availability ? 'Available for your dates' : 'Already booked on these dates'}
          </Text>
        )}

        <Text style={styles.section}>Event details</Text>
        <Text style={styles.subLabel}>Guest Count</Text>
        <TextInput
          style={[styles.input, errors.guestCount && styles.inputError]}
          keyboardType="numeric"
          value={guestCount}
          onChangeText={(v) => {
            setGuestCount(v);
            clearFieldError('guestCount');
          }}
        />
        <FieldError message={errors.guestCount} />
        <Text></Text>

        <Text style={styles.subLabel}>Event type</Text>
        <View style={[styles.typeRow, errors.eventType && styles.eventTypeGroupError]}>
          {eventTypeChips.map((label) => (
            <TouchableOpacity
              key={label}
              style={[styles.typeChip, selectedEventType === label && styles.typeChipActive]}
              onPress={() => {
                setSelectedEventType(label);
                if (label !== 'Other') setOtherEventType('');
                clearFieldError('eventType');
              }}
            >
              <Text style={[styles.typeChipText, selectedEventType === label && styles.typeChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedEventType === 'Other' ? (
          <TextInput
            style={[styles.input, errors.eventType && styles.inputError, styles.eventOtherInput]}
            placeholder="Describe your event"
            value={otherEventType}
            onChangeText={(v) => {
              setOtherEventType(v);
              clearFieldError('eventType');
            }}
          />
        ) : null}
        <FieldError message={errors.eventType} />
        <Text></Text>
        <Text style={styles.subLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          multiline
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        {catering.length > 0 && (
          <>
            <Text style={styles.section}>Add catering</Text>
            <FieldError message={errors.catering} />
            {catering.map((c) => (
              <View key={c._id} style={styles.addonRow}>
                <View style={styles.addonTextCol}>
                  <Text style={styles.addonName}>{c.name}</Text>
                  <Text style={styles.addonMeta}>
                    {c.mealType} • LKR {c.pricePerPerson}/person (min {c.minServings})
                  </Text>
                </View>
                <TextInput
                  style={[styles.qty, errors.catering && styles.inputError]}
                  keyboardType="numeric"
                  placeholder="0"
                  value={String(selectedCatering[c._id] || '')}
                  onChangeText={(v) => {
                    setSelectedCatering((s) => ({ ...s, [c._id]: v }));
                    clearFieldError('catering');
                  }}
                />
              </View>
            ))}
          </>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Estimated total</Text>
          <Text style={styles.totalValue}>LKR {totalEstimate.toFixed(2)}</Text>
          <Text style={styles.totalMeta}>
            {numberOfDays} day{numberOfDays > 1 ? 's' : ''} • {bookingType === 'half_day' ? 'Half day' : 'Full day'}{' '}
            rate
          </Text>
        </View>

        <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" style={styles.submitIcon} />
              <Text style={styles.submitText}>Proceed to Payment</Text>
            </>
          )}
        </TouchableOpacity>

        <PaymentModal
          visible={showPayment}
          onClose={handlePaymentClose}
          onPaymentComplete={handlePaymentComplete}
          amount={totalEstimate}
          bookingId={createdBookingId}
        />
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, flexGrow: 1 },
  venueName: { ...theme.typography.h1, color: theme.colors.text },
  venueMeta: { color: theme.colors.muted, marginTop: 4 },
  mapsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  mapsLinkText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  typeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeChipText: { color: theme.colors.text, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  subLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  eventTypeGroupError: { padding: 2, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.danger },
  eventOtherInput: { marginTop: theme.spacing.sm },
  hintText: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 4, lineHeight: 18 },
  section: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateLabel: { ...theme.typography.caption, color: theme.colors.muted },
  dateValue: { ...theme.typography.body, color: theme.colors.text, marginTop: 4, fontWeight: '600' },
  availBtn: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    padding: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  availText: { color: '#fff', fontWeight: '700' },
  availResult: { textAlign: 'center', marginTop: theme.spacing.sm, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
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
    flexShrink: 1,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  addonTextCol: { flex: 1, minWidth: 0 },
  addonName: { ...theme.typography.h3, color: theme.colors.text },
  addonMeta: { ...theme.typography.caption, color: theme.colors.muted, marginTop: 2 },
  qty: {
    width: '22%',
    minWidth: 72,
    maxWidth: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  totalBox: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  totalLabel: { color: '#E4D9FF' },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  totalMeta: { color: '#E4D9FF', marginTop: 4, textAlign: 'center' },
  submit: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    gap: 8,
  },
  submitIcon: { marginRight: 0 },
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
    flexShrink: 1,
  },
});
