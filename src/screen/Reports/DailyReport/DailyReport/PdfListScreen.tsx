import React, { useState, useCallback, useRef } from "react";
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

const API_BASE = "https://financesystemawh-rtjt.onrender.com/api";

export default function DailyReportScreen({ navigation }: any) {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);       // sirf pehli baar
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ✅ Cached data ref — compare karne ke liye
  const cachedPdfs = useRef<any[]>([]);
  const hasFetchedOnce = useRef(false);

  // ─── Fetch PDFs ─────────────────────────────────────────────────────────────
  const fetchPdfs = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch(`${API_BASE}/dailyReport/all`);
      const json = await res.json();

      if (json.success) {
        const newData = json.data;

        // ✅ Compare: agar data change hua ho tabhi setState karo
        const hasChanged =
          JSON.stringify(newData) !== JSON.stringify(cachedPdfs.current);

        if (hasChanged) {
          cachedPdfs.current = newData;
          setPdfs(newData);
        }
      } else {
        Alert.alert("Error", json.message || "Failed to fetch reports");
      }
    } catch (err) {
      // Agar pehle data tha toh error mat dikhao — silently fail
      if (!hasFetchedOnce.current) {
        Alert.alert("Error", "Could not connect to server");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasFetchedOnce.current = true;
    }
  };

  // ✅ Screen focus pe — pehli baar full loader, baad mein background fetch
  useFocusEffect(
    useCallback(() => {
      if (!hasFetchedOnce.current) {
        fetchPdfs(true); // pehli baar → loader dikhao
      } else {
        fetchPdfs(false); // baad mein → background mein check karo
      }
    }, [])
  );

  // Manual pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPdfs(false);
  };

  // ─── Delete PDF ──────────────────────────────────────────────────────────────
  const handleLongPress = (item: any) => {
    Alert.alert(
      "Delete PDF",
      `Are you sure you want to delete "${item.fileName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deletePdf(item) },
      ]
    );
  };

  const deletePdf = async (item: any) => {
    try {
      setDeletingId(item._id);

      const res = await fetch(
        `${API_BASE}/dailyReport?category=${item.category}`,
        { method: "DELETE" }
      );
      const json = await res.json();

      if (json.success) {
        const updated = cachedPdfs.current.filter((p) => p._id !== item._id);
        cachedPdfs.current = updated;
        setPdfs(updated);
        Alert.alert("Deleted ✅", "PDF has been successfully deleted.");
      } else {
        Alert.alert("Error", json.message || "Delete failed");
      }
    } catch (err) {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setDeletingId(null);
    }
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

  // ─── Render Card ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => {
    const isDeleting = deletingId === item._id;

    return (
      <TouchableOpacity
        style={[styles.card, isDeleting && styles.cardDeleting]}
        onPress={() =>
          navigation.navigate("ViewerDailyReport", {
            pdfUrl: item.fileUrl,
            fileName: item.fileName,
          })
        }
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.85}
        disabled={isDeleting}
      >
        <View style={styles.iconBox}>
          {isDeleting ? (
            <ActivityIndicator size="small" color={Colors.PrimaryColor} />
          ) : (
            <Text style={styles.cardIcon}>📄</Text>
          )}
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

        {isDeleting ? (
          <Text style={styles.deletingText}>Deleting...</Text>
        ) : (
          <Text style={styles.arrow}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ─── First Load ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
        <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
        <View style={styles.headerWrap}>
          <CustomHeader title="Daily Reports" />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.PrimaryColor} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />

      <View style={styles.headerWrap}>
        <CustomHeader title="Daily Reports" />
      </View>

      {/* Upload Bar */}
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

      {/* Hint */}
      {pdfs.length > 0 && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            💡 Press and hold a card to delete it
          </Text>
        </View>
      )}

      {/* Empty State */}
      {pdfs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🗂️</Text>
          <Text style={styles.emptyTitle}>No PDFs uploaded yet</Text>
          <Text style={styles.emptySubtitle}>
            No daily reports have been uploaded yet.
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
  uploadBarText: { fontSize: 12, color: "#666" },
  uploadBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  uploadBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hintBar: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 0.4,
    borderBottomColor: "#fde68a",
  },
  hintText: { fontSize: 11, color: "#92400e" },
  list: { padding: 16 },
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
  cardDeleting: {
    opacity: 0.5,
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
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
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardFileName: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 3 },
  cardCategory: {
    fontSize: 11,
    color: Colors.PrimaryColor,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 3,
  },
  cardMeta: { fontSize: 11, color: "#999" },
  arrow: { fontSize: 24, color: "#ccc", marginLeft: 8 },
  deletingText: { fontSize: 11, color: "#ef4444", marginLeft: 8 },
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
  emptyUploadText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
