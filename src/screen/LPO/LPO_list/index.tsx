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

export default function LpoListScreen({navigation}) {
  const route = useRoute();
  const {title, lpos} = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomHeader title="LPO list" />
        {/* <Text style={styles.heading}>{title} - LPO Details</Text> */}
        <View style={{width: 50}} /> {/* Spacer for symmetry */}
      </View>

      <FlatList
        data={lpos}
        keyExtractor={item => item['Lpo#'].toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.supplier}>{item.Company}</Text>
            <Text style={styles.supplier}>LPO #: {item['Lpo#']}</Text>
            <Text style={styles.detail}>Supplier: {item.Supplier}</Text>
            <Text style={styles.detail}>Description: {item.Description}</Text>
            <Text style={styles.detail}>
              Date: {new Date(item.Date).toLocaleDateString()}
            </Text>
            <Text style={styles.detail}>
              Amount: {item.Amount} {item.Currency}
            </Text>
            <Text style={styles.detail}>Requestor: {item.Requestor}</Text>
            <Text style={styles.detail}>
              Department: {item.Department || 'Unassigned'}
            </Text>

            {/* <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL(item['hyperlink_Lpo#'])}>
            <Text style={styles.buttonText}>Open LPO</Text>
          </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                const url = item['hyperlink_Lpo#'];

                // Agar url already http/https se start nahi hota to usay prefix karo
                let finalUrl = url;
                if (!/^https?:\/\//i.test(url)) {
                  finalUrl = `http://185.247.89.149:9507/${url}`; // apna domain prefix karo
                }

                // Navigate to WebView
                navigation.navigate('WebView', {url: finalUrl});
              }}>
              <Text style={styles.buttonText}>Open LPO</Text>
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
    padding: 24,
    backgroundColor: Colors.Bg,
    paddingTop: width > 600 ? 25 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    marginBottom: 12,

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
