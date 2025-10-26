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

// produce monthly arrays + totals for a RowItem
function buildNumbers(item: RowItem) {
  const currMonthly = item.totalBalances
    ? item.totalBalances
    : Array(12).fill(0).map((_, i) =>
        i + 1 === item.month ? (item.balanceFirst || 0) : 0
      );

  const prevMonthly = item.prevMonthlyBalances
    ? item.prevMonthlyBalances
    : Array(12).fill(0);

  const currTotal =
    typeof item.totalSum === 'number'
      ? item.totalSum
      : currMonthly.reduce((s, b) => s + b, 0);

  const prevTotal =
    typeof item.prevYearSum === 'number'
      ? item.prevYearSum
      : 0;

  return { currMonthly, prevMonthly, currTotal, prevTotal };
}

// builds one logical row for the sheet
function makeDataRow(
  item: RowItem,
  opts?: { indentChild?: boolean; forceLabel?: string }
): (string | number)[] {
  const { indentChild, forceLabel } = opts || {};
  const { currMonthly, prevMonthly, currTotal, prevTotal } =
    buildNumbers(item);

  // code column differs
  const codeCol =
    item.type === 'Revenue'
      ? (item.cc3code ?? '')
      : (item.auxcode ?? '');

  // indent children visually using leading spaces
  const componentText = indentChild
    ? `   ${item.component ?? ''}`
    : (item.component ?? '');

  const typeLabel = forceLabel
    ? forceLabel
    : (item.type ?? '');

  return [
    typeLabel,                   // Type / or "Revenue Total" etc.
    componentText,               // Component (maybe indented)
    item.accountno ?? '',        // Account
    codeCol,                     // CC3 or Aux
    fmtNum(currTotal),           // Total (A)
    fmtNum(prevTotal),           // Total (P)

    // For each month we output 3 cols: Budget (blank), Actual, Prev
    ...months.flatMap((_, idx) => [
      '',                                // Budget (B) not tracked yet
      fmtNum(currMonthly[idx]),          // A (this year actual)
      fmtNum(prevMonthly[idx]),          // P (prev year actual for same month)
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

  // Build 2D array (sheet rows)
  const sheetData: any[][] = [];

  // Header row (top row in Excel)
  const headerRow: string[] = [
    'Type',
    'Component',
    'Account',
    'CC3/AuxCode',
    'Total (A)',
    'Total (P)',
    ...months.flatMap(m => [`${m} (B)`, `${m} (A)`, `${m} (P)`]),
  ];
  sheetData.push(headerRow);

  // Body rows
  rows.forEach(item => {
    // Year header row ("West Walk Real Estate - 2025")
    if (item.yearHeader) {
      sheetData.push([`${item.company ?? ''} - ${item.year ?? ''}`]);
      return;
    }

    // Total rows (Revenue Total / Cost Total / Net Total)
    if (item.isTotalRow) {
      const label =
        item.totalType === 'Grand'
          ? 'Net Total'
          : `${item.totalType} Total`;

      sheetData.push(
        makeDataRow(item, { forceLabel: label })
      );
      return;
    }

    // Group parent row, then children
    if (item.isGroupParent) {
      // parent summary row (unindented)
      sheetData.push(
        makeDataRow(item, { forceLabel: item.type ?? '' })
      );

      // children detail rows (indented)
      if (item.children && item.children.length) {
        item.children.forEach(child => {
          sheetData.push(
            makeDataRow(child, { indentChild: true })
          );
        });
      }

      return;
    }

    // Plain leaf row
    sheetData.push(makeDataRow(item));
  });

  // Create workbook + worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // (Optional but recommended) set column widths so it's not super cramped
  ws['!cols'] = [
    { wch: 14 }, // Type / Total Label
    { wch: 28 }, // Component
    { wch: 12 }, // Account
    { wch: 14 }, // CC3/AuxCode
    { wch: 14 }, // Total (A)
    { wch: 14 }, // Total (P)
    // months * 3 columns each => make them a bit narrow but readable
    ...Array(months.length * 3).fill({ wch: 9 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TrialBalance');

  // Write workbook to base64 string
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  // Pick a cache path for the file
  const path = `${RNFS.CachesDirectoryPath}/${fileName}.xlsx`;

  // Save to disk
  await RNFS.writeFile(path, wbout, 'base64');

  // Open system share dialog (user can "Save to Files", "Open in Excel", etc.)
  await Share.open({
    url: `file://${path}`,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: fileName,
    failOnCancel: false,
    showAppsToView: true,
  });

  return path;
}








// export csv
// import RNFS from 'react-native-fs';
// import Share from 'react-native-share';

// // Keep this RowItem in sync with what you pass from the screen
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

//   totalBalances?: number[];          // this year monthly (A)
//   totalSum?: number;                 // this year total (A)

//   prevYearSum?: number;              // prev year total (P)
//   prevMonthlyBalances?: number[];    // prev year monthly (P)
// };

// const months = [
//   'Jan','Feb','Mar','Apr','May','Jun',
//   'Jul','Aug','Sep','Oct','Nov','Dec'
// ];

// // Safe number formatter for CSV
// const num = (v?: number | null) =>
//   typeof v === 'number' && isFinite(v)
//     ? Math.round(v)
//     : '';

// /**
//  * Build a single CSV logical row from a RowItem
//  */
// function makeDataRow(
//   item: RowItem,
//   opts?: { indentChild?: boolean; forceLabel?: string }
// ): string[] {
//   const { indentChild, forceLabel } = opts || {};

//   // Build per-month arrays + totals (same logic you used in PDF)
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

//   // Same column logic: CC3 code for Revenue, Auxcode for Cost
//   const codeCol =
//     item.type === 'Revenue'
//       ? (item.cc3code ?? '')
//       : (item.auxcode ?? '');

//   // small indent for children inside a group parent
//   const compTxt = indentChild
//     ? `   ${item.component ?? ''}`
//     : (item.component ?? '');

//   // Replace "Type" label for totals like "Revenue Total", etc.
//   const labelType = forceLabel
//     ? forceLabel
//     : (item.type ?? '');

//   return [
//     labelType,
//     compTxt,
//     item.accountno ?? '',
//     codeCol,
//     `${num(currTotal)}`, // Total (A)
//     `${num(prevTotal)}`, // Total (P)

//     // now 12 * (B,A,P)
//     ...months.flatMap((_, idx) => [
//       '', // Budget (B) is blank for now
//       `${num(currMonthly[idx])}`, // A = this year
//       `${num(prevMonthly[idx])}`, // P = prev year
//     ]),
//   ];
// }

// /**
//  * Turn array-of-arrays into proper CSV string with quotes.
//  * We quote every cell and escape " as "" so Excel doesn't choke.
//  */
// function matrixToCSV(matrix: string[][]): string {
//   return matrix
//     .map(row =>
//       row
//         .map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`)
//         .join(',')
//     )
//     .join('\n');
// }

// /**
//  * Write the CSV file to cache, then open share sheet
//  */
// export async function exportTrialBalanceToCSV(
//   rows: RowItem[],
//   fileName = 'TrialBalance'
// ) {
//   if (!rows?.length) {
//     throw new Error('No data to export');
//   }

//   // Build header row
//   const headers: string[] = [
//     'Type',
//     'Component',
//     'Account',
//     'CC3/AuxCode',
//     'Total (A)',
//     'Total (P)',
//     ...months.flatMap(m => [`${m} (B)`, `${m} (A)`, `${m} (P)`]),
//   ];

//   // We'll build a matrix of rows for the CSV
//   const csvMatrix: string[][] = [];
//   csvMatrix.push(headers);

//   // Walk through the same structured `data` you render in FlatList
//   rows.forEach(item => {
//     if (item.yearHeader) {
//       // Section break row:
//       // Put "Company - Year" in col A and leave the rest empty so it's visually obvious in Excel.
//       csvMatrix.push([
//         `${item.company ?? ''} - ${item.year ?? ''}`,
//       ]);
//       return;
//     }

//     if (item.isTotalRow) {
//       const label =
//         item.totalType === 'Grand'
//           ? 'Net Total'
//           : `${item.totalType} Total`;

//       csvMatrix.push(
//         makeDataRow(item, { forceLabel: label })
//       );
//       return;
//     }

//     if (item.isGroupParent) {
//       // Push parent summary row
//       csvMatrix.push(
//         makeDataRow(item, { forceLabel: item.type ?? '' })
//       );

//       // Then each child, indented
//       if (item.children && item.children.length) {
//         item.children.forEach(child => {
//           csvMatrix.push(
//             makeDataRow(child, { indentChild: true })
//           );
//         });
//       }
//       return;
//     }

//     // Plain row
//     csvMatrix.push(
//       makeDataRow(item)
//     );
//   });

//   // Convert matrix -> CSV text
//   const csvString = matrixToCSV(csvMatrix);

//   // Choose a path in cache
//   const path = `${RNFS.CachesDirectoryPath}/${fileName}.csv`;

//   // Write file
//   await RNFS.writeFile(path, csvString, 'utf8');

//   // Share the file (user can "Save to Files", "Open in Excel", etc.)
//   await Share.open({
//     url: `file://${path}`,
//     type: 'text/csv',
//     filename: fileName,
//     failOnCancel: false,
//     showAppsToView: true,
//   });

//   return path;
// }







// // database/Utils/export_to_pdf.ts
// import Share from 'react-native-share';

// // Robust import (works for default/CJS)
// const _pdf = require('react-native-html-to-pdf') as any;
// const RNHTMLtoPDF = _pdf?.default ?? _pdf;

// // Pick the available method: convert() (newer) or generatePDF() (older)
// const convertPDF: undefined | ((opts: any) => Promise<any>) =
//   RNHTMLtoPDF?.convert ?? RNHTMLtoPDF?.generatePDF;

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
//   totalBalances?: number[];
//   totalSum?: number;
// };

// const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// const n = (v?: number | null) =>
//   typeof v === 'number' && isFinite(v) ? Math.round(v).toLocaleString('en-US') : '';

// export async function exportTrialBalanceToPDF(
//   rows: RowItem[],
//   title = 'Trial Balance Sheet',
//   fileName = 'TrialBalance' // no ".pdf" here
// ) {
//   if (!rows?.length) throw new Error('No data to export');

//   if (!convertPDF) {
//     console.warn('RNHTMLtoPDF loaded but no convert/generatePDF method:', Object.keys(RNHTMLtoPDF || {}));
//     throw new Error('react-native-html-to-pdf API not found (convert/generatePDF). Check package version.');
//   }

//   // Build rows HTML
//   let bodyRows = '';
//   rows.forEach(item => {
//     if (item.yearHeader) {
//       const label = `${item.company ?? ''} - ${item.year ?? ''}`;
//       bodyRows += `<tr class="year"><td colspan="${5 + months.length}">${label}</td></tr>`;
//       return;
//     }

//     if (item.isTotalRow) {
//       const label = item.totalType === 'Grand' ? 'Net Total' : `${item.totalType} Total`;
//       const rowClass =
//         item.totalType === 'Revenue' ? 'tot revenue' :
//         item.totalType === 'Cost'    ? 'tot cost'    : 'tot grand';
//       const totals = (item.totalBalances ?? []).map(b => `<td class="num b">${n(b)}</td>`).join('');
//       bodyRows += `
//         <tr class="${rowClass}">
//           <td class="b">${label}</td>
//           <td>${item.company ?? ''}</td>
//           <td></td><td></td>
//           <td class="num b">${n(item.totalSum)}</td>
//           ${totals}
//         </tr>`;
//       return;
//     }

//     const balances: number[] = item.totalBalances
//       ? item.totalBalances
//       : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? (item.balanceFirst || 0) : 0));
//     const total = balances.reduce((s, b) => s + b, 0);

//     bodyRows += `
//       <tr>
//         <td>${item.type ?? ''}</td>
//         <td>${item.component ?? ''}</td>
//         <td>${item.accountno ?? ''}</td>
//         <td>${item.type === 'Revenue' ? (item.cc3code ?? '') : (item.auxcode ?? '')}</td>
//         <td class="num">${n(total)}</td>
//         ${balances.map(b => `<td class="num">${n(b)}</td>`).join('')}
//       </tr>`;
//   });

//   const html = `<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4 landscape; margin: 12mm; }
//   * { box-sizing: border-box; }
//   body { font-family: -apple-system, Roboto, Arial, sans-serif; }
//   h1 { margin: 0 0 8px; font-size: 18px; }
//   .meta { font-size: 12px; color: #555; margin: 0 0 12px; }

//   table { width: 100%; border-collapse: collapse; table-layout: fixed; }
//   thead { display: table-header-group; }
//   th, td { border: 1px solid #ddd; padding: 6px; font-size: 11px; word-wrap: break-word; }
//   th { background: #f4f4f4; text-align: left; }
//   td.num { text-align: right; }
//   .b { font-weight: 600; }

//   th.col-type { width: 100px; }
//   th.col-comp { width: 170px; }
//   th.col-acct { width: 70px; }
//   th.col-aux { width: 70px; }
//   th.col-total { width: 90px; }
//   th.col-month { width: 70px; }

//   tr.year td { background: #eee; font-weight: 700; font-size: 13px; }
//   tr.tot.revenue td { background: #d1f7d1; }
//   tr.tot.cost td { background: #f7d1d1; }
//   tr.tot.grand td { background: #ffe4b5; border-top: 2px solid #aaa; }
// </style>
// </head>
// <body>
//   <h1>${title}</h1>
//   <p class="meta">Generated on: ${new Date().toLocaleString()}</p>
//   <table>
//     tr:first-child th {
//          background: #31368A;   /* dark background */
//           color: #fff;        /* white text */}
//         <th class="col-type">Type</th>
//         <th class="col-comp">Component</th>
//         <th class="col-acct">Account</th>
//         <th class="col-aux">CC3/AuxCode</th>
//         <th class="col-total">Total</th>
//         ${months.map(() => `<th class="col-month">Month</th>`).join('')}
//       </tr>
//       <tr>
//         <th></th><th></th><th></th><th></th><th></th>
//         ${months.map(m => `<th class="col-month">${m}</th>`).join('')}
//       </tr>
//     </thead>
//     <tbody>${bodyRows}</tbody>
//   </table>
// </body>
// </html>`;

//   // Call whichever API exists
//   const result = await convertPDF({
//     html,
//     fileName,
//     base64: false,
//   });

//   const filePath = result?.filePath || result?.file; // some forks return "file"
//   if (!filePath) {
//     throw new Error('PDF created but file path missing from result.');
//   }

//   await Share.open({
//     url: `file://${filePath}`,
//     type: 'application/pdf',
//     filename: fileName,
//     failOnCancel: false,
//     showAppsToView: true,
//   });

//   return filePath;
// }
