// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Image, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../../themes/color';
import Loader from '../../../component/indicator';
import CustomButton from '../../../component/customButton';
import { Logo_c } from '../../../themes/images';


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
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } 
      else {
        Alert.alert('User record not found.');
      }
    } catch (error) {
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      {loading && <Loader />}
      <Image source={Logo_c} style={styles.logo} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={setPassword} />
      <CustomButton title="Login" onPress={handleLogin} />
      <CustomButton title="Forgot Password?" onPress={() => navigation.navigate('ForgotPassword')} />
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.signupText}>Don’t have an account? Sign up</Text>
      </TouchableOpacity>
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
  signupText: {
    marginTop: 20,
    textAlign: 'center',
    color: Colors.PrimaryColor,
    fontWeight: 'bold',
  },
});
