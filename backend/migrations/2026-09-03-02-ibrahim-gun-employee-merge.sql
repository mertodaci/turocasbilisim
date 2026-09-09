-- 2026-09-03-02  ibrahim.gun: mukerrer employees kaydini birlestir
--
-- Teshis (2026-09-03):
--   4aa7a501-5480-4a95-9f7a-1f9450d221f2  full_name="ibrahim.gun"  status=pasif  created_by=sync
--       -> users.id ile AYNI. TaskQube kimligi: ~350 assigned_to_ids referansi,
--          41 assigned_to_id, 25 tq_comments. HR verisi YOK. Sync isi bu id'yi
--          users'tan otomatik uretiyor (silinirse geri gelir) -> HEDEF bu.
--   9378c40c-d1ed-4862-a6b3-14a35c6fda15  full_name="İbrahim Gün"  status=aktif
--       -> Gercek IK kaydi: card_uid=7DA034D5, department=abys_yazilim_ekibi,
--          position=is_analisti, hire_date=2013-04-03, manager=Fatih Aktolan.
--          Sadece 2 bilet (assigned_to_ids), 4 tq_comments, 4 leave_requests.
--
-- 01 numarali migration (users/employees email .com -> .com.tr) UYGULANDI;
-- artik iki employees satiri da ayni e-postada -> /api/auth/me/employee hangi
-- satiri dondurecegi belirsiz, kullanici kendi biletlerini goremiyor.
--
-- Cozum: 9378c40c'nin IK alanlarini + kartini 4aa7a501'e tasi, referanslarini
-- 4aa7a501'e cevir, 9378c40c'yi sil. Sonuc: tek employees satiri (4aa7a501),
-- aktif, tam IK verisi, tum TaskQube gecmisi korunur.

BEGIN;

-- 1) IK alanlarini hedefe kopyala; 4aa7a501'in kendi app_role/email/id'sini koru
UPDATE employees SET
  full_name        = 'İbrahim Gün',
  status           = 'aktif',
  show_in_taskqube = 1,
  phone            = (SELECT phone FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  department       = (SELECT department FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  position         = (SELECT position FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  hire_date        = (SELECT hire_date FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  manager_id       = (SELECT manager_id FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  manager_name     = (SELECT manager_name FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  card_uid         = (SELECT card_uid FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  tc               = (SELECT tc FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  birth_date       = (SELECT birth_date FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  gender           = (SELECT gender FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  university             = (SELECT university FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  education_department   = (SELECT education_department FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  graduation_date       = (SELECT graduation_date FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  education_documents    = (SELECT education_documents FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  education_history      = (SELECT education_history FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  education_level        = (SELECT education_level FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  highest_education      = (SELECT highest_education FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  next_leave_entitlement_date = (SELECT next_leave_entitlement_date FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  leave_carryover       = (SELECT leave_carryover FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'),
  leave_used_before     = (SELECT leave_used_before FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15')
WHERE id='4aa7a501-5480-4a95-9f7a-1f9450d221f2';

-- 2) 9378c40c referanslarini 4aa7a501'e cevir
UPDATE tq_comments   SET author_id='4aa7a501-5480-4a95-9f7a-1f9450d221f2'
  WHERE author_id='9378c40c-d1ed-4862-a6b3-14a35c6fda15';
UPDATE leave_requests SET employee_id='4aa7a501-5480-4a95-9f7a-1f9450d221f2'
  WHERE employee_id='9378c40c-d1ed-4862-a6b3-14a35c6fda15';
UPDATE card_logs SET employee_id='4aa7a501-5480-4a95-9f7a-1f9450d221f2', employee_name='İbrahim Gün'
  WHERE employee_id='9378c40c-d1ed-4862-a6b3-14a35c6fda15';

-- 3) Iki bilette assigned_to_ids/names dizilerini elle duzelt (tutarli uzunluk)
--    32764: 9378 girisi cikarilir (2. sirada zaten 4aa7 var)
UPDATE tq_tickets SET
  assigned_to_ids  = '["124a26cb-c82c-41d4-81f1-db65b25186f4","4aa7a501-5480-4a95-9f7a-1f9450d221f2","11ddc5e1-108b-4d07-85f5-864fa29d5453"]',
  assigned_to_names= '["Sevgi Tuğba Gökhan","İbrahim Gün","Esra Bayram"]'
WHERE ticket_number='32764';
--    33011: 9378 -> 4aa7
UPDATE tq_tickets SET
  assigned_to_ids  = '["124a26cb-c82c-41d4-81f1-db65b25186f4","11ddc5e1-108b-4d07-85f5-864fa29d5453","4aa7a501-5480-4a95-9f7a-1f9450d221f2"]',
  assigned_to_names= '["Sevgi Tuğba Gökhan","Esra Bayram","İbrahim Gün"]'
WHERE ticket_number='33011';

-- 4) Fazla satiri sil
DELETE FROM employees WHERE id='9378c40c-d1ed-4862-a6b3-14a35c6fda15';

COMMIT;

-- KONTROL:
--   SELECT id, full_name, email, status, card_uid, department FROM employees WHERE email LIKE 'ibrahim.gun@%';
--     -> tek satir, 4aa7a501, aktif, card_uid dolu
--   SELECT COUNT(*) FROM tq_tickets WHERE assigned_to_ids LIKE '%9378c40c%';   -> 0
--   SELECT COUNT(*) FROM tq_comments WHERE author_id='9378c40c-d1ed-4862-a6b3-14a35c6fda15'; -> 0
