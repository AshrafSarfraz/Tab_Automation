import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

const API_BASE = "https://financesystemawh-rtjt.onrender.com/api"; // 👈 Apna URL lagao

export default function DailReportScreen({ navigation }: any) {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Fetch PDFs ─────────────────────────────────────────────────────────────
  const fetchPdfs = async () => {
    try {
      const res = await fetch(`${API_BASE}/dailyReport/all`);
      const json = await res.json();
      if (json.success) {
        setPdfs(json.data);
      } else {
        Alert.alert("Error", json.message || "Failed to fetch PDFs");
      }
    } catch (err) {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Screen pe focus aate hi refresh
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPdfs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPdfs();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // ─── Render Each PDF Card ───────────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ViewerDailyReport", {
          pdfUrl: item.fileUrl,
          fileName: item.fileName,
        })
      }
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Text style={styles.cardIcon}>📄</Text>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardFileName} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <Text style={styles.cardMeta}>
          {formatDate(item.uploadedAt)}
          {item.size ? `  •  ${formatSize(item.size)}` : ""}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container
        statusBarColor={Colors.PrimaryColor}
        statusBarStyle="light-content"
      >
        <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
        <View style={styles.headerWrap}>
          <CustomHeader title="Daily Reports" />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.PrimaryColor} />
          <Text style={styles.loadingText}>Loading PDFs...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container
      statusBarColor={Colors.PrimaryColor}
      statusBarStyle="light-content"
    >
      <StatusBar
        hidden={false}
        backgroundColor={Colors.PrimaryColor}
        barStyle="light-content"
      />

      {/* Header */}
      <View style={styles.headerWrap}>
        <CustomHeader title="Daily Reports" />
      </View>

      {/* Upload Button */}
      <View style={styles.uploadBar}>
        <Text style={styles.uploadBarText}>
          {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""} available
        </Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => navigation.navigate("AddDailyReport")}
          activeOpacity={0.85}
        >
          <Text style={styles.uploadBtnText}>+ Upload New</Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {pdfs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={styles.emptyTitle}>No PDFs uploaded yet</Text>
          <Text style={styles.emptySubtitle}>
          Please add a PDF before clicking the upload button.
          </Text>
          <TouchableOpacity
            style={styles.emptyUploadBtn}
            onPress={() => navigation.navigate("AddDailyReport")}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyUploadText}>Upload PDF</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pdfs}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.PrimaryColor]}
            />
          }
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },

  // Upload Bar
  uploadBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eee",
  },
  uploadBarText: {
    fontSize: 12,
    color: "#666",
  },
  uploadBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // List
  list: {
    padding: 16,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardFileName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 3,
  },
  cardCategory: {
    fontSize: 11,
    color: Colors.PrimaryColor,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 11,
    color: "#999",
  },
  arrow: {
    fontSize: 24,
    color: "#ccc",
    marginLeft: 8,
  },

  // Empty
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  emptySubtitle: { fontSize: 12, color: "#888" },
  emptyUploadBtn: {
    marginTop: 8,
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyUploadText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
