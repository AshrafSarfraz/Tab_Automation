// /src/database/db.ts
import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let database: SQLiteDatabase | null = null;

export const getDB = async (): Promise<SQLiteDatabase> => {
  if (database) return database;

  try {
    database = await SQLite.openDatabase({ name: 'FinanceDB.db', location: 'default' });
    console.log('✅ DB opened');
    return database;
  } catch (err) {
    console.log('❌ DB open error:', err);
    throw err;
  }
};
