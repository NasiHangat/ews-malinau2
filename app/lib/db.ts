import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "ews.db");

export type SensorRow = {
  id: string;
  name: string;
  location: string;
  threshold_siaga: number;
  threshold_waspada: number;
  threshold_awas: number;
};

export type ReadingRow = {
  sensor_id: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type StatusLevel = "AMAN" | "SIAGA" | "WASPADA" | "AWAS";

export function classifyStatus(value: number, sensor: SensorRow): StatusLevel {
  if (value >= sensor.threshold_awas) return "AWAS";
  if (value >= sensor.threshold_waspada) return "WASPADA";
  if (value >= sensor.threshold_siaga) return "SIAGA";
  return "AMAN";
}

// Lazy singleton — only opened when first called at runtime, never at build time
let _db: import("better-sqlite3").Database | null = null;

export function getDb(): import("better-sqlite3").Database {
  if (_db) return _db;

  // Dynamic require so the module-level code never runs during `next build`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const fs = require("fs");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sensors (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      location          TEXT NOT NULL,
      threshold_siaga   INTEGER NOT NULL,
      threshold_waspada INTEGER NOT NULL,
      threshold_awas    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS readings (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL REFERENCES sensors(id),
      value     REAL NOT NULL,
      unit      TEXT NOT NULL DEFAULT 'cm',
      timestamp TEXT NOT NULL,
      UNIQUE(sensor_id, timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
      ON readings (sensor_id, timestamp DESC);

    INSERT OR IGNORE INTO sensors (id, name, location, threshold_siaga, threshold_waspada, threshold_awas)
    VALUES
      ('WL-001', 'Sungai Malinau',  'Malinau Kota', 200, 250, 300),
      ('WL-002', 'Sungai Sesayap', 'Mentarang',     180, 230, 280),
      ('WL-003', 'Sungai Bahau',   'Bahau Hulu',    170, 220, 270);
  `);

  _db = db;
  return db;
}
