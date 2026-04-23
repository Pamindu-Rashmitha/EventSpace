import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';

const ONLY_DIGITS = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_10_DIGITS = /^\d{10}$/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

function validateForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  } else if (ONLY_DIGITS.test(form.name.trim())) {
    errors.name = 'Name cannot contain only numbers.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_10_DIGITS.test(form.phone.trim())) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else {
    const pwErrors = [];
    if (form.password.length < 6) pwErrors.push('at least 6 characters');
    if (ONLY_DIGITS.test(form.password)) pwErrors.push('not only numbers');
    if (!HAS_UPPERCASE.test(form.password)) pwErrors.push('an uppercase letter');
    if (!HAS_SPECIAL.test(form.password)) pwErrors.push('a special character');
    if (pwErrors.length) {
      errors.password = 'Password must include: ' + pwErrors.join(', ') + '.';
    }
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
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

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const onSubmit = async () => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setApiError('');
    if (Object.keys(validationErrors).length) return;

    try {
      setSubmitting(true);
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: 'customer',
      });
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer statusBarStyle="dark">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandHeader}>
            <View style={styles.brandIconWrap}>
              <Ionicons name="business" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.brandTitle}>EventSpace</Text>
            <Text style={styles.brandTagline}>Premium Venue Booking</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.brand}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start booking venues.</Text>

            {apiError ? (
              <View style={styles.apiBanner}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.apiBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Full name"
              value={form.name}
              onChangeText={(v) => update('name', v)}
            />
            <FieldError message={errors.name} />

            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => update('email', v)}
            />
            <FieldError message={errors.email} />

            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="Phone (10 digits)"
              keyboardType="phone-pad"
              maxLength={10}
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
            />
            <FieldError message={errors.phone} />

            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password (min 6 chars)"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => update('password', v)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((p) => !p)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            </View>
            <FieldError message={errors.password} />

            <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                secureTextEntry={!showConfirm}
                value={form.confirmPassword}
                onChangeText={(v) => update('confirmPassword', v)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirm((p) => !p)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.colors.muted}
                />
              </TouchableOpacity>
            </View>
            <FieldError message={errors.confirmPassword} />

            <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>
                Already registered? <Text style={styles.linkStrong}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: { ...theme.typography.h1, color: theme.colors.primary, textAlign: 'center' },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 4,
    backgroundColor: '#fff',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.md,
    minWidth: 0,
  },
  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.muted,
  },
  linkStrong: { color: theme.colors.primary, fontWeight: '600' },
  apiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  apiBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
    flexShrink: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  brandIconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 4,
  },
});
