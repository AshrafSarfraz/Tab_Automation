
// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Image, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import CustomButton from '../../../component/customButton';
import { Colors } from '../../../themes/color';
import { Logo_c } from '../../../themes/images';


export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert('Reset link sent to your email');
      navigation.goBack();
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={Logo_c} style={styles.logo} />
      <TextInput placeholder="Enter your email" style={styles.input} onChangeText={setEmail} />
      <CustomButton title="Send Reset Link" onPress={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: Colors.White,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
  },
});
