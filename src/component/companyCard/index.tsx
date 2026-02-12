import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

type Props = {
  company: string;
  year: number;
};

const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ helper: net = revenue + cost (cost signed)
function calcRevenue(rows: any[]) {
  return rows
    .filter((x) => String(x.accountType || "").trim().toLowerCase() === "revenue")
    .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);
}

function calcCost(rows: any[]) {
  return rows
    .filter((x) => String(x.accountType || "").trim().toLowerCase() === "cost")
    .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);
}

function calcNetProfit(rows: any[]) {
  const rev = calcRevenue(rows);
  const cost = calcCost(rows);
  return rev + cost;
}

export default function PnLSummaryCards({ company, year }: Props) {
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const WESTWALK_COMPANIES = new Set([C_RE, C_ADV, C_ASSETS]);

    const extractRows = (snap: any) => {
      const payload = snap?.data;

      // othercmp snapshot: { savedAt, data: [ ... ] }
      if (Array.isArray(payload)) return payload;

      // westwalk snapshot: { savedAt, data: { success, count, data:[...] } }
      if (payload && Array.isArray(payload.data)) return payload.data;

      // extra safety
      if (Array.isArray(snap)) return snap;
      if (snap && Array.isArray(snap.data)) return snap.data;

      return [];
    };

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const isWestwalk = WESTWALK_COMPANIES.has(String(company).trim());

        const snap = isWestwalk
          ? await getWestwalkMongoFromSQLite()
          : await getOtherCmpMongoFromSQLite();

        const rows = extractRows(snap);

        // ✅ keep only selected year (but keep all companies of that year for RE special rules)
        const yearRows = rows.filter((r: any) => Number(r.year) === Number(year));

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
  }, [year, company]);

  const { totalRevenue, totalCost, netProfit } = useMemo(() => {
    // ✅ case-insensitive company match
    const byCompany = (name: string) => {
      const n = String(name || "").trim().toLowerCase();
      return allRows.filter(
        (r: any) => String(r.company || "").trim().toLowerCase() === n
      );
    };

    const compName = String(company || "").trim();
    const compNameLower = compName.toLowerCase();

    const currentRows = byCompany(compName);

    // Base (as-is)
    let rev = calcRevenue(currentRows);
    let cost = calcCost(currentRows);

    // ✅ 1) RE: add both companies into RE
    if (compName === C_RE) {
      const advNet = calcNetProfit(byCompany(C_ADV));
      const assetsNet = calcNetProfit(byCompany(C_ASSETS));

      // Advertisement net profit -> add to Real Estate revenue
      rev = rev + advNet;

      // Assets Services net profit -> add to Real Estate cost
      cost = cost + assetsNet;
    }

    // ✅ 2) Assets: make net profit ZERO by adding net as Revenue (Westwalk Contract)
    if (compNameLower === C_ASSETS.toLowerCase()) {
      const net = rev + cost;     // current net
      rev = rev - net;            // add net into revenue => net becomes 0
      // cost same
    }

    // ✅ 3) Advertisement: make net profit ZERO by adding (-net) into Cost (Westwalk Contract)
    if (compNameLower === C_ADV.toLowerCase()) {
      const net = rev + cost;     // current net
      cost = cost - net;          // add opposite in cost => net becomes 0
      // rev same
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
        <Text style={styles.title}>Revenue</Text>
        <Text style={styles.value}>{fmt(totalRevenue)}</Text>
      </View>

      <View style={[styles.card, styles.cost]}>
        <Text style={styles.title}>Cost</Text>
        <Text style={styles.value}>{fmt(totalCost)}</Text>
      </View>

      <View style={[styles.card, styles.net]}>
        <Text style={styles.title}>Net Profit</Text>
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




// import React, { useEffect, useMemo, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
// import { getOtherCmpMongoFromSQLite } from "../../database/otherCmpTrailBal";

// type Props = {
//   company: string;
//   year: number;
// };

// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";

// // ✅ helper: net = revenue + cost (cost signed)
// function calcRevenue(rows: any[]) {
//   return rows
//     .filter((x) => String(x.accountType || "").toLowerCase() === "revenue")
//     .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);
// }

// function calcCost(rows: any[]) {
//   return rows
//     .filter((x) => String(x.accountType || "").toLowerCase() === "cost")
//     .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);
// }

// function calcNetProfit(rows: any[]) {
//   const rev = calcRevenue(rows);
//   const cost = calcCost(rows);
//   return rev + cost;
// }

// export default function PnLSummaryCards({ company, year }: Props) {
//   const [allRows, setAllRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // useEffect(() => {
//   //   let mounted = true;

//   //   const load = async () => {
//   //     try {
//   //       setLoading(true);
//   //       setError("");

//   //       const snap = await getWestwalkMongoFromSQLite();
//   //       const apiJson = snap?.data;

//   //       const all = Array.isArray(apiJson?.data) ? apiJson.data : [];

//   //       // ✅ keep only this year (optional but better)
//   //       const yearRows = all.filter((r: any) => Number(r.year) === Number(year));

//   //       if (mounted) setAllRows(yearRows);
//   //     } catch (e: any) {
//   //       if (mounted) {
//   //         setError(e?.message || "Failed to load P&L from SQLite");
//   //         setAllRows([]);
//   //       }
//   //     } finally {
//   //       if (mounted) setLoading(false);
//   //     }
//   //   };

//   //   load();
//   //   return () => {
//   //     mounted = false;
//   //   };
//   // }, [year]);

//   useEffect(() => {
//     let mounted = true;
  
//     const WESTWALK_COMPANIES = new Set([
//       C_RE,
//       C_ADV,
//       C_ASSETS,
//     ]);
  
//     const extractRows = (snap: any) => {
//       const d = snap?.data;
//       if (Array.isArray(d)) return d;
//       if (Array.isArray(d?.data)) return d.data;
//       return [];
//     };
  
//     const load = async () => {
//       try {
//         setLoading(true);
//         setError("");
  
//         const isWestwalk = WESTWALK_COMPANIES.has(String(company).trim());
  
//         const snap = isWestwalk
//           ? await getWestwalkMongoFromSQLite()
//           : await getOtherCmpMongoFromSQLite();
  
//         const rows = extractRows(snap);
  
//         // ✅ keep only selected year (but keep all companies of that year for RE special rules)
//         const yearRows = rows.filter((r: any) => Number(r.year) === Number(year));
  
//         if (mounted) setAllRows(yearRows);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load P&L from SQLite");
//           setAllRows([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };
  
//     load();
//     return () => {
//       mounted = false;
//     };
//   }, [year, company]);
  

//   const { totalRevenue, totalCost, netProfit } = useMemo(() => {
//     const byCompany = (name: string) =>
//       allRows.filter(
//         (r: any) => String(r.company || "").trim() === String(name).trim()
//       );

//     const currentRows = byCompany(company);

//     // Normal case
//     let rev = calcRevenue(currentRows);
//     let cost = calcCost(currentRows);

//     // ✅ Special case: West Walk Real Estate adjustments
//     if (String(company).trim() === C_RE) {
//       const advNet = calcNetProfit(byCompany(C_ADV));
//       const assetsNet = calcNetProfit(byCompany(C_ASSETS));

//       // ✅ your rules:
//       // Advertisement net profit -> add to Real Estate revenue
//       rev = rev + advNet;

//       // Assets Services net profit -> add to Real Estate cost
//       cost = cost + assetsNet;
//     }

//     return { totalRevenue: rev, totalCost: cost, netProfit: rev + cost };
//   }, [allRows, company]);

//   const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

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
//         <Text style={{ color: "red", fontWeight: "700" }}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.row}>
//       <View style={[styles.card, styles.revenue]}>
//         <Text style={styles.title}>Revenue</Text>
//         <Text style={styles.value}>{fmt(totalRevenue)}</Text>
//       </View>

//       <View style={[styles.card, styles.cost]}>
//         <Text style={styles.title}>Cost</Text>
//         <Text style={styles.value}>{fmt(totalCost)}</Text>
//       </View>

//       <View style={[styles.card, styles.net]}>
//         <Text style={styles.title}>Net Profit</Text>
//         <Text style={styles.value}>{fmt(netProfit)}</Text>
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
//   title: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
//   value: { fontSize: 18, fontWeight: "800" },
//   revenue: { backgroundColor: "#E9F7EC" },
//   cost: { backgroundColor: "#FCE9E9" },
//   net: { backgroundColor: "#FFF3D6" },
// });
