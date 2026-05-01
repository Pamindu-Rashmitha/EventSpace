import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(form) {
  const errors = {};

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const updateField = (setter, key, value) => {
    setter(value);
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  };

  const onSubmit = async () => {
    const validationErrors = validateLogin({ email, password });
    setErrors(validationErrors);
    setApiError('');
    if (Object.keys(validationErrors).length) return;

    try {
      setSubmitting(true);
      await login(email.trim(), password);
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
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
            <Text style={styles.brand}>Log in</Text>
            <Text style={styles.subtitle}>Welcome back. Sign in to continue.</Text>

            {apiError ? (
              <View style={styles.apiBanner}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.apiBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => updateField(setEmail, 'email', v)}
            />
            <FieldError message={errors.email} />

            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(v) => updateField(setPassword, 'password', v)}
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

            <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>
                Don&apos;t have an account? <Text style={styles.linkStrong}>Register</Text>
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
  brand: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
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
