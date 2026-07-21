import React, { useRef, useState } from "react";
import {
  StyleSheet, View, Animated, Pressable, Text,
  TouchableOpacity, Image, ScrollView, SafeAreaView, StatusBar,
} from "react-native";
import { Colors } from "../../../themes/color";
import { Assets, Awh, Back, WW, WWA } from "../../../themes/images";
import CashFlowSummaryCards from "../../../component/CashFlow/CashFlowSummarCards";
import CashFlowChart from "../../../component/CashFlow/CashFlowChart";




const companies = [
  { id: 1, name: "AWH", logo: Awh },
  { id: 2, name: "West Walk", logo: WW },
  { id: 3, name: "Uranus", logo: WWA },
  { id: 4, name: "GII", logo: Assets },

];

const YEARS = [2026];

const CashFlowDashboard = ({ navigation }: any) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  const defaultCompany = companies.find((c) => c.name === "AWH") || companies[0];

  const [collapsed, setCollapsed] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(defaultCompany.id);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showYears, setShowYears] = useState(false);
  const [expandChart, setExpandChart] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setCollapsed(!collapsed);
  };

  const onViewDetailsPress = () =>
    navigation.navigate("CashFlowTable", {
      company: selectedCompanyObj?.name || "",
      year: selectedYear,
    });
  

  const selectedCompanyObj = companies.find((c) => c.id === selectedCompany);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden={true} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />

      <View style={styles.Container}>

        {/* LEFT SIDEBAR */}
        <Animated.View style={[styles.LeftSide, { width: sidebarAnim }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.leftHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image source={Back} style={styles.backIcon} />
              </TouchableOpacity>
              <Pressable onPress={toggleSidebar} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnIcon}>{collapsed ? ">>" : "<<"}</Text>
              </Pressable>


            </View>

            <ScrollView
              style={styles.sidebarContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {!collapsed && <Text style={styles.sidebarTitle}>Cash Flow</Text>}

              {companies.map((c) => {
                const isSelected = selectedCompany === c.id;
                const iconSize = collapsed ? 32 : 22;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.companyItem,
                      collapsed ? { justifyContent: "center", paddingHorizontal: 0 } : { justifyContent: "flex-start" },
                      isSelected && { backgroundColor: Colors.PrimaryColor },
                    ]}
                    onPress={() => setSelectedCompany(c.id)}
                  >
                    <Image
                      source={c.logo}
                      style={[styles.companyIcon, { width: iconSize, height: iconSize, tintColor: isSelected ? "#fff" : undefined }]}
                    />
                    {!collapsed && (
                      <Text style={[styles.companyName, isSelected && { color: "#fff" }]}>{c.name}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* RIGHT SIDE */}
        <View style={styles.RightSide}>
          <View style={styles.topBar}>
            <View style={styles.yearWrap}>
              <Text style={styles.label}>Year:</Text>
              <Pressable style={styles.yearBox} onPress={() => setShowYears((p) => !p)}>
                <Text style={styles.yearText}>{selectedYear}</Text>
                <Text>{showYears ? "▲" : "▼"}</Text>
              </Pressable>
            </View>

            <View style={styles.actionsWrap}>
            <Pressable style={[styles.actionBtn, { backgroundColor: "#fff", borderColor: Colors.PrimaryColor, borderWidth: 2 }]}
                 onPress={() => navigation.navigate("CashFlowCsvUpload")}>
              <Text style={[styles.actionText, { color: Colors.PrimaryColor }]}>Add Cash Flow</Text>
             </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => setExpandChart((p) => !p)}>
                <Text style={styles.actionText}>{expandChart ? "Collapse Chart" : "Expand Chart"}</Text>
              </Pressable>
             <Pressable style={styles.actionBtn} onPress={onViewDetailsPress}>
             <Text style={styles.actionText}>View Details</Text>
             </Pressable>


            </View>
          </View>

          {showYears && (
            <View style={styles.dropdown}>
              {YEARS.map((y) => (
                <Pressable key={y} style={styles.dropItem} onPress={() => { setSelectedYear(y); setShowYears(false); }}>
                  <Text style={[styles.dropText, y === selectedYear && { fontWeight: "800", color: Colors.PrimaryColor }]}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            onScrollBeginDrag={() => setShowYears(false)}
          >
            <View style={{ marginTop: 16 }}>
              <CashFlowSummaryCards company={selectedCompanyObj?.name || ""} year={selectedYear} />
            </View>

            <View style={[styles.ChartContainer, expandChart && styles.ChartContainerExpanded]}>
              <CashFlowChart
                company={selectedCompanyObj?.name || ""}
                year={selectedYear}
                expandChart={expandChart}
                isSidebarCollapsed={collapsed}
              />
            </View>
          </ScrollView>

          {showYears && <Pressable style={styles.overlay} onPress={() => setShowYears(false)} />}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CashFlowDashboard;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.PrimaryColor },
  Container: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },
  LeftSide: { paddingVertical: 20, borderRightWidth: 1, borderColor: "#ddd", backgroundColor: "#f9f9f9" },
  leftHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 15, borderBottomWidth: 1, borderColor: "#ddd", alignItems: "center" },
  backIcon: { width: 24, height: 24, tintColor: "#000" },
  toggleBtn: { width: 25, height: 25, backgroundColor: Colors.PrimaryColor, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  toggleBtnIcon: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  sidebarContent: { flex: 1, marginTop: 12, paddingHorizontal: 10 },
  sidebarTitle: { fontSize: 14, fontWeight: "700", marginBottom: 15 },
  companyItem: { flexDirection: "row", alignItems: "center", marginBottom: 10, padding: 8, borderRadius: 8 },
  companyIcon: { width: 22, height: 22, borderRadius: 6 },
  companyName: { marginLeft: 10, fontWeight: "600", fontSize: 12 },
  RightSide: { flex: 1, paddingHorizontal: 16, paddingTop: 20, position: "relative" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10, gap: 10 },
  yearWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontWeight: "700", color: "#000" },
  yearBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, height: 42, minWidth: 120 },
  yearText: { fontWeight: "600" },
  actionsWrap: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.PrimaryColor, alignItems: "center", justifyContent: "center" },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  dropdown: { position: "absolute", top: 62, left: 62, width: 140, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", zIndex: 9999, elevation: 8 },
  dropItem: { padding: 12 },
  dropText: { fontSize: 14 },
  scrollArea: { flex: 1, marginTop: 10 },
  scrollContent: { paddingBottom: 60 },
  ChartContainer: { marginTop: 10, flexDirection: "row", flexWrap: "wrap" },
  ChartContainerExpanded: { flexDirection: "column", flexWrap: "nowrap" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
});