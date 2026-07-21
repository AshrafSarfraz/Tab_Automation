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
import CapexDashboard from '../screen/Reports/CapeX/DashBoard';
import CapexBalanceScreen from '../screen/Reports/CapeX/AddCapex';
import TOR_Dashboard from '../screen/Reports/TOR/dashboard';
import AddTOR from '../screen/Reports/TOR/uploadData';
import DailReportScreen from '../screen/Reports/DailyReport/DailyReport/PdfListScreen';
import UploadDailyReport from '../screen/Reports/DailyReport/AddDailyReport/PdfUploadScreen';
import ViewerDailyReport from '../screen/Reports/DailyReport/PdfViewer/PdfViewerScreen';
import CashFlowDashboard from '../screen/Reports/CashFlowReport/CashflowDashboard';
import CashFlowTableScreen from '../screen/Reports/CashFlowReport/CashFlowDetails/DetailScreen';
import CashFlowCsvUploadScreen from '../screen/Reports/CashFlowReport/UploadCashflow';



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
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
       
        <Stack.Screen name="ReportSelection" component={ReportSelection} />
        <Stack.Screen name="companyLpo" component={CompanyLpo} />
        <Stack.Screen name="LpoList" component={LpoListScreen} />
        <Stack.Screen name="RfpCompanies" component={RfpCompaniesScreen} />
        <Stack.Screen name="RfpListByCompany" component={RfpListByCompany} />
        <Stack.Screen name="WebView" component={WebViewScreen} />
        
        
        <Stack.Screen name="mainDashboard" component={mainDashboard} />
        <Stack.Screen name="TrialBalanceTable"  component={TrialBalanceTableScreen} />

        <Stack.Screen name="CashFlowDashboard" component={CashFlowDashboard} />
        <Stack.Screen name="CashFlowCsvUpload" component={CashFlowCsvUploadScreen} />
        <Stack.Screen name="CashFlowTable" component={CashFlowTableScreen} />

        <Stack.Screen name="BudgtedDashboard" component={BudgtedDashboard} />
        <Stack.Screen name="BudgtedTrialBalanceTable"  component={TrialBalanceTableScreen} />
        <Stack.Screen name="Csvupload" component={CsvUploadScreen} />
        <Stack.Screen name="GroupMonthlySummaryScreen"   component={GroupMonthlySummaryScreen} />

        <Stack.Screen name="CapexDashboard" component={CapexDashboard} />
        <Stack.Screen name="CapexBalanceScreen" component={CapexBalanceScreen} />

        <Stack.Screen name="TOR_Dashboard" component={TOR_Dashboard} />
        <Stack.Screen name="AddTOR" component={AddTOR} />

        <Stack.Screen name="DailReport" component={DailReportScreen} />
        <Stack.Screen name="ViewerDailyReport" component={ViewerDailyReport} />
        <Stack.Screen name="AddDailyReport" component={UploadDailyReport} />

  
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigation;


