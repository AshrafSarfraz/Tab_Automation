import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

type Row = {
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

  // other companies snapshot: { savedAt, data: [ ... ] }
  if (Array.isArray(payload)) return payload;

  // westwalk snapshot: { savedAt, data: { success, count, data:[...] } }
  if (payload && Array.isArray(payload.data)) return payload.data;

  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;

  return [];
};

const fmt0 = (n: number) =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function GroupYearlySummaryCards({ year }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // load both snapshots once
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [westwalkSnap, otherSnap] = await Promise.all([
          getWestwalkMongoFromSQLite(),
          getOtherCmpMongoFromSQLite(),
        ]);

        const allRows = [
          ...extractRowsFromSnap(westwalkSnap),
          ...extractRowsFromSnap(otherSnap),
        ];

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

  const { revenue, cost, net, count } = useMemo(() => {
    const selectedYear = Number(year);

    const yearRows = rows.filter((r) => Number(r.year) === selectedYear);

    let revenue = 0;
    let cost = 0;

    for (const r of yearRows) {
      const t = String(r.accountType || "").trim().toLowerCase();
      const val = Number(r.balanceFirst || 0);

      if (t === "revenue") revenue += val;
      if (t === "cost") cost += val; // cost is already signed (usually negative)
    }

    return {
      revenue,
      cost,
      net: revenue + cost,
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






// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
// import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

// type Row = {
//   company?: string;
//   year?: number;
//   month?: number;
//   accountType?: string; // "Revenue" | "Cost"
//   balanceFirst?: number;
// };

// type Props = {
//   year: number; // <GroupYearlySummaryCards year={selectedYear} />
// };

// // Westwalk companies (same as table)
// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";

// const extractRowsFromSnap = (snap: any): Row[] => {
//   const payload = snap?.data;

//   if (Array.isArray(payload)) return payload;
//   if (payload && Array.isArray(payload.data)) return payload.data;

//   if (Array.isArray(snap)) return snap;
//   if (snap && Array.isArray(snap.data)) return snap.data;

//   return [];
// };

// const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
// const fmt0 = (n: number) =>
//   Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

// // ✅ monthly sum by company/year/type (SIGNED cost)
// function sumMonthly(rows: Row[], company: string, year: number, type: "Revenue" | "Cost") {
//   const out = Array(12).fill(0);
//   const cmp = String(company || "").trim();

//   for (const r of rows) {
//     if (String(r.company || "").trim() !== cmp) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (!isValidMonth(r.month)) continue;

//     const t = String(r.accountType || "").trim().toLowerCase();
//     if (type === "Revenue" && t !== "revenue") continue;
//     if (type === "Cost" && t !== "cost") continue;

//     out[Number(r.month) - 1] += Number(r.balanceFirst || 0);
//   }
//   return out;
// }

// function netMonthly(rows: Row[], company: string, year: number) {
//   const rev = sumMonthly(rows, company, year, "Revenue");
//   const cost = sumMonthly(rows, company, year, "Cost");
//   return rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
// }

// function sumArr(arr: number[]) {
//   return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
// }

// export default function GroupYearlySummaryCards({ year }: Props) {
//   const [loading, setLoading] = useState(true);
//   const [rows, setRows] = useState<Row[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   // load both snapshots once
//   useEffect(() => {
//     let mounted = true;

//     const load = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         const [westwalkSnap, otherSnap] = await Promise.all([
//           getWestwalkMongoFromSQLite(),
//           getOtherCmpMongoFromSQLite(),
//         ]);

//         const allRows = [
//           ...extractRowsFromSnap(westwalkSnap),
//           ...extractRowsFromSnap(otherSnap),
//         ];

//         if (mounted) setRows(allRows);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load group data");
//           setRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     load();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const { revenue, cost, net } = useMemo(() => {
//     const y = Number(year);

//     // ✅ companies list
//     const map = new Map<string, string>();
//     rows.forEach((r) => {
//       const c = String(r.company || "").trim();
//       if (!c) return;
//       const key = c.toLowerCase();
//       if (!map.has(key)) map.set(key, c);
//     });
//     const companies = Array.from(map.values());

//     // ✅ group monthly totals (AFTER rules)
//     const groupRev = Array(12).fill(0);
//     const groupCost = Array(12).fill(0);

//     for (const cmp of companies) {
//       let revA = sumMonthly(rows, cmp, y, "Revenue");
//       let costA = sumMonthly(rows, cmp, y, "Cost");

//       // ✅ SAME RULE 1: RE gets ADV net into Revenue, ASSETS net into Cost
//       if (cmp === C_RE) {
//         const advNet = netMonthly(rows, C_ADV, y);
//         const assetsNet = netMonthly(rows, C_ASSETS, y);

//         revA = revA.map((v, i) => v + (advNet[i] || 0));
//         costA = costA.map((v, i) => v + (assetsNet[i] || 0));
//       }

//       // ✅ SAME RULE 2: ASSETS offset to make net=0 by subtracting net from revenue
//       if (cmp.trim().toLowerCase() === C_ASSETS.toLowerCase()) {
//         const netA = revA.map((v, i) => Number(v || 0) + Number(costA[i] || 0));
//         revA = revA.map((v, i) => Number(v || 0) - Number(netA[i] || 0));
//       }

//       // ✅ SAME RULE 3: ADV offset to make net=0 by subtracting net from cost
//       if (cmp.trim().toLowerCase() === C_ADV.toLowerCase()) {
//         const netA = revA.map((v, i) => Number(v || 0) + Number(costA[i] || 0));
//         costA = costA.map((v, i) => Number(v || 0) - Number(netA[i] || 0));
//       }

//       // add into group
//       for (let i = 0; i < 12; i++) {
//         groupRev[i] += Number(revA[i] || 0);
//         groupCost[i] += Number(costA[i] || 0);
//       }
//     }

//     const totalRev = sumArr(groupRev);
//     const totalCost = sumArr(groupCost);
//     const totalNet = totalRev + totalCost;

//     return { revenue: totalRev, cost: totalCost, net: totalNet };
//   }, [rows, year]);

//   if (loading) {
//     return (
//       <View style={[styles.row, { justifyContent: "center", paddingVertical: 10 }]}>
//         <ActivityIndicator />
//         <Text style={{ marginLeft: 8, color: "#666" }}>Loading…</Text>
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={[styles.row, { justifyContent: "center", paddingVertical: 10 }]}>
//         <Text style={{ color: "red", fontWeight: "800" }}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.row}>
//       <View style={[styles.card, styles.revCard]}>
//         <Text style={styles.title}>Group Revenue</Text>
//         <Text style={styles.value}>QAR {fmt0(revenue)}</Text>
//       </View>

//       <View style={[styles.card, styles.costCard]}>
//         <Text style={styles.title}>Group Cost</Text>
//         <Text style={styles.value}>QAR {fmt0(cost)}</Text>
//       </View>

//       <View style={[styles.card, styles.netCard]}>
//         <Text style={styles.title}>Group Net Profit</Text>
//         <Text style={[styles.value, { color: net >= 0 ? "green" : "red" }]}>
//           QAR {fmt0(net)}
//         </Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: { width: "100%", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
//   card: {
//     flex: 1,
//     borderRadius: 12,
//     paddingVertical: 14,
//     paddingHorizontal: 12,
//     borderWidth: 1,
//     borderColor: "#E5E5E5",
//     alignItems: "center",
//     justifyContent: "center",
//     minHeight: 80,
//   },
//   title: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
//   value: { fontSize: 18, fontWeight: "900" },

//   revCard: { backgroundColor: "#E9F7EC" },
//   costCard: { backgroundColor: "#FCE9E9" },
//   netCard: { backgroundColor: "#FFF3D6" },
// });
