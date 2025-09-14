import React from 'react';
import { ScrollView, StyleSheet, View,Text, Dimensions } from 'react-native';
import Pnl_card from '../../../component/cards/pnl_card';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';
const {width} =Dimensions.get('window')

const Ceo_Dashboard = () => {
    return (
      <View style={styles.container} > 
      <CustomHeader title='Dashboard' />
      <ScrollView>
        <Text style={styles.Header_Txt} >AWH Summary Report</Text>
        <Pnl_card/>
        <Text style={styles.Header_Txt} >Project</Text>
      </ScrollView>
      </View>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        paddingHorizontal:20,
        paddingVertical:50,
        backgroundColor:Colors.White
    },
    Header_Txt:{
      fontSize:width>600?24:16,
      fontWeight:'bold',
      marginTop:5,
      marginBottom:10
    }
})

export default Ceo_Dashboard;
