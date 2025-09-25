// PnlCardModern.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../themes/color';
import { getOverallPnL, PnLRow } from '../../database/trailBalanceQueries';
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

  if (!overall) return null;

  const metrics = [
    {
      label: 'Net Profit',
      value: `${overall.netProfit.toFixed(2)} QAR`,
      color: Colors.Green,
      type: null,
    },
    {
      label: 'Total Revenue',
      value: `${overall.totalRevenue.toFixed(2)} QAR`,
      color: Colors.Green,
      type: 'Revenue',
    },
    {
      label: 'Total Expense',
      value: `${overall.totalCost.toFixed(2)} QAR`,
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
      <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US')}</Text>
      <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US')}</Text>
      <Text style={styles.cell}>
        {(item.totalRevenue + item.totalCost).toLocaleString('en-US')}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Metrics */}
      <View
        style={[styles.metricsRow, { flexDirection: isTablet ? 'row' : 'column' }]}
      >
        {metrics.map((metric, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.metricBox, { width: isTablet ? '32%' : '100%' }]}
            onPress={() => handleMetricClick(metric.type)}
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
      <Text style={styles.title}>Yearly Report</Text>
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
  card: {
    backgroundColor: Colors.White,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    color: Colors.PrimaryColor,
  },
  metricsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBox: {
    backgroundColor: Colors.CardColor,
    borderRadius: 12,
    paddingVertical: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.2,
    borderColor: Colors.Grey,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.Black,
    marginBottom: 6,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
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
