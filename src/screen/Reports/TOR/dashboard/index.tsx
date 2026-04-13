import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors } from '../../../../themes/color';
import CustomHeader from '../../../../component/customHeader';

const API_URL = 'https://financesystemawh-rtjt.onrender.com/api/tenant';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ROW_HEIGHT = 48;

const TOR_Dashboard = ({ navigation }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const leftScrollRef  = useRef(null);
  const rightScrollRef = useRef(null);
  const isSyncingLeft  = useRef(false);
  const isSyncingRight = useRef(false);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
          const years = [...new Set(json.data.map(d => d.year))].sort((a, b) => b - a);
          setSelectedYear(years[0]);
        }
      })
      .catch(err => console.log('API Error:', err))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() =>
    [...new Set(data.map(d => d.year))].sort((a, b) => b - a),
  [data]);

  const filteredData = useMemo(() =>
    data.filter(item => {
      const matchYear   = selectedYear ? item.year === selectedYear : true;
      const matchSearch = item.tenantName?.toLowerCase().includes(search.toLowerCase());
      return matchYear && matchSearch;
    }),
  [data, selectedYear, search]);

  const grouped = useMemo(() => {
    const map = {};
    filteredData.forEach(item => {
      if (!map[item.tenantName]) {
        map[item.tenantName] = {
          tenantName: item.tenantName,
          percentage: item.percentage,
          baseRent:   item.baseRent,
          months:     {},
        };
      }
      map[item.tenantName].months[item.month] = {
        revenue: item.totalRevenue,
        tor:     item.tor,
      };
    });
    return Object.values(map);
  }, [filteredData]);

  const activeMonths = useMemo(() =>
    MONTHS.filter(m => filteredData.some(d => d.month === m)),
  [filteredData]);

  const onLeftScroll = (e) => {
    if (isSyncingLeft.current) return;
    isSyncingRight.current = true;
    rightScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
    setTimeout(() => { isSyncingRight.current = false; }, 50);
  };

  const onRightScroll = (e) => {
    if (isSyncingRight.current) return;
    isSyncingLeft.current = true;
    leftScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
    setTimeout(() => { isSyncingLeft.current = false; }, 50);
  };

  // ── FREEZE HEADER ──────────────────────────────────────────
  const renderFreezeHeader = () => (
    <View>
      {/* ROW 1 - merged title - same height as month row */}
      <View style={[styles.tableRow, { backgroundColor: Colors.PrimaryColor }]}>
        <View style={[
          styles.headerCell,
          { width: styles.freezeCol.width + styles.smallCol.width * 2, borderRightWidth: 0 }
        ]}>
          <Text style={styles.headerTextLarge}>Turnover Rent</Text>
        </View>
      </View>

      {/* ROW 2 - column titles - same height as Revenue/Turnover row */}
      <View style={styles.tableRow}>
        <View style={[styles.freezeCol, styles.headerCell]}>
          <Text style={styles.headerText}>Brand Name</Text>
        </View>
        <View style={[styles.smallCol, styles.headerCell]}>
          <Text style={styles.headerText}>%</Text>
        </View>
        <View style={[styles.smallCol, styles.headerCell]}>
          <Text style={styles.headerText}>Base Rent</Text>
        </View>
      </View>
    </View>
  );

  // ── SCROLL HEADER ──────────────────────────────────────────
  const renderScrollHeader = () => (
    <View>
      {/* ROW 1 - month names */}
      <View style={styles.tableRow}>
        {activeMonths.map(month => (
          <View
            key={month}
            style={[
              styles.headerCell,
              { width: styles.monthCol.width * 2, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
            ]}
          >
            <Text style={styles.headerTextLarge}>{month}</Text>
          </View>
        ))}
      </View>

      {/* ROW 2 - Revenue / Turnover */}
      <View style={styles.tableRow}>
        {activeMonths.map(month => (
          <React.Fragment key={month}>
            <View style={[styles.monthCol, styles.headerCell]}>
              <Text style={styles.headerText}>Revenue</Text>
            </View>
            <View style={[styles.monthCol, styles.headerCell]}>
              <Text style={styles.headerText}>Turnover</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  // ── FREEZE ROW ─────────────────────────────────────────────
  // Background white — same as right table white rows (no even/odd here)
  const renderFreezeRow = (tenant, index) => (
    <View
      key={tenant.tenantName}
      style={[styles.tableRow, { height: ROW_HEIGHT, backgroundColor: '#FFFFFF' }]}
    >
      <View style={[styles.freezeCol, styles.dataCell]}>
        <Text style={styles.dataText} numberOfLines={1}>{tenant.tenantName}</Text>
      </View>
      <View style={[styles.smallCol, styles.dataCell]}>
        <Text style={styles.dataText}>{tenant.percentage}%</Text>
      </View>
      <View style={[styles.smallCol, styles.dataCell]}>
        <Text style={styles.dataText}>{tenant.baseRent?.toLocaleString()}</Text>
      </View>
    </View>
  );

  // ── SCROLL ROW ─────────────────────────────────────────────
  // Even/odd per MONTH column (not per row)
  const renderScrollRow = (tenant, index) => (
    <View
      key={tenant.tenantName}
      style={[styles.tableRow, { height: ROW_HEIGHT, backgroundColor: '#FFFFFF' }]}
    >
      {activeMonths.map((month, i) => {
        const rev    = tenant.months[month]?.revenue;
        const tor    = tenant.months[month]?.tor;
        const monthBg = i % 2 === 0 ? '#FFFFFF' : '#F2F3F4';
        return (
          <React.Fragment key={month}>
            <View style={[styles.monthCol, styles.dataCell, { backgroundColor: monthBg }]}>
              <Text style={styles.dataText}>
                {rev != null ? rev.toLocaleString() : '-'}
              </Text>
            </View>
            <View style={[styles.monthCol, styles.dataCell, { backgroundColor: monthBg }]}>
              <Text style={styles.dataText}>
                {tor != null ? tor.toLocaleString() : '-'}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <>
      <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>

        {/* HEADER */}
        <View style={styles.header}>
          <CustomHeader title="Back" />
          <View style={styles.actionsWrap}>

            <TextInput
              style={styles.searchInput}
              placeholder="Search tenant..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />

            <Pressable
              onPress={() => navigation.navigate('AddTOR')}
              style={[styles.actionBtn, { backgroundColor: '#fff', borderColor: Colors.PrimaryColor, borderWidth: 2 }]}
            >
              <Text style={[styles.actionText, { color: Colors.PrimaryColor }]}>Add TOR</Text>
            </Pressable>

            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={() => setShowYearDropdown(!showYearDropdown)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>
                  {selectedYear ? `Year: ${selectedYear}` : 'Select Year'}
                </Text>
              </Pressable>
              {showYearDropdown && (
                <View style={styles.dropdown}>
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={styles.dropItem}
                      onPress={() => { setSelectedYear(year); setShowYearDropdown(false); }}
                    >
                      <Text style={[
                        styles.dropText,
                        selectedYear === year && { color: Colors.PrimaryColor, fontWeight: '700' }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

          </View>
        </View>

        {/* TABLE */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.PrimaryColor} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row' }}>

            {/* LEFT — FREEZE */}
            <View style={styles.freezeWrapper}>
              {renderFreezeHeader()}
              <ScrollView
                ref={leftScrollRef}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                onScroll={onLeftScroll}
                scrollEventThrottle={16}
              >
                {grouped.map((tenant, index) => renderFreezeRow(tenant, index))}
              </ScrollView>
            </View>

            {/* RIGHT — SCROLL */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
              <View>
                {renderScrollHeader()}
                <ScrollView
                  ref={rightScrollRef}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  onScroll={onRightScroll}
                  scrollEventThrottle={16}
                >
                  {grouped.map((tenant, index) => renderScrollRow(tenant, index))}
                </ScrollView>
              </View>
            </ScrollView>

          </View>
        )}

      </SafeAreaView>
    </>
  );
};

export default TOR_Dashboard;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    borderBottomWidth: 0.4,
    borderColor: '#000000',
  },
  actionsWrap: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    height: 36,
    width: 140,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    backgroundColor: '#f9f9f9',
    color: '#000',
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.PrimaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 9999,
    elevation: 8,
  },
  dropItem: { padding: 12 },
  dropText: { fontSize: 13, color: '#333' },

  // freezeWrapper: {
  //   borderRightWidth: 1,
  //   borderColor: Colors.PrimaryColor,
  // },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  rowAlt: { backgroundColor: '#f9f9f9' },
  headerCell: {
    backgroundColor: Colors.PrimaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRightWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRightWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  headerTextLarge: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  dataText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  freezeCol: { width: 130 },
  smallCol:  { width: 80  },
  monthCol:  { width: 100 },
});


// import React, { useEffect, useState, useMemo, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   Pressable,
//   StyleSheet,
//   ActivityIndicator,
//   ScrollView,
//   SafeAreaView,
//   StatusBar,
// } from 'react-native';
// import { Colors } from '../../../../themes/color';
// import CustomHeader from '../../../../component/customHeader';

// const API_URL = 'https://financesystemawh-rtjt.onrender.com/api/tenant';
// const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// const ROW_HEIGHT = 48;

// const TOR_Dashboard = ({ navigation }) => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [selectedYear, setSelectedYear] = useState(null);
//   const [showYearDropdown, setShowYearDropdown] = useState(false);

//   const leftScrollRef = useRef(null);
//   const rightScrollRef = useRef(null);
//   const isSyncingLeft = useRef(false);
//   const isSyncingRight = useRef(false);

//   useEffect(() => {
//     fetch(API_URL)
//       .then(res => res.json())
//       .then(json => {
//         if (json.success) {
//           setData(json.data);
//           const years = [...new Set(json.data.map(d => d.year))].sort((a, b) => b - a);
//           setSelectedYear(years[0]);
//         }
//       })
//       .catch(err => console.log('API Error:', err))
//       .finally(() => setLoading(false));
//   }, []);

//   const years = useMemo(() => {
//     return [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
//   }, [data]);

//   const filteredData = useMemo(() => {
//     return data.filter(item => {
//       const matchYear = selectedYear ? item.year === selectedYear : true;
//       const matchSearch = item.tenantName?.toLowerCase().includes(search.toLowerCase());
//       return matchYear && matchSearch;
//     });
//   }, [data, selectedYear, search]);

//   const grouped = useMemo(() => {
//     const map = {};
//     filteredData.forEach(item => {
//       if (!map[item.tenantName]) {
//         map[item.tenantName] = {
//           tenantName: item.tenantName,
//           percentage: item.percentage,
//           baseRent: item.baseRent,
//           months: {},
//         };
//       }
//       map[item.tenantName].months[item.month] = {
//         revenue: item.totalRevenue,
//         tor: item.tor,
//       };
//     });
//     return Object.values(map);
//   }, [filteredData]);

//   const activeMonths = useMemo(() => {
//     return MONTHS.filter(m => filteredData.some(d => d.month === m));
//   }, [filteredData]);

//   const onLeftScroll = (e) => {
//     if (isSyncingLeft.current) return;
//     isSyncingRight.current = true;
//     rightScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
//     setTimeout(() => { isSyncingRight.current = false; }, 50);
//   };

//   const onRightScroll = (e) => {
//     if (isSyncingRight.current) return;
//     isSyncingLeft.current = true;
//     leftScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
//     setTimeout(() => { isSyncingLeft.current = false; }, 50);
//   };

//   const renderFreezeHeader = () => (
//     <View>
//       {/* ROW 1 - Turnover Rent title */}
//       <View style={[styles.tableRow, { backgroundColor: Colors.PrimaryColor }]}>
//   <View style={[
//     styles.headerCell,
//     { 
//       width: styles.freezeCol.width + styles.smallCol.width + styles.smallCol.width,
//       borderRightWidth: 0,
//     }
//   ]}>
//     <Text style={styles.headerText}>Turnover Rent</Text>
//   </View>
// </View>
  
//       {/* ROW 2 - column titles */}
//       <View style={styles.tableRow}>
//         <View style={[styles.freezeCol, styles.headerCell]}>
//           <Text style={styles.headerText}>Brand Name</Text>
//         </View>
//         <View style={[styles.smallCol, styles.headerCell]}>
//           <Text style={styles.headerText}>%</Text>
//         </View>
//         <View style={[styles.smallCol, styles.headerCell]}>
//           <Text style={styles.headerText}>Base Rent</Text>
//         </View>
//       </View>
//     </View>
//   );

//   const renderScrollHeader = () => (
//     <View>
//       {/* ROW 1 — month names */}
//       <View style={styles.tableRow}>
//         {activeMonths.map((month, i) => (
//           <View
//             key={month}
//             style={[
//               styles.headerCell,
//               {
//                 width: styles.monthCol.width * 2,
//                 borderRightWidth: 1,
//                 borderColor: 'rgba(255,255,255,0.3)',
//               },
//             ]}
//           >
//             <Text style={styles.headerTextLarge}>{month}</Text>
//           </View>
//         ))}
//       </View>
  
//       {/* ROW 2 — Revenue / Turnover */}
//       <View style={styles.tableRow}>
//         {activeMonths.map((month) => (
//           <React.Fragment key={month}>
//             <View style={[styles.monthCol, styles.headerCell]}>
//               <Text style={styles.headerText}>Revenue</Text>
//             </View>
//             <View style={[styles.monthCol, styles.headerCell]}>
//               <Text style={styles.headerText}>Turnover</Text>
//             </View>
//           </React.Fragment>
//         ))}
//       </View>
//     </View>
//   );


//   const renderFreezeRow = (tenant, index) => (
//     <View
//       key={tenant.tenantName}
//       style={[styles.tableRow, { height: ROW_HEIGHT }, index % 2 === 0 && styles.rowAlt]}
//     >
//       <View style={[styles.freezeCol, styles.dataCell]}>
//         <Text style={styles.dataText} numberOfLines={1}>{tenant.tenantName}</Text>
//       </View>
//       <View style={[styles.smallCol, styles.dataCell]}>
//         <Text style={styles.dataText}>{tenant.percentage}%</Text>
//       </View>
//       <View style={[styles.smallCol, styles.dataCell]}>
//         <Text style={styles.dataText}>{tenant.baseRent?.toLocaleString()}</Text>
//       </View>
//     </View>
//   );

//   const renderScrollRow = (tenant, index) => (
//   <View
//     key={tenant.tenantName}
//     style={[styles.tableRow, { height: ROW_HEIGHT }]}
//   >
//     {activeMonths.map((month, i) => {
//       const rev = tenant.months[month]?.revenue;
//       const tor = tenant.months[month]?.tor;
//       const monthBg = i % 2 === 0 ? '#FFFFFF' : '#F2F3F4'; // white / light gray
//       return (
//         <React.Fragment key={month}>
//           <View style={[styles.monthCol, styles.dataCell, { backgroundColor: monthBg }]}>
//             <Text style={styles.dataText}>
//               {rev != null ? rev.toLocaleString() : '-'}
//             </Text>
//           </View>
//           <View style={[styles.monthCol, styles.dataCell, { backgroundColor: monthBg }]}>
//             <Text style={styles.dataText}>
//               {tor != null ? tor.toLocaleString() : '-'}
//             </Text>
//           </View>
//         </React.Fragment>
//       );
//     })}
//   </View>
// );
//   return (
//     <>
//       <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
//       <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>

//         {/* HEADER */}
//         <View style={styles.header}>
//           <CustomHeader title="Back" />
//           <View style={styles.actionsWrap}>

//             {/* SEARCH */}
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Search tenant..."
//               placeholderTextColor="#999"
//               value={search}
//               onChangeText={setSearch}
//             />

//             {/* ADD TOR */}
//             <Pressable
//               onPress={() => navigation.navigate('AddTOR')}
//               style={[styles.actionBtn, { backgroundColor: '#fff', borderColor: Colors.PrimaryColor, borderWidth: 2 }]}
//             >
//               <Text style={[styles.actionText, { color: Colors.PrimaryColor }]}>Add TOR</Text>
//             </Pressable>

//             {/* YEAR DROPDOWN */}
//             <View style={{ position: 'relative' }}>
//               <Pressable
//                 onPress={() => setShowYearDropdown(!showYearDropdown)}
//                 style={styles.actionBtn}
//               >
//                 <Text style={styles.actionText}>
//                   {selectedYear ? `Year: ${selectedYear}` : 'Select Year'}
//                 </Text>
//               </Pressable>
//               {showYearDropdown && (
//                 <View style={styles.dropdown}>
//                   {years.map(year => (
//                     <TouchableOpacity
//                       key={year}
//                       style={styles.dropItem}
//                       onPress={() => {
//                         setSelectedYear(year);
//                         setShowYearDropdown(false);
//                       }}
//                     >
//                       <Text style={[
//                         styles.dropText,
//                         selectedYear === year && { color: Colors.PrimaryColor, fontWeight: '700' }
//                       ]}>
//                         {year}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               )}
//             </View>

//           </View>
//         </View>

//         {/* TABLE */}
//         {loading ? (
//           <ActivityIndicator size="large" color={Colors.PrimaryColor} style={{ marginTop: 40 }} />
//         ) : (
//           <View style={{ flex: 1, flexDirection: 'row' }}>

//             {/* LEFT - FREEZE COLUMNS */}
//             <View style={styles.freezeWrapper}>
//               {renderFreezeHeader()}
//               <ScrollView
//                 ref={leftScrollRef}
//                 scrollEnabled={true}
//                 showsVerticalScrollIndicator={false}
//                 showsHorizontalScrollIndicator={false}
//                 onScroll={onLeftScroll}
//                 scrollEventThrottle={16}
//               >
//                 {grouped.map((tenant, index) => renderFreezeRow(tenant, index))}
//               </ScrollView>
//             </View>

//             {/* RIGHT - SCROLLABLE COLUMNS */}
//             <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
//               <View>
//                 {renderScrollHeader()}
//                 <ScrollView
//                   ref={rightScrollRef}
//                   showsVerticalScrollIndicator={false}
//                   showsHorizontalScrollIndicator={false}
//                   onScroll={onRightScroll}
//                   scrollEventThrottle={16}
//                 >
//                   {grouped.map((tenant, index) => renderScrollRow(tenant, index))}
//                 </ScrollView>
//               </View>
//             </ScrollView>

//           </View>
//         )}

//       </SafeAreaView>
//     </>
//   );
// };

// export default TOR_Dashboard;

// const styles = StyleSheet.create({
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingRight: 20,
//     borderBottomWidth: 0.4,
//     borderColor: '#000000',

//   },
//   actionsWrap: {
//     flexDirection: 'row',
//     gap: 8,
//     alignItems: 'center',
//   },
//   searchInput: {
//     height: 36,
//     width: 140,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     fontSize: 12,
//     backgroundColor: '#f9f9f9',
//     color: '#000',
//   },
//   actionBtn: {
//     height: 36,
//     paddingHorizontal: 12,
//     borderRadius: 8,
//     backgroundColor: Colors.PrimaryColor,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   actionText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '700',
//   },
//   dropdown: {
//     position: 'absolute',
//     top: 40,
//     right: 0,
//     width: 120,
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     zIndex: 9999,
//     elevation: 8,
//   },
//   headerTextLarge: {    // ← ADD THIS
//     color: '#fff',
//     fontSize: 13,
//     fontWeight: '800',
//     textAlign: 'center',
//   },
//   dropItem: { padding: 12 },
//   dropText: { fontSize: 13, color: '#333' },

 
//   tableRow: {
//     flexDirection: 'row',
//     borderBottomWidth: 0.5,
//     borderColor: '#e0e0e0',
//   },
//   rowAlt: { backgroundColor: '#f9f9f9' },
//   headerCell: {
//     backgroundColor: Colors.PrimaryColor,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 10,
//     borderRightWidth: 0.5,
//     borderColor: 'rgba(255,255,255,0.3)',
//   },
//   dataCell: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 10,
//     borderRightWidth: 0.5,
//     borderColor: '#e0e0e0',
//   },
//   headerText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   dataText: {
//     fontSize: 12,
//     color: '#333',
//     textAlign: 'center',
//   },
//   freezeCol: { width: 130 },
//   smallCol: { width: 80 },
//   monthCol: { width: 100 },
// });