#!/usr/bin/env node
/*
 * backfill-employee-logins.js
 *
 * E-postasi olan ama giris (users) hesabi olmayan tum aktif calisanlara
 * otomatik giris hesabi acar (varsayilan sifre Turocas2026x, must_change_password=1).
 * Idempotent -- var olanlari atlar. Sunucuda bir kez calistirilir:
 *
 *   node backend/scripts/backfill-employee-logins.js
 *
 * Not: musteri rollu (app_role='musteri') employees kayitlari atlanir.
 */
const path = require('path');
const { db } = require(path.join(__dirname, '..', 'src', 'db'));
const { ensureUserForEmployee } = require(path.join(__dirname, '..', 'src', 'userProvision'));

const rows = db.prepare(`
  SELECT * FROM employees
  WHERE email IS NOT NULL AND TRIM(email) != ''
    AND (app_role IS NULL OR app_role != 'musteri')
    AND (is_deleted = 0 OR is_deleted IS NULL)
`).all();

let created = 0;
const createdList = [];
for (const emp of rows) {
  const ok = ensureUserForEmployee(db, emp, 'backfill-script');
  if (ok) { created++; createdList.push(`${emp.email} (${emp.app_role || 'kullanici'})`); }
}

console.log(`Taranan calisan: ${rows.length}`);
console.log(`Yeni giris hesabi olusturuldu: ${created}`);
if (createdList.length) console.log('  - ' + createdList.join('\n  - '));
