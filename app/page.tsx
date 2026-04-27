import { PrismaClient } from '@prisma/client'
import { THRESHOLDS, getStatus } from '@/lib/thresholds'
// Import komponen Client (grafik) buatanmu, misal: <Chart data={...} />

const prisma = new PrismaClient()

export default async function Dashboard() {
  const sensorIds = Object.keys(THRESHOLDS);
  
  // Ambil data terbaru & 24 jam terakhir (1440 menit) per sensor
  // Tips: Gunakan Promise.all agar query berjalan paralel
  const sensorsData = await Promise.all(sensorIds.map(async (sensor_id) => {
    const readings = await prisma.reading.findMany({
      where: { sensor_id },
      orderBy: { timestamp: 'desc' },
      take: 1440, // 24 jam * 60 menit
    });

    const latest = readings[0];
    const status = getStatus(sensor_id, latest.value);
    
    // Reverse array agar grafik bergerak dari kiri (lama) ke kanan (baru)
    const chartData = readings.reverse(); 

    return { sensor_id, latest, status, chartData };
  }));

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard EWS Banjir Malinau</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sensorsData.map((sensor) => {
          // Visual highlight
          const isWarning = sensor.status === 'WASPADA' || sensor.status === 'AWAS';
          const bgCard = isWarning ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200';
          
          return (
            <div key={sensor.sensor_id} className={`p-4 border rounded-xl shadow-sm ${bgCard}`}>
              <h2 className="text-xl font-semibold">{THRESHOLDS[sensor.sensor_id as keyof typeof THRESHOLDS].name}</h2>
              <p className="text-sm text-gray-500">ID: {sensor.sensor_id}</p>
              
              <div className="my-4">
                <span className={`text-2xl font-bold ${isWarning ? 'text-red-600' : 'text-green-600'}`}>
                  {sensor.status}
                </span>
                <p>Level Terkini: {sensor.latest.value} cm</p>
              </div>

              {/* Render grafik Recharts di sini */}
              {/* <SensorChart data={sensor.chartData} /> */}
            </div>
          )
        })}
      </div>
    </main>
  )
}