// src/screens/RfpCompaniesScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';
import Container from '../../../ui/useLayout';

const { width } = Dimensions.get('window');

const NUM_COLUMNS = 3;
const SIDE_PADDING = width > 600 ? 28 : 16;
const GAP = width > 600 ? 18 : 12;

const CARD_WIDTH =
  (width - SIDE_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function RfpCompaniesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const RFPList = route?.params?.RFPList ?? [];

  const companyData = useMemo(() => {
    const grouped = _.groupBy(RFPList, (item: any) => item.CompanyName || 'Unassigned');
    return Object.entries(grouped).map(([company, items]: any) => ({
      company,
      count: items.length,
      items,
    }));
  }, [RFPList]);

  return (
     <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <View style={styles.header}>
        <CustomHeader title="RFP Companies" />
      </View>

      <FlatList
        data={companyData}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => item.company}
        contentContainerStyle={{
          paddingHorizontal: SIDE_PADDING,
          paddingTop: 18,
          paddingBottom: 24,
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
              style={styles.card}
              onPress={() =>
                navigation.navigate('RfpListByCompany', {
                  title: item.company,
                  RFPList: item.items,
                })
              }
            >
              <View style={styles.accentBar} />

              <View style={styles.cardBody}>
                <Text style={styles.companyName} numberOfLines={2}>
                  {item.company}
                </Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.count} Approvals</Text>
                </View>
              </View>

              <View style={styles.cornerDot} />
            </TouchableOpacity>
          </View>
        )}
      />
    </Container>
  );
}

const styles = StyleSheet.create({

  header: { borderBottomWidth: 0.4 },

  itemContainer: { width: CARD_WIDTH },

  card: {
    height: 160,
    borderRadius: 16,
    backgroundColor: Colors.White,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
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

  companyName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.Black,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 15,
    fontWeight: '800',
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
