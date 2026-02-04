// | Name | Value (px/dp) | Use case                                           |
// | ---- | ------------- | -------------------------------------------------- |
// | xs   | 4             | Tiny gaps, icon & text                             |
// | sm   | 8             | Small padding/margin, between 2 small items        |
// | md   | 16            | Standard spacing, between 2 components, body text  |
// | lg   | 24            | Section spacing, between cards, bigger content     |
// | xl   | 32            | Large spacing, screen sections, top/bottom padding |
// | xxl  | 40–48         | Major separation, header vs footer etc.            |






// components/Spacer.js
import React from 'react';
import { View } from 'react-native';
// constants/Spacing.js
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };
  

const Spacer = ({ size = 'md', width = 0, height = 0 }) => {
  const finalHeight = height || SPACING[size] || SPACING.md;
  const finalWidth = width || SPACING[size] || 0;
  return <View style={{ height: finalHeight, width: finalWidth }} />;
};

export default Spacer;
