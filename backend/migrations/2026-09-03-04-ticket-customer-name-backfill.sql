-- 2026-09-03-04  tq_tickets.customer_name backfill
--
-- Eski/ice aktarilmis biletlerde customer_id dolu ama customer_name bos.
-- Liste/Excel/arama denormalize customer_name alanina bakiyordu -> "Musteri"
-- sutunu bos gorunuyordu (detay ekrani customer_id'den cozdugu icin doluydu).
-- Frontend artik fallback yapiyor; bu migration saklanan alani da duzeltir,
-- boylece Excel ciktisi ve diger ekranlar da dogru olur.
--
-- ONCE (kac satir etkilenecek):
--   SELECT COUNT(*) FROM tq_tickets
--   WHERE (customer_name IS NULL OR customer_name='') AND customer_id IS NOT NULL AND customer_id != '';

UPDATE tq_tickets
SET customer_name = (SELECT c.company_name FROM customers c WHERE c.id = tq_tickets.customer_id)
WHERE (customer_name IS NULL OR customer_name = '')
  AND customer_id IS NOT NULL AND customer_id != ''
  AND EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = tq_tickets.customer_id
      AND c.company_name IS NOT NULL AND c.company_name != ''
  );

-- SONRA (kalan = musterisi gercekten silinmis/isimsiz olanlar):
--   SELECT COUNT(*) FROM tq_tickets
--   WHERE (customer_name IS NULL OR customer_name='') AND customer_id IS NOT NULL AND customer_id != '';
