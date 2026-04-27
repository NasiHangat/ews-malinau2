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
        borderRadius: 8,
        padding: "8px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{ts}</div>
      <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
        {val.toFixed(2)} {unit}
      </div>
    </div>
  );
};

export default function WaterLevelChart({ sensor, strokeColor }: Props) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    fetch(`/api/readings?sensor_id=${sensor.id}&hours=168`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setReadings(data.readings ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [sensor.id]);

  const tickFormatter = (ts: string) => {
    try { return format(parseISO(ts), "dd/MM HH:mm"); } catch { return ts; }
  };

  const yDomain = (() => {
    if (!readings.length) return [0, sensor.threshold_awas * 1.2];
    const vals = readings.map((r) => r.value);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const pad = (maxVal - minVal) * 0.1 || 20;
    return [Math.max(0, minVal - pad), Math.max(maxVal + pad, sensor.threshold_awas * 1.1)];
  })();

  if (loading) {
    return (
      <div
        className="skeleton"
        style={{ height: 200, borderRadius: 8 }}
      />
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        Gagal memuat data grafik
      </div>
    );
  }

  if (!readings.length) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        Tidak ada data dalam 24 jam terakhir
      </div>
    );
  }

  const gradientId = `grad-${sensor.id}`;
  const unit = readings[0]?.unit ?? "cm";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={readings}
        margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />

        <XAxis
          dataKey="timestamp"
          tickFormatter={tickFormatter}
          tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />

        <YAxis
          domain={yDomain}
          tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(0)}`}
          width={45}
        />

        <Tooltip content={<CustomTooltip unit={unit} />} />

        {/* Threshold lines */}
        <ReferenceLine
          y={sensor.threshold_siaga}
          stroke="var(--siaga-base)"
          strokeDasharray="4 4"
          strokeWidth={1}
          strokeOpacity={0.6}
          label={{ value: "Siaga", position: "right", fill: "var(--siaga-base)", fontSize: 9, fontFamily: "var(--font-mono)" }}
        />
        <ReferenceLine
          y={sensor.threshold_waspada}
          stroke="var(--waspada-base)"
          strokeDasharray="4 4"
          strokeWidth={1}
          strokeOpacity={0.6}
          label={{ value: "Waspada", position: "right", fill: "var(--waspada-base)", fontSize: 9, fontFamily: "var(--font-mono)" }}
        />
        <ReferenceLine
          y={sensor.threshold_awas}
          stroke="var(--awas-base)"
          strokeDasharray="4 4"
          strokeWidth={1}
          strokeOpacity={0.6}
          label={{ value: "Awas", position: "right", fill: "var(--awas-base)", fontSize: 9, fontFamily: "var(--font-mono)" }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: strokeColor, stroke: "var(--bg-card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}