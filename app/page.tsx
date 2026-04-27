import { PrismaClient } from '@prisma/client';
import SensorChart from '@/components/SensorChart';

const prisma = new PrismaClient();
const thresholds = {
  'WL-001': { siaga: 200, waspada: 250, awas: 300, loc: 'Malinau Kota' },
  'WL-002': { siaga: 180, waspada: 230, awas: 280, loc: 'Mentarang' },
  'WL-003': { siaga: 170, waspada: 220, awas: 270, loc: 'Bahau Hulu' },
};

export default async function Home() {
  const sensors = ['WL-001', 'WL-002', 'WL-003'];
  const results = [];

  for (const id of sensors) {
    const latest = await prisma.reading.findFirst({ where: { sensor_id: id }, orderBy: { timestamp: 'desc' } });
    const history = await prisma.reading.findMany({ where: { sensor_id: id }, orderBy: { timestamp: 'desc' }, take: 1440 });
    const chartData = history.filter((_, i) => i % 60 === 0).reverse();
    
    const val = latest?.value || 0;
    const t = thresholds[id as keyof typeof thresholds];
    let status = { text: 'AMAN', color: 'bg-green-500' };
    if (val >= t.awas) status = { text: 'AWAS', color: 'bg-red-600 animate-pulse text-white' };
    else if (val >= t.waspada) status = { text: 'WASPADA', color: 'bg-orange-500 animate-pulse text-white' };
    else if (val >= t.siaga) status = { text: 'SIAGA', color: 'bg-yellow-400' };

    results.push({ id, loc: t.loc, val, status, chartData });
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">EWS Banjir Kabupaten Malinau</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {results.map(r => (
          <div key={r.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between mb-4">
              <div><h2 className="font-bold text-xl">{r.id}</h2><p className="text-gray-500 text-sm">{r.loc}</p></div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${r.status.color}`}>{r.status.text}</div>
            </div>
            <div className="text-4xl font-black mb-4">{r.val.toFixed(2)} <span className="text-sm font-normal text-gray-500">cm</span></div>
            <SensorChart data={r.chartData} sensorId={r.id} />
          </div>
        ))}
      </div>
    </main>
  );
}