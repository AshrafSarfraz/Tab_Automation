import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../screen/Authentication/Login';
import ForgotPasswordScreen from '../screen/Authentication/ForgetScreen';
import SignupScreen from '../screen/Authentication/Signup';
import HomeScreen from '../screen/Home';
import LpoListScreen from '../screen/LPO/LPO_list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebViewScreen from '../screen/LPO/WebView';
import CompanyLpo from '../screen/LPO/companies';
import Ceo_Dashboard from '../screen/RFP/main_dashboard';
import Westwalk from '../screen/RFP/Westwalk';
import TrialBalanceList from '../screen/RFP/Westwalk/OfflineData';



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
     {/* <Stack.Navigator initialRouteName={'Westwalk'} screenOptions={{ headerShown: false }}> */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="companyLpo" component={CompanyLpo} />
        <Stack.Screen name="LpoList" component={LpoListScreen} />
        <Stack.Screen name="WebView" component={WebViewScreen} />

        <Stack.Screen name="Ceo_Dashboard" component={Ceo_Dashboard} />
        <Stack.Screen name="Westwalk" component={Westwalk} />
        <Stack.Screen name="TrialBalanceList" component={TrialBalanceList} />


      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigation;
