// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../themes/color';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lpoList, setLpoList] = useState([]);
  const [token, setToken]=useState('')
  const navigation = useNavigation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
  
      const userData = await AsyncStorage.getItem('user');
      const parsedUser = JSON.parse(userData);
  
      if (!parsedUser) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }
  
      const cmpseq = parsedUser?.cmpseq;
      const username = parsedUser?.username;
      const now = Date.now();
  
      let finalToken = null;
  
      const storedTokenData = await AsyncStorage.getItem('authTokenData');
      if (storedTokenData && !forceRefresh) {
        const parsed = JSON.parse(storedTokenData);
        const tokenAge = now - parsed.createdAt;
  
        if (tokenAge < 60 * 60 * 1000) {
          // Less than 1 hour
          finalToken = parsed.token;
          console.log('✅ Using saved token:', finalToken);
        } else {
          console.log('⚠️ Token expired.');
          await AsyncStorage.removeItem('authTokenData');
        }
      }
  
      // If no valid token, generate new one
      if (!finalToken) {
        console.log('🔐 Fetching new token...');
        const loginRes = await fetch('http://185.247.89.149:9507/api/Authentication/Dolph_Login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageindex:
              'eyJVc2VybmFtZSI6InJveWFvQHNvZnR3YXJlZGVzaWduLmNvbS5sYiIsIlBhc3N3b3JkIjoiREI4ajlWWjQiLCJEYXRhYmFzZSI6IldFU1RXQUxLIn0=',
          }),
        });
  
        const loginData = await loginRes.json();
        const authKey = loginData?.authkey;
        if (!authKey) throw new Error('authkey not found');
  
        finalToken = authKey;
        await AsyncStorage.setItem('authTokenData', JSON.stringify({ token: finalToken, createdAt: now }));
      }
  
      // Save to display only
      setToken(finalToken);
  
      // Call LPO API
      const lpoRes = await fetch('http://185.247.89.149:9507/api/externallpo/lpolistexternal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authentication: finalToken,
        },
        // body: JSON.stringify({ cmpseq, username }),  specific company only
        body: JSON.stringify({ username }),
      });
  
      const data = await lpoRes.json();
  
      if (!data || data.status === 'Unauthorized') {
        await AsyncStorage.removeItem('authTokenData');
        Alert.alert('Session Expired', 'Please refresh again.');
        return;
      }
  
      setLpoList(data.listlpo || []);
      setPendingCount((data.listlpo || []).length);
  
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('authTokenData');

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

 
  return (
    <ScrollView contentContainerStyle={styles.container}>
     <View style={styles.Header} >
     <TouchableOpacity style={styles.refreshBtn} onPress={()=>fetchData(true)}>
          <Text style={styles.btnText}>Refresh</Text>
        </TouchableOpacity>
      <Text style={styles.title}>Al-Wessil Holding</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Departments', { lpoList })}
      >
        <Text style={styles.cardTitle}>Pending Approvals</Text>
        <Text style={styles.cardToken} numberOfLines={1}>{token}</Text>
        <Text style={styles.cardCount}>{pendingCount}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 30,
    backgroundColor: Colors.Bg,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.Bg,
  },
  Header:{
    flexDirection:'row',
    width:'100%',
   alignItems:"center",
   justifyContent:'space-between',
   marginBottom:30
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.PrimaryColor,
    textAlign: 'center',

  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  refreshBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  logoutBtn: {
    backgroundColor:'#d9534f',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,

  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.White,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.Black,
    marginBottom: 12,
  },
  cardToken: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardCount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.PrimaryColor,
  },
});