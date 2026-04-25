import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db = null;

export async function openDb() {
  if (!db) {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userAddress TEXT NOT NULL,
        cid TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}
