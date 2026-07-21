import { getDB } from "./db";

const CASHFLOW_API_URL = "https://financesystemawh-rtjt.onrender.com/api/cashflow/getdata";

// 1️⃣ Create table
export const createCashFlowTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS cashflow_mongo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        savedAt INTEGER
      );
    `);
    console.log("✅ cashflow_mongo table created");
  } catch (err) {
    console.log("❌ Table creation error:", err);
  }
};

// 2️⃣ Sync from API → SQLite
export const syncCashFlowFromApi = async () => {
  try {
    await createCashFlowTable();

    console.log("🌐 Fetching CashFlow API...");
    const res = await fetch(CASHFLOW_API_URL);
    const json = await res.json();

    const db = await getDB();
    await db.executeSql(`DELETE FROM cashflow_mongo;`);
    await db.executeSql(
      `INSERT INTO cashflow_mongo (payload, savedAt) VALUES (?, ?)`,
      [JSON.stringify(json), Date.now()]
    );

    console.log("✅ CashFlow saved to SQLite");
    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};

// 3️⃣ Get from SQLite
export const getCashFlowFromSQLite = async () => {
  try {
    await createCashFlowTable();

    const db = await getDB();
    const rows: any[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM cashflow_mongo ORDER BY id DESC LIMIT 1;`,
          [],
          (_, res) => {
            for (let i = 0; i < res.rows.length; i++) {
              rows.push(res.rows.item(i));
            }
            resolve();
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });

    if (!rows.length) return null;

    const item = rows[0];
    return {
      savedAt: item.savedAt,
      data: item.payload ? JSON.parse(item.payload) : null,
    };
  } catch (err) {
    console.log("❌ Get error:", err);
    return null;
  }
};

// 4️⃣ Clear
export const clearCashFlowTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`DELETE FROM cashflow_mongo;`);
    console.log("✅ cashflow_mongo cleared");
  } catch (e) {
    console.log("❌ Clear error:", e);
  }
};