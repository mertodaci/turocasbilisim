const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateDefaultPassword } = require('./constants');

// Bir employees satiri icin giris (users) hesabi yoksa olusturur.
// Sifre rastgele uretilir (bkz. constants.generateDefaultPassword); must_change_password=1
// ile kullanici ilk giriste kendi sifresini belirler (App.jsx -> ForcePasswordChange).
// Donen deger: { created: true, password } = yeni hesap olusturuldu (UI'da bir
// kerelik gosterilmek uzere sifreyi de tasir); { created: false } = zaten var /
// uygun degil / hata. Hicbir kosulda cagiran islemi (calisan kaydi) bozmaz.
function ensureUserForEmployee(db, emp, actorEmail) {
  try {
    const email = String(emp && emp.email ? emp.email : '').trim();
    const role = (emp && emp.app_role) || 'kullanici';
    if (!email || !email.includes('@') || role === 'musteri') return { created: false };
    if (emp && (emp.is_deleted === 1 || emp.is_deleted === true)) return { created: false };
    const exists = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email);
    if (exists) return { created: false };
    const password = generateDefaultPassword();
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (id, email, password_hash, full_name, role, must_change_password) VALUES (?,?,?,?,?,1)")
      .run(uuidv4(), email, hash, (emp && emp.full_name) || '', role);
    try {
      db.prepare("INSERT INTO audit_log (id, actor_email, action, target, old_value, new_value) VALUES (?,?,?,?,?,?)")
        .run(uuidv4(), actorEmail || 'sistem', 'kullanici_olusturuldu', email, '', 'calisan kaydiyla otomatik, rol: ' + role);
    } catch (e) { /* audit_log opsiyonel */ }
    return { created: true, password };
  } catch (e) {
    console.error('[userProvision] ensureUserForEmployee hatasi:', e.message);
    return { created: false };
  }
}

module.exports = { ensureUserForEmployee };
