import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions } from "react-native";
import GroupedBarChart from "./GroupBarChart";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN = -1;

const C_RE     = "West Walk Real Estate";
const C_ADV    = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

const norm       = (s: any) => String(s || "").trim().toLowerCase();
const isRevenue  = (r: any) => norm(r.accountType) === "revenue";
const isCost     = (r: any) => norm(r.accountType) === "cost";

const extractRows = (result: any) => {
  const data =
    result?.data?.data ||
    result?.data ||
    (Array.isArray(result) ? result : []);
  return Array.isArray(data) ? data : [];
};

function sumByMonthRaw(rows: any[], company: string, year: number, predicate: (r: any) => boolean, field: "balanceFirst" | "budgetedAmount") {
  const out = Array(12).fill(0);
  const c = norm(company);
  for (const r of rows || []) {
    if (norm(r.company) !== c) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!predicate(r)) continue;
    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;
    out[m - 1] += Number(r[field] || 0);
  }
  return out;
}

function costByMonthRaw(rows: any[], company: string, year: number) {
  return sumByMonthRaw(rows, company, year, isCost, "balanceFirst");
}

function budgetCostByMonthRaw(rows: any[], company: string, year: number) {
  return sumByMonthRaw(rows, company, year, isCost, "budgetedAmount");
}

function netByMonthRaw(rows: any[], company: string, year: number, field: "balanceFirst" | "budgetedAmount") {
  const rev = sumByMonthRaw(rows, company, year, isRevenue, field);
  const cst = sumByMonthRaw(rows, company, year, isCost, field);
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
}

function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function ExpenseChart({
  company,
  year,
  compareYear,
  height = 300,
  groupGap = 14,
  expandChart = false,
  isSidebarCollapsed = false,
}: {
  company: string;
  year: number;
  compareYear?: number;
  height?: number;
  groupGap?: number;
  expandChart?: boolean;
  isSidebarCollapsed?: boolean;
}) {
  const { width }      = useWindowDimensions();
  const isScrollable   = width < 1100;   // ← same threshold as NetProfitChart

  const [rows, setRows]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getWestwalkMongoFromSQLite();
        if (mounted) setRows(extractRows(result));
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load data");
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [year, compareYear]);

  const chartData = useMemo(() => {
    const isRE = norm(company) === norm(C_RE);

    let mainCostRaw    = costByMonthRaw(rows, company, year);
    let compareCostRaw = compareYear ? costByMonthRaw(rows, company, compareYear) : Array(12).fill(0);

    if (isRE) {
      const assetsNetRaw = netByMonthRaw(rows, C_ASSETS, year, "balanceFirst");
      mainCostRaw = mainCostRaw.map((v, i) => Number(v || 0) + Number(assetsNetRaw[i] || 0));
      if (compareYear) {
        const assetsNetRawC = netByMonthRaw(rows, C_ASSETS, compareYear, "balanceFirst");
        compareCostRaw = compareCostRaw.map((v, i) => Number(v || 0) + Number(assetsNetRawC[i] || 0));
      }
    }

    let budgetCostRaw = budgetCostByMonthRaw(rows, company, year);
    if (isRE) {
      const assetsBudgetNetRaw = netByMonthRaw(rows, C_ASSETS, year, "budgetedAmount");
      budgetCostRaw = budgetCostRaw.map((v, i) => Number(v || 0) + Number(assetsBudgetNetRaw[i] || 0));
    }

    const mainExpense    = mainCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
    const compareExpense = compareCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
    const budgetExpense  = budgetCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);

    return MONTHS.map((label, i) => ({
      label,
      actualMain: Number(mainExpense[i] || 0),
      ...(compareYear ? { actualCompare: Number(compareExpense[i] || 0) } : {}),
      budgetMain: Number(budgetExpense[i] || 0),
    }));
  }, [rows, company, year, compareYear]);

  const chartSeries = useMemo(() => {
    const s: any[] = [{ key: "actualMain", label: `Actual ${year}`, color: "#E53935" }];
    if (compareYear) s.push({ key: "actualCompare", label: `Actual ${compareYear}`, color: "#EF9A9A" });
    s.push({ key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" });
    return s;
  }, [year, compareYear]);

  const usedWidth    = expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);
  const usedBarWidth = expandChart ? (isSidebarCollapsed ? 11 : 10)   : (isSidebarCollapsed ? 5 : 5);
  const usedBarGap   = expandChart ? (isSidebarCollapsed ? 11 : 10)   : (isSidebarCollapsed ? 5 : 4);
  const usedGroupGap = expandChart ? (isSidebarCollapsed ? 28 : 25)   : (isSidebarCollapsed ? groupGap : 10);

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, Number(row.actualMain  || 0));
      m = Math.max(m, Number(row.budgetMain  || 0));
      if (compareYear) m = Math.max(m, Number(row.actualCompare || 0));
    }
    return niceMaxValue(m, expandChart);
  }, [chartData, compareYear, expandChart]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error)   return <View style={styles.center}><Text style={{ color: "red", fontWeight: "700" }}>{error}</Text></View>;

  const Chart = (
    <View style={{ width: usedWidth }}>
      <GroupedBarChart
        data={chartData}
        series={chartSeries}
        maxValue={dynamicMaxValue}
        height={height}
        barWidth={usedBarWidth}
        barGap={usedBarGap}
        groupGap={usedGroupGap}
        showValuesOnTop={expandChart}
        showLegend
        yAxisOffset={-45}
        valueFormatter={(v: number) =>
          `${(v / 1_000_000)
            .toFixed(1)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1")}M`
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense</Text>

      {/* ✅ width < 1100 → horizontal scroll, warna normal */}
      {isScrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          {Chart}
        </ScrollView>
      ) : (
        Chart
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  title:     { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
});





// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import GroupedBarChart from "./GroupBarChart";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";

// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// // If cost in DB is NEGATIVE (signed world) and you want POSITIVE expenses on chart => -1
// // If cost already POSITIVE in DB => 1
// const FLIP_SIGN = -1;

// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";

// const norm = (s: any) => String(s || "").trim().toLowerCase();
// const isRevenue = (r: any) => norm(r.accountType) === "revenue";
// const isCost = (r: any) => norm(r.accountType) === "cost";

// // ✅ safe unpacking (handles multiple formats)
// const extractRows = (result: any) => {
//   const data =
//     result?.data?.data ||
//     result?.data ||
//     (Array.isArray(result) ? result : []);
//   return Array.isArray(data) ? data : [];
// };

// // ---------- RAW SIGN WORLD SUMS (NO FLIP HERE) ----------
// function sumByMonthRaw(
//   rows: any[],
//   company: string,
//   year: number,
//   predicate: (r: any) => boolean,
//   field: "balanceFirst" | "budgetedAmount"
// ) {
//   const out = Array(12).fill(0);
//   const c = norm(company);

//   for (const r of rows || []) {
//     if (norm(r.company) !== c) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (!predicate(r)) continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r[field] || 0); // RAW
//   }

//   return out;
// }

// function revenueByMonthRaw(rows: any[], company: string, year: number) {
//   return sumByMonthRaw(rows, company, year, isRevenue, "balanceFirst");
// }

// function costByMonthRaw(rows: any[], company: string, year: number) {
//   return sumByMonthRaw(rows, company, year, isCost, "balanceFirst"); // RAW cost (usually negative)
// }

// function budgetCostByMonthRaw(rows: any[], company: string, year: number) {
//   return sumByMonthRaw(rows, company, year, isCost, "budgetedAmount"); // RAW budget cost
// }

// function netByMonthRaw(rows: any[], company: string, year: number, field: "balanceFirst" | "budgetedAmount") {
//   const rev = sumByMonthRaw(rows, company, year, isRevenue, field);
//   const cst = sumByMonthRaw(rows, company, year, isCost, field);
//   return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0)); // ✅ TrialBalance rule
// }

// function niceMaxValue(max: number, expandChart: boolean) {
//   if (!Number.isFinite(max) || max <= 0) return 1;
//   const headroom = expandChart ? 1.2 : 1.1;
//   const withHeadroom = max * headroom;
//   const step = expandChart ? 2_000_000 : 1_000_000;
//   return Math.ceil(withHeadroom / step) * step;
// }

// export default function ExpenseChart({
//   company,
//   year,
//   compareYear,
//   height = 300,
//   groupGap = 14,
//   expandChart = false,
//   isSidebarCollapsed = false,
// }: {
//   company: string;
//   year: number;
//   compareYear?: number;
//   height?: number;
//   groupGap?: number;
//   expandChart?: boolean;
//   isSidebarCollapsed?: boolean;
// }) {
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;

//     const loadData = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const result = await getWestwalkMongoFromSQLite(); // ✅ SINGLE CALL
//         const data = extractRows(result);

//         if (mounted) setRows(data);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load data");
//           setRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadData();
//     return () => {
//       mounted = false;
//     };
//   }, [year, compareYear]);

//   const chartData = useMemo(() => {
//     const isRE = norm(company) === norm(C_RE);

//     // ---------------- ACTUAL EXPENSE (RAW) ----------------
//     // expense = cost (raw signed)
//     let mainCostRaw = costByMonthRaw(rows, company, year);

//     let compareCostRaw = compareYear
//       ? costByMonthRaw(rows, company, compareYear)
//       : Array(12).fill(0);

//     // ✅ RE rule (match TrialBalance):
//     // FM COST rows = Assets NET (rev + cost raw) added into RE COST
//     if (isRE) {
//       const assetsNetRaw = netByMonthRaw(rows, C_ASSETS, year, "balanceFirst");
//       mainCostRaw = mainCostRaw.map((v, i) => Number(v || 0) + Number(assetsNetRaw[i] || 0));

//       if (compareYear) {
//         const assetsNetRawC = netByMonthRaw(rows, C_ASSETS, compareYear, "balanceFirst");
//         compareCostRaw = compareCostRaw.map((v, i) => Number(v || 0) + Number(assetsNetRawC[i] || 0));
//       }
//     }

//     // ---------------- BUDGET EXPENSE (RAW) ----------------
//     let budgetCostRaw = budgetCostByMonthRaw(rows, company, year);

//     if (isRE) {
//       const assetsBudgetNetRaw = netByMonthRaw(rows, C_ASSETS, year, "budgetedAmount");
//       budgetCostRaw = budgetCostRaw.map((v, i) => Number(v || 0) + Number(assetsBudgetNetRaw[i] || 0));
//     }

//     // ---------------- DISPLAY (make positive) ----------------
//     const mainExpense = mainCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
//     const compareExpense = compareCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
//     const budgetExpense = budgetCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);

//     return MONTHS.map((label, i) => ({
//       label,
//       actualMain: Number(mainExpense[i] || 0),
//       ...(compareYear ? { actualCompare: Number(compareExpense[i] || 0) } : {}),
//       budgetMain: Number(budgetExpense[i] || 0),
//     }));
//   }, [rows, company, year, compareYear]);

//   const chartSeries = useMemo(() => {
//     const s: any[] = [{ key: "actualMain", label: `Actual ${year}`, color: "#E53935" }];
//     if (compareYear) s.push({ key: "actualCompare", label: `Actual ${compareYear}`, color: "#EF9A9A" });
//     s.push({ key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" });
//     return s;
//   }, [year, compareYear]);

//   const usedWidth = expandChart
//     ? (isSidebarCollapsed ? 1030 : 930)
//     : (isSidebarCollapsed ? 500 : 440);

//   const usedBarWidth = expandChart
//     ? (isSidebarCollapsed ? 11 : 10)
//     : (isSidebarCollapsed ? 5 : 5);

//   const usedBarGap = expandChart
//     ? (isSidebarCollapsed ? 11 : 10)
//     : (isSidebarCollapsed ? 5 : 4);

//   const usedGroupGap = expandChart
//     ? (isSidebarCollapsed ? 28 : 25)
//     : (isSidebarCollapsed ? groupGap : 10);

//   const showValuesOnTop = expandChart;

//   const dynamicMaxValue = useMemo(() => {
//     let m = 0;
//     for (const row of chartData) {
//       m = Math.max(m, Number(row.actualMain || 0));
//       m = Math.max(m, Number(row.budgetMain || 0));
//       if (compareYear) m = Math.max(m, Number(row.actualCompare || 0));
//     }
//     return niceMaxValue(m, expandChart);
//   }, [chartData, compareYear, expandChart]);

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.center}>
//         <Text style={{ color: "red", fontWeight: "700" }}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Expense</Text>

//       <View style={{ width: usedWidth }}>
//         <GroupedBarChart
//           data={chartData}
//           series={chartSeries}
//           maxValue={dynamicMaxValue}
//           height={height}
//           barWidth={usedBarWidth}
//           barGap={usedBarGap}
//           groupGap={usedGroupGap}
//           showValuesOnTop={showValuesOnTop}
//           showLegend
//           yAxisOffset={-45}
//           valueFormatter={(v: number) =>
//             `${(v / 1_000_000)
//               .toFixed(1)
//               .replace(/\.00$/, "")
//               .replace(/(\.\d)0$/, "$1")}M`
//           }
//         />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flexGrow: 1, padding: 16 },
//   title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
//   center: { flex: 1, justifyContent: "center", alignItems: "center" },
// });