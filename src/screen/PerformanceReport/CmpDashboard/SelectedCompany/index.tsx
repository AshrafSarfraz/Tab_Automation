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
  Button
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import {
  getAllTrialBalances,
  ManPowerSalaries,
  TrialBalanceRow,
  getCompanyPnL,                 // ✅ for yearly nets
} from '../../../../database/trailBalanceQueries';
import CustomHeader from '../../../../component/customHeader';
import { Colors } from '../../../../themes/color';
import { exportTrialBalanceToPDF } from '../../../../database/Utils/export_to_excel';



const {width} = Dimensions.get('window');
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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


 
  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       setLoading(true);
  
  //       // base data
  //       const allRows = await getAllTrialBalances();
  //       const allPnL  = await getCompanyPnL(); // yearly revenue/cost per company
  
  //       const splitPercentages: Record<string, number> = {
  //         'West Walk Real Estate': 0.22,
  //         'Assets Services Company': 0.6851,
  //         'West Walk Advertisement': 0.0949,
  //       };
  
  //       // -------- MP: Build MONTHLY from trial_balance rows --------
  //       const MP_NAME = 'Man Power / Salaries';
  //       const mpRowsFromAll = allRows.filter(
  //         r => r.type === 'Cost' && (r.company || '').trim() === MP_NAME
  //       );
  
  //       const monthlyMpByYear: Record<number, number[]> = {};
  //       mpRowsFromAll.forEach(r => {
  //         const y = Number(r.year);
  //         const m = Number(r.month);
  //         if (!y || !m) return;
  //         if (!monthlyMpByYear[y]) monthlyMpByYear[y] = Array(12).fill(0);
  //         const idx = Math.min(11, Math.max(0, m - 1));
  //         monthlyMpByYear[y][idx] += r.balanceFirst || 0; // keep sign as-is
  //       });
  
  //       // -------- helper: MONTHLY net (pre-zero) for any company/year --------
  //       const buildMonthlyNet = (comp: string, yr: number): number[] => {
  //         const pct = splitPercentages[comp] ?? 0;
  //         const rev = Array(12).fill(0);
  //         const cst = Array(12).fill(0);
  
  //         // company monthly revenue/cost from TB
  //         allRows.forEach(r => {
  //           if (r.company !== comp) return;
  //           if (r.year !== yr) return;
  //           if (!(r.month >= 1 && r.month <= 12)) return;
  //           const i = (r.month as number) - 1;
  //           if (r.type === 'Revenue') rev[i] += r.balanceFirst || 0;
  //           else if (r.type === 'Cost') cst[i] += r.balanceFirst || 0;
  //         });
  
  //         const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
  //         return Array.from({ length: 12 }, (_, i) => {
  //           const mpAlloc = mpMonths[i] * pct;
  //           return rev[i] + (cst[i] + mpAlloc); // your convention (cost negative)
  //         });
  //       };
  
  //       // -------- Yearly net after MP (still used for summaries where needed) --------
  //       const computeYearlyNetMap = (comp: string): Record<number, number> => {
  //         const pct = splitPercentages[comp] ?? 0;
  //         const map: Record<number, number> = {};
  //         const compPnL = allPnL.filter(p => p.company === comp && p.year !== 'Overall');
  
  //         const years = new Set<number>();
  //         compPnL.forEach(r => { if (typeof r.year === 'number') years.add(r.year); });
  //         Object.keys(monthlyMpByYear).forEach(y => years.add(Number(y)));
  
  //         years.forEach(y => {
  //           const base = compPnL.find(r => r.year === y);
  //           const rev = base?.totalRevenue ?? 0;
  //           let cost = base?.totalCost ?? 0;
  //           if (pct > 0) {
  //             const mpMonths = monthlyMpByYear[y] ?? Array(12).fill(0);
  //             const mpAllocatedYear = mpMonths.reduce((a,b)=>a+b,0) * pct;
  //             cost += mpAllocatedYear;
  //           }
  //           map[y] = rev + cost;
  //         });
  
  //         return map;
  //       };
  
  //       // precompute yearly nets if needed elsewhere
  //       const ascNetByYear  = (company === 'West Walk Real Estate' || company === 'Assets Services Company')
  //         ? computeYearlyNetMap('Assets Services Company') : {};
  //       const wwaNetByYear  = (company === 'West Walk Real Estate' || company === 'West Walk Advertisement')
  //         ? computeYearlyNetMap('West Walk Advertisement') : {};
  
  //       // -------- Filter by company + type --------
  //       let filteredRows = allRows.filter(row => {
  //         let matches = true;
  //         if (company) matches = matches && row.company === company;
  //         if (type)    matches = matches && row.type === type;
  //         return matches;
  //       });
  
  //       // Revenue adjustment (rename Residential Rental -> Residential)
  //       filteredRows = filteredRows.map(r => {
  //         if (r.type === "Revenue" && r.accountno === "41112" && r.cc2 === "Residential Rental") {
  //           return { ...r, component: "Residential", accountno: "41111" };
  //         }
  //         return r;
  //       });
  
  //       // Sort
  //       filteredRows.sort((a, b) => {
  //         if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
  //         if (a.accountno !== b.accountno) return (a.accountno || "").localeCompare(b.accountno || "");
  //         return (a.cc3code || "").localeCompare(b.cc3code || "");
  //       });
  
  //       const structured: RowItem[] = [];
  //       const years = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);
  
  //       years.forEach(year => {
  //         const yearRows = filteredRows.filter(r => r.year === year);
  
  //         // Year Header
  //         structured.push({ yearHeader: true, company, year } as RowItem);
  
  //         // --- Revenue rows ---
  //         const revenueRows = yearRows.filter(r => r.type === "Revenue");
  //         const revenueByKey: Record<string, RowItem> = {};
  //         revenueRows.forEach(r => {
  //           const key = (r.accountno || '') + '||' + (r.cc3code || '');
  //           if (!revenueByKey[key]) {
  //             const balances = Array(12).fill(0);
  //             if (r.month >= 1 && r.month <= 12) balances[r.month - 1] = r.balanceFirst || 0;
  //             revenueByKey[key] = { ...r, totalBalances: balances, totalSum: balances.reduce((a,b)=>a+b,0) };
  //           } else {
  //             if (r.month >= 1 && r.month <= 12) revenueByKey[key].totalBalances![r.month-1] += r.balanceFirst || 0;
  //             revenueByKey[key].totalSum = revenueByKey[key].totalBalances!.reduce((a,b)=>a+b,0);
  //           }
  //         });
  //         const groupedRevenue = Object.values(revenueByKey);
  
  //         // ✅ inject EXTRA revenue rows — MONTHLY (no /12 spread)
  //         if (!type || type === 'Revenue') {
  //           if (company === 'West Walk Real Estate') {
  //             // WWA → WWRE revenue (monthly pre-zero net of WWA)
  //             const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', year as number);
  //             if (wwaMonthlyNet.some(v => v !== 0)) {
  //               groupedRevenue.push({
  //                 type: 'Revenue',
  //                 company,
  //                 component: 'Westwalk Marketing Rights',
  //                 accountno: 'XFR-WWA',
  //                 cc3code: '',
  //                 totalBalances: wwaMonthlyNet,
  //                 totalSum: wwaMonthlyNet.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //           if (company === 'Assets Services Company') {
  //             // ASC self zeroing: revenue += -monthly net of ASC
  //             const ascMonthlyNet = buildMonthlyNet('Assets Services Company', year as number);
  //             const balances = ascMonthlyNet.map(n => -n);
  //             if (balances.some(v => v !== 0)) {
  //               groupedRevenue.push({
  //                 type: 'Revenue',
  //                 company,
  //                 component: 'Contract with Westwalk',
  //                 accountno: 'XFR-ASC',
  //                 cc3code: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //         }
  
  //         structured.push(...groupedRevenue);
  
  //         // Revenue total
  //         if (groupedRevenue.length) {
  //           const revBalances = Array(12).fill(0);
  //           groupedRevenue.forEach(r => r.totalBalances?.forEach((b,i)=>revBalances[i]+=b));
  //           structured.push({
  //             isTotalRow: true,
  //             totalType: "Revenue",
  //             company,
  //             totalBalances: revBalances,
  //             totalSum: revBalances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         }
  
  //         // --- Cost rows ---
  //         const costRows = yearRows.filter(r => r.type === "Cost");
  //         let groupedCost: RowItem[] = [];
  //         const costByKey: Record<string, TrialBalanceRow[]> = {};
  //         costRows.forEach(r => {
  //           if (!r.accountno) return;
  //           const key = r.accountno + '||' + (r.auxcode || '');
  //           if (!costByKey[key]) costByKey[key] = [];
  //           costByKey[key].push(r);
  //         });
  //         Object.keys(costByKey).forEach(key => {
  //           const rows = costByKey[key];
  //           const balances = Array(12).fill(0);
  //           rows.forEach(r => { if (r.month>=1 && r.month<=12) balances[r.month-1]+=r.balanceFirst||0; });
  //           groupedCost.push({
  //             type: "Cost",
  //             company,
  //             accountno: rows[0].accountno,
  //             auxcode: rows[0].auxcode,
  //             component: rows[0].component||"",
  //             cc2: rows[0].cc2,
  //             cc3code: rows[0].cc3code,
  //             totalBalances: balances,
  //             totalSum: balances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         });
  
  //         // Merge empty auxcode rows
  //         const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
  //         const mergedMap: Record<string, RowItem> = {};
  //         emptyAuxRows.forEach(r=>{
  //           const key = r.component||'';
  //           if(!mergedMap[key]) mergedMap[key]={...r};
  //           else {
  //             mergedMap[key].totalBalances = mergedMap[key].totalBalances?.map((b,i)=>b+(r.totalBalances?.[i]||0));
  //             mergedMap[key].totalSum = mergedMap[key].totalBalances?.reduce((a,b)=>a+b,0);
  //             mergedMap[key].accountno += ', '+r.accountno;
  //           }
  //         });
  //         groupedCost = groupedCost.filter(r=>r.auxcode);
  //         groupedCost.push(...Object.values(mergedMap));
  
  //         // ✅ Add ManPower rows (MONTHLY percentages — already monthly, no /12)
  //         if ((!type || type === 'Cost') && splitPercentages[company]) {
  //           const mpMonths = monthlyMpByYear[year as number] ?? Array(12).fill(0);
  
  //           if (company === "Assets Services Company") {
  //             const mpSplit = [
  //               { name: "HouseKeeping-MP", percent: 0.4350 },
  //               { name: "Maintaince-MP",   percent: 0.4050 },
  //               { name: "Security-MP",     percent: 0.12 },
  //               { name: "Store-MP",        percent: 0.03 },
  //               { name: "Landscape",       percent: 0.01 },
  //             ];
  //             mpSplit.forEach(split => {
  //               const balances = mpMonths.map(v => v * splitPercentages[company] * split.percent);
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: split.name,
  //                 accountno: 'MP',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             });
  //           } else {
  //             const balances = mpMonths.map(v => v * splitPercentages[company]);
  //             groupedCost.push({
  //               type: 'Cost',
  //               company,
  //               component: 'ManPower',
  //               accountno: 'MP',
  //               auxcode: '',
  //               totalBalances: balances,
  //               totalSum: balances.reduce((a,b)=>a+b,0),
  //               year,
  //             } as RowItem);
  //           }
  //         }
  
  //         // ✅ injected EXTRA cost rows — MONTHLY (no /12 spread)
  //         if (!type || type === 'Cost') {
  //           if (company === 'West Walk Real Estate') {
  //             // ASC → WWRE cost: add expense = -ASC monthly net
  //             const ascMonthlyNet = buildMonthlyNet('Assets Services Company', year as number);
  //             const balances = ascMonthlyNet.map(n => n);
  //             if (balances.some(v => v !== 0)) {
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: 'FM Cost',
  //                 accountno: 'XFR-ASC',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //           if (company === 'West Walk Advertisement') {
  //             // WWA self zeroing: cost += -monthly net of WWA
  //             const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', year as number);
  //             const balances = wwaMonthlyNet.map(n => -n);
  //             if (balances.some(v => v !== 0)) {
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: 'Westwalk Marketing Rights',
  //                 accountno: 'XFR-WWA',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //         }
  
  //         structured.push(...groupedCost);
  
  //         // Cost total
  //         if(groupedCost.length){
  //           const costBalances = Array(12).fill(0);
  //           groupedCost.forEach(r => r.totalBalances?.forEach((b,i)=>costBalances[i]+=b));
  //           structured.push({
  //             isTotalRow:true,
  //             totalType:'Cost',
  //             company,
  //             totalBalances: costBalances,
  //             totalSum: costBalances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         }
  
  //         // Net Profit (Grand) — include injected rows
  //         const netBalances = Array(12).fill(0);
  //         for(let i=0;i<12;i++){
  //           const rev = groupedRevenue.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
  //           const cst = groupedCost.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
  //           netBalances[i] = rev + cst;
  //         }
  //         structured.push({
  //           isTotalRow:true,
  //           totalType:'Grand',
  //           company,
  //           totalBalances: netBalances,
  //           totalSum: netBalances.reduce((a,b)=>a+b,0),
  //           year,
  //         } as RowItem);
  //       });
  
  //       setData(structured);
  //     } catch(err){
  //       setError('Failed to load trial balance');
  //       console.log(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  
  //   loadData();
  // }, [company, type]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
  
        // base data
        const allRows = await getAllTrialBalances();
        const allPnL  = await getCompanyPnL(); // yearly revenue/cost per company
  
        const splitPercentages: Record<string, number> = {
          'West Walk Real Estate': 0.22,
          'Assets Services Company': 0.6851,
          'West Walk Advertisement': 0.0949,
        };
  
        // 👉 clubbed accounts (revenue) — cc3-wise clubbing
        const CLUB_ACCOUNTS = new Set(['44104','44107','44122','44124','44125']);
        const CLUB_ACCOUNTS_LABEL = '44104,44107,44122,44124,44125';
  
        // -------- MP: Build MONTHLY from trial_balance rows --------
        const MP_NAME = 'Man Power / Salaries';
        const mpRowsFromAll = allRows.filter(
          r => r.type === 'Cost' && (r.company || '').trim() === MP_NAME
        );
  
        const monthlyMpByYear: Record<number, number[]> = {};
        mpRowsFromAll.forEach(r => {
          const y = Number(r.year);
          const m = Number(r.month);
          if (!y || !m) return;
          if (!monthlyMpByYear[y]) monthlyMpByYear[y] = Array(12).fill(0);
          const idx = Math.min(11, Math.max(0, m - 1));
          monthlyMpByYear[y][idx] += r.balanceFirst || 0; // keep sign as-is
        });
  
        // -------- helper: MONTHLY net (pre-zero) for any company/year --------
        const buildMonthlyNet = (comp: string, yr: number): number[] => {
          const pct = splitPercentages[comp] ?? 0;
          const rev = Array(12).fill(0);
          const cst = Array(12).fill(0);
  
          // company monthly revenue/cost from TB
          allRows.forEach(r => {
            if (r.company !== comp) return;
            if (r.year !== yr) return;
            if (!(r.month >= 1 && r.month <= 12)) return;
            const i = (r.month as number) - 1;
            if (r.type === 'Revenue') rev[i] += r.balanceFirst || 0;
            else if (r.type === 'Cost') cst[i] += r.balanceFirst || 0;
          });
  
          const mpMonths = monthlyMpByYear[yr] ?? Array(12).fill(0);
          return Array.from({ length: 12 }, (_, i) => {
            const mpAlloc = mpMonths[i] * pct;
            return rev[i] + (cst[i] + mpAlloc); // your convention (cost negative)
          });
        };
  
        // -------- Yearly net after MP (still used for summaries where needed) --------
        const computeYearlyNetMap = (comp: string): Record<number, number> => {
          const pct = splitPercentages[comp] ?? 0;
          const map: Record<number, number> = {};
          const compPnL = allPnL.filter(p => p.company === comp && p.year !== 'Overall');
  
          const years = new Set<number>();
          compPnL.forEach(r => { if (typeof r.year === 'number') years.add(r.year as number); });
          Object.keys(monthlyMpByYear).forEach(y => years.add(Number(y)));
  
          years.forEach(y => {
            const base = compPnL.find(r => r.year === y);
            const rev = base?.totalRevenue ?? 0;
            let cost = base?.totalCost ?? 0;
            if (pct > 0) {
              const mpMonths = monthlyMpByYear[y] ?? Array(12).fill(0);
              const mpAllocatedYear = mpMonths.reduce((a,b)=>a+b,0) * pct;
              cost += mpAllocatedYear;
            }
            map[y] = rev + cost;
          });
  
          return map;
        };
  
        // precompute yearly nets if needed elsewhere
        const ascNetByYear  = (company === 'West Walk Real Estate' || company === 'Assets Services Company')
          ? computeYearlyNetMap('Assets Services Company') : {};
        const wwaNetByYear  = (company === 'West Walk Real Estate' || company === 'West Walk Advertisement')
          ? computeYearlyNetMap('West Walk Advertisement') : {};
  
        // -------- Filter by company + type --------
        let filteredRows = allRows.filter(row => {
          let matches = true;
          if (company) matches = matches && row.company === company;
          if (type)    matches = matches && row.type === type;
          return matches;
        });
  
        // Revenue adjustment (rename Residential Rental -> Residential)
        filteredRows = filteredRows.map(r => {
          if (r.type === "Revenue" && r.accountno === "41112" && r.cc2 === "Residential Rental") {
            return { ...r, component: "Residential", accountno: "41111" };
          }
          return r;
        });
  
        // Sort
        filteredRows.sort((a, b) => {
          if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
          if (a.accountno !== b.accountno) return (a.accountno || "").localeCompare(b.accountno || "");
          return (a.cc3code || "").localeCompare(b.cc3code || "");
        });
  
        const structured: RowItem[] = [];
        const years = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);
  
        years.forEach(year => {
          const yearRows = filteredRows.filter(r => r.year === year);
  
          // Year Header
          structured.push({ yearHeader: true, company, year } as RowItem);
  
          // --- Revenue rows (with cc3-wise clubbing for 44104/44107/44122/44124/44125) ---
          const revenueRows = yearRows.filter(r => r.type === "Revenue");
          const revenueByKey: Record<string, RowItem> = {};
          revenueRows.forEach(r => {
            const isClubbed = r.accountno && CLUB_ACCOUNTS.has(String(r.accountno));
            const cc3 = r.cc3code || '';
            const key = isClubbed
              ? `CLUB::${cc3}`                         // cc3-wise clubbing
              : `${r.accountno || ''}||${cc3}`;        // normal grouping
  
            if (!revenueByKey[key]) {
              const balances = Array(12).fill(0);
              if (r.month >= 1 && r.month <= 12) balances[(r.month as number) - 1] = r.balanceFirst || 0;
  
              revenueByKey[key] = {
                ...r,
                component: isClubbed ? cc3 : (r.component || ''),
                accountno: isClubbed ? CLUB_ACCOUNTS_LABEL : (r.accountno || ''),
                cc3code: cc3,
                totalBalances: balances,
                totalSum: balances.reduce((a,b)=>a+b,0),
              };
            } else {
              if (r.month >= 1 && r.month <= 12) {
                revenueByKey[key].totalBalances![(r.month as number) - 1] += r.balanceFirst || 0;
              }
              revenueByKey[key].totalSum = revenueByKey[key].totalBalances!.reduce((a,b)=>a+b,0);
  
              if (isClubbed) {
                revenueByKey[key].component = cc3;
                revenueByKey[key].accountno = CLUB_ACCOUNTS_LABEL;
              }
            }
          });
          const groupedRevenue = Object.values(revenueByKey);
  
          // inject EXTRA revenue rows — MONTHLY (no /12 spread)
          if (!type || type === 'Revenue') {
            if (company === 'West Walk Real Estate') {
              const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', year as number);
              if (wwaMonthlyNet.some(v => v !== 0)) {
                groupedRevenue.push({
                  type: 'Revenue',
                  company,
                  component: 'Westwalk Marketing Rights',
                  accountno: 'XFR-WWA',
                  cc3code: '',
                  totalBalances: wwaMonthlyNet,
                  totalSum: wwaMonthlyNet.reduce((a,b)=>a+b,0),
                  year,
                } as RowItem);
              }
            }
            if (company === 'Assets Services Company') {
              const ascMonthlyNet = buildMonthlyNet('Assets Services Company', year as number);
              const balances = ascMonthlyNet.map(n => -n);
              if (balances.some(v => v !== 0)) {
                groupedRevenue.push({
                  type: 'Revenue',
                  company,
                  component: 'Contract with Westwalk',
                  accountno: 'XFR-ASC',
                  cc3code: '',
                  totalBalances: balances,
                  totalSum: balances.reduce((a,b)=>a+b,0),
                  year,
                } as RowItem);
              }
            }
          }
  
          structured.push(...groupedRevenue);
  
          // Revenue total
          if (groupedRevenue.length) {
            const revBalances = Array(12).fill(0);
            groupedRevenue.forEach(r => r.totalBalances?.forEach((b,i)=>revBalances[i]+=b));
            structured.push({
              isTotalRow: true,
              totalType: "Revenue",
              company,
              totalBalances: revBalances,
              totalSum: revBalances.reduce((a,b)=>a+b,0),
              year,
            } as RowItem);
          }
  
          // --- Cost rows (unchanged) ---
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
            const balances = Array(12).fill(0);
            rows.forEach(r => { if (r.month>=1 && r.month<=12) balances[r.month-1]+=r.balanceFirst||0; });
            groupedCost.push({
              type: "Cost",
              company,
              accountno: rows[0].accountno,
              auxcode: rows[0].auxcode,
              component: rows[0].component||"",
              cc2: rows[0].cc2,
              cc3code: rows[0].cc3code,
              totalBalances: balances,
              totalSum: balances.reduce((a,b)=>a+b,0),
              year,
            } as RowItem);
          });
  
          // Merge empty auxcode rows
          const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
          const mergedMap: Record<string, RowItem> = {};
          emptyAuxRows.forEach(r=>{
            const key = r.component||'';
            if(!mergedMap[key]) mergedMap[key]={...r};
            else {
              mergedMap[key].totalBalances = mergedMap[key].totalBalances?.map((b,i)=>b+(r.totalBalances?.[i]||0));
              mergedMap[key].totalSum = mergedMap[key].totalBalances?.reduce((a,b)=>a+b,0);
              mergedMap[key].accountno += ', '+r.accountno;
            }
          });
          groupedCost = groupedCost.filter(r=>r.auxcode);
          groupedCost.push(...Object.values(mergedMap));
  
          // Add ManPower rows (MONTHLY percentages)
          if ((!type || type === 'Cost') && splitPercentages[company]) {
            const mpMonths = monthlyMpByYear[year as number] ?? Array(12).fill(0);
  
            if (company === "Assets Services Company") {
              const mpSplit = [
                { name: "HouseKeeping-MP", percent: 0.4350 },
                { name: "Maintaince-MP",   percent: 0.4050 },
                { name: "Security-MP",     percent: 0.12 },
                { name: "Store-MP",        percent: 0.03 },
                { name: "Landscape",       percent: 0.01 },
              ];
              mpSplit.forEach(split => {
                const balances = mpMonths.map(v => v * splitPercentages[company] * split.percent);
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: split.name,
                  accountno: 'MP',
                  auxcode: '',
                  totalBalances: balances,
                  totalSum: balances.reduce((a,b)=>a+b,0),
                  year,
                } as RowItem);
              });
            } else {
              const balances = mpMonths.map(v => v * splitPercentages[company]);
              groupedCost.push({
                type: 'Cost',
                company,
                component: 'ManPower',
                accountno: 'MP',
                auxcode: '',
                totalBalances: balances,
                totalSum: balances.reduce((a,b)=>a+b,0),
                year,
              } as RowItem);
            }
          }
  
          // injected EXTRA cost rows — MONTHLY
          if (!type || type === 'Cost') {
            if (company === 'West Walk Real Estate') {
              const ascMonthlyNet = buildMonthlyNet('Assets Services Company', year as number);
              const balances = ascMonthlyNet.map(n => n);
              if (balances.some(v => v !== 0)) {
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: 'FM Cost',
                  accountno: 'XFR-ASC',
                  auxcode: '',
                  totalBalances: balances,
                  totalSum: balances.reduce((a,b)=>a+b,0),
                  year,
                } as RowItem);
              }
            }
            if (company === 'West Walk Advertisement') {
              const wwaMonthlyNet = buildMonthlyNet('West Walk Advertisement', year as number);
              const balances = wwaMonthlyNet.map(n => -n);
              if (balances.some(v => v !== 0)) {
                groupedCost.push({
                  type: 'Cost',
                  company,
                  component: 'Westwalk Marketing Rights',
                  accountno: 'XFR-WWA',
                  auxcode: '',
                  totalBalances: balances,
                  totalSum: balances.reduce((a,b)=>a+b,0),
                  year,
                } as RowItem);
              }
            }
          }
  
          structured.push(...groupedCost);
  
          // Cost total
          if(groupedCost.length){
            const costBalances = Array(12).fill(0);
            groupedCost.forEach(r => r.totalBalances?.forEach((b,i)=>costBalances[i]+=b));
            structured.push({
              isTotalRow:true,
              totalType:'Cost',
              company,
              totalBalances: costBalances,
              totalSum: costBalances.reduce((a,b)=>a+b,0),
              year,
            } as RowItem);
          }
  
          // Net Profit (Grand) — include injected rows
          const netBalances = Array(12).fill(0);
          for(let i=0;i<12;i++){
            const rev = groupedRevenue.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
            const cst = groupedCost.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
            netBalances[i] = rev + cst;
          }
          structured.push({
            isTotalRow:true,
            totalType:'Grand',
            company,
            totalBalances: netBalances,
            totalSum: netBalances.reduce((a,b)=>a+b,0),
            year,
          } as RowItem);
        });
  
        setData(structured);
      } catch(err){
        setError('Failed to load trial balance');
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
  
    loadData();
  }, [company, type]);
  

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, {width: 150}]}>Type</Text>
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

    if (item.isTotalRow) {
      let bgColor = '#f0f8ff';
      if (item.totalType === 'Revenue') bgColor = '#d1f7d1';
      if (item.totalType === 'Cost') bgColor = '#f7d1d1';
      if (item.totalType === 'Grand') bgColor = '#ffe4b5';
      const label = item.totalType === 'Grand' ? 'Net Total' : item.totalType + ' Total';

      return (

        <View style={[styles.row, {backgroundColor: bgColor, borderTopWidth: 2, borderColor: '#aaa'}]}>
          <Text style={[styles.cell, {width: 150, fontWeight: 'bold'}]}>{label}</Text>
          <Text style={[styles.cell, {width: 180}]}>{item.company}</Text>
          <Text style={[styles.cell, {width: 100}]}></Text>
          <Text style={[styles.cell, {width: 100}]}></Text>
          <Text style={[styles.cell, {width: 100, textAlign: 'right', fontWeight: 'bold'}]}>
            {item.totalSum?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
          {item.totalBalances?.map((b, idx) => (
            <Text key={idx} style={[styles.cell, {width: 120, textAlign: 'right', fontWeight: 'bold'}]}>
              {b.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
          ))}
        </View>
      );
    }

    const balances: number[] = item.totalBalances
      ? item.totalBalances
      : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? item.balanceFirst || 0 : 0));
    const total = balances.reduce((s, b) => s + b, 0);

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, {width: 150}]}>{item.type}</Text>
        <Text style={[styles.cell, {width: 180}]}>{item.component}</Text>
        <Text style={[styles.cell, {width: 100}]}>{item.accountno}</Text>
        <Text style={[styles.cell, {width: 100}]}>
          {item.type === 'Revenue' ? item.cc3code : item.auxcode}
        </Text>
        <Text style={[styles.cell, {width: 100, textAlign: 'right'}]}>
          {total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </Text>
        {balances.map((b, idx) => (
          <Text key={idx} style={[styles.cell, {width: 120, textAlign: 'right'}]}>
            {b.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </Text>
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
      <Button
  title="Export to PDF"
  onPress={async () => {
    try {
        await exportTrialBalanceToPDF(data, 'Trial Balance Sheet', `TrialBalance_${company || 'All'}`);
    } catch (e: any) {
      console.warn('PDF export failed:', e?.message ?? e);
    }
  }}
/>

      
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
  yearHeader: { backgroundColor: '#eee', borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
});

























  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       setLoading(true);

  //       // base data
  //       const allRows = await getAllTrialBalances();
  //       const manPowerRows = await ManPowerSalaries();
  //       const allPnL = await getCompanyPnL(); // yearly revenue/cost per company

  //       const splitPercentages: Record<string, number> = {
  //         'West Walk Real Estate': 0.22,
  //         'Assets Services Company': 0.6851,
  //         'West Walk Advertisement': 0.0949,
  //       };

  //       // helper: compute yearly net (after MP allocation) for any company
  //       const computeYearlyNetMap = (comp: string): Record<number, number> => {
  //         const pct = splitPercentages[comp] ?? 0;
  //         const map: Record<number, number> = {};
  //         const compPnL = allPnL.filter(p => p.company === comp && p.year !== 'Overall');

  //         const years = new Set<number>();
  //         compPnL.forEach(r => { if (typeof r.year === 'number') years.add(r.year); });
  //         manPowerRows.forEach(r => { if (typeof r.year === 'number') years.add(r.year as number); });

  //         years.forEach(y => {
  //           const base = compPnL.find(r => r.year === y);
  //           const rev = base?.totalRevenue ?? 0;
  //           let cost = base?.totalCost ?? 0;

  //           // MP allocation
  //           if (pct > 0) {
  //             const mp = manPowerRows.find(m => m.year === y);
  //             if (mp?.totalCost) cost += mp.totalCost * pct;
  //           }

  //           map[y] = rev + cost; // your convention: cost negative aata hai
  //         });

  //         return map;
  //       };

  //       // precompute nets only where needed
  //       const ascNetByYear  = (company === 'West Walk Real Estate' || company === 'Assets Services Company')
  //         ? computeYearlyNetMap('Assets Services Company') : {};
  //       const wwaNetByYear  = (company === 'West Walk Real Estate' || company === 'West Walk Advertisement')
  //         ? computeYearlyNetMap('West Walk Advertisement') : {};

  //       // Filter rows by company + type
  //       let filteredRows = allRows.filter(row => {
  //         let matches = true;
  //         if (company) matches = matches && row.company === company;
  //         if (type)    matches = matches && row.type === type;
  //         return matches;
  //       });

  //       // Revenue adjustment (rename Residential Rental -> Residential)
  //       filteredRows = filteredRows.map(r => {
  //         if (r.type === "Revenue" && r.accountno === "41112" && r.cc2 === "Residential Rental") {
  //           return { ...r, component: "Residential", accountno: "41111" };
  //         }
  //         return r;
  //       });

  //       // Sort
  //       filteredRows.sort((a, b) => {
  //         if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
  //         if (a.accountno !== b.accountno) return (a.accountno || "").localeCompare(b.accountno || "");
  //         return (a.cc3code || "").localeCompare(b.cc3code || "");
  //       });

  //       const structured: RowItem[] = [];
  //       const years = Array.from(new Set(filteredRows.map(r => r.year))).sort((a, b) => b - a);

  //       years.forEach(year => {
  //         const yearRows = filteredRows.filter(r => r.year === year);

  //         // Year Header
  //         structured.push({ yearHeader: true, company, year } as RowItem);

  //         // --- Revenue rows ---
  //         const revenueRows = yearRows.filter(r => r.type === "Revenue");
  //         const revenueByKey: Record<string, RowItem> = {};
  //         revenueRows.forEach(r => {
  //           const key = (r.accountno || '') + '||' + (r.cc3code || '');
  //           if (!revenueByKey[key]) {
  //             const balances = Array(12).fill(0);
  //             if (r.month >= 1 && r.month <= 12) balances[r.month - 1] = r.balanceFirst || 0;
  //             revenueByKey[key] = { ...r, totalBalances: balances, totalSum: balances.reduce((a,b)=>a+b,0) };
  //           } else {
  //             if (r.month >= 1 && r.month <= 12) revenueByKey[key].totalBalances![r.month-1] += r.balanceFirst || 0;
  //             revenueByKey[key].totalSum = revenueByKey[key].totalBalances!.reduce((a,b)=>a+b,0);
  //           }
  //         });
  //         const groupedRevenue = Object.values(revenueByKey);

  //         // ✅ inject EXTRA revenue rows (before revenue total)
  //         if (!type || type === 'Revenue') {
  //           if (company === 'West Walk Real Estate') {
  //             // WWA → WWRE revenue
  //             const wwaNet = wwaNetByYear[year as number] ?? 0;
  //             if (wwaNet !== 0) {
  //               const balances = Array(12).fill(wwaNet/12);
  //               groupedRevenue.push({
  //                 type: 'Revenue',
  //                 company,
  //                 component: 'Westwalk Marketing Rights',
  //                 accountno: 'XFR-WWA',
  //                 cc3code: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //           if (company === 'Assets Services Company') {
  //             // ASC self zeroing (revenue += -net)
  //             const ascNet = ascNetByYear[year as number] ?? 0;
  //             if (ascNet !== 0) {
  //               const adj = -ascNet;
  //               const balances = Array(12).fill(adj/12);
  //               groupedRevenue.push({
  //                 type: 'Revenue',
  //                 company,
  //                 component: 'Contract with Westwalk',
  //                 accountno: 'XFR-ASC',
  //                 cc3code: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //         }

  //         structured.push(...groupedRevenue);

  //         // Revenue total
  //         if (groupedRevenue.length) {
  //           const revBalances = Array(12).fill(0);
  //           groupedRevenue.forEach(r => r.totalBalances?.forEach((b,i)=>revBalances[i]+=b));
  //           structured.push({
  //             isTotalRow: true,
  //             totalType: "Revenue",
  //             company,
  //             totalBalances: revBalances,
  //             totalSum: revBalances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         }

  //         // --- Cost rows ---
  //         const costRows = yearRows.filter(r => r.type === "Cost");
  //         let groupedCost: RowItem[] = [];
  //         const costByKey: Record<string, TrialBalanceRow[]> = {};
  //         costRows.forEach(r => {
  //           if (!r.accountno) return;
  //           const key = r.accountno + '||' + (r.auxcode || '');
  //           if (!costByKey[key]) costByKey[key] = [];
  //           costByKey[key].push(r);
  //         });
  //         Object.keys(costByKey).forEach(key => {
  //           const rows = costByKey[key];
  //           const balances = Array(12).fill(0);
  //           rows.forEach(r => { if (r.month>=1 && r.month<=12) balances[r.month-1]+=r.balanceFirst||0; });
  //           groupedCost.push({
  //             type: "Cost",
  //             company,
  //             accountno: rows[0].accountno,
  //             auxcode: rows[0].auxcode,
  //             component: rows[0].component||"",
  //             cc2: rows[0].cc2,
  //             cc3code: rows[0].cc3code,
  //             totalBalances: balances,
  //             totalSum: balances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         });

  //         // Merge empty auxcode rows
  //         const emptyAuxRows = groupedCost.filter(r => !r.auxcode);
  //         const mergedMap: Record<string, RowItem> = {};
  //         emptyAuxRows.forEach(r=>{
  //           const key = r.component||'';
  //           if(!mergedMap[key]) mergedMap[key]={...r};
  //           else {
  //             mergedMap[key].totalBalances = mergedMap[key].totalBalances?.map((b,i)=>b+(r.totalBalances?.[i]||0));
  //             mergedMap[key].totalSum = mergedMap[key].totalBalances?.reduce((a,b)=>a+b,0);
  //             mergedMap[key].accountno += ', '+r.accountno;
  //           }
  //         });
  //         groupedCost = groupedCost.filter(r=>r.auxcode);
  //         groupedCost.push(...Object.values(mergedMap));

  //         // --- Add ManPower rows (ASC = 5 splits, others = single) ---
  //         if ((!type || type === 'Cost') && splitPercentages[company]) {
  //           const mpRow = manPowerRows.find(m => m.year === year);
  //           if (mpRow) {
  //             if (company === "Assets Services Company") {
  //               const mpSplit = [
  //                 { name: "HouseKeeping-MP", percent: 0.4350 },
  //                 { name: "Maintaince-MP",   percent: 0.4050 },
  //                 { name: "Security-MP",     percent: 0.12 },
  //                 { name: "Store-MP",        percent: 0.03 },
  //                 { name: "Landscape",       percent: 0.01 },
  //               ];
  //               mpSplit.forEach(split => {
  //                 const total = mpRow.totalCost * splitPercentages[company] * split.percent;
  //                 const balances = Array(12).fill(total / 12);
  //                 groupedCost.push({
  //                   type: 'Cost',
  //                   company,
  //                   component: split.name,
  //                   accountno: 'MP',
  //                   auxcode: '',
  //                   totalBalances: balances,
  //                   totalSum: balances.reduce((a,b)=>a+b,0),
  //                   year,
  //                 } as RowItem);
  //               });
  //             } else {
  //               const total = mpRow.totalCost * splitPercentages[company];
  //               const balances = Array(12).fill(total / 12);
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: 'ManPower',
  //                 accountno: 'MP',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //         }

  //         // ✅ inject EXTRA cost rows (before cost total)
  //         if (!type || type === 'Cost') {
  //           if (company === 'West Walk Real Estate') {
  //             // ASC → WWRE cost
  //             const ascNet = ascNetByYear[year as number] ?? 0;
  //             if (ascNet !== 0) {
  //               const balances = Array(12).fill((ascNet)/12);
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: 'FM Cost',
  //                 accountno: 'XFR-ASC',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //           if (company === 'West Walk Advertisement') {
  //             // WWA self zeroing (cost += -net)
  //             const wwaNet = wwaNetByYear[year as number] ?? 0;
  //             if (wwaNet !== 0) {
  //               const balances = Array(12).fill((-wwaNet)/12);
  //               groupedCost.push({
  //                 type: 'Cost',
  //                 company,
  //                 component: 'Westwalk Marketing Rights',
  //                 accountno: 'XFR-WWA',
  //                 auxcode: '',
  //                 totalBalances: balances,
  //                 totalSum: balances.reduce((a,b)=>a+b,0),
  //                 year,
  //               } as RowItem);
  //             }
  //           }
  //         }

  //         structured.push(...groupedCost);

  //         // Cost total
  //         if(groupedCost.length){
  //           const costBalances = Array(12).fill(0);
  //           groupedCost.forEach(r => r.totalBalances?.forEach((b,i)=>costBalances[i]+=b));
  //           structured.push({
  //             isTotalRow:true,
  //             totalType:'Cost',
  //             company,
  //             totalBalances: costBalances,
  //             totalSum: costBalances.reduce((a,b)=>a+b,0),
  //             year,
  //           } as RowItem);
  //         }

  //         // Net Profit (Grand) — include injected rows
  //         const netBalances = Array(12).fill(0);
  //         for(let i=0;i<12;i++){
  //           const rev = groupedRevenue.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
  //           const cst = groupedCost.reduce((sum,r)=>sum+(r.totalBalances?.[i]||0),0);
  //           netBalances[i] = rev + cst;  // your convention
  //         }
  //         structured.push({
  //           isTotalRow:true,
  //           totalType:'Grand',
  //           company,
  //           totalBalances: netBalances,
  //           totalSum: netBalances.reduce((a,b)=>a+b,0),
  //           year,
  //         } as RowItem);
  //       });

  //       setData(structured);
  //     } catch(err){
  //       setError('Failed to load trial balance');
  //       console.log(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadData();
  // }, [company, type]);
