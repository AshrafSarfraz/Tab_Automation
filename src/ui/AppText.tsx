// components/MyText.js
import React from 'react';
import { Text as RNText, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Default Talabat style colors
const COLORS = {
  primary: '#1e88e5',   // Blue
  success: '#43a047',   // Green
  warning: '#fdd835',   // Yellow
  error: '#e53935',     // Red
  info: '#6c757d',      // Gray
  login: '#1976d2',     // Login hints
  updated: '#2e7d32',   // Data updated
  default: '#000',      // Black
  white:"#ffffff"
};

// Predefined type styles with auto lineHeight and margin
const TYPE_STYLES = {
  header: { fontSize: 20, fontWeight: 'bold', lineHeight: 24,  letterSpacing: 0.5, },
  subHeader: { fontSize: 16, fontWeight: '600', lineHeight: 20,  letterSpacing: 0.5, },
  btnTxt: { fontSize: 14, fontWeight: '600', lineHeight: 20,  letterSpacing: 0.5, },
  body: { fontSize: 14, fontWeight: 'normal', lineHeight: 18,  letterSpacing: 0.5, },
  caption: { fontSize: 12, fontWeight: '300', lineHeight: 16,  letterSpacing: 0.5,},
};

const MyText = ({
  children,
  type = 'body',       // header, subHeader, body, caption
  status,              // error, success, warning, info, login, updated
  center = false,
  style,               // optional manual overrides
  color,               // override color
}) => {

  // Determine color: status > custom > default
  const textColor = status ? COLORS[status] : color ? color : COLORS.default;

  // Determine base type style
  const baseStyle = TYPE_STYLES[type] || TYPE_STYLES.body;

  return (
    <RNText
      style={[
        baseStyle,
        { color: textColor, textAlign: center ? 'center' : 'left' },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

export default MyText;
