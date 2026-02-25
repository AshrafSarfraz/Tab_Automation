import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Colors } from "../../../themes/color";
import CashFlowGroupNetProfitChart from "../../CashFlowChart/groupReportChart/CashFlowgroupNetprofit";
import CashFlowGroupRevenueChart from "../../CashFlowChart/groupReportChart/CashFlowgroupRevenue";
import CashFlowGroupExpenseChart from "../../CashFlowChart/groupReportChart/CashFlowgroupExpense";
import CashFlowGroupPnLSummaryCards from "../../companyCard/cashflowGroupCard";



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

  collapsed: boolean;
};

export default function CashFlowGroupWiseRightPanel({
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
          {/* ✅ Replace this with GroupCashFlowSummaryCards if you have */}
          <CashFlowGroupPnLSummaryCards company={"ALL"} year={selectedYear} />
        </View>

        <View style={[styles.ChartContainer, expandChart && styles.ChartContainerExpanded]}>
          {/* ✅ Replace these with Group charts if you have */}
          <CashFlowGroupNetProfitChart
            company={"ALL"}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <CashFlowGroupRevenueChart
            company={"ALL"}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <CashFlowGroupExpenseChart
            company={"ALL"}
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