// TrialBalance.tsx
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import {useRoute} from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';

import {
  getAllTrialBalances,
  TrialBalanceRow,
  getCompanyPnL,
} from '../../../../database/trailBalanceQueries';

import CustomHeader from '../../../../component/customHeader';
import {Colors} from '../../../../themes/color';
import {exportTrialBalanceToXLSX} from '../../../../database/Utils/export_to_excel';

const {width} = Dimensions.get('window');
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ====== Banding indices (month indexes): 0,2,4,6,8,10 ======
const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

// fixed dimensions so both panes align perfectly
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;

// LEFT (3 frozen cols)
const TYPE_W = 100;
const COMP_W = 170;
const CODE_W = 110; // Code (Revenue: cc3code, Cost: auxcode)
const LEFT_WIDTH = 570;

// RIGHT
const TOTAL_W = 100; // current total
const PREV_W  = 120; // previous year total column width
const MONTH_W = 100;

// Right side total width: Total | Prev Total | per month => Budget | Current | Prev (x12)
const rightContentWidth = TOTAL_W + PREV_W + (12 * (3 * MONTH_W));

type RowItem = TrialBalanceRow & {
  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: 'Revenue' | 'Cost' | 'Grand';
  totalBalances?: number[];        // current year monthly
  totalSum?: number;               // current year total
  prevYearSum?: number;            // previous year total
  prevMonthlyBalances?: number[];  // previous year monthly

  // grouping
  isGroupParent?: boolean;
  groupKey?: string; // `${year}::${type}::${component}`
  children?: RowItem[];
};

type Snapshot = {
  RevenueByComponent: Record<string, number>;
  RevenueChildrenByKey: Record<string, number>;
  CostByComponent: Record<string, number>;
  CostChildrenByKey: Record<string, number>;
  Totals: { Revenue: number; Cost: number; Grand: number };

  // monthly maps
  RevenueChildrenMonthlyByKey: Record<string, number[]>;
  CostChildrenMonthlyByKey: Record<string, number[]>;
  RevenueMonthlyByComponent: Record<string, number[]>;
  CostMonthlyByComponent: Record<string, number[]>;
  TotalsMonthly: { Revenue: number[]; Cost: number[]; Grand: number[] };
};

export default function SelectedCompany() {
  const route = useRoute();
  const {company = '', type = '', year} = (route.params ?? {}) as {
    company?: string;
    type?: string;
    year?: number;
  };

  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // ✅ Budgeted values map (Firebase)
  const [budgetMap, setBudgetMap] = useState<Record<string, number>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
  };

  // Freeze first 3 columns (LEFT) + RIGHT scrollable
  const leftListRef = useRef<FlatList<RowItem>>(null);
  const rightListRef = useRef<FlatList<RowItem>>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const isVSyncingRef = useRef(false);
  const isHSyncingRef = useRef(false);

  const onLeftVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    const y = e.nativeEvent.contentOffset.y;
    rightListRef.current?.scrollToOffset({offset: y, animated: false});
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onRightVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    const y = e.nativeEvent.contentOffset.y;
    leftListRef.current?.scrollToOffset({offset: y, animated: false});
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onHeaderHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    const x = e.nativeEvent.contentOffset.x;
    bodyHRef.current?.scrollTo({x, animated: false});
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };
  const onBodyHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    const x = e.nativeEvent.contentOffset.x;
    headerHRef.current?.scrollTo({x, animated: false});
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };

  // =================== DATA BUILD ===================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const allRows = await getAllTrialBalances();
        await getCompanyPnL(); // keeping your call (even if not used elsewhere)

        // ✅ Budget fetch + map build (fills (B) columns)
      // NOTE: current budget
const BUDGET_DOC_TYPE = 'CURR';

const buildBudgetKey = (
  t: string,
  y: number,
  m: number,
  acc: string,
  cc3: string
) => `${t || ''}||${y || 0}||${m || 0}||${acc || ''}||${cc3 || ''}`;

const fetchBudgetMap = async () => {
  let q: any = firestore()
    .collection('Budgeted_Data')
    .where('docType', '==', BUDGET_DOC_TYPE);

  // Optional
  // if (year) q = q.where('year', '==', year);

  const snap = await q.get();

  const map: Record<string, number> = {};

  snap.docs.forEach(d => {
    const x: any = d.data();

    const y = Number(x.year);
    const m = Number(x.month);
    if (!y || !m || m < 1 || m > 12) return;

    const acc = String(x.accountno || '');
    const cc3 = String(x.cc3code || '');
    const t = String(x.type || '');

    const k = buildBudgetKey(t, y, m, acc, cc3);

    // ✅ CURR budget — no sum, direct value
    map[k] = Number(x.budget_amount || 0);
  });

  return map;
};

const bmap = await fetchBudgetMap();
setBudgetMap(bmap);

        // ---------- CONFIG ----------
        const splitPercentages: Record<string, number> = {
          'West Walk Real Estate': 0.22,
          'Assets Services Company': 0.6851,
          'West Walk Advertisement': 0.0949,
        };

        const MP_NAME = 'Man Power / Salaries';

        const CLUB_ACCOUNTS = new Set(['44104', '44107', '44122', '44124', '44125']);
        const CLUB_ACCOUNTS_LABEL = 'Tenant Variation Request';
        const CLUB_ACCOUNTS_ACCOUNT = '44104,44107,44122,44124,44125';

        // ---------- HELPERS ----------
        const isValidMonth = (m?: number | null) => typeof m === 'number' && m >= 1 && m <= 12;
        const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

        // Build MP by month for all years (raw, before splits)
        const monthlyMpByYear: Record<number, number[]> = {};
        allRows
          .filter(r => r.type === 'Cost' && (r.company || '').trim() === MP_NAME)
          .forEach(r => {
            const y = Number(r.year);
            const m = Number(r.month);
            if (!y || !isValidMonth(m)) return;
            if (!monthlyMpByYear[y]) monthlyMpByYear[y] = Array(12).fill(0);
            monthlyMpByYear[y][m - 1] += r.balanceFirst || 0;
          });

        // Monthly net for a company/year with MP allocation applied
        const buildMonthlyNet = (comp: string, yr: number): number[] => {
          const pct = splitPercentages[comp] ?? 0;
          const rev = Array(12).fill(0);
          const cst = Array(12).fill(0);

          allRows.forEach(r => {
            if (r.company !== comp) return;
            if (r.year !== yr) return;
            if (!isValidMonth(r.month)) return;
            const i = (r.month as number) - 1;
            if (r.type === 'Revenue') rev[i] += r.balanceFirst || 0;
            else if (r.type === 'Cost') cst[i] += r.balanceFirst || 0;
          });

          const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
          return Array.from({ length: 12 }, (_, i) => {
            const mpAlloc = mpMonths[i] * pct;
            // costs already signed; net = rev + cost + mpAlloc
            return (rev[i] || 0) + ((cst[i] || 0) + mpAlloc);
          });
        };

        // ---------- FILTER for CURRENT view ----------
        let filteredRows = allRows.filter(row => {
          let matches = true;
          if (company) matches = matches && row.company === company;
          if (type) matches = matches && row.type === type;
          if (year) matches = matches && row.year === year;
          return matches;
        });

        // Revenue adjustment (Residential 41112 -> 41111)
        filteredRows = filteredRows.map(r => {
          if (r.type === 'Revenue' && r.accountno === '41112' && r.cc2 === 'Residential Rental') {
            return { ...r, component: 'Residential', accountno: '41111' };
          }
          return r;
        });

        // ---------- SORT ----------
        filteredRows.sort((a, b) => {
          if ((a.year || 0) !== (b.year || 0)) return (b.year || 0) - (a.year || 0);
          if ((a.accountno || '') !== (b.accountno || ''))
            return (a.accountno || '').localeCompare(b.accountno || '');
          return (a.cc3code || '').localeCompare(b.cc3code || '');
        });

        // ---------- YEARS ----------
        const yearsSorted = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);

        // ---------- Prev-year snapshot (monthly-aware) ----------
        const buildYearSnapshot = (yr: number): Snapshot => {
          // NOTE: prev snapshot respects company only, not `type`
          const base = allRows.filter(r => {
            let ok = true;
            if (company) ok = ok && r.company === company;
            return ok && r.year === yr;
          });

          const adjusted = base.map(r => {
            if (r.type === 'Revenue' && r.accountno === '41112' && r.cc2 === 'Residential Rental') {
              return { ...r, component: 'Residential', accountno: '41111' };
            }
            return r;
          });

          // ---- REVENUE grouping (with clubbing)
          const revenueByKey: Record<string, { comp: string; balances: number[] }> = {};
          adjusted
            .filter(r => r.type === 'Revenue')
            .forEach(r => {
              const isClub = r.accountno && CLUB_ACCOUNTS.has(String(r.accountno));
              const cc3 = r.cc3code || '';
              const key = isClub ? `CLUB::${cc3}` : `${r.accountno || ''}||${cc3}`;
              if (!revenueByKey[key]) {
                revenueByKey[key] = {
                  comp: isClub ? CLUB_ACCOUNTS_LABEL : (r.component || ''),
                  balances: Array(12).fill(0),
                };
              }
              if (isValidMonth(r.month)) {
                revenueByKey[key].balances[(r.month as number) - 1] += r.balanceFirst || 0;
              }
            });

          let revenueChildrenByKey: Record<string, number> = {};
          let revenueChildrenMonthlyByKey: Record<string, number[]> = {};
          let revenueByComponent: Record<string, number> = {};
          let revenueMonthlyByComponent: Record<string, number[]> = {};

          Object.entries(revenueByKey).forEach(([k, v]) => {
            revenueChildrenByKey[k] = sumArr(v.balances);
            revenueChildrenMonthlyByKey[k] = v.balances.slice();
            const comp = (v.comp || '').trim();
            revenueByComponent[comp] = (revenueByComponent[comp] || 0) + revenueChildrenByKey[k];
            if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
            v.balances.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
          });

          // Injected revenue rows (monthly nets)
          if (!type || type === 'Revenue') {
            if (company === 'West Walk Real Estate') {
              const wwa = buildMonthlyNet('West Walk Advertisement', yr);
              if (wwa.some(n => n !== 0)) {
                const comp = 'Westwalk Marketing Rights';
                const key = 'XFR-WWA||';
                const total = sumArr(wwa);
                revenueByComponent[comp] = (revenueByComponent[comp] || 0) + total;
                revenueChildrenByKey[key] = (revenueChildrenByKey[key] || 0) + total;
                revenueChildrenMonthlyByKey[key] = wwa.slice();
                if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
                wwa.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
              }
            }
            if (company === 'Assets Services Company') {
              const asc = buildMonthlyNet('Assets Services Company', yr).map(n => -n);
              if (asc.some(n => n !== 0)) {
                const comp = 'Contract with Westwalk';
                const key = 'XFR-ASC||';
                const total = sumArr(asc);
                revenueByComponent[comp] = (revenueByComponent[comp] || 0) + total;
                revenueChildrenByKey[key] = (revenueChildrenByKey[key] || 0) + total;
                revenueChildrenMonthlyByKey[key] = asc.slice();
                if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
                asc.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
              }
            }
          }

          // ---- COST grouping (accountno + auxcode) & merge empty-aux by component
          const costRows = adjusted.filter(r => r.type === 'Cost');
          const costByKeyRaw: Record<string, { r0: typeof costRows[number]; balances: number[] }> = {};
          costRows.forEach(r => {
            const key = `${r.accountno || ''}||${r.auxcode || ''}`;
            if (!costByKeyRaw[key]) {
              costByKeyRaw[key] = { r0: r, balances: Array(12).fill(0) };
            }
            if (isValidMonth(r.month)) {
              costByKeyRaw[key].balances[(r.month as number) - 1] += r.balanceFirst || 0;
            }
          });

          const withAux: Array<{ comp: string; key: string; total: number }> = [];
          const emptyAuxByComp: Record<string, number[]> = {};
          Object.entries(costByKeyRaw).forEach(([k, v]) => {
            const comp = (v.r0.component || '').trim();
            const total = sumArr(v.balances);
            const aux = v.r0.auxcode;
            if (aux) withAux.push({ comp, key: k, total });
            else {
              if (!emptyAuxByComp[comp]) emptyAuxByComp[comp] = Array(12).fill(0);
              v.balances.forEach((b, i) => (emptyAuxByComp[comp][i] += b));
            }
          });

          let costChildrenByKey: Record<string, number> = {};
          let costChildrenMonthlyByKey: Record<string, number[]> = {};
          let costByComponent: Record<string, number> = {};
          let costMonthlyByComponent: Record<string, number[]> = {};

          withAux.forEach(({ comp, key, total }) => {
            const balances = costByKeyRaw[key].balances;
            costChildrenByKey[key] = total;
            costChildrenMonthlyByKey[key] = balances.slice();
            costByComponent[comp] = (costByComponent[comp] || 0) + total;
            if (!costMonthlyByComponent[comp]) costMonthlyByComponent[comp] = Array(12).fill(0);
            balances.forEach((b,i)=>{ costMonthlyByComponent[comp][i] += b; });
          });

          Object.entries(emptyAuxByComp).forEach(([comp, bal]) => {
            const total = sumArr(bal);
            const synthKey = `MERGED_EMPTYAUX::${comp}`;
            costChildrenByKey[synthKey] = total;
            costChildrenMonthlyByKey[synthKey] = bal.slice();
            costByComponent[comp] = (costByComponent[comp] || 0) + total;
            if (!costMonthlyByComponent[comp]) costMonthlyByComponent[comp] = Array(12).fill(0);
            bal.forEach((b,i)=>{ costMonthlyByComponent[comp][i] += b; });
          });

          // MP injected costs
          if ((!type || type === 'Cost') && splitPercentages[company || '']) {
            const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
            if (company === 'Assets Services Company') {
              const mpSplit = [
                { name: 'HouseKeeping-MP', percent: 0.435 },
                { name: 'Maintaince-MP',  percent: 0.405 },
                { name: 'Security-MP',    percent: 0.12  },
                { name: 'Store-MP',       percent: 0.03  },
                { name: 'Landscape',      percent: 0.01  },
              ];
              mpSplit.forEach(s => {
                const balances = mpMonths.map(v => v * (splitPercentages[company!] || 0) * s.percent);
                const total = sumArr(balances);
                const key = `MP::${s.name}`;
                costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
                costChildrenMonthlyByKey[key] = balances.slice();
                costByComponent[s.name] = (costByComponent[s.name] || 0) + total;
                if (!costMonthlyByComponent[s.name]) costMonthlyByComponent[s.name] = Array(12).fill(0);
                balances.forEach((b,i)=>{ costMonthlyByComponent[s.name][i] += b; });
              });
            } else {
              const balances = mpMonths.map(v => v * (splitPercentages[company!] || 0));
              const total = sumArr(balances);
              const key = `MP::ManPower`;
              costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
              costChildrenMonthlyByKey[key] = balances.slice();
              costByComponent['ManPower'] = (costByComponent['ManPower'] || 0) + total;
              if (!costMonthlyByComponent['ManPower']) costMonthlyByComponent['ManPower'] = Array(12).fill(0);
              balances.forEach((b,i)=>{ costMonthlyByComponent['ManPower'][i] += b; });
            }
          }

          // Cross-entity injections
          if (!type || type === 'Cost') {
            if (company === 'West Walk Real Estate') {
              const asc = buildMonthlyNet('Assets Services Company', yr);
              if (asc.some(v => v !== 0)) {
                const total = sumArr(asc);
                const key = 'XFR-ASC||';
                costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
                costChildrenMonthlyByKey[key] = asc.slice();
                costByComponent['FM Cost'] = (costByComponent['FM Cost'] || 0) + total;
                if (!costMonthlyByComponent['FM Cost']) costMonthlyByComponent['FM Cost'] = Array(12).fill(0);
                asc.forEach((b,i)=>{ costMonthlyByComponent['FM Cost'][i] += b; });
              }
            }
            if (company === 'West Walk Advertisement') {
              const wwa = buildMonthlyNet('West Walk Advertisement', yr).map(n => -n);
              if (wwa.some(v => v !== 0)) {
                const total = sumArr(wwa);
                const key = 'XFR-WWA||';
                costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
                costChildrenMonthlyByKey[key] = wwa.slice();
                costByComponent['Westwalk Marketing Rights'] =
                  (costByComponent['Westwalk Marketing Rights'] || 0) + total;
                if (!costMonthlyByComponent['Westwalk Marketing Rights'])
                  costMonthlyByComponent['Westwalk Marketing Rights'] = Array(12).fill(0);
                wwa.forEach((b,i)=>{ costMonthlyByComponent['Westwalk Marketing Rights'][i] += b; });
              }
            }
          }

          const revTotalsMonthly = Array(12).fill(0);
          Object.values(revenueMonthlyByComponent).forEach(arr => arr.forEach((b,i)=> revTotalsMonthly[i]+=b));

          const costTotalsMonthly = Array(12).fill(0);
          Object.values(costMonthlyByComponent).forEach(arr => arr.forEach((b,i)=> costTotalsMonthly[i]+=b));

          const grandTotalsMonthly = revTotalsMonthly.map((v,i)=> v + costTotalsMonthly[i]);

          const revTotal = Object.values(revenueByComponent).reduce((a, b) => a + b, 0);
          const costTotal = Object.values(costByComponent).reduce((a, b) => a + b, 0);

          return {
            RevenueByComponent: revenueByComponent,
            RevenueChildrenByKey: revenueChildrenByKey,
            CostByComponent: costByComponent,
            CostChildrenByKey: costChildrenByKey,
            Totals: { Revenue: revTotal, Cost: costTotal, Grand: revTotal + costTotal },

            RevenueChildrenMonthlyByKey: revenueChildrenMonthlyByKey,
            CostChildrenMonthlyByKey: costChildrenMonthlyByKey,
            RevenueMonthlyByComponent: revenueMonthlyByComponent,
            CostMonthlyByComponent: costMonthlyByComponent,
            TotalsMonthly: {
              Revenue: revTotalsMonthly,
              Cost: costTotalsMonthly,
              Grand: grandTotalsMonthly,
            },
          };
        };

        // Pre-compute prev snapshot for each year we will render
        const prevYearCache: Record<number, Snapshot> = {};
        yearsSorted.forEach(yr => {
          prevYearCache[yr] = buildYearSnapshot((yr || 0) - 1);
        });

        // ---------- BUILD STRUCTURED DATA ----------
        const structured: RowItem[] = [];

        yearsSorted.forEach(yr => {
          const yearRows = filteredRows.filter(r => r.year === yr);

          structured.push({ yearHeader: true, company, year: yr } as RowItem);

          // ===== REVENUE =====
          const revenueRows = yearRows.filter(r => r.type === 'Revenue');
          const revenueByKey: Record<string, RowItem> = {};
          revenueRows.forEach(r => {
            const isClubbed = r.accountno && CLUB_ACCOUNTS.has(String(r.accountno));
            const cc3 = r.cc3code || '';
            const key = isClubbed ? `CLUB::${cc3}` : `${r.accountno || ''}||${cc3}`;
            if (!revenueByKey[key]) {
              const balances = Array(12).fill(0);
              if (isValidMonth(r.month)) balances[(r.month as number) - 1] = r.balanceFirst || 0;
              revenueByKey[key] = {
                ...r,
                component: isClubbed ? CLUB_ACCOUNTS_LABEL : (r.component || ''),
                accountno: isClubbed ? CLUB_ACCOUNTS_ACCOUNT : (r.accountno || ''),
                cc3code: cc3,
                totalBalances: balances,
                totalSum: sumArr(balances),
                year: yr,
              };
            } else {
              if (isValidMonth(r.month)) {
                revenueByKey[key].totalBalances![(r.month as number) - 1] += r.balanceFirst || 0;
              }
              revenueByKey[key].totalSum = sumArr(revenueByKey[key].totalBalances!);
              if (isClubbed) {
                revenueByKey[key].component = CLUB_ACCOUNTS_LABEL;
                revenueByKey[key].accountno = CLUB_ACCOUNTS_ACCOUNT;
              }
            }
          });

          const groupedRevenue = Object.values(revenueByKey);

          // Injected revenue rows (monthly)
          if (!type || type === 'Revenue') {
            if (company === 'West Walk Real Estate') {
              const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', yr);
              if (wwaMonthlyNet.some(v => v !== 0)) {
                const wwaPrev = buildMonthlyNet('West Walk Advertisement', yr - 1);
                groupedRevenue.push({
                  type: 'Revenue',
                  company,
                  component: 'Westwalk Marketing Rights',
                  accountno: 'XFR-WWA',
                  cc3code: '',
                  totalBalances: wwaMonthlyNet,
                  totalSum: sumArr(wwaMonthlyNet),
                  prevYearSum: sumArr(wwaPrev),
                  prevMonthlyBalances: wwaPrev.slice(),
                  year: yr,
                } as RowItem);
              }
            }
            if (company === 'Assets Services Company') {
              const ascMonthlyNet = buildMonthlyNet('Assets Services Company', yr).map(n => -n);
              if (ascMonthlyNet.some(v => v !== 0)) {
                const ascPrev = buildMonthlyNet('Assets Services Company', yr - 1).map(n => -n);
                groupedRevenue.push({
                  type: 'Revenue',
                  company,
                  component: 'Contract with Westwalk',
                  accountno: 'XFR-ASC',
                  cc3code: '',
                  totalBalances: ascMonthlyNet,
                  totalSum: sumArr(ascMonthlyNet),
                  prevYearSum: sumArr(ascPrev),
                  prevMonthlyBalances: ascPrev.slice(),
                  year: yr,
                } as RowItem);
              }
            }
          }

          // Collapse revenue by component
          const revenueByComponent: Record<string, RowItem[]> = {};
          groupedRevenue.forEach(r => {
            const comp = (r.component || '').trim();
            const k = `${yr}::Revenue::${comp}`;
            if (!revenueByComponent[k]) revenueByComponent[k] = [];
            revenueByComponent[k].push(r);
          });

          const groupedRevenueCollapsed: RowItem[] = [];
          Object.entries(revenueByComponent).forEach(([key, arr]) => {
            if (arr.length <= 1) {
              const obj = arr[0];
              if (obj.prevYearSum == null) {
                const childKey = obj.accountno && (obj.accountno.startsWith('XFR-') ? `${obj.accountno}||` : `${obj.accountno || ''}||${obj.cc3code || ''}`);
                const snap = prevYearCache[yr];
                const fromChild = childKey ? snap?.RevenueChildrenByKey[childKey] : undefined;
                obj.prevYearSum = (fromChild != null) ? fromChild : (snap?.RevenueByComponent[(obj.component || '').trim()] || 0);

                const fromChildMon = childKey ? snap?.RevenueChildrenMonthlyByKey[childKey] : undefined;
                const fromCompMon  = snap?.RevenueMonthlyByComponent[(obj.component || '').trim()];
                obj.prevMonthlyBalances = (fromChildMon && fromChildMon.slice())
                  || (fromCompMon && fromCompMon.slice()) || Array(12).fill(0);
              } else if (!obj.prevMonthlyBalances) {
                obj.prevMonthlyBalances = Array(12).fill(0);
              }
              groupedRevenueCollapsed.push(obj);
            } else {
              const sumBalances = Array(12).fill(0);
              arr.forEach(ch => ch.totalBalances?.forEach((b, i) => (sumBalances[i] += b)));
              const snap = prevYearCache[yr];
              const parent: RowItem = {
                isGroupParent: true,
                groupKey: key,
                type: 'Revenue',
                company,
                component: arr[0].component || '',
                accountno: '',
                cc3code: '',
                totalBalances: sumBalances,
                totalSum: sumArr(sumBalances),
                year: yr,
                children: arr.map(ch => {
                  const childKey = ch.accountno && (ch.accountno.startsWith('XFR-') ? `${ch.accountno}||` : `${ch.accountno || ''}||${ch.cc3code || ''}`);
                  const prev = childKey ? snap?.RevenueChildrenByKey[childKey] : undefined;
                  const prevMon = childKey ? snap?.RevenueChildrenMonthlyByKey[childKey] : undefined;
                  return {
                    ...ch,
                    prevYearSum: (ch.prevYearSum != null) ? ch.prevYearSum : (prev || 0),
                    prevMonthlyBalances: (ch.prevMonthlyBalances) ? ch.prevMonthlyBalances
                      : ((prevMon && prevMon.slice()) || Array(12).fill(0)),
                  };
                }),
              };
              parent.prevYearSum = snap?.RevenueByComponent[(parent.component || '').trim()] || 0;
              parent.prevMonthlyBalances =
                (snap?.RevenueMonthlyByComponent[(parent.component || '').trim()] || Array(12).fill(0)).slice();
              groupedRevenueCollapsed.push(parent);
            }
          });

          structured.push(...groupedRevenueCollapsed);
          if (groupedRevenueCollapsed.length) {
            const revBalances = Array(12).fill(0);
            groupedRevenueCollapsed.forEach(r => r.totalBalances?.forEach((b, i) => (revBalances[i] += b)));
            structured.push({
              isTotalRow: true,
              totalType: 'Revenue',
              company,
              totalBalances: revBalances,
              totalSum: sumArr(revBalances),
              prevYearSum: prevYearCache[yr]?.Totals?.Revenue || 0,
              prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Revenue?.slice() || Array(12).fill(0),
              year: yr,
            } as RowItem);
          }

          // ===== COST =====
          const costRows = yearRows.filter(r => r.type === 'Cost');
          let groupedCost: RowItem[] = [];

          // base grouping: accountno || auxcode
          const costByKey: Record<string, TrialBalanceRow[]> = {};
          costRows.forEach(r => {
            const key = `${r.accountno || ''}||${r.auxcode || ''}`;
            if (!costByKey[key]) costByKey[key] = [];
            costByKey[key].push(r);
          });
          Object.keys(costByKey).forEach(k => {
            const rows = costByKey[k];
            const balances = Array(12).fill(0);
            rows.forEach(r => {
              if (isValidMonth(r.month)) balances[(r.month as number) - 1] += r.balanceFirst || 0;
            });
            groupedCost.push({
              type: 'Cost',
              company,
              accountno: rows[0].accountno,
              auxcode: rows[0].auxcode,
              component: rows[0].component || '',
              cc2: rows[0].cc2,
              cc3code: rows[0].cc3code,
              totalBalances: balances,
              totalSum: sumArr(balances),
              year: yr,
            } as RowItem);
          });

          // merge empty-aux rows under component
          const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
          const mergedMap: Record<string, RowItem> = {};
          emptyAuxRows.forEach(r => {
            const k = r.component || '';
            if (!mergedMap[k]) mergedMap[k] = { ...r };
            else {
              mergedMap[k].totalBalances = mergedMap[k].totalBalances?.map(
                (b, i) => b + (r.totalBalances?.[i] || 0),
              );
              mergedMap[k].totalSum = sumArr(mergedMap[k].totalBalances || []);
              mergedMap[k].accountno = ((mergedMap[k].accountno || '') + ', ' + (r.accountno || '')).replace(/^,\s*/, '');
            }
          });
          groupedCost = groupedCost.filter(r => r.auxcode);
          groupedCost.push(...Object.values(mergedMap));

          // MP rows (monthly) + prevYearSum/monthly
          if ((!type || type === 'Cost') && splitPercentages[company || '']) {
            const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
            const mpPrev = monthlyMpByYear[yr - 1] ?? Array(12).fill(0);

            if (company === 'Assets Services Company') {
              const mpSplit = [
                { name: 'HouseKeeping-MP', percent: 0.435 },
                { name: 'Maintaince-MP',  percent: 0.405 },
                { name: 'Security-MP',    percent: 0.12  },
                { name: 'Store-MP',       percent: 0.03  },
                { name: 'Landscape',      percent: 0.01  },
              ];
              mpSplit.forEach(s => {
                const bal = mpMonths.map(v => v * (splitPercentages[company!] || 0) * s.percent);
                const balPrev = mpPrev.map(v => v * (splitPercentages[company!] || 0) * s.percent);
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: s.name,
                  accountno: 'MP',
                  auxcode: '',
                  totalBalances: bal,
                  totalSum: sumArr(bal),
                  prevYearSum: sumArr(balPrev),
                  prevMonthlyBalances: balPrev.slice(),
                  year: yr,
                } as RowItem);
              });
            } else {
              const bal = mpMonths.map(v => v * (splitPercentages[company!] || 0));
              const balPrev = mpPrev.map(v => v * (splitPercentages[company!] || 0));
              groupedCost.push({
                type: 'Cost',
                company,
                component: 'ManPower',
                accountno: 'MP',
                auxcode: '',
                totalBalances: bal,
                totalSum: sumArr(bal),
                prevYearSum: sumArr(balPrev),
                prevMonthlyBalances: balPrev.slice(),
                year: yr,
              } as RowItem);
            }
          }

          // Cross-entity cost rows — monthly + prevYearSum/monthly
          if (!type || type === 'Cost') {
            if (company === 'West Walk Real Estate') {
              const asc = buildMonthlyNet('Assets Services Company', yr);
              const ascPrev = buildMonthlyNet('Assets Services Company', yr - 1);
              if (asc.some(v => v !== 0)) {
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: 'FM Cost',
                  accountno: 'XFR-ASC',
                  auxcode: '',
                  totalBalances: asc,
                  totalSum: sumArr(asc),
                  prevYearSum: sumArr(ascPrev),
                  prevMonthlyBalances: ascPrev.slice(),
                  year: yr,
                } as RowItem);
              }
            }
            if (company === 'West Walk Advertisement') {
              const wwa = buildMonthlyNet('West Walk Advertisement', yr).map(n => -n);
              const wwaPrev = buildMonthlyNet('West Walk Advertisement', yr - 1).map(n => -n);
              if (wwa.some(v => v !== 0)) {
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: 'Westwalk Marketing Rights',
                  accountno: 'XFR-WWA',
                  auxcode: '',
                  totalBalances: wwa,
                  totalSum: sumArr(wwa),
                  prevYearSum: sumArr(wwaPrev),
                  prevMonthlyBalances: wwaPrev.slice(),
                  year: yr,
                } as RowItem);
              }
            }
          }

          // Collapse cost by component
          const costByComponent: Record<string, RowItem[]> = {};
          groupedCost.forEach(r => {
            const comp = (r.component || '').trim();
            const k = `${yr}::Cost::${comp}`;
            if (!costByComponent[k]) costByComponent[k] = [];
            costByComponent[k].push(r);
          });

          const groupedCostCollapsed: RowItem[] = [];
          Object.entries(costByComponent).forEach(([key, arr]) => {
            if (arr.length <= 1) {
              const obj = arr[0];
              if (obj.prevYearSum == null) {
                const childKey =
                  obj.accountno && (obj.accountno.startsWith('XFR-')
                    ? `${obj.accountno}||`
                    : `${obj.accountno || ''}||${obj.auxcode || ''}`);
                const snap = prevYearCache[yr];
                const fromChild = childKey ? snap?.CostChildrenByKey[childKey] : undefined;
                obj.prevYearSum = (fromChild != null) ? fromChild
                  : (snap?.CostByComponent[(obj.component || '').trim()] || 0);

                const fromChildMon = childKey ? snap?.CostChildrenMonthlyByKey[childKey] : undefined;
                const fromCompMon  = snap?.CostMonthlyByComponent[(obj.component || '').trim()];
                obj.prevMonthlyBalances = (fromChildMon && fromChildMon.slice())
                  || (fromCompMon && fromCompMon.slice()) || Array(12).fill(0);
              } else if (!obj.prevMonthlyBalances) {
                obj.prevMonthlyBalances = Array(12).fill(0);
              }
              groupedCostCollapsed.push(obj);
            } else {
              const sumBalances = Array(12).fill(0);
              const snap = prevYearCache[yr];
              const childrenWithPrev = arr.map(ch => {
                const childKey =
                  ch.accountno && (ch.accountno.startsWith('XFR-')
                    ? `${ch.accountno}||`
                    : `${ch.accountno || ''}||${ch.auxcode || ''}`);
                const prev = childKey ? snap?.CostChildrenByKey[childKey] : undefined;
                const prevMon = childKey ? snap?.CostChildrenMonthlyByKey[childKey] : undefined;
                return {
                  ...ch,
                  prevYearSum: (ch.prevYearSum != null) ? ch.prevYearSum : (prev || 0),
                  prevMonthlyBalances: (ch.prevMonthlyBalances) ? ch.prevMonthlyBalances
                    : ((prevMon && prevMon.slice()) || Array(12).fill(0)),
                };
              });
              childrenWithPrev.forEach(ch => ch.totalBalances?.forEach((b, i) => (sumBalances[i] += b)));
              const parent: RowItem = {
                isGroupParent: true,
                groupKey: key,
                type: 'Cost',
                company,
                component: arr[0].component || '',
                accountno: '',
                cc3code: '',
                auxcode: '',
                totalBalances: sumBalances,
                totalSum: sumArr(sumBalances),
                year: yr,
                children: childrenWithPrev,
              };
              parent.prevYearSum =
                snap?.CostByComponent[(parent.component || '').trim()] || 0;
              parent.prevMonthlyBalances =
                (snap?.CostMonthlyByComponent[(parent.component || '').trim()] || Array(12).fill(0)).slice();
              groupedCostCollapsed.push(parent);
            }
          });

          structured.push(...groupedCostCollapsed);
          if (groupedCostCollapsed.length) {
            const costBalances = Array(12).fill(0);
            groupedCostCollapsed.forEach(r => r.totalBalances?.forEach((b, i) => (costBalances[i] += b)));
            structured.push({
              isTotalRow: true,
              totalType: 'Cost',
              company,
              totalBalances: costBalances,
              totalSum: sumArr(costBalances),
              prevYearSum: prevYearCache[yr]?.Totals?.Cost || 0,
              prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Cost?.slice() || Array(12).fill(0),
              year: yr,
            } as RowItem);
          }

          // ===== GRAND / NET (using collapsed)
          const netBalances = Array(12).fill(0);
          for (let i = 0; i < 12; i++) {
            const rev = groupedRevenueCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
            const cst = groupedCostCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
            netBalances[i] = rev + cst;
          }
          structured.push({
            isTotalRow: true,
            totalType: 'Grand',
            company,
            totalBalances: netBalances,
            totalSum: sumArr(netBalances),
            prevYearSum: prevYearCache[yr]?.Totals?.Grand || 0,
            prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Grand?.slice() || Array(12).fill(0),
            year: yr,
          } as RowItem);
        });

        setData(structured);
      } catch (err) {
        setError('Failed to load trial balance');
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [company, type, year]);

  // =================== RENDER HELPERS ===================

  // ✅ Budget cell renderer (now shows value)
  const BudgetCell = ({value, extraStyle}: {value: number; extraStyle?: any}) => (
    <Text numberOfLines={1} style={[styles.cell, {width: MONTH_W, paddingVertical: 5}, extraStyle]}>
      {value ? value.toLocaleString('en-US', {maximumFractionDigits: 0}) : ''}
    </Text>
  );

  const LeftChildRow = ({child}: {child: RowItem}) => {
    return (
      <View style={[styles.bodyRow, {width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: '#EFEFEF'}]}>
        <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, color: '#333',textAlign:"left" }]}>{child.type}</Text>
        <Text numberOfLines={1} style={[styles.cell, {width: COMP_W, color: '#333',textAlign:"left" }]}>{child.component}</Text>
        <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, color: '#666',textAlign:"left" }]}>
          {child.type === 'Revenue' ? (child.cc3code || '') : (child.auxcode || '')}
        </Text>
      </View>
    );
  };

  const RightChildRow = ({child}: {child: RowItem}) => {
    const cbals = child.totalBalances ?? Array(12).fill(0);
    const ctotal = child.totalSum ?? cbals.reduce((s, b) => s + b, 0);
    const prev = child.prevYearSum ?? 0;
    const pmon = child.prevMonthlyBalances ?? Array(12).fill(0);

    // ✅ budget key (type+year+month+account+cc3)
    const buildBudgetKey = (t: string, y: number, m: number, acc: string, cc3: string) =>
      `${t || ''}||${y || 0}||${m || 0}||${acc || ''}||${cc3 || ''}`;

    return (
      <View style={[styles.bodyRow, {height: ROW_HEIGHT,}]}>
        <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W}]}>
          {ctotal.toLocaleString('en-US', {maximumFractionDigits: 0})}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, {width: PREV_W}]}>
          {Number(prev).toLocaleString('en-US', {maximumFractionDigits: 0})}
        </Text>

        {/* Per-month triplets: Budget | Current | Prev */}
        {months.map((_, i) => {
          const bodyCellStyle = [
            styles.cell,
            { width: MONTH_W,paddingVertical:5 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];

          const y = Number(child.year || 0);
          const m = i + 1;
          const acc = String(child.accountno || '');
          const cc3 = String(child.cc3code || '');
          const t = String(child.type || '');
          const bKey = buildBudgetKey(t, y, m, acc, cc3);
          const bVal = budgetMap[bKey] || 0;

          return (
            <React.Fragment key={`mch-${i}`}>
              <BudgetCell value={bVal} extraStyle={bodyCellStyle} />
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(cbals[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
              </Text>
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(pmon[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
              </Text>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // =================== RENDERERS ===================

  const LeftHeader = () => (
    <View style={[styles.headerRow, {width: 384, height: HEADER_HEIGHT, backgroundColor:'#EFEFEF'}]}>
      <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, fontWeight: 'bold'}]}>Type</Text>
      <Text numberOfLines={1} style={[styles.cell, {width: COMP_W, fontWeight: 'bold'}]}>Component</Text>
      <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, fontWeight: 'bold'}]}>Code/Aux</Text>
    </View>
  );

  const RightHeader = () => (
    <ScrollView
      ref={headerHRef}
      horizontal
      onScroll={onHeaderHScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator
    >
      <View style={[styles.headerRow, {width: rightContentWidth, height: HEADER_HEIGHT,backgroundColor:"#ffffff"  }]}>
        <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: 'bold', textAlign:"center"}]}>Total</Text>
        <Text numberOfLines={1} style={[styles.cell, {width: PREV_W,  fontWeight: 'bold', textAlign:"center"}]}>Total (P)</Text>

        {/* Per-month headers: Budget | Current | Prev with banding */}
        {months.map((m, i) => {
          const dark = DARK_GROUP_INDEX.has(i);
          const headerCellStyle = [
            styles.cell,
            { width: MONTH_W, fontWeight: 'bold', textAlign:"center", paddingVertical:13 },
            dark && styles.darkBodyCell,
          ];
          return (
            <React.Fragment key={`h-${m}`}>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (B)`}</Text>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (A)`}</Text>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (P)`}</Text>
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderLeftRow = ({item}: {item: RowItem}) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.yearHeaderRow, {width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
          <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 16, color: 'white'}}>
            {item.company} - {item.year}
          </Text>
        </View>
      );
    }

    if (item.isGroupParent) {
      const key = item.groupKey || `${item.year}::${item.type}::${item.component || ''}`;
      const isOpen = !!expandedGroups[key];

      return (
        <View>
          {/* Parent row */}
          <View style={[styles.bodyRow, {backgroundColor: '#EFEFEF', width: LEFT_WIDTH, height: ROW_HEIGHT}]}>
            <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W,textAlign:"left" }]}>{item.type}</Text>
            <View style={{flexDirection: 'row', width: COMP_W}}>
              <TouchableOpacity onPress={() => toggleGroup(key)} style={{flexDirection: 'row'}}>
                <Text style={{fontSize: 12, fontWeight: 'bold', paddingRight: 8}}>
                  {isOpen ? '▾' : '▸'}
                </Text>
                <Text numberOfLines={1} style={{flexShrink: 1, fontSize: 12}}>
                  {item.component}
                </Text>
              </TouchableOpacity>
            </View>
            <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, color:'#EFEFEF',textAlign:"left" }]} />
          </View>

          {/* Children (when expanded) */}
          {isOpen && item.children?.map((child, idx) => (
            <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />
          ))}
        </View>
      );
    }

    if (item.isTotalRow) {
      const label = item.totalType === 'Grand' ? 'Net Total' : `${item.totalType} Total`;
      let bgColor = '#f0f8ff';
      let MbTotal = 0;
      if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
      if (item.totalType === 'Cost') bgColor = '#f7d1d1';
      if (item.totalType === 'Grand') { bgColor = '#ffe4b5'; MbTotal = 50; }

      return (
        <View
          style={[
            styles.bodyRow,
            {
              backgroundColor: bgColor,
              borderTopWidth: 2,
              borderColor: '#aaa',
              width: LEFT_WIDTH,
              height: ROW_HEIGHT,
              marginBottom: MbTotal,
            },
          ]}>
          <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, fontWeight: 'bold',textAlign:"left" }]}>{label}</Text>
          <Text numberOfLines={1} style={[styles.cell, {width: COMP_W,textAlign:"left" }]}>{item.company}</Text>
          <Text numberOfLines={1} style={[styles.cell, {width: CODE_W,textAlign:"left" }]} />
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, {width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: '#EFEFEF',  }]}>
        <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W,textAlign:"left" }]}>{item.type}</Text>
        <Text numberOfLines={1} style={[styles.cell, {width: COMP_W,textAlign:"left" }]}>{item.component}</Text>
        <Text numberOfLines={1} style={[styles.cell, {width: CODE_W,textAlign:"left" , color:'#666'}]}>
          {item.type === 'Revenue' ? (item.cc3code || '') : (item.auxcode || '')}
        </Text>
      </View>
    );
  };

  const renderRightRow = ({item}: {item: RowItem}) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.yearHeaderRow, {width: rightContentWidth, height: YEAR_HEADER_HEIGHT}]} />
      );
    }

    // ✅ build budget key
    const buildBudgetKey = (t: string, y: number, m: number, acc: string, cc3: string) =>
      `${t || ''}||${y || 0}||${m || 0}||${acc || ''}||${cc3 || ''}`;

    // ✅ Triplets renderer with Budget mapping
    const renderTriplets = (
      row: RowItem,
      cbals: number[],
      pmon: number[],
      weight?: 'normal' | 'bold' | '600',
      enableBanding: boolean = true
    ) => (
      months.map((_, i) => {
        const cellWeight =
          weight === 'bold' ? 'bold' : (weight === '600' ? ('600' as any) : 'normal');

        const bodyCellStyle = [
          styles.cell,
          { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
          enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
        ];

        // ✅ Budget lookup
        const y = Number(row.year || 0);
        const m = i + 1;
        const acc = String(row.accountno || '');
        const cc3 = String(row.cc3code || '');
        const t = String(row.type || '');
        const bKey = buildBudgetKey(t, y, m, acc, cc3);
        const bVal = budgetMap[bKey] || 0;

        return (
          <React.Fragment key={`row-m-${i}`}>
            <BudgetCell value={bVal} extraStyle={bodyCellStyle} />
            <Text numberOfLines={1} style={bodyCellStyle}>
              {(cbals[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
            </Text>
            <Text numberOfLines={1} style={bodyCellStyle}>
              {(pmon[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
            </Text>
          </React.Fragment>
        );
      })
    );

    if (item.isGroupParent) {
      const key = item.groupKey || `${item.year}::${item.type}::${item.component || ''}`;
      const isOpen = !!expandedGroups[key];
      const cbals = item.totalBalances ?? Array(12).fill(0);
      const total = item.totalSum ?? cbals.reduce((s, b) => s + b, 0);
      const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);

      return (
        <View>
          {/* Parent summary row */}
          <View style={[styles.bodyRow, {backgroundColor: '#f9fbff', height: ROW_HEIGHT}]}>
            <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: '600'}]}>
              {total.toLocaleString('en-US', {maximumFractionDigits: 0})}
            </Text>
            <Text numberOfLines={1} style={[styles.cell, {width: PREV_W, fontWeight: '600'}]}>
              {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
            </Text>

            {renderTriplets(item, cbals, pmon, '600', true)}
          </View>

          {/* Children rows (when expanded) */}
          {isOpen && item.children?.map((child, idx) => (
            <RightChildRow key={`RCH-${key}-${idx}`} child={child} />
          ))}
        </View>
      );
    }

    if (item.isTotalRow) {
      let bgColor = '#f0f8ff';
      let MbTotal = 0;
      if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
      if (item.totalType === 'Cost') bgColor = '#f7d1d1';
      if (item.totalType === 'Grand') { bgColor = '#ffe4b5'; MbTotal = 50; }
      const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);

      return (
        <View
          style={[
            styles.bodyRow,
            {backgroundColor: bgColor, borderTopWidth: 2, borderColor: '#aaa', height: ROW_HEIGHT, marginBottom: MbTotal},
          ]}>
          <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: 'bold'}]}>
            {item.totalSum?.toLocaleString('en-US', {maximumFractionDigits: 0})}
          </Text>
          <Text numberOfLines={1} style={[styles.cell, {width: PREV_W, fontWeight: 'bold'}]}>
            {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
          </Text>

          {/* Totals: banding OFF */}
          {renderTriplets(item, item.totalBalances || Array(12).fill(0), pmon, 'bold', false)}
        </View>
      );
    }

    const cbals: number[] = item.totalBalances
      ? item.totalBalances
      : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? item.balanceFirst || 0 : 0));
    const total = item.totalSum ?? cbals.reduce((s, b) => s + b, 0);
    const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);

    return (
      <View style={[styles.bodyRow, {height: ROW_HEIGHT}]}>
        <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W}]}>
          {total.toLocaleString('en-US', {maximumFractionDigits: 0})}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, {width: PREV_W}]}>
          {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
        </Text>

        {/* Normal rows: banding ON */}
        {renderTriplets(item, cbals, pmon, 'normal', true)}
      </View>
    );
  };

  // =================== UI ===================

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.Container}>
      <View style={{backgroundColor: Colors.PrimaryColor, padding: 20, flexDirection: 'row', justifyContent: 'space-between'}}>
        <CustomHeader title={`${company}  (P&L Report) `} />
        <TouchableOpacity
          style={styles.Btn}
          onPress={async () => {
            console.log('pressed XLSX export');
            try {
              const p = await exportTrialBalanceToXLSX(
                data,
                `TrialBalance_${company || 'All'}`
              );
              console.log('✅ file saved at:', p);
            } catch (e: any) {
              console.warn('❌ XLSX export failed:', e?.message ?? e);
            }
          }}>
          <Text style={styles.Btn_Txt}>Export Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Headers */}
      <View style={{flexDirection: 'row'}}>
        <LeftHeader />
        <RightHeader />
      </View>

      {/* Body: left fixed (3 cols) + right scrollable (synced vertically) */}
      <View style={{flex: 1, flexDirection: 'row'}}>
  {/* Left (fixed 3) */}
  <FlatList
    ref={leftListRef}
    data={data}
    keyExtractor={(_, index) => `L-${index}`}
    renderItem={renderLeftRow}
    initialNumToRender={20}
    maxToRenderPerBatch={20}
    windowSize={10}
    onScroll={onLeftVScroll}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
    style={{width: LEFT_WIDTH}}
  />

  {/* Right (horizontal + vertical) */}
  <ScrollView
    ref={bodyHRef}
    horizontal
    onScroll={onBodyHScroll}
    scrollEventThrottle={16}
    showsHorizontalScrollIndicator
  >
    <FlatList
      ref={rightListRef}
      data={data}
      keyExtractor={(_, index) => `R-${index}`}
      renderItem={renderRightRow}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={10}
      onScroll={onRightVScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={{width: rightContentWidth}}
    />
  </ScrollView>
</View>

    </View>
  );
}

// =================== STYLES ===================
const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: Colors.White,
  },
  headerRow: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Bg,
    borderBottomWidth: 2,
    borderColor: '#ddd',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0, // height via container
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#31368A',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
  },
  cell: {
    textAlign: 'center',
    fontSize: width > 600 ? 12 : 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  Btn: {
    backgroundColor: Colors.White,
    paddingHorizontal: 12,
    borderRadius: 6,
    paddingVertical: 10,
  },
  Btn_Txt: {
    color: Colors.PrimaryColor,
    fontWeight: 'bold',
    fontSize: 12,
  },
  darkHeaderCell: {
    backgroundColor: '#FFFFFF',
  },
  darkBodyCell: {
    backgroundColor: '#EFEFEF',
  },
});



// // TrialBalance.tsx
// import React, {useEffect, useRef, useState} from 'react';
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   ScrollView,
//   TouchableOpacity,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
// } from 'react-native';

// import {useRoute} from '@react-navigation/native';
// import firestore from '@react-native-firebase/firestore';
// import {
//   getAllTrialBalances,
//   TrialBalanceRow,
//   getCompanyPnL,
// } from '../../../../database/trailBalanceQueries';
// import CustomHeader from '../../../../component/customHeader';
// import {Colors} from '../../../../themes/color';
// import { exportTrialBalanceToXLSX } from '../../../../database/Utils/export_to_excel';

// const {width} = Dimensions.get('window');
// const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// // ====== Banding indices (month indexes): 0,2,4,6,8,10 ======
// const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

// // fixed dimensions so both panes align perfectly
// const HEADER_HEIGHT = 44;
// const ROW_HEIGHT = 30;
// const YEAR_HEADER_HEIGHT = 30;

// // LEFT (3 frozen cols)
// const TYPE_W = 100;
// const COMP_W = 170;
// const CODE_W = 110; // Code (Revenue: cc3code, Cost: auxcode)
// // const LEFT_WIDTH = TYPE_W + COMP_W + CODE_W;
// const LEFT_WIDTH = 570;

// // RIGHT
// const TOTAL_W = 100; // current total
// const PREV_W  = 120; // previous year total column width
// const MONTH_W = 100;

// // Right side total width: Total | Prev Total | per month => Budget | Current | Prev (x12)
// const rightContentWidth =
//   TOTAL_W + PREV_W + (12 * (3 * MONTH_W));

// type RowItem = TrialBalanceRow & {
//   isTotalRow?: boolean;
//   yearHeader?: boolean;
//   totalType?: 'Revenue' | 'Cost' | 'Grand';
//   totalBalances?: number[];        // current year monthly
//   totalSum?: number;               // current year total
//   prevYearSum?: number;            // previous year total
//   prevMonthlyBalances?: number[];  // previous year monthly

//   // grouping
//   isGroupParent?: boolean;
//   groupKey?: string; // `${year}::${type}::${component}`
//   children?: RowItem[];
// };

// type Snapshot = {
//   RevenueByComponent: Record<string, number>;
//   RevenueChildrenByKey: Record<string, number>;
//   CostByComponent: Record<string, number>;
//   CostChildrenByKey: Record<string, number>;
//   Totals: { Revenue: number; Cost: number; Grand: number };

//   // monthly maps
//   RevenueChildrenMonthlyByKey: Record<string, number[]>;
//   CostChildrenMonthlyByKey: Record<string, number[]>;
//   RevenueMonthlyByComponent: Record<string, number[]>;
//   CostMonthlyByComponent: Record<string, number[]>;
//   TotalsMonthly: { Revenue: number[]; Cost: number[]; Grand: number[] };
// };

// export default function SelectedCompany() {
//   const route = useRoute();
//   const {company = '', type = '', year} = (route.params ?? {}) as {
//     company?: string;
//     type?: string;
//     year?: number;
//   };

//   const [data, setData] = useState<RowItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

//   const toggleGroup = (key: string) => {
//     setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
//   };

//   // Freeze first 3 columns (LEFT) + RIGHT scrollable
//   const leftListRef = useRef<FlatList<RowItem>>(null);
//   const rightListRef = useRef<FlatList<RowItem>>(null);
//   const headerHRef = useRef<ScrollView>(null);
//   const bodyHRef = useRef<ScrollView>(null);
//   const isVSyncingRef = useRef(false);
//   const isHSyncingRef = useRef(false);

//   const onLeftVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isVSyncingRef.current) return;
//     isVSyncingRef.current = true;
//     const y = e.nativeEvent.contentOffset.y;
//     rightListRef.current?.scrollToOffset({offset: y, animated: false});
//     requestAnimationFrame(() => (isVSyncingRef.current = false));
//   };
//   const onRightVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isVSyncingRef.current) return;
//     isVSyncingRef.current = true;
//     const y = e.nativeEvent.contentOffset.y;
//     leftListRef.current?.scrollToOffset({offset: y, animated: false});
//     requestAnimationFrame(() => (isVSyncingRef.current = false));
//   };
//   const onHeaderHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isHSyncingRef.current) return;
//     isHSyncingRef.current = true;
//     const x = e.nativeEvent.contentOffset.x;
//     bodyHRef.current?.scrollTo({x, animated: false});
//     requestAnimationFrame(() => (isHSyncingRef.current = false));
//   };
//   const onBodyHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isHSyncingRef.current) return;
//     isHSyncingRef.current = true;
//     const x = e.nativeEvent.contentOffset.x;
//     headerHRef.current?.scrollTo({x, animated: false});
//     requestAnimationFrame(() => (isHSyncingRef.current = false));
//   };

//   // =================== DATA BUILD ===================
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         setLoading(true);

//         const allRows = await getAllTrialBalances();
//         const allPnL = await getCompanyPnL();

//         // ---------- CONFIG ----------
//         const splitPercentages: Record<string, number> = {
//           'West Walk Real Estate': 0.22,
//           'Assets Services Company': 0.6851,
//           'West Walk Advertisement': 0.0949,
//         };

//         const MP_NAME = 'Man Power / Salaries';

//         const CLUB_ACCOUNTS = new Set(['44104', '44107', '44122', '44124', '44125']);
//         const CLUB_ACCOUNTS_LABEL = 'Tenant Variation Request';
//         const CLUB_ACCOUNTS_ACCOUNT = '44104,44107,44122,44124,44125';

//         // ---------- HELPERS ----------
//         const isValidMonth = (m?: number | null) => typeof m === 'number' && m >= 1 && m <= 12;
//         const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

//         // Build MP by month for all years (raw, before splits)
//         const monthlyMpByYear: Record<number, number[]> = {};
//         allRows
//           .filter(r => r.type === 'Cost' && (r.company || '').trim() === MP_NAME)
//           .forEach(r => {
//             const y = Number(r.year);
//             const m = Number(r.month);
//             if (!y || !isValidMonth(m)) return;
//             if (!monthlyMpByYear[y]) monthlyMpByYear[y] = Array(12).fill(0);
//             monthlyMpByYear[y][m - 1] += r.balanceFirst || 0;
//           });

//         // Monthly net for a company/year with MP allocation applied
//         const buildMonthlyNet = (comp: string, yr: number): number[] => {
//           const pct = splitPercentages[comp] ?? 0;
//           const rev = Array(12).fill(0);
//           const cst = Array(12).fill(0);

//           allRows.forEach(r => {
//             if (r.company !== comp) return;
//             if (r.year !== yr) return;
//             if (!isValidMonth(r.month)) return;
//             const i = (r.month as number) - 1;
//             if (r.type === 'Revenue') rev[i] += r.balanceFirst || 0;
//             else if (r.type === 'Cost') cst[i] += r.balanceFirst || 0;
//           });

//         const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
//           return Array.from({ length: 12 }, (_, i) => {
//             const mpAlloc = mpMonths[i] * pct;
//             // costs already signed; net = rev + cost + mpAlloc
//             return (rev[i] || 0) + ((cst[i] || 0) + mpAlloc);
//           });
//         };

//         // ---------- FILTER for CURRENT view ----------
//         let filteredRows = allRows.filter(row => {
//           let matches = true;
//           if (company) matches = matches && row.company === company;
//           if (type) matches = matches && row.type === type;
//           if (year) matches = matches && row.year === year;
//           return matches;
//         });

//         // Revenue adjustment (Residential 41112 -> 41111)
//         filteredRows = filteredRows.map(r => {
//           if (r.type === 'Revenue' && r.accountno === '41112' && r.cc2 === 'Residential Rental') {
//             return { ...r, component: 'Residential', accountno: '41111' };
//           }
//           return r;
//         });

//         // ---------- SORT ----------
//         filteredRows.sort((a, b) => {
//           if ((a.year || 0) !== (b.year || 0)) return (b.year || 0) - (a.year || 0);
//           if ((a.accountno || '') !== (b.accountno || ''))
//             return (a.accountno || '').localeCompare(b.accountno || '');
//           return (a.cc3code || '').localeCompare(b.cc3code || '');
//         });

//         // ---------- YEARS ----------
//         const yearsSorted = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);

//         // ---------- Prev-year snapshot (monthly-aware) ----------
//         const buildYearSnapshot = (yr: number): Snapshot => {
//           // NOTE: prev snapshot **respects company only**, not `type`, so totals are consistent
//           const base = allRows.filter(r => {
//             let ok = true;
//             if (company) ok = ok && r.company === company;
//             return ok && r.year === yr;
//           });

//           const adjusted = base.map(r => {
//             if (r.type === 'Revenue' && r.accountno === '41112' && r.cc2 === 'Residential Rental') {
//               return { ...r, component: 'Residential', accountno: '41111' };
//             }
//             return r;
//           });

//           // ---- REVENUE grouping (with clubbing)
//           const revenueByKey: Record<string, { comp: string; balances: number[] }> = {};
//           adjusted
//             .filter(r => r.type === 'Revenue')
//             .forEach(r => {
//               const isClub = r.accountno && CLUB_ACCOUNTS.has(String(r.accountno));
//               const cc3 = r.cc3code || '';
//               const key = isClub ? `CLUB::${cc3}` : `${r.accountno || ''}||${cc3}`;
//               if (!revenueByKey[key]) {
//                 revenueByKey[key] = {
//                   comp: isClub ? CLUB_ACCOUNTS_LABEL : (r.component || ''),
//                   balances: Array(12).fill(0),
//                 };
//               }
//               if (isValidMonth(r.month)) {
//                 revenueByKey[key].balances[(r.month as number) - 1] += r.balanceFirst || 0;
//               }
//             });

//           let revenueChildrenByKey: Record<string, number> = {};
//           let revenueChildrenMonthlyByKey: Record<string, number[]> = {};
//           let revenueByComponent: Record<string, number> = {};
//           let revenueMonthlyByComponent: Record<string, number[]> = {};

//           Object.entries(revenueByKey).forEach(([k, v]) => {
//             revenueChildrenByKey[k] = sumArr(v.balances);
//             revenueChildrenMonthlyByKey[k] = v.balances.slice();
//             const comp = (v.comp || '').trim();
//             revenueByComponent[comp] = (revenueByComponent[comp] || 0) + revenueChildrenByKey[k];
//             if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
//             v.balances.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
//           });

//           // Injected revenue rows (monthly nets)
//           if (!type || type === 'Revenue') {
//             if (company === 'West Walk Real Estate') {
//               const wwa = buildMonthlyNet('West Walk Advertisement', yr);
//               if (wwa.some(n => n !== 0)) {
//                 const comp = 'Westwalk Marketing Rights';
//                 const key = 'XFR-WWA||';
//                 const total = sumArr(wwa);
//                 revenueByComponent[comp] = (revenueByComponent[comp] || 0) + total;
//                 revenueChildrenByKey[key] = (revenueChildrenByKey[key] || 0) + total;
//                 revenueChildrenMonthlyByKey[key] = wwa.slice();
//                 if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
//                 wwa.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
//               }
//             }
//             if (company === 'Assets Services Company') {
//               const asc = buildMonthlyNet('Assets Services Company', yr).map(n => -n);
//               if (asc.some(n => n !== 0)) {
//                 const comp = 'Contract with Westwalk';
//                 const key = 'XFR-ASC||';
//                 const total = sumArr(asc);
//                 revenueByComponent[comp] = (revenueByComponent[comp] || 0) + total;
//                 revenueChildrenByKey[key] = (revenueChildrenByKey[key] || 0) + total;
//                 revenueChildrenMonthlyByKey[key] = asc.slice();
//                 if (!revenueMonthlyByComponent[comp]) revenueMonthlyByComponent[comp] = Array(12).fill(0);
//                 asc.forEach((b,i)=>{ revenueMonthlyByComponent[comp][i] += b; });
//               }
//             }
//           }

//           // ---- COST grouping (accountno + auxcode) & merge empty-aux by component
//           const costRows = adjusted.filter(r => r.type === 'Cost');
//           const costByKeyRaw: Record<string, { r0: typeof costRows[number]; balances: number[] }> = {};
//           costRows.forEach(r => {
//             const key = `${r.accountno || ''}||${r.auxcode || ''}`;
//             if (!costByKeyRaw[key]) {
//               costByKeyRaw[key] = { r0: r, balances: Array(12).fill(0) };
//             }
//             if (isValidMonth(r.month)) {
//               costByKeyRaw[key].balances[(r.month as number) - 1] += r.balanceFirst || 0;
//             }
//           });

//           const withAux: Array<{ comp: string; key: string; total: number }> = [];
//           const emptyAuxByComp: Record<string, number[]> = {};
//           Object.entries(costByKeyRaw).forEach(([k, v]) => {
//             const comp = (v.r0.component || '').trim();
//             const total = sumArr(v.balances);
//             const aux = v.r0.auxcode;
//             if (aux) withAux.push({ comp, key: k, total });
//             else {
//               if (!emptyAuxByComp[comp]) emptyAuxByComp[comp] = Array(12).fill(0);
//               v.balances.forEach((b, i) => (emptyAuxByComp[comp][i] += b));
//             }
//           });

//           let costChildrenByKey: Record<string, number> = {};
//           let costChildrenMonthlyByKey: Record<string, number[]> = {};
//           let costByComponent: Record<string, number> = {};
//           let costMonthlyByComponent: Record<string, number[]> = {};

//           withAux.forEach(({ comp, key, total }) => {
//             const balances = costByKeyRaw[key].balances;
//             costChildrenByKey[key] = total;
//             costChildrenMonthlyByKey[key] = balances.slice();
//             costByComponent[comp] = (costByComponent[comp] || 0) + total;
//             if (!costMonthlyByComponent[comp]) costMonthlyByComponent[comp] = Array(12).fill(0);
//             balances.forEach((b,i)=>{ costMonthlyByComponent[comp][i] += b; });
//           });

//           Object.entries(emptyAuxByComp).forEach(([comp, bal]) => {
//             const total = sumArr(bal);
//             const synthKey = `MERGED_EMPTYAUX::${comp}`;
//             costChildrenByKey[synthKey] = total;
//             costChildrenMonthlyByKey[synthKey] = bal.slice();
//             costByComponent[comp] = (costByComponent[comp] || 0) + total;
//             if (!costMonthlyByComponent[comp]) costMonthlyByComponent[comp] = Array(12).fill(0);
//             bal.forEach((b,i)=>{ costMonthlyByComponent[comp][i] += b; });
//           });

//           // MP injected costs
//           if ((!type || type === 'Cost') && splitPercentages[company || '']) {
//             const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
//             if (company === 'Assets Services Company') {
//               const mpSplit = [
//                 { name: 'HouseKeeping-MP', percent: 0.435 },
//                 { name: 'Maintaince-MP',  percent: 0.405 },
//                 { name: 'Security-MP',    percent: 0.12  },
//                 { name: 'Store-MP',       percent: 0.03  },
//                 { name: 'Landscape',      percent: 0.01  },
//               ];
//               mpSplit.forEach(s => {
//                 const balances = mpMonths.map(v => v * (splitPercentages[company!] || 0) * s.percent);
//                 const total = sumArr(balances);
//                 const key = `MP::${s.name}`;
//                 costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
//                 costChildrenMonthlyByKey[key] = balances.slice();
//                 costByComponent[s.name] = (costByComponent[s.name] || 0) + total;
//                 if (!costMonthlyByComponent[s.name]) costMonthlyByComponent[s.name] = Array(12).fill(0);
//                 balances.forEach((b,i)=>{ costMonthlyByComponent[s.name][i] += b; });
//               });
//             } else {
//               const balances = mpMonths.map(v => v * (splitPercentages[company!] || 0));
//               const total = sumArr(balances);
//               const key = `MP::ManPower`;
//               costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
//               costChildrenMonthlyByKey[key] = balances.slice();
//               costByComponent['ManPower'] = (costByComponent['ManPower'] || 0) + total;
//               if (!costMonthlyByComponent['ManPower']) costMonthlyByComponent['ManPower'] = Array(12).fill(0);
//               balances.forEach((b,i)=>{ costMonthlyByComponent['ManPower'][i] += b; });
//             }
//           }

//           // Cross-entity injections
//           if (!type || type === 'Cost') {
//             if (company === 'West Walk Real Estate') {
//               const asc = buildMonthlyNet('Assets Services Company', yr);
//               if (asc.some(v => v !== 0)) {
//                 const total = sumArr(asc);
//                 const key = 'XFR-ASC||';
//                 costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
//                 costChildrenMonthlyByKey[key] = asc.slice();
//                 costByComponent['FM Cost'] = (costByComponent['FM Cost'] || 0) + total;
//                 if (!costMonthlyByComponent['FM Cost']) costMonthlyByComponent['FM Cost'] = Array(12).fill(0);
//                 asc.forEach((b,i)=>{ costMonthlyByComponent['FM Cost'][i] += b; });
//               }
//             }
//             if (company === 'West Walk Advertisement') {
//               const wwa = buildMonthlyNet('West Walk Advertisement', yr).map(n => -n);
//               if (wwa.some(v => v !== 0)) {
//                 const total = sumArr(wwa);
//                 const key = 'XFR-WWA||';
//                 costChildrenByKey[key] = (costChildrenByKey[key] || 0) + total;
//                 costChildrenMonthlyByKey[key] = wwa.slice();
//                 costByComponent['Westwalk Marketing Rights'] =
//                   (costByComponent['Westwalk Marketing Rights'] || 0) + total;
//                 if (!costMonthlyByComponent['Westwalk Marketing Rights'])
//                   costMonthlyByComponent['Westwalk Marketing Rights'] = Array(12).fill(0);
//                 wwa.forEach((b,i)=>{ costMonthlyByComponent['Westwalk Marketing Rights'][i] += b; });
//               }
//             }
//           }

//           const revTotalsMonthly = Array(12).fill(0);
//           Object.values(revenueMonthlyByComponent).forEach(arr => arr.forEach((b,i)=> revTotalsMonthly[i]+=b));

//           const costTotalsMonthly = Array(12).fill(0);
//           Object.values(costMonthlyByComponent).forEach(arr => arr.forEach((b,i)=> costTotalsMonthly[i]+=b));

//           const grandTotalsMonthly = revTotalsMonthly.map((v,i)=> v + costTotalsMonthly[i]);

//           const revTotal = Object.values(revenueByComponent).reduce((a, b) => a + b, 0);
//           const costTotal = Object.values(costByComponent).reduce((a, b) => a + b, 0);

//           return {
//             RevenueByComponent: revenueByComponent,
//             RevenueChildrenByKey: revenueChildrenByKey,
//             CostByComponent: costByComponent,
//             CostChildrenByKey: costChildrenByKey,
//             Totals: { Revenue: revTotal, Cost: costTotal, Grand: revTotal + costTotal },

//             RevenueChildrenMonthlyByKey: revenueChildrenMonthlyByKey,
//             CostChildrenMonthlyByKey: costChildrenMonthlyByKey,
//             RevenueMonthlyByComponent: revenueMonthlyByComponent,
//             CostMonthlyByComponent: costMonthlyByComponent,
//             TotalsMonthly: {
//               Revenue: revTotalsMonthly,
//               Cost: costTotalsMonthly,
//               Grand: grandTotalsMonthly,
//             },
//           };
//         };

//         // Pre-compute prev snapshot for each year we will render
//         const prevYearCache: Record<number, Snapshot> = {};
//         yearsSorted.forEach(yr => {
//           prevYearCache[yr] = buildYearSnapshot((yr || 0) - 1);
//         });

//         // ---------- BUILD STRUCTURED DATA ----------
//         const structured: RowItem[] = [];

//         yearsSorted.forEach(yr => {
//           const yearRows = filteredRows.filter(r => r.year === yr);

//           structured.push({ yearHeader: true, company, year: yr } as RowItem);

//           // ===== REVENUE =====
//           const revenueRows = yearRows.filter(r => r.type === 'Revenue');
//           const revenueByKey: Record<string, RowItem> = {};
//           revenueRows.forEach(r => {
//             const isClubbed = r.accountno && CLUB_ACCOUNTS.has(String(r.accountno));
//             const cc3 = r.cc3code || '';
//             const key = isClubbed ? `CLUB::${cc3}` : `${r.accountno || ''}||${cc3}`;
//             if (!revenueByKey[key]) {
//               const balances = Array(12).fill(0);
//               if (isValidMonth(r.month)) balances[(r.month as number) - 1] = r.balanceFirst || 0;
//               revenueByKey[key] = {
//                 ...r,
//                 component: isClubbed ? CLUB_ACCOUNTS_LABEL : (r.component || ''),
//                 accountno: isClubbed ? CLUB_ACCOUNTS_ACCOUNT : (r.accountno || ''),
//                 cc3code: cc3,
//                 totalBalances: balances,
//                 totalSum: sumArr(balances),
//                 year: yr,
//               };
//             } else {
//               if (isValidMonth(r.month)) {
//                 revenueByKey[key].totalBalances![(r.month as number) - 1] += r.balanceFirst || 0;
//               }
//               revenueByKey[key].totalSum = sumArr(revenueByKey[key].totalBalances!);
//               if (isClubbed) {
//                 revenueByKey[key].component = CLUB_ACCOUNTS_LABEL;
//                 revenueByKey[key].accountno = CLUB_ACCOUNTS_ACCOUNT;
//               }
//             }
//           });

//           const groupedRevenue = Object.values(revenueByKey);

//           // Injected revenue rows (monthly)
//           if (!type || type === 'Revenue') {
//             if (company === 'West Walk Real Estate') {
//               const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', yr);
//               if (wwaMonthlyNet.some(v => v !== 0)) {
//                 const wwaPrev = buildMonthlyNet('West Walk Advertisement', yr - 1);
//                 groupedRevenue.push({
//                   type: 'Revenue',
//                   company,
//                   component: 'Westwalk Marketing Rights',
//                   accountno: 'XFR-WWA',
//                   cc3code: '',
//                   totalBalances: wwaMonthlyNet,
//                   totalSum: sumArr(wwaMonthlyNet),
//                   prevYearSum: sumArr(wwaPrev),
//                   prevMonthlyBalances: wwaPrev.slice(),
//                   year: yr,
//                 } as RowItem);
//               }
//             }
//             if (company === 'Assets Services Company') {
//               const ascMonthlyNet = buildMonthlyNet('Assets Services Company', yr).map(n => -n);
//               if (ascMonthlyNet.some(v => v !== 0)) {
//                 const ascPrev = buildMonthlyNet('Assets Services Company', yr - 1).map(n => -n);
//                 groupedRevenue.push({
//                   type: 'Revenue',
//                   company,
//                   component: 'Contract with Westwalk',
//                   accountno: 'XFR-ASC',
//                   cc3code: '',
//                   totalBalances: ascMonthlyNet,
//                   totalSum: sumArr(ascMonthlyNet),
//                   prevYearSum: sumArr(ascPrev),
//                   prevMonthlyBalances: ascPrev.slice(),
//                   year: yr,
//                 } as RowItem);
//               }
//             }
//           }

//           // Collapse revenue by component
//           const revenueByComponent: Record<string, RowItem[]> = {};
//           groupedRevenue.forEach(r => {
//             const comp = (r.component || '').trim();
//             const k = `${yr}::Revenue::${comp}`;
//             if (!revenueByComponent[k]) revenueByComponent[k] = [];
//             revenueByComponent[k].push(r);
//           });

//           const groupedRevenueCollapsed: RowItem[] = [];
//           Object.entries(revenueByComponent).forEach(([key, arr]) => {
//             if (arr.length <= 1) {
//               const obj = arr[0];
//               // fill prev from snapshot if needed
//               if (obj.prevYearSum == null) {
//                 const childKey = obj.accountno && (obj.accountno.startsWith('XFR-') ? `${obj.accountno}||` : `${obj.accountno || ''}||${obj.cc3code || ''}`);
//                 const snap = prevYearCache[yr];
//                 const fromChild = childKey ? snap?.RevenueChildrenByKey[childKey] : undefined;
//                 obj.prevYearSum = (fromChild != null) ? fromChild : (snap?.RevenueByComponent[(obj.component || '').trim()] || 0);

//                 const fromChildMon = childKey ? snap?.RevenueChildrenMonthlyByKey[childKey] : undefined;
//                 const fromCompMon  = snap?.RevenueMonthlyByComponent[(obj.component || '').trim()];
//                 obj.prevMonthlyBalances = (fromChildMon && fromChildMon.slice())
//                   || (fromCompMon && fromCompMon.slice()) || Array(12).fill(0);
//               } else if (!obj.prevMonthlyBalances) {
//                 obj.prevMonthlyBalances = Array(12).fill(0);
//               }
//               groupedRevenueCollapsed.push(obj);
//             } else {
//               const sumBalances = Array(12).fill(0);
//               arr.forEach(ch => ch.totalBalances?.forEach((b, i) => (sumBalances[i] += b)));
//               const snap = prevYearCache[yr];
//               const parent: RowItem = {
//                 isGroupParent: true,
//                 groupKey: key,
//                 type: 'Revenue',
//                 company,
//                 component: arr[0].component || '',
//                 accountno: '',
//                 cc3code: '',
//                 totalBalances: sumBalances,
//                 totalSum: sumArr(sumBalances),
//                 year: yr,
//                 children: arr.map(ch => {
//                   const childKey = ch.accountno && (ch.accountno.startsWith('XFR-') ? `${ch.accountno}||` : `${ch.accountno || ''}||${ch.cc3code || ''}`);
//                   const prev = childKey ? snap?.RevenueChildrenByKey[childKey] : undefined;
//                   const prevMon = childKey ? snap?.RevenueChildrenMonthlyByKey[childKey] : undefined;
//                   return {
//                     ...ch,
//                     prevYearSum: (ch.prevYearSum != null) ? ch.prevYearSum : (prev || 0),
//                     prevMonthlyBalances: (ch.prevMonthlyBalances) ? ch.prevMonthlyBalances
//                       : ((prevMon && prevMon.slice()) || Array(12).fill(0)),
//                   };
//                 }),
//               };
//               parent.prevYearSum = snap?.RevenueByComponent[(parent.component || '').trim()] || 0;
//               parent.prevMonthlyBalances =
//                 (snap?.RevenueMonthlyByComponent[(parent.component || '').trim()] || Array(12).fill(0)).slice();
//               groupedRevenueCollapsed.push(parent);
//             }
//           });

//           structured.push(...groupedRevenueCollapsed);
//           if (groupedRevenueCollapsed.length) {
//             const revBalances = Array(12).fill(0);
//             groupedRevenueCollapsed.forEach(r => r.totalBalances?.forEach((b, i) => (revBalances[i] += b)));
//             structured.push({
//               isTotalRow: true,
//               totalType: 'Revenue',
//               company,
//               totalBalances: revBalances,
//               totalSum: sumArr(revBalances),
//               prevYearSum: prevYearCache[yr]?.Totals?.Revenue || 0,
//               prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Revenue?.slice() || Array(12).fill(0),
//               year: yr,
//             } as RowItem);
//           }

//           // ===== COST =====
//           const costRows = yearRows.filter(r => r.type === 'Cost');
//           let groupedCost: RowItem[] = [];

//           // base grouping: accountno || auxcode
//           const costByKey: Record<string, TrialBalanceRow[]> = {};
//           costRows.forEach(r => {
//             const key = `${r.accountno || ''}||${r.auxcode || ''}`;
//             if (!costByKey[key]) costByKey[key] = [];
//             costByKey[key].push(r);
//           });
//           Object.keys(costByKey).forEach(k => {
//             const rows = costByKey[k];
//             const balances = Array(12).fill(0);
//             rows.forEach(r => {
//               if (isValidMonth(r.month)) balances[(r.month as number) - 1] += r.balanceFirst || 0;
//             });
//             groupedCost.push({
//               type: 'Cost',
//               company,
//               accountno: rows[0].accountno,
//               auxcode: rows[0].auxcode,
//               component: rows[0].component || '',
//               cc2: rows[0].cc2,
//               cc3code: rows[0].cc3code,
//               totalBalances: balances,
//               totalSum: sumArr(balances),
//               year: yr,
//             } as RowItem);
//           });

//           // merge empty-aux rows under component
//           const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
//           const mergedMap: Record<string, RowItem> = {};
//           emptyAuxRows.forEach(r => {
//             const k = r.component || '';
//             if (!mergedMap[k]) mergedMap[k] = { ...r };
//             else {
//               mergedMap[k].totalBalances = mergedMap[k].totalBalances?.map(
//                 (b, i) => b + (r.totalBalances?.[i] || 0),
//               );
//               mergedMap[k].totalSum = sumArr(mergedMap[k].totalBalances || []);
//               mergedMap[k].accountno = ((mergedMap[k].accountno || '') + ', ' + (r.accountno || '')).replace(/^,\s*/, '');
//             }
//           });
//           groupedCost = groupedCost.filter(r => r.auxcode);
//           groupedCost.push(...Object.values(mergedMap));

//           // MP rows (monthly) + prevYearSum/monthly
//           if ((!type || type === 'Cost') && splitPercentages[company || '']) {
//             const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
//             const mpPrev = monthlyMpByYear[yr - 1] ?? Array(12).fill(0);

//             if (company === 'Assets Services Company') {
//               const mpSplit = [
//                 { name: 'HouseKeeping-MP', percent: 0.435 },
//                 { name: 'Maintaince-MP',  percent: 0.405 },
//                 { name: 'Security-MP',    percent: 0.12  },
//                 { name: 'Store-MP',       percent: 0.03  },
//                 { name: 'Landscape',      percent: 0.01  },
//               ];
//               mpSplit.forEach(s => {
//                 const bal = mpMonths.map(v => v * (splitPercentages[company!] || 0) * s.percent);
//                 const balPrev = mpPrev.map(v => v * (splitPercentages[company!] || 0) * s.percent);
//                 groupedCost.push({
//                   type: 'Cost',
//                   company,
//                   component: s.name,
//                   accountno: 'MP',
//                   auxcode: '',
//                   totalBalances: bal,
//                   totalSum: sumArr(bal),
//                   prevYearSum: sumArr(balPrev),
//                   prevMonthlyBalances: balPrev.slice(),
//                   year: yr,
//                 } as RowItem);
//               });
//             } else {
//               const bal = mpMonths.map(v => v * (splitPercentages[company!] || 0));
//               const balPrev = mpPrev.map(v => v * (splitPercentages[company!] || 0));
//               groupedCost.push({
//                 type: 'Cost',
//                 company,
//                 component: 'ManPower',
//                 accountno: 'MP',
//                 auxcode: '',
//                 totalBalances: bal,
//                 totalSum: sumArr(bal),
//                 prevYearSum: sumArr(balPrev),
//                 prevMonthlyBalances: balPrev.slice(),
//                 year: yr,
//               } as RowItem);
//             }
//           }

//           // Cross-entity cost rows — monthly + prevYearSum/monthly
//           if (!type || type === 'Cost') {
//             if (company === 'West Walk Real Estate') {
//               const asc = buildMonthlyNet('Assets Services Company', yr);
//               const ascPrev = buildMonthlyNet('Assets Services Company', yr - 1);
//               if (asc.some(v => v !== 0)) {
//                 groupedCost.push({
//                   type: 'Cost',
//                   company,
//                   component: 'FM Cost',
//                   accountno: 'XFR-ASC',
//                   auxcode: '',
//                   totalBalances: asc,
//                   totalSum: sumArr(asc),
//                   prevYearSum: sumArr(ascPrev),
//                   prevMonthlyBalances: ascPrev.slice(),
//                   year: yr,
//                 } as RowItem);
//               }
//             }
//             if (company === 'West Walk Advertisement') {
//               const wwa = buildMonthlyNet('West Walk Advertisement', yr).map(n => -n);
//               const wwaPrev = buildMonthlyNet('West Walk Advertisement', yr - 1).map(n => -n);
//               if (wwa.some(v => v !== 0)) {
//                 groupedCost.push({
//                   type: 'Cost',
//                   company,
//                   component: 'Westwalk Marketing Rights',
//                   accountno: 'XFR-WWA',
//                   auxcode: '',
//                   totalBalances: wwa,
//                   totalSum: sumArr(wwa),
//                   prevYearSum: sumArr(wwaPrev),
//                   prevMonthlyBalances: wwaPrev.slice(),
//                   year: yr,
//                 } as RowItem);
//               }
//             }
//           }

//           // Collapse cost by component
//           const costByComponent: Record<string, RowItem[]> = {};
//           groupedCost.forEach(r => {
//             const comp = (r.component || '').trim();
//             const k = `${yr}::Cost::${comp}`;
//             if (!costByComponent[k]) costByComponent[k] = [];
//             costByComponent[k].push(r);
//           });

//           const groupedCostCollapsed: RowItem[] = [];
//           Object.entries(costByComponent).forEach(([key, arr]) => {
//             if (arr.length <= 1) {
//               const obj = arr[0];
//               if (obj.prevYearSum == null) {
//                 const childKey =
//                   obj.accountno && (obj.accountno.startsWith('XFR-')
//                     ? `${obj.accountno}||`
//                     : `${obj.accountno || ''}||${obj.auxcode || ''}`);
//                 const snap = prevYearCache[yr];
//                 const fromChild = childKey ? snap?.CostChildrenByKey[childKey] : undefined;
//                 obj.prevYearSum = (fromChild != null) ? fromChild
//                   : (snap?.CostByComponent[(obj.component || '').trim()] || 0);

//                 const fromChildMon = childKey ? snap?.CostChildrenMonthlyByKey[childKey] : undefined;
//                 const fromCompMon  = snap?.CostMonthlyByComponent[(obj.component || '').trim()];
//                 obj.prevMonthlyBalances = (fromChildMon && fromChildMon.slice())
//                   || (fromCompMon && fromCompMon.slice()) || Array(12).fill(0);
//               } else if (!obj.prevMonthlyBalances) {
//                 obj.prevMonthlyBalances = Array(12).fill(0);
//               }
//               groupedCostCollapsed.push(obj);
//             } else {
//               const sumBalances = Array(12).fill(0);
//               const snap = prevYearCache[yr];
//               const childrenWithPrev = arr.map(ch => {
//                 const childKey =
//                   ch.accountno && (ch.accountno.startsWith('XFR-')
//                     ? `${ch.accountno}||`
//                     : `${ch.accountno || ''}||${ch.auxcode || ''}`);
//                 const prev = childKey ? snap?.CostChildrenByKey[childKey] : undefined;
//                 const prevMon = childKey ? snap?.CostChildrenMonthlyByKey[childKey] : undefined;
//                 return {
//                   ...ch,
//                   prevYearSum: (ch.prevYearSum != null) ? ch.prevYearSum : (prev || 0),
//                   prevMonthlyBalances: (ch.prevMonthlyBalances) ? ch.prevMonthlyBalances
//                     : ((prevMon && prevMon.slice()) || Array(12).fill(0)),
//                 };
//               });
//               childrenWithPrev.forEach(ch => ch.totalBalances?.forEach((b, i) => (sumBalances[i] += b)));
//               const parent: RowItem = {
//                 isGroupParent: true,
//                 groupKey: key,
//                 type: 'Cost',
//                 company,
//                 component: arr[0].component || '',
//                 accountno: '',
//                 cc3code: '',
//                 auxcode: '',
//                 totalBalances: sumBalances,
//                 totalSum: sumArr(sumBalances),
//                 year: yr,
//                 children: childrenWithPrev,
//               };
//               parent.prevYearSum =
//                 snap?.CostByComponent[(parent.component || '').trim()] || 0;
//               parent.prevMonthlyBalances =
//                 (snap?.CostMonthlyByComponent[(parent.component || '').trim()] || Array(12).fill(0)).slice();
//               groupedCostCollapsed.push(parent);
//             }
//           });

//           structured.push(...groupedCostCollapsed);
//           if (groupedCostCollapsed.length) {
//             const costBalances = Array(12).fill(0);
//             groupedCostCollapsed.forEach(r => r.totalBalances?.forEach((b, i) => (costBalances[i] += b)));
//             structured.push({
//               isTotalRow: true,
//               totalType: 'Cost',
//               company,
//               totalBalances: costBalances,
//               totalSum: sumArr(costBalances),
//               prevYearSum: prevYearCache[yr]?.Totals?.Cost || 0,
//               prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Cost?.slice() || Array(12).fill(0),
//               year: yr,
//             } as RowItem);
//           }

//           // ===== GRAND / NET (using collapsed)
//           const netBalances = Array(12).fill(0);
//           for (let i = 0; i < 12; i++) {
//             const rev = groupedRevenueCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//             const cst = groupedCostCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//             netBalances[i] = rev + cst;
//           }
//           structured.push({
//             isTotalRow: true,
//             totalType: 'Grand',
//             company,
//             totalBalances: netBalances,
//             totalSum: sumArr(netBalances),
//             prevYearSum: prevYearCache[yr]?.Totals?.Grand || 0,
//             prevMonthlyBalances: prevYearCache[yr]?.TotalsMonthly?.Grand?.slice() || Array(12).fill(0),
//             year: yr,
//           } as RowItem);
//         });

//         setData(structured);
//       } catch (err) {
//         setError('Failed to load trial balance');
//         console.log(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadData();
//   }, [company, type, year]);

//   // =================== RENDER HELPERS ===================

//   // BUDGET cell renderer — blank for now (with optional extra style for banding)
//   const BudgetCell = ({extraStyle}: {extraStyle?: any}) => (
//     <Text numberOfLines={1} style={[styles.cell, {width: MONTH_W}, extraStyle]}>{''}</Text>
//   );

//   const LeftChildRow = ({child}: {child: RowItem}) => {
//     return (
//       <View style={[styles.bodyRow, {width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: '#EFEFEF'}]}>
//         <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, color: '#333',textAlign:"left" }]}>{child.type}</Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: COMP_W, color: '#333',textAlign:"left" }]}>{child.component}</Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, color: '#666',textAlign:"left" }]}>
//           {child.type === 'Revenue' ? (child.cc3code || '') : (child.auxcode || '')}
//         </Text>
//       </View>
//     );
//   };



//   const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);
  
//   const RightChildRow = ({child}: {child: RowItem}) => {
//     const cbals = child.totalBalances ?? Array(12).fill(0);
//     const ctotal = child.totalSum ?? cbals.reduce((s, b) => s + b, 0);
//     const prev = child.prevYearSum ?? 0;
//     const pmon = child.prevMonthlyBalances ?? Array(12).fill(0);

//     return (
//       <View style={[styles.bodyRow, {height: ROW_HEIGHT,}]}>
//         <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W}]}>
//           {ctotal.toLocaleString('en-US', {maximumFractionDigits: 0})}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: PREV_W}]}>
//           {Number(prev).toLocaleString('en-US', {maximumFractionDigits: 0})}
//         </Text>

//         {/* Per-month triplets: Budget (blank) | Current | Prev */}
//         {months.map((_, i) => {
//           const bodyCellStyle = [
//             styles.cell,
//             { width: MONTH_W,paddingVertical:5 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];
//           return (
//             <React.Fragment key={`m-${i}`}>
//               <BudgetCell extraStyle={bodyCellStyle} />
//               <Text numberOfLines={1} style={bodyCellStyle}>
//                 {(cbals[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//               </Text>
//               <Text numberOfLines={1} style={bodyCellStyle}>
//                 {(pmon[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//               </Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     );
//   };

//   // =================== RENDERERS ===================

//   const LeftHeader = () => (
//     <View style={[styles.headerRow, {width: 384, height: HEADER_HEIGHT, backgroundColor:'#EFEFEF'}]}>
//       <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, fontWeight: 'bold'}]}>Type</Text>
//       <Text numberOfLines={1} style={[styles.cell, {width: COMP_W, fontWeight: 'bold'}]}>Component</Text>
//       <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, fontWeight: 'bold'}]}>Code/Aux</Text>
//     </View>
//   );

//   const RightHeader = () => (
//     <ScrollView
//       ref={headerHRef}
//       horizontal
//       onScroll={onHeaderHScroll}
//       scrollEventThrottle={16}
//       showsHorizontalScrollIndicator
//     >
//       <View style={[styles.headerRow, {width: rightContentWidth, height: HEADER_HEIGHT,backgroundColor:"#ffffff"  }]}>
//         <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: 'bold', textAlign:"center"}]}>Total</Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: PREV_W,  fontWeight: 'bold', textAlign:"center"}]}>Total (P)</Text>

//         {/* Per-month headers: Budget | Current | Prev with banding */}
//         {months.map((m, i) => {
//           const dark = DARK_GROUP_INDEX.has(i);
//           const headerCellStyle = [
//             styles.cell,
//             { width: MONTH_W, fontWeight: 'bold', textAlign:"center", paddingVertical:13 },
//             dark && styles.darkBodyCell, // ✅ sirf background
//           ];
//           return (
//             <React.Fragment key={`h-${m}`}>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (B)`}</Text>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (A)`}</Text>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (P)`}</Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     </ScrollView>
//   );

//   const renderLeftRow = ({item}: {item: RowItem}) => {
//     if (item.yearHeader) {
//       return (
//         <View style={[styles.yearHeaderRow, {width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
//           <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 16, color: 'white'}}>
//             {item.company} - {item.year}
//           </Text>
//         </View>
//       );
//     }

//     if (item.isGroupParent) {
//       const key = item.groupKey || `${item.year}::${item.type}::${item.component || ''}`;
//       const isOpen = !!expandedGroups[key];

//       return (
//         <View>
//           {/* Parent row */}
//           <View style={[styles.bodyRow, {backgroundColor: '#EFEFEF', width: LEFT_WIDTH, height: ROW_HEIGHT}]}>
//             <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W,textAlign:"left" }]}>{item.type}</Text>
//             <View style={{flexDirection: 'row', width: COMP_W}}>
//               <TouchableOpacity onPress={() => toggleGroup(key)} style={{flexDirection: 'row'}}>
//                 <Text style={{fontSize: 12, fontWeight: 'bold', paddingRight: 8}}>
//                   {isOpen ? '▾' : '▸'}
//                 </Text>
//                 <Text numberOfLines={1} style={{flexShrink: 1, fontSize: 12}}>
//                   {item.component}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//             <Text numberOfLines={1} style={[styles.cell, {width: CODE_W, color:'#EFEFEF',textAlign:"left" }]} />
//           </View>

//           {/* Children (when expanded) */}
//           {isOpen && item.children?.map((child, idx) => (
//             <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />
//           ))}
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       const label = item.totalType === 'Grand' ? 'Net Total' : `${item.totalType} Total`;
//       let bgColor = '#f0f8ff';
//       let MbTotal = 0;
//       if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
//       if (item.totalType === 'Cost') bgColor = '#f7d1d1';
//       if (item.totalType === 'Grand') { bgColor = '#ffe4b5'; MbTotal = 50; }

//       return (
//         <View
//           style={[
//             styles.bodyRow,
//             {
//               backgroundColor: bgColor,
//               borderTopWidth: 2,
//               borderColor: '#aaa',
//               width: LEFT_WIDTH,
//               height: ROW_HEIGHT,
//               marginBottom: MbTotal,
//             },
//           ]}>
//           <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W, fontWeight: 'bold',textAlign:"left" }]}>{label}</Text>
//           <Text numberOfLines={1} style={[styles.cell, {width: COMP_W,textAlign:"left" }]}>{item.company}</Text>
//           <Text numberOfLines={1} style={[styles.cell, {width: CODE_W,textAlign:"left" }]} />
//         </View>
//       );
//     }

//     return (
//       <View style={[styles.bodyRow, {width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: '#EFEFEF',  }]}>
//         <Text numberOfLines={1} style={[styles.cell, {width: TYPE_W,textAlign:"left" }]}>{item.type}</Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: COMP_W,textAlign:"left" }]}>{item.component}</Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: CODE_W,textAlign:"left" , color:'#666'}]}>
//           {item.type === 'Revenue' ? (item.cc3code || '') : (item.auxcode || '')}
//         </Text>
//       </View>
//     );
//   };

//   const renderRightRow = ({item}: {item: RowItem}) => {
//     if (item.yearHeader) {
//       return (
//         <View style={[styles.yearHeaderRow, {width: rightContentWidth, height: YEAR_HEADER_HEIGHT}]} />
//       );
//     }
  
//     // ✅ Triplets renderer with optional banding control
//     const renderTriplets = (
//       cbals: number[],
//       pmon: number[],
//       weight?: 'normal' | 'bold' | '600',
//       enableBanding: boolean = true
//     ) => (
//       months.map((_, i) => {
//         const cellWeight =
//           weight === 'bold' ? 'bold' : (weight === '600' ? '600' as any : 'normal');
  
//         const bodyCellStyle = [
//           styles.cell,
//           { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
//           // ⬇️ Banding sirf tab lagayen jab enableBanding === true ho
//           enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//         ];
  
//         return (
//           <React.Fragment key={`row-m-${i}`}>
//             <Text numberOfLines={1} style={bodyCellStyle}>{''}</Text>
//             <Text numberOfLines={1} style={bodyCellStyle}>
//               {(cbals[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//             </Text>
//             <Text numberOfLines={1} style={bodyCellStyle}>
//               {(pmon[i] || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//             </Text>
//           </React.Fragment>
//         );
//       })
//     );
  
//     if (item.isGroupParent) {
//       const key = item.groupKey || `${item.year}::${item.type}::${item.component || ''}`;
//       const isOpen = !!expandedGroups[key];
//       const cbals = item.totalBalances ?? Array(12).fill(0);
//       const total = item.totalSum ?? cbals.reduce((s, b) => s + b, 0);
//       const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);
  
//       return (
//         <View>
//           {/* Parent summary row */}
//           <View style={[styles.bodyRow, {backgroundColor: '#f9fbff', height: ROW_HEIGHT}]}>
//             <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: '600'}]}>
//               {total.toLocaleString('en-US', {maximumFractionDigits: 0})}
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, {width: PREV_W, fontWeight: '600'}]}>
//               {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//             </Text>
  
//             {/* ⬇️ Group parent per banding allowed */}
//             {renderTriplets(cbals, pmon, '600', true)}
//           </View>
  
//           {/* Children rows (when expanded) */}
//           {isOpen && item.children?.map((child, idx) => (
//             <RightChildRow key={`RCH-${key}-${idx}`} child={child} />
//           ))}
//         </View>
//       );
//     }
  
//     if (item.isTotalRow) {
//       let bgColor = '#f0f8ff';
//       let MbTotal = 0;
//       if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
//       if (item.totalType === 'Cost') bgColor = '#f7d1d1';
//       if (item.totalType === 'Grand') { bgColor = '#ffe4b5'; MbTotal = 50; }
//       const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);
  
//       return (
//         <View
//           style={[
//             styles.bodyRow,
//             {backgroundColor: bgColor, borderTopWidth: 2, borderColor: '#aaa', height: ROW_HEIGHT, marginBottom: MbTotal},
//           ]}>
  
//           <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W, fontWeight: 'bold'}]}>
//             {item.totalSum?.toLocaleString('en-US', {maximumFractionDigits: 0})}
//           </Text>
//           <Text numberOfLines={1} style={[styles.cell, {width: PREV_W, fontWeight: 'bold'}]}>
//             {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//           </Text>
  
//           {/* ⬇️ Totals par banding OFF */}
//           {renderTriplets(item.totalBalances || Array(12).fill(0), pmon, 'bold', false)}
//         </View>
//       );
//     }
  
//     const cbals: number[] = item.totalBalances
//       ? item.totalBalances
//       : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? item.balanceFirst || 0 : 0));
//     const total = item.totalSum ?? cbals.reduce((s, b) => s + b, 0);
//     const pmon = item.prevMonthlyBalances ?? Array(12).fill(0);
  
//     return (
//       <View style={[styles.bodyRow, {height: ROW_HEIGHT}]}>
//         <Text numberOfLines={1} style={[styles.cell, {width: TOTAL_W}]}>
//           {total.toLocaleString('en-US', {maximumFractionDigits: 0})}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, {width: PREV_W}]}>
//           {(item.prevYearSum ?? 0).toLocaleString('en-US', {maximumFractionDigits: 0})}
//         </Text>
  
//         {/* ⬇️ Normal rows par banding ON */}
//         {renderTriplets(cbals, pmon, 'normal', true)}
//       </View>
//     );
//   };
  

//   // =================== UI ===================

//   if (loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={Colors.PrimaryColor} />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.centered}>
//         <Text>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.Container}>
//       <View style={{backgroundColor: Colors.PrimaryColor, padding: 20, flexDirection: 'row', justifyContent: 'space-between'}}>
//         <CustomHeader title={`${company}  (P&L Report) `} />
//         <TouchableOpacity
//   style={styles.Btn}
//   onPress={async () => {
//     console.log('pressed XLSX export');
//     try {
//       const p = await exportTrialBalanceToXLSX(
//         data,
//         `TrialBalance_${company || 'All'}`
//       );
//       console.log('✅ file saved at:', p);
//     } catch (e: any) {
//       console.warn('❌ XLSX export failed:', e?.message ?? e);
//     }
//   }}>
//   <Text style={styles.Btn_Txt}>Export Excel</Text>
// </TouchableOpacity>


//       </View>

//       {/* Headers */}
//       <View style={{flexDirection: 'row'}}>
//         <LeftHeader />
//         <RightHeader />
//       </View>

//       {/* Body: left fixed (3 cols) + right scrollable (synced vertically) */}
//       <View style={{flex: 1, flexDirection: 'row'}}>
//         {/* Left (fixed 3) */}
//         <FlatList
//           ref={leftListRef}
//           data={data}
//           keyExtractor={(_, index) => `L-${index}`}
//           renderItem={renderLeftRow}
//           initialNumToRender={20}
//           maxToRenderPerBatch={20}
//           windowSize={10}
//           onScroll={onLeftVScroll}
//           scrollEventThrottle={16}
//           showsVerticalScrollIndicator={false}
//           style={{width: LEFT_WIDTH}}
//         />

//         {/* Right (horizontal + vertical) */}
//         <ScrollView
//           ref={bodyHRef}
//           horizontal
//           onScroll={onBodyHScroll}
//           scrollEventThrottle={16}
//           showsHorizontalScrollIndicator
//         >
//           <FlatList
//             ref={rightListRef}
//             data={data}
//             keyExtractor={(_, index) => `R-${index}`}
//             renderItem={renderRightRow}
//             initialNumToRender={20}
//             maxToRenderPerBatch={20}
//             windowSize={10}
//             onScroll={onRightVScroll}
//             scrollEventThrottle={16}
//             showsVerticalScrollIndicator={false}
//             style={{width: rightContentWidth}}
//           />
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// // =================== STYLES ===================
// const styles = StyleSheet.create({
//   Container: {
//     flex: 1,
//     backgroundColor: Colors.White,
//   },
//   headerRow: {
//     paddingHorizontal: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: Colors.Bg,
//     borderBottomWidth: 2,
//     borderColor: '#ddd',
//   },
//   bodyRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 0, // height via container
//     borderBottomWidth: 1,
//     borderColor: '#ddd',
//     paddingHorizontal: 10,
//     backgroundColor: '#fff',
//   },
//   yearHeaderRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#31368A',
//     borderBottomWidth: 1,
//     borderColor: '#ccc',
//     paddingHorizontal: 10,
//   },
//   cell: {
//     textAlign:'center',
//     fontSize: width > 600 ? 12 : 12,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: 40,
//   },
//   Btn: {
//     backgroundColor: Colors.White,
//     paddingHorizontal: 12,
//     borderRadius: 6,
//     paddingVertical: 10,
//   },
//   Btn_Txt: {
//     color: Colors.PrimaryColor,
//     fontWeight: 'bold',
//     fontSize: 12,
//   },
//   // Header band color (already used)
//   darkHeaderCell: {
//     backgroundColor: '#FFFFFF',
//   },
//   // Row cell band color (light grey, readable)
//   darkBodyCell: {
//     backgroundColor: '#EFEFEF',
//   },
// });
