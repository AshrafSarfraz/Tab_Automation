// database/Utils/export_to_pdf.ts
import Share from 'react-native-share';

// Robust import (works for default/CJS)
const _pdf = require('react-native-html-to-pdf') as any;
const RNHTMLtoPDF = _pdf?.default ?? _pdf;

// Pick the available method: convert() (newer) or generatePDF() (older)
const convertPDF: undefined | ((opts: any) => Promise<any>) =
  RNHTMLtoPDF?.convert ?? RNHTMLtoPDF?.generatePDF;

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
  totalBalances?: number[];
  totalSum?: number;
};

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const n = (v?: number | null) =>
  typeof v === 'number' && isFinite(v) ? Math.round(v).toLocaleString('en-US') : '';

export async function exportTrialBalanceToPDF(
  rows: RowItem[],
  title = 'Trial Balance Sheet',
  fileName = 'TrialBalance' // no ".pdf" here
) {
  if (!rows?.length) throw new Error('No data to export');

  if (!convertPDF) {
    console.warn('RNHTMLtoPDF loaded but no convert/generatePDF method:', Object.keys(RNHTMLtoPDF || {}));
    throw new Error('react-native-html-to-pdf API not found (convert/generatePDF). Check package version.');
  }

  // Build rows HTML
  let bodyRows = '';
  rows.forEach(item => {
    if (item.yearHeader) {
      const label = `${item.company ?? ''} - ${item.year ?? ''}`;
      bodyRows += `<tr class="year"><td colspan="${5 + months.length}">${label}</td></tr>`;
      return;
    }

    if (item.isTotalRow) {
      const label = item.totalType === 'Grand' ? 'Net Total' : `${item.totalType} Total`;
      const rowClass =
        item.totalType === 'Revenue' ? 'tot revenue' :
        item.totalType === 'Cost'    ? 'tot cost'    : 'tot grand';
      const totals = (item.totalBalances ?? []).map(b => `<td class="num b">${n(b)}</td>`).join('');
      bodyRows += `
        <tr class="${rowClass}">
          <td class="b">${label}</td>
          <td>${item.company ?? ''}</td>
          <td></td><td></td>
          <td class="num b">${n(item.totalSum)}</td>
          ${totals}
        </tr>`;
      return;
    }

    const balances: number[] = item.totalBalances
      ? item.totalBalances
      : Array(12).fill(0).map((_, i) => (i + 1 === item.month ? (item.balanceFirst || 0) : 0));
    const total = balances.reduce((s, b) => s + b, 0);

    bodyRows += `
      <tr>
        <td>${item.type ?? ''}</td>
        <td>${item.component ?? ''}</td>
        <td>${item.accountno ?? ''}</td>
        <td>${item.type === 'Revenue' ? (item.cc3code ?? '') : (item.auxcode ?? '')}</td>
        <td class="num">${n(total)}</td>
        ${balances.map(b => `<td class="num">${n(b)}</td>`).join('')}
      </tr>`;
  });

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Arial, sans-serif; }
  h1 { margin: 0 0 8px; font-size: 18px; }
  .meta { font-size: 12px; color: #555; margin: 0 0 12px; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #ddd; padding: 6px; font-size: 11px; word-wrap: break-word; }
  th { background: #f4f4f4; text-align: left; }
  td.num { text-align: right; }
  .b { font-weight: 600; }

  th.col-type { width: 100px; }
  th.col-comp { width: 170px; }
  th.col-acct { width: 70px; }
  th.col-aux { width: 70px; }
  th.col-total { width: 90px; }
  th.col-month { width: 70px; }

  tr.year td { background: #eee; font-weight: 700; font-size: 13px; }
  tr.tot.revenue td { background: #d1f7d1; }
  tr.tot.cost td { background: #f7d1d1; }
  tr.tot.grand td { background: #ffe4b5; border-top: 2px solid #aaa; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated on: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th class="col-type">Type</th>
        <th class="col-comp">Component</th>
        <th class="col-acct">Account</th>
        <th class="col-aux">CC3/AuxCode</th>
        <th class="col-total">Total</th>
        ${months.map(() => `<th class="col-month">Month</th>`).join('')}
      </tr>
      <tr>
        <th></th><th></th><th></th><th></th><th></th>
        ${months.map(m => `<th class="col-month">${m}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

  // Call whichever API exists
  const result = await convertPDF({
    html,
    fileName,
    base64: false,
  });

  const filePath = result?.filePath || result?.file; // some forks return "file"
  if (!filePath) {
    throw new Error('PDF created but file path missing from result.');
  }

  await Share.open({
    url: `file://${filePath}`,
    type: 'application/pdf',
    filename: fileName,
    failOnCancel: false,
    showAppsToView: true,
  });

  return filePath;
}
