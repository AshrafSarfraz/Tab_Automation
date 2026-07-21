import React, { useState } from "react";
import {
  View, Text, Alert, Platform, StyleSheet,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from "react-native";
import { pick, isCancel, types } from "@react-native-documents/picker";
import { Picker } from "@react-native-picker/picker";
import Container from "../../../ui/useLayout";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";


export default function CashFlowCsvUploadScreen() {
  const [company, setCompany] = useState<string>("");
  const [year, setYear] = useState<string | number>("");
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);



  const years = [2025, 2026];

  const pickFile = async () => {
    try {
      const res = await pick({
        type: [types.csv, types.plainText],
        allowMultiSelection: false,
        copyTo: "cachesDirectory",
      });
      const f = res?.[0];
      if (!f) return;
      const uriForUpload = Platform.OS === "android" ? (f.fileCopyUri ?? f.uri) : f.uri;
      setFile({ uri: uriForUpload, name: f.name ?? "upload.csv", type: f.mimeType ?? "text/csv" });
    } catch (err: any) {
      if (isCancel(err)) return;
      Alert.alert("Error", err?.message ?? "File selection failed");
    }
  };

  const uploadCsv = async () => {
    if (!file) {
      Alert.alert("Error", "Please select a CSV file");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", { uri: file.uri, type: file.type || "text/csv", name: file.name || "upload.csv" } as any);
      if (company) formData.append("company", company);
      if (year) formData.append("year", String(year));

      // ✅ CashFlow URL
      const response = await fetch(
        "https://financesystemawh-rtjt.onrender.com/api/cashflow/upload-csv",
        { method: "POST", body: formData }
      );

      const data = await response.json();
      if (response.ok && data?.success) {
        Alert.alert("Success", data.message ?? "Uploaded");
        setFile(null);
      } else {
        Alert.alert("Error", data?.message ?? "Upload failed");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const canUpload = !!file && !uploading;

  const PrimaryButton = ({ title, onPress, disabled, loading }: {
    title: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.primaryBtn, (disabled || loading) && styles.primaryBtnDisabled]}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{title}</Text>}
    </TouchableOpacity>
  );

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <View style={styles.headerWrap}>
        <CustomHeader title="Upload Cash Flow" />
      </View>

      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Cash Flow CSV</Text>
          <Text style={styles.cardSubtitle}>
            CSV mein yeh columns hone chahiye: Company, Component, Sub Component, Month, Year, Amount
          </Text>

        

          <Text style={[styles.label, { marginTop: 14 }]}>Year (Optional)</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={year} onValueChange={(v) => setYear(v)} style={styles.picker}>
              <Picker.Item label="Select year (optional)" value="" />
              {years.map((y) => <Picker.Item key={y} label={y.toString()} value={y} />)}
            </Picker>
          </View>

          <View style={{ marginTop: 16 }}>
            <PrimaryButton title="Pick CSV File" onPress={pickFile} />
          </View>

          {file ? (
            <View style={styles.fileCard}>
              <Text style={styles.fileTitle} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.fileMeta} numberOfLines={2}>{file.uri}</Text>
              <TouchableOpacity onPress={() => setFile(null)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fileHint}>
              <Text style={styles.fileHintText}>No file selected</Text>
            </View>
          )}

          <View style={{ marginTop: 16 }}>
            <PrimaryButton title="Upload CSV" onPress={uploadCsv} disabled={!canUpload} loading={uploading} />
            {!file && <Text style={styles.helperText}>Tip: CSV select karte hi upload enable ho jayega.</Text>}
          </View>
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  headerWrap: { borderBottomWidth: 0.4, borderBottomColor: "#ddd" },
  page: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#eee", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  cardSubtitle: { marginTop: 6, fontSize: 12, color: "#666", lineHeight: 16 },
  label: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: "600", color: "#333" },
  pickerWrap: { borderWidth: 1, borderColor: "#e6e6e6", borderRadius: 12, overflow: "hidden", backgroundColor: "#fafafa" },
  picker: { height: 52, width: "100%" },
  primaryBtn: { height: 48, borderRadius: 12, backgroundColor: Colors.PrimaryColor, alignItems: "center", justifyContent: "center" },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  fileHint: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#eee" },
  fileHintText: { fontSize: 12, color: "#777" },
  fileCard: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#f7fbff", borderWidth: 1, borderColor: "#dbeafe" },
  fileTitle: { fontSize: 13, fontWeight: "700", color: "#111" },
  fileMeta: { marginTop: 6, fontSize: 11, color: "#555" },
  removeBtn: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#ffecec", borderWidth: 1, borderColor: "#ffd1d1" },
  removeBtnText: { color: "#c53030", fontWeight: "700", fontSize: 12 },
  helperText: { marginTop: 8, fontSize: 11, color: "#777" },
});