import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import PnLSummaryCards from "../../companyCard/TrailBalanceCard";
import NetProfitChart from "../../Charts/NetProfitChart";
import RevenueChart from "../../Charts/RevenueCharts";
import ExpenseChart from "../../Charts/ExpenseChart";
import RevenueCostNetProfitLineChart from "../../Charts/linechart";
import { Colors } from "../../../themes/color";


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

  selectedCompanyName: string;

  collapsed: boolean;
};

export default function CompanyWisedRightPanel({
  styles,
  YEARS,
  selectedYear,
  setSelectedYear,
  showYears,
  setShowYears,
  expandChart,
  onExpandPress,
  onViewDetailsPress,
  selectedCompanyName,
  collapsed,
}: Props) {
  return (
    <View style={styles.RightSide}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.yearWrap}>
          <Text style={styles.label}>Year:</Text>

          <Pressable
            style={styles.yearBox}
            onPress={() => setShowYears((p: boolean) => !p)}
          >
            <Text style={styles.yearText}>{selectedYear}</Text>
            <Text>{showYears ? "▲" : "▼"}</Text>
          </Pressable>
        </View>

        {/* Buttons */}
        <View style={styles.actionsWrap}>
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
                  y === selectedYear && {
                    fontWeight: "800",
                    color: Colors.PrimaryColor,
                  },
                ]}
              >
                {y}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Scroll Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onScrollBeginDrag={() => setShowYears(false)}
      >
        <View style={{ marginTop: 16 }}>
          <PnLSummaryCards company={selectedCompanyName} year={selectedYear} />
        </View>

        {/* Charts */}
        <View
          style={[
            styles.ChartContainer,
            expandChart && styles.ChartContainerExpanded,
          ]}
        >
          <NetProfitChart
            company={selectedCompanyName}
            year={selectedYear}
            compareYear={selectedYear - 1}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <RevenueChart
            company={selectedCompanyName}
            year={selectedYear}
            compareYear={selectedYear - 1}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />

          <ExpenseChart
            company={selectedCompanyName}
            year={selectedYear}
            compareYear={selectedYear - 1}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <RevenueCostNetProfitLineChart
            company={selectedCompanyName}
            year={selectedYear}
            expandChart={expandChart}
            isSidebarCollapsed={collapsed}
          />
        </View>
      </ScrollView>

      {/* Overlay */}
      {showYears && (
        <Pressable
          style={styles.overlay}
          onPress={() => setShowYears(false)}
        />
      )}
    </View>
  );
}
