import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyPnL, ManPowerSalaries } from '../../../../database/trailBalanceQueries';
import CustomHeader from '../../../../component/customHeader';
import { Colors } from '../../../../themes/color';



// ...imports same...

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
  const [refreshing, setRefreshing] = useState(false);

  const STORAGE_KEY = `pnl:${company}:latest`;

  const saveSnapshot = async (rows: PnLRow[]) => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), rows }));
    } catch (e) {
      console.warn('Snapshot save failed', e);
    }
  };

  // 👉 common split map (same as before)
  const splitPercentages: Record<string, number> = {
    'West Walk Real Estate': 0.22,
    'Assets Services Company': 0.6851,
    'West Walk Advertisement': 0.0949,
  };


  const calcBaseRows = async (companyName: string) => {
    const allCompanies = await getCompanyPnL();
    const manPowerRows = await ManPowerSalaries();

    const rowsForCompany = allCompanies.filter(r => r.company === companyName);

    const years = new Set<number | string>();
    rowsForCompany.forEach(r => years.add(r.year));
    manPowerRows.forEach(r => years.add(r.year));
    years.add('Overall');

    const pct = splitPercentages[companyName] ?? 0;
    const byYear = new Map<number | string, { revenue: number; cost: number; net: number }>();

    years.forEach(year => {
      const base = rowsForCompany.find(r => r.year === year);
      let revenue = base?.totalRevenue ?? 0;
      let cost = base?.totalCost ?? 0;

      // manpower share
      if (pct > 0) {
        if (year === 'Overall') {
          const totalMPCost = manPowerRows.reduce((s, r) => s + (r.totalCost || 0), 0);
          cost += totalMPCost * pct;
        } else {
          const mp = manPowerRows.find(r => r.year === year);
          if (mp?.totalCost) cost += mp.totalCost * pct;
        }
      }

      const net = revenue + cost;
      byYear.set(year, { revenue, cost, net });
    });

    return byYear; // Map with 'Overall' and numeric years
  };

  /** ---------------- MAIN compute for selected company ---------------- */
  const computeAdjustedPnL = async (): Promise<PnLRow[]> => {
    // 1) Base rows (selected company)
    const allCompanies = await getCompanyPnL();
    const manPowerRows = await ManPowerSalaries();

    const companyRows = allCompanies.filter(item => item.company === company);

    const allYears = new Set<number | string>();
    companyRows.forEach(r => allYears.add(r.year));
    manPowerRows.forEach(r => allYears.add(r.year));
    allYears.add('Overall');

    const combined: PnLRow[] = [];
    allYears.forEach(year => {
      const companyRow = companyRows.find(r => r.year === year);
      let revenue = companyRow?.totalRevenue || 0;
      let cost = companyRow?.totalCost || 0;

      // manpower allocation for selected company
      const pct = splitPercentages[company] ?? 0;
      if (pct > 0) {
        if (year === 'Overall') {
          const totalManPowerCost = manPowerRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
          cost += totalManPowerCost * pct;
        } else {
          const mpRow = manPowerRows.find(r => r.year === year);
          if (mpRow?.totalCost) cost += mpRow.totalCost * pct;
        }
      }

      combined.push({
        company,
        year,
        totalRevenue: revenue,
        totalCost: cost,
        netProfit: revenue + cost,
      });
    });

    // 2) If current is WWRE, apply transfers using ASC & WWA original nets (before zeroing)
    if (company === 'West Walk Real Estate') {
      const ascBase = await calcBaseRows('Assets Services Company');
      const wwaBase = await calcBaseRows('West Walk Advertisement');

      for (let i = 0; i < combined.length; i++) {
        const y = combined[i].year;
        const ascNet = ascBase.get(y)?.net ?? 0;
        const wwaNet = wwaBase.get(y)?.net ?? 0;

        // ASC net → WWRE cost (expense it): cost += -ascNet
        combined[i].totalCost += -ascNet;

        // WWA net → WWRE revenue: revenue += +wwaNet
        combined[i].totalRevenue += wwaNet;

        // recompute
        combined[i].netProfit = combined[i].totalRevenue + combined[i].totalCost;
      }
    }

    // 3) sort: years desc, Overall last
    combined.sort((a, b) => {
      if (a.year === 'Overall') return 1;
      if (b.year === 'Overall') return -1;
      return Number(b.year) - Number(a.year);
    });

    return combined;
  };

  /** ---------------- ZEROING for this screen’s company only ----------------
   * ASC: revenue += (-netProfit)
   * WWA: cost    += (-netProfit)
   * WWRE: no zeroing (aapke rule me nahi diya)
   */
  const zeroOutAccordingToRules = (rows: PnLRow[]): PnLRow[] =>
    rows.map(row => {
      const refNet = row.netProfit;
      const adjustment = -refNet;

      if (company === 'Assets Services Company') {
        row.totalRevenue += adjustment;
      } else if (company === 'West Walk Advertisement') {
        row.totalCost += adjustment;
      }
      row.netProfit = row.totalRevenue + row.totalCost;
      return row;
    });

  // ------------ load / refresh ------------
  const loadFresh = useCallback(async () => {
    try {
      setLoading(true);
      const base = await computeAdjustedPnL();
      const finalRows = zeroOutAccordingToRules(base);
      setData(finalRows);
      await saveSnapshot(finalRows);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    loadFresh();
  }, [loadFresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const base = await computeAdjustedPnL();
      const finalRows = zeroOutAccordingToRules(base);
      setData(finalRows);
      await saveSnapshot(finalRows);
    } finally {
      setRefreshing(false);
    }
  }, [company]);

  // ------------ UI (unchanged) ------------
  const overallData = data.filter(item => item.year === 'Overall');
  const yearWiseData = data.filter(item => item.year !== 'Overall');

  const renderItem = ({ item }: { item: PnLRow }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.year}</Text>
      <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
      <Text style={[styles.cell, { color: item.netProfit >= 0 ? 'green' : 'red' }]}>
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

      <Text style={styles.title}>Summary Report</Text>
      <FlatList
        data={overallData}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.Report_Cont}>
            <TouchableOpacity
              style={styles.metricBox}
              onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: 'Revenue' })}
            >
              <Text style={styles.metricLabel}>Revenue</Text>
              <Text style={styles.metricValue}>{item.totalRevenue.toLocaleString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metricBox}
              onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: 'Cost' })}
            >
              <Text style={styles.metricLabel}>Cost</Text>
              <Text style={styles.metricValue}>{item.totalCost.toLocaleString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metricBox}
              onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: '' })}
            >
              <Text style={styles.metricLabel}>Net Profit</Text>
              <Text style={[styles.metricValue, { color: item.netProfit >= 0 ? 'green' : 'red' }]}>
                {item.netProfit.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item, index) => item.company + index}
      />

      <Text style={styles.title}>Yearly Report</Text>
      <View style={[styles.row, styles.header]}>
        <Text style={styles.cell}>Year</Text>
        <Text style={styles.cell}>Revenue</Text>
        <Text style={styles.cell}>Cost</Text>
        <Text style={styles.cell}>Net Profit</Text>
      </View>
      <FlatList
        data={yearWiseData}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.company + String(item.year) + index}
      />
    </View>
  );
}





const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 30, paddingHorizontal: 24, backgroundColor: Colors.White },
  Report_Cont: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  metricBox: {
    flex: 1, borderRadius: 12, paddingVertical: 30, paddingHorizontal: 10, marginHorizontal: 4,
    alignItems: 'center', backgroundColor: Colors.CardColor, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
  metricLabel: { fontSize: 14, color: '#000', marginBottom: 4, fontWeight: '600', textAlign: 'center' },
  metricValue: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderColor: '#ccc' },
  cell: { flex: 1, textAlign: 'center' },
  header: { backgroundColor: '#eee', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: Colors.PrimaryColor },
});




// interface PnLRow {
//   company: string;
//   year: number | string;
//   totalRevenue: number;
//   totalCost: number;
//   netProfit: number;
// }

// export default function CmpDashboard({ navigation, route }) {
//   const { company } = route.params;
//   const [data, setData] = useState<PnLRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   // unique key per company (snapshot)
//   const STORAGE_KEY = `pnl:${company}:latest`;

//   // --- snapshot write (delete then save) ---
//   const saveSnapshot = async (rows: PnLRow[]) => {
//     try {
//       await AsyncStorage.removeItem(STORAGE_KEY);
//       await AsyncStorage.setItem(
//         STORAGE_KEY,
//         JSON.stringify({ savedAt: Date.now(), rows })
//       );
//     } catch (e) {
//       console.warn('Snapshot save failed', e);
//     }
//   };

//   // 👉 calc + fresh fetch from SQLite
//   const computeAdjustedPnL = async (): Promise<PnLRow[]> => {
//     const allCompanies = await getCompanyPnL();
//     const manPowerRows = await ManPowerSalaries();

//     const splitPercentages: Record<string, number> = {
//       'West Walk Real Estate': 0.22,
//       'Assets Services Company': 0.6851,
//       'West Walk Advertisement': 0.0949,
//     };

//     // company rows
//     const companyRows = allCompanies.filter(item => item.company === company);

//     // merge years (company + manpower)
//     const allYears = new Set<number | string>();
//     companyRows.forEach(r => allYears.add(r.year));
//     manPowerRows.forEach(r => allYears.add(r.year));
//     allYears.add('Overall');

//     const combined: PnLRow[] = [];

//     allYears.forEach(year => {
//       const companyRow = companyRows.find(r => r.year === year);
//       let revenue = companyRow?.totalRevenue || 0;
//       let cost = companyRow?.totalCost || 0;

//       let additionalCost = 0;
//       const pct = splitPercentages[company] ?? 0;

//       if (pct > 0) {
//         if (year === 'Overall') {
//           const totalManPowerCost = manPowerRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
//           additionalCost = totalManPowerCost * pct;
//         } else {
//           const mpRow = manPowerRows.find(r => r.year === year);
//           if (mpRow?.totalCost) additionalCost = mpRow.totalCost * pct;
//         }
//       }

//       cost += additionalCost;

//       combined.push({
//         company,
//         year,
//         totalRevenue: revenue,
//         totalCost: cost,
//         netProfit: revenue + cost, // ✅ tumhari convention (cost negative aati hai)
//       });
//     });

//     combined.sort((a, b) => {
//       if (a.year === 'Overall') return 1;
//       if (b.year === 'Overall') return -1;
//       return Number(b.year) - Number(a.year);
//     });

//     return combined;
//   };

//   // --- ZEROING RULES: ASC & WWA ---
//   // NOTE: ab hamesha current calculated netProfit ko ref maan rahe hain
//   const zeroOutAccordingToRules = (rows: PnLRow[]): PnLRow[] =>
//     rows.map(row => {
//       const refNet = row.netProfit;           // fresh calc se liya
//       const adjustment = -refNet;             // kyun ke netProfit = revenue + cost

//       if (company === 'Assets Services Company') {
//         // ASC: revenue adjust → revenue += (-netProfit)
//         row.totalRevenue = row.totalRevenue + adjustment;
//       } else if (company === 'West Walk Advertisement') {
//         // WWA: cost adjust → cost += (-netProfit)
//         row.totalCost = row.totalCost + adjustment;
//       }

//       row.netProfit = row.totalRevenue + row.totalCost; // recompute
//       return row;
//     });

//   // 👉 DB->calc->zeroing->save->UI
//   const loadFresh = useCallback(async () => {
//     try {
//       const base = await computeAdjustedPnL();      // fresh calc
//       const zeroed = zeroOutAccordingToRules(base); // first visit pe bhi zero
//       setData(zeroed);
//       await saveSnapshot(zeroed);                   // snapshot sirf save
//     } finally {
//       setLoading(false);
//     }
//   }, [company]);

//   useEffect(() => {
//     setLoading(true);
//     loadFresh();
//   }, [loadFresh]);

//   // pull-to-refresh
//   const onRefresh = async () => {
//     setRefreshing(true);
//     try {
//       const base = await computeAdjustedPnL();
//       const zeroed = zeroOutAccordingToRules(base);
//       setData(zeroed);
//       await saveSnapshot(zeroed);
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   const overallData = data.filter(item => item.year === 'Overall');
//   const yearWiseData = data.filter(item => item.year !== 'Overall');

//   const renderItem = ({ item }: { item: PnLRow }) => (
//     <View style={styles.row}>
//       <Text style={styles.cell}>{item.year}</Text>
//       <Text style={styles.cell}>{item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
//       <Text style={styles.cell}>{item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
//       <Text style={[styles.cell, { color: item.netProfit >= 0 ? 'green' : 'red' }]}>
//         {item.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#000" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <CustomHeader title={company} />

//       {/* Summary Report */}
//       <Text style={styles.title}>Summary Report</Text>
//       <FlatList
//         data={overallData}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         renderItem={({ item }) => (
//           <View style={styles.Report_Cont}>
//             <TouchableOpacity
//               style={styles.metricBox}
//               onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: 'Revenue' })}
//             >
//               <Text style={styles.metricLabel}>Revenue</Text>
//               <Text style={styles.metricValue}>{item.totalRevenue.toLocaleString()}</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.metricBox}
//               onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: 'Cost' })}
//             >
//               <Text style={styles.metricLabel}>Cost</Text>
//               <Text style={styles.metricValue}>{item.totalCost.toLocaleString()}</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.metricBox}
//               onPress={() => navigation.navigate('SelectedCompany', { company: item.company, type: '' })}
//             >
//               <Text style={styles.metricLabel}>Net Profit</Text>
//               <Text style={[styles.metricValue, { color: item.netProfit >= 0 ? 'green' : 'red' }]}>
//                 {item.netProfit.toLocaleString()}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}
//         keyExtractor={(item, index) => item.company + index}
//       />

//       {/* Yearly Report */}
//       <Text style={styles.title}>Yearly Report</Text>
//       <View style={[styles.row, styles.header]}>
//         <Text style={styles.cell}>Year</Text>
//         <Text style={styles.cell}>Revenue</Text>
//         <Text style={styles.cell}>Cost</Text>
//         <Text style={styles.cell}>Net Profit</Text>
//       </View>
//       <FlatList
//         data={yearWiseData}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         renderItem={renderItem}
//         keyExtractor={(item, index) => item.company + String(item.year) + index}
//       />
//     </View>
//   );
// }