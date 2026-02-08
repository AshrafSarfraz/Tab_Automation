import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import GroupedBarChart from "./GroupBarChart";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const FLIP_SIGN = -1; // cost ko positive banane ke liye

const isRevenue = (r) => String(r.accountType || "").trim().toLowerCase() === "revenue";
const isCost = (r) => String(r.accountType || "").trim().toLowerCase() === "cost";

/* =========================
   Revenue Sum (company wise)
========================= */
function sumRevenueByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isRevenue(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.balanceFirst || 0);
  }
  return out;
}

/* =========================
   Cost Sum (company wise)
========================= */
function sumCostByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isCost(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN;
  }
  return out;
}

/* =========================
   Main Expense (West Walk cost) with merge rules removed
   (yahan direct company cost li ja rahi)
========================= */
function sumExpenseByMonth(rows, company, year) {
  // just cost for given company
  return sumCostByMonth(rows, company, year);
}

function budgetExpenseByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isCost(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.budgetedAmount || 0) * FLIP_SIGN;
  }

  return out;
}

// ✅ dynamic max
function niceMaxValue(max, expandChart) {
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
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // useEffect(() => {
  //   let mounted = true;

  //   const loadFromSQLite = async () => {
  //     try {
  //       setLoading(true);
  //       setError("");

  //       const result = await getWestwalkMongoFromSQLite();
  //       const data = result?.data?.data || [];

  //       if (mounted) setRows(Array.isArray(data) ? data : []);
  //     } catch (e) {
  //       if (mounted) {
  //         setError(e?.message || "Failed to load from SQLite");
  //         setRows([]);
  //       }
  //     } finally {
  //       if (mounted) setLoading(false);
  //     }
  //   };

  //   loadFromSQLite();
  //   return () => (mounted = false);
  // }, []);
  useEffect(() => {
    let mounted = true;
  
    const WESTWALK_COMPANIES = new Set([
      "West Walk Real Estate",
      "West Walk Advertisement",
      "Assets Services Company",
    ]);
  
    const loadFromSQLite = async () => {
      try {
        setLoading(true);
        setError("");
  
        const isWestwalk = WESTWALK_COMPANIES.has(String(company).trim());
  
        const result = isWestwalk
          ? await getWestwalkMongoFromSQLite()
          : await getOtherCmpMongoFromSQLite();
  
        // 🔐 dono formats safe
        const data =
          result?.data?.data ||
          result?.data ||
          (Array.isArray(result) ? result : []);
  
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) {
          setError(e?.message || "Failed to load from SQLite");
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
  
    loadFromSQLite();
    return () => (mounted = false);
  }, [company]);
  
  const chartData = useMemo(() => {
    // ✅ Base expense = company cost
    const mainCost = sumExpenseByMonth(rows, company, year);
    const mainBudget = budgetExpenseByMonth(rows, company, year);

    const mainCostCompare = compareYear
      ? sumExpenseByMonth(rows, company, compareYear)
      : Array(12).fill(0);

    // ✅ ONLY for West Walk: add Assets NET PROFIT into COST
    if (String(company).trim() === "West Walk Real Estate") {
      // Assets net profit = revenue - cost
      const assetsRev = sumRevenueByMonth(rows, "Assets Services Company", year);
      const assetsCost = sumCostByMonth(rows, "Assets Services Company", year);

      const assetsNetProfit = assetsRev.map(
        (v, i) => Number(v || 0) - Number(assetsCost[i] || 0)
      );

      // ✅ WestWalkCost = WestWalkCost + AssetsNetProfit
      for (let i = 0; i < 12; i++) {
        mainCost[i] = Number(mainCost[i] || 0) + Number(assetsNetProfit[i] || 0);
      }

      // compare year merge
      if (compareYear) {
        const assetsRevC = sumRevenueByMonth(rows, "Assets Services Company", compareYear);
        const assetsCostC = sumCostByMonth(rows, "Assets Services Company", compareYear);

        const assetsNetProfitC = assetsRevC.map(
          (v, i) => Number(v || 0) - Number(assetsCostC[i] || 0)
        );

        for (let i = 0; i < 12; i++) {
          mainCostCompare[i] =
            Number(mainCostCompare[i] || 0) + Number(assetsNetProfitC[i] || 0);
        }
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      actualMain: Number(mainCost[i] || 0),
      ...(compareYear ? { actualCompare: Number(mainCostCompare[i] || 0) } : {}),
      budgetMain: Number(mainBudget[i] || 0),
    }));
  }, [rows, company, year, compareYear]);

  const chartSeries = useMemo(() => {
    const s = [{ key: "actualMain", label: `Actual ${year}`, color: "#E53935" }];

    if (compareYear) {
      s.push({ key: "actualCompare", label: `Actual ${compareYear}`, color: "#EF9A9A" });
    }

    s.push({ key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" });
    return s;
  }, [year, compareYear]);

  const usedWidth =
    expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

  const usedBarWidth =
    expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 5);

  const usedBarGap =
    expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 4);

  const usedGroupGap =
    expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 10);

  const showValuesOnTop = expandChart;

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, Number(row.actualMain || 0));
      m = Math.max(m, Number(row.budgetMain || 0));
      if (compareYear) m = Math.max(m, Number(row.actualCompare || 0));
    }
    return niceMaxValue(m, expandChart);
  }, [chartData, compareYear, expandChart]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red", fontWeight: "700" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense</Text>

      <View style={{ width: usedWidth }}>
        <GroupedBarChart
          data={chartData}
          series={chartSeries}
          maxValue={dynamicMaxValue}
          height={height}
          barWidth={usedBarWidth}
          barGap={usedBarGap}
          groupGap={usedGroupGap}
          showValuesOnTop={showValuesOnTop}
          showLegend
          yAxisOffset={-45}
          valueFormatter={(v) =>
            `${(v / 1_000_000)
              .toFixed(1)
              .replace(/\.00$/, "")
              .replace(/(\.\d)0$/, "$1")}M`
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});



// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import GroupedBarChart from "./GroupBarChart";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";


// const MONTHS = [
//   "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
// ];

// const FLIP_SIGN = -1;

// function sumExpenseByMonth(rows: any[], company: string | string[], year: number) {
//   const out = Array(12).fill(0);
//   const companies = Array.isArray(company) ? company : [company];

//   for (const r of rows) {
//     let rCompany = String(r.company || "").trim();

//     // ✅ Merge Assets Services Company cost into West Walk Real Estate
//     if (companies.includes("West Walk Real Estate") && rCompany === "Assets Services Company") {
//       rCompany = "West Walk Real Estate";
//     }

//     if (!companies.includes(rCompany)) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN;
//   }

//   return out;
// }


// function budgetExpenseByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.budgetedAmount || 0) * FLIP_SIGN;
//   }

//   return out;
// }

// // ✅ dynamic max: headroom + round up
// function niceMaxValue(max: number, expandChart: boolean) {
//   if (!Number.isFinite(max) || max <= 0) return 1;

//   const headroom = expandChart ? 1.2 : 1.1; // expand => 20%, normal => 10%
//   const withHeadroom = max * headroom;

//   // ✅ step decide (normal=1M, expanded=2M) - adjust if you want
//   const step = expandChart ? 2_000_000 : 1_000_000;

//   return Math.ceil(withHeadroom / step) * step;
// }

// type ExpenseChartProps = {
//   company: string;
//   year: number;
//   compareYear?: number;
//   apiUrl?: string;

//   height?: number;
//   groupGap?: number;

//   expandChart?: boolean;
//   isSidebarCollapsed?: boolean;
// };

// export default function ExpenseChart({
//   company,
//   year,
//   compareYear,

//   height = 300,
//   groupGap = 14,

//   expandChart = false,
//   isSidebarCollapsed = false,
// }: ExpenseChartProps) {
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;

//     const loadFromSQLite = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const result = await getWestwalkMongoFromSQLite();
//         const data = result?.data?.data || []; // your saved structure in SQLite

//         if (mounted) setRows(Array.isArray(data) ? data : []);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load from SQLite");
//           setRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadFromSQLite();

//     return () => {
//       mounted = false;
//     };
//   }, []);


//   const chartData = useMemo(() => {
//     const actualMain = sumExpenseByMonth(rows, company, year);
//     const budgetMain = budgetExpenseByMonth(rows, company, year);

//     const actualCompare = compareYear
//       ? sumExpenseByMonth(rows, company, compareYear)
//       : Array(12).fill(0);

//     return MONTHS.map((label, i) => ({
//       label,
//       actualMain: Number(actualMain[i] || 0),
//       ...(compareYear ? { actualCompare: Number(actualCompare[i] || 0) } : {}),
//       budgetMain: Number(budgetMain[i] || 0),
//     }));
//   }, [rows, company, year, compareYear]);

//   const chartSeries = useMemo(() => {
//     const s: any[] = [{ key: "actualMain", label: `Actual ${year}`, color: "#E53935" }];

//     if (compareYear) {
//       s.push({ key: "actualCompare", label: `Actual ${compareYear}`, color: "#EF9A9A" });
//     }

//     s.push({ key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" });
//     return s;
//   }, [year, compareYear]);

//   // ✅ SAME UI LOGIC (aap ka)
//   // NOTE: aapne revenue me 1030 bola tha, expense me bhi agar 1030 chahiye to 1050 -> 1030 kar dein.
//   const usedWidth =
//     expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

//   const usedBarWidth =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 5);

//   const usedBarGap =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 4);

//   const usedGroupGap =
//     expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 10);

//   const showValuesOnTop = expandChart;

//   // ✅ dynamic maxValue (instead of fixed 10M)
//   const dynamicMaxValue = useMemo(() => {
//     let m = 0;
//     for (const row of chartData) {
//       m = Math.max(m, Number(row.actualMain || 0));
//       m = Math.max(m, Number(row.budgetMain || 0));
//       if (compareYear) m = Math.max(m, Number((row as any).actualCompare || 0));
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
//           maxValue={dynamicMaxValue} // ✅ fixed!
//           height={height}
//           barWidth={usedBarWidth}
//           barGap={usedBarGap}
//           groupGap={usedGroupGap}
//           showValuesOnTop={showValuesOnTop}
//           showLegend
//           yAxisOffset={-45}
//           valueFormatter={(v) =>
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





