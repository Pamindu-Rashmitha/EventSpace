import React from 'react';
import { StyleSheet, TextInput } from 'react-native';

import theme from '../theme';

const ThemedTextInput = React.forwardRef(function ThemedTextInput(
  { style, placeholderTextColor = theme.colors.placeholder, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    color: theme.colors.text,
  },
});

export default ThemedTextInput;
