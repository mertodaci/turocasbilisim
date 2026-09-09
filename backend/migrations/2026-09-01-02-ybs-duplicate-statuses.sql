-- YBS Teknik Destek panosundaki mükerrer durum tanımlarını temizle.
--
-- Pano id: b4a2a773-6d1a-4227-a4f2-40e9971dd904
-- Bu panoda 7 durum (key) ikişer kez tanımlıydı. Her çiftte biri is_active=1
-- (panoda görünen, düşük sort_order), biri is_active=0 (fazlalık). Aşağıdaki
-- 7 satır tamamı is_active=0 olan fazlalıklardır; silinince panoda hiçbir şey
-- değişmez (board yalnızca is_active=1 durumları render eder) ve biletler
-- status'u key string'i ile tuttuğu için yetim kalmaz.
--
-- merge_bekleniyor'da iki satır da is_active=0; sort_order'ı yüksek olan
-- (fc8b3c81, 220) silinir, düşük olan (44936750, 130) kalır.
--
-- Idempotent: ikinci çalıştırmada silinecek satır kalmaz.
--
-- Doğrulama (uygulama sonrası her key tek satır olmalı):
--   SELECT key, board_ids, COUNT(*) c FROM tq_ticket_statuses
--   WHERE board_ids='["b4a2a773-6d1a-4227-a4f2-40e9971dd904"]'
--   GROUP BY key, board_ids HAVING c>1;

DELETE FROM tq_ticket_statuses WHERE id IN (
  'a65e8e97-e871-43bc-bdbc-ff4ecf3ffda3',  -- analiz_gelistiriliyor (fazlalik)
  '43539d7e-4293-4fbc-aef8-4f9835b58030',  -- arsivlendi (fazlalik)
  '2162efd5-3283-45a1-8785-cc1ce59c086e',  -- guncelleme_bekleniyor (fazlalik)
  'fc8b3c81-aa98-4985-8473-ed0af2d5a7f1',  -- merge_bekleniyor (fazlalik, sort 220)
  '88b86bac-394b-41fe-bc2b-0d271f367cd2',  -- musteri_onay (fazlalik)
  'e372686e-3fc2-4c3e-8bda-640f2e507c52',  -- musteri_testten_donen (fazlalik)
  'a7d4920a-6021-4a6c-acf2-4cc7f4824420'   -- yapilacak (fazlalik)
);
