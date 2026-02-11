import { getDB } from "./db";

const BUDGET_API_URL =
  "https://financesystemawh-rtjt.onrender.com/budgeted";


// 1️⃣ Create table
export const createBudgetedMongoTable = async () => {
  try {
    const db = await getDB();

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS budgeted_mongo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        savedAt INTEGER
      );
    `);

    console.log("✅ budgeted_mongo table created");
  } catch (err) {
    console.log("❌ Table creation error:", err);
  }
};


// 2️⃣ Sync from API → SQLite
export const syncBudgetedFromApi = async () => {
  try {
    await createBudgetedMongoTable();

    console.log("🌐 Fetching Budget API...");
    const res = await fetch(BUDGET_API_URL);
    const json = await res.json();

    const db = await getDB();

    // keep latest only
    await db.executeSql(`DELETE FROM budgeted_mongo;`);

    await db.executeSql(
      `INSERT INTO budgeted_mongo (payload, savedAt) VALUES (?, ?)`,
      [JSON.stringify(json), Date.now()]
    );

    console.log("✅ Saved budgeted payload to sqlite");
    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};


// 3️⃣ Get latest data
export const getBudgetedFromSQLite = async () => {
  try {
    await createBudgetedMongoTable();

    const db = await getDB();
    const rows = [];

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM budgeted_mongo ORDER BY id DESC LIMIT 1;`,
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


// 4️⃣ Clear table
export const clearBudgetedTable = async () => {
  try {
    const db = await getDB();

    await db.executeSql(`DELETE FROM budgeted_mongo;`);

    console.log("✅ budgeted_mongo cleared");
  } catch (e) {
    console.log("❌ Clear error:", e);
  }
};
