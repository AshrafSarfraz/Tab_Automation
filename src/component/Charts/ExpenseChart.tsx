import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import GroupedBarChart from "./GroupBarChart";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN = -1;

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

    out[m - 1] += Number(r.balanceFirst || 0) * FLIP_SIGN;
  }
  return out;
}

function sumExpenseByMonth(rows, company, year) {
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

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ SINGLE call only (this should now fetch ALL TrailBalance data)
        const result = await getWestwalkMongoFromSQLite();

        // 🔐 safe unpacking
        const data =
          result?.data?.data ||
          result?.data ||
          (Array.isArray(result) ? result : []);

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
    return () => (mounted = false);
  }, [year, compareYear]); // ✅ you can also keep [company] if you want refresh on company change

  const chartData = useMemo(() => {
    const mainCost = sumExpenseByMonth(rows, company, year);
    const mainBudget = budgetExpenseByMonth(rows, company, year);

    const mainCostCompare = compareYear
      ? sumExpenseByMonth(rows, company, compareYear)
      : Array(12).fill(0);

    // ✅ ONLY for West Walk Real Estate: add Assets NET PROFIT into COST
    if (String(company).trim() === "West Walk Real Estate") {
      const assetsRev = sumRevenueByMonth(rows, "Assets Services Company", year);
      const assetsCost = sumCostByMonth(rows, "Assets Services Company", year);

      const assetsNetProfit = assetsRev.map(
        (v, i) => Number(v || 0) - Number(assetsCost[i] || 0)
      );

      for (let i = 0; i < 12; i++) {
        mainCost[i] = Number(mainCost[i] || 0) + Number(assetsNetProfit[i] || 0);
      }

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