import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../themes/color';
import {fetchLpoList, fetchRFPList, getAuthToken} from "../../Api's";

import Container from '../../ui/useLayout';
import MyText from '../../ui/AppText';
import {homeLogo, LPO, Reports, RFP} from '../../themes/images';
import ButtonCard from '../../component/cardBtn/buttonCard';
import {clearWestwalkMongoTable, syncWestwalkMongoFromApi} from '../../database/PerformanceReport';
import { clearCashFlowTable, syncCashFlowFromApi } from '../../database/cashFlow';

export default function HomeScreen() {
  const navigation = useNavigation();

  // ─────────────────────────────────────────
  //  BREAKPOINTS
  //  Tablet   → width >= 1000  (original — kuch nahi badla)
  //  Foldable → width 700–999
  //  Mobile   → width < 700
  // ─────────────────────────────────────────
  const { width } = useWindowDimensions();
  const isTablet   = width >= 1000;
  const isFoldable = width >= 800 && width < 1000;
  const isMobile   = width < 800;

  // ─────────────────────────────────────────
  //  DYNAMIC VALUES  (tablet = original value)
  // ─────────────────────────────────────────

  // Header buttons
  const btnTop    = isTablet ? 30  : isFoldable ? 20  : 12;
  const btnHeight = isTablet ? 40  : isFoldable ? 36  : 30;
  const btnWidth  = isTablet ? 100 : isFoldable ? 88  : 76;

  // RefreshBtn right position = LogoutBtn right + LogoutBtn width + gap
  const logoutRight  = isTablet ? 40  : isFoldable ? 30  : 16;
  const refreshRight = logoutRight + btnWidth + 10;

  // Main container
  const containerPaddingLeft = isTablet ? 30 : isFoldable ? 20 : 10;

  // Btn_Container (card panel)
  const cardPanelLeft = isTablet ? -85 : isFoldable ? -60 : -55;

  // Odd card row left offset (1st and 3rd card)
  const oddCardLeft   = isTablet ? -30 : isFoldable ? -30 : -20;

  // Logo touchable size
  const logoTouchSize = isTablet ? 300 : isFoldable ? 220 : 160;
  const marginBottom = isTablet ? 5 : isFoldable ? -5 : -15;

  // ─────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [pendingCount, setPendingCount]   = useState(0);
  const [lpoList, setLpoList]             = useState<any[]>([]);
  const [RFPcount, setRFPcount]           = useState(0);
  const [RFPList, setRFPList]             = useState<any[]>([]);
  const [username, setUsername]           = useState('');
  const [token, setToken]                 = useState('');
  const [syncing, setSyncing]             = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  useEffect(() => {
    loadData(true, false);
  }, []);

  const loadData = async (runAutoSync = false, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const userData   = await AsyncStorage.getItem('user');
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

      if (runAutoSync && !firstLoadDone) {
        setSyncing(true);
        await Promise.all([syncWestwalkMongoFromApi()]);
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
      setLpoList([]);
      setPendingCount(0);
      setRFPList([]);
      setRFPcount(0);
      await Promise.all([clearWestwalkMongoTable()]);
      await Promise.all([syncWestwalkMongoFromApi()]);
      await Promise.all([clearCashFlowTable()]);
      await Promise.all([syncCashFlowFromApi()]);
      await loadData(false, true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Refresh failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      await Promise.all([clearWestwalkMongoTable()]);
    } catch (e: any) {
      console.log('Logout cleanup error:', e?.message);
    } finally {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    }
  };

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <ImageBackground source={require('../../assets/images/bg1.png')}>

        {/* ── Refresh Button ── */}
        <TouchableOpacity
          style={[
            styles.RefreshBtn,
            {
              right:  refreshRight,
              top:    btnTop,
              height: btnHeight,
              width:  btnWidth,
            },
          ]}
          onPress={handleRefresh}
          disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={Colors.PrimaryColor} />
          ) : (
            <MyText type="btnTxt">Refresh</MyText>
          )}
        </TouchableOpacity>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={[
            styles.LogoutBtn,
            {
              right:  logoutRight,
              top:    btnTop,
              height: btnHeight,
              width:  btnWidth,
            },
          ]}
          onPress={handleLogout}>
          <MyText type="btnTxt" status="white">
            Log out
          </MyText>
        </TouchableOpacity>

        {/* ── Main Row ── */}
        <View style={[styles.Container, { paddingLeft: containerPaddingLeft }]}>

          {/* Logo */}
          <View style={styles.Img_Cont}>
            <ImageBackground
              source={homeLogo}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
              imageStyle={styles.HomeLogo}>
              <TouchableOpacity
                style={[
                  styles.bTN,
                  { width: logoTouchSize, height: logoTouchSize },
                ]}
                onPress={handlePress}
              />
            </ImageBackground>
          </View>

          {/* Cards panel */}
          <View style={[styles.Btn_Container, { left: cardPanelLeft }]}>

            {/* LPO — odd (shifted left) */}
            <View style={{ left: oddCardLeft,marginBottom }}>
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

            {/* Finance Reports — even (centred) */}
            <View style={{marginBottom:marginBottom}} >
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

            {/* RFP — odd (shifted left) */}
            <View style={{ left: oddCardLeft}}>
              <ButtonCard
                no={RFPcount}
                title="Request For Payment ( RFP )"
                subtitle="Active"
                caption="Payment requests for approved invoices, services, or project-related expenses."
                icon={RFP}
                Color="#4274b7"
                onPress={() => navigation.navigate('RfpCompanies', {RFPList})}
              />
            </View>

          </View>
        </View>
      </ImageBackground>
    </Container>
  );
}

// ─────────────────────────────────────────
//  STATIC STYLES  (values that never change)
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  Container: {
    width: '100%',
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    // paddingLeft → inline (dynamic)
  },
  RefreshBtn: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.2,
    // right, top, height, width → inline (dynamic)
  },
  LogoutBtn: {
    position: 'absolute',
    backgroundColor: 'red',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // right, top, height, width → inline (dynamic)
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
    // left → inline (dynamic)
  },
  bTN: {
    borderRadius: 200,
    marginRight: 45,
    marginTop: 10,
    // width, height → inline (dynamic)
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
