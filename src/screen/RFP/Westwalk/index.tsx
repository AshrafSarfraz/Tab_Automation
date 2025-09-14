// src/screens/TrialBalance.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Dimensions } from "react-native";
import { Colors } from "../../../themes/color";

const { width } = Dimensions.get("window");

export default function TrialBalance() {
  const [loading, setLoading] = useState(true);
  const [trialBalanceList, setTrialBalanceList] = useState([]);

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://185.247.89.149:9507/api/externaltrialbalance/gettrialbalance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authentication: "6ee1c1f7-66a7-443f-a0db-379e6bd64a0d", // 👈 yaha apna token daalna
          },
          body: JSON.stringify({
            filter: " ",
            take: 0,
            skip: 0,
            sort: " ",
            parameters: {
              cmpseq: 0,
              accountno: "",
              year: 0,
              month: 0,
              cc3: "",
              cc2: "",
              typeR: "P",
            },
          }),
        }
      );

      const data = await res.json();
      console.log("Trial Balance Response:", data);

      if (Array.isArray(data)) {
        setTrialBalanceList(data);
      } else {
        setTrialBalanceList([]);
      }
    } catch (err) {
      console.error("API Error:", err);
      setTrialBalanceList([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>
        {item.accountno} - {item.cmpname}
      </Text>
      <Text style={styles.title}>
        {item.typeR} - {item.accountno}
      </Text>
      <Text style={styles.value}>
        Month: {item.month} / {item.year}
      </Text>
      <Text style={styles.value}>Balance 1st: {item.balanceFirst}</Text>
      <Text style={styles.value}>Balance 2nd: {item.balanceSecond}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trialBalanceList}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No Data Found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width > 600 ? 24 : 16,
    backgroundColor: Colors.Bg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  item: {
    backgroundColor: Colors.White,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  title: {
    fontSize: width > 600 ? 22 : 16,
    fontWeight: "700",
    color: Colors.PrimaryColor,
  },
  value: {
    fontSize: width > 600 ? 18 : 14,
    color: Colors.Black,
    marginTop: 4,
  },
});
