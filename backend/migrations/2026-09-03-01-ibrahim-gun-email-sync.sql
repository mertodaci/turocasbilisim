-- 2026-09-03-01  ibrahim.gun kullanicisi kendi biletlerini goremiyor
--
-- Sebep: users.email `ibrahim.gun@indbilisim.com.tr` olarak duzeltildi ama
-- employees.email hala `...com` kaldi. Kisisel gorunumlerin tamami calisani
-- e-posta ile cozuyor (GET /api/auth/me/employee -> employees WHERE email=?),
-- eslesme bos donunce hic bilet/aktivite gorunmuyor.
--
-- Biletlerdeki assigned_to_ids calisan ID'sini tutuyor (e-posta degil); ID
-- sabit oldugu icin sadece e-postalari esitlemek yeterli, veri tasimaya gerek yok.
--
-- ONCE TESHIS (uygulamadan once calistir, sonucu kontrol et):
--   SELECT 'users' t, id, email, role, status FROM users WHERE email LIKE 'ibrahim.gun@%';
--   SELECT 'employees' t, id, email, full_name, status, is_deleted
--     FROM employees WHERE email LIKE 'ibrahim.gun@%' OR full_name LIKE '%ibrahim.gun%';
--   SELECT ticket_number, assigned_to_id, assigned_to_ids, assigned_to_names
--     FROM tq_tickets WHERE ticket_number IN ('29239','30651','31974','31413','33011','32764');
--
-- Tek employees satiri cikarsa asagidaki UPDATE yeterli.
-- Iki employees satiri cikarsa: biletlerin assigned_to_ids alaninda gecen id
-- "asil" satirdir; e-postayi ona tasi, digerini pasifle (plan Adim 2B).

UPDATE employees
SET email = 'ibrahim.gun@indbilisim.com.tr'
WHERE email = 'ibrahim.gun@indbilisim.com';

-- KONTROL (emp_id dolu gelmeli):
--   SELECT u.email u_mail, e.email e_mail, e.id emp_id
--     FROM users u LEFT JOIN employees e ON lower(e.email)=lower(u.email)
--     WHERE u.email LIKE 'ibrahim.gun@%';
