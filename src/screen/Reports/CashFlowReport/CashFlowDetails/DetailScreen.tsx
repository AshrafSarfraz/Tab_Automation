import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ActivityIndicator, StyleSheet,
  FlatList, ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getCashFlowFromSQLite } from "../../../../database/cashFlow";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthNames: Record<string, number> = {
  "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
  "july":7,"august":8,"september":9,"october":10,"november":11,"december":12
};

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;
const COMP_W = 120;   // ✅ kam kiya
const SUB_W = 400;    // ✅ kam kiya
const LEFT_WIDTH = COMP_W + SUB_W; // =
const TOTAL_W = 120;
const MONTH_W = 110;

const BALANCE_SECTION = "Balance Section";
const OPENING_BALANCE = "Opening -Available Balance";
const BANK_ROWS = [
  "Dukhan Bank - FD",
  "QIIB - Hold Amount ( New Sales)",
  "CBQ- Reseve Amount",
  "CBQ- FD(96M)",
  "CBQ- FD(130M)",
  "CBQ- FD(150M)",
  "GII Settlement",
  "Doha Bank- CC Guarantee",
];

const extractRows = (snap: any) => {
  const payload = snap?.data;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (snap && Array.isArray(snap.data)) return snap.data;
  if (Array.isArray(snap)) return snap;
  return [];
};

type CashFlowRow = {
  company: string;
  component: string;
  subComponent: string;
  month: number;
  year: number;
  Amount: number;
};

type RowItem = {
  rowType: "sectionHeader" | "dataRow" | "totalRow" | "balanceRow";
  label?: string;
  subLabel?: string;
  monthlyAmounts?: number[];
  total?: number;
  color?: string;
  bold?: boolean;
  bgColor?: string;
};

export default function CashFlowTableScreen() {
  const route = useRoute<any>();
  const { company = "", year = 2026 } = (route.params ?? {}) as { company: string; year: number };

  const isGroup = !company;

  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leftListRef = useRef<FlatList<RowItem>>(null);
  const rightListRef = useRef<FlatList<RowItem>>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const isVSyncingRef = useRef(false);
  const isHSyncingRef = useRef(false);

  const rightContentWidth = TOTAL_W + 12 * MONTH_W;

  const onLeftVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    rightListRef.current?.scrollToOffset({ offset: e.nativeEvent.contentOffset.y, animated: false });
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onRightVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    leftListRef.current?.scrollToOffset({ offset: e.nativeEvent.contentOffset.y, animated: false });
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onHeaderHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    bodyHRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };
  const onBodyHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    headerHRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };

  const getMonthlyAmounts = (rows: CashFlowRow[]) => {
    const out = Array(12).fill(0);
    rows.forEach(r => {
      if (r.month >= 1 && r.month <= 12) out[r.month - 1] += r.Amount;
    });
    return out;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const snap = await getCashFlowFromSQLite();
        const rows = extractRows(snap);

        const allFiltered: CashFlowRow[] = rows
          .filter((r: any) => {
            const yearMatch = Number(r.Year || r.year) === Number(year);
            if (!company) return yearMatch;
            return String(r.Company || r.company || "").trim() === String(company).trim() && yearMatch;
          })
          .map((r: any) => {
            const monthRaw = r.Month || r.month;
            const m = typeof monthRaw === "string"
              ? monthNames[monthRaw.toLowerCase()] || 0
              : Number(monthRaw);
            return {
              company: String(r.Company || r.company || ""),
              component: String(r.Component || r.component || ""),
              subComponent: String(r["Sub Component"] || r.subComponent || ""),
              month: m,
              year: Number(r.Year || r.year),
              Amount: Number(r.Amount || 0),
            };
          });

        const balanceData = allFiltered.filter(r => r.company === BALANCE_SECTION);
        const mainData = allFiltered.filter(r => r.company !== BALANCE_SECTION);

        const structured: RowItem[] = [];


        const companyNames = isGroup
          ? [...new Set(mainData.map(r => r.company))].filter(Boolean)
          : [company];

        const groupInflowMonthly = Array(12).fill(0);
        const groupOutflowMonthly = Array(12).fill(0);

        for (const cmp of companyNames) {
          const cmpRows = mainData.filter(r => r.company === cmp);

          if (isGroup) {
            structured.push({
              rowType: "sectionHeader",
              label: cmp,
              bgColor: "#31368A", // ✅ grey-blue company header
            });
          }

          // Inflow
          const inflowRows = cmpRows.filter(r => r.component.toLowerCase() === "inflow");
          const inflowMonthly = Array(12).fill(0);
          const inflowSubs = [...new Set(inflowRows.map(r => r.subComponent))];

          for (const sub of inflowSubs) {
            const subRows = inflowRows.filter(r => r.subComponent === sub);
            const monthly = getMonthlyAmounts(subRows);
            monthly.forEach((v, i) => inflowMonthly[i] += v);
            structured.push({
              rowType: "dataRow",
              label: "Inflow",
              subLabel: sub,
              monthlyAmounts: monthly,
              total: monthly.reduce((a, b) => a + b, 0),
              color: "#000", // ✅ dark green
            });
          }

          structured.push({
            rowType: "totalRow",
            label: "Inflow Total",
            monthlyAmounts: [...inflowMonthly],
            total: inflowMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#F0FFF4", // ✅ light green
            bold: true,
          });

          // Outflow
          const outflowRows = cmpRows.filter(r => r.component.toLowerCase() === "outflow");
          const outflowMonthly = Array(12).fill(0);
          const outflowSubs = [...new Set(outflowRows.map(r => r.subComponent))];

          for (const sub of outflowSubs) {
            const subRows = outflowRows.filter(r => r.subComponent === sub);
            const monthly = getMonthlyAmounts(subRows);
            monthly.forEach((v, i) => outflowMonthly[i] += v);
            structured.push({
              rowType: "dataRow",
              label: "Outflow",
              subLabel: sub,
              monthlyAmounts: monthly,
              total: monthly.reduce((a, b) => a + b, 0),
              color: "#000", // ✅ dark red
            });
          }

          structured.push({
            rowType: "totalRow",
            label: "Outflow Total",
            monthlyAmounts: [...outflowMonthly],
            total: outflowMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#FFF5F5", // ✅ light red
            bold: true,
          });

          // Net per company
          const netMonthly = inflowMonthly.map((v, i) => v + outflowMonthly[i]);
          structured.push({
            rowType: "totalRow",
            label: `Net (${cmp})`,
            monthlyAmounts: netMonthly,
            total: netMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#FFFBEB", // ✅ light yellow
            bold: true,
          });

          inflowMonthly.forEach((v, i) => groupInflowMonthly[i] += v);
          outflowMonthly.forEach((v, i) => groupOutflowMonthly[i] += v);
        }

        if (isGroup) {
          structured.push({
            rowType: "sectionHeader",
            label: "GROUP TOTAL",
            bgColor: "#31368A", // ✅ very dark
          });

          structured.push({
            rowType: "totalRow",
            label: "Total Inflow",
            monthlyAmounts: [...groupInflowMonthly],
            total: groupInflowMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#F0FFF4",
            bold: true,
          });

          structured.push({
            rowType: "totalRow",
            label: "Total Outflow",
            monthlyAmounts: [...groupOutflowMonthly],
            total: groupOutflowMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#FFF5F5",
            bold: true,
          });

          const groupNetMonthly = groupInflowMonthly.map((v, i) => v + groupOutflowMonthly[i]);

          structured.push({
            rowType: "totalRow",
            label: "Net Cash Flow",
            monthlyAmounts: groupNetMonthly,
            total: groupNetMonthly.reduce((a, b) => a + b, 0),
            bgColor: "#FFFBEB",
            bold: true,
          });

          if (balanceData.length > 0) {
            structured.push({
              rowType: "sectionHeader",
              label: "BALANCE SECTION",
              bgColor: "#2d3748", // ✅ dark grey
            });

            const openingRows = balanceData.filter(r => r.subComponent === OPENING_BALANCE);
            const openingMonthly = getMonthlyAmounts(openingRows);

            structured.push({
              rowType: "balanceRow",
              label: "Opening Balance",
              monthlyAmounts: openingMonthly,
              total: openingMonthly.reduce((a, b) => a + b, 0),
              bold: false,
            });

            const closingMonthly = openingMonthly.map((v, i) => v + groupNetMonthly[i]);
            structured.push({
              rowType: "totalRow",
              label: "Closing Balance",
              monthlyAmounts: closingMonthly,
              total: closingMonthly.reduce((a, b) => a + b, 0),
              bgColor: "#EBF8FF", // ✅ light blue
              bold: true,
            });

            const bankMonthly = Array(12).fill(0);
            for (const bankName of BANK_ROWS) {
              const bankRows = balanceData.filter(r => r.subComponent === bankName);
              if (bankRows.length === 0) continue;
              const monthly = getMonthlyAmounts(bankRows);
              monthly.forEach((v, i) => bankMonthly[i] += v);
              structured.push({
                rowType: "balanceRow",
                label: bankName,
                monthlyAmounts: monthly,
                total: monthly.reduce((a, b) => a + b, 0),
                bold: false,
              });
            }

            const totalMonthly = closingMonthly.map((v, i) => v + bankMonthly[i]);
            structured.push({
              rowType: "totalRow",
              label: "Total AWH Group Balance",
              monthlyAmounts: totalMonthly,
              total: totalMonthly.reduce((a, b) => a + b, 0),
              bgColor: "#FFFAF0", // ✅ soft orange
              bold: true,
            });
          }
        }

        if (mounted) setData(structured);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [company, year]);

  const fmt = (n: number) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

  const LeftHeader = () => (
    <View style={[styles.headerRow, { width: LEFT_WIDTH-153, height: HEADER_HEIGHT }]}>
      <Text style={[styles.cell, { width: COMP_W, fontWeight: "bold", textAlign: "left" }]}>Component</Text>
      <Text style={[styles.cell, { width: SUB_W, fontWeight: "bold", textAlign: "left" }]}>Sub Component</Text>
    </View>
  );
  const RightHeader = () => (
    <ScrollView ref={headerHRef} horizontal onScroll={onHeaderHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
      <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT }]}>
        <Text style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>Total</Text>
        {MONTHS.map((m) => (
          <Text key={m} style={[styles.cell, { width: MONTH_W, fontWeight: "bold" }]}>{m}</Text>
        ))}
      </View>
    </ScrollView>
  );

  const renderLeftRow = ({ item }: { item: RowItem }) => {
    if (item.rowType === "sectionHeader") {
      return (
        <View style={[styles.sectionHeader, { width: LEFT_WIDTH, backgroundColor: item.bgColor || "#31368A" }]}>
          <Text style={styles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }

    if (item.rowType === "totalRow") {
      return (
        <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: item.bgColor || "#fff", borderTopWidth: 1, borderColor: "#ddd" }]}>
          <Text numberOfLines={1} style={[styles.cell, { width: COMP_W + SUB_W, fontWeight: "bold", textAlign: "left" }]}>
            {item.label}
          </Text>
        </View>
      );
    }

    if (item.rowType === "balanceRow") {
      return (
        <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT }]}>
          <Text numberOfLines={1} style={[styles.cell, { width: COMP_W + SUB_W, textAlign: "left", color: "#4a5568" }]}>
            {item.label}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left", fontWeight: "600", color: item.color || "#333" }]}>
          {item.label}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: SUB_W, textAlign: "left", fontSize: 11, color: "#555" }]}>
          {item.subLabel}
        </Text>
      </View>
    );
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.rowType === "sectionHeader") {
      return <View style={[styles.sectionHeader, { width: rightContentWidth, backgroundColor: item.bgColor || "#31368A" }]} />;
    }

    const monthly = item.monthlyAmounts ?? Array(12).fill(0);
    const total = item.total ?? 0;
    const bgColor = item.bgColor || "#fff";
    const isBold = item.bold;

    return (
      <View style={[styles.bodyRow, {
        height: ROW_HEIGHT,
        backgroundColor: bgColor,
        borderTopWidth: item.rowType === "totalRow" ? 1 : 0,
        borderColor: "#ddd",
      }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: isBold ? "bold" : "normal", color: "#222" }]}>
          {fmt(total)}
        </Text>
        {monthly.map((v, i) => (
          <Text key={i} numberOfLines={1} style={[styles.cell, { width: MONTH_W, fontWeight: isBold ? "bold" : "normal", color: "#222" }]}>
            {v !== 0 ? fmt(v) : "-"}
          </Text>
        ))}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.PrimaryColor} /></View>;
  if (error) return <View style={styles.centered}><Text style={{ color: "red" }}>{error}</Text></View>;

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <View style={{ borderBottomWidth: 1 }}>
        <CustomHeader title={`${company || "Group Report"} - ${year}`} />
      </View>

      <View style={{ flexDirection: "row" }}>
        <LeftHeader />
        <RightHeader />
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        <FlatList
          ref={leftListRef}
          data={data}
          keyExtractor={(_, i) => `L-${i}`}
          renderItem={renderLeftRow}
          onScroll={onLeftVScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={{ width: LEFT_WIDTH }}
        />
        <ScrollView ref={bodyHRef} horizontal onScroll={onBodyHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
          <FlatList
            ref={rightListRef}
            data={data}
            keyExtractor={(_, i) => `R-${i}`}
            renderItem={renderRightRow}
            onScroll={onRightVScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={{ width: rightContentWidth }}
          />
        </ScrollView>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#EFEFEF", borderBottomWidth: 1, borderColor: "#ddd" },
  bodyRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 8, backgroundColor: "#fff" },
  sectionHeader: { flexDirection: "row", alignItems: "center", height: YEAR_HEADER_HEIGHT, borderBottomWidth: 1, borderColor: "#ccc", paddingHorizontal: 10 },
  sectionHeaderText: { fontWeight: "bold", fontSize: 12, color: "white" },
  cell: { textAlign: "center", fontSize: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});