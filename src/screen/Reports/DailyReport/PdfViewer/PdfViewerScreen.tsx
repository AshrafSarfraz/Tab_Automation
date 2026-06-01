import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

// 📦 Install: npm install react-native-webview

export default function ViewerDailyReport({ route, navigation }: any) {
  const { pdfUrl, fileName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Google Docs se PDF render karo (WebView ke andar)
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;

  const openInBrowser = async () => {
    try {
      await Linking.openURL(pdfUrl);
    } catch {
      Alert.alert("Error", "Could not open PDF in browser");
    }
  };

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
        <CustomHeader
          title={fileName || "PDF Viewer"}
          // Agar tumhara CustomHeader back button support karta hai:
          // onBack={() => navigation.goBack()}
        />
        <TouchableOpacity style={styles.browserBtn} onPress={openInBrowser}>
          <Text style={styles.browserBtnText}>Browser ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.PrimaryColor} />
          <Text style={styles.loadingText}>PDF loading...</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>PDF problem</Text>
          <Text style={styles.errorSubtitle}>
            Checking Internet Connection, Trying to Open Pdf
          </Text>
          <TouchableOpacity
            style={styles.openBrowserBtn}
            onPress={openInBrowser}
            activeOpacity={0.85}
          >
            <Text style={styles.openBrowserText}>Open In Browser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PDF WebView */}
      {!error && (
        <WebView
          source={{ uri: googleViewerUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  // Header
  headerWrap: {
    borderBottomWidth: 0.4,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 12,
  },
  browserBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  browserBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // WebView
  webview: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // Loading Overlay
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#777",
    marginTop: 8,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 10,
  },
  errorIcon: { fontSize: 48 },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  errorSubtitle: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
  openBrowserBtn: {
    marginTop: 8,
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openBrowserText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.PrimaryColor,
  },
  retryText: {
    color: Colors.PrimaryColor,
    fontWeight: "700",
    fontSize: 14,
  },
});
