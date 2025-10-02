import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, Dimensions, TouchableOpacity, Platform } from 'react-native';
import Pnl_card from '../../../../component/cards/pnl_card';
import { Colors } from '../../../../themes/color';
import CustomHeader from '../../../../component/customHeader';
import { getAllTrialBalances } from '../../../../database/trailBalanceQueries';



const { width } = Dimensions.get('window');


interface TableRow {
  id: number;
  company: string;
  type: string;
  component: string;
  month:number;
  year: number;
  accountno: string;
  accountnoname:string;
  auxcode:string;
  cc2:string;
  cc2code:string;
  cc3:string;
  cc3code: string | null;
  balances: number[];
}

const Ceo_Dashboard = ({ navigation }) => {
 
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allRows = await getAllTrialBalances();
        setData(allRows);
      } catch (err) {
        console.log("❌ Failed to load from SQLite:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);


  return (
    <View style={styles.container}>
     <View style={{backgroundColor:Colors.PrimaryColor,padding:20}} >
      <CustomHeader title="Dashboard" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{marginHorizontal:width>600?40:20}} >
        <Pnl_card navigation={navigation}/>      
      </ScrollView>
    </View>
  );
};




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.White,
  },
  headerTxt: {
    fontSize: width > 600 ? 18 : 14,
    fontWeight: 'bold',
    marginTop: 15,
    color:Colors.PrimaryColor,
    marginBottom:10
  },
  companyCard: {
    width: '100%',
    backgroundColor: '#1E293B', // dark navy for elegance
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 20,
  },
  companyName: {
    fontSize: width > 600 ? 22 : 18,
    fontWeight: '700',
    color: Colors.White,
    marginBottom: 10,
    textAlign: "center",
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: width > 600 ? 16 : 14,
    color: '#CBD5E1', // light gray
    fontWeight: '500',
  },
  value: {
    fontSize: width > 600 ? 16 : 14,
    fontWeight: '600',
    color: Colors.White,
  },
});

export default Ceo_Dashboard;
