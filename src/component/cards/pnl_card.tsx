// PnlCardModern.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../themes/color';
import { getOverallPnL, ManPowerSalaries, PnLRow } from '../../database/trailBalanceQueries';
import Companies from './ProjectCard';

const { width } = Dimensions.get('window');

const PnlCardModern = ({ navigation }) => {
  const [overall, setOverall] = useState<PnLRow | null>(null);
  const [data, setData] = useState<PnLRow[]>([]);
  const isTablet = width > 600;

  useEffect(() => {
    const fetchPnL = async () => {
      const result = await getOverallPnL();
      if (result.length) {
        const totalRevenue = result.reduce((sum, d) => sum + d.totalRevenue, 0);
        const totalCost = result.reduce((sum, d) => sum + d.totalCost, 0);
        const netProfit = totalRevenue + totalCost;
        setOverall({ year: 0, totalRevenue, totalCost, netProfit });
        setData(result); // yearly data
      }
    };
    fetchPnL();
  }, []);

  // useEffect(() => {
  //   const fetchPnL = async () => {
  //     const result = await getOverallPnL(); // your existing yearly/company data
  //     const manPower = await ManPowerSalaries(); // get Man Power / Salaries cost
  
  //     const manPowerTotalCost = manPower.reduce((sum, d) => sum - d.totalCost, 0);
  
  //     if (result.length) {
  //       const totalRevenue = result.reduce((sum, d) => sum + d.totalRevenue, 0); // subtract Man Power cost
  //       const totalCost = result.reduce((sum, d) => sum + d.totalCost, 0) - manPowerTotalCost; // add Man Power cost
  //       const netProfit = totalRevenue + totalCost; // recalc net profit
  
  //       setOverall({ year: 0, totalRevenue, totalCost, netProfit });
  //       setData(result); // yearly data stays same
  //     }
  //   };
  //   fetchPnL();
  // }, []);
  

  if (!overall) return null;

  const metrics = [
    {
      label: 'Net Profit',
      value: `${overall.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      color: Colors.Green,
      type: null,
    },
    {
      label: 'Total Revenue',
      value: `${overall.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      color: Colors.Black,
      type: 'Revenue',
    },
    {
      label: 'Total Expense',
      value: `${overall.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      color: 'red',
      type: 'Cost',
    },
  ];

  const handleMetricClick = (type: 'Revenue' | 'Cost' | null) => {
    if (!type) {
      // Net Profit clicked
      navigation.navigate('TrialBalanceList'); // simple navigate
      return;
    }

    // Revenue or Cost clicked
    navigation.navigate('TrialBalanceList', { type }); // send param
  };

  const renderRow = ({ item }: { item: PnLRow }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.year]}>{item.year}</Text>
      <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.cell}>
        {(item.totalRevenue + item.totalCost).toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.Summary_Txt} >Summary Report</Text>
      <View
        style={[styles.metricsRow, { flexDirection: isTablet ? 'row' : 'column' }]}>
        {metrics.map((metric, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.metricBox, { width: isTablet ? '31%' : '100%' }]}
            // onPress={() => handleMetricClick(metric.type)}
          >
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.metricValue, { color: metric.color }]}>
              {metric.value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Companies */}
      <Text style={styles.title}>Companies</Text>
     
     
      <Companies navigation={navigation} />

      {/* Yearly Table */}
      <Text style={styles.Year_Txt}>Yearly Report</Text>
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={[styles.tableRow, styles.header]}>
          <Text style={[styles.cell, styles.year, styles.headerText]}>Year</Text>
          <Text style={[styles.cell, styles.headerText]}>Revenue</Text>
          <Text style={[styles.cell, styles.headerText]}>Expense</Text>
          <Text style={[styles.cell, styles.headerText]}>Net Profit</Text>
        </View>

        {/* Rows */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.year.toString()}
          renderItem={renderRow}
          scrollEnabled={false}
          contentContainerStyle={{ flexGrow: 0 }}
        />

        {/* Total */}
        <View style={[styles.tableRow, styles.totalRow]}>
          <Text style={[styles.cell, styles.year, styles.totalText]}>Total</Text>
          <Text style={[styles.cell, styles.totalText]}>
            {overall.totalRevenue.toLocaleString('en-US')}
          </Text>
          <Text style={[styles.cell, styles.totalText]}>
            {overall.totalCost.toLocaleString('en-US')}
          </Text>
          <Text style={[styles.cell, styles.totalText]}>
            {overall.netProfit.toLocaleString('en-US')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PnlCardModern;

const styles = StyleSheet.create({
  Summary_Txt:{
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop:20,
    color: Colors.Black,
  },
  card: {
    backgroundColor: Colors.White,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,

  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 15,
    color: Colors.Black,
  },
  Year_Txt:{
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: Colors.Black,
  },
  metricsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBox: {
    height:130,
    backgroundColor: '#f9f8f9',
    borderRadius: 8,
    padding:20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.3,

  },
  metricLabel: {
    fontSize: 16,
    color: Colors.Black,
    marginBottom: 16,
    fontWeight:"bold",
    alignSelf:"flex-start",
    justifyContent:"flex-start"
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom:60
  },
  tableRow: {
    width: '100%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
  },
  header: {
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  headerText: {
    fontWeight: '700',
  },
  totalRow: {
    backgroundColor: '#e0e0e0',
  },
  totalText: {
    fontWeight: '700',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.Black,
  },
  year: {
    fontWeight: 'bold',
  },
});
