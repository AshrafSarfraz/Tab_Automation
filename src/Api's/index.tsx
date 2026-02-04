import AsyncStorage from '@react-native-async-storage/async-storage';
const BASE_URL = 'http://78.100.143.83:9507/api';

const westwalkAccounts = [
  41112,44131,44132,41111,44133,44105,64114,
  61101,61103,61104,61105,61106,61115,61116,
  64101,64105,64121,54109,64115,64102,64106,
  64111,64112,64129,64203,64209,62202,62205,
  44130,44128,44104,44107,44122,44124,44125,
  55101,55301,55201,51105,51110,44137,44136,
  44140,64117,62106,62110,62121,62119,62207,
  62101,62104
];








// Authentication Key
export const getAuthToken = async (forceRefresh = false) => {
  try {
    const now = Date.now();
    let finalToken = null;

    const storedTokenData = await AsyncStorage.getItem('authTokenData');
    if (storedTokenData && !forceRefresh) {
      const parsed = JSON.parse(storedTokenData);
      const tokenAge = now - parsed.createdAt;

      if (tokenAge < 120 * 120 * 1000) {
        finalToken = parsed.token;
        console.log('✅ Using saved token:', finalToken);
      } else {
        console.log('⚠️ Token expired.');
        await AsyncStorage.removeItem('authTokenData');
      }
    }

    if (!finalToken) {
      console.log('🔐 Fetching new token...');
      const loginRes = await fetch(`${BASE_URL}/Authentication/Dolph_Login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    return finalToken;
  } catch (err) {
    console.error('Token Error:', err);
    return null;
  }
};



// Fetch Lpo List
export const fetchLpoList = async (username: string, token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/externallpo/lpolistexternal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authentication: token,
        },
        body: JSON.stringify({ username }),
      });
  
      const data = await res.json();
  
      if (!data || data.status === 'Unauthorized') {
        await AsyncStorage.removeItem('authTokenData');
        throw new Error('Session expired');
      }
  
      return data.listlpo || [];
    } catch (err) {
      console.error('LPO API Error:', err);
      return [];
    }
  };


  // Fetch Lpo List
export const fetchRFPList = async (username: string,fkcmpseq:number,  token: string) => {
  try {
    const res = await fetch(`${BASE_URL}/externalopenedpaymentpreperation/listofopenedpaymentpreperation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authentication: token,
      },
      body: JSON.stringify({ username,fkcmpseq }),
    });

    const data = await res.json();

    if (!data || data.status === 'Unauthorized') {
      await AsyncStorage.removeItem('authTokenData');
      throw new Error('Session expired');
    }

    return data;
  } catch (err) {
    console.error('RFP API Error:', err);
    return [];
  }
};

  



  


  // Fetch RFP of Westwalk
  export const fetchTrialBalanceApi = async (token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/externaltrialbalance/gettrialbalance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authentication: token, // 👈 same token
        },
        body: JSON.stringify({
          filter: " ",
          take: 0,
          skip: 0,
          sort: " ",
          parameters: {
            cmpseq: 0,
            accountno: "", // leave empty, we'll filter locally
            year: 0,
            month: 0,
            cc3: "",
            cc2: "",
            typeR: "P",
          },
        }),
      });
  
      const data = await res.json();
      const result = Array.isArray(data) ? data : [];
  
      // ✅ Filter only the Westwalk account numbers
      const filteredData = result.filter(item => 
        westwalkAccounts.includes(Number(item.accountno))
      );

      // await AsyncStorage.setItem('trialBalanceData', JSON.stringify(filteredData));
      return filteredData;
    } catch (err) {
      console.error('Trial Balance API Error:', err);
      return [];
    }
  };