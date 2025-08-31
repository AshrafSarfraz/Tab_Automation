import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../screen/Authentication/Login';
import ForgotPasswordScreen from '../screen/Authentication/ForgetScreen';
import SignupScreen from '../screen/Authentication/Signup';
import HomeScreen from '../screen/Home';
import DepartmentsScreen from '../screen/LPO/department';
import LpoListScreen from '../screen/LPO/LPO_list';
import AsyncStorage from '@react-native-async-storage/async-storage';


const Stack = createNativeStackNavigator();

const StackNavigation = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const user = await AsyncStorage.getItem('user');
      setInitialRoute(user ? 'Home' : 'Login');
    };

    checkUser();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#31386A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Departments" component={DepartmentsScreen} />
        <Stack.Screen name="LpoList" component={LpoListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigation;
