const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./db');
const authMiddleware = require('./authMiddleware');
const { DEFAULT_USER_PASSWORD } = require('./constants');

const router = express.Router();

// GUVENLIK: taskqube.com artik HTTPS uzerinden calisiyor (certbot, 2026-08-31) --
// cookie'de Secure bayragi acildi. Ortam degiskeniyle kontrol ediliyor ki local
// gelistirme ortami (http://localhost) bundan etkilenmesin -- sadece sunucuda
// COOKIE_SECURE=true .env'e eklenince aktif olur, eklenmezse (local) false kalir.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

// GUVENLIK: minimum sifre politikasi (tum sifre olusturma/degistirme noktalarinda ortak)
const MIN_PASSWORD_LENGTH = 8;
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Sifre en az ${MIN_PASSWORD_LENGTH} karakter olmalidir`;
  }
  return null;
}

// GUVENLIK: login zamanlama yan-kanali (timing side-channel) icin sabit-zaman
// karsilastirmasi -- kullanici bulunamasa bile bcrypt.compare hep calisir, boylece
// yanit suresinden e-postanin sistemde kayitli olup olmadigi anlasilamaz.
const DUMMY_PASSWORD_HASH = '$2b$10$1TP.yqF.LUfqTc4BiIzE.eHhUnOp5tZEiAvm1MsmL0NZ3bmRSq4Im';

// KAYIT OL
router.post('/register', async (req, res) => {
  try {
    return res.status(403).json({ error: 'Kayit kapalidir. Lutfen yoneticinizle iletisime gecin.' });
    const { email, password, full_name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunlu' });
    }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(id, email, password_hash, full_name || '', role || 'musteri');
    const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const regPerms = db.prepare("SELECT module, can_view, can_add, can_edit, can_delete FROM role_permissions WHERE role_name = ?").all(user.role);
    user.permissions = regPerms;
    res.cookie('auth_token', token, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'Strict', maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GİRİŞ YAP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunlu' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // GUVENLIK: kullanici bulunamasa bile bcrypt.compare calistiriliyor (sabit zaman,
    // e-posta enumeration'ini zamanlama farkindan engellemek icin)
    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }
    if (user.status === 'pasif') {
      return res.status(403).json({ error: 'Hesabınız pasif durumda. Yönetici ile iletişime geçin.' });
    }
    // OTURUM YONETIMI: her girişte bir sessions kaydı açılır -- token'ın
    // kendisi artık tek başına yeterli değil, authMiddleware her istekte bu
    // kaydın hala iptal edilmemiş (revoked=0) olduğunu da kontrol ediyor.
    const sessionId = uuidv4();
    db.prepare(`INSERT INTO sessions (id, user_id, email, full_name, role, ip, user_agent) VALUES (?,?,?,?,?,?,?)`)
      .run(sessionId, user.id, user.email, user.full_name, user.role, req.ip, req.headers['user-agent'] || '');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, customer_id: user.customer_id, sid: sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    const userPerms = db.prepare("SELECT module, can_view, can_add, can_edit, can_delete FROM role_permissions WHERE role_name = ?").all(user.role);
    res.cookie('auth_token', token, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'Strict', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, customer_id: user.customer_id, permissions: userPerms, must_change_password: user.must_change_password || 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// KENDİ BİLGİLERİ
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, full_name, role, customer_id, must_change_password FROM users WHERE id = ?').get(req.user.id);
    try { user.permissions = db.prepare("SELECT module, can_view, can_add, can_edit, can_delete FROM role_permissions WHERE role_name = ?").all(user.role); } catch(e) { user.permissions = []; }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ŞİFRE GÜNCELLE
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const pwErr = validatePasswordStrength(new_password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    const password_hash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(password_hash, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFİL GÜNCELLE
// GUVENLIK: kullanicilar kendi rolunu degistiremez (yetki yukseltme acigi fix).
// Rol degisikligi sadece admin/yonetici tarafindan PUT /users/:id ile yapilabilir.
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { full_name } = req.body;
    db.prepare(`UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?`).run(full_name, req.user.id);
    const user = db.prepare('SELECT id, email, full_name, role, customer_id, must_change_password FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TÜM KULLANICILAR
router.get('/users', authMiddleware, (req, res) => {
  try {
    // GUVENLIK: kullanici listesi (email/rol/durum) sadece admin/yonetici gorebilir
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const users = db.prepare('SELECT id, email, full_name, role, created_at, customer_id, status FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KULLANICI GÜNCELLE
router.put('/users/:id', authMiddleware, (req, res) => {
  try {
    // GUVENLIK: kullanici duzenleme (ozellikle rol degisikligi) sadece admin/yonetici yapabilir
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const { role, full_name, customer_id, status } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    // GUVENLIK: kendi rolunu bu yoldan da yukseltemez (dolayli yetki yukseltme koruması)
    if (role && req.params.id === req.user.id) {
      return res.status(403).json({ error: 'Kendi rolunuzu degistiremezsiniz' });
    }
    if (role) db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, req.params.id);
    if (full_name) db.prepare(`UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?`).run(full_name, req.params.id);
    if (customer_id !== undefined) db.prepare(`UPDATE users SET customer_id = ?, updated_at = datetime('now') WHERE id = ?`).run(customer_id, req.params.id);
    if (status) db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    const user = db.prepare('SELECT id, email, full_name, role, created_at, customer_id, status FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KULLANICI SİL
router.delete('/users/:id', authMiddleware, (req, res) => {
  try {
    // GUVENLIK: kullanici silme sadece admin/yonetici yapabilir
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FAVORİLERİ GETİR
router.get('/favorites', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT favorites FROM users WHERE id = ?').get(req.user.id);
    const favorites = JSON.parse(user?.favorites || '[]');
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FAVORİLERİ GÜNCELLE
router.put('/favorites', authMiddleware, (req, res) => {
  try {
    const { favorites } = req.body;
    db.prepare('UPDATE users SET favorites = ? WHERE id = ?').run(JSON.stringify(favorites), req.user.id);
    res.json({ success: true, favorites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENGELLİ IP LİSTESİ
router.get('/blocked-ips', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
    const ips = db.prepare('SELECT * FROM blocked_ips ORDER BY blocked_at DESC').all();
    res.json(ips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IP ENGELİ KALDIR
router.delete('/blocked-ips/:ip', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkisiz' });
    db.prepare('DELETE FROM blocked_ips WHERE ip = ?').run(req.params.ip);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// YENİ KULLANICI OLUŞTUR (admin/yonetici)
router.post('/users', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const { email, password, full_name, role, customer_id } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email zorunlu' });
    }
    // Sifre bos birakilirsa varsayilan sifre atanir (kullanici ilk giriste degistirir).
    const effectivePassword = (password && String(password).trim()) ? password : DEFAULT_USER_PASSWORD;
    const pwErr = validatePasswordStrength(effectivePassword);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayitli' });
    }
    const password_hash = await bcrypt.hash(effectivePassword, 10);
    const id = uuidv4();
    db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, customer_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)`).run(id, email, password_hash, full_name || '', role || 'kullanici', customer_id || null);
    try {
      db.prepare("INSERT INTO audit_log (id, actor_email, action, target, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)").run(uuidv4(), req.user.email, 'kullanici_olusturuldu', email, '', 'rol: ' + (role || 'kullanici'));
    } catch (e) {}
    const user = db.prepare('SELECT id, email, full_name, role, customer_id, status FROM users WHERE id = ?').get(id);
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  // Cookie'deki token'in sid'ini iptal et -- cikis yapan kisinin oturumu
  // sessions tablosunda da gercekten kapansin (sadece tarayicidan silinmesin).
  try {
    const token = req.cookies && req.cookies['auth_token'];
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (payload.sid) db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(payload.sid);
    }
  } catch (e) { /* token zaten gecersizse yapacak bir sey yok */ }
  res.clearCookie('auth_token', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'Strict' });
  res.json({ success: true });
});

// OTURUM YONETIMI: aktif (iptal edilmemis) oturumlarin listesi -- admin/yonetici
router.get('/sessions', authMiddleware, (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const sessions = db.prepare(`SELECT id, user_id, email, full_name, role, ip, created_at, last_seen_at FROM sessions WHERE revoked = 0 ORDER BY last_seen_at DESC`).all();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OTURUM YONETIMI: tek bir oturumu elle sonlandir -- admin/yonetici
router.post('/sessions/:id/revoke', authMiddleware, (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'yonetici') {
      return res.status(403).json({ error: 'Bu islem icin yetkiniz yok' });
    }
    const info = db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ? AND revoked = 0').run(req.params.id);
    res.json({ success: true, changed: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
