import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal"; // ✅ SINGLE API
import GroupedBarChart2 from "../GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function isRevenue(r) {
  return String(r.accountType || "").trim().toLowerCase() === "revenue";
}

// ✅ Budgeted REVENUE only (company-wise)
function budgetRevenueByMonth(rows, company, year) {
  const out = Array(12).fill(0);

  for (const r of rows || []) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (!isRevenue(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.budgetedAmount || 0);
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

export default function RevenueBudgetChart({
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

        // ✅ SINGLE API CALL (must return ALL companies combined)
        const result = await getWestwalkMongoFromSQLite();

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
  }, [company, year]);

  const chartData = useMemo(() => {
    const isWestWalk = String(company).trim() === "West Walk Real Estate";

    // ✅ Only Budget Revenue (selected company)
    let budgetMain = budgetRevenueByMonth(rows, company, year);

    // ✅ WestWalk aggregation: add Advertisement + Assets budget revenue also
    if (isWestWalk) {
      const addCompanies = ["West Walk Advertisement", "Assets Services Company"];
      for (const c of addCompanies) {
        const b = budgetRevenueByMonth(rows, c, year);
        budgetMain = budgetMain.map((v, i) => Number(v || 0) + Number(b[i] || 0));
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      budgetMain: Number(budgetMain[i] || 0),
    }));
  }, [rows, company, year]);

  // ✅ ONLY one series (Budget)
  const chartSeries = useMemo(
    () => [{ key: "budgetMain", label: `Budget ${year}`, color: "#1B5E20" }],
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
      m = Math.max(m, Number(row.budgetMain || 0));
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
      <Text style={styles.title}>Revenue (Budget)</Text>

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