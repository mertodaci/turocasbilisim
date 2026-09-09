-- 01 numarali script'in duzeltmesi.
--
-- 01, cakisan 4 satiri sabit 33157-33160'a tasidi; ancak MAX+1 kodu deploy
-- olduktan sonra uygulama o numaralari zaten uretmisti -> yeni cakisma.
-- Bu script ayni 4 satiri (id ile sabit) canli MAX+1'e tasir. Her UPDATE
-- bir oncekinden sonra calistigi icin MAX ilerler, dolayisiyla 4'u de
-- farkli ve bos numara alir.
--
-- Idempotent DEGIL ama zararsiz: ikinci calistirmada bu 4 satiri yine
-- MAX ustune tasir (numaralar bosuna buyur, cakisma olusmaz). Gerekmedikce
-- tekrar calistirmayin.
--
-- Dogrulama (sonrasinda bos donmeli):
--   SELECT ticket_number, COUNT(*) c FROM tq_tickets
--   WHERE ticket_number GLOB '[0-9]*' GROUP BY ticket_number HAVING c>1;

UPDATE tq_tickets
SET ticket_number = (SELECT CAST(MAX(CAST(ticket_number AS INTEGER)) + 1 AS TEXT)
                     FROM tq_tickets WHERE ticket_number GLOB '[0-9]*'),
    updated_date = datetime('now')
WHERE id = 'fbc7fd49-aa7a-414f-8d54-bcb6bc71f427';

UPDATE tq_tickets
SET ticket_number = (SELECT CAST(MAX(CAST(ticket_number AS INTEGER)) + 1 AS TEXT)
                     FROM tq_tickets WHERE ticket_number GLOB '[0-9]*'),
    updated_date = datetime('now')
WHERE id = 'fee123d3-5d9f-4a27-aa08-f019a05869b4';

UPDATE tq_tickets
SET ticket_number = (SELECT CAST(MAX(CAST(ticket_number AS INTEGER)) + 1 AS TEXT)
                     FROM tq_tickets WHERE ticket_number GLOB '[0-9]*'),
    updated_date = datetime('now')
WHERE id = '702df431-32b6-4a1c-996f-d7d45c5edf2e';

UPDATE tq_tickets
SET ticket_number = (SELECT CAST(MAX(CAST(ticket_number AS INTEGER)) + 1 AS TEXT)
                     FROM tq_tickets WHERE ticket_number GLOB '[0-9]*'),
    updated_date = datetime('now')
WHERE id = '9daeb0e6-34c9-426b-a4dc-987956b6035d';
