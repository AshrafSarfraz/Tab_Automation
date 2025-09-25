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
import { accountMapping } from "../../../redux/accountMaping/accountMapping"; 
import { fetchTrialBalanceApi, getAuthToken } from "../../../Api's"; 
import { insertMultipleTrialBalances } from "../../../database/trailBalanceQueries";


const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function TrialBalance() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("No token found");

        const apiData = await fetchTrialBalanceApi(token);

        const mapped = (apiData ?? []).map((item) => {
          const mapping = accountMapping[item.accountno] || {};
          
          return {
            ...item,
            company: mapping.company || "",
            type: mapping.type || "",
            component: mapping.component || "",
            balanceFirst: -1 * Number(item.balanceFirst ?? 0),
          };
        });

        setData(mapped);

        // Calculate totals
        const revenue = mapped
          .filter((i) => i.type === "Revenue")
          .reduce((sum, i) => sum + (i.balanceFirst || 0), 0);
        const cost = mapped
          .filter((i) => i.type === "Cost")
          .reduce((sum, i) => sum + (i.balanceFirst || 0), 0);
        setTotals({ revenue, cost });

        
        // Save only balanceFirst
        await insertMultipleTrialBalances(mapped);

      } catch (err) {
        console.log(err);
        setError("Failed to load trial balance");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, { width: 200 }]}>Company</Text>
      <Text style={[styles.cell, { width: 120 }]}>Type</Text>
      <Text style={[styles.cell, { width: 150 }]}>Income Statement</Text>
      <Text style={[styles.cell, { width: 140 }]}>CC2</Text>
      <Text style={[styles.cell, { width: 140 }]}>CC2 Code</Text>
      <Text style={[styles.cell, { width: 120 }]}>Account No</Text>
      <Text style={[styles.cell, { width: 240 }]}>Account Name</Text>
      <Text style={[styles.cell, { width: 140 }]}>Zone (CC3)</Text>
      <Text style={[styles.cell, { width: 140 }]}>Auxcode</Text>
      <Text style={[styles.cell, { width: 70, textAlign: "right" }]}>Month</Text>
      <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>Year</Text>
      <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>Balance</Text>
    </View>
  );

  const renderRow = ({ item, index }: { item: any; index: number }) => (
    <View
      style={styles.row}
      key={`${item.accountno}-${item.cc3code ?? ""}-${item.year}-${item.month}-${index}`}
    >
      <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
      <Text style={[styles.cell, { width: 120 }]}>{item.type}</Text>
      <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
      <Text style={[styles.cell, { width: 150 }]}>{item.cc2}</Text>
      <Text style={[styles.cell, { width: 150 }]}>{item.cc2code}</Text>
      <Text style={[styles.cell, { width: 120 }]}>{item.accountno}</Text>
      <Text style={[styles.cell, { width: 240 }]}>{item.accountnoname || ""}</Text>
      <Text style={[styles.cell, { width: 140 }]}>{item.cc3code || ""}</Text>
      <Text style={[styles.cell, { width: 140 }]}>{item.auxcode}</Text>
      <Text style={[styles.cell, { width: 70, textAlign: "right" }]}>
        {item.month ? months[(item.month ?? 1) - 1] ?? item.month : ""}
      </Text>
      <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>{item.year}</Text>
      <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>{(item.balanceFirst || 0).toFixed(2)}</Text>
    </View>
  );

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
      <CustomHeader title="Trial Balance" />
      <ScrollView horizontal>
        <FlatList
          data={data}
          keyExtractor={(item, index) =>
            `${item.accountno}-${item.cc3code ?? ""}-${item.year}-${item.month}-${index}`
          }
          ListHeaderComponent={renderHeader}
          renderItem={renderRow}
          initialNumToRender={50}
          maxToRenderPerBatch={50}
          windowSize={21}
        />
      </ScrollView>

      {/* Small summary report */}
      {/* <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Revenue: {totals.revenue.toFixed(2)} QAR
        </Text>
        <Text style={styles.summaryText}>
          Total Cost: {totals.cost.toFixed(2)} QAR
        </Text>
        <Text style={styles.summaryText}>
          Net Profit: {(totals.revenue + totals.cost).toFixed(2)} QAR
        </Text>
      </View> */}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  summary: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f0f4f7",
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.Black,
    marginBottom: 4,
  },
});




// export default function TrialBalance() {
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const token = await getAuthToken();
//         if (!token) throw new Error("No token found");

//         const apiData = await fetchTrialBalanceApi(token);

//         const mapped = (apiData ?? []).map((item) => {
//           const mapping = accountMapping[item.accountno] || {};
       
          
//           return {
//             ...item,
//             company: mapping.company || "",
//             type: mapping.type || "",
//             component: mapping.component || "",
//           };
//         });

//         setData(mapped);

//         // Save only balanceFirst
//         await insertMultipleTrialBalances(mapped);

//       } catch (err) {
//         console.log(err);
//         setError("Failed to load trial balance");
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, []);

//   const renderHeader = () => (
//     <View style={[styles.row, styles.header]}>
//       <Text style={[styles.cell, { width: 200 }]}>Company</Text>
//       <Text style={[styles.cell, { width: 120 }]}>Type</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Income Statement</Text>
//       <Text style={[styles.cell, { width: 140 }]}>CC2</Text>
//       <Text style={[styles.cell, { width: 140 }]}>CC2 Code</Text>
//       <Text style={[styles.cell, { width: 120 }]}>Account No</Text>
//       <Text style={[styles.cell, { width: 240 }]}>Account Name</Text>
//       <Text style={[styles.cell, { width: 140 }]}>Zone (CC3)</Text>
//       <Text style={[styles.cell, { width: 140 }]}>Auxcode</Text>
//       <Text style={[styles.cell, { width: 70, textAlign: "right" }]}>Month</Text>
//       <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>Year</Text>
//       <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>Balance</Text>
//     </View>
//   );

//   const renderRow = ({ item, index }: { item: any; index: number }) => (
//     <View
//       style={styles.row}
//       key={`${item.accountno}-${item.cc3code ?? ""}-${item.year}-${item.month}-${index}`}
//     >
//       <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
//       <Text style={[styles.cell, { width: 120 }]}>{item.type}</Text>
//       <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
//       <Text style={[styles.cell, { width: 150 }]}>{item.cc2}</Text>
//       <Text style={[styles.cell, { width: 150 }]}>{item.cc2code}</Text>
//       <Text style={[styles.cell, { width: 120 }]}>{item.accountno}</Text>
//       <Text style={[styles.cell, { width: 240 }]}>{item.accountnoname || ""}</Text>
//       <Text style={[styles.cell, { width: 140 }]}>{item.cc3code || ""}</Text>
//       <Text style={[styles.cell, { width: 140 }]}>{item.auxcode}</Text>
//       <Text style={[styles.cell, { width: 70, textAlign: "right" }]}>
//         {item.month ? months[(item.month ?? 1) - 1] ?? item.month : ""}
//       </Text>
//       <Text style={[styles.cell, { width: 80, textAlign: "right" }]}>{item.year}</Text>
//       <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>{(item.balanceFirst || 0).toFixed(2)}</Text>
//     </View>
//   );

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
//       <CustomHeader title="Trial Balance" />
//       <ScrollView horizontal>
//         <FlatList
//           data={data}
//           keyExtractor={(item, index) =>
//             `${item.accountno}-${item.cc3code ?? ""}-${item.year}-${item.month}-${index}`
//           }
//           ListHeaderComponent={renderHeader}
//           renderItem={renderRow}
//           initialNumToRender={50}
//           maxToRenderPerBatch={50}
//           windowSize={21}
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
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingTop: 40,
//   },
// });
