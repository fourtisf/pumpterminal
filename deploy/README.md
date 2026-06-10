# Deploy pumpterminal ke VPS (pumpterminal.click)

Satu perintah untuk: hapus app lama `smartape`, install semua dependensi,
build & jalankan web + worker lewat pm2, konfigurasi nginx, dan pasang SSL
Let's Encrypt untuk `pumpterminal.click`.

## 1. Arahkan domain (DNS)

Di panel domain kamu (registrar tempat beli `pumpterminal.click`), tambahkan
DNS record yang mengarah ke IP VPS:

| Type | Name | Value          |
|------|------|----------------|
| A    | @    | 31.97.66.123   |
| A    | www  | 31.97.66.123   |

DNS bisa langsung aktif atau butuh beberapa menit–jam untuk propagasi.
Deploy tetap bisa jalan duluan — SSL bisa dipasang belakangan (lihat bawah).

## 2. Jalankan di VPS (sebagai root)

```bash
git clone -b claude/inspiring-darwin-vhs3nd https://github.com/fourtisf/pumpterminal.git /root/pumpterminal
cd /root/pumpterminal
bash deploy/deploy.sh
```

> Kalau repo private dan `git clone` minta login, buat Personal Access Token
> di GitHub (Settings → Developer settings → Tokens), lalu pakai token itu
> sebagai password saat clone.

Script ini otomatis:

1. Hapus app `smartape` dari pm2 (beserta file & log-nya, plus vhost nginx lama)
2. Install Node.js 20, pm2, nginx, certbot (skip yang sudah ada)
3. Install dependensi worker + build Next.js dengan
   `NEXT_PUBLIC_WS_URL=wss://pumpterminal.click/ws`
4. Start dua app pm2: `pumpterminal-web` (port 3000) dan
   `pumpterminal-worker` (port 4000), `pm2 save` + auto-start saat boot
5. Pasang vhost nginx: `/` → Next.js, `/ws` → worker WebSocket
6. Terbitkan sertifikat SSL + redirect HTTPS (kalau DNS sudah mengarah ke VPS)

## 3. Kalau DNS belum aktif saat deploy

Script akan skip langkah SSL dengan peringatan. Setelah DNS mengarah ke VPS,
jalankan:

```bash
cd /root/pumpterminal && bash deploy/deploy.sh ssl
```

## Update versi berikutnya

```bash
cd /root/pumpterminal && bash deploy/deploy.sh update
```

(= `git pull` + install deps + rebuild + restart pm2)

## Opsional: data trade live (PumpPortal API key)

Tanpa API key, feed tetap live untuk token baru & migrasi, tapi counter
buys/sells tidak jalan. Cara aktifkan: lihat `worker/README.md` bagian
"PumpPortal API key" — isi `PUMPPORTAL_API_KEY=...` di
`/root/pumpterminal/worker/.env`, lalu `pm2 restart pumpterminal-worker`.

## Cek kesehatan

```bash
pm2 status
pm2 logs --lines 50
curl -s http://localhost:4000/health | python3 -m json.tool
```
