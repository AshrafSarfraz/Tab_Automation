// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import { LineChart } from "react-native-gifted-charts";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
// import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const FLIP_SIGN_COST = -1; // cost ko positive line banane ke liye

// const isRevenue = (r) => String(r.accountType || "").trim().toLowerCase() === "revenue";
// const isCost = (r) => String(r.accountType || "").trim().toLowerCase() === "cost";

// function sumRevenueByMonth(rows, company, year) {
//   const out = Array(12).fill(0);
//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (!isRevenue(r)) continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     out[m - 1] += Number(r.balanceFirst || 0);
//   }
//   return out;
// }

// function sumCostByMonth(rows, company, year) {
//   const out = Array(12).fill(0);
//   for (const r of rows) {
//     if (String(r.company || "").trim() !== String(company || "").trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (!isCost(r)) continue;

//     const m = Number(r.month);
//     if (!m || m < 1 || m > 12) continue;

//     // cost ko positive show karne ke liye flip
//     out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN_COST;
//   }
//   return out;
// }

// function niceMaxValue(max, expandChart) {
//   if (!Number.isFinite(max) || max <= 0) return 1;

//   const headroom = expandChart ? 1.2 : 1.0;
//   const withHeadroom = max * headroom;

//   const step = expandChart ? 2_000_000 : 1_000_000;
//   return Math.ceil(withHeadroom / step) * step;
// }

// const WESTWALK_COMPANIES = new Set([
//   "West Walk Real Estate",
//   "West Walk Advertisement",
//   "Assets Services Company",
// ]);

// export default function RevenueCostNetProfitLineChart({
//   company,
//   year,
//   height = 260,
//   expandChart = false,
//   isSidebarCollapsed = false,
// }) {
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     let mounted = true;

//     const loadFromSQLite = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const isWestwalk = WESTWALK_COMPANIES.has(String(company).trim());
//         const result = isWestwalk
//           ? await getWestwalkMongoFromSQLite()
//           : await getOtherCmpMongoFromSQLite();

//         const data =
//           result?.data?.data ||
//           result?.data ||
//           (Array.isArray(result) ? result : []);

//         if (mounted) setRows(Array.isArray(data) ? data : []);
//       } catch (e) {
//         if (mounted) {
//           setError(e?.message || "Failed to load from SQLite");
//           setRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadFromSQLite();
//     return () => { mounted = false; };
//   }, [company]);

//   const computed = useMemo(() => {
//     const isWestWalk = String(company).trim() === "West Walk Real Estate";

//     let rev = sumRevenueByMonth(rows, company, year);
//     let cost = sumCostByMonth(rows, company, year);

//     // ✅ West Walk aggregation (Ad + Assets add)
//     if (isWestWalk) {
//       const addCompanies = ["West Walk Advertisement", "Assets Services Company"];
//       for (const c of addCompanies) {
//         const r = sumRevenueByMonth(rows, c, year);
//         const k = sumCostByMonth(rows, c, year);
//         rev = rev.map((v, i) => Number(v || 0) + Number(r[i] || 0));
//         cost = cost.map((v, i) => Number(v || 0) + Number(k[i] || 0));
//       }
//     }

//     const net = rev.map((v, i) => Number(v || 0) - Number(cost[i] || 0));
//     return { rev, cost, net };
//   }, [rows, company, year]);

//   const { revenueData, costData, netData } = useMemo(() => {
//     const toSeries = (arr, withLabels) =>
//       MONTHS.map((m, i) => ({
//         value: Number(arr[i] || 0),
//         ...(withLabels ? { label: m } : {}),
//       }));

//     return {
//       revenueData: toSeries(computed.rev, true), // labels only here
//       costData: toSeries(computed.cost, false),
//       netData: toSeries(computed.net, false),
//     };
//   }, [computed]);

//   // ✅ match your bar-chart style widths
//   const usedWidth =
//     expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 460 : 400);

//   // ✅ FIX: make all 12 months fit (stable in expand/collapse)
//   const POINTS = MONTHS.length; // 12
//   const initialSpacing = 10;
//   const endSpacing = 10;

//   const spacing = useMemo(() => {
//     // ensures 12 points fit into usedWidth
//     return Math.max(
//       18,
//       Math.floor((usedWidth - initialSpacing - endSpacing) / (POINTS))
//     );
//   }, [usedWidth]);

//   const maxValue = useMemo(() => {
//     let m = 0;
//     for (const v of computed.rev) m = Math.max(m, Number(v || 0));
//     for (const v of computed.cost) m = Math.max(m, Number(v || 0));
//     for (const v of computed.net) m = Math.max(m, Number(v || 0));
//     return niceMaxValue(m, expandChart);
//   }, [computed, expandChart]);

//   const formatM = (v) =>
//     `${(Number(v || 0) / 1_000_000)
//       .toFixed(1)
//       .replace(/\.00$/, "")
//       .replace(/(\.\d)0$/, "$1")}M`;

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
//       <Text style={styles.title}>Yearly Report</Text>

//       <View style={styles.Innercontainer}>
//         <View style={{ width: usedWidth }}>
//           <LineChart
//             // ✅ width + auto fit
//             width={usedWidth}
//             adjustToWidth
//             initialSpacing={initialSpacing}
//             endSpacing={endSpacing}
//             spacing={spacing}

//             height={height}
//             maxValue={maxValue}
//             noOfSections={6}
//             yAxisLabelWidth={40}
//             yAxisTextStyle={{ fontSize: 11 }}
//             xAxisLabelsHeight={22}
//             xAxisLabelTextStyle={{
//               fontSize: 11,
//               width: spacing,
//               textAlign: "center",
//             }}

//             data={revenueData}
//             data2={costData}
//             data3={netData}

//             color1="#1B5E20" // Revenue
//             color2="#FF3B30" // Cost
//             color3="#7B1FA2" // Net

//             thickness={3}
//             thickness2={3}
//             thickness3={3}

//             hideDataPoints={false}
//             dataPointsRadius={4}
//             dataPointsColor1="#1B5E20"
//             dataPointsColor2="#FF3B30"
//             dataPointsColor3="#7B1FA2"

//             showVerticalLines
//             verticalLinesColor="#E6E6E6"

//             showValuesAsTooltipText
//             formatYLabel={(val) => formatM(val)}
//           />
//         </View>

//         {/* Legend */}
//         <View style={styles.legendRow}>
//           <LegendItem color="#1B5E20" label={`Revenue ${year}`} />
//           <LegendItem color="#FF3B30" label={`Cost ${year}`} />
//           <LegendItem color="#7B1FA2" label={`Net Profit ${year}`} />
//         </View>
//       </View>
//     </View>
//   );
// }

// function LegendItem({ color, label }) {
//   return (
//     <View style={styles.legendItem}>
//       <View style={[styles.dot, { backgroundColor: color }]} />
//       <Text style={styles.legendText}>{label}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flexGrow: 1, marginTop: 18 },
//   Innercontainer: {
//     padding: 16,
//     backgroundColor: "#F5F5F5",
//     borderRadius: 16,
//     borderWidth: 0.2,
//     paddingTop: 40,
//     paddingBottom:8,
//     overflow:"hidden"
//   },
//   title: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
//   center: { flex: 1, justifyContent: "center", alignItems: "center" },
//   legendRow: { flexDirection: "row", flexWrap: "wrap", marginTop:10, gap: 10,alignSelf:"center" },
//   legendItem: { flexDirection: "row", alignItems: "center", marginRight: 10 },
//   dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
//   legendText: { fontSize: 12 },
// });

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const KEEP_COST_NEGATIVE = true;

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
    let v = Number(r.balanceFirst || 0);
    if (KEEP_COST_NEGATIVE) v = -Math.abs(v); // negative
    out[m - 1] += v;
  }
  return out;
}

// Headroom helper for positive values
function niceMaxValue(max, expandChart) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil((max * headroom) / step) * step;
}

// Headroom helper for negative values
function niceMinValue(min, expandChart) {
  if (!Number.isFinite(min) || min >= 0) return 0;
  const headroom = expandChart ? 1.2 : 1.1;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return -Math.ceil((Math.abs(min) * headroom) / step);
}

const WESTWALK_COMPANIES = new Set([
  "West Walk Real Estate",
  "West Walk Advertisement",
  "Assets Services Company",
]);

export default function RevenueCostNetProfitLineChart({
  company,
  year,
  height = 260,
  expandChart = false,
  isSidebarCollapsed = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadFromSQLite = async () => {
      try {
        setLoading(true);
        setError("");
        const isWestwalk = WESTWALK_COMPANIES.has(String(company).trim());
        const result = isWestwalk
          ? await getWestwalkMongoFromSQLite()
          : await getOtherCmpMongoFromSQLite();
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

  const computed = useMemo(() => {
    const isWestWalk = String(company).trim() === "West Walk Real Estate";

    let rev = sumRevenueByMonth(rows, company, year);
    let cost = sumCostByMonth(rows, company, year);

    if (isWestWalk) {
      const addCompanies = ["West Walk Advertisement", "Assets Services Company"];
      for (const c of addCompanies) {
        const r = sumRevenueByMonth(rows, c, year);
        const k = sumCostByMonth(rows, c, year);
        rev = rev.map((v, i) => Number(v || 0) + Number(r[i] || 0));
        cost = cost.map((v, i) => Number(v || 0) + Number(k[i] || 0));
      }
    }

    const net = rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
    return { rev, cost, net };
  }, [rows, company, year]);

  const { revenueData, costData, netData } = useMemo(() => {
    const toSeries = (arr, withLabels) =>
      MONTHS.map((m, i) => ({
        value: Number(arr[i] || 0),
        ...(withLabels ? { label: m } : {}),
      }));

    return {
      revenueData: toSeries(computed.rev, true),
      costData: toSeries(computed.cost, false),
      netData: toSeries(computed.net, false),
    };
  }, [computed]);

  const usedWidth = expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 1030 : 930);
  const POINTS = MONTHS.length;
  const initialSpacing = 10;
  const endSpacing = 10;

  const spacing = useMemo(() => Math.max(18, Math.floor((usedWidth - initialSpacing - endSpacing) / POINTS)), [usedWidth]);

  // ✅ Dynamic max/min including negative cost headroom
  const { maxValue, mostNegativeValue } = useMemo(() => {
    let max = 0, min = 0;
    for (const arr of [computed.rev, computed.cost, computed.net]) {
      for (const v of arr) {
        const n = Number(v || 0);
        if (!Number.isFinite(n)) continue;
        max = Math.max(max, n);
        min = Math.min(min, n);
      }
    }
    return { maxValue: niceMaxValue(max, expandChart), mostNegativeValue: niceMinValue(min, expandChart) };
  }, [computed, expandChart]);

  const formatM = (v) => `${(Number(v || 0)/1_000_000).toFixed(1).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}M`;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={{color:'red', fontWeight:'700'}}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yearly Report</Text>
      <View style={styles.Innercontainer}>
        <View style={{ width: usedWidth }}>
          <LineChart
            width={usedWidth}
            adjustToWidth
            initialSpacing={initialSpacing}
            endSpacing={endSpacing}
            spacing={spacing}
            height={height}
            maxValue={maxValue}
            mostNegativeValue={mostNegativeValue}
            showReferenceLine1
            referenceLine1Position={0}
            noOfSections={6}
            noOfSectionsBelowXAxis={4}
            yAxisLabelWidth={40}
            yAxisTextStyle={{ fontSize: 11 }}
            xAxisLabelsHeight={22}
            xAxisLabelTextStyle={{ fontSize: 11, width: spacing, textAlign: "center" }}
            data={revenueData}
            data2={costData}
            data3={netData}
            color1="#1B5E20"
            color2="#FF3B30"
            color3="#7B1FA2"
            thickness={3}
            thickness2={3}
            thickness3={3}
            hideDataPoints={false}
            dataPointsRadius={4}
            dataPointsColor1="#1B5E20"
            dataPointsColor2="#FF3B30"
            dataPointsColor3="#7B1FA2"
            showVerticalLines
            verticalLinesColor="#E6E6E6"
            showValuesAsTooltipText
            formatYLabel={(val) => formatM(val)}
          />
        </View>
        <View style={styles.legendRow}>
          <LegendItem color="#1B5E20" label={`Revenue ${year}`} />
          <LegendItem color="#FF3B30" label={`Cost ${year}`} />
          <LegendItem color="#7B1FA2" label={`Net Profit ${year}`} />
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, marginTop: 18 },
  Innercontainer: { padding: 16, backgroundColor: "#F5F5F5", borderRadius: 16, borderWidth: 0.2, paddingTop: 40, paddingBottom: 8, overflow: "hidden" },
  title: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 10, alignSelf: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12 },
});
