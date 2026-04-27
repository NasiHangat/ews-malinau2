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
  return (
    new Date(ts).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Makassar",
    }) + " WITA"
  );
}

function getBarPercent(value: number | null, maxThreshold: number): number {
  if (value == null) return 0;
  const max = maxThreshold * 1.1;
  return Math.min(100, (value / max) * 100);
}

function statusClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN":    return "status-aman";
    case "SIAGA":   return "status-siaga";
    case "WASPADA": return "status-waspada";
    case "AWAS":    return "status-awas";
    default:        return "";
  }
}

function badgeClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN":    return "badge-aman";
    case "SIAGA":   return "badge-siaga";
    case "WASPADA": return "badge-waspada";
    case "AWAS":    return "badge-awas";
    default:        return "";
  }
}

function fillClass(status: StatusLevel | null): string {
  switch (status) {
    case "AMAN":    return "fill-aman";
    case "SIAGA":   return "fill-siaga";
    case "WASPADA": return "fill-waspada";
    case "AWAS":    return "fill-awas";
    default:        return "fill-aman";
  }
}

const PinIcon = () => (
  <svg
    width="9"
    height="9"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: "var(--text-muted)", flexShrink: 0 }}
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

export default function SensorCard({ sensor }: { sensor: Sensor }) {
  const {
    threshold_siaga: siaga,
    threshold_waspada: waspada,
    threshold_awas: awas,
  } = sensor;

  const barPct = getBarPercent(sensor.latest_value, awas);
  const sc = statusClass(sensor.status);
  const bc = badgeClass(sensor.status);
  const fc = fillClass(sensor.status);
  const max = awas * 1.1;

  const markers = [
    { val: siaga,   label: `S ${siaga}`,   color: "var(--siaga-base)" },
    { val: waspada, label: `W ${waspada}`, color: "var(--waspada-base)" },
    { val: awas,    label: `A ${awas}`,    color: "var(--awas-base)" },
  ];

  return (
    <div className={`sensor-card ${sc}`}>
      {/* Top row */}
      <div className="sensor-card-top">
        <div>
          <div className="sensor-id">{sensor.id}</div>
          <div className="sensor-name">{sensor.name}</div>
          <div className="sensor-location">
            <PinIcon />
            {sensor.location}
          </div>
        </div>
        <div className={`status-badge ${bc}`}>{sensor.status ?? "—"}</div>
      </div>

      {/* Reading */}
      <div className="sensor-reading">
        <span className="reading-value">
          {sensor.latest_value != null
            ? sensor.latest_value.toFixed(1)
            : "—"}
        </span>
        <span className="reading-unit">{sensor.latest_unit}</span>
      </div>

      {/* Bar */}
      <div className="threshold-bar">
        <div className="threshold-bar-track">
          <div
            className={`threshold-bar-fill ${fc}`}
            style={{ width: `${barPct}%` }}
          />
          {markers.map(({ val, color }) => (
            <div
              key={val}
              style={{
                position: "absolute",
                left: `${(val / max) * 100}%`,
                top: 0,
                bottom: 0,
                width: "1px",
                background: color,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
        <div className="threshold-markers">
          {markers.map(({ val, label, color }) => (
            <span
              key={val}
              style={{
                position: "absolute",
                left: `${(val / max) * 100}%`,
                transform: "translateX(-50%)",
                color,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div className="sensor-ts">
        Terakhir diperbarui: {formatTimestamp(sensor.latest_timestamp)}
      </div>
    </div>
  );
}