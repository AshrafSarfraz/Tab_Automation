import React from "react";
import { StyleSheet, View, TouchableOpacity, Linking, ImageBackground,Image, Alert } from "react-native";
import ButtonCard from "../../../component/cardBtn/buttonCard";
import { Budget, CapexIcon, Cashflow, homeLogo, Reports, RFP } from "../../../themes/images";
import Container from "../../../ui/useLayout";
import { Colors } from "../../../themes/color";
import { useNavigation } from "@react-navigation/native";
import CustomHeader from "../../../component/customHeader";
import ButtonCard2 from "../../../component/cardBtn/buttonCard2";


const ReportSelection = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    const url = `https://alwessilholding.com/`;
    Linking.openURL(url);
  };

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <ImageBackground
        source={require('../../../assets/images/bg1.png')}
        style={{ width: "100%", height: "100%" }}
      >
        <CustomHeader title="Back" />

        <View style={styles.Container}>

          {/* LEFT BUTTONS */}
          <View style={styles.LeftBtn_Container}>
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
              style={{marginLeft:-40}}
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
          {/* <TouchableOpacity onPress={handlePress}> */}
          <Image source={homeLogo} style={styles.HomeLogo} resizeMode="contain" />
          {/* </TouchableOpacity> */}
          </View>

          {/* RIGHT BUTTONS */}
          <View style={styles.RightBtn_Container}>
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 60,paddingRight:25  }}

              no=""
              title="CapeX Report (CXR)"
              subtitle="Active"
              caption="Payment requests for approved invoices, services, or project-related expenses."
              icon={CapexIcon}
              // Color="#80206C"
                Color="#01a4c0"
              onPress={() => navigation.navigate('CapexDashboard')}
            />
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 50,paddingRight:25  }} 
              style={{marginLeft:40}}
              no=""
              title="Turnover Rent (TOR)"
              subtitle="Active"
              caption="Turnover rent is a type of lease where rent is based on a fixed amount plus a percentage of the tenant’s sales."
              icon={CapexIcon}
              Color="#31368A"
              onPress={() => navigation.navigate('TOR_Dashboard')}
              
            />
            <ButtonCard2
              cardBodyStyle={{ paddingLeft: 70,paddingRight:25 }} 
              no=""
              title="Lease Statement Report"
              subtitle="Active"
             caption="Lease Statement shows a detailed summary of lease  history for a specific property."
              icon={CapexIcon}
              Color="#038645"
              onPress={() =>
               Alert.alert("Lease Statement Report is currently under development")
              }
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
    top:-30,
    paddingLeft:20
  },
  Img_Cont: {          // ← ADD THIS
    zIndex: 10,
    // elevation: 10,     // elevation is required for Android zIndex to work
  },
  HomeLogo: {
    width: 550,
    height: 550,
    right: -2,
    zIndex: 10,
    elevation: 10,
  },
  RightBtn_Container: {
    width: "32%",
    left: -110,
    zIndex: 0,
  },
  LeftBtn_Container: {
    width: "30%",
    right: -100,
    zIndex: 0,
  }
});





// import React from "react";
// import { StyleSheet, View, TouchableOpacity, Linking, Alert, ImageBackground } from "react-native";
// import ButtonCard from "../../../component/cardBtn/buttonCard";
// import { Budget, CapexIcon, Cashflow, homeLogo, Reports, RFP } from "../../../themes/images";
// import Container from "../../../ui/useLayout";
// import { Colors } from "../../../themes/color";
// import { useNavigation } from "@react-navigation/native";
// import CustomHeader from "../../../component/customHeader";



// const ReportSelection = () => {
//    const navigation=useNavigation()
//   const handlePress = () => {
//     const url = `https://alwessilholding.com/`;
//     Linking.openURL(url);
//   };
  

  
//   return (
//     <Container  statusBarColor={Colors.PrimaryColor}  statusBarStyle="light-content" >
//          <ImageBackground source={require('../../../assets/images/bg1.png')} style={{width:"100%",height:"100%"}} >
//            <CustomHeader title="Back" />
//          <View  style={[styles.Container]} >
        
//          <View style={styles.Img_Cont}>
//                     <ImageBackground
//                       source={homeLogo}
//                       style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
//                       imageStyle={styles.HomeLogo}>
//                       <TouchableOpacity style={styles.bTN} onPress={handlePress} />
//                     </ImageBackground>
//                   </View>
        
//          <View style={styles.Btn_Container} > 
       
//          <View style={{left:-80}} >
//          <ButtonCard
//           no=""
//           title="Performance Report (PR)"
//           subtitle="Active"
//           caption="View and generate financial and operational reports for monitoring and recordkeeping."
//           icon={Reports}
//           Color="#01a4c0"
//           onPress={() => navigation.navigate('mainDashboard')}/>
//         </View>
               
//         <ButtonCard
//           no=""
//           title="Cashflow Report (CR) "
//           subtitle="Active"
//           caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
//           icon={Cashflow}
//           Color="#31368A"
//            onPress={() => navigation.navigate('CashFlowDashboard')}/> 
       
       
//         <View style={{left:5}} >
        
   
        
//         </View>
      
   
       
//         <View style={{left:0}} >
//          <ButtonCard
//           no=""
//           title="Budget Report (BR)"
//           subtitle="Active"
//           caption="Payment requests for approved invoices, services, or project-related expenses."
//           icon={Budget}
//           Color="#038645"
//           onPress={() => navigation.navigate('BudgtedDashboard')}/>
//         </View>
         
      
       
//         <View style={{left:-80,}} >
//      <ButtonCard
//           no=""
//           title="CapeX Report (CXR) "
//           subtitle="Active"
//           caption="Payment requests for approved invoices, services, or project-related expenses."
//           icon={CapexIcon}
//           Color="#80206C"
//           onPress={() => navigation.navigate('CapexDashboard')}/>  
//         </View>
//           </View>
//           </View>

//           </ImageBackground>
//           </Container>
//   );
// };

// export default ReportSelection;

// const styles=StyleSheet.create({
//   Container:{
//     width:"100%",
//     flexDirection: "row",
//     height:"80%",
//     alignItems:"center",
//     paddingLeft:30
//   },
//   RefreshBtn:{
//     position:"absolute",
//     right:40,
//     top:30,
//     backgroundColor:"#ffffff",
//     height:45,
//     width:120,
//     borderRadius:30,
//     alignItems:"center",
//     justifyContent:"center",
//     borderWidth:0.2,
//     elevation:1,

//   },
//   Img_Cont:{
//     width:"50%",
//     zIndex:1,


//   },
//   HomeLogo:{
//     resizeMode:'contain',
//     width:"100%",
//     height:'100%'
//   },
//   Btn_Container:{
//    width:"50%",
//    left:-85,

//   },
//   bTN: {
//     width: 300,
//     height: 300,
//     borderRadius: 200,
//     marginRight: 45,
//     marginTop: 10,
//   },

// })