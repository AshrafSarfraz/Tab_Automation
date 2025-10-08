import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../themes/color';
import {fetchLpoList, getAuthToken} from "../../Api's";
import {syncTrialBalance} from '../../database/Utils/MapAndStoreData';

const {width} = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lpoList, setLpoList] = useState<any[]>([]);
  const [token, setToken] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // initial load with full-screen loader
    loadData(false, false);
  }, []);

  // forceRefresh = token refresh
  // silent = true -> top-right button spinner use, screen loader na dikhaye
  const loadData = async (forceRefresh = false, silent = false) => {
    try {
      if (!silent) setLoading(true);

      const userData = await AsyncStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null; // ✅ null-guard

      if (!parsedUser) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const username = parsedUser?.username;

      // Get token
      const authToken = await getAuthToken(forceRefresh);
      if (!authToken) {
        Alert.alert('Error', 'Failed to get auth token.');
        return;
      }
      setToken(authToken);

      // Get LPO list
      const list = await fetchLpoList(username, authToken);
      setLpoList(list);
      setPendingCount(list.length);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 👇 yeh button ke liye combined handler hai
  const handleRefresh = async () => {
    try {
      setSyncing(true); // button spinner
      await loadData(true, true); // token + lpo silently refresh
      const res = await syncTrialBalance(); // API -> map -> SQLite insert
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Refresh failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('authTokenData');
    navigation.reset({index: 0, routes: [{name: 'Login'}]});
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <StatusBar hidden={false} barStyle={'dark-content'} />

      <View style={styles.Header}>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={syncing}>
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Refresh</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.title}>Al-Wessil Holding</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={[styles.btnText,{color:Colors.White}]}>Logout</Text>
        </TouchableOpacity>
      </View>


      <View  style={{padding:width>600?30:20}} >
      {/* Info Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('companyLpo', {lpoList})}>
        <Text style={styles.cardTitle}>
          Pending Approvals ( {pendingCount} )
        </Text>
        {/* <Text style={styles.cardCount}> {pendingCount}</Text> */}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Ceo_Dashboard')}>
        <Text style={styles.cardTitle}>Performance Report</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <Text style={styles.cardTitle}>Request For Payment</Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Bg,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.Bg,
  },
  Header: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:20,
    backgroundColor:Colors.PrimaryColor
  },
  title: {
    fontSize: width > 600 ? 28 : 18,
    fontWeight: '700',
    color: Colors.White,
    textAlign: 'center',
  },
  refreshBtn: {
    backgroundColor: Colors.White,
    paddingVertical: width > 600 ? 10 : 6,
    paddingHorizontal: width > 600 ? 24 : 8,
    borderRadius: width > 600 ? 14 : 7,
  },
  logoutBtn: {
    backgroundColor: '#d9534f',
    paddingVertical: width > 600 ? 10 : 6,
    paddingHorizontal: width > 600 ? 24 : 8,
    borderRadius: width > 600 ? 14 : 7,
  },
  btnText: {color: '#31368A', fontSize: width > 600 ? 16 : 14, fontWeight: '600'},
  card: {
    backgroundColor: Colors.White,
    height: 150,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginTop: 10,
    borderWidth:0.3

  },
  cardTitle: {fontSize: 22, fontWeight: '600', color: Colors.Black},
  // cardCount: { fontSize:40, fontWeight:'bold', color: Colors.PrimaryColor },
});
