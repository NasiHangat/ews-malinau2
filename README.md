# EWS Banjir - Kabupaten Malinau (Dashboard Pemantauan)

Aplikasi pemantauan Early Warning System (EWS) Banjir untuk 3 titik sungai di Kabupaten Malinau. Dibangun menggunakan Next.js App Router, Tailwind CSS, Recharts, dan Prisma ORM.

## Catatan Arsitektur (Pragmatic Fallback)
Berdasarkan brief, sistem ini dirancang menggunakan PostgreSQL + Docker Compose. Namun, mendekati tenggat waktu pengumpulan, mesin lokal saya mengalami isu *blocker* pada subsistem virtualisasi (WSL) yang menyebabkan Docker Engine *stuck* di *starting state*. 

Sebagai bentuk *problem-solving* agar aplikasi tetap berjalan 100% (Working MVP) dan dapat dievaluasi tepat waktu, saya melakukan *fallback* database menggunakan **SQLite**. Seluruh logika *ingestion* dan *dashboard* tetap berjalan persis sesuai spesifikasi.

## Cara Menjalankan Aplikasi
1. Clone repositori ini.
2. Install dependencies: `npm install`
3. Lakukan push skema ke database lokal: `npx prisma db push`
4. Jalankan script ingestion (memuat 8640 data dari readings.json): `node prisma/seed.js`
5. Jalankan server: `npm run dev`
6. Akses dashboard di: `http://localhost:3000`

---

## Tugas Analisa

### 1. Dari Batch ke Realtime
Untuk mengubah arsitektur dari pemrosesan file batch menjadi realtime (stream 1 menit), komponen yang perlu ditambahkan:
* **API Gateway / MQTT Broker:** Berfungsi sebagai pintu masuk data dari sensor-sensor di lapangan.
* **Message Broker (misal: Redis Queue / RabbitMQ):** Menampung data masuk untuk mencegah *database overload* jika terjadi lonjakan pengiriman data (spike).
* **Worker Service:** Komponen *backend* yang terus berjalan mengambil data dari antrean (queue), menyimpannya ke database, dan mengevaluasi status peringatan.
* **WebSocket (misal: Socket.io):** Bertugas memancarkan (emit) pembaruan data secara instan ke *client* (UI Dashboard) sehingga grafik dan status berubah tanpa perlu *refresh* halaman.

### 2. Flow Notifikasi
* **Kapan Notifikasi Dikirim?** Notifikasi dikirim **hanya saat terjadi perubahan level status** (State Change), misalnya dari SIAGA naik ke WASPADA, atau AWAS turun ke WASPADA. Tidak dikirim pada setiap *reading* baru.
* **Mencegah Notifikasi Berulang (Flapping):** Sistem akan menerapkan metode **Hysteresis** (memberikan margin batas toleransi, misal sensor harus turun 5cm di bawah ambang batas sebelum status resmi turun) atau **Time-delay / Debouncing** (status baru dianggap sah jika nilai menetap di atas ambang batas selama >5 menit berturut-turut).
* **Komponen yang Bertanggung Jawab:** Sebuah **Alerting Engine / Notification Worker** yang terpisah dari *core API*, bertugas berlangganan (*subscribe*) ke *stream* data masuk dan memicu eksekusi *webhook* (WhatsApp/SMS).

### 3. Sensor Mati
* **Cara Mendeteksi:** Menggunakan mekanisme **Heartbeat Monitoring**. Worker secara periodik mengecek selisih waktu saat ini dengan *timestamp* data terakhir dari setiap sensor. Jika `CurrentTime - LastTimestamp > 10 menit`, sensor dilabeli mati.
* **Tampilan di Dashboard:** Sensor yang mati tidak boleh dilabeli "AMAN". UI akan menampilkan status **"OFFLINE"** atau **"NO DATA"** dengan *badge* berwarna abu-abu (Netral) agar tidak tertukar dengan indikator bahaya maupun aman.
* **Memicu Notifikasi:** Ya, kondisi ini memicu peringatan, namun dikirimkan melalui saluran komunikasi yang berbeda (IT / Maintenance Team alert) untuk segera melakukan pengecekan *hardware* atau daya, bukan ke kanal evakuasi warga.

---
### Rencana Lanjutan
Jika terdapat waktu lebih, saya akan memulihkan konfigurasi `docker-compose.yml` untuk PostgreSQL dan membungkus ulang aplikasi ini dalam *container* agar mempermudah proses *deployment* ke *staging/production environment*.