# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric/backend dizininde -> python3 temizle_mukerrer_personel.py
#
# Mukerrer personel kayitlarini is_deleted=1 yapar (KALICI SILMEZ).
# Her isimde aktif ve dogru veriye sahip kayit korunur.
# Silinecek kayitlarin bagli izin talebi YOK; Esra Bayram'in pasif kaydindaki
# allowance satirlari aktif kayittakiyle birebir ayni (2024 ve 2026: 14/0),
# bu yuzden tasima gerekmiyor.

import sqlite3

DB = "database.sqlite"

# (silinecek_id, isim, aciklama)
SILINECEK = [
    ("e3a70f58-f3ee-4991-bf32-65597dae274a", "Atakan Arslan",  "pasif kopya, 0 izin 0 hak"),
    ("364ad214-5a17-4526-b42e-5c67c3d60716", "Esra Bayram",    "pasif kopya, tamamen bos"),
    ("8f95f837-62fc-4231-9151-e8d256d586b8", "Esra Bayram",    "pasif kopya, allowance'lari aktif kayitla ayni"),
    ("00aab321-f2b7-4984-ba95-a2e59190d892", "Guldogan Verdi", "pasif kopya, 0 izin 0 hak"),
]

# Korunacaklar (dogrulama icin)
KORUNACAK = {
    "Atakan Arslan":  "aeba44e4-0a2a-45aa-a129-2baa4451cb6c",
    "Esra Bayram":    "11ddc5e1-108b-4d07-85f5-864fa29d5453",
    "Guldogan Verdi": "58478759-0de2-4fd8-9d50-de1fe849ba44",
}

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row

print("=== ON KONTROL ===")
hata = False
for eid, isim, aciklama in SILINECEK:
    row = con.execute(
        "SELECT full_name, status, is_deleted FROM employees WHERE id=?", (eid,)
    ).fetchone()
    if row is None:
        print("  BULUNAMADI: %s (%s)" % (eid, isim))
        hata = True
        continue
    n_izin = con.execute(
        "SELECT COUNT(*) FROM leave_requests WHERE employee_id=?", (eid,)
    ).fetchone()[0]
    if n_izin > 0:
        print("  DUR! %s kaydinda %d izin talebi var - elle incelenmeli" % (isim, n_izin))
        hata = True
        continue
    print("  OK: %s | %s | durum=%s | %s" % (eid[:8], row["full_name"], row["status"], aciklama))

# Korunacaklarin yerinde oldugunu dogrula
for isim, eid in KORUNACAK.items():
    row = con.execute(
        "SELECT full_name, status FROM employees WHERE id=? AND (is_deleted=0 OR is_deleted IS NULL)", (eid,)
    ).fetchone()
    if row is None:
        print("  DUR! Korunacak kayit bulunamadi: %s (%s)" % (isim, eid))
        hata = True
    else:
        print("  KORUNACAK: %s | %s | durum=%s" % (eid[:8], row["full_name"], row["status"]))

if hata:
    print("\nHATA VAR - hicbir degisiklik yapilmadi.")
    con.close()
    raise SystemExit(1)

print("\n=== TEMIZLIK ===")
n = 0
for eid, isim, _ in SILINECEK:
    r = con.execute(
        "UPDATE employees SET is_deleted=1, updated_date=datetime('now') WHERE id=?", (eid,)
    )
    n += r.rowcount
    print("  isaretlendi: %s (%s)" % (eid[:8], isim))
con.commit()

print("\n=== SONUC ===")
print("  %d kayit is_deleted=1 yapildi" % n)
rows = con.execute("""
    SELECT full_name, COUNT(*) adet FROM employees
    WHERE (is_deleted=0 OR is_deleted IS NULL)
    GROUP BY full_name HAVING COUNT(*) > 1
""").fetchall()
if rows:
    print("  Kalan mukerrer:")
    for r in rows:
        print("    %s (%d)" % (r["full_name"], r["adet"]))
else:
    print("  Mukerrer kayit kalmadi.")
con.close()

print("")
print("Geri almak icin: UPDATE employees SET is_deleted=0 WHERE id IN (...)")
