#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HISTORY AKTARIM (eski TaskQube PostgreSQL blt_bilet_hareket -> FlowMetrics tq_comments comment_type='system')
==============================================================================================
Bu script FlowMetrics sunucusunda (10.0.1.140) calisir. PG'ye ve SQLite'a buradan erisilir.
sync_taskpad.py'nin yorum mantigini BIREBIR taklit eder, sadece comment_type='system'.

NE YAPAR:
  - PG blt_bilet_hareket'ten TUM aktif hareketleri ceker (424 bin)
  - Her hareketi tq_comments'a comment_type='system' olarak yazar
  - Bilet eslesmesi: bilet_id -> ticket_uuid (sync_taskpad ile ayni)
  - Kullanici: kaydeden_kullanici_id -> author (core_kullanici)
  - content: yeni_deger doluysa onu, degilse islem_tipi'nin Turkce karsiligi
  - Kararli id (hareket uuid'sinden) -> tekrar calissa duplicate olmaz

KULLANIM:
  python3 history_aktar.py --dry-run   # HICBIR SEY YAZMAZ, sadece sayar
  python3 history_aktar.py             # gercek aktarim
  python3 history_aktar.py --limit 100 # test icin ilk 100
"""
import sys, uuid, argparse
from datetime import datetime
import psycopg2
import sqlite3

PG = dict(host="10.0.1.63", port=5432, dbname="taskpaddb", user="taskpaduser", password="Pf5yNGLtkQe69e")
SQLITE_PATH = "/home/rootori/flowmetric/backend/database.sqlite"

ap = argparse.ArgumentParser()
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--batch", type=int, default=5000, help="Kac kayitta bir commit")
args = ap.parse_args()
DRY = args.dry_run

def log(m): print(m, flush=True)

# islem_tipi -> okunur Turkce (yeni_deger bossa kullanilir)
ISLEM_TR = {
    "BILET_KAYDEDILDI": "Bilet kaydedildi",
    "BILET_TASINDI": "Bilet tasindi",
    "BILET_GUNCELLENDI": "Bilet guncellendi",
    "BILET_ARSIVLENDI": "Bilet arsivlendi",
    "KULLANICI_EKLENDI": "Kullanici eklendi",
    "KULLANICI_SILINDI": "Kullanici cikarildi",
    "BELGE_EKLENDI": "Belge eklendi",
    "BELGE_SILINDI": "Belge silindi",
    "YORUM_EKLENDI": "Yorum eklendi",
    "YORUM_CEVAPLANDI": "Yorum cevaplandi",
    "YORUM_SILINDI": "Yorum silindi",
    "ETIKET_EKLENDI": "Etiket eklendi",
    "ETIKET_KALDIRILDI": "Etiket kaldirildi",
    "CHECKLIST_EKLENDI": "Kontrol listesi eklendi",
    "CHECKLIST_YAPILDI": "Kontrol listesi tamamlandi",
}

def ensure_uuid(val):
    s = str(val).strip()
    try:
        uuid.UUID(s); return s
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, s))

def ticket_uuid_from_no(pg_uuid, bilet_no):
    if bilet_no is not None and str(bilet_no).strip():
        return str(uuid.uuid5(uuid.NAMESPACE_OID, "bilet_no:" + str(bilet_no).strip()))
    s = str(pg_uuid).strip()
    try:
        uuid.UUID(s); return s
    except Exception:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, s))

def to_iso(dt):
    if dt is None: return datetime.now().isoformat()
    return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)

log("="*60)
log(f"HISTORY AKTARIM {'(DRY-RUN)' if DRY else '(GERCEK)'}")
log("="*60)

log("PG baglaniyor...")
pg = psycopg2.connect(**PG); pgcur = pg.cursor()
log("SQLite baglaniyor...")
sq = sqlite3.connect(SQLITE_PATH); sqcur = sq.cursor()

# Mevcut sistem yorumlarini al (duplicate onleme)
existing = {r[0] for r in sqcur.execute("SELECT id FROM tq_comments").fetchall()}
log(f"  mevcut tq_comments kaydi: {len(existing)}")

# FlowMetrics'teki biletler (eslesme kontrolu icin)
fm_tickets = {r[0] for r in sqcur.execute("SELECT id FROM tq_tickets").fetchall()}
log(f"  FlowMetrics bilet sayisi: {len(fm_tickets)}")

# PG: bilet_id -> (uuid, bilet_no) haritasi (ticket_uuid uretmek icin)
log("PG bilet haritasi cekiliyor...")
pgcur.execute("SELECT id, uuid, bilet_no FROM blt_bilet WHERE aktif=true")
bilet_map = {}
for bid, buuid, bno in pgcur.fetchall():
    bilet_map[bid] = ticket_uuid_from_no(buuid, bno)
log(f"  PG aktif bilet: {len(bilet_map)}")

# PG: kullanici_id -> (username, email)
log("PG kullanici haritasi cekiliyor...")
pgcur.execute("SELECT id, username, email FROM core_kullanici")
kul_map = {r[0]: (r[1], r[2]) for r in pgcur.fetchall()}
log(f"  PG kullanici: {len(kul_map)}")

# PG: hareketler
log("PG hareketler cekiliyor (424 bin, biraz surebilir)...")
lim = f"LIMIT {args.limit}" if args.limit else ""
pgcur.execute(f"""
    SELECT id, uuid, islem_tipi, yeni_deger, kayit_zamani, kaydeden_kullanici_id, bilet_id
    FROM blt_bilet_hareket
    WHERE aktif=true
    ORDER BY id
    {lim}
""")

st = dict(toplam=0, yeni=0, atlandi_var=0, atlandi_bilet_yok=0, commit_sayisi=0)
buf = []
BATCH = args.batch

def flush():
    global buf
    if buf and not DRY:
        sqcur.executemany("""INSERT OR IGNORE INTO tq_comments (
            id, ticket_id, content, author_id, author_name, author_email,
            is_internal, comment_type, created_by, created_date, updated_date
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""", buf)
        sq.commit()
        st["commit_sayisi"] += 1
    buf = []

for row in pgcur:
    st["toplam"] += 1
    (hid, huuid, islem_tipi, yeni_deger, kayit, kaydeden_id, bilet_id) = row

    ticket_uuid = bilet_map.get(bilet_id)
    if not ticket_uuid or ticket_uuid not in fm_tickets:
        st["atlandi_bilet_yok"] += 1
        continue

    fm_id = ensure_uuid(huuid) if huuid else str(uuid.uuid5(uuid.NAMESPACE_OID, f"hareket:{hid}"))
    if fm_id in existing:
        st["atlandi_var"] += 1
        continue

    # content: yeni_deger doluysa onu, degilse islem_tipi Turkcesi
    content = (yeni_deger or "").strip() or ISLEM_TR.get(islem_tipi, islem_tipi or "Islem")

    uname, uemail = kul_map.get(kaydeden_id, (None, None))
    author_name = uname or uemail or "Sistem"

    buf.append((
        fm_id, ticket_uuid, content, None, author_name, uemail or "",
        0, "system", "sync", to_iso(kayit), to_iso(kayit)
    ))
    existing.add(fm_id)
    st["yeni"] += 1

    if len(buf) >= BATCH:
        flush()
        if st["yeni"] % 25000 == 0:
            log(f"  ... {st['toplam']} okundu | {st['yeni']} yeni | {st['atlandi_bilet_yok']} bilet-yok")

flush()

log("="*60)
log("SONUC:")
for k,v in st.items(): log(f"  {k}: {v}")
log("="*60)
log("DRY-RUN bitti (hicbir sey yazilmadi)" if DRY else "AKTARIM TAMAMLANDI")

sqcur.close(); sq.close(); pgcur.close(); pg.close()
