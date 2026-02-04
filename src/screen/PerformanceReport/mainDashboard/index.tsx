import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Pressable,
  Text,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Container from '../../../ui/useLayout';
import { Colors } from '../../../themes/color';
import { Back } from '../../../themes/images';

import HomeRevenueChart from '../Hommme';
import PnLSummaryCards from '../../../component/companyCard';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const companies = [
  { id: 1, name: 'Al Wessil Holding', logo: Back },
  { id: 2, name: 'West Walk Real Estate', logo: Back },
  { id: 3, name: 'West Walk Advertisement', logo: Back },
  { id: 4, name: 'Assets Services Company', logo: Back },
  { id: 5, name: 'MNO Ltd.', logo: Back },
  { id: 6, name: 'PQR Co.', logo: Back },
];

const YEARS = [2023, 2024, 2025, 2026];

const MainDashboard = ({navigation}) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  // ✅ default company: West Walk Real Estate
  const defaultCompany =
    companies.find((c) => c.name === 'West Walk Real Estate') || companies[0];

  const [collapsed, setCollapsed] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<number>(defaultCompany.id);

  // ✅ default year
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // ✅ custom dropdown open/close
  const [showYears, setShowYears] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();

    setCollapsed(!collapsed);
  };

  const onCompanyPress = (company: any) => {
    setSelectedCompany(company.id);
  };

  const selectedCompanyObj = companies.find((c) => c.id === selectedCompany);

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <View style={styles.Container}>
        {/* LEFT SIDEBAR */}
        <Animated.View style={[styles.LeftSide, { width: sidebarAnim }]}>
          <View style={styles.LeftContainer}>
            <View style={styles.leftHeader}>
              <TouchableOpacity style={styles.headerCont} onPress={()=>{navigation.goBack()}} >
                <Image source={Back} style={styles.backIcon} />
              </TouchableOpacity>

              <Pressable onPress={toggleSidebar} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnIcon}>{collapsed ? '>>' : '<<'}</Text>
              </Pressable>
            </View>

            <View style={styles.sidebarContent}>
              {!collapsed && <Text style={styles.sidebarTitle}>Companies</Text>}

              <View style={styles.CmpCont}>
                {companies.map((c) => {
                  const iconSize = collapsed ? 30 : 22;
                  const isSelected = selectedCompany === c.id;

                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.companyItem,
                        { justifyContent: collapsed ? 'center' : 'flex-start' },
                        isSelected && { backgroundColor: Colors.PrimaryColor },
                      ]}
                      onPress={() => onCompanyPress(c)}
                    >
                      <Image
                        source={c.logo}
                        style={{
                          width: iconSize,
                          height: iconSize,
                          borderRadius: 6,
                          tintColor: isSelected ? '#fff' : '#000',
                        }}
                      />
                      {!collapsed && (
                        <Text style={[styles.companyName, isSelected && { color: '#fff' }]}>
                          {c.name}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* RIGHT CONTENT */}
        <View style={styles.RightSide}>
          {/* ✅ overlay to close dropdown when tapping anywhere */}
          <Pressable style={{ flex: 1 }} onPress={() => showYears && setShowYears(false)}>
            {/* ✅ Custom Year Dropdown */}
            <View style={styles.topBar}>
              <Text style={styles.label}>Year:</Text>

              <Pressable
                style={styles.yearBox}
                onPress={() => setShowYears((p) => !p)}
              >
                <Text style={styles.yearText}>{selectedYear}</Text>
                <Text style={styles.arrow}>{showYears ? '▲' : '▼'}</Text>
              </Pressable>
            </View>

            {/* ✅ Absolute Dropdown (won’t disturb below components) */}
            {showYears && (
              <View style={styles.dropdown}>
                {YEARS.map((y) => (
                  <Pressable
                    key={y}
                    style={styles.dropItem}
                    onPress={() => {
                      setSelectedYear(y);
                      setShowYears(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropText,
                        y === selectedYear && { fontWeight: '800', color: Colors.PrimaryColor },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
             <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>
                {selectedCompanyObj?.name}
              </Text>

              <Text style={{ fontSize: 14, color: '#666', marginTop: 6 }}>
                Showing data for year: {selectedYear}
              </Text>
            </View>

            {/* ✅ PnL Cards */}
            <View style={{ marginTop: 16 }}>
              <PnLSummaryCards company={selectedCompanyObj?.name || ''} year={selectedYear} />
            </View>

            <View style={{ marginTop: 16 }}>
              <HomeRevenueChart/>
            </View>

            

          </Pressable>
        </View>
      </View>
    </Container>
  );
};

export default MainDashboard;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    flexDirection: 'row',
  },
  LeftSide: {
    height: SCREEN_HEIGHT,
    paddingVertical: 20,
    borderRightWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  LeftContainer: {},
  leftHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerCont: {},
  backIcon: { width: 24, height: 24, tintColor: '#000' },
  toggleBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.PrimaryColor,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  toggleBtnIcon: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sidebarContent: {
    marginTop: 20,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },
  sidebarTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15, color: '#333' },
  CmpCont: { flex: 1, justifyContent: 'flex-start' },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
    paddingVertical: 6,
  },
  companyName: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#000' },

  RightSide: {
    flex: 1,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 20,
    position: 'relative', // ✅ required for absolute dropdown
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 2,
  },
  label: { fontSize: 14, fontWeight: '700', color: '#222' },

  yearBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: '#FAFAFA',
    minWidth: 140,
  },
  yearText: { fontSize: 14, fontWeight: '600', color: '#222' },
  arrow: { fontSize: 12, color: '#666' },

  // ✅ ABSOLUTE dropdown so it doesn't push other content
  dropdown: {
    position: 'absolute',
    top: 62,     // adjust if needed
    left: 62,    // aligns under dropdown box
    width: 140,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FFF',
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },

  dropItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropText: {
    fontSize: 14,
    color: '#222',
  },
});
