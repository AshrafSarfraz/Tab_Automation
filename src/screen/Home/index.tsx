import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../themes/color';
import {fetchLpoList, fetchRFPList, getAuthToken} from "../../Api's";

import Container from '../../ui/useLayout';
import MyText from '../../ui/AppText';
import {homeLogo, LPO, Reports, RFP} from '../../themes/images';
import ButtonCard from '../../component/cardBtn/buttonCard';
import {clearWestwalkMongoTable, syncWestwalkMongoFromApi} from '../../database/westwalkTrailBal';
import { clearOtherCmpMongoTable, syncOtherCmpMongoFromApi } from '../../database/otherCmpTrailBal';



const {width} = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true); // Initial loader
  const [pendingCount, setPendingCount] = useState(0);
  const [lpoList, setLpoList] = useState<any[]>([]);
  const [RFPcount, setRFPcount] = useState(0);
  const [RFPList, setRFPList] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [syncing, setSyncing] = useState(false); // Loader for refresh/auto-sync
  const [firstLoadDone, setFirstLoadDone] = useState(false); // To ensure auto-sync runs only once


  
  useEffect(() => {
    // Initial load + auto-sync
    loadData(true, false);
  }, []);

  const loadData = async (runAutoSync = false, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const userData = await AsyncStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      if (!parsedUser) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const username = parsedUser?.username;
      const fkcmpseq = parsedUser?.cmpseq;
      setUsername(username);

      const authToken = await getAuthToken(runAutoSync);
      if (!authToken) {
        Alert.alert('Error', 'Failed to get auth token.');
        return;
      }
      setToken(authToken);

      const list = await fetchLpoList(username, authToken);
      setLpoList(list);
      setPendingCount(list.length);

      const listRFP = await fetchRFPList(username, fkcmpseq, authToken);
      setRFPList(listRFP);
      setRFPcount(listRFP.length);

      // ---------------- Auto Sync Trial Balance only on first load ----------------
      if (runAutoSync && !firstLoadDone) {
        setSyncing(true);
      
        await Promise.all([
          syncWestwalkMongoFromApi(),
          syncOtherCmpMongoFromApi(),
        ]);
      
        setSyncing(false);
        setFirstLoadDone(true);
      }
      

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handlePress = () => {
    Linking.openURL('https://alwessilholding.com/');
  };

  const handleRefresh = async () => {
    try {
      setSyncing(true);
  
      // ✅ Clear old UI data
      setLpoList([]);
      setPendingCount(0);
      setRFPList([]);
      setRFPcount(0);
  
      await Promise.all([
        clearWestwalkMongoTable(),
        clearOtherCmpMongoTable(),
      ]);
      
      await Promise.all([
        syncWestwalkMongoFromApi(),
        syncOtherCmpMongoFromApi(),
      ]);
      // ✅ Fetch fresh API data
      await loadData(false, true);
  
    } catch (e) {
      Alert.alert('Error', e?.message || 'Refresh failed');
    } finally {
      setSyncing(false);
    }
  };
  

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      await Promise.all([
        clearWestwalkMongoTable(),
        clearOtherCmpMongoTable(),
      ]);
      
    } catch (e: any) {
      console.log('Logout cleanup error:', e?.message);
    } finally {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    }
  };




  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <ImageBackground source={require('../../assets/images/bg1.png')}>
        
        {/* ---------------- Single Center Loader ---------------- */}
        {(loading || syncing) && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={Colors.PrimaryColor} />
          </View>
        )}

        <TouchableOpacity style={styles.RefreshBtn} onPress={handleRefresh} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={Colors.PrimaryColor} />
          ) : (
            <MyText type="btnTxt">Refresh</MyText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.LogoutBtn} onPress={handleLogout}>
          <MyText type="btnTxt" status="white">
            Log out
          </MyText>
        </TouchableOpacity>

        <View style={styles.Container}>
          <View style={styles.Img_Cont}>
            <ImageBackground
              source={homeLogo}
              style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
              imageStyle={styles.HomeLogo}>
              <TouchableOpacity style={styles.bTN} onPress={handlePress} />
            </ImageBackground>
          </View>

          <View style={styles.Btn_Container}>
            <View style={{left: -30, marginBottom: 5}}>
              <ButtonCard
                no={pendingCount}
                title="Pending Approvals ( LPO )"
                subtitle="Active"
                caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
                icon={LPO}
                Color="#038645"
                onPress={() => navigation.navigate('companyLpo', {lpoList})}
              />
            </View>
            <View>
              <ButtonCard
                no="3"
                title="Finance Reports ( FR )"
                subtitle="Active"
                caption="View and generate financial and operational reports for monitoring and recordkeeping."
                icon={Reports}
                Color="#01a4c0"
                onPress={() => navigation.navigate('ReportSelection')}
              />
            </View>
            <View style={{left: -30, marginTop: 5}}>
              <ButtonCard
                no={RFPcount}
                title="Request For Payment ( RFP )"
                subtitle="Active"
                caption="Payment requests for approved invoices, services, or project-related expenses."
                icon={RFP}
                Color="#4274b7"
                onPress={() => navigation.navigate('RFPList', {RFPList})}
              />
            </View>
          </View>
        </View>
      </ImageBackground>
    </Container>
  );
}

const styles = StyleSheet.create({
  Container: {
    width: '100%',
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    paddingLeft:30
  },
  RefreshBtn: {
    position: 'absolute',
    right: 150,
    top: 30,
    backgroundColor: '#ffffff',
    height: 40,
    width: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.2,
  },
  LogoutBtn: {
    position: 'absolute',
    right: 40,
    top: 30,
    backgroundColor: 'red',
    height: 40,
    width: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  Img_Cont: {
    width: '50%',
    zIndex: 1,
  },
  HomeLogo: {
    resizeMode: 'contain',
    width: '100%',
    height: '100%',
  },
  Btn_Container: {
    width: '50%',
    left: -85,
  },
  bTN: {
    width: 300,
    height: 300,
    borderRadius: 200,
    marginRight: 45,
    marginTop: 10,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    zIndex: 999,
  },
});
