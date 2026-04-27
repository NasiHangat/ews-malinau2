import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sensorId = searchParams.get("sensor_id");
  const hours = Math.min(parseInt(searchParams.get("hours") ?? "168"), 720); // default 7 hari, max 30 hari

  if (!sensorId) {
    return NextResponse.json({ error: "sensor_id required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
          sensor_id,
          ROUND(AVG(value), 2) AS value,
          unit,
          strftime('%Y-%m-%dT', timestamp) ||
            printf('%02d', CAST(strftime('%H', timestamp) AS INTEGER)) || ':' ||
            printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 5) * 5) || ':00.000Z'
          AS timestamp
        FROM readings
        WHERE
          sensor_id = ?
          AND timestamp >= datetime('now', '-' || ? || ' hours')
        GROUP BY
          sensor_id, unit,
          strftime('%Y-%m-%dT%H', timestamp),
          CAST(strftime('%M', timestamp) AS INTEGER) / 5
        ORDER BY timestamp ASC`
      )
      .all(sensorId, hours) as { sensor_id: string; value: number; unit: string; timestamp: string }[];

    return NextResponse.json({
      readings: rows.map((r) => ({
        sensor_id: r.sensor_id,
        value: Number(r.value),
        unit: r.unit,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    console.error("/api/readings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}