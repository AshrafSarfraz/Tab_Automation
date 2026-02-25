// CashFlow1.tsx
// ✅ Same UI + same Budget(A/B) rule + same Yearly totals behavior
// ✅ No company param — loads ALL companies
// ✅ Each company: ONLY 1 Revenue row (total) + 1 Cost row (total)
// ✅ Revenue section first (company-wise + grand), then Cost section, then Net Total

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  FlatList,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from "react-native";

import { useRoute } from "@react-navigation/native";
import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal"; // ✅ SINGLE API ONLY
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";
import CustomButton from "../../../../component/customButton";
import { exportTrialBalanceToXLSX } from "../../../../database/Utils/export_to_excel";

// ======================= CONFIG =======================
const { width } = Dimensions.get("window");
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;

// LEFT (frozen cols)
const TYPE_W = 100;
const COMP_W = 250; // show Company name here
const CODE_W = 110; // blank in CashFlow
const LEFT_WIDTH = 570;

// RIGHT
const TOTAL_W = 100; // yearly only
const PREV_W = 120; // yearly only
const BUDGET_TOTAL_W = 120; // budget mode total (A/B)
const MONTH_W = 100;

// ✅ Westwalk companies
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ======================= API/DB TYPES =======================
type ApiRow = {
  accountno?: string;
  auxcode?: string;
  company?: string;
  component?: string;
  cc2?: string;
  cc3?: string;
  cc3code?: string;
  month?: number;
  year?: number;
  balanceFirst?: number;
  budgetedAmount?: number;
  accountType?: string; // "Revenue" / "Cost"
};

type TrialBalanceRow = {
  type?: "Revenue" | "Cost" | string;
  company?: string;
  component?: string;
  year?: number;
  month?: number;
  accountno?: string;
  cc3code?: string;
  auxcode?: string;
  balanceFirst?: number; // A
  budgetedAmount?: number; // B
  cc2?: string;
};

type RowItem = TrialBalanceRow & {
  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: "Revenue" | "Cost" | "Grand";
  // A
  totalBalances?: number[];
  totalSum?: number;
  // P
  prevYearSum?: number;
  prevMonthlyBalances?: number[];
  // B
  budgetMonthly?: number[];
  budgetSum?: number;
};

// ======================= HELPERS =======================
const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const normalize = (r: ApiRow): TrialBalanceRow => {
  const type = String(r.accountType || "").trim();
  return {
    type: type || "",
    company: String(r.company || "").trim(),
    component: String(r.component || "").trim(),
    year: Number(r.year || 0),
    month: Number(r.month || 0),
    accountno: String(r.accountno || "").trim(),
    auxcode: String(r.auxcode || "").trim(),
    cc3code: String(r.cc3 || r.cc3code || "").trim(),
    balanceFirst: Number(r.balanceFirst || 0),
    budgetedAmount: Number(r.budgetedAmount || 0),
    cc2: String(r.cc2 || "").trim(),
  };
};

const extractRowsFromSnap = (snap: any): ApiRow[] => {
  if (snap && Array.isArray(snap.data)) return snap.data;
  if (snap?.data && Array.isArray(snap.data.data)) return snap.data.data;
  if (snap?.data && Array.isArray(snap.data)) return snap.data;
  if (Array.isArray(snap)) return snap;
  return [];
};

// ✅ Display rule updated:
// - Only months BEFORE current month can show Actual (if exists)
// - Current month and future months MUST show Budget
const EPS = 0.000001;
const hasActual = (v: number) => Math.abs(Number(v || 0)) > EPS;
const getCurrentMonth = () => new Date().getMonth() + 1;

const displayActualElseBudget = (row: RowItem, i: number) => {
  const currentMonth = getCurrentMonth();
  const monthNo = i + 1;

  const a = row.totalBalances?.[i] ?? 0;
  const b = row.budgetMonthly?.[i] ?? 0;

  const allowActual = monthNo < currentMonth;
  if (allowActual && hasActual(a)) return a;
  return b;
};

const displayActualElseBudgetTotal = (row: RowItem) => {
  let s = 0;
  for (let i = 0; i < 12; i++) s += Number(displayActualElseBudget(row, i) || 0);
  return s;
};

// ======= Net Profit builders (RAW sign world) =======
const sumMonthly = (
  all: TrialBalanceRow[],
  company: string,
  year: number,
  type: "Revenue" | "Cost",
  field: "balanceFirst" | "budgetedAmount"
) => {
  const out = Array(12).fill(0);
  for (const r of all) {
    if (String(r.company || "").trim() !== String(company).trim()) continue;
    if (Number(r.year) !== Number(year)) continue;
    if (String(r.type || "").trim() !== type) continue;
    if (!isValidMonth(r.month)) continue;

    const idx = Number(r.month) - 1;
    out[idx] += Number((r as any)[field] || 0);
  }
  return out;
};

const netProfitMonthlyRaw = (all: TrialBalanceRow[], company: string, year: number) => {
  const rev = sumMonthly(all, company, year, "Revenue", "balanceFirst");
  const cst = sumMonthly(all, company, year, "Cost", "balanceFirst");
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
};

const budgetNetProfitMonthlyRaw = (all: TrialBalanceRow[], company: string, year: number) => {
  const rev = sumMonthly(all, company, year, "Revenue", "budgetedAmount");
  const cst = sumMonthly(all, company, year, "Cost", "budgetedAmount");
  return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
};

type ScreenMode = "budget" | "yearly";

// ======================= MAIN =======================
export default function CashFlowReportDetails1() {
  const route = useRoute<any>();
  const { year, mode = "budget" } = (route.params ?? {}) as { year?: number; mode?: ScreenMode };

  const isBudgetMode = mode === "budget";
  const isYearlyMode = mode === "yearly";

  const yearParam = Number(year || 0);
  const prevYear = yearParam ? yearParam - 1 : 0;

  const rightContentWidth = isBudgetMode ? BUDGET_TOTAL_W + 12 * MONTH_W : TOTAL_W + PREV_W + BUDGET_TOTAL_W;

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

  // =================== BUILD TOTALS PER COMPANY ===================
  const buildCompanyTotals = (all: TrialBalanceRow[], companyName: string, y: number) => {
    // base rows
    let curr = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y);
    let prev = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y - 1);

    // ✅ SAME Westwalk rules as TrialBalance
    if (companyName === C_RE) {
      const advNetA = netProfitMonthlyRaw(all, C_ADV, y);
      const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, y);
      const advNetP = netProfitMonthlyRaw(all, C_ADV, y - 1);

      const marketingRightsRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Revenue",
        company: C_RE,
        component: "Marketing Rights",
        year: y,
        month: i + 1,
        accountno: "__NET_ADV__",
        cc3code: "MR",
        auxcode: "",
        balanceFirst: Number(advNetA[i] || 0),
        budgetedAmount: Number(advNetB[i] || 0),
        cc2: "",
      }));

      const marketingRightsRowsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Revenue",
        company: C_RE,
        component: "Marketing Rights",
        year: y - 1,
        month: i + 1,
        accountno: "__NET_ADV__",
        cc3code: "MR",
        auxcode: "",
        balanceFirst: Number(advNetP[i] || 0),
        budgetedAmount: 0,
        cc2: "",
      }));

      const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, y);
      const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, y);
      const assetsNetP = netProfitMonthlyRaw(all, C_ASSETS, y - 1);

      const fmCostRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Cost",
        company: C_RE,
        component: "FM COST",
        year: y,
        month: i + 1,
        accountno: "__NET_ASSETS__",
        cc3code: "",
        auxcode: "FMC",
        balanceFirst: Number(assetsNetA[i] || 0),
        budgetedAmount: Number(assetsNetB[i] || 0),
        cc2: "",
      }));

      const fmCostRowsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Cost",
        company: C_RE,
        component: "FM COST",
        year: y - 1,
        month: i + 1,
        accountno: "__NET_ASSETS__",
        cc3code: "",
        auxcode: "FMC",
        balanceFirst: Number(assetsNetP[i] || 0),
        budgetedAmount: 0,
        cc2: "",
      }));

      curr = curr.concat(marketingRightsRowsCurr, fmCostRowsCurr);
      prev = prev.concat(marketingRightsRowsPrev, fmCostRowsPrev);
    }

    if (companyName === C_ASSETS) {
      const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, y);
      const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, y);
      const assetsNetP = netProfitMonthlyRaw(all, C_ASSETS, y - 1);

      const offsetAssetsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Revenue",
        company: C_ASSETS,
        component: "Westwalk Contract",
        year: y,
        month: i + 1,
        accountno: "__OFFSET_ASSETS_NET__",
        cc3code: "WWC",
        auxcode: "",
        balanceFirst: -Number(assetsNetA[i] || 0),
        budgetedAmount: -Number(assetsNetB[i] || 0),
        cc2: "",
      }));

      const offsetAssetsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Revenue",
        company: C_ASSETS,
        component: "Westwalk Contract",
        year: y - 1,
        month: i + 1,
        accountno: "__OFFSET_ASSETS_NET__",
        cc3code: "WWC",
        auxcode: "",
        balanceFirst: -Number(assetsNetP[i] || 0),
        budgetedAmount: 0,
        cc2: "",
      }));

      curr = curr.concat(offsetAssetsCurr);
      prev = prev.concat(offsetAssetsPrev);
    }

    if (companyName === C_ADV) {
      const advNetA = netProfitMonthlyRaw(all, C_ADV, y);
      const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, y);
      const advNetP = netProfitMonthlyRaw(all, C_ADV, y - 1);

      const offsetAdvCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Cost",
        company: C_ADV,
        component: "Westwalk Contract",
        year: y,
        month: i + 1,
        accountno: "__OFFSET_ADV_NET__",
        cc3code: "",
        auxcode: "WWC",
        balanceFirst: -Number(advNetA[i] || 0),
        budgetedAmount: -Number(advNetB[i] || 0),
        cc2: "",
      }));

      const offsetAdvPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
        type: "Cost",
        company: C_ADV,
        component: "Westwalk Contract",
        year: y - 1,
        month: i + 1,
        accountno: "__OFFSET_ADV_NET__",
        cc3code: "",
        auxcode: "WWC",
        balanceFirst: -Number(advNetP[i] || 0),
        budgetedAmount: 0,
        cc2: "",
      }));

      curr = curr.concat(offsetAdvCurr);
      prev = prev.concat(offsetAdvPrev);
    }

    const revA = Array(12).fill(0);
    const revB = Array(12).fill(0);
    const revP = Array(12).fill(0);

    const costA = Array(12).fill(0);
    const costB = Array(12).fill(0);
    const costP = Array(12).fill(0);

    for (const r of curr) {
      if (!isValidMonth(r.month)) continue;
      const i = Number(r.month) - 1;
      const t = String(r.type || "").trim();
      if (t === "Revenue") {
        revA[i] += Number(r.balanceFirst || 0);
        revB[i] += Number(r.budgetedAmount || 0);
      } else if (t === "Cost") {
        costA[i] += Number(r.balanceFirst || 0);
        costB[i] += Number(r.budgetedAmount || 0);
      }
    }

    for (const r of prev) {
      if (!isValidMonth(r.month)) continue;
      const i = Number(r.month) - 1;
      const t = String(r.type || "").trim();
      if (t === "Revenue") revP[i] += Number(r.balanceFirst || 0);
      else if (t === "Cost") costP[i] += Number(r.balanceFirst || 0);
    }

    return {
      revA,
      revB,
      revP,
      costA,
      costB,
      costP,
    };
  };

  // =================== DATA BUILD ===================
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!yearParam) {
          setData([]);
          setError("year param missing");
          return;
        }

        const snap = await getWestwalkMongoFromSQLite();
        const rawRows = extractRowsFromSnap(snap);

        // normalize
        let all = rawRows.map(normalize);

        // cc2 only meaningful for RE revenue; clear for other companies revenue (same as TB)
        all = all.map((r) => {
          const cmp = String(r.company || "").trim();
          const t = String(r.type || "").trim();
          if (t === "Revenue" && cmp !== C_RE) return { ...r, cc2: "" };
          return r;
        });

        // companies list for this year
        const companies = Array.from(
          new Set(
            all
              .filter((r) => Number(r.year) === yearParam && String(r.company || "").trim())
              .map((r) => String(r.company || "").trim())
          )
        ).sort((a, b) => a.localeCompare(b));

        const structured: RowItem[] = [];
        structured.push({ yearHeader: true, company: "All Companies", year: yearParam } as RowItem);

        // ===== Revenue section =====
        const grandRevA = Array(12).fill(0);
        const grandRevB = Array(12).fill(0);
        const grandRevP = Array(12).fill(0);

        for (const cmp of companies) {
          const t = buildCompanyTotals(all, cmp, yearParam);

          t.revA.forEach((v, i) => (grandRevA[i] += v));
          t.revB.forEach((v, i) => (grandRevB[i] += v));
          t.revP.forEach((v, i) => (grandRevP[i] += v));

          structured.push({
            type: "Revenue",
            company: cmp,
            component: cmp, // show company name
            year: yearParam,
            totalBalances: t.revA,
            totalSum: sumArr(t.revA),
            budgetMonthly: t.revB,
            budgetSum: sumArr(t.revB),
            prevMonthlyBalances: t.revP,
            prevYearSum: sumArr(t.revP),
          } as RowItem);
        }

        structured.push({
          isTotalRow: true,
          totalType: "Revenue",
          type: "Revenue",
          company: "All Companies",
          component: "All Companies",
          year: yearParam,
          totalBalances: grandRevA,
          totalSum: sumArr(grandRevA),
          budgetMonthly: grandRevB,
          budgetSum: sumArr(grandRevB),
          prevMonthlyBalances: grandRevP,
          prevYearSum: sumArr(grandRevP),
        } as RowItem);

        // ===== Cost section =====
        const grandCostA = Array(12).fill(0);
        const grandCostB = Array(12).fill(0);
        const grandCostP = Array(12).fill(0);

        for (const cmp of companies) {
          const t = buildCompanyTotals(all, cmp, yearParam);

          t.costA.forEach((v, i) => (grandCostA[i] += v));
          t.costB.forEach((v, i) => (grandCostB[i] += v));
          t.costP.forEach((v, i) => (grandCostP[i] += v));

          structured.push({
            type: "Cost",
            company: cmp,
            component: cmp,
            year: yearParam,
            totalBalances: t.costA,
            totalSum: sumArr(t.costA),
            budgetMonthly: t.costB,
            budgetSum: sumArr(t.costB),
            prevMonthlyBalances: t.costP,
            prevYearSum: sumArr(t.costP),
          } as RowItem);
        }

        structured.push({
          isTotalRow: true,
          totalType: "Cost",
          type: "Cost",
          company: "All Companies",
          component: "All Companies",
          year: yearParam,
          totalBalances: grandCostA,
          totalSum: sumArr(grandCostA),
          budgetMonthly: grandCostB,
          budgetSum: sumArr(grandCostB),
          prevMonthlyBalances: grandCostP,
          prevYearSum: sumArr(grandCostP),
        } as RowItem);

        // ===== Net Total =====
        const netA = Array(12).fill(0).map((_, i) => (grandRevA[i] || 0) + (grandCostA[i] || 0));
        const netB = Array(12).fill(0).map((_, i) => (grandRevB[i] || 0) + (grandCostB[i] || 0));
        const netP = Array(12).fill(0).map((_, i) => (grandRevP[i] || 0) + (grandCostP[i] || 0));

        structured.push({
          isTotalRow: true,
          totalType: "Grand",
          type: "Grand",
          company: "All Companies",
          component: "All Companies",
          year: yearParam,
          totalBalances: netA,
          totalSum: sumArr(netA),
          budgetMonthly: netB,
          budgetSum: sumArr(netB),
          prevMonthlyBalances: netP,
          prevYearSum: sumArr(netP),
        } as RowItem);

        if (mounted) setData(structured);
      } catch (e: any) {
        if (mounted) {
          console.log(e);
          setError(e?.message || "Failed to load cashflow from API");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [yearParam]);

  // =================== HEADERS ===================
  const LeftHeader = () => (
    <View style={[styles.headerRow, { width: 380, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>
        Type
      </Text>
      <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold", textAlign: "left" }]}>
        Company
      </Text>
    
    </View>
  );

  const RightHeader = () => (
    <ScrollView ref={headerHRef} horizontal onScroll={onHeaderHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
      <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT, backgroundColor: "#ffffff" }]}>
        {isYearlyMode && (
          <>
            <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (A)
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (P)
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (B)
            </Text>
          </>
        )}

        {isBudgetMode && (
          <>
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (A/B)
            </Text>

            {months.map((m, i) => (
              <Text
                key={`h-${m}-AB`}
                numberOfLines={1}
                style={[
                  styles.cell,
                  { width: MONTH_W, fontWeight: "bold", textAlign: "center", paddingVertical: 13 },
                  DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
                ]}
              >
                {`${m} (A/B)`}
              </Text>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );

  // =================== ROW RENDERERS ===================
  const renderLeftRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return (
        <View style={[styles.yearHeaderRow, { width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
          <Text numberOfLines={1} style={{ fontWeight: "bold", fontSize: 12, color: "white" }}>
            {item.company} - {item.year}
          </Text>
        </View>
      );
    }

    if (item.isTotalRow) {
      const label = item.totalType === "Grand" ? "Net Total" : `${item.totalType} Total`;
      let bgColor = "#f0f8ff";
      let MbTotal = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") {
        bgColor = "#ffe4b5";
        MbTotal = 50;
      }

      return (
        <View
          style={[
            styles.bodyRow,
            {
              backgroundColor: bgColor,
              borderTopWidth: 2,
              borderColor: "#aaa",
              width: LEFT_WIDTH,
              height: ROW_HEIGHT,
              marginBottom: MbTotal,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>
            {label}
          </Text>
          <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>
            {item.company}
          </Text>
          <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left" }]} />
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>
          {item.type}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>
          {item.company}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]}>
          {/* CashFlow: no code */}
        </Text>
      </View>
    );
  };

  const renderBudgetMonthsAB = (row: RowItem, weight: "normal" | "bold" | "600" = "normal", enableBanding = true) => {
    const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";
    return months.map((_, i) => (
      <Text
        key={`row-ab-${i}`}
        numberOfLines={1}
        style={[
          styles.cell,
          { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
          enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
        ]}
      >
        {Number(displayActualElseBudget(row, i)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </Text>
    ));
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const totalA = Number(item.totalSum || 0);
    const totalP = Number(item.prevYearSum || 0);
    const totalB = Number(item.budgetSum || 0);

    if (item.isTotalRow) {
      let bgColor = "#f0f8ff";
      let MbTotal = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") {
        bgColor = "#ffe4b5";
        MbTotal = 50;
      }

      return (
        <View
          style={[
            styles.bodyRow,
            {
              backgroundColor: bgColor,
              borderTopWidth: 2,
              borderColor: "#aaa",
              height: ROW_HEIGHT,
              marginBottom: MbTotal,
            },
          ]}
        >
          {isYearlyMode && (
            <>
              <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>
                {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>
                {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
                {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            </>
          )}

          {isBudgetMode && (
            <>
              <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
                {Number(displayActualElseBudgetTotal(item)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              {renderBudgetMonthsAB(item, "bold", false)}
            </>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.bodyRow, { height: ROW_HEIGHT }]}>
        {isYearlyMode && (
          <>
            <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
              {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
              {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
              {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
          </>
        )}

        {isBudgetMode && (
          <>
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
              {Number(displayActualElseBudgetTotal(item)).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            {renderBudgetMonthsAB(item, "normal", true)}
          </>
        )}
      </View>
    );
  };

  // =================== UI ===================
  if (!yearParam) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red", fontWeight: "700" }}>year param missing</Text>
      </View>
    );
  }

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
        <CustomHeader title={`CashFlow 1 - ${yearParam}`} />
        <CustomButton
          title="Export"
          onPress={async () => {
            try {
              const p = await exportTrialBalanceToXLSX(data, `CashFlow1_${yearParam}`);
              console.log("✅ file saved at:", p);
            } catch (e: any) {
              console.warn("❌ XLSX export failed:", e?.message ?? e);
            }
          }}
        />
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
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
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
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
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

// =================== STYLES ===================
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
    paddingVertical: 0,
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  darkBodyCell: { backgroundColor: "#EFEFEF" },
});