import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";

type Props = { company: string; year: number };

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ---- helpers ----
const extractRows = (snap: any) => {
  const payload = snap?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;
  return [];
};

// ✅ adjust if your month field name differs
const getMonth = (r: any) => Number(r.month); // must be 1..12

const isRevenue = (x: any) =>
  String(x.accountType || "").trim().toLowerCase() === "revenue";

const isCost = (x: any) =>
  String(x.accountType || "").trim().toLowerCase() === "cost";

// sums for a value field
const sumRevenue = (rows: any[], field: "balanceFirst" | "budgetedAmount") =>
  (rows || []).filter(isRevenue).reduce((s, x) => s + (Number(x[field]) || 0), 0);

const sumCost = (rows: any[], field: "balanceFirst" | "budgetedAmount") =>
  (rows || []).filter(isCost).reduce((s, x) => s + (Number(x[field]) || 0), 0);

const sumNet = (rows: any[], field: "balanceFirst" | "budgetedAmount") => {
  const rev = sumRevenue(rows, field);
  const cost = sumCost(rows, field);
  return rev + cost; // signed cost world
};

// ---- main ----
export default function CashFlowPnLSummaryCards({ company, year }: Props) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const snap = await getWestwalkMongoFromSQLite();
        const rows = extractRows(snap);
        const yearRows = (rows || []).filter((r: any) => Number(r.year) === Number(year));
        if (mounted) setAllRows(yearRows);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load data");
          setAllRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [year]);

  const { totalRevenue, totalCost, netProfit } = useMemo(() => {
    const byCompany = (name: string) => {
      const n = String(name || "").trim().toLowerCase();
      return (allRows || []).filter(
        (r: any) => String(r.company || "").trim().toLowerCase() === n
      );
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1..12

    // ✅ as-of month rule:
    // Feb me sirf Jan actual => use completed months only => currentMonth - 1
    const asOfMonth = Math.max(0, currentMonth - 1);

    const rowsFor = (name: string) => byCompany(name);

    // Split: for past years => 100% actual
    // for current year => actual months (<= asOfMonth) + budget months (> asOfMonth)
    const splitRows = (rows: any[]) => {
      if (Number(year) < currentYear) {
        return { actual: rows, budget: [] as any[] };
      }
      if (Number(year) > currentYear) {
        // future year => 100% budget (usually)
        return { actual: [] as any[], budget: rows };
      }

      // current year
      const actual = rows.filter((r) => getMonth(r) >= 1 && getMonth(r) <= asOfMonth);
      const budget = rows.filter((r) => getMonth(r) > asOfMonth && getMonth(r) <= 12);
      return { actual, budget };
    };

    const companyRows = rowsFor(company);
    const advRows = rowsFor(C_ADV);
    const assetsRows = rowsFor(C_ASSETS);

    const splitCurrent = splitRows(companyRows);
    const splitAdv = splitRows(advRows);
    const splitAssets = splitRows(assetsRows);

    // Base totals (blended)
    let rev =
      sumRevenue(splitCurrent.actual, "balanceFirst") +
      sumRevenue(splitCurrent.budget, "budgetedAmount");

    let cost =
      sumCost(splitCurrent.actual, "balanceFirst") +
      sumCost(splitCurrent.budget, "budgetedAmount");

    // ---- Apply your West Walk rules on BLENDED totals ----
    const compName = String(company || "").trim();
    const compLower = compName.toLowerCase();

    // helper: blended net for adv/assets
    const blendedNet = (split: { actual: any[]; budget: any[] }) =>
      sumNet(split.actual, "balanceFirst") + sumNet(split.budget, "budgetedAmount");

    // 1) Real Estate: move adv net to revenue, assets net to cost
    if (compName === C_RE) {
      const advNet = blendedNet(splitAdv);
      const assetsNet = blendedNet(splitAssets);

      rev = rev + advNet;
      cost = cost + assetsNet;
    }

    // 2) Assets net = 0
    if (compLower === C_ASSETS.toLowerCase()) {
      const net = rev + cost;
      rev = rev - net;
    }

    // 3) Advertisement net = 0
    if (compLower === C_ADV.toLowerCase()) {
      const net = rev + cost;
      cost = cost - net;
    }

    return { totalRevenue: rev, totalCost: cost, netProfit: rev + cost };
  }, [allRows, company, year]);

  const fmt = (n: number) =>
    Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

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
        <Text style={{ color: "red", fontWeight: "700" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.revenue]}>
        <Text style={styles.title}>Forecast Revenue</Text>
        <Text style={styles.value}>{fmt(totalRevenue)}</Text>
      </View>

      <View style={[styles.card, styles.cost]}>
        <Text style={styles.title}>Forecast Cost</Text>
        <Text style={styles.value}>{fmt(totalCost)}</Text>
      </View>

      <View style={[styles.card, styles.net]}>
        <Text style={styles.title}>Forecast Net Profit</Text>
        <Text style={styles.value}>{fmt(netProfit)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  value: { fontSize: 18, fontWeight: "800" },
  revenue: { backgroundColor: "#E9F7EC" },
  cost: { backgroundColor: "#FCE9E9" },
  net: { backgroundColor: "#FFF3D6" },
});