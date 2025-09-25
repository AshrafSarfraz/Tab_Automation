
// TrialBalance.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
} from "react-native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";
import { getAllTrialBalances, TrialBalanceRow } from "../../../database/trailBalanceQueries";

const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type RowItem = TrialBalanceRow & {
  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: "Revenue" | "Cost" | "Grand";
};

export default function TrialBalance() {
  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allRows = await getAllTrialBalances();

        // Group by company
        const companyGroups: Record<string, TrialBalanceRow[]> = {};
        allRows.forEach(row => {
          if (!companyGroups[row.company]) companyGroups[row.company] = [];
          companyGroups[row.company].push(row);
        });

        const finalRows: RowItem[] = [];

        Object.keys(companyGroups).sort().forEach(company => {
          const rows = companyGroups[company];

          // Group by year descending
          const yearGroups: Record<number, TrialBalanceRow[]> = {};
          rows.forEach(row => {
            if (!yearGroups[row.year]) yearGroups[row.year] = [];
            yearGroups[row.year].push(row);
          });

          Object.keys(yearGroups)
            .map(y => parseInt(y))
            .sort((a, b) => b - a)
            .forEach(year => {
              let yearRows = yearGroups[year];

              // MERGE rows with same accountno + cc3code
              const mergedRows: Record<string, TrialBalanceRow> = {};
              yearRows.forEach(r => {
                const key = r.accountno + "_" + r.cc3code;
                if (!mergedRows[key]) {
                  mergedRows[key] = { ...r };
                } else {
                  mergedRows[key].balanceFirst = (mergedRows[key].balanceFirst || 0) + (r.balanceFirst || 0);
                }
              });
              yearRows = Object.values(mergedRows);

              // Push year header
              finalRows.push({ yearHeader: true, company, year } as RowItem);

              // Split Revenue & Cost
              const revenueRows = yearRows.filter(r => r.type === "Revenue");
              const costRows = yearRows.filter(r => r.type === "Cost");

              const computeTotals = (rows: TrialBalanceRow[]) => {
                const balances = Array(12).fill(0);
                rows.forEach(r => {
                  if (r.month >= 1 && r.month <= 12) balances[r.month - 1] += r.balanceFirst || 0;
                });
                const totalSum = balances.reduce((s, b) => s + b, 0);
                return { balances, totalSum };
              };

              // Add Revenue rows + total
              finalRows.push(...revenueRows);
              if (revenueRows.length) {
                const { balances, totalSum } = computeTotals(revenueRows);
                finalRows.push({
                  isTotalRow: true,
                  totalType: "Revenue",
                  company,
                  year,
                  totalBalances: balances,
                  totalSum,
                } as any);
              }

              // Add Cost rows + total
              finalRows.push(...costRows);
              if (costRows.length) {
                const { balances, totalSum } = computeTotals(costRows);
                finalRows.push({
                  isTotalRow: true,
                  totalType: "Cost",
                  company,
                  year,
                  totalBalances: balances,
                  totalSum,
                } as any);
              }

              // Grand total (Revenue - Cost)
              if (revenueRows.length || costRows.length) {
                const rev = computeTotals(revenueRows);
                const cost = computeTotals(costRows);
                const grandBalances = rev.balances.map((b, i) => b - cost.balances[i]);
                const grandTotal = rev.totalSum - cost.totalSum;
                finalRows.push({
                  isTotalRow: true,
                  totalType: "Grand",
                  company,
                  year,
                  totalBalances: grandBalances,
                  totalSum: grandTotal,
                } as any);
              }
            });
        });

        setData(finalRows);
      } catch (err) {
        setError("Failed to load trial balance from SQLite");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, { width: 100 }]}>Type</Text>
      <Text style={[styles.cell, { width: 200 }]}>Company</Text>
      <Text style={[styles.cell, { width: 200 }]}>Account</Text>
      <Text style={[styles.cell, { width: 150 }]}>Component</Text>
      <Text style={[styles.cell, { width: 150 }]}>CC3</Text>
      {months.map((m) => (
        <Text key={m} style={[styles.cell, { width: 120, textAlign: "right" }]}>{m}</Text>
      ))}
      <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>Total</Text>
    </View>
  );

  const renderRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.row, styles.yearHeader]}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>
            {item.company} - {item.year}
          </Text>
        </View>
      );
    }

    if (item.isTotalRow) {
      let bgColor = "#f0f8ff";
      if (item.totalType === "Revenue") bgColor = "#d1f7d1"; // green
      if (item.totalType === "Cost") bgColor = "#f7d1d1"; // red
      if (item.totalType === "Grand") bgColor = "#ffe4b5"; // orange
      const label = item.totalType === "Grand" ? "Net Total" : item.totalType + " Total";

      return (
        <View style={[styles.row, { backgroundColor: bgColor, borderTopWidth: 2, borderColor: "#aaa" }]}>
          <Text style={[styles.cell, { width: 100, fontWeight: "bold" }]}>{label}</Text>
          <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
          <Text style={[styles.cell, { width: 200 }]}></Text>
          <Text style={[styles.cell, { width: 150 }]}></Text>
          <Text style={[styles.cell, { width: 150 }]}></Text>
          {item.totalBalances.map((b: number, idx: number) => (
            <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right", fontWeight: "bold" }]}>{b.toFixed(2)}</Text>
          ))}
          <Text style={[styles.cell, { width: 100, textAlign: "right", fontWeight: "bold" }]}>{item.totalSum.toFixed(2)}</Text>
        </View>
      );
    }

    // normal row
    const balances = Array(12).fill(0);
    if (item.month >= 1 && item.month <= 12) balances[item.month - 1] = item.balanceFirst || 0;
    const total = balances.reduce((s, b) => s + b, 0);

    return (
      <View style={styles.row}>
        <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
        <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
        <Text style={[styles.cell, { width: 200 }]}>{item.accountno}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.cc3code}</Text>
        {balances.map((b, idx) => (
          <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right" }]}>{b.toFixed(2)}</Text>
        ))}
        <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>{total.toFixed(2)}</Text>
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );

  return (
    <View style={styles.Container}>
      <CustomHeader title="Trial Balance Sheet" />
      <ScrollView horizontal>
        <FlatList
          data={data}
          keyExtractor={(_, index) => index.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={renderRow}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: Colors.White,
    paddingHorizontal: width > 600 ? 24 : 10,
    paddingTop: width > 600 ? 20 : 35,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  header: { backgroundColor: Colors.Bg, borderBottomWidth: 2 },
  cell: { paddingHorizontal: 8, fontSize: width > 600 ? 16 : 12 },
  yearHeader: {
    backgroundColor: "#eee",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
});



// // TrialBalance.tsx
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   ScrollView,
// } from "react-native";
// import { Colors } from "../../../themes/color";
// import CustomHeader from "../../../component/customHeader";
// import { getAllTrialBalances, TrialBalanceRow } from "../../../database/trailBalanceQueries";

// const { width } = Dimensions.get("window");
// const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// type RowItem = TrialBalanceRow & { isTotalRow?: boolean; yearHeader?: boolean; totalType?: "Revenue" | "Cost" | "Grand" };

// export default function TrialBalance() {
//   const [data, setData] = useState<RowItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

// const loadData = async () => {
//   try {
//     const allRows = await getAllTrialBalances();

//     // Group by company
//     const companyGroups: Record<string, TrialBalanceRow[]> = {};
//     allRows.forEach(row => {
//       if (!companyGroups[row.company]) companyGroups[row.company] = [];
//       companyGroups[row.company].push(row);
//     });

//     const finalRows: RowItem[] = [];

//     Object.keys(companyGroups).sort().forEach(company => {
//       const rows = companyGroups[company];

//       // Group by year descending
//       const yearGroups: Record<number, TrialBalanceRow[]> = {};
//       rows.forEach(row => {
//         if (!yearGroups[row.year]) yearGroups[row.year] = [];
//         yearGroups[row.year].push(row);
//       });

//       Object.keys(yearGroups)
//         .map(y => parseInt(y))
//         .sort((a, b) => b - a)
//         .forEach(year => {
//           let yearRows = yearGroups[year];

//           // MERGE SAME accountno + cc3code
//           const mergedRows: Record<string, TrialBalanceRow> = {};
//           yearRows.forEach(r => {
//             const key = r.accountno + "_" + r.cc3code;
//             if (!mergedRows[key]) {
//               mergedRows[key] = { ...r };
//             } else {
//               // sum balances
//               mergedRows[key].balanceFirst = (mergedRows[key].balanceFirst || 0) + (r.balanceFirst || 0);
//             }
//           });
//           yearRows = Object.values(mergedRows);

//           // Push year header
//           finalRows.push({ yearHeader: true, company, year } as RowItem);

//           // Split Revenue & Cost
//           const revenueRows = yearRows.filter(r => r.type === "Revenue");
//           const costRows = yearRows.filter(r => r.type === "Cost");

//           const computeTotals = (rows: TrialBalanceRow[]) => {
//             const balances = Array(12).fill(0);
//             rows.forEach(r => {
//               if (r.month >= 1 && r.month <= 12) balances[r.month - 1] += r.balanceFirst || 0;
//             });
//             const totalSum = balances.reduce((s, b) => s + b, 0);
//             return { balances, totalSum };
//           };

//           // Add Revenue rows + total
//           finalRows.push(...revenueRows);
//           if (revenueRows.length) {
//             const { balances, totalSum } = computeTotals(revenueRows);
//             finalRows.push({
//               isTotalRow: true,
//               totalType: "Revenue",
//               company,
//               year,
//               totalBalances: balances,
//               totalSum,
//             } as any);
//           }

//           // Add Cost rows + total
//           finalRows.push(...costRows);
//           if (costRows.length) {
//             const { balances, totalSum } = computeTotals(costRows);
//             finalRows.push({
//               isTotalRow: true,
//               totalType: "Cost",
//               company,
//               year,
//               totalBalances: balances,
//               totalSum,
//             } as any);
//           }

//           // Grand total (Revenue - Cost)
//           if (revenueRows.length || costRows.length) {
//             const rev = computeTotals(revenueRows);
//             const cost = computeTotals(costRows);
//             const grandBalances = rev.balances.map((b, i) => b - cost.balances[i]);
//             const grandTotal = rev.totalSum - cost.totalSum;
//             finalRows.push({
//               isTotalRow: true,
//               totalType: "Grand",
//               company,
//               year,
//               totalBalances: grandBalances,
//               totalSum: grandTotal,
//             } as any);
//           }
//         });
//     });

//     setData(finalRows);
//   } catch (err) {
//     setError("Failed to load trial balance from SQLite");
//     console.log(err);
//   } finally {
//     setLoading(false);
//   }
// };

//   const renderHeader = () => (
//     <View style={[styles.row, styles.header]}>
//       <Text style={[styles.cell, { width: 100 }]}>Type</Text>
//       <Text style={[styles.cell, { width: 200 }]}>Company</Text>
//       <Text style={[styles.cell, { width: 200 }]}>Account</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Component</Text>
//       <Text style={[styles.cell, { width: 150 }]}>CC3</Text>
//       {months.map((m) => (
//         <Text key={m} style={[styles.cell, { width: 120, textAlign: "right" }]}>{m}</Text>
//       ))}
//       <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>Total</Text>
//     </View>
//   );

//   const renderRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return (
//         <View style={[styles.row, styles.yearHeader]}>
//           <Text style={{ fontWeight: "bold", fontSize: 16 }}>
//             {item.company} - {item.year}
//           </Text>
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       let bgColor = "#f0f8ff";
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1"; // greenish
//       if (item.totalType === "Cost") bgColor = "#f7d1d1"; // reddish
//       if (item.totalType === "Grand") bgColor = "#ffe4b5"; // orange

//       const label = item.totalType === "Grand" ? "Net Total" : item.totalType + " Total";

//       return (
//         <View style={[styles.row, { backgroundColor: bgColor, borderTopWidth: 2, borderColor: "#aaa" }]}>
//           <Text style={[styles.cell, { width: 100, fontWeight: "bold" }]}>{label}</Text>
//           <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
//           <Text style={[styles.cell, { width: 200 }]}></Text>
//           <Text style={[styles.cell, { width: 150 }]}></Text>
//           <Text style={[styles.cell, { width: 150 }]}></Text>
//           {item.totalBalances.map((b: number, idx: number) => (
//             <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right", fontWeight: "bold" }]}>{b.toFixed(2)}</Text>
//           ))}
//           <Text style={[styles.cell, { width: 100, textAlign: "right", fontWeight: "bold" }]}>{item.totalSum.toFixed(2)}</Text>
//         </View>
//       );
//     }

//     // normal row
//     const balances = Array(12).fill(0);
//     if (item.month >= 1 && item.month <= 12) balances[item.month - 1] = item.balanceFirst || 0;
//     const total = balances.reduce((s, b) => s + b, 0);

//     return (
//       <View style={styles.row}>
//         <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
//         <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
//         <Text style={[styles.cell, { width: 200 }]}>{item.accountno}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{item.cc3code}</Text>
//         {balances.map((b, idx) => (
//           <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right" }]}>{b.toFixed(2)}</Text>
//         ))}
//         <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>{total.toFixed(2)}</Text>
//       </View>
//     );
//   };

//   if (loading)
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={Colors.PrimaryColor} />
//       </View>
//     );

//   if (error)
//     return (
//       <View style={styles.centered}>
//         <Text>{error}</Text>
//       </View>
//     );

//   return (
//     <View style={styles.Container}>
//       <CustomHeader title="Trial Balance Sheet" />
//       <ScrollView horizontal>
//         <FlatList
//           data={data}
//           keyExtractor={(_, index) => index.toString()}
//           ListHeaderComponent={renderHeader}
//           renderItem={renderRow}
//           initialNumToRender={20}
//           maxToRenderPerBatch={20}
//           windowSize={10}
//         />
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   Container: {
//     flex: 1,
//     backgroundColor: Colors.White,
//     paddingHorizontal: width > 600 ? 24 : 10,
//     paddingTop: width > 600 ? 20 : 35,
//   },
//   row: {
//     flexDirection: "row",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//   },
//   header: { backgroundColor: Colors.Bg, borderBottomWidth: 2 },
//   cell: { paddingHorizontal: 8, fontSize: width > 600 ? 16 : 12 },
//   yearHeader: {
//     backgroundColor: "#eee",
//     borderBottomWidth: 1,
//     borderColor: "#ccc",
//     paddingVertical: 4,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingTop: 40,
//   },
// });
