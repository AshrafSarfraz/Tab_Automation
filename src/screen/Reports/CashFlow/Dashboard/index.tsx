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
} from "react-native";

import { Colors } from "../../../../themes/color";
import { Assets, Awh, Back, Retaj, Uranisu, WW, WWA } from "../../../../themes/images";

import CashFlowCompanyWiseRightPanel from "../../../../component/DashboardRightPanel.tsx/cashFow/Companywise";
import CashFlowGroupWiseRightPanel from "../../../../component/DashboardRightPanel.tsx/cashFow/groupwise";

const companies = [
  { id: 1, name: "Group Report", logo: Awh },
  { id: 2, name: "AL WESSIL HOLDING", logo: Awh },
  { id: 3, name: "West Walk Real Estate", logo: WW },
  { id: 4, name: "West Walk Advertisement", logo: WWA },
  { id: 5, name: "Assets Services Company", logo: Assets },
  { id: 6, name: "Uranus General Contracting Company WLL", logo: Uranisu },
  { id: 7, name: "West Walk Hotel Management", logo: Retaj },
  // { id: 8, name: "others" },
];

const YEARS = [2023, 2024, 2025, 2026];

const CashFlowDashboard = ({ navigation }: any) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  const defaultCompany =
    companies.find((c) => c.name === "Group Report") || companies[0];

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

  const selectedCompanyObj = companies.find((c) => c.id === selectedCompany);
  const isGroupReport = selectedCompanyObj?.name === "Group Report";

  const onExpandPress = () => setExpandChart((p) => !p);

  const onViewDetailsPressCompany = () => {
    navigation.navigate("CashFlowTableScreen", {
      company: selectedCompanyObj?.name || "",
      year: selectedYear,
    });
  };

  const onViewDetailsPressGroup1 = () => {
    // ✅ apna group details screen lagao
    // example:
    // navigation.navigate("CashFlowGroupTableScreen", { year: selectedYear });
    navigation.navigate("CashFlowGroupTableScreen", {
      // company: "ALL",
      mode: "budget",
      year: selectedYear,
    });
  };

  const onAddProjectsPress = () => navigation.navigate("AddProjects");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        hidden={true}
        backgroundColor={Colors.PrimaryColor}
        barStyle="light-content"
      />

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

            <View style={styles.sidebarContent}>
              {!collapsed && <Text style={styles.sidebarTitle}>Cash Flow </Text>}

              {companies.map((c) => {
                const isSelected = selectedCompany === c.id;
                const iconSize = collapsed ? 32 : 22;

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
            </View>
          </View>
        </Animated.View>

        {/* RIGHT PANEL SWITCH */}
        {!isGroupReport ? (
          <CashFlowCompanyWiseRightPanel
            styles={styles}
            YEARS={YEARS}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showYears={showYears}
            setShowYears={setShowYears}
            expandChart={expandChart}
            onExpandPress={onExpandPress}
            onViewDetailsPress={onViewDetailsPressCompany}
            onAddProjectsPress={onAddProjectsPress}
            selectedCompanyName={selectedCompanyObj?.name || ""}
            collapsed={collapsed}
          />
        ) : (
          <CashFlowGroupWiseRightPanel
            styles={styles}
            YEARS={YEARS}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showYears={showYears}
            setShowYears={setShowYears}
            expandChart={expandChart}
            onExpandPress={onExpandPress}
            onViewDetailsPress={onViewDetailsPressGroup1}
            onAddProjectsPress={onAddProjectsPress}
            collapsed={collapsed}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default CashFlowDashboard;

/* ✅ SAME STYLES (no change) */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.PrimaryColor },
  Container: { flex: 1, flexDirection: "row", backgroundColor: "#fff" },

  LeftSide: {
    paddingVertical: 20,
    borderRightWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },

  leftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },

  backIcon: { width: 24, height: 24, tintColor: "#000" },

  toggleBtn: {
    width: 30,
    height: 30,
    backgroundColor: Colors.PrimaryColor,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleBtnIcon: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  sidebarContent: { flex: 1, marginTop: 20, paddingHorizontal: 10 },
  sidebarTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15 },

  companyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    padding: 8,
    borderRadius: 8,
  },

  companyIcon: { width: 22, height: 22, borderRadius: 6 },
  companyName: { marginLeft: 10, fontWeight: "600", fontSize: 12 },

  RightSide: { flex: 1, paddingHorizontal: 16, paddingTop: 20, position: "relative" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    gap: 10,
  },

  yearWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontWeight: "700" },

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

  actionsWrap: { flexDirection: "row", gap: 8, alignItems: "center" },

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

  ChartContainer: { marginTop: 10, flexDirection: "row", flexWrap: "wrap" },
  ChartContainerExpanded: { flexDirection: "column", flexWrap: "nowrap" },

  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
});



// import React, { useRef, useState } from "react";
// import {
//   StyleSheet,
//   View,
//   Animated,
//   Pressable,
//   Text,
//   TouchableOpacity,
//   Image,
//   ScrollView,
//   SafeAreaView,
//   StatusBar,
//   Alert,
// } from "react-native";

// import { Colors } from "../../../../themes/color";
// import { Assets, Awh, Back, Retaj, Uranisu, WW,  WWA } from "../../../../themes/images";


// import CashFlowRevenueChart from "../../../../component/CashFlowChart/Charts/CashFlowRevenueChart";
// import CashFlowExpenseChart from "../../../../component/CashFlowChart/Charts/CashFlowExpenseChart";
// import CashFlowNetProfitChart from "../../../../component/CashFlowChart/Charts/CashFlowNetProfit";
// import CashFlowPnLSummaryCards from "../../../../component/companyCard/cashflowCard";

// const companies = [
//   { id: 1, name: "Group Report", logo: Awh },
//   { id: 2, name: "AL WESSIL HOLDING", logo: Awh },
//   { id: 3, name: "West Walk Real Estate", logo: WW },
//   { id: 4, name: "West Walk Advertisement", logo: WWA },
//   { id: 5, name: "Assets Services Company", logo: Assets },
//   { id: 6, name: "Uranus General Contracting Company WLL", logo: Uranisu },
//   { id: 7, name: "West Walk Hotel Management", logo: Retaj },
//   { id: 8, name: "others", },
 
//   // { id: 7, name: "Merchants Bridge Holdings Limited", logo: WWA },
// ];

// const YEARS = [2023, 2024, 2025, 2026];

// const BudgtedDashboard = ({ navigation }: any) => {
//   const MIN_WIDTH = 100;
//   const MAX_WIDTH = 220;

//   const defaultCompany =
//     companies.find((c) => c.name === "West Walk Real Estate") || companies[0];

//   const [collapsed, setCollapsed] = useState(false);
//   const [selectedCompany, setSelectedCompany] = useState(defaultCompany.id);
//   const [selectedYear, setSelectedYear] = useState(2026);
//   const [showYears, setShowYears] = useState(false);

//   // ✅ NEW: expand chart toggle
//   const [expandChart, setExpandChart] = useState(false);

//   const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

//   const toggleSidebar = () => {
//     Animated.timing(sidebarAnim, {
//       toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
//       duration: 250,
//       useNativeDriver: false,
//     }).start();

//     setCollapsed(!collapsed);
//   };

//   const selectedCompanyObj = companies.find((c) => c.id === selectedCompany);

//   const onExpandPress = () => {
//     setExpandChart((p) => {
//       const next = !p;
//       // ✅ simple popup
//       return next;
//     });
//   };


//     const onViewDetailsPress = () => {
//          navigation.navigate("CashFlowTableScreen", {
//         company:selectedCompanyObj?.name || "",
//         year: selectedYear,
//       });
//     };
  
  

//   return (
//     <SafeAreaView style={styles.safeArea}>
//     <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />

//       <View style={styles.Container}>
//         {/* ================= LEFT SIDEBAR (FIXED) ================= */}
//         <Animated.View style={[styles.LeftSide, { width: sidebarAnim }]}>
//           <View style={{ flex: 1 }}>
//             <View style={styles.leftHeader}>
//               <TouchableOpacity onPress={() => navigation.goBack()}>
//                 <Image source={Back} style={styles.backIcon} />
//               </TouchableOpacity>

//               <Pressable onPress={toggleSidebar} style={styles.toggleBtn}>
//                 <Text style={styles.toggleBtnIcon}>
//                   {collapsed ? ">>" : "<<"}
//                 </Text>
//               </Pressable>
//             </View>

//             <View style={styles.sidebarContent}>
//               {!collapsed && <Text style={styles.sidebarTitle}>Companies</Text>}

//               {companies.map((c) => {
//   const isSelected = selectedCompany === c.id;
//   const iconSize = collapsed ? 32 : 22; // ✅ collapse pe icon bigger

//   return (
//     <Pressable
//       key={c.id}
//       style={[
//         styles.companyItem,
//         // ✅ collapse pe center
//         collapsed
//           ? { justifyContent: "center", paddingHorizontal: 0 }
//           : { justifyContent: "flex-start" },

//         isSelected && { backgroundColor: Colors.PrimaryColor },
//       ]}
//       onPress={() => setSelectedCompany(c.id)}
//     >
//       <Image
//         source={c.logo}
//         style={[
//           styles.companyIcon,
//           {
//             width: iconSize,
//             height: iconSize,
//             tintColor: isSelected ? "#fff" : undefined
//           },
//         ]}
//       />

//       {!collapsed && (
//         <Text style={[styles.companyName, isSelected && { color: "#fff" }]}>
//           {c.name}
//         </Text>
//       )}
//     </Pressable>
//   );
// })}

//             </View>
//           </View>
//         </Animated.View>

//         {/* ================= RIGHT SIDE ================= */}
//         <View style={styles.RightSide}>
//           {/* Top Bar (FIXED) */}
//           <View style={styles.topBar}>
//             {/* Year (left side) */}
//             <View style={styles.yearWrap}>
//               <Text style={styles.label}>Year:</Text>
 
//               <Pressable
//                 style={styles.yearBox}
//                 onPress={() => setShowYears((p) => !p)}
//               >
//                 <Text style={styles.yearText}>{selectedYear}</Text>
//                 <Text>{showYears ? "▲" : "▼"}</Text>
//               </Pressable>
//             </View>

//             {/* ✅ NEW buttons (right side) */}
//             <View style={styles.actionsWrap}>
//             <Pressable style={[styles.actionBtn,{backgroundColor:"#fff", borderColor:Colors.PrimaryColor, borderWidth:2,}]} onPress={()=>{navigation.navigate('AddProjects')}}>
//                 <Text style={[styles.actionText,{color:Colors.PrimaryColor}]}>Add Projects</Text>
//               </Pressable>
//             <Pressable style={styles.actionBtn} onPress={onExpandPress}>
//               <Text style={styles.actionText}>
//               {expandChart ? "Collapse Chart" : "Expand Chart"}
//             </Text>
//            </Pressable>

//               <Pressable style={styles.actionBtn} onPress={onViewDetailsPress}>
//                 <Text style={styles.actionText}>View Details</Text>
//               </Pressable>
//             </View>
//           </View>

//           {/* Dropdown */}
//           {showYears && (
//             <View style={styles.dropdown}>
//               {YEARS.map((y) => (
//                 <Pressable
//                   key={y}
//                   style={styles.dropItem}
//                   onPress={() => {
//                     setSelectedYear(y);
//                     setShowYears(false);
//                   }}
//                 >
//                   <Text
//                     style={[
//                       styles.dropText,
//                       y === selectedYear && {
//                         fontWeight: "800",
//                         color: Colors.PrimaryColor,
//                       },
//                     ]}
//                   >
//                     {y}
//                   </Text>
//                 </Pressable>
//               ))}
//             </View>
//           )}

//           {/* ========== SCROLL ONLY RIGHT CONTENT ========== */}
//           <ScrollView
//             style={styles.scrollArea}
//             contentContainerStyle={styles.scrollContent}
//             nestedScrollEnabled
//             showsVerticalScrollIndicator
//             onScrollBeginDrag={() => setShowYears(false)}
//           >
//             <View style={{ marginTop: 16 }}>
//               <CashFlowPnLSummaryCards
//                 company={selectedCompanyObj?.name || ""}
//                 year={selectedYear}
//               />
//             </View>

//             {/* Charts */}
//             <View
//               style={[
//                 styles.ChartContainer,
//                 expandChart && styles.ChartContainerExpanded, // ✅ expands layout
//               ]}
//             >
//                <CashFlowNetProfitChart
//                 company={selectedCompanyObj?.name || ""}
//                 year={selectedYear}
//                 expandChart={expandChart}
//                 isSidebarCollapsed={collapsed}
//               />
//               <CashFlowRevenueChart
//                 company={selectedCompanyObj?.name || ""}
//                 year={selectedYear}
//                 expandChart={expandChart}
//                 isSidebarCollapsed={collapsed}
//               />
//               <CashFlowExpenseChart
//                 company={selectedCompanyObj?.name || ""}
//                 year={selectedYear}
//                 expandChart={expandChart}
//                 isSidebarCollapsed={collapsed}
//               />

//               {/* <RevenueCostNetProfitLineChart 
//                company={selectedCompanyObj?.name || ""}
//                year={selectedYear}
//                expandChart={expandChart}
//                isSidebarCollapsed={collapsed}
              
//               /> */}
//             </View>
//           </ScrollView>

//           {/* Overlay */}
//           {showYears && (
//             <Pressable style={styles.overlay} onPress={() => setShowYears(false)} />
//           )}
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BudgtedDashboard;

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: Colors.PrimaryColor,
//   },

//   Container: {
//     flex: 1,
//     flexDirection: "row",
//     backgroundColor: "#fff",
//   },

//   /* LEFT */
//   LeftSide: {
//     paddingVertical: 20,
//     borderRightWidth: 1,
//     borderColor: "#ddd",
//     backgroundColor: "#f9f9f9",
//   },

//   leftHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingHorizontal: 10,
//     paddingBottom: 15,
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//     alignItems: "center",
//   },

//   backIcon: { width: 24, height: 24, tintColor: "#000" },

//   toggleBtn: {
//     width: 30,
//     height: 30,
//     backgroundColor: Colors.PrimaryColor,
//     borderRadius: 6,
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   toggleBtnIcon: { color: "#fff", fontSize: 12, fontWeight: "bold" },

//   sidebarContent: { flex: 1, marginTop: 20, paddingHorizontal: 10 },

//   sidebarTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15 },

//   companyItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 14,
//     padding: 8,
//     borderRadius: 8,

//   },

//   companyIcon: { width: 22, height: 22, borderRadius: 6 },

//   companyName: { marginLeft: 10, fontWeight: "600", fontSize:12},

//   /* RIGHT */
//   RightSide: {
//     flex: 1,
//     paddingHorizontal: 16,
//     paddingTop: 20,
//     position: "relative",
//   },

//   topBar: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     zIndex: 10,
//     gap: 10,
//   },

//   yearWrap: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },

//   label: { fontWeight: "700" },

//   yearBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     height: 42,
//     minWidth: 120,
//   },

//   yearText: { fontWeight: "600" },

//   // ✅ Right side buttons
//   actionsWrap: {
//     flexDirection: "row",
//     gap: 8,
//     alignItems: "center",
//   },

//   actionBtn: {
//     height: 36,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//     backgroundColor: Colors.PrimaryColor,
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   actionText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "700",
//   },

//   dropdown: {
//     position: "absolute",
//     top: 62,
//     left: 62,
//     width: 140,
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     zIndex: 9999,
//     elevation: 8,
//   },

//   dropItem: { padding: 12 },

//   dropText: { fontSize: 14 },

//   scrollArea: { flex: 1, marginTop: 10 },

//   scrollContent: { paddingBottom: 60 },

//   ChartContainer: {
//     marginTop: 10,
//     flexDirection: "row",
//     flexWrap: "wrap",
//   },

//   // ✅ when expanded, show charts in single column
//   ChartContainerExpanded: {
//     flexDirection: "column",
//     flexWrap: "nowrap",
//   },

//   overlay: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 100,
//   },
// });
