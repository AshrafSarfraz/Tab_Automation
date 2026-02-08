import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { getOtherCmpMongoFromSQLite } from "../database/otherCmpTrailBal";


export default function Trail() {
  const [rows, setRows] = useState([]);
  const [savedAt, setSavedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const extractArray = (snap) => {
    const d = snap?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  const handleLoad = async () => {
    try {
      setLoading(true);
      setError("");

      const snap = await getOtherCmpMongoFromSQLite();
      const arr = extractArray(snap);

      setSavedAt(snap?.savedAt || null);
      setRows(arr);
    } catch (e) {
      setError(e?.message || "Failed to load from SQLite");
      setRows([]);
      setSavedAt(null);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.small]} numberOfLines={1}>
        {item?.accountno ?? "-"}
      </Text>

      <Text style={[styles.cell, styles.large]} numberOfLines={1}>
        {item?.component ?? "-"}
      </Text>

      <Text style={[styles.cell, styles.medium]} numberOfLines={1}>
        {item?.accountType ?? "-"}
      </Text>

      <Text style={[styles.cell, styles.amount]} numberOfLines={1}>
        {Number(item?.balanceFirst || 0).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.btn} onPress={handleLoad} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Load OtherCmp Data</Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.meta}>
            SavedAt:{" "}
            {savedAt ? new Date(savedAt).toLocaleString() : "Not loaded"}
          </Text>
          <Text style={styles.meta}>Rows: {rows?.length || 0}</Text>
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, styles.small]}>Acc No</Text>
        <Text style={[styles.header, styles.large]}>Component</Text>
        <Text style={[styles.header, styles.medium]}>Type</Text>
        <Text style={[styles.header, styles.amount]}>Balance</Text>
      </View>

      {/* Body */}
      <FlatList
        data={rows}
        keyExtractor={(item, idx) => String(item?._id ?? idx)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: "#666" }}>
                No data loaded yet (button press karo) ya SQLite me data empty hai.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: "center",
  },

  btn: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#fff", fontWeight: "800" },

  meta: { color: "#444", fontSize: 12, fontWeight: "600" },

  errorBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ffe7e7",
  },
  errorText: { color: "red", fontWeight: "800" },

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#1976d2",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  header: { color: "#fff", fontWeight: "bold", paddingHorizontal: 5 },

  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },

  cell: { paddingHorizontal: 5, color: "#333" },

  small: { flex: 1 },
  medium: { flex: 2 },
  large: { flex: 3 },
  amount: { flex: 2, textAlign: "right", fontWeight: "600" },
});


// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   ActivityIndicator,
//   SafeAreaView,
// } from "react-native";

// const API_URL =
//   "https://financesystemawh-rtjt.onrender.com/api/othercmp_trialbalance/mongo";

// export default function Trial() {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       const response = await fetch(API_URL);
//       const json = await response.json();
//       setData(json);
//     } catch (error) {
//       console.error("Error fetching data:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.row}>
//       <Text style={[styles.cell, styles.small]}>
//         {item.accountno}
//       </Text>

//       <Text style={[styles.cell, styles.large]}>
//         {item.component}
//       </Text>

//       <Text style={[styles.cell, styles.medium]}>
//         {item.accountType}
//       </Text>

//       <Text style={[styles.cell, styles.amount]}>
//         {Number(item.balanceFirst).toLocaleString()}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Table Header */}
//       <View style={styles.headerRow}>
//         <Text style={[styles.header, styles.small]}>
//           Acc No
//         </Text>

//         <Text style={[styles.header, styles.large]}>
//           Component
//         </Text>

//         <Text style={[styles.header, styles.medium]}>
//           Type
//         </Text>

//         <Text style={[styles.header, styles.amount]}>
//           Balance
//         </Text>
//       </View>

//       {/* Table Body */}
//       <FlatList
//         data={data}
//         keyExtractor={(item) => item._id}
//         renderItem={renderItem}
//         showsVerticalScrollIndicator={false}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#fff",
//   },

//   loader: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   /* Header */

//   headerRow: {
//     flexDirection: "row",
//     backgroundColor: "#1976d2",
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//   },

//   header: {
//     color: "#fff",
//     fontWeight: "bold",
//     paddingHorizontal: 5,
//   },

//   /* Rows */

//   row: {
//     flexDirection: "row",
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//     backgroundColor: "#fafafa",
//   },

//   cell: {
//     paddingHorizontal: 5,
//     color: "#333",
//   },

//   /* Column Sizes */

//   small: {
//     flex: 1,
//   },

//   medium: {
//     flex: 2,
//   },

//   large: {
//     flex: 3,
//   },

//   amount: {
//     flex: 2,
//     textAlign: "right",
//     fontWeight: "600",
//   },
// });
