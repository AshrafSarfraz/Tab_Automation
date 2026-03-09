import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

import { Colors } from "../../../../themes/color";
import { Back } from "../../../../themes/images";

const API_BASE = "https://financesystemawh-rtjt.onrender.com";
const ENDPOINT = `${API_BASE}/CapexBalance`;

const BudgtedDashboard = ({ navigation }: any) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  const [collapsed, setCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const res = await fetch(ENDPOINT);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load data");
      }

      const safeData = Array.isArray(data) ? data : [];
      setRows(safeData);

      const uniqueProjects = [
        ...new Set(
          safeData
            .map((item) => String(item.Project || "").trim())
            .filter(Boolean)
        ),
      ].map((name, index) => ({
        id: index + 1,
        name,
      }));

      setProjects(uniqueProjects);

      if (uniqueProjects.length > 0) {
        setSelectedProject((prev) => prev || uniqueProjects[0].name);
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();

    setCollapsed(!collapsed);
  };

  const selectedProjectRows = useMemo(() => {
    return rows.filter(
      (item) => String(item.Project || "").trim() === selectedProject
    );
  }, [rows, selectedProject]);

  const costRows = useMemo(() => {
    return selectedProjectRows.filter(
      (item) => String(item.accountType || "").trim() === "Cost"
    );
  }, [selectedProjectRows]);

  const netProfitRows = useMemo(() => {
    return selectedProjectRows.filter(
      (item) => String(item.accountType || "").trim() === "NetProfit"
    );
  }, [selectedProjectRows]);

  const CostTable = ({ data }) => {
    if (!data.length) return null;

    return (
      <View style={styles.tableSection}>
        <Text style={styles.tableTitle}>Cost</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={[styles.cell, styles.hCell, { width: 160 }]}>Project</Text>
              <Text style={[styles.cell, styles.hCell, { width: 160 }]}>Account Type</Text>
              <Text style={[styles.cell, styles.hCell, { width: 150 }]}>Component</Text>
              <Text style={[styles.cell, styles.hCell, { width: 190 }]}>Actual Amount</Text>
            </View>

            {data.map((item) => (
              <View style={styles.row} key={item._id}>
                <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>
                  {item.Project || ""}
                </Text>
                <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>
                  {item.accountType || ""}
                </Text>
                <Text style={[styles.cell, { width: 150 }]} numberOfLines={1}>
                  {item.component || ""}
                </Text>
                <Text style={[styles.cell, { width: 190 }]} numberOfLines={1}>
                  {Number(item.Amount || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const NetProfitTable = ({ data }) => {
    if (!data.length) return null;

    return (
      <View style={styles.tableSection}>
        <Text style={styles.tableTitle}>NetProfit</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={[styles.cell, styles.hCell, { width: 160 }]}>Project</Text>
              <Text style={[styles.cell, styles.hCell, { width: 160 }]}>Year</Text>
              <Text style={[styles.cell, styles.hCell, { width: 150 }]}>Profit With Finance</Text>
              <Text style={[styles.cell, styles.hCell, { width: 190 }]}>
              Profit Without Finance
              </Text>
            </View>

            {data.map((item) => (
              <View style={styles.row} key={item._id}>
                <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>
                  {item.Project || ""}
                </Text>
                <Text style={[styles.cell, { width: 160 }]} numberOfLines={1}>
                  {item.year || ""}
                </Text>
                <Text style={[styles.cell, { width: 150 }]} numberOfLines={1}>
                  {Number(item.PRwithFinance || 0).toFixed(2)}
                </Text>
                <Text style={[styles.cell, { width: 190 }]} numberOfLines={1}>
                  {Number(item.PRwithoutFinance || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden backgroundColor={Colors.PrimaryColor} barStyle="light-content" />

      <View style={styles.container}>
        <Animated.View style={[styles.leftSide, { width: sidebarAnim }]}>
          <View style={{ flex: 1 }}>
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

            <View style={styles.sidebarContent}>
              {!collapsed && <Text style={styles.sidebarTitle}>Capex Balance</Text>}

              {loading ? (
                <ActivityIndicator size="small" color={Colors.PrimaryColor} />
              ) : (
                projects.map((p) => {
                  const isSelected = selectedProject === p.name;

                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        styles.projectItem,
                        isSelected && styles.selectedProjectItem,
                      ]}
                      onPress={() => setSelectedProject(p.name)}
                    >
                      <Text
                        style={[
                          collapsed ? styles.projectShortName : styles.projectName,
                          isSelected && styles.selectedProjectText,
                        ]}
                        numberOfLines={2}
                      >
                        {collapsed ? p.name?.charAt(0) || "P" : p.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </Animated.View>

        <View style={styles.rightSide}>
          <View style={styles.rightHeader}>
            <Text style={styles.rightTitle}>{selectedProject || "Select Project"}</Text>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8 }}>Loading...</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.rightContent}
            >
              <CostTable data={costRows} />
              <NetProfitTable data={netProfitRows} />
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default BudgtedDashboard;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.PrimaryColor,
  },

  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#fff",
  },

  leftSide: {
    paddingVertical: 20,
    borderRightWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },

  leftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  backIcon: {
    width: 24,
    height: 24,
    tintColor: "#000",
  },

  toggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PrimaryColor,
  },

  toggleBtnIcon: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  sidebarContent: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 10,
  },

  sidebarTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
  },

  projectItem: {
    height: 40,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  selectedProjectItem: {
    backgroundColor: Colors.PrimaryColor,
  },

  projectName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },

  projectShortName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },

  selectedProjectText: {
    color: "#fff",
  },

  rightSide: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: "#fff",
  },

  rightHeader: {
    marginBottom: 14,
  },

  rightTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.PrimaryColor,
  },

  rightContent: {
    paddingBottom: 30,
  },

  tableSection: {
    marginBottom: 24,
  },

  tableTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    color: "#111",
  },

  tableWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  tableHeader: {
    backgroundColor: "#f3f4f6",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    minHeight: 44,
    paddingHorizontal: 6,
  },

  cell: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
    color: "#111",
  },

  hCell: {
    fontWeight: "700",
    color:'#000',
  
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});