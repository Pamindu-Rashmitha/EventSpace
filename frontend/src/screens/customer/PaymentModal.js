import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import TextInput from '../../components/ThemedTextInput';


const formatCardNumber = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const detectCardBrand = (num) => {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return { brand: 'VISA', color: '#1A1F71' };
  if (/^5[1-5]/.test(n)) return { brand: 'Mastercard', color: '#EB001B' };
  if (/^3[47]/.test(n)) return { brand: 'AMEX', color: '#006FCF' };
  return { brand: '', color: theme.colors.muted };
};

const ONLY_DIGITS = /^\d+$/;

function validatePayment(form) {
  const errors = {};

  const cardDigits = form.cardNumber.replace(/\s/g, '');
  if (!cardDigits) {
    errors.cardNumber = 'Card number is required.';
  } else if (cardDigits.length < 15 || cardDigits.length > 16) {
    errors.cardNumber = 'Card number must be 15–16 digits.';
  } else if (!ONLY_DIGITS.test(cardDigits)) {
    errors.cardNumber = 'Card number must contain only digits.';
  }

  if (!form.cardHolder.trim()) {
    errors.cardHolder = 'Cardholder name is required.';
  } else if (form.cardHolder.trim().length < 3) {
    errors.cardHolder = 'Enter full name as on card.';
  }

  const expDigits = form.expiryDate.replace(/\D/g, '');
  if (!expDigits) {
    errors.expiryDate = 'Expiry date is required.';
  } else if (expDigits.length < 4) {
    errors.expiryDate = 'Use MM/YY format.';
  } else {
    const mm = Number(expDigits.slice(0, 2));
    if (mm < 1 || mm > 12) errors.expiryDate = 'Invalid month.';
  }

  if (!form.cvv.trim()) {
    errors.cvv = 'CVV is required.';
  } else if (form.cvv.length < 3 || form.cvv.length > 4) {
    errors.cvv = 'CVV must be 3–4 digits.';
  }

  return errors;
}

const FieldError = ({ message }) => {
  if (!message) return null;
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={13} color={theme.colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
};


function ProcessingOverlay({ message }) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.overlayCenter}>
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Ionicons name="sync-outline" size={56} color={theme.colors.primary} />
      </Animated.View>
      <Animated.Text style={[styles.processingText, { opacity: glow }]}>
        {message || 'Processing payment…'}
      </Animated.Text>
      <Text style={styles.processingHint}>Please do not close this screen</Text>
    </View>
  );
}


function SuccessView({ transactionId, amount, onDone }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.overlayCenter}>
      <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
        <Ionicons name="checkmark-sharp" size={48} color="#fff" />
      </Animated.View>
      <Text style={styles.successTitle}>Payment Successful!</Text>
      <Text style={styles.successAmount}>LKR {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      {transactionId ? (
        <View style={styles.txnBox}>
          <Text style={styles.txnLabel}>Transaction ID</Text>
          <Text style={styles.txnId}>{transactionId}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.8}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}


export default function PaymentModal({ visible, onClose, onPaymentComplete, amount, bookingId }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [apiError, setApiError] = useState('');

  // Animate in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 350,
      easing: visible ? Easing.out(Easing.back(1.1)) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const clearFieldError = (key) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const reset = () => {
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setErrors({});
    setProcessing(false);
    setPaymentSuccess(false);
    setTransactionId('');
    setApiError('');
  };

  const handleClose = () => {
    if (processing) return;
    reset();
    onClose();
  };

  const handlePay = async () => {
    const validationErrors = validatePayment({
      cardNumber,
      cardHolder,
      expiryDate,
      cvv,
    });
    setErrors(validationErrors);
    setApiError('');
    if (Object.keys(validationErrors).length) return;

    setProcessing(true);
    try {
      const paymentData = {
        paymentMethod: 'card',
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolder,
        expiryDate,
        cvv,
      };
      const result = await onPaymentComplete(bookingId, paymentData);
      setTransactionId(result?.transactionId || '');
      setPaymentSuccess(true);
    } catch (err) {
      setApiError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDone = () => {
    reset();
    onClose('success');
  };

  const { brand, color: brandColor } = detectCardBrand(cardNumber);
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const backdrop = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, theme.spacing.sm) },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <Text style={styles.sheetTitle}>Payment</Text>
              {!processing && !paymentSuccess && (
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ─── States ─── */}
          {processing ? (
            <ProcessingOverlay />
          ) : paymentSuccess ? (
            <SuccessView transactionId={transactionId} amount={amount} onDone={handleDone} />
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Amount */}
              <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>Total Amount</Text>
                <Text style={styles.amountValue}>
                  LKR {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* API error */}
              {apiError ? (
                <View style={styles.apiErrorBanner}>
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.apiErrorText}>{apiError}</Text>
                </View>
              ) : null}

              {/* Card details */}
              <Text style={styles.fieldLabel}>Card Number</Text>
              <View style={[styles.cardInputRow, errors.cardNumber && styles.inputError]}>
                <Ionicons name="card" size={20} color={brand ? brandColor : theme.colors.border} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="numeric"
                  maxLength={19}
                  value={cardNumber}
                  onChangeText={(v) => {
                    setCardNumber(formatCardNumber(v));
                    clearFieldError('cardNumber');
                  }}
                />
                {brand ? <Text style={[styles.brandBadge, { color: brandColor }]}>{brand}</Text> : null}
              </View>
              <FieldError message={errors.cardNumber} />

              {/* Cardholder */}
              <Text style={styles.fieldLabel}>Cardholder Name</Text>
              <View style={[styles.inputWrap, errors.cardHolder && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={theme.colors.muted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Priya Mendis"
                  placeholderTextColor={theme.colors.placeholder}
                  autoCapitalize="words"
                  value={cardHolder}
                  onChangeText={(v) => {
                    setCardHolder(v);
                    clearFieldError('cardHolder');
                  }}
                />
              </View>
              <FieldError message={errors.cardHolder} />

              {/* Expiry + CVV */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Expiry Date</Text>
                  <View style={[styles.inputWrap, errors.expiryDate && styles.inputError]}>
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.muted} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="MM/YY"
                      placeholderTextColor={theme.colors.placeholder}
                      keyboardType="numeric"
                      maxLength={5}
                      value={expiryDate}
                      onChangeText={(v) => {
                        setExpiryDate(formatExpiry(v));
                        clearFieldError('expiryDate');
                      }}
                    />
                  </View>
                  <FieldError message={errors.expiryDate} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>CVV</Text>
                  <View style={[styles.inputWrap, errors.cvv && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="123"
                      placeholderTextColor={theme.colors.placeholder}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      value={cvv}
                      onChangeText={(v) => {
                        setCvv(v.replace(/\D/g, ''));
                        clearFieldError('cvv');
                      }}
                    />
                  </View>
                  <FieldError message={errors.cvv} />
                </View>
              </View>

              {/* Security note */}
              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark" size={16} color={theme.colors.accent} />
                <Text style={styles.securityText}>
                  Secured Payment Gateway
                </Text>
              </View>

              {/* Pay button */}
              <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85}>
                <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.payBtnText}>
                  Pay LKR {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: 420,
    ...theme.shadow.card,
    shadowOpacity: 0.18,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 4,
  },
  sheetTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },

  amountCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    color: '#E4D9FF',
    fontSize: 13,
    fontWeight: '500',
  },
  amountValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },

  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  apiErrorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },



  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginBottom: 4,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  brandBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingHorizontal: 4,
  },
  securityText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },

  payBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadow.card,
    shadowColor: theme.colors.success,
    shadowOpacity: 0.35,
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },

  overlayCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: theme.spacing.lg,
  },
  processingText: {
    marginTop: theme.spacing.lg,
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  processingHint: {
    marginTop: theme.spacing.sm,
    ...theme.typography.caption,
    color: theme.colors.muted,
  },

  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
    shadowColor: theme.colors.success,
    shadowOpacity: 0.4,
  },
  successTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 4,
  },
  txnBox: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  txnLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txnId: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  doneBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: theme.radius.pill,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
