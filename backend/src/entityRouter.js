const express = require('express');
const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('./authMiddleware');
const { notifyTicketUpdate, notifyNewComment } = require('./jobTrackingNotify');
const { ensureUserForEmployee } = require('./userProvision');
const { CUSTOMER_APPROVAL_STATUSES } = require('./constants');

// Soft delete uygulanan tablolar (gercekten silme yerine is_deleted=1)
const SOFT_DELETE_TABLES = ['customers','job_tickets','job_projects','employees','sales_activities',
  'stok_urunler','stok_depolar','stok_raflar','stok_sahalar','stok_fisler','stok_sayimlar','stok_talepler',
  'stok_personeller','stok_demirbaslar','stok_rezervasyonlar',
  'ik_subeler','ik_bolumler','ik_vardiyalar','ik_vardiya_planlari','ik_mesai_kayitlari',
  'ik_kesinti_planlari','ik_kesintiler','ik_ic_borclar','ik_personel_masraf',
  'ik_ozluk_evraklari','ik_tutanaklar','ik_ilanlar','ik_izin_evraklari',
  'ik_bordro_satirlari'];

// JSON kolonları olan tablolar (array/object tipindeki alanlar)
const JSON_COLUMNS = {
  employees: ['education_documents', 'education_history'],
  correspondences: ['recipient_ids', 'recipient_names', 'attachments', 'tags'],
  conversations: ['participants', 'last_read_message_id_by_user', 'archived_by', 'deleted_by'],
  messages: ['reactions'],
  work_tasks: ['tags', 'attachments'],
  customer_contracts: ['products'],
  leave_requests: ['approval_history'],
  task_comments: ['attachments'],
  job_projects: ['team_member_ids'],
  job_tickets: ['tags', 'attachments', 'assigned_to_ids', 'assigned_to_names'],
  job_comments: ['attachments'],
  job_kanban_boards: ['columns'],
  job_ticket_statuses: ['board_ids'],
  hakedisler: ['tahsilat'],
  stok_etiket_fisleri: ['satirlar_json'],
  ik_vardiya_planlari: ['adimlar_json', 'personel_ids_json'],
  ik_toplu_yukleme: ['onizleme_json', 'geri_alma_json'],
};

function parseJsonColumns(tableName, row) {
  if (!row) return row;
  const cols = JSON_COLUMNS[tableName] || [];
  const result = { ...row };
  for (const col of cols) {
    if (result[col] && typeof result[col] === 'string') {
      try { result[col] = JSON.parse(result[col]); } catch { /* bırak */ }
    }
  }
  return result;
}

function stringifyJsonColumns(tableName, data) {
  const cols = JSON_COLUMNS[tableName] || [];
  const result = { ...data };
  for (const col of cols) {
    if (result[col] !== undefined && typeof result[col] !== 'string') {
      result[col] = JSON.stringify(result[col]);
    }
  }
  return result;
}

// Bir tablonun GERCEK sutun adlari (PRAGMA'dan bir kez okunur, cache'lenir).
// INSERT/UPDATE govdesinde tabloda olmayan bir alan gelirse SQLite tum
// ifadeyi "no such column" ile dusuruyor -- bu, yazma oncesi bilinmeyen
// alanlari elemek icin. Ground-truth oldugu icin sadece zaten hata verecek
// alanlar duser.
const _colCache = new Map();
function knownColumns(tableName) {
  if (_colCache.has(tableName)) return _colCache.get(tableName);
  let set = null;
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (rows.length) set = new Set(rows.map(r => r.name));
  } catch { set = null; }
  _colCache.set(tableName, set);
  return set;
}
// record'daki tablo-disi anahtarlari sil (yerinde). cols yoksa dokunma.
function dropUnknownColumns(tableName, record) {
  const cols = knownColumns(tableName);
  if (!cols) return;
  for (const k of Object.keys(record)) {
    if (!cols.has(k)) {
      console.warn(`[entityRouter] ${tableName}: bilinmeyen alan atlandi -> ${k}`);
      delete record[k];
    }
  }
}

// Tablo adı → role_permissions modül adı eşlemesi
const TABLE_TO_MODULE = {
  employees: 'employees',
  card_logs: 'personel_hareketleri',
  customers: 'customers',
  activities: 'activities',
  leave_requests: 'leave_requests',
  todos: 'todos',
  ideas: 'ideas',
  customer_contacts: 'customers',
  customer_contracts: 'customers',
  customer_modules: 'customers',
  products: 'definitions',
  product_modules: 'definitions',
  correspondences: 'messages',
  conversations: 'messages',
  messages: 'messages',
  work_tasks: 'work_tracking',
  leave_allowances: 'leave_requests',
  leave_types: 'leave_types',
  definitions: 'definitions',
  expense_reports: 'expenses',
  expense_items: 'expenses',
  
  task_comments: 'work_tracking',
  announcements: 'announcements',
  job_projects: 'is_takibi_projeler',
  job_tickets: 'is_takibi_biletler',
  job_ticket_statuses: 'is_takibi_tanimlar',
  job_comments: 'is_takibi_biletler',
  job_effort_plans: 'is_takibi_biletler',
  job_effort_logs: 'is_takibi_biletler',
  job_kanban_boards: 'is_takibi_kanban',
  sales_activities: 'satis',
  hakedisler: 'hakedisler',
  // ── Stok / Depo Yönetimi ──
  stok_urunler: 'stok_urunler',
  stok_urun_gruplari: 'stok_gruplar',
  stok_urun_birimleri: 'stok_urunler',
  stok_urun_barkodlari: 'stok_urunler',
  stok_depolar: 'stok_depolar',
  stok_raflar: 'stok_raflar',
  stok_urun_raf: 'stok_urun_raf',
  stok_sahalar: 'stok_sahalar',
  stok_teslimat_adresleri: 'stok_depolar',
  stok_fisler: 'stok_fisler',
  stok_fis_satirlari: 'stok_fisler',
  stok_hareketler: 'stok_fisler',
  // Tablosu olmayan modül anahtarları (checkPermission bunlarla da çağrılıyor)
  stok_giris: 'stok_giris',
  stok_cikis: 'stok_cikis',
  stok_transfer: 'stok_transfer',
  stok_iade: 'stok_iade',
  stok_partiler: 'stok_parti_takibi',
  stok_parti_tahsis: 'stok_parti_takibi',
  stok_sayimlar: 'stok_sayim',
  stok_sayim_satirlari: 'stok_sayim',
  stok_talepler: 'stok_talep',
  stok_talep_satirlari: 'stok_talep',
  stok_rezervasyonlar: 'stok_rezervasyon',
  stok_rezervasyon: 'stok_rezervasyon',
  stok_urun_tedarikci: 'stok_satinalma',
  stok_fiyat_gecmisi: 'stok_satinalma',
  stok_personeller: 'stok_zimmet',
  stok_demirbaslar: 'stok_zimmet',
  stok_zimmetler: 'stok_zimmet',
  stok_etiket_fisleri: 'stok_etiket',
  stok_excel_yuklemeler: 'stok_excel',
  stok_dashboard: 'stok_dashboard',
  stok_mobil: 'stok_mobil',
  stok_qnb_ayarlar: 'stok_qnb',
  stok_qnb_belgeler: 'stok_qnb',
  stok_qnb_belge_satirlari: 'stok_qnb',
  stok_qnb_loglar: 'stok_qnb',
  stok_qnb_cari_sorgu: 'stok_qnb',
  // ── İK / Özlük / Bordro (önek ikb_) ──
  ik_subeler: 'ikb_subeler',
  ik_bolumler: 'ikb_bolumler',
  ik_ucret_gecmisi: 'ikb_personel',
  ik_vardiyalar: 'ikb_vardiyalar',
  ik_vardiya_atamalari: 'ikb_vardiya_atama',
  ik_vardiya_planlari: 'ikb_vardiya_planlari',
  ik_resmi_tatiller: 'ikb_tatil_sihirbazi',
  ik_puantaj: 'ikb_puantaj',
  ik_puantaj_duzeltme_log: 'ikb_puantaj',
  ik_mesai_kayitlari: 'ikb_mesai',
  ik_hakedis_genel_ayar: 'ikb_hakedis_ayar',
  ik_vergi_ayarlari: 'ikb_hakedis_ayar',
  ik_gelir_vergisi_dilimleri: 'ikb_hakedis_ayar',
  ik_hakedis_tanim: 'ikb_hakedis_ayar',
  ik_bordro_yemek_kural: 'ikb_bordro_yemek',
  ik_kesinti_planlari: 'ikb_kesinti',
  ik_kesintiler: 'ikb_kesinti',
  ik_ic_borclar: 'ikb_ic_borc',
  ik_ic_borc_tahsilat: 'ikb_ic_borc',
  ik_personel_masraf: 'ikb_personel_masraf',
  ik_bordro_donemleri: 'ikb_bordro',
  ik_bordro_satirlari: 'ikb_bordro',
  ik_sirket_bilgileri: 'ikb_sirket',
  ik_toplu_yukleme: 'ikb_bordro',
  ik_ozluk_evraklari: 'ikb_ozluk_evrak',
  ik_tutanaklar: 'ikb_tutanak',
  ik_ilanlar: 'ikb_ilan',
  ik_izin_evraklari: 'ikb_izin_evrak',
};

function checkPermission(db, role, tableName, action) {
  // admin her şeyi yapabilir
  if (role === 'admin') return true;
  // Okuma-istisnasi: form/liste icin herkese gereken referans tablolari (sadece goruntuleme)
  if (action === 'can_view' && ['definitions','leave_types','job_ticket_statuses','job_kanban_boards','customer_modules','announcements'].includes(tableName)) return true;
  // employees: ic ekip formlar icin acik, ama musteri portali personel rehberini
  // enumere edemesin (KVKK) -- musteri normal role_permissions kontrolune duser
  if (action === 'can_view' && tableName === 'employees') return role !== 'musteri';

  // Tablo -> modül eşlemesi yoksa: GÜVENLİ TARAF = reddet (fail-closed)
  const module = TABLE_TO_MODULE[tableName];
  if (!module) return false;

  // IK ve yonetici, masraf tablolarında ik_expense_requests modülüne göre yetkilenir
  if ((tableName === 'expense_reports' || tableName === 'expense_items') && (role === 'ik' || role === 'yonetici')) {
    const permX = db.prepare('SELECT * FROM role_permissions WHERE role_name = ? AND module = ?').get(role, 'ik_expense_requests');
    if (permX && permX[action]) return true;
  }

  // Tek yetki kaynağı: role_permissions tablosu
  const perm = db.prepare(
    'SELECT * FROM role_permissions WHERE role_name = ? AND module = ?'
  ).get(role, module);
  if (!perm) return false;            // kayıt yoksa reddet (fail-closed)
  return perm[action] === 1;
}

// GUVENLIK/BUTUNLUK: bordro/puantaj/kesinti verisi icin donem kapatma (Ay Kapanisi)
// kontrolunu dedicated /api/ik/* route'lari zaten uyguluyordu, ama bu tablolar ayni
// zamanda genel /api/entities/:table CRUD'a da acikti ve o yol donem kilidini hic
// bilmiyordu -- kapali (odenmis) bir donemin bordro/puantaj/kesinti kaydi bu genel
// yoldan hala duzenlenebiliyor/silinebiliyordu. Asagidaki fonksiyon PUT/DELETE'te
// tabloya gore ilgili donemin kapali olup olmadigini kontrol eder.
function ikDonemKapaliMi(yil, ay) {
  if (!yil || !ay) return false;
  const d = db.prepare('SELECT durum FROM ik_bordro_donemleri WHERE yil=? AND ay=?').get(Number(yil), Number(ay));
  return d?.durum === 'kapali';
}
function ikKayitDonemKapaliMi(tableName, row) {
  if (tableName === 'ik_bordro_satirlari') {
    const d = db.prepare('SELECT durum FROM ik_bordro_donemleri WHERE id=?').get(row.donem_id);
    return d?.durum === 'kapali';
  }
  if (tableName === 'ik_kesintiler') return ikDonemKapaliMi(row.donem_yil, row.donem_ay);
  if (tableName === 'ik_puantaj' && row.tarih) {
    return ikDonemKapaliMi(Number(row.tarih.slice(0, 4)), Number(row.tarih.slice(5, 7)));
  }
  return false;
}

// GUVENLIK: 'sube_yoneticisi' rolu "kendi subesi" gorevi icin yetkilendirilmisti
// (bkz. db.js rol tanimi) ama bu sinirlama hicbir yerde uygulanmiyordu -- bu rol,
// ikb_personel izniyle acilan ik_ucret_gecmisi (zam/ucret degisikligi gecmisi)
// tablosunu genel API uzerinden TUM sirketin verisini gorecek sekilde
// sorgulayabiliyordu. Kendi subesindeki personel id'lerini dondurur.
function ikKendiSubePersonelIds(email) {
  const emp = db.prepare("SELECT sube_id FROM employees WHERE lower(email)=lower(?) AND (is_deleted=0 OR is_deleted IS NULL)").get(email || '');
  if (!emp || !emp.sube_id) return [];
  return db.prepare("SELECT id FROM employees WHERE sube_id=? AND (is_deleted=0 OR is_deleted IS NULL)").all(emp.sube_id).map(r => r.id);
}

// Bir job_comments satiri istekteki kullaniciya mi ait? (kendi yorumunu
// duzenleme/silme yetkisi icin). created_by (POST'ta req.user.email),
// author_email, ya da author_id (ic kullanicida employees.id, musteride users.id).
function commentOwnedBy(c, user) {
  if (!c || !user) return false;
  if (c.created_by && c.created_by === user.email) return true;
  if (c.author_email && c.author_email === user.email) return true;
  if (c.author_id) {
    if (user.id && user.id === c.author_id) return true;
    try {
      const emp = db.prepare('SELECT id FROM employees WHERE lower(email) = lower(?)').get(user.email || '');
      if (emp && emp.id === c.author_id) return true;
    } catch (e) { /* yoksay */ }
  }
  return false;
}

// Istekteki kullanicinin employees.id'si (email uzerinden eslesme)
function employeeIdForUser(user) {
  if (!user?.email) return null;
  try { return db.prepare('SELECT id FROM employees WHERE lower(email) = lower(?)').get(user.email)?.id || null; }
  catch { return null; }
}

// Bir job_effort_logs satiri istekteki kullaniciya mi ait? (kendi girdigi
// efor saatini duzenleme/silme yetkisi icin — job_comments'daki
// commentOwnedBy ile ayni desen).
function effortLogOwnedBy(row, user) {
  const empId = employeeIdForUser(user);
  return !!empId && row?.person_id === empId;
}


// Tablo bazlı izin verilen kolonlar (SQL injection koruması)
const ALLOWED_COLUMNS = {
  card_logs: ['direction','seq','card_uid','person_name','employee_id','employee_name','ts','event_time','synced_at','source'],
  employees: ['full_name','email','phone','role','department','position','hire_date','birth_date','address','notes','status','avatar_url','manager_id','customer_id','education_documents','education_history','tc','gender','app_role','next_leave_entitlement_date','leave_carryover','leave_used_before','marital_status','military_status','disability_status','blood_type','emergency_contact','emergency_phone','iban','bank_name','tax_office','tax_number','sgk_number','education_level','university','university_department','graduation_year','manager_name','highest_education','education_department','graduation_date','exit_date','exit_reason','exit_notes','exit_document','card_uid','show_in_job_tracking','sube_id','bolum_id','meslek_kodu','kanun_no','emekli_mi','personel_adresi','aylik_ucret','saatlik_ucret','dakikalik_ucret','ticket_aylik','sahsi_hesap_aktif','sahsi_hesap_tutar','sahsi_hesap_banka','sahsi_hesap_iban','sahsi_hesap_aciklama','vip_mi','vardiya_id'],
  customers: ['name','email','phone','address','city','country','status','notes','contact_person','tax_number','sector','customer_type','municipality_type','customer_detail','population','project_manager','deploy_responsible','company_name','use_job_tracking','district','party','top_manager','contact_title','current_firm','follow_status','assigned_sales','is_potential','next_visit_date','is_supplier','is_customer','supplier_code','tax_office','payment_method','payment_term_days','gsm','website','working_region'],
  activities: ['title','description','type','status','customer_id','customer_name','employee_id','employee_name','activity_date','duration_minutes','notes','job_ticket_id','activity_type','location','date','start_time','end_time','outcome','parent_activity_id'],
  leave_requests: ['employee_id','employee_name','employee_email','leave_type','start_date','end_date','days','reason','status','approver_id','approver_name','approval_date','approval_history','notes'],
  leave_allowances: ['employee_id','employee_name','employee_email','year','total_days','used_days','notes'],
  leave_types: ['name','description','max_days','is_active'],
  todos: ['title','description','status','priority','due_date','assigned_to','employee_id','owner_email'],
  ideas: ['title','description','category','status','employee_id','employee_name'],
  customer_contacts: ['customer_id','full_name','email','phone','position','is_primary','notes'],
  customer_contracts: ['customer_id','title','type','contract_type','start_date','end_date','value','status','notes','file_url','product_id','product_name','selected_modules','price','currency','special_terms','products','contract_value','hakedis_start_date','installment_count','pesin_orani','pesin_tutari','hakedis_period','kdv_durumu'],
  customer_modules: ['customer_id','module_name','is_active','notes'],
  products: ['name','description','is_active','sort_order'],
  product_modules: ['product_id','name','description','is_active','sort_order'],
  correspondences: ['title','type','direction','customer_id','customer_name','recipient_ids','recipient_names','content','attachments','tags','status','date'],
  conversations: ['title','type','name','participants','last_message','last_message_id','last_message_at','last_message_sender_email','last_read_message_id_by_user','status','archived_by','deleted_by'],
  messages: ['conversation_id','content','sender_id','sender_name','sender_email','message_type','file_url','file_name','file_size','file_type','meet_link','reply_to_id','reactions'],
  work_tasks: ['title','description','status','priority','due_date','assigned_to_id','assigned_to_name','project','tags','attachments','estimated_hours','actual_hours'],
  definitions: ['category','name','value','description','is_active','sort_order','color','icon','label'],
  announcements: ['title','content','target_roles','start_date','end_date','is_active','priority'],
  expense_reports: ['title','employee_id','employee_name','employee_email','status','total_amount','currency','period','notes','approver_id','approver_name','approval_date','project_name','trip_start_date','trip_end_date','advance_amount','department_manager','rejection_reason'],
  expense_items: ['report_id','category','description','amount','currency','date','receipt_url','notes'],
  task_comments: ['task_id','content','attachments','author_id','author_name','author_email','type','old_status','new_status'],
  job_projects: ['name','description','status','customer_id','customer_name','start_date','end_date','team_member_ids','notes','type','priority','budget','manager_id','manager_name','is_active'],
  job_tickets: ['title','description','status','priority','project_id','customer_id','customer_name','assigned_to_id','assigned_to_name','assigned_to_ids','assigned_to_names','due_date','tags','attachments','ticket_number','kanban_board_id','kanban_column_id','parent_ticket_id','board_id','board_name','pilot_customer_id','pilot_customer_name','customer_contact_id','customer_contact_name','board_sort'],
  job_ticket_statuses: ['name','color','sort_order','is_default','is_closed','key','is_active','is_final','board_id','board_ids','group_key'],
  job_comments: ['ticket_id','content','attachments','author_id','author_name','author_email','is_internal','comment_type'],
  job_effort_plans: ['ticket_id','team','planned_hours','planned_start','assignee_id','assignee_name','end_at','note'],
  job_effort_logs: ['ticket_id','team','person_id','person_name','hours','work_date','note'],
  job_kanban_boards: ['name','project_id','columns','is_active','color','icon','description'],
  sales_activities: ['customer_id','customer_name','activity_type','contact_person','date','start_time','end_time','notes','outcome','next_visit_date','opportunity_id','created_by','employee_id','employee_name','duration_minutes','location','parent_activity_id','note_type','title','valid_until','deal_status','products','amount','currency','is_deleted'],
  hakedisler: ['year','sira_no','musteri','customer_id','contract_id','is_konusu','durum','sektor','anlasma_turu','kdv_durumu','sozlesme_baslangic','sozlesme_bitis','toplam_sozlesme_tutari','yil_hedefi','pesin_tutari','ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik','aciklama','tahsilat'],
  // ── Stok / Depo Yönetimi — Faz 1 ──
  stok_urun_gruplari: ['ad','ust_grup_id','ust_grup_adi','sira','aktif'],
  stok_urunler: ['kod','ad','barkod','grup_id','grup_adi','uretici_kodu','uretici','urun_tipi','marka','model','ana_birim','kdv','alis_fiyati','satis_fiyati','varsayilan_raf_omru_ay','skt_uyari_gun','el_aleti_takip','seri_no_takip','gorsel_url','aktif','notlar','is_deleted'],
  stok_urun_birimleri: ['urun_id','birim_adi','carpan'],
  stok_urun_barkodlari: ['urun_id','barkod','birim'],
  stok_depolar: ['kod','ad','turu','adres','plaka','sorumlu_personel_id','isletim_modu','aktif','kural_giris','kural_cikis','kural_transfer','sira','notlar','is_deleted'],
  stok_raflar: ['depo_id','depo_adi','kod','ad','tip','kapasite','aktif','is_deleted'],
  stok_urun_raf: ['urun_id','urun_adi','depo_id','depo_adi','raf_id','raf_adi','min_seviye','max_seviye','varsayilan','notlar'],
  stok_sahalar: ['kod','ad','adres','yetkili','telefon','customer_id','aktif','notlar','is_deleted'],
  stok_teslimat_adresleri: ['baslik','adres','customer_id','saha_id'],
  stok_fisler: ['fis_no','tip','tarih','durum','cari_id','cari_adi','kaynak_depo_id','kaynak_depo_adi','hedef_depo_id','hedef_depo_adi','hedef_saha_id','hedef_saha_adi','fatura_no','irsaliye_no','belge_no','aciklama','teslim_eden','teslim_alan','gonderim_adresi','kaynak_ref_tip','kaynak_ref_id','satir_sayisi','toplam_miktar','olusturan','onaylayan','onay_tarihi','is_deleted'],
  stok_fis_satirlari: ['fis_id','urun_id','urun_adi','urun_kodu','barkod','kaynak_raf_id','kaynak_raf_adi','hedef_raf_id','hedef_raf_adi','birim','carpan','miktar','miktar_ana_birim','birim_fiyat','tutar','icerik_aciklamasi','lot_no','uretim_tarihi','raf_omru_ay','kontrol_tarihi','skt','raf_omru_durumu','seri_no'],
  stok_hareketler: ['urun_id','urun_adi','depo_id','depo_adi','raf_id','raf_adi','tip','miktar','birim_maliyet','fis_id','fis_no','fis_tip','fis_satir_id','cari_id','saha_id','tarih','seri_no'],
  stok_partiler: ['urun_id','urun_adi','depo_id','depo_adi','raf_id','raf_adi','lot_no','uretim_tarihi','skt','kontrol_tarihi','giris_miktar','kalan_bakiye','alis_maliyeti','tedarikci_cari_id','tedarikci_adi','durum','kaynak_tip','kaynak_fis_id','kaynak_fis_no','kaynak_fis_satir_id','giris_tarihi'],
  stok_parti_tahsis: ['parti_id','cikis_fis_id','cikis_fis_no','cikis_fis_satir_id','urun_id','depo_id','dusulen_miktar','maliyet','tarih'],
  stok_sayimlar: ['sayim_no','depo_id','depo_adi','tarih','tip','durum','aciklama','satir_sayisi','farkli_satir','olusturan','onaylayan','tamamlanma_tarihi','duzeltme_giris_fis_id','duzeltme_cikis_fis_id','is_deleted'],
  stok_sayim_satirlari: ['sayim_id','urun_id','urun_adi','urun_kodu','raf_id','raf_adi','sistem_miktar','sayilan_miktar','fark','sayan','not_'],
  stok_talepler: ['talep_no','talep_eden','departman','hedef_saha_id','hedef_saha_adi','kaynak_depo_id','kaynak_depo_adi','is_emri_no','tarih','ihtiyac_tarihi','oncelik','durum','aciklama','satir_sayisi','olusturan','onaylayan','onay_tarihi','is_deleted'],
  stok_rezervasyonlar: ['rez_no','urun_id','urun_adi','depo_id','depo_adi','saha_id','saha_adi','talep_id','talep_no','miktar','karsilanan','durum','tarih','ihtiyac_tarihi','aciklama','olusturan','is_deleted'],
  stok_talep_satirlari: ['talep_id','urun_id','urun_adi','urun_kodu','miktar','birim','karsilanan_miktar','not_'],
  stok_urun_tedarikci: ['urun_id','urun_adi','cari_id','cari_adi','tedarikci_urun_kodu','marka','model','birim','birim_fiyat','para_birimi','fiyat_tarihi','teslim_suresi_gun','min_siparis','stok_durumu','tercih_edilen','aktif','not_'],
  stok_fiyat_gecmisi: ['urun_id','urun_adi','cari_id','cari_adi','alis_fiyati','para_birimi','tarih','kaynak','fis_no','not_'],
  stok_personeller: ['kod','ad_soyad','telefon','eposta','departman','employee_id','aktif','not_','is_deleted'],
  stok_demirbaslar: ['varlik_kodu','urun_id','urun_adi','depo_id','depo_adi','raf_id','raf_adi','seri_no','barkod','alis_tarihi','garanti_bitis','kondisyon','durum','not_','is_deleted'],
  stok_zimmetler: ['zimmet_no','demirbas_id','demirbas_adi','varlik_kodu','personel_id','personel_adi','saha_id','saha_adi','teslim_tarihi','termin_tarihi','teslim_notu','iade_tarihi','iade_notu','durum'],
  stok_etiket_fisleri: ['fis_no','tarih','kullanici','dizayn','satirlar_json','toplam_etiket','durum','is_deleted'],
  stok_excel_yuklemeler: ['yukleme_no','dosya_adi','yukleyen','depo_id','depo_adi','olusan_fis_id','olusan_fis_no','satir_toplam','satir_yeni','satir_atlanan','durum','tarih','is_deleted'],
  stok_qnb_ayarlar: ['ortam','genel_url','efatura_url','earsiv_url','eirsaliye_url','api_kullanici','api_sifre','firma_unvan','vkn','vergi_dairesi','adres','il','ilce','eposta','telefon','para_birimi','log_saklama_gun','gecici_eslesme_gun','alis_fiyat_gecmisine_isle','aktif'],
  stok_qnb_belgeler: ['belge_no','yon','tur','cari_id','cari_adi','vkn','tarih','tutar','durum','uuid','dosya_url','kaynak_fis_id','kaynak_fis_no','stok_fis_id','stok_fis_no','satir_sayisi','aciklama','is_deleted'],
  stok_qnb_belge_satirlari: ['belge_id','satici_urun_adi','satici_kodu','miktar','birim','birim_fiyat','eslesen_urun_id','eslesen_urun_adi'],
  stok_qnb_loglar: ['tarih','islem','durum','belge_id','mesaj'],
  stok_qnb_cari_sorgu: ['cari_id','cari_adi','vkn','tip','durum','alici_etiketi','aktif','tarih'],
  // ── İK / Özlük / Bordro ──
  ik_subeler: ['ad','adres','ip_araligi','gps_enlem','gps_boylam','sapma_metre','telefon','yetkili','sira','aktif','is_deleted'],
  ik_bolumler: ['ad','sube_id','sube_adi','hedef_personel_sayisi','aciklama','aktif','is_deleted'],
  ik_ucret_gecmisi: ['personel_id','personel_adi','alan','eski_tutar','yeni_tutar','gecerlilik','aciklama','kaynak'],
  ik_vardiyalar: ['ad','kisa_kod','renk','baslama_saati','bitis_saati','gec_tolerans_dk','erken_tolerans_dk','fazla_mesai_katsayisi','gece_mi','ertesi_gune_tasar','rt_mesaisi_hesapla','planlamada_kullan','haftalik_izin_sayacina_ekle','varsayilan','aktif','is_deleted'],
  ik_vardiya_atamalari: ['personel_id','personel_adi','vardiya_id','vardiya_adi','baslangic_tarihi','aciklama'],
  ik_vardiya_planlari: ['ad','baslangic_tarihi','bitis_tarihi','ana_vardiya_id','adimlar_json','haftalik_izin_kac_gun_calis','haftalik_izin_kac_gun','haftalik_izin_devret','dongu_baslangic','personel_ids_json','aktif','is_deleted'],
  ik_resmi_tatiller: ['tarih','ad','tip','kaynak','aktif'],
  ik_puantaj: ['personel_id','personel_adi','tarih','sube_id','vardiya_id','giris_saat','cikis_saat','mesai_dk','gec_dk','erken_dk','eksik_dk','fazla_mesai_dk','durum_kodu','kayit_tipi','ozet','duzeltme_notu','kaynak'],
  ik_puantaj_duzeltme_log: ['puantaj_id','personel_id','tarih','alan','eski','yeni','aciklama','actor_email'],
  ik_mesai_kayitlari: ['personel_id','personel_adi','tarih','tur','katsayi','rt_tipi','sure_dk','saatlik_ucret','tutar','onay','kaynak','aciklama','onaylayan','onay_tarihi','donem_yil','donem_ay','is_deleted'],
  ik_hakedis_genel_ayar: ['varsayilan_baz_gun','ticket_qr_yoksa_kes','ticket_e_kes','ticket_izin_rapor_kes','ticket_rt_kesme','ticket_cumartesi_yemek_kurali','cumartesi_tatil'],
  ik_vergi_ayarlari: ['sgk_isci_orani','issizlik_isci_orani','sgk_taban','sgk_tavan','asgari_ucret_brut','damga_vergisi_orani','dogrulanmis_mi','dogrulayan','dogrulama_tarihi'],
  ik_gelir_vergisi_dilimleri: ['yil','alt_sinir','ust_sinir','oran','sira'],
  ik_hakedis_tanim: ['personel_id','personel_adi','tur','aktif','baz_gun','aylik_tutar'],
  ik_bordro_yemek_kural: ['personel_id','personel_adi','cumartesi_kurali','kesinti_tipi','aciklama','aktif'],
  ik_kesinti_planlari: ['personel_id','personel_adi','tur','toplam_tutar','baslangic_yil','baslangic_ay','taksit_sayisi','aylik_taksit','referans_maas','kalan_bakiye','aktif','aciklama','is_deleted'],
  ik_kesintiler: ['personel_id','personel_adi','donem_yil','donem_ay','tur','tutar','plan_id','taksit_no','aciklama','kaynak','tarih','is_deleted'],
  ik_ic_borclar: ['personel_id','personel_adi','acilis_tutar','aylik_taksit','kalan_bakiye','varsayilan_kaynak','tarih','aciklama','durum','is_deleted'],
  ik_ic_borc_tahsilat: ['borc_id','personel_id','donem_yil','donem_ay','tutar','kaynak','bordro_satir_id'],
  ik_personel_masraf: ['personel_id','personel_adi','donem_yil','donem_ay','tutar','aciklama','kesinti_kaynagi','kilitli','is_deleted'],
  ik_bordro_donemleri: ['yil','ay','durum','olusturan','onaylayan','onay_tarihi','kapatan','kapanis_tarihi'],
  ik_bordro_satirlari: ['donem_id','personel_id','personel_adi','sube_id','sube_adi','tc','gorev','aylik_ucret','saatlik_ucret','dakikalik_ucret','calisilan_gun','eksik_gun','resmi_maas','bayram','fazla_mesai','prim','yol','yemek','ticket','yol_hak_gun','yemek_hak_gun','ticket_hak_gun','resmi_toplam','resmi_net','avans','icra','bes','diger_kesinti','maas_puantaj_kes','yol_kes','yemek_kes','ticket_kes','personel_masrafi','borc_maas','borc_yyt','borc_toplam','sahsi_hesap_net','fesih_tazminati','ihbar_tazminati','kasa_tazminati','ozel_sigorta','ozel_sigorta_es_cocuk','genel_net','manuel_override','hesap_notu'],
  ik_sirket_bilgileri: ['kapsam','bolum_adi','unvan','vergi_dairesi','vergi_no','sgk_sicil','mersis','adres','merkez_adres','web'],
  ik_toplu_yukleme: ['tur','dosya_adi','donem_yil','donem_ay','toplam','eslesen','uygulanan','hatali','onizleme_json','durum','geri_alma_json'],
  ik_ozluk_evraklari: ['personel_id','personel_adi','evrak_tipi','dosya_url','dosya_adi','tarih','aciklama','yukleyen','is_deleted'],
  ik_tutanaklar: ['personel_id','personel_adi','tur','tarih','konu','aciklama','dosya_url','olusturan','is_deleted'],
  ik_ilanlar: ['baslik','bolum_id','bolum_adi','sube_id','sube_adi','durum','baslangic','bitis','detay','yetkili_notu','olusturan','is_deleted'],
  ik_izin_evraklari: ['leave_id','personel_id','personel_adi','evrak_adi','dosya_url','durum','aciklama','is_deleted'],
};

// Zorunlu alanlar
// employees tablosunda disariya sizmamasi gereken hassas kisisel veriler (KVKK)
const SENSITIVE_EMPLOYEE_FIELDS = ['tc','iban','bank_name','tax_office','tax_number','sgk_number','disability_status','blood_type','emergency_contact','emergency_phone','address','notes','exit_reason','exit_notes','exit_document','marital_status','military_status','education_documents','birth_date','gender','card_uid','personel_adresi','kanun_no','aylik_ucret','saatlik_ucret','dakikalik_ucret','ticket_aylik','sahsi_hesap_aktif','sahsi_hesap_tutar','sahsi_hesap_banka','sahsi_hesap_iban','sahsi_hesap_aciklama'];

function isPrivilegedForEmployeeData(role) {
  if (role === 'admin' || role === 'yonetici') return true;
  if (checkPermission(db, role, 'employees', 'can_edit')) return true;
  const repPerm = db.prepare('SELECT can_view FROM role_permissions WHERE role_name = ? AND module = ?').get(role, 'employee_report');
  if (repPerm && repPerm.can_view === 1) return true;
  return false;
}

function stripSensitiveEmployeeFields(row, req) {
  if (!row) return row;
  if (isPrivilegedForEmployeeData(req.user?.role)) return row;
  if (req.user?.email && row.email === req.user.email) return row;
  const clone = { ...row };
  for (const f of SENSITIVE_EMPLOYEE_FIELDS) delete clone[f];
  return clone;
}

const REQUIRED_FIELDS = {
  employees: ['full_name','email'],
  customers: ['company_name'],
  leave_requests: ['employee_id','start_date','end_date','leave_type'],
  leave_allowances: ['employee_id','year','total_days','notes'],
  job_tickets: ['title'],
  job_effort_plans: ['ticket_id','team'],
  job_effort_logs: ['ticket_id','team','person_id','hours'],
  job_projects: ['name'],
  announcements: ['title','content'],
  hakedisler: ['musteri'],
  // expense_reports: zorunlu alan yok, frontend kontrolü yeterli
  stok_urun_gruplari: ['ad'],
  stok_urunler: ['ad'],
  stok_urun_birimleri: ['urun_id','birim_adi'],
  stok_urun_barkodlari: ['urun_id','barkod'],
  stok_depolar: ['ad'],
  stok_raflar: ['depo_id'],
  stok_urun_raf: ['urun_id','depo_id'],
  stok_sahalar: ['ad'],
  stok_teslimat_adresleri: ['adres'],
  stok_fisler: ['tip'],
  stok_fis_satirlari: ['fis_id'],
  stok_sayimlar: ['depo_id'],
  stok_sayim_satirlari: ['sayim_id'],
  stok_talep_satirlari: ['talep_id'],
  stok_urun_tedarikci: ['urun_id','cari_id'],
  stok_fiyat_gecmisi: ['urun_id'],
  stok_personeller: ['ad_soyad'],
  stok_demirbaslar: ['urun_id'],
  ik_subeler: ['ad'],
  ik_bolumler: ['ad'],
  ik_ucret_gecmisi: ['personel_id','alan'],
  ik_vardiyalar: ['ad'],
  ik_vardiya_atamalari: ['personel_id','vardiya_id','baslangic_tarihi'],
  ik_vardiya_planlari: ['ad'],
  ik_resmi_tatiller: ['tarih','ad'],
  ik_puantaj: ['personel_id','tarih'],
  ik_mesai_kayitlari: ['personel_id','tarih'],
  ik_hakedis_tanim: ['personel_id','tur'],
  ik_bordro_yemek_kural: ['personel_id'],
  ik_bordro_donemleri: ['yil','ay'],
  ik_ozluk_evraklari: ['personel_id'],
  ik_tutanaklar: ['personel_id'],
  ik_ilanlar: ['baslik'],
  ik_izin_evraklari: ['leave_id'],
};

// ── İK: kapatılmış bordro dönemine ait kayıt entity API ile değiştirilemez ──
// "Ay Kapanışı" bordro/puantaj/kesinti satırlarını dondurur; bordro/hesapla,
// bordro/satir/:id, puantaj/hesapla özel uç noktaları bunu zaten kontrol eder
// ama ekran-içi satır düzenlemeleri generic entityRouter üzerinden geçtiği için
// burada da aynı kilidi uygulamak gerekiyor.
const IK_DONEM_KILITLI_TABLOLAR = {
  ik_puantaj: (r) => r.tarih ? { yil: +String(r.tarih).slice(0, 4), ay: +String(r.tarih).slice(5, 7) } : null,
  ik_puantaj_duzeltme_log: (r) => r.tarih ? { yil: +String(r.tarih).slice(0, 4), ay: +String(r.tarih).slice(5, 7) } : null,
  ik_kesintiler: (r) => (r.donem_yil && r.donem_ay) ? { yil: +r.donem_yil, ay: +r.donem_ay } : null,
  ik_mesai_kayitlari: (r) => (r.donem_yil && r.donem_ay) ? { yil: +r.donem_yil, ay: +r.donem_ay } : null,
  ik_personel_masraf: (r) => (r.donem_yil && r.donem_ay) ? { yil: +r.donem_yil, ay: +r.donem_ay } : null,
  ik_ic_borc_tahsilat: (r) => (r.donem_yil && r.donem_ay) ? { yil: +r.donem_yil, ay: +r.donem_ay } : null,
  ik_bordro_satirlari: null, // dönem donem_id ile — aşağıda özel çözülür
};
function ikDonemKilitliMi(db, tableName, row) {
  if (!row) return false;
  if (tableName === 'ik_bordro_satirlari') {
    if (!row.donem_id) return false;
    const d = db.prepare('SELECT durum FROM ik_bordro_donemleri WHERE id=?').get(row.donem_id);
    return d?.durum === 'kapali';
  }
  const fn = IK_DONEM_KILITLI_TABLOLAR[tableName];
  if (!fn) return false;
  const p = fn(row);
  if (!p || !p.yil || !p.ay) return false;
  const d = db.prepare('SELECT durum FROM ik_bordro_donemleri WHERE yil=? AND ay=?').get(p.yil, p.ay);
  return d?.durum === 'kapali';
}

function validateData(tableName, data, isUpdate = false) {
  const errors = [];

  // Sadece zorunlu alan kontrolü (sadece create'te)
  if (!isUpdate) {
    const required = REQUIRED_FIELDS[tableName] || [];
    for (const field of required) {
      if (!data[field] && data[field] !== 0) {
        errors.push(field + ' alani zorunludur');
      }
    }
  }


  // Genel girdi dogrulama (tip/uzunluk) — bozuk/asiri veri girisini engeller
  const MAX_LEN = 50000;
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string' && val.length > MAX_LEN) {
      errors.push(key + ' alani cok uzun (max ' + MAX_LEN + ' karakter)');
    }
    if (key === 'email' && val && typeof val === 'string' && val.trim() !== '') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors.push('Gecerli bir e-posta adresi giriniz');
      }
    }
  }

  return errors;
}

const ALLOWED_SORT_COLS = new Set([
  'id','created_date','updated_date','date','name','full_name','email','status',
  'title','sort_order','last_message_at','due_date','start_date','end_date',
  'priority','ticket_number','total_amount','day_count','half_day_period','offer_date','valid_until',
  'employee_name','customer_name','activity_type','last_message_at',
  'kod','ad','sira','depo_adi','urun_adi','fis_no','tarih','tip','durum',
  'sube_adi','personel_adi','aylik_ucret','hire_date'
]);

function createEntityRouter(tableName) {
  const router = express.Router();

  // Tüm route'lar auth gerektirir
  router.use(authMiddleware);

  // LIST - GET /api/:entity?sort=-created_date&limit=100
  router.get('/', (req, res) => {
      if (!checkPermission(db, req.user?.role, tableName, 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    try {
      const { sort, limit, ...filters } = req.query;
        if (req.user?.role === 'musteri') {
          delete filters.customer_id;
        }

        // musteri rolü: sadece kendi customer_id'sine ait verileri görsün
        if (req.user?.role === 'musteri') {
          if (tableName === 'job_tickets' || tableName === 'job_projects' || tableName === 'customer_modules' || tableName === 'customer_contacts' || tableName === 'customer_contracts') {
            filters.customer_id = req.user.customer_id || '__no_customer__';
          }
          // GUVENLIK: 'customers' tablosunun kendisi bu listede yoktu -- musteri
          // rolu LIST cagirdiginda TUM musterilerin (diger firmalarin) kayitlarini
          // aliyordu, sadece frontend'de kendi firmasina filtreleniyordu (IDOR)
          if (tableName === 'customers') {
            filters.id = req.user.customer_id || '__no_customer__';
          }
        }
      
      let query = `SELECT * FROM ${tableName}`;
      const params = [];

      // Filtreleme
      const filterKeys = Object.keys(filters);
      const conditions = [];
      if (filterKeys.length > 0) {
        filterKeys.forEach(k => {
          if (k === 'exclude_archived') {
            if (tableName === 'job_tickets') conditions.push("status != 'arsivlendi'");
            return;
          }
          // GUVENLIK: filtre anahtari ALLOWED_COLUMNS ile dogrulanir (SQL injection korumasi)
          // 'id' her tabloda birincil anahtar oldugu icin ozel olarak her zaman izinli
          const allowedCols = ALLOWED_COLUMNS[tableName] || [];
          if (k !== 'id' && !allowedCols.includes(k)) return;
          const val = filters[k]; const parsed = val === 'true' ? 1 : val === 'false' ? 0 : (/^-?\d+$/.test(val) ? parseInt(val, 10) : val); params.push(parsed);
          conditions.push(`${k} = ?`);
        });
      }
      // Soft delete: silinmis kayitlari listeleme
      if (SOFT_DELETE_TABLES.includes(tableName)) {
        conditions.push('(is_deleted = 0 OR is_deleted IS NULL)');
      }
      // Mesajlasma gizliligi (KVKK): admin dahil HERKES sadece kendi
      // katilimcisi oldugu konusma/mesajlari gorebilir (guvenlik acigi fix)
      if ((tableName === 'conversations' || tableName === 'messages') && req.user?.email) {
        if (tableName === 'conversations') {
          conditions.push("EXISTS (SELECT 1 FROM json_each(participants) WHERE json_each.value = ?)");
        } else {
          conditions.push("conversation_id IN (SELECT id FROM conversations c WHERE EXISTS (SELECT 1 FROM json_each(c.participants) WHERE json_each.value = ?))");
        }
        params.push(req.user.email);
      }
      // GUVENLIK: İş Takibi ic notlari (is_internal=1) musteri rolune asla
      // gitmemeli -- frontend zaten gizliyordu ama API yaniti filtresizdi
      // (F12/network sekmesinden goruntulenebiliyordu)
      if (tableName === 'job_comments' && req.user?.role === 'musteri') {
        conditions.push('(is_internal = 0 OR is_internal IS NULL)');
      }
      // GUVENLIK: 'sube_yoneticisi' rolu "kendi subesi" gorevi icin
      // yetkilendirilmisti ama ik_ucret_gecmisi (zam/ucret degisikligi gecmisi)
      // tablosunda hicbir sube filtresi yoktu -- bu rol TUM sirketin maas
      // zammi gecmisini bu genel API'den gorebiliyordu. Tabloda sube_id kolonu
      // olmadigi icin personel_id uzerinden IN filtresi uygulanir.
      if (tableName === 'ik_ucret_gecmisi' && req.user?.role === 'sube_yoneticisi') {
        const izinliIds = ikKendiSubePersonelIds(req.user?.email);
        if (!izinliIds.length) conditions.push('1=0');
        else { conditions.push(`personel_id IN (${izinliIds.map(() => '?').join(',')})`); params.push(...izinliIds); }
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Sıralama
      if (sort) {
        const desc = sort.startsWith('-');
        const col = desc ? sort.slice(1) : sort;
        const safeCol = ALLOWED_SORT_COLS.has(col) ? col : 'created_date';
        query += ` ORDER BY ${safeCol} ${desc ? 'DESC' : 'ASC'}`;
      } else {
        query += ` ORDER BY created_date DESC`;
      }

      // Arsivlileri disla
      if (filters.exclude_archived === '1' || filters.exclude_archived === 1) {
        delete filters.exclude_archived;
        if (tableName === 'job_tickets') {
          conditions.push("status != 'arsivlendi'");
        }
      }
      // Limit
      if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit));
      }

      const rows = db.prepare(query).all(...params);
      const parsed = rows.map(r => parseJsonColumns(tableName, r));
      const finalRows = tableName === 'employees' ? parsed.map(r => stripSensitiveEmployeeFields(r, req)) : parsed;
      res.json(finalRows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET BY ID - GET /api/:entity/:id
  router.get('/:id', (req, res) => {
      if (!checkPermission(db, req.user?.role, tableName, 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    try {
      const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Bulunamadı' });
      // Soft delete: silinmis kayit acilamaz
      if (SOFT_DELETE_TABLES.includes(tableName) && row.is_deleted === 1) {
        return res.status(404).json({ error: 'Bulunamadı' });
      }
      // GUVENLIK: mesajlasma gizliligi (KVKK) -- LIST'teki katilimci kontrolu
      // (yukarida, GET / handler'inda) GET-by-id'de eksikti (IDOR acigi: katilimci
      // olmayan biri ID'yi bilirse tek kayit endpoint'inden okuyabiliyordu).
      // Admin dahil HERKES sadece kendi katilimcisi oldugu konusma/mesaji gorebilir.
      if ((tableName === 'conversations' || tableName === 'messages') && req.user?.email) {
        let participants = [];
        try {
          if (tableName === 'conversations') {
            participants = JSON.parse(row.participants || '[]');
          } else {
            const conv = db.prepare('SELECT participants FROM conversations WHERE id = ?').get(row.conversation_id);
            participants = JSON.parse(conv?.participants || '[]');
          }
        } catch { participants = []; }
        if (!participants.includes(req.user.email)) {
          return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok' });
        }
      }
      // musteri rolü: sadece kendi customer_id'sine ait kayda erişebilir (IDOR koruması)
      if (req.user?.role === 'musteri') {
        const ownCustomerTables = ['job_tickets','job_projects','customer_contacts','customer_contracts','customer_modules'];
        if (ownCustomerTables.includes(tableName) && row.customer_id && row.customer_id !== req.user.customer_id) {
          return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok' });
        }
        if (tableName === 'customers' && row.id !== req.user.customer_id) {
          return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok' });
        }
        // GUVENLIK: İş Takibi ic notu tek kayit olarak da musteriye acilmasin
        if (tableName === 'job_comments' && row.is_internal === 1) {
          return res.status(404).json({ error: 'Bulunamadı' });
        }
      }
      // GUVENLIK: sube_yoneticisi tek kayit (GET/:id) yoluyla da baska subenin
      // ucret gecmisini okuyamamali (LIST'teki filtrenin IDOR koruması eşdeğeri).
      if (tableName === 'ik_ucret_gecmisi' && req.user?.role === 'sube_yoneticisi') {
        const izinliIds = ikKendiSubePersonelIds(req.user?.email);
        if (!izinliIds.includes(row.personel_id)) return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok' });
      }
      const parsedRow = parseJsonColumns(tableName, row);
      res.json(tableName === 'employees' ? stripSensitiveEmployeeFields(parsedRow, req) : parsedRow);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE - POST /api/:entity
  router.post('/', (req, res) => {
      // Efor saati girisi: atanan kisi kendi adina, sadece atandigi bilette
      // girebilir -- modul izni (is_takibi_biletler can_add) olmasa bile.
      let ownEffortLogCreate = false;
      if (tableName === 'job_effort_logs' && req.user?.role !== 'admin') {
        const empId = employeeIdForUser(req.user);
        if (empId && req.body?.person_id === empId) {
          const t = db.prepare('SELECT assigned_to_ids FROM job_tickets WHERE id = ?').get(req.body.ticket_id);
          let ids = []; try { ids = JSON.parse(t?.assigned_to_ids || '[]'); } catch { ids = []; }
          ownEffortLogCreate = ids.includes(empId);
        }
      }
      if (!ownEffortLogCreate && !checkPermission(db, req.user?.role, tableName, 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      // GUVENLIK: mesaj olusturmada iki kontrol eksikti -- (1) gonderenin
      // hedef konusmanin bir katilimcisi oldugu hic dogrulanmiyordu (hic
      // dahil olunmayan bir konusmaya mesaj enjekte edilebiliyordu), (2)
      // sender_email/sender_name istemciden geldigi gibi kabul ediliyordu
      // (kimlige burunme / baskasi adina mesaj yazma riski). Ikisi de
      // sunucu tarafinda req.user'dan sabitlenerek kapatildi.
      if (tableName === 'messages') {
        if (req.user?.role !== 'admin') {
          let participants = [];
          try {
            const conv = db.prepare('SELECT participants FROM conversations WHERE id = ?').get(req.body?.conversation_id);
            participants = JSON.parse(conv?.participants || '[]');
          } catch { participants = []; }
          if (!participants.includes(req.user?.email)) {
            return res.status(403).json({ error: 'Bu konuşmaya mesaj gönderme yetkiniz yok' });
          }
        }
        req.body.sender_email = req.user?.email;
        req.body.sender_id = req.user?.id;
        req.body.sender_name = req.user?.full_name || req.user?.email;
      }
    try {
      const validationErrors = validateData(tableName, req.body, false);
      if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors.join(', ') });
      if (ikDonemKilitliMi(db, tableName, req.body)) return res.status(400).json({ error: 'Kapatılmış bordro dönemi — kayıt eklenemez. Önce "Ay Kapanışı → Kilidi Aç".' });
      const data = stringifyJsonColumns(tableName, req.body);
      // GUVENLIK: admin disindaki roller yeni calisan olustururken de
      // ayricalik/kimlik alanlarini set edemez (bkz. PUT)
      if (tableName === 'employees' && req.user?.role !== 'admin') {
        for (const f of ['role', 'app_role', 'card_uid']) delete data[f];
      }
      const id = uuidv4();
      const now = new Date().toISOString();

      // job_tickets için otomatik bilet numarası
      if (tableName === 'job_tickets' && !data.ticket_number) {
        // COUNT(*)+1 degil MAX+1: gecmis gocler sirasinda satir sayisi ile en
        // buyuk numara birbirini tutmuyor, COUNT tabanli uretim mevcut
        // numaralarla cakisiyordu.
        const maxRow = db.prepare("SELECT MAX(CAST(ticket_number AS INTEGER)) as mx FROM job_tickets WHERE ticket_number GLOB '[0-9]*'").get();
        const nextNum = (maxRow?.mx || 0) + 1;
        data.ticket_number = String(nextNum);
      }

      // job_tickets: board_sort verilmediyse yeni bilet ait oldugu kolonun
      // USTUNE gelsin (min - 1). Pano kolon ici manuel sirayi bozmadan triyaj.
      if (tableName === 'job_tickets' && (data.board_sort === undefined || data.board_sort === null)) {
        try {
          const r = db.prepare("SELECT MIN(board_sort) AS mn FROM job_tickets WHERE COALESCE(board_id,'')=COALESCE(?, '') AND COALESCE(status,'')=COALESCE(?, '')")
            .get(data.board_id ?? null, data.status ?? null);
          data.board_sort = (r && r.mn !== null && r.mn !== undefined) ? r.mn - 1 : 0;
        } catch (e) { data.board_sort = 0; }
      }

      // Bileti olusturan kisi (musteri haric) otomatik olarak sorumlu
      // kisilere eklenir -- kaydeden kisi biletten haberdar/takipte kalsin.
      if (tableName === 'job_tickets' && req.user?.role !== 'musteri') {
        try {
          const emp = db.prepare('SELECT id, full_name FROM employees WHERE email = ?').get(req.user.email);
          if (emp) {
            let ids = []; let names = [];
            try { ids = JSON.parse(data.assigned_to_ids || '[]'); } catch { ids = []; }
            try { names = JSON.parse(data.assigned_to_names || '[]'); } catch { names = []; }
            if (!ids.includes(emp.id)) { ids.push(emp.id); names.push(emp.full_name); }
            data.assigned_to_ids = JSON.stringify(ids);
            data.assigned_to_names = JSON.stringify(names);
            if (!data.assigned_to_id) { data.assigned_to_id = emp.id; data.assigned_to_name = emp.full_name; }
          }
        } catch (e) { console.error('[entityRouter] otomatik sorumlu atama hatasi:', e.message); }
      }

      const record = {
        id,
        ...data,
        created_by: req.user.email,
        created_date: now,
        updated_date: now,
      };
      dropUnknownColumns(tableName, record);

      const keys = Object.keys(record);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => { const v = record[k]; if (v === undefined || v === null) return null; if (typeof v === "boolean") return v ? 1 : 0; if (typeof v === "object") return JSON.stringify(v); return v; });

      db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
      
      const created = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);

      // Yeni calisan olusturulunca giris (users) hesabi da otomatik acilir
      // (varsayilan sifre Turocas2026x, ilk giriste degistirilir). Calisan kaydini
      // asla bozmaz. _login_created yanita eklenir ki UI kullaniciyi bilgilendirsin.
      let loginCreated = { created: false };
      if (tableName === 'employees') {
        loginCreated = ensureUserForEmployee(db, created, req.user?.email);
        // Bordro/mesai motoru saatlik/dakikalık ücreti kullanır — aylık girilip
        // türetilmemişse burada da türet (form dışı: Excel import, API, entegrasyon).
        try {
          const a = Number(created.aylik_ucret) || 0;
          if (a > 0 && !(Number(created.saatlik_ucret) > 0)) {
            const s = +(a / 225).toFixed(6), d = +(a / 225 / 60).toFixed(6);
            db.prepare("UPDATE employees SET saatlik_ucret=?, dakikalik_ucret=? WHERE id=?").run(s, d, created.id);
            created.saatlik_ucret = s; created.dakikalik_ucret = d;
          }
        } catch (e) { console.error('[ik] saatlik turet (create):', e.message); }
      }

      // İş Takibi mail bildirimi: yeni yorum eklendiginde atanan kisilere haber ver
      if (tableName === 'job_comments') {
        try {
          const ticket = db.prepare('SELECT * FROM job_tickets WHERE id = ?').get(created.ticket_id);
          if (ticket) notifyNewComment(parseJsonColumns('job_comments', created), parseJsonColumns('job_tickets', ticket), req.user);
        } catch (e) { console.error('[jobTrackingNotify] yorum bildirimi hatasi:', e.message); }
      }

      // Stok: yeni depo olusturulunca otomatik "GENEL RAF" kaydi acilir
      // (stok giris/cikis/transfer raf secilmezse bu rafi kullanir).
      if (tableName === 'stok_depolar') {
        try {
          const now2 = new Date().toISOString();
          db.prepare(`INSERT INTO stok_raflar (id, depo_id, depo_adi, kod, ad, tip, kapasite, aktif, created_by, created_date, updated_date)
            VALUES (?, ?, ?, 'GENEL', 'GENEL RAF', 'STANDART', 0, 1, ?, ?, ?)`)
            .run(uuidv4(), created.id, created.ad, req.user?.email || null, now2, now2);
        } catch (e) { console.error('[stok] GENEL RAF olusturma hatasi:', e.message); }
      }

      // Stok: ürün kartı — kod/barkod boşsa 8690 (TR GS1) önekli EAN-13 üret
      if (tableName === 'stok_urunler' && (!created.kod || !created.barkod)) {
        try {
          const ean13 = (prefix12) => {
            const b = String(prefix12).replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
            let sum = 0;
            for (let i = 0; i < 12; i++) sum += (+b[i]) * (i % 2 === 0 ? 1 : 3);
            return b + String((10 - (sum % 10)) % 10);
          };
          const seq = 1 + db.prepare("SELECT COUNT(*) c FROM stok_urunler").get().c;
          const kod = created.kod || ean13('8690' + String(seq).padStart(8, '0'));
          const barkod = created.barkod || ean13('8691' + String(Date.now()).slice(-8));
          db.prepare("UPDATE stok_urunler SET kod=?, barkod=? WHERE id=?").run(kod, barkod, created.id);
          created.kod = kod; created.barkod = barkod;
        } catch (e) { console.error('[stok] urun kod:', e.message); }
      }

      // Stok: demirbaş / personel için otomatik kod
      if (tableName === 'stok_demirbaslar' && (!created.varlik_kodu || !created.barkod)) {
        try {
          const seq = db.prepare("SELECT COUNT(*) c FROM stok_demirbaslar").get().c;
          const vk = created.varlik_kodu || ('DMB-' + String(seq).padStart(6, '0'));
          const bk = created.barkod || ('869' + String(Date.now()).slice(-10));
          db.prepare("UPDATE stok_demirbaslar SET varlik_kodu=?, barkod=? WHERE id=?").run(vk, bk, created.id);
          created.varlik_kodu = vk; created.barkod = bk;
        } catch (e) { console.error('[stok] demirbas kod:', e.message); }
      }
      if (tableName === 'stok_personeller' && !created.kod) {
        try {
          const seq = 1000 + db.prepare("SELECT COUNT(*) c FROM stok_personeller").get().c;
          const kod = 'PRS-' + String(seq).padStart(6, '0');
          db.prepare("UPDATE stok_personeller SET kod=? WHERE id=?").run(kod, created.id);
          created.kod = kod;
        } catch (e) { console.error('[stok] personel kod:', e.message); }
      }

      res.status(201).json({ ...parseJsonColumns(tableName, created), ...(tableName === 'employees' ? { _login_created: loginCreated.created, _generated_password: loginCreated.password || undefined } : {}) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // UPDATE - PUT /api/:entity/:id
  router.put('/:id', (req, res) => {
    try {
      const existing = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Bulunamadı' });
      if (ikDonemKilitliMi(db, tableName, existing) || ikDonemKilitliMi(db, tableName, req.body))
        return res.status(400).json({ error: 'Kapatılmış bordro dönemi — kayıt değiştirilemez. Önce "Ay Kapanışı → Kilidi Aç".' });

      // Yorum duzenleme: SADECE kendi (sistem-olmayan) yorumun. Admin dahil kimse
      // baskasininkini duzenleyemez; musteri rolu hicbir yorumu duzenleyemez.
      const ownCommentEdit = tableName === 'job_comments'
        && existing.comment_type !== 'system'
        && req.user?.role !== 'musteri'
        && commentOwnedBy(existing, req.user);
      const ownEffortLogEdit = tableName === 'job_effort_logs' && effortLogOwnedBy(existing, req.user);
      if (tableName === 'job_comments' && !ownCommentEdit) {
        if (existing.comment_type === 'system') return res.status(403).json({ error: 'Sistem kayıtları düzenlenemez' });
        return res.status(403).json({ error: 'Yalnızca kendi yorumunuzu düzenleyebilirsiniz' });
      }
      if (!ownCommentEdit && !ownEffortLogEdit && !checkPermission(db, req.user?.role, tableName, 'can_edit')) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      }
      if (tableName === 'job_comments') {
        for (const f of ['is_internal', 'comment_type', 'author_id', 'author_name', 'author_email', 'ticket_id']) delete req.body[f];
      }
      if (tableName === 'job_effort_logs' && req.user?.role !== 'admin') {
        if (!ownEffortLogEdit) return res.status(403).json({ error: 'Yalnızca kendi girdiğiniz efor kaydını düzenleyebilirsiniz' });
        for (const f of ['ticket_id', 'team', 'person_id', 'person_name']) delete req.body[f];
      }

      // GUVENLIK/BUTUNLUK: kapali bordro donemine ait satir/puantaj/kesinti kaydi
      // bu genel yoldan duzenlenemez (dedicated /api/ik/* route'lariyla ayni kural).
      if (['ik_bordro_satirlari', 'ik_kesintiler', 'ik_puantaj'].includes(tableName) && req.user?.role !== 'admin' && ikKayitDonemKapaliMi(tableName, existing)) {
        return res.status(400).json({ error: 'Kapalı döneme ait bu kayıt düzenlenemez' });
      }
      // GUVENLIK: bordro donem durumu (taslak/onayli/kapali) SADECE dedicated
      // /api/ik/bordro/onayla ve /api/ik/bordro/kapat uzerinden degistirilebilir --
      // o route'lar kapanis/acilis denetim bilgisini (kapatan/kapanis_tarihi,
      // audit_log) dogru yaziyor; bu genel yoldan 'durum' degistirmek o kaydi atlar.
      if (tableName === 'ik_bordro_donemleri' && 'durum' in (req.body || {})) {
        delete req.body.durum;
      }

      // GUVENLIK: sadece konusmanin bir katilimcisi o konusmayi guncelleyebilir
      // (sorumlu ekleme/cikarma, kisisel arsivleme vb.) -- LIST zaten katilimciya
      // gore filtreleniyordu, PUT'ta bu kontrol eksikti.
      if (tableName === 'conversations' && req.user?.role !== 'admin') {
        let currentParticipants = [];
        try { currentParticipants = JSON.parse(existing.participants || '[]'); } catch {}
        if (!currentParticipants.includes(req.user?.email)) {
          return res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok' });
        }
      }
      // GUVENLIK: sadece mesajin ait oldugu konusmanin bir katilimcisi o
      // mesaji guncelleyebilir (tepki/emoji ekleme vb.) -- GET-by-id'de
      // ayni kontrol vardi, PUT'ta eksikti: herhangi bir kullanici, hic
      // katilimcisi olmadigi bir konusmadaki mesaji guncelleyebiliyordu.
      if (tableName === 'messages' && req.user?.role !== 'admin') {
        let participants = [];
        try {
          const conv = db.prepare('SELECT participants FROM conversations WHERE id = ?').get(existing.conversation_id);
          participants = JSON.parse(conv?.participants || '[]');
        } catch { participants = []; }
        if (!participants.includes(req.user?.email)) {
          return res.status(403).json({ error: 'Bu mesaja erişim yetkiniz yok' });
        }
      }
      // GUVENLIK: bir grubu (tumu icin) silmek sadece grubu olusturan kisiye
      // acik -- herhangi bir katilimci grubu herkesten kaybetmesin.
      if (tableName === 'conversations' && existing.type === 'group' && req.body.status === 'deleted') {
        if (existing.created_by !== req.user?.email && req.user?.role !== 'admin') {
          return res.status(403).json({ error: 'Bu grubu sadece oluşturan kişi silebilir' });
        }
      }

      // GUVENLIK: izin/harcama talepleri icin ONAYLAMA ayri bir route degil,
      // bu genel PUT uzerinden yapiliyor. Modul yetkisi (can_edit) "kendi
      // talebini duzenle/geri cek" icin verilse bile, ayni yetkiyle satir
      // sahipligi hic kontrol edilmiyordu -- bir calisan baska bir calisanin
      // talebini degistirebiliyor, hatta kendi talebini kendisi onaylayabiliyordu
      // (DELETE'te sahiplik kontrolu vardi, PUT'ta unutulmustu).
      if ((tableName === 'leave_requests' || tableName === 'expense_reports') && req.user?.role !== 'admin') {
        const isApproverRole = req.user?.role === 'ik' || req.user?.role === 'yonetici';
        const isOwner = !!existing.employee_email && existing.employee_email === req.user?.email;
        if (!isOwner && !isApproverRole) {
          return res.status(403).json({ error: 'Bu talebi düzenleme yetkiniz yok' });
        }
        const APPROVAL_FIELDS = ['status', 'approver_id', 'approver_name', 'approval_date', 'approval_history', 'rejection_reason'];
        const triesToChangeApproval = APPROVAL_FIELDS.some(f => req.body[f] !== undefined && req.body[f] !== existing[f]);
        if (triesToChangeApproval && !isApproverRole) {
          return res.status(403).json({ error: 'Onay/red işlemi yalnızca İK veya Yönetici tarafından yapılabilir' });
        }
      }

      const validationErrors = validateData(tableName, req.body, true);
      if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors.join(', ') });
      // İlişkili bilet (child) ise status değiştirilemez — musteri_onay/kurum_test hariç (müşteri onaylayabilmeli)
      if (tableName === 'job_tickets' && req.body.status !== undefined && existing.parent_ticket_id) {
        if (req.body.status !== existing.status && !CUSTOMER_APPROVAL_STATUSES.includes(existing.status)) {
          return res.status(400).json({ error: 'Bu bilet bir ana bilete bağlı, durumu bağımsız değiştirilemez.' });
        }
      }

      const data = stringifyJsonColumns(tableName, req.body);
      const now = new Date().toISOString();
      
      const updates = { ...data, updated_date: now };
      delete updates.id;
      delete updates.created_date;
      delete updates.created_by;

      // job_tickets: durum degisti VE cagiran taraf board_sort'u kendisi
      // belirtmediyse (surukle-birak her zaman board_sort'u acikca gonderir,
      // o durumda buraya hic girilmez -- tam biraktigin yere yazilmaya devam
      // eder) bileti yeni kolonun EN USTUNE koy (POST'taki yeni-bilet mantigiyla
      // ayni: min(board_sort)-1). Boylece durum degisince en uste gelir, ama
      // sonradan elle suruklenirse orada kalir.
      if (tableName === 'job_tickets' && req.body.board_sort === undefined && updates.status !== undefined && updates.status !== existing.status) {
        try {
          const targetBoardId = updates.board_id !== undefined ? updates.board_id : existing.board_id;
          const r = db.prepare("SELECT MIN(board_sort) AS mn FROM job_tickets WHERE COALESCE(board_id,'')=COALESCE(?, '') AND COALESCE(status,'')=COALESCE(?, '')")
            .get(targetBoardId ?? null, updates.status ?? null);
          updates.board_sort = (r && r.mn !== null && r.mn !== undefined) ? r.mn - 1 : 0;
        } catch (e) { /* board_sort ayarlanamazsa durum degisikligi yine de calissin */ }
      }

      // GUVENLIK: admin disindaki roller employees uzerinde ayricalik/kimlik
      // alanlarini degistiremez (rol yukseltme, hesap e-postasi / kart kimligi
      // degistirme). Bu alanlar yalnizca admin tarafindan yonetilir.
      if (tableName === 'employees' && req.user?.role !== 'admin') {
        for (const f of ['role', 'app_role', 'email', 'card_uid']) delete updates[f];
      }
      dropUnknownColumns(tableName, updates);

      const keys = Object.keys(updates);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...keys.map(k => { const v = updates[k]; if (v === undefined || v === null) return null; if (typeof v === "boolean") return v ? 1 : 0; if (typeof v === "object") return JSON.stringify(v); return v; }), req.params.id];

      db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).run(...values);

      // Calisan durumu degisince ilgili user hesabini da senkronla (musteri rolu haric)
      if (tableName === 'employees' && (updates.status === 'pasif' || updates.status === 'aktif')) {
        try {
          const emp = db.prepare('SELECT email FROM employees WHERE id = ?').get(req.params.id);
          if (emp && emp.email) {
            db.prepare("UPDATE users SET status = ?, updated_at=datetime('now') WHERE email = ? AND role != 'musteri' AND status != ?").run(updates.status, emp.email, updates.status);
          }
        } catch (e) { console.error('employee->user status senkron hatasi:', e.message); }
      }

      // GUVENLIK/DUZELTME: calisanin "Uygulama Rolu" (app_role) degisince,
      // zaten var olan giris hesabinin gercek yetkisi (users.role) daha once
      // hic guncellenmiyordu -- yalnizca hesap ILK olusturulurken kopyalaniyordu.
      // Admin bir calisanin rolunu Kullanicidan Yoneticiye vb. degistirdiginde
      // hicbir sey olmuyordu ("degistirdim ama etkisi yok" sorunu). app_role
      // buraya ancak req.user admin ise ulasir (yukarida non-admin icin silindi).
      if (tableName === 'employees' && updates.app_role !== undefined && updates.app_role !== existing.app_role && updates.app_role !== 'musteri') {
        try {
          const emp = db.prepare('SELECT email FROM employees WHERE id = ?').get(req.params.id);
          if (emp && emp.email) {
            db.prepare("UPDATE users SET role = ?, updated_at=datetime('now') WHERE email = ?").run(updates.app_role, emp.email);
          }
        } catch (e) { console.error('employee->user role senkron hatasi:', e.message); }
      }

      const updated = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);

      // Calisan duzenlemesinde giris hesabi hala yoksa olustur (or. once
      // e-postasiz olusturulup sonra e-posta eklendi). E-posta RENAME'inde
      // calistirma -- yeni adrese 2. hesap acmasin.
      let loginCreated = { created: false };
      if (tableName === 'employees') {
        const oldEmailEmpty = !existing.email || !String(existing.email).trim();
        const emailRenamed = !oldEmailEmpty && updates.email !== undefined && updates.email !== existing.email;
        if (!emailRenamed) loginCreated = ensureUserForEmployee(db, updated, req.user?.email);
        // aylık ücret değiştiyse saatlik/dakikalık türet (form zaten gönderir; API/import için ağ)
        try {
          if ('aylik_ucret' in updates) {
            const a = Number(updated.aylik_ucret) || 0;
            const s = a > 0 ? +(a / 225).toFixed(6) : 0, d = a > 0 ? +(a / 225 / 60).toFixed(6) : 0;
            if (Number(updated.saatlik_ucret || 0) !== s) {
              db.prepare("UPDATE employees SET saatlik_ucret=?, dakikalik_ucret=? WHERE id=?").run(s, d, updated.id);
              updated.saatlik_ucret = s; updated.dakikalik_ucret = d;
            }
          }
        } catch (e) { console.error('[ik] saatlik turet (update):', e.message); }
      }

      // İş Takibi mail bildirimi: durum ozel bir asamaya cekildiyse musteriye,
      // aksi halde (yorum haric her guncelleme) atanan kisilere (aktor haric) mail
      if (tableName === 'job_tickets') {
        try {
          notifyTicketUpdate(parseJsonColumns('job_tickets', existing), parseJsonColumns('job_tickets', updated), req.user);
        } catch (e) { console.error('[jobTrackingNotify] bilet bildirimi hatasi:', e.message); }
      }

      // AUDIT LOG — yetki ve rol degisikliklerini kaydet
      try {
        if (tableName === 'role_permissions') {
          const oldV = `view:${existing.can_view} add:${existing.can_add} edit:${existing.can_edit} del:${existing.can_delete}`;
          const newV = `view:${updated.can_view} add:${updated.can_add} edit:${updated.can_edit} del:${updated.can_delete}`;
          if (oldV !== newV) {
            db.prepare("INSERT INTO audit_log (id, actor_email, action, target, old_value, new_value) VALUES (?,?,?,?,?,?)")
              .run(uuidv4(), req.user?.email || 'bilinmiyor', 'yetki_degisikligi', `${existing.role_name} / ${existing.module}`, oldV, newV);
          }
        } else if (tableName === 'users' && existing.role !== updated.role) {
          db.prepare("INSERT INTO audit_log (id, actor_email, action, target, old_value, new_value) VALUES (?,?,?,?,?,?)")
            .run(uuidv4(), req.user?.email || 'bilinmiyor', 'rol_degisikligi', updated.email || existing.email, existing.role, updated.role);
        }
      } catch(e) {}

      // İlişkili bilet senkronizasyonu (durum)
      if (tableName === 'job_tickets' && data.status !== undefined && data.status !== existing.status) {
        const children = db.prepare('SELECT id FROM job_tickets WHERE parent_ticket_id = ?').all(req.params.id);
        if (children.length > 0) {
          const updateChild = db.prepare('UPDATE job_tickets SET status = ?, updated_date = ? WHERE id = ?');
          for (const child of children) {
            updateChild.run(data.status, now, child.id);
          }
        }
      }
      // İlişkili bilet senkronizasyonu (pano) — ana bilet taşınınca child'lar da aynı panoya taşınır
      if (tableName === 'job_tickets' && data.board_id !== undefined && data.board_id !== existing.board_id) {
        const childrenB = db.prepare('SELECT id FROM job_tickets WHERE parent_ticket_id = ?').all(req.params.id);
        if (childrenB.length > 0) {
          const updateChildBoard = db.prepare('UPDATE job_tickets SET board_id = ?, board_name = ?, updated_date = ? WHERE id = ?');
          for (const child of childrenB) {
            updateChildBoard.run(data.board_id, data.board_name ?? existing.board_name ?? null, now, child.id);
          }
        }
      }

      res.json({ ...parseJsonColumns(tableName, updated), ...(tableName === 'employees' ? { _login_created: loginCreated.created, _generated_password: loginCreated.password || undefined } : {}) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE - DELETE /api/:entity/:id
  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Bulunamadı' });
      if (ikDonemKilitliMi(db, tableName, existing))
        return res.status(400).json({ error: 'Kapatılmış bordro dönemi — kayıt silinemez. Önce "Ay Kapanışı → Kilidi Aç".' });

      // Yorum silme: SADECE kendi (sistem-olmayan) yorumun. Admin dahil kimse
      // baskasininkini silemez; musteri rolu hicbir yorumu silemez.
      const ownCommentDelete = tableName === 'job_comments'
        && existing.comment_type !== 'system'
        && req.user?.role !== 'musteri'
        && commentOwnedBy(existing, req.user);
      const ownEffortLogDelete = tableName === 'job_effort_logs' && effortLogOwnedBy(existing, req.user);
      if (tableName === 'job_comments' && !ownCommentDelete) {
        return res.status(403).json({ error: 'Bu yorumu silme yetkiniz yok' });
      }
      if (!ownCommentDelete && !ownEffortLogDelete && !checkPermission(db, req.user?.role, tableName, 'can_delete')) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      }
      if (tableName === 'job_effort_logs' && req.user?.role !== 'admin' && !ownEffortLogDelete) {
        return res.status(403).json({ error: 'Yalnızca kendi girdiğiniz efor kaydını silebilirsiniz' });
      }

      // GUVENLIK: mesaj/konusma silmede de katilimci kontrolu yoktu --
      // messages hard-delete oldugu icin (SOFT_DELETE_TABLES'te degil) bu
      // ozellikle riskliydi: modulde genel silme izni olan biri, hic
      // katilimcisi olmadigi bir konusmadaki mesajlari kalici olarak
      // silebiliyordu. PUT'takiyle ayni desen.
      if ((tableName === 'messages' || tableName === 'conversations') && req.user?.role !== 'admin') {
        let participants = [];
        try {
          if (tableName === 'conversations') {
            participants = JSON.parse(existing.participants || '[]');
          } else {
            const conv = db.prepare('SELECT participants FROM conversations WHERE id = ?').get(existing.conversation_id);
            participants = JSON.parse(conv?.participants || '[]');
          }
        } catch { participants = []; }
        if (!participants.includes(req.user?.email)) {
          return res.status(403).json({ error: 'Bu kayda erişim yetkiniz yok' });
        }
      }
      if (tableName === 'leave_requests' && req.user?.role !== 'admin' && req.user?.role !== 'ik') {
        const ownEmail = req.user?.email;
        const isOwner = existing.created_by === ownEmail || existing.employee_email === ownEmail;
        if (!isOwner) return res.status(403).json({ error: 'Bu izin talebini yalnizca sahibi silebilir' });
        if (existing.status === 'onaylandi') return res.status(403).json({ error: 'Onaylanmis izin talebi silinemez' });
      }
      // GUVENLIK/BUTUNLUK: bordro donem kaydinin kendisi (ik_bordro_donemleri) hicbir
      // rol tarafindan genel API'den silinemez -- dedicated bir "donem sil" akisi yok,
      // silinirse o donemin tum bordro satirlariyla iliskisi (donem_id) kopar.
      if (tableName === 'ik_bordro_donemleri') {
        return res.status(403).json({ error: 'Bordro dönemi bu şekilde silinemez' });
      }
      // GUVENLIK/BUTUNLUK: kapali donem satir/puantaj/kesinti kaydi bu genel yoldan silinemez.
      if (['ik_bordro_satirlari', 'ik_kesintiler', 'ik_puantaj'].includes(tableName) && req.user?.role !== 'admin' && ikKayitDonemKapaliMi(tableName, existing)) {
        return res.status(400).json({ error: 'Kapalı döneme ait bu kayıt silinemez' });
      }
      if (SOFT_DELETE_TABLES.includes(tableName)) {
        // Soft delete: kaydi silme, is_deleted=1 yap (geri getirilebilir)
        db.prepare(`UPDATE ${tableName} SET is_deleted = 1, updated_date = ? WHERE id = ?`).run(new Date().toISOString(), req.params.id);
      } else {
        db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(req.params.id);
      }
      res.json({ success: true, id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createEntityRouter;
module.exports.checkPermission = checkPermission;
