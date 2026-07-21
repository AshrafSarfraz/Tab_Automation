import { getDB } from "./db";

const MONGO_API_URL = "https://financesystemawh-rtjt.onrender.com/api/trialbalance/mongo";


// 1️⃣ Create table (raw JSON store)
export const createWestwalkMongoTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS westwalk_mongo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        savedAt INTEGER
      );
    `);
    console.log("✅ westwalk_mongo table created");
  } catch (err) {
    console.log("❌ Table creation error:", err);
  }
};

// 2️⃣ Save API response (RAW) into sqlite
export const syncWestwalkMongoFromApi = async () => {
  try {
    await createWestwalkMongoTable();

    console.log("🌐 Fetching Mongo API...");
    const res = await fetch(MONGO_API_URL);
    const json = await res.json(); // save exact response

    const db = await getDB();

    // optional: keep only latest snapshot (clear old)
    await db.executeSql(`DELETE FROM westwalk_mongo;`);

    await db.executeSql(
      `INSERT INTO westwalk_mongo (payload, savedAt) VALUES (?, ?)`,
      [JSON.stringify(json), Date.now()]
    );

    console.log("✅ Saved Mongo payload to sqlite (westwalk_mongo)");
    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};

// 3️⃣ Get latest saved payload from sqlite
export const getWestwalkMongoFromSQLite = async () => {
  try {
    await createWestwalkMongoTable();

    const db = await getDB();
    const rows: any[] = [];

    await new Promise<void>((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM westwalk_mongo ORDER BY id DESC LIMIT 1;`,
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


export const clearWestwalkMongoTable = async () => {
  try {
    const db = await getDB();
    await db.executeSql(`DELETE FROM westwalk_mongo;`);
    console.log('✅ westwalk_mongo cleared');
  } catch (e) {
    console.log('❌ Clear error:', e);
  }
};
