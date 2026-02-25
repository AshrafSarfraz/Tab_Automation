import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ActivityIndicator, View} from 'react-native';
import LoginScreen from '../screen/Authentication/Login';
import ForgotPasswordScreen from '../screen/Authentication/ForgetScreen';
import SignupScreen from '../screen/Authentication/Signup';
import HomeScreen from '../screen/Home';
import LpoListScreen from '../screen/LPO/LPO_list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebViewScreen from '../screen/LPO/WebView';
import CompanyLpo from '../screen/LPO/companies';




import ReportSelection from '../screen/Reports/reportSelection';
import mainDashboard from '../screen/Reports/Performance_Report/mainDashboard';

import TrialBalanceTableScreen from '../screen/Reports/Performance_Report/DetailsScreen';
import CsvUploadScreen from '../screen/Reports/budgted/uploadData';
import BudgtedDashboard from '../screen/Reports/budgted/budgetedDashboard';
import RfpCompaniesScreen from '../screen/RFP/RFP_Companies';
import RfpListByCompany from '../screen/RFP/RFP_List';
import GroupMonthlySummaryScreen from '../screen/Reports/Performance_Report/GroupDetailScreen';
import CashFlowDashboard from '../screen/Reports/CashFlow/Dashboard';
import CashFlowTableScreen from '../screen/Reports/CashFlow/DetailsScreen';
import AddProjects from '../screen/Reports/CashFlow/AddProjects';
import CashFlowReportDetails1 from '../screen/Reports/CashFlow/GroupDetailReport';

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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#31386A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{headerShown: false}}>

        {/* <Stack.Navigator initialRouteName={'Westwalk'} screenOptions={{ headerShown: false }}>  */}

        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="companyLpo" component={CompanyLpo} />
        <Stack.Screen name="LpoList" component={LpoListScreen} />
        <Stack.Screen name="RfpCompanies" component={RfpCompaniesScreen} />
        <Stack.Screen name="RfpListByCompany" component={RfpListByCompany} />
        <Stack.Screen name="WebView" component={WebViewScreen} />
        <Stack.Screen name="ReportSelection" component={ReportSelection} />
        
        <Stack.Screen name="mainDashboard" component={mainDashboard} />
        <Stack.Screen name="TrialBalanceTable"  component={TrialBalanceTableScreen} />

        <Stack.Screen name="BudgtedDashboard" component={BudgtedDashboard} />
        <Stack.Screen name="BudgtedTrialBalanceTable"  component={TrialBalanceTableScreen} />
       
        <Stack.Screen name="CashFlowDashboard" component={CashFlowDashboard} />
        <Stack.Screen name="CashFlowTableScreen" component={CashFlowTableScreen} />
        <Stack.Screen name="CashFlowGroupTableScreen" component={CashFlowReportDetails1} />
        <Stack.Screen name="AddProjects" component={AddProjects} />
  
        <Stack.Screen name="Csvupload" component={CsvUploadScreen} />
        <Stack.Screen name="GroupMonthlySummaryScreen"   component={GroupMonthlySummaryScreen} />



      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigation;


