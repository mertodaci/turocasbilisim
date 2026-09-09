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
