import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import GroupedBarChart from "../../Charts/GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ add ALL option
export const ALL_COMPANIES = "ALL";

const norm = (s: any) => String(s || "").trim().toLowerCase();
const isRevenue = (r: any) => norm(r.accountType) === "revenue";
const isCost = (r: any) => norm(r.accountType) === "cost";

// --------- shared safe unpacking ----------
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

    out[m - 1] += Number(r[field] || 0);
  }
  return out;
}

const revenueActual = (rows: any[], company: string | null, year: number) =>
  sumByMonth(rows, company, year, isRevenue, "balanceFirst");

const costActual = (rows: any[], company: string | null, year: number) =>
  sumByMonth(rows, company, year, isCost, "balanceFirst");

const revenueBudget = (rows: any[], company: string | null, year: number) =>
  sumByMonth(rows, company, year, isRevenue, "budgetedAmount");

const costBudget = (rows: any[], company: string | null, year: number) =>
  sumByMonth(rows, company, year, isCost, "budgetedAmount");

// ✅ TrialBalance rule (Revenue + Cost where cost is usually negative)
function netProfitActualByMonth(rows: any[], company: string | null, year: number) {
  const rev = revenueActual(rows, company, year);
  const cst = costActual(rows, company, year);
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
}

// ✅ Keep your old budget logic if your budget COST is stored positive
// (If budget cost is also negative in your DB, change "-" to "+")
function netProfitBudgetByMonth(rows: any[], company: string | null, year: number) {
  const rev = revenueBudget(rows, company, year);
  const cst = costBudget(rows, company, year);
  return rev.map((v, i) => Number(v || 0) - Number(cst[i] || 0));
}

function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

export default function CashFlowGroupNetProfitChart({
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
    const companyFilter: string | null = allMode ? null : String(company || "").trim();

    const isWestWalkRE = !allMode && norm(companyFilter) === norm(C_RE);

    // actual and budget for selected company OR for ALL (when companyFilter=null)
    let actualMain = netProfitActualByMonth(rows, companyFilter, year);
    let budgetMain = netProfitBudgetByMonth(rows, companyFilter, year);

    // ✅ budget zero if actual exists (use raw actual check, not just >0)
    budgetMain = budgetMain.map((b, i) =>
      Math.abs(Number(actualMain[i] || 0)) > 0.000001 ? 0 : Number(b || 0)
    );

    // ✅ special aggregation ONLY when single-company RE
    // (ALL mode mein already sab companies include ho chuki hain)
    if (isWestWalkRE) {
      const addCompanies = [C_ADV, C_ASSETS];
      for (const c of addCompanies) {
        const netA = netProfitActualByMonth(rows, c, year);
        const netB = netProfitBudgetByMonth(rows, c, year);

        actualMain = actualMain.map((v, i) => Number(v || 0) + Number(netA[i] || 0));

        budgetMain = budgetMain.map((b, i) => {
          const newBudget = Number(b || 0) + Number(netB[i] || 0);
          const hasActualNow = Math.abs(Number(actualMain[i] || 0)) > 0.000001;
          return hasActualNow ? 0 : newBudget;
        });
      }
    }

    return MONTHS.map((label, i) => ({
      label,
      actualMain: Number(actualMain[i] || 0),
      budgetMain: Number(budgetMain[i] || 0),
    }));
  }, [rows, company, year]);

  const chartSeries = useMemo(
    () => [
      { key: "actualMain", label: `Actual ${year}`, color: "#7B1FA2" },
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
        Net Profit {norm(company) === norm(ALL_COMPANIES) ? "(All Companies)" : ""}
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