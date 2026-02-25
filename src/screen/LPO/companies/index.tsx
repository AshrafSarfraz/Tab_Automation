// src/screens/DepartmentsScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';

const { width } = Dimensions.get('window');

const NUM_COLUMNS = 3;
const SIDE_PADDING = width > 600 ? 28 : 16;
const GAP = width > 600 ? 18 : 12;

const CARD_WIDTH =
  (width - SIDE_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function CompanyLpo() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const lpoList = route?.params?.lpoList ?? [];

  const departmentData = useMemo(() => {
    const grouped = _.groupBy(lpoList, (item: any) => item.Company || 'Unassigned');
    return Object.entries(grouped).map(([department, items]: any) => ({
      department,
      count: items.length,
      items,
    }));
  }, [lpoList]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <View style={styles.header}>
        <CustomHeader title="Companies" />
      </View>

      <FlatList
        data={departmentData}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.department}
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING,
          paddingBottom: 24,
          paddingTop: 18,
        }}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: GAP,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('LpoList', {
                  title: item.department,
                  lpos: item.items,
                })
              }
              style={styles.card}
            >
              {/* Top Accent */}
              <View style={styles.accentBar} />

              {/* Main Content */}
              <View style={styles.cardBody}>
                <Text style={styles.department} numberOfLines={2}>
                  {item.department}
                </Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.count} Pending</Text>
                </View>
              </View>

              {/* Small cute corner dot */}
              <View style={styles.cornerDot} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,
    justifyContent:"center"
  },

  header: {
    borderBottomWidth: 0.4,
  },

  itemContainer: {
    width: CARD_WIDTH,
    alignSelf:"center"
    
  },

  card: {
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.White,

    // subtle border
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',

    // shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,

    // shadow (Android)
    elevation: 4,

    overflow: 'hidden',
    position: 'relative',
  },

  accentBar: {
    height: 8,
    width: '100%',
    backgroundColor: Colors.PrimaryColor,
    opacity: 0.9,
  },

  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  department: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Black,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.PrimaryColor,
  },

  cornerDot: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.PrimaryColor,
    opacity: 0.35,
  },
});
