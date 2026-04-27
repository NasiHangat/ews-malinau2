import { NextResponse } from "next/server";
import { getDb, classifyStatus, SensorRow } from "@/app/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();
    const sensors = db
      .prepare(
        `SELECT
          s.id, s.name, s.location,
          s.threshold_siaga, s.threshold_waspada, s.threshold_awas,
          r.value, r.unit, r.timestamp
        FROM sensors s
        LEFT JOIN (
          SELECT sensor_id, value, unit, timestamp
          FROM readings
          WHERE (sensor_id, timestamp) IN (
            SELECT sensor_id, MAX(timestamp) FROM readings GROUP BY sensor_id
          )
        ) r ON r.sensor_id = s.id
        ORDER BY s.id`
      )
      .all() as (SensorRow & { value: number | null; unit: string | null; timestamp: string | null })[];

    const result = sensors.map((row) => {
      const latestValue = row.value != null ? Number(row.value) : null;
      const status = latestValue != null ? classifyStatus(latestValue, row) : null;
      return {
        id: row.id,
        name: row.name,
        location: row.location,
        threshold_siaga: row.threshold_siaga,
        threshold_waspada: row.threshold_waspada,
        threshold_awas: row.threshold_awas,
        latest_value: latestValue,
        latest_unit: row.unit ?? "cm",
        latest_timestamp: row.timestamp ?? null,
        status,
      };
    });

    return NextResponse.json({ sensors: result });
  } catch (err) {
    console.error("/api/sensors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
