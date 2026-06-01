import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from "react-native";
import { pick, isCancel, types } from "@react-native-documents/picker";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

const API_BASE = "https://financesystemawh-rtjt.onrender.com/api"; // 👈 Apna URL lagao

export default function UploadDailyReport({ navigation }: any) {
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // ─── Pick PDF ───────────────────────────────────────────────────────────────
  const pickPdf = async () => {
    try {
      const res = await pick({
        type: [types.pdf],
        allowMultiSelection: false,
        copyTo: "cachesDirectory", // Android ke liye zaroori
      });

      const f = res?.[0];
      if (!f) return;

      const uriForUpload =
        Platform.OS === "android" ? (f.fileCopyUri ?? f.uri) : f.uri;

      setFile({
        uri: uriForUpload,
        name: f.name ?? "upload.pdf",
        type: f.mimeType ?? "application/pdf",
        size: f.size ?? 0,
      });
    } catch (err: any) {
      if (isCancel(err)) return;
      console.error(err);
      Alert.alert("Error", err?.message ?? "File selection failed");
    }
  };

  // ─── Upload PDF ─────────────────────────────────────────────────────────────
  const uploadPdf = async () => {
    if (!file) {
      Alert.alert("Error", "Please select a PDF file first");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.type || "application/pdf",
        name: file.name || "upload.pdf",
      } as any);

      // category optional — default "general" backend pe set hai
      formData.append("category", "general");

      const response = await fetch(`${API_BASE}/dailyReport/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        Alert.alert("Success ✅", data.message ?? "PDF uploaded successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        setFile(null);
      } else {
        Alert.alert("Error", data?.message ?? "Upload failed");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.message ?? "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const canUpload = !!file && !uploading;

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

      <View style={styles.headerWrap}>
        <CustomHeader title="Upload PDF" />
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Daily PDF</Text>
          <Text style={styles.cardSubtitle}>
            Previous daily report will be deleted as we upload newone
          </Text>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              ℹ️  Only one Pdf can upload
            </Text>
          </View>

          {/* File Picker Area */}
          <Text style={styles.label}>PDF File</Text>
          <TouchableOpacity
            style={[styles.pickerArea, file && styles.pickerAreaSelected]}
            onPress={pickPdf}
            activeOpacity={0.85}
          >
            {file ? (
              <View style={styles.fileRow}>
                <Text style={styles.fileIcon}>📄</Text>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  {!!file.size && (
                    <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setFile(null)}
                  style={styles.removeBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyIcon}>📂</Text>
                <Text style={styles.pickerEmptyText}>Tap to select PDF</Text>
                <Text style={styles.pickerEmptySub}>Max size: 16MB</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Upload Button */}
          <TouchableOpacity
            onPress={uploadPdf}
            disabled={!canUpload}
            style={[styles.primaryBtn, !canUpload && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
          >
            {uploading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.primaryBtnText}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Upload PDF</Text>
            )}
          </TouchableOpacity>

          {!file && (
            <Text style={styles.helperText}>
              Tip: The upload button will be enabled as soon as you select a PDF file.
            </Text>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    borderBottomWidth: 0.4,
    borderBottomColor: "#ddd",
  },
  page: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },

  // Info Banner
  infoBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    borderLeftWidth: 3,
    borderLeftColor: Colors.PrimaryColor,
  },
  infoText: {
    fontSize: 12,
    color: "#4338CA",
    lineHeight: 18,
  },

  // Label
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },

  // Picker Area
  pickerArea: {
    borderWidth: 2,
    borderColor: "#e6e6e6",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  pickerAreaSelected: {
    borderStyle: "solid",
    borderColor: Colors.PrimaryColor,
    backgroundColor: "#f7fbff",
  },
  pickerEmpty: {
    padding: 32,
    alignItems: "center",
    gap: 6,
  },
  pickerEmptyIcon: {
    fontSize: 38,
    marginBottom: 4,
  },
  pickerEmptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.PrimaryColor,
  },
  pickerEmptySub: {
    fontSize: 11,
    color: "#999",
  },

  // File Row
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  fileIcon: {
    fontSize: 28,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  fileSize: {
    marginTop: 3,
    fontSize: 11,
    color: "#777",
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffecec",
    borderWidth: 1,
    borderColor: "#ffd1d1",
  },
  removeBtnText: {
    color: "#c53030",
    fontWeight: "700",
    fontSize: 12,
  },

  // Primary Button
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  helperText: {
    marginTop: 8,
    fontSize: 11,
    color: "#777",
    textAlign: "center",
  },
});
