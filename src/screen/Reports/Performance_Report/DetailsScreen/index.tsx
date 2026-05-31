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
  StatusBar,
} from "react-native";

import { useRoute } from "@react-navigation/native";
import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal"; // ✅ SINGLE API ONLY
import { Colors } from "../../../../themes/color";
import CustomHeader from "../../../../component/customHeader";
import CustomButton from "../../../../component/customButton";
import { exportTrialBalanceToXLSX } from "../../../../database/Utils/export_to_excel";
import Container from "../../../../ui/useLayout";

// ======================= CONFIG =======================
const { width } = Dimensions.get("window");
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
const PREV_W = 120; // previous year total (P)
const BUDGET_TOTAL_W = 120; // budget total (B)
const MONTH_W = 100;

// ✅ Westwalk companies condition (KEEP for rules)
const C_RE = "West Walk Real Estate";


// ✅ Company-wise Component Collapse/Expand Groups
const COMPANY_COMPONENT_GROUPS: {
  [companyName: string]: { label: string; components: Set<string> }[];
} = {
  "Uranus General Contracting Company WLL": [
    {
      label: "FM and Maintenance",
      components: new Set([
        "Maintenance Expenses",
        "Facility Management Cost",
        "Waste management services",
        "Dewatering services",
        "Electricity and utility charges",
      ]),
    },
    {
      label: "Professional fees and legal expenses",
      components: new Set([
        "Legal Fees",
        "Other Professional Fees",
        "Consultancy fees",
        "Professional Fees - Tax",
        "IT Outsourcing Services",
        "Legal Expenses",
        "Audit Fees",
      ]),
    },
    { label: "Office admin expenses", components: new Set(["Travel Cost", "Other Office Expenses"]) },
    { label: "Visa and government fees", components: new Set(["Withholding Tax Expense", "Visa & Government Levies"]) },
  ],

  "AL WESSIL HOLDING": [
    {
      label: "Other income",
      components: new Set([
        "Tenant Variation Request",
        "Other Expense-Dewatering",
        "Rental and commission income",
        "Other Income - Murabaha Profit",
        "Interest Income",
        "Penalty fee - rent",
        "Miscellaneous Income",
      ]),
    },
    {
      label: "Service fees income",
      components: new Set([
        "Service Fees",
        "Other income - Short term investments",
        "Interet Income on Related party Loan",
        "Interest refund income",
      ]),
    },
    {
      label: "Staff costs",
      components: new Set([
        "Salaries",
        "Employee end of service benefits",
        "Staff Welfare Payments",
        "School Fees",
        "Vacation Tickets",
        "Leave Salary",
      ]),
    },
    {
      label: "General and admin",
      components: new Set([
        "Assets Depreciation - Furniture & Fixtures",
        "Assets Depreciation - Office Equipments",
        "Amortization of right of use asset",
      ]),
    },
    {
      label: "Finance costs",
      components: new Set([
        "Bank Charges",
        "Bank Loan Commission",
        "Interest on Doha Bank Loan",
        "Interest on QIIB loans",
        "Interest expense on lease liability",
        "Interest on Arab Bank Loan",
        "Interest on Dukhan Bank",
        "Loan Administration Fee Expense",
        "Interest On Commercial Bank",
      ]),
    },
    {
      label: "Office expenses",
      components: new Set([
        "Other Office Expenses",
        "Phone",
        "Phone, Fax & Internet - GA",
        "Printing & Stationery",
        "GOSI Cost",
        "Visa & Government Levies",
        "Local Transport",
        "Postage & Courier",
        "Incentives",
      ]),
    },
    {
      label: "Professional expenses",
      components: new Set([
        "Audit Fees",
        "Other Professional Fees",
        "IT Outsourcing Services",
        "Insurance Expense",
        "Consultancy fees",
      ]),
    },
    { label: "Utility charges", components: new Set(["Electricity and utility charges", "Treated Sewage Effluent (TSE) supply"]) },
    { label: "Travel expenses", components: new Set(["Hotel Accommodation & Travel Cost", "Travel Cost"]) },
  ],
  "West Walk Real Estate": [
    {
      label: "Miscellaneous Income",
      components: new Set([
        "Interest Income",
        "Miscellaneous Income",
        "Administration fee income",
        "Fitout service charge",
        "Interest Income",
        "Design review fee",
        "Chilled Water Consumption Charges",
        "Sponsorship Fee",
      ]),
    },
    {
      label: "Salaries & Benefits",
      components: new Set([
        "Salaries",
        "Incentives",
        "Employee end of service benefits",
        "Staff Welfare Payments",
        "Staff Accomodation Rent",
      ]),
    },
    {
      label: "Assets Depreciation",
      components: new Set([
        "Assets Depreciation - Motor Vehicles",
        "Assets Depreciation - Furniture & Fixtures",
        "Assets Depreciation - Office Equipments",
        "Assets Depreciation - Operating Supplies & Equipment",
      ]),
    },
    {
      label: "Professional Fees",
      components: new Set([
        "Consultancy fees",
        "Bank Charges",
        "IT Outsourcing Services",
        "Other Professional Fees",
        "Legal Fees"

      ]),
    },
    {
      label: "Office Expense",
      components: new Set([
        "Other Office Expenses",
        "Printing & Stationery",
        "Visa & Government Levies",
        "Local Transport",
        "Internet / Telephone",
         "Office Supply / Petrol"
      ]), },
    
    
    ] ,  
    "Assets Services": [
      {
        label: "Salaries & Benefits",
        components: new Set([
          "Salaries",
          "Incentives",
          "Leave Salary",
        ]),
      },

      {
        label: "Professional Fees",
        components: new Set([
          "Consultancy fees",
          "Bank Charges",
          "Commission Expense",
        ]),
      }, 
      ],
      "West Walk for Advertising": [
        {
          label: "Salaries & Benefits",
          components: new Set([
            "Salaries",
            "Incentives",
            "Staff Welfare Payments",
            "Vacation Tickets",
            "Local Transport",
          ]),
        },
        {
          label: "Professional Fees",
          components: new Set([
            "Bank Charges",
            "Professional Fees - Tax",
          ]),
        }, 
     
        ]      
};



// ✅ company+component -> group label helper
const getGroupLabelForCompanyComponent = (companyName: string, component?: string) => {
  const cmp = String(companyName || "").trim();
  const c = String(component || "").trim();

  const groups = COMPANY_COMPONENT_GROUPS[cmp];
  if (!groups) return c;

  for (const g of groups) {
    if (g.components.has(c)) return g.label;
  }
  return c;
};

const isMappedCompanyComponent = (companyName: string, component?: string) => {
  const c = String(component || "").trim();
  return getGroupLabelForCompanyComponent(companyName, c) !== c;
};

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

  totalBalances?: number[]; // A monthly
  totalSum?: number; // A total

  prevYearSum?: number; // P total
  prevMonthlyBalances?: number[]; // P monthly

  budgetMonthly?: number[]; // B monthly
  budgetSum?: number; // B total

  isGroupParent?: boolean;
  groupKey?: string;
  children?: RowItem[];
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

// ✅ extract rows from api result (handles multiple response formats)
const extractRowsFromSnap = (snap: any): ApiRow[] => {
  // if backend returns { success:true, data:[...] }
  if (snap && Array.isArray(snap.data)) return snap.data;

  // if backend returns axios-like { data: { success, data:[...] } }
  if (snap?.data && Array.isArray(snap.data.data)) return snap.data.data;

  // if backend returns { data: { data:[...] } }
  if (snap?.data && Array.isArray(snap.data)) return snap.data;

  // raw array
  if (Array.isArray(snap)) return snap;

  return [];
};



export default function TrialBalanceTableScreen() {
  const route = useRoute<any>();
  const { company = "", type = "", year, mode = "all" } = (route.params ?? {}) as {
    company?: string;
    type?: string;
    year?: number;
    mode?: "all" | "budget";
  };

  const isBudgetMode = mode === "budget";

  const compParam = String(company || "").trim();
  const typeParam = String(type || "").trim();
  const yearParam = Number(year || 0);
  const prevYear = yearParam ? yearParam - 1 : 0;

  const [data, setData] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // ✅ NEW: independent column toggles (dono ek saath toggle ho sakte hain)
  const [showPrev, setShowPrev] = useState(true); // Previous (P) columns
  const [showBudget, setShowBudget] = useState(true); // Budget (B) columns

  // per-month sub-cols: A always; P & B optional
  const monthColCount = 1 + (showPrev ? 1 : 0) + (showBudget ? 1 : 0);
  const leadTotalsWidth = TOTAL_W + (showPrev ? PREV_W : 0) + (showBudget ? BUDGET_TOTAL_W : 0);

  const rightContentWidth = isBudgetMode
    ? BUDGET_TOTAL_W + 12 * MONTH_W
    : leadTotalsWidth + 12 * (monthColCount * MONTH_W);

  const toggleGroup = (key: string) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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

  // =================== DATA BUILD (SINGLE API) ===================
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

        // ✅ SINGLE API CALL ONLY
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

// base current/prev for selected company
let curr = all.filter((r) => r.company === compParam && r.year === yearParam);
let prev = all.filter((r) => r.company === compParam && r.year === prevYear);

// ✅ REMOVE ALL TRANSFER / OFFSET LOGIC
// No Marketing Rights synthetic row
// No FM COST synthetic row
// No Westwalk Contract offset row

// filter by type param
if (typeParam) curr = curr.filter((r) => String(r.type) === typeParam);
if (typeParam) prev = prev.filter((r) => String(r.type) === typeParam);

        // prev totals
        const prevTotalsMonthlyByType: Record<string, number[]> = {
          Revenue: Array(12).fill(0),
          Cost: Array(12).fill(0),
        };
        const prevTotalsByType: Record<string, number> = { Revenue: 0, Cost: 0 };

        prev.forEach((r) => {
          if (!isValidMonth(r.month)) return;
          const idx = (r.month as number) - 1;
          const t = String(r.type || "");
          if (t === "Revenue" || t === "Cost") {
            prevTotalsMonthlyByType[t][idx] += Number(r.balanceFirst || 0);
            prevTotalsByType[t] += Number(r.balanceFirst || 0);
          }
        });

        const prevGrandMonthly = Array(12)
          .fill(0)
          .map((_, i) => (prevTotalsMonthlyByType.Revenue[i] || 0) + (prevTotalsMonthlyByType.Cost[i] || 0));
        const prevGrandTotal = (prevTotalsByType.Revenue || 0) + (prevTotalsByType.Cost || 0);

        // STRUCTURE
        const structured: RowItem[] = [];
        structured.push({ yearHeader: true, company: compParam, year: yearParam } as RowItem);

        const buildGrouped = (t: "Revenue" | "Cost") => {
          const rowsCurr = curr.filter((r) => r.type === t);
          const rowsPrev = prev.filter((r) => r.type === t);
        
          // ✅ keys only from CURRENT year (this prevents extra rows)
          const keys = new Set<string>();
        
          const makeKey = (r: TrialBalanceRow) => {
            const acc = String(r.accountno || "").trim();
            const comp = String(r.component || "").trim();
          
            if (t === "Revenue") {
              const code = String(r.cc3code || "").trim();
              // ✅ cc2 ko key se hata diya (exact matching ke liye)
              return `${acc}||${code}`;
            }
          
            // Cost
            const aux = String(r.auxcode || "").trim();
          
            // ✅ empty-aux ko component-wise merge karo (old behaviour)
            if (!aux) return `MERGED_EMPTYAUX::${comp}`;
          
            return `${acc}||${aux}`;
          };
        
          rowsCurr.forEach((r) => keys.add(makeKey(r))); // ✅ ONLY curr
          rowsPrev.forEach((r) => keys.add(makeKey(r))); // ✅ add this

          const currByKey: Record<string, TrialBalanceRow[]> = {};
          const prevByKey: Record<string, TrialBalanceRow[]> = {};
        
          rowsCurr.forEach((r) => {
            const k = makeKey(r);
            (currByKey[k] ||= []).push(r);
          });
        
          rowsPrev.forEach((r) => {
            const k = makeKey(r);
            (prevByKey[k] ||= []).push(r);
          });
        
          const unified: RowItem[] = [];
        
          // ✅ rest (group by component label) bilkul same rehne do
          keys.forEach((k) => {
            const currRows = currByKey[k] || [];
            const prevRows = prevByKey[k] || [];
          
            // ✅ base from CURRENT if present, otherwise from PREVIOUS
            const base = (currRows[0] || prevRows[0]) as TrialBalanceRow;
          
            const isPrevOnly = currRows.length === 0 && prevRows.length > 0;
          
            const balancesA = Array(12).fill(0);
            const budgetB  = Array(12).fill(0);
            const prevP    = Array(12).fill(0);
          
            currRows.forEach((r) => {
              if (!isValidMonth(r.month)) return;
              const idx = Number(r.month) - 1;
              balancesA[idx] += Number(r.balanceFirst || 0);
              budgetB[idx]   += Number(r.budgetedAmount || 0);
            });
          
            prevRows.forEach((r) => {
              if (!isValidMonth(r.month)) return;
              const idx = Number(r.month) - 1;
              prevP[idx] += Number(r.balanceFirst || 0);
            });
          
            unified.push({
              ...base,
              isPrevOnly,              // ✅ mark it
              type: t,
              company: compParam,
              year: yearParam,         // ✅ keep screen year (2025)
              totalBalances: balancesA,
              totalSum: sumArr(balancesA),
              budgetMonthly: budgetB,
              budgetSum: sumArr(budgetB),
              prevMonthlyBalances: prevP,
              prevYearSum: sumArr(prevP),
            } as RowItem);
          });
          const byComponent: Record<string, RowItem[]> = {};
          const groupLabelByKey: Record<string, string> = {};
        
          unified.forEach((r) => {
            const rawComp = String(r.component || "").trim();
            const groupLabel = getGroupLabelForCompanyComponent(compParam, rawComp);
            const gk = `${yearParam}::${t}::${groupLabel}`;
            (byComponent[gk] ||= []).push(r);
            groupLabelByKey[gk] = groupLabel;
          });
        
          const collapsed: RowItem[] = [];
        
          Object.entries(byComponent).forEach(([groupKey, arr]) => {
            const rawFirst = String(arr[0].component || "").trim();
            const isMapped = isMappedCompanyComponent(compParam, rawFirst);
        
            if (arr.length <= 1 && !isMapped) {
              collapsed.push(arr[0]);
              return;
            }
        
            const sumA = Array(12).fill(0);
            const sumB = Array(12).fill(0);
            const sumP = Array(12).fill(0);
        
            arr.forEach((ch) => {
              ch.totalBalances?.forEach((v, i) => (sumA[i] += v));
              ch.budgetMonthly?.forEach((v, i) => (sumB[i] += v));
              ch.prevMonthlyBalances?.forEach((v, i) => (sumP[i] += v));
            });
        
            const groupLabel = groupLabelByKey[groupKey] || rawFirst;
        
            collapsed.push({
              isGroupParent: true,
              groupKey,
              type: t,
              company: compParam,
              component: groupLabel,
              totalBalances: sumA,
              totalSum: sumArr(sumA),
              budgetMonthly: sumB,
              budgetSum: sumArr(sumB),
              prevMonthlyBalances: sumP,
              prevYearSum: sumArr(sumP),
              year: yearParam,
              children: arr,
            } as RowItem);
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

        // Net total
        const netBalancesA = Array(12)
          .fill(0)
          .map((_, i) => {
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
          setError(e?.message || "Failed to load trial balance from API");
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
  }, [compParam, typeParam, yearParam]);

  // =================== RENDER HELPERS ===================
  const LeftChildRow = ({ child }: { child: RowItem }) => (
    <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, color: "#333", textAlign: "left" }]}>
        {child.type}
      </Text>

      <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, color: "#333", textAlign: "left" }]}>
        {child.component}
      </Text>

      <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#666", textAlign: "left" }]}>
        {child.type === "Revenue" ? child.cc3code || "" : child.auxcode || ""}
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
        {!isBudgetMode && (
          <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
            {ctotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {!isBudgetMode && showPrev && (
          <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
            {Number(prev).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {(isBudgetMode || showBudget) && (
          <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
            {Number(btotal).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {months.map((_, i) => {
          const bodyCellStyle = [
            styles.cell,
            { width: MONTH_W, paddingVertical: 5 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];

          if (isBudgetMode) {
            return (
              <Text key={`mch-${i}-B`} numberOfLines={1} style={bodyCellStyle}>
                {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            );
          }

          return (
            <React.Fragment key={`mch-${i}`}>
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(cbals[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
              {showPrev && (
                <Text numberOfLines={1} style={bodyCellStyle}>
                  {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </Text>
              )}
              {showBudget && (
                <Text numberOfLines={1} style={bodyCellStyle}>
                  {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // =================== HEADERS ===================
  const LeftHeader = () => (
    <View style={[styles.headerRow, { width: 384, height: HEADER_HEIGHT, backgroundColor: "#EFEFEF" }]}>
      <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold" }]}>
        Type
      </Text>
      <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold" }]}>
        Component
      </Text>
      <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, fontWeight: "bold" }]}>
        Code/Aux
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
        {!isBudgetMode && (
          <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
            Total (A)
          </Text>
        )}

        {!isBudgetMode && showPrev && (
          <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>
            Total (P)
          </Text>
        )}

        {(isBudgetMode || showBudget) && (
          <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
            Total (B)
          </Text>
        )}

        {months.map((m, i) => {
          const headerCellStyle = [
            styles.cell,
            { width: MONTH_W, fontWeight: "bold", textAlign: "center", paddingVertical: 13 },
            DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
          ];

          if (isBudgetMode) {
            return (
              <Text key={`h-${m}-B`} numberOfLines={1} style={headerCellStyle}>
                {`${m} (B)`}
              </Text>
            );
          }

          return (
            <React.Fragment key={`h-${m}`}>
              <Text numberOfLines={1} style={headerCellStyle}>{`${m} (A)`}</Text>
              {showPrev && <Text numberOfLines={1} style={headerCellStyle}>{`${m} (P)`}</Text>}
              {showBudget && <Text numberOfLines={1} style={headerCellStyle}>{`${m} (B)`}</Text>}
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
            <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>
              {item.type}
            </Text>

            <View style={{ flexDirection: "row", width: COMP_W }}>
              <TouchableOpacity onPress={() => toggleGroup(key)} style={{ flexDirection: "row" }}>
                <Text style={{ fontSize: 12, fontWeight: "bold", paddingRight: 8 }}>{isOpen ? "▾" : "▸"}</Text>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12 }}>
                  {item.component}
                </Text>
              </TouchableOpacity>
            </View>

            <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#EFEFEF", textAlign: "left" }]} />
          </View>

          {isOpen && item.children?.map((child, idx) => <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />)}
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
          {item.component}
        </Text>
        <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]}>
          {item.type === "Revenue" ? item.cc3code || "" : item.auxcode || ""}
        </Text>
      </View>
    );
  };

  const renderRightRow = ({ item }: { item: RowItem }) => {
    if (item.yearHeader) {
      return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
    }

    const renderBudgetMonths = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
      const bmon = row.budgetMonthly ?? Array(12).fill(0);
      const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";

      return months.map((_, i) => {
        const bodyCellStyle = [
          styles.cell,
          { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
          enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
        ];

        return (
          <Text key={`row-b-${i}`} numberOfLines={1} style={bodyCellStyle}>
            {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        );
      });
    };

    const renderTriplets = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
      const cbals = row.totalBalances ?? Array(12).fill(0);
      const pmon = row.prevMonthlyBalances ?? Array(12).fill(0);
      const bmon = row.budgetMonthly ?? Array(12).fill(0);

      return months.map((_, i) => {
        const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";

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
            {showPrev && (
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(pmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            )}
            {showBudget && (
              <Text numberOfLines={1} style={bodyCellStyle}>
                {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            )}
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
            {!isBudgetMode && (
              <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "600" }]}>
                {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            )}

            {!isBudgetMode && showPrev && (
              <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "600" }]}>
                {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            )}

            {(isBudgetMode || showBudget) && (
              <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "600" }]}>
                {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </Text>
            )}

            {isBudgetMode ? renderBudgetMonths(item, "600", true) : renderTriplets(item, "600", true)}
          </View>

          {isOpen && item.children?.map((child, idx) => <RightChildRow key={`RCH-${key}-${idx}`} child={child} />)}
        </View>
      );
    }

    if (item.isTotalRow) {
      let bgColor = "#f0f8ff";
      let MbTotal = 0;
      if (item.totalType === "Revenue") bgColor = "#d1f7d1";
      if (item.totalType === "Cost") bgColor = "#f7d1d1";
      if (item.totalType === "Grand") {
        bgColor = "#ffe4b5";
        MbTotal = 50;
      }

      const totalA = Number(item.totalSum || 0);
      const totalP = Number(item.prevYearSum || 0);
      const totalB = Number(item.budgetSum || 0);

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
          {!isBudgetMode && (
            <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>
              {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
          )}

          {!isBudgetMode && showPrev && (
            <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>
              {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
          )}

          {(isBudgetMode || showBudget) && (
            <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
              {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </Text>
          )}

          {isBudgetMode ? renderBudgetMonths(item, "bold", false) : renderTriplets(item, "bold", false)}
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
        {!isBudgetMode && (
          <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
            {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {!isBudgetMode && showPrev && (
          <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
            {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {(isBudgetMode || showBudget) && (
          <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
            {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </Text>
        )}

        {isBudgetMode ? renderBudgetMonths(item, "normal", true) : renderTriplets(item, "normal", true)}
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
     <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, borderBottomWidth: 1 }}>
        <CustomHeader title={`${compParam} - ${yearParam}`} />

        {/* ✅ Export ke saath column toggle buttons (dono independent) */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {!isBudgetMode && (
            <>
              <TouchableOpacity
                style={[styles.filterBtn, showPrev && styles.filterBtnActive]}
                onPress={() => setShowPrev((v) => !v)}
              >
                <Text style={[styles.filterBtnText, showPrev && styles.filterBtnTextActive]}>
                  Previous (P)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterBtn, showBudget && styles.filterBtnActive]}
                onPress={() => setShowBudget((v) => !v)}
              >
                <Text style={[styles.filterBtnText, showBudget && styles.filterBtnTextActive]}>
                  Budget (B)
                </Text>
              </TouchableOpacity>
            </>
          )}

          <CustomButton
            title="Export"
            onPress={async () => {
              try {
                const p = await exportTrialBalanceToXLSX(data, `TrialBalance_${company || "All"}`);
                console.log("✅ file saved at:", p);
              } catch (e: any) {
                console.warn("❌ XLSX export failed:", e?.message ?? e);
              }
            }}
          />
        </View>
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
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.PrimaryColor,
    backgroundColor: "#fff",
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: Colors.PrimaryColor,
  },
  filterBtnText: {
    fontSize: 12,
    color: Colors.PrimaryColor,
    fontWeight: "600",
  },
  filterBtnTextActive: {
    color: "#fff",
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
//   StatusBar,
// } from "react-native";

// import { useRoute } from "@react-navigation/native";
// import { getWestwalkMongoFromSQLite } from "../../../../database/westwalkTrailBal"; // ✅ SINGLE API ONLY
// import { Colors } from "../../../../themes/color";
// import CustomHeader from "../../../../component/customHeader";
// import CustomButton from "../../../../component/customButton";
// import { exportTrialBalanceToXLSX } from "../../../../database/Utils/export_to_excel";

// // ======================= CONFIG =======================
// const { width } = Dimensions.get("window");
// const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
// const PREV_W = 120; // previous year total (P)
// const BUDGET_TOTAL_W = 120; // budget total (B)
// const MONTH_W = 100;

// // ✅ CLUB ACCOUNTS (FIX)
// const CLUB_ACCOUNTS = new Set(["44104", "44107", "44122", "44124", "44125"]);
// const CLUB_ACCOUNTS_LABEL = "Tenant Variation Request";
// const CLUB_ACCOUNTS_ACCOUNT = "44104,44107,44122,44124,44125";

// // ✅ Westwalk companies condition (KEEP for rules)
// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";
// const WESTWALK_COMPANIES = new Set([C_RE, C_ADV, C_ASSETS]);

// // ✅ Company-wise Component Collapse/Expand Groups
// const COMPANY_COMPONENT_GROUPS: {
//   [companyName: string]: { label: string; components: Set<string> }[];
// } = {
//   "Uranus General Contracting Company WLL": [
//     {
//       label: "FM and Maintenance",
//       components: new Set([
//         "Maintenance Expenses",
//         "Facility Management Cost",
//         "Waste management services",
//         "Dewatering services",
//         "Electricity and utility charges",
//       ]),
//     },
//     {
//       label: "Professional fees and legal expenses",
//       components: new Set([
//         "Legal Fees",
//         "Other Professional Fees",
//         "Consultancy fees",
//         "Professional Fees - Tax",
//         "IT Outsourcing Services",
//         "Legal Expenses",
//         "Audit Fees",
//       ]),
//     },
//     { label: "Office admin expenses", components: new Set(["Travel Cost", "Other Office Expenses"]) },
//     { label: "Visa and government fees", components: new Set(["Withholding Tax Expense", "Visa & Government Levies"]) },
//   ],

//   "AL WESSIL HOLDING": [
//     {
//       label: "Other income",
//       components: new Set([
//         "Tenant Variation Request",
//         "Other Expense-Dewatering",
//         "Rental and commission income",
//         "Other Income - Murabaha Profit",
//         "Interest Income",
//         "Penalty fee - rent",
//         "Miscellaneous Income",
//       ]),
//     },
//     {
//       label: "Service fees income",
//       components: new Set([
//         "Service Fees",
//         "Other income - Short term investments",
//         "Interet Income on Related party Loan",
//         "Interest refund income",
//       ]),
//     },
//     {
//       label: "Staff costs",
//       components: new Set([
//         "Salaries",
//         "Employee end of service benefits",
//         "Staff Welfare Payments",
//         "School Fees",
//         "Vacation Tickets",
//         "Leave Salary",
//       ]),
//     },
//     {
//       label: "General and admin",
//       components: new Set([
//         "Assets Depreciation - Furniture & Fixtures",
//         "Assets Depreciation - Office Equipments",
//         "Amortization of right of use asset",
//       ]),
//     },
//     {
//       label: "Finance costs",
//       components: new Set([
//         "Bank Charges",
//         "Bank Loan Commission",
//         "Interest on Doha Bank Loan",
//         "Interest on QIIB loans",
//         "Interest expense on lease liability",
//         "Interest on Arab Bank Loan",
//         "Interest on Dukhan Bank",
//         "Loan Administration Fee Expense",
//         "Interest On Commercial Bank",
//       ]),
//     },
//     {
//       label: "Office expenses",
//       components: new Set([
//         "Other Office Expenses",
//         "Phone",
//         "Phone, Fax & Internet - GA",
//         "Printing & Stationery",
//         "GOSI Cost",
//         "Visa & Government Levies",
//         "Local Transport",
//         "Postage & Courier",
//         "Incentives",
//       ]),
//     },
//     {
//       label: "Professional expenses",
//       components: new Set([
//         "Audit Fees",
//         "Other Professional Fees",
//         "IT Outsourcing Services",
//         "Insurance Expense",
//         "Consultancy fees",
//       ]),
//     },
//     { label: "Utility charges", components: new Set(["Electricity and utility charges", "Treated Sewage Effluent (TSE) supply"]) },
//     { label: "Travel expenses", components: new Set(["Hotel Accommodation & Travel Cost", "Travel Cost"]) },
//   ],
// };

// // ✅ company+component -> group label helper
// const getGroupLabelForCompanyComponent = (companyName: string, component?: string) => {
//   const cmp = String(companyName || "").trim();
//   const c = String(component || "").trim();

//   const groups = COMPANY_COMPONENT_GROUPS[cmp];
//   if (!groups) return c;

//   for (const g of groups) {
//     if (g.components.has(c)) return g.label;
//   }
//   return c;
// };

// const isMappedCompanyComponent = (companyName: string, component?: string) => {
//   const c = String(component || "").trim();
//   return getGroupLabelForCompanyComponent(companyName, c) !== c;
// };

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

//   balanceFirst?: number; // A
//   budgetedAmount?: number; // B
//   cc2?: string;
// };

// type RowItem = TrialBalanceRow & {
//   isTotalRow?: boolean;
//   yearHeader?: boolean;
//   totalType?: "Revenue" | "Cost" | "Grand";

//   totalBalances?: number[]; // A monthly
//   totalSum?: number; // A total

//   prevYearSum?: number; // P total
//   prevMonthlyBalances?: number[]; // P monthly

//   budgetMonthly?: number[]; // B monthly
//   budgetSum?: number; // B total

//   isGroupParent?: boolean;
//   groupKey?: string;
//   children?: RowItem[];
// };

// // ======================= HELPERS =======================
// const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;
// const sumArr = (arr: number[]) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

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

// // ✅ extract rows from api result (handles multiple response formats)
// const extractRowsFromSnap = (snap: any): ApiRow[] => {
//   // if backend returns { success:true, data:[...] }
//   if (snap && Array.isArray(snap.data)) return snap.data;

//   // if backend returns axios-like { data: { success, data:[...] } }
//   if (snap?.data && Array.isArray(snap.data.data)) return snap.data.data;

//   // if backend returns { data: { data:[...] } }
//   if (snap?.data && Array.isArray(snap.data)) return snap.data;

//   // raw array
//   if (Array.isArray(snap)) return snap;

//   return [];
// };

// // ======= Net Profit builders (RAW sign world) =======
// const sumMonthly = (
//   all: TrialBalanceRow[],
//   company: string,
//   year: number,
//   type: "Revenue" | "Cost",
//   field: "balanceFirst" | "budgetedAmount"
// ) => {
//   const out = Array(12).fill(0);
//   for (const r of all) {
//     if (String(r.company || "").trim() !== String(company).trim()) continue;
//     if (Number(r.year) !== Number(year)) continue;
//     if (String(r.type || "").trim() !== type) continue;
//     if (!isValidMonth(r.month)) continue;

//     const idx = Number(r.month) - 1;
//     out[idx] += Number((r as any)[field] || 0);
//   }
//   return out;
// };

// const netProfitMonthlyRaw = (all: TrialBalanceRow[], company: string, year: number) => {
//   const rev = sumMonthly(all, company, year, "Revenue", "balanceFirst");
//   const cst = sumMonthly(all, company, year, "Cost", "balanceFirst");
//   return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
// };

// const budgetNetProfitMonthlyRaw = (all: TrialBalanceRow[], company: string, year: number) => {
//   const rev = sumMonthly(all, company, year, "Revenue", "budgetedAmount");
//   const cst = sumMonthly(all, company, year, "Cost", "budgetedAmount");
//   return rev.map((v, i) => Number(v || 0) + Number(cst[i] || 0));
// };

// export default function TrialBalanceTableScreen() {
//   const route = useRoute<any>();
//   const { company = "", type = "", year, mode = "all" } = (route.params ?? {}) as {
//     company?: string;
//     type?: string;
//     year?: number;
//     mode?: "all" | "budget";
//   };

//   const isBudgetMode = mode === "budget";

//   const rightContentWidth = isBudgetMode
//     ? BUDGET_TOTAL_W + 12 * MONTH_W
//     : TOTAL_W + PREV_W + BUDGET_TOTAL_W + 12 * (3 * MONTH_W);

//   const compParam = String(company || "").trim();
//   const typeParam = String(type || "").trim();
//   const yearParam = Number(year || 0);
//   const prevYear = yearParam ? yearParam - 1 : 0;

//   const [data, setData] = useState<RowItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

//   const toggleGroup = (key: string) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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

//   // =================== DATA BUILD (SINGLE API) ===================
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

//         // ✅ SINGLE API CALL ONLY
//         const snap = await getWestwalkMongoFromSQLite();

//         const rawRows = extractRowsFromSnap(snap);

//         // normalize
//         let all = rawRows.map(normalize);

//         // cc2 only meaningful for RE revenue; clear for other companies revenue
//         all = all.map((r) => {
//           const cmp = String(r.company || "").trim();
//           const t = String(r.type || "").trim();
//           if (t === "Revenue" && cmp !== C_RE) return { ...r, cc2: "" };
//           return r;
//         });

//         // base current/prev for selected company
//         let curr = all.filter((r) => r.company === compParam && r.year === yearParam);
//         let prev = all.filter((r) => r.company === compParam && r.year === prevYear);

//         // ✅ TRANSFER INTO C_RE (same business logic)
//         if (compParam === C_RE) {
//           const advNetA = netProfitMonthlyRaw(all, C_ADV, yearParam);
//           const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, yearParam);
//           const advNetP = netProfitMonthlyRaw(all, C_ADV, prevYear);

//           const marketingRightsRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Revenue",
//             company: C_RE,
//             component: "Marketing Rights",
//             year: yearParam,
//             month: i + 1,
//             accountno: "__NET_ADV__",
//             cc3code: "MR",
//             auxcode: "",
//             balanceFirst: Number(advNetA[i] || 0),
//             budgetedAmount: Number(advNetB[i] || 0),
//             cc2: "",
//           }));

//           const marketingRightsRowsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Revenue",
//             company: C_RE,
//             component: "Marketing Rights",
//             year: prevYear,
//             month: i + 1,
//             accountno: "__NET_ADV__",
//             cc3code: "MR",
//             auxcode: "",
//             balanceFirst: Number(advNetP[i] || 0),
//             budgetedAmount: 0,
//             cc2: "",
//           }));

//           const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, yearParam);
//           const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, yearParam);
//           const assetsNetP = netProfitMonthlyRaw(all, C_ASSETS, prevYear);

//           const fmCostRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Cost",
//             company: C_RE,
//             component: "FM COST",
//             year: yearParam,
//             month: i + 1,
//             accountno: "__NET_ASSETS__",
//             cc3code: "",
//             auxcode: "FMC",
//             balanceFirst: Number(assetsNetA[i] || 0),
//             budgetedAmount: Number(assetsNetB[i] || 0),
//             cc2: "",
//           }));

//           const fmCostRowsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Cost",
//             company: C_RE,
//             component: "FM COST",
//             year: prevYear,
//             month: i + 1,
//             accountno: "__NET_ASSETS__",
//             cc3code: "",
//             auxcode: "FMC",
//             balanceFirst: Number(assetsNetP[i] || 0),
//             budgetedAmount: 0,
//             cc2: "",
//           }));

//           curr = curr.concat(marketingRightsRowsCurr, fmCostRowsCurr);
//           prev = prev.concat(marketingRightsRowsPrev, fmCostRowsPrev);
//         }

//         // ✅ OFFSET inside source companies (same logic)
//         if (compParam === C_ASSETS) {
//           const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, yearParam);
//           const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, yearParam);
//           const assetsNetP = netProfitMonthlyRaw(all, C_ASSETS, prevYear);

//           const offsetAssetsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Revenue",
//             company: C_ASSETS,
//             component: "Westwalk Contract",
//             year: yearParam,
//             month: i + 1,
//             accountno: "__OFFSET_ASSETS_NET__",
//             cc3code: "WWC",
//             auxcode: "",
//             balanceFirst: -Number(assetsNetA[i] || 0),
//             budgetedAmount: -Number(assetsNetB[i] || 0),
//             cc2: "",
//           }));

//           const offsetAssetsPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Revenue",
//             company: C_ASSETS,
//             component: "Westwalk Contract",
//             year: prevYear,
//             month: i + 1,
//             accountno: "__OFFSET_ASSETS_NET__",
//             cc3code: "WWC",
//             auxcode: "",
//             balanceFirst: -Number(assetsNetP[i] || 0),
//             budgetedAmount: 0,
//             cc2: "",
//           }));

//           curr = curr.concat(offsetAssetsCurr);
//           prev = prev.concat(offsetAssetsPrev);
//         }

//         if (compParam === C_ADV) {
//           const advNetA = netProfitMonthlyRaw(all, C_ADV, yearParam);
//           const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, yearParam);
//           const advNetP = netProfitMonthlyRaw(all, C_ADV, prevYear);

//           const offsetAdvCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Cost",
//             company: C_ADV,
//             component: "Westwalk Contract",
//             year: yearParam,
//             month: i + 1,
//             accountno: "__OFFSET_ADV_NET__",
//             cc3code: "",
//             auxcode: "WWC",
//             balanceFirst: -Number(advNetA[i] || 0),
//             budgetedAmount: -Number(advNetB[i] || 0),
//             cc2: "",
//           }));

//           const offsetAdvPrev: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//             type: "Cost",
//             company: C_ADV,
//             component: "Westwalk Contract",
//             year: prevYear,
//             month: i + 1,
//             accountno: "__OFFSET_ADV_NET__",
//             cc3code: "",
//             auxcode: "WWC",
//             balanceFirst: -Number(advNetP[i] || 0),
//             budgetedAmount: 0,
//             cc2: "",
//           }));

//           curr = curr.concat(offsetAdvCurr);
//           prev = prev.concat(offsetAdvPrev);
//         }

//         // filter by type param
//         if (typeParam) curr = curr.filter((r) => String(r.type) === typeParam);
//         if (typeParam) prev = prev.filter((r) => String(r.type) === typeParam);

//         // prev totals
//         const prevTotalsMonthlyByType: Record<string, number[]> = {
//           Revenue: Array(12).fill(0),
//           Cost: Array(12).fill(0),
//         };
//         const prevTotalsByType: Record<string, number> = { Revenue: 0, Cost: 0 };

//         prev.forEach((r) => {
//           if (!isValidMonth(r.month)) return;
//           const idx = (r.month as number) - 1;
//           const t = String(r.type || "");
//           if (t === "Revenue" || t === "Cost") {
//             prevTotalsMonthlyByType[t][idx] += Number(r.balanceFirst || 0);
//             prevTotalsByType[t] += Number(r.balanceFirst || 0);
//           }
//         });

//         const prevGrandMonthly = Array(12)
//           .fill(0)
//           .map((_, i) => (prevTotalsMonthlyByType.Revenue[i] || 0) + (prevTotalsMonthlyByType.Cost[i] || 0));
//         const prevGrandTotal = (prevTotalsByType.Revenue || 0) + (prevTotalsByType.Cost || 0);

//         // STRUCTURE
//         const structured: RowItem[] = [];
//         structured.push({ yearHeader: true, company: compParam, year: yearParam } as RowItem);

//         const buildGrouped = (t: "Revenue" | "Cost") => {
//           const rowsCurr = curr.filter((r) => r.type === t);
//           const rowsPrev = prev.filter((r) => r.type === t);

//           const keys = new Set<string>();

//           const makeKey = (r: TrialBalanceRow) => {
//             const acc = String(r.accountno || "").trim();
//             const code = t === "Revenue" ? String(r.cc3code || "").trim() : String(r.auxcode || "").trim();

//             // club these accounts into one bucket by cc3code (only westwalk companies)
//             if (t === "Revenue" && WESTWALK_COMPANIES.has(compParam) && CLUB_ACCOUNTS.has(acc)) {
//               return `CLUB::${code}`;
//             }

//             const cc2Part = t === "Revenue" && compParam === C_RE ? String(r.cc2 || "").trim() : "";
//             return `${acc}||${code}||${cc2Part}`;
//           };

//           rowsCurr.forEach((r) => keys.add(makeKey(r)));
//           rowsPrev.forEach((r) => keys.add(makeKey(r)));

//           const currByKey: Record<string, TrialBalanceRow[]> = {};
//           const prevByKey: Record<string, TrialBalanceRow[]> = {};

//           rowsCurr.forEach((r) => {
//             const k = makeKey(r);
//             (currByKey[k] ||= []).push(r);
//           });

//           rowsPrev.forEach((r) => {
//             const k = makeKey(r);
//             (prevByKey[k] ||= []).push(r);
//           });

//           const unified: RowItem[] = [];

//           keys.forEach((k) => {
//             const currRows = currByKey[k] || [];
//             const prevRows = prevByKey[k] || [];

//             const base = (currRows[0] || prevRows[0]) as TrialBalanceRow;

//             const balancesA = Array(12).fill(0);
//             const budgetB = Array(12).fill(0);
//             const prevP = Array(12).fill(0);

//             currRows.forEach((r) => {
//               if (!isValidMonth(r.month)) return;
//               const idx = Number(r.month) - 1;
//               balancesA[idx] += Number(r.balanceFirst || 0);
//               budgetB[idx] += Number(r.budgetedAmount || 0);
//             });

//             prevRows.forEach((r) => {
//               if (!isValidMonth(r.month)) return;
//               const idx = Number(r.month) - 1;
//               prevP[idx] += Number(r.balanceFirst || 0);
//             });

//             const isClubbed = t === "Revenue" && String(k).startsWith("CLUB::");
//             const finalBase: TrialBalanceRow = isClubbed
//               ? { ...base, component: CLUB_ACCOUNTS_LABEL, accountno: CLUB_ACCOUNTS_ACCOUNT, cc2: "" }
//               : base;

//             unified.push({
//               ...finalBase,
//               type: t,
//               company: compParam,
//               year: yearParam,
//               totalBalances: balancesA,
//               totalSum: sumArr(balancesA),
//               budgetMonthly: budgetB,
//               budgetSum: sumArr(budgetB),
//               prevMonthlyBalances: prevP,
//               prevYearSum: sumArr(prevP),
//             } as RowItem);
//           });

//           // group by company-component label (collapse/expand)
//           const byComponent: Record<string, RowItem[]> = {};
//           const groupLabelByKey: Record<string, string> = {};

//           unified.forEach((r) => {
//             const rawComp = String(r.component || "").trim();
//             const groupLabel = getGroupLabelForCompanyComponent(compParam, rawComp);
//             const gk = `${yearParam}::${t}::${groupLabel}`;
//             (byComponent[gk] ||= []).push(r);
//             groupLabelByKey[gk] = groupLabel;
//           });

//           const collapsed: RowItem[] = [];

//           Object.entries(byComponent).forEach(([groupKey, arr]) => {
//             const rawFirst = String(arr[0].component || "").trim();
//             const isMapped = isMappedCompanyComponent(compParam, rawFirst);

//             if (arr.length <= 1 && !isMapped) {
//               collapsed.push(arr[0]);
//               return;
//             }

//             const sumA = Array(12).fill(0);
//             const sumB = Array(12).fill(0);
//             const sumP = Array(12).fill(0);

//             arr.forEach((ch) => {
//               ch.totalBalances?.forEach((v, i) => (sumA[i] += v));
//               ch.budgetMonthly?.forEach((v, i) => (sumB[i] += v));
//               ch.prevMonthlyBalances?.forEach((v, i) => (sumP[i] += v));
//             });

//             const groupLabel = groupLabelByKey[groupKey] || rawFirst;

//             collapsed.push({
//               isGroupParent: true,
//               groupKey,
//               type: t,
//               company: compParam,
//               component: groupLabel,
//               totalBalances: sumA,
//               totalSum: sumArr(sumA),
//               budgetMonthly: sumB,
//               budgetSum: sumArr(sumB),
//               prevMonthlyBalances: sumP,
//               prevYearSum: sumArr(sumP),
//               year: yearParam,
//               children: arr,
//             } as RowItem);
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

//         // Net total
//         const netBalancesA = Array(12)
//           .fill(0)
//           .map((_, i) => {
//             const rev = revenueCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//             const cst = costCollapsed.reduce((s, r) => s + (r.totalBalances?.[i] || 0), 0);
//             return rev + cst;
//           });

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
//           setError(e?.message || "Failed to load trial balance from API");
//           setData([]);
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadData();
//     return () => {
//       mounted = false;
//     };
//   }, [compParam, typeParam, yearParam]);

//   // =================== RENDER HELPERS ===================
//   const LeftChildRow = ({ child }: { child: RowItem }) => (
//     <View style={[styles.bodyRow, { width: LEFT_WIDTH, height: ROW_HEIGHT, backgroundColor: "#EFEFEF" }]}>
//       <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, color: "#333", textAlign: "left" }]}>
//         {child.type}
//       </Text>

//       <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, color: "#333", textAlign: "left" }]}>
//         {child.component}
//       </Text>

//       <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#666", textAlign: "left" }]}>
//         {child.type === "Revenue" ? child.cc3code || "" : child.auxcode || ""}
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
//         {!isBudgetMode && (
//           <>
//             <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
//               {ctotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
//               {Number(prev).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//           </>
//         )}

//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
//           {Number(btotal).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>

//         {months.map((_, i) => {
//           const bodyCellStyle = [
//             styles.cell,
//             { width: MONTH_W, paddingVertical: 5 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];

//           if (isBudgetMode) {
//             return (
//               <Text key={`mch-${i}-B`} numberOfLines={1} style={bodyCellStyle}>
//                 {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//             );
//           }

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
//       <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, fontWeight: "bold" }]}>
//         Type
//       </Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, fontWeight: "bold" }]}>
//         Component
//       </Text>
//       <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, fontWeight: "bold" }]}>
//         Code/Aux
//       </Text>
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
//         {!isBudgetMode && (
//           <>
//             <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
//               Total (A)
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold", textAlign: "center" }]}>
//               Total (P)
//             </Text>
//           </>
//         )}

//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold", textAlign: "center" }]}>
//           Total (B)
//         </Text>

//         {months.map((m, i) => {
//           const headerCellStyle = [
//             styles.cell,
//             { width: MONTH_W, fontWeight: "bold", textAlign: "center", paddingVertical: 13 },
//             DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//           ];

//           if (isBudgetMode) {
//             return (
//               <Text key={`h-${m}-B`} numberOfLines={1} style={headerCellStyle}>
//                 {`${m} (B)`}
//               </Text>
//             );
//           }

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
//             <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>
//               {item.type}
//             </Text>

//             <View style={{ flexDirection: "row", width: COMP_W }}>
//               <TouchableOpacity onPress={() => toggleGroup(key)} style={{ flexDirection: "row" }}>
//                 <Text style={{ fontSize: 12, fontWeight: "bold", paddingRight: 8 }}>{isOpen ? "▾" : "▸"}</Text>
//                 <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12 }}>
//                   {item.component}
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, color: "#EFEFEF", textAlign: "left" }]} />
//           </View>

//           {isOpen && item.children?.map((child, idx) => <LeftChildRow key={`LCH-${key}-${idx}`} child={child} />)}
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       const label = item.totalType === "Grand" ? "Net Total" : `${item.totalType} Total`;
//       let bgColor = "#f0f8ff";
//       let MbTotal = 0;
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") {
//         bgColor = "#ffe4b5";
//         MbTotal = 50;
//       }

//       return (
//         <View
//           style={[
//             styles.bodyRow,
//             {
//               backgroundColor: bgColor,
//               borderTopWidth: 2,
//               borderColor: "#aaa",
//               width: LEFT_WIDTH,
//               height: ROW_HEIGHT,
//               marginBottom: MbTotal,
//             },
//           ]}
//         >
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
//         <Text numberOfLines={1} style={[styles.cell, { width: TYPE_W, textAlign: "left" }]}>
//           {item.type}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: COMP_W, textAlign: "left" }]}>
//           {item.component}
//         </Text>
//         <Text numberOfLines={1} style={[styles.cell, { width: CODE_W, textAlign: "left", color: "#666" }]}>
//           {item.type === "Revenue" ? item.cc3code || "" : item.auxcode || ""}
//         </Text>
//       </View>
//     );
//   };

//   const renderRightRow = ({ item }: { item: RowItem }) => {
//     if (item.yearHeader) {
//       return <View style={[styles.yearHeaderRow, { width: rightContentWidth, height: YEAR_HEADER_HEIGHT }]} />;
//     }

//     const renderBudgetMonths = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
//       const bmon = row.budgetMonthly ?? Array(12).fill(0);
//       const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";

//       return months.map((_, i) => {
//         const bodyCellStyle = [
//           styles.cell,
//           { width: MONTH_W, fontWeight: cellWeight, paddingVertical: 6 },
//           enableBanding && DARK_GROUP_INDEX.has(i) && styles.darkBodyCell,
//         ];

//         return (
//           <Text key={`row-b-${i}`} numberOfLines={1} style={bodyCellStyle}>
//             {(bmon[i] || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//           </Text>
//         );
//       });
//     };

//     const renderTriplets = (row: RowItem, weight?: "normal" | "bold" | "600", enableBanding: boolean = true) => {
//       const cbals = row.totalBalances ?? Array(12).fill(0);
//       const pmon = row.prevMonthlyBalances ?? Array(12).fill(0);
//       const bmon = row.budgetMonthly ?? Array(12).fill(0);

//       return months.map((_, i) => {
//         const cellWeight = weight === "bold" ? "bold" : weight === "600" ? ("600" as any) : "normal";

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
//             {!isBudgetMode && (
//               <>
//                 <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "600" }]}>
//                   {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//                 </Text>
//                 <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "600" }]}>
//                   {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//                 </Text>
//               </>
//             )}

//             <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "600" }]}>
//               {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>

//             {isBudgetMode ? renderBudgetMonths(item, "600", true) : renderTriplets(item, "600", true)}
//           </View>

//           {isOpen && item.children?.map((child, idx) => <RightChildRow key={`RCH-${key}-${idx}`} child={child} />)}
//         </View>
//       );
//     }

//     if (item.isTotalRow) {
//       let bgColor = "#f0f8ff";
//       let MbTotal = 0;
//       if (item.totalType === "Revenue") bgColor = "#d1f7d1";
//       if (item.totalType === "Cost") bgColor = "#f7d1d1";
//       if (item.totalType === "Grand") {
//         bgColor = "#ffe4b5";
//         MbTotal = 50;
//       }

//       const totalA = Number(item.totalSum || 0);
//       const totalP = Number(item.prevYearSum || 0);
//       const totalB = Number(item.budgetSum || 0);

//       return (
//         <View
//           style={[
//             styles.bodyRow,
//             {
//               backgroundColor: bgColor,
//               borderTopWidth: 2,
//               borderColor: "#aaa",
//               height: ROW_HEIGHT,
//               marginBottom: MbTotal,
//             },
//           ]}
//         >
//           {!isBudgetMode && (
//             <>
//               <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W, fontWeight: "bold" }]}>
//                 {totalA.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//               <Text numberOfLines={1} style={[styles.cell, { width: PREV_W, fontWeight: "bold" }]}>
//                 {totalP.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//               </Text>
//             </>
//           )}

//           <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W, fontWeight: "bold" }]}>
//             {totalB.toLocaleString("en-US", { maximumFractionDigits: 0 })}
//           </Text>

//           {isBudgetMode ? renderBudgetMonths(item, "bold", false) : renderTriplets(item, "bold", false)}
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
//         {!isBudgetMode && (
//           <>
//             <Text numberOfLines={1} style={[styles.cell, { width: TOTAL_W }]}>
//               {Number(totalA).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//             <Text numberOfLines={1} style={[styles.cell, { width: PREV_W }]}>
//               {Number(totalP).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//             </Text>
//           </>
//         )}

//         <Text numberOfLines={1} style={[styles.cell, { width: BUDGET_TOTAL_W }]}>
//           {Number(totalB).toLocaleString("en-US", { maximumFractionDigits: 0 })}
//         </Text>

//         {isBudgetMode ? renderBudgetMonths(item, "normal", true) : renderTriplets(item, "normal", true)}
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
//      <StatusBar hidden={false} backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
//       <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 20, borderBottomWidth: 1 }}>
//         <CustomHeader title={`${compParam} - ${yearParam}`} />
//         <CustomButton
//           title="Export"
//           onPress={async () => {
//             try {
//               const p = await exportTrialBalanceToXLSX(data, `TrialBalance_${company || "All"}`);
//               console.log("✅ file saved at:", p);
//             } catch (e: any) {
//               console.warn("❌ XLSX export failed:", e?.message ?? e);
//             }
//           }}
//         />
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

//         <ScrollView ref={bodyHRef} horizontal onScroll={onBodyHScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator>
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



