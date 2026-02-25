import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import GroupedBarChart from "../../Charts/GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// If COST in DB is NEGATIVE and you want POSITIVE expense in chart => -1
// If COST already POSITIVE => 1
const FLIP_SIGN = -1;

const C_RE = "West Walk Real Estate";
const C_ASSETS = "Assets Services Company";

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

// ---------- RAW SIGN WORLD SUMS (NO FLIP HERE) ----------
function sumByMonthRaw(
  rows: any[],
  company: string | null,
  year: number,
  predicate: (r: any) => boolean,
  field: "balanceFirst" | "budgetedAmount"
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

    out[m - 1] += Number(r[field] || 0); // raw signed
  }
  return out;
}

const revenueRaw = (rows: any[], company: string | null, year: number) =>
  sumByMonthRaw(rows, company, year, isRevenue, "balanceFirst");

const costRaw = (rows: any[], company: string | null, year: number) =>
  sumByMonthRaw(rows, company, year, isCost, "balanceFirst"); // usually negative

const budgetCostRaw = (rows: any[], company: string | null, year: number) =>
  sumByMonthRaw(rows, company, year, isCost, "budgetedAmount");

const netRaw = (
  rows: any[],
  company: string | null,
  year: number,
  field: "balanceFirst" | "budgetedAmount"
) => {
  const rev = sumByMonthRaw(rows, company, year, isRevenue, field);
  const cst = sumByMonthRaw(rows, company, year, isCost, field);
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0)); // ✅ TrialBalance rule
};

function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function CashFlowGroupExpenseChart({
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
    return () => {
      mounted = false;
    };
  }, [year]);

  const chartData = useMemo(() => {
    const allMode = norm(company) === norm(ALL_COMPANIES);

    // ✅ ALL => no company filter
    const companyFilter: string | null = allMode ? null : company;

    // ✅ Actual expense RAW (cost raw)
    let actualCostRaw = costRaw(rows, companyFilter, year);

    // ✅ Budget expense RAW
    let budgetCost = budgetCostRaw(rows, companyFilter, year);

    // ✅ RE adjustment (match TrialBalance) ONLY when single-company RE
    const isRE = !allMode && norm(company) === norm(C_RE);

    // add Assets NET (rev + cost raw) into RE cost
    if (isRE) {
      const assetsNetA = netRaw(rows, C_ASSETS, year, "balanceFirst");
      actualCostRaw = actualCostRaw.map(
        (v, i) => Number(v || 0) + Number(assetsNetA[i] || 0)
      );

      const assetsNetB = netRaw(rows, C_ASSETS, year, "budgetedAmount");
      budgetCost = budgetCost.map(
        (v, i) => Number(v || 0) + Number(assetsNetB[i] || 0)
      );
    }

    // ✅ Convert to DISPLAY positive expense (only at the end)
    const actualDisp = actualCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
    const budgetDisp = budgetCost.map((v) => Number(v || 0) * FLIP_SIGN);

    // ✅ "budget zero if actual exists" rule:
    // if there is ANY actual entry (non-zero raw) in that month, budget = 0
    return MONTHS.map((label, i) => {
      const actual = Number(actualDisp[i] || 0);
      const hasActual = Math.abs(Number(actualCostRaw[i] || 0)) > 0.000001; // raw check
      const budget = hasActual ? 0 : Number(budgetDisp[i] || 0);
      return { label, actualMain: actual, budgetMain: budget };
    });
  }, [rows, company, year]);

  const chartSeries = useMemo(
    () => [
      { key: "actualMain", label: `Actual ${year}`, color: "#E53935" },
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
        Expense {norm(company) === norm(ALL_COMPANIES) ? "(All Companies)" : ""}
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
          showValuesOnTop={showValuesOnTop}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});