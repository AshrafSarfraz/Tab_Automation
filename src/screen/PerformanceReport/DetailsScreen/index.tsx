// TrialBalance.tsx
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
} from "react-native";

import { useRoute } from "@react-navigation/native";
import { Colors } from "../../../themes/color";
import CustomHeader from "../../../component/customHeader";

import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
import { getOtherCmpMongoFromSQLite } from "../../../database/otherCmpTrailBal";

// ======================= CONFIG =======================
const { width } = Dimensions.get("window");
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 30;
const YEAR_HEADER_HEIGHT = 30;

// LEFT (3 frozen cols)
const TYPE_W = 100;
const COMP_W = 170;
const CODE_W = 110;
const LEFT_WIDTH = 570;

// RIGHT
const TOTAL_W = 100; // current total (A)
const PREV_W  = 120; // previous year total (P)
const BUDGET_TOTAL_W = 120; // budget total (B)
const MONTH_W = 100;

// Right width: Total(A) | Total(P) | Total(B) | per month => A | P | B (x12)
const rightContentWidth =
  TOTAL_W + PREV_W + BUDGET_TOTAL_W + (12 * (3 * MONTH_W));

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

  balanceFirst?: number;     // A
  budgetedAmount?: number;   // B
  cc2?: string;
};

type RowItem = TrialBalanceRow & {
  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: "Revenue" | "Cost" | "Grand";

  totalBalances?: number[];         // A monthly
  totalSum?: number;                // A total

  prevYearSum?: number;             // P total
  prevMonthlyBalances?: number[];   // P monthly

  budgetMonthly?: number[];         // B monthly
  budgetSum?: number;               // B total

  isGroupParent?: boolean;
  groupKey?: string;
  children?: RowItem[];
};

// ======================= HELPERS =======================
const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const buildMatchKey = (t: string, acc: string, code: string) =>
  `${(t || "").toLowerCase()}||${acc || ""}||${code || ""}`;

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

// ✅ Westwalk companies condition
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";
const WESTWALK_COMPANIES = new Set([C_RE, C_ADV, C_ASSETS]);

// ✅ extract rows from sqlite snapshot (handles both formats)
const extractRowsFromSnap = (snap: any): ApiRow[] => {
  const payload = snap?.data;

  // othercmp snapshot: { savedAt, data: [ ... ] }
  if (Array.isArray(payload)) return payload;

  // westwalk snapshot: { savedAt, data: { success, count, data:[...] } }
  if (payload && Array.isArray(payload.data)) return payload.data;

  // extra safety
  if (Array.isArray(snap)) return snap;
  if (snap && Array.isArray(snap.data)) return snap.data;

  return [];
};

// ======= Net Profit builders (for detail screen merge) =======
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

// net profit in RAW sign world = revenue + cost (because cost is normally negative in TB)
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

export default function TrialBalanceTableScreen() {
  const route = useRoute();
  const { company = "", type = "", year } = (route.params ?? {}) as {
    company?: string;
    type?: string;
    year?: number;
  };

  const compParam = String(company || "").trim();
  const typeParam = String(type || "").trim();
  const yearParam = Number(year || 0);
  const prevYear = yearParam ? yearParam - 1 : 0;

  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Freeze first 3 columns (LEFT) + RIGHT scrollable
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

  // =================== DATA BUILD (FROM SQLITE) ===================
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!compParam || !yearParam) {
          setData([]);
          setError("company/year params missing");
          return;
        }

        // ✅ choose sqlite DB based on company
        const isWestwalk = WESTWALK_COMPANIES.has(compParam);

        const snap = isWestwalk
          ? await getWestwalkMongoFromSQLite()
          : await getOtherCmpMongoFromSQLite();

        const rawRows = extractRowsFromSnap(snap);
        const all = rawRows.map(normalize);

        // ===== Base current/prev for selected company =====
        let curr = all.filter((r) => r.company === compParam && r.year === yearParam);
        let prev = all.filter((r) => r.company === compParam && r.year === prevYear);

        // ===== ✅ APPLY YOUR CHART MERGE LOGIC IN DETAIL SCREEN =====
        // For West Walk Real Estate ONLY:
        //   - Revenue section: add Advertisement NET PROFIT as component "Marketing Rights"
        //   - Cost section: add Assets NET PROFIT as component "FM COST"
        if (compParam === C_RE) {
          // ---- Marketing Rights (Revenue) = ADV net profit (rev + cost raw) ----
          const advNetA = netProfitMonthlyRaw(all, C_ADV, yearParam);
          const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, yearParam);

          const advNetP = netProfitMonthlyRaw(all, C_ADV, prevYear);

          const marketingRightsRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
            type: "Revenue",
            company: C_RE,
            component: "Marketing Rights",
            year: yearParam,
            month: i + 1,
            accountno: "__NET_ADV__",   // unique
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
            year: prevYear,
            month: i + 1,
            accountno: "__NET_ADV__",
            cc3code: "MR",
            auxcode: "",
            balanceFirst: Number(advNetP[i] || 0),
            budgetedAmount: 0,
            cc2: "",
          }));

          // ---- FM COST (Cost) = ASSETS net profit BUT as COST LINE (negative raw) ----
          // chart me assets net profit cost side me add hota hai => TB raw cost line should be -(net profit)
          const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, yearParam);
          const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, yearParam);

          const assetsNetP = netProfitMonthlyRaw(all, C_ASSETS, prevYear);

          const fmCostRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
            type: "Cost",
            company: C_RE,
            component: "FM COST",
            year: yearParam,
            month: i + 1,
            accountno: "__NET_ASSETS__",
            cc3code: "",
            auxcode: "FMC",
            balanceFirst: Number(assetsNetA[i] || 0),      // ✅ important: negative for Cost section
            budgetedAmount: -Number(assetsNetB[i] || 0),    // ✅ same for budget
            cc2: "",
          }));

          const fmCostRowsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
            type: "Cost",
            company: C_RE,
            component: "FM COST",
            year: prevYear,
            month: i + 1,
            accountno: "__NET_ASSETS__",
            cc3code: "",
            auxcode: "FMC",
            balanceFirst: -Number(assetsNetP[i] || 0),
            budgetedAmount: 0,
            cc2: "",
          }));

          // ✅ append into curr/prev (so grouping + totals auto include them)
          curr = curr.concat(marketingRightsRowsCurr, fmCostRowsCurr);
          prev = prev.concat(marketingRightsRowsPrev, fmCostRowsPrev);
        }

        // filter by type param (after merge)
        if (typeParam) curr = curr.filter((r) => String(r.type) === typeParam);
        if (typeParam) prev = prev.filter((r) => String(r.type) === typeParam);

        // ========== PREV MAPS (P) ==========
        const prevRowMonthlyByKey: Record<string, number[]> = {};
        const prevRowTotalByKey: Record<string, number> = {};
        const prevComponentMonthlyByTypeComp: Record<string, number[]> = {};
        const prevComponentTotalByTypeComp: Record<string, number> = {};
        const prevTotalsMonthlyByType: Record<string, number[]> = {
          Revenue: Array(12).fill(0),
          Cost: Array(12).fill(0),
        };
        const prevTotalsByType: Record<string, number> = { Revenue: 0, Cost: 0 };

        prev.forEach((r) => {
          if (!isValidMonth(r.month)) return;
          const idx = (r.month as number) - 1;

          const t = String(r.type || "");
          const acc = String(r.accountno || "");
          const code = t === "Revenue" ? String(r.cc3code || "") : String(r.auxcode || "");
          const k = buildMatchKey(t, acc, code);

          if (!prevRowMonthlyByKey[k]) prevRowMonthlyByKey[k] = Array(12).fill(0);
          prevRowMonthlyByKey[k][idx] += Number(r.balanceFirst || 0);
          prevRowTotalByKey[k] = (prevRowTotalByKey[k] || 0) + Number(r.balanceFirst || 0);

          const compKey = `${t}::${String(r.component || "").trim()}`;
          if (!prevComponentMonthlyByTypeComp[compKey])
            prevComponentMonthlyByTypeComp[compKey] = Array(12).fill(0);
          prevComponentMonthlyByTypeComp[compKey][idx] += Number(r.balanceFirst || 0);
          prevComponentTotalByTypeComp[compKey] =
            (prevComponentTotalByTypeComp[compKey] || 0) + Number(r.balanceFirst || 0);

          if (t === "Revenue" || t === "Cost") {
            prevTotalsMonthlyByType[t][idx] += Number(r.balanceFirst || 0);
            prevTotalsByType[t] += Number(r.balanceFirst || 0);
          }
        });

        const prevGrandMonthly = Array(12)
          .fill(0)
          .map(
            (_, i) =>
              (prevTotalsMonthlyByType.Revenue[i] || 0) +
              (prevTotalsMonthlyByType.Cost[i] || 0)
          );
        const prevGrandTotal =
          (prevTotalsByType.Revenue || 0) + (prevTotalsByType.Cost || 0);

        // ========== STRUCTURE CURRENT YEAR (A + B) ==========
        const structured: RowItem[] = [];
        structured.push({ yearHeader: true, company: compParam, year: yearParam } as RowItem);

        const buildGrouped = (t: "Revenue" | "Cost") => {
          const rows = curr.filter((r) => r.type === t);

          const byKey: Record<string, RowItem> = {};

          rows.forEach((r) => {
            if (!isValidMonth(r.month)) return;
            const idx = (r.month as number) - 1;

            const acc = String(r.accountno || "");
            const code = t === "Revenue" ? String(r.cc3code || "") : String(r.auxcode || "");
            const key = `${acc}||${code}`;

            if (!byKey[key]) {
              const balancesA = Array(12).fill(0);
              const balancesB = Array(12).fill(0);

              balancesA[idx] = Number(r.balanceFirst || 0);
              balancesB[idx] = Number(r.budgetedAmount || 0);

              byKey[key] = {
                ...r,
                totalBalances: balancesA,
                totalSum: sumArr(balancesA),

                budgetMonthly: balancesB,
                budgetSum: sumArr(balancesB),
              } as RowItem;
            } else {
              byKey[key].totalBalances![idx] += Number(r.balanceFirst || 0);
              byKey[key].totalSum = sumArr(byKey[key].totalBalances!);

              byKey[key].budgetMonthly![idx] += Number(r.budgetedAmount || 0);
              byKey[key].budgetSum = sumArr(byKey[key].budgetMonthly!);
            }
          });

          const grouped = Object.values(byKey);

          const byComponent: Record<string, RowItem[]> = {};
          grouped.forEach((r) => {
            const comp = String(r.component || "").trim();
            const gk = `${yearParam}::${t}::${comp}`;
            if (!byComponent[gk]) byComponent[gk] = [];
            byComponent[gk].push(r);
          });

          const collapsed: RowItem[] = [];

          Object.entries(byComponent).forEach(([groupKey, arr]) => {
            if (arr.length <= 1) {
              const obj = arr[0];

              const acc = String(obj.accountno || "");
              const code = t === "Revenue" ? String(obj.cc3code || "") : String(obj.auxcode || "");
              const matchKey = buildMatchKey(t, acc, code);

              const prevRowTotal = prevRowTotalByKey[matchKey];
              const prevRowMonthly = prevRowMonthlyByKey[matchKey];

              const compKey = `${t}::${String(obj.component || "").trim()}`;
              const prevCompTotal = prevComponentTotalByTypeComp[compKey] || 0;
              const prevCompMonthly = prevComponentMonthlyByTypeComp[compKey] || Array(12).fill(0);

              obj.prevYearSum = prevRowTotal != null ? prevRowTotal : prevCompTotal;
              obj.prevMonthlyBalances = prevRowMonthly ? prevRowMonthly.slice() : prevCompMonthly.slice();

              if (!obj.budgetMonthly) obj.budgetMonthly = Array(12).fill(0);
              if (obj.budgetSum == null) obj.budgetSum = sumArr(obj.budgetMonthly);

              collapsed.push(obj);
            } else {
              const sumBalancesA = Array(12).fill(0);
              const sumBalancesB = Array(12).fill(0);

              arr.forEach((ch) => {
                ch.totalBalances?.forEach((b, i) => (sumBalancesA[i] += b));
                ch.budgetMonthly?.forEach((b, i) => (sumBalancesB[i] += b));
              });

              const childrenWithPrev = arr.map((ch) => {
                const acc = String(ch.accountno || "");
                const code = t === "Revenue" ? String(ch.cc3code || "") : String(ch.auxcode || "");
                const matchKey = buildMatchKey(t, acc, code);

                return {
                  ...ch,
                  prevYearSum: prevRowTotalByKey[matchKey] || 0,
                  prevMonthlyBalances: (prevRowMonthlyByKey[matchKey] || Array(12).fill(0)).slice(),
                  budgetMonthly: (ch.budgetMonthly || Array(12).fill(0)).slice(),
                  budgetSum: ch.budgetSum ?? sumArr(ch.budgetMonthly || []),
                };
              });

              const parentComp = String(arr[0].component || "").trim();
              const compKey = `${t}::${parentComp}`;
              const prevCompTotal =
                prevComponentTotalByTypeComp[compKey] ??
                childrenWithPrev.reduce((s, c) => s + Number(c.prevYearSum || 0), 0);
              const prevCompMonthly = prevComponentMonthlyByTypeComp[compKey] || Array(12).fill(0);

              collapsed.push({
                isGroupParent: true,
                groupKey,
                type: t,
                company: compParam,
                component: parentComp,
                accountno: "",
                cc3code: "",
                auxcode: "",
                totalBalances: sumBalancesA,
                totalSum: sumArr(sumBalancesA),

                budgetMonthly: sumBalancesB,
                budgetSum: sumArr(sumBalancesB),

                year: yearParam,
                children: childrenWithPrev,
                prevYearSum: prevCompTotal,
                prevMonthlyBalances: prevCompMonthly.slice(),
              } as RowItem);
            }
          });

          return collapsed;
        };

        // Revenue
        const revenueCollapsed = buildGrouped("Revenue");
        structured.push(...revenueCollapsed);

        let revBudgetMonthly = Array(12).fill(0);
        revenueCollapsed.forEach((r) => r.budgetMonthly?.forEach((b, i) => (revBudgetMonthly[i] += b)));

        if (revenueCollapsed.length) {
          const revBalances = Array(12).fill(0);
          revenueCollapsed.forEach((r) => r.totalBalances?.forEach((b, i) => (revBalances[i] += b)));

          structured.push({
            isTotalRow: true,
            totalType: "Revenue",
            company: compParam,
            totalBalances: revBalances,
            totalSum: sumArr(revBalances),
            prevYearSum: prevTotalsByType.Revenue || 0,
            prevMonthlyBalances: prevTotalsMonthlyByType.Revenue.slice(),
            budgetMonthly: revBudgetMonthly.slice(),
            budgetSum: sumArr(revBudgetMonthly),
            year: yearParam,
          } as RowItem);
        }

        // Cost
        const costCollapsed = buildGrouped("Cost");
        structured.push(...costCollapsed);

        let costBudgetMonthly = Array(12).fill(0);
        costCollapsed.forEach((r) => r.budgetMonthly?.forEach((b, i) => (costBudgetMonthly[i] += b)));

        if (costCollapsed.length) {
          const costBalances = Array(12).fill(0);
          costCollapsed.forEach((r) => r.totalBalances?.forEach((b, i) => (costBalances[i] += b)));

          structured.push({
            isTotalRow: true,
            totalType: "Cost",
            company: compParam,
            totalBalances: costBalances,
            totalSum: sumArr(costBalances),
            prevYearSum: prevTotalsByType.Cost || 0,
            prevMonthlyBalances: prevTotalsMonthlyByType.Cost.slice(),
            budgetMonthly: costBudgetMonthly.slice(),
            budgetSum: sumArr(costBudgetMonthly),
            year: yearParam,
          } as RowItem);
        }

        // Grand / Net
        const netBalancesA = Array(12).fill(0).map((_, i) => {
          const rev = revenueCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
          const cst = costCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
          return rev + cst;
        });

        const netBudgetMonthly = revBudgetMonthly.map((v, i) => v + (costBudgetMonthly[i] || 0));

        structured.push({
          isTotalRow: true,
          totalType: "Grand",
          company: compParam,
          totalBalances: netBalancesA,
          totalSum: sumArr(netBalancesA),
          prevYearSum: prevGrandTotal,
          prevMonthlyBalances: prevGrandMonthly.slice(),
          budgetMonthly: netBudgetMonthly.slice(),
          budgetSum: sumArr(netBudgetMonthly),
          year: yearParam,
        } as RowItem);

        if (mounted) setData(structured);
      } catch (e: any) {
        if (mounted) {
          console.log(e);
          setError(e?.message || "Failed to load trial balance from SQLite");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [compParam, typeParam, yearParam]);

  // =================== RENDER HELPERS ===================
  const LeftChildRow = ({ child }: { child: RowItem }) => (
    <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, color: "#333", textAlign: "left" }]}>
        {child.type}
      </Text>
      <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, color: "#333", textAlign: "left" }]}>
        {child.accountno} + {child.cc2}
      </Text>
      <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#666", textAlign: "left" }]}>
        {child.type === "Revenue" ? (child.cc3code || "") : (child.auxcode || "")}
      </Text>
    </View>
  );

  const RightChildRow = ({ child }: { child: RowItem }) => {
    const cbals = child.totalBalances ?? Array(12).fill(0);
    const ctotal = child.totalSum ?? sumArr(cbals);

    const prev = child.prevYearSum ?? 0;
    const pmon = child.prevMonthlyBalances ?? Array(12).fill(0);

    const bmon = child.budgetMonthly ?? Array(12).fill(0);
    const btotal = child.budgetSum ?? sumArr(bmon);

    return (
      <View style={[styles.bodyRow, { height: ROW_HEIGHT }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
          {ctotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
          {Number(prev).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
          {Number(btotal).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>

        {months.map((_, i) => {
          const bodyCellStyle = [
            styles.cell,
            { width: MONTH_W, paddingVertical: 5 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];
          return (
            <React.Fragment key={`mch-${i}`}>
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(cbals[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // =================== HEADERS ===================
  const LeftHeader = () => (
    <View style={[styles.headerRow, { width: 384, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold" }]}>Type</Text>
      <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold" }]}>Component</Text>
      <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, fontWeight: "bold" }]}>Code/Aux</Text>
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
        <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>Total (A)</Text>
        <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>Total (P)</Text>
        <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>Total (B)</Text>

        {months.map((m, i) => {
          const headerCellStyle = [
            styles.cell,
            { width: MONTH_W, fontWeight: "bold", textAlign: "center", paddingVertical: 13 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];
          return (
            <React.Fragment key={`h-${m}`}>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (A)`}</Text>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (P)`}</Text>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (B)`}</Text>
            </React.Fragment>
          );
        })}
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

    if (item.isGroupParent) {
      const key = item.groupKey || `${item.year}::${item.type}::${item.component || ""}`;
      const isOpen = !!expandedGroups[key];

      return (
        <View>
          <View style={[styles.bodyRow, { backgroundColor: "#EFEFEF", width: LEFT_WIDTH, height: ROW_HEIGHT }]}>
            <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>

            <View style={{ flexDirection: "row", width: COMP_W }}>
              <TouchableOpacity onPress={() => toggleGroup(key)} style={{ flexDirection: "row" }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", paddingRight: 8 }}>
                  {isOpen ? "▾" : "▸"}
                </Text>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12 }}>
                  {item.component}
                </Text>
              </TouchableOpacity>
            </View>

            <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#EFEFEF", textAlign: "left" }]} />
          </View>

          {isOpen && item.children?.map((child, idx) => (
            <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />
          ))}
        </View>
      );
    }

    if (item.isTotalRow) {
      const label = item.totalType === "Grand" ? "Net Total" : `${item.totalType} Total`;
      let bgColor = "#f0f8ff";
      let MbTotal = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") { bgColor = "#ffe4b5"; MbTotal = 50; }

      return (
        <View style={[
          styles.bodyRow,
          {
            backgroundColor: bgColor,
            borderTopWidth: 2,
            borderColor: "#aaa",
            width: LEFT_WIDTH,
            height: ROW_HEIGHT,
            marginBottom: MbTotal,
          },
        ]}>
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
        <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>
        <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>{item.component}</Text>
        <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]}>
          {item.type === "Revenue" ? (item.cc3code || "") : (item.auxcode || "")}
        </Text>
      </View>
    );
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const renderTriplets = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
      const cbals = row.totalBalances ?? Array(12).fill(0);
      const pmon = row.prevMonthlyBalances ?? Array(12).fill(0);
      const bmon = row.budgetMonthly ?? Array(12).fill(0);

      return months.map((_, i) => {
        const cellWeight =
          weight === "bold" ? "bold" : (weight === "600" ? ("600" as any) : "normal");

        const bodyCellStyle = [
          styles.cell,
          { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
          enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
        ];

        return (
          <React.Fragment key={`row-m-${i}`}>
            <Text numberOfLines={1} style={bodyCellStyle}>
              {(cbals[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={bodyCellStyle}>
              {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={bodyCellStyle}>
              {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
          </React.Fragment>
        );
      });
    };

    if (item.isGroupParent) {
      const key = item.groupKey || `${item.year}::${item.type}::${item.component || ""}`;
      const isOpen = !!expandedGroups[key];

      const cbals = item.totalBalances ?? Array(12).fill(0);
      const totalA = item.totalSum ?? sumArr(cbals);
      const totalP = item.prevYearSum ?? 0;

      const bmon = item.budgetMonthly ?? Array(12).fill(0);
      const totalB = item.budgetSum ?? sumArr(bmon);

      return (
        <View>
          <View style={[styles.bodyRow, { backgroundColor: "#f9fbff", height: ROW_HEIGHT }]}>
            <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "600" }]}>
              {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "600" }]}>
              {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "600" }]}>
              {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>

            {renderTriplets(item, "600", true)}
          </View>

          {isOpen && item.children?.map((child, idx) => (
            <RightChildRow key={`RCH-${key}-${idx}`} child={child} />
          ))}
        </View>
      );
    }

    if (item.isTotalRow) {
      let bgColor = "#f0f8ff";
      let MbTotal = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") { bgColor = "#ffe4b5"; MbTotal = 50; }

      const totalA = Number(item.totalSum || 0);
      const totalP = Number(item.prevYearSum || 0);
      const totalB = Number(item.budgetSum || 0);

      return (
        <View style={[
          styles.bodyRow,
          { backgroundColor: bgColor, borderTopWidth: 2, borderColor: "#aaa", height: ROW_HEIGHT, marginBottom: MbTotal },
        ]}>
          <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>
            {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
          <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>
            {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
          <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
            {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>

          {renderTriplets(item, "bold", false)}
        </View>
      );
    }

    const cbals = item.totalBalances ?? Array(12).fill(0);
    const totalA = item.totalSum ?? sumArr(cbals);
    const totalP = item.prevYearSum ?? 0;

    const bmon = item.budgetMonthly ?? Array(12).fill(0);
    const totalB = item.budgetSum ?? sumArr(bmon);

    return (
      <View style={[styles.bodyRow, { height: ROW_HEIGHT }]}>
        <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
          {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
          {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
          {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>

        {renderTriplets(item, "normal", true)}
      </View>
    );
  };

  // =================== UI ===================
  if (!compParam || !yearParam) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red", fontWeight: "700" }}>company/year params missing</Text>
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
      <View style={{ padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
        <CustomHeader title="" />
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

        <ScrollView
          ref={bodyHRef}
          horizontal
          onScroll={onBodyHScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator
        >
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
  Container: {
    flex: 1,
    backgroundColor: Colors.White,
  },
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
  cell: {
    textAlign: "center",
    fontSize: width > 600 ? 12 : 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  darkBodyCell: {
    backgroundColor: "#EFEFEF",
  },
});




// // TrialBalance.tsx
// import React, { useEffect, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   ScrollView,
//   TouchableOpacity,
//   NativeSyntheticEvent,
//   NativeScrollEvent,
// } from "react-native";

// import { useRoute } from "@react-navigation/native";
// import { Colors } from "../../../themes/color";
// import CustomHeader from "../../../component/customHeader";

// import { getWestwalkMongoFromSQLite } from "../../../database/westwalkTrailBal";
// import { getOtherCmpMongoFromSQLite } from "../../../database/otherCmpTrailBal";

// // ======================= CONFIG =======================
// const { width } = Dimensions.get("window");
// const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const DARK_GROUP_INDEX = new Set([0, 2, 4, 6, 8, 10]);

// const HEADER_HEIGHT = 44;
// const ROW_HEIGHT = 30;
// const YEAR_HEADER_HEIGHT = 30;

// // LEFT (3 frozen cols)
// const TYPE_W = 100;
// const COMP_W = 170;
// const CODE_W = 110;
// const LEFT_WIDTH = 570;

// // RIGHT
// const TOTAL_W = 100; // current total (A)
// const PREV_W  = 120; // previous year total (P)
// const BUDGET_TOTAL_W = 120; // budget total (B)
// const MONTH_W = 100;

// // Right width: Total(A) | Total(P) | Total(B) | per month => A | P | B (x12)
// const rightContentWidth =
//   TOTAL_W + PREV_W + BUDGET_TOTAL_W + (12 * (3 * MONTH_W));

// // ======================= API/DB TYPES =======================
// type ApiRow = {
//   accountno?: string;
//   auxcode?: string;
//   company?: string;
//   component?: string;
//   cc2?: string;
//   cc3?: string;
//   cc3code?: string;
//   month?: number;
//   year?: number;
//   balanceFirst?: number;
//   budgetedAmount?: number;
//   accountType?: string; // "Revenue" / "Cost"
// };

// type TrialBalanceRow = {
//   type?: "Revenue" | "Cost" | string;
//   company?: string;
//   component?: string;

//   year?: number;
//   month?: number;

//   accountno?: string;
//   cc3code?: string;
//   auxcode?: string;

//   balanceFirst?: number;     // A
//   budgetedAmount?: number;   // B
//   cc2?: string;
// };

// type RowItem = TrialBalanceRow & {
//   isTotalRow?: boolean;
//   yearHeader?: boolean;
//   totalType?: "Revenue" | "Cost" | "Grand";

//   totalBalances?: number[];         // A monthly
//   totalSum?: number;                // A total

//   prevYearSum?: number;             // P total
//   prevMonthlyBalances?: number[];   // P monthly

//   budgetMonthly?: number[];         // B monthly
//   budgetSum?: number;               // B total

//   isGroupParent?: boolean;
//   groupKey?: string;
//   children?: RowItem[];
// };

// // ======================= HELPERS =======================
// const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
// const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

// const buildMatchKey = (t: string, acc: string, code: string) =>
//   `${(t || "").toLowerCase()}||${acc || ""}||${code || ""}`;

// const normalize = (r: ApiRow): TrialBalanceRow => {
//   const type = String(r.accountType || "").trim();
//   return {
//     type: type || "",
//     company: String(r.company || "").trim(),
//     component: String(r.component || "").trim(),
//     year: Number(r.year || 0),
//     month: Number(r.month || 0),
//     accountno: String(r.accountno || "").trim(),
//     auxcode: String(r.auxcode || "").trim(),
//     cc3code: String(r.cc3 || r.cc3code || "").trim(),
//     balanceFirst: Number(r.balanceFirst || 0),
//     budgetedAmount: Number(r.budgetedAmount || 0),
//     cc2: String(r.cc2 || "").trim(),
//   };
// };

// // ✅ Westwalk companies condition
// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";
// const WESTWALK_COMPANIES = new Set([C_RE, C_ADV, C_ASSETS]);

// // ✅ extract rows from sqlite snapshot (handles both formats)
// const extractRowsFromSnap = (snap: any): ApiRow[] => {
//   const payload = snap?.data;

//   // othercmp snapshot: { savedAt, data: [ ... ] }
//   if (Array.isArray(payload)) return payload;

//   // westwalk snapshot: { savedAt, data: { success, count, data:[...] } }
//   if (payload && Array.isArray(payload.data)) return payload.data;

//   // extra safety
//   if (Array.isArray(snap)) return snap;
//   if (snap && Array.isArray(snap.data)) return snap.data;

//   return [];
// };

// export default function TrialBalanceTableScreen() {
//   const route = useRoute();
//   const { company = "", type = "", year } = (route.params ?? {}) as {
//     company?: string;
//     type?: string;
//     year?: number;
//   };

//   const compParam = String(company || "").trim();
//   const typeParam = String(type || "").trim();
//   const yearParam = Number(year || 0);
//   const prevYear = yearParam ? yearParam - 1 : 0;

//   const [data, setData] = useState<RowItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

//   const toggleGroup = (key: string) =>
//     setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

//   // Freeze first 3 columns (LEFT) + RIGHT scrollable
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

//   // =================== DATA BUILD (FROM SQLITE) ===================
//   useEffect(() => {
//     let mounted = true;

//     const loadData = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         if (!compParam || !yearParam) {
//           setData([]);
//           setError("company/year params missing");
//           return;
//         }

//         // ✅ choose sqlite DB based on company
//         const isWestwalk = WESTWALK_COMPANIES.has(compParam);

//         const snap = isWestwalk
//           ? await getWestwalkMongoFromSQLite()
//           : await getOtherCmpMongoFromSQLite();

//         const rawRows = extractRowsFromSnap(snap);
//         const all = rawRows.map(normalize);

//         // current year
//         let curr = all.filter((r) => r.company === compParam && r.year === yearParam);
//         if (typeParam) curr = curr.filter((r) => String(r.type) === typeParam);

//         // prev year
//         let prev = all.filter((r) => r.company === compParam && r.year === prevYear);
//         if (typeParam) prev = prev.filter((r) => String(r.type) === typeParam);

//         // ========== PREV MAPS (P) ==========
//         const prevRowMonthlyByKey: Record<string, number[]> = {};
//         const prevRowTotalByKey: Record<string, number> = {};
//         const prevComponentMonthlyByTypeComp: Record<string, number[]> = {};
//         const prevComponentTotalByTypeComp: Record<string, number> = {};
//         const prevTotalsMonthlyByType: Record<string, number[]> = {
//           Revenue: Array(12).fill(0),
//           Cost: Array(12).fill(0),
//         };
//         const prevTotalsByType: Record<string, number> = { Revenue: 0, Cost: 0 };

//         prev.forEach((r) => {
//           if (!isValidMonth(r.month)) return;
//           const idx = (r.month as number) - 1;

//           const t = String(r.type || "");
//           const acc = String(r.accountno || "");
//           const code = t === "Revenue" ? String(r.cc3code || "") : String(r.auxcode || "");
//           const k = buildMatchKey(t, acc, code);

//           if (!prevRowMonthlyByKey[k]) prevRowMonthlyByKey[k] = Array(12).fill(0);
//           prevRowMonthlyByKey[k][idx] += Number(r.balanceFirst || 0);
//           prevRowTotalByKey[k] = (prevRowTotalByKey[k] || 0) + Number(r.balanceFirst || 0);

//           const compKey = `${t}::${String(r.component || "").trim()}`;
//           if (!prevComponentMonthlyByTypeComp[compKey])
//             prevComponentMonthlyByTypeComp[compKey] = Array(12).fill(0);
//           prevComponentMonthlyByTypeComp[compKey][idx] += Number(r.balanceFirst || 0);
//           prevComponentTotalByTypeComp[compKey] =
//             (prevComponentTotalByTypeComp[compKey] || 0) + Number(r.balanceFirst || 0);

//           if (t === "Revenue" || t === "Cost") {
//             prevTotalsMonthlyByType[t][idx] += Number(r.balanceFirst || 0);
//             prevTotalsByType[t] += Number(r.balanceFirst || 0);
//           }
//         });

//         const prevGrandMonthly = Array(12)
//           .fill(0)
//           .map(
//             (_, i) =>
//               (prevTotalsMonthlyByType.Revenue[i] || 0) +
//               (prevTotalsMonthlyByType.Cost[i] || 0)
//           );
//         const prevGrandTotal =
//           (prevTotalsByType.Revenue || 0) + (prevTotalsByType.Cost || 0);

//         // ========== STRUCTURE CURRENT YEAR (A + B) ==========
//         const structured: RowItem[] = [];
//         structured.push({ yearHeader: true, company: compParam, year: yearParam } as RowItem);

//         const buildGrouped = (t: "Revenue" | "Cost") => {
//           const rows = curr.filter((r) => r.type === t);

//           const byKey: Record<string, RowItem> = {};

//           rows.forEach((r) => {
//             if (!isValidMonth(r.month)) return;
//             const idx = (r.month as number) - 1;

//             const acc = String(r.accountno || "");
//             const code = t === "Revenue" ? String(r.cc3code || "") : String(r.auxcode || "");
//             const key = `${acc}||${code}`;

//             if (!byKey[key]) {
//               const balancesA = Array(12).fill(0);
//               const balancesB = Array(12).fill(0);

//               balancesA[idx] = Number(r.balanceFirst || 0);
//               balancesB[idx] = Number(r.budgetedAmount || 0);

//               byKey[key] = {
//                 ...r,
//                 totalBalances: balancesA,
//                 totalSum: sumArr(balancesA),

//                 budgetMonthly: balancesB,
//                 budgetSum: sumArr(balancesB),
//               } as RowItem;
//             } else {
//               byKey[key].totalBalances![idx] += Number(r.balanceFirst || 0);
//               byKey[key].totalSum = sumArr(byKey[key].totalBalances!);

//               byKey[key].budgetMonthly![idx] += Number(r.budgetedAmount || 0);
//               byKey[key].budgetSum = sumArr(byKey[key].budgetMonthly!);
//             }
//           });

//           const grouped = Object.values(byKey);

//           const byComponent: Record<string, RowItem[]> = {};
//           grouped.forEach((r) => {
//             const comp = String(r.component || "").trim();
//             const gk = `${yearParam}::${t}::${comp}`;
//             if (!byComponent[gk]) byComponent[gk] = [];
//             byComponent[gk].push(r);
//           });

//           const collapsed: RowItem[] = [];

//           Object.entries(byComponent).forEach(([groupKey, arr]) => {
//             if (arr.length <= 1) {
//               const obj = arr[0];

//               const acc = String(obj.accountno || "");
//               const code = t === "Revenue" ? String(obj.cc3code || "") : String(obj.auxcode || "");
//               const matchKey = buildMatchKey(t, acc, code);

//               const prevRowTotal = prevRowTotalByKey[matchKey];
//               const prevRowMonthly = prevRowMonthlyByKey[matchKey];

//               const compKey = `${t}::${String(obj.component || "").trim()}`;
//               const prevCompTotal = prevComponentTotalByTypeComp[compKey] || 0;
//               const prevCompMonthly = prevComponentMonthlyByTypeComp[compKey] || Array(12).fill(0);

//               obj.prevYearSum = prevRowTotal != null ? prevRowTotal : prevCompTotal;
//               obj.prevMonthlyBalances = prevRowMonthly ? prevRowMonthly.slice() : prevCompMonthly.slice();

//               if (!obj.budgetMonthly) obj.budgetMonthly = Array(12).fill(0);
//               if (obj.budgetSum == null) obj.budgetSum = sumArr(obj.budgetMonthly);

//               collapsed.push(obj);
//             } else {
//               const sumBalancesA = Array(12).fill(0);
//               const sumBalancesB = Array(12).fill(0);

//               arr.forEach((ch) => {
//                 ch.totalBalances?.forEach((b, i) => (sumBalancesA[i] += b));
//                 ch.budgetMonthly?.forEach((b, i) => (sumBalancesB[i] += b));
//               });

//               const childrenWithPrev = arr.map((ch) => {
//                 const acc = String(ch.accountno || "");
//                 const code = t === "Revenue" ? String(ch.cc3code || "") : String(ch.auxcode || "");
//                 const matchKey = buildMatchKey(t, acc, code);

//                 return {
//                   ...ch,
//                   prevYearSum: prevRowTotalByKey[matchKey] || 0,
//                   prevMonthlyBalances: (prevRowMonthlyByKey[matchKey] || Array(12).fill(0)).slice(),
//                   budgetMonthly: (ch.budgetMonthly || Array(12).fill(0)).slice(),
//                   budgetSum: ch.budgetSum ?? sumArr(ch.budgetMonthly || []),
//                 };
//               });

//               const parentComp = String(arr[0].component || "").trim();
//               const compKey = `${t}::${parentComp}`;
//               const prevCompTotal =
//                 prevComponentTotalByTypeComp[compKey] ??
//                 childrenWithPrev.reduce((s, c) => s + Number(c.prevYearSum || 0), 0);
//               const prevCompMonthly = prevComponentMonthlyByTypeComp[compKey] || Array(12).fill(0);

//               collapsed.push({
//                 isGroupParent: true,
//                 groupKey,
//                 type: t,
//                 company: compParam,
//                 component: parentComp,
//                 accountno: "",
//                 cc3code: "",
//                 auxcode: "",
//                 totalBalances: sumBalancesA,
//                 totalSum: sumArr(sumBalancesA),

//                 budgetMonthly: sumBalancesB,
//                 budgetSum: sumArr(sumBalancesB),

//                 year: yearParam,
//                 children: childrenWithPrev,
//                 prevYearSum: prevCompTotal,
//                 prevMonthlyBalances: prevCompMonthly.slice(),
//               } as RowItem);
//             }
//           });

//           return collapsed;
//         };

//         // Revenue
//         const revenueCollapsed = buildGrouped("Revenue");
//         structured.push(...revenueCollapsed);

//         let revBudgetMonthly = Array(12).fill(0);
//         revenueCollapsed.forEach((r) => r.budgetMonthly?.forEach((b, i) => (revBudgetMonthly[i] += b)));

//         if (revenueCollapsed.length) {
//           const revBalances = Array(12).fill(0);
//           revenueCollapsed.forEach((r) => r.totalBalances?.forEach((b, i) => (revBalances[i] += b)));

//           structured.push({
//             isTotalRow: true,
//             totalType: "Revenue",
//             company: compParam,
//             totalBalances: revBalances,
//             totalSum: sumArr(revBalances),
//             prevYearSum: prevTotalsByType.Revenue || 0,
//             prevMonthlyBalances: prevTotalsMonthlyByType.Revenue.slice(),
//             budgetMonthly: revBudgetMonthly.slice(),
//             budgetSum: sumArr(revBudgetMonthly),
//             year: yearParam,
//           } as RowItem);
//         }

//         // Cost
//         const costCollapsed = buildGrouped("Cost");
//         structured.push(...costCollapsed);

//         let costBudgetMonthly = Array(12).fill(0);
//         costCollapsed.forEach((r) => r.budgetMonthly?.forEach((b, i) => (costBudgetMonthly[i] += b)));

//         if (costCollapsed.length) {
//           const costBalances = Array(12).fill(0);
//           costCollapsed.forEach((r) => r.totalBalances?.forEach((b, i) => (costBalances[i] += b)));

//           structured.push({
//             isTotalRow: true,
//             totalType: "Cost",
//             company: compParam,
//             totalBalances: costBalances,
//             totalSum: sumArr(costBalances),
//             prevYearSum: prevTotalsByType.Cost || 0,
//             prevMonthlyBalances: prevTotalsMonthlyByType.Cost.slice(),
//             budgetMonthly: costBudgetMonthly.slice(),
//             budgetSum: sumArr(costBudgetMonthly),
//             year: yearParam,
//           } as RowItem);
//         }

//         // Grand / Net
//         const netBalancesA = Array(12).fill(0).map((_, i) => {
//           const rev = revenueCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//           const cst = costCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//           return rev + cst;
//         });

//         const netBudgetMonthly = revBudgetMonthly.map((v, i) => v + (costBudgetMonthly[i] || 0));

//         structured.push({
//           isTotalRow: true,
//           totalType: "Grand",
//           company: compParam,
//           totalBalances: netBalancesA,
//           totalSum: sumArr(netBalancesA),
//           prevYearSum: prevGrandTotal,
//           prevMonthlyBalances: prevGrandMonthly.slice(),
//           budgetMonthly: netBudgetMonthly.slice(),
//           budgetSum: sumArr(netBudgetMonthly),
//           year: yearParam,
//         } as RowItem);

//         if (mounted) setData(structured);
//       } catch (e: any) {
//         if (mounted) {
//           console.log(e);
//           setError(e?.message || "Failed to load trial balance from SQLite");
//           setData([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadData();
//     return () => { mounted = false; };
//   }, [compParam, typeParam, yearParam]);

//   // =================== RENDER HELPERS ===================
//   const LeftChildRow = ({ child }: { child: RowItem }) => (
//     <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//       <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, color: "#333", textAlign: "left" }]}>
//         {child.type}
//       </Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, color: "#333", textAlign: "left" }]}>
//         {child.accountno} + {child.cc2}
//       </Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#666", textAlign: "left" }]}>
//         {child.type === "Revenue" ? (child.cc3code || "") : (child.auxcode || "")}
//       </Text>
//     </View>
//   );

//   const RightChildRow = ({ child }: { child: RowItem }) => {
//     const cbals = child.totalBalances ?? Array(12).fill(0);
//     const ctotal = child.totalSum ?? sumArr(cbals);

//     const prev = child.prevYearSum ?? 0;
//     const pmon = child.prevMonthlyBalances ?? Array(12).fill(0);

//     const bmon = child.budgetMonthly ?? Array(12).fill(0);
//     const btotal = child.budgetSum ?? sumArr(bmon);

//     return (
//       <View style={[styles.bodyRow, { height: ROW_HEIGHT }]}>
//         <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
//           {ctotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
//           {Number(prev).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
//           {Number(btotal).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>

//         {months.map((_, i) => {
//           const bodyCellStyle = [
//             styles.cell,
//             { width: MONTH_W, paddingVertical: 5 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];
//           return (
//             <React.Fragment key={`mch-${i}`}>
//               <Text numberOfLines={1} style={bodyCellStyle}>
//                 {(cbals[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//               <Text numberOfLines={1} style={bodyCellStyle}>
//                 {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//               <Text numberOfLines={1} style={bodyCellStyle}>
//                 {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     );
//   };

//   // =================== HEADERS ===================
//   const LeftHeader = () => (
//     <View style={[styles.headerRow, { width: 384, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//       <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold" }]}>Type</Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold" }]}>Component</Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, fontWeight: "bold" }]}>Code/Aux</Text>
//     </View>
//   );

//   const RightHeader = () => (
//     <ScrollView
//       ref={headerHRef}
//       horizontal
//       onScroll={onHeaderHScroll}
//       scrollEventThrottle={16}
//       showsHorizontalScrollIndicator
//     >
//       <View style={[styles.headerRow, { width: rightContentWidth, height: HEADER_HEIGHT, backgroundColor: "#ffffff" }]}>
//         <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>Total (A)</Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>Total (P)</Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>Total (B)</Text>

//         {months.map((m, i) => {
//           const headerCellStyle = [
//             styles.cell,
//             { width: MONTH_W, fontWeight: "bold", textAlign: "center", paddingVertical: 13 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];
//           return (
//             <React.Fragment key={`h-${m}`}>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (A)`}</Text>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (P)`}</Text>
//               <Text numberOfLines={1} style={headerCellStyle}>{`${m} (B)`}</Text>
//             </React.Fragment>
//           );
//         })}
//       </View>
//     </ScrollView>
//   );

//   // =================== ROW RENDERERS ===================
//   const renderLeftRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return (
//         <View style={[styles.yearHeaderRow, { width: LEFT_WIDTH, height: YEAR_HEADER_HEIGHT }]}>
//           <Text numberOfLines={1} style={{ fontWeight: "bold", fontSize: 12, color: "white" }}>
//             {item.company} - {item.year}
//           </Text>
//         </View>
//       );
//     }

//     if (item.isGroupParent) {
//       const key = item.groupKey || `${item.year}::${item.type}::${item.component || ""}`;
//       const isOpen = !!expandedGroups[key];

//       return (
//         <View>
//           <View style={[styles.bodyRow, { backgroundColor: "#EFEFEF", width: LEFT_WIDTH, height: ROW_HEIGHT }]}>
//             <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>

//             <View style={{ flexDirection: "row", width: COMP_W }}>
//               <TouchableOpacity onPress={() => toggleGroup(key)} style={{ flexDirection: "row" }}>
//                 <Text style={{ fontSize: 12, fontWeight: "bold", paddingRight: 8 }}>
//                   {isOpen ? "▾" : "▸"}
//                 </Text>
//                 <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12 }}>
//                   {item.component}
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#EFEFEF", textAlign: "left" }]} />
//           </View>

//           {isOpen && item.children?.map((child, idx) => (
//             <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />
//           ))}
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       const label = item.totalType === "Grand" ? "Net Total" : `${item.totalType} Total`;
//       let bgColor = "#f0f8ff";
//       let MbTotal = 0;
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") { bgColor = "#ffe4b5"; MbTotal = 50; }

//       return (
//         <View style={[
//           styles.bodyRow,
//           {
//             backgroundColor: bgColor,
//             borderTopWidth: 2,
//             borderColor: "#aaa",
//             width: LEFT_WIDTH,
//             height: ROW_HEIGHT,
//             marginBottom: MbTotal,
//           },
//         ]}>
//           <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold", textAlign: "left" }]}>
//             {label}
//           </Text>
//           <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>
//             {item.company}
//           </Text>
//           <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left" }]} />
//         </View>
//       );
//     }

//     return (
//       <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//         <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>{item.type}</Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>{item.component}</Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]}>
//           {item.type === "Revenue" ? (item.cc3code || "") : (item.auxcode || "")}
//         </Text>
//       </View>
//     );
//   };

//   const renderRightRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
//     }

//     const renderTriplets = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
//       const cbals = row.totalBalances ?? Array(12).fill(0);
//       const pmon = row.prevMonthlyBalances ?? Array(12).fill(0);
//       const bmon = row.budgetMonthly ?? Array(12).fill(0);

//       return months.map((_, i) => {
//         const cellWeight =
//           weight === "bold" ? "bold" : (weight === "600" ? ("600" as any) : "normal");

//         const bodyCellStyle = [
//           styles.cell,
//           { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
//           enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//         ];

//         return (
//           <React.Fragment key={`row-m-${i}`}>
//             <Text numberOfLines={1} style={bodyCellStyle}>
//               {(cbals[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={bodyCellStyle}>
//               {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={bodyCellStyle}>
//               {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//           </React.Fragment>
//         );
//       });
//     };

//     if (item.isGroupParent) {
//       const key = item.groupKey || `${item.year}::${item.type}::${item.component || ""}`;
//       const isOpen = !!expandedGroups[key];

//       const cbals = item.totalBalances ?? Array(12).fill(0);
//       const totalA = item.totalSum ?? sumArr(cbals);
//       const totalP = item.prevYearSum ?? 0;

//       const bmon = item.budgetMonthly ?? Array(12).fill(0);
//       const totalB = item.budgetSum ?? sumArr(bmon);

//       return (
//         <View>
//           <View style={[styles.bodyRow, { backgroundColor: "#f9fbff", height: ROW_HEIGHT }]}>
//             <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "600" }]}>
//               {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "600" }]}>
//               {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "600" }]}>
//               {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>

//             {renderTriplets(item, "600", true)}
//           </View>

//           {isOpen && item.children?.map((child, idx) => (
//             <RightChildRow key={`RCH-${key}-${idx}`} child={child} />
//           ))}
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       let bgColor = "#f0f8ff";
//       let MbTotal = 0;
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") { bgColor = "#ffe4b5"; MbTotal = 50; }

//       const totalA = Number(item.totalSum || 0);
//       const totalP = Number(item.prevYearSum || 0);
//       const totalB = Number(item.budgetSum || 0);

//       return (
//         <View style={[
//           styles.bodyRow,
//           { backgroundColor: bgColor, borderTopWidth: 2, borderColor: "#aaa", height: ROW_HEIGHT, marginBottom: MbTotal },
//         ]}>
//           <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>
//             {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//           </Text>
//           <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>
//             {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//           </Text>
//           <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
//             {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//           </Text>

//           {renderTriplets(item, "bold", false)}
//         </View>
//       );
//     }

//     const cbals = item.totalBalances ?? Array(12).fill(0);
//     const totalA = item.totalSum ?? sumArr(cbals);
//     const totalP = item.prevYearSum ?? 0;

//     const bmon = item.budgetMonthly ?? Array(12).fill(0);
//     const totalB = item.budgetSum ?? sumArr(bmon);

//     return (
//       <View style={[styles.bodyRow, { height: ROW_HEIGHT }]}>
//         <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
//           {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
//           {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
//           {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>

//         {renderTriplets(item, "normal", true)}
//       </View>
//     );
//   };

//   // =================== UI ===================
//   if (!compParam || !yearParam) {
//     return (
//       <View style={styles.centered}>
//         <Text style={{ color: "red", fontWeight: "700" }}>company/year params missing</Text>
//       </View>
//     );
//   }

//   if (loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={Colors.PrimaryColor} />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.centered}>
//         <Text style={{ color: "red", fontWeight: "700", textAlign: "center" }}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.Container}>
//       <View style={{ padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
//         <CustomHeader title="" />
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
//           initialNumToRender={20}
//           maxToRenderPerBatch={20}
//           windowSize={10}
//           onScroll={onLeftVScroll}
//           scrollEventThrottle={16}
//           showsVerticalScrollIndicator={false}
//           style={{ width: LEFT_WIDTH }}
//         />

//         <ScrollView
//           ref={bodyHRef}
//           horizontal
//           onScroll={onBodyHScroll}
//           scrollEventThrottle={16}
//           showsHorizontalScrollIndicator
//         >
//           <FlatList
//             ref={rightListRef}
//             data={data}
//             keyExtractor={(_, index) => `R-${index}`}
//             renderItem={renderRightRow}
//             initialNumToRender={20}
//             maxToRenderPerBatch={20}
//             windowSize={10}
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

// // =================== STYLES ===================
// const styles = StyleSheet.create({
//   Container: {
//     flex: 1,
//     backgroundColor: Colors.White,
//   },
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
//     paddingVertical: 0,
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
//   cell: {
//     textAlign: "center",
//     fontSize: width > 600 ? 12 : 12,
//   },
//   centered: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingTop: 40,
//     paddingHorizontal: 20,
//   },
//   darkBodyCell: {
//     backgroundColor: "#EFEFEF",
//   },
// });

