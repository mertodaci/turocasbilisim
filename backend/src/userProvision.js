const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { DEFAULT_USER_PASSWORD } = require('./constants');

// Bir employees satiri icin giris (users) hesabi yoksa olusturur.
// Varsayilan sifre DEFAULT_USER_PASSWORD; must_change_password=1 ile kullanici
// ilk giriste kendi sifresini belirler (App.jsx -> ForcePasswordChange).
// Donen deger: true = yeni hesap olusturuldu, false = zaten var / uygun degil / hata.
// Hicbir kosulda cagiran islemi (calisan kaydi) bozmaz.
function ensureUserForEmployee(db, emp, actorEmail) {
  try {
    const email = String(emp && emp.email ? emp.email : '').trim();
    const role = (emp && emp.app_role) || 'kullanici';
    if (!email || !email.includes('@') || role === 'musteri') return false;
    if (emp && (emp.is_deleted === 1 || emp.is_deleted === true)) return false;
    const exists = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email);
    if (exists) return false;
    const hash = bcrypt.hashSync(DEFAULT_USER_PASSWORD, 10);
    db.prepare("INSERT INTO users (id, email, password_hash, full_name, role, must_change_password) VALUES (?,?,?,?,?,1)")
      .run(uuidv4(), email, hash, (emp && emp.full_name) || '', role);
    try {
      db.prepare("INSERT INTO audit_log (id, actor_email, action, target, old_value, new_value) VALUES (?,?,?,?,?,?)")
        .run(uuidv4(), actorEmail || 'sistem', 'kullanici_olusturuldu', email, '', 'calisan kaydiyla otomatik, rol: ' + role);
    } catch (e) { /* audit_log opsiyonel */ }
    return true;
  } catch (e) {
    console.error('[userProvision] ensureUserForEmployee hatasi:', e.message);
    return false;
  }
}

module.exports = { ensureUserForEmployee };
