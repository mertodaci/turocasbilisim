# Turocas

Turocas Bilişim iç kurumsal yönetim uygulaması. Personel/İK süreçleri, PDKS (RFID kart ile
kapı erişim takibi), İş Takibi (proje/ticket yönetimi), mesajlaşma, izin/masraf talepleri,
müşteri yönetimi ve daha fazlasını tek bir yerde toplar.

## Mimari

- **Backend:** Node.js / Express, `better-sqlite3` (SQLite, WAL modu), JWT + httpOnly cookie
  tabanlı kimlik doğrulama.
- **Frontend:** React + Vite, shadcn/ui, Tailwind, @tanstack/react-query, react-router-dom.
- **PDKS:** ESP32 tabanlı kapı kontrol cihazlarıyla haberleşen ayrı bir Python (Flask) daemon
  (`pdks/pdks_daemon.py`), backend üzerinden proxy'lenir (`/api/pdks/*`).
- **Dağıtım:** Ubuntu sunucuda PM2 (backend + pdks-daemon süreçleri) ve Nginx (statik
  frontend + `/api/` reverse proxy) ile çalışır.

## Yerel geliştirme ortamı

### Önkoşullar

- Node.js 18+
- Python 3 (sadece PDKS daemon'ı yerelde çalıştırmak isterseniz)

### Kurulum

```bash
git clone <repo-url>
cd turocas

# Frontend bağımlılıkları
npm install

# Backend bağımlılıkları
cd backend
npm install
cd ..
```

`backend/.env` dosyası oluşturun:

```
PORT=3001
JWT_SECRET=<güçlü, rastgele bir değer>
DB_PATH=./database.sqlite
```

### Çalıştırma

```bash
# Backend (ayrı bir terminalde)
cd backend
npm run dev        # nodemon ile, canlı yeniden başlatma

# Frontend
npm run dev         # Vite dev server, varsayılan http://localhost:5173
```

Frontend, backend'e `http://localhost:3001` üzerinden bağlanır (bkz. `VITE_API_URL`,
`.env.local` ile değiştirilebilir).

## Derleme (production build)

```bash
npm run build        # dist/ klasörüne statik frontend build'i üretir
```

## Dağıtım (deploy)

Kod, GitHub'daki `main` branch üzerinden dağıtılır. Sunucuda çalışan `auto_deploy.sh`
scripti (cron ile birkaç dakikada bir tetiklenir) `main` branch'te yeni commit olup
olmadığını kontrol eder; varsa değişen dosyalara göre otomatik olarak:

- `npm install` (kök ve/veya `backend/`, `package.json` değiştiyse)
- `npm run build` (`src/` veya ilgili dosyalar değiştiyse)
- `pm2 restart turocas-backend` (`backend/` değiştiyse)
- `pm2 restart pdks-daemon` (`pdks/` değiştiyse)

çalıştırır. Yani sunucuya elle dosya yüklemeye veya SSH üzerinden komut çalıştırmaya
gerek yoktur — `main` branch'e push etmek yeterlidir.

## Notlar

- `.gitignore`, veritabanı dosyalarını (`*.sqlite`), yüklenen dosyaları (`uploads/`) ve
  `.env` dosyalarını kasıtlı olarak dışarıda tutar — bunlar gerçek personel verisi
  içerir ve asla repoya girmemelidir.
- Rol bazlı yetkilendirme, admin panelindeki **Yetkilendirme** ekranından
  (`/yetkilendirme`) yönetilir.
