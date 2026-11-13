import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;

  if (connectionString && connectionString.startsWith('postgres')) {
    // Neon Serverless PostgreSQL connection
    const sql = neon(connectionString);
    dbInstance = drizzle(sql, { schema });
    return dbInstance;
  }

  // Local fallback: Better-SQLite3 wrapper
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const sqlitePath = path.join(process.cwd(), 'uniadmit.db');
    const sqlite = new Database(sqlitePath);
    sqlite.pragma('journal_mode = WAL');

    return {
      rawSqlite: sqlite,
      isNeon: false,
    };
  } catch (e) {
    console.warn('SQLite fallback unavailable in serverless environment.');
    return null;
  }
}

export const db = getDb();
export * from './schema';
