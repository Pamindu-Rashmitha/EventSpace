import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';
import ScreenContainer from '../../components/ScreenContainer';
import TextInput from '../../components/ThemedTextInput';

const ONLY_DIGITS = /^\d+$/;
const PHONE_10_DIGITS = /^\d{10}$/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

function validateProfile(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required.';
  } else if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  } else if (ONLY_DIGITS.test(form.name.trim())) {
    errors.name = 'Name cannot contain only numbers.';
  }

  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_10_DIGITS.test(form.phone.trim())) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  if (form.password) {
    const pwErrors = [];
    if (form.password.length < 6) pwErrors.push('at least 6 characters');
    if (ONLY_DIGITS.test(form.password)) pwErrors.push('not only numbers');
    if (!HAS_UPPERCASE.test(form.password)) pwErrors.push('an uppercase letter');
    if (!HAS_SPECIAL.test(form.password)) pwErrors.push('a special character');
    if (pwErrors.length) {
      errors.password = 'Password must include: ' + pwErrors.join(', ') + '.';
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

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
  });
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

  const save = async () => {
    const validationErrors = validateProfile(form);
    setErrors(validationErrors);
    setApiError('');
    setSuccessMsg('');
    if (Object.keys(validationErrors).length) return;

    try {
      setSubmitting(true);
      const payload = { name: form.name.trim(), phone: form.phone.trim() };
      if (form.password) payload.password = form.password;
      await updateProfile(payload);
      setForm((f) => ({ ...f, password: '' }));
      setSuccessMsg('Profile updated successfully!');
    } catch (err) {
      setApiError(err.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
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

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(v) => update('name', v)}
          />
          <FieldError message={errors.name} />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            keyboardType="phone-pad"
            maxLength={10}
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
          />
          <FieldError message={errors.phone} />

          <Text style={styles.label}>New password (optional)</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            secureTextEntry
            value={form.password}
            onChangeText={(v) => update('password', v)}
            placeholder="Leave blank to keep current"
            placeholderTextColor={theme.colors.placeholder}
          />
          <FieldError message={errors.password} />

          <TouchableOpacity
            style={styles.save}
            onPress={save}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  label: { ...theme.typography.caption, color: theme.colors.muted, marginTop: theme.spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: 6,
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
    flexShrink: 1,
  },
  save: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
