
// src/screens/SignupScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Image, StatusBar } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import CustomButton from '../../../component/customButton';
import { Colors } from '../../../themes/color';
import { Logo_c } from '../../../themes/images';


export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [cmpseq, setCmpseq] = useState('');

  const handleSignup = async () => {
    try {
      const user = await auth().createUserWithEmailAndPassword(email, password);
      await firestore().collection('users').doc(user.user.uid).set({
        email,
        username,
        cmpseq,
        uid: user.user.uid,
      });
      navigation.navigate('Login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <Image source={Logo_c} style={styles.logo} />
      <TextInput placeholder="Username" style={styles.input} onChangeText={setUsername} />
      <TextInput placeholder="Company Seq" style={styles.input} onChangeText={setCmpseq} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} onChangeText={setPassword} />
      <CustomButton title="Sign Up" onPress={handleSignup} />
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
    width: 20,
    height: 20,
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