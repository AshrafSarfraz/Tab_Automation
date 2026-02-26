import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import GroupedBarChart from "../../Charts/GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// If COST in DB is NEGATIVE and you want POSITIVE expense in chart => -1
// If COST already POSITIVE => 1
const FLIP_SIGN = -1;

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ companies that must show as ZERO (CashFlow1 rule)
const ZERO_COMPANIES = new Set([C_ADV, C_ASSETS]);

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
  field: "balanceFirst" | "budgetedAmount",
  opts?: { excludeCompaniesNorm?: Set<string> }
) {
  const out = Array(12).fill(0);
  const c = company ? norm(company) : null;
  const exclude = opts?.excludeCompaniesNorm;

  for (const r of rows || []) {
    const rCompanyNorm = norm(r.company);

    // ✅ company filter only when company provided
    if (c && rCompanyNorm !== c) continue;

    // ✅ exclude some companies (used for ALL mode like CashFlow1)
    if (!c && exclude && exclude.has(rCompanyNorm)) continue;

    if (Number(r.year) !== Number(year)) continue;
    if (!predicate(r)) continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r[field] || 0); // raw signed
  }
  return out;
}

const costRaw = (rows: any[], company: string | null, year: number, opts?: { excludeCompaniesNorm?: Set<string> }) =>
  sumByMonthRaw(rows, company, year, isCost, "balanceFirst", opts);

const budgetCostRaw = (rows: any[], company: string | null, year: number, opts?: { excludeCompaniesNorm?: Set<string> }) =>
  sumByMonthRaw(rows, company, year, isCost, "budgetedAmount", opts);

// ✅ TrialBalance net rule (Revenue + Cost), raw world
const netRaw = (
  rows: any[],
  company: string | null,
  year: number,
  field: "balanceFirst" | "budgetedAmount"
) => {
  const rev = sumByMonthRaw(rows, company, year, isRevenue, field);
  const cst = sumByMonthRaw(rows, company, year, isCost, field);
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
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
    const companyFilter: string | null = allMode ? null : company;

    // ✅ normalize exclude set (CashFlow1: ADV + ASSETS shown but forced to ZERO)
    const excludeCompaniesNorm = new Set(Array.from(ZERO_COMPANIES).map((c) => norm(c)));

    const selectedIsZeroCompany = !allMode && excludeCompaniesNorm.has(norm(company));

    // ✅ 1) If selected company is ADV/ASSETS => force ZERO like CashFlow1 rows
    if (selectedIsZeroCompany) {
      return MONTHS.map((label) => ({ label, actualMain: 0, budgetMain: 0 }));
    }

    // ✅ 2) Actual/Budget cost RAW
    // - ALL mode: exclude ADV + ASSETS from direct sum (CashFlow1 rule)
    // - single company: normal filter
    let actualCostRaw = costRaw(
      rows,
      companyFilter,
      year,
      allMode ? { excludeCompaniesNorm } : undefined
    );

    let budgetCost = budgetCostRaw(
      rows,
      companyFilter,
      year,
      allMode ? { excludeCompaniesNorm } : undefined
    );

    // ✅ 3) Transfer ASSETS net into RE cost (FM COST) — CashFlow1 parity
    // - when single-company RE
    // - OR when ALL companies combined (because totals include RE + FM COST once)
    const isRE = !allMode && norm(company) === norm(C_RE);
    if (isRE || allMode) {
      const assetsNetA = netRaw(rows, C_ASSETS, year, "balanceFirst");
      actualCostRaw = actualCostRaw.map((v, i) => Number(v || 0) + Number(assetsNetA[i] || 0));

      const assetsNetB = netRaw(rows, C_ASSETS, year, "budgetedAmount");
      budgetCost = budgetCost.map((v, i) => Number(v || 0) + Number(assetsNetB[i] || 0));
    }

    // ✅ 4) Convert to DISPLAY positive expense (only at the end)
    const actualDisp = actualCostRaw.map((v) => Number(v || 0) * FLIP_SIGN);
    const budgetDisp = budgetCost.map((v) => Number(v || 0) * FLIP_SIGN);

    // ✅ 5) "budget zero if actual exists" rule (raw check)
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