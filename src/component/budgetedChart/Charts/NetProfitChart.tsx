import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../../database/otherCmpTrailBal";
import GroupedBarChart2 from "../GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN_COST = -1; // cost ko positive bars banane ke liye

const isRevenue = (r) => String(r.accountType || "").trim().toLowerCase() === "revenue";
const isCost = (r) => String(r.accountType || "").trim().toLowerCase() === "cost";

// ✅ Budget Revenue
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

// ✅ Budget Cost (flip)
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

// ✅ Budget Net Profit = Budget Revenue - Budget Cost
function budgetNetProfitByMonth(rows, company, year) {
  const rev = budgetRevenueByMonth(rows, company, year);
  const cost = budgetCostByMonth(rows, company, year);
  return rev.map((v, i) => Number(v || 0) - Number(cost[i] || 0));
}

// ✅ dynamic max
function niceMaxValue(max, expandChart) {
  if (!Number.isFinite(max) || max <= 0) return 1;

  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;

  return Math.ceil(withHeadroom / step) * step;
}

const WESTWALK_COMPANIES = new Set([
  "West Walk Real Estate",
  "West Walk Advertisement",
  "Assets Services Company",
]);

export default function NetProfitBudgetChart({
  company,
  year,
  height = 300,
  groupGap = 6,
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
    return () => {
      mounted = false;
    };
  }, [company, year]);

  const chartData = useMemo(() => {
    const isWestWalk = String(company).trim() === "West Walk Real Estate";

    // ✅ only budget net profit for selected company
    let netBudget = budgetNetProfitByMonth(rows, company, year);

    // ✅ WestWalk aggregation: add Advertisement + Assets budget net profit too
    if (isWestWalk) {
      const addCompanies = ["West Walk Advertisement", "Assets Services Company"];
      for (const c of addCompanies) {
        const n = budgetNetProfitByMonth(rows, c, year);
        netBudget = netBudget.map((v, i) => Number(v || 0) + Number(n[i] || 0));
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      netBudget: Number(netBudget[i] || 0),
    }));
  }, [rows, company, year]);

  // ✅ only one series
  const chartSeries = useMemo(
    () => [{ key: "netBudget", label: `Budget Net Profit ${year}`, color: "#7B1FA2" }],
    [year]
  );

  const usedWidth =
    expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);

  const usedBarWidth =
    expandChart ? (isSidebarCollapsed ? 11 : 10) : (isSidebarCollapsed ? 6 : 6);

  const usedBarGap = 0;

  const usedGroupGap =
    expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 2);

  const showValuesOnTop = expandChart;

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, Math.abs(Number(row.netBudget || 0))); // ✅ safe even if negative
    }
    return niceMaxValue(m, expandChart);
  }, [chartData, expandChart]);

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
      <Text style={styles.title}>Net Profit (Budget)</Text>

      <View style={{ width: usedWidth }}>
        <GroupedBarChart2
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
          labelStyle={{ fontSize: 9 }}
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
