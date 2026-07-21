import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getCashFlowFromSQLite } from "../../database/cashFlow";

type Props = {
  company: string;
  year: number;
};

const extractRows = (snap: any) => {
  const payload = snap?.data;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (snap && Array.isArray(snap.data)) return snap.data;
  if (Array.isArray(snap)) return snap;
  return [];
};

export default function CashFlowSummaryCards({ company, year }: Props) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const snap = await getCashFlowFromSQLite();
        const rows = extractRows(snap);

        // ✅ Capital letters handle karo
        const filtered = rows.filter(
          (r: any) =>
            String(r.Company || r.company || "").trim() === String(company || "").trim() &&
            Number(r.Year || r.year) === Number(year)
        );
        if (mounted) setAllRows(filtered);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [company, year]);

  const { inflow, outflow, net } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const r of allRows) {
      // ✅ Capital letters handle karo
      const comp = String(r.Component || r.component || "").trim().toLowerCase();
      const amt = Number(r.Amount || 0);
      if (comp === "inflow") inflow += amt;
      if (comp === "outflow") outflow += amt;
    }
    return { inflow, outflow, net: inflow + outflow };
  }, [allRows]);

  const fmt = (n: number) =>
    Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <View style={[styles.row, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.row, { justifyContent: "center" }]}>
        <Text style={{ color: "red", fontWeight: "700" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.inflow]}>
        <Text style={styles.title}>Inflow</Text>
        <Text style={styles.value}>{fmt(inflow)}</Text>
      </View>
      <View style={[styles.card, styles.outflow]}>
        <Text style={styles.title}>Outflow</Text>
        <Text style={styles.value}>{fmt(outflow)}</Text>
      </View>
      <View style={[styles.card, styles.net]}>
        <Text style={styles.title}>Net Cash Flow</Text>
        <Text style={styles.value}>{fmt(net)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  card: {
    flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#E5E5E5", alignItems: "center",
    justifyContent: "center", minHeight: 80,
  },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  value: { fontSize: 18, fontWeight: "800" },
  inflow: { backgroundColor: "#E9F7EC" },
  outflow: { backgroundColor: "#FCE9E9" },
  net: { backgroundColor: "#FFF3D6" },
});