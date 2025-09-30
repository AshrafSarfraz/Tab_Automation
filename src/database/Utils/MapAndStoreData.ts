// services/syncTrialBalance.ts

import { fetchTrialBalanceApi, getAuthToken } from "../../Api's";
import { accountMapping } from "../../redux/accountMaping/accountMapping";
import { insertMultipleTrialBalances } from "../trailBalanceQueries";



export type TrialRow = {
  accountno: string;
  accountnoname?: string;
  month?: number;
  year?: number;
  balanceFirst?: number;
  cc2?: string;
  cc2code?: string;
  cc3code?: string;
  auxcode?: string;
  // mapped fields
  company?: string;
  type?: string;
  component?: string;
};

export type SyncResult = {
  rows: TrialRow[];
  totals: { revenue: number; cost: number; net: number };
};

export async function syncTrialBalance(): Promise<SyncResult> {
  const token = await getAuthToken();
  if (!token) throw new Error("No token found");

  // 1) API se laao
  const apiData: TrialRow[] = await fetchTrialBalanceApi(token);

  // 2) Mapping + balance sign fix
  const mapped: TrialRow[] = (apiData ?? []).map((item) => {
    const mapping = accountMapping[item.accountno] || {};
    return {
      ...item,
      company: mapping.company || "",
      type: mapping.type || "",
      component: mapping.component || "",
      // tumhari convention ke mutabiq:
      balanceFirst: -1 * Number(item.balanceFirst ?? 0),
    };
  });

  // 3) Totals (optional)
  const revenue = mapped
    .filter((i) => i.type === "Revenue")
    .reduce((sum, i) => sum + (i.balanceFirst || 0), 0);
  const cost = mapped
    .filter((i) => i.type === "Cost")
    .reduce((sum, i) => sum + (i.balanceFirst || 0), 0);

  // 4) DB insert
  await insertMultipleTrialBalances(mapped);

  return { rows: mapped, totals: { revenue, cost, net: revenue + cost } };
}
