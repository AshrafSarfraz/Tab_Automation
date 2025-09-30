// TrialBalance.tsx (sirf logic replace kiya)
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, FlatList, ScrollView } from "react-native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";
import { SyncResult, syncTrialBalance, TrialRow } from "../../../database/Utils/MapAndStoreData";


const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function TrialBalance() {
  const [data, setData] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, net: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res: SyncResult = await syncTrialBalance(); // 👈 yahan se sab ho jayega
        setData(res.rows);
        setTotals(res.totals);
      } catch (e) {
        console.log(e);
        setError("Failed to load trial balance");
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const renderRow = ({ item, index }: { item: TrialRow; index: number }) => (
    <View style={styles.row} key={`${item.accountno}-${item.cc3code ?? ""}-${item.year}-${item.month}-${index}`}>
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
});
