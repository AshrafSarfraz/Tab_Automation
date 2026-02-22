import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal"; // ✅ SINGLE API ONLY

type Props = {
  company: string;
  year: number;
};

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ Budget helpers: use budgetedAmount instead of balanceFirst
function calcBudgetRevenue(rows: any[]) {
  return (rows || [])
    .filter((x) => String(x.accountType || "").trim().toLowerCase() === "revenue")
    .reduce((s, x) => s + (Number(x.budgetedAmount) || 0), 0);
}

function calcBudgetCost(rows: any[]) {
  return (rows || [])
    .filter((x) => String(x.accountType || "").trim().toLowerCase() === "cost")
    .reduce((s, x) => s + (Number(x.budgetedAmount) || 0), 0);

  /**
   * ⚠️ If your budget COST is stored as POSITIVE number,
   * and you want netProfit = revenue - cost, then do:
   * .reduce((s, x) => s + (Number(x.budgetedAmount) || 0), 0) * -1
   */
}

function calcBudgetNetProfit(rows: any[]) {
  const rev = calcBudgetRevenue(rows);
  const cost = calcBudgetCost(rows);
  return rev + cost; // ✅ cost signed world
}

// ✅ Extract rows (handles both sqlite snapshot formats)
const extractRows = (snap: any) => {
  const payload = snap?.data;

  if (Array.isArray(payload)) return payload; // e.g. { data: [...] }
  if (payload && Array.isArray(payload.data)) return payload.data; // e.g. { data: { data:[...] } }

  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;

  return [];
};

export default function BudgetPnLSummaryCards({ company, year }: Props) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ SINGLE API CALL (must return ALL companies combined)
        const snap = await getWestwalkMongoFromSQLite();

        const rows = extractRows(snap);
        const yearRows = (rows || []).filter((r: any) => Number(r.year) === Number(year));

        if (mounted) setAllRows(yearRows);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load P&L from SQLite");
          setAllRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
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

    const currentRows = byCompany(company);

    // ✅ Budget totals (selected company)
    let rev = calcBudgetRevenue(currentRows);
    let cost = calcBudgetCost(currentRows);

    // ✅ Special case: West Walk Real Estate adjustments (Budget)
    if (String(company).trim() === C_RE) {
      const advBudgetNet = calcBudgetNetProfit(byCompany(C_ADV));
      const assetsBudgetNet = calcBudgetNetProfit(byCompany(C_ASSETS));

      // Advertisement budget net -> add to RE budget revenue
      rev = rev + advBudgetNet;

      // Assets budget net -> add to RE budget cost
      cost = cost + assetsBudgetNet;
    }

    return { totalRevenue: rev, totalCost: cost, netProfit: rev + cost };
  }, [allRows, company]);

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
        <Text style={styles.title}>Budget Revenue</Text>
        <Text style={styles.value}>{fmt(totalRevenue)}</Text>
      </View>

      <View style={[styles.card, styles.cost]}>
        <Text style={styles.title}>Budget Cost</Text>
        <Text style={styles.value}>{fmt(totalCost)}</Text>
      </View>

      <View style={[styles.card, styles.net]}>
        <Text style={styles.title}>Budget Net Profit</Text>
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