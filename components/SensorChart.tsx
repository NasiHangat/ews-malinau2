'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function SensorChart({ data, sensorId }: { data: any[], sensorId: string }) {
  const t = {
    'WL-001': { siaga: 200, waspada: 250, awas: 300 },
    'WL-002': { siaga: 180, waspada: 230, awas: 280 },
    'WL-003': { siaga: 170, waspada: 220, awas: 270 },
  }[sensorId as 'WL-001' | 'WL-002' | 'WL-003'] || { siaga: 0, waspada: 0, awas: 0 };

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).getHours() + ":00"} fontSize={10} />
          <YAxis domain={['auto', 'auto']} fontSize={10} />
          <Tooltip labelFormatter={(t) => new Date(t).toLocaleString()} />
          <ReferenceLine y={t.awas} stroke="red" strokeDasharray="3 3" label={{ position: 'right', value: 'AWAS', fill: 'red', fontSize: 10 }} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}