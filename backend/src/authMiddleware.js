const jwt = require('jsonwebtoken');
const { db } = require('./db');

// users satirini id (yoksa email) ile getiren hazir sorgular -- ilk kullanimda
// hazirlanir (users tablosu acilista olusuyor ama garanti olsun diye lazy).
let _stmtById = null;
let _stmtByEmail = null;
function lookupUser(id, email) {
  if (!_stmtById) {
    _stmtById = db.prepare('SELECT id, email, role, customer_id, status, must_change_password FROM users WHERE id = ?');
    _stmtByEmail = db.prepare('SELECT id, email, role, customer_id, status, must_change_password FROM users WHERE email = ?');
  }
  if (id) return _stmtById.get(id);
  if (email) return _stmtByEmail.get(email);
  return null;
}

let _stmtSessionGet = null;
let _stmtSessionTouch = null;
let _stmtSessionRevoke = null;
function lookupSession(sid) {
  if (!_stmtSessionGet) {
    _stmtSessionGet = db.prepare('SELECT id, revoked, last_seen_at FROM sessions WHERE id = ?');
    _stmtSessionTouch = db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?");
    _stmtSessionRevoke = db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?');
  }
  return _stmtSessionGet.get(sid);
}
function touchSession(sid) { try { _stmtSessionTouch.run(sid); } catch {} }
function revokeSession(sid) { try { _stmtSessionRevoke.run(sid); } catch {} }

// Guvenlik ayarlari: hareketsizlik zaman asimi (dk) + calisma saatleri kisiti --
// her istekte DB'ye gitmemek icin kisa sureli (30sn) bellek ici onbellek.
let _stmtGuvenlik = null;
let _guvenlikCache = null;
let _guvenlikCacheAt = 0;
function getGuvenlikAyarlari() {
  const now = Date.now();
  if (_guvenlikCache && now - _guvenlikCacheAt < 30000) return _guvenlikCache;
  if (!_stmtGuvenlik) _stmtGuvenlik = db.prepare('SELECT * FROM guvenlik_ayarlari WHERE id = ?');
  try { _guvenlikCache = _stmtGuvenlik.get('varsayilan') || null; } catch (e) { _guvenlikCache = null; }
  _guvenlikCacheAt = now;
  return _guvenlikCache;
}

// Verilen ana (varsayilan: su an) calisma saatleri penceresinde mi -- gun
// (1=Pazartesi..7=Pazar) ve saat (HH:MM, sunucu yerel saati) kontrolu.
function isWithinWorkingHours(settings, date = new Date()) {
  if (!settings || !settings.calisma_saatleri_aktif) return true;
  const jsDay = date.getDay(); // 0=Pazar..6=Cumartesi
  const gun = jsDay === 0 ? 7 : jsDay; // 1=Pazartesi..7=Pazar
  const izinliGunler = String(settings.calisma_gunleri || '1,2,3,4,5')
    .split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  if (!izinliGunler.includes(gun)) return false;
  const hhmm = date.toTimeString().slice(0, 5);
  return hhmm >= (settings.calisma_baslangic || '00:00') && hhmm <= (settings.calisma_bitis || '23:59');
}

function authMiddleware(req, res, next) {
  // Önce cookie'den, yoksa Authorization header'dan oku
  let token = req.cookies && req.cookies['auth_token'];
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  let payload;
  try {
    // GUVENLIK: algoritma sabitlendi (alg confusion / 'none' saldirilarina karsi savunma katmani)
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Gecersiz veya suresi dolmus oturum' });
  }

  // OTURUM YONETIMI: token kendi basina artik yeterli degil -- payload'daki
  // sid, sessions tablosunda hala iptal edilmemis (revoked=0) olmali. Her
  // gece 21:00'de toplu, ya da admin elle tek tek iptal edebiliyor. Eski
  // (bu ozellikten once uretilmis, sid'siz) token'lar da burada dogal olarak
  // gecersiz sayilir -- gecis aninda herkesin tekrar giris yapmasi zaten
  // istenen davranis.
  if (payload.sid) {
    let session;
    try { session = lookupSession(payload.sid); } catch (e) { session = null; }
    if (!session || session.revoked !== 0) {
      return res.status(401).json({ error: 'Oturumunuz sonlandırılmış, lütfen tekrar giriş yapın' });
    }
    // GUVENLIK: hareketsizlik zaman asimi -- sunucu tarafinda zorlanir, tarayici
    // zamanlayicisina (uyku modunda duran/geciken setTimeout) guvenilmez.
    const guvenlikAyarlari = getGuvenlikAyarlari();
    const idleDakika = guvenlikAyarlari ? Number(guvenlikAyarlari.idle_timeout_dakika) : 60;
    if (idleDakika > 0 && session.last_seen_at) {
      const sonGorulme = new Date(String(session.last_seen_at).replace(' ', 'T') + 'Z').getTime();
      if (!isNaN(sonGorulme) && Date.now() - sonGorulme > idleDakika * 60 * 1000) {
        revokeSession(payload.sid);
        return res.status(401).json({ error: 'Oturum süresi doldu — hareketsizlik nedeniyle çıkış yapıldı' });
      }
    }
    touchSession(payload.sid);
  } else {
    return res.status(401).json({ error: 'Oturumunuz sonlandırılmış, lütfen tekrar giriş yapın' });
  }

  // GUVENLIK (S6): token 7 gun gecerli; bu sure icinde kullanici pasife
  // alinmis / silinmis / rolu degismis olabilir. Her istekte DB'den dogrula
  // ve guncel rol/customer_id/email ile calis (token icindeki eski degil).
  let row;
  try {
    row = lookupUser(payload.id, payload.email);
  } catch (e) {
    return res.status(500).json({ error: 'Kimlik dogrulama hatasi' });
  }
  if (!row) {
    return res.status(401).json({ error: 'Oturum gecersiz, lutfen tekrar giris yapin' });
  }
  if (row.status === 'pasif') {
    return res.status(401).json({ error: 'Hesabiniz pasif durumda' });
  }

  // GUVENLIK: calisma saatleri kisiti -- kilitlenmeyi onlemek icin admin muaf.
  {
    const guvenlikAyarlari = getGuvenlikAyarlari();
    if (guvenlikAyarlari && guvenlikAyarlari.calisma_saatleri_aktif && row.role !== 'admin') {
      if (!isWithinWorkingHours(guvenlikAyarlari)) {
        return res.status(403).json({
          error: `Çalışma saatleri dışında (${guvenlikAyarlari.calisma_baslangic}–${guvenlikAyarlari.calisma_bitis})`,
        });
      }
    }
  }

  // GUVENLIK: sifre degistirmesi zorunlu (must_change_password=1) hesaplar --
  // varsayilan/rastgele sifreyle acilmis, henuz ilk giris sifresini
  // belirlememis hesaplar -- daha once yalnizca frontend'in yonlendirmesine
  // guveniyordu; dogrudan API cagrisiyla bu kisitlama tamamen bypass
  // edilebiliyordu. Artik sifre degistirme ve kendi bilgilerini gorme disinda
  // hicbir uc noktaya bu bayrak acikken erisilemez.
  if (row.must_change_password) {
    const isChangePassword = req.method === 'PUT' && req.path.endsWith('/change-password');
    const isMe = req.method === 'GET' && req.path.endsWith('/me');
    if (!isChangePassword && !isMe) {
      return res.status(403).json({ error: 'Once sifrenizi degistirmelisiniz', must_change_password: true });
    }
  }

  req.user = {
    ...payload,
    id: row.id,
    email: row.email,
    role: row.role,
    customer_id: row.customer_id,
  };
  next();
}

module.exports = authMiddleware;
module.exports.getGuvenlikAyarlari = getGuvenlikAyarlari;
module.exports.isWithinWorkingHours = isWithinWorkingHours;
