


import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal"; 
// 👆 path apne project ke hisaab se sahi kar lena

type Props = {
  company: string;
  year: number;
};

export default function PnLSummaryCards({ company, year }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ 1) Get latest saved snapshot from SQLite
        const snap = await getWestwalkMongoFromSQLite();

        // snap?.data is the FULL saved JSON (same as API response)
        const apiJson = snap?.data;

        // ✅ 2) extract rows
        const all = Array.isArray(apiJson?.data) ? apiJson.data : [];

        // ✅ 3) filter by company + year
        const filtered = all.filter(
          (r: any) =>
            String(r.company || "").trim() === String(company || "").trim() &&
            Number(r.year) === Number(year)
        );

        if (mounted) setRows(filtered);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load P&L from SQLite");
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
  }, [company, year]);

  const { totalRevenue, totalCost, netProfit } = useMemo(() => {
    const rev = rows
      .filter((x) => String(x.accountType || "").toLowerCase() === "revenue")
      .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);

    const cost = rows
      .filter((x) => String(x.accountType || "").toLowerCase() === "cost")
      .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);

    // ✅ same logic: net = revenue + cost (cost signed)
    return { totalRevenue: rev, totalCost: cost, netProfit: rev + cost };
  }, [rows]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <View
        style={[
          styles.row,
          { justifyContent: "center", paddingVertical: 10 },
        ]}
      >
        <ActivityIndicator />
        <Text style={{ marginLeft: 8, color: "#666" }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.row,
          { justifyContent: "center", paddingVertical: 10 },
        ]}
      >
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
  row: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
  },
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

// type Props = {
//   company: string;
//   year: number;
//   apiUrl?: string;
// };

// const DEFAULT_API_URL =
//   "https://financesystemawh-rtjt.onrender.com/api/trialbalance/mongo";

// export default function PnLSummaryCards({
//   company,
//   year,
//   apiUrl = DEFAULT_API_URL,
// }: Props) {
//   const [rows, setRows] = useState<any[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string>("");

//   useEffect(() => {
//     let mounted = true;

//     const load = async () => {
//       try {
//         setLoading(true);
//         setError("");

//         const res = await fetch(apiUrl);
//         const json = await res.json();
//         const all = Array.isArray(json?.data) ? json.data : [];

//         const filtered = all.filter(
//           (r: any) =>
//             String(r.company || "").trim() === String(company || "").trim() &&
//             Number(r.year) === Number(year)
//         );

//         if (mounted) setRows(filtered);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load P&L");
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
//   }, [company, year, apiUrl]);

//   const { totalRevenue, totalCost, netProfit } = useMemo(() => {
//     const rev = rows
//       .filter((x) => String(x.accountType || "").toLowerCase() === "revenue")
//       .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);

//     const cost = rows
//       .filter((x) => String(x.accountType || "").toLowerCase() === "cost")
//       .reduce((s, x) => s + (Number(x.balanceFirst) || 0), 0);

//     // ✅ same logic as your screen: net = revenue + cost
//     return { totalRevenue: rev, totalCost: cost, netProfit: rev + cost };
//   }, [rows]);

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
//   row: {
//     width: "100%",
//     flexDirection: "row",
//     gap: 10, // if not supported, use marginRight in card
//     paddingHorizontal: 12,
//   },
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






// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   FlatList,
//   SafeAreaView,
// } from 'react-native';
// import { getWestwalkMongoFromSQLite } from '../../database/westwalkTrailBal';

// // ✅ Read from sqlite instead of API

// const TrialBalanceScreen = () => {
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string>('');

//   const [companyFilter, setCompanyFilter] = useState<string>('West Walk Real Estate');
//   const [yearFilter, setYearFilter] = useState<number>(2025);

//   useEffect(() => {
//     const loadFromSQLite = async () => {
//       try {
//         setLoading(true);
//         setError('');

//         // ✅ get latest saved payload
//         const saved = await getWestwalkMongoFromSQLite();

//         if (!saved?.data) {
//           setData([]);
//           setError('No sqlite data found. Please sync after login.');
//           return;
//         }

//         // backend response: { data: [...] }
//         const rows = Array.isArray(saved.data?.data) ? saved.data.data : [];

//         // ✅ apply company + year filter
//         const filtered = rows.filter(
//           (r: any) =>
//             String(r.company || '').trim() === companyFilter &&
//             Number(r.year) === yearFilter
//         );

//         setData(filtered);
//       } catch (e: any) {
//         setError(e?.message || 'Something went wrong');
//         setData([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadFromSQLite();
//   }, [companyFilter, yearFilter]);

//   // calculate totals
//   const totalBalance = data.reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);
//   const totalBudget = data.reduce((sum, item) => sum + (Number(item.budgetedAmount) || 0), 0);

//   const totalRevenue = data
//     .filter(item => item.accountType?.toLowerCase() === 'revenue')
//     .reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);

//   const totalCost = data
//     .filter(item => item.accountType?.toLowerCase() === 'cost')
//     .reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);

//   const renderRow = ({ item }: any) => (
//     <View style={styles.row}>
//       <Text style={[styles.cell, { width: 120 }]} numberOfLines={1}>{item.company || '-'}</Text>
//       <Text style={[styles.cell, { width: 70 }]} numberOfLines={1}>{item.accountno || '-'}</Text>
//       <Text style={[styles.cell, { width: 170 }]} numberOfLines={1}>{item.component || '-'}</Text>
//       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.cc3 || '-'}</Text>
//       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.cc2 || '-'}</Text>
//       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.auxcode || '-'}</Text>
//       <Text style={[styles.cell, { width: 70 }]}>{item.year}-{String(item.month).padStart(2,'0')}</Text>
//       <Text style={[styles.cell, { width: 60 }]} numberOfLines={1}>{item.accountType || '-'}</Text>
//       <Text style={[styles.cell, { width: 95, textAlign:'right' }]} numberOfLines={1}>
//         {(Number(item.balanceFirst)||0).toLocaleString()}
//       </Text>
//       <Text style={[styles.cell, { width: 95, textAlign:'right' }]} numberOfLines={1}>
//         {(Number(item.budgetedAmount)||0).toLocaleString()}
//       </Text>
//     </View>
//   );

//   return (
//     <SafeAreaView style={styles.screen}>
//       <Text style={styles.title}>Trial Balance - {companyFilter} - {yearFilter}</Text>

//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator size="large" />
//           <Text style={{ marginTop: 10, color: '#666' }}>Loading…</Text>
//         </View>
//       ) : error ? (
//         <View style={styles.center}>
//           <Text style={{ color: 'red', fontWeight: '700', textAlign: 'center' }}>{error}</Text>
//         </View>
//       ) : (
//         <>
//           <View style={styles.headerRow}>
//             <Text style={[styles.headerCell, { width: 120 }]}>Company</Text>
//             <Text style={[styles.headerCell, { width: 70 }]}>Acc</Text>
//             <Text style={[styles.headerCell, { width: 170 }]}>Component</Text>
//             <Text style={[styles.headerCell, { width: 100 }]}>CC3</Text>
//             <Text style={[styles.headerCell, { width: 100 }]}>CC2</Text>
//             <Text style={[styles.headerCell, { width: 100 }]}>Aux</Text>
//             <Text style={[styles.headerCell, { width: 70 }]}>Y-M</Text>
//             <Text style={[styles.headerCell, { width: 60 }]}>Type</Text>
//             <Text style={[styles.headerCell, { width: 95, textAlign: 'right' }]}>Balance</Text>
//             <Text style={[styles.headerCell, { width: 95, textAlign: 'right' }]}>Budgeted Amount</Text>
//           </View>

//           <FlatList
//             data={data}
//             keyExtractor={(item, index) =>
//               `${item.company}-${item.accountno}-${item.year}-${item.month}-${index}`
//             }
//             renderItem={renderRow}
//             ListEmptyComponent={
//               <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
//                 No data found for {companyFilter} - {yearFilter}
//               </Text>
//             }
//             ListFooterComponent={
//               <>
//                 <View style={[styles.row, { backgroundColor: '#F3F4F6' }]}>
//                   <Text style={[styles.cell, { width: 120, fontWeight:'800' }]}>TOTAL</Text>
//                   <Text style={[styles.cell, { width: 70 }]} />
//                   <Text style={[styles.cell, { width: 170 }]} />
//                   <Text style={[styles.cell, { width: 100 }]} />
//                   <Text style={[styles.cell, { width: 100 }]} />
//                   <Text style={[styles.cell, { width: 100 }]} />
//                   <Text style={[styles.cell, { width: 70 }]} />
//                   <Text style={[styles.cell, { width: 60 }]} />
//                   <Text style={[styles.cell, { width: 95, textAlign:'right', fontWeight:'800' }]}>{totalBalance.toLocaleString()}</Text>
//                   <Text style={[styles.cell, { width: 95, textAlign:'right', fontWeight:'800' }]}>{totalBudget.toLocaleString()}</Text>
//                 </View>

//                 <View style={{ marginTop: 10 }}>
//                   <Text style={{ fontWeight:'800' }}>Revenue Total: {totalRevenue.toLocaleString()}</Text>
//                   <Text style={{ fontWeight:'800' }}>Cost Total: {totalCost.toLocaleString()}</Text>
//                   <Text style={{ fontWeight:'800' }}>
//                     Net Profit: {(totalRevenue + totalCost).toLocaleString()}
//                   </Text>
//                 </View>
//               </>
//             }
//           />
//         </>
//       )}
//     </SafeAreaView>
//   );
// };

// export default TrialBalanceScreen;

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: '#fff', padding: 16 },
//   title: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#222' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   headerRow: {
//     flexDirection: 'row',
//     paddingVertical: 10,
//     borderRadius: 8,
//     backgroundColor: '#F3F4F6',
//     paddingHorizontal: 6,
//     marginBottom: 4,
//   },
//   headerCell: { fontSize: 12, fontWeight: '800', color: '#333', paddingHorizontal: 6 },

//   row: {
//     flexDirection: 'row',
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: '#EEE',
//     paddingHorizontal: 6,
//   },
//   cell: { fontSize: 12, color: '#444', paddingHorizontal: 6 },
// });









// // import React, { useEffect, useState } from 'react';
// // import {
// //   View,
// //   Text,
// //   StyleSheet,
// //   ActivityIndicator,
// //   FlatList,
// //   SafeAreaView,
// // } from 'react-native';

// // const API_URL = 'https://financesystemawh-rtjt.onrender.com/api/trialbalance/mongo';

// // const TrialBalanceScreen = () => {
// //   const [data, setData] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState<string>('');
// //   const [companyFilter, setCompanyFilter] = useState<string>('West Walk Real Estate'); // default company
// //   const [yearFilter, setYearFilter] = useState<number>(2025);

// //   useEffect(() => {
// //     const load = async () => {
// //       try {
// //         setLoading(true);
// //         setError('');

// //         const res = await fetch(API_URL);
// //         const json = await res.json();

// //         const rows = Array.isArray(json.data) ? json.data : [];

// //         // ✅ apply company + year filter
// //         const filtered = rows.filter(
// //           (r: any) =>
// //             String(r.company).trim() === companyFilter &&
// //             Number(r.year) === yearFilter
// //         );

// //         setData(filtered);
// //       } catch (e: any) {
// //         setError(e?.message || 'Something went wrong');
// //         setData([]);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     load();
// //   }, [companyFilter, yearFilter]);

// //   // calculate totals
// //   const totalBalance = data.reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);
// //   const totalBudget = data.reduce((sum, item) => sum + (Number(item.budgetedAmount) || 0), 0);

// //   // separate revenue and cost totals
// //   const totalRevenue = data
// //     .filter(item => item.accountType?.toLowerCase() === 'revenue')
// //     .reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);

// //   const totalCost = data
// //     .filter(item => item.accountType?.toLowerCase() === 'cost')
// //     .reduce((sum, item) => sum + (Number(item.balanceFirst) || 0), 0);

// //   const renderRow = ({ item }: any) => (
// //     <View style={styles.row}>
// //       <Text style={[styles.cell, { width: 120 }]} numberOfLines={1}>{item.company || '-'}</Text>
// //       <Text style={[styles.cell, { width: 70 }]} numberOfLines={1}>{item.accountno || '-'}</Text>
// //       <Text style={[styles.cell, { width: 170 }]} numberOfLines={1}>{item.component || '-'}</Text>
// //       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.cc3 || '-'}</Text>
// //       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.cc2 || '-'}</Text>
// //       <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{item.auxcode || '-'}</Text>
// //       <Text style={[styles.cell, { width: 70 }]}>{item.year}-{String(item.month).padStart(2,'0')}</Text>
// //       <Text style={[styles.cell, { width: 60 }]} numberOfLines={1}>{item.accountType || '-'}</Text>
// //       <Text style={[styles.cell, { width: 95, textAlign:'right' }]} numberOfLines={1}>
// //         {(Number(item.balanceFirst)||0).toLocaleString()}
// //       </Text>
// //       <Text style={[styles.cell, { width: 95, textAlign:'right' }]} numberOfLines={1}>
// //         {(Number(item.budgetedAmount)||0).toLocaleString()}
// //       </Text>
// //     </View>
// //   );

// //   return (
// //     <SafeAreaView style={styles.screen}>
// //       <Text style={styles.title}>Trial Balance - {companyFilter} - {yearFilter}</Text>

// //       {loading ? (
// //         <View style={styles.center}>
// //           <ActivityIndicator size="large" />
// //           <Text style={{ marginTop: 10, color: '#666' }}>Loading…</Text>
// //         </View>
// //       ) : error ? (
// //         <View style={styles.center}>
// //           <Text style={{ color: 'red', fontWeight: '700' }}>{error}</Text>
// //         </View>
// //       ) : (
// //         <>
// //           <View style={styles.headerRow}>
// //             <Text style={[styles.headerCell, { width: 120 }]}>Company</Text>
// //             <Text style={[styles.headerCell, { width: 70 }]}>Acc</Text>
// //             <Text style={[styles.headerCell, { width: 170  }]}>Component</Text>
// //             <Text style={[styles.headerCell, { width: 100  }]}>CC3</Text>
// //             <Text style={[styles.headerCell, { width: 100  }]}>CC2</Text>
// //             <Text style={[styles.headerCell, { width: 100  }]}>Aux</Text>
// //             <Text style={[styles.headerCell, { width: 70 }]}>Y-M</Text>
// //             <Text style={[styles.headerCell, { width: 60 }]}>Type</Text>
// //             <Text style={[styles.headerCell, { width: 95, textAlign: 'right' }]}>Balance</Text>
// //             <Text style={[styles.headerCell, { width: 95, textAlign: 'right' }]}>Budgeted Amount</Text>
// //           </View>

// //           <FlatList
// //             data={data}
// //             keyExtractor={(item, index) =>
// //               `${item.company}-${item.accountno}-${item.year}-${item.month}-${index}`
// //             }
// //             renderItem={renderRow}
// //             ListEmptyComponent={
// //               <Text style={{ textAlign: 'center', marginTop: 20, color: '#777' }}>
// //                 No data found for {companyFilter} - {yearFilter}
// //               </Text>
// //             }
// //             ListFooterComponent={
// //               <>
// //                 {/* TOTAL row */}
// //                 <View style={[styles.row, { backgroundColor: '#F3F4F6' }]}>
// //                   <Text style={[styles.cell, { width: 120, fontWeight:'800' }]}>TOTAL</Text>
// //                   <Text style={[styles.cell, { width: 70 }]} />
// //                   <Text style={[styles.cell, { width: 170 }]} />
// //                   <Text style={[styles.cell, { width: 100 }]} />
// //                   <Text style={[styles.cell, { width: 100 }]} />
// //                   <Text style={[styles.cell, { width: 100 }]} />
// //                   <Text style={[styles.cell, { width: 70 }]} />
// //                   <Text style={[styles.cell, { width: 60 }]} />
// //                   <Text style={[styles.cell, { width: 95, textAlign:'right', fontWeight:'800' }]}>{totalBalance.toLocaleString()}</Text>
// //                   <Text style={[styles.cell, { width: 95, textAlign:'right', fontWeight:'800' }]}>{totalBudget.toLocaleString()}</Text>
// //                 </View>

// //                 {/* Revenue & Cost summary */}
// //                 <View style={{ marginTop: 10 }}>
// //                   <Text style={{ fontWeight:'800' }}>Revenue Total: {totalRevenue.toLocaleString()}</Text>
// //                   <Text style={{ fontWeight:'800' }}>Cost Total: {totalCost.toLocaleString()}</Text>
// //                 </View>
// //               </>
// //             }
// //           />
// //         </>
// //       )}
// //     </SafeAreaView>
// //   );
// // };

// // export default TrialBalanceScreen;

// // const styles = StyleSheet.create({
// //   screen: { flex: 1, backgroundColor: '#fff', padding: 16 },
// //   title: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#222' },
// //   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

// //   headerRow: {
// //     flexDirection: 'row',
// //     paddingVertical: 10,
// //     borderRadius: 8,
// //     backgroundColor: '#F3F4F6',
// //     paddingHorizontal: 6,
// //     marginBottom: 4,
// //   },
// //   headerCell: { fontSize: 12, fontWeight: '800', color: '#333', paddingHorizontal: 6 },

// //   row: {
// //     flexDirection: 'row',
// //     paddingVertical: 10,
// //     borderBottomWidth: 1,
// //     borderColor: '#EEE',
// //     paddingHorizontal: 6,
// //   },
// //   cell: { fontSize: 12, color: '#444', paddingHorizontal: 6 },
// // });
