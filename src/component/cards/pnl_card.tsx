import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../themes/color';


const { width } = Dimensions.get('window');

const PnlCardModern = () => {
  const isTablet = width > 600;

  const metrics = [
    { label: 'Net Profit', value: '2,661,211 QAR', color: Colors.Green, },
    { label: 'Total Revenue', value: '5,200,000 QAR', color: Colors.Green,  },
    { label: 'Total Expense', value: '2,538,789 QAR', color: 'red', },
  
  ];

  return (
    <View style={styles.card}>
    
      <View style={[styles.row, { flexDirection: isTablet ? 'row' : 'column' }]}>
        {metrics.map((metric, index) => (
          <View
            key={index}
            style={[styles.metricBox, { width: isTablet ? '32%' : '100%' }]}
          >
            {/* <Ionicons name={metric.icon as any} size={24} color={metric.color} style={styles.icon} /> */}
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: Colors.Black,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 30,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth:0.2,
    borderColor:Colors.Grey
  },
  icon: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.Black,
    marginBottom: 6,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default PnlCardModern;




// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { Colors } from '../../themes/color';

// const PnlCard = () => {
//   return (
//     <View style={styles.card}>
//       <Text style={styles.title}>AWH Company Summary</Text>
//       <View style={styles.row}>
//         <View style={styles.metric}>
//           <Text style={styles.label}>Total Revenue</Text>
//           <Text style={[styles.value, { color: Colors.Green }]}>5,200,000 QAR</Text>
//         </View>
//         <View style={styles.metric}>
//           <Text style={styles.label}>Total Expense</Text>
//           <Text style={[styles.value, { color: Colors.Red }]}>2,538,789 QAR</Text>
//         </View>
//         <View style={styles.metric}>
//           <Text style={styles.label}>Net Profit</Text>
//           <Text style={[styles.value, { color: Colors.Green }]}>2,661,211 QAR</Text>
//         </View>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: 'white',
//     padding: 16,
//     borderRadius: 14,
//     marginVertical: 10,
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   title: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 12,
//     color: Colors.Black,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   metric: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   label: {
//     fontSize: 12,
//     color: Colors.Gray,
//     marginBottom: 4,
//   },
//   value: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });

// export default PnlCard;
