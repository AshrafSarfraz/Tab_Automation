import React from "react";
import { StyleSheet, View, TouchableOpacity, Linking, ImageBackground, Image, Alert, useWindowDimensions } from "react-native";
import ButtonCard2 from "../../../component/cardBtn/buttonCard2";
import { Budget, CapexIcon, Cashflow, homeLogo, Reports } from "../../../themes/images";
import Container from "../../../ui/useLayout";
import { Colors } from "../../../themes/color";
import { useNavigation } from "@react-navigation/native";
import CustomHeader from "../../../component/customHeader";

const ReportSelection = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // ─────────────────────────────────────
  //  BREAKPOINTS
  //  Tablet   → width >= 1000  (original)
  //  Foldable → width 700–999
  //  Mobile   → width < 700
  // ─────────────────────────────────────
  const isTablet   = width >= 1000;
  const isFoldable = width >= 800 && width < 1000;
  const isMobile   = width < 800;

  // ── Image size ──
  const logoSize = isTablet ? 560 : isFoldable ? 430 : 320;

  // ── Panel offsets ──
  const leftPanelRight  = isTablet ? -95 : isFoldable ? -95 : -80;
  const rightPanelLeft  = isTablet ? -110 : isFoldable ? -105 : -85;

  // ── Container top offset ──
  const containerTop = isTablet ? -30 : isFoldable ? -20 : -10;


  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <ImageBackground
        source={require('../../../assets/images/bg1.png')}
        style={{ width: "100%", height: "100%" }}
      >
        <CustomHeader title="Back" />

        <View style={[styles.Container, { top: containerTop }]}>

          {/* LEFT BUTTONS */}
          <View style={[styles.LeftBtn_Container, { right: leftPanelRight }]}>
            <ButtonCard2
              side="right"
              cardBodyStyle={{ paddingRight: 50 }}
              no=""
              title="Performance Report (PR)"
              subtitle="Active"
              caption="View and generate financial and operational reports for monitoring and recordkeeping."
              icon={Reports}
              Color="#01a4c0"
              onPress={() => navigation.navigate('mainDashboard')}
            />
            <ButtonCard2
              side="right"
              cardBodyStyle={{ paddingRight: 50 }}
              style={{ marginLeft: -40 }}
              no=""
              title="Cashflow Report (CR)"
              subtitle="Active"
              caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
              icon={Cashflow}
              Color="#31368A"
              onPress={() => navigation.navigate('CashFlowDashboard')}
            />
            <ButtonCard2
              side="right"
              cardBodyStyle={{ paddingRight: 50 }}
              no=""
              title="Budget Report (BR)"
              subtitle="Active"
              caption="Payment requests for approved invoices, services, or project-related expenses."
              icon={Budget}
              Color="#038645"
              onPress={() => navigation.navigate('BudgtedDashboard')}
            />
          </View>

          {/* CENTER IMAGE */}
          <View style={styles.Img_Cont}>
            <Image
              source={homeLogo}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
          </View>

          {/* RIGHT BUTTONS */}
          <View style={[styles.RightBtn_Container, { left: rightPanelLeft }]}>
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 55, paddingRight: 20 }}
              no=""
              title="Capex Report (CR)"
              subtitle="Active"
              caption="Payment requests for approved invoices, services, or project-related expenses."
              icon={CapexIcon}
              Color="#01a4c0"
              onPress={() => navigation.navigate('CapexDashboard')}
            />
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 40, paddingRight: 20}}
              style={{ marginLeft: 40 }}
              no=""
              title="Turnover Rent (TOR)"
              subtitle="Active"
              caption="Turnover rent is a type of lease where rent is based on a fixed amount plus a percentage of the tenant's sales."
              icon={CapexIcon}
              Color="#31368A"
              onPress={() => navigation.navigate('TOR_Dashboard')}
            />
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 60, paddingRight: 20 }}
              no=""
              title="Lease Report (LSR)"
              subtitle="Active"
              caption="Lease Statement shows a detailed summary of lease history for a specific property."
              icon={CapexIcon}
              Color="#038645"
              onPress={() => Alert.alert("Lease Statement Report is currently under development")}
            />
          </View>

        </View>
      </ImageBackground>
    </Container>
  );
};

export default ReportSelection;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    justifyContent: "center",
    paddingLeft: 20,
    // top → inline (dynamic)
  },
  Img_Cont: {
    zIndex: 10,
  },
  LeftBtn_Container: {
    width: "30%",
    zIndex: 0,
    // right → inline (dynamic)
  },
  RightBtn_Container: {
    width: "32%",
    zIndex: 0,
    // left → inline (dynamic)
  },
});






// import React from "react";
// import { StyleSheet, View, TouchableOpacity, Linking, ImageBackground,Image, Alert } from "react-native";
// import ButtonCard from "../../../component/cardBtn/buttonCard";
// import { Budget, CapexIcon, Cashflow, homeLogo, Reports, RFP } from "../../../themes/images";
// import Container from "../../../ui/useLayout";
// import { Colors } from "../../../themes/color";
// import { useNavigation } from "@react-navigation/native";
// import CustomHeader from "../../../component/customHeader";
// import ButtonCard2 from "../../../component/cardBtn/buttonCard2";


// const ReportSelection = () => {
//   const navigation = useNavigation();

//   const handlePress = () => {
//     const url = `https://alwessilholding.com/`;
//     Linking.openURL(url);
//   };

//   return (
//     <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
//       <ImageBackground
//         source={require('../../../assets/images/bg1.png')}
//         style={{ width: "100%", height: "100%" }}
//       >
//         <CustomHeader title="Back" />

//         <View style={styles.Container}>

//           {/* LEFT BUTTONS */}
//           <View style={styles.LeftBtn_Container}>
//             <ButtonCard2
//               side="right"
//               cardBodyStyle={{ paddingRight: 50 }} 
//               no=""
//               title="Performance Report (PR)"
//               subtitle="Active"
//               caption="View and generate financial and operational reports for monitoring and recordkeeping."
//               icon={Reports}
//               Color="#01a4c0"
//               onPress={() => navigation.navigate('mainDashboard')}
//             />
//             <ButtonCard2
//               side="right"
//               cardBodyStyle={{ paddingRight: 50 }} 
//               style={{marginLeft:-40}}
//               no=""
//               title="Cashflow Report (CR)"
//               subtitle="Active"
//               caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
//               icon={Cashflow}
//               Color="#31368A"
//               onPress={() => navigation.navigate('CashFlowDashboard')}
//             />
//             <ButtonCard2
//               side="right"
//               cardBodyStyle={{ paddingRight: 50 }} 
//               no=""
//               title="Budget Report (BR)"
//               subtitle="Active"
//               caption="Payment requests for approved invoices, services, or project-related expenses."
//               icon={Budget}
//               Color="#038645"
//               onPress={() => navigation.navigate('BudgtedDashboard')}
//             />
    
//           </View>

//           {/* CENTER IMAGE */}
//           <View style={styles.Img_Cont}>
//           {/* <TouchableOpacity onPress={handlePress}> */}
//           <Image source={homeLogo} style={styles.HomeLogo} resizeMode="contain" />
//           {/* </TouchableOpacity> */}
//           </View>

//           {/* RIGHT BUTTONS */}
//           <View style={styles.RightBtn_Container}>
//             <ButtonCard2
//               cardBodyStyle={{ paddingLeft: 60,paddingRight:25  }}

//               no=""
//               title="Capex Report (CR)"
//               subtitle="Active"
//               caption="Payment requests for approved invoices, services, or project-related expenses."
//               icon={CapexIcon}
//               // Color="#80206C"
//                 Color="#01a4c0"
//               onPress={() => navigation.navigate('CapexDashboard')}
//             />
//             <ButtonCard2
//               cardBodyStyle={{ paddingLeft: 50,paddingRight:25  }} 
//               style={{marginLeft:40}}
//               no=""
//               title="Turnover Rent (TOR)"
//               subtitle="Active"
//               caption="Turnover rent is a type of lease where rent is based on a fixed amount plus a percentage of the tenant’s sales."
//               icon={CapexIcon}
//               Color="#31368A"
//               onPress={() => navigation.navigate('TOR_Dashboard')}
              
//             />
//             <ButtonCard2
//               cardBodyStyle={{ paddingLeft: 70,paddingRight:25 }} 
//               no=""
//               title="Lease Statement Report (LSR) "
//               subtitle="Active"
//              caption="Lease Statement shows a detailed summary of lease  history for a specific property."
//               icon={CapexIcon}
//               Color="#038645"
//               onPress={() =>
//                Alert.alert("Lease Statement Report is currently under development")
//               }
//             />

//           </View>
          

//         </View>
//       </ImageBackground>
//     </Container>
//   );
// };

// export default ReportSelection;

// const styles = StyleSheet.create({
//   Container: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 10,
//     justifyContent: "center",
//     top:-30,
//     paddingLeft:20
//   },
//   Img_Cont: {          // ← ADD THIS
//     zIndex: 10,
//     // elevation: 10,     // elevation is required for Android zIndex to work
//   },
//   HomeLogo: {
//     width: 550,
//     height: 550,
//     right: -2,
//     zIndex: 10,
//     elevation: 10,
//   },
//   RightBtn_Container: {
//     width: "32%",
//     left: -110,
//     zIndex: 0,
//   },
//   LeftBtn_Container: {
//     width: "30%",
//     right: -100,
//     zIndex: 0,
//   }
// });

