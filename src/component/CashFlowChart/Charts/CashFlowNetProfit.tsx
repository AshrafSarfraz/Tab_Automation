import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import GroupedBarChart from "../../Charts/GroupBarChart";
 // ✅ single API wrapper

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

const isRevenue = (r) => String(r.accountType || "").trim().toLowerCase() === "revenue";
const isCost = (r) => String(r.accountType || "").trim().toLowerCase() === "cost";

// Monthly sums
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
    out[m - 1] += Number(r.balanceFirst || 0);
  }
  return out;
}

// Budget
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
    out[m - 1] += Number(r.budgetedAmount || 0);
  }
  return out;
}

// Net Profit = Revenue - Cost
function netProfitByMonth(rows, company, year) {
  const rev = sumRevenueByMonth(rows, company, year);
  const cost = sumCostByMonth(rows, company, year);
  return rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
}

// Budget Net Profit
function budgetNetProfitByMonth(rows, company, year) {
  const rev = budgetRevenueByMonth(rows, company, year);
  const cost = budgetCostByMonth(rows, company, year);
  return rev.map((v, i) => Number(v || 0) - Number(cost[i] || 0));
}

function niceMaxValue(max, expandChart) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function CashFlowNetProfitChart({
  company,
  year,
  height = 300,
  groupGap = 14,
  expandChart = false,
  isSidebarCollapsed = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getWestwalkMongoFromSQLite();
        const data = result?.data?.data || result?.data || (Array.isArray(result) ? result : []);
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
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
  }, [company, year]);

  const chartData = useMemo(() => {
    const comp = String(company || "").trim();
    const isWestWalk = comp === C_RE;

    // actual and budget
    let actualMain = netProfitByMonth(rows, comp, year);
    let budgetMain = budgetNetProfitByMonth(rows, comp, year);

    // if actual exists, budget = 0
    budgetMain = budgetMain.map((b, i) => (actualMain[i] > 0 ? 0 : b));

    // WestWalk aggregation: include Advertisement + Assets
    if (isWestWalk) {
      const addCompanies = [C_ADV, C_ASSETS];
      for (const c of addCompanies) {
        const net = netProfitByMonth(rows, c, year);
        const netBudget = budgetNetProfitByMonth(rows, c, year);
        actualMain = actualMain.map((v, i) => Number(v || 0) + Number(net[i] || 0));
        budgetMain = budgetMain.map((b, i) => (actualMain[i] > 0 ? 0 : Number(b || 0) + Number(netBudget[i] || 0)));
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      actualMain: actualMain[i],
      budgetMain: budgetMain[i],
    }));
  }, [rows, company, year]);

  const chartSeries = useMemo(() => [
    { key: "actualMain", label: `Actual ${year}`, color: "#7B1FA2" },
    { key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" },
  ], [year]);


  const usedWidth =
  expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

const usedBarWidth =
  expandChart ? (isSidebarCollapsed ? 14 : 12) : (isSidebarCollapsed ? 8 : 8);

const usedBarGap =
  expandChart ? (isSidebarCollapsed ? 14 : 12) : (isSidebarCollapsed ? 8 : 6);

const usedGroupGap =
  expandChart ? (isSidebarCollapsed ? 43 : 40) : (isSidebarCollapsed ? groupGap : 11);
  
  const showValuesOnTop = expandChart;

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, Number(row.actualMain || 0));
      m = Math.max(m, Number(row.budgetMain || 0));
    }
    return niceMaxValue(m, expandChart);
  }, [chartData, expandChart]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={{ color: "red", fontWeight: "700" }}>{error}</Text></View>;

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
          valueFormatter={(v) => `${(v/1_000_000).toFixed(1).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}M`}
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