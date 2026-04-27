#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "ews.db");
const JSON_PATH = path.join(DATA_DIR, "readings.json");
const BATCH_SIZE = 500;

async function main() {
  console.log("🌊 EWS Banjir — Ingest Service Starting...");

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ File not found: ${JSON_PATH}`);
    process.exit(1);
  }

  const Database = require("better-sqlite3");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // Create schema + seed sensors
  db.exec(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      threshold_siaga INTEGER NOT NULL,
      threshold_waspada INTEGER NOT NULL,
      threshold_awas INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL REFERENCES sensors(id),
      value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'cm',
      timestamp TEXT NOT NULL,
      UNIQUE(sensor_id, timestamp)
    );
    CREATE INDEX IF NOT EXISTS idx_readings_sensor_time
      ON readings (sensor_id, timestamp DESC);
    INSERT OR IGNORE INTO sensors (id, name, location, threshold_siaga, threshold_waspada, threshold_awas) VALUES
      ('WL-001', 'Sungai Malinau',  'Malinau Kota', 200, 250, 300),
      ('WL-002', 'Sungai Sesayap', 'Mentarang',     180, 230, 280),
      ('WL-003', 'Sungai Bahau',   'Bahau Hulu',    170, 220, 270);
  `);
  console.log("✅ Schema ready");

  // Check if already ingested
  const existing = db.prepare("SELECT COUNT(*) as cnt FROM readings").get();
  if (existing.cnt > 0) {
    console.log(`ℹ️  Database already has ${existing.cnt} readings — skipping ingest.`);
    db.close();
    return;
  }

  console.log(`📂 Reading ${JSON_PATH}...`);
  const readings = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📊 Loaded ${readings.length} readings`);

  const insert = db.prepare(
    "INSERT OR IGNORE INTO readings (sensor_id, value, unit, timestamp) VALUES (?, ?, ?, ?)"
  );
  const insertMany = db.transaction((batch) => {
    for (const r of batch) insert.run(r.sensor_id, r.value, r.unit, r.timestamp);
  });

  let inserted = 0;
  for (let i = 0; i < readings.length; i += BATCH_SIZE) {
    const batch = readings.slice(i, i + BATCH_SIZE);
    insertMany(batch);
    inserted += batch.length;
    process.stdout.write(`\r⏳ Ingesting... ${inserted}/${readings.length} (${((inserted/readings.length)*100).toFixed(1)}%)`);
  }

  const count = db.prepare("SELECT COUNT(*) as cnt FROM readings").get();
  console.log(`\n✅ Ingest complete! Total readings in DB: ${count.cnt}`);
  db.close();
}

main().catch((err) => {
  console.error("❌ Ingest failed:", err);
  process.exit(1);
});
