export const THRESHOLDS = {
  "WL-001": { name: "Sungai Malinau (Malinau Kota)", siaga: 200, waspada: 250, awas: 300 },
  "WL-002": { name: "Sungai Sesayap (Mentarang)", siaga: 180, waspada: 230, awas: 280 },
  "WL-003": { name: "Sungai Bahau (Bahau Hulu)", siaga: 170, waspada: 220, awas: 270 },
};

export function getStatus(sensorId: string, value: number) {
  const t = THRESHOLDS[sensorId as keyof typeof THRESHOLDS];
  if (!t) return "UNKNOWN";

  if (value >= t.awas) return "AWAS";
  if (value >= t.waspada) return "WASPADA";
  if (value >= t.siaga) return "SIAGA";
  return "AMAN";
}