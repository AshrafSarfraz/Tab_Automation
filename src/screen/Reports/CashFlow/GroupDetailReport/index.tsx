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

import { useRoute } from "@react-navigation/native";
import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal";
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";
import CustomButton from "../../../../component/customButton";
import { exportTrialBalanceToXLSX } from "../../../../database/Utils/export_to_excel";
import NetIncomeOpeningClosingTable from "../../../../component/Open-CloseBalance";
import Container from "../../../../ui/useLayout";

// ======================= CONFIG =======================
const { width } = Dimensions.get("window");
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;

// LEFT (frozen cols)
const TYPE_W = 100;
const COMP_W = 250;
const CODE_W = 110;
const LEFT_WIDTH = 570;

// RIGHT
const TOTAL_W = 100;
const PREV_W = 120;
const BUDGET_TOTAL_W = 120;
const MONTH_W = 100;

// ✅ Westwalk companies
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";

// ✅ companies that must show as ZERO (but their impact is transferred into RE)
const ZERO_COMPANIES = new Set([C_ADV, C_ASSETS]);

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

  // monthly shown (in budget mode: A/B blended; in yearly mode: Actual A)
  totalBalances?: number[];
  totalSum?: number;

  // Prev year (P)
  prevYearSum?: number;
  prevMonthlyBalances?: number[];

  // Budget (B)
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

// ✅ SAME RULE AS SUMMARY CARDS:
// completed months only => currentMonth - 1
const getAsOfMonth = () => Math.max(0, new Date().getMonth() + 1 - 1);

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
    const asOfMonth = getAsOfMonth(); // ✅ same as summary cards

    // ✅ FORCE ZERO for ADV + ASSETS (show row but all values 0)
    if (ZERO_COMPANIES.has(companyName)) {
      const z = Array(12).fill(0);
      return {
        revA: z.slice(),
        revB: z.slice(),
        revP: z.slice(),
        costA: z.slice(),
        costB: z.slice(),
        costP: z.slice(),
        // ✅ blended arrays (A/B)
        revAB: z.slice(),
        costAB: z.slice(),
      };
    }

    // base rows
    let curr = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y);
    let prev = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y - 1);

    // ✅ Transfer ADV + ASSETS impact into RE (same as cards logic but monthly)
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

    // ✅ BLENDED (A/B) monthly arrays (exact like summary cards)
    const revAB = Array(12).fill(0);
    const costAB = Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      const monthNo = i + 1;
      const useActual = monthNo >= 1 && monthNo <= asOfMonth; // completed months only
      revAB[i] = useActual ? Number(revA[i] || 0) : Number(revB[i] || 0);
      costAB[i] = useActual ? Number(costA[i] || 0) : Number(costB[i] || 0);
    }

    return { revA, revB, revP, costA, costB, costP, revAB, costAB };
  };

  // =================== OTHERS: BUILD GROUPED ROWS (cc3code + accountno) ===================
  const buildOthersGroupedRows = (
    all: TrialBalanceRow[],
    y: number,
    type: "Revenue" | "Cost",
    isBudgetModeLocal: boolean
  ) => {
    const asOfMonth = getAsOfMonth();

    const curr = all.filter(
      (r) =>
        String(r.company || "").trim() === "others" &&
        Number(r.year) === y &&
        String(r.type || "").trim() === type
    );

    const prev = all.filter(
      (r) =>
        String(r.company || "").trim() === "others" &&
        Number(r.year) === y - 1 &&
        String(r.type || "").trim() === type
    );

    const keyOf = (r: TrialBalanceRow) => `${String(r.cc3code || "").trim()}||${String(r.accountno || "").trim()}`;

    const groups = new Map<
      string,
      {
        cc3code: string;
        accountno: string;
        componentName: string; // shown in Company column
        A: number[];
        B: number[];
        P: number[];
      }
    >();

    const ensure = (r: TrialBalanceRow) => {
      const key = keyOf(r);
      if (!groups.has(key)) {
        groups.set(key, {
          cc3code: String(r.cc3code || "").trim(),
          accountno: String(r.accountno || "").trim(),
          componentName:
            String(r.component || "").trim() ||
            `${String(r.cc3code || "").trim()} ${String(r.accountno || "").trim()}`,
          A: Array(12).fill(0),
          B: Array(12).fill(0),
          P: Array(12).fill(0),
        });
      }
      return groups.get(key)!;
    };

    for (const r of curr) {
      if (!isValidMonth(r.month)) continue;
      const i = Number(r.month) - 1;
      const g = ensure(r);
      g.A[i] += Number(r.balanceFirst || 0);
      g.B[i] += Number(r.budgetedAmount || 0);
    }

    for (const r of prev) {
      if (!isValidMonth(r.month)) continue;
      const i = Number(r.month) - 1;
      const g = ensure(r);
      g.P[i] += Number(r.balanceFirst || 0);
    }

    const rows: RowItem[] = [];

    for (const g of groups.values()) {
      const AB = Array(12)
        .fill(0)
        .map((_, i) => {
          const monthNo = i + 1;
          const useActual = monthNo >= 1 && monthNo <= asOfMonth;
          return useActual ? Number(g.A[i] || 0) : Number(g.B[i] || 0);
        });

      const shown = isBudgetModeLocal ? AB : g.A;

      rows.push({
        type,
        // ✅ show component name instead of company name
        company: g.componentName,
        component: g.componentName,

        year: y,
        cc3code: g.cc3code,
        accountno: g.accountno,

        totalBalances: shown,
        totalSum: sumArr(shown),

        budgetMonthly: g.B,
        budgetSum: sumArr(g.B),

        prevMonthlyBalances: g.P,
        prevYearSum: sumArr(g.P),
      });
    }

    rows.sort((a, b) => String(a.company || "").localeCompare(String(b.company || "")));
    return rows;
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

        // cc2 only meaningful for RE revenue; clear for other companies revenue
        all = all.map((r) => {
          const cmp = String(r.company || "").trim();
          const t = String(r.type || "").trim();
          if (t === "Revenue" && cmp !== C_RE) return { ...r, cc2: "" };
          return r;
        });

        // companies list for this year (KEEP ALL, including ADV + ASSETS)
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
        const grandRevShown = Array(12).fill(0); // ✅ shown totals (A in yearly, AB in budget)
        const grandRevB = Array(12).fill(0);
        const grandRevP = Array(12).fill(0);

        for (const cmp of companies) {
          // ✅ SPECIAL: Others => multiple rows by cc3code+accountno; show component name in Company column
          if (cmp === "others") {
            const othersRows = buildOthersGroupedRows(all, yearParam, "Revenue", isBudgetMode);

            for (const r of othersRows) {
              const shown = r.totalBalances ?? Array(12).fill(0);

              shown.forEach((v, i) => (grandRevShown[i] += Number(v || 0)));
              (r.budgetMonthly ?? Array(12).fill(0)).forEach((v, i) => (grandRevB[i] += Number(v || 0)));
              (r.prevMonthlyBalances ?? Array(12).fill(0)).forEach((v, i) => (grandRevP[i] += Number(v || 0)));

              structured.push(r);
            }

            continue; // ✅ skip normal Others company row
          }

          const t = buildCompanyTotals(all, cmp, yearParam);
          const shown = isBudgetMode ? t.revAB : t.revA;

          shown.forEach((v, i) => (grandRevShown[i] += Number(v || 0)));
          t.revB.forEach((v, i) => (grandRevB[i] += Number(v || 0)));
          t.revP.forEach((v, i) => (grandRevP[i] += Number(v || 0)));

          structured.push({
            type: "Revenue",
            company: cmp,
            component: cmp,
            year: yearParam,

            // ✅ IMPORTANT: these are the values used by UI + export for totals
            totalBalances: shown,
            totalSum: sumArr(shown),

            // keep B & P for yearly mode columns / reference
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
          totalBalances: grandRevShown,
          totalSum: sumArr(grandRevShown),
          budgetMonthly: grandRevB,
          budgetSum: sumArr(grandRevB),
          prevMonthlyBalances: grandRevP,
          prevYearSum: sumArr(grandRevP),
        } as RowItem);

        // ===== Cost section =====
        const grandCostShown = Array(12).fill(0); // ✅ shown totals (A in yearly, AB in budget)
        const grandCostB = Array(12).fill(0);
        const grandCostP = Array(12).fill(0);

        for (const cmp of companies) {
          // ✅ SPECIAL: Others => multiple rows by cc3code+accountno; show component name in Company column
          if (cmp === "others") {
            const othersRows = buildOthersGroupedRows(all, yearParam, "Cost", isBudgetMode);

            for (const r of othersRows) {
              const shown = r.totalBalances ?? Array(12).fill(0);

              shown.forEach((v, i) => (grandCostShown[i] += Number(v || 0)));
              (r.budgetMonthly ?? Array(12).fill(0)).forEach((v, i) => (grandCostB[i] += Number(v || 0)));
              (r.prevMonthlyBalances ?? Array(12).fill(0)).forEach((v, i) => (grandCostP[i] += Number(v || 0)));

              structured.push(r);
            }

            continue; // ✅ skip normal Others company row
          }

          const t = buildCompanyTotals(all, cmp, yearParam);
          const shown = isBudgetMode ? t.costAB : t.costA;

          shown.forEach((v, i) => (grandCostShown[i] += Number(v || 0)));
          t.costB.forEach((v, i) => (grandCostB[i] += Number(v || 0)));
          t.costP.forEach((v, i) => (grandCostP[i] += Number(v || 0)));

          structured.push({
            type: "Cost",
            company: cmp,
            component: cmp,
            year: yearParam,

            // ✅ IMPORTANT: these are the values used by UI + export for totals
            totalBalances: shown,
            totalSum: sumArr(shown),

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
          totalBalances: grandCostShown,
          totalSum: sumArr(grandCostShown),
          budgetMonthly: grandCostB,
          budgetSum: sumArr(grandCostB),
          prevMonthlyBalances: grandCostP,
          prevYearSum: sumArr(grandCostP),
        } as RowItem);

        // ===== Net Total (shown) =====
        const netShown = Array(12)
          .fill(0)
          .map((_, i) => Number(grandRevShown[i] || 0) + Number(grandCostShown[i] || 0));
        const netB = Array(12)
          .fill(0)
          .map((_, i) => Number(grandRevB[i] || 0) + Number(grandCostB[i] || 0));
        const netP = Array(12)
          .fill(0)
          .map((_, i) => Number(grandRevP[i] || 0) + Number(grandCostP[i] || 0));

        structured.push({
          isTotalRow: true,
          totalType: "Grand",
          type: "Grand",
          company: "All Companies",
          component: "All Companies",
          year: yearParam,
          totalBalances: netShown,
          totalSum: sumArr(netShown),
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
  }, [yearParam, mode]); // ✅ include mode

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
    <ScrollView
      ref={headerHRef}
      horizontal
      onScroll={onHeaderHScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator
    >
      <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT, backgroundColor: "#ffffff" }]}>
        {isYearlyMode && (
          <>
            <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (A)
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>
              Total (P)
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}
            >
              Total (B)
            </Text>
          </>
        )}

        {isBudgetMode && (
          <>
            <Text
              numberOfLines={1}
              style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}
            >
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
        <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]} />
      </View>
    );
  };

  // ✅ In budget mode, row.totalBalances already contains blended AB values.
  const renderBudgetMonthsAB = (row: RowItem, weight: "normal" | "bold" | "600" = "normal", enableBanding = true) => {
    const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";
    const arr = row.totalBalances ?? Array(12).fill(0);

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
        {Number(arr[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </Text>
    ));
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const totalShown = Number(item.totalSum || 0); // ✅ shown total (A in yearly, AB in budget)
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
                {Number(item.totalSum || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
                {totalShown.toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
              {Number(item.totalSum || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
              {totalShown.toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
 

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, borderBottomWidth: 1 }}>
        <CustomHeader title={`CashFlow - ${yearParam}`} />
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
        {LeftHeader()}
        {RightHeader()}
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
      {/* <View style={{ padding: 12 }}>
         <NetIncomeOpeningClosingTable year={year} mode="budget" />
       </View> */}
    </Container>
  );
}

// =================== STYLES ===================
const styles = StyleSheet.create({
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