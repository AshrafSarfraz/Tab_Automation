// src/screens/LpoListScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import {useRoute} from '@react-navigation/native';
import {Colors} from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';
const {width} = Dimensions.get('window');

export default function RFPListScreen({navigation}) {
  const route = useRoute();
  const {RFPList} = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomHeader title="RFP list" />
        {/* <Text style={styles.heading}>{title} - LPO Details</Text> */}
      </View>
         
      <FlatList
        data={RFPList}
        keyExtractor={item => item['PPaSeq'].toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.supplier}>Payment Preparation Sequence: {item.PPaSeq}</Text>
            <Text style={styles.detail}>Account Name: {item.AccountName}</Text>
            <Text style={styles.detail}>Description: {item.Description}</Text>
            <Text style={styles.detail}>
              Date: {new Date(item.Date).toLocaleDateString()}
            </Text>
            <Text style={styles.detail}>
              Amount: {item.Amount} {item.Currency}
            </Text>
            {/* <Text style={styles.detail}>Requestor: {item.Requestor}</Text>
            <Text style={styles.detail}>
              Department: {item.Department || 'Unassigned'}
            </Text> */}

          

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                const url = item['HyperlinkPPaSeq'];
                console.log('url',    url)

                // Agar url already http/https se start nahi hota to usay prefix karo
                let finalUrl = url;
                if (!/^http?:\/\//i.test(url)) {
                  finalUrl = `http://78.100.143.83:9507/${url}`; // apna domain prefix karo
                }
                console.log('final url',    finalUrl)


                // Navigate to WebView
                navigation.navigate('WebView', {url: finalUrl});
              }}>
              <Text style={styles.buttonText}>Open Link</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding:20,
    backgroundColor:Colors.PrimaryColor
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.PrimaryColor,
  },
  card: {
    backgroundColor: Colors.White,
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop:20,
    borderWidth:0.2
  

  },
  supplier: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detail: {
    fontSize: 15,
    color: Colors.Black,
    marginBottom: 2,
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.White,
    fontSize: 14,
    fontWeight: '600',
  },
});
