// src/components/CustomButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../themes/color';


export default function CustomButton({ title, onPress, }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent:'center',
    height:40,

  },
  text: {
    color: Colors.White,
    fontSize: 12,
    fontWeight: 'bold',
  },
});