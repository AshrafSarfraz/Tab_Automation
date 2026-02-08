import { getDB } from "./db";

const MONGO_API_URL =
  "https://financesystemawh-rtjt.onrender.com/api/othercmp_trialbalance/mongo";

// ✅ Use a separate table for OtherCmp so it doesn't overwrite Westwalk
const TABLE_NAME = "othercmp_mongo";

// 1️⃣ Create table (raw JSON store)
export const createOtherCmpMongoTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        savedAt INTEGER
      );
    `);
    console.log(`✅ ${TABLE_NAME} table created`);
  } catch (err) {
    console.log("❌ Table creation error:", err);
  }
};

// 2️⃣ Save API response (RAW) into sqlite
export const syncOtherCmpMongoFromApi = async () => {
  try {
    await createOtherCmpMongoTable();

    console.log("🌐 Fetching OtherCmp Mongo API...");
    const res = await fetch(MONGO_API_URL);
    const json = await res.json(); // save exact response

    const db = await getDB();

    // keep only latest snapshot (clear old)
    await db.executeSql(`DELETE FROM ${TABLE_NAME};`);

    await db.executeSql(
      `INSERT INTO ${TABLE_NAME} (payload, savedAt) VALUES (?, ?)`,
      [JSON.stringify(json), Date.now()]
    );

    console.log(`✅ Saved OtherCmp payload to sqlite (${TABLE_NAME})`);
    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};

// 3️⃣ Get latest saved payload from sqlite
export const getOtherCmpMongoFromSQLite = async () => {
  try {
    await createOtherCmpMongoTable();

    const db = await getDB();
    const rows = [];

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM ${TABLE_NAME} ORDER BY id DESC LIMIT 1;`,
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

export const clearOtherCmpMongoTable = async () => {
  try {
    await createOtherCmpMongoTable();
    const db = await getDB();
    await db.executeSql(`DELETE FROM ${TABLE_NAME};`);
    console.log(`✅ ${TABLE_NAME} cleared`);
  } catch (e) {
    console.log("❌ Clear error:", e);
  }
};
