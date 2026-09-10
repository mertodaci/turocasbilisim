const path = require('path');
require('dotenv').config();

const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');      // kilit anında 5sn bekle (locked hatasını önler)
db.pragma('synchronous = NORMAL');     // WAL ile güvenli + FULL'dan hızlı
db.pragma('cache_size = -16000');      // ~16MB sayfa cache (önceki ~2MB idi)
db.pragma('temp_store = MEMORY');      // geçici tablo/sıralama RAM'de
db.pragma('wal_autocheckpoint = 1000');// WAL dosyası şişmesin (periyodik checkpoint)

// Tek seferlik migration: eski "TaskQube" adlandırması (tq_* tablolar,
// use_taskqube/show_in_taskqube/taskqube_id kolonları, activity_type='taskqube')
// -> "İş Takibi" (job_* tablolar, use_job_tracking/show_in_job_tracking/job_ticket_id,
// activity_type='is_takibi'). CREATE TABLE IF NOT EXISTS'lerden ÖNCE çalışmalı,
// yoksa boş job_* tablolar oluşur ve eski veri tq_* içinde erişilemez kalır.
function migrateLegacyJobTrackingRename() {
  const tableExists = (name) =>
    !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const columnExists = (table, col) => {
    if (!tableExists(table)) return false;
    return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  };

  const tableRenames = [
    ['tq_projects', 'job_projects'],
    ['tq_tickets', 'job_tickets'],
    ['tq_ticket_statuses', 'job_ticket_statuses'],
    ['tq_comments', 'job_comments'],
    ['tq_kanban_boards', 'job_kanban_boards'],
    ['tq_effort_plans', 'job_effort_plans'],
    ['tq_effort_logs', 'job_effort_logs'],
  ];
  for (const [oldName, newName] of tableRenames) {
    if (tableExists(oldName) && !tableExists(newName)) {
      db.exec(`ALTER TABLE ${oldName} RENAME TO ${newName}`);
      console.log(`[migrate] ${oldName} -> ${newName}`);
    }
  }

  const columnRenames = [
    ['customers', 'use_taskqube', 'use_job_tracking'],
    ['employees', 'show_in_taskqube', 'show_in_job_tracking'],
  ];
  for (const [table, oldCol, newCol] of columnRenames) {
    if (columnExists(table, oldCol) && !columnExists(table, newCol)) {
      db.exec(`ALTER TABLE ${table} RENAME COLUMN ${oldCol} TO ${newCol}`);
      console.log(`[migrate] ${table}.${oldCol} -> ${table}.${newCol}`);
    }
  }

  // Kaldırılan modüller (Aktiviteler / Fikirler / İş Takip / Satış-Teklifler) —
  // tablo + yetki + rol temizliği. Idempotent: her boot'ta çalışır, yoksa no-op.
  try {
    db.exec(`
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS ideas;
      DROP TABLE IF EXISTS work_tasks;
      DROP TABLE IF EXISTS task_comments;
      DROP TABLE IF EXISTS sales_activities;
    `);
  } catch (e) { console.warn('[migrate] kaldırılan modül tablo temizliği:', e.message); }
  try {
    db.prepare(`DELETE FROM role_permissions WHERE module IN
      ('activities','add_activity','ideas','work_tracking',
       'satis','satis_firsatlari','satis_teklifleri','satis_raporlari','satis_masasi','satis_aktivite_ekle',
       'ikb_vip')`).run();
  } catch { /* role_permissions henüz yoksa sorun değil */ }
  // 'satis' rolü kaldırıldı — mevcut kullanıcılar 'kullanici'ye taşınır.
  try { db.prepare("UPDATE users SET role='kullanici' WHERE role='satis'").run(); } catch {}
  try { db.prepare("DELETE FROM roles WHERE name='satis'").run(); } catch {}
  try { db.prepare("DELETE FROM role_permissions WHERE role_name='satis'").run(); } catch {}
}

function initDb() {
  migrateLegacyJobTrackingRename();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      full_name TEXT, role TEXT DEFAULT 'kullanici',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, department TEXT, position TEXT,
      app_role TEXT DEFAULT 'kullanici', phone TEXT, email TEXT, status TEXT DEFAULT 'aktif',
      avatar_url TEXT, university TEXT, education_department TEXT, graduation_date TEXT,
      education_documents TEXT DEFAULT '[]', education_history TEXT DEFAULT '[]',
      tc TEXT, birth_date TEXT, hire_date TEXT, next_leave_entitlement_date TEXT,
      gender TEXT, manager_id TEXT, manager_name TEXT, education_level TEXT,
      highest_education TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, company_name TEXT NOT NULL, customer_type TEXT, municipality_type TEXT,
      customer_detail TEXT, population TEXT, project_manager TEXT, deploy_responsible TEXT,
      sector TEXT, city TEXT, status TEXT DEFAULT 'aktif', notes TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY, employee_id TEXT, employee_email TEXT, employee_full_name TEXT,
      employee_department TEXT, leave_type TEXT, start_date TEXT, end_date TEXT,
      day_count REAL, reason TEXT, status TEXT DEFAULT 'beklemede', approver_full_name TEXT,
      approval_note TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'beklemede',
      priority TEXT DEFAULT 'orta', due_date TEXT, owner_email TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_contacts (
      id TEXT PRIMARY KEY, customer_id TEXT, full_name TEXT, title TEXT, phone TEXT, email TEXT,
      contact_type TEXT, notes TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_contracts (
      id TEXT PRIMARY KEY, customer_id TEXT, title TEXT, contract_type TEXT, status TEXT,
      start_date TEXT, end_date TEXT, file_url TEXT, notes TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_modules (
      id TEXT PRIMARY KEY, customer_id TEXT, module_name TEXT, status TEXT, notes TEXT,
      created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS correspondences (
      id TEXT PRIMARY KEY, document_number TEXT, subject TEXT, document_type TEXT, content TEXT,
      status TEXT, author_id TEXT, author_name TEXT, recipient_ids TEXT DEFAULT '[]',
      recipient_names TEXT DEFAULT '[]', approver_id TEXT, approver_name TEXT, approval_note TEXT,
      approved_at TEXT, attachments TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', related_task_id TEXT,
      created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, type TEXT, name TEXT, participants TEXT DEFAULT '[]', last_message TEXT,
      last_message_at TEXT, last_message_sender_email TEXT, created_by_name TEXT, meet_link TEXT,
      last_read_message_id_by_user TEXT DEFAULT '{}', status TEXT DEFAULT 'active', created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT, sender_email TEXT, sender_name TEXT, content TEXT,
      message_type TEXT DEFAULT 'text', meet_link TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leave_allowances (
      id TEXT PRIMARY KEY, employee_id TEXT, employee_name TEXT, employee_email TEXT,
      year REAL, total_days REAL DEFAULT 0, used_days REAL DEFAULT 0, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS hakedisler (
      id TEXT PRIMARY KEY, year INTEGER, sira_no INTEGER,
      musteri TEXT, is_konusu TEXT, durum TEXT DEFAULT 'aktif',
      sektor TEXT, anlasma_turu TEXT, kdv_durumu TEXT,
      sozlesme_baslangic TEXT, sozlesme_bitis TEXT,
      toplam_sozlesme_tutari REAL, yil_hedefi REAL,
      ocak REAL, subat REAL, mart REAL, nisan REAL, mayis REAL, haziran REAL,
      temmuz REAL, agustos REAL, eylul REAL, ekim REAL, kasim REAL, aralik REAL,
      aciklama TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, is_paid INTEGER DEFAULT 1,
      entitlement_type TEXT DEFAULT 'yillik', min_days REAL DEFAULT 1, max_days REAL,
      annual_limit REAL, is_default INTEGER DEFAULT 0, description TEXT,
      is_active INTEGER DEFAULT 1, sort_order REAL DEFAULT 0, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS definitions (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, label TEXT NOT NULL, value TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, sort_order REAL DEFAULT 0, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_reports (
      id TEXT PRIMARY KEY, employee_id TEXT, employee_name TEXT, employee_email TEXT,
      title TEXT, status TEXT DEFAULT 'taslak', total_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'TRY', period TEXT, notes TEXT, approver_id TEXT,
      approver_name TEXT, approval_note TEXT, approved_at TEXT,
      created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_items (
      id TEXT PRIMARY KEY, report_id TEXT, category TEXT, description TEXT,
      amount REAL, currency TEXT DEFAULT 'TRY', receipt_url TEXT, date TEXT,
      created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_projects (
      id TEXT PRIMARY KEY, customer_id TEXT, customer_name TEXT, name TEXT NOT NULL,
      description TEXT, status TEXT DEFAULT 'planlama', start_date TEXT, end_date TEXT,
      budget REAL, manager_id TEXT, manager_name TEXT, team_member_ids TEXT DEFAULT '[]',
      priority TEXT DEFAULT 'orta', created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_tickets (
      id TEXT PRIMARY KEY, project_id TEXT, project_name TEXT, customer_id TEXT, customer_name TEXT,
      board_id TEXT, board_name TEXT, title TEXT NOT NULL, description TEXT, product_name TEXT,
      type TEXT, status TEXT, priority TEXT DEFAULT 'orta', assigned_to_ids TEXT DEFAULT '[]',
      assigned_to_names TEXT DEFAULT '[]', assigned_to_id TEXT, assigned_to_name TEXT,
      assigned_by_id TEXT, assigned_by_name TEXT, due_date TEXT, estimated_hours REAL,
      actual_hours REAL DEFAULT 0, tags TEXT DEFAULT '[]', attachments TEXT DEFAULT '[]',
      parent_ticket_id TEXT, yonlendirme_notu TEXT, resolved_at TEXT, sla_hours REAL,
      created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_ticket_statuses (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, label TEXT, color TEXT, sort_order REAL DEFAULT 0,
      created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_comments (
      id TEXT PRIMARY KEY, ticket_id TEXT, content TEXT, author_id TEXT, author_name TEXT,
      author_email TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_kanban_boards (
      id TEXT PRIMARY KEY, project_id TEXT, project_name TEXT, name TEXT, description TEXT,
      columns TEXT DEFAULT '[]', created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_effort_plans (
      id TEXT PRIMARY KEY, ticket_id TEXT, team TEXT,
      planned_hours REAL, planned_start TEXT,
      assignee_id TEXT, assignee_name TEXT,
      end_at TEXT, note TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_effort_logs (
      id TEXT PRIMARY KEY, ticket_id TEXT, team TEXT,
      person_id TEXT, person_name TEXT,
      hours REAL, work_date TEXT, note TEXT, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
      description TEXT, is_active INTEGER DEFAULT 1, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY, role_name TEXT NOT NULL, module TEXT NOT NULL,
      can_view INTEGER DEFAULT 0, can_add INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0, can_delete INTEGER DEFAULT 0, created_by TEXT,
      created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS card_logs (
      id TEXT PRIMARY KEY,
      direction TEXT,            -- GIRIS / CIKIS (CSV device_id)
      seq INTEGER,               -- cihaz sira no
      card_uid TEXT,             -- kart UID
      person_name TEXT,          -- karttaki isim (cihazda kayitli)
      employee_id TEXT,          -- eslesen calisan (varsa)
      employee_name TEXT,        -- eslesen calisan adi (varsa)
      ts INTEGER,                -- unix timestamp
      event_time TEXT,           -- hareket zamani (CSV datetime)
      synced_at TEXT,            -- cihaz senkron zamani
      source TEXT DEFAULT 'csv', -- import kaynagi
      created_date TEXT DEFAULT (datetime('now')),
      UNIQUE(direction, seq)     -- ayni yon+seq tekrar gelirse atla (mukerrer onleme)
    );
    CREATE TABLE IF NOT EXISTS pdks_cards (
      uid TEXT PRIMARY KEY,        -- kart RFID UID (hex)
      name TEXT,                   -- karta atanan isim
      employee_id TEXT,            -- baglandiysa calisan id'si (employees.id)
      status TEXT DEFAULT 'aktif', -- aktif | pasif
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
  `);

  const migrations = [
    "ALTER TABLE employees ADD COLUMN tc TEXT",
    "ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN exit_date TEXT",
    "ALTER TABLE employees ADD COLUMN exit_reason TEXT",
    "ALTER TABLE employees ADD COLUMN exit_notes TEXT",
    "ALTER TABLE employees ADD COLUMN exit_document TEXT",
    "ALTER TABLE employees ADD COLUMN leave_carryover REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN leave_used_before REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN birth_date TEXT",
    "ALTER TABLE employees ADD COLUMN hire_date TEXT",
    "ALTER TABLE employees ADD COLUMN next_leave_entitlement_date TEXT",
    "ALTER TABLE employees ADD COLUMN gender TEXT",
    "ALTER TABLE employees ADD COLUMN manager_id TEXT",
    "ALTER TABLE employees ADD COLUMN manager_name TEXT",
    "ALTER TABLE employees ADD COLUMN education_level TEXT",
    "ALTER TABLE employees ADD COLUMN highest_education TEXT",
    "ALTER TABLE employees ADD COLUMN education_history TEXT DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN favorites TEXT DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN customer_id TEXT",
    // authMiddleware / authRoutes / entityRouter 'users.status' bekliyor ama bu
    // kolon db.js'te hic olusturulmuyordu (prod DB'ye elle eklenmis, temiz
    // kurulumda -- or. sandbox -- eksikti; her authed istek 500 "Kimlik
    // dogrulama hatasi" veriyordu). Idempotent: prod'da varsa duplicate column
    // hatasi migration dongusunun try/catch'inde yutulur.
    "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'aktif'",
    "ALTER TABLE messages ADD COLUMN file_url TEXT",
    "ALTER TABLE messages ADD COLUMN file_name TEXT",
    "ALTER TABLE messages ADD COLUMN file_size REAL",
    "ALTER TABLE messages ADD COLUMN file_type TEXT",
    "ALTER TABLE leave_requests ADD COLUMN ik_approver_id TEXT",
    "ALTER TABLE leave_requests ADD COLUMN ik_approver_name TEXT",
    "ALTER TABLE leave_requests ADD COLUMN ik_approval_note TEXT",
    "ALTER TABLE leave_requests ADD COLUMN ik_approval_date TEXT",
    "ALTER TABLE leave_requests ADD COLUMN manager_approver_id TEXT",
    "ALTER TABLE leave_requests ADD COLUMN manager_approver_name TEXT",
    "ALTER TABLE leave_requests ADD COLUMN manager_approval_note TEXT",
    "ALTER TABLE leave_requests ADD COLUMN manager_approval_date TEXT",
    "ALTER TABLE leave_requests ADD COLUMN approval_history TEXT DEFAULT '[]'",
    "ALTER TABLE customers ADD COLUMN use_job_tracking INTEGER DEFAULT 0",
    "ALTER TABLE job_ticket_statuses ADD COLUMN key TEXT",
    "ALTER TABLE job_ticket_statuses ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE job_ticket_statuses ADD COLUMN is_final INTEGER DEFAULT 0",
    "ALTER TABLE job_ticket_statuses ADD COLUMN board_id TEXT",
    "ALTER TABLE job_ticket_statuses ADD COLUMN board_ids TEXT DEFAULT '[]'",
    "ALTER TABLE job_ticket_statuses ADD COLUMN group_key TEXT DEFAULT 'diger'",
    "ALTER TABLE job_projects ADD COLUMN type TEXT DEFAULT 'kurulum'",
    "ALTER TABLE job_kanban_boards ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE job_kanban_boards ADD COLUMN color TEXT DEFAULT 'blue'",
    "ALTER TABLE job_kanban_boards ADD COLUMN icon TEXT",
    "ALTER TABLE job_comments ADD COLUMN is_internal INTEGER DEFAULT 0",
    "ALTER TABLE job_comments ADD COLUMN comment_type TEXT DEFAULT 'comment'",
    "ALTER TABLE job_comments ADD COLUMN attachments TEXT DEFAULT '[]'",
    "ALTER TABLE job_projects ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE expense_items ADD COLUMN accommodation REAL DEFAULT 0",
    "ALTER TABLE expense_items ADD COLUMN transport REAL DEFAULT 0",
    "ALTER TABLE expense_items ADD COLUMN fuel REAL DEFAULT 0",
    "ALTER TABLE expense_items ADD COLUMN meal REAL DEFAULT 0",
    "ALTER TABLE expense_items ADD COLUMN other REAL DEFAULT 0",
    "ALTER TABLE expense_reports ADD COLUMN manager_approval_note TEXT",
    "ALTER TABLE expense_reports ADD COLUMN manager_approval_date TEXT",
    "ALTER TABLE expense_reports ADD COLUMN manager_id TEXT",
    "ALTER TABLE expense_reports ADD COLUMN manager_name TEXT",
    "ALTER TABLE expense_reports ADD COLUMN ik_approval_note TEXT",
    "ALTER TABLE expense_reports ADD COLUMN ik_approval_date TEXT",
    // Masraf raporu: frontend'in (ExpenseReportDialog create + ExpenseApprovalDialog
    // onay + tum goruntuleme ekranlari) bastan beri kullandigi ama db.js'e hic
    // eklenmemis sutunlar. Idempotent -- prod'da elle eklenmisse "duplicate column"
    // hatasi migration dongusundeki try/catch'te yutulur.
    "ALTER TABLE expense_reports ADD COLUMN project_name TEXT",
    "ALTER TABLE expense_reports ADD COLUMN trip_start_date TEXT",
    "ALTER TABLE expense_reports ADD COLUMN trip_end_date TEXT",
    "ALTER TABLE expense_reports ADD COLUMN advance_amount REAL DEFAULT 0",
    "ALTER TABLE expense_reports ADD COLUMN department_manager TEXT",
    "ALTER TABLE expense_reports ADD COLUMN manager_approver_name TEXT",
    "ALTER TABLE expense_reports ADD COLUMN ik_approver_name TEXT",
    "ALTER TABLE expense_reports ADD COLUMN rejection_reason TEXT",
    "ALTER TABLE customers ADD COLUMN latitude REAL",
    "ALTER TABLE customers ADD COLUMN longitude REAL",
    "ALTER TABLE customers ADD COLUMN district TEXT",
    "ALTER TABLE customers ADD COLUMN party TEXT",
    "ALTER TABLE customers ADD COLUMN top_manager TEXT",
    "ALTER TABLE customers ADD COLUMN contact_title TEXT",
    "ALTER TABLE customers ADD COLUMN follow_status TEXT DEFAULT 'rutin_takip'",
    "ALTER TABLE customers ADD COLUMN is_potential INTEGER DEFAULT 0",
    "ALTER TABLE customers ADD COLUMN next_visit_date TEXT",
    "ALTER TABLE definitions ADD COLUMN color TEXT DEFAULT 'blue'",
    "ALTER TABLE definitions ADD COLUMN icon TEXT",
    "ALTER TABLE customers ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE job_tickets ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE job_projects ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE job_tickets ADD COLUMN pilot_customer_id TEXT",
    "ALTER TABLE job_tickets ADD COLUMN pilot_customer_name TEXT",
    "ALTER TABLE job_tickets ADD COLUMN customer_contact_id TEXT",
    "ALTER TABLE job_tickets ADD COLUMN customer_contact_name TEXT",
    "ALTER TABLE definitions ADD COLUMN parent_key TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN product_id TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN product_name TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN selected_modules TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN price REAL",
    "ALTER TABLE customer_contracts ADD COLUMN currency TEXT DEFAULT 'TRY'",
    "ALTER TABLE customer_contracts ADD COLUMN special_terms TEXT",
    "ALTER TABLE employees ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE leave_requests ADD COLUMN half_day_period TEXT",
    "ALTER TABLE employees ADD COLUMN card_uid TEXT",
    "ALTER TABLE leave_requests ADD COLUMN is_signed INTEGER DEFAULT 0",
    "ALTER TABLE definitions ADD COLUMN board_id TEXT",
    "ALTER TABLE definitions ADD COLUMN board_name TEXT",
    "ALTER TABLE conversations ADD COLUMN archived_by TEXT DEFAULT '[]'",
    "ALTER TABLE conversations ADD COLUMN deleted_by TEXT DEFAULT '{}'",
    "ALTER TABLE messages ADD COLUMN reply_to_id TEXT",
    "ALTER TABLE employees ADD COLUMN show_in_job_tracking INTEGER DEFAULT 0",
    "ALTER TABLE job_tickets ADD COLUMN board_sort REAL",
    "ALTER TABLE hakedisler ADD COLUMN customer_id TEXT",
    "ALTER TABLE hakedisler ADD COLUMN contract_id TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN contract_value REAL",
    "ALTER TABLE customer_contracts ADD COLUMN hakedis_start_date TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN installment_count INTEGER",
    "ALTER TABLE customer_contracts ADD COLUMN products TEXT",
    "ALTER TABLE customer_contracts ADD COLUMN pesin_orani REAL",
    "ALTER TABLE customer_contracts ADD COLUMN pesin_tutari REAL",
    "ALTER TABLE customer_contracts ADD COLUMN hakedis_period INTEGER DEFAULT 1",
    "ALTER TABLE customer_contracts ADD COLUMN kdv_durumu TEXT",
    "ALTER TABLE hakedisler ADD COLUMN pesin_tutari REAL",
    "ALTER TABLE hakedisler ADD COLUMN tahsilat TEXT",
    "ALTER TABLE messages ADD COLUMN reactions TEXT DEFAULT '{}'",
    // Stok/Depo modulu: cari kart = customers tablosu genisletilir (ayri firma
    // tablosu yok). Bir firma hem musteri hem tedarikci olabilir.
    "ALTER TABLE customers ADD COLUMN is_supplier INTEGER DEFAULT 0",
    "ALTER TABLE customers ADD COLUMN supplier_code TEXT",
    "ALTER TABLE customers ADD COLUMN tax_office TEXT",
    "ALTER TABLE customers ADD COLUMN payment_method TEXT",
    "ALTER TABLE customers ADD COLUMN payment_term_days INTEGER DEFAULT 0",
    "ALTER TABLE customers ADD COLUMN gsm TEXT",
    "ALTER TABLE customers ADD COLUMN website TEXT",
    "ALTER TABLE customers ADD COLUMN working_region TEXT",
    // is_customer: satis "Musteriler" listesi bunu 1 kabul eder. Mevcut kayitlar
    // ve normal musteri girisi 1 (varsayilan). Stok modulunden acilan saf tedarikci
    // is_customer=0 ile eklenir -> satis listesinde gorunmez, sadece Tedarikciler'de.
    "ALTER TABLE customers ADD COLUMN is_customer INTEGER DEFAULT 1",
    // customers tablosunda fiilen olmayan ama form/ALLOWED_COLUMNS'un beklediği cari
    // alanları (Tedarikçiler formu bunları doğrudan customers'a yazıyor; kolon yoksa
    // sessizce düşüyordu). Müşteri iletişim kişileri ayrıca customer_contacts'ta tutulur.
    "ALTER TABLE customers ADD COLUMN contact_person TEXT",
    "ALTER TABLE customers ADD COLUMN phone TEXT",
    "ALTER TABLE customers ADD COLUMN email TEXT",
    "ALTER TABLE customers ADD COLUMN tax_number TEXT",
    "ALTER TABLE customers ADD COLUMN address TEXT",
    "ALTER TABLE customers ADD COLUMN country TEXT",
    // Seri no takibi: hareket satırına seri no (çıkışta "bu SN bu depoda mı" kontrolü için).
    "ALTER TABLE stok_hareketler ADD COLUMN seri_no TEXT",
    // ── İK / Özlük / Bordro modülü — Faz 1: personel özlük + ücret genişletme ──
    // SGK meslek kodu (ör. 4225.03), kanun_no = SGK teşvik no; ücretler resmî aylık +
    // türetilmiş saatlik/dakikalık; sahsi_hesap = ayrı banka hesabına ödenen bileşen.
    "ALTER TABLE employees ADD COLUMN sube_id TEXT",
    "ALTER TABLE employees ADD COLUMN bolum_id TEXT",
    "ALTER TABLE employees ADD COLUMN meslek_kodu TEXT",
    "ALTER TABLE employees ADD COLUMN kanun_no TEXT",
    "ALTER TABLE employees ADD COLUMN emekli_mi INTEGER DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN personel_adresi TEXT",
    "ALTER TABLE employees ADD COLUMN aylik_ucret REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN saatlik_ucret REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN dakikalik_ucret REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN ticket_aylik REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN sahsi_hesap_aktif INTEGER DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN sahsi_hesap_tutar REAL DEFAULT 0",
    "ALTER TABLE employees ADD COLUMN sahsi_hesap_banka TEXT",
    "ALTER TABLE employees ADD COLUMN sahsi_hesap_iban TEXT",
    "ALTER TABLE employees ADD COLUMN sahsi_hesap_aciklama TEXT",
    "ALTER TABLE employees ADD COLUMN vardiya_id TEXT",
    // İK Faz 12 gözden geçirme: cumartesi çalışılmayan işyeri varsayılanı + iç borç aylık taksiti
    "ALTER TABLE ik_hakedis_genel_ayar ADD COLUMN cumartesi_tatil INTEGER DEFAULT 1",
    "ALTER TABLE ik_ic_borclar ADD COLUMN aylik_taksit REAL DEFAULT 0",
    // Bordro gözden geçirme: yasal kesinti (SGK/gelir vergisi/damga vergisi) motoru için
    // gerçek kolonlar + kapalı dönem kaydının genel API'den kalıcı silinmesini engellemek
    // için soft-delete kolonu.
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN is_deleted INTEGER DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN sgk_matrah REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN sgk_isci REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN issizlik_isci REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN gelir_vergisi_matrahi REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN gelir_vergisi REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN damga_vergisi REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN kumulatif_matrah_oncesi REAL DEFAULT 0",
    "ALTER TABLE ik_bordro_satirlari ADD COLUMN kumulatif_matrah_sonrasi REAL DEFAULT 0",
    // Ay kapanışı geçmişi: her kapatma/açma işlemi audit_log'a yazılıyor, ama en son
    // kapanış bilgisini (kim/ne zaman) "Geri Al" ile sıfırlamak yerine bir önceki
    // kapanışı da saklıyoruz ki dönem tekrar kapanmadan önceki durum kaybolmasın.
    "ALTER TABLE ik_bordro_donemleri ADD COLUMN onceki_kapatan TEXT",
    "ALTER TABLE ik_bordro_donemleri ADD COLUMN onceki_kapanis_tarihi TEXT",
    // Zimmet yeniden yapılandırma: tekil demirbaş yerine miktar bazlı malzeme
    // zimmetleme + kişi/yer hedefi. Rezervasyon satırı zimmetten doğduysa iz sürmek
    // için (kullanılabilir stok hesabı ve çıkış engeli zaten stok_rezervasyonlar'ı okuyor).
    "ALTER TABLE stok_rezervasyonlar ADD COLUMN zimmet_satir_id TEXT",
    "ALTER TABLE stok_rezervasyonlar ADD COLUMN seri_no TEXT",
    "ALTER TABLE stok_zimmetler ADD COLUMN yer_id TEXT",
    "ALTER TABLE stok_zimmetler ADD COLUMN yer_adi TEXT",
    "ALTER TABLE stok_zimmetler ADD COLUMN depo_id TEXT",
    "ALTER TABLE stok_zimmetler ADD COLUMN depo_adi TEXT",
    "ALTER TABLE stok_zimmetler ADD COLUMN is_deleted INTEGER DEFAULT 0",
  ];

  // Yeni modüller için otomatik role_permissions ekleme
  try {
    const allRoles = db.prepare('SELECT name FROM roles').all().map(r => r.name);
    const allModules = [
      'dashboard','employees','customers',
      'messages','todos','leave_requests','my_leave_requests','ik_leave_requests',
      // GUVENLIK/DUZELTME: 'personel_hareketleri' (PDKS/card_logs) burada hic
      // listede degildi -- checkPermission fail-closed oldugu icin admin
      // disinda HICBIR role bu modul hicbir zaman verilemiyordu, admin
      // ekranindan izin verilse bile etkisizdi.
      'personel_hareketleri',
      'personal_calendar','reports','employee_report','users','app_version','definitions',
      'customer_map','expenses','leave_allowances','leave_types','is_takibi','is_takibi_dashboard',
      'is_takibi_projeler','is_takibi_biletler','is_takibi_kanban','is_takibi_tanimlar',
      'ik_expense_requests','announcements','support_center','org_chart','quick_report',
      'hakedisler','sozlesmeler','oturum_yonetimi',
      // ── Stok / Depo Yönetimi modülü ──────────────────────────────
      // Faz 1: Tanımlar
      'stok_urunler','stok_gruplar','stok_depolar','stok_raflar','stok_urun_raf',
      'stok_sahalar','stok_tedarikciler',
      // Faz 2: Hareket fişleri
      'stok_giris','stok_cikis','stok_transfer','stok_fisler',
      // Tedarikçiye iade (RMA)
      'stok_iade',
      // Faz 3: FIFO / parti
      'stok_parti_takibi',
      // Faz 4: Sayım
      'stok_sayim',
      // Faz 5: Malzeme Talep
      'stok_talep',
      // Proje/saha rezervasyonu
      'stok_rezervasyon',
      // Faz 6: Raporlar
      'stok_raporlar',
      // Faz 7: Satın Alma
      'stok_satinalma',
      // Faz 8: Zimmet / El Aletleri
      'stok_zimmet', 'stok_zimmet_yerleri',
      // Faz 9-11: Mobil, Etiket, Excel, Dashboard
      'stok_mobil','stok_etiket','stok_excel','stok_dashboard',
      // Faz 13: QNB e-Belge
      'stok_qnb',
      // Faz 14: Fiyat Araştır
      'stok_fiyat_arastir',
      // ── İK / Özlük / Bordro modülü (önek: ikb_) ──────────────────
      // Faz 1: şube, bölüm, bordro personel işlemleri (zam/çıkış/ücret geçmişi yetkisi), zam, şahsi hesap
      'ikb_subeler','ikb_bolumler','ikb_personel','ikb_zam','ikb_ozluk_evrak',
      // Faz 2: vardiya + tatil
      'ikb_vardiyalar','ikb_vardiya_atama','ikb_vardiya_planlari','ikb_tatil_sihirbazi',
      // Faz 3-4: puantaj
      'ikb_puantaj','ikb_puantaj_rapor',
      // Faz 5: mesai
      'ikb_mesai',
      // Faz 6: hak ediş ayarları
      'ikb_hakedis_ayar','ikb_bordro_yemek',
      // Faz 7-8: kesinti + borç + masraf
      'ikb_kesinti','ikb_ic_borc','ikb_personel_masraf',
      // Faz 9-10: bordro + ay kapanışı
      'ikb_bordro','ikb_maas_ozet','ikb_ay_kapanis','ikb_sirket',
      // Faz 11: evrak + tutanak + ilan + izin evrak
      'ikb_tutanak','ikb_ilan','ikb_izin_evrak',
      // Faz 12: dashboard
      'ikb_dashboard',
    ];
    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();
    allRoles.forEach(role => {
      allModules.forEach(module => {
        const exists = db.prepare('SELECT id FROM role_permissions WHERE role_name=? AND module=?').get(role, module);
        if (!exists) {
          db.prepare('INSERT INTO role_permissions (id, role_name, module, can_view, can_add, can_edit, can_delete, created_date, updated_date) VALUES (?, ?, ?, 0, 0, 0, 0, ?, ?)').run(uuidv4(), role, module, now, now);
        }
      });
    });
  } catch(e) { console.error('Auto perms error:', e.message); }

  // hakedisler modulu ilk kurulumda: hic can_view=1 satiri yoksa YALNIZ admin tam yetki.
  // (yonetici/ik gerekirse Yetkilendirme ekranindan verilir.) Bir kez calisir.
  try {
    const anyView = db.prepare("SELECT 1 FROM role_permissions WHERE module='hakedisler' AND can_view=1 LIMIT 1").get();
    if (!anyView) {
      db.prepare("UPDATE role_permissions SET can_view=1,can_add=1,can_edit=1,can_delete=1,updated_date=datetime('now') WHERE module='hakedisler' AND role_name='admin'").run();
    }
  } catch(e) { console.error('hakedisler perms default:', e.message); }

  // sozlesmeler modulu ilk kurulumda: YALNIZ admin tam yetki.
  try {
    const anyView = db.prepare("SELECT 1 FROM role_permissions WHERE module='sozlesmeler' AND can_view=1 LIMIT 1").get();
    if (!anyView) {
      db.prepare("UPDATE role_permissions SET can_view=1,can_add=1,can_edit=1,can_delete=1,updated_date=datetime('now') WHERE module='sozlesmeler' AND role_name='admin'").run();
    }
  } catch(e) { console.error('sozlesmeler perms default:', e.message); }

  // oturum_yonetimi modulu ilk kurulumda: admin + yonetici tam yetki
  // (backend endpoint'leri zaten sadece bu iki role'u kabul ediyor).
  try {
    const anyView = db.prepare("SELECT 1 FROM role_permissions WHERE module='oturum_yonetimi' AND can_view=1 LIMIT 1").get();
    if (!anyView) {
      db.prepare("UPDATE role_permissions SET can_view=1,can_add=1,can_edit=1,can_delete=1,updated_date=datetime('now') WHERE module='oturum_yonetimi' AND role_name IN ('admin','yonetici')").run();
    }
  } catch(e) { console.error('oturum_yonetimi perms default:', e.message); }

  // ===== STOK / DEPO YÖNETİMİ MODÜLÜ =====
  // Tanım tabloları. Diğer fazların tabloları kendi bloklarında eklenecek.
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_urun_gruplari (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, ust_grup_id TEXT, ust_grup_adi TEXT,
        sira REAL DEFAULT 0, aktif INTEGER DEFAULT 1, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_urunler (
        id TEXT PRIMARY KEY, kod TEXT, ad TEXT NOT NULL, barkod TEXT,
        grup_id TEXT, grup_adi TEXT, uretici_kodu TEXT, uretici TEXT, urun_tipi TEXT,
        marka TEXT, model TEXT, ana_birim TEXT DEFAULT 'ADET', kdv REAL DEFAULT 20,
        alis_fiyati REAL DEFAULT 0, satis_fiyati REAL DEFAULT 0,
        varsayilan_raf_omru_ay REAL DEFAULT 0, skt_uyari_gun REAL DEFAULT 30,
        el_aleti_takip INTEGER DEFAULT 0, seri_no_takip INTEGER DEFAULT 0,
        gorsel_url TEXT, aktif INTEGER DEFAULT 1, notlar TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_urun_birimleri (
        id TEXT PRIMARY KEY, urun_id TEXT NOT NULL, birim_adi TEXT NOT NULL,
        carpan REAL DEFAULT 1, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_urun_barkodlari (
        id TEXT PRIMARY KEY, urun_id TEXT NOT NULL, barkod TEXT NOT NULL, birim TEXT,
        created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_depolar (
        id TEXT PRIMARY KEY, kod TEXT, ad TEXT NOT NULL,
        turu TEXT DEFAULT 'fiziksel',        -- fiziksel | arac | el_aleti
        adres TEXT, plaka TEXT, sorumlu_personel_id TEXT,
        isletim_modu TEXT DEFAULT 'normal',  -- normal | el_aleti
        aktif INTEGER DEFAULT 1,
        kural_giris INTEGER DEFAULT 1, kural_cikis INTEGER DEFAULT 1, kural_transfer INTEGER DEFAULT 1,
        sira REAL DEFAULT 0, notlar TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_raflar (
        id TEXT PRIMARY KEY, depo_id TEXT NOT NULL, depo_adi TEXT, kod TEXT, ad TEXT,
        tip TEXT DEFAULT 'STANDART', kapasite REAL DEFAULT 0, aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_urun_raf (
        id TEXT PRIMARY KEY, urun_id TEXT NOT NULL, urun_adi TEXT,
        depo_id TEXT NOT NULL, depo_adi TEXT, raf_id TEXT, raf_adi TEXT,
        min_seviye REAL DEFAULT 0, max_seviye REAL DEFAULT 0,
        varsayilan INTEGER DEFAULT 0, notlar TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_sahalar (
        id TEXT PRIMARY KEY, kod TEXT, ad TEXT NOT NULL, adres TEXT, yetkili TEXT,
        telefon TEXT, customer_id TEXT, aktif INTEGER DEFAULT 1, notlar TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_teslimat_adresleri (
        id TEXT PRIMARY KEY, baslik TEXT, adres TEXT NOT NULL,
        customer_id TEXT, saha_id TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_urunler_grup ON stok_urunler(grup_id);
      CREATE INDEX IF NOT EXISTS idx_stok_urunler_barkod ON stok_urunler(barkod);
      CREATE INDEX IF NOT EXISTS idx_stok_urunler_kod ON stok_urunler(kod);
      CREATE INDEX IF NOT EXISTS idx_stok_urun_birim_urun ON stok_urun_birimleri(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_urun_barkod_urun ON stok_urun_barkodlari(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_raflar_depo ON stok_raflar(depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_urun_raf_urun ON stok_urun_raf(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_urun_raf_depo ON stok_urun_raf(depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_gruplari_ust ON stok_urun_gruplari(ust_grup_id);
    `);
  } catch(e) { console.error('stok tablolari:', e.message); }

  // ── Stok Faz 2: hareket fişleri + onay akışı + türetilmiş hareketler ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_fisler (
        id TEXT PRIMARY KEY, fis_no TEXT, tip TEXT NOT NULL,      -- giris | cikis | transfer | sayim | talep
        tarih TEXT, durum TEXT DEFAULT 'taslak',                  -- taslak | onay_bekliyor | onayli | iptal
        cari_id TEXT, cari_adi TEXT,
        kaynak_depo_id TEXT, kaynak_depo_adi TEXT,
        hedef_depo_id TEXT, hedef_depo_adi TEXT,
        hedef_saha_id TEXT, hedef_saha_adi TEXT,
        fatura_no TEXT, irsaliye_no TEXT, belge_no TEXT, aciklama TEXT,
        teslim_eden TEXT, teslim_alan TEXT, gonderim_adresi TEXT,
        kaynak_ref_tip TEXT, kaynak_ref_id TEXT,                  -- ör. talep -> cikis fisi
        satir_sayisi INTEGER DEFAULT 0, toplam_miktar REAL DEFAULT 0,
        olusturan TEXT, onaylayan TEXT, onay_tarihi TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_fis_satirlari (
        id TEXT PRIMARY KEY, fis_id TEXT NOT NULL,
        urun_id TEXT, urun_adi TEXT, urun_kodu TEXT, barkod TEXT,
        kaynak_raf_id TEXT, kaynak_raf_adi TEXT, hedef_raf_id TEXT, hedef_raf_adi TEXT,
        birim TEXT, carpan REAL DEFAULT 1, miktar REAL DEFAULT 0, miktar_ana_birim REAL DEFAULT 0,
        birim_fiyat REAL DEFAULT 0, tutar REAL DEFAULT 0, icerik_aciklamasi TEXT,
        lot_no TEXT, uretim_tarihi TEXT, raf_omru_ay REAL, kontrol_tarihi TEXT, skt TEXT,
        raf_omru_durumu TEXT, seri_no TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_hareketler (
        id TEXT PRIMARY KEY, urun_id TEXT, urun_adi TEXT,
        depo_id TEXT, depo_adi TEXT, raf_id TEXT, raf_adi TEXT,
        tip TEXT,                                                 -- giris | cikis
        miktar REAL DEFAULT 0, birim_maliyet REAL DEFAULT 0,
        fis_id TEXT, fis_no TEXT, fis_tip TEXT, fis_satir_id TEXT,
        cari_id TEXT, saha_id TEXT, tarih TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_fisler_tip ON stok_fisler(tip);
      CREATE INDEX IF NOT EXISTS idx_stok_fisler_durum ON stok_fisler(durum);
      CREATE INDEX IF NOT EXISTS idx_stok_fisler_no ON stok_fisler(fis_no);
      CREATE INDEX IF NOT EXISTS idx_stok_fis_sat_fis ON stok_fis_satirlari(fis_id);
      CREATE INDEX IF NOT EXISTS idx_stok_hrk_urun ON stok_hareketler(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_hrk_depo ON stok_hareketler(depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_hrk_fis ON stok_hareketler(fis_id);
    `);
  } catch(e) { console.error('stok faz2 tablolari:', e.message); }

  // ── Stok Faz 3: FIFO partileri + tahsis (raf ömrü / lot / maliyet izi) ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_partiler (
        id TEXT PRIMARY KEY, urun_id TEXT, urun_adi TEXT,
        depo_id TEXT, depo_adi TEXT, raf_id TEXT, raf_adi TEXT,
        lot_no TEXT, uretim_tarihi TEXT, skt TEXT, kontrol_tarihi TEXT,
        giris_miktar REAL DEFAULT 0, kalan_bakiye REAL DEFAULT 0,
        alis_maliyeti REAL DEFAULT 0,                 -- ana birim başına
        tedarikci_cari_id TEXT, tedarikci_adi TEXT,
        durum TEXT DEFAULT 'acik',                    -- acik | kapali | suresi_gecti
        kaynak_tip TEXT,                              -- giris | transfer | sayim | fifo_rebuild
        kaynak_fis_id TEXT, kaynak_fis_no TEXT, kaynak_fis_satir_id TEXT,
        giris_tarihi TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_parti_tahsis (
        id TEXT PRIMARY KEY, parti_id TEXT NOT NULL,
        cikis_fis_id TEXT, cikis_fis_no TEXT, cikis_fis_satir_id TEXT,
        urun_id TEXT, depo_id TEXT, dusulen_miktar REAL DEFAULT 0, maliyet REAL DEFAULT 0,
        tarih TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_parti_urun_depo ON stok_partiler(urun_id, depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_parti_durum ON stok_partiler(durum);
      CREATE INDEX IF NOT EXISTS idx_stok_parti_kaynak ON stok_partiler(kaynak_fis_id);
      CREATE INDEX IF NOT EXISTS idx_stok_tahsis_parti ON stok_parti_tahsis(parti_id);
      CREATE INDEX IF NOT EXISTS idx_stok_tahsis_fis ON stok_parti_tahsis(cikis_fis_id);
    `);
  } catch(e) { console.error('stok faz3 tablolari:', e.message); }

  // ── Stok Faz 4: fiziksel sayım / envanter ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_sayimlar (
        id TEXT PRIMARY KEY, sayim_no TEXT, depo_id TEXT, depo_adi TEXT, tarih TEXT,
        tip TEXT DEFAULT 'tam',                       -- tam | kismi
        durum TEXT DEFAULT 'taslak',                  -- taslak | sayiliyor | fark_onay | tamamlandi | iptal
        aciklama TEXT, satir_sayisi INTEGER DEFAULT 0, farkli_satir INTEGER DEFAULT 0,
        olusturan TEXT, onaylayan TEXT, tamamlanma_tarihi TEXT,
        duzeltme_giris_fis_id TEXT, duzeltme_cikis_fis_id TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_sayim_satirlari (
        id TEXT PRIMARY KEY, sayim_id TEXT NOT NULL,
        urun_id TEXT, urun_adi TEXT, urun_kodu TEXT, raf_id TEXT, raf_adi TEXT,
        sistem_miktar REAL DEFAULT 0, sayilan_miktar REAL, fark REAL DEFAULT 0,
        sayan TEXT, not_ TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_sayim_depo ON stok_sayimlar(depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_sayim_sat ON stok_sayim_satirlari(sayim_id);
    `);
  } catch(e) { console.error('stok faz4 tablolari:', e.message); }

  // ── Stok Faz 5: malzeme talep / iş emri ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_talepler (
        id TEXT PRIMARY KEY, talep_no TEXT, talep_eden TEXT, departman TEXT,
        hedef_saha_id TEXT, hedef_saha_adi TEXT, kaynak_depo_id TEXT, kaynak_depo_adi TEXT,
        is_emri_no TEXT, tarih TEXT, ihtiyac_tarihi TEXT, oncelik TEXT DEFAULT 'orta',
        durum TEXT DEFAULT 'taslak',   -- taslak | onay_bekliyor | onayli | kismen_sevk | sevk_edildi | iptal
        aciklama TEXT, satir_sayisi INTEGER DEFAULT 0,
        olusturan TEXT, onaylayan TEXT, onay_tarihi TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_talep_satirlari (
        id TEXT PRIMARY KEY, talep_id TEXT NOT NULL,
        urun_id TEXT, urun_adi TEXT, urun_kodu TEXT,
        miktar REAL DEFAULT 0, birim TEXT, karsilanan_miktar REAL DEFAULT 0, not_ TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_talep_durum ON stok_talepler(durum);
      CREATE INDEX IF NOT EXISTS idx_stok_talep_sat ON stok_talep_satirlari(talep_id);
    `);
  } catch(e) { console.error('stok faz5 tablolari:', e.message); }

  // ── Stok: proje / saha rezervasyonu (stok ayırma) ──
  // Rezervasyon hareket üretmez; "kullanılabilir stok = mevcut − açık rezervasyon".
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_rezervasyonlar (
        id TEXT PRIMARY KEY, rez_no TEXT,
        urun_id TEXT NOT NULL, urun_adi TEXT,
        depo_id TEXT NOT NULL, depo_adi TEXT,
        saha_id TEXT, saha_adi TEXT, talep_id TEXT, talep_no TEXT,
        miktar REAL DEFAULT 0, karsilanan REAL DEFAULT 0,
        durum TEXT DEFAULT 'acik',                                -- acik | kullanildi | iptal
        tarih TEXT, ihtiyac_tarihi TEXT, aciklama TEXT,
        olusturan TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_rez_urun_depo ON stok_rezervasyonlar(urun_id, depo_id);
      CREATE INDEX IF NOT EXISTS idx_stok_rez_durum ON stok_rezervasyonlar(durum);
      CREATE INDEX IF NOT EXISTS idx_stok_rez_talep ON stok_rezervasyonlar(talep_id);
      -- Hangi çıkış/iade fişi hangi rezervasyondan ne kadar tüketti (iptalde geri yüklemek için).
      CREATE TABLE IF NOT EXISTS stok_rezervasyon_tuketim (
        id TEXT PRIMARY KEY, rez_id TEXT NOT NULL, fis_id TEXT NOT NULL, miktar REAL DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_rez_tuketim_fis ON stok_rezervasyon_tuketim(fis_id);
    `);
  } catch(e) { console.error('stok rezervasyon tablosu:', e.message); }

  // ── Stok Faz 7: satın alma (ürün-tedarikçi eşleştirme + fiyat geçmişi) ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_urun_tedarikci (
        id TEXT PRIMARY KEY, urun_id TEXT, urun_adi TEXT, cari_id TEXT, cari_adi TEXT,
        tedarikci_urun_kodu TEXT, marka TEXT, model TEXT, birim TEXT DEFAULT 'ADET',
        birim_fiyat REAL DEFAULT 0, para_birimi TEXT DEFAULT 'TRY', fiyat_tarihi TEXT,
        teslim_suresi_gun REAL DEFAULT 0, min_siparis REAL DEFAULT 1, stok_durumu TEXT,
        tercih_edilen INTEGER DEFAULT 0, aktif INTEGER DEFAULT 1, not_ TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_fiyat_gecmisi (
        id TEXT PRIMARY KEY, urun_id TEXT, urun_adi TEXT, cari_id TEXT, cari_adi TEXT,
        alis_fiyati REAL DEFAULT 0, para_birimi TEXT DEFAULT 'TRY', tarih TEXT,
        kaynak TEXT DEFAULT 'manuel',   -- manuel | stok_giris | excel | qnb
        fis_no TEXT, not_ TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_ut_urun ON stok_urun_tedarikci(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_ut_cari ON stok_urun_tedarikci(cari_id);
      CREATE INDEX IF NOT EXISTS idx_stok_fg_urun ON stok_fiyat_gecmisi(urun_id);
      CREATE INDEX IF NOT EXISTS idx_stok_fg_tarih ON stok_fiyat_gecmisi(tarih);
    `);
  } catch(e) { console.error('stok faz7 tablolari:', e.message); }

  // ── Stok Faz 8: el aletleri / demirbaş + terminli zimmet ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_personeller (
        id TEXT PRIMARY KEY, kod TEXT, ad_soyad TEXT NOT NULL, telefon TEXT, eposta TEXT,
        departman TEXT, employee_id TEXT, aktif INTEGER DEFAULT 1, not_ TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_demirbaslar (
        id TEXT PRIMARY KEY, varlik_kodu TEXT, urun_id TEXT, urun_adi TEXT,
        depo_id TEXT, depo_adi TEXT, raf_id TEXT, raf_adi TEXT,
        seri_no TEXT, barkod TEXT, alis_tarihi TEXT, garanti_bitis TEXT, kondisyon TEXT,
        durum TEXT DEFAULT 'kullanilabilir',   -- kullanilabilir | personelde | bakimda | hurda
        not_ TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_zimmetler (
        id TEXT PRIMARY KEY, zimmet_no TEXT, demirbas_id TEXT, demirbas_adi TEXT, varlik_kodu TEXT,
        personel_id TEXT, personel_adi TEXT, saha_id TEXT, saha_adi TEXT,
        teslim_tarihi TEXT, termin_tarihi TEXT, teslim_notu TEXT, iade_tarihi TEXT, iade_notu TEXT,
        durum TEXT DEFAULT 'acik',   -- acik | iade
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_demirbas_durum ON stok_demirbaslar(durum);
      CREATE INDEX IF NOT EXISTS idx_stok_zimmet_demirbas ON stok_zimmetler(demirbas_id);
      CREATE INDEX IF NOT EXISTS idx_stok_zimmet_durum ON stok_zimmetler(durum);
    `);
  } catch(e) { console.error('stok faz8 tablolari:', e.message); }

  // ── Stok Faz 15: Zimmet yeniden yapılandırma — miktar bazlı çoklu malzeme,
  // kişi ve/veya yer hedefi, kısmi iade. stok_demirbaslar/stok_personeller artık
  // kullanılmıyor (dokunulmadı, eski veri kalsın). ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_zimmet_yerleri (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, aciklama TEXT, aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_zimmet_satirlari (
        id TEXT PRIMARY KEY, zimmet_id TEXT NOT NULL,
        urun_id TEXT, urun_adi TEXT, seri_no TEXT, birim TEXT,
        miktar REAL DEFAULT 0, iade_miktar REAL DEFAULT 0,
        rezervasyon_id TEXT,
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_zimmet_satir_zimmet ON stok_zimmet_satirlari(zimmet_id);
    `);
  } catch(e) { console.error('stok faz15 tablolari:', e.message); }

  // ── Stok Faz 10: etiket baskı + Excel stok yükleme ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_etiket_fisleri (
        id TEXT PRIMARY KEY, fis_no TEXT, tarih TEXT, kullanici TEXT, dizayn TEXT DEFAULT 'standart',
        satirlar_json TEXT DEFAULT '[]', toplam_etiket INTEGER DEFAULT 0, durum TEXT DEFAULT 'aktif',
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_excel_yuklemeler (
        id TEXT PRIMARY KEY, yukleme_no TEXT, dosya_adi TEXT, yukleyen TEXT,
        depo_id TEXT, depo_adi TEXT, olusan_fis_id TEXT, olusan_fis_no TEXT,
        satir_toplam INTEGER DEFAULT 0, satir_yeni INTEGER DEFAULT 0, satir_atlanan INTEGER DEFAULT 0,
        durum TEXT DEFAULT 'aktif',   -- aktif | geri_alindi
        tarih TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_excel_fis ON stok_excel_yuklemeler(olusan_fis_id);
    `);
  } catch(e) { console.error('stok faz10 tablolari:', e.message); }

  // ── Stok Faz 13: QNB e-Belge entegrasyonu (test/taslak modu) ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS stok_qnb_ayarlar (
        id INTEGER PRIMARY KEY CHECK (id=1), ortam TEXT DEFAULT 'test',
        genel_url TEXT, efatura_url TEXT, earsiv_url TEXT, eirsaliye_url TEXT,
        api_kullanici TEXT, api_sifre TEXT,
        firma_unvan TEXT, vkn TEXT, vergi_dairesi TEXT, adres TEXT, il TEXT, ilce TEXT, eposta TEXT, telefon TEXT,
        para_birimi TEXT DEFAULT 'TRY', log_saklama_gun INTEGER DEFAULT 90, gecici_eslesme_gun INTEGER DEFAULT 30,
        alis_fiyat_gecmisine_isle INTEGER DEFAULT 1, aktif INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO stok_qnb_ayarlar (id) VALUES (1);
      CREATE TABLE IF NOT EXISTS stok_qnb_belgeler (
        id TEXT PRIMARY KEY, belge_no TEXT, yon TEXT, tur TEXT,   -- yon: gelen|giden ; tur: e_fatura|e_arsiv|e_irsaliye
        cari_id TEXT, cari_adi TEXT, vkn TEXT, tarih TEXT, tutar REAL DEFAULT 0,
        durum TEXT DEFAULT 'taslak',  -- taslak | gonderildi | kabul | red | arsiv
        uuid TEXT, dosya_url TEXT, kaynak_fis_id TEXT, kaynak_fis_no TEXT, stok_fis_id TEXT, stok_fis_no TEXT,
        satir_sayisi INTEGER DEFAULT 0, aciklama TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_qnb_belge_satirlari (
        id TEXT PRIMARY KEY, belge_id TEXT NOT NULL, satici_urun_adi TEXT, satici_kodu TEXT,
        miktar REAL DEFAULT 0, birim TEXT, birim_fiyat REAL DEFAULT 0,
        eslesen_urun_id TEXT, eslesen_urun_adi TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_qnb_loglar (
        id TEXT PRIMARY KEY, tarih TEXT, islem TEXT, durum TEXT, belge_id TEXT, mesaj TEXT,
        created_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS stok_qnb_cari_sorgu (
        id TEXT PRIMARY KEY, cari_id TEXT, cari_adi TEXT, vkn TEXT, tip TEXT,
        durum TEXT, alici_etiketi TEXT, aktif INTEGER DEFAULT 1, tarih TEXT, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_stok_qnb_belge_yon ON stok_qnb_belgeler(yon);
      CREATE INDEX IF NOT EXISTS idx_stok_qnb_belge_sat ON stok_qnb_belge_satirlari(belge_id);
    `);
  } catch(e) { console.error('stok faz13 tablolari:', e.message); }

  // Stok modülü ilk kurulumda: hiç can_view=1 satırı yoksa YALNIZ admin tam yetki.
  // (Depo Yetkilisi / Satın Alma / Muhasebe rolleri Yetkilendirme ekranından verilir.)
  try {
    const anyView = db.prepare("SELECT 1 FROM role_permissions WHERE module LIKE 'stok_%' AND can_view=1 LIMIT 1").get();
    if (!anyView) {
      db.prepare("UPDATE role_permissions SET can_view=1,can_add=1,can_edit=1,can_delete=1,updated_date=datetime('now') WHERE module LIKE 'stok_%' AND role_name='admin'").run();
    }
  } catch(e) { console.error('stok perms default:', e.message); }

  // ── İK / Özlük / Bordro — Faz 1: şube, bölüm, ücret geçmişi ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_subeler (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, adres TEXT,
        ip_araligi TEXT, gps_enlem REAL, gps_boylam REAL, sapma_metre REAL DEFAULT 0,
        telefon TEXT, yetkili TEXT, sira REAL DEFAULT 0, aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ik_bolumler (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, sube_id TEXT, sube_adi TEXT,
        hedef_personel_sayisi INTEGER DEFAULT 0, aciklama TEXT, aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Resmî maaş / şahsi hesap değişimlerinin izi (zam sihirbazı + manuel)
      CREATE TABLE IF NOT EXISTS ik_ucret_gecmisi (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        alan TEXT NOT NULL,            -- resmi_maas | sahsi_hesap | ticket
        eski_tutar REAL DEFAULT 0, yeni_tutar REAL DEFAULT 0,
        gecerlilik TEXT, aciklama TEXT,
        kaynak TEXT DEFAULT 'manuel',  -- manuel | zam_sihirbazi | personel_karti | excel
        created_by TEXT, created_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_bolumler_sube ON ik_bolumler(sube_id);
      CREATE INDEX IF NOT EXISTS idx_ik_ucret_gecmisi_personel ON ik_ucret_gecmisi(personel_id);
    `);
    // idx_employees_sube: employees.sube_id migration'ı bu bloktan SONRA çalışıyor →
    // index'i migration döngüsünden sonra (performanceIndexes) oluştur.
  } catch(e) { console.error('ik faz1 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 2: vardiya + resmî tatil ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_vardiyalar (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, kisa_kod TEXT DEFAULT 'G',   -- G | N
        renk TEXT DEFAULT '#2563eb',
        baslama_saati TEXT DEFAULT '08:30', bitis_saati TEXT DEFAULT '18:00',
        gec_tolerans_dk INTEGER DEFAULT 0, erken_tolerans_dk INTEGER DEFAULT 0,
        fazla_mesai_katsayisi REAL DEFAULT 1.5,
        gece_mi INTEGER DEFAULT 0, ertesi_gune_tasar INTEGER DEFAULT 0,
        rt_mesaisi_hesapla INTEGER DEFAULT 1, planlamada_kullan INTEGER DEFAULT 1,
        haftalik_izin_sayacina_ekle INTEGER DEFAULT 1,
        varsayilan INTEGER DEFAULT 0, aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Personel-vardiya atama geçmişi (tarihsel; transfer tarihinden itibaren personeller.vardiya_id değişir)
      CREATE TABLE IF NOT EXISTS ik_vardiya_atamalari (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        vardiya_id TEXT NOT NULL, vardiya_adi TEXT,
        baslangic_tarihi TEXT NOT NULL, aciklama TEXT,
        created_by TEXT, created_date TEXT DEFAULT (datetime('now'))
      );
      -- Döngüsel vardiya planı (6/1 gibi rotasyonlar)
      CREATE TABLE IF NOT EXISTS ik_vardiya_planlari (
        id TEXT PRIMARY KEY, ad TEXT NOT NULL, baslangic_tarihi TEXT, bitis_tarihi TEXT,
        ana_vardiya_id TEXT, adimlar_json TEXT DEFAULT '[]',   -- [{tip:'vardiya'|'off'|'haftalik_izin', vardiya_id}]
        haftalik_izin_kac_gun_calis INTEGER DEFAULT 0, haftalik_izin_kac_gun INTEGER DEFAULT 0,
        haftalik_izin_devret INTEGER DEFAULT 0,
        dongu_baslangic TEXT DEFAULT 'esit',                   -- esit | birinci
        personel_ids_json TEXT DEFAULT '[]', aktif INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Resmî tatiller (TR takvimi + özel gün); tip: tam | yarim ; kaynak: gomulu | api | yerel
      CREATE TABLE IF NOT EXISTS ik_resmi_tatiller (
        id TEXT PRIMARY KEY, tarih TEXT NOT NULL, ad TEXT NOT NULL,
        tip TEXT DEFAULT 'tam', kaynak TEXT DEFAULT 'gomulu', aktif INTEGER DEFAULT 1,
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_vardiya_atama_personel ON ik_vardiya_atamalari(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_resmi_tatil_tarih ON ik_resmi_tatiller(tarih);
    `);
    // TR resmî tatilleri gömülü seed (2025-2027) — bir kez, boşsa
    const rtCount = db.prepare('SELECT COUNT(*) n FROM ik_resmi_tatiller').get().n;
    if (rtCount === 0) {
      const { randomUUID } = require('crypto');
      const RT = [
        ['2025-01-01','Yılbaşı','tam'],['2025-03-29','Ramazan Bayramı Arefe','yarim'],['2025-03-30','Ramazan Bayramı 1. Gün','tam'],['2025-03-31','Ramazan Bayramı 2. Gün','tam'],['2025-04-01','Ramazan Bayramı 3. Gün','tam'],['2025-04-23','Ulusal Egemenlik ve Çocuk Bayramı','tam'],['2025-05-01','Emek ve Dayanışma Günü','tam'],['2025-05-19','Atatürk’ü Anma Gençlik ve Spor Bayramı','tam'],['2025-06-05','Kurban Bayramı Arefe','yarim'],['2025-06-06','Kurban Bayramı 1. Gün','tam'],['2025-06-07','Kurban Bayramı 2. Gün','tam'],['2025-06-08','Kurban Bayramı 3. Gün','tam'],['2025-06-09','Kurban Bayramı 4. Gün','tam'],['2025-07-15','Demokrasi ve Millî Birlik Günü','tam'],['2025-08-30','Zafer Bayramı','tam'],['2025-10-28','Cumhuriyet Bayramı Arefe','yarim'],['2025-10-29','Cumhuriyet Bayramı','tam'],
        ['2026-01-01','Yılbaşı','tam'],['2026-03-19','Ramazan Bayramı Arefe','yarim'],['2026-03-20','Ramazan Bayramı 1. Gün','tam'],['2026-03-21','Ramazan Bayramı 2. Gün','tam'],['2026-03-22','Ramazan Bayramı 3. Gün','tam'],['2026-04-23','Ulusal Egemenlik ve Çocuk Bayramı','tam'],['2026-05-01','Emek ve Dayanışma Günü','tam'],['2026-05-19','Atatürk’ü Anma Gençlik ve Spor Bayramı','tam'],['2026-05-26','Kurban Bayramı Arefe','yarim'],['2026-05-27','Kurban Bayramı 1. Gün','tam'],['2026-05-28','Kurban Bayramı 2. Gün','tam'],['2026-05-29','Kurban Bayramı 3. Gün','tam'],['2026-05-30','Kurban Bayramı 4. Gün','tam'],['2026-07-15','Demokrasi ve Millî Birlik Günü','tam'],['2026-08-30','Zafer Bayramı','tam'],['2026-10-28','Cumhuriyet Bayramı Arefe','yarim'],['2026-10-29','Cumhuriyet Bayramı','tam'],
        ['2027-01-01','Yılbaşı','tam'],['2027-04-23','Ulusal Egemenlik ve Çocuk Bayramı','tam'],['2027-05-01','Emek ve Dayanışma Günü','tam'],['2027-05-19','Atatürk’ü Anma Gençlik ve Spor Bayramı','tam'],['2027-07-15','Demokrasi ve Millî Birlik Günü','tam'],['2027-08-30','Zafer Bayramı','tam'],['2027-10-29','Cumhuriyet Bayramı','tam'],
      ];
      const ins = db.prepare("INSERT INTO ik_resmi_tatiller (id, tarih, ad, tip, kaynak) VALUES (?,?,?,?,'gomulu')");
      for (const [t, a, tip] of RT) ins.run(randomUUID(), t, a, tip);
    }
    // Varsayılan "Standart Gündüz" vardiyası — hiç vardiya yoksa
    const vCount = db.prepare('SELECT COUNT(*) n FROM ik_vardiyalar').get().n;
    if (vCount === 0) {
      const { randomUUID } = require('crypto');
      db.prepare("INSERT INTO ik_vardiyalar (id, ad, kisa_kod, baslama_saati, bitis_saati, varsayilan) VALUES (?,?,?,?,?,1)")
        .run(randomUUID(), 'Standart Gündüz', 'G', '08:30', '18:00');
    }
  } catch(e) { console.error('ik faz2 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 3-4: puantaj motoru ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_puantaj (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        tarih TEXT NOT NULL, sube_id TEXT, vardiya_id TEXT,
        giris_saat TEXT, cikis_saat TEXT, mesai_dk INTEGER DEFAULT 0,
        gec_dk INTEGER DEFAULT 0, erken_dk INTEGER DEFAULT 0, eksik_dk INTEGER DEFAULT 0,
        fazla_mesai_dk INTEGER DEFAULT 0,
        durum_kodu TEXT DEFAULT 'E',       -- N | H | T | RT | E | R | I | U | M | CT
        kayit_tipi TEXT DEFAULT 'yok',     -- rfid | qr | yonetici | manuel | toplu | izin | tatil | yok
        ozet TEXT, duzeltme_notu TEXT, kaynak TEXT DEFAULT 'motor',
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(personel_id, tarih)
      );
      CREATE TABLE IF NOT EXISTS ik_puantaj_duzeltme_log (
        id TEXT PRIMARY KEY, puantaj_id TEXT NOT NULL, personel_id TEXT, tarih TEXT,
        alan TEXT, eski TEXT, yeni TEXT, aciklama TEXT,
        actor_email TEXT, created_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_puantaj_tarih ON ik_puantaj(tarih);
      CREATE INDEX IF NOT EXISTS idx_ik_puantaj_personel ON ik_puantaj(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_puantaj_log_puantaj ON ik_puantaj_duzeltme_log(puantaj_id);
    `);
  } catch(e) { console.error('ik faz3 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 5: fazla mesai ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_mesai_kayitlari (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        tarih TEXT NOT NULL, tur TEXT DEFAULT 'fazla',      -- fazla | tatil
        katsayi REAL DEFAULT 1.5, rt_tipi TEXT DEFAULT 'tam',  -- tam | yarim (tatil mesaisi)
        sure_dk INTEGER DEFAULT 0, saatlik_ucret REAL DEFAULT 0, tutar REAL DEFAULT 0,
        onay TEXT DEFAULT 'taslak',                          -- taslak | onayli | red
        kaynak TEXT DEFAULT 'elle',                          -- elle | puantaj
        aciklama TEXT, onaylayan TEXT, onay_tarihi TEXT,
        donem_yil INTEGER, donem_ay INTEGER,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_mesai_donem ON ik_mesai_kayitlari(donem_yil, donem_ay);
      CREATE INDEX IF NOT EXISTS idx_ik_mesai_personel ON ik_mesai_kayitlari(personel_id);
    `);
  } catch(e) { console.error('ik faz5 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 6: Yol/Yemek/Ticket hak ediş + cumartesi kuralı ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_hakedis_genel_ayar (
        id INTEGER PRIMARY KEY CHECK (id=1),
        varsayilan_baz_gun REAL DEFAULT 26,
        ticket_qr_yoksa_kes INTEGER DEFAULT 1,
        ticket_e_kes INTEGER DEFAULT 1,
        ticket_izin_rapor_kes INTEGER DEFAULT 1,
        ticket_rt_kesme INTEGER DEFAULT 1,
        ticket_cumartesi_yemek_kurali INTEGER DEFAULT 1,
        cumartesi_tatil INTEGER DEFAULT 1,          -- 1: cumartesi çalışılmıyor (kart yoksa CT) · 0: çalışılıyor (kart yoksa E)
        updated_date TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO ik_hakedis_genel_ayar (id) VALUES (1);
      -- Bordro gözden geçirme: SGK primi / işsizlik sigortası / damga vergisi oranları +
      -- asgari ücret istisnası için tek satırlık ayar tablosu. DEĞERLER ÖRNEK/YER
      -- TUTUCUDUR — dogrulanmis_mi=0 iken Bordro ekranı "oranlar teyit edilmedi"
      -- uyarısı gösterir; muhasebeci güncel resmi oranları girip onaylamalı.
      CREATE TABLE IF NOT EXISTS ik_vergi_ayarlari (
        id INTEGER PRIMARY KEY CHECK (id=1),
        sgk_isci_orani REAL DEFAULT 14,
        issizlik_isci_orani REAL DEFAULT 1,
        sgk_taban REAL DEFAULT 20002.50,
        sgk_tavan REAL DEFAULT 150018.90,
        asgari_ucret_brut REAL DEFAULT 20002.50,
        damga_vergisi_orani REAL DEFAULT 0.759,
        dogrulanmis_mi INTEGER DEFAULT 0,
        dogrulayan TEXT, dogrulama_tarihi TEXT,
        updated_date TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO ik_vergi_ayarlari (id) VALUES (1);
      -- Gelir vergisi dilimleri (yıl bazlı, kümülatif matrah dilimleri). Örnek/placeholder
      -- 2026 dilimleri seed edilir; muhasebeci Bordrolama Ayarları'ndan güncelleyebilir.
      CREATE TABLE IF NOT EXISTS ik_gelir_vergisi_dilimleri (
        id TEXT PRIMARY KEY, yil INTEGER NOT NULL,
        alt_sinir REAL NOT NULL, ust_sinir REAL, oran REAL NOT NULL, sira INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now'))
      );
      -- NOT: kümülatif gelir vergisi matrahı için ayrı bir "durum" tablosu YOK —
      -- her hesaplamada personelin O YIL, bu aydan ÖNCEKİ aylara ait
      -- ik_bordro_satirlari kayıtlarından SUM ile türetilir (ikBordro.js). Bu,
      -- "Zorla Yeniden Hesapla" tekrar çalıştırıldığında kümülatif tutarın
      -- yanlışlıkla ikinci kez eklenmesini (çift sayım) yapısal olarak imkansız
      -- kılar — ayrı bir cache tablosu tutsaydık bu senkron dışı kalabilirdi.
      -- Personel bazlı Yol/Yemek/Ticket tanımı (tur başına 1 satır)
      CREATE TABLE IF NOT EXISTS ik_hakedis_tanim (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        tur TEXT NOT NULL,                     -- yol | yemek | ticket
        aktif INTEGER DEFAULT 0, baz_gun REAL DEFAULT 26, aylik_tutar REAL DEFAULT 0,
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(personel_id, tur)
      );
      -- Kişi bazlı cumartesi çalışma kuralı
      CREATE TABLE IF NOT EXISTS ik_bordro_yemek_kural (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        cumartesi_kurali TEXT DEFAULT 'calismaz',   -- calismaz | girisi_varsa_kesme
        kesinti_tipi TEXT DEFAULT 'hic',            -- hic | yemek | yol | her_ikisi | maas
        aciklama TEXT, aktif INTEGER DEFAULT 1,
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(personel_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ik_hakedis_tanim_personel ON ik_hakedis_tanim(personel_id);
    `);
  } catch(e) { console.error('ik faz6 tablolari:', e.message); }

  // Gelir vergisi dilimleri: hiç satır yoksa örnek/placeholder bir dilim seti eklenir
  // (dogrulanmis_mi=0 ile birlikte "teyit edilmedi" uyarısı tetiklenir). Bir kez çalışır;
  // muhasebeci gerçek dilimleri girdikten sonra bu satırlar Bordrolama Ayarları'ndan
  // düzenlenir/silinir, burada tekrar eklenmez.
  try {
    const anyDilim = db.prepare('SELECT 1 FROM ik_gelir_vergisi_dilimleri LIMIT 1').get();
    if (!anyDilim) {
      const { v4: uuidv4 } = require('uuid');
      const yil = new Date().getFullYear();
      const ornekDilimler = [
        [0, 158000, 15],
        [158000, 330000, 20],
        [330000, 1200000, 27],
        [1200000, 4300000, 35],
        [4300000, null, 40],
      ];
      const ins = db.prepare('INSERT INTO ik_gelir_vergisi_dilimleri (id, yil, alt_sinir, ust_sinir, oran, sira) VALUES (?,?,?,?,?,?)');
      ornekDilimler.forEach(([alt, ust, oran], i) => ins.run(uuidv4(), yil, alt, ust, oran, i));
    }
  } catch (e) { console.error('gelir vergisi dilim seed:', e.message); }

  // ── İK / Özlük / Bordro — Faz 7-8: kesinti merkezi + iç borç + masraf ──
  try {
    db.exec(`
      -- İcra / BES gibi taksitli kesinti planları
      CREATE TABLE IF NOT EXISTS ik_kesinti_planlari (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        tur TEXT NOT NULL,                       -- icra | bes
        toplam_tutar REAL DEFAULT 0, baslangic_yil INTEGER, baslangic_ay INTEGER,
        taksit_sayisi INTEGER DEFAULT 1, aylik_taksit REAL DEFAULT 0,
        referans_maas REAL DEFAULT 0,            -- icra: başlangıç ayı maaşı
        kalan_bakiye REAL DEFAULT 0, aktif INTEGER DEFAULT 1, aciklama TEXT,
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Dönem bazlı kesinti kayıtları (bordroya çekilir)
      CREATE TABLE IF NOT EXISTS ik_kesintiler (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        donem_yil INTEGER, donem_ay INTEGER,
        tur TEXT NOT NULL,                       -- avans | icra | bes | diger | gun_kes
        tutar REAL DEFAULT 0, plan_id TEXT, taksit_no INTEGER,
        aciklama TEXT, kaynak TEXT DEFAULT 'elle',   -- elle | plan | puantaj
        tarih TEXT, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Personelin şirkete borcu (içeriye borç) + taksitli tahsilat
      CREATE TABLE IF NOT EXISTS ik_ic_borclar (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        acilis_tutar REAL DEFAULT 0, kalan_bakiye REAL DEFAULT 0,
        varsayilan_kaynak TEXT DEFAULT 'maas',   -- maas | yol_yemek_ticket
        tarih TEXT, aciklama TEXT, durum TEXT DEFAULT 'acik',  -- acik | kapali
        is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ik_ic_borc_tahsilat (
        id TEXT PRIMARY KEY, borc_id TEXT NOT NULL, personel_id TEXT,
        donem_yil INTEGER, donem_ay INTEGER, tutar REAL DEFAULT 0, kaynak TEXT,
        bordro_satir_id TEXT, created_by TEXT, created_date TEXT DEFAULT (datetime('now'))
      );
      -- Personel masrafı (bordro açıklaması / kesinti kaynağı)
      CREATE TABLE IF NOT EXISTS ik_personel_masraf (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        donem_yil INTEGER, donem_ay INTEGER, tutar REAL DEFAULT 0, aciklama TEXT,
        kesinti_kaynagi TEXT DEFAULT 'sadece_not',  -- sadece_not | maas | yol | yemek | ticket | sahsi
        kilitli INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0, created_by TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_kesintiler_donem ON ik_kesintiler(donem_yil, donem_ay);
      CREATE INDEX IF NOT EXISTS idx_ik_kesintiler_personel ON ik_kesintiler(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_ic_borc_personel ON ik_ic_borclar(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_masraf_donem ON ik_personel_masraf(donem_yil, donem_ay);
    `);
  } catch(e) { console.error('ik faz7 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 9-10: bordro motoru + ay kapanışı ──
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ik_bordro_donemleri (
        id TEXT PRIMARY KEY, yil INTEGER NOT NULL, ay INTEGER NOT NULL,
        durum TEXT DEFAULT 'taslak',            -- taslak | onayli | kapali
        olusturan TEXT, onaylayan TEXT, onay_tarihi TEXT, kapatan TEXT, kapanis_tarihi TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(yil, ay)
      );
      CREATE TABLE IF NOT EXISTS ik_bordro_satirlari (
        id TEXT PRIMARY KEY, donem_id TEXT NOT NULL, personel_id TEXT NOT NULL, personel_adi TEXT,
        sube_id TEXT, sube_adi TEXT, tc TEXT, gorev TEXT,
        aylik_ucret REAL DEFAULT 0, saatlik_ucret REAL DEFAULT 0, dakikalik_ucret REAL DEFAULT 0,
        calisilan_gun REAL DEFAULT 0, eksik_gun REAL DEFAULT 0,
        resmi_maas REAL DEFAULT 0, bayram REAL DEFAULT 0, fazla_mesai REAL DEFAULT 0, prim REAL DEFAULT 0,
        yol REAL DEFAULT 0, yemek REAL DEFAULT 0, ticket REAL DEFAULT 0,
        yol_hak_gun REAL DEFAULT 0, yemek_hak_gun REAL DEFAULT 0, ticket_hak_gun REAL DEFAULT 0,
        resmi_toplam REAL DEFAULT 0, resmi_net REAL DEFAULT 0,
        avans REAL DEFAULT 0, icra REAL DEFAULT 0, bes REAL DEFAULT 0, diger_kesinti REAL DEFAULT 0,
        maas_puantaj_kes REAL DEFAULT 0, yol_kes REAL DEFAULT 0, yemek_kes REAL DEFAULT 0, ticket_kes REAL DEFAULT 0,
        personel_masrafi REAL DEFAULT 0,
        borc_maas REAL DEFAULT 0, borc_yyt REAL DEFAULT 0, borc_toplam REAL DEFAULT 0,
        sahsi_hesap_net REAL DEFAULT 0,
        fesih_tazminati REAL DEFAULT 0, ihbar_tazminati REAL DEFAULT 0, kasa_tazminati REAL DEFAULT 0,
        ozel_sigorta REAL DEFAULT 0, ozel_sigorta_es_cocuk REAL DEFAULT 0,
        genel_net REAL DEFAULT 0, manuel_override INTEGER DEFAULT 0, hesap_notu TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(donem_id, personel_id)
      );
      -- Kapsam bazlı şirket bilgileri (Puantaj CSV başlığı)
      CREATE TABLE IF NOT EXISTS ik_sirket_bilgileri (
        id TEXT PRIMARY KEY, kapsam TEXT DEFAULT 'genel',  -- genel | sube:<id>
        bolum_adi TEXT, unvan TEXT, vergi_dairesi TEXT, vergi_no TEXT, sgk_sicil TEXT, mersis TEXT,
        adres TEXT, merkez_adres TEXT, web TEXT,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')),
        UNIQUE(kapsam)
      );
      INSERT OR IGNORE INTO ik_sirket_bilgileri (id, kapsam, unvan) VALUES ('genel-default', 'genel', 'Turocas Bilişim');
      -- Toplu Excel yükleme kayıtları (geri alınabilir)
      CREATE TABLE IF NOT EXISTS ik_toplu_yukleme (
        id TEXT PRIMARY KEY, tur TEXT,        -- temel_bilgi | donem_hakedis
        dosya_adi TEXT, donem_yil INTEGER, donem_ay INTEGER,
        toplam INTEGER DEFAULT 0, eslesen INTEGER DEFAULT 0, uygulanan INTEGER DEFAULT 0, hatali INTEGER DEFAULT 0,
        onizleme_json TEXT DEFAULT '[]', durum TEXT DEFAULT 'onizleme',  -- onizleme | uygulandi | geri_alindi
        geri_alma_json TEXT DEFAULT '[]',
        created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_bordro_satir_donem ON ik_bordro_satirlari(donem_id);
    `);
  } catch(e) { console.error('ik faz9 tablolari:', e.message); }

  // ── İK / Özlük / Bordro — Faz 11: özlük evrak + tutanak/ihtar + ilanlar + izin evrak ──
  try {
    db.exec(`
      -- Özlük evrak arşivi (tekli/toplu yükleme; dosya adından otomatik eşleştirme)
      CREATE TABLE IF NOT EXISTS ik_ozluk_evraklari (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        evrak_tipi TEXT,                        -- kimlik | diploma | sozlesme | saglik_raporu | ehliyet | ...
        dosya_url TEXT, dosya_adi TEXT, tarih TEXT, aciklama TEXT, yukleyen TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- Tutanak & İhtarlar
      CREATE TABLE IF NOT EXISTS ik_tutanaklar (
        id TEXT PRIMARY KEY, personel_id TEXT NOT NULL, personel_adi TEXT,
        tur TEXT DEFAULT 'tutanak',             -- tutanak | ihtar | savunma_talebi
        tarih TEXT, konu TEXT, aciklama TEXT, dosya_url TEXT, olusturan TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- İç/dış personel ilanları
      CREATE TABLE IF NOT EXISTS ik_ilanlar (
        id TEXT PRIMARY KEY, baslik TEXT NOT NULL,
        bolum_id TEXT, bolum_adi TEXT, sube_id TEXT, sube_adi TEXT,
        durum TEXT DEFAULT 'taslak',            -- taslak | yayinda | kapali
        baslangic TEXT, bitis TEXT, detay TEXT, yetkili_notu TEXT, olusturan TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      -- İzin/rapor evrak takibi (leave_requests'e kolon eklemeden bağımsız tablo)
      CREATE TABLE IF NOT EXISTS ik_izin_evraklari (
        id TEXT PRIMARY KEY, leave_id TEXT NOT NULL, personel_id TEXT, personel_adi TEXT,
        evrak_adi TEXT, dosya_url TEXT,
        durum TEXT DEFAULT 'eksik',             -- eksik | fiziki | dijital
        aciklama TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_ik_ozluk_evrak_personel ON ik_ozluk_evraklari(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_tutanak_personel ON ik_tutanaklar(personel_id);
      CREATE INDEX IF NOT EXISTS idx_ik_izin_evrak_leave ON ik_izin_evraklari(leave_id);
    `);
  } catch(e) { console.error('ik faz11 tablolari:', e.message); }

  // İK/Bordro modülü ilk kurulumda: hiç can_view=1 satırı yoksa YALNIZ admin tam yetki.
  // (Modül anahtarları 'ikb_' önekli — mevcut ik_leave_requests/ik_tanimlar ile karışmaz.)
  try {
    const anyView = db.prepare("SELECT 1 FROM role_permissions WHERE module LIKE 'ikb_%' AND can_view=1 LIMIT 1").get();
    if (!anyView) {
      db.prepare("UPDATE role_permissions SET can_view=1,can_add=1,can_edit=1,can_delete=1,updated_date=datetime('now') WHERE module LIKE 'ikb_%' AND role_name='admin'").run();
    }
  } catch(e) { console.error('ikb perms default:', e.message); }

  // announcements tablosu
  try {
    db.exec("CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, title TEXT, content TEXT NOT NULL, color TEXT DEFAULT 'blue', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_by TEXT, created_date TEXT DEFAULT (datetime('now')), updated_date TEXT DEFAULT (datetime('now')))"); 
  } catch(e) {}
  // blocked_ips tablosu
  try {
    db.exec("CREATE TABLE IF NOT EXISTS blocked_ips (ip TEXT PRIMARY KEY, reason TEXT, blocked_at TEXT DEFAULT (datetime('now')))");
  } catch(e) {}
  // audit_log tablosu — yetki/rol degisikliklerinin izi
  try {
    db.exec("CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_email TEXT, action TEXT, target TEXT, old_value TEXT, new_value TEXT, created_date TEXT DEFAULT (datetime('now')))");
    db.exec("CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_date)");
  } catch(e) {}
  // sessions tablosu — oturum yonetimi (kim aktif, her gece 21:00 toplu kill,
  // tek tek elle sonlandirma). JWT hala 24 saat gecerli ama artik tek basina
  // yeterli degil -- her istekte bu tablodaki kayit da revoked=0 olmali.
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT, full_name TEXT, role TEXT,
      ip TEXT, user_agent TEXT, revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), last_seen_at TEXT DEFAULT (datetime('now'))
    )`);
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked)");
  } catch(e) {}

  try { db.exec("ALTER TABLE job_tickets ADD COLUMN ticket_number TEXT"); } catch(e) {}

  for (const migration of migrations) {
    try { db.exec(migration); } catch(e) {}
  }

  // show_in_job_tracking: ilk kurulumda, aktif bir bilete atanmis calisanlari
  // otomatik isaretle ki mevcut sorumlular listelerden bir anda kaybolmasin.
  // Bir kez calisir (isaretli calisan olunca tekrar dokunmaz).
  try {
    const anyFlagged = db.prepare("SELECT 1 FROM employees WHERE show_in_job_tracking=1 LIMIT 1").get();
    if (!anyFlagged) {
      db.exec(`
        UPDATE employees SET show_in_job_tracking=1 WHERE id IN (
          SELECT assigned_to_id FROM job_tickets
            WHERE assigned_to_id IS NOT NULL AND assigned_to_id != ''
              AND (is_deleted=0 OR is_deleted IS NULL)
          UNION
          SELECT je.value FROM job_tickets t,
            json_each(CASE WHEN json_valid(t.assigned_to_ids) THEN t.assigned_to_ids ELSE '[]' END) je
            WHERE (t.is_deleted=0 OR t.is_deleted IS NULL)
        )
      `);
    }
  } catch(e) { console.error('show_in_job_tracking backfill:', e.message); }

  // board_sort: pano (kanban) kolon ici manuel bilet sirasi. Ilk kurulumda
  // hicbir bilette yoksa, pano+durum bazinda created_date/ticket_number sirasina
  // gore 1..n doldur. Bir kez calisir.
  try {
    const anySort = db.prepare("SELECT 1 FROM job_tickets WHERE board_sort IS NOT NULL LIMIT 1").get();
    if (!anySort) {
      db.exec(`
        WITH o AS (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY COALESCE(board_id,''), COALESCE(status,'')
            ORDER BY created_date, CAST(ticket_number AS INTEGER)
          ) * 1.0 AS rn
          FROM job_tickets
        )
        UPDATE job_tickets SET board_sort = (SELECT rn FROM o WHERE o.id = job_tickets.id)
      `);
    }
  } catch(e) { console.error('board_sort backfill:', e.message); }

  // ===== PERFORMANS INDEXLERI =====
  const performanceIndexes = [
    "CREATE INDEX IF NOT EXISTS idx_tickets_customer ON job_tickets(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_project ON job_tickets(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_status ON job_tickets(status)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON job_tickets(assigned_to_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_parent ON job_tickets(parent_ticket_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_board ON job_tickets(board_id)",
    "CREATE INDEX IF NOT EXISTS idx_tickets_number ON job_tickets(ticket_number)",
    "CREATE INDEX IF NOT EXISTS idx_tqcomments_ticket ON job_comments(ticket_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(created_date)",
    "CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id)",
    "CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status)",
    "CREATE INDEX IF NOT EXISTS idx_leaveallow_employee ON leave_allowances(employee_id)",
    "CREATE INDEX IF NOT EXISTS idx_hakedis_year ON hakedisler(year)",
    "CREATE INDEX IF NOT EXISTS idx_job_effort_plans_ticket ON job_effort_plans(ticket_id)",
    "CREATE INDEX IF NOT EXISTS idx_job_effort_logs_ticket ON job_effort_logs(ticket_id)",
    "CREATE INDEX IF NOT EXISTS idx_expreports_employee ON expense_reports(employee_id)",
    "CREATE INDEX IF NOT EXISTS idx_expreports_status ON expense_reports(status)",
    "CREATE INDEX IF NOT EXISTS idx_expitems_report ON expense_items(report_id)",
    "CREATE INDEX IF NOT EXISTS idx_definitions_category ON definitions(category)",
    "CREATE INDEX IF NOT EXISTS idx_contacts_customer ON customer_contacts(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_contracts_customer ON customer_contracts(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_modules_customer ON customer_modules(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)",
    "CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)",
    "CREATE INDEX IF NOT EXISTS idx_employees_sube ON employees(sube_id)",
    "CREATE INDEX IF NOT EXISTS idx_employees_customer ON employees(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_roleperms_lookup ON role_permissions(role_name, module)",
    "CREATE INDEX IF NOT EXISTS idx_todos_employee ON todos(employee_id)",
    "CREATE INDEX IF NOT EXISTS idx_tqprojects_customer ON job_projects(customer_id)",
  ];
  for (const idx of performanceIndexes) {
    try { db.exec(idx); } catch(e) {}
  }

  // Seed: varsayilan roller
  try {
    const roleCount = db.prepare("SELECT count(*) as cnt FROM roles").get();
    if (roleCount.cnt === 0) {
      const insertRole = db.prepare("INSERT OR IGNORE INTO roles (id, name, label, description) VALUES (lower(hex(randomblob(16))), ?, ?, ?)");
      insertRole.run('admin', 'Admin', 'Tam yetki');
      insertRole.run('yonetici', 'Yönetici', 'Ekip yönetimi');
      insertRole.run('ik', 'IK', 'İnsan kaynakları');
      insertRole.run('kullanici', 'Kullanıcı', 'Standart çalışan');
      insertRole.run('stajer', 'Stajer', 'Kısıtlı erişim');
      insertRole.run('musteri', 'Müşteri', 'Sadece İş Takibi');
      console.log('✅ Varsayılan roller eklendi');
    }
  } catch(e) {
    console.error('Rol seed hatası:', e.message);
  }

  // ── Stok Faz 12: referans uygulamadaki stok rolleri + varsayılan yetkileri ──
  // Idempotent: yalnız eksik olanları ekler. role_permissions satırları yukarıdaki
  // "Yeni modüller için otomatik role_permissions ekleme" bloğunda 0 olarak açılır;
  // burada stok modüllerine mantıklı varsayılan veriyoruz.
  try {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();
    const stokRoller = [
      ['depo_yetkilisi', 'Depo Yetkilisi', 'Stok/depo işlemleri tam yetki'],
      ['satin_alma', 'Satın Alma', 'Tedarikçi ve fiyat yönetimi'],
      ['muhasebe', 'Muhasebe', 'Stok raporları ve değerleme (salt görüntüleme)'],
      ['stok_rapor', 'Stok Rapor Kullanıcısı', 'Yalnız stok raporları'],
    ];
    const insRole = db.prepare("INSERT OR IGNORE INTO roles (id, name, label, description) VALUES (lower(hex(randomblob(16))), ?, ?, ?)");
    for (const [n, l, d] of stokRoller) insRole.run(n, l, d);

    // rol -> [modül anahtarı, view, add, edit, delete]
    const P = (role, mods, v, a, e, d) => {
      for (const m of mods) {
        const exists = db.prepare('SELECT id FROM role_permissions WHERE role_name=? AND module=?').get(role, m);
        if (!exists) db.prepare('INSERT INTO role_permissions (id, role_name, module, can_view, can_add, can_edit, can_delete, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?,?)').run(uuidv4(), role, m, v, a, e, d, now, now);
        else db.prepare('UPDATE role_permissions SET can_view=?, can_add=?, can_edit=?, can_delete=?, updated_date=? WHERE id=?').run(v, a, e, d, now, exists.id);
      }
    };
    const HEP = ['stok_urunler','stok_gruplar','stok_depolar','stok_raflar','stok_urun_raf','stok_sahalar','stok_tedarikciler',
      'stok_giris','stok_cikis','stok_transfer','stok_talep','stok_fisler','stok_sayim','stok_parti_takibi',
      'stok_raporlar','stok_satinalma','stok_zimmet','stok_dashboard','stok_mobil','stok_etiket','stok_excel'];
    const RAPORLAR = ['stok_raporlar','stok_parti_takibi','stok_dashboard','stok_fisler'];
    // Sadece bu bloğun ilk çalışmasında (depo_yetkilisi'nin hiç yetkisi yoksa) uygula.
    const dyVar = db.prepare("SELECT 1 FROM role_permissions WHERE role_name='depo_yetkilisi' AND can_view=1 LIMIT 1").get();
    if (!dyVar) {
      P('depo_yetkilisi', HEP, 1, 1, 1, 1);
      P('satin_alma', ['stok_urunler','stok_gruplar','stok_tedarikciler','stok_satinalma','stok_raporlar','stok_dashboard','stok_fisler','stok_parti_takibi'], 1, 1, 1, 0);
      P('muhasebe', RAPORLAR, 1, 0, 0, 0);
      P('stok_rapor', RAPORLAR, 1, 0, 0, 0);
    }
  } catch(e) { console.error('stok rol seed:', e.message); }

  // ── İK / Bordro Faz 12: İK rolleri + varsayılan yetkileri (idempotent) ──
  try {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();
    const ikRoller = [
      ['ik', 'İK Sorumlusu', 'İK / özlük / bordro tam yetki'],
      ['bordro_sorumlusu', 'Bordro Sorumlusu', 'Puantaj, mesai, kesinti, bordro ve ay kapanışı'],
      ['sube_yoneticisi', 'Şube Yöneticisi', 'Kendi şubesi: puantaj/izin/mesai görüntüleme ve onay'],
    ];
    const insRole = db.prepare("INSERT OR IGNORE INTO roles (id, name, label, description) VALUES (lower(hex(randomblob(16))), ?, ?, ?)");
    for (const [n, l, d] of ikRoller) insRole.run(n, l, d);

    const IKP = (role, mods, v, a, e, d) => {
      for (const m of mods) {
        const exists = db.prepare('SELECT id FROM role_permissions WHERE role_name=? AND module=?').get(role, m);
        if (!exists) db.prepare('INSERT INTO role_permissions (id, role_name, module, can_view, can_add, can_edit, can_delete, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?,?)').run(uuidv4(), role, m, v, a, e, d, now, now);
        else db.prepare('UPDATE role_permissions SET can_view=?, can_add=?, can_edit=?, can_delete=?, updated_date=? WHERE id=?').run(v, a, e, d, now, exists.id);
      }
    };
    const IK_HEP = ['ikb_subeler','ikb_bolumler','ikb_personel','ikb_zam','ikb_ozluk_evrak',
      'ikb_vardiyalar','ikb_vardiya_atama','ikb_vardiya_planlari','ikb_tatil_sihirbazi',
      'ikb_puantaj','ikb_puantaj_rapor','ikb_mesai','ikb_hakedis_ayar','ikb_bordro_yemek',
      'ikb_kesinti','ikb_ic_borc','ikb_personel_masraf','ikb_bordro','ikb_maas_ozet','ikb_ay_kapanis',
      'ikb_sirket','ikb_tutanak','ikb_ilan','ikb_izin_evrak','ikb_dashboard'];
    const IK_ISLEM = ['ikb_puantaj','ikb_mesai','ikb_kesinti','ikb_ic_borc','ikb_personel_masraf','ikb_bordro','ikb_ay_kapanis','ikb_hakedis_ayar','ikb_bordro_yemek'];
    const IK_RAPOR = ['ikb_puantaj_rapor','ikb_maas_ozet','ikb_dashboard','ikb_personel'];
    const IK_SUBE = ['ikb_puantaj','ikb_mesai','ikb_izin_evrak','ikb_personel','ikb_puantaj_rapor','ikb_dashboard'];

    const ikVar = db.prepare("SELECT 1 FROM role_permissions WHERE role_name='ik' AND module LIKE 'ikb_%' AND can_view=1 LIMIT 1").get();
    if (!ikVar) {
      IKP('ik', IK_HEP, 1, 1, 1, 1);
      IKP('ik', ['employees','leave_requests','leave_allowances','employee_report','pdks_cihazlari','definitions'], 1, 1, 1, 0);
      IKP('bordro_sorumlusu', IK_ISLEM, 1, 1, 1, 1);
      IKP('bordro_sorumlusu', IK_RAPOR, 1, 0, 0, 0);
      IKP('bordro_sorumlusu', ['ikb_subeler','ikb_bolumler','ikb_vardiyalar','ikb_sirket'], 1, 0, 0, 0);
      IKP('sube_yoneticisi', IK_SUBE, 1, 0, 1, 0);
    }
  } catch(e) { console.error('ik rol seed:', e.message); }

  console.log('✅ Veritabanı tabloları hazır');
}

const dbWrapper = {
  prepare(sql) {
    return db.prepare(sql);
  },
  exec(sql) {
    db.exec(sql);
  },
  // better-sqlite3 transaction'a erisim (or. cok satirli fis + satir yazimi
  // atomik olsun diye). Kullanim: db.transaction(fn)()  -> fn bir transaction
  // icinde calisir, hata olursa tumu geri alinir.
  transaction(fn) {
    return db.transaction(fn);
  },
  pragma(source, opts) {
    return db.pragma(source, opts);
  },
};

module.exports = { db: dbWrapper, initDb };
