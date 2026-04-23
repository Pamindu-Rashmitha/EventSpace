import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import theme from '../theme';

/**
 * Full-screen wrapper with safe-area insets (notches, home indicator).
 *
 * @param edges          Which sides get safe-area padding. Omit `top` when a
 *                       stack/tab header already handles the status bar inset,
 *                       or when the screen has its own hero that should extend
 *                       under the status bar.
 * @param statusBarStyle Optional StatusBar style override for screens that
 *                       don't have a navigator-managed header (e.g. auth
 *                       screens, Home, Dashboard). Pass 'dark' for light
 *                       backgrounds and 'light' for dark/colored backgrounds.
 *                       Leave undefined to let the navigator manage it.
 */
export default function ScreenContainer({
  children,
  style,
  edges = ['top', 'left', 'right', 'bottom'],
  backgroundColor = theme.colors.background,
  statusBarStyle,
}) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor }, style]}>
      {statusBarStyle ? <StatusBar style={statusBarStyle} /> : null}
      {children}
    </SafeAreaView>
  );
}
