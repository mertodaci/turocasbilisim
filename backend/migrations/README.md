# backend/migrations

Elle uygulanan, tek seferlik veri düzeltmeleri. **Otomatik çalışmazlar** —
`auto_deploy.sh` bunlara dokunmaz. Her biri idempotent yazıldı (ikinci kez
çalıştırınca zarar vermez), ama yine de uygulamadan önce yedek al.

## Uygulama

```bash
cd /home/rootori/flowmetric/backend
# 1) WAL'i birleştir + yedek
sqlite3 database.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"
cp database.sqlite database.sqlite.bak-$(date +%Y%m%d-%H%M%S)
# 2) script'i uygula
sqlite3 database.sqlite < migrations/<dosya>.sql
# 3) doğrula (dosyanın başındaki yorumda ne kontrol edileceği yazıyor)
```

Backend `better-sqlite3` ile aynı dosyayı açık tuttuğu için `sqlite3` CLI ile
yazmak sorun değildir (WAL modu); yine de yoğun olmayan bir anda uygula.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `2026-09-01-01-ticket-number-collisions.sql` | (ESKİ — 03 ile değiştirildi) 4 çakışan bileti sabit 33157–33160'a taşıyordu; o numaralar bu arada kullanıldığı için yeni çakışma yarattı. |
| `2026-09-01-02-ybs-duplicate-statuses.sql` | YBS Teknik Destek panosunda her durum için var olan 2. (is_active=0) kaydı siler — 7 satır |
| `2026-09-01-03-ticket-number-collisions-fix.sql` | 01'in düzeltmesi: aynı 4 satırı sabit numara yerine canlı MAX+1'e taşır. 01 zaten uygulandıysa **sadece bunu** çalıştır. |
