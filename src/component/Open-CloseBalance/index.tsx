import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
import { Colors } from "../../themes/color";

// ======================= CONFIG =======================
const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COL_W = 115;
const LEFT_W = 260;

// ✅ Westwalk companies
const C_RE = "West Walk Real Estate";
const C_ADV = "West Walk Advertisement";
const C_ASSETS = "Assets Services Company";
const ZERO_COMPANIES = new Set([C_ADV, C_ASSETS]);

export const OPENING_BALANCE_BY_YEAR: Record<number, number> = {
  2026: 85187392,
};

// ======================= TYPES =======================
type ApiRow = {
  company?: string;
  component?: string;
  cc2?: string;
  cc3?: string;
  month?: number;
  year?: number;
  balanceFirst?: number;
  budgetedAmount?: number;
  accountType?: string;
};

type TrialBalanceRow = {
  type?: "Revenue" | "Cost" | string;
  company?: string;
  component?: string;
  year?: number;
  month?: number;
  balanceFirst?: number;
  budgetedAmount?: number;
  cc2?: string;
  cc3code?: string;
};

export type ScreenMode = "budget" | "yearly";

type Props = {
  year: number;
  mode?: ScreenMode;
  openingBalanceByYear?: Record<number, number>;
  loadingColor?: string;
};

// ======================= HELPERS =======================
const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;

const normalize = (r: ApiRow): TrialBalanceRow => {
  const type = String(r.accountType || "").trim();
  return {
    type: type || "",
    company: String(r.company || "").trim(),
    component: String(r.component || "").trim(),
    year: Number(r.year || 0),
    month: Number(r.month || 0),
    cc3code: String(r.cc3 || "").trim(),
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

const getAsOfMonth = () => Math.max(0, new Date().getMonth() + 1 - 1);

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

const buildCompanyTotals = (all: TrialBalanceRow[], companyName: string, y: number) => {
  const asOfMonth = getAsOfMonth();

  if (ZERO_COMPANIES.has(companyName)) {
    const z = Array(12).fill(0);
    return { revA: z.slice(), revB: z.slice(), costA: z.slice(), costB: z.slice(), revAB: z.slice(), costAB: z.slice() };
  }

  let curr = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y);

  if (companyName === C_RE) {
    const advNetA = netProfitMonthlyRaw(all, C_ADV, y);
    const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, y);

    const marketingRightsRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
      type: "Revenue",
      company: C_RE,
      component: "Marketing Rights",
      year: y,
      month: i + 1,
      cc3code: "MR",
      balanceFirst: Number(advNetA[i] || 0),
      budgetedAmount: Number(advNetB[i] || 0),
      cc2: "",
    }));

    const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, y);
    const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, y);

    const fmCostRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
      type: "Cost",
      company: C_RE,
      component: "FM COST",
      year: y,
      month: i + 1,
      cc3code: "",
      balanceFirst: Number(assetsNetA[i] || 0),
      budgetedAmount: Number(assetsNetB[i] || 0),
      cc2: "",
    }));

    curr = curr.concat(marketingRightsRowsCurr, fmCostRowsCurr);
  }

  const revA = Array(12).fill(0);
  const revB = Array(12).fill(0);
  const costA = Array(12).fill(0);
  const costB = Array(12).fill(0);

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

  const revAB = Array(12).fill(0);
  const costAB = Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    const monthNo = i + 1;
    const useActual = monthNo >= 1 && monthNo <= asOfMonth;
    revAB[i] = useActual ? Number(revA[i] || 0) : Number(revB[i] || 0);
    costAB[i] = useActual ? Number(costA[i] || 0) : Number(costB[i] || 0);
  }

  return { revA, revB, costA, costB, revAB, costAB };
};

const fmt = (n: number) => {
  const x = Number(n || 0);
  const abs = Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return x < 0 ? `- ${abs}` : abs;
};

// ======================= COMPONENT =======================
export default function NetIncomeOpeningClosingTable({
  year,
  mode = "budget",
  openingBalanceByYear,
  loadingColor,
}: Props) {
  const yearParam = Number(year || 0);
  const isBudgetMode = mode === "budget";

  const openingMap = openingBalanceByYear ?? OPENING_BALANCE_BY_YEAR;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [netIncome, setNetIncome] = useState<number[]>(Array(12).fill(0));
  const [opening, setOpening] = useState<number[]>(Array(12).fill(0));
  const [closing, setClosing] = useState<number[]>(Array(12).fill(0));

  const monthHeaders = useMemo(
    () => monthsShort.map((m) => `${m}-${String(yearParam).slice(2)}`),
    [yearParam]
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!yearParam) {
          setError("year missing");
          return;
        }

        const snap = await getWestwalkMongoFromSQLite();
        const rawRows = extractRowsFromSnap(snap);
        let all = rawRows.map(normalize);

        all = all.map((r) => {
          const cmp = String(r.company || "").trim();
          const t = String(r.type || "").trim();
          if (t === "Revenue" && cmp !== C_RE) return { ...r, cc2: "" };
          return r;
        });

        const companies = Array.from(
          new Set(
            all
              .filter((r) => Number(r.year) === yearParam && String(r.company || "").trim())
              .map((r) => String(r.company || "").trim())
          )
        ).sort((a, b) => a.localeCompare(b));

        const grandRevShown = Array(12).fill(0);
        const grandCostShown = Array(12).fill(0);

        for (const cmp of companies) {
          const t = buildCompanyTotals(all, cmp, yearParam);
          const revShown = isBudgetMode ? t.revAB : t.revA;
          const costShown = isBudgetMode ? t.costAB : t.costA;

          revShown.forEach((v, i) => (grandRevShown[i] += Number(v || 0)));
          costShown.forEach((v, i) => (grandCostShown[i] += Number(v || 0)));
        }

        const net = Array(12)
          .fill(0)
          .map((_, i) => Number(grandRevShown[i] || 0) + Number(grandCostShown[i] || 0));

        const openingStart = openingMap[yearParam] ?? 0;

        const openArr = Array(12).fill(0);
        const closeArr = Array(12).fill(0);

        let currentOpening = Number(openingStart || 0);
        for (let i = 0; i < 12; i++) {
          openArr[i] = currentOpening;
          const c = currentOpening + Number(net[i] || 0);
          closeArr[i] = c;
          currentOpening = c;
        }

        if (!mounted) return;
        setNetIncome(net);
        setOpening(openArr);
        setClosing(closeArr);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to build table");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [yearParam, mode]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={loadingColor ?? Colors.PrimaryColor} />
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
    <View style={styles.tableWrap}>
      {/* LEFT COLUMN (Fixed) */}
      <View style={styles.leftColumn}>
        <View style={[styles.leftCell, styles.headerRow, { width: LEFT_W }]}>
          <Text style={[styles.leftText, styles.bold]}>Particulars</Text>
        </View>

        <View style={[styles.leftCell, styles.greenRow, { width: LEFT_W }]}>
          <Text style={[styles.leftText, styles.bold]}>Net Income (Monthly)</Text>
        </View>

        <View style={[styles.leftCell, styles.greenRow, { width: LEFT_W }]}>
          <Text style={[styles.leftText, styles.bold]}>Opening Balance</Text>
        </View>

        <View style={[styles.leftCell, styles.greenRow, { width: LEFT_W, borderBottomWidth: 0 }]}>
          <Text style={[styles.leftText, styles.bold]}>Closing Balance</Text>
        </View>
      </View>

      {/* RIGHT SIDE (ONE SCROLL FOR ALL ROWS + HEADER) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View style={[styles.row, styles.headerRow]}>
            {monthHeaders.map((m, i) => (
              <View key={`h-${i}`} style={[styles.cell, { width: COL_W }]}>
                <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
                  {m}
                </Text>
              </View>
            ))}
          </View>

          {/* Net row */}
          <View style={[styles.row, styles.greenRow]}>
            {netIncome.map((v, i) => (
              <View key={`n-${i}`} style={[styles.cell, { width: COL_W }]}>
                <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
                  {fmt(v)}
                </Text>
              </View>
            ))}
          </View>

          {/* Opening row */}
          <View style={[styles.row, styles.greenRow]}>
            {opening.map((v, i) => (
              <View key={`o-${i}`} style={[styles.cell, { width: COL_W }]}>
                <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
                  {fmt(v)}
                </Text>
              </View>
            ))}
          </View>

          {/* Closing row */}
          <View style={[styles.row, styles.greenRow]}>
            {closing.map((v, i) => (
              <View key={`c-${i}`} style={[styles.cell, { width: COL_W, borderBottomWidth: 0 }]}>
                <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
                  {fmt(v)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// =================== STYLES ===================
const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center", padding: 16 },

  tableWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#fff",
  },

  leftColumn: {
    width: LEFT_W,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },

  row: { flexDirection: "row" },
  headerRow: { backgroundColor: "#bdbdbd" },
  greenRow: { backgroundColor: "#dff2d8" },

  leftCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  leftText: { fontSize: 12, color: "#000" },

  cell: {
    borderRightWidth: 1,
    borderRightColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  cellText: { fontSize: 12, color: "#000" },

  bold: { fontWeight: "700" },
});








// import React, { useEffect, useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   StyleSheet,
//   ScrollView,
// } from "react-native";
// import { getWestwalkMongoFromSQLite } from "../../database/westwalkTrailBal";
// import { Colors } from "../../themes/color";


// // ======================= CONFIG =======================
// const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// const COL_W = 115;
// const LEFT_W = 260;

// // ✅ Westwalk companies
// const C_RE = "West Walk Real Estate";
// const C_ADV = "West Walk Advertisement";
// const C_ASSETS = "Assets Services Company";
// const ZERO_COMPANIES = new Set([C_ADV, C_ASSETS]);

// // ✅ Year-wise opening balance (ONE-TIME per year)
// // dummy for now
// export const OPENING_BALANCE_BY_YEAR: Record<number, number> = {
//   2026: 85187392,

// };

// // ======================= TYPES =======================
// type ApiRow = {
//   company?: string;
//   component?: string;
//   cc2?: string;
//   cc3?: string;
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
//   balanceFirst?: number; // A
//   budgetedAmount?: number; // B
//   cc2?: string;
//   cc3code?: string;
// };

// export type ScreenMode = "budget" | "yearly";

// type Props = {
//   year: number;
//   mode?: ScreenMode; // default "budget"
//   openingBalanceByYear?: Record<number, number>; // optional override map
//   loadingColor?: string;
// };

// // ======================= HELPERS (SAME AS YOUR LOGIC) =======================
// const isValidMonth = (m?: number | null) => typeof m === "number" && m >= 1 && m <= 12;

// const normalize = (r: ApiRow): TrialBalanceRow => {
//   const type = String(r.accountType || "").trim();
//   return {
//     type: type || "",
//     company: String(r.company || "").trim(),
//     component: String(r.component || "").trim(),
//     year: Number(r.year || 0),
//     month: Number(r.month || 0),
//     cc3code: String(r.cc3 || "").trim(),
//     balanceFirst: Number(r.balanceFirst || 0),
//     budgetedAmount: Number(r.budgetedAmount || 0),
//     cc2: String(r.cc2 || "").trim(),
//   };
// };

// const extractRowsFromSnap = (snap: any): ApiRow[] => {
//   if (snap && Array.isArray(snap.data)) return snap.data;
//   if (snap?.data && Array.isArray(snap.data.data)) return snap.data.data;
//   if (snap?.data && Array.isArray(snap.data)) return snap.data;
//   if (Array.isArray(snap)) return snap;
//   return [];
// };

// // ✅ SAME RULE AS SUMMARY CARDS
// const getAsOfMonth = () => Math.max(0, new Date().getMonth() + 1 - 1);

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

// // ======================= BUILD TOTALS PER COMPANY (SAME LOGIC) =======================
// const buildCompanyTotals = (all: TrialBalanceRow[], companyName: string, y: number) => {
//   const asOfMonth = getAsOfMonth();

//   if (ZERO_COMPANIES.has(companyName)) {
//     const z = Array(12).fill(0);
//     return {
//       revA: z.slice(),
//       revB: z.slice(),
//       costA: z.slice(),
//       costB: z.slice(),
//       revAB: z.slice(),
//       costAB: z.slice(),
//     };
//   }

//   let curr = all.filter((r) => String(r.company || "").trim() === companyName && Number(r.year) === y);

//   // ✅ Transfer ADV + ASSETS impact into RE
//   if (companyName === C_RE) {
//     const advNetA = netProfitMonthlyRaw(all, C_ADV, y);
//     const advNetB = budgetNetProfitMonthlyRaw(all, C_ADV, y);

//     const marketingRightsRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//       type: "Revenue",
//       company: C_RE,
//       component: "Marketing Rights",
//       year: y,
//       month: i + 1,
//       cc3code: "MR",
//       balanceFirst: Number(advNetA[i] || 0),
//       budgetedAmount: Number(advNetB[i] || 0),
//       cc2: "",
//     }));

//     const assetsNetA = netProfitMonthlyRaw(all, C_ASSETS, y);
//     const assetsNetB = budgetNetProfitMonthlyRaw(all, C_ASSETS, y);

//     const fmCostRowsCurr: TrialBalanceRow[] = Array.from({ length: 12 }).map((_, i) => ({
//       type: "Cost",
//       company: C_RE,
//       component: "FM COST",
//       year: y,
//       month: i + 1,
//       cc3code: "",
//       balanceFirst: Number(assetsNetA[i] || 0),
//       budgetedAmount: Number(assetsNetB[i] || 0),
//       cc2: "",
//     }));

//     curr = curr.concat(marketingRightsRowsCurr, fmCostRowsCurr);
//   }

//   const revA = Array(12).fill(0);
//   const revB = Array(12).fill(0);
//   const costA = Array(12).fill(0);
//   const costB = Array(12).fill(0);

//   for (const r of curr) {
//     if (!isValidMonth(r.month)) continue;
//     const i = Number(r.month) - 1;
//     const t = String(r.type || "").trim();

//     if (t === "Revenue") {
//       revA[i] += Number(r.balanceFirst || 0);
//       revB[i] += Number(r.budgetedAmount || 0);
//     } else if (t === "Cost") {
//       costA[i] += Number(r.balanceFirst || 0);
//       costB[i] += Number(r.budgetedAmount || 0);
//     }
//   }

//   // ✅ blended AB
//   const revAB = Array(12).fill(0);
//   const costAB = Array(12).fill(0);
//   for (let i = 0; i < 12; i++) {
//     const monthNo = i + 1;
//     const useActual = monthNo >= 1 && monthNo <= asOfMonth;
//     revAB[i] = useActual ? Number(revA[i] || 0) : Number(revB[i] || 0);
//     costAB[i] = useActual ? Number(costA[i] || 0) : Number(costB[i] || 0);
//   }

//   return { revA, revB, costA, costB, revAB, costAB };
// };

// // ======================= FORMAT =======================
// const fmt = (n: number) => {
//   const x = Number(n || 0);
//   const abs = Math.abs(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
//   return x < 0 ? `- ${abs}` : abs;
// };

// // ======================= COMPONENT =======================
// export default function NetIncomeOpeningClosingTable({
//   year,
//   mode = "budget",
//   openingBalanceByYear,
//   loadingColor,
// }: Props) {
//   const yearParam = Number(year || 0);
//   const isBudgetMode = mode === "budget";

//   const openingMap = openingBalanceByYear ?? OPENING_BALANCE_BY_YEAR;

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const [netIncome, setNetIncome] = useState<number[]>(Array(12).fill(0));
//   const [opening, setOpening] = useState<number[]>(Array(12).fill(0));
//   const [closing, setClosing] = useState<number[]>(Array(12).fill(0));

//   const monthHeaders = useMemo(
//     () => monthsShort.map((m) => `${m}-${String(yearParam).slice(2)}`),
//     [yearParam]
//   );

//   useEffect(() => {
//     let mounted = true;

//     const run = async () => {
//       try {
//         setLoading(true);
//         setError(null);

//         if (!yearParam) {
//           setError("year missing");
//           return;
//         }

//         const snap = await getWestwalkMongoFromSQLite();
//         const rawRows = extractRowsFromSnap(snap);
//         let all = rawRows.map(normalize);

//         // cc2 only meaningful for RE revenue; clear for other companies revenue
//         all = all.map((r) => {
//           const cmp = String(r.company || "").trim();
//           const t = String(r.type || "").trim();
//           if (t === "Revenue" && cmp !== C_RE) return { ...r, cc2: "" };
//           return r;
//         });

//         // companies for this year
//         const companies = Array.from(
//           new Set(
//             all
//               .filter((r) => Number(r.year) === yearParam && String(r.company || "").trim())
//               .map((r) => String(r.company || "").trim())
//           )
//         ).sort((a, b) => a.localeCompare(b));

//         const grandRevShown = Array(12).fill(0);
//         const grandCostShown = Array(12).fill(0);

//         for (const cmp of companies) {
//           const t = buildCompanyTotals(all, cmp, yearParam);
//           const revShown = isBudgetMode ? t.revAB : t.revA;
//           const costShown = isBudgetMode ? t.costAB : t.costA;

//           revShown.forEach((v, i) => (grandRevShown[i] += Number(v || 0)));
//           costShown.forEach((v, i) => (grandCostShown[i] += Number(v || 0)));
//         }

//         // ✅ Net Income Monthly (same formula)
//         const net = Array(12)
//           .fill(0)
//           .map((_, i) => Number(grandRevShown[i] || 0) + Number(grandCostShown[i] || 0));

//         // ✅ Opening 1-time per year (dummy fallback)
//         const openingStart = openingMap[yearParam] ?? 12_000_000_000;

//         // ✅ Rolling opening/closing
//         const openArr = Array(12).fill(0);
//         const closeArr = Array(12).fill(0);

//         let currentOpening = Number(openingStart || 0);
//         for (let i = 0; i < 12; i++) {
//           openArr[i] = currentOpening;
//           const c = currentOpening + Number(net[i] || 0);
//           closeArr[i] = c;
//           currentOpening = c; // next month opening
//         }

//         if (!mounted) return;
//         setNetIncome(net);
//         setOpening(openArr);
//         setClosing(closeArr);
//       } catch (e: any) {
//         if (!mounted) return;
//         setError(e?.message || "Failed to build table");
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     run();
//     return () => {
//       mounted = false;
//     };
//   }, [yearParam, mode]);

//   if (loading) {
//     return (
//       <View style={styles.centered}>
//         <ActivityIndicator size="large" color={loadingColor ?? Colors.PrimaryColor} />
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
//     <View style={styles.tableWrap}>
//       {/* HEADER */}
//       <View style={[styles.row, styles.headerRow]}>
//         <View style={[styles.leftCell, { width: LEFT_W }]}>
//           <Text style={[styles.leftText, styles.bold]}>Particulars</Text>
//         </View>

//         <ScrollView horizontal showsHorizontalScrollIndicator>
//           <View style={{ flexDirection: "row" }}>
//             {monthHeaders.map((m, i) => (
//               <View key={`h-${i}`} style={[styles.cell, { width: COL_W }]}>
//                 <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
//                   {m}
//                 </Text>
//               </View>
//             ))}
//           </View>
//         </ScrollView>
//       </View>

//       {/* NET INCOME */}
//       <View style={[styles.row, styles.greenRow]}>
//         <View style={[styles.leftCell, { width: LEFT_W }]}>
//           <Text style={[styles.leftText, styles.bold]}>Net Income (Monthly)</Text>
//         </View>
//         <ScrollView horizontal showsHorizontalScrollIndicator>
//           <View style={{ flexDirection: "row" }}>
//             {netIncome.map((v, i) => (
//               <View key={`n-${i}`} style={[styles.cell, { width: COL_W }]}>
//                 <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
//                   {fmt(v)}
//                 </Text>
//               </View>
//             ))}
//           </View>
//         </ScrollView>
//       </View>

//       {/* OPENING */}
//       <View style={[styles.row, styles.greenRow]}>
//         <View style={[styles.leftCell, { width: LEFT_W }]}>
//           <Text style={[styles.leftText, styles.bold]}>Opening Balance</Text>
//         </View>
//         <ScrollView horizontal showsHorizontalScrollIndicator>
//           <View style={{ flexDirection: "row" }}>
//             {opening.map((v, i) => (
//               <View key={`o-${i}`} style={[styles.cell, { width: COL_W }]}>
//                 <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
//                   {fmt(v)}
//                 </Text>
//               </View>
//             ))}
//           </View>
//         </ScrollView>
//       </View>

//       {/* CLOSING */}
//       <View style={[styles.row, styles.greenRow]}>
//         <View style={[styles.leftCell, { width: LEFT_W }]}>
//           <Text style={[styles.leftText, styles.bold]}>Closing Balance</Text>
//         </View>
//         <ScrollView horizontal showsHorizontalScrollIndicator>
//           <View style={{ flexDirection: "row" }}>
//             {closing.map((v, i) => (
//               <View key={`c-${i}`} style={[styles.cell, { width: COL_W }]}>
//                 <Text style={[styles.cellText, styles.bold]} numberOfLines={1}>
//                   {fmt(v)}
//                 </Text>
//               </View>
//             ))}
//           </View>
//         </ScrollView>
//       </View>
//     </View>
//   );
// }

// // =================== STYLES ===================
// const styles = StyleSheet.create({
//   centered: { justifyContent: "center", alignItems: "center", padding: 16 },

//   tableWrap: {
//     borderWidth: 1,
//     borderColor: "#000",
//     backgroundColor: "#fff",
//   },

//   row: { flexDirection: "row" },
//   headerRow: { backgroundColor: "#bdbdbd" },
//   greenRow: { backgroundColor: "#dff2d8" },

//   leftCell: {
//     borderRightWidth: 1,
//     borderRightColor: "#000",
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     justifyContent: "center",
//   },
//   leftText: { fontSize: 12, color: "#000" },

//   cell: {
//     borderRightWidth: 1,
//     borderRightColor: "#000",
//     borderBottomWidth: 1,
//     borderBottomColor: "#000",
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     justifyContent: "center",
//     alignItems: "flex-end",
//   },
//   cellText: { fontSize: 12, color: "#000" },

//   bold: { fontWeight: "700" },
// });