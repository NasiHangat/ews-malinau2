const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.reading.count();
  if (count > 0) {
    console.log('Data sudah ada, skip ingestion.');
    return;
  }

  const data = JSON.parse(fs.readFileSync('./readings.json', 'utf8'));
  console.log('Mulai memasukkan 8640 data...');
  
  await prisma.reading.createMany({
    data: data.map(r => ({
      sensor_id: r.sensor_id,
      value: r.value,
      unit: r.unit,
      timestamp: new Date(r.timestamp),
    })),
  });
  console.log('Ingestion selesai!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());