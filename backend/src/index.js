require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb, db } = require('./db');
const authRoutes = require('./authRoutes');
const createEntityRouter = require('./entityRouter');
const { checkPermission } = createEntityRouter;

const app = express();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// GUVENLIK: canli sunucuda trafik Nginx uzerinden gelir; Nginx'in ekledigi
// X-Forwarded-For basligina gore gercek istemci IP'sini gosterecek (Nginx'e
// loopback'ten -- 127.0.0.1 -- guveniliyor). Bu olmadan req.ip her zaman
// Nginx'in kendisini (127.0.0.1) donduruyordu, bu da asagidaki IP engelleme
// ve login brute-force korumasinin dis trafik icin fiilen calismamasi
// anlamina geliyordu.
app.set('trust proxy', 'loopback');

// GUVENLIK: temel HTTP guvenlik basliklari (clickjacking, MIME sniffing vb.)
// CSP simdilik kapali -- frontend build'i once test edilmeden acilirsa
// mevcut sayfalari kirma riski var, ayri bir adimda dikkatlice acilacak.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Guvenli (asla engellenmeyecek) IP'ler: localhost ve ic ag
function isWhitelistedIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  return false;
}
// IP engel kontrolü
app.use((req, res, next) => {
  if (isWhitelistedIp(req.ip)) return next();
  const { db } = require('./db');
  const blocked = db.prepare('SELECT ip FROM blocked_ips WHERE ip = ?').get(req.ip);
  if (blocked) {
    return res.status(403).json({ error: 'Bu IP adresi engellenmiştir. Yönetici ile iletişime geçin.' });
  }
  next();
});

const loginAttempts = {};

const loginLimiter = (req, res, next) => {
  const ip = req.ip;
  if (!loginAttempts[ip]) loginAttempts[ip] = 0;
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (res.statusCode === 401 || res.statusCode === 400) {
      loginAttempts[ip]++;
      if (loginAttempts[ip] >= 7) {
        delete loginAttempts[ip];
        // localhost / ic ag asla DB'ye engelli yazilmaz (tum kullanicilari kilitlememek icin)
        if (!isWhitelistedIp(ip)) {
          const { db } = require('./db');
          db.prepare("INSERT OR IGNORE INTO blocked_ips (ip, reason) VALUES (?, ?)").run(ip, 'Çok fazla başarısız giriş denemesi');
          return originalJson({ error: 'Çok fazla başarısız giriş denemesi. Yönetici ile iletişime geçin.' });
        }
      }
    } else if (res.statusCode === 200 || res.statusCode === 201) {
      delete loginAttempts[ip];
    }
    return originalJson(data);
  };
  next();
};
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// GUVENLIK: genel API rate limit (login/register disindaki tum /api/ uc noktalari icin).
// NOT: mevcut brute-force IP engelleme (loginAttempts/blocked_ips) mantigina DOKUNULMADI.
// req.ip, trust proxy 'loopback' + Nginx'in ekledigi X-Forwarded-For sayesinde
// gercek istemci IP'sini veriyor.
// NOT: uygulama ici yogun polling var (bildirim sistemi 3sn, PDKS kart
// okuma modu aktifken 1sn araliklarla durum sorguluyor) -- ayni IP'nin
// arkasinda (musteri firmasinin ofis NAT'i vb.) birden fazla kullanici
// olabiliyor. 3000/5dk siniri, tek bir musteri firmasinin tum ofisinin
// (paylasilan tek public IP arkasindan, dogal kullanimla) urettigi trafigi
// yanlislikla engelledigi (2026-09-07) icin yukseltildi -- amac hala gercek
// otomatize saldiri/DoS trafigini yakalamak, yogun ama gercek kullanimi degil.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla istek gönderildi, lütfen birkaç dakika sonra tekrar deneyin.' },
});
app.use('/api/', apiLimiter);

// Auth uc noktalari icin ayri, siki limit (mevcut 7-strike blokun ustune
// kayan pencere). Otomatize kimlik-bilgisi denemelerini yavaslatir.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Çok fazla giriş denemesi, lütfen bir süre sonra tekrar deneyin.' },
});

// Veritabanını başlat
initDb();

// Auth route'ları
app.use('/api/auth/login', authLimiter, loginLimiter);
app.use('/api/auth/register', authLimiter, loginLimiter);
app.use('/api/auth', authRoutes);

// Entity route'ları (base44.entities.X karşılıkları)
app.use('/api/entities/employees',         createEntityRouter('employees'));
app.use('/api/entities/customers',         createEntityRouter('customers'));
app.use('/api/entities/activities',        createEntityRouter('activities'));
app.use('/api/entities/leave_requests',    createEntityRouter('leave_requests'));
app.use('/api/entities/todos',             createEntityRouter('todos'));
app.use('/api/entities/ideas',             createEntityRouter('ideas'));
app.use('/api/entities/customer_contacts', createEntityRouter('customer_contacts'));
app.use('/api/entities/customer_contracts',createEntityRouter('customer_contracts'));
app.use('/api/entities/customer_modules',  createEntityRouter('customer_modules'));
app.use('/api/entities/correspondences',   createEntityRouter('correspondences'));
app.use('/api/entities/conversations',     createEntityRouter('conversations'));
app.use('/api/entities/messages',          createEntityRouter('messages'));
app.use('/api/entities/work_tasks',        createEntityRouter('work_tasks'));
app.use('/api/entities/leave_allowances',  createEntityRouter('leave_allowances'));
app.use('/api/entities/leave_types',       createEntityRouter('leave_types'));
app.use('/api/entities/definitions',       createEntityRouter('definitions'));
app.use('/api/entities/expense_reports',   createEntityRouter('expense_reports'));
app.use('/api/entities/expense_items',     createEntityRouter('expense_items'));
app.use('/api/entities/sales_activities',   createEntityRouter('sales_activities'));
app.use('/api/entities/task_comments',     createEntityRouter('task_comments'));
app.use('/api/entities/announcements',     createEntityRouter('announcements'));
app.use('/api/entities/hakedisler',        createEntityRouter('hakedisler'));

// Rol ve yetki route'ları
app.use('/api/entities/roles', createEntityRouter('roles'));
app.use('/api/entities/role_permissions', createEntityRouter('role_permissions'));

// TaskQube entity route'ları
app.use('/api/entities/customer_projects',  createEntityRouter('customer_projects'));
app.use('/api/entities/offers',              createEntityRouter('offers'));
app.use('/api/entities/tq_projects',       createEntityRouter('tq_projects'));
app.use('/api/entities/tq_tickets',        createEntityRouter('tq_tickets'));
app.use('/api/entities/tq_ticket_statuses', createEntityRouter('tq_ticket_statuses'));
app.use('/api/entities/tq_comments',       createEntityRouter('tq_comments'));
app.use('/api/entities/tq_effort_plans',   createEntityRouter('tq_effort_plans'));
app.use('/api/entities/tq_effort_logs',    createEntityRouter('tq_effort_logs'));
app.use('/api/entities/tq_kanban_boards',  createEntityRouter('tq_kanban_boards'));
app.use('/api/entities/card_logs',         createEntityRouter('card_logs'));

// Stok / Depo Yönetimi entity route'ları — Faz 1: Tanımlar
app.use('/api/entities/stok_urun_gruplari',     createEntityRouter('stok_urun_gruplari'));
app.use('/api/entities/stok_urunler',           createEntityRouter('stok_urunler'));
app.use('/api/entities/stok_urun_birimleri',    createEntityRouter('stok_urun_birimleri'));
app.use('/api/entities/stok_urun_barkodlari',   createEntityRouter('stok_urun_barkodlari'));
app.use('/api/entities/stok_depolar',           createEntityRouter('stok_depolar'));
app.use('/api/entities/stok_raflar',            createEntityRouter('stok_raflar'));
app.use('/api/entities/stok_urun_raf',          createEntityRouter('stok_urun_raf'));
app.use('/api/entities/stok_sahalar',           createEntityRouter('stok_sahalar'));
app.use('/api/entities/stok_teslimat_adresleri', createEntityRouter('stok_teslimat_adresleri'));
// Faz 2: Hareket fişleri
app.use('/api/entities/stok_fisler',            createEntityRouter('stok_fisler'));
app.use('/api/entities/stok_fis_satirlari',     createEntityRouter('stok_fis_satirlari'));
app.use('/api/entities/stok_hareketler',        createEntityRouter('stok_hareketler'));
// Faz 3: FIFO partileri
app.use('/api/entities/stok_partiler',          createEntityRouter('stok_partiler'));
app.use('/api/entities/stok_parti_tahsis',      createEntityRouter('stok_parti_tahsis'));
// Faz 4: Sayım
app.use('/api/entities/stok_sayimlar',          createEntityRouter('stok_sayimlar'));
app.use('/api/entities/stok_sayim_satirlari',   createEntityRouter('stok_sayim_satirlari'));
// Faz 5: Malzeme Talep
app.use('/api/entities/stok_talepler',          createEntityRouter('stok_talepler'));
app.use('/api/entities/stok_talep_satirlari',   createEntityRouter('stok_talep_satirlari'));
// Faz 7: Satın Alma
app.use('/api/entities/stok_urun_tedarikci',    createEntityRouter('stok_urun_tedarikci'));
app.use('/api/entities/stok_fiyat_gecmisi',     createEntityRouter('stok_fiyat_gecmisi'));
// Faz 8: Zimmet / El Aletleri
app.use('/api/entities/stok_personeller',       createEntityRouter('stok_personeller'));
app.use('/api/entities/stok_demirbaslar',       createEntityRouter('stok_demirbaslar'));
app.use('/api/entities/stok_zimmetler',         createEntityRouter('stok_zimmetler'));

// Dosya yükleme
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = '/home/rootori/turocas/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv','application/zip','application/x-zip-compressed','application/x-compressed','video/mp4','text/xml','application/xml','application/json','application/octet-stream','message/rfc822',
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya tipi: ' + file.mimetype));
    }
  },
});

const authMiddleware = require('./authMiddleware');

// ===== ADMIN: Audit Log + Cop Kutusu endpoint'leri =====
const { db: _adb } = require('./db');
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Sadece admin' });
  next();
}
// Belirli rollere izin veren guard (admin dahil edilmeli)
function requireRoles(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Bu sayfa için yetkiniz yok' });
}
// Audit log listesi
app.get('/api/audit-log', authMiddleware, adminOnly, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const rows = _adb.prepare('SELECT * FROM audit_log ORDER BY created_date DESC LIMIT ?').all(limit);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Cop kutusu: silinmis kayitlar + geri getirme.
// Cogu tablo is_deleted=1 ile "silinir"; panolar ise is_active=0 ile.
// Kolon/degerler sabit haritadan gelir (kullanici girdisi degil) -> injection yok.
const TRASH_TABLES = {
  customers:        { col: 'is_deleted', deleted: 1, active: 0, nameField: 'company_name' },
  tq_tickets:       { col: 'is_deleted', deleted: 1, active: 0, nameField: 'title' },
  tq_projects:      { col: 'is_deleted', deleted: 1, active: 0, nameField: 'name' },
  employees:        { col: 'is_deleted', deleted: 1, active: 0, nameField: 'full_name' },
  tq_kanban_boards: { col: 'is_active',  deleted: 0, active: 1, nameField: 'name' },
};
app.get('/api/trash/:table', authMiddleware, adminOnly, (req, res) => {
  try {
    const cfg = TRASH_TABLES[req.params.table];
    if (!cfg) return res.status(400).json({ error: 'Gecersiz tablo' });
    const rows = _adb.prepare(`SELECT * FROM ${req.params.table} WHERE ${cfg.col} = ${cfg.deleted} ORDER BY updated_date DESC`).all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trash/:table/:id/restore', authMiddleware, adminOnly, (req, res) => {
  try {
    const cfg = TRASH_TABLES[req.params.table];
    if (!cfg) return res.status(400).json({ error: 'Gecersiz tablo' });
    _adb.prepare(`UPDATE ${req.params.table} SET ${cfg.col} = ${cfg.active}, updated_date = ? WHERE id = ?`).run(new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === Personel Hareketleri: CSV kart log import ===
// === PDKS: ESP32 kapi kontrol daemon proxy'si (kart tanimlama + canli durum) ===
// pdks_daemon.py sunucunun kendi icinde (127.0.0.1:8091) calisir, disariya kapali.
// Gecis kayitlarini pdks_daemon zaten dogrudan card_logs tablosuna yaziyor;
// bu route'lar sadece kart ekleme/silme/cihaz durumu icin ESP32'lere koprudur.
const PDKS_BASE = 'http://127.0.0.1:8091';

async function pdksProxy(method, path, body) {
  const opts = { method };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${PDKS_BASE}${path}`, opts);
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

app.get('/api/pdks/status', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('GET', '/api/status');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.get('/api/pdks/cards', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('GET', '/api/cards');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.get('/api/pdks/last_uid', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const device = encodeURIComponent(req.query.device || '');
    const { status, data } = await pdksProxy('GET', `/api/last_uid?device=${device}`);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/cards', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/cards', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.delete('/api/pdks/cards', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_delete')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('DELETE', '/api/cards', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/cards/deactivate', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_edit')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/cards/deactivate', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/cards/activate', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_edit')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/cards/activate', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/start', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/start', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.get('/api/pdks/capture/status', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('GET', '/api/capture/status');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/stop', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/stop');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/clear', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/clear');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/card-logs/import', authMiddleware, (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add'))
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { randomUUID } = require('crypto');
    const csv = (req.body && req.body.csv) ? String(req.body.csv) : '';
    if (!csv.trim()) return res.status(400).json({ error: 'CSV bos' });

    // Calisan card_uid -> {id, name} haritasi (buyuk harf, trim)
    const emps = db.prepare("SELECT id, full_name, card_uid FROM employees WHERE card_uid IS NOT NULL AND card_uid != ''").all();
    const empByCard = {};
    for (const e of emps) {
      const key = String(e.card_uid || '').trim().toUpperCase();
      if (key) empByCard[key] = { id: e.id, name: e.full_name };
    }

    // CSV satirlarini ayikla (\r\n veya \n)
    const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return res.status(400).json({ error: 'Veri satiri yok' });

    // Baslik satirini atla (device_id,seq,card_uid,person_name,timestamp,datetime,synced_at)
    const header = lines[0].toLowerCase();
    const startIdx = header.includes('device_id') || header.includes('card_uid') ? 1 : 0;

    const insert = db.prepare(`INSERT OR IGNORE INTO card_logs
      (id, direction, seq, card_uid, person_name, employee_id, employee_name, ts, event_time, synced_at, source, created_date)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'csv', datetime('now'))`);

    let eklenen = 0, atlanan = 0, eslesmeyen = 0, toplam = 0;
    for (const line of lines.slice(startIdx)) {
      const cols = line.split(',');
      if (cols.length < 6) continue;
      toplam++;
      const direction = (cols[0] || '').trim();
      const seq = parseInt((cols[1] || '').trim(), 10);
      const card_uid = (cols[2] || '').trim().toUpperCase();
      const person_name = (cols[3] || '').trim();
      const ts = parseInt((cols[4] || '').trim(), 10) || null;
      const event_time = (cols[5] || '').trim();
      const synced_at = (cols[6] || '').trim() || null;

      const match = empByCard[card_uid] || null;
      if (!match) eslesmeyen++;

      const info = insert.run(
        randomUUID(), direction, isNaN(seq) ? null : seq, card_uid, person_name,
        match ? match.id : null, match ? match.name : null,
        ts, event_time, synced_at
      );
      if (info.changes > 0) eklenen++; else atlanan++;
    }

    res.json({ toplam, eklenen, atlanan, eslesmeyen });
  } catch (err) {
    console.error('card-logs import hata:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya yuklenemedi' });
  const fileUrl = '/api/files/' + req.file.filename;
  res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
}, (err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Dosya yuklenemedi' });
});

// GUVENLIK: yuklenen dosyalar (mesaj/ticket ekleri vb.) artik sadece
// giris yapmis kullanicilar tarafindan indirilebilir.
app.get('/api/files/:filename', authMiddleware, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);
  if (!filePath.startsWith(uploadDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Dosya bulunamadi' });
  }
  // GUVENLIK/UX: res.download() her zaman "Content-Disposition: attachment"
  // gonderiyordu -- bu da tarayiciya "onizleme, direkt indir" dedigi icin
  // ozellikle PDF'ler (<iframe> ile onizlenmeye calisiliyor) hep indirmeye
  // dusuyordu (resimler <img> etiketinde cogu tarayicida yine de goruntuleniyordu,
  // o yuzden fark edilmemisti). Onizlenebilir turlerde "inline" gonderiyoruz;
  // digerleri (docx/xlsx/zip vb, zaten tarayicida onizlenemez) eskisi gibi indiriliyor.
  const previewable = /\.(png|jpe?g|gif|webp|pdf|txt)$/i.test(filename);
  res.setHeader('Content-Disposition', `${previewable ? 'inline' : 'attachment'}; filename="${encodeURIComponent(filename)}"`);
  res.sendFile(filePath);
});


// ── SSE (Server-Sent Events) ─────────────────────────────────────
const sseClients = new Map(); // userId -> res

function broadcastSSE(userId, data) {
  const client = sseClients.get(userId);
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function broadcastAll(data) {
  for (const [, client] of sseClients) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// DB polling - 3 saniyede bir değişiklikleri kontrol et
let lastCounts = {};
function pollDB() {
  try {
    const counts = {
      leave_requests: db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status IN ('beklemede','ik_onayi_bekliyor','yonetici_onayi_bekliyor')").get()?.c || 0,
      expense_reports: db.prepare("SELECT COUNT(*) as c FROM expense_reports WHERE status IN ('ik_onayi_bekliyor','yonetici_onayi_bekliyor')").get()?.c || 0,
      tq_tickets: db.prepare("SELECT COUNT(*) as c FROM tq_tickets").get()?.c || 0,
      messages: db.prepare("SELECT COUNT(*) as c FROM messages").get()?.c || 0,
      todos: db.prepare("SELECT COUNT(*) as c FROM todos").get()?.c || 0,
      work_tasks: db.prepare("SELECT COUNT(*) as c FROM work_tasks").get()?.c || 0,
    };
    const changed = Object.keys(counts).some(k => counts[k] !== lastCounts[k]);
    if (changed) {
      broadcastAll({ type: 'refresh', counts });
      lastCounts = counts;
    }
  } catch(e) {}
}
setInterval(pollDB, 3000);

app.get('/api/events', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user.id;
  sseClients.set(userId, res);

  // İlk bağlantıda mevcut sayıları gönder
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  req.on('close', () => {
    sseClients.delete(userId);
  });
});

// Health check

// Executive Dashboard
app.get('/api/dashboard/admin-summary', authMiddleware, requireRoles('admin','yonetici'), (req, res) => {
  try {
    const { db } = require('./db');
    const openTickets = db.prepare("SELECT * FROM tq_tickets WHERE status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL) ORDER BY created_date DESC LIMIT 50").all();
    const openCount = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL)").get().c;
    const byCustomer = db.prepare("SELECT t.customer_name, COUNT(*) as c, (SELECT cu.status FROM customers cu WHERE cu.company_name=t.customer_name LIMIT 1) as cust_status FROM tq_tickets t WHERE t.status NOT IN ('sonuclanan','iptal','arsivlendi') AND (t.is_deleted=0 OR t.is_deleted IS NULL) AND t.customer_name IS NOT NULL GROUP BY t.customer_name ORDER BY c DESC LIMIT 8").all();
    const byStatus = db.prepare(`
      SELECT t.status,
             COALESCE((SELECT s.name FROM tq_ticket_statuses s WHERE s.key = t.status LIMIT 1), t.status) AS status_label,
             COUNT(*) as c
      FROM tq_tickets t
      WHERE t.status NOT IN ('sonuclanan','iptal','arsivlendi') AND (t.is_deleted=0 OR t.is_deleted IS NULL)
      GROUP BY t.status ORDER BY c DESC
    `).all();
    const thisMonth = new Date(Date.now() + 3*3600*1000).toISOString().substring(0,7);
    const thisMonthOpened = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE substr(datetime(created_date,'+3 hours'),1,7)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(thisMonth).c;
    const thisMonthClosed = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE status='sonuclanan' AND substr(datetime(updated_date,'+3 hours'),1,7)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(thisMonth).c;
    let projectCount = 0;
    try { projectCount = db.prepare("SELECT COUNT(*) as c FROM tq_projects WHERE (is_deleted=0 OR is_deleted IS NULL) AND (is_active=1 OR is_active IS NULL)").get().c; } catch(e) {}

    const today = new Date(Date.now() + 3*3600*1000).toISOString().substring(0,10);
    // Bugun ozeti
    const todayOpened = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE substr(datetime(created_date,'+3 hours'),1,10)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;
    const todayClosed = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE status='sonuclanan' AND substr(datetime(updated_date,'+3 hours'),1,10)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;
    const todayActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE substr(date,1,10)=?").get(today).c;
    const onLeaveToday = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ?").get(today, today).c;

    // Bekleyen onaylar (yonetici aksiyonu)
    let pendingLeaves = 0, pendingExpenses = 0;
    try { pendingLeaves = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor','beklemede')").get().c; } catch(e) {}
    try { pendingExpenses = db.prepare("SELECT COUNT(*) as c FROM expense_reports WHERE status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor')").get().c; } catch(e) {}

    // Geciken biletler (SLA)
    const overdueTickets = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE due_date IS NOT NULL AND due_date != '' AND due_date < ? AND status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;

    // Oncelik dagilimi (acik biletler)
    const byPriority = db.prepare("SELECT COALESCE(priority,'belirsiz') as priority, COUNT(*) as c FROM tq_tickets WHERE status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL) GROUP BY priority").all();

    // Son 7 gun trend (acilan/kapanan)
    const dailyTrend = db.prepare(`
      WITH RECURSIVE days(d) AS (
        SELECT date('now','+3 hours','-6 days')
        UNION ALL SELECT date(d,'+1 day') FROM days WHERE d < date('now','+3 hours')
      )
      SELECT d,
        (SELECT COUNT(*) FROM tq_tickets WHERE substr(datetime(created_date,'+3 hours'),1,10)=d AND (is_deleted=0 OR is_deleted IS NULL)) as opened,
        (SELECT COUNT(*) FROM tq_tickets WHERE resolved_at IS NOT NULL AND substr(datetime(resolved_at,'+3 hours'),1,10)=d AND (is_deleted=0 OR is_deleted IS NULL)) as closed
      FROM days
    `).all();

    // Atanan kisiye gore yuk (acik biletler)
    const byAssignee = db.prepare("SELECT COALESCE(assigned_to_name,'Atanmamış') as name, COUNT(*) as c FROM tq_tickets WHERE status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL) AND (assigned_to_name IS NULL OR assigned_to_name NOT LIKE '%@%') GROUP BY assigned_to_name ORDER BY c DESC LIMIT 15").all();

    res.json({ openTickets, openCount, byCustomer, byStatus, thisMonthOpened, thisMonthClosed, projectCount,
      todayOpened, todayClosed, todayActivities, onLeaveToday,
      pendingLeaves, pendingExpenses, overdueTickets, byPriority, dailyTrend, byAssignee });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/archived-count', authMiddleware, requireRoles('admin','yonetici','kullanici','ik','satis','stajer'), (req, res) => {
  try {
    const { db } = require('./db');
    const r = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE status='arsivlendi' AND (is_deleted=0 OR is_deleted IS NULL)").get();
    res.json({ count: r.c });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me/tickets', authMiddleware, (req, res) => {
  try {
    const { db } = require('./db');
    const emp = db.prepare("SELECT id FROM employees WHERE email=? AND (is_deleted=0 OR is_deleted IS NULL)").get(req.user.email);
    if (!emp) return res.json([]);
    // Bilet tek kisiye (assigned_to_id) veya coklu kisiye (assigned_to_ids JSON
    // dizisi) atanmis olabilir; ikisini de kapsa.
    const tickets = db.prepare("SELECT * FROM tq_tickets WHERE (assigned_to_id=? OR assigned_to_ids LIKE ?) AND status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL) ORDER BY created_date DESC").all(emp.id, '%"' + emp.id + '"%');
    res.json(tickets);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me/employee', authMiddleware, (req, res) => {
  try {
    const { db } = require('./db');
    const emp = db.prepare("SELECT * FROM employees WHERE email=? AND (is_deleted=0 OR is_deleted IS NULL)").get(req.user.email);
    res.json(emp || null);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Bagimsiz Sozlesmeler ekrani icin tum sozlesmeler + musteri adi.
// customer_contracts CRUD 'customers' modulune bagli; bu liste 'sozlesmeler' yetkisiyle gelir.
app.get('/api/sozlesmeler', authMiddleware, (req, res) => {
  try {
    const { db } = require('./db');
    const role = req.user?.role;
    if (role !== 'admin') {
      const p = db.prepare("SELECT can_view FROM role_permissions WHERE role_name=? AND module='sozlesmeler'").get(role);
      if (!p || p.can_view != 1) return res.status(403).json({ error: 'Yetkisiz' });
    }
    const rows = db.prepare(`
      SELECT cc.*, c.company_name
      FROM customer_contracts cc LEFT JOIN customers c ON c.id = cc.customer_id
      ORDER BY datetime(cc.created_date) DESC
    `).all();
    res.json(rows.map(r => {
      if (typeof r.products === 'string') {
        try { r.products = JSON.parse(r.products); } catch { r.products = []; }
      }
      return r;
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard/executive', authMiddleware, requireRoles('admin','yonetici'), (req, res) => {
  try {
    const { db } = require("./db");
    const today = new Date(Date.now() + 3*3600*1000).toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const lastMonth = new Date(new Date(Date.now() + 3*3600*1000).setUTCMonth(new Date(Date.now() + 3*3600*1000).getUTCMonth() - 1)).toISOString().substring(0, 7);
    const thisYear = today.substring(0, 4);
    // Soft-delete edilen kayitlari haric tutan ortak parca
    const ND = "(is_deleted=0 OR is_deleted IS NULL)";

    // === İNSAN KAYNAKLARI ===
    const totalEmployees = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status='aktif' AND (app_role != 'musteri' OR app_role IS NULL) AND (is_deleted=0 OR is_deleted IS NULL)").get().c;
    const onLeaveToday = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ?").get(today, today).c;
    const onLeaveTodayList = db.prepare("SELECT id, employee_full_name, leave_type, start_date, end_date, day_count, half_day_period FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ? ORDER BY end_date ASC LIMIT 20").all(today, today);
    const pendingLeaves = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor')").get().c;
    const thisMonthExpenses = db.prepare("SELECT COALESCE(SUM(ei.accommodation + ei.transport + ei.fuel + ei.meal + ei.other),0) as s FROM expense_reports er LEFT JOIN expense_items ei ON ei.report_id = er.id WHERE er.status='onaylandi' AND substr(datetime(er.created_date,'+3 hours'),1,7)=?").get(thisMonth).s;
    const pendingExpenses = db.prepare("SELECT COUNT(*) as c FROM expense_reports WHERE status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor')").get().c;

    // === MÜŞTERİLER & SATIŞ ===
    const totalCustomers = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status='aktif' AND (is_deleted=0 OR is_deleted IS NULL) AND (is_potential=0 OR is_potential IS NULL)").get().c;
    const potentialCustomers = db.prepare("SELECT COUNT(*) as c FROM customers WHERE is_potential=1 AND (is_deleted=0 OR is_deleted IS NULL)").get().c;
    const thisMonthOffers = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND substr(datetime(created_date,'+3 hours'),1,7)=?").get(thisMonth);
    const lastMonthOffers = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND substr(datetime(created_date,'+3 hours'),1,7)=?").get(lastMonth);
    const acceptedOffers = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND deal_status='kazanildi' AND substr(datetime(created_date,'+3 hours'),1,4)=?").get(thisYear);
    const offersByStatus = db.prepare("SELECT deal_status as status, COUNT(*) as c FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) GROUP BY deal_status").all();
    // Kazanma orani + pipeline (masadaki acik teklif tutari)
    const wonCount = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND deal_status='kazanildi'").get().c;
    const lostCount = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND deal_status='kaybedildi'").get().c;
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;
    const pipeline = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND (deal_status='gorusulmede' OR deal_status='taslak' OR deal_status IS NULL)").get();

    // === TASKQUBE ===
    const totalProjects = db.prepare(`SELECT COUNT(*) as c FROM tq_projects WHERE is_active=1 AND ${ND}`).get().c;
    const taskqubeCustomers = db.prepare("SELECT COUNT(*) as c FROM customers WHERE (use_taskqube=1 OR use_taskqube='true') AND status='aktif' AND (is_deleted=0 OR is_deleted IS NULL)").get().c;
    const activeProjects = db.prepare(`SELECT COUNT(*) as c FROM tq_projects WHERE status='devam_ediyor' AND is_active=1 AND ${ND}`).get().c;
    const ticketsByStatus = db.prepare(`
      SELECT t.status,
             COALESCE((SELECT s.name FROM tq_ticket_statuses s WHERE s.key = t.status LIMIT 1), t.status) AS status_label,
             COUNT(*) as c
      FROM tq_tickets t
      WHERE (t.is_deleted=0 OR t.is_deleted IS NULL)
      GROUP BY t.status
    `).all();
    const CLOSED_STATUSES = "('sonuclanan','arsivlendi','iptal')";
    const overdueTickets = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE due_date IS NOT NULL AND due_date != '' AND due_date < ? AND status NOT IN ('sonuclanan','arsivlendi','iptal') AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;
    const thisMonthTickets = db.prepare(`SELECT COUNT(*) as c FROM tq_tickets WHERE substr(datetime(created_date,'+3 hours'),1,7)=? AND ${ND}`).get(thisMonth).c;

    // === DESTEK MERKEZİ ===
    const openTickets = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE status NOT IN ('sonuclanan','arsivlendi','iptal') AND (is_deleted=0 OR is_deleted IS NULL)").get().c;
    const resolvedThisMonth = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE resolved_at IS NOT NULL AND substr(datetime(resolved_at,'+3 hours'),1,7)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(thisMonth).c;
    // Genel Bakis icin: bugun acilan/kapanan + bilet durum + musteri yogunlugu
    const execTodayOpened = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE substr(datetime(created_date,'+3 hours'),1,10)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;
    const execTodayClosed = db.prepare("SELECT COUNT(*) as c FROM tq_tickets WHERE resolved_at IS NOT NULL AND substr(datetime(resolved_at,'+3 hours'),1,10)=? AND (is_deleted=0 OR is_deleted IS NULL)").get(today).c;
    const ticketByStatusOpen = db.prepare(`
      SELECT t.status,
             COALESCE((SELECT s.name FROM tq_ticket_statuses s WHERE s.key = t.status LIMIT 1), t.status) AS status_label,
             COUNT(*) as c
      FROM tq_tickets t
      WHERE t.status NOT IN ('sonuclanan','iptal','arsivlendi') AND (t.is_deleted=0 OR t.is_deleted IS NULL)
      GROUP BY t.status ORDER BY c DESC
    `).all();
    const ticketByCustomer = db.prepare("SELECT customer_name, COUNT(*) as c FROM tq_tickets WHERE status NOT IN ('sonuclanan','iptal','arsivlendi') AND (is_deleted=0 OR is_deleted IS NULL) AND customer_name IS NOT NULL GROUP BY customer_name ORDER BY c DESC LIMIT 8").all();

    // === AKTİVİTELER ===
    const thisMonthActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE substr(date,1,7)=?").get(thisMonth).c;
    const lastMonthActivities = db.prepare("SELECT COUNT(*) as c FROM activities WHERE substr(date,1,7)=?").get(lastMonth).c;
    const activitiesByType = db.prepare("SELECT activity_type, COUNT(*) as c FROM activities WHERE substr(date,1,4)=? GROUP BY activity_type ORDER BY c DESC LIMIT 6").all(thisYear);
    const upcomingVisits = db.prepare(`SELECT COUNT(*) as c FROM sales_activities WHERE next_visit_date >= ? AND next_visit_date <= date(?, '+30 days') AND ${ND}`).get(today, today).c;

    // === HARCAMA TREND (son 6 ay) ===
    const expenseTrend = db.prepare(`
      SELECT substr(er.created_date,1,7) as month,
        COALESCE(SUM(ei.accommodation + ei.transport + ei.fuel + ei.meal + ei.other),0) as total
      FROM expense_reports er
      LEFT JOIN expense_items ei ON ei.report_id = er.id
      WHERE er.created_date >= date('now','-6 months') AND er.status = 'onaylandi'
      GROUP BY month ORDER BY month
    `).all();
    const expenseTrendPending = db.prepare(`
      SELECT substr(er.created_date,1,7) as month,
        COALESCE(SUM(ei.accommodation + ei.transport + ei.fuel + ei.meal + ei.other),0) as total
      FROM expense_reports er
      LEFT JOIN expense_items ei ON ei.report_id = er.id
      WHERE er.created_date >= date('now','-6 months')
        AND er.status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor')
      GROUP BY month ORDER BY month
    `).all();
    const expenseByCategory = db.prepare(`
      SELECT
        COALESCE(SUM(ei.accommodation),0) as accommodation,
        COALESCE(SUM(ei.transport),0) as transport,
        COALESCE(SUM(ei.fuel),0) as fuel,
        COALESCE(SUM(ei.meal),0) as meal,
        COALESCE(SUM(ei.other),0) as other
      FROM expense_items ei
      JOIN expense_reports er ON er.id = ei.report_id
      WHERE er.status = 'onaylandi'
    `).get();

    // === AKTİVİTE TREND (son 6 ay) ===
    const activityTrend = db.prepare(`
      SELECT substr(date,1,7) as month, COUNT(*) as total
      FROM activities WHERE date >= date('now','-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // === TEKLİF TREND (son 6 ay) ===
    const offerTrend = db.prepare(`
      SELECT substr(created_date,1,7) as month, COUNT(*) as c, COALESCE(SUM(amount),0) as s
      FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) AND created_date >= date('now','-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // === TEKLİF KAZAN/KAYBET TREND (son 6 ay) ===
    const offerWonLostTrend = db.prepare(`
      SELECT substr(created_date,1,7) as month,
             SUM(CASE WHEN deal_status='kazanildi' THEN 1 ELSE 0 END) as won,
             SUM(CASE WHEN deal_status='kaybedildi' THEN 1 ELSE 0 END) as lost
      FROM sales_activities
      WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL)
        AND created_date >= date('now','-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // === SOZLESMELER ===
    const contractStats = db.prepare('SELECT status, COUNT(*) as c FROM customer_contracts GROUP BY status').all();
    const activeContracts = db.prepare('SELECT cc.title, cc.status, cc.end_date, cc.contract_type, c.company_name FROM customer_contracts cc LEFT JOIN customers c ON c.id=cc.customer_id WHERE cc.status=\'aktif\' ORDER BY cc.end_date ASC LIMIT 5').all();
    const expiringContracts = db.prepare('SELECT cc.title, cc.status, cc.end_date, cc.contract_type, c.company_name FROM customer_contracts cc LEFT JOIN customers c ON c.id=cc.customer_id WHERE cc.status=\'aktif\' AND cc.end_date <= date(\'now\',\'+60 days\') ORDER BY cc.end_date ASC LIMIT 5').all();
    const contractByType = db.prepare(`
      SELECT COALESCE(NULLIF(contract_type,''),'Belirtilmemiş') as type,
             COUNT(*) as c, COALESCE(SUM(contract_value),0) as s
      FROM customer_contracts GROUP BY type ORDER BY c DESC
    `).all();
    const contractValueActive = db.prepare(
      "SELECT COALESCE(SUM(contract_value),0) as s FROM customer_contracts WHERE status='aktif'"
    ).get().s;

    // === HAKEDIS (secili yil; varsayilan icinde bulunulan yil) ===
    const HK = ['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
    const HKSUM = HK.map(m => `COALESCE(${m},0)`).join('+');
    const reqHkY = parseInt(req.query.hakedisYear, 10);
    const hakedisYear = Number.isFinite(reqHkY) ? reqHkY : parseInt(thisYear, 10);
    const hakedisYears = db.prepare(
      "SELECT DISTINCT year AS y FROM hakedisler WHERE year IS NOT NULL ORDER BY y DESC"
    ).all().map(r => r.y);
    if (!hakedisYears.includes(parseInt(thisYear, 10))) hakedisYears.unshift(parseInt(thisYear, 10));
    const hakedisMonthly = db.prepare(
      `SELECT ${HK.map(m => `COALESCE(SUM(${m}),0) as ${m}`).join(', ')} FROM hakedisler WHERE year=?`
    ).get(hakedisYear);
    const hakedisTotals = db.prepare(
      `SELECT COALESCE(SUM(yil_hedefi),0) as hedef,
              COALESCE(SUM(${HKSUM}),0) as gerceklesen,
              COALESCE(SUM(toplam_sozlesme_tutari),0) as sozlesme,
              COUNT(*) as c FROM hakedisler WHERE year=?`
    ).get(hakedisYear);
    const hakedisBySektor = db.prepare(
      `SELECT COALESCE(NULLIF(sektor,''),'Diğer') as sektor,
              COALESCE(SUM(${HKSUM}),0) as gerceklesen,
              COALESCE(SUM(yil_hedefi),0) as hedef, COUNT(*) as c
       FROM hakedisler WHERE year=? GROUP BY sektor ORDER BY gerceklesen DESC`
    ).all(hakedisYear);
    const hakedisByAnlasma = db.prepare(
      `SELECT COALESCE(NULLIF(anlasma_turu,''),'Diğer') as anlasma,
              COALESCE(SUM(${HKSUM}),0) as gerceklesen, COUNT(*) as c
       FROM hakedisler WHERE year=? GROUP BY anlasma ORDER BY gerceklesen DESC`
    ).all(hakedisYear);

    // === SON AKTİVİTELER ===
    const recentActivities = db.prepare("SELECT employee_name, activity_type, customer_name, date, outcome FROM activities ORDER BY created_date DESC LIMIT 8").all();

    // === SATIS AKTIVITELERI (teklif haric) ===
    const NOT_OFFER = "activity_type != 'teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL)";
    const salesActByType = db.prepare("SELECT activity_type as type, COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " GROUP BY activity_type ORDER BY c DESC").all();
    const salesActThisMonth = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " AND substr(date,1,7)=?").get(thisMonth).c;
    const salesActLastMonth = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " AND substr(date,1,7)=?").get(lastMonth).c;
    const salesActRecent = db.prepare("SELECT id, customer_name, activity_type, date, contact_person, employee_name FROM sales_activities WHERE " + NOT_OFFER + " ORDER BY date DESC, created_date DESC LIMIT 5").all();

    // === SON TEKLİFLER ===
    const recentOffers = db.prepare("SELECT customer_name, title, amount as total_amount, currency, deal_status as status, created_date FROM sales_activities WHERE activity_type='teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL) ORDER BY created_date DESC LIMIT 6").all();

    res.json({
      hr: { totalEmployees, onLeaveToday, onLeaveTodayList, pendingLeaves, thisMonthExpenses, pendingExpenses },
      sales: { totalCustomers, potentialCustomers, thisMonthOffers, lastMonthOffers, acceptedOffers, offersByStatus, wonCount, lostCount, winRate, pipeline },
      taskqube: { totalProjects, taskqubeCustomers, activeProjects, ticketsByStatus, overdueTickets, thisMonthTickets, openTickets, resolvedThisMonth, execTodayOpened, execTodayClosed, ticketByStatusOpen, ticketByCustomer },
      activities: { thisMonthActivities, lastMonthActivities, activitiesByType, upcomingVisits },
      trends: { expenses: expenseTrend, expensesPending: expenseTrendPending, activities: activityTrend, offers: offerTrend, offersWonLost: offerWonLostTrend, expenseByCategory },
      recent: { activities: recentActivities, offers: recentOffers },
      salesActivities: { byType: salesActByType, thisMonth: salesActThisMonth, lastMonth: salesActLastMonth, recent: salesActRecent },
      contracts: { stats: contractStats, active: activeContracts, expiring: expiringContracts, byType: contractByType, valueActive: contractValueActive },
      hakedis: { year: hakedisYear, years: hakedisYears, monthly: hakedisMonthly, totals: hakedisTotals, bySektor: hakedisBySektor, byAnlasma: hakedisByAnlasma },
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Executive dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// STOK / DEPO YÖNETİMİ — Faz 2: hareket fişleri + onay akışı
// Fiş: taslak -> onay_bekliyor -> onayli -> iptal. Stok hareketi (stok_hareketler)
// YALNIZ onaylı fişten türetilir. Çıkış/transferde stok yeterlilik + depo işlem
// kuralı kontrolü onaylama anında yapılır.
// ═══════════════════════════════════════════════════════════════════
const { randomUUID: _stokUUID } = require('crypto');

// Bir deponun GENEL RAF'ı (raf seçilmemişse hareket/parti buraya yazılır).
const _genelRafCache = new Map();
function stokGenelRaf(depoId) {
  if (!depoId) return { id: null, ad: null };
  if (_genelRafCache.has(depoId)) return _genelRafCache.get(depoId);
  let r = db.prepare("SELECT id, ad, kod FROM stok_raflar WHERE depo_id=? AND (kod='GENEL' OR ad LIKE 'GENEL%') ORDER BY created_date LIMIT 1").get(depoId)
    || db.prepare("SELECT id, ad, kod FROM stok_raflar WHERE depo_id=? ORDER BY created_date LIMIT 1").get(depoId);
  const out = r ? { id: r.id, ad: r.ad || r.kod || 'GENEL RAF' } : { id: null, ad: null };
  if (out.id) _genelRafCache.set(depoId, out); // miss'i cache'leme (raf sonradan açılabilir)
  return out;
}

function stokMevcut(urunId, depoId, rafId) {
  if (!urunId || !depoId) return 0;
  let sql = "SELECT COALESCE(SUM(CASE WHEN tip='giris' THEN miktar ELSE -miktar END),0) AS m FROM stok_hareketler WHERE urun_id=? AND depo_id=?";
  const params = [urunId, depoId];
  if (rafId) { sql += " AND raf_id=?"; params.push(rafId); }
  return db.prepare(sql).get(...params).m || 0;
}

function stokFisNoUret(tip) {
  const pre = { giris: 'GRS', cikis: 'CKS', transfer: 'TRF', sayim: 'SAY', talep: 'TLP' }[tip] || 'FIS';
  const yil = new Date().getFullYear();
  const row = db.prepare("SELECT fis_no FROM stok_fisler WHERE fis_no LIKE ? ORDER BY fis_no DESC LIMIT 1").get(`${pre}-${yil}-%`);
  let next = 1;
  if (row && row.fis_no) {
    const n = parseInt(String(row.fis_no).split('-').pop(), 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${pre}-${yil}-${String(next).padStart(5, '0')}`;
}

function stokFisPerm(req, action) {
  const mods = ['stok_fisler', 'stok_giris', 'stok_cikis', 'stok_transfer'];
  return req.user?.role === 'admin' || mods.some((m) => checkPermission(db, req.user?.role, m, action));
}

function normalizeSatir(s) {
  const carpan = Number(s.carpan) || 1;
  const miktar = Number(s.miktar) || 0;
  const birim_fiyat = Number(s.birim_fiyat) || 0;
  return {
    urun_id: s.urun_id || null, urun_adi: s.urun_adi || null, urun_kodu: s.urun_kodu || null, barkod: s.barkod || null,
    kaynak_raf_id: s.kaynak_raf_id || null, kaynak_raf_adi: s.kaynak_raf_adi || null,
    hedef_raf_id: s.hedef_raf_id || null, hedef_raf_adi: s.hedef_raf_adi || null,
    birim: s.birim || null, carpan, miktar, miktar_ana_birim: miktar * carpan,
    birim_fiyat, tutar: birim_fiyat * miktar, icerik_aciklamasi: s.icerik_aciklamasi || null,
    lot_no: s.lot_no || null, uretim_tarihi: s.uretim_tarihi || null,
    raf_omru_ay: (s.raf_omru_ay === '' || s.raf_omru_ay == null) ? null : Number(s.raf_omru_ay),
    kontrol_tarihi: s.kontrol_tarihi || null, skt: s.skt || null,
    raf_omru_durumu: s.raf_omru_durumu || null, seri_no: s.seri_no || null,
  };
}

const _stokFisCols = ['fis_no','tip','tarih','durum','cari_id','cari_adi','kaynak_depo_id','kaynak_depo_adi','hedef_depo_id','hedef_depo_adi','hedef_saha_id','hedef_saha_adi','fatura_no','irsaliye_no','belge_no','aciklama','teslim_eden','teslim_alan','gonderim_adresi','kaynak_ref_tip','kaynak_ref_id','satir_sayisi','toplam_miktar','olusturan'];
const _stokSatCols = ['fis_id','urun_id','urun_adi','urun_kodu','barkod','kaynak_raf_id','kaynak_raf_adi','hedef_raf_id','hedef_raf_adi','birim','carpan','miktar','miktar_ana_birim','birim_fiyat','tutar','icerik_aciklamasi','lot_no','uretim_tarihi','raf_omru_ay','kontrol_tarihi','skt','raf_omru_durumu','seri_no'];

function insertStokFis(fisId, fis, satirlar, userEmail) {
  const now = new Date().toISOString();
  const durum = fis.durum === 'onay_bekliyor' ? 'onay_bekliyor' : 'taslak';
  const norm = satirlar.map(normalizeSatir);
  const toplam = norm.reduce((a, s) => a + s.miktar_ana_birim, 0);
  const fisRow = { ...fis, id: fisId, fis_no: stokFisNoUret(fis.tip), durum,
    tarih: fis.tarih || now.slice(0, 10), satir_sayisi: norm.length, toplam_miktar: toplam,
    olusturan: userEmail, created_by: userEmail, created_date: now, updated_date: now };
  const fCols = ['id', ..._stokFisCols, 'created_by', 'created_date', 'updated_date'];
  db.prepare(`INSERT INTO stok_fisler (${fCols.join(',')}) VALUES (${fCols.map((c) => '@' + c).join(',')})`)
    .run(Object.fromEntries(fCols.map((c) => [c, fisRow[c] ?? null])));
  const sCols = ['id', ..._stokSatCols, 'created_by', 'created_date', 'updated_date'];
  const insSat = db.prepare(`INSERT INTO stok_fis_satirlari (${sCols.join(',')}) VALUES (${sCols.map((c) => '@' + c).join(',')})`);
  for (const s of norm) {
    const r = { ...s, id: _stokUUID(), fis_id: fisId, created_by: userEmail, created_date: now, updated_date: now };
    insSat.run(Object.fromEntries(sCols.map((c) => [c, r[c] ?? null])));
  }
  return db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(fisId);
}

// ── Faz 3: FIFO parti mantığı ─────────────────────────────────────
// Onaylı giriş -> parti oluşur. Onaylı çıkış/transfer -> en eski uygun
// partiden (SKT, sonra giriş tarihi) düşülür (tahsis). Transferde tüketilen
// her parça hedef depoda yeni bir parti olarak açılır (lot/tarih/maliyet taşınır).
function stokPartiDurum(skt) {
  if (skt && String(skt).slice(0, 10) < new Date().toISOString().slice(0, 10)) return 'suresi_gecti';
  return 'acik';
}

function stokFifoUygula(fis, satirlar, userEmail) {
  const now = new Date().toISOString();
  const _kG = stokGenelRaf(fis.kaynak_depo_id), _hG = stokGenelRaf(fis.hedef_depo_id);
  for (const s of satirlar) {
    if (fis.tip !== 'giris' && !s.kaynak_raf_id && _kG.id) { s.kaynak_raf_id = _kG.id; s.kaynak_raf_adi = _kG.ad; }
    if (fis.tip !== 'cikis' && !s.hedef_raf_id && _hG.id) { s.hedef_raf_id = _hG.id; s.hedef_raf_adi = _hG.ad; }
  }
  const insParti = db.prepare(`INSERT INTO stok_partiler
    (id, urun_id, urun_adi, depo_id, depo_adi, raf_id, raf_adi, lot_no, uretim_tarihi, skt, kontrol_tarihi,
     giris_miktar, kalan_bakiye, alis_maliyeti, tedarikci_cari_id, tedarikci_adi, durum,
     kaynak_tip, kaynak_fis_id, kaynak_fis_no, kaynak_fis_satir_id, giris_tarihi, created_by, created_date, updated_date)
    VALUES (@id,@urun_id,@urun_adi,@depo_id,@depo_adi,@raf_id,@raf_adi,@lot_no,@uretim_tarihi,@skt,@kontrol_tarihi,
     @giris_miktar,@kalan_bakiye,@alis_maliyeti,@tedarikci_cari_id,@tedarikci_adi,@durum,
     @kaynak_tip,@kaynak_fis_id,@kaynak_fis_no,@kaynak_fis_satir_id,@giris_tarihi,@created_by,@cd,@ud)`);
  const insTahsis = db.prepare(`INSERT INTO stok_parti_tahsis
    (id, parti_id, cikis_fis_id, cikis_fis_no, cikis_fis_satir_id, urun_id, depo_id, dusulen_miktar, maliyet, tarih, created_by, created_date, updated_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updParti = db.prepare("UPDATE stok_partiler SET kalan_bakiye=?, durum=?, updated_date=? WHERE id=?");

  if (fis.tip === 'giris') {
    for (const s of satirlar) {
      const anaMaliyet = (Number(s.carpan) || 1) > 0 ? (Number(s.birim_fiyat) || 0) / (Number(s.carpan) || 1) : (Number(s.birim_fiyat) || 0);
      insParti.run({
        id: _stokUUID(), urun_id: s.urun_id, urun_adi: s.urun_adi,
        depo_id: fis.hedef_depo_id, depo_adi: fis.hedef_depo_adi,
        raf_id: s.hedef_raf_id || null, raf_adi: s.hedef_raf_adi || null,
        lot_no: s.lot_no || null, uretim_tarihi: s.uretim_tarihi || null, skt: s.skt || null, kontrol_tarihi: s.kontrol_tarihi || null,
        giris_miktar: s.miktar_ana_birim, kalan_bakiye: s.miktar_ana_birim, alis_maliyeti: anaMaliyet,
        tedarikci_cari_id: fis.cari_id || null, tedarikci_adi: fis.cari_adi || null, durum: stokPartiDurum(s.skt),
        kaynak_tip: 'giris', kaynak_fis_id: fis.id, kaynak_fis_no: fis.fis_no, kaynak_fis_satir_id: s.id,
        giris_tarihi: fis.tarih || now.slice(0, 10), created_by: userEmail, cd: now, ud: now,
      });
    }
    return;
  }

  // cikis / transfer -> FIFO tüketim
  for (const s of satirlar) {
    let ihtiyac = s.miktar_ana_birim;
    const acikPartiler = db.prepare(`SELECT * FROM stok_partiler
      WHERE urun_id=? AND depo_id=? AND durum!='kapali' AND kalan_bakiye > 0
      ${s.kaynak_raf_id ? 'AND (raf_id=? OR raf_id IS NULL)' : ''}
      ORDER BY COALESCE(NULLIF(skt,''),'9999-12-31'), COALESCE(giris_tarihi, created_date), created_date`).all(
      ...(s.kaynak_raf_id ? [s.urun_id, fis.kaynak_depo_id, s.kaynak_raf_id] : [s.urun_id, fis.kaynak_depo_id]));
    for (const p of acikPartiler) {
      if (ihtiyac <= 1e-9) break;
      const al = Math.min(p.kalan_bakiye, ihtiyac);
      const yeniKalan = +(p.kalan_bakiye - al).toFixed(6);
      updParti.run(yeniKalan, yeniKalan <= 1e-9 ? 'kapali' : (p.durum === 'suresi_gecti' ? 'suresi_gecti' : 'acik'), now, p.id);
      insTahsis.run(_stokUUID(), p.id, fis.id, fis.fis_no, s.id, s.urun_id, fis.kaynak_depo_id, al, p.alis_maliyeti, fis.tarih || now.slice(0, 10), userEmail, now, now);
      if (fis.tip === 'transfer') {
        insParti.run({
          id: _stokUUID(), urun_id: s.urun_id, urun_adi: s.urun_adi,
          depo_id: fis.hedef_depo_id, depo_adi: fis.hedef_depo_adi,
          raf_id: s.hedef_raf_id || null, raf_adi: s.hedef_raf_adi || null,
          lot_no: p.lot_no, uretim_tarihi: p.uretim_tarihi, skt: p.skt, kontrol_tarihi: p.kontrol_tarihi,
          giris_miktar: al, kalan_bakiye: al, alis_maliyeti: p.alis_maliyeti,
          tedarikci_cari_id: p.tedarikci_cari_id, tedarikci_adi: p.tedarikci_adi, durum: stokPartiDurum(p.skt),
          kaynak_tip: 'transfer', kaynak_fis_id: fis.id, kaynak_fis_no: fis.fis_no, kaynak_fis_satir_id: s.id,
          giris_tarihi: fis.tarih || now.slice(0, 10), created_by: userEmail, cd: now, ud: now,
        });
      }
      ihtiyac = +(ihtiyac - al).toFixed(6);
    }
    // Parti kapsamı yetmezse (parti/hareket senkron değilse) kalanı sessiz geç —
    // stok_hareketler zaten miktarı doğruladı; parti izi eksik kalır, FIFO Yeniden
    // Hesapla ile düzeltilebilir.
  }
}

// Bir fişin FIFO etkisini geri al (iptal). Fişin oluşturduğu partiler başkası
// tarafından tüketildiyse geri alma engellenir (çağıran kontrol eder).
function stokFifoGeriAl(fis) {
  const now = new Date().toISOString();
  // 1) Bu fişin yaptığı tahsisleri geri ver
  const tahsisler = db.prepare('SELECT * FROM stok_parti_tahsis WHERE cikis_fis_id=?').all(fis.id);
  for (const t of tahsisler) {
    const p = db.prepare('SELECT * FROM stok_partiler WHERE id=?').get(t.parti_id);
    if (p) {
      const yeniKalan = +(p.kalan_bakiye + t.dusulen_miktar).toFixed(6);
      db.prepare("UPDATE stok_partiler SET kalan_bakiye=?, durum=?, updated_date=? WHERE id=?")
        .run(yeniKalan, stokPartiDurum(p.skt), now, p.id);
    }
  }
  db.prepare('DELETE FROM stok_parti_tahsis WHERE cikis_fis_id=?').run(fis.id);
  // 2) Bu fişin oluşturduğu partileri sil (giriş partileri + transfer hedef partileri)
  db.prepare('DELETE FROM stok_partiler WHERE kaynak_fis_id=?').run(fis.id);
}

// Faz 7: onaylı giriş fişinde cari varsa alış fiyat geçmişi + tedarikçi eşleştirmesini güncelle
function stokFiyatGecmisiYaz(fis, satirlar, userEmail) {
  if (fis.tip !== 'giris' || !fis.cari_id) return;
  const now = new Date().toISOString();
  const insFG = db.prepare(`INSERT INTO stok_fiyat_gecmisi (id, urun_id, urun_adi, cari_id, cari_adi, alis_fiyati, para_birimi, tarih, kaynak, fis_no, created_by, created_date, updated_date)
    VALUES (?,?,?,?,?,?, 'TRY', ?, 'stok_giris', ?, ?, ?, ?)`);
  for (const s of satirlar) {
    if (!s.urun_id) continue;
    const anaFiyat = (Number(s.carpan) || 1) > 0 ? (Number(s.birim_fiyat) || 0) / (Number(s.carpan) || 1) : (Number(s.birim_fiyat) || 0);
    insFG.run(_stokUUID(), s.urun_id, s.urun_adi, fis.cari_id, fis.cari_adi || null, anaFiyat, fis.tarih || now.slice(0, 10), fis.fis_no, userEmail, now, now);
    const mevcut = db.prepare('SELECT id FROM stok_urun_tedarikci WHERE urun_id=? AND cari_id=?').get(s.urun_id, fis.cari_id);
    if (mevcut) {
      db.prepare("UPDATE stok_urun_tedarikci SET birim_fiyat=?, fiyat_tarihi=?, updated_date=? WHERE id=?").run(anaFiyat, fis.tarih || now.slice(0, 10), now, mevcut.id);
    } else {
      db.prepare(`INSERT INTO stok_urun_tedarikci (id, urun_id, urun_adi, cari_id, cari_adi, birim, birim_fiyat, para_birimi, fiyat_tarihi, aktif, created_by, created_date, updated_date)
        VALUES (?,?,?,?,?,?,?, 'TRY', ?, 1, ?, ?, ?)`).run(_stokUUID(), s.urun_id, s.urun_adi, fis.cari_id, fis.cari_adi || null, s.birim || 'ADET', anaFiyat, fis.tarih || now.slice(0, 10), userEmail, now, now);
    }
  }
}

// Bir fişin oluşturduğu parti başka fiş tarafından tüketilmiş mi?
function stokPartiKullanildiMi(fisId) {
  return !!db.prepare(`SELECT 1 FROM stok_parti_tahsis t JOIN stok_partiler p ON p.id=t.parti_id
    WHERE p.kaynak_fis_id=? AND t.cikis_fis_id<>? LIMIT 1`).get(fisId, fisId);
}

// Fiş + satırları tek transaction'da oluştur
app.post('/api/stok/fis', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  const { fis = {}, satirlar = [] } = req.body || {};
  if (!['giris', 'cikis', 'transfer'].includes(fis.tip)) return res.status(400).json({ error: 'Geçersiz fiş tipi' });
  if (!Array.isArray(satirlar) || satirlar.length === 0) return res.status(400).json({ error: 'En az bir ürün satırı gerekli' });
  if (fis.tip !== 'giris' && !fis.kaynak_depo_id) return res.status(400).json({ error: 'Kaynak depo zorunlu' });
  if (fis.tip === 'giris' && !fis.hedef_depo_id) return res.status(400).json({ error: 'Hedef depo zorunlu' });
  if (fis.tip === 'transfer' && !fis.hedef_depo_id) return res.status(400).json({ error: 'Hedef depo zorunlu' });
  if (fis.tip === 'cikis' && !fis.hedef_depo_id && !fis.hedef_saha_id) return res.status(400).json({ error: 'Hedef depo veya saha zorunlu' });
  try {
    let created;
    db.transaction(() => { created = insertStokFis(_stokUUID(), fis, satirlar, req.user.email); })();
    res.status(201).json(created);
  } catch (err) { console.error('[stok] fis olusturma:', err); res.status(500).json({ error: err.message }); }
});

// Fiş + satırlar birlikte
app.get('/api/stok/fis/:id', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const fis = db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(req.params.id);
  if (!fis) return res.status(404).json({ error: 'Fiş bulunamadı' });
  const satirlar = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=? ORDER BY created_date').all(fis.id);
  const hareketler = db.prepare('SELECT * FROM stok_hareketler WHERE fis_id=? ORDER BY created_date').all(fis.id);
  res.json({ ...fis, satirlar, hareketler });
});

// Taslak / onay bekleyen fişi güncelle (satırlar tümüyle değişir)
app.put('/api/stok/fis/:id', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const fis = db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(req.params.id);
  if (!fis) return res.status(404).json({ error: 'Fiş bulunamadı' });
  if (!['taslak', 'onay_bekliyor'].includes(fis.durum)) return res.status(400).json({ error: 'Sadece taslak/onay bekleyen fiş düzenlenebilir' });
  const { fis: fisData = {}, satirlar = [] } = req.body || {};
  if (!Array.isArray(satirlar) || satirlar.length === 0) return res.status(400).json({ error: 'En az bir ürün satırı gerekli' });
  try {
    const now = new Date().toISOString();
    const norm = satirlar.map(normalizeSatir);
    const toplam = norm.reduce((a, s) => a + s.miktar_ana_birim, 0);
    db.transaction(() => {
      const upd = {};
      for (const c of _stokFisCols) if (c in fisData && c !== 'tip' && c !== 'fis_no') upd[c] = fisData[c] ?? null;
      upd.satir_sayisi = norm.length; upd.toplam_miktar = toplam; upd.updated_date = now;
      if (fisData.durum === 'onay_bekliyor') upd.durum = 'onay_bekliyor';
      const keys = Object.keys(upd);
      db.prepare(`UPDATE stok_fisler SET ${keys.map((k) => k + '=@' + k).join(',')} WHERE id=@id`).run({ ...upd, id: fis.id });
      db.prepare('DELETE FROM stok_fis_satirlari WHERE fis_id=?').run(fis.id);
      const sCols = ['id', ..._stokSatCols, 'created_by', 'created_date', 'updated_date'];
      const insSat = db.prepare(`INSERT INTO stok_fis_satirlari (${sCols.join(',')}) VALUES (${sCols.map((c) => '@' + c).join(',')})`);
      for (const s of norm) {
        const r = { ...s, id: _stokUUID(), fis_id: fis.id, created_by: req.user.email, created_date: now, updated_date: now };
        insSat.run(Object.fromEntries(sCols.map((c) => [c, r[c] ?? null])));
      }
    })();
    const out = db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(fis.id);
    out.satirlar = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=? ORDER BY created_date').all(fis.id);
    res.json(out);
  } catch (err) { console.error('[stok] fis guncelleme:', err); res.status(500).json({ error: err.message }); }
});

// Fişi onayla -> stok_hareketler üret (stok yeterlilik + depo kuralı kontrolü)
app.post('/api/stok/fis/:id/onayla', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_edit')) return res.status(403).json({ error: 'Onaylama yetkiniz yok' });
  const fis = db.prepare('SELECT * FROM stok_fisler WHERE id=? AND (is_deleted=0 OR is_deleted IS NULL)').get(req.params.id);
  if (!fis) return res.status(404).json({ error: 'Fiş bulunamadı' });
  if (fis.durum === 'onayli') return res.status(400).json({ error: 'Fiş zaten onaylı' });
  if (fis.durum === 'iptal') return res.status(400).json({ error: 'İptal edilmiş fiş onaylanamaz' });
  const satirlar = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=?').all(fis.id);
  if (!satirlar.length) return res.status(400).json({ error: 'Fişte satır yok' });

  const depo = (id) => (id ? db.prepare('SELECT * FROM stok_depolar WHERE id=?').get(id) : null);
  const kd = depo(fis.kaynak_depo_id), hd = depo(fis.hedef_depo_id);
  if (fis.tip === 'giris' && hd && !hd.kural_giris) return res.status(400).json({ error: `"${hd.ad}" deposunda stok girişi kapalı` });
  if (fis.tip === 'cikis' && kd && !kd.kural_cikis) return res.status(400).json({ error: `"${kd.ad}" deposunda normal çıkış kapalı` });
  if (fis.tip === 'transfer' && ((kd && !kd.kural_transfer) || (hd && !hd.kural_transfer)))
    return res.status(400).json({ error: 'Transfer bu depo(lar) için kapalı' });

  if (fis.tip === 'cikis' || fis.tip === 'transfer') {
    const yetersiz = [];
    for (const s of satirlar) {
      const mevcut = stokMevcut(s.urun_id, fis.kaynak_depo_id, s.kaynak_raf_id || null);
      if (s.miktar_ana_birim > mevcut + 1e-9) yetersiz.push(`${s.urun_adi || s.urun_id}: gerekli ${s.miktar_ana_birim}, mevcut ${mevcut}`);
    }
    if (yetersiz.length) return res.status(400).json({ error: 'Yetersiz stok — onaylanamadı:\n' + yetersiz.join('\n') });
  }

  try {
    const now = new Date().toISOString();
    // Raf seçilmemişse ilgili deponun GENEL RAF'ını kullan (hareket + parti izi için).
    const kGenel = stokGenelRaf(fis.kaynak_depo_id), hGenel = stokGenelRaf(fis.hedef_depo_id);
    for (const s of satirlar) {
      if (fis.tip !== 'giris' && !s.kaynak_raf_id && kGenel.id) { s.kaynak_raf_id = kGenel.id; s.kaynak_raf_adi = kGenel.ad; }
      if (fis.tip !== 'cikis' && !s.hedef_raf_id && hGenel.id) { s.hedef_raf_id = hGenel.id; s.hedef_raf_adi = hGenel.ad; }
    }
    const insHrk = db.prepare(`INSERT INTO stok_hareketler
      (id, urun_id, urun_adi, depo_id, depo_adi, raf_id, raf_adi, tip, miktar, birim_maliyet,
       fis_id, fis_no, fis_tip, fis_satir_id, cari_id, saha_id, tarih, created_by, created_date, updated_date)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    db.transaction(() => {
      for (const s of satirlar) {
        if (fis.tip === 'giris') {
          insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.hedef_depo_id, fis.hedef_depo_adi,
            s.hedef_raf_id, s.hedef_raf_adi, 'giris', s.miktar_ana_birim, s.birim_fiyat,
            fis.id, fis.fis_no, fis.tip, s.id, fis.cari_id, null, fis.tarih, req.user.email, now, now);
        } else if (fis.tip === 'cikis') {
          insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.kaynak_depo_id, fis.kaynak_depo_adi,
            s.kaynak_raf_id, s.kaynak_raf_adi, 'cikis', s.miktar_ana_birim, s.birim_fiyat,
            fis.id, fis.fis_no, fis.tip, s.id, fis.cari_id, fis.hedef_saha_id, fis.tarih, req.user.email, now, now);
        } else {
          insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.kaynak_depo_id, fis.kaynak_depo_adi,
            s.kaynak_raf_id, s.kaynak_raf_adi, 'cikis', s.miktar_ana_birim, s.birim_fiyat,
            fis.id, fis.fis_no, fis.tip, s.id, null, null, fis.tarih, req.user.email, now, now);
          insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.hedef_depo_id, fis.hedef_depo_adi,
            s.hedef_raf_id, s.hedef_raf_adi, 'giris', s.miktar_ana_birim, s.birim_fiyat,
            fis.id, fis.fis_no, fis.tip, s.id, null, null, fis.tarih, req.user.email, now, now);
        }
      }
      // Faz 3: FIFO parti oluştur / tüket
      stokFifoUygula(fis, satirlar, req.user.email);
      // Faz 7: alış fiyat geçmişi + tedarikçi eşleştirme
      stokFiyatGecmisiYaz(fis, satirlar, req.user.email);
      db.prepare("UPDATE stok_fisler SET durum='onayli', onaylayan=?, onay_tarihi=?, updated_date=? WHERE id=?")
        .run(req.user.email, now, now, fis.id);
    })();
    res.json(db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(fis.id));
  } catch (err) { console.error('[stok] fis onaylama:', err); res.status(500).json({ error: err.message }); }
});

// Fişi iptal et -> onaylıysa stok hareketleri + FIFO partileri geri alınır
app.post('/api/stok/fis/:id/iptal', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_edit')) return res.status(403).json({ error: 'İptal yetkiniz yok' });
  const fis = db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(req.params.id);
  if (!fis) return res.status(404).json({ error: 'Fiş bulunamadı' });
  if (fis.durum === 'iptal') return res.status(400).json({ error: 'Fiş zaten iptal' });
  if (fis.durum === 'onayli' && stokPartiKullanildiMi(fis.id)) {
    return res.status(400).json({ error: 'Bu fişin oluşturduğu partiler sonraki çıkış/transfer işlemlerinde kullanılmış. Önce o hareketleri iptal edin.' });
  }
  try {
    const now = new Date().toISOString();
    db.transaction(() => {
      if (fis.durum === 'onayli') {
        stokFifoGeriAl(fis);
        db.prepare('DELETE FROM stok_hareketler WHERE fis_id=?').run(fis.id);
      }
      db.prepare("UPDATE stok_fisler SET durum='iptal', updated_date=? WHERE id=?").run(now, fis.id);
    })();
    res.json(db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(fis.id));
  } catch (err) { console.error('[stok] fis iptal:', err); res.status(500).json({ error: err.message }); }
});

// Bir ürünün depodaki (opsiyonel raf) mevcut stoğu
app.get('/api/stok/stok-durum', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { urun_id, depo_id, raf_id } = req.query;
  if (!urun_id || !depo_id) return res.status(400).json({ error: 'urun_id ve depo_id gerekli' });
  res.json({ urun_id, depo_id, raf_id: raf_id || null, mevcut: stokMevcut(urun_id, depo_id, raf_id || null) });
});

// Fiş listesi özeti (KPI sayaçları)
app.get('/api/stok/fis-ozet', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const ND = "(is_deleted=0 OR is_deleted IS NULL)";
    const c = (w) => db.prepare(`SELECT COUNT(*) n FROM stok_fisler WHERE ${ND}${w ? ' AND ' + w : ''}`).get().n;
    res.json({
      toplam: c(''), giris: c("tip='giris'"), cikis: c("tip='cikis'"), transfer: c("tip='transfer'"),
      taslak: c("durum='taslak'"), onay_bekliyor: c("durum='onay_bekliyor'"),
      onayli: c("durum='onayli'"), iptal: c("durum='iptal'"),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Faz 3: parti / raf ömrü ─────────────────────────────────────
function stokPartiPerm(req, action) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_parti_takibi', action) || stokFisPerm(req, action);
}

app.get('/api/stok/partiler', authMiddleware, (req, res) => {
  if (!stokPartiPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { q, urun_id, depo_id, durum, skt1, skt2 } = req.query;
    const cond = [], params = [];
    if (urun_id) { cond.push('urun_id=?'); params.push(urun_id); }
    if (depo_id) { cond.push('depo_id=?'); params.push(depo_id); }
    if (durum === 'acik') cond.push("durum!='kapali' AND kalan_bakiye>0");
    else if (durum && durum !== 'hepsi') { cond.push('durum=?'); params.push(durum); }
    if (skt1) { cond.push('skt>=?'); params.push(skt1); }
    if (skt2) { cond.push('skt<=?'); params.push(skt2); }
    if (q) { cond.push('(lot_no LIKE ? OR urun_adi LIKE ? OR tedarikci_adi LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM stok_partiler ${where} ORDER BY COALESCE(NULLIF(skt,''),'9999-12-31'), giris_tarihi LIMIT 3000`).all(...params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/parti-ozet', authMiddleware, (req, res) => {
  if (!stokPartiPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const bugun = new Date().toISOString().slice(0, 10);
    const acik = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(kalan_bakiye),0) m FROM stok_partiler WHERE durum!='kapali' AND kalan_bakiye>0").get();
    const suresiGecen = db.prepare("SELECT COUNT(*) n FROM stok_partiler WHERE durum!='kapali' AND kalan_bakiye>0 AND skt IS NOT NULL AND skt<>'' AND substr(skt,1,10) < ?").get(bugun).n;
    const suresiYaklasan = db.prepare("SELECT COUNT(*) n FROM stok_partiler WHERE durum!='kapali' AND kalan_bakiye>0 AND skt IS NOT NULL AND skt<>'' AND substr(skt,1,10) >= ? AND substr(skt,1,10) <= date(?, '+30 days')").get(bugun, bugun).n;
    const kontrolGelen = db.prepare("SELECT COUNT(*) n FROM stok_partiler WHERE durum!='kapali' AND kalan_bakiye>0 AND kontrol_tarihi IS NOT NULL AND kontrol_tarihi<>'' AND substr(kontrol_tarihi,1,10) <= ?").get(bugun).n;
    res.json({ acik_parti: acik.n, acik_miktar: acik.m, suresi_gecen: suresiGecen, suresi_yaklasan: suresiYaklasan, kontrol_tarihi_gelen: kontrolGelen });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIFO Yeniden Hesapla (admin): tüm parti/tahsis silinir, onaylı giriş fişlerinden
// partiler yeniden kurulur, sonra onaylı çıkış/transfer fişleri tarih sırasıyla FIFO uygulanır.
app.post('/api/stok/fifo-yeniden-hesapla', authMiddleware, (req, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Sadece admin' });
  try {
    let sonuc = { parti: 0, tahsis: 0, fis: 0 };
    db.transaction(() => {
      db.prepare('DELETE FROM stok_parti_tahsis').run();
      db.prepare('DELETE FROM stok_partiler').run();
      const fisler = db.prepare("SELECT * FROM stok_fisler WHERE durum='onayli' AND (is_deleted=0 OR is_deleted IS NULL) ORDER BY COALESCE(tarih, created_date), created_date").all();
      for (const f of fisler) {
        const sats = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=?').all(f.id);
        if (!sats.length) continue;
        stokFifoUygula(f, sats, req.user.email);
        sonuc.fis++;
      }
      sonuc.parti = db.prepare('SELECT COUNT(*) n FROM stok_partiler').get().n;
      sonuc.tahsis = db.prepare('SELECT COUNT(*) n FROM stok_parti_tahsis').get().n;
      // SKT geçmiş açık partileri işaretle
      db.prepare("UPDATE stok_partiler SET durum='suresi_gecti' WHERE durum='acik' AND skt IS NOT NULL AND skt<>'' AND substr(skt,1,10) < ?").run(new Date().toISOString().slice(0, 10));
    })();
    res.json({ ok: true, ...sonuc });
  } catch (err) { console.error('[stok] fifo yeniden hesapla:', err); res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOK Faz 4: Fiziksel Sayım / Envanter
// ═══════════════════════════════════════════════════════════════════
function stokSayimPerm(req, action) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_sayim', action);
}
function stokDepoStokListe(depoId) {
  return db.prepare(`SELECT h.urun_id,
      COALESCE(MAX(h.urun_adi), (SELECT ad FROM stok_urunler WHERE id=h.urun_id)) AS urun_adi,
      COALESCE(SUM(CASE WHEN h.tip='giris' THEN h.miktar ELSE -h.miktar END),0) AS sistem_miktar
    FROM stok_hareketler h WHERE h.depo_id=? GROUP BY h.urun_id`).all(depoId);
}

app.post('/api/stok/sayim', authMiddleware, (req, res) => {
  if (!stokSayimPerm(req, 'can_add')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { depo_id, tarih, tip, aciklama, doldur } = req.body || {};
  if (!depo_id) return res.status(400).json({ error: 'Depo zorunlu' });
  try {
    const depo = db.prepare('SELECT * FROM stok_depolar WHERE id=?').get(depo_id);
    const now = new Date().toISOString();
    const id = _stokUUID();
    const yil = new Date().getFullYear();
    const row = db.prepare("SELECT sayim_no FROM stok_sayimlar WHERE sayim_no LIKE ? ORDER BY sayim_no DESC LIMIT 1").get(`SAY-${yil}-%`);
    let n = 1; if (row) { const x = parseInt(String(row.sayim_no).split('-').pop(), 10); if (Number.isFinite(x)) n = x + 1; }
    const sayimNo = `SAY-${yil}-${String(n).padStart(5, '0')}`;
    let satirlar = [];
    db.transaction(() => {
      db.prepare(`INSERT INTO stok_sayimlar (id, sayim_no, depo_id, depo_adi, tarih, tip, durum, aciklama, olusturan, created_by, created_date, updated_date)
        VALUES (?,?,?,?,?,?, 'taslak', ?, ?, ?, ?, ?)`).run(id, sayimNo, depo_id, depo?.ad || null, tarih || now.slice(0, 10), tip || 'tam', aciklama || null, req.user.email, req.user.email, now, now);
      if (doldur) {
        const stoklar = stokDepoStokListe(depo_id);
        const ins = db.prepare(`INSERT INTO stok_sayim_satirlari (id, sayim_id, urun_id, urun_adi, sistem_miktar, sayilan_miktar, fark, created_by, created_date, updated_date)
          VALUES (?,?,?,?,?,?,?,?,?,?)`);
        for (const s of stoklar) ins.run(_stokUUID(), id, s.urun_id, s.urun_adi, s.sistem_miktar, null, 0, req.user.email, now, now);
        db.prepare('UPDATE stok_sayimlar SET satir_sayisi=? WHERE id=?').run(stoklar.length, id);
        satirlar = stoklar;
      }
    })();
    const out = db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(id);
    out.satirlar = db.prepare('SELECT * FROM stok_sayim_satirlari WHERE sayim_id=?').all(id);
    res.status(201).json(out);
  } catch (err) { console.error('[stok] sayim olusturma:', err); res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/sayim/:id', authMiddleware, (req, res) => {
  if (!stokSayimPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const s = db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Sayım bulunamadı' });
  s.satirlar = db.prepare('SELECT * FROM stok_sayim_satirlari WHERE sayim_id=? ORDER BY urun_adi').all(s.id);
  res.json(s);
});

// Sayılan miktarları kaydet (satır güncelleme)
app.put('/api/stok/sayim/:id', authMiddleware, (req, res) => {
  if (!stokSayimPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const s = db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Sayım bulunamadı' });
  if (['tamamlandi', 'iptal'].includes(s.durum)) return res.status(400).json({ error: 'Bu sayım düzenlenemez' });
  const { satirlar = [], aciklama, durum } = req.body || {};
  try {
    const now = new Date().toISOString();
    let farkli = 0;
    db.transaction(() => {
      const upd = db.prepare("UPDATE stok_sayim_satirlari SET sayilan_miktar=?, fark=?, sayan=?, not_=?, updated_date=? WHERE id=? AND sayim_id=?");
      for (const r of satirlar) {
        const say = (r.sayilan_miktar === '' || r.sayilan_miktar == null) ? null : Number(r.sayilan_miktar);
        const fark = say == null ? 0 : +(say - (Number(r.sistem_miktar) || 0)).toFixed(6);
        if (fark !== 0) farkli++;
        upd.run(say, fark, req.user.email, r.not_ || null, now, r.id, s.id);
      }
      db.prepare("UPDATE stok_sayimlar SET aciklama=COALESCE(?,aciklama), durum=?, farkli_satir=?, updated_date=? WHERE id=?")
        .run(aciklama ?? null, durum && ['sayiliyor', 'fark_onay'].includes(durum) ? durum : s.durum, farkli, now, s.id);
    })();
    const out = db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(s.id);
    out.satirlar = db.prepare('SELECT * FROM stok_sayim_satirlari WHERE sayim_id=? ORDER BY urun_adi').all(s.id);
    res.json(out);
  } catch (err) { console.error('[stok] sayim guncelleme:', err); res.status(500).json({ error: err.message }); }
});

// Sayımı tamamla -> farklar için otomatik düzeltme fişi (giriş: fazla, çıkış: eksik) + onayla
app.post('/api/stok/sayim/:id/tamamla', authMiddleware, (req, res) => {
  if (!stokSayimPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const s = db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Sayım bulunamadı' });
  if (s.durum === 'tamamlandi') return res.status(400).json({ error: 'Sayım zaten tamamlandı' });
  if (s.durum === 'iptal') return res.status(400).json({ error: 'İptal sayım tamamlanamaz' });
  const satirlar = db.prepare('SELECT * FROM stok_sayim_satirlari WHERE sayim_id=?').all(s.id);
  const fazla = satirlar.filter((r) => Number(r.fark) > 1e-9);
  const eksik = satirlar.filter((r) => Number(r.fark) < -1e-9);
  try {
    const now = new Date().toISOString();
    let girisId = null, cikisId = null;
    db.transaction(() => {
      const urunFiyat = (id) => db.prepare('SELECT alis_fiyati, ana_birim FROM stok_urunler WHERE id=?').get(id) || {};
      if (fazla.length) {
        const g = insertStokFis(_stokUUID(), { tip: 'giris', tarih: s.tarih, hedef_depo_id: s.depo_id, hedef_depo_adi: s.depo_adi,
          belge_no: s.sayim_no, aciklama: `Sayım fazlası düzeltmesi (${s.sayim_no})` },
          fazla.map((r) => { const uf = urunFiyat(r.urun_id); return { urun_id: r.urun_id, urun_adi: r.urun_adi, birim: uf.ana_birim || 'ADET', carpan: 1, miktar: Number(r.fark), birim_fiyat: uf.alis_fiyati || 0, raf_omru_durumu: 'Raf ömrü uygulanmaz' }; }), req.user.email);
        const gs = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=?').all(g.id);
        stokFifoUygulaSayim(g, gs, req.user.email);
        db.prepare("UPDATE stok_fisler SET durum='onayli', onaylayan=?, onay_tarihi=?, updated_date=? WHERE id=?").run(req.user.email, now, now, g.id);
        girisId = g.id;
      }
      if (eksik.length) {
        const c = insertStokFis(_stokUUID(), { tip: 'cikis', tarih: s.tarih, kaynak_depo_id: s.depo_id, kaynak_depo_adi: s.depo_adi,
          hedef_depo_id: s.depo_id, hedef_depo_adi: s.depo_adi, belge_no: s.sayim_no, aciklama: `Sayım eksiği düzeltmesi (${s.sayim_no})` },
          eksik.map((r) => { const uf = urunFiyat(r.urun_id); return { urun_id: r.urun_id, urun_adi: r.urun_adi, birim: uf.ana_birim || 'ADET', carpan: 1, miktar: Math.abs(Number(r.fark)), birim_fiyat: uf.alis_fiyati || 0 }; }), req.user.email);
        const cs = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=?').all(c.id);
        stokFifoUygulaSayim(c, cs, req.user.email);
        db.prepare("UPDATE stok_fisler SET durum='onayli', onaylayan=?, onay_tarihi=?, updated_date=? WHERE id=?").run(req.user.email, now, now, c.id);
        cikisId = c.id;
      }
      db.prepare("UPDATE stok_sayimlar SET durum='tamamlandi', onaylayan=?, tamamlanma_tarihi=?, duzeltme_giris_fis_id=?, duzeltme_cikis_fis_id=?, farkli_satir=?, updated_date=? WHERE id=?")
        .run(req.user.email, now, girisId, cikisId, fazla.length + eksik.length, now, s.id);
    })();
    res.json({ ok: true, sayim: db.prepare('SELECT * FROM stok_sayimlar WHERE id=?').get(s.id), fazla: fazla.length, eksik: eksik.length });
  } catch (err) { console.error('[stok] sayim tamamla:', err); res.status(500).json({ error: err.message }); }
});

// stokFifoUygula ile aynı ama hareketleri de yazar (sayım düzeltme fişi için)
function stokFifoUygulaSayim(fis, satirlar, userEmail) {
  const now = new Date().toISOString();
  const kGenel = stokGenelRaf(fis.kaynak_depo_id), hGenel = stokGenelRaf(fis.hedef_depo_id);
  for (const s of satirlar) {
    if (fis.tip !== 'giris' && !s.kaynak_raf_id && kGenel.id) { s.kaynak_raf_id = kGenel.id; s.kaynak_raf_adi = kGenel.ad; }
    if (fis.tip !== 'cikis' && !s.hedef_raf_id && hGenel.id) { s.hedef_raf_id = hGenel.id; s.hedef_raf_adi = hGenel.ad; }
  }
  const insHrk = db.prepare(`INSERT INTO stok_hareketler
    (id, urun_id, urun_adi, depo_id, depo_adi, raf_id, raf_adi, tip, miktar, birim_maliyet,
     fis_id, fis_no, fis_tip, fis_satir_id, cari_id, saha_id, tarih, created_by, created_date, updated_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const s of satirlar) {
    if (fis.tip === 'giris') {
      insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.hedef_depo_id, fis.hedef_depo_adi, s.hedef_raf_id, s.hedef_raf_adi,
        'giris', s.miktar_ana_birim, s.birim_fiyat, fis.id, fis.fis_no, fis.tip, s.id, null, null, fis.tarih, userEmail, now, now);
    } else {
      insHrk.run(_stokUUID(), s.urun_id, s.urun_adi, fis.kaynak_depo_id, fis.kaynak_depo_adi, s.kaynak_raf_id, s.kaynak_raf_adi,
        'cikis', s.miktar_ana_birim, s.birim_fiyat, fis.id, fis.fis_no, fis.tip, s.id, null, null, fis.tarih, userEmail, now, now);
    }
  }
  stokFifoUygula(fis, satirlar, userEmail);
}

app.get('/api/stok/sayim-ozet', authMiddleware, (req, res) => {
  if (!stokSayimPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const ND = "(is_deleted=0 OR is_deleted IS NULL)";
    const c = (w) => db.prepare(`SELECT COUNT(*) n FROM stok_sayimlar WHERE ${ND}${w ? ' AND ' + w : ''}`).get().n;
    res.json({ toplam: c(''), taslak: c("durum IN ('taslak','sayiliyor','fark_onay')"), tamamlandi: c("durum='tamamlandi'") });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOK Faz 5: Malzeme Talep / İş Emri
// Talep -> onay -> onaylı talepten çıkış fişi türetilir (kısmi sevk destekli).
// ═══════════════════════════════════════════════════════════════════
function stokTalepPerm(req, action) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_talep', action);
}
function stokTalepNoUret() {
  const yil = new Date().getFullYear();
  const row = db.prepare("SELECT talep_no FROM stok_talepler WHERE talep_no LIKE ? ORDER BY talep_no DESC LIMIT 1").get(`TLP-${yil}-%`);
  let n = 1; if (row) { const x = parseInt(String(row.talep_no).split('-').pop(), 10); if (Number.isFinite(x)) n = x + 1; }
  return `TLP-${yil}-${String(n).padStart(5, '0')}`;
}
function stokTalepYaz(id, t, satirlar, userEmail) {
  const now = new Date().toISOString();
  const durum = t.durum === 'onay_bekliyor' ? 'onay_bekliyor' : 'taslak';
  db.prepare(`INSERT INTO stok_talepler (id, talep_no, talep_eden, departman, hedef_saha_id, hedef_saha_adi,
      kaynak_depo_id, kaynak_depo_adi, is_emri_no, tarih, ihtiyac_tarihi, oncelik, durum, aciklama, satir_sayisi,
      olusturan, created_by, created_date, updated_date)
    VALUES (@id,@talep_no,@talep_eden,@departman,@hedef_saha_id,@hedef_saha_adi,@kaynak_depo_id,@kaynak_depo_adi,
      @is_emri_no,@tarih,@ihtiyac_tarihi,@oncelik,@durum,@aciklama,@satir_sayisi,@olusturan,@created_by,@cd,@ud)`).run({
    id, talep_no: stokTalepNoUret(), talep_eden: t.talep_eden || userEmail, departman: t.departman || null,
    hedef_saha_id: t.hedef_saha_id || null, hedef_saha_adi: t.hedef_saha_adi || null,
    kaynak_depo_id: t.kaynak_depo_id || null, kaynak_depo_adi: t.kaynak_depo_adi || null,
    is_emri_no: t.is_emri_no || null, tarih: t.tarih || now.slice(0, 10), ihtiyac_tarihi: t.ihtiyac_tarihi || null,
    oncelik: t.oncelik || 'orta', durum, aciklama: t.aciklama || null, satir_sayisi: satirlar.length,
    olusturan: userEmail, created_by: userEmail, cd: now, ud: now,
  });
  const ins = db.prepare(`INSERT INTO stok_talep_satirlari (id, talep_id, urun_id, urun_adi, urun_kodu, miktar, birim, karsilanan_miktar, not_, created_by, created_date, updated_date)
    VALUES (?,?,?,?,?,?,?,0,?,?,?,?)`);
  for (const s of satirlar) ins.run(_stokUUID(), id, s.urun_id || null, s.urun_adi || null, s.urun_kodu || null, Number(s.miktar) || 0, s.birim || null, s.not_ || null, userEmail, now, now);
  return db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(id);
}

app.post('/api/stok/talep', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_add')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { talep = {}, satirlar = [] } = req.body || {};
  if (!Array.isArray(satirlar) || !satirlar.some((s) => s.urun_id && Number(s.miktar) > 0)) return res.status(400).json({ error: 'En az bir ürün satırı gerekli' });
  try {
    let out;
    db.transaction(() => { out = stokTalepYaz(_stokUUID(), talep, satirlar.filter((s) => s.urun_id && Number(s.miktar) > 0), req.user.email); })();
    out.satirlar = db.prepare('SELECT * FROM stok_talep_satirlari WHERE talep_id=?').all(out.id);
    res.status(201).json(out);
  } catch (err) { console.error('[stok] talep olusturma:', err); res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/talep/:id', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const t = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Talep bulunamadı' });
  t.satirlar = db.prepare('SELECT * FROM stok_talep_satirlari WHERE talep_id=? ORDER BY urun_adi').all(t.id);
  t.sevk_fisleri = db.prepare("SELECT id, fis_no, tarih, durum, toplam_miktar FROM stok_fisler WHERE kaynak_ref_tip='talep' AND kaynak_ref_id=? ORDER BY created_date").all(t.id);
  res.json(t);
});

app.put('/api/stok/talep/:id', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const t = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Talep bulunamadı' });
  if (!['taslak', 'onay_bekliyor'].includes(t.durum)) return res.status(400).json({ error: 'Sadece taslak/onay bekleyen talep düzenlenebilir' });
  const { talep = {}, satirlar = [] } = req.body || {};
  const temiz = (satirlar || []).filter((s) => s.urun_id && Number(s.miktar) > 0);
  if (!temiz.length) return res.status(400).json({ error: 'En az bir ürün satırı gerekli' });
  try {
    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`UPDATE stok_talepler SET departman=@departman, hedef_saha_id=@hedef_saha_id, hedef_saha_adi=@hedef_saha_adi,
        kaynak_depo_id=@kaynak_depo_id, kaynak_depo_adi=@kaynak_depo_adi, is_emri_no=@is_emri_no, ihtiyac_tarihi=@ihtiyac_tarihi,
        oncelik=@oncelik, aciklama=@aciklama, satir_sayisi=@n, durum=@durum, updated_date=@ud WHERE id=@id`).run({
        id: t.id, departman: talep.departman ?? t.departman, hedef_saha_id: talep.hedef_saha_id ?? t.hedef_saha_id,
        hedef_saha_adi: talep.hedef_saha_adi ?? t.hedef_saha_adi, kaynak_depo_id: talep.kaynak_depo_id ?? t.kaynak_depo_id,
        kaynak_depo_adi: talep.kaynak_depo_adi ?? t.kaynak_depo_adi, is_emri_no: talep.is_emri_no ?? t.is_emri_no,
        ihtiyac_tarihi: talep.ihtiyac_tarihi ?? t.ihtiyac_tarihi, oncelik: talep.oncelik ?? t.oncelik,
        aciklama: talep.aciklama ?? t.aciklama, n: temiz.length,
        durum: talep.durum === 'onay_bekliyor' ? 'onay_bekliyor' : t.durum, ud: now,
      });
      db.prepare('DELETE FROM stok_talep_satirlari WHERE talep_id=?').run(t.id);
      const ins = db.prepare(`INSERT INTO stok_talep_satirlari (id, talep_id, urun_id, urun_adi, urun_kodu, miktar, birim, karsilanan_miktar, not_, created_by, created_date, updated_date)
        VALUES (?,?,?,?,?,?,?,0,?,?,?,?)`);
      for (const s of temiz) ins.run(_stokUUID(), t.id, s.urun_id, s.urun_adi || null, s.urun_kodu || null, Number(s.miktar) || 0, s.birim || null, s.not_ || null, req.user.email, now, now);
    })();
    const out = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(t.id);
    out.satirlar = db.prepare('SELECT * FROM stok_talep_satirlari WHERE talep_id=?').all(t.id);
    res.json(out);
  } catch (err) { console.error('[stok] talep guncelleme:', err); res.status(500).json({ error: err.message }); }
});

app.post('/api/stok/talep/:id/onayla', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_edit')) return res.status(403).json({ error: 'Onaylama yetkiniz yok' });
  const t = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Talep bulunamadı' });
  if (t.durum === 'iptal') return res.status(400).json({ error: 'İptal talep onaylanamaz' });
  const now = new Date().toISOString();
  db.prepare("UPDATE stok_talepler SET durum='onayli', onaylayan=?, onay_tarihi=?, updated_date=? WHERE id=?").run(req.user.email, now, now, t.id);
  res.json(db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(t.id));
});

app.post('/api/stok/talep/:id/iptal', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const t = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Talep bulunamadı' });
  db.prepare("UPDATE stok_talepler SET durum='iptal', updated_date=? WHERE id=?").run(new Date().toISOString(), t.id);
  res.json(db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(t.id));
});

// Onaylı talepten çıkış fişi türet (kısmi sevk). body.satirlar: [{talep_satir_id, miktar}]
// verilmezse her satırın kalan (miktar - karsilanan_miktar) kadarı sevk edilir.
app.post('/api/stok/talep/:id/sevk', authMiddleware, (req, res) => {
  if (!stokFisPerm(req, 'can_add')) return res.status(403).json({ error: 'Sevk (çıkış fişi) yetkiniz yok' });
  const t = db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Talep bulunamadı' });
  if (!['onayli', 'kismen_sevk'].includes(t.durum)) return res.status(400).json({ error: 'Sadece onaylı talep sevk edilebilir' });
  if (!t.kaynak_depo_id) return res.status(400).json({ error: 'Talebe kaynak depo atanmamış' });
  const satirlar = db.prepare('SELECT * FROM stok_talep_satirlari WHERE talep_id=?').all(t.id);
  const istenen = req.body?.satirlar || null;
  const sevkSatir = [];
  for (const s of satirlar) {
    const kalan = +(Number(s.miktar) - Number(s.karsilanan_miktar || 0)).toFixed(6);
    let m = kalan;
    if (istenen) { const x = istenen.find((i) => i.talep_satir_id === s.id); m = x ? Math.min(Number(x.miktar) || 0, kalan) : 0; }
    if (m > 1e-9) sevkSatir.push({ satir: s, miktar: m });
  }
  if (!sevkSatir.length) return res.status(400).json({ error: 'Sevk edilecek miktar yok' });
  try {
    const now = new Date().toISOString();
    let fis;
    db.transaction(() => {
      const uf = (id) => db.prepare('SELECT satis_fiyati, ana_birim FROM stok_urunler WHERE id=?').get(id) || {};
      fis = insertStokFis(_stokUUID(), {
        tip: 'cikis', tarih: now.slice(0, 10), kaynak_depo_id: t.kaynak_depo_id, kaynak_depo_adi: t.kaynak_depo_adi,
        hedef_saha_id: t.hedef_saha_id, hedef_saha_adi: t.hedef_saha_adi,
        belge_no: `${t.talep_no}${t.is_emri_no ? ' / ' + t.is_emri_no : ''}`, aciklama: `Malzeme talebi sevki (${t.talep_no})`,
        kaynak_ref_tip: 'talep', kaynak_ref_id: t.id,
      }, sevkSatir.map(({ satir, miktar }) => { const f = uf(satir.urun_id); return { urun_id: satir.urun_id, urun_adi: satir.urun_adi, urun_kodu: satir.urun_kodu, birim: satir.birim || f.ana_birim || 'ADET', carpan: 1, miktar, birim_fiyat: f.satis_fiyati || 0 }; }), req.user.email);
      // stok yeterlilik
      const fSat = db.prepare('SELECT * FROM stok_fis_satirlari WHERE fis_id=?').all(fis.id);
      const yetersiz = [];
      for (const fs of fSat) {
        const mevcut = stokMevcut(fs.urun_id, t.kaynak_depo_id, null);
        if (fs.miktar_ana_birim > mevcut + 1e-9) yetersiz.push(`${fs.urun_adi}: gerekli ${fs.miktar_ana_birim}, mevcut ${mevcut}`);
      }
      if (yetersiz.length) { const e = new Error('Yetersiz stok:\n' + yetersiz.join('\n')); e.stok = true; throw e; }
      const kGenel = stokGenelRaf(t.kaynak_depo_id);
      for (const fs of fSat) if (!fs.kaynak_raf_id && kGenel.id) { fs.kaynak_raf_id = kGenel.id; fs.kaynak_raf_adi = kGenel.ad; }
      const insHrk = db.prepare(`INSERT INTO stok_hareketler (id, urun_id, urun_adi, depo_id, depo_adi, raf_id, raf_adi, tip, miktar, birim_maliyet, fis_id, fis_no, fis_tip, fis_satir_id, cari_id, saha_id, tarih, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      for (const fs of fSat) insHrk.run(_stokUUID(), fs.urun_id, fs.urun_adi, t.kaynak_depo_id, t.kaynak_depo_adi, fs.kaynak_raf_id, fs.kaynak_raf_adi, 'cikis', fs.miktar_ana_birim, fs.birim_fiyat, fis.id, fis.fis_no, 'cikis', fs.id, null, t.hedef_saha_id, fis.tarih, req.user.email, now, now);
      stokFifoUygula({ ...fis, tip: 'cikis', kaynak_depo_id: t.kaynak_depo_id, hedef_saha_id: t.hedef_saha_id }, fSat, req.user.email);
      db.prepare("UPDATE stok_fisler SET durum='onayli', onaylayan=?, onay_tarihi=?, updated_date=? WHERE id=?").run(req.user.email, now, now, fis.id);
      // karsilanan_miktar güncelle
      const updSat = db.prepare("UPDATE stok_talep_satirlari SET karsilanan_miktar=karsilanan_miktar+?, updated_date=? WHERE id=?");
      for (const { satir, miktar } of sevkSatir) updSat.run(miktar, now, satir.id);
      const kalanToplam = db.prepare("SELECT COALESCE(SUM(miktar - karsilanan_miktar),0) k FROM stok_talep_satirlari WHERE talep_id=?").get(t.id).k;
      db.prepare("UPDATE stok_talepler SET durum=?, updated_date=? WHERE id=?").run(kalanToplam <= 1e-9 ? 'sevk_edildi' : 'kismen_sevk', now, t.id);
    })();
    res.json({ ok: true, fis: db.prepare('SELECT * FROM stok_fisler WHERE id=?').get(fis.id), talep: db.prepare('SELECT * FROM stok_talepler WHERE id=?').get(t.id) });
  } catch (err) {
    if (err.stok) return res.status(400).json({ error: err.message });
    console.error('[stok] talep sevk:', err); res.status(500).json({ error: err.message });
  }
});

app.get('/api/stok/talep-ozet', authMiddleware, (req, res) => {
  if (!stokTalepPerm(req, 'can_view')) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const ND = "(is_deleted=0 OR is_deleted IS NULL)";
    const c = (w) => db.prepare(`SELECT COUNT(*) n FROM stok_talepler WHERE ${ND}${w ? ' AND ' + w : ''}`).get().n;
    res.json({ toplam: c(''), bekleyen: c("durum IN ('taslak','onay_bekliyor')"), onayli: c("durum='onayli'"), kismen: c("durum='kismen_sevk'"), sevk: c("durum='sevk_edildi'") });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOK Faz 6: Raporlar (salt okuma; stok_hareketler + stok_partiler üzerinden)
// ═══════════════════════════════════════════════════════════════════
function stokRaporPerm(req) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_raporlar', 'can_view') || stokFisPerm(req, 'can_view');
}

app.get('/api/stok/rapor/durum', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { depo_id, urun_id, raf_id, mode, q } = req.query;
    const cond = [], params = [];
    if (depo_id) { cond.push('h.depo_id=?'); params.push(depo_id); }
    if (urun_id) { cond.push('h.urun_id=?'); params.push(urun_id); }
    if (raf_id) { cond.push('h.raf_id=?'); params.push(raf_id); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    let rows = db.prepare(`SELECT h.depo_id, MAX(h.depo_adi) depo_adi, h.raf_id, MAX(h.raf_adi) raf_adi,
        h.urun_id, MAX(h.urun_adi) urun_adi,
        COALESCE(SUM(CASE WHEN h.tip='giris' THEN h.miktar ELSE 0 END),0) giren,
        COALESCE(SUM(CASE WHEN h.tip='cikis' THEN h.miktar ELSE 0 END),0) cikan,
        COALESCE(SUM(CASE WHEN h.tip='giris' THEN h.miktar ELSE -h.miktar END),0) mevcut
      FROM stok_hareketler h ${where}
      GROUP BY h.depo_id, h.raf_id, h.urun_id
      ORDER BY MAX(h.depo_adi), MAX(h.urun_adi)`).all(...params);
    // ürün grup + birim + min seviye zenginleştir
    const urunMap = {};
    for (const u of db.prepare('SELECT id, kod, grup_adi, ana_birim FROM stok_urunler').all()) urunMap[u.id] = u;
    const minMap = {};
    for (const m of db.prepare('SELECT urun_id, depo_id, min_seviye FROM stok_urun_raf').all()) minMap[`${m.urun_id}|${m.depo_id}`] = m.min_seviye;
    rows = rows.map((r) => ({ ...r, urun_kodu: urunMap[r.urun_id]?.kod || '', grup: urunMap[r.urun_id]?.grup_adi || '', birim: urunMap[r.urun_id]?.ana_birim || 'ADET', min_seviye: minMap[`${r.urun_id}|${r.depo_id}`] || 0 }));
    if (mode === 'zero') rows = rows.filter((r) => r.mevcut <= 1e-9);
    else if (mode === 'critical') rows = rows.filter((r) => r.mevcut > 0 && r.mevcut <= (r.min_seviye || 10));
    if (q) { const s = q.toLowerCase(); rows = rows.filter((r) => `${r.urun_adi} ${r.urun_kodu} ${r.depo_adi} ${r.raf_adi} ${r.grup}`.toLowerCase().includes(s)); }
    const tot = rows.reduce((a, r) => ({ giren: a.giren + r.giren, cikan: a.cikan + r.cikan, mevcut: a.mevcut + r.mevcut }), { giren: 0, cikan: 0, mevcut: 0 });
    res.json({ rows, toplam: tot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/rapor/ekstre', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { urun_id, depo_id, t1, t2 } = req.query;
  if (!urun_id) return res.status(400).json({ error: 'urun_id gerekli' });
  try {
    const cond = ['h.urun_id=?'], params = [urun_id];
    if (depo_id) { cond.push('h.depo_id=?'); params.push(depo_id); }
    if (t1) { cond.push('h.tarih>=?'); params.push(t1); }
    if (t2) { cond.push('h.tarih<=?'); params.push(t2); }
    const rows = db.prepare(`SELECT h.tarih, h.fis_no, h.fis_tip, h.depo_adi, h.raf_adi, h.tip, h.miktar
      FROM stok_hareketler h WHERE ${cond.join(' AND ')}
      ORDER BY h.tarih, h.created_date`).all(...params);
    let bakiye = 0;
    const out = rows.map((r) => {
      const giris = r.tip === 'giris' ? r.miktar : 0;
      const cikis = r.tip === 'cikis' ? r.miktar : 0;
      bakiye += giris - cikis;
      return { tarih: r.tarih, fis_no: r.fis_no, tip: r.fis_tip, depo: r.depo_adi, raf: r.raf_adi, giris, cikis, bakiye: +bakiye.toFixed(4) };
    });
    res.json({ rows: out, son_bakiye: bakiye });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/rapor/hareket', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { t1, t2, depo_id, tip } = req.query;
    const cond = ["(is_deleted=0 OR is_deleted IS NULL)", "durum='onayli'"], params = [];
    if (t1) { cond.push('tarih>=?'); params.push(t1); }
    if (t2) { cond.push('tarih<=?'); params.push(t2); }
    if (tip && tip !== 'hepsi') { cond.push('tip=?'); params.push(tip); }
    if (depo_id) { cond.push('(kaynak_depo_id=? OR hedef_depo_id=?)'); params.push(depo_id, depo_id); }
    const fisler = db.prepare(`SELECT * FROM stok_fisler WHERE ${cond.join(' AND ')} ORDER BY tarih DESC, created_date DESC LIMIT 500`).all(...params);
    const out = fisler.map((f) => ({
      fis_no: f.fis_no, tip: f.tip, tarih: f.tarih, cari: f.cari_adi,
      depo: f.tip === 'giris' ? f.hedef_depo_adi : `${f.kaynak_depo_adi || '—'} → ${f.hedef_saha_adi || f.hedef_depo_adi || '—'}`,
      satir: f.satir_sayisi, miktar: f.toplam_miktar, kullanici: f.olusturan,
    }));
    res.json({ rows: out });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/rapor/raf-doluluk', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { depo_id } = req.query;
    const depoCond = depo_id ? 'AND r.depo_id=?' : '';
    const raflar = db.prepare(`SELECT r.id, r.kod, r.ad, r.tip, r.kapasite, r.depo_id, r.depo_adi
      FROM stok_raflar r WHERE (r.is_deleted=0 OR r.is_deleted IS NULL) ${depoCond} ORDER BY r.depo_adi, r.kod`).all(...(depo_id ? [depo_id] : []));
    const stokMap = {};
    for (const h of db.prepare("SELECT raf_id, COALESCE(SUM(CASE WHEN tip='giris' THEN miktar ELSE -miktar END),0) m, COUNT(DISTINCT urun_id) u FROM stok_hareketler WHERE raf_id IS NOT NULL GROUP BY raf_id").all()) stokMap[h.raf_id] = h;
    const out = raflar.map((r) => {
      const s = stokMap[r.id] || { m: 0, u: 0 };
      const doluluk = r.kapasite > 0 ? Math.round((s.m / r.kapasite) * 100) : null;
      return { ...r, mevcut: s.m, urun_sayisi: s.u, doluluk };
    });
    const byDepo = {};
    for (const r of out) { (byDepo[r.depo_adi] = byDepo[r.depo_adi] || []).push(r); }
    res.json({ raflar: out, gruplu: byDepo, ozet: {
      toplam: out.length, dolu: out.filter((r) => r.mevcut > 0).length, bos: out.filter((r) => r.mevcut <= 0).length,
      kritik: out.filter((r) => r.doluluk != null && r.doluluk >= 85).length,
    } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/rapor/degerleme', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { depo_id, urun_id } = req.query;
    const cond = ["durum!='kapali'", 'kalan_bakiye>0'], params = [];
    if (depo_id) { cond.push('depo_id=?'); params.push(depo_id); }
    if (urun_id) { cond.push('urun_id=?'); params.push(urun_id); }
    const rows = db.prepare(`SELECT urun_id, MAX(urun_adi) urun_adi, depo_id, MAX(depo_adi) depo_adi,
        SUM(kalan_bakiye) miktar, SUM(kalan_bakiye*alis_maliyeti) deger,
        CASE WHEN SUM(kalan_bakiye)>0 THEN SUM(kalan_bakiye*alis_maliyeti)/SUM(kalan_bakiye) ELSE 0 END ort_maliyet
      FROM stok_partiler WHERE ${cond.join(' AND ')}
      GROUP BY urun_id, depo_id ORDER BY deger DESC`).all(...params);
    const toplam = rows.reduce((a, r) => a + r.deger, 0);
    res.json({ rows, toplam_deger: +toplam.toFixed(2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/rapor/merkez', authMiddleware, (req, res) => {
  if (!stokRaporPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const aktifUrun = db.prepare("SELECT COUNT(*) n FROM stok_urunler WHERE aktif=1 AND (is_deleted=0 OR is_deleted IS NULL)").get().n;
    const aktifDepo = db.prepare("SELECT COUNT(*) n FROM stok_depolar WHERE aktif=1 AND (is_deleted=0 OR is_deleted IS NULL)").get().n;
    const aktifRaf = db.prepare("SELECT COUNT(*) n FROM stok_raflar WHERE aktif=1 AND (is_deleted=0 OR is_deleted IS NULL)").get().n;
    const stokBiten = db.prepare(`SELECT COUNT(*) n FROM (SELECT urun_id, depo_id, SUM(CASE WHEN tip='giris' THEN miktar ELSE -miktar END) m FROM stok_hareketler GROUP BY urun_id, depo_id HAVING m<=0)`).get().n;
    const kritik = db.prepare(`SELECT COUNT(*) n FROM (SELECT urun_id, depo_id, SUM(CASE WHEN tip='giris' THEN miktar ELSE -miktar END) m FROM stok_hareketler GROUP BY urun_id, depo_id HAVING m>0 AND m<=10)`).get().n;
    const depoYogunluk = db.prepare(`SELECT depo_adi, SUM(CASE WHEN tip='giris' THEN miktar ELSE -miktar END) m FROM stok_hareketler GROUP BY depo_id ORDER BY m DESC LIMIT 8`).all();
    const sonHareket = db.prepare("SELECT fis_no, urun_adi, depo_adi, raf_adi, tip, miktar, tarih FROM stok_hareketler ORDER BY created_date DESC LIMIT 12").all();
    res.json({ aktif_urun: aktifUrun, aktif_depo: aktifDepo, aktif_raf: aktifRaf, stok_biten: stokBiten, kritik, depo_yogunluk: depoYogunluk, son_hareket: sonHareket });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOK Faz 7: Satın Alma raporları
// ═══════════════════════════════════════════════════════════════════
function stokSatinalmaPerm(req, action) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_satinalma', action || 'can_view');
}

app.get('/api/stok/satinalma/merkez', authMiddleware, (req, res) => {
  if (!stokSatinalmaPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const aktifTedarikci = db.prepare("SELECT COUNT(*) n FROM customers WHERE (is_supplier=1) AND (is_deleted=0 OR is_deleted IS NULL) AND (status='aktif' OR status IS NULL)").get().n;
    const eslesme = db.prepare("SELECT COUNT(*) n FROM stok_urun_tedarikci WHERE aktif=1").get().n;
    const eskiFiyat = db.prepare("SELECT COUNT(*) n FROM stok_urun_tedarikci WHERE aktif=1 AND fiyat_tarihi IS NOT NULL AND fiyat_tarihi <> '' AND substr(fiyat_tarihi,1,10) < date('now','-90 days')").get().n;
    const tekTedarikci = db.prepare("SELECT COUNT(*) n FROM (SELECT urun_id FROM stok_urun_tedarikci WHERE aktif=1 GROUP BY urun_id HAVING COUNT(DISTINCT cari_id)=1)").get().n;
    const enUygun = db.prepare(`SELECT ut.urun_id, MAX(ut.urun_adi) urun_adi,
        (SELECT cari_adi FROM stok_urun_tedarikci x WHERE x.urun_id=ut.urun_id AND x.aktif=1 ORDER BY x.birim_fiyat ASC LIMIT 1) en_ucuz_cari,
        MIN(ut.birim_fiyat) en_dusuk, MAX(ut.birim_fiyat) en_yuksek, COUNT(DISTINCT ut.cari_id) tedarikci_sayisi
      FROM stok_urun_tedarikci ut WHERE ut.aktif=1 GROUP BY ut.urun_id ORDER BY urun_adi LIMIT 20`).all();
    const sonFiyat = db.prepare("SELECT urun_adi, cari_adi, alis_fiyati, tarih, kaynak FROM stok_fiyat_gecmisi ORDER BY created_date DESC LIMIT 12").all();
    res.json({ aktif_tedarikci: aktifTedarikci, eslesme, eski_fiyat: eskiFiyat, tek_tedarikci: tekTedarikci, en_uygun: enUygun, son_fiyat: sonFiyat });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/satinalma/karsilastirma', authMiddleware, (req, res) => {
  if (!stokSatinalmaPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { urun_id, cari_id, marka, minf, maxf, maxteslim, q } = req.query;
    const cond = ['ut.aktif=1'], params = [];
    if (urun_id) { cond.push('ut.urun_id=?'); params.push(urun_id); }
    if (cari_id) { cond.push('ut.cari_id=?'); params.push(cari_id); }
    if (marka) { cond.push('ut.marka LIKE ?'); params.push(`%${marka}%`); }
    if (minf) { cond.push('ut.birim_fiyat >= ?'); params.push(Number(minf)); }
    if (maxf) { cond.push('ut.birim_fiyat <= ?'); params.push(Number(maxf)); }
    if (maxteslim) { cond.push('ut.teslim_suresi_gun <= ?'); params.push(Number(maxteslim)); }
    if (q) { cond.push('(ut.urun_adi LIKE ? OR ut.cari_adi LIKE ? OR ut.marka LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const rows = db.prepare(`SELECT ut.* FROM stok_urun_tedarikci ut WHERE ${cond.join(' AND ')} ORDER BY ut.urun_adi, ut.birim_fiyat ASC LIMIT 2000`).all(...params);
    res.json({ rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/satinalma/rapor', authMiddleware, (req, res) => {
  if (!stokSatinalmaPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { tip = 'volume', gun } = req.query;
  const g = Number(gun) || 90;
  try {
    let rows = [];
    if (tip === 'volume') {
      rows = db.prepare(`SELECT c.company_name cari, COUNT(DISTINCT h.fis_no) fis_sayisi, COUNT(*) satir,
          SUM(h.miktar) toplam_miktar, SUM(h.miktar*h.birim_maliyet) toplam_tutar
        FROM stok_hareketler h JOIN stok_fisler f ON f.id=h.fis_id
        JOIN customers c ON c.id=f.cari_id
        WHERE h.tip='giris' AND f.tip='giris' AND f.cari_id IS NOT NULL AND h.tarih >= date('now', ?)
        GROUP BY f.cari_id ORDER BY toplam_tutar DESC`).all(`-${g} days`);
    } else if (tip === 'best') {
      rows = db.prepare(`SELECT urun_adi, cari_adi, birim_fiyat, para_birimi, fiyat_tarihi, teslim_suresi_gun
        FROM stok_urun_tedarikci ut WHERE aktif=1 AND birim_fiyat = (SELECT MIN(birim_fiyat) FROM stok_urun_tedarikci x WHERE x.urun_id=ut.urun_id AND x.aktif=1)
        ORDER BY urun_adi`).all();
    } else if (tip === 'changes') {
      rows = db.prepare(`SELECT urun_adi, cari_adi, alis_fiyati, tarih, kaynak, fis_no FROM stok_fiyat_gecmisi
        WHERE tarih >= date('now', ?) ORDER BY tarih DESC, created_date DESC LIMIT 500`).all(`-${g} days`);
    } else if (tip === 'history') {
      rows = db.prepare(`SELECT urun_adi, cari_adi, alis_fiyati, tarih, kaynak FROM stok_fiyat_gecmisi ORDER BY urun_adi, tarih DESC LIMIT 1000`).all();
    } else if (tip === 'stale') {
      rows = db.prepare(`SELECT urun_adi, cari_adi, birim_fiyat, fiyat_tarihi, teslim_suresi_gun FROM stok_urun_tedarikci
        WHERE aktif=1 AND (fiyat_tarihi IS NULL OR fiyat_tarihi='' OR substr(fiyat_tarihi,1,10) < date('now','-90 days')) ORDER BY fiyat_tarihi`).all();
    } else if (tip === 'single') {
      rows = db.prepare(`SELECT MAX(urun_adi) urun_adi, MAX(cari_adi) cari_adi, MAX(birim_fiyat) birim_fiyat FROM stok_urun_tedarikci
        WHERE aktif=1 GROUP BY urun_id HAVING COUNT(DISTINCT cari_id)=1 ORDER BY urun_adi`).all();
    } else if (tip === 'multi') {
      rows = db.prepare(`SELECT MAX(urun_adi) urun_adi, COUNT(DISTINCT cari_id) tedarikci_sayisi, MIN(birim_fiyat) en_dusuk, MAX(birim_fiyat) en_yuksek FROM stok_urun_tedarikci
        WHERE aktif=1 GROUP BY urun_id HAVING COUNT(DISTINCT cari_id) > 1 ORDER BY tedarikci_sayisi DESC`).all();
    }
    res.json({ tip, rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/fiyat-gecmisi', authMiddleware, (req, res) => {
  if (!stokSatinalmaPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { urun_id, cari_id, t1, t2, q } = req.query;
    const cond = [], params = [];
    if (urun_id) { cond.push('urun_id=?'); params.push(urun_id); }
    if (cari_id) { cond.push('cari_id=?'); params.push(cari_id); }
    if (t1) { cond.push('tarih>=?'); params.push(t1); }
    if (t2) { cond.push('tarih<=?'); params.push(t2); }
    if (q) { cond.push('(urun_adi LIKE ? OR cari_adi LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM stok_fiyat_gecmisi ${where} ORDER BY tarih DESC, created_date DESC LIMIT 3000`).all(...params);
    const fiyatlar = rows.map((r) => r.alis_fiyati).filter((x) => x > 0);
    res.json({ rows, ozet: { kayit: rows.length, son: rows[0]?.alis_fiyati || 0, en_dusuk: fiyatlar.length ? Math.min(...fiyatlar) : 0, en_yuksek: fiyatlar.length ? Math.max(...fiyatlar) : 0 } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// STOK Faz 8: Terminli Zimmet
// ═══════════════════════════════════════════════════════════════════
function stokZimmetPerm(req, action) {
  return req.user?.role === 'admin' || checkPermission(db, req.user?.role, 'stok_zimmet', action || 'can_view');
}

app.post('/api/stok/zimmet', authMiddleware, (req, res) => {
  if (!stokZimmetPerm(req, 'can_add')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const { demirbas_id, personel_id, saha_id, teslim_tarihi, termin_tarihi, teslim_notu } = req.body || {};
  if (!demirbas_id || !personel_id) return res.status(400).json({ error: 'El aleti ve personel zorunlu' });
  const d = db.prepare('SELECT * FROM stok_demirbaslar WHERE id=?').get(demirbas_id);
  if (!d) return res.status(404).json({ error: 'El aleti bulunamadı' });
  if (d.durum !== 'kullanilabilir') return res.status(400).json({ error: `El aleti müsait değil (durum: ${d.durum})` });
  const p = db.prepare('SELECT * FROM stok_personeller WHERE id=?').get(personel_id);
  const s = saha_id ? db.prepare('SELECT * FROM stok_sahalar WHERE id=?').get(saha_id) : null;
  try {
    const now = new Date().toISOString();
    const yil = new Date().getFullYear();
    const row = db.prepare("SELECT zimmet_no FROM stok_zimmetler WHERE zimmet_no LIKE ? ORDER BY zimmet_no DESC LIMIT 1").get(`ZMT-${yil}-%`);
    let n = 1; if (row) { const x = parseInt(String(row.zimmet_no).split('-').pop(), 10); if (Number.isFinite(x)) n = x + 1; }
    const zNo = `ZMT-${yil}-${String(n).padStart(5, '0')}`;
    const id = _stokUUID();
    db.transaction(() => {
      db.prepare(`INSERT INTO stok_zimmetler (id, zimmet_no, demirbas_id, demirbas_adi, varlik_kodu, personel_id, personel_adi, saha_id, saha_adi, teslim_tarihi, termin_tarihi, teslim_notu, durum, created_by, created_date, updated_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'acik', ?, ?, ?)`).run(id, zNo, demirbas_id, d.urun_adi || d.varlik_kodu, d.varlik_kodu, personel_id, p?.ad_soyad || null, saha_id || null, s?.ad || null, teslim_tarihi || now.slice(0, 10), termin_tarihi || null, teslim_notu || null, req.user.email, now, now);
      db.prepare("UPDATE stok_demirbaslar SET durum='personelde', updated_date=? WHERE id=?").run(now, demirbas_id);
    })();
    res.status(201).json(db.prepare('SELECT * FROM stok_zimmetler WHERE id=?').get(id));
  } catch (err) { console.error('[stok] zimmet:', err); res.status(500).json({ error: err.message }); }
});

app.post('/api/stok/zimmet/:id/iade', authMiddleware, (req, res) => {
  if (!stokZimmetPerm(req, 'can_edit')) return res.status(403).json({ error: 'Yetkiniz yok' });
  const z = db.prepare('SELECT * FROM stok_zimmetler WHERE id=?').get(req.params.id);
  if (!z) return res.status(404).json({ error: 'Zimmet bulunamadı' });
  if (z.durum === 'iade') return res.status(400).json({ error: 'Zaten iade edilmiş' });
  const { iade_notu, kondisyon } = req.body || {};
  try {
    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare("UPDATE stok_zimmetler SET durum='iade', iade_tarihi=?, iade_notu=?, updated_date=? WHERE id=?").run(now.slice(0, 10), iade_notu || null, now, z.id);
      db.prepare("UPDATE stok_demirbaslar SET durum='kullanilabilir', kondisyon=COALESCE(?,kondisyon), updated_date=? WHERE id=?").run(kondisyon || null, now, z.demirbas_id);
    })();
    res.json(db.prepare('SELECT * FROM stok_zimmetler WHERE id=?').get(z.id));
  } catch (err) { console.error('[stok] zimmet iade:', err); res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/zimmet-ozet', authMiddleware, (req, res) => {
  if (!stokZimmetPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const bugun = new Date().toISOString().slice(0, 10);
    const d = (w) => db.prepare(`SELECT COUNT(*) n FROM stok_demirbaslar WHERE (is_deleted=0 OR is_deleted IS NULL)${w ? ' AND ' + w : ''}`).get().n;
    const geciken = db.prepare("SELECT COUNT(*) n FROM stok_zimmetler WHERE durum='acik' AND termin_tarihi IS NOT NULL AND termin_tarihi<>'' AND substr(termin_tarihi,1,10) < ?").get(bugun).n;
    res.json({ kullanilabilir: d("durum='kullanilabilir'"), personelde: d("durum='personelde'"), bakimda: d("durum='bakimda'"), hurda: d("durum='hurda'"), geciken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stok/zimmetler', authMiddleware, (req, res) => {
  if (!stokZimmetPerm(req)) return res.status(403).json({ error: 'Yetkiniz yok' });
  try {
    const { durum, q } = req.query;
    const bugun = new Date().toISOString().slice(0, 10);
    const cond = [], params = [];
    if (durum === 'acik') cond.push("durum='acik'");
    else if (durum === 'geciken') { cond.push("durum='acik' AND termin_tarihi IS NOT NULL AND termin_tarihi<>'' AND substr(termin_tarihi,1,10) < ?"); params.push(bugun); }
    else if (durum === 'iade') cond.push("durum='iade'");
    if (q) { cond.push('(zimmet_no LIKE ? OR demirbas_adi LIKE ? OR varlik_kodu LIKE ? OR personel_adi LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM stok_zimmetler ${where} ORDER BY created_date DESC LIMIT 3000`).all(...params);
    res.json(rows.map((z) => ({ ...z, geciken: z.durum === 'acik' && z.termin_tarihi && String(z.termin_tarihi).slice(0, 10) < bugun })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const { startCronJobs } = require('./cronJobs');
startCronJobs();

// Varsayilan olarak yalnizca loopback'e bind (Nginx localhost'tan proxy'liyor).
// Farkli bir ag arayuzu gerekiyorsa BIND_HOST env ile ez ( or. 0.0.0.0).
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
app.listen(PORT, BIND_HOST, () => {
  console.log(`🚀 Backend çalışıyor: http://${BIND_HOST}:${PORT}`);
  console.log(`📁 Veritabanı: ${process.env.DB_PATH || './database.sqlite'}`);
});
