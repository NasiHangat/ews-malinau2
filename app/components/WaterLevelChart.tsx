"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

type Reading = {
  sensor_id: string;
  value: number;
  unit: string;
  timestamp: string;
};

type Sensor = {
  id: string;
  name: string;
  threshold_siaga: number;
  threshold_waspada: number;
  threshold_awas: number;
};

type Props = {
  sensor: Sensor;
  strokeColor: string;
};

const CustomTooltip = ({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  let ts = "";
  try {
    ts = format(parseISO(label!), "dd MMM HH:mm", { locale: id });
  } catch {
    ts = label ?? "";
  }
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: 6,
        padding: "7px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 3 }}>{ts}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
        {val.toFixed(2)} {unit}
      </div>
    </div>
  );
};

export default function WaterLevelChart({ sensor, strokeColor }: Props) {
  const [readings24h, setReadings24h] = useState<Reading[]>([]);
  const [readings7d, setReadings7d] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    // Ambil data 24 jam dan 7 hari (168 jam) secara bersamaan
    Promise.all([
      fetch(`/api/readings?sensor_id=${sensor.id}&hours=24`).then((r) => r.json()),
      fetch(`/api/readings?sensor_id=${sensor.id}&hours=168`).then((r) => r.json()),
    ])
      .then(([data24, data7d]) => {
        if (active) {
          setReadings24h(data24.readings ?? []);
          setReadings7d(data7d.readings ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [sensor.id]);

  const tickFormatter = (ts: string) => {
    try {
      return format(parseISO(ts), "dd/MM HH:mm");
    } catch {
      return ts;
    }
  };

  // Helper untuk merender struktur grafik yang sama
  const renderChart = (data: Reading[], title: string, trendLabel: string, suffix: string) => {
    if (!data.length) {
      return (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
            {title}
          </div>
          <div className="empty-state">Tidak ada data untuk periode ini</div>
        </div>
      );
    }

    const yDomain = (() => {
      const vals = data.map((r) => r.value);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const pad = (maxVal - minVal) * 0.1 || 20;
      return [
        Math.max(0, minVal - pad),
        Math.max(maxVal + pad, sensor.threshold_awas * 1.1),
      ];
    })();

    const gradientId = `grad-${sensor.id}-${suffix}`;
    const unit = data[0]?.unit ?? "cm";

    /* ── Chart stats ── */
    const vals = data.map((r) => r.value);
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    const max = Math.max(...vals).toFixed(1);
    const diff = (vals[vals.length - 1] - vals[0]).toFixed(1);
    const trendUp = vals[vals.length - 1] >= vals[0];

    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          {title}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={tickFormatter}
              tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />

            <YAxis
              domain={yDomain}
              tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              width={42}
            />

            <Tooltip content={<CustomTooltip unit={unit} />} />

            <ReferenceLine
              y={sensor.threshold_siaga}
              stroke="var(--siaga-base)"
              strokeDasharray="4 4"
              strokeWidth={1}
              strokeOpacity={0.5}
              label={{
                value: "Siaga",
                position: "right",
                fill: "var(--siaga-base)",
                fontSize: 8,
                fontFamily: "var(--font-mono)",
              }}
            />
            <ReferenceLine
              y={sensor.threshold_waspada}
              stroke="var(--waspada-base)"
              strokeDasharray="4 4"
              strokeWidth={1}
              strokeOpacity={0.5}
              label={{
                value: "Waspada",
                position: "right",
                fill: "var(--waspada-base)",
                fontSize: 8,
                fontFamily: "var(--font-mono)",
              }}
            />
            <ReferenceLine
              y={sensor.threshold_awas}
              stroke="var(--awas-base)"
              strokeDasharray="4 4"
              strokeWidth={1}
              strokeOpacity={0.5}
              label={{
                value: "Awas",
                position: "right",
                fill: "var(--awas-base)",
                fontSize: 8,
                fontFamily: "var(--font-mono)",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: strokeColor,
                stroke: "var(--bg-card)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Stats row */}
        <div className="chart-stats-row">
          <div className="chart-stat">
            <span className="chart-stat-label">Rata-rata</span>
            <span className="chart-stat-value">{avg} cm</span>
          </div>
          <div className="chart-stat" style={{ textAlign: "center" }}>
            <span className="chart-stat-label">{trendLabel}</span>
            <span className={`chart-stat-value ${trendUp ? "trend-up" : "trend-down"}`}>
              {trendUp ? "+" : ""}{diff} cm
            </span>
          </div>
          <div className="chart-stat" style={{ textAlign: "right" }}>
            <span className="chart-stat-label">Maks</span>
            <span className="chart-stat-value">{max} cm</span>
          </div>
        </div>
      </div>
    );
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="empty-state">Gagal memuat data grafik</div>
    );
  }

  /* ── Empty ── */
  if (!readings24h.length && !readings7d.length) {
    return (
      <div className="empty-state">
        Tidak ada data yang tersedia
      </div>
    );
  }

  return (
    <div>
      {/* Panggil renderChart untuk 24 Jam lalu 7 Hari */}
      {renderChart(readings24h, "24 Jam Terakhir", "Tren 24j", "24h")}
      {renderChart(readings7d, "7 Hari Terakhir", "Tren 7d", "7d")}
    </div>
  );
}