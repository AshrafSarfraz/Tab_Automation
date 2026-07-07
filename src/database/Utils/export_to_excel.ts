// import * as XLSX from 'xlsx';
// import RNFS from 'react-native-fs';
// import Share from 'react-native-share';

// // ---------- TYPES / CONSTANTS ----------

// export type RowItem = {
//   type?: 'Revenue' | 'Cost';
//   company?: string;
//   component?: string;
//   accountno?: string;
//   cc3code?: string;
//   auxcode?: string;
//   month?: number;
//   balanceFirst?: number;
//   year?: number;

//   isTotalRow?: boolean;
//   yearHeader?: boolean;
//   totalType?: 'Revenue' | 'Cost' | 'Grand';

//   isGroupParent?: boolean;
//   groupKey?: string;
//   children?: RowItem[];

//   totalBalances?: number[];          // current year monthly (Actual)
//   totalSum?: number;                 // current year total (Actual)

//   prevYearSum?: number;              // prev year total
//   prevMonthlyBalances?: number[];    // prev year monthly
// };

// const months = [
//   'Jan','Feb','Mar','Apr','May','Jun',
//   'Jul','Aug','Sep','Oct','Nov','Dec'
// ];

// // number formatter for Excel cells
// const fmtNum = (v?: number | null) =>
//   typeof v === 'number' && isFinite(v)
//     ? Math.round(v)
//     : '';

// // ---------- HELPERS ----------

// // produce monthly arrays + totals for a RowItem
// function buildNumbers(item: RowItem) {
//   const currMonthly = item.totalBalances
//     ? item.totalBalances
//     : Array(12).fill(0).map((_, i) =>
//         i + 1 === item.month ? (item.balanceFirst || 0) : 0
//       );

//   const prevMonthly = item.prevMonthlyBalances
//     ? item.prevMonthlyBalances
//     : Array(12).fill(0);

//   const currTotal =
//     typeof item.totalSum === 'number'
//       ? item.totalSum
//       : currMonthly.reduce((s, b) => s + b, 0);

//   const prevTotal =
//     typeof item.prevYearSum === 'number'
//       ? item.prevYearSum
//       : 0;

//   return { currMonthly, prevMonthly, currTotal, prevTotal };
// }

// // builds one logical row for the sheet
// function makeDataRow(
//   item: RowItem,
//   opts?: { indentChild?: boolean; forceLabel?: string }
// ): (string | number)[] {
//   const { indentChild, forceLabel } = opts || {};
//   const { currMonthly, prevMonthly, currTotal, prevTotal } =
//     buildNumbers(item);

//   // code column differs
//   const codeCol =
//     item.type === 'Revenue'
//       ? (item.cc3code ?? '')
//       : (item.auxcode ?? '');

//   // indent children visually using leading spaces
//   const componentText = indentChild
//     ? `   ${item.component ?? ''}`
//     : (item.component ?? '');

//   const typeLabel = forceLabel
//     ? forceLabel
//     : (item.type ?? '');

//   return [
//     typeLabel,                   // Type / or "Revenue Total" etc.
//     componentText,               // Component (maybe indented)
//     item.accountno ?? '',        // Account
//     codeCol,                     // CC3 or Aux
//     fmtNum(currTotal),           // Total (A)
//     fmtNum(prevTotal),           // Total (P)

//     // For each month we output 3 cols: Budget (blank), Actual, Prev
//     ...months.flatMap((_, idx) => [
//       '',                                // Budget (B) not tracked yet
//       fmtNum(currMonthly[idx]),          // A (this year actual)
//       fmtNum(prevMonthly[idx]),          // P (prev year actual for same month)
//     ]),
//   ];
// }

// // ---------- MAIN EXPORT ----------

// export async function exportTrialBalanceToXLSX(
//   rows: RowItem[],
//   fileName = 'TrialBalance'
// ) {
//   if (!rows?.length) {
//     throw new Error('No data to export');
//   }

//   // Build 2D array (sheet rows)
//   const sheetData: any[][] = [];

//   // Header row (top row in Excel)
//   const headerRow: string[] = [
//     'Type',
//     'Component',
//     'Account',
//     'CC3/AuxCode',
//     'Total (A)',
//     'Total (P)',
//     ...months.flatMap(m => [`${m} (B)`, `${m} (A)`, `${m} (P)`]),
//   ];
//   sheetData.push(headerRow);

//   // Body rows
//   rows.forEach(item => {
//     // Year header row ("West Walk Real Estate - 2025")
//     if (item.yearHeader) {
//       sheetData.push([`${item.company ?? ''} - ${item.year ?? ''}`]);
//       return;
//     }

//     // Total rows (Revenue Total / Cost Total / Net Total)
//     if (item.isTotalRow) {
//       const label =
//         item.totalType === 'Grand'
//           ? 'Net Total'
//           : `${item.totalType} Total`;

//       sheetData.push(
//         makeDataRow(item, { forceLabel: label })
//       );
//       return;
//     }

//     // Group parent row, then children
//     if (item.isGroupParent) {
//       // parent summary row (unindented)
//       sheetData.push(
//         makeDataRow(item, { forceLabel: item.type ?? '' })
//       );

//       // children detail rows (indented)
//       if (item.children && item.children.length) {
//         item.children.forEach(child => {
//           sheetData.push(
//             makeDataRow(child, { indentChild: true })
//           );
//         });
//       }

//       return;
//     }

//     // Plain leaf row
//     sheetData.push(makeDataRow(item));
//   });

//   // Create workbook + worksheet
//   const wb = XLSX.utils.book_new();
//   const ws = XLSX.utils.aoa_to_sheet(sheetData);

//   // (Optional but recommended) set column widths so it's not super cramped
//   ws['!cols'] = [
//     { wch: 14 }, // Type / Total Label
//     { wch: 28 }, // Component
//     { wch: 12 }, // Account
//     { wch: 14 }, // CC3/AuxCode
//     { wch: 14 }, // Total (A)
//     { wch: 14 }, // Total (P)
//     // months * 3 columns each => make them a bit narrow but readable
//     ...Array(months.length * 3).fill({ wch: 9 }),
//   ];

//   XLSX.utils.book_append_sheet(wb, ws, 'TrialBalance');

//   // Write workbook to base64 string
//   const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

//   // Pick a cache path for the file
//   const path = `${RNFS.CachesDirectoryPath}/${fileName}.xlsx`;

//   // Save to disk
//   await RNFS.writeFile(path, wbout, 'base64');

//   // Open system share dialog (user can "Save to Files", "Open in Excel", etc.)
//   await Share.open({
//     url: `file://${path}`,
//     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//     filename: fileName,
//     failOnCancel: false,
//     showAppsToView: true,
//   });

//   return path;
// }




import * as XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// ---------- TYPES / CONSTANTS ----------

export type RowItem = {
  type?: 'Revenue' | 'Cost';
  company?: string;
  component?: string;
  accountno?: string;
  cc3code?: string;
  auxcode?: string;
  month?: number;
  balanceFirst?: number;
  year?: number;

  isTotalRow?: boolean;
  yearHeader?: boolean;
  totalType?: 'Revenue' | 'Cost' | 'Grand';

  isGroupParent?: boolean;
  groupKey?: string;
  children?: RowItem[];

  totalBalances?: number[];          // current year monthly (Actual)
  totalSum?: number;                 // current year total (Actual)

  prevYearSum?: number;              // prev year total
  prevMonthlyBalances?: number[];    // prev year monthly

  budgetMonthly?: number[];          // budget monthly (B)
  budgetSum?: number;                // budget total (B)
};

const months = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

// number formatter for Excel cells
const fmtNum = (v?: number | null) =>
  typeof v === 'number' && isFinite(v)
    ? Math.round(v)
    : '';

// ---------- HELPERS ----------

function buildNumbers(item: RowItem) {
  const currMonthly = item.totalBalances
    ? item.totalBalances
    : Array(12).fill(0).map((_, i) =>
        i + 1 === item.month ? (item.balanceFirst || 0) : 0
      );

  const prevMonthly = item.prevMonthlyBalances
    ? item.prevMonthlyBalances
    : Array(12).fill(0);

  // ✅ Budget monthly
  const budgetMonthly = item.budgetMonthly
    ? item.budgetMonthly
    : Array(12).fill(0);

  const currTotal =
    typeof item.totalSum === 'number'
      ? item.totalSum
      : currMonthly.reduce((s, b) => s + b, 0);

  const prevTotal =
    typeof item.prevYearSum === 'number'
      ? item.prevYearSum
      : 0;

  // ✅ Budget total
  const budgetTotal =
    typeof item.budgetSum === 'number'
      ? item.budgetSum
      : budgetMonthly.reduce((s, b) => s + b, 0);

  return { currMonthly, prevMonthly, budgetMonthly, currTotal, prevTotal, budgetTotal };
}

function makeDataRow(
  item: RowItem,
  opts?: { indentChild?: boolean; forceLabel?: string }
): (string | number)[] {
  const { indentChild, forceLabel } = opts || {};
  const { currMonthly, prevMonthly, budgetMonthly, currTotal, prevTotal, budgetTotal } =
    buildNumbers(item);

  const codeCol =
    item.type === 'Revenue'
      ? (item.cc3code ?? '')
      : (item.auxcode ?? '');

  const componentText = indentChild
    ? `   ${item.component ?? ''}`
    : (item.component ?? '');

  const typeLabel = forceLabel
    ? forceLabel
    : (item.type ?? '');

  return [
    typeLabel,
    componentText,
    item.accountno ?? '',
    codeCol,
    fmtNum(currTotal),      // Total (A)
    fmtNum(prevTotal),      // Total (P)
    fmtNum(budgetTotal),    // ✅ Total (B)

    // Per month: A, P, B
    ...months.flatMap((_, idx) => [
      fmtNum(currMonthly[idx]),     // A
      fmtNum(prevMonthly[idx]),     // P
      fmtNum(budgetMonthly[idx]),   // ✅ B
    ]),
  ];
}

// ---------- MAIN EXPORT ----------

export async function exportTrialBalanceToXLSX(
  rows: RowItem[],
  fileName = 'TrialBalance'
) {
  if (!rows?.length) {
    throw new Error('No data to export');
  }

  const sheetData: any[][] = [];

  // ✅ Header with Total (B) + monthly B columns
  const headerRow: string[] = [
    'Type',
    'Component',
    'Account',
    'CC3/AuxCode',
    'Total (A)',
    'Total (P)',
    'Total (B)',
    ...months.flatMap(m => [`${m} (A)`, `${m} (P)`, `${m} (B)`]),
  ];
  sheetData.push(headerRow);

  rows.forEach(item => {
    if (item.yearHeader) {
      sheetData.push([`${item.company ?? ''} - ${item.year ?? ''}`]);
      return;
    }

    if (item.isTotalRow) {
      const label =
        item.totalType === 'Grand'
          ? 'Net Total'
          : `${item.totalType} Total`;

      sheetData.push(makeDataRow(item, { forceLabel: label }));
      return;
    }

    if (item.isGroupParent) {
      sheetData.push(makeDataRow(item, { forceLabel: item.type ?? '' }));

      if (item.children && item.children.length) {
        item.children.forEach(child => {
          sheetData.push(makeDataRow(child, { indentChild: true }));
        });
      }

      return;
    }

    sheetData.push(makeDataRow(item));
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // ✅ Col widths: 4 fixed + 3 totals (A,P,B) + 12 months * 3 cols
  ws['!cols'] = [
    { wch: 14 }, // Type
    { wch: 28 }, // Component
    { wch: 12 }, // Account
    { wch: 14 }, // CC3/AuxCode
    { wch: 14 }, // Total (A)
    { wch: 14 }, // Total (P)
    { wch: 14 }, // Total (B)
    ...Array(months.length * 3).fill({ wch: 9 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TrialBalance');

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const path = `${RNFS.CachesDirectoryPath}/${fileName}.xlsx`;

  await RNFS.writeFile(path, wbout, 'base64');

  await Share.open({
    url: `file://${path}`,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: fileName,
    failOnCancel: false,
    showAppsToView: true,
  });

  return path;
}

