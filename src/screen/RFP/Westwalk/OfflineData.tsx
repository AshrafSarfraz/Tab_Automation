// src/screens/TrialBalanceList.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";
import { getAllTrialBalances } from "../../../database/trailBalanceQueries";


const { width } = Dimensions.get("window");

interface TableRow {
  id: number;
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

export default function TrialBalanceList() {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allRows = await getAllTrialBalances();
        setData(allRows);
      } catch (err) {
        console.log("❌ Failed to load from SQLite:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const renderItem = ({ item }: { item: TableRow }) => {
    const total = item.balances.reduce((sum, b) => sum + b, 0);
    return (
      <ScrollView  horizontal>
      <View style={styles.row}>
        <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
        <Text style={[styles.cell, { width: 200 }]}>{item.company}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.accountno}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.component}</Text>
        <Text style={[styles.cell, { width: 150 }]}>{item.cc3code}</Text>
        <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>
          {total.toFixed(2)}
        </Text>
      </View>
       </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="All Trial Balance" />
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, { width: 100 }]}>Type</Text>
        <Text style={[styles.cell, { width: 200 }]}>Company</Text>
        <Text style={[styles.cell, { width: 150 }]}>Account No</Text>
        <Text style={[styles.cell, { width: 150 }]}>Component</Text>
        <Text style={[styles.cell, { width: 150 }]}>CC3</Text>
        <Text style={[styles.cell, { width: 120, textAlign: "right" }]}>Total</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    backgroundColor: Colors.Bg,
    borderBottomWidth: 2,
  },
  cell: {
    paddingHorizontal: 8,
    fontSize: width > 600 ? 16 : 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
