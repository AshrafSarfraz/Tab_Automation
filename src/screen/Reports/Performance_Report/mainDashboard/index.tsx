import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";

import { Colors } from "../../../../themes/color";
import { Assets, Awh, Back, Retaj, Uranisu, WW, WWA } from "../../../../themes/images";
import GroupWiseRightPanel from "../../../../component/DashboardRightPanel.tsx/TrailBalance/groupwise";
import CompanyWisedRightPanel from "../../../../component/DashboardRightPanel.tsx/TrailBalance/Companywise";

const companies = [
  { id: 1, name: "Group Report",                            logo: Awh     },
  { id: 2, name: "AL WESSIL HOLDING",                      logo: Awh     },
  { id: 3, name: "West Walk Real Estate",                  logo: WW      },
  { id: 4, name: "West Walk Advertisement",                logo: WWA     },
  { id: 5, name: "Assets Services Company",                logo: Assets  },
  { id: 6, name: "Uranus General Contracting Company WLL", logo: Uranisu },
  { id: 7, name: "West Walk Hotel Management",             logo: Retaj   },
];

const YEARS = [2023, 2024, 2025, 2026];

const MainDashboard = ({ navigation }: any) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  const defaultCompany = companies.find((c) => c.name === "Group Report") || companies[0];

  const [collapsed, setCollapsed]             = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(defaultCompany.id);
  const [selectedYear, setSelectedYear]       = useState(2026);
  const [showYears, setShowYears]             = useState(false);
  const [expandChart, setExpandChart]         = useState(false);

  const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setCollapsed(!collapsed);
  };

  const selectedCompanyObj = companies.find((c) => c.id === selectedCompany);
  const isGroupReport      = selectedCompanyObj?.name === "Group Report";

  const onExpandPress = () => setExpandChart((p) => !p);

  const onViewDetailsPress = () =>
    navigation.navigate("TrialBalanceTable", {
      company: selectedCompanyObj?.name || "",
      year: selectedYear,
    });

  const onViewDetailsPress2 = () =>
    navigation.navigate("GroupMonthlySummaryScreen", { year: selectedYear });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden={true} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />

      <View style={styles.Container}>

        {/* ── LEFT SIDEBAR ── */}
        <Animated.View style={[styles.LeftSide, { width: sidebarAnim }]}>
          <View style={{ flex: 1 }}>

            {/* Fixed header (back + toggle) */}
            <View style={styles.leftHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image source={Back} style={styles.backIcon} />
              </TouchableOpacity>

              <Pressable onPress={toggleSidebar} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnIcon}>
                  {collapsed ? ">>" : "<<"}
                </Text>
              </Pressable>
            </View>

            {/* ✅ Scrollable company list */}
            <ScrollView
              style={styles.sidebarContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {!collapsed && (
                <Text style={styles.sidebarTitle}>Performance Report</Text>
              )}

              {companies.map((c) => {
                const isSelected = selectedCompany === c.id;
                const iconSize   = collapsed ? 32 : 22;

                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.companyItem,
                      collapsed
                        ? { justifyContent: "center", paddingHorizontal: 0 }
                        : { justifyContent: "flex-start" },
                      isSelected && { backgroundColor: Colors.PrimaryColor },
                    ]}
                    onPress={() => setSelectedCompany(c.id)}
                  >
                    <Image
                      source={c.logo}
                      style={[
                        styles.companyIcon,
                        {
                          width: iconSize,
                          height: iconSize,
                          tintColor: isSelected ? "#fff" : undefined,
                        },
                      ]}
                    />
                    {!collapsed && (
                      <Text style={[styles.companyName, isSelected && { color: "#fff" }]}>
                        {c.name}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

          </View>
        </Animated.View>

        {/* ── RIGHT PANEL ── */}
        {!isGroupReport ? (
          <CompanyWisedRightPanel
            styles={styles}
            YEARS={YEARS}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showYears={showYears}
            setShowYears={setShowYears}
            expandChart={expandChart}
            onExpandPress={onExpandPress}
            onViewDetailsPress={onViewDetailsPress}
            selectedCompanyName={selectedCompanyObj?.name || ""}
            collapsed={collapsed}
          />
        ) : (
          <GroupWiseRightPanel
            styles={styles}
            YEARS={YEARS}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showYears={showYears}
            setShowYears={setShowYears}
            expandChart={expandChart}
            onExpandPress={onExpandPress}
            onViewDetailsPress={onViewDetailsPress2}
            collapsed={collapsed}
          />
        )}

      </View>
    </SafeAreaView>
  );
};

export default MainDashboard;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.PrimaryColor,
  },
  Container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
  },

  /* LEFT */
  LeftSide: {
    paddingVertical: 20,
    borderRightWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  leftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  backIcon: { width: 24, height: 24, tintColor: "#000" },
  toggleBtn: {
    width: 25,
    height: 25,
    backgroundColor: Colors.PrimaryColor,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnIcon: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  sidebarContent: {
    flex: 1,
    marginTop: 12,
    paddingHorizontal: 10,
  },
  sidebarTitle: { fontSize: 14, fontWeight: "700", marginBottom: 15 },
  companyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 8,
    borderRadius: 8,
  },
  companyIcon: { width: 22, height: 22, borderRadius: 6 },
  companyName: { marginLeft: 10, fontWeight: "600", fontSize: 12 },

  /* RIGHT */
  RightSide: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    position: "relative",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    gap: 10,
  },
  yearWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: { fontWeight: "700", color: "#000" },
  yearBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    minWidth: 120,
  },
  yearText: { fontWeight: "600" },
  actionsWrap: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.PrimaryColor,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  dropdown: {
    position: "absolute",
    top: 62,
    left: 62,
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    zIndex: 9999,
    elevation: 8,
  },
  dropItem: { padding: 12 },
  dropText: { fontSize: 14 },
  scrollArea: { flex: 1, marginTop: 10 },
  scrollContent: { paddingBottom: 60 },
  ChartContainer: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  ChartContainerExpanded: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
});
