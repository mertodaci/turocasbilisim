-- Çakışan bilet numaralarını ayrıştır.
--
-- MAX(...)+1 düzeltmesi (commit 2da41bb) deploy olana kadar eski COUNT(*)+1
-- kodu çalışmaya devam etti; sabahki yeniden numaralamadan sonra açılan 4 bilet
-- yine mevcut sync biletlerinin numaralarına (28194/28196/28197/28200) çakıştı.
-- Sync satırları (created_by='sync', 2025-12) orijinal numarada kalır;
-- FlowMetrics'te üretilen 4 satır MAX'in üstüne (33157–33160) taşınır.
--
-- Idempotent: her UPDATE eski numara şartına bağlı, ikinci çalıştırmada no-op.
--
-- Doğrulama (uygulama sonrası çakışma kalmamalı):
--   SELECT ticket_number, COUNT(*) c FROM tq_tickets
--   WHERE ticket_number GLOB '[0-9]*' GROUP BY ticket_number HAVING c>1;

UPDATE tq_tickets SET ticket_number='33157', updated_date=datetime('now')
  WHERE id='fbc7fd49-aa7a-414f-8d54-bcb6bc71f427' AND ticket_number='28194';

UPDATE tq_tickets SET ticket_number='33158', updated_date=datetime('now')
  WHERE id='fee123d3-5d9f-4a27-aa08-f019a05869b4' AND ticket_number='28196';

UPDATE tq_tickets SET ticket_number='33159', updated_date=datetime('now')
  WHERE id='702df431-32b6-4a1c-996f-d7d45c5edf2e' AND ticket_number='28197';

UPDATE tq_tickets SET ticket_number='33160', updated_date=datetime('now')
  WHERE id='9daeb0e6-34c9-426b-a4dc-987956b6035d' AND ticket_number='28200';
