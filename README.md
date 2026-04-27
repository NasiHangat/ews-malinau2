# 🌊 EWS Banjir — Kabupaten Malinau

Early Warning System pemantauan water level sungai untuk Kabupaten Malinau, Kalimantan Utara.

| ID Sensor | Sungai | Lokasi |
|-----------|--------|--------|
| WL-001 | Sungai Malinau | Malinau Kota |
| WL-002 | Sungai Sesayap | Mentarang |
| WL-003 | Sungai Bahau | Bahau Hulu |

---

## Cara Menjalankan

### Opsi A: Docker (direkomendasikan)

**Prasyarat:** Docker Engine ≥ 24 (tidak perlu Docker Compose plugin, tidak perlu PostgreSQL)

```bash
# 1. Clone repo
git clone <url-repo>
cd ews-banjir

# 2. Pastikan readings.json ada di folder data/
ls data/readings.json

# 3. Jalankan — satu perintah, langsung jalan
docker compose up --build

# Buka http://localhost:3000
```

Saat container pertama kali naik, ingest otomatis berjalan dan mengimpor `readings.json` ke SQLite. Restart berikutnya ingest dilewati (data sudah ada).

Untuk reset database:
```bash
docker compose down -v   # hapus volume SQLite
docker compose up        # ingest ulang dari awal
```

---

### Opsi B: Lokal tanpa Docker

**Prasyarat:** Node.js ≥ 20, npm

```bash
# Install dependencies
npm install

# Ingest data (jalankan sekali)
node scripts/ingest.js

# Development server
npm run dev
# → http://localhost:3000

# Atau production build
npm run build && npm start
```

---

## Arsitektur

```
Docker Container (single)
└── node:20-alpine
    ├── [startup] node scripts/ingest.js
    │   └── baca data/readings.json → tulis data/ews.db (SQLite)
    └── [server]  node server.js (Next.js standalone)
        ├── GET /api/sensors   → status terkini tiap sensor
        ├── GET /api/readings  → data 24 jam (downsampled 5 menit)
        └── /                  → Dashboard UI (Recharts, auto-refresh 60s)

Volume: ews_data → /app/data/ews.db  (persisten antar restart)
```

**Kenapa SQLite?**
- Zero external dependency — tidak perlu PostgreSQL server terpisah
- Data 8.640 rows dengan index = query < 5ms
- WAL mode memungkinkan read concurrent saat Next.js melayani banyak request
- File `.db` bisa di-copy/backup dengan mudah

---

## Pertanyaan Analisa

### 1. Dari Batch ke Realtime

Di produksi, sensor mengirim data tiap 1 menit via API. Komponen yang perlu ditambahkan:

**a) Ingest Endpoint**
Tambahkan route baru `POST /api/ingest` yang menerima payload dari sensor/gateway IoT:
```json
{ "sensor_id": "WL-001", "value": 201.3, "unit": "cm", "timestamp": "..." }
```
Endpoint ini memvalidasi, menyimpan ke SQLite (atau upgrade ke PostgreSQL untuk deployment multi-instance), lalu memicu notifikasi jika status berubah.

**b) Push ke UI (SSE / WebSocket)**
Gantikan polling 60 detik dengan **Server-Sent Events**:
- Setiap `POST /api/ingest` sukses → server push event ke semua client dashboard
- Di Next.js: `ReadableStream` di route handler + `EventSource` di client
- Alternatif ringan: tetap polling tapi interval 10 detik (cukup untuk use case ini)

**c) Catatan untuk scale-out**
SQLite tidak cocok untuk deployment multi-replica (write lock). Jika perlu lebih dari 1 instance web, migrasi ke PostgreSQL/TimescaleDB. Skema dan query logic tidak perlu berubah — hanya connection layer di `db.ts`.

**Alur data realtime:**
```
Sensor → POST /api/ingest → SQLite → SSE push → Dashboard
```

---

### 2. Flow Notifikasi

**Kapan notifikasi dikirim?**

Notifikasi dikirim **saat status berubah level**, bukan setiap reading baru:
1. Reading baru masuk → hitung status baru
2. Bandingkan dengan status sebelumnya (dari tabel `sensor_status_log`)
3. Jika naik level (AMAN→SIAGA, SIAGA→WASPADA, dst.) → kirim notifikasi
4. Jika turun atau sama → tidak ada notifikasi baru

**Mencegah flapping (199 → 201 → 199 → 201)**

Dua mekanisme dikombinasikan:

**Hysteresis buffer:** threshold naik dan turun dibedakan:
```
Naik ke SIAGA   : value ≥ 202 cm  (threshold + 2 cm)
Turun dari SIAGA: value < 197 cm  (threshold - 3 cm)
```

**Cooldown timer:** setelah notifikasi terkirim untuk suatu sensor + level,
tidak ada notifikasi baru untuk kombinasi yang sama dalam **15 menit**.
Disimpan di tabel `notification_log (sensor_id, status, notified_at)`.

Nilai moving average dari 3 reading terakhir dipakai sebagai acuan (bukan raw value) untuk mengurangi noise sensor.

**Komponen yang bertanggung jawab:**

`NotificationWorker` — service terpisah (bisa Node.js process atau cron job tiap menit):
- Dipanggil setelah setiap ingest sukses
- Membaca `last_status` dari DB, menghitung status baru
- Mengecek cooldown sebelum kirim
- Memanggil WhatsApp API (Twilio, Wablas, Fonnte, dll.)
- Mencatat ke `notification_log` untuk audit trail

Dipisah dari web server agar pengiriman notifikasi tidak memblokir response API dan bisa di-retry independen jika gagal.

---

### 3. Sensor Mati

**Deteksi sensor mati**

Sensor dianggap offline jika tidak ada reading dalam **5 menit** (toleransi 5× interval normal 1 menit). Health check worker (cron tiap 2 menit) menjalankan:

```sql
SELECT id, name,
       MAX(timestamp) AS last_seen,
       (unixepoch('now') - unixepoch(MAX(timestamp))) / 60 AS minutes_silent
FROM sensors
LEFT JOIN readings ON readings.sensor_id = sensors.id
GROUP BY sensors.id
HAVING minutes_silent > 5 OR last_seen IS NULL;
```

**Yang ditampilkan di dashboard**

Jika sensor offline:
- Badge status berubah menjadi **"OFFLINE"** (warna abu gelap, bukan level banjir)
- Nilai water level diganti: *"No Data · Last seen: 14:32 WITA"*
- Grafik tetap menampilkan data historis, area setelah `last_seen` dikosongkan
- Banner peringatan muncul: *"⚠️ WL-001 tidak mengirim data sejak 14:32 WITA"*

Status OFFLINE sengaja dibedakan secara visual dari AMAN — operator tidak boleh mengira sungai aman hanya karena data tidak masuk.

**Notifikasi tersendiri?**

Ya, dikategorikan terpisah dari notifikasi level air:

> *"⚠️ [SENSOR OFFLINE] WL-001 / Sungai Malinau tidak mengirim data sejak 5 menit. Harap cek perangkat lapangan."*

- Dikirim ke **teknisi lapangan** (bukan hanya BPBD)
- Cooldown 60 menit — tidak spam selama sensor tetap mati
- Notifikasi **recovery** dikirim saat sensor kembali aktif: *"✅ WL-001 kembali online."*

---

## Tech Stack

| Layer | Pilihan |
|-------|---------|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via `better-sqlite3` |
| Charting | Recharts |
| Styling | Global CSS (custom design system) |
| Container | Docker (single container) |
| Runtime | Node.js 20 Alpine |
