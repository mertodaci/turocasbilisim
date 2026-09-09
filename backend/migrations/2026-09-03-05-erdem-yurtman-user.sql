-- 2026-09-03-05  Erdem Yurtman: eksik giris (users) hesabini olustur
--
-- Teshis: employees'te var (8609ba34-..., erdem.yurtman@indbilisim.com.tr,
-- app_role=''), users'ta YOK -> sisteme giremiyor / Kullanicilar listesinde
-- gorunmuyor. Otomatik olusturma (entityRouter POST /employees) yalnizca yeni
-- calisan eklenince calisir; Erdem zaten var oldugu icin geriye donuk tetiklenmez.
--
-- password_hash = bcryptjs($2a$10) hash of 'Ind2026x' (varsayilan sifre).
-- must_change_password=1 -> ilk giriste App.jsx ForcePasswordChange'e yonlendirir.
-- users.id = employees.id (sync deseniyle tutarli).

INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, must_change_password)
VALUES (
  '8609ba34-9f73-4862-8927-7b036553408d',
  'erdem.yurtman@indbilisim.com.tr',
  '$2a$10$g9swVxMQdn90u32jRkgemOCsg1uH/wFFkfjfPy8VID8SxcE9jFewy',
  'Erdem Yurtman',
  'kullanici',
  1
);

-- KONTROL:
--   SELECT id,email,full_name,role,must_change_password,status
--   FROM users WHERE email='erdem.yurtman@indbilisim.com.tr';
