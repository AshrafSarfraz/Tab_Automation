import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getCashFlowFromSQLite } from "../../database/cashFlow";
import GroupedBarChart2 from "../budgetedChart/GroupBarChart";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ✅ Month name to number
const monthNames: Record<string, number> = {
  "january": 1, "february": 2, "march": 3, "april": 4,
  "may": 5, "june": 6, "july": 7, "august": 8,
  "september": 9, "october": 10, "november": 11, "december": 12
};

const extractRows = (snap: any) => {
  const payload = snap?.data;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (snap && Array.isArray(snap.data)) return snap.data;
  if (Array.isArray(snap)) return snap;
  return [];
};

function getAmountByMonth(rows: any[], company: string, year: number, component: string) {
  const out = Array(12).fill(0);
  for (const r of rows) {
    // ✅ Capital letters handle
    if (String(r.Company || r.company || "").trim() !== String(company || "").trim()) continue;
    if (Number(r.Year || r.year) !== Number(year)) continue;
    if (String(r.Component || r.component || "").trim().toLowerCase() !== component.toLowerCase()) continue;

    // ✅ Month string ya number dono handle
    const monthRaw = r.Month || r.month;
    const m = typeof monthRaw === "string"
      ? monthNames[monthRaw.toLowerCase()]
      : Number(monthRaw);

    if (!m || m < 1 || m > 12) continue;
    out[m - 1] += Number(r.Amount || 0);
  }
  return out;
}

function niceMaxValue(max: number, expandChart: boolean) {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const headroom = expandChart ? 1.2 : 1.1;
  const step = expandChart ? 2_000_000 : 1_000_000;
  return Math.ceil((max * headroom) / step) * step;
}

export default function CashFlowChart({
  company, year, height = 300, groupGap = 6,
  expandChart = false, isSidebarCollapsed = false,
}: {
  company: string;
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
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const result = await getCashFlowFromSQLite();
        const data = extractRows(result);
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [company, year]);

  const chartData = useMemo(() => {
    const inflow = getAmountByMonth(rows, company, year, "Inflow");
    const outflow = getAmountByMonth(rows, company, year, "Outflow");
    return MONTHS.map((label, i) => ({
      label,
      inflow: Number(inflow[i] || 0),
      outflow: Math.abs(Number(outflow[i] || 0)),
    }));
  }, [rows, company, year]);

  const chartSeries = useMemo(() => [
    { key: "inflow", label: `Inflow ${year}`, color: "#1B5E20" },
    { key: "outflow", label: `Outflow ${year}`, color: "#E53935" },
  ], [year]);

  const usedWidth = expandChart ? (isSidebarCollapsed ? 1030 : 930) : (isSidebarCollapsed ? 500 : 440);
  const usedBarWidth = expandChart ? (isSidebarCollapsed ? 11 : 10) : 6;
  const usedGroupGap = expandChart ? (isSidebarCollapsed ? 28 : 25) : (isSidebarCollapsed ? groupGap : 2);

  const dynamicMaxValue = useMemo(() => {
    let m = 0;
    for (const row of chartData) {
      m = Math.max(m, row.inflow, row.outflow);
    }
    return niceMaxValue(m, expandChart);
  }, [chartData, expandChart]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={{ color: "red" }}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cash Flow</Text>
      <View style={{ width: usedWidth }}>
        <GroupedBarChart2
          data={chartData}
          series={chartSeries}
          maxValue={dynamicMaxValue}
          height={height}
          barWidth={usedBarWidth}
          barGap={0}
          groupGap={usedGroupGap}
          showLegend
          showValuesOnTop={expandChart}
          yAxisOffset={-45}
          valueFormatter={(v) =>
            `${(v / 1_000_000).toFixed(1).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}M`
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