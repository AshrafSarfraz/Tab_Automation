import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/PerformanceReport"; // ✅ SINGLE API ONLY

// ✅ Westwalk companies (same as table)
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

type Row = {
  company?: string; // ✅ add company (optional, safe)
  year?: number;
  month?: number;
  accountType?: string; // "Revenue" | "Cost"
  balanceFirst?: number;
};

type Props = {
  year: number; // <GroupYearlySummaryCards year={selectedYear} />
};

const extractRowsFromSnap = (snap: any): Row[] => {
  const payload = snap?.data;

  // combined snapshot can be in any of these shapes
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;

  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;

  return [];
};

const fmt0 = (n: number) =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const normCompany = (c: any) => String(c || "").trim().toLowerCase();
const isCompany = (rowCompany: any, target: string) =>
  normCompany(rowCompany) === normCompany(target);

export default function GroupYearlySummaryCards({ year }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ✅ load SINGLE snapshot once
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ ONE API CALL
        const snap = await getWestwalkMongoFromSQLite();
        const allRows = extractRowsFromSnap(snap);

        if (mounted) setRows(allRows);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load group data");
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

  // ✅ Consolidation applied here:
  // - ADV + ASSETS will still be "used" in totals, but their values won't double-count as separate companies
  // - ADV net goes into Revenue bucket
  // - ASSETS net goes into Cost bucket
  const { revenue, cost, net, count } = useMemo(() => {
    const selectedYear = Number(year);
    const yearRows = (rows || []).filter((r) => Number(r.year) === selectedYear);

    let baseRevenue = 0; // all companies EXCEPT ADV + ASSETS
    let baseCost = 0;

    let advRevenue = 0;
    let advCost = 0;

    let assetsRevenue = 0;
    let assetsCost = 0;

    for (const r of yearRows) {
      const t = String(r.accountType || "").trim().toLowerCase();
      const val = Number(r.balanceFirst || 0);

      const isAdv = isCompany(r.company, C_ADV);
      const isAssets = isCompany(r.company, C_ASSETS);

      // collect ADV/ASSETS separately (so we can consolidate into West Walk view)
      if (isAdv) {
        if (t === "revenue") advRevenue += val;
        if (t === "cost") advCost += val;
        continue;
      }

      if (isAssets) {
        if (t === "revenue") assetsRevenue += val;
        if (t === "cost") assetsCost += val;
        continue;
      }

      // everything else stays as-is
      if (t === "revenue") baseRevenue += val;
      if (t === "cost") baseCost += val;
    }

    const advNet = advRevenue + advCost; // cost already signed
    const assetsNet = assetsRevenue + assetsCost;

    // ✅ consolidated buckets (matches your table logic)
    const revenue = baseRevenue + advNet;
    const cost = baseCost + assetsNet;
    const net = revenue + cost;

    return {
      revenue,
      cost,
      net,
      count: yearRows.length,
    };
  }, [rows, year]);

  if (loading) {
    return (
      <View style={[styles.row, { justifyContent: "center", paddingVertical: 10 }]}>
        <ActivityIndicator />
        <Text style={{ marginLeft: 8, color: "#666" }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.row, { justifyContent: "center", paddingVertical: 10 }]}>
        <Text style={{ color: "red", fontWeight: "800" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.card, styles.revCard]}>
          <Text style={styles.title}>Group Revenue</Text>
          <Text style={styles.value}>QAR {fmt0(revenue)}</Text>
        </View>

        <View style={[styles.card, styles.costCard]}>
          <Text style={styles.title}>Group Cost</Text>
          <Text style={styles.value}>QAR {fmt0(cost)}</Text>
        </View>

        <View style={[styles.card, styles.netCard]}>
          <Text style={styles.title}>Group Net Profit</Text>
          <Text style={[styles.value, { color: net >= 0 ? "green" : "red" }]}>
            QAR {fmt0(net)}
          </Text>
        </View>
      </View>

      {/* optional debug */}
      {/* <Text style={styles.subTitle}>Rows: {count}</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  subTitle: { fontSize: 12, color: "#666", marginBottom: 10, paddingHorizontal: 12 },

  row: { width: "100%", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  card: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  title: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  value: { fontSize: 18, fontWeight: "900" },

  revCard: { backgroundColor: "#E9F7EC" },
  costCard: { backgroundColor: "#FCE9E9" },
  netCard: { backgroundColor: "#FFF3D6" },
});