import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Colors } from "../../../themes/color";
import CashFlowPnLSummaryCards from "../../companyCard/cashflowCard";
import CashFlowNetProfitChart from "../../CashFlowChart/Charts/CashFlowNetProfit";
import CashFlowRevenueChart from "../../CashFlowChart/Charts/CashFlowRevenueChart";
import CashFlowExpenseChart from "../../CashFlowChart/Charts/CashFlowExpenseChart";


type Props = {
  styles: any;

  YEARS: number[];
  selectedYear: number;
  setSelectedYear: (y: number) => void;

  showYears: boolean;
  setShowYears: (v: boolean | ((p: boolean) => boolean)) => void;

  expandChart: boolean;
  onExpandPress: () => void;

  onViewDetailsPress: () => void;
  onAddProjectsPress: () => void;

  selectedCompanyName: string;
  collapsed: boolean;
};

export default function CashFlowCompanyWiseRightPanel({
  styles,
  YEARS,
  selectedYear,
  setSelectedYear,
  showYears,
  setShowYears,
  expandChart,
  onExpandPress,
  onViewDetailsPress,
  onAddProjectsPress,
  selectedCompanyName,
  collapsed,
}: Props) {
  return (
    <View style={styles.RightSide}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.yearWrap}>
          <Text style={styles.label}>Year:</Text>
          <Pressable style={styles.yearBox} onPress={() => setShowYears((p: boolean) => !p)}>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <Text>{showYears ? "▲" : "▼"}</Text>
          </Pressable>
        </View>

        <View style={styles.actionsWrap}>
          <Pressable
            style={[
              styles.actionBtn,
              { backgroundColor: "#fff", borderColor: Colors.PrimaryColor, borderWidth: 2 },
            ]}
            onPress={onAddProjectsPress}
          >
            <Text style={[styles.actionText, { color: Colors.PrimaryColor }]}>
              Add Projects
            </Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={onExpandPress}>
            <Text style={styles.actionText}>
              {expandChart ? "Collapse Chart" : "Expand Chart"}
            </Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={onViewDetailsPress}>
            <Text style={styles.actionText}>View Details</Text>
          </Pressable>
        </View>
      </View>

      {/* Dropdown */}
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
                  y === selectedYear && { fontWeight: "800", color: Colors.PrimaryColor },
                ]}
              >
                {y}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Scroll */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onScrollBeginDrag={() => setShowYears(false)}
      >
        <View style={{ marginTop: 16 }}>
          <CashFlowPnLSummaryCards company={selectedCompanyName} year={selectedYear} />
        </View>

        <View style={[styles.ChartContainer, expandChart && styles.ChartContainerExpanded]}>
          <CashFlowNetProfitChart
            company={selectedCompanyName}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <CashFlowRevenueChart
            company={selectedCompanyName}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <CashFlowExpenseChart
            company={selectedCompanyName}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />
        </View>
      </ScrollView>

      {showYears && <Pressable style={styles.overlay} onPress={() => setShowYears(false)} />}
    </View>
  );
}