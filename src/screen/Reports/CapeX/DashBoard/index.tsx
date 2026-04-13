import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import {Colors} from '../../../../themes/color';
import {Back} from '../../../../themes/images';
import Container from '../../../../ui/useLayout';

const API_BASE = 'https://financesystemawh-rtjt.onrender.com';
const ENDPOINT = `${API_BASE}/CapexBalance`;

const formatNumber = (num: any) =>
  Number(num || 0).toLocaleString('en-US', {maximumFractionDigits: 0});

const BudgtedDashboard = ({navigation}: any) => {
  const MIN_WIDTH = 100;
  const MAX_WIDTH = 220;

  const {width} = useWindowDimensions();
  const isWide = width > 700;

  const [collapsed, setCollapsed] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(MAX_WIDTH)).current;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load data');

      const safeData = Array.isArray(data) ? data : [];
      setRows(safeData);

      const uniqueProjects = [
        ...new Set(
          safeData
            .map(item => String(item.Project || '').trim())
            .filter(Boolean),
        ),
      ].map((name, index) => ({id: index + 1, name}));

      setProjects(uniqueProjects);
      if (uniqueProjects.length > 0) {
        setSelectedProject(prev => prev || uniqueProjects[0].name);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: collapsed ? MAX_WIDTH : MIN_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setCollapsed(!collapsed);
  };

  const selectedProjectRows = useMemo(() => {
    return rows.filter(
      item => String(item.Project || '').trim() === selectedProject,
    );
  }, [rows, selectedProject]);

  const costRows = useMemo(() => {
    return selectedProjectRows.filter(
      item => String(item.accountType || '').trim() === 'Cost',
    );
  }, [selectedProjectRows]);

  const netProfitRows = useMemo(() => {
    return selectedProjectRows.filter(
      item => String(item.accountType || '').trim() === 'NetProfit',
    );
  }, [selectedProjectRows]);

  const CostTable = ({data}) => {
    if (!data.length) return null;
    const totalAmount = data.reduce(
      (sum, item) => sum + Number(item.Amount || 0),
      0,
    );
    return (
      <View style={styles.tableSection}>
        <Text style={styles.tableTitle}>Cost</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={[styles.cell, styles.hCell, {width: 120}]}>
                Project
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 140}]}>
                Account Type
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 220}]}>
                Component
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 180}]}>
                Actual Amount
              </Text>
            </View>
            {data.map(item => (
              <View style={styles.row} key={item._id}>
                <Text style={[styles.cell, {width: 120}]} numberOfLines={1}>
                  {item.Project || ''}
                </Text>
                <Text style={[styles.cell, {width: 140}]} numberOfLines={1}>
                  {item.accountType || ''}
                </Text>
                <Text style={[styles.cell, {width: 220}]} numberOfLines={1}>
                  {item.component || ''}
                </Text>
                <Text style={[styles.cell, {width: 180}]} numberOfLines={1}>
                  {formatNumber(item.Amount)}
                </Text>
              </View>
            ))}
            {/* Total Row */}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cell, styles.totalCell, {width: 160}]}>
                Total
              </Text>
              <Text style={[styles.cell, {width: 160}]}></Text>
              <Text style={[styles.cell, {width: 160}]}></Text>
              <Text style={[styles.cell, styles.totalCell, {width: 180}]}>
                {formatNumber(totalAmount)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const NetProfitTable = ({data}) => {
    if (!data.length) return null;
    const totalWithFinance = data.reduce(
      (sum, item) => sum + Number(item.NetProfit || 0),
      0,
    );
    const totalWithoutFinance = data.reduce(
      (sum, item) => sum + Number(item.FinanceCost - item.NetProfit || 0),
      0,
    );
    return (
      <View style={styles.tableSection}>
        <Text style={styles.tableTitle}>Net Profit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.tableWrap}>
            <View style={[styles.row, styles.tableHeader]}>
              <Text style={[styles.cell, styles.hCell, {width: 120}]}>
                Project
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 140}]}>
                Year
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 220}]}>
                Profit With Finance
              </Text>
              <Text style={[styles.cell, styles.hCell, {width: 180}]}>
                Profit Without Finance
              </Text>
            </View>
            {data.map(item => (
              <View style={styles.row} key={item._id}>
                <Text style={[styles.cell, {width: 120}]} numberOfLines={1}>
                  {item.Project || ''}
                </Text>
                <Text style={[styles.cell, {width: 140}]} numberOfLines={1}>
                  {item.year || ''}
                </Text>
                <Text style={[styles.cell, {width: 220}]} numberOfLines={1}>
                  {formatNumber(item.NetProfit)}
                </Text>
                <Text style={[styles.cell, {width: 180}]} numberOfLines={1}>
                  {formatNumber(item.FinanceCost - item.NetProfit)}
                </Text>
              </View>
            ))}
            {/* Total Row */}
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cell, styles.totalCell, {width: 120}]}>
                Total
              </Text>
              <Text style={[styles.cell, {width: 140}]}></Text>
              <Text style={[styles.cell, styles.totalCell, {width: 220}]}>
                {formatNumber(totalWithFinance)}
              </Text>
              <Text style={[styles.cell, styles.totalCell, {width: 180}]}>
                {formatNumber(totalWithoutFinance)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Container
      statusBarColor={Colors.PrimaryColor}
      statusBarStyle="light-content">
      <View style={styles.container}>
        {/* Sidebar */}
        <Animated.View style={[styles.leftSide, {width: sidebarAnim}]}>
          <View style={{flex: 1}}>
            <View style={styles.leftHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image source={Back} style={styles.backIcon} />
              </TouchableOpacity>
              <Pressable onPress={toggleSidebar} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnIcon}>
                  {collapsed ? '>>' : '<<'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sidebarContent}>
              {!collapsed && (
                <Text style={styles.sidebarTitle}>Capex Balance</Text>
              )}
              {loading ? (
                <ActivityIndicator size="small" color={Colors.PrimaryColor} />
              ) : (
                projects.map(p => {
                  const isSelected = selectedProject === p.name;
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        styles.projectItem,
                        isSelected && styles.selectedProjectItem,
                      ]}
                      onPress={() => setSelectedProject(p.name)}>
                      <Text
                        style={[
                          collapsed
                            ? styles.projectShortName
                            : styles.projectName,
                          isSelected && styles.selectedProjectText,
                        ]}
                        numberOfLines={2}>
                        {collapsed ? p.name?.charAt(0) || 'P' : p.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </Animated.View>

        {/* Right Side */}
        <View style={styles.rightSide}>
          <View style={styles.rightsiderHeader}>
            <Text style={styles.rightTitle}>
              {selectedProject || 'Select Project'}
            </Text>

            <TouchableOpacity
              style={styles.addCapexBtn}
              onPress={() => navigation.navigate('CapexBalanceScreen')}>
              <Text style={styles.addCapexTxt}>+ Add Capex</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={{marginTop: 8}}>Loading...</Text>
            </View>
          ) : (
            <View
              style={isWide ? styles.contentRowWide : styles.contentColNarrow}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.rightContent}
                style={isWide ? {flex: 1} : {}}>
                <CostTable data={costRows} />
                <NetProfitTable data={netProfitRows} />
              </ScrollView>

              {isWide && (
                <View style={styles.fcSidePanel}>
                  <Text style={styles.fcTitle}>Finance Cost</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {netProfitRows.map(item => (
                      <View key={item._id} style={styles.fcCard}>
                        <Text style={styles.fcYear}>{item.Project || ''}</Text>
                        <Text style={styles.fcYear}>
                          Year: {item.year || ''}
                        </Text>
                        <Text style={styles.fcAmount}>
                          {formatNumber(item.FinanceCost)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Container>
  );
};

export default BudgtedDashboard;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.PrimaryColor},
  container: {flex: 1, flexDirection: 'row', backgroundColor: '#fff'},

  leftSide: {
    paddingVertical: 20,
    borderRightWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  leftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  backIcon: {width: 24, height: 24, tintColor: '#000'},
  toggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.PrimaryColor,
  },
  toggleBtnIcon: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
  sidebarContent: {flex: 1, marginTop: 20, paddingHorizontal: 10},
  sidebarTitle: {fontSize: 16, fontWeight: '700', marginBottom: 15},
  projectItem: {
    height: 40,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selectedProjectItem: {backgroundColor: Colors.PrimaryColor},
  projectName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  projectShortName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  selectedProjectText: {color: '#red'},

  rightSide: {flex: 1, paddingHorizontal: 16, backgroundColor: '#fff'},
  rightsiderHeader: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
  },
  addCapexBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addCapexTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  contentRowWide: {
    flex: 1,
    flexDirection: 'row',
  },
  contentColNarrow: {flex: 1},

  rightTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.PrimaryColor,
    marginBottom: 14,
  },
  rightContent: {paddingBottom: 30},

  fcSidePanel: {
    width: 250,
    paddingLeft: 12,
    paddingTop: 4,
    borderLeftWidth: 1,
    borderColor: '#eee',
  },
  fcCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d0e4f7',
    marginBottom: 10,
  },
  fcTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.PrimaryColor,
    marginBottom: 10,
  },
  fcYear: {fontSize: 12, color: '#555', fontWeight: '600'},
  fcAmount: {fontSize: 16, fontWeight: '800', color: '#111', marginTop: 2},

  tableSection: {marginBottom: 30},
  tableTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.PrimaryColor,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableHeader: {backgroundColor: '#f3f4f6'},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  cell: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 10,
    color: '#111',
  },
  hCell: {fontWeight: '700', color: '#000'},
  totalRow: {
    backgroundColor: '#eef4ff',
    borderTopWidth: 2,
    borderTopColor: Colors.PrimaryColor,
  },
  totalCell: {fontWeight: '800', color: Colors.PrimaryColor},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
