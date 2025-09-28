// TrialBalance.tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import { getAllTrialBalances, TrialBalanceRow } from '../../../../database/trailBalanceQueries';
import CustomHeader from '../../../../component/customHeader';
import { Colors } from '../../../../themes/color';

const {width} = Dimensions.get('window');
const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type RowItem = TrialBalanceRow & {
  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: 'Revenue' | 'Cost' | 'Grand';
  totalBalances?: number[];
  totalSum?: number;
};

export default function SelectedCompany() {
  const route = useRoute();
  const { company = "", type = "" } = (route.params ?? {}) as { company?: string; type?: string };
  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allRows = await getAllTrialBalances();
  
         // Filter rows by company + type
         let filteredRows = allRows.filter(row => {
          let matches = true;
          if (company) matches = matches && row.company === company;
          if (type) matches = matches && row.type === type;
          return matches;
        });
  
        // --- Revenue adjustment first ---
        filteredRows = filteredRows.map(r => {
          if (r.type === "Revenue" && r.accountno === "41112" && r.cc2 === "Residential Rental") {
            return { ...r, component: "Residential", accountno: "41111" };
          }
          return r;
        });
  
        // Sort: Year DESC → Accountno → CC3
        filteredRows.sort((a, b) => {
          if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
          if (a.accountno !== b.accountno) return (a.accountno || "").localeCompare(b.accountno || "");
          return (a.cc3code || "").localeCompare(b.cc3code || "");
        });
  
        // Structure by year
        const structured: RowItem[] = [];
        const years = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);
  
        years.forEach(year => {
          const yearRows = filteredRows.filter(r => r.year === year);
  
          // Year Header
          structured.push({ yearHeader: true, company, year } as RowItem);
  
          // --- Revenue ---
          let revenueRows = yearRows.filter(r => r.type === "Revenue");
  
          // Group Revenue by accountno + cc3code
          const revenueByKey: Record<string, RowItem> = {};
          revenueRows.forEach(r => {
            const key = (r.accountno || '') + '||' + (r.cc3code || '');
            if (!revenueByKey[key]) {
              const balances = Array(12).fill(0);
              if (r.month >= 1 && r.month <= 12) balances[r.month - 1] = r.balanceFirst || 0;
              revenueByKey[key] = {
                ...r,
                totalBalances: balances,
                totalSum: (r.balanceFirst || 0),
              };
            } else {
              if (r.month >= 1 && r.month <= 12) {
                revenueByKey[key].totalBalances![r.month - 1] += r.balanceFirst || 0;
              }
              revenueByKey[key].totalSum = revenueByKey[key].totalBalances!.reduce((a, b) => a + b, 0);
            }
          });
  
          const groupedRevenue = Object.values(revenueByKey);
          structured.push(...groupedRevenue);
  
          // Revenue total row
          if (groupedRevenue.length > 0) {
            const revBalances = Array(12).fill(0);
            groupedRevenue.forEach(r => r.totalBalances?.forEach((b, i) => { revBalances[i] += b; }));
            structured.push({
              isTotalRow: true,
              totalType: "Revenue",
              company,
              totalBalances: revBalances,
              totalSum: revBalances.reduce((a, b) => a + b, 0),
            } as RowItem);
          }




          // --- Cost: group by accountno + auxcode ---
          const costRows = yearRows.filter(r => r.type === "Cost");
          let groupedCost: RowItem[] = [];
          const costByKey: Record<string, TrialBalanceRow[]> = {};
  
          costRows.forEach(r => {
            if (!r.accountno) return;
            const key = r.accountno + '||' + (r.auxcode || '');
            if (!costByKey[key]) costByKey[key] = [];
            costByKey[key].push(r);
          });
  
          Object.keys(costByKey).forEach(key => {
            const rows = costByKey[key];
            const summedBalances = Array(12).fill(0);
            rows.forEach(r => {
              if (r.month >= 1 && r.month <= 12) summedBalances[r.month - 1] += r.balanceFirst || 0;
            });
            groupedCost.push({
              type: "Cost",
              company,
              accountno: rows[0].accountno,
              auxcode: rows[0].auxcode,
              component: rows[0].component || "",
              cc2: rows[0].cc2,
              cc3code: rows[0].cc3code,
              totalBalances: summedBalances,
              totalSum: summedBalances.reduce((a, b) => a + b, 0),
            } as RowItem);
          });
  
          // --- Merge rows with empty auxcode & same component ---
          const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
          const mergedMap: Record<string, RowItem> = {};
  
          emptyAuxRows.forEach(r => {
            const key = r.component || '';
            if (!mergedMap[key]) {
              mergedMap[key] = { ...r };
            } else {
              // Merge balances
              mergedMap[key].totalBalances = mergedMap[key].totalBalances?.map(
                (b, i) => b + (r.totalBalances?.[i] || 0)
              );
              mergedMap[key].totalSum = mergedMap[key].totalBalances?.reduce((a, b) => a + b, 0);
              mergedMap[key].accountno += ', ' + r.accountno; // combine account numbers
            }
          });
  
          // Remove original empty auxcode rows and add merged rows
          groupedCost = groupedCost.filter(r => r.auxcode);
          groupedCost.push(...Object.values(mergedMap));
  
          structured.push(...groupedCost);
  
          // --- Cost total row ---
          if (groupedCost.length > 0) {
            const costBalances = Array(12).fill(0);
            groupedCost.forEach(r => r.totalBalances?.forEach((b, i) => { costBalances[i] += b; }));
            structured.push({
              isTotalRow: true,
              totalType: "Cost",
              company,
              totalBalances: costBalances,
              totalSum: costBalances.reduce((a, b) => a + b, 0),
            } as RowItem);
          }
  
          // --- Net Profit (Revenue - Cost) ---
          if (revenueRows.length > 0 || groupedCost.length > 0) {
            const netBalances = Array(12).fill(0);
            for (let i = 0; i < 12; i++) {
              const rev = revenueRows.reduce((sum, r) => sum + (r.month === i + 1 ? r.balanceFirst || 0 : 0), 0);
              const cost = groupedCost.reduce((sum, r) => sum + (r.totalBalances?.[i] || 0), 0);
              netBalances[i] = rev - cost;
            }
            structured.push({
              isTotalRow: true,
              totalType: "Grand",
              company,
              totalBalances: netBalances,
              totalSum: netBalances.reduce((a, b) => a + b, 0),
            } as RowItem);
          }
  
        });
  
        setData(structured);
      } catch (err) {
        setError('Failed to load trial balance from SQLite');
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
  
    loadData();
  }, [company, type]);
  

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, {width: 90}]}>Type</Text>
      <Text style={[styles.cell, {width: 180}]}>Component</Text>
      <Text style={[styles.cell, {width: 100}]}>Account</Text>
      <Text style={[styles.cell, {width: 100}]}>CC3/AuxCode</Text>
      <Text style={[styles.cell, {width: 100, textAlign: 'right'}]}>Total</Text>
      {months.map(m => (
        <Text key={m} style={[styles.cell, {width: 120, textAlign: 'right'}]}>{m}</Text>
      ))}
     
    </View>
  );

  const renderRow = ({item}: {item: RowItem}) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.row, styles.yearHeader]}>
          <Text style={{fontWeight: 'bold', fontSize: 16}}>
            {item.company} - {item.year}
          </Text>
        </View>
      );
    }

    // Total row (Revenue / Cost / Grand)
    if (item.isTotalRow) {
      let bgColor = '#f0f8ff';
      if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
      if (item.totalType === 'Cost') bgColor = '#f7d1d1';
      if (item.totalType === 'Grand') bgColor = '#ffe4b5';
      const label = item.totalType === 'Grand' ? 'Net Total' : item.totalType + ' Total';

      return (
        <View style={[styles.row, {backgroundColor: bgColor, borderTopWidth: 2, borderColor: '#aaa'}]}>
          <Text style={[styles.cell, {width: 90, fontWeight: 'bold'}]}>{label}</Text>
          <Text style={[styles.cell, {width: 180}]}>{item.company}</Text>
          <Text style={[styles.cell, {width: 100}]}></Text>
          <Text style={[styles.cell, {width: 100}]}></Text>
          <Text style={[styles.cell, {width: 100, textAlign: 'right', fontWeight: 'bold'}]}>{item.totalSum?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
          {item.totalBalances?.map((b, idx) => (
            <Text key={idx} style={[styles.cell, {width: 120, textAlign: 'right', fontWeight: 'bold'}]}>{b.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
          ))}
        
        </View>
      );
    }

    // Normal row
    const balances: number[] = item.totalBalances
      ? item.totalBalances
      : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? item.balanceFirst || 0 : 0));
    const total = balances.reduce((s, b) => s + b, 0);

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, {width: 90}]}>{item.type}</Text>
        <Text style={[styles.cell, {width: 180}]}>{item.component}</Text>
        <Text style={[styles.cell, {width: 100}]}>{item.accountno}</Text>
        <Text style={[styles.cell, {width: 100}]}>    {item.type === 'Revenue' ? item.cc3code : item.auxcode}</Text>
        <Text style={[styles.cell, {width: 100, textAlign: 'right'}]}>{total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
        {balances.map((b, idx) => (
          <Text key={idx} style={[styles.cell, {width: 120, textAlign: 'right'}]}>{b.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
        ))}
      
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Colors.PrimaryColor} />
    </View>
  );

  if (error) return (
    <View style={styles.centered}>
      <Text>{error}</Text>
    </View>
  );

  return (
    <View style={styles.Container}>
      <CustomHeader title="Trial Balance Sheet" />
      <ScrollView horizontal>
        <FlatList
          data={data}
          keyExtractor={(_, index) => index.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={renderRow}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: Colors.White,
    paddingHorizontal: width > 600 ? 24 : 10,
    paddingTop: width > 600 ? 20 : 35,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  header: {backgroundColor: Colors.Bg, borderBottomWidth: 2},
  cell: {paddingHorizontal: 8, fontSize: width > 600 ? 12: 12},
  yearHeader: {
    backgroundColor: '#eee',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
});
