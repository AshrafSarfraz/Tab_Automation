import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import GroupedBarChart from "../../Charts/GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FLIP_SIGN = -1;

// ✅ add ALL option
export const ALL_COMPANIES = "ALL";

const norm = (s: any) => String(s || "").trim().toLowerCase();
const isRevenue = (r: any) => norm(r.accountType) === "revenue";
const isCost = (r: any) => norm(r.accountType) === "cost";

// ✅ safe unpacking
const extractRows = (result: any) => {
  const data =
    result?.data?.data ||
    result?.data ||
    (Array.isArray(result) ? result : []);
  return Array.isArray(data) ? data : [];
};

// ---------- generic monthly sum (company optional) ----------
function sumByMonth(
  rows: any[],
  company: string | null,
  year: number,
  predicate: (r: any) => boolean,
  field: "balanceFirst" | "budgetedAmount",
  transform?: (x: number) => number
) {
  const out = Array(12).fill(0);
  const c = company ? norm(company) : null;

  for (const r of rows || []) {
    // ✅ company filter only when company provided
    if (c && norm(r.company) !== c) continue;

    if (Number(r.year) !== Number(year)) continue;
    if (!predicate(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    const raw = Number(r[field] || 0);
    out[m - 1] += transform ? transform(raw) : raw;
  }
  return out;
}

function sumRevenueByMonth(rows: any[], company: string | null, year: number) {
  return sumByMonth(rows, company, year, isRevenue, "balanceFirst");
}

// cost used only for special adjustment in your old logic
function sumCostByMonth(rows: any[], company: string | null, year: number) {
  // ✅ keep your old behavior: display positive cost by flipping sign
  return sumByMonth(rows, company, year, isCost, "balanceFirst", (x) => x * FLIP_SIGN);
}

function budgetRevenueByMonth(rows: any[], company: string | null, year: number) {
  return sumByMonth(rows, company, year, isRevenue, "budgetedAmount");
}

function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function CashFlowGroupRevenueChart({
  company,
  year,
  height = 300,
  groupGap = 14,
  expandChart = false,
  isSidebarCollapsed = false,
}: {
  company: string; // pass "ALL" to show all companies combined
  year: number;
  height?: number;
  groupGap?: number;
  expandChart?: boolean;
  isSidebarCollapsed?: boolean;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getWestwalkMongoFromSQLite();
        const data = extractRows(result);

        if (mounted) setRows(data);
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
    return () => (mounted = false);
  }, [year]);

  // ✅ chart data with ALL-companies support
  const chartData = useMemo(() => {
    const allMode = norm(company) === norm(ALL_COMPANIES);
    const companyFilter: string | null = allMode ? null : String(company || "").trim();

    const mainRev = sumRevenueByMonth(rows, companyFilter, year);
    const mainBudget = budgetRevenueByMonth(rows, companyFilter, year);

    // ✅ keep your old special rule ONLY when single-company RE
    // (ALL mode mein already sab include ho chuka hota hai, so no extra add)
    if (!allMode && norm(companyFilter) === norm("West Walk Real Estate")) {
      const adRev = sumRevenueByMonth(rows, "West Walk Advertisement", year);
      const adCost = sumCostByMonth(rows, "West Walk Advertisement", year);

      // your old formula kept: netProfit = rev - (positive cost)
      const adNetProfit = adRev.map(
        (v, i) => Number(v || 0) - Number(adCost[i] || 0)
      );

      for (let i = 0; i < 12; i++) {
        mainRev[i] = Number(mainRev[i] || 0) + Number(adNetProfit[i] || 0);
      }
    }

    return MONTHS.map((label, i) => {
      const actual = Number(mainRev[i] || 0);

      // ✅ safer budget-zero rule: if ANY actual entry exists (not just > 0)
      const hasActual = Math.abs(actual) > 0.000001;
      const budget = hasActual ? 0 : Number(mainBudget[i] || 0);

      return {
        label,
        actualMain: actual,
        budgetMain: budget,
      };
    });
  }, [rows, company, year]);

  const chartSeries = useMemo(
    () => [
      { key: "actualMain", label: `Actual ${year}`, color: "#1B5E20" },
      { key: "budgetMain", label: `Budget ${year}`, color: "#FF9800" },
    ],
    [year]
  );

  const usedWidth = expandChart
    ? isSidebarCollapsed
      ? 1030
      : 930
    : isSidebarCollapsed
    ? 500
    : 440;

  const usedBarWidth = expandChart ? (isSidebarCollapsed ? 14 : 12) : 8;
  const usedBarGap = expandChart ? (isSidebarCollapsed ? 14 : 12) : isSidebarCollapsed ? 8 : 6;
  const usedGroupGap = expandChart
    ? isSidebarCollapsed
      ? 43
      : 40
    : isSidebarCollapsed
    ? groupGap
    : 11;

  const showValuesOnTop = expandChart;

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, Number(row.actualMain || 0));
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
      <Text style={styles.title}>
        Revenue {norm(company) === norm(ALL_COMPANIES) ? "(All Companies)" : ""}
      </Text>

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
          valueFormatter={(v: number) =>
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