
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
  SectionList,
} from "react-native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";
import { getTrialBalanceByCompany } from "../../../database/trailBalanceQueries";

const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface TableRow {
  id: number;
  company: string;
  type: string; // "Revenue" or "Cost"
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
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

export default function SelectedCmpTrailBalance({route}) {
  const { item } = route.params; 
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rows = await getTrialBalanceByCompany(item.companyName);
        setData(rows);
      } catch (err) {
        console.log("❌ Failed to load from SQLite:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [item]);

  // 🔹 Group by year, add subtotal and grand total
  const sections = useMemo(() => {
    const map: { [year: string]: TableRow[] } = {};
    data.forEach(row => {
      if (!map[row.year]) map[row.year] = [];
      map[row.year].push(row);
    });

    return Object.keys(map)
      .sort((a,b)=> parseInt(b) - parseInt(a)) // Descending year
      .map(year => {
        const rows = map[year];

        // Group by component
        const componentMap: { [component: string]: TableRow[] } = {};
        rows.forEach(r => {
          if (!componentMap[r.component]) componentMap[r.component] = [];
          componentMap[r.component].push(r);
        });

        const finalRows: TableRow[] = [];
        let yearRevenue: number[] = Array(12).fill(0);
        let yearCost: number[] = Array(12).fill(0);

        Object.keys(componentMap).forEach(comp => {
          const compRows = componentMap[comp];
          finalRows.push(...compRows);

          // Calculate subtotal for component
          const subtotalBalances = Array(12).fill(0);
          compRows.forEach(r => {
            r.balances.forEach((b, idx) => {
              subtotalBalances[idx] += b;
            });
          });

          // Update year totals
          const type = compRows[0].type;
          if(type === "Revenue") subtotalBalances.forEach((b,i)=>yearRevenue[i]+=b);
          else subtotalBalances.forEach((b,i)=>yearCost[i]+=b);

          const subtotalTotal = subtotalBalances.reduce((a,b)=>a+b,0);

          finalRows.push({
            id: compRows[0].id + 100000,
            company: "",
            type: compRows[0].type,
            component: comp,
            accountnoname: "Subtotal",
            month: 0,
            year: parseInt(year),
            accountno: "",
            auxcode: "",
            cc2: "",
            cc2code: "",
            cc3: "",
            cc3code: "",
            balances: subtotalBalances,
            isSubtotal: true
          });
        });

        // Add grand total row
        const grandBalances = yearRevenue.map((rev,i)=>rev - yearCost[i]);
        const grandTotal = grandBalances.reduce((a,b)=>a+b,0);
        finalRows.push({
          id: parseInt(year) + 999999,
          company: "",
          type: "Profit",
          component: "Grand Total",
          accountnoname: "",
          month: 0,
          year: parseInt(year),
          accountno: "",
          auxcode: "",
          cc2: "",
          cc2code: "",
          cc3: "",
          cc3code: "",
          balances: grandBalances,
          isGrandTotal: true
        });

        return { title: year, data: finalRows };
      });
  }, [data]);

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={[styles.cell, { width: 80,color:'#ffffff' }]}>Type</Text>
      <Text style={[styles.cell, { width: 160,color:'#ffffff',fontSize:12 }]}>Income Statement</Text>
      <Text style={[styles.cell, { width: 150,color:'#ffffff' }]}>Account Name</Text>
      <Text style={[styles.cell, { width: 80,color:'#ffffff' }]}>Class</Text>
      <Text style={[styles.cell, { width: 80,color:'#ffffff' }]}>Sub Class</Text>
      <Text style={[styles.cell, { width: 110, color:'#ffffff', textAlign:"right" }]}>Total</Text>
      {months.map((m)=>(
        <Text key={m} style={[styles.cell, { width: 110, textAlign:"right" ,color:'#ffffff'}]}>{m}</Text>
      ))}
    </View>
  );

  const renderRow = (row: TableRow) => {
    // Total and absolute balances for display
    const total = row.balances.reduce((sum,b)=>sum+b,0);
    const [zone, subClass] = row.cc3code 
      ? row.cc3code.split('.').map(s=>s.trim()) 
      : ["",""];
  
    const rowStyle = [
      styles.row,
      row.isSubtotal && { backgroundColor: "#eee" },
      row.isGrandTotal && { backgroundColor: "#cde", borderTopWidth:2 }
    ];
  
    const textStyle = (bold?: boolean) => ({
      fontWeight: bold ? "bold" : "normal"
    });

    return (
      <View style={rowStyle}>
        <Text style={[styles.cell, { width:80 }, row.isSubtotal||row.isGrandTotal ? textStyle(true) : {}]}>{row.type}</Text>
        <Text style={[styles.cell, { width:160,fontSize:12 }, row.isSubtotal||row.isGrandTotal ? textStyle(true) : {}]}>{row.component}</Text>
        <Text style={[styles.cell, { width:150 }]}>{row.accountnoname}</Text>
        <Text style={[styles.cell, { width:80 }]}>{zone}</Text>
        <Text style={[styles.cell, { width:80 }]}>{subClass}</Text>
        <Text style={[styles.cell, { width:110, textAlign:"right" }, row.isSubtotal||row.isGrandTotal ? textStyle(true) : {}]}>
        {Math.abs(total).toFixed(2)}
      </Text>
      {row.balances.map((b, idx)=>(
        <Text key={idx} style={[styles.cell, { width:110, textAlign:"right" }, row.isSubtotal||row.isGrandTotal ? textStyle(true) : {}]}>
          {Math.abs(b).toFixed(2)}
        </Text>
        ))}
      </View>
    )
  }

  if(loading){
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor}/>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CustomHeader title={`${item.companyName}`} />
      <ScrollView horizontal>
        <SectionList
          sections={sections}
          keyExtractor={item=>item.id.toString()}
          renderSectionHeader={({section})=>(
            <View>
              <View style={[styles.row, {backgroundColor:"#eee", borderBottomWidth:2}]}>
                <Text style={[styles.cell, { fontWeight:"bold", fontSize:16 }]}>{section.title}</Text>
              </View>
              {renderHeader()}
            </View>
          )}
          renderItem={({item})=>renderRow(item)}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor:Colors.White,
    paddingHorizontal: width>600?24:10,
    paddingTop: width>600?20:35
  },
  row:{
    flexDirection:"row",
    paddingVertical:8,
    borderBottomWidth:1,
    borderColor:"#ddd"
  },
  header:{
    backgroundColor: '#31368A',
    borderBottomWidth:2
  },
  cell:{
    paddingHorizontal:8,
    fontSize: width>600?12:10,
    textAlign:"center"
  },
  centered:{
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  }
});






// import React, { useEffect, useState, useMemo } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   SectionList,
// } from "react-native";
// import { Colors } from "../../../themes/color";
// import CustomHeader from "../../../component/customHeader";
// import { getTrialBalanceByCompany } from "../../../database/trailBalanceQueries";

// const { width } = Dimensions.get("window");
// const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// interface TableRow {
//   id: number;
//   company: string;
//   type: string; // "Revenue" or "Cost"
//   component: string;
//   month:number;
//   year: number;
//   accountno: string;
//   accountnoname:string;
//   auxcode:string;
//   cc2:string;
//   cc2code:string;
//   cc3:string;
//   cc3code: string | null;
//   balances: number[];
// }

// export default function SelectedCmpTrailBalance({route}) {
//   const { item } = route.params; 
//   const [data, setData] = useState<TableRow[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const rows = await getTrialBalanceByCompany(item.companyName);
//         setData(rows);
//       } catch (err) {
//         console.log("❌ Failed to load from SQLite:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     loadData();
//   }, [item]);

//   // 🔹 Group by year & sort Revenue first, then Cost
//   const sections = useMemo(() => {
//     const map: {[year:string]: TableRow[]} = {};
//     data.forEach(row => {
//       if (!map[row.year]) map[row.year] = [];
//       map[row.year].push(row);
//     });

//     return Object.keys(map)
//       .sort((a,b)=> parseInt(b) - parseInt(a)) // Descending year
//       .map(year => ({
//         title: year,
//         data: map[year].sort((a,b)=>{
//           if(a.type === b.type) return 0;
//           if(a.type === "Revenue") return -1;
//           return 1;
//         })
//       }));
//   }, [data]);

//   const renderHeader = () => (
//     <View style={[styles.row, styles.header]}>
//       <Text style={[styles.cell, { width: 100 }]}>Type</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Income Statement Component</Text>
//       <Text style={[styles.cell, { width: 150 }]}>Account Number</Text>
//       <Text style={[styles.cell, { width: 120 }]}>Class</Text>
//       <Text style={[styles.cell, { width: 120 }]}>Sub Class</Text>
//       <Text style={[styles.cell, { width: 120, textAlign:"right" }]}>Total</Text>
//       {months.map((m)=>(
//         <Text key={m} style={[styles.cell, { width: 120, textAlign:"right" }]}>{m}</Text>
//       ))}
//     </View>
//   );

//   const renderRow = (row: TableRow) => {
//     const total = row.balances.reduce((sum,b)=>sum+b,0);
//     const [zone, subClass] = row.cc3code 
//       ? row.cc3code.split('.').map(s=>s.trim()) 
//       : ["",""];
    
//     return (
//       <View style={styles.row}>
//         <Text style={[styles.cell, { width: 100 }]}>{row.type}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{row.component}</Text>
//         <Text style={[styles.cell, { width: 150 }]}>{row.accountnoname}</Text>
//         <Text style={[styles.cell, { width: 120 }]}>{zone}</Text>
//         <Text style={[styles.cell, { width: 120 }]}>{subClass}</Text>
//         <Text style={[styles.cell, { width: 120, textAlign:"right" }]}>{total.toFixed(2)}</Text>
//         {row.balances.map((b, idx)=>(
//           <Text key={idx} style={[styles.cell, { width:120, textAlign:"right" }]}>{b.toFixed(2)}</Text>
//         ))}
//       </View>
//     );
//   };

//   if(loading){
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={Colors.PrimaryColor}/>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <CustomHeader title={`${item.companyName}`} />
//       <ScrollView horizontal>
//         <SectionList
//           sections={sections}
//           keyExtractor={item=>item.id.toString()}
//           renderSectionHeader={({section})=>(
//             <View>
//               <View style={[styles.row, {backgroundColor:"#eee", borderBottomWidth:2}]}>
//                 <Text style={[styles.cell, { fontWeight:"bold", fontSize:16 }]}>{section.title}</Text>
//               </View>
//               {renderHeader()}
//             </View>
//           )}
//           renderItem={({item})=>renderRow(item)}
//           initialNumToRender={20}
//           maxToRenderPerBatch={20}
//           windowSize={10}
//           removeClippedSubviews
//         />
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex:1,
//     backgroundColor:Colors.White,
//     paddingHorizontal: width>600?24:10,
//     paddingTop: width>600?20:35
//   },
//   row:{
//     flexDirection:"row",
//     paddingVertical:8,
//     borderBottomWidth:1,
//     borderColor:"#ddd"
//   },
//   header:{
//     backgroundColor: Colors.Bg,
//     borderBottomWidth:2
//   },
//   cell:{
//     paddingHorizontal:8,
//     fontSize: width>600?16:12,
//     textAlign:"center"
//   },
//   centered:{
//     flex:1,
//     justifyContent:"center",
//     alignItems:"center"
//   }
// });
