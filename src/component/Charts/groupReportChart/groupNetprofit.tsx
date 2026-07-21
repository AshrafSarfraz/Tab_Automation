import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../../database/PerformanceReport";
import GroupedBarChart from "../GroupBarChart";



const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Westwalk companies
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ SAME extractor as TB
const extractRowsFromSnap = (snap: any): any[] => {
  const payload = snap?.data;

  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;

  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;

  return [];
};

const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
const isRevenue = (r: any) => String(r.accountType || "").trim().toLowerCase() === "revenue";
const isCost = (r: any) => String(r.accountType || "").trim().toLowerCase() === "cost";

// sum by month for balanceFirst / budgetedAmount (SIGNED cost)
function sumByMonth(
  rows: any[],
  company: string,
  year: number,
  type: "Revenue" | "Cost",
  field: "balanceFirst" | "budgetedAmount"
) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.year) !== Number(year)) continue;

    const ok = type === "Revenue" ? isRevenue(r) : isCost(r);
    if (!ok) continue;

    const m = Number(r.month);
    if (!isValidMonth(m)) continue;

    out[m - 1] += Number(r?.[field] || 0);
  }

  return out;
}

// net monthly: revenue + cost (cost is signed negative normally)
function netMonthly(rows: any[], company: string, year: number, field: "balanceFirst" | "budgetedAmount") {
  const rev = sumByMonth(rows, company, year, "Revenue", field);
  const cost = sumByMonth(rows, company, year, "Cost", field);
  return rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
}

// ✅ dynamic max
function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const withHeadroom = max * headroom;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil(withHeadroom / step) * step;
}

type Props = {
  year: number;
  compareYear?: number;
  height?: number;
  groupGap?: number;
  expandChart?: boolean;
  isSidebarCollapsed?: boolean;
};

export default function GroupNetProfitChart({
  year,
  compareYear,
  height = 300,
  groupGap = 14,
  expandChart = false,
  isSidebarCollapsed = false,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ load BOTH snapshots always (Group)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const snapW = await getWestwalkMongoFromSQLite();

        const allRows = extractRowsFromSnap(snapW);

        if (mounted) setRows(Array.isArray(allRows) ? allRows : []);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load from SQLite");
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

  // ✅ unique companies
  const companies = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const c = String(r.company || "").trim();
      if (!c) return;
      const key = c.toLowerCase();
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // ✅ apply same rules and return GROUP net (monthly)
  function computeGroupNetMonthly(field: "balanceFirst" | "budgetedAmount", y: number) {
    const groupNet = Array(12).fill(0);

    for (const cmp of companies) {
      let rev = sumByMonth(rows, cmp, y, "Revenue", field);
      let cost = sumByMonth(rows, cmp, y, "Cost", field); // signed

      // 1) RE: add ADV net to revenue, add ASSETS net to cost
      if (cmp === C_RE) {
        const advNet = netMonthly(rows, C_ADV, y, field);
        const assetsNet = netMonthly(rows, C_ASSETS, y, field);

        rev = rev.map((v, i) => v + (advNet[i] || 0));
        cost = cost.map((v, i) => v + (assetsNet[i] || 0));
      }

      // 2) ASSETS: make net=0 by adjusting revenue (rev = rev - net)
      if (cmp.trim().toLowerCase() === C_ASSETS.toLowerCase()) {
        const net = rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
        rev = rev.map((v, i) => Number(v || 0) - Number(net[i] || 0));
      }

      // 3) ADV: make net=0 by adjusting cost (cost = cost - net)
      if (cmp.trim().toLowerCase() === C_ADV.toLowerCase()) {
        const net = rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
        cost = cost.map((v, i) => Number(v || 0) - Number(net[i] || 0));
      }

      // final net for this company
      const net = rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));

      // add to group
      for (let i = 0; i < 12; i++) {
        groupNet[i] += Number(net[i] || 0);
      }
    }

    return groupNet;
  }

  const chartData = useMemo(() => {
    const netMain = computeGroupNetMonthly("balanceFirst", year);
    const netBudget = computeGroupNetMonthly("budgetedAmount", year);

    const netPrev = compareYear
      ? computeGroupNetMonthly("balanceFirst", compareYear)
      : Array(12).fill(0);

    return MONTHS.map((label, i) => ({
      label,
      netMain: Number(netMain[i] || 0),
      ...(compareYear ? { netPrev: Number(netPrev[i] || 0) } : {}),
      netBudget: Number(netBudget[i] || 0),
    }));
  }, [rows, companies, year, compareYear]);

  const chartSeries = useMemo(() => {
    const s: any[] = [{ key: "netMain", label: `Net Profit ${year}`, color: "#7B1FA2" }];

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
      m = Math.max(m, Math.abs(Number(row.netMain || 0)));
      m = Math.max(m, Math.abs(Number(row.netBudget || 0)));
      if (compareYear) m = Math.max(m, Math.abs(Number((row as any).netPrev || 0)));
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
      <Text style={styles.title}>Group Net Profit</Text>

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
