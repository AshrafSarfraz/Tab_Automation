// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, TextInput, StyleSheet, Image, Text,
  TouchableOpacity, StatusBar, Alert,
  KeyboardAvoidingView, ScrollView, Platform  // ← یہ add کریں
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../themes/color';
import Loader from '../../../component/indicator';
import CustomButton from '../../../component/customButton';
import { Logo_c } from '../../../themes/images';
import { syncWestwalkMongoFromApi } from '../../../database/PerformanceReport';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;
      const userDoc = await firestore().collection('users').doc(uid).get();
      if (userDoc.exists) {
        await AsyncStorage.setItem('user', JSON.stringify(userDoc.data()));
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        syncWestwalkMongoFromApi().catch((e) =>
          console.log("Sync failed but login continues:", e)
        );
      } else {
        Alert.alert('User record not found.');
      }
    } catch (error) {
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.Bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // ← iOS اور Android دونوں کے لیے
    >
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      {loading && <Loader />}

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled" // ← Tap سے keyboard dismiss ہو
        showsVerticalScrollIndicator={false}
      >
        <Image source={Logo_c} style={styles.logo} />
        <TextInput
          placeholder="Email"
          style={styles.input}
          onChangeText={setEmail}
          keyboardType="email-address"   // ← Email keyboard
          autoCapitalize="none"          // ← Capital letters نہ آئیں
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          onChangeText={setPassword}
        />
        <CustomButton title="Login" onPress={handleLogin} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,               // ← flex: 1 کی جگہ flexGrow: 1
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
  signupText: {
    marginTop: 20,
    textAlign: 'center',
    color: Colors.PrimaryColor,
    fontWeight: 'bold',
  },
});