import { getDB } from './db';

export interface TrialBalanceRow {
  id: number;
  company: string;
  type: string;
  component: string;
  cc2: string;
  cc2code: string;
  cc3code: string | null;
  accountno: string;
  accountnoname: string;
  auxcode: string;
  month: number;
  year: number;
  balanceFirst: number;
}

// 1️⃣ Create table
export const createTrialBalanceTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS trial_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT,
        type TEXT,
        component TEXT,
        cc2 TEXT,
        cc2code TEXT,
        cc3code TEXT,
        accountno TEXT,
        accountnoname TEXT,
        auxcode TEXT,
        month INTEGER,
        year INTEGER,
        balanceFirst REAL
      );`
    );
    console.log('✅ Trial Balance table created');
  } catch (err) {
    console.log('❌ Table creation error:', err);
  }
};

// 2️⃣ Insert multiple records
export const insertMultipleTrialBalances = async (records: TrialBalanceRow[]) => {
  if (!records.length) return;

  try {
    const db = await getDB();

    // Optional: drop old table and recreate
    await db.executeSql('DROP TABLE IF EXISTS trial_balance');
    await createTrialBalanceTable();

    db.transaction(
      (tx) => {
        for (let data of records) {
          tx.executeSql(
            `INSERT INTO trial_balance 
              (company, type, component, cc2, cc2code, cc3code, accountno, accountnoname, auxcode, month, year, balanceFirst)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              data.company || '',
              data.type || '',
              data.component || '',
              data.cc2 || '',
              data.cc2code || '',
              data.cc3code || '',
              data.accountno || '',
              data.accountnoname || '',
              data.auxcode || '',
              data.month || 0,
              data.year || 0,
              data.balanceFirst || 0,
            ]
          );
        }
      },
      (error) => console.log('❌ Transaction failed:', error),
      () => console.log(`✅ ${records.length} records inserted`)
    );
  } catch (err) {
    console.log('❌ Insert exception:', err);
  }
};

// 3️⃣ Fetch all records
export const getAllTrialBalances = async (): Promise<TrialBalanceRow[]> => {
  try {
    const db = await getDB();
    const results: TrialBalanceRow[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM trial_balance',
            [],
            (_, res) => {
              for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);
                results.push({
                  id: row.id,
                  company: row.company || '',
                  type: row.type || '',
                  component: row.component || '',
                  cc2: row.cc2 || '',
                  cc2code: row.cc2code || '',
                  cc3code: row.cc3code || null,
                  accountno: row.accountno || '',
                  accountnoname: row.accountnoname || '',
                  auxcode: row.auxcode || '',
                  month: row.month || 0,
                  year: row.year || 0,
                  balanceFirst: row.balanceFirst || 0,
                });
              }
              resolve();
            },
            (_, error) => {
              console.log('❌ Fetch error:', error);
              reject(error);
              return false;
            }
          );
        },
        (txError) => {
          console.log('❌ Transaction error:', txError);
          reject(txError);
        }
      );
    });

    return results;
  } catch (err) {
    console.log('❌ Fetch exception:', err);
    return [];
  }
};

// 4️⃣ Fetch by company
export const getTrialBalanceByCompany = async (companyName: string): Promise<TrialBalanceRow[]> => {
  try {
    const db = await getDB();
    const results: TrialBalanceRow[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM trial_balance WHERE company = ?',
            [companyName],
            (_, res) => {
              for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);
                results.push({
                  id: row.id,
                  company: row.company || '',
                  type: row.type || '',
                  component: row.component || '',
                  cc2: row.cc2 || '',
                  cc2code: row.cc2code || '',
                  cc3code: row.cc3code || null,
                  accountno: row.accountno || '',
                  accountnoname: row.accountnoname || '',
                  auxcode: row.auxcode || '',
                  month: row.month || 0,
                  year: row.year || 0,
                  balanceFirst: row.balanceFirst || 0,
                });
              }
              resolve();
            },
            (_, error) => {
              console.log('❌ Fetch error inside transaction:', error);
              reject(error);
              return false;
            }
          );
        },
        (txError) => {
          console.log('❌ Transaction error:', txError);
          reject(txError);
        }
      );
    });

    return results;
  } catch (err) {
    console.log('❌ Fetch exception:', err);
    return [];
  }
};






export interface PnLRow {
  year: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export const getOverallPnL = async (): Promise<PnLRow[]> => {
  try {
    const db = await getDB();
    const results: PnLRow[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT year,
                    -- Revenue hamesha positive
                    SUM(CASE WHEN type='Revenue' THEN balanceFirst ELSE 0 END) AS totalRevenue,

                    -- Cost ko positive bana do (ABS)
                    (SUM(CASE WHEN type='Cost' THEN balanceFirst ELSE 0 END)) AS totalCost,

                    -- Net Profit = Revenue - Cost
                    SUM(CASE WHEN type='Revenue' THEN balanceFirst ELSE 0 END) - 
                    (SUM(CASE WHEN type='Cost' THEN balanceFirst ELSE 0 END)) AS netProfit
             FROM trial_balance
             GROUP BY year
             ORDER BY year;`,
            [],
            (_, res) => {
              for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);
                results.push({
                  year: row.year,
                  totalRevenue: row.totalRevenue || 0,
                  totalCost: row.totalCost || 0,
                  netProfit: row.netProfit || 0,
                });
              }
              resolve();
            },
            (_, error) => {
              console.log("❌ Fetch overall PnL error:", error);
              reject(error);
              return false;
            }
          );
        },
        (txError) => {
          console.log("❌ Transaction error overall PnL:", txError);
          reject(txError);
        }
      );
    });

    return results;
  } catch (err) {
    console.log("❌ Exception overall PnL:", err);
    return [];
  }
};

export const getCompanyPnL = async (): Promise<PnLRow[]> => {
  try {
    const db = await getDB();
    const results: PnLRow[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT company,
                    year,
                    SUM(CASE WHEN type='Revenue' THEN balanceFirst ELSE 0 END) AS totalRevenue,
                    SUM(CASE WHEN type='Cost' THEN balanceFirst ELSE 0 END) AS totalCost,
                    SUM(CASE WHEN type='Revenue' THEN balanceFirst ELSE 0 END) + 
                    SUM(CASE WHEN type='Cost' THEN balanceFirst ELSE 0 END) AS netProfit
             FROM trial_balance
             GROUP BY company, year
             ORDER BY company, year;`,
            [],
            (_, res) => {
              const companyTotalsMap: Record<string, { totalRevenue: number; totalCost: number; netProfit: number; }> = {};

              for (let i = 0; i < res.rows.length; i++) {
                const row = res.rows.item(i);

                // Year-wise row
                results.push({
                  company: row.company,
                  year: row.year,
                  totalRevenue: row.totalRevenue || 0,
                  totalCost: row.totalCost || 0,
                  netProfit: row.netProfit || 0,
                });

                // Accumulate overall totals per company
                if (!companyTotalsMap[row.company]) {
                  companyTotalsMap[row.company] = { totalRevenue: 0, totalCost: 0, netProfit: 0 };
                }
                companyTotalsMap[row.company].totalRevenue += row.totalRevenue || 0;
                companyTotalsMap[row.company].totalCost += row.totalCost || 0;
                companyTotalsMap[row.company].netProfit += row.netProfit || 0;
              }

              // Add overall totals row for each company
              Object.keys(companyTotalsMap).forEach((company) => {
                results.push({
                  company,
                  year: 'Overall', // indicate cumulative total
                  totalRevenue: companyTotalsMap[company].totalRevenue,
                  totalCost: companyTotalsMap[company].totalCost,
                  netProfit: companyTotalsMap[company].netProfit,
                });
              });

              resolve();
            },
            (_, error) => {
              console.log("❌ Fetch company PnL error:", error);
              reject(error);
              return false;
            }
          );
        },
        (txError) => {
          console.log("❌ Transaction error company PnL:", txError);
          reject(txError);
        }
      );
    });

    return results;
  } catch (err) {
    console.log("❌ Exception company PnL:", err);
    return [];
  }
};
