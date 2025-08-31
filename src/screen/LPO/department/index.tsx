// src/screens/DepartmentsScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';

export default function DepartmentsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { lpoList } = route.params;

  const grouped = _.groupBy(lpoList, item => item.Department || 'Unassigned');
  const departmentData = Object.entries(grouped).map(([department, items]) => ({
    department,
    count: items.length,
    items,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
       <CustomHeader title='Back' />
        <Text style={styles.headerTitle}>Departments</Text>
        <View style={{ width: 50 }} /> {/* Spacer for symmetry */}
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
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
    borderRadius: 12,
    marginBottom: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderLeftWidth: 6,
    borderLeftColor: Colors.PrimaryColor,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 3,
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
