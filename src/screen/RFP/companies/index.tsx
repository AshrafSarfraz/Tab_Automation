// import React, { useEffect, useState } from "react";
// import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
// import { getCompanyPnL } from "../../../database/trailBalanceQueries";

// interface PnLRow {
//   company: string;
//   year: number | string; // Overall row will have string
//   totalRevenue: number;
//   totalCost: number;
//   netProfit: number;
// }

// export default function Companies() {
//   const [data, setData] = useState<PnLRow[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchPnL = async () => {
//       setLoading(true);
//       const results = await getCompanyPnL();
//       setData(results);
//       setLoading(false);
//     };
//     fetchPnL();
//   }, []);

//   // Separate overall totals
//   const overallData = data.filter((item) => item.year === 'Overall');
//   const yearWiseData = data.filter((item) => item.year !== 'Overall');

//   const renderItem = ({ item }: { item: PnLRow }) => (
//     <View style={styles.row}>
//       <Text style={styles.cell}>{item.company}</Text>
//       <Text style={styles.cell}>{item.year}</Text>
//       <Text style={styles.cell}>{item.totalRevenue.toLocaleString()}</Text>
//       <Text style={styles.cell}>{item.totalCost.toLocaleString()}</Text>
//       <Text style={[styles.cell, { color: item.netProfit >= 0 ? "green" : "red" }]}>
//         {item.netProfit.toLocaleString()}
//       </Text>
//     </View>
//   );

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#000" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Year-wise PnL</Text>
//       <View style={[styles.row, styles.header]}>
//         <Text style={styles.cell}>Company</Text>
//         <Text style={styles.cell}>Year</Text>
//         <Text style={styles.cell}>Revenue</Text>
//         <Text style={styles.cell}>Cost</Text>
//         <Text style={styles.cell}>Net Profit</Text>
//       </View>
//       <FlatList
//         data={yearWiseData}
//         renderItem={renderItem}
//         keyExtractor={(item, index) => item.company + item.year + index}
//       />

//       <Text style={[styles.title, { marginTop: 20 }]}>Overall Totals Per Company</Text>
//       <View style={[styles.row, styles.header]}>
//         <Text style={styles.cell}>Company</Text>
//         <Text style={styles.cell}>Revenue</Text>
//         <Text style={styles.cell}>Cost</Text>
//         <Text style={styles.cell}>Net Profit</Text>
//       </View>
//       <FlatList
//         data={overallData}
//         renderItem={({ item }) => (
//           <View style={styles.row}>
//             <Text style={styles.cell}>{item.company}</Text>
//             <Text style={styles.cell}>{item.totalRevenue.toLocaleString()}</Text>
//             <Text style={styles.cell}>{item.totalCost.toLocaleString()}</Text>
//             <Text style={[styles.cell, { color: item.netProfit >= 0 ? "green" : "red" }]}>
//               {item.netProfit.toLocaleString()}
//             </Text>
//           </View>
//         )}
//         keyExtractor={(item, index) => item.company + index}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 10 },
//   row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5, borderColor: "#ccc" },
//   cell: { flex: 1, textAlign: "center" },
//   header: { backgroundColor: "#eee", fontWeight: "bold" },
//   center: { flex: 1, justifyContent: "center", alignItems: "center" },
//   title: { fontSize: 16, fontWeight: "bold", marginVertical: 10, textAlign: "center" },
// });



// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, TouchableOpacity,StyleSheet, } from 'react-native';
// import { useNavigation } from '@react-navigation/native';





// const images = [
//   { id: '1', text: 'West Walk Real Estate', companyName: 'West Walk Real Estate'},
//   { id: '2', text: 'Assets Services Company', companyName: 'Assets Services Company' },
//   { id: '3', text: 'West Walk Advertisement', companyName: 'West Walk Advertisement' },
//   { id: '5', text: 'West Walk Group', companyName: 'West Walk Group'},

// ];


// type CategoriesProps={
//   navigation: any
  
// }

// const Companies:React.FC<CategoriesProps> = () => {
//   const navigation=useNavigation()
//   const [currentIndex, setCurrentIndex] = useState(0);


//   return (
//     <View style={styles.container}>
//       {/* Image Slider */}
//       <FlatList
//         data={images}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <TouchableOpacity  style={styles.Flatlist_Cont} onPress={() => navigation.navigate('TrialBalanceList', { item })}>
//             <Text style={styles.Txt} >{item.companyName}</Text>
//           </TouchableOpacity>
//         )}
//       />

    
//     </View>
//   );
// };

// export default Companies;



// const styles=StyleSheet.create({
//     container: {


//       marginHorizontal:"3%",
//       marginTop:4,
//     },
//     Flatlist_Cont:{
//       alignItems:'center',
//       marginBottom:8,
//       backgroundColor:'#31368A',
//       height:120,
//       justifyContent:"center",
//       borderRadius:10

//     },

//     cate_txt:{
//       fontSize:12,
//       marginTop:10,
//       lineHeight:16,
//       letterSpacing:0.3
//     },
//     Txt:{
//       color:'#ffffff',
//       fontWeight:"bold",
//       textAlign:"center",
//       lineHeight:14,
 
//       alignSelf:"center"
//     }
//   });
  
