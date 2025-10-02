import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllTrialBalances, getCompanyPnL, ManPowerSalaries, TrialBalanceRow } from '../../database/trailBalanceQueries';
import { Colors } from '../../themes/color';

interface PnLRow {
  company: string;
  year: number | string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

type YearKey = number | 'Overall';

const STORAGE_KEY = (c: string) => `pnl:${c}:latest`;

function buildRowsForCompanyWithMovedNet(
  company: string,
  allCompanies: any[],
  manPowerRows: any[],
  splitPercentages: Record<string, number>
): { rows: PnLRow[]; movedNetByYear: Record<YearKey, number> } {
  const companyRows = allCompanies.filter(r => r.company === company);

  const years = new Set<YearKey>();
  companyRows.forEach(r => years.add(r.year));
  manPowerRows.forEach(r => years.add(r.year as number));
  years.add('Overall');

  const preZeroRows: PnLRow[] = [];
  const movedNetByYear: Record<YearKey, number> = {};

  years.forEach(year => {
    const base = companyRows.find(r => r.year === year);
    let revenue = base?.totalRevenue || 0;
    let cost = base?.totalCost || 0;

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

    const net = revenue + cost; // cost negative by convention
    movedNetByYear[year] = net; // capture BEFORE zeroing

    preZeroRows.push({
      company,
      year,
      totalRevenue: revenue,
      totalCost: cost,
      netProfit: net,
    });
  });

  // ZEROING (ASC: revenue adjust, WWA: cost adjust)
  const zeroed = preZeroRows.map(r => {
    const refNet = r.netProfit;
    const adjustment = -refNet;
    if (company === 'Assets Services Company') {
      r.totalRevenue += adjustment;
    } else if (company === 'West Walk Advertisement') {
      r.totalCost += adjustment;
    }
    r.netProfit = r.totalRevenue + r.totalCost;
    return r;
  });

  zeroed.sort((a, b) => {
    if (a.year === 'Overall') return 1;
    if (b.year === 'Overall') return -1;
    return Number(b.year) - Number(a.year);
  });

  return { rows: zeroed, movedNetByYear };
}

export default function Companies({ navigation }) {
  const [overallData, setOverallData] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(true);

  // responsive card width
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  // useEffect(() => {
  //   let isMounted = true;

  //   const fetchAndSaveAll = async () => {
  //     try {
  //       setLoading(true);

  //       const allCompanies = await getCompanyPnL();
  //       const manPowerRows = await ManPowerSalaries();

  //       const companyNames = Array.from(
  //         new Set(
  //           allCompanies
  //             .map(r => r.company)
  //             .filter(c => c && c !== 'Man Power / Salaries')
  //         )
  //       );

  //       const splitPercentages: Record<string, number> = {
  //         'West Walk Real Estate': 0.22,
  //         'Assets Services Company': 0.6851,
  //         'West Walk Advertisement': 0.0949,
  //       };

  //       // 1) Build all companies once (zeroed) + capture pre-zero nets
  //       const perCompany: Record<string, { rows: PnLRow[]; movedNetByYear: Record<YearKey, number> }> = {};
  //       for (const name of companyNames) {
  //         perCompany[name] = buildRowsForCompanyWithMovedNet(
  //           name,
  //           allCompanies,
  //           manPowerRows,
  //           splitPercentages
  //         );
  //       }

  //       // 2) Apply transfers to WWRE: ASC net -> cost ; WWA net -> revenue (per-year + Overall)
  //       const wwre = perCompany['West Walk Real Estate'];
  //       if (wwre) {
  //         const ascMoved = perCompany['Assets Services Company']?.movedNetByYear || {};
  //         const wwaMoved = perCompany['West Walk Advertisement']?.movedNetByYear || {};

  //         wwre.rows = wwre.rows.map(r => {
  //           const year = r.year as YearKey;
  //           const ascNet = ascMoved[year] ?? 0;
  //           const wwaNet = wwaMoved[year] ?? 0;

  //           // cost is negative; add expense by subtracting ascNet
  //           r.totalCost += -ascNet;
  //           // revenue add wwaNet
  //           r.totalRevenue += wwaNet;

  //           r.netProfit = r.totalRevenue + r.totalCost;
  //           return r;
  //         });
  //       }

  //       // 3) Save snapshots and assemble overall cards list
  //       const overallList: PnLRow[] = [];
  //       for (const name of companyNames) {
  //         const { rows } = perCompany[name];

  //         try {
  //           await AsyncStorage.removeItem(STORAGE_KEY(name));
  //           await AsyncStorage.setItem(
  //             STORAGE_KEY(name),
  //             JSON.stringify({ savedAt: Date.now(), rows })
  //           );
  //         } catch (e) {
  //           console.warn('Snapshot save failed for', name, e);
  //         }

  //         const overallRow = rows.find(r => r.year === 'Overall');
  //         if (overallRow) overallList.push(overallRow);
  //       }

  //       overallList.sort((a, b) => b.netProfit - a.netProfit);

  //       if (isMounted) setOverallData(overallList);
  //     } catch (err) {
  //       console.warn('Companies screen load failed:', err);
  //     } finally {
  //       if (isMounted) setLoading(false);
  //     }
  //   };

  //   fetchAndSaveAll();
  //   return () => {
  //     isMounted = false;
  //   };
  // }, []);

  // width style memoized
  
  useEffect(() => {
    let isMounted = true;
  
    const fetchAndSaveAll = async () => {
      try {
        setLoading(true);
  
        // ---- fetch ----
        const allCompanies = await getCompanyPnL();     // yearly (keep as-is for cards)
        const manPowerRows = await ManPowerSalaries();  // yearly (for yearly zeroing flow)
        const allRows: TrialBalanceRow[] = await getAllTrialBalances(); // ✅ monthly source
  
        const companyNames = Array.from(
          new Set(
            allCompanies
              .map(r => r.company)
              .filter(c => c && c !== 'Man Power / Salaries')
          )
        );
  
        const splitPercentages: Record<string, number> = {
          'West Walk Real Estate': 0.22,
          'Assets Services Company': 0.6851,
          'West Walk Advertisement': 0.0949,
        };
  
        // ---------------- MONTHLY AGG from trial_balance ----------------
        const ymKey = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  
        // 1) Per-company per-month (rev, cost)
        const monthlyRC: Record<string, Record<string, { rev: number; cost: number }>> = {};
        for (const r of allRows) {
          const y = Number(r.year);
          const m = Number(r.month);
          if (!y || !m) continue;
          const k = ymKey(y, m);
          const comp = (r.company || '').trim();
          if (!monthlyRC[comp]) monthlyRC[comp] = {};
          if (!monthlyRC[comp][k]) monthlyRC[comp][k] = { rev: 0, cost: 0 };
          if (r.type === 'Revenue') {
            monthlyRC[comp][k].rev += r.balanceFirst || 0;
          } else if (r.type === 'Cost') {
            monthlyRC[comp][k].cost += r.balanceFirst || 0; // cost sign as-is (usually negative)
          }
        }
  
        // 2) MP pool per-month (from trial_balance)
        const MP_NAME = 'Man Power / Salaries';
        const mpMonthly: Record<string, number> = {};
        const mpRows = allRows.filter(r => r.type === 'Cost' && (r.company || '').trim() === MP_NAME);
        for (const r of mpRows) {
          const y = Number(r.year);
          const m = Number(r.month);
          if (!y || !m) continue;
          const k = ymKey(y, m);
          mpMonthly[k] = (mpMonthly[k] || 0) + (r.balanceFirst || 0); // pool (usually negative)
        }
  
        // 3) Pre-zero monthly net per company (rev + cost + MP% allocation)
        const preZeroMonthlyNet: Record<string, Record<string, number>> = {};
        for (const comp of companyNames) {
          preZeroMonthlyNet[comp] = {};
          const compMonths = monthlyRC[comp] || {};
          const pct = splitPercentages[comp] || 0;
  
          // all months where either company has activity or MP exists
          const monthKeys = new Set<string>([
            ...Object.keys(compMonths),
            ...Object.keys(mpMonthly),
          ]);
  
          for (const k of monthKeys) {
            const { rev = 0, cost = 0 } = compMonths[k] || { rev: 0, cost: 0 };
            const mpAlloc = (mpMonthly[k] || 0) * pct; // MP monthly * company %
            preZeroMonthlyNet[comp][k] = rev + (cost + mpAlloc);
          }
        }
  
        // 4) Zeroing per-month for ASC/WWA (net -> 0)
        const finalMonthlyNet: Record<string, Record<string, number>> = {};
        for (const comp of companyNames) {
          finalMonthlyNet[comp] = {};
          for (const [k, net] of Object.entries(preZeroMonthlyNet[comp] || {})) {
            if (comp === 'Assets Services Company' || comp === 'West Walk Advertisement') {
              finalMonthlyNet[comp][k] = 0; // after zeroing those nets are absorbed into revenue/cost
            } else {
              finalMonthlyNet[comp][k] = net; // temp; will adjust WWRE next
            }
          }
        }
  
        // 5) Transfers to WWRE per-month: WWRE += ( -ASC_net + WWA_net )
        const wwreName = 'West Walk Real Estate';
        if (!finalMonthlyNet[wwreName]) finalMonthlyNet[wwreName] = {};
        const allMonthKeys = new Set<string>([
          ...Object.keys(preZeroMonthlyNet[wwreName] || {}),
          ...Object.keys(preZeroMonthlyNet['Assets Services Company'] || {}),
          ...Object.keys(preZeroMonthlyNet['West Walk Advertisement'] || {}),
        ]);
        for (const k of allMonthKeys) {
          const base = preZeroMonthlyNet[wwreName]?.[k] || 0;
          const ascMoved = preZeroMonthlyNet['Assets Services Company']?.[k] || 0;
          const wwaMoved = preZeroMonthlyNet['West Walk Advertisement']?.[k] || 0;
          finalMonthlyNet[wwreName][k] = base - ascMoved + wwaMoved;
        }
  
        // ---------------- YEARLY (AS-IS) + snapshots ----------------
        // Build yearly/overall rows the same way you already do:
        function buildRowsForCompanyWithMovedNet(
          company: string,
          allCompanies_: any[],
          manPowerRows_: any[],
          splitPercentages_: Record<string, number>
        ): { rows: PnLRow[]; movedNetByYear: Record<number | 'Overall', number> } {
          const companyRows = allCompanies_.filter(r => r.company === company);
  
          const years = new Set<number | 'Overall'>();
          companyRows.forEach(r => years.add(r.year));
          manPowerRows_.forEach(r => years.add(r.year as number));
          years.add('Overall');
  
          const preZeroRows: PnLRow[] = [];
          const movedNetByYear: Record<number | 'Overall', number> = {};
  
          years.forEach(year => {
            const base = companyRows.find(r => r.year === year);
            let revenue = base?.totalRevenue || 0;
            let cost = base?.totalCost || 0;
  
            const pct = splitPercentages_[company] ?? 0;
            if (pct > 0) {
              if (year === 'Overall') {
                const totalManPowerCost = manPowerRows_.reduce((sum, r) => sum + (r.totalCost || 0), 0);
                cost += totalManPowerCost * pct;
              } else {
                const mpRow = manPowerRows_.find(r => r.year === year);
                if (mpRow?.totalCost) cost += mpRow.totalCost * pct;
              }
            }
  
            const net = revenue + cost;
            movedNetByYear[year] = net;
  
            preZeroRows.push({ company, year, totalRevenue: revenue, totalCost: cost, netProfit: net });
          });
  
          const zeroed = preZeroRows.map(r => {
            const refNet = r.netProfit;
            const adjustment = -refNet;
            if (company === 'Assets Services Company') {
              r.totalRevenue += adjustment;
            } else if (company === 'West Walk Advertisement') {
              r.totalCost += adjustment;
            }
            r.netProfit = r.totalRevenue + r.totalCost;
            return r;
          });
  
          zeroed.sort((a, b) => {
            if (a.year === 'Overall') return 1;
            if (b.year === 'Overall') return -1;
            return Number(b.year) - Number(a.year);
          });
  
          return { rows: zeroed, movedNetByYear };
        }
  
        // 1) Build all companies once (zeroed) + capture pre-zero yearly
        const perCompany: Record<
          string,
          { rows: PnLRow[]; movedNetByYear: Record<number | 'Overall', number> }
        > = {};
        for (const name of companyNames) {
          perCompany[name] = buildRowsForCompanyWithMovedNet(
            name,
            allCompanies,
            manPowerRows,
            splitPercentages
          );
        }
  
        // 2) Apply YEARLY transfers to WWRE (as-is)
        const wwre = perCompany['West Walk Real Estate'];
        if (wwre) {
          const ascMoved = perCompany['Assets Services Company']?.movedNetByYear || {};
          const wwaMoved = perCompany['West Walk Advertisement']?.movedNetByYear || {};
  
          wwre.rows = wwre.rows.map(r => {
            const year = r.year as number | 'Overall';
            const ascNet = ascMoved[year] ?? 0;
            const wwaNet = wwaMoved[year] ?? 0;
  
            r.totalCost += -ascNet;      // cost add (-asc)
            r.totalRevenue += wwaNet;    // revenue add (+wwa)
            r.netProfit = r.totalRevenue + r.totalCost;
            return r;
          });
        }
  
        // 3) Save snapshots (now with monthlyNet)
        const overallList: PnLRow[] = [];
        for (const name of companyNames) {
          const { rows } = perCompany[name];
  
          // build monthlyNet array for this company
          const monthlyForCompany = finalMonthlyNet[name] || {};
          const monthlyNet = Object.entries(monthlyForCompany)
            .map(([k, net]) => {
              const [y, m] = k.split('-').map(s => Number(s));
              return { year: y, month: m, net };
            })
            .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
  
          try {
            await AsyncStorage.removeItem(STORAGE_KEY(name));
            await AsyncStorage.setItem(
              STORAGE_KEY(name),
              JSON.stringify({ savedAt: Date.now(), rows, monthlyNet }) // ✅ store only monthly net
            );
          } catch (e) {
            console.warn('Snapshot save failed for', name, e);
          }
  
          const overallRow = rows.find(r => r.year === 'Overall');
          if (overallRow) overallList.push(overallRow);
        }
  
        overallList.sort((a, b) => b.netProfit - a.netProfit);
        if (isMounted) setOverallData(overallList);
      } catch (err) {
        console.warn('Companies screen load failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
  
    fetchAndSaveAll();
    return () => {
      isMounted = false;
    };
  }, []);
  
  
  
  const cardSizeStyle = useMemo(
    () => (isWide ? { flexBasis: '31%', maxWidth: '31%' } : { flexBasis: '100%', maxWidth: '100%' }),
    [isWide]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 100,color:'black' }}>Loading companies…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Remount on layout flip so RN recomputes layout */}
      <View key={isWide ? 'wide' : 'narrow'} style={styles.grid}>
        {overallData.map((item, index) => {
          const cardColors = ['#FFDAB9', '#E0FFFF', '#E6E6FA', '#F0FFF0', '#FFE4E1'];
          const backgroundColor = cardColors[index % cardColors.length];

          return (
            <TouchableOpacity
              key={item.company}
              style={[styles.card, cardSizeStyle]}
              onPress={() => navigation.navigate('CmpDashboard', { company: item.company })}
            >
              <Text style={styles.companyName}>{item.company}</Text>
              <View style={styles.rowData}>
                <Text style={styles.label}>Revenue:</Text>
                <Text style={styles.value}>
                  {item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.rowData}>
                <Text style={styles.label}>Cost:</Text>
                <Text style={[styles.value,{color:'red'}]}>
                  {item.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.rowData}>
                <Text style={styles.label}>Net Profit:</Text>
                <Text style={[styles.value, { color: item.netProfit >= 0 ? 'green' : 'red' }]}>
                  {item.netProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
  container: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor:Colors.White,
    height:150,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal:16,
    borderWidth:0.3
  },
  companyName: { fontSize: 16, fontWeight: '700', marginBottom: 22 },
  rowData: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  label: { fontSize: 13, fontWeight: '600',marginBottom:2 },
  value: { fontSize: 13, fontWeight: '700',marginBottom:2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
});
