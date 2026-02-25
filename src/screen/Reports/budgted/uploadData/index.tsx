// import React, { useState } from "react";
// import { View, Text, Button, Alert, Platform } from "react-native";
// import { pick, isCancel, types } from "@react-native-documents/picker";
// import { Picker } from "@react-native-picker/picker";
// import Container from "../../../../ui/useLayout";
// import { Colors } from "../../../../themes/color";
// import CustomHeader from "../../../../component/customHeader";
// import CustomButton from "../../../../component/customButton";

// export default function CsvUploadScreen() {
//   const [company, setCompany] = useState("");
//   const [year, setYear] = useState("");
//   const [file, setFile] = useState(null);

//   const companies = [
//     "AL WESSIL HOLDING",
//     "West Walk Real Estate",
//     "West Walk Advertisement",
//     "Assets Services Company",
//     "Uranus General Contracting Company WLL",
//     "West Walk Hotel Management",
//     "Merchants Bridge Holdings Limited",
//   ];

//   const years = [2023, 2024, 2025, 2026];

//   // ✅ Pick CSV file (correct API for @react-native-documents/picker)
//   const pickFile = async () => {
//     try {
//       const res = await pick({
//         type: [types.csv, types.plainText], // csv + fallback
//         allowMultiSelection: false,
//         copyTo: "cachesDirectory", // IMPORTANT for Android uploads
//       });

//       const f = res?.[0];
//       if (!f) return;

//       const uriForUpload =
//         Platform.OS === "android" ? (f.fileCopyUri ?? f.uri) : f.uri;

//       setFile({
//         uri: uriForUpload,
//         name: f.name ?? "upload.csv",
//         type: f.mimeType ?? "text/csv",
//       });
//     } catch (err) {
//       if (isCancel(err)) {
//         console.log("User cancelled file picker");
//         return;
//       }
//       console.error(err);
//       Alert.alert("Error", err?.message ?? "File selection failed");
//     }
//   };

//   // ✅ Upload CSV
//   const uploadCsv = async () => {
//     if (!company || !year || !file) {
//       Alert.alert("Error", "Please select company, year, and CSV file");
//       return;
//     }

//     try {
//       const formData = new FormData();

//       formData.append("file", {
//         uri: file.uri,
//         type: file.type || "text/csv",
//         name: file.name || "upload.csv",
//       });

//       formData.append("company", company);
//       formData.append("year", year.toString());

//       const response = await fetch(
//         "https://financesystemawh-rtjt.onrender.com/budgets/upload-csv",
//         {
//           method: "POST",
//           body: formData,
//           // ✅ Do NOT manually set Content-Type for multipart in RN
//           // RN will add correct boundary automatically
//         }
//       );

//       const data = await response.json();

//       if (data?.success) {
//         Alert.alert("Success", data.message ?? "Uploaded");
//         setFile(null);
//       } else {
//         Alert.alert("Error", data?.message ?? "Upload failed");
//       }
//     } catch (err) {
//       console.error(err);
//       Alert.alert("Error", err?.message ?? "Something went wrong");
//     }
//   };

//   return (
//      <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
//         <View style={{paddingBottom:20, borderBottomWidth:0.4}}>
//         <CustomHeader title='Upload Data' />
//       </View>
   
//    <View style={{  padding: 20 }}>
//       <Text style={{ marginBottom: 5 }}>Select Company:</Text>
//       <Picker
//         selectedValue={company}
//         onValueChange={(value) => setCompany(value)}
//         style={{ marginBottom: 20 }}
//       >
//         <Picker.Item label="Select company" value="" />
//         {companies.map((c) => (
//           <Picker.Item key={c} label={c} value={c} />
//         ))}
//       </Picker>

//       <Text style={{ marginBottom: 5 }}>Select Year:</Text>
//       <Picker
//         selectedValue={year}
//         onValueChange={(value) => setYear(value)}
//         style={{ marginBottom: 20 }}
//       >
//         <Picker.Item label="Select year" value="" />
//         {years.map((y) => (
//           <Picker.Item key={y} label={y.toString()} value={y} />
//         ))}
//       </Picker>

//       <CustomButton  title="Pick CSV File"  onPress={pickFile}  />

//       {file && (
//         <Text style={{ marginVertical: 10 }}>
//           Selected: {file.name}
//           {"\n"}URI: {file.uri}
//         </Text>
//       )}

//       <Button
//         title="Upload CSV"
//         onPress={uploadCsv}
//         disabled={!file || !company || !year}
//       />
//     </View>
//     </Container>
//   );
// }


import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { pick, isCancel, types } from "@react-native-documents/picker";
import { Picker } from "@react-native-picker/picker";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";


export default function CsvUploadScreen() {
  const [company, setCompany] = useState("");
  const [year, setYear] = useState("");
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const companies = [
    "AL WESSIL HOLDING",
    "West Walk Real Estate",
    "West Walk Advertisement",
    "Assets Services Company",
    "Uranus General Contracting Company WLL",
    "West Walk Hotel Management",
    "Merchants Bridge Holdings Limited",
  ];

  const years = [2023, 2024, 2025, 2026];

  const pickFile = async () => {
    try {
      const res = await pick({
        type: [types.csv, types.plainText],
        allowMultiSelection: false,
        copyTo: "cachesDirectory",
      });

      const f = res?.[0];
      if (!f) return;

      const uriForUpload =
        Platform.OS === "android" ? (f.fileCopyUri ?? f.uri) : f.uri;

      setFile({
        uri: uriForUpload,
        name: f.name ?? "upload.csv",
        type: f.mimeType ?? "text/csv",
      });
    } catch (err: any) {
      if (isCancel(err)) return;
      console.error(err);
      Alert.alert("Error", err?.message ?? "File selection failed");
    }
  };

  const uploadCsv = async () => {
    if (!company || !year || !file) {
      Alert.alert("Error", "Please select company, year, and CSV file");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        type: file.type || "text/csv",
        name: file.name || "upload.csv",
      } as any);

      formData.append("company", company);
      formData.append("year", year.toString());

      const response = await fetch(
        "https://financesystemawh-rtjt.onrender.com/budgets/upload-csv",
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (data?.success) {
        Alert.alert("Success", data.message ?? "Uploaded");
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

  const canUpload = !!file && !!company && !!year && !uploading;

  const PrimaryButton = ({
    title,
    onPress,
    disabled,
    loading,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.primaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
      ]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
     <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <View style={styles.headerWrap}>
        <CustomHeader title="Upload Data" />
      </View>

      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Budget CSV</Text>
          <Text style={styles.cardSubtitle}>
            Select a company and year, then choose your CSV file.
          </Text>

          {/* Company */}
          <Text style={styles.label}>Company</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={company}
              onValueChange={(value) => setCompany(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select company" value="" />
              {companies.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>

          {/* Year */}
          <Text style={[styles.label, { marginTop: 14 }]}>Year</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={year}
              onValueChange={(value) => setYear(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select year" value="" />
              {years.map((y) => (
                <Picker.Item key={y} label={y.toString()} value={y} />
              ))}
            </Picker>
          </View>

          {/* File */}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton title="Pick CSV File" onPress={pickFile} />
          </View>

          {file ? (
            <View style={styles.fileCard}>
              <Text style={styles.fileTitle} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileMeta} numberOfLines={2}>
                {file.uri}
              </Text>

              <TouchableOpacity
                onPress={() => setFile(null)}
                style={styles.removeBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fileHint}>
              <Text style={styles.fileHintText}>No file selected</Text>
            </View>
          )}

          {/* Upload */}
          <View style={{ marginTop: 16 }}>
            <PrimaryButton
              title="Upload CSV"
              onPress={uploadCsv}
              disabled={!canUpload}
              loading={uploading}
            />
            {!company || !year ? (
              <Text style={styles.helperText}>
                Tip: Select company and year to enable upload.
              </Text>
            ) : null}
          </View>
        </View>
      </View>
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
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fafafa",
  },
  picker: {
    height: 52,
    width: "100%",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  fileHint: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  fileHintText: {
    fontSize: 12,
    color: "#777",
  },
  fileCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f7fbff",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  fileTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  fileMeta: {
    marginTop: 6,
    fontSize: 11,
    color: "#555",
  },
  removeBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffecec",
    borderWidth: 1,
    borderColor: "#ffd1d1",
  },
  removeBtnText: {
    color: "#c53030",
    fontWeight: "700",
    fontSize: 12,
  },
  helperText: {
    marginTop: 8,
    fontSize: 11,
    color: "#777",
  },
});
