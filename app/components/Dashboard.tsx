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
  "WL-001": "#2d9cff",
  "WL-002": "#a78bfa",
  "WL-003": "#34d399",
};

const REFRESH_INTERVAL = 60_000; // 60s

export default function Dashboard() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">🌊</div>
          <div>
            <div className="header-title">EWS Banjir Kabupaten Malinau</div>
            <div className="header-sub">
              Early Warning System · Kalimantan Utara
            </div>
          </div>
        </div>
        <div className="header-meta">
          {!loading && !error && (
            <div className="live-badge">
              <div className="live-dot" />
              LIVE
            </div>
          )}
          <div className="header-time">{now ? formatTime(now) : ""}</div>
        </div>
      </header>

      {/* Alert banners */}
      {alertSensors
        .filter((s) => s.status === "AWAS")
        .map((s) => (
          <div className="alert-banner alert-banner-awas" key={s.id}>
            <span className="alert-icon">🚨</span>
            <span>
              <strong>AWAS BANJIR:</strong> {s.name} ({s.id}) mencapai{" "}
              {s.latest_value?.toFixed(1)} cm — melebihi batas AWAS {s.threshold_awas} cm
            </span>
          </div>
        ))}
      {alertSensors
        .filter((s) => s.status === "WASPADA")
        .map((s) => (
          <div className="alert-banner alert-banner-waspada" key={s.id}>
            <span className="alert-icon">⚠️</span>
            <span>
              <strong>WASPADA:</strong> {s.name} ({s.id}) mencapai{" "}
              {s.latest_value?.toFixed(1)} cm — mendekati batas AWAS {s.threshold_awas} cm
            </span>
          </div>
        ))}

      {/* Summary chips */}
      {!loading && (
        <div className="summary-row">
          <div className="summary-chip chip-aman">
            <div className="summary-chip-label">Sensor Aman</div>
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
            <div className="summary-chip-label">AWAS</div>
            <div className="summary-chip-value">{statusCounts["AWAS"] ?? 0}</div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--awas-base)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {error}
        </div>
      )}

      {/* Sensor cards */}
      {!error && (
        <>
          <div className="section-label">Status Sensor Saat Ini</div>
          <div className="sensor-grid">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: 240, borderRadius: 14 }}
                  />
                ))
              : sensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
          </div>

          {/* Charts */}
          <div className="section-label" style={{ marginTop: 8 }}>
            Grafik Water Level — 7 Hari Terakhir
          </div>
          <div className="charts-grid">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="chart-card"
                  >
                    <div
                      className="skeleton"
                      style={{ height: 240, borderRadius: 8 }}
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
                      strokeColor={CHART_COLORS[s.id] ?? "#2d9cff"}
                    />
                  </div>
                ))}
          </div>

          {/* Footer */}
          {lastRefresh && (
            <div
              style={{
                textAlign: "center",
                marginTop: 40,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
              }}
            >
              Data diperbarui setiap 60 detik · Terakhir refresh: {formatTime(lastRefresh)}
            </div>
          )}
        </>
      )}
    </div>
  );
}