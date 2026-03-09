// src/screens/RfpListByCompany.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';
import Container from '../../../ui/useLayout';

const { width } = Dimensions.get('window');

export default function RfpListByCompany({ navigation }: any) {
  const route = useRoute<any>();
  const title = route?.params?.title ?? '';
  const RFPList = route?.params?.RFPList ?? [];

  const contentPadding = width > 600 ? 24 : 16;

  const renderItem = ({ item }: any) => {
    const dateText = item?.Date ? new Date(item.Date).toLocaleDateString() : '-';
    const amountText = `${item?.Amount ?? '-'} ${item?.Currency ?? ''}`.trim();

    return (
      <View style={styles.card}>
        <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titleText} numberOfLines={2}>
              {item.Description || 'RFP'}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                PPSeq #{item.PPaSeq}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.AccountName || '-'}
              </Text>
            </View>

            <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Date: {dateText}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              Company: {item.CompanyName || '-'}
            </Text>
          </View>
        </View>
          </View>
          

          <View style={{justifyContent:'space-between',width:'150'}} >
          <View style={styles.amountPill}>
            <Text style={styles.amountText} numberOfLines={1}>
              {amountText}
            </Text>
          </View>
          <TouchableOpacity
          style={styles.button}
          activeOpacity={0.9}
          onPress={() => {
            const url = item?.HyperlinkPPaSeq;
            let finalUrl = url;

            // ✅ correct regex for http OR https
            if (url && !/^https?:\/\//i.test(url)) {
              finalUrl = `http://78.100.143.83:9507/${url}`;
            }

            navigation.navigate('WebView', { url: finalUrl });
          }}
        >
          <Text style={styles.buttonText}>Open RFP</Text>
        </TouchableOpacity>
          </View>
        </View>


 
      </View>
    );
  };

  return (
 <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <View style={styles.header}>
        <CustomHeader title="RFP List" />
      </View>

      <FlatList
        data={RFPList}
        keyExtractor={(item: any) => String(item?.PPaSeq ?? Math.random())}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: contentPadding,
          paddingVertical: 20,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={renderItem}
      />
    </Container>
  );
}

const styles = StyleSheet.create({


  header: { borderBottomWidth: 0.4 },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.55)',
  },

  card: {
    backgroundColor: Colors.White,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.Black,
    lineHeight: 20,
  },

  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.55)',
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginHorizontal: 8,
  },

  amountPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    maxWidth: 150,
    marginBottom:10
  },

  amountText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.PrimaryColor,
    textAlign: 'center',
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginTop:15
  },

  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.62)',
  },

  button: {
    marginTop:10,
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: Colors.White,
    fontSize: 12,
    fontWeight: '900',
  },
});


// // src/screens/LpoListScreen.tsx
// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';

// import {useRoute} from '@react-navigation/native';
// import {Colors} from '../../../themes/color';
// import CustomHeader from '../../../component/customHeader';
// const {width} = Dimensions.get('window');

// export default function RFPListScreen({navigation}) {
//   const route = useRoute();
//   const {RFPList} = route.params;

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <CustomHeader title="RFP list" />
//         {/* <Text style={styles.heading}>{title} - LPO Details</Text> */}
//       </View>
         
//       <FlatList
//         data={RFPList}
//         keyExtractor={item => item['PPaSeq'].toString()}
//         showsVerticalScrollIndicator={false}
//         renderItem={({item}) => (
//           <View style={styles.card}>
//             <Text style={styles.supplier}>Payment Preparation Sequence: {item.PPaSeq}</Text>
//             <Text style={styles.detail}>Account Name: {item.AccountName}</Text>
//             <Text style={styles.detail}>Description: {item.Description}</Text>
//             <Text style={styles.detail}>
//               Date: {new Date(item.Date).toLocaleDateString()}
//             </Text>
//             <Text style={styles.detail}>
//               Amount: {item.Amount} {item.Currency}
//             </Text>
//             {/* <Text style={styles.detail}>Requestor: {item.Requestor}</Text>
//             <Text style={styles.detail}>
//               Department: {item.Department || 'Unassigned'}
//             </Text> */}

          

//             <TouchableOpacity
//               style={styles.button}
//               onPress={() => {
//                 const url = item['HyperlinkPPaSeq'];
//                 console.log('url',    url)

//                 // Agar url already http/https se start nahi hota to usay prefix karo
//                 let finalUrl = url;
//                 if (!/^http?:\/\//i.test(url)) {
//                   finalUrl = `http://78.100.143.83:9507/${url}`; // apna domain prefix karo
//                 }
//                 console.log('final url',    finalUrl)


//                 // Navigate to WebView
//                 navigation.navigate('WebView', {url: finalUrl});
//               }}>
//               <Text style={styles.buttonText}>Open Link</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.Bg,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//     padding:20,

//   },
//   heading: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: Colors.PrimaryColor,
//   },
//   card: {
//     backgroundColor: Colors.White,
//     padding: 16,
//     borderRadius: 10,
//     marginHorizontal: 20,
//     marginTop:20,
//     borderWidth:0.2
  

//   },
//   supplier: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   detail: {
//     fontSize: 15,
//     color: Colors.Black,
//     marginBottom: 2,
//   },
//   button: {
//     marginTop: 16,
//     backgroundColor: Colors.PrimaryColor,
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: Colors.White,
//     fontSize: 14,
//     fontWeight: '600',
//   },
// });
