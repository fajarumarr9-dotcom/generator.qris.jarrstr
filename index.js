const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// KONFIGURASI
const FEE = 123;
const API_KEY = "35b6cc7368a940a9b69f00c643ebf0eda4b0397aac5249f1bf270de871d5db31";
const API_URL = "https://temanqris.com/api/qris";

// Simpan transaksi (cukup untuk Vercel)
let transaksi = [];

// HALAMAN UTAMA
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Generator QRIS</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-green-50 to-green-100 min-h-screen">
      <div class="container mx-auto px-4 py-8 max-w-md">
        <div class="bg-white rounded-2xl shadow-xl p-6">
          <div class="text-center mb-6">
            <i class="fa fa-qrcode text-5xl text-green-500 mb-2"></i>
            <h1 class="text-2xl font-bold text-gray-800">Generator QRIS</h1>
            <p class="text-gray-500 text-sm">Otomatis + Rp 123</p>
          </div>

          <form action="/buat-qris" method="POST" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nominal Pembayaran</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input 
                  type="number" 
                  name="nominal" 
                  min="100" 
                  required 
                  placeholder="Contoh: 1000"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
              </div>
              <p class="text-xs text-gray-500 mt-1">BY JARR STR</p>
            </div>
            <button 
              type="submit" 
              class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <i class="fa fa-magic"></i> Buat QRIS
            </button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

// PROSES BUAT QRIS
app.post('/buat-qris', async (req, res) => {
  try {
    const nominalAwal = parseInt(req.body.nominal);
    
    if (isNaN(nominalAwal) || nominalAwal < 100) {
      return res.send(`
        <div class="max-w-md mx-auto p-6 text-center">
          <h3 class="text-red-500 mb-2">❌ Nominal minimal Rp 100</h3>
          <a href="/" class="text-green-600 font-medium">Kembali</a>
        </div>
      `);
    }

    const nominalTotal = nominalAwal + FEE;

    // Panggil API dengan format yang benar
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/generate`,
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        amount: nominalTotal,
        note: `Pembayaran ${nominalAwal} + Fee ${FEE}`
      },
      timeout: 20000
    });

    // Cek respon API
    if (!response.data || response.data.success !== true) {
      throw new Error(response.data?.message || 'Gagal terhubung ke layanan QRIS');
    }

    const data = response.data.data;
    
    // Ambil data dengan pengecekan ketat
    const id = data.transaction_id || data.id;
    const qrisUrl = data.qris_image_url || data.qr_code;

    if (!id) throw new Error('ID transaksi tidak diterima dari server');
    if (!qrisUrl) throw new Error('Gambar QRIS tidak tersedia');

    // Simpan transaksi
    transaksi.push({
      id: id,
      nominalAwal: nominalAwal,
      fee: FEE,
      nominalTotal: nominalTotal,
      qrisUrl: qrisUrl,
      waktu: Date.now(),
      status: 'pending'
    });

    // Tampilkan halaman QRIS
    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QRIS Siap</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
        <script>
          const TRANSAKSI_ID = "${id}";
          let cekInterval;

          function mulaiCekStatus() {
            cekInterval = setInterval(async () => {
              try {
                const res = await fetch('/cek-status/' + TRANSAKSI_ID);
                const hasil = await res.json();
                
                if (hasil.status === 'paid') {
                  document.getElementById('info-status').innerHTML = \`
                    <div class="bg-green-100 border border-green-400 text-green-800 p-3 rounded-lg text-center">
                      <i class="fa fa-check-circle mr-2"></i>✅ PEMBAYARAN BERHASIL DITERIMA!
                    </div>
                  \`;
                  clearInterval(cekInterval);
                } else if (hasil.status === 'expired') {
                  document.getElementById('info-status').innerHTML = \`
                    <div class="bg-red-100 border border-red-400 text-red-800 p-3 rounded-lg text-center">
                      <i class="fa fa-clock-o mr-2"></i>⏰ Transaksi Kadaluarsa
                    </div>
                  \`;
                  clearInterval(cekInterval);
                }
              } catch (err) {
                console.log('Cek status...');
              }
            }, 3000);
          }

          window.onload = mulaiCekStatus;
        </script>
      </head>
      <body class="bg-gradient-to-br from-green-50 to-green-100 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-md">
          <div class="bg-white rounded-2xl shadow-xl p-6 text-center">
            <h2 class="text-xl font-bold text-green-600 mb-4">✅ QRIS Berhasil Dibuat</h2>

            <div id="info-status" class="mb-4">
              <div class="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded-lg text-center">
                <i class="fa fa-clock-o mr-2"></i>⏳ Menunggu Pembayaran...
              </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-xl text-left mb-4 space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Nominal</span>
                <span class="font-medium">Rp ${nominalAwal.toLocaleString('id-ID')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Fee</span>
                <span class="font-medium">Rp ${FEE.toLocaleString('id-ID')}</span>
              </div>
              <hr class="my-2">
              <div class="flex justify-between text-lg font-bold text-green-600">
                <span>Total Bayar</span>
                <span>Rp ${nominalTotal.toLocaleString('id-ID')}</span>
              </div>
              <p class="text-xs text-gray-500 mt-2">ID: ${id} • Berlaku 15 menit</p>
            </div>

            <img src="${qrisUrl}" alt="QRIS Pembayaran" class="mx-auto mb-4 border rounded-lg w-64 h-64 object-contain shadow">
            
            <a href="/" class="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition">
              Buat QRIS Baru
            </a>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    res.send(`
      <div class="max-w-md mx-auto p-6 text-center">
        <h3 class="text-red-500 mb-2">❌ ${err.message}</h3>
        <a href="/" class="text-green-600 font-medium">Kembali</a>
      </div>
    `);
  }
});

// CEK STATUS PEMBAYARAN
app.get('/cek-status/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const trx = transaksi.find(t => t.id === id);

    if (!trx) {
      return res.json({ status: 'not_found' });
    }

    if (trx.status === 'paid') {
      return res.json({ status: 'paid' });
    }

    const response = await axios({
      method: 'GET',
      url: `${API_URL}/check/${id}`,
      headers: {
        'X-API-Key': API_KEY
      },
      timeout: 15000
    });

    if (response.data && response.data.status) {
      trx.status = response.data.status;
    }

    // Hapus transaksi yang sudah lewat 15 menit
    if (Date.now() - trx.waktu > 15 * 60 * 1000) {
      transaksi = transaksi.filter(t => t.id !== id);
      return res.json({ status: 'expired' });
    }

    res.json({ status: trx.status });

  } catch (err) {
    res.json({ status: 'pending' });
  }
});

module.exports = app;
