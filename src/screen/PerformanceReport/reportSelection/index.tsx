

import React from "react";
import { StyleSheet, View, useWindowDimensions,Image, TouchableOpacity, Linking, Alert } from "react-native";
import ButtonCard from "../../../component/cardBtn/buttonCard";
import { homeLogo, LPO, Reports, RFP } from "../../../themes/images";
import Container from "../../../ui/useLayout";
import { Colors } from "../../../themes/color";
import { useNavigation } from "@react-navigation/native";





const ReportSelection = () => {
   const navigation=useNavigation()
  const handlePress = () => {
    const url = `https://alwessilholding.com/`;
    Linking.openURL(url);
  };
  

  
  return (
    <Container  statusBarColor={Colors.PrimaryColor}  statusBarStyle="light-content" >
      {/* <TouchableOpacity style={styles.RefreshBtn} >
        <MyText type="subHeader" >Refresh</MyText>
        </TouchableOpacity> */}
         <View  style={[styles.Container]} >
        
         <TouchableOpacity style={styles.Img_Cont} onPress={handlePress} >
          <Image source={homeLogo} style={styles.HomeLogo}  />
         </TouchableOpacity>
        
         <View style={styles.Btn_Container} > 
        <View style={{left:-35,marginBottom:10}} >
         <ButtonCard
          no="01"
          title="Performance Report (PR)"
          subtitle="Active"
          caption="Create and manage Local Purchase Orders for approved procurement of goods and services."
          icon={LPO}
          Color="#038645"
          onPress={() => navigation.navigate('mainDashboard')}/> 
      
        </View>
        <View>
         <ButtonCard
          no="02"
          title="Cashflow"
          subtitle="Active"
          caption="View and generate financial and operational reports for monitoring and recordkeeping."
          icon={Reports}
          Color="#01a4c0"
          onPress={() => navigation.navigate('Ceo_Dashboard')}/>

        </View>
        <View style={{left:-35,marginTop:10}} >
         <ButtonCard
          no="03"
          title="Budgted Amount "
          subtitle="Active"
          caption="Payment requests for approved invoices, services, or project-related expenses."
          icon={RFP}
          Color="#4274b7"
          onPress={() => console.log("clicked")}
        />  
        </View>


          </View>
          </View>

    </Container>
  );
};

export default ReportSelection;

const styles=StyleSheet.create({
  Container:{
    width:"100%",
    flexDirection: "row",
    height:"100%",
    alignItems:"center",
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
   left:-85
  }

})