import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getCompanyPnL } from '../../database/trailBalanceQueries';

const { width } = Dimensions.get('window');

interface PnLRow {
  company: string;
  year: number | string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export default function Companies({navigation}) {
  const [overallData, setOverallData] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPnL = async () => {
      setLoading(true);
      const results = await getCompanyPnL();

      // ✅ Sirf Overall aur "Westwalk Group" ko exclude kar diya
      const filtered = results.filter(
        item => item.year === 'Overall' && item.company !== 'Man Power / Salaries');
       
        const sorted = filtered.sort((a, b) => b.netProfit - a.netProfit);

      setOverallData(sorted);
      setLoading(false);
    };
    fetchPnL();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.grid}>
        {overallData.map((item, index) => {
          const cardColors = ['#FFDAB9', '#E0FFFF', '#E6E6FA', '#F0FFF0', '#FFE4E1'];
          const backgroundColor = cardColors[index % cardColors.length];

          return (
            <TouchableOpacity key={index} style={[styles.card, { backgroundColor }]} onPress={()=>{navigation.navigate('CmpDashboard',{company:item.company})}} >
              <Text style={styles.companyName}>{item.company}</Text>
              <View style={styles.rowData}>
                <Text style={styles.label}>Revenue:</Text>
                <Text style={styles.value}>{item.totalRevenue.toLocaleString()}</Text>
              </View>
              <View style={styles.rowData}>
                <Text style={styles.label}>Cost:</Text>
                <Text style={styles.value}>{item.totalCost.toLocaleString()}</Text>
              </View>
              <View style={styles.rowData}>
                <Text style={styles.label}>Net Profit:</Text>
                <Text
                  style={[
                    styles.value,
                    { color: item.netProfit >= 0 ? 'green' : 'red' },
                  ]}
                >
                  {item.netProfit.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: width > 600 ? '32%' : '100%',
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#000000',
    textAlign: 'left',
  },
  rowData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  label: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
