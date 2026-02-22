import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import GroupedBarChart from "./GroupBarChart";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal"; // ✅ single API wrapper

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN_COST = -1;

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

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

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ SINGLE call only (now should fetch ALL TrailBalance data)
        const result = await getWestwalkMongoFromSQLite();

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
    return () => { mounted = false; };
  }, [year, compareYear]); // ✅ (optional) add company if you want reload on company change

  const chartData = useMemo(() => {
    const comp = String(company || "").trim();
    const isWestWalk = comp === C_RE;
    const isAssets = comp === C_ASSETS;
    const isAdv = comp === C_ADV;

    let netMain = netProfitByMonth(rows, comp, year);
    let netBudget = budgetNetProfitByMonth(rows, comp, year);
    let netPrev = compareYear ? netProfitByMonth(rows, comp, compareYear) : Array(12).fill(0);

    if (isWestWalk) {
      const adNet = netProfitByMonth(rows, C_ADV, year);
      const adBudgetNet = budgetNetProfitByMonth(rows, C_ADV, year);

      const assetsNet = netProfitByMonth(rows, C_ASSETS, year);
      const assetsBudgetNet = budgetNetProfitByMonth(rows, C_ASSETS, year);

      netMain = netMain.map((v, i) => Number(v || 0) + Number(adNet[i] || 0) + Number(assetsNet[i] || 0));
      netBudget = netBudget.map((v, i) => Number(v || 0) + Number(adBudgetNet[i] || 0) + Number(assetsBudgetNet[i] || 0));

      if (compareYear) {
        const adNetPrev = netProfitByMonth(rows, C_ADV, compareYear);
        const assetsNetPrev = netProfitByMonth(rows, C_ASSETS, compareYear);

        netPrev = netPrev.map((v, i) => Number(v || 0) + Number(adNetPrev[i] || 0) + Number(assetsNetPrev[i] || 0));
      }
    }

    // Assets & Advertisement net profit ZERO on chart
    if (isAssets || isAdv) {
      netMain = Array(12).fill(0);
      netBudget = Array(12).fill(0);
      if (compareYear) netPrev = Array(12).fill(0);
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