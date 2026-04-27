"use client";

import { useEffect, useState, useCallback } from "react";
import SensorCard from "./SensorCard";
import WaterLevelChart from "./WaterLevelChart";
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

const CHART_COLORS: Record<string, string> = {
  "WL-001": "#1e88e5",
  "WL-002": "#9c6fe4",
  "WL-003": "#f02b4f",
};

const REFRESH_INTERVAL = 60_000;

/* ── Icon: Warning ── */
const WarningIcon = () => (
  <svg
    className="alert-icon"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

/* ── Icon: Droplet / Logo ── */
const LogoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="var(--accent)"
    aria-hidden="true"
  >
    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
  </svg>
);

export default function Dashboard() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  /* ── Clock ── */
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Fetch sensors ── */
  const fetchSensors = useCallback(async () => {
    try {
      const res = await fetch("/api/sensors");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSensors(data.sensors ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError("Gagal memuat data sensor. Periksa koneksi ke server.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSensors();
    const timer = setInterval(fetchSensors, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchSensors]);

  /* ── Derived state ── */
  const statusCounts = sensors.reduce(
    (acc, s) => {
      if (s.status) acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StatusLevel, number>
  );

  const alertSensors = sensors.filter(
    (s) => s.status === "WASPADA" || s.status === "AWAS"
  );

  /* ── Formatters ── */
  const formatTime = (d: Date) =>
    d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Makassar",
    }) + " WITA";

  const formatClock = (d: Date) =>
    d.toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Makassar",
    }) + " WITA";

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <LogoIcon />
          </div>
          <div>
            <div className="header-title">EWS Banjir · Kabupaten Malinau</div>
            <div className="header-sub">EARLY WARNING SYSTEM — KALIMANTAN UTARA</div>
          </div>
        </div>
        <div className="header-meta">
          {!loading && !error && (
            <div className="live-badge">
              <div className="live-dot" />
              LIVE
            </div>
          )}
          <div className="header-time">{now ? formatClock(now) : ""}</div>
        </div>
      </header>

      {/* ── Alert Banners ── */}
      {alertSensors
        .filter((s) => s.status === "AWAS")
        .map((s) => (
          <div className="alert-banner alert-banner-awas" key={s.id}>
            <WarningIcon />
            <span>
              <strong>AWAS BANJIR</strong> — {s.name} ({s.id}) mencapai{" "}
              {s.latest_value?.toFixed(1)} cm, melebihi batas AWAS{" "}
              {s.threshold_awas} cm
            </span>
          </div>
        ))}
      {alertSensors
        .filter((s) => s.status === "WASPADA")
        .map((s) => (
          <div className="alert-banner alert-banner-waspada" key={s.id}>
            <WarningIcon />
            <span>
              <strong>WASPADA</strong> — {s.name} ({s.id}) mencapai{" "}
              {s.latest_value?.toFixed(1)} cm, mendekati batas AWAS{" "}
              {s.threshold_awas} cm
            </span>
          </div>
        ))}

      {/* ── Summary Chips ── */}
      {!loading && (
        <div className="summary-row">
          <div className="summary-chip chip-aman">
            <div className="summary-chip-label">Aman</div>
            <div className="summary-chip-value">{statusCounts["AMAN"] ?? 0}</div>
          </div>
          <div className="summary-chip chip-siaga">
            <div className="summary-chip-label">Siaga</div>
            <div className="summary-chip-value">{statusCounts["SIAGA"] ?? 0}</div>
          </div>
          <div className="summary-chip chip-waspada">
            <div className="summary-chip-label">Waspada</div>
            <div className="summary-chip-value">{statusCounts["WASPADA"] ?? 0}</div>
          </div>
          <div className="summary-chip chip-awas">
            <div className="summary-chip-label">Awas</div>
            <div className="summary-chip-value">{statusCounts["AWAS"] ?? 0}</div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="error-state">{error}</div>}

      {/* ── Sensor Cards + Charts ── */}
      {!error && (
        <>
          <div className="section-label">Status Sensor Aktif</div>
          <div className="sensor-grid">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: 240, borderRadius: 12 }}
                  />
                ))
              : sensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
          </div>

          <div className="section-label" style={{ marginTop: 8 }}>
            Grafik Water Level — 7 Hari Terakhir
          </div>
          <div className="charts-grid">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="chart-card">
                    <div
                      className="skeleton"
                      style={{ height: 220, borderRadius: 8 }}
                    />
                  </div>
                ))
              : sensors.map((s) => (
                  <div key={s.id} className="chart-card">
                    <div className="chart-card-header">
                      <div>
                        <div className="chart-sensor-name">{s.name}</div>
                        <div className="chart-sensor-id">{s.id}</div>
                      </div>
                      <div className="chart-timerange">7d</div>
                    </div>
                    <WaterLevelChart
                      sensor={s}
                      strokeColor={CHART_COLORS[s.id] ?? "#1e88e5"}
                    />
                  </div>
                ))}
          </div>

          {/* ── Footer ── */}
          {lastRefresh && (
            <div className="dashboard-footer">
              Data diperbarui setiap 60 detik &nbsp;·&nbsp; Terakhir refresh:{" "}
              {formatTime(lastRefresh)}
            </div>
          )}
        </>
      )}
    </div>
  );
}