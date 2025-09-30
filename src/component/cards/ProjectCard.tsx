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
import { getCompanyPnL, ManPowerSalaries } from '../../database/trailBalanceQueries';

interface PnLRow {
  company: string;
  year: number | string;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

type YearKey = number | 'Overall';

const STORAGE_KEY = (c: string) => `pnl:${c}:latest`;

/** Build rows for a company:
 * - Applies manpower split
 * - Captures pre-zeroing net per year (movedNetByYear)
 * - Applies zeroing rules for ASC/WWA
 */
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

  useEffect(() => {
    let isMounted = true;

    const fetchAndSaveAll = async () => {
      try {
        setLoading(true);

        const allCompanies = await getCompanyPnL();
        const manPowerRows = await ManPowerSalaries();

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

        // 1) Build all companies once (zeroed) + capture pre-zero nets
        const perCompany: Record<string, { rows: PnLRow[]; movedNetByYear: Record<YearKey, number> }> = {};
        for (const name of companyNames) {
          perCompany[name] = buildRowsForCompanyWithMovedNet(
            name,
            allCompanies,
            manPowerRows,
            splitPercentages
          );
        }

        // 2) Apply transfers to WWRE: ASC net -> cost ; WWA net -> revenue (per-year + Overall)
        const wwre = perCompany['West Walk Real Estate'];
        if (wwre) {
          const ascMoved = perCompany['Assets Services Company']?.movedNetByYear || {};
          const wwaMoved = perCompany['West Walk Advertisement']?.movedNetByYear || {};

          wwre.rows = wwre.rows.map(r => {
            const year = r.year as YearKey;
            const ascNet = ascMoved[year] ?? 0;
            const wwaNet = wwaMoved[year] ?? 0;

            // cost is negative; add expense by subtracting ascNet
            r.totalCost += -ascNet;
            // revenue add wwaNet
            r.totalRevenue += wwaNet;

            r.netProfit = r.totalRevenue + r.totalCost;
            return r;
          });
        }

        // 3) Save snapshots and assemble overall cards list
        const overallList: PnLRow[] = [];
        for (const name of companyNames) {
          const { rows } = perCompany[name];

          try {
            await AsyncStorage.removeItem(STORAGE_KEY(name));
            await AsyncStorage.setItem(
              STORAGE_KEY(name),
              JSON.stringify({ savedAt: Date.now(), rows })
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

  // width style memoized
  const cardSizeStyle = useMemo(
    () => (isWide ? { flexBasis: '32%', maxWidth: '32%' } : { flexBasis: '100%', maxWidth: '100%' }),
    [isWide]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 8 }}>Loading companies…</Text>
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
              style={[styles.card, cardSizeStyle, { backgroundColor }]}
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
                <Text style={styles.value}>
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
  container: { padding: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  companyName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  rowData: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
});
