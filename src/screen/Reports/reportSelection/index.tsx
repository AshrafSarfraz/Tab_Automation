import React from "react";
import { StyleSheet, View, TouchableOpacity, Linking, Alert, ImageBackground } from "react-native";
import ButtonCard from "../../../component/cardBtn/buttonCard";
import { Budget, Cashflow, homeLogo, Reports, RFP } from "../../../themes/images";
import Container from "../../../ui/useLayout";
import { Colors } from "../../../themes/color";
import { useNavigation } from "@react-navigation/native";
import CustomHeader from "../../../component/customHeader";



const ReportSelection = () => {
   const navigation=useNavigation()
  const handlePress = () => {
    const url = `https://alwessilholding.com/`;
    Linking.openURL(url);
  };
  

  
  return (
    <Container  statusBarColor={Colors.PrimaryColor}  statusBarStyle="light-content" >
         <ImageBackground source={require('../../../assets/images/bg1.png')} style={{width:"100%",height:"100%"}} >
           <CustomHeader title="Back" />
         <View  style={[styles.Container]} >
        
         <View style={styles.Img_Cont}>
                    <ImageBackground
                      source={homeLogo}
                      style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
                      imageStyle={styles.HomeLogo}>
                      <TouchableOpacity style={styles.bTN} onPress={handlePress} />
                    </ImageBackground>
                  </View>
        
         <View style={styles.Btn_Container} > 
       
         <View style={{left:-80}} >
         <ButtonCard
          no=""
          title="Performance Report (PR)"
          subtitle="Active"
          caption="View and generate financial and operational reports for monitoring and recordkeeping."
          icon={Reports}
          Color="#01a4c0"
          onPress={() => navigation.navigate('mainDashboard')}/>
        </View>
       
       
       
        <View style={{left:-20}} >
         <ButtonCard
          no=""
          title="Cashflow Report"
          subtitle="Active"
          caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
          icon={Cashflow}
          Color="#31368A"
           onPress={() => navigation.navigate('CashFlowDashboard')}/> 
        </View>
      
   
       
        <View style={{left:-17}} >
         <ButtonCard
          no=""
          title="Budget Report"
          subtitle="Active"
          caption="Payment requests for approved invoices, services, or project-related expenses."
          icon={Budget}
          Color="#038645"
          onPress={() => navigation.navigate('BudgtedDashboard')}/> 
       
        </View>
       
        <View style={{left:-80,}} >
         <ButtonCard
          no=""
          title="CapeX Report"
          subtitle="Active"
          caption="Payment requests for approved invoices, services, or project-related expenses."
          icon={Budget}
          Color="#038645"
          onPress={() => navigation.navigate('CapexDashboard')}/> 
       
        </View>
          </View>
          </View>

          </ImageBackground>
          </Container>
  );
};

export default ReportSelection;

const styles=StyleSheet.create({
  Container:{
    width:"100%",
    flexDirection: "row",
    height:"80%",
    alignItems:"center",
    paddingLeft:30
  },
  RefreshBtn:{
    position:"absolute",
    right:40,
    top:30,
    backgroundColor:"#ffffff",
    height:45,
    width:120,
    borderRadius:30,
    alignItems:"center",
    justifyContent:"center",
    borderWidth:0.2,
    elevation:1,

  },
  Img_Cont:{
    width:"50%",
    zIndex:1,


  },
  HomeLogo:{
    resizeMode:'contain',
    width:"100%",
    height:'100%'
  },
  Btn_Container:{
   width:"50%",
   left:-85,

  },
  bTN: {
    width: 300,
    height: 300,
    borderRadius: 200,
    marginRight: 45,
    marginTop: 10,
  },

})