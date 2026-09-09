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
function lookupSession(sid) {
  if (!_stmtSessionGet) {
    _stmtSessionGet = db.prepare('SELECT id, revoked FROM sessions WHERE id = ?');
    _stmtSessionTouch = db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?");
  }
  const row = _stmtSessionGet.get(sid);
  if (row && row.revoked === 0) _stmtSessionTouch.run(sid);
  return row;
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
