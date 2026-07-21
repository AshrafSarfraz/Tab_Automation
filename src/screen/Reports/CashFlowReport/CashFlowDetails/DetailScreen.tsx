import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ActivityIndicator, StyleSheet, Dimensions,
  FlatList, ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { getCashFlowFromSQLite } from "../../../../database/cashFlow";
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

const { width } = Dimensions.get("window");
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthNames: Record<string, number> = {
  "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
  "july":7,"august":8,"september":9,"october":10,"november":11,"december":12
};

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;
const COMP_W = 120;   // ✅ kam kiya
const SUB_W = 140;    // ✅ kam kiya
const LEFT_WIDTH = COMP_W + SUB_W;
const TOTAL_W = 120;
const MONTH_W = 110;

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
  isHeader?: boolean;
  isTotalRow?: boolean;
  totalType?: "Inflow" | "Outflow" | "Net";
  component?: string;
  subComponent?: string;
  monthlyAmounts?: number[];
  total?: number;
};

export default function CashFlowTableScreen() {
  const route = useRoute<any>();
  const { company = "", year = 2026 } = (route.params ?? {}) as { company: string; year: number };

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const snap = await getCashFlowFromSQLite();
        const rows = extractRows(snap);

        const filtered: CashFlowRow[] = rows
          .filter((r: any) =>
            String(r.Company || r.company || "").trim() === String(company).trim() &&
            Number(r.Year || r.year) === Number(year)
          )
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

        const components = ["Inflow", "Outflow"];
        const structured: RowItem[] = [];
        structured.push({ isHeader: true });

        const inflowMonthly = Array(12).fill(0);
        const outflowMonthly = Array(12).fill(0);

        for (const comp of components) {
          const compRows = filtered.filter(r => r.component.toLowerCase() === comp.toLowerCase());
          const subComps = [...new Set(compRows.map(r => r.subComponent))];

          for (const sub of subComps) {
            const monthly = Array(12).fill(0);
            compRows
              .filter(r => r.subComponent === sub)
              .forEach(r => {
                if (r.month >= 1 && r.month <= 12) {
                  monthly[r.month - 1] += r.Amount;
                  if (comp.toLowerCase() === "inflow") inflowMonthly[r.month - 1] += r.Amount;
                  if (comp.toLowerCase() === "outflow") outflowMonthly[r.month - 1] += r.Amount;
                }
              });

            structured.push({
              component: comp,
              subComponent: sub,
              monthlyAmounts: monthly,
              total: monthly.reduce((a, b) => a + b, 0),
            });
          }

          const compMonthly = comp.toLowerCase() === "inflow" ? [...inflowMonthly] : [...outflowMonthly];
          structured.push({
            isTotalRow: true,
            totalType: comp as "Inflow" | "Outflow",
            component: comp,
            monthlyAmounts: compMonthly,
            total: compMonthly.reduce((a, b) => a + b, 0),
          });
        }

        const netMonthly = inflowMonthly.map((v, i) => v + outflowMonthly[i]);
        structured.push({
          isTotalRow: true,
          totalType: "Net",
          component: "Net Cash Flow",
          monthlyAmounts: netMonthly,
          total: netMonthly.reduce((a, b) => a + b, 0),
        });

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
    <View style={[styles.headerRow, { width: LEFT_WIDTH, height: HEADER_HEIGHT }]}>
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
    if (item.isHeader) {
      return (
        <View style={[styles.yearHeaderRow, { width: LEFT_WIDTH+300, height: YEAR_HEADER_HEIGHT }]}>
          <Text style={{ fontWeight: "bold", fontSize: 12, color: "white" }}>{company} - {year}</Text>
        </View>
      );
    }

    if (item.isTotalRow) {
      // ✅ sirf net pe color, inflow/outflow pe white
      const bgColor = item.totalType === "Net" ? "#FFF3D6" : "#fff";
      return (
        <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: bgColor, borderTopWidth: 1.5, borderColor: "#ccc" }]}>
          <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold", textAlign: "left" }]}>{item.component} Total</Text>
          <Text numberOfLines={1} style={[styles.cell, { width: SUB_W, textAlign: "left" }]} />
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, { width: LEFT_WIDTH+100, height: ROW_HEIGHT }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left", color: item.component === "Inflow" ? "#1B5E20" : "#c53030", fontWeight: "600" }]}>
          {item.component}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: SUB_W, textAlign: "left", fontSize: 11 }]}>
          {item.subComponent}
        </Text>
      </View>
    );
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.isHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const monthly = item.monthlyAmounts ?? Array(12).fill(0);
    const total = item.total ?? 0;
    const bgColor = item.isTotalRow && item.totalType === "Net" ? "#FFF3D6" : "#fff";

    return (
      <View style={[styles.bodyRow, { height: ROW_HEIGHT, backgroundColor: bgColor, borderTopWidth: item.isTotalRow ? 1.5 : 0, borderColor: "#ccc" }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: item.isTotalRow ? "bold" : "normal" }]}>
          {fmt(total)}
        </Text>
        {monthly.map((v, i) => (
          <Text key={i} numberOfLines={1} style={[styles.cell, { width: MONTH_W, fontWeight: item.isTotalRow ? "bold" : "normal" }]}>
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
        <CustomHeader title={`${company} - ${year}`} />
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
  bodyRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 10, backgroundColor: "#fff" },
  yearHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#31368A", borderBottomWidth: 1, borderColor: "#ccc", paddingHorizontal: 10 },
  cell: { textAlign: "center", fontSize: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});