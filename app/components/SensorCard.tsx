"use client";

import { StatusLevel } from "@/app/lib/db";

type Sensor = {
  id: string;
  name: string;
  location: string;
  threshold_siaga: number;
  threshold_waspada: number;
  threshold_awas: number;
  latest_value: number | null;
  latest_unit: string;
  latest_timestamp: string | null;
  status: StatusLevel | null;
};

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar",
  }) + " WITA";
}

function getBarPercent(value: number | null, maxThreshold: number): number {
  if (value == null) return 0;
  // Map 0..awas*1.1 to 0..100
  const max = maxThreshold * 1.1;
  return Math.min(100, (value / max) * 100);
}

function statusClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN": return "status-aman";
    case "SIAGA": return "status-siaga";
    case "WASPADA": return "status-waspada";
    case "AWAS": return "status-awas";
    default: return "";
  }
}

function badgeClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN": return "badge-aman";
    case "SIAGA": return "badge-siaga";
    case "WASPADA": return "badge-waspada";
    case "AWAS": return "badge-awas";
    default: return "";
  }
}

function fillClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN": return "fill-aman";
    case "SIAGA": return "fill-siaga";
    case "WASPADA": return "fill-waspada";
    case "AWAS": return "fill-awas";
    default: return "fill-aman";
  }
}

export default function SensorCard({ sensor }: { sensor: Sensor }) {
  const { threshold_siaga: siaga, threshold_waspada: waspada, threshold_awas: awas } = sensor;
  const barPct = getBarPercent(sensor.latest_value, awas);
  const sc = statusClass(sensor.status);
  const bc = badgeClass(sensor.status);
  const fc = fillClass(sensor.status);

  return (
    <div className={`sensor-card ${sc}`}>
      <div className="sensor-card-top">
        <div>
          <div className="sensor-id">{sensor.id}</div>
          <div className="sensor-name">{sensor.name}</div>
          <div className="sensor-location">
            <span>📍</span> {sensor.location}
          </div>
        </div>
        <div className={`status-badge ${bc}`}>
          {sensor.status ?? "—"}
        </div>
      </div>

      <div className="sensor-reading">
        <span className="reading-value">
          {sensor.latest_value != null
            ? sensor.latest_value.toFixed(1)
            : "—"}
        </span>
        <span className="reading-unit">{sensor.latest_unit}</span>
      </div>

      <div className="threshold-bar">
        <div className="threshold-bar-track">
          <div
            className={`threshold-bar-fill ${fc}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <div className="threshold-markers">
          <span>0</span>
          <span style={{ color: "var(--siaga-base)" }}>S {siaga}</span>
          <span style={{ color: "var(--waspada-base)" }}>W {waspada}</span>
          <span style={{ color: "var(--awas-base)" }}>A {awas}</span>
        </div>
      </div>

      <div className="sensor-ts">
        Terakhir: {formatTimestamp(sensor.latest_timestamp)}
      </div>
    </div>
  );
}
