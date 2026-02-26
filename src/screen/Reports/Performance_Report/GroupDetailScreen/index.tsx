import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from "react-native";

import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal"; // ✅ ONLY ONE API
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";

const { width } = Dimensions.get("window");

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;

// LEFT
const TYPE_W = 100;
const COMP_W = 450;
const LEFT_WIDTH = TYPE_W + COMP_W;

// RIGHT (A + P)
const TOTAL_W = 110;
const PREV_W = 110;
const MONTH_W = 100;
const rightContentWidth = TOTAL_W + PREV_W + 12 * (2 * MONTH_W);

// Westwalk companies (logic stays same)
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

type ApiRow = {
  company?: string;
  year?: number;
  month?: number;
  balanceFirst?: number;
  accountType?: string; // Revenue/Cost from backend
};

type TrialBalanceRow = {
  type: "Revenue" | "Cost" | string;
  company: string;
  year: number;
  month: number;
  balanceFirst: number;
  cc2: string;
};

type RowItem = {
  yearHeader?: boolean;

  type?: "Revenue" | "Cost" | string;
  company?: string;

  totalBalances?: number[];
  totalSum?: number;
  prevMonthlyBalances?: number[];
  prevYearSum?: number;

  isTotalRow?: boolean;
  totalType?: "Revenue" | "Cost" | "Grand";
};

const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
const zero12 = () => Array(12).fill(0); // ✅ NEW

// ✅ extractor (handles both formats)
const extractRowsFromSnap = (snap: any): ApiRow[] => {
  const payload = snap?.data;

  // axios-like { data: { data: [...] } }
  if (payload?.data && Array.isArray(payload.data)) return payload.data;

  // axios-like { data: [...] }
  if (Array.isArray(payload)) return payload;

  // direct { data: [...] }
  if (snap?.data && Array.isArray(snap.data)) return snap.data;

  // direct [...]
  if (Array.isArray(snap)) return snap;

  return [];
};

const normalize = (r: ApiRow): TrialBalanceRow => {
  const t = String(r.accountType || "").trim();
  return {
    type: t === "Revenue" || t === "Cost" ? t : t || "",
    company: String(r.company || "").trim(),
    year: Number(r.year || 0),
    month: Number(r.month || 0),
    balanceFirst: Number(r.balanceFirst || 0),
    cc2: "",
  };
};

const sumMonthly = (all: TrialBalanceRow[], company: string, year: number, type: "Revenue" | "Cost") => {
  const out = Array(12).fill(0);
  for (const r of all) {
    if (r.company !== company) continue;
    if (r.year !== year) continue;
    if (!isValidMonth(r.month)) continue;
    if (r.type !== type) continue;
    out[r.month - 1] += Number(r.balanceFirst || 0);
  }
  return out;
};

const netMonthly = (all: TrialBalanceRow[], company: string, year: number) => {
  const rev = sumMonthly(all, company, year, "Revenue");
  const cost = sumMonthly(all, company, year, "Cost");
  return rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
};

export default function AllCompaniesPnLTableScreen({ route }: any) {
  const yearParam = route?.params?.year;
  const prevYear = yearParam - 1;

  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // sync scroll
  const leftListRef = useRef<FlatList<RowItem>>(null);
  const rightListRef = useRef<FlatList<RowItem>>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const isVSyncingRef = useRef(false);
  const isHSyncingRef = useRef(false);

  const onLeftVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    const y = e.nativeEvent.contentOffset.y;
    rightListRef.current?.scrollToOffset({ offset: y, animated: false });
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onRightVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isVSyncingRef.current) return;
    isVSyncingRef.current = true;
    const y = e.nativeEvent.contentOffset.y;
    leftListRef.current?.scrollToOffset({ offset: y, animated: false });
    requestAnimationFrame(() => (isVSyncingRef.current = false));
  };
  const onHeaderHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    const x = e.nativeEvent.contentOffset.x;
    bodyHRef.current?.scrollTo({ x, animated: false });
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };
  const onBodyHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isHSyncingRef.current) return;
    isHSyncingRef.current = true;
    const x = e.nativeEvent.contentOffset.x;
    headerHRef.current?.scrollTo({ x, animated: false });
    requestAnimationFrame(() => (isHSyncingRef.current = false));
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ SINGLE API CALL (must return ALL companies from Trialbalance)
        const snap = await getWestwalkMongoFromSQLite();
        const raw = extractRowsFromSnap(snap);

        let all = raw.map(normalize);

        // keep only year + prev
        all = all.filter((r) => r.year === yearParam || r.year === prevYear);

        // TB consistency
        all = all.map((r) => {
          if (r.type === "Revenue" && r.company !== C_RE) return { ...r, cc2: "" };
          return r;
        });

        // unique companies
        const map = new Map<string, string>();
        all.forEach((r) => {
          const c = String(r.company || "").trim();
          if (!c) return;
          const key = c.toLowerCase();
          if (!map.has(key)) map.set(key, c);
        });
        const companies = Array.from(map.values()).sort((a, b) => a.localeCompare(b));

        const revenueRows: RowItem[] = [];
        const costRows: RowItem[] = [];

        for (const cmp of companies) {
          let revA = sumMonthly(all, cmp, yearParam, "Revenue");
          let costA = sumMonthly(all, cmp, yearParam, "Cost");
          let revP = sumMonthly(all, cmp, prevYear, "Revenue");
          let costP = sumMonthly(all, cmp, prevYear, "Cost");

          // ✅ Westwalk consolidation (same logic)
          if (cmp === C_RE) {
            const advNetA = netMonthly(all, C_ADV, yearParam);
            const advNetP = netMonthly(all, C_ADV, prevYear);
            const assetsNetA = netMonthly(all, C_ASSETS, yearParam);
            const assetsNetP = netMonthly(all, C_ASSETS, prevYear);

            revA = revA.map((v, i) => v + (advNetA[i] || 0));
            revP = revP.map((v, i) => v + (advNetP[i] || 0));
            costA = costA.map((v, i) => v + (assetsNetA[i] || 0));
            costP = costP.map((v, i) => v + (assetsNetP[i] || 0));
          }

          // ✅ offsets (same logic)
          if (cmp.toLowerCase() === C_ASSETS.toLowerCase()) {
            const netA = revA.map((v, i) => v + (costA[i] || 0));
            const netP = revP.map((v, i) => v + (costP[i] || 0));
            revA = revA.map((v, i) => v - (netA[i] || 0));
            revP = revP.map((v, i) => v - (netP[i] || 0));
          }

          if (cmp.toLowerCase() === C_ADV.toLowerCase()) {
            const netA = revA.map((v, i) => v + (costA[i] || 0));
            const netP = revP.map((v, i) => v + (costP[i] || 0));
            costA = costA.map((v, i) => v - (netA[i] || 0));
            costP = costP.map((v, i) => v - (netP[i] || 0));
          }

          // ✅ IMPORTANT FIX:
          // show Advertisement + Assets in table, BUT after consolidation they should display ZERO
          const isAdv = cmp.toLowerCase() === C_ADV.toLowerCase();
          const isAssets = cmp.toLowerCase() === C_ASSETS.toLowerCase();
          if (isAdv || isAssets) {
            revA = zero12();
            costA = zero12();
            revP = zero12();
            costP = zero12();
          }

          revenueRows.push({
            type: "Revenue",
            company: cmp,
            totalBalances: revA,
            totalSum: sumArr(revA),
            prevMonthlyBalances: revP,
            prevYearSum: sumArr(revP),
          });

          costRows.push({
            type: "Cost",
            company: cmp,
            totalBalances: costA,
            totalSum: sumArr(costA),
            prevMonthlyBalances: costP,
            prevYearSum: sumArr(costP),
          });
        }

        // totals
        const revTotalA = Array(12).fill(0);
        const revTotalP = Array(12).fill(0);
        revenueRows.forEach((r) => {
          r.totalBalances?.forEach((v, i) => (revTotalA[i] += v));
          r.prevMonthlyBalances?.forEach((v, i) => (revTotalP[i] += v));
        });

        const costTotalA = Array(12).fill(0);
        const costTotalP = Array(12).fill(0);
        costRows.forEach((r) => {
          r.totalBalances?.forEach((v, i) => (costTotalA[i] += v));
          r.prevMonthlyBalances?.forEach((v, i) => (costTotalP[i] += v));
        });

        const netTotalA = revTotalA.map((v, i) => v + (costTotalA[i] || 0));
        const netTotalP = revTotalP.map((v, i) => v + (costTotalP[i] || 0));

        const structured: RowItem[] = [];
        structured.push({ yearHeader: true, company: `All Companies`, type: "" } as any);

        structured.push(...revenueRows);
        structured.push({
          isTotalRow: true,
          totalType: "Revenue",
          type: "Revenue Total",
          company: "All Companies",
          totalBalances: revTotalA,
          totalSum: sumArr(revTotalA),
          prevMonthlyBalances: revTotalP,
          prevYearSum: sumArr(revTotalP),
        });

        structured.push(...costRows);
        structured.push({
          isTotalRow: true,
          totalType: "Cost",
          type: "Cost Total",
          company: "All Companies",
          totalBalances: costTotalA,
          totalSum: sumArr(costTotalA),
          prevMonthlyBalances: costTotalP,
          prevYearSum: sumArr(costTotalP),
        });

        structured.push({
          isTotalRow: true,
          totalType: "Grand",
          type: "Net Profit",
          company: "All Companies",
          totalBalances: netTotalA,
          totalSum: sumArr(netTotalA),
          prevMonthlyBalances: netTotalP,
          prevYearSum: sumArr(netTotalP),
        });

        if (mounted) setData(structured);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load from SQLite");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const LeftHeader = () => (
    <View style={[styles.headerRow, { width: 380, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>Type</Text>
      <Text style={[styles.cell, { width: COMP_W, fontWeight: "bold", textAlign: "left" }]}>Company</Text>
    </View>
  );

  const RightHeader = () => (
    <ScrollView
      ref={headerHRef}
      horizontal
      onScroll={onHeaderHScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator
    >
      <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT, backgroundColor: "#fff" }]}>
        <Text style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>Total (A)</Text>
        <Text style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>Total (P)</Text>

        {months.map((m, i) => {
          const headerCellStyle = [
            styles.cell,
            { width: MONTH_W, fontWeight: "bold", paddingVertical: 13 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];
          return (
            <React.Fragment key={`h-${m}`}>
              <Text style={headerCellStyle}>{`${m} (A)`}</Text>
              <Text style={headerCellStyle}>{`${m} (P)`}</Text>
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderLeftRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.yearHeaderRow, { width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
          <Text style={{ fontWeight: "bold", fontSize: 12, color: "white" }}>All Companies - {yearParam}</Text>
        </View>
      );
    }

    if (item.isTotalRow) {
      let bgColor = "#f0f8ff";
      let mb = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") {
        bgColor = "#ffe4b5";
        mb = 50;
      }

      return (
        <View
          style={[
            styles.bodyRow,
            {
              width: LEFT_WIDTH,
              height: ROW_HEIGHT,
              backgroundColor: bgColor,
              borderTopWidth: 2,
              borderColor: "#aaa",
              marginBottom: mb,
            },
          ]}
        >
          <Text style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>{item.type}</Text>
          <Text style={[styles.cell, { width: COMP_W, textAlign: "left", fontWeight: "bold" }]}>{item.company}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
        <Text style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>
        <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>{item.company}</Text>
      </View>
    );
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const a = item.totalBalances ?? Array(12).fill(0);
    const p = item.prevMonthlyBalances ?? Array(12).fill(0);
    const totalA = item.totalSum ?? sumArr(a);
    const totalP = item.prevYearSum ?? sumArr(p);

    let bgColor = "#fff";
    let mb = 0;
    let weight: any = "normal";
    const isTotal = !!item.isTotalRow;

    if (isTotal) {
      weight = "bold";
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") {
        bgColor = "#ffe4b5";
        mb = 50;
      }
    }

    const shouldBand = !isTotal;

    return (
      <View
        style={[
          styles.bodyRow,
          { height: ROW_HEIGHT, backgroundColor: bgColor, marginBottom: mb, borderTopWidth: isTotal ? 2 : 0, borderColor: "#aaa" },
        ]}
      >
        <Text style={[styles.cell, { width: TOTAL_W, fontWeight: weight }]}>
          {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text style={[styles.cell, { width: PREV_W, fontWeight: weight }]}>
          {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>

        {months.map((_, i) => {
          const cellStyle = [
            styles.cell,
            { width: MONTH_W, fontWeight: weight, paddingVertical: 6 },
            shouldBand && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
            isTotal && { backgroundColor: bgColor },
          ];
          return (
            <React.Fragment key={`m-${i}`}>
              <Text style={cellStyle}>{Number(a[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
              <Text style={cellStyle}>{Number(p[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PrimaryColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red", fontWeight: "700", textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.Container}>
      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, borderBottomWidth: 1 }}>
        <CustomHeader title={`All Companies - ${yearParam}`} />
      </View>

      <View style={{ flexDirection: "row" }}>
        <LeftHeader />
        <RightHeader />
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        <FlatList
          ref={leftListRef}
          data={data}
          keyExtractor={(_, index) => `L-${index}`}
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
            keyExtractor={(_, index) => `R-${index}`}
            renderItem={renderRightRow}
            onScroll={onRightVScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={{ width: rightContentWidth }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  Container: { flex: 1, backgroundColor: Colors.White },
  headerRow: {
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.Bg,
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  yearHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#31368A",
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
  },
  cell: { textAlign: "center", fontSize: width > 600 ? 12 : 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40, paddingHorizontal: 20 },
  darkBodyCell: { backgroundColor: "#EFEFEF" },
});


// import React, { useEffect, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   ScrollView,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
//   StatusBar,
// } from "react-native";

// import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal"; // ✅ ONLY ONE API
// import { Colors } from "../../../../themes/color";
// import CustomHeader from "../../../../component/customHeader";

// const { width } = Dimensions.get("window");

// const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

// const HEADER_HEIGHT = 44;
// const ROW_HEIGHT = 30;
// const YEAR_HEADER_HEIGHT = 30;

// // LEFT
// const TYPE_W = 100;
// const COMP_W = 450;
// const LEFT_WIDTH = TYPE_W + COMP_W;

// // RIGHT (A + P)
// const TOTAL_W = 110;
// const PREV_W = 110;
// const MONTH_W = 100;
// const rightContentWidth = TOTAL_W + PREV_W + 12 * (2 * MONTH_W);

// // Westwalk companies (logic stays same)
// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";

// type ApiRow = {
//   company?: string;
//   year?: number;
//   month?: number;
//   balanceFirst?: number;
//   accountType?: string; // Revenue/Cost from backend
// };

// type TrialBalanceRow = {
//   type: "Revenue" | "Cost" | string;
//   company: string;
//   year: number;
//   month: number;
//   balanceFirst: number;
//   cc2: string;
// };

// type RowItem = {
//   yearHeader?: boolean;

//   type?: "Revenue" | "Cost" | string;
//   company?: string;

//   totalBalances?: number[];
//   totalSum?: number;
//   prevMonthlyBalances?: number[];
//   prevYearSum?: number;

//   isTotalRow?: boolean;
//   totalType?: "Revenue" | "Cost" | "Grand";
// };

// const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
// const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

// // ✅ extractor (handles both formats)
// const extractRowsFromSnap = (snap: any): ApiRow[] => {
//   const payload = snap?.data;

//   // axios-like { data: { data: [...] } }
//   if (payload?.data && Array.isArray(payload.data)) return payload.data;

//   // axios-like { data: [...] }
//   if (Array.isArray(payload)) return payload;

//   // direct { data: [...] }
//   if (snap?.data && Array.isArray(snap.data)) return snap.data;

//   // direct [...]
//   if (Array.isArray(snap)) return snap;

//   return [];
// };

// const normalize = (r: ApiRow): TrialBalanceRow => {
//   const t = String(r.accountType || "").trim();
//   return {
//     type: t === "Revenue" || t === "Cost" ? t : t || "",
//     company: String(r.company || "").trim(),
//     year: Number(r.year || 0),
//     month: Number(r.month || 0),
//     balanceFirst: Number(r.balanceFirst || 0),
//     cc2: "",
//   };
// };

// const sumMonthly = (all: TrialBalanceRow[], company: string, year: number, type: "Revenue" | "Cost") => {
//   const out = Array(12).fill(0);
//   for (const r of all) {
//     if (r.company !== company) continue;
//     if (r.year !== year) continue;
//     if (!isValidMonth(r.month)) continue;
//     if (r.type !== type) continue;
//     out[r.month - 1] += Number(r.balanceFirst || 0);
//   }
//   return out;
// };

// const netMonthly = (all: TrialBalanceRow[], company: string, year: number) => {
//   const rev = sumMonthly(all, company, year, "Revenue");
//   const cost = sumMonthly(all, company, year, "Cost");
//   return rev.map((v, i) => Number(v || 0) + Number(cost[i] || 0));
// };

// export default function AllCompaniesPnLTableScreen({route}:any) {
//   const yearParam =route?.params?.year;
//   const prevYear = yearParam - 1;

//   const [data, setData] = useState<RowItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // sync scroll
//   const leftListRef = useRef<FlatList<RowItem>>(null);
//   const rightListRef = useRef<FlatList<RowItem>>(null);
//   const headerHRef = useRef<ScrollView>(null);
//   const bodyHRef = useRef<ScrollView>(null);
//   const isVSyncingRef = useRef(false);
//   const isHSyncingRef = useRef(false);

//   const onLeftVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isVSyncingRef.current) return;
//     isVSyncingRef.current = true;
//     const y = e.nativeEvent.contentOffset.y;
//     rightListRef.current?.scrollToOffset({ offset: y, animated: false });
//     requestAnimationFrame(() => (isVSyncingRef.current = false));
//   };
//   const onRightVScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isVSyncingRef.current) return;
//     isVSyncingRef.current = true;
//     const y = e.nativeEvent.contentOffset.y;
//     leftListRef.current?.scrollToOffset({ offset: y, animated: false });
//     requestAnimationFrame(() => (isVSyncingRef.current = false));
//   };
//   const onHeaderHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isHSyncingRef.current) return;
//     isHSyncingRef.current = true;
//     const x = e.nativeEvent.contentOffset.x;
//     bodyHRef.current?.scrollTo({ x, animated: false });
//     requestAnimationFrame(() => (isHSyncingRef.current = false));
//   };
//   const onBodyHScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     if (isHSyncingRef.current) return;
//     isHSyncingRef.current = true;
//     const x = e.nativeEvent.contentOffset.x;
//     headerHRef.current?.scrollTo({ x, animated: false });
//     requestAnimationFrame(() => (isHSyncingRef.current = false));
//   };

//   useEffect(() => {
//     let mounted = true;

//     const load = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         // ✅ SINGLE API CALL (must return ALL companies from Trailbalance)
//         const snap = await getWestwalkMongoFromSQLite();
//         const raw = extractRowsFromSnap(snap);

//         let all = raw.map(normalize);

//         // keep only year + prev
//         all = all.filter((r) => r.year === yearParam || r.year === prevYear);

//         // TB consistency
//         all = all.map((r) => {
//           if (r.type === "Revenue" && r.company !== C_RE) return { ...r, cc2: "" };
//           return r;
//         });

//         // unique companies
//         const map = new Map<string, string>();
//         all.forEach((r) => {
//           const c = String(r.company || "").trim();
//           if (!c) return;
//           const key = c.toLowerCase();
//           if (!map.has(key)) map.set(key, c);
//         });
//         const companies = Array.from(map.values()).sort((a, b) => a.localeCompare(b));

//         const revenueRows: RowItem[] = [];
//         const costRows: RowItem[] = [];

//         for (const cmp of companies) {
//           let revA = sumMonthly(all, cmp, yearParam, "Revenue");
//           let costA = sumMonthly(all, cmp, yearParam, "Cost");
//           let revP = sumMonthly(all, cmp, prevYear, "Revenue");
//           let costP = sumMonthly(all, cmp, prevYear, "Cost");

//           // ✅ Westwalk consolidation
//           if (cmp === C_RE) {
//             const advNetA = netMonthly(all, C_ADV, yearParam);
//             const advNetP = netMonthly(all, C_ADV, prevYear);
//             const assetsNetA = netMonthly(all, C_ASSETS, yearParam);
//             const assetsNetP = netMonthly(all, C_ASSETS, prevYear);

//             revA = revA.map((v, i) => v + (advNetA[i] || 0));
//             revP = revP.map((v, i) => v + (advNetP[i] || 0));
//             costA = costA.map((v, i) => v + (assetsNetA[i] || 0));
//             costP = costP.map((v, i) => v + (assetsNetP[i] || 0));
//           }

//           // ✅ offsets (same logic)
//           if (cmp.toLowerCase() === C_ASSETS.toLowerCase()) {
//             const netA = revA.map((v, i) => v + (costA[i] || 0));
//             const netP = revP.map((v, i) => v + (costP[i] || 0));
//             revA = revA.map((v, i) => v - (netA[i] || 0));
//             revP = revP.map((v, i) => v - (netP[i] || 0));
//           }

//           if (cmp.toLowerCase() === C_ADV.toLowerCase()) {
//             const netA = revA.map((v, i) => v + (costA[i] || 0));
//             const netP = revP.map((v, i) => v + (costP[i] || 0));
//             costA = costA.map((v, i) => v - (netA[i] || 0));
//             costP = costP.map((v, i) => v - (netP[i] || 0));
//           }

//           revenueRows.push({
//             type: "Revenue",
//             company: cmp,
//             totalBalances: revA,
//             totalSum: sumArr(revA),
//             prevMonthlyBalances: revP,
//             prevYearSum: sumArr(revP),
//           });

//           costRows.push({
//             type: "Cost",
//             company: cmp,
//             totalBalances: costA,
//             totalSum: sumArr(costA),
//             prevMonthlyBalances: costP,
//             prevYearSum: sumArr(costP),
//           });
//         }

//         // totals
//         const revTotalA = Array(12).fill(0);
//         const revTotalP = Array(12).fill(0);
//         revenueRows.forEach((r) => {
//           r.totalBalances?.forEach((v, i) => (revTotalA[i] += v));
//           r.prevMonthlyBalances?.forEach((v, i) => (revTotalP[i] += v));
//         });

//         const costTotalA = Array(12).fill(0);
//         const costTotalP = Array(12).fill(0);
//         costRows.forEach((r) => {
//           r.totalBalances?.forEach((v, i) => (costTotalA[i] += v));
//           r.prevMonthlyBalances?.forEach((v, i) => (costTotalP[i] += v));
//         });

//         const netTotalA = revTotalA.map((v, i) => v + (costTotalA[i] || 0));
//         const netTotalP = revTotalP.map((v, i) => v + (costTotalP[i] || 0));

//         const structured: RowItem[] = [];
//         structured.push({ yearHeader: true, company: `All Companies`, type: "" } as any);

//         structured.push(...revenueRows);
//         structured.push({
//           isTotalRow: true,
//           totalType: "Revenue",
//           type: "Revenue Total",
//           company: "All Companies",
//           totalBalances: revTotalA,
//           totalSum: sumArr(revTotalA),
//           prevMonthlyBalances: revTotalP,
//           prevYearSum: sumArr(revTotalP),
//         });

//         structured.push(...costRows);
//         structured.push({
//           isTotalRow: true,
//           totalType: "Cost",
//           type: "Cost Total",
//           company: "All Companies",
//           totalBalances: costTotalA,
//           totalSum: sumArr(costTotalA),
//           prevMonthlyBalances: costTotalP,
//           prevYearSum: sumArr(costTotalP),
//         });

//         structured.push({
//           isTotalRow: true,
//           totalType: "Grand",
//           type: "Net Profit",
//           company: "All Companies",
//           totalBalances: netTotalA,
//           totalSum: sumArr(netTotalA),
//           prevMonthlyBalances: netTotalP,
//           prevYearSum: sumArr(netTotalP),
//         });

//         if (mounted) setData(structured);
//       } catch (e: any) {
//         if (mounted) {
//           setError(e?.message || "Failed to load from SQLite");
//           setData([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     load();
//     return () => { mounted = false; };
//   }, []);

//   const LeftHeader = () => (
//     <View style={[styles.headerRow, { width: 380, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//       <Text style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>Type</Text>
//       <Text style={[styles.cell, { width: COMP_W, fontWeight: "bold", textAlign: "left" }]}>Company</Text>
//     </View>
//   );

//   const RightHeader = () => (
//     <ScrollView ref={headerHRef} horizontal onScroll={onHeaderHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
//       <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT, backgroundColor: "#fff" }]}>
//         <Text style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>Total (A)</Text>
//         <Text style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>Total (P)</Text>

//         {months.map((m, i) => {
//           const headerCellStyle = [
//             styles.cell,
//             { width: MONTH_W, fontWeight: "bold", paddingVertical: 13 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];
//           return (
//             <React.Fragment key={`h-${m}`}>
//               <Text style={headerCellStyle}>{`${m} (A)`}</Text>
//               <Text style={headerCellStyle}>{`${m} (P)`}</Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     </ScrollView>
//   );

//   const renderLeftRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return (
//         <View style={[styles.yearHeaderRow, { width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
//           <Text style={{ fontWeight: "bold", fontSize: 12, color: "white" }}>All Companies - {yearParam}</Text>
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       let bgColor = "#f0f8ff";
//       let mb = 0;
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") { bgColor = "#ffe4b5"; mb = 50; }

//       return (
//         <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: bgColor, borderTopWidth: 2, borderColor: "#aaa", marginBottom: mb }]}>
//           <Text style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>{item.type}</Text>
//           <Text style={[styles.cell, { width: COMP_W, textAlign: "left", fontWeight: "bold" }]}>{item.company}</Text>
//         </View>
//       );
//     }

//     return (
//       <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//         <Text style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>{item.company}</Text>
//       </View>
//     );
//   };

//   const renderRightRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
//     }

//     const a = item.totalBalances ?? Array(12).fill(0);
//     const p = item.prevMonthlyBalances ?? Array(12).fill(0);
//     const totalA = item.totalSum ?? sumArr(a);
//     const totalP = item.prevYearSum ?? sumArr(p);

//     let bgColor = "#fff";
//     let mb = 0;
//     let weight: any = "normal";
//     const isTotal = !!item.isTotalRow;

//     if (isTotal) {
//       weight = "bold";
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") { bgColor = "#ffe4b5"; mb = 50; }
//     }

//     const shouldBand = !isTotal;

//     return (
//       <View style={[styles.bodyRow, { height: ROW_HEIGHT, backgroundColor: bgColor, marginBottom: mb, borderTopWidth: isTotal ? 2 : 0, borderColor: "#aaa" }]}>
//         <Text style={[styles.cell, { width: TOTAL_W, fontWeight: weight }]}>{Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
//         <Text style={[styles.cell, { width: PREV_W, fontWeight: weight }]}>{Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>

//         {months.map((_, i) => {
//           const cellStyle = [
//             styles.cell,
//             { width: MONTH_W, fontWeight: weight, paddingVertical: 6 },
//             shouldBand && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//             isTotal && { backgroundColor: bgColor },
//           ];
//           return (
//             <React.Fragment key={`m-${i}`}>
//               <Text style={cellStyle}>{Number(a[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
//               <Text style={cellStyle}>{Number(p[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     );
//   };

//   if (loading) {
//     return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.PrimaryColor} /></View>;
//   }

//   if (error) {
//     return <View style={styles.centered}><Text style={{ color: "red", fontWeight: "700", textAlign: "center" }}>{error}</Text></View>;
//   }

//   return (
//     <View style={styles.Container}>
//       <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
//       <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, borderBottomWidth: 1 }}>
//         <CustomHeader title={`All Companies - ${yearParam}`} />
//       </View>

//       <View style={{ flexDirection: "row" }}>
//         <LeftHeader />
//         <RightHeader />
//       </View>

//       <View style={{ flex: 1, flexDirection: "row" }}>
//         <FlatList
//           ref={leftListRef}
//           data={data}
//           keyExtractor={(_, index) => `L-${index}`}
//           renderItem={renderLeftRow}
//           onScroll={onLeftVScroll}
//           scrollEventThrottle={16}
//           showsVerticalScrollIndicator={false}
//           style={{ width: LEFT_WIDTH }}
//         />

//         <ScrollView ref={bodyHRef} horizontal onScroll={onBodyHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
//           <FlatList
//             ref={rightListRef}
//             data={data}
//             keyExtractor={(_, index) => `R-${index}`}
//             renderItem={renderRightRow}
//             onScroll={onRightVScroll}
//             scrollEventThrottle={16}
//             showsVerticalScrollIndicator={false}
//             style={{ width: rightContentWidth }}
//           />
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   Container: { flex: 1, backgroundColor: Colors.White },
//   headerRow: {
//     paddingHorizontal: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: Colors.Bg,
//     borderBottomWidth: 2,
//     borderColor: "#ddd",
//   },
//   bodyRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderBottomWidth: 1,
//     borderColor: "#ddd",
//     paddingHorizontal: 10,
//     backgroundColor: "#fff",
//   },
//   yearHeaderRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#31368A",
//     borderBottomWidth: 1,
//     borderColor: "#ccc",
//     paddingHorizontal: 10,
//   },
//   cell: { textAlign: "center", fontSize: width > 600 ? 12 : 12 },
//   centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40, paddingHorizontal: 20 },
//   darkBodyCell: { backgroundColor: "#EFEFEF" },
// });