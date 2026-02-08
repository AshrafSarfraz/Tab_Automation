import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import GroupedBarChart from "./GroupBarChart";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN_COST = -1; // cost ko positive bars banane ke liye

const isRevenue = (r) => String(r.accountType || "").trim().toLowerCase() === "revenue";
const isCost = (r) => String(r.accountType || "").trim().toLowerCase() === "cost";

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

function sumCostByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isCost(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN_COST;
  }
  return out;
}

function budgetRevenueByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isRevenue(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.budgetedAmount || 0);
  }
  return out;
}

function budgetCostByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isCost(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.budgetedAmount || 0) * FLIP_SIGN_COST;
  }
  return out;
}

// ✅ net profit helpers
function netProfitByMonth(rows, company, year) {
  const rev = sumRevenueByMonth(rows, company, year);
  const cost = sumCostByMonth(rows, company, year);
  return rev.map((v, i) => Number(v || 0) - Number(cost[i] || 0));
}

function budgetNetProfitByMonth(rows, company, year) {
  const rev = budgetRevenueByMonth(rows, company, year);
  const cost = budgetCostByMonth(rows, company, year);
  return rev.map((v, i) => Number(v || 0) - Number(cost[i] || 0));
}

// ✅ dynamic max: headroom + round up
function niceMaxValue(max, expandChart) {
  if (!Number.isFinite(max) || max <= 0) return 1;

  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;

  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function NetProfitChart({
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
  //   return () => { mounted = false; };
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
  
        // 🔐 dono response formats handle
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
    return () => { mounted = false; };
  }, [company]);
  


  const chartData = useMemo(() => {
    const isWestWalk = String(company).trim() === "West Walk Real Estate";

    // ✅ Main year net
    let netMain = netProfitByMonth(rows, company, year);
    let netBudget = budgetNetProfitByMonth(rows, company, year);

    // ✅ Compare year net
    let netPrev = compareYear ? netProfitByMonth(rows, company, compareYear) : Array(12).fill(0);

    if (isWestWalk) {
      // ✅ add Advertisement net profit
      const adNet = netProfitByMonth(rows, "West Walk Advertisement", year);
      const adBudgetNet = budgetNetProfitByMonth(rows, "West Walk Advertisement", year);

      // ✅ add Assets net profit
      const assetsNet = netProfitByMonth(rows, "Assets Services Company", year);
      const assetsBudgetNet = budgetNetProfitByMonth(rows, "Assets Services Company", year);

      netMain = netMain.map((v, i) => Number(v || 0) + Number(adNet[i] || 0) + Number(assetsNet[i] || 0));
      netBudget = netBudget.map((v, i) => Number(v || 0) + Number(adBudgetNet[i] || 0) + Number(assetsBudgetNet[i] || 0));

      if (compareYear) {
        const adNetPrev = netProfitByMonth(rows, "West Walk Advertisement", compareYear);
        const assetsNetPrev = netProfitByMonth(rows, "Assets Services Company", compareYear);

        netPrev = netPrev.map((v, i) => Number(v || 0) + Number(adNetPrev[i] || 0) + Number(assetsNetPrev[i] || 0));
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      netMain: Number(netMain[i] || 0),
      ...(compareYear ? { netPrev: Number(netPrev[i] || 0) } : {}),
      netBudget: Number(netBudget[i] || 0),
    }));
  }, [rows, company, year, compareYear]);

  const chartSeries = useMemo(() => {
    const s = [{ key: "netMain", label: `Net Profit ${year}`, color: "#7B1FA2" }];

    if (compareYear) {
      s.push({ key: "netPrev", label: `Net Profit ${compareYear}`, color: "#CE93D8" });
    }

    s.push({ key: "netBudget", label: `Budget ${year}`, color: "#FF9800" });
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
      m = Math.max(m, Number(row.netMain || 0));
      m = Math.max(m, Number(row.netBudget || 0));
      if (compareYear) m = Math.max(m, Number(row.netPrev || 0));
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
      <Text style={styles.title}>Net Profit</Text>

      <View style={{ width: usedWidth }}>
        <GroupedBarChart
          data={chartData}
          series={chartSeries}
          maxValue={dynamicMaxValue}
          height={height}
          barWidth={usedBarWidth}
          barGap={usedBarGap}
          groupGap={usedGroupGap}
          showLegend
          showValuesOnTop={showValuesOnTop}
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


// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// const FLIP_SIGN_COST = -1; // cost ko positive bars banane ke liye

// function sumRevenueByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     let rCompany = String(r.company || "").trim();

//     // ✅ Merge Assets Services Company revenue into West Walk Real Estate
//     if (company === "West Walk Real Estate" && rCompany === "West Walk Advertisement") {
//       rCompany = "West Walk Real Estate";
//     }

//     if (rCompany !== company) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "revenue") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0);
//   }

//   return out;
// }

// function sumCostByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     let rCompany = String(r.company || "").trim();

//     // ✅ Merge Assets Services Company cost into West Walk Real Estate
//     if (company === "West Walk Real Estate" && rCompany === "Assets Services Company") {
//       rCompany = "West Walk Real Estate";
//     }

//     if (rCompany !== company) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN_COST;
//   }

//   return out;
// }

// function budgetRevenueByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     let rCompany = String(r.company || "").trim();

//     // ✅ Merge Assets Services Company budget revenue
//     if (company === "West Walk Real Estate" && rCompany === "West Walk Advertisement") {
//       rCompany = "West Walk Real Estate";
//     }

//     if (rCompany !== company) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "revenue") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.budgetedAmount || 0);
//   }

//   return out;
// }

// function budgetCostByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     let rCompany = String(r.company || "").trim();

//     // ✅ Merge Assets Services Company budget cost
//     if (company === "West Walk Real Estate" && rCompany === "Assets Services Company") {
//       rCompany = "West Walk Real Estate";
//     }

//     if (rCompany !== company) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.budgetedAmount || 0) * FLIP_SIGN_COST;
//   }

//   return out;
// }


// // ✅ dynamic max: headroom + round up
// function niceMaxValue(max: number, expandChart: boolean) {
//   if (!Number.isFinite(max) || max <= 0) return 1;

//   const headroom = expandChart ? 1.2 : 1.1; // expand => 20%, normal => 10%
//   const withHeadroom = max * headroom;

//   // ✅ net profit can be smaller/larger, still round nicely
//   const step = expandChart ? 2_000_000 : 1_000_000;
//   return Math.ceil(withHeadroom / step) * step;
// }

// type NetProfitChartProps = {
//   company: string;
//   year: number;
//   compareYear?: number;
//   apiUrl?: string;

//   height?: number;
//   groupGap?: number;

//   expandChart?: boolean;
//   isSidebarCollapsed?: boolean;
// };

// export default function NetProfitChart({
//   company,
//   year,
//   compareYear,
//   // apiUrl = API_URL,

//   height = 300,
//   groupGap = 14,

//   expandChart = false,
//   isSidebarCollapsed = false,
// }: NetProfitChartProps) {
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
//     const revMain = sumRevenueByMonth(rows, company, year);
//     const costMain = sumCostByMonth(rows, company, year);

//     const revCompare = compareYear
//       ? sumRevenueByMonth(rows, company, compareYear)
//       : Array(12).fill(0);

//     const costCompare = compareYear
//       ? sumCostByMonth(rows, company, compareYear)
//       : Array(12).fill(0);

//     const revBudget = budgetRevenueByMonth(rows, company, year);
//     const costBudget = budgetCostByMonth(rows, company, year);

//     const netMain = revMain.map((v, i) => Number(v || 0) - Number(costMain[i] || 0));
//     const netPrev = revCompare.map((v, i) => Number(v || 0) - Number(costCompare[i] || 0));
//     const netBudget = revBudget.map((v, i) => Number(v || 0) - Number(costBudget[i] || 0));

//     return MONTHS.map((label, i) => ({
//       label,
//       netMain: Number(netMain[i] || 0),
//       ...(compareYear ? { netPrev: Number(netPrev[i] || 0) } : {}),
//       netBudget: Number(netBudget[i] || 0),
//     }));
//   }, [rows, company, year, compareYear]);

//   const chartSeries = useMemo(() => {
//     const s: any[] = [{ key: "netMain", label: `Net Profit ${year}`, color: "#7B1FA2" }];

//     if (compareYear) {
//       s.push({ key: "netPrev", label: `Net Profit ${compareYear}`, color: "#CE93D8" });
//     }

//     s.push({ key: "netBudget", label: `Budget ${year}`, color: "#FF9800" });
//     return s;
//   }, [year, compareYear]);

//   // ✅ SAME 4 LOGICS
//   // NOTE: if you want 1030 instead of 1050, change here like Revenue/Expense
//   const usedWidth =
//     expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

//   const usedBarWidth =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 5);

//   const usedBarGap =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 4);

//   const usedGroupGap =
//     expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 10);

//   const showValuesOnTop = expandChart;

//   // ✅ dynamic maxValue for net profit
//   const dynamicMaxValue = useMemo(() => {
//     let m = 0;
//     for (const row of chartData) {
//       m = Math.max(m, Number(row.netMain || 0));
//       m = Math.max(m, Number(row.netBudget || 0));
//       if (compareYear) m = Math.max(m, Number((row as any).netPrev || 0));
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
//       <Text style={styles.title}>Net Profit</Text>

//       <View style={{ width: usedWidth }}>
//         <GroupedBarChart
//           data={chartData}
//           series={chartSeries}
//           maxValue={dynamicMaxValue} // ✅ dynamic
//           height={height}
//           barWidth={usedBarWidth}
//           barGap={usedBarGap}
//           groupGap={usedGroupGap}
//           showLegend
//           showValuesOnTop={showValuesOnTop}
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













// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import GroupedBarChart from "./GroupBarChart";

// const API_URL =
//   "https://financesystemawh-rtjt.onrender.com/api/trialbalance/mongo";
// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// const FLIP_SIGN_COST = -1; // cost ko positive bars banane ke liye

// function sumRevenueByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "revenue") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0);
//   }

//   return out;
// }

// function sumCostByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN_COST;
//   }

//   return out;
// }

// function budgetRevenueByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "revenue") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.budgetedAmount || 0);
//   }

//   return out;
// }

// function budgetCostByMonth(rows: any[], company: string, year: number) {
//   const out = Array(12).fill(0);

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.accountType || "").trim().toLowerCase() !== "cost") continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.budgetedAmount || 0) * FLIP_SIGN_COST;
//   }

//   return out;
// }

// // ✅ dynamic max: headroom + round up
// function niceMaxValue(max: number, expandChart: boolean) {
//   if (!Number.isFinite(max) || max <= 0) return 1;

//   const headroom = expandChart ? 1.2 : 1.1; // expand => 20%, normal => 10%
//   const withHeadroom = max * headroom;

//   // ✅ net profit can be smaller/larger, still round nicely
//   const step = expandChart ? 2_000_000 : 1_000_000;
//   return Math.ceil(withHeadroom / step) * step;
// }

// type NetProfitChartProps = {
//   company: string;
//   year: number;
//   compareYear?: number;
//   apiUrl?: string;

//   height?: number;
//   groupGap?: number;

//   expandChart?: boolean;
//   isSidebarCollapsed?: boolean;
// };

// export default function NetProfitChart({
//   company,
//   year,
//   compareYear,
//   apiUrl = API_URL,

//   height = 300,
//   groupGap = 14,

//   expandChart = false,
//   isSidebarCollapsed = false,
// }: NetProfitChartProps) {
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;

//     const load = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const res = await fetch(apiUrl);
//         const json = await res.json();

//         const allRows = Array.isArray(json?.data) ? json.data : [];
//         if (mounted) setRows(allRows);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "API fetch failed");
//           setRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     load();
//     return () => {
//       mounted = false;
//     };
//   }, [apiUrl]);

//   const chartData = useMemo(() => {
//     const revMain = sumRevenueByMonth(rows, company, year);
//     const costMain = sumCostByMonth(rows, company, year);

//     const revCompare = compareYear
//       ? sumRevenueByMonth(rows, company, compareYear)
//       : Array(12).fill(0);

//     const costCompare = compareYear
//       ? sumCostByMonth(rows, company, compareYear)
//       : Array(12).fill(0);

//     const revBudget = budgetRevenueByMonth(rows, company, year);
//     const costBudget = budgetCostByMonth(rows, company, year);

//     const netMain = revMain.map((v, i) => Number(v || 0) - Number(costMain[i] || 0));
//     const netPrev = revCompare.map((v, i) => Number(v || 0) - Number(costCompare[i] || 0));
//     const netBudget = revBudget.map((v, i) => Number(v || 0) - Number(costBudget[i] || 0));

//     return MONTHS.map((label, i) => ({
//       label,
//       netMain: Number(netMain[i] || 0),
//       ...(compareYear ? { netPrev: Number(netPrev[i] || 0) } : {}),
//       netBudget: Number(netBudget[i] || 0),
//     }));
//   }, [rows, company, year, compareYear]);

//   const chartSeries = useMemo(() => {
//     const s: any[] = [{ key: "netMain", label: `Net Profit ${year}`, color: "#7B1FA2" }];

//     if (compareYear) {
//       s.push({ key: "netPrev", label: `Net Profit ${compareYear}`, color: "#CE93D8" });
//     }

//     s.push({ key: "netBudget", label: `Budget ${year}`, color: "#FF9800" });
//     return s;
//   }, [year, compareYear]);

//   // ✅ SAME 4 LOGICS
//   // NOTE: if you want 1030 instead of 1050, change here like Revenue/Expense
//   const usedWidth =
//     expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

//   const usedBarWidth =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 5);

//   const usedBarGap =
//     expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 5 : 4);

//   const usedGroupGap =
//     expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 10);

//   const showValuesOnTop = expandChart;

//   // ✅ dynamic maxValue for net profit
//   const dynamicMaxValue = useMemo(() => {
//     let m = 0;
//     for (const row of chartData) {
//       m = Math.max(m, Number(row.netMain || 0));
//       m = Math.max(m, Number(row.netBudget || 0));
//       if (compareYear) m = Math.max(m, Number((row as any).netPrev || 0));
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
//       <Text style={styles.title}>Net Profit</Text>

//       <View style={{ width: usedWidth }}>
//         <GroupedBarChart
//           data={chartData}
//           series={chartSeries}
//           maxValue={dynamicMaxValue} // ✅ dynamic
//           height={height}
//           barWidth={usedBarWidth}
//           barGap={usedBarGap}
//           groupGap={usedGroupGap}
//           showLegend
//           showValuesOnTop={showValuesOnTop}
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
