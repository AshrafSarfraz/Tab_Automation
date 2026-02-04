// src/screens/DepartmentsScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';
const { width } = Dimensions.get('window');



export default function CompanyLpo() {
  const navigation = useNavigation();
  const route = useRoute();
  const { lpoList } = route.params;

  const grouped = _.groupBy(lpoList, item => item.Company || 'Unassigned');
  const departmentData = Object.entries(grouped).map(([department, items]) => ({
    department,
    count: items.length,
    items,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
       <CustomHeader title='Companies' />
      </View>

     <View style={{padding:width>600?30:20}} >
      {/* Department List */}
      <FlatList
        data={departmentData}
        keyExtractor={(item) => item.department}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('LpoList', {
              title: item.department,
              lpos: item.items
            })}
          >
            <View style={styles.cardContent}>
              <Text style={styles.department}>{item.department}</Text>
              <Text style={styles.pending}>{item.count} Pending</Text>
            </View>
          </TouchableOpacity>
        )}
        
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding:25,

  },
  backText: {
    fontSize: 16,
    color: Colors.PrimaryColor,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.Black,
  },card: {
    backgroundColor: Colors.White,
    borderRadius: 8,
    marginBottom: 14,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderLeftWidth: 6,
    borderLeftColor: Colors.PrimaryColor,
    borderWidth:0.3

  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  department: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Black,
  },
  pending: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.PrimaryColor,
  },
  
});
