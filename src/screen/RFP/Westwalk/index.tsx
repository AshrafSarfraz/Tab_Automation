// TrialBalance.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";
import { accountMapping } from "../../../redux/accountMaping/accountMapping"; 
import { fetchTrialBalanceApi, getAuthToken } from "../../../Api's"; 
import { insertMultipleTrialBalances } from "../../../database/trailBalanceQueries";


const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface TableRow {
  company: string;
  type: string;
  component: string;
  month:number;
  year: number;
  accountno: string;
  accountnoname:string;
  auxcode:string;
  cc2:string;
  cc2code:string;
  cc3:string;
  cc3code: string | null;
  balances: number[];
}

export default function TrialBalance() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("No token found");

        const apiData = await fetchTrialBalanceApi(token);
        setData(apiData);
      } catch (err) {
        setError("Failed to load trial balance");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const groupedData = useMemo(() => {
    const map = new Map<string, TableRow>();

    data.forEach((item) => {
      const mapping = accountMapping[item.accountno];
      const company = mapping?.company || "";
      const component = mapping?.component || "";
      const type = mapping?.type || "";

      const key = `${item.year}_${item.cc3code || ""}_${item.accountno}`;
      if (!map.has(key)) {
        map.set(key, {
          company,
          type,
          component,
          month: item.month || 0,
          year: item.year,
          accountno: item.accountno,
          accountnoname: item.accountnoname || "",
          auxcode: item.auxcode || "",
          cc2: item.cc2 || "",
          cc2code: item.cc2code || "",
          cc3: item.cc3 || "",
          cc3code: item.cc3code || "",
          balances: Array(12).fill(0),
        });
      }

      const row = map.get(key)!;
      if (item.month >= 1 && item.month <= 12) {
        row.balances[item.month - 1] += item.balanceFirst || 0;
      }
    });

    const allRows = Array.from(map.values()).sort(
      (a, b) =>
        a.year - b.year ||
        a.company.localeCompare(b.company) ||
        a.component.localeCompare(b.component)
    );

    const result: { [year: number]: TableRow[] } = {};
    allRows.forEach((row) => {
      if (!result[row.year]) result[row.year] = [];
      result[row.year].push(row);
    });

    return result;
  }, [data]);

  // 🔹 Save groupedData to SQLite
  useEffect(() => {
    if (Object.keys(groupedData).length === 0) return;

    const saveToSQLite = async () => {
      try {
        const allRows: TableRow[] = Object.values(groupedData).flat();
        await insertMultipleTrialBalances(allRows);
        console.log("✅ All grouped data inserted into SQLite");
      } catch (err) {
        console.log("❌ Failed to insert into SQLite:", err);
      }
    };

    saveToSQLite();
  }, [groupedData]);

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, { width: 100 }]}>Income Statement</Text>
      <Text style={[styles.cell, { width: 200 }]}>Company Name</Text>
      <Text style={[styles.cell, { width: 200 }]}>Account Code</Text>
      <Text style={[styles.cell, { width: 150 }]}>Component</Text>
      <Text style={[styles.cell, { width: 150 }]}>Zone (CC3)</Text>
      {months.map((m) => (
        <Text key={m} style={[styles.cell, { width: 120, textAlign: "right" }]}>{m}</Text>
      ))}
      <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>Total</Text>
    </View>
  );

  const renderRow = (item: TableRow) => {
    const total = item.balances.reduce((sum, b) => sum + b, 0);
    return (
      <View style={styles.row} key={item.accountno + item.cc3code}>
        <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
        <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
        <Text style={[styles.cell, { width: 200 }]}>{item.accountno}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.cc3code}</Text>
        {item.balances.map((b, idx) => (
          <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right" }]}>
            {b.toFixed(2)}
          </Text>
        ))}
        <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>
          {total.toFixed(2)}
        </Text>
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
      <CustomHeader title="Company Details" />
      <ScrollView>
        <ScrollView horizontal>
          <View>
            {Object.keys(groupedData).map((year) => (
              <View key={year}>
                <View style={[styles.row, { backgroundColor: "#eee", borderBottomWidth: 2 }]}>
                  <Text style={[styles.cell, { fontWeight: "bold", fontSize: 16 }]}>{year}</Text>
                </View>
                {renderHeader()}
                {groupedData[parseInt(year)].map((row) => renderRow(row))}
              </View>
            ))}
          </View>
        </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
});
















// // TrialBalance.tsx
// import React, { useEffect, useState, useMemo } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
// } from "react-native";
// import { Colors } from "../../../themes/color";
// import CustomHeader from "../../../component/customHeader";
// import { accountMapping } from "../../../redux/accountMaping/accountMapping"; 
// import { fetchTrialBalanceApi, getAuthToken } from "../../../Api's"; 

// const { width } = Dimensions.get("window");
// const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// interface TableRow {
//   company: string;
//   type: string;
//   component: string;
//   month:number;
//   year: number;
//   accountno: string;
//   accountnoname:string;
//   auxcode:string;
//   cc2:string;
//   cc2code:string;
//   cc3:string;
//   cc3code: string | null;
//   balances: number[];
// }

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
//         setData(apiData);
//       } catch (err) {
//         setError("Failed to load trial balance");
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, []);

//   const groupedData = useMemo(() => {
//     const map = new Map<string, TableRow>();

//     data.forEach((item) => {
//       const mapping = accountMapping[item.accountno];
//       const company = mapping?.company || "";
//       const component = mapping?.component || "";
//       const type = mapping?.type || "";

//       const key = `${item.year}_${item.cc3code || ""}_${item.accountno}`;
//       if (!map.has(key)) {
//         map.set(key, {
//           company,
//           type,
//           component,
//           month: item.month || 0,
//           year: item.year,
//           accountno: item.accountno,
//           accountnoname: item.accountnoname || "",
//           auxcode: item.auxcode || "",
//           cc2: item.cc2 || "",
//           cc2code: item.cc2code || "",
//           cc3: item.cc3 || "",
//           cc3code: item.cc3code || "",
//           balances: Array(12).fill(0),
//         });
//       }

//       const row = map.get(key)!;
//       if (item.month >= 1 && item.month <= 12) {
//         row.balances[item.month - 1] += item.balanceFirst || 0;
//       }
//     });

//     const allRows = Array.from(map.values()).sort(
//       (a, b) =>
//         a.year - b.year ||
//         a.company.localeCompare(b.company) ||
//         a.component.localeCompare(b.component)
//     );

//     const result: { [year: number]: TableRow[] } = {};
//     allRows.forEach((row) => {
//       if (!result[row.year]) result[row.year] = [];
//       result[row.year].push(row);
//     });

//     return result;
//   }, [data]);

//   const renderHeader = () => (
//     <View style={[styles.row, styles.header]}>
//       <Text style={[styles.cell, { width: 100 }]}>Income Statement</Text>
//       <Text style={[styles.cell, { width: 200 }]}>Company Name</Text>
//       <Text style={[styles.cell, { width: 200 }]}>Account Code</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Component</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Zone (CC3)</Text>
//       {months.map((m) => (
//         <Text key={m} style={[styles.cell, { width: 120, textAlign: "right" }]}>{m}</Text>
//       ))}
//       <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>Total</Text>
//     </View>
//   );

//   const renderRow = (item: TableRow) => {
//     const total = item.balances.reduce((sum, b) => sum + b, 0);
//     return (
//       <View style={styles.row} key={item.accountno + item.cc3code}>
//         <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
//         <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
//         <Text style={[styles.cell, { width: 200 }]}>{item.accountno}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{item.cc3code}</Text>
//         {item.balances.map((b, idx) => (
//           <Text key={idx} style={[styles.cell, { width: 120, textAlign: "right" }]}>
//             {b.toFixed(2)}
//           </Text>
//         ))}
//         <Text style={[styles.cell, { width: 100, textAlign: "right" }]}>
//           {total.toFixed(2)}
//         </Text>
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
//       <CustomHeader title="Company Details" />
//       <ScrollView>
//         <ScrollView horizontal>
//           <View>
//             {Object.keys(groupedData).map((year) => (
//               <View key={year}>
//                 <View style={[styles.row, { backgroundColor: "#eee", borderBottomWidth: 2 }]}>
//                   <Text style={[styles.cell, { fontWeight: "bold", fontSize: 16 }]}>{year}</Text>
//                 </View>
//                 {renderHeader()}
//                 {groupedData[parseInt(year)].map((row) => renderRow(row))}
//               </View>
//             ))}
//           </View>
//         </ScrollView>
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



