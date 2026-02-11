// src/screens/LpoListScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Colors } from '../../../themes/color';
import CustomHeader from '../../../component/customHeader';

const { width } = Dimensions.get('window');

export default function LpoListScreen({ navigation }: any) {
  const route = useRoute<any>();
  const title = route?.params?.title ?? '';
  const lpos = route?.params?.lpos ?? [];

  const contentPadding = width > 600 ? 24 : 16;

  const renderItem = ({ item }: any) => {
    const dateText = item?.Date ? new Date(item.Date).toLocaleDateString() : '-';
    const amountText = `${item?.Amount ?? '-'} ${item?.Currency ?? ''}`.trim();

    return (
      <View style={styles.card}>
        {/* Top Row */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.company} numberOfLines={1}>
              {item.Company || 'Company'}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                LPO #{item['Lpo#']}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.Department || 'Unassigned'}
              </Text>
            </View>
          </View>

          <View style={styles.amountPill}>
            <Text style={styles.amountText} numberOfLines={1}>
              {amountText}
            </Text>
          </View>
        </View>

        {/* Info Chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Date: {dateText}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              Requestor: {item.Requestor || '-'}
            </Text>
          </View>
        </View>

        {/* Supplier + Description */}
        <Text style={styles.label}>Supplier</Text>
        <Text style={styles.value} numberOfLines={1}>
          {item.Supplier || '-'}
        </Text>

        <Text style={[styles.label, { marginTop: 10 }]}>Description</Text>
        <Text style={styles.value} numberOfLines={3}>
          {item.Description || '-'}
        </Text>

        {/* Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.9}
          onPress={() => {
            const url = item['hyperlink_Lpo#'];
            let finalUrl = url;

            if (url && !/^https?:\/\//i.test(url)) {
              finalUrl = `http://185.247.89.149:9507/${url}`;
            }

            navigation.navigate('WebView', { url: finalUrl });
          }}
        >
          <Text style={styles.buttonText}>Open LPO</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CustomHeader title="LPO List" />
      </View>

      <FlatList
        data={lpos}
        keyExtractor={(item: any) => String(item?.['Lpo#'] ?? Math.random())}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: contentPadding, paddingVertical: 24, }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Bg,
  },

  header: {
    paddingBottom: 16,
    borderBottomWidth: 0.4,
  },

  headerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.55)',
  },

  card: {
    backgroundColor: Colors.White,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor:"#000000"

  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  company: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.Black,
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
    maxWidth: 140,
  },

  amountText: {
    fontSize: 12,
    fontWeight: '800',
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
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.62)',
  },

  label: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.45)',
  },

  value: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Black,
    lineHeight: 20,
  },

  button: {
    marginTop: 16,
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: Colors.White,
    fontSize: 14,
    fontWeight: '800',
  },
});
