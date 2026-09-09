-- 2026-09-03-03  ibrahim.gun -> "İbrahim Gün" gorunen ad duzeltmesi
--
-- 02 numarali merge sonrasi employees.full_name = "İbrahim Gün" oldu, ama
-- biletlerde/yorumlarda saklanan gorunen ad hala "ibrahim.gun". Bu alanlar
-- calisan kaydindan yeniden cozulmuyor, dogrudan gosteriliyor -> elle guncelle.
-- JSON dizilerinde tirnakli token replace edildigi icin guvenli.

BEGIN;

UPDATE tq_tickets
SET assigned_to_names = replace(assigned_to_names, '"ibrahim.gun"', '"İbrahim Gün"')
WHERE assigned_to_names LIKE '%"ibrahim.gun"%';

UPDATE tq_tickets
SET assigned_to_name = 'İbrahim Gün'
WHERE assigned_to_name = 'ibrahim.gun';

UPDATE tq_comments
SET author_name = 'İbrahim Gün'
WHERE author_name = 'ibrahim.gun';

COMMIT;

-- KONTROL (hepsi 0 donmeli):
--   SELECT COUNT(*) FROM tq_tickets  WHERE assigned_to_names LIKE '%"ibrahim.gun"%';
--   SELECT COUNT(*) FROM tq_tickets  WHERE assigned_to_name = 'ibrahim.gun';
--   SELECT COUNT(*) FROM tq_comments WHERE author_name = 'ibrahim.gun';
