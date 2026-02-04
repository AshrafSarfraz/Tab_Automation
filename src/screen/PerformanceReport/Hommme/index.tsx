import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import GroupedBarChart from "../../../component/Charts/GroupBarChart";

const API_URL = "https://financesystemawh-rtjt.onrender.com/api/trialbalance/mongo";

const COMPANY = "West Walk Real Estate";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sumRevenueByMonth(rows: any[], year: number) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== COMPANY) continue;
    if (Number(r.year) !== year) continue;
    if (String(r.accountType || "").toLowerCase() !== "revenue") continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.balanceFirst || 0);
  }

  return out;
}

function budgetRevenueByMonth(rows: any[], year: number) {
  const out = Array(12).fill(0);

  for (const r of rows) {
    if (String(r.company || "").trim() !== COMPANY) continue;
    if (Number(r.year) !== year) continue;
    if (String(r.accountType || "").toLowerCase() !== "revenue") continue;

    const m = Number(r.month);
    if (!m || m < 1 || m > 12) continue;

    out[m - 1] += Number(r.budgetedAmount || 0);
  }

  return out;
}

export default function HomeRevenueChart() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ API se data
        const res = await fetch(API_URL);
        const json = await res.json();

        // ✅ API format: { data: [...] }
        const allRows = Array.isArray(json?.data) ? json.data : [];

        if (mounted) setRows(allRows);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "API fetch failed");
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = useMemo(() => {
    const actual2025 = sumRevenueByMonth(rows, 2025);
    const actual2024 = sumRevenueByMonth(rows, 2024);
    const budget2025 = budgetRevenueByMonth(rows, 2025);

    return MONTHS.map((label, i) => ({
      label,
      actual2025: Number(actual2025[i] || 0),
      actual2024: Number(actual2024[i] || 0),
      budget2025: Number(budget2025[i] || 0),
    }));
  }, [rows]);

  const chartSeries = useMemo(
    () => [
      { key: "actual2025", label: "Actual 2025", color: "#2979FF" },
      { key: "actual2024", label: "Actual 2024", color: "#4CAF50" },
      { key: "budget2025", label: "Budget 2025", color: "#FF9800" },
    ],
    []
  );

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Revenue (West Walk) - Monthly</Text>

      {/* ✅ fixed width 400 + height 300 */}
      <View style={{ width: 500 }}>
        <GroupedBarChart
          data={chartData}
          series={chartSeries}
          maxValue={20000000}
          height={300}
          barWidth={10}
          barGap={2}
          groupGap={4}
          showLegend
          showValuesOnTop={false}
          valueFormatter={(v) => `${(v / 1000000)}M`}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16,  },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});



