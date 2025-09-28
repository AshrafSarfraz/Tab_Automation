import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {getCompanyPnL} from '../../../../database/trailBalanceQueries';
import CustomHeader from '../../../../component/customHeader';
import { Colors } from '../../../../themes/color';

interface PnLRow {
  company: string;
  year: number | string; // Overall row will have string
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export default function CmpDashboard({navigation, route}) {
  const {company} = route.params;
  console.log(company);
  const [data, setData] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPnL = async () => {
      setLoading(true);
      const results = await getCompanyPnL();
      const filtered = results.filter(item => item.company === company);
      setData(filtered);
      setLoading(false);
    };
    fetchPnL();
  }, []);

  // Separate overall totals
  const overallData = data.filter(item => item.year === 'Overall');
  const yearWiseData = data.filter(item => item.year !== 'Overall');

  const renderItem = ({item}: {item: PnLRow}) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.year}</Text>
      <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text
        style={[styles.cell, {color: item.netProfit >= 0 ? 'green' : 'red'}]}>
        {item.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title={company} />
     <View style={{}} >
     <Text style={styles.title}>Summary Report</Text>
     <FlatList
  data={overallData}
  renderItem={({ item }) => (
    <View style={styles.Report_Cont}>
      {/* Revenue Box */}
      <TouchableOpacity
        style={styles.metricBox}
        onPress={() =>
          navigation.navigate('SelectedCompany', {
            company: item.company,
            type: 'Revenue',
          })
        }
      >
        <Text style={styles.metricLabel}>Revenue</Text>
        <Text style={styles.metricValue}>
          {item.totalRevenue.toLocaleString()}
        </Text>
      </TouchableOpacity>

      {/* Cost Box */}
      <TouchableOpacity
        style={styles.metricBox}
        onPress={() =>
          navigation.navigate('SelectedCompany', {
            company: item.company,
            type: 'Cost',
          })
        }
      >
        <Text style={styles.metricLabel}>Cost</Text>
        <Text style={styles.metricValue}>
          {item.totalCost.toLocaleString()}
        </Text>
      </TouchableOpacity>

      {/* Net Profit Box */}
      <TouchableOpacity
        style={styles.metricBox}
        onPress={() =>
          navigation.navigate('SelectedCompany', {
            company: item.company,
            type: '', // empty type
          })
        }
      >
        <Text style={styles.metricLabel}>Net Profit</Text>
        <Text
          style={[
            styles.metricValue,
            { color: item.netProfit >= 0 ? 'green' : 'red' },
          ]}
        >
          {item.netProfit.toLocaleString()}
        </Text>
      </TouchableOpacity>
    </View>
  )}
  keyExtractor={(item, index) => item.company + index}
/>

      </View>

      <Text style={styles.title}>Yearly Report</Text>
      <View style={[styles.row, styles.header]}>
        <Text style={styles.cell}>Year</Text>
        <Text style={styles.cell}>Revenue</Text>
        <Text style={styles.cell}>Cost</Text>
        <Text style={styles.cell}>Net Profit</Text>
      </View>
      <FlatList
        data={yearWiseData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.company + item.year + index}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingTop: 30, paddingHorizontal: 24 , backgroundColor:Colors.White },
  Report_Cont: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 30,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor:Colors.CardColor,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  metricLabel: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  cell: {flex: 1, textAlign: 'center'},
  header: {backgroundColor: '#eee', fontWeight: 'bold'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom:5,
    color: Colors.PrimaryColor,
  },
});
