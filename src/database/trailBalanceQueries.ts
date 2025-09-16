// /src/database/trialBalanceQueries.ts
import { getDB } from './db';

// Create table
export const createTrialBalanceTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS trial_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT,
        type TEXT,
        component TEXT,
        month INTEGER,
        year INTEGER,
        accountno TEXT,
        accountnoname TEXT,
        auxcode TEXT,
        cc2 TEXT,
        cc2code TEXT,
        cc3 TEXT,
        cc3code TEXT,
        balances TEXT
      );`
    );
    console.log('✅ Trial Balance table created');
  } catch (err) {
    console.log('❌ Table creation error:', err);
  }
};

// Insert multiple records safely in one transaction
export const insertMultipleTrialBalances = async (records: any[]) => {
  if (!records.length) return;

  try {
    const db = await getDB();

    // Ensure table exists
    await createTrialBalanceTable();

    db.transaction(
      (tx) => {
        // Clear old data to prevent duplicates
        tx.executeSql('DELETE FROM trial_balance');

        // Insert all records
        for (let data of records) {
          tx.executeSql(
            `INSERT INTO trial_balance 
              (company, type, component, month, year, accountno, accountnoname, auxcode, cc2, cc2code, cc3, cc3code, balances)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              data.company,
              data.type,
              data.component,
              data.month,
              data.year,
              data.accountno,
              data.accountnoname,
              data.auxcode,
              data.cc2,
              data.cc2code,
              data.cc3,
              data.cc3code,
              JSON.stringify(data.balances),
            ]
          );
        }
      },
      (error) => {
        console.log('❌ Bulk insert transaction failed:', error);
      },
      () => {
        console.log(`✅ ${records.length} records inserted (transaction complete)`);
      }
    );
  } catch (err) {
    console.log('❌ Bulk insert exception:', err);
  }
};

// Fetch all records
export const getAllTrialBalances = async (): Promise<any[]> => {
  try {
    const db = await getDB();
    const results: any[] = [];

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
                  ...row,
                  balances: JSON.parse(row.balances),
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



// // /src/database/trialBalanceQueries.ts
// import { getDB } from './db';

// // Create table
// export const createTrialBalanceTable = async () => {
//   try {
//     const db = await getDB();
//     await db.transaction(async (tx) => {
//       await tx.executeSql(
//         `CREATE TABLE IF NOT EXISTS trial_balance (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           company TEXT,
//           type TEXT,
//           component TEXT,
//           month INTEGER,
//           year INTEGER,
//           accountno TEXT,
//           accountnoname TEXT,
//           auxcode TEXT,
//           cc2 TEXT,
//           cc2code TEXT,
//           cc3 TEXT,
//           cc3code TEXT,
//           balances TEXT
//         );`
//       );
//     });
//     console.log('✅ Trial Balance table created');
//   } catch (err) {
//     console.log('❌ Table creation error:', err);
//   }
// };

// // Insert single record
// export const insertTrialBalance = async (data: any) => {
//   try {
//     const db = await getDB();
//     await db.transaction(async (tx) => {
//       await tx.executeSql(
//         `INSERT INTO trial_balance 
//         (company, type, component, month, year, accountno, accountnoname, auxcode, cc2, cc2code, cc3, cc3code, balances)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           data.company,
//           data.type,
//           data.component,
//           data.month,
//           data.year,
//           data.accountno,
//           data.accountnoname,
//           data.auxcode,
//           data.cc2,
//           data.cc2code,
//           data.cc3,
//           data.cc3code,
//           JSON.stringify(data.balances),
//         ]
//       );
//     });
//     console.log('✅ Trial Balance inserted');
//   } catch (err) {
//     console.log('❌ Insert error:', err);
//   }
// };

// // Fetch all records
// export const getAllTrialBalances = async (): Promise<any[]> => {
//   try {
//     const db = await getDB();
//     const results: any[] = [];
//     await db.transaction(async (tx) => {
//       const [res] = await tx.executeSql('SELECT * FROM trial_balance');
//       for (let i = 0; i < res.rows.length; i++) {
//         const row = res.rows.item(i);
//         results.push({
//           ...row,
//           balances: JSON.parse(row.balances),
//         });
//       }
//     });
//     return results;
//   } catch (err) {
//     console.log('❌ Fetch error:', err);
//     return [];
//   }
// };

// // Bulk insert multiple records

// // export const insertMultipleTrialBalances = async (records: any[]) => {
// //   for (let data of records) {
// //     await insertTrialBalance(data);
// //   }
// //   console.log(`✅ ${records.length} records inserted`);
// // };


// export const insertMultipleTrialBalances = async (records: any[]) => {
//   try {
//     const db = await getDB();
//     await db.transaction(async (tx) => {
//       for (let data of records) {
//         await tx.executeSql(
//           `INSERT INTO trial_balance 
//           (company, type, component, month, year, accountno, accountnoname, auxcode, cc2, cc2code, cc3, cc3code, balances)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             data.company,
//             data.type,
//             data.component,
//             data.month,
//             data.year,
//             data.accountno,
//             data.accountnoname,
//             data.auxcode,
//             data.cc2,
//             data.cc2code,
//             data.cc3,
//             data.cc3code,
//             JSON.stringify(data.balances),
//           ]
//         );
//       }
//     });
//     console.log(`✅ ${records.length} records inserted`);
//   } catch (err) {
//     console.log('❌ Bulk insert error:', err);
//   }
// };
