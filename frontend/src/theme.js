const theme = {
  colors: {
    primary: '#6C5CE7',
    primaryDark: '#4834D4',
    accent: '#00B894',
    background: '#F5F6FA',
    surface: '#FFFFFF',
    text: '#2D3436',
    muted: '#636E72',
    border: '#DFE6E9',
    danger: '#E74C3C',
    warning: '#F39C12',
    success: '#2ECC71',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 24,
    pill: 999,
  },
  typography: {
    h1: { fontSize: 26, fontWeight: '700' },
    h2: { fontSize: 20, fontWeight: '700' },
    h3: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
  },
};

export default theme;
