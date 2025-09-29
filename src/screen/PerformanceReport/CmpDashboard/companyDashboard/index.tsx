import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getCompanyPnL, ManPowerSalaries } from '../../../../database/trailBalanceQueries';
import CustomHeader from '../../../../component/customHeader';
import { Colors } from '../../../../themes/color';

interface PnLRow {
  company: string;
  year: number | string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export default function CmpDashboard({ navigation, route }) {
  const { company } = route.params;
  const [data, setData] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchAdjustedPnL = async () => {
  //     setLoading(true);

  //     const allCompanies = await getCompanyPnL();
  //     const manPowerRows = await ManPowerSalaries();
  //     const manPowerTotalCost = manPowerRows.reduce((sum, row) => sum + row.totalCost, 0);

  //     // Filter for this company only
  //     let filtered = allCompanies.filter(item => item.company === company);

  //     // Split Man Power cost if this company is one of the three
  //     const splitPercentages: Record<string, number> = {
  //       'West Walk Real Estate': 0.22,
  //       'Assets Services Company': 0.6851,
  //       'West Walk Advertisement': 0.0949,
  //     };

  //     filtered = filtered.map(item => {
  //       let additionalCost = 0;
  //       if (item.year === 'Overall' && splitPercentages[item.company]) {
  //         additionalCost = manPowerTotalCost * splitPercentages[item.company];
  //       }

  //       const newCost = item.totalCost + additionalCost;
  //       const newNetProfit = item.totalRevenue + newCost;

  //       return {
  //         ...item,
  //         totalCost: newCost,
  //         netProfit: newNetProfit,
  //       };
  //     });

  //     setData(filtered);
  //     setLoading(false);
  //   };

  //   fetchAdjustedPnL();
  // }, [company]);

  // useEffect(() => {
  //   const fetchAdjustedPnL = async () => {
  //     setLoading(true);
  
  //     const allCompanies = await getCompanyPnL();
  //     const manPowerRows = await ManPowerSalaries();
  
  //     // Split Man Power cost if this company is one of the three
  //     const splitPercentages: Record<string, number> = {
  //       'West Walk Real Estate': 0.22,
  //       'Assets Services Company': 0.6851,
  //       'West Walk Advertisement': 0.0949,
  //     };
  
  //     // Filter for this company only
  //     let filtered = allCompanies.filter(item => item.company === company);
  
  //     filtered = filtered.map(item => {
  //       let additionalCost = 0;
  
  //       if (splitPercentages[item.company]) {
  //         if (item.year === 'Overall') {
  //           // Overall row → use total Man Power cost × percentage
  //           const totalManPowerCost = manPowerRows.reduce((sum, row) => sum + row.totalCost, 0);
  //           additionalCost = totalManPowerCost * splitPercentages[item.company];
  //         } else {
  //           // Yearly row → find Man Power for that year and apply percentage
  //           const mpRow = manPowerRows.find(row => row.year === item.year);
  //           if (mpRow) additionalCost = mpRow.totalCost * splitPercentages[item.company];
  //         }
  //       }
  
  //       const newCost = item.totalCost + additionalCost;
  //       const newNetProfit = item.totalRevenue + newCost; // correct formula
  
  //       return {
  //         ...item,
  //         totalCost: newCost,
  //         netProfit: newNetProfit,
  //       };
  //     });
  
  //     setData(filtered);
  //     setLoading(false);
  //   };
  
  //   fetchAdjustedPnL();
  // }, [company]);

  useEffect(() => {
    const fetchAdjustedPnL = async () => {
      setLoading(true);
  
      const allCompanies = await getCompanyPnL();
      const manPowerRows = await ManPowerSalaries();
  
      const splitPercentages: Record<string, number> = {
        'West Walk Real Estate': 0.22,
        'Assets Services Company': 0.6851,
        'West Walk Advertisement': 0.0949,
      };
  
      // Filter for this company
      const companyRows = allCompanies.filter(item => item.company === company);
  
      // Combine years from company + Man Power
      const allYears = new Set<number | string>();
      companyRows.forEach(r => allYears.add(r.year));
      manPowerRows.forEach(r => allYears.add(r.year));
      allYears.add('Overall'); // make sure Overall is included
  
      const combined: PnLRow[] = [];
  
      allYears.forEach(year => {
        const companyRow = companyRows.find(r => r.year === year);
        let revenue = companyRow?.totalRevenue || 0;
        let cost = companyRow?.totalCost || 0;
  
        let additionalCost = 0;
        if (splitPercentages[company]) {
          if (year === 'Overall') {
            const totalManPowerCost = manPowerRows.reduce((sum, r) => sum + r.totalCost, 0);
            additionalCost = totalManPowerCost * splitPercentages[company];
          } else {
            const mpRow = manPowerRows.find(r => r.year === year);
            if (mpRow) additionalCost = mpRow.totalCost * splitPercentages[company];
          }
        }
  
        cost += additionalCost;
        combined.push({
          company,
          year,
          totalRevenue: revenue,
          totalCost: cost,
          netProfit: revenue + cost, // correct calculation
        });
      });
  
      // Sort by year descending, Overall last
      combined.sort((a, b) => {
        if (a.year === 'Overall') return 1;
        if (b.year === 'Overall') return -1;
        return Number(b.year) - Number(a.year);
      });
  
      setData(combined);
      setLoading(false);
    };
  
    fetchAdjustedPnL();
  }, [company]);
  
  const overallData = data.filter(item => item.year === 'Overall');
  const yearWiseData = data.filter(item => item.year !== 'Overall');

  const renderItem = ({ item }: { item: PnLRow }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.year}</Text>
      <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text
        style={[styles.cell, { color: item.netProfit >= 0 ? 'green' : 'red' }]}
      >
        {item.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title={company} />

      {/* Summary Report */}
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
              <Text style={styles.metricValue}>{item.totalRevenue.toLocaleString()}</Text>
            </TouchableOpacity>

            {/* Cost Box */}
            <TouchableOpacity
              style={styles.metricBox}
              onPress={() =>
                navigation.navigate('SelectedCompany', {
                  company: item.company,
                  type: 'Cost',
                  additionalCostPerYear: yearWiseCostMap,
                })
              }
            >
              <Text style={styles.metricLabel}>Cost</Text>
              <Text style={styles.metricValue}>{item.totalCost.toLocaleString()}</Text>
            </TouchableOpacity>

            {/* Net Profit Box */}
            <TouchableOpacity
              style={styles.metricBox}
              onPress={() =>
                navigation.navigate('SelectedCompany', {
                  company: item.company,
                  type: '',
                  additionalCostPerYear: yearWiseCostMap,
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

      {/* Yearly Report */}
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
  container: { flex: 1, paddingTop: 30, paddingHorizontal: 24, backgroundColor: Colors.White },
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
    backgroundColor: Colors.CardColor,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  metricLabel: { fontSize: 14, color: '#000', marginBottom: 4, fontWeight: '600', textAlign: 'center' },
  metricValue: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#ccc' },
  cell: { flex: 1, textAlign: 'center' },
  header: { backgroundColor: '#eee', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: Colors.PrimaryColor },
});
