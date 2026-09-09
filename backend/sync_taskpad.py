#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_taskpad.py — Eski uygulama (PostgreSQL @ 10.0.1.63) -> FlowMetrics (SQLite) TAM SENKRON

Kullanim:
  python3 sync_taskpad.py --dry-run    # hicbir sey yazmaz, ne degisecegini raporlar
  python3 sync_taskpad.py              # gercek senkron (yazar)

Mantik:
  - Musteri / proje / kullanici / pano / bilet / yorum: VARSA GUNCELLE, YOKSA EKLE (upsert)
  - Kaynak = eski uygulama. FlowMetrics ayna.
  - Sadece PG kaynakli alanlar guncellenir; FlowMetrics'e ozel alanlar (tags, attachments,
    parent_ticket_id, yonlendirme_notu, group_key vb.) KORUNUR.
  - ensure_uuid ile kararli UUID -> ayni kayit hep ayni id, duplicate olmaz.
"""
import psycopg2
import sqlite3
import uuid
import json
import sys
from datetime import datetime

PG_HOST = "10.0.1.63"
PG_PORT = 5432
PG_DB   = "taskpaddb"
PG_USER = "taskpaduser"
PG_PASS = "Pf5yNGLtkQe69e"

SQLITE_PATH = "/home/rootori/flowmetric/backend/database.sqlite"
LOG_PATH    = "/home/rootori/flowmetric/backend/sync_taskpad.log"
# PANO_IDS bos birakilirsa: TUM panolardaki biletler cekilir (asagida doldurulur)
PANO_IDS = []  # tum panolar icin bos; asagida pn_pano'dan doldurulur

DRY_RUN = "--dry-run" in sys.argv
LIGHT = "--light" in sys.argv  # hafif mod: sadece aktif + son gunlerde guncellenmis biletler (daemon icin)

LISTE_STATUS_MAP = {
    "müşteri onay": "musteri_onay", "sonuçlanan": "sonuclanan", "sonuçlandı": "sonuclanan",
    "analiz geliştiriliyor": "analiz_gelistiriliyor", "analiz-not": "analiz_not",
    "test": "test_ediliyor", "analiz test": "analiz_test", "kurum test": "kurum_test",
    "cevap bekleniyor": "cevap_bekleniyor", "müşteri cevap": "cevap_bekleniyor",
    "yapılacak": "yapilacak", "backlog": "backlog", "iptal": "iptal", "i̇ptal": "iptal",
    "iptal edildi": "iptal", "i̇ptal edildi": "iptal", "analiz onaylandı": "analiz_onaylandi",
    "analiz tamamlandı": "analiz_tamamlandi", "güncelleme bekleniyor": "guncelleme_bekleniyor",
    "müşteri testten dönen": "musteri_testten_donen", "acil işler": "acil_isler", "acil i̇şler": "acil_isler",
    "yazılım onay bekliyor": "yazilim_onay_bekliyor", "yazılım onaylandı": "yazilim_onaylandi",
    "yazılım geliştiriliyor": "yazilim_gelistiriliyor", "testten dönen": "testten_donen",
    "yazılmdan dönen": "testten_donen", "merge bekleniyor": "merge_bekleniyor",
    "müşteri talep": "musteri_talep", "analiz yapılıyor": "analiz_yapiliyor", "taskqube": "taskqube",
    "yönetmelikte yapılan yenilikler": "yonetmelik", "analiz bekleyen": "analiz_bekleyen",
    "yazılım bekleyen": "yazilim_bekleyen", "ar-ge": "ar_ge", "arge": "ar_ge",
    "yazılım onaylandı öncelikli": "yazilim_onaylandi_oncelikli",
    "eskişehir entegrasyon": "eskisehir_entegrasyon",
    "done": "sonuclanan",
    "resolved": "sonuclanan",
    "to do": "yapilacak",
    "in progress": "yazilim_gelistiriliyor",
    "testflight": "test_ediliyor",
    "googlebeta": "test_ediliyor",
    "analiz": "analiz_yapiliyor",
    "onaylandı": "analiz_onaylandi",
    "yönetmelikte yapılan yenilikler": "yonetmelik",
}
TYPE_MAP = {
    28700: "Yeni İstek", 28701: "Yazılım", 28702: "Yazılım", 181809: "Yazılım",
    181810: "Yeni İstek", 197550: "Aktarım", 28704: "Ek Geliştirme", 492821: "Kullanıcı Hatası",
}
ROLE_MAP = {
    "ADMIN": "admin", "SISTEM_YONETICISI": "yonetici", "PROJE_YONETICISI": "yonetici",
    "GENEL_KOORDINATOR": "yonetici", "YAZILIMCI": "kullanici", "ANALIST": "kullanici",
    "URUN_YONETICISI": "kullanici", "MUSTERI": "musteri",
}

def ensure_uuid(val):
    if val is None:
        return str(uuid.uuid4())
    s = str(val).strip()
    try:
        uuid.UUID(s); return s
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, s))

def ticket_uuid(pg_uuid, bilet_no):
    # PG uuid gecersiz/tekrarli olabilir ( or. ayni uuid 96 bilette).
    # Once bilet_no'dan kararli ve benzersiz uuid uret (bilet_no her bilette farkli).
    if bilet_no is not None and str(bilet_no).strip():
        return str(uuid.uuid5(uuid.NAMESPACE_OID, "bilet_no:" + str(bilet_no).strip()))
    return ensure_uuid(pg_uuid)

def to_iso(dt):
    if dt is None: return datetime.utcnow().isoformat() + "Z"
    if isinstance(dt, datetime): return dt.isoformat() + "Z"
    return str(dt)

def liste_to_status(liste_adi):
    if not liste_adi: return "musteri_talep"
    return LISTE_STATUS_MAP.get(liste_adi.strip().lower(), "musteri_talep")

logf = open(LOG_PATH, "a", encoding="utf-8")
def log(msg):
    line = f"[{datetime.now().isoformat()}] {msg}"
    print(line)
    logf.write(line + "\n")

log("=" * 60)
log(f"SYNC BASLADI {'(DRY-RUN)' if DRY_RUN else '(GERCEK)'}")

pg = psycopg2.connect(host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASS)
pgcur = pg.cursor()

# PANO_IDS bos ise tum aktif panolari al
if not PANO_IDS:
    _pc = pg.cursor()
    _pc.execute("SELECT id FROM pn_pano WHERE aktif = true")
    PANO_IDS = [r[0] for r in _pc.fetchall()]
    _pc.close()
    log(f"PANO_IDS otomatik dolduruldu: {len(PANO_IDS)} pano")
sq = sqlite3.connect(SQLITE_PATH)
sq.row_factory = sqlite3.Row
sqcur = sq.cursor()

stats = {}
def bump(k, n=1): stats[k] = stats.get(k, 0) + n

musteri_id_to_uuid = {}
kullanici_id_to_uuid = {}
kullanici_id_to_name = {}
pano_id_to_uuid = {}

# ─── 1. MUSTERILER ───────────────────────────────────────────
existing_customers = {r[0] for r in sqcur.execute("SELECT id FROM customers").fetchall()}
pgcur.execute("SELECT id, uuid, adi, aktif, kayit_zamani, guncelleme_zamani FROM mstr_musteri WHERE aktif = true")
for id_, uuid_, adi, aktif, kayit, guncelleme in pgcur.fetchall():
    fm = ensure_uuid(uuid_); musteri_id_to_uuid[id_] = fm
    if fm in existing_customers:
        # FLOW SAHIBI: mevcut musteri kaydina DOKUNMA (flow'da elle duzenlenmis olabilir - Mert Odaci ornegi)
        bump("musteri_korundu")
    else:
        if not DRY_RUN:
            sqcur.execute("INSERT OR IGNORE INTO customers (id, company_name, status, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?)",
                          (fm, adi or "Bilinmiyor", "aktif" if aktif else "pasif", "sync", to_iso(kayit), to_iso(guncelleme)))
        bump("musteri_yeni")
if not DRY_RUN: sq.commit()

# ─── 2. PROJELER ─────────────────────────────────────────────
existing_projects = {r[0] for r in sqcur.execute("SELECT id FROM tq_projects").fetchall()}
# FLOW'DA SILINEN projeler (is_deleted=1) - sync bunlara DOKUNMASIN (geri getirmesin)
deleted_projects = {r[0] for r in sqcur.execute("SELECT id FROM tq_projects WHERE is_deleted=1").fetchall()}
pgcur.execute("""
    SELECT p.id, p.uuid, p.adi, p.aktif, p.musteri_id, m.uuid, m.adi, p.kayit_zamani, p.guncelleme_zamani
    FROM prj_proje p LEFT JOIN mstr_musteri m ON m.id = p.musteri_id
    WHERE p.calisma_alani_id IN (SELECT DISTINCT calisma_alani_id FROM pn_pano WHERE id = ANY(%s))
""", (PANO_IDS,))
for id_, uuid_, adi, aktif, musteri_id, m_uuid, m_adi, kayit, guncelleme in pgcur.fetchall():
    fm = ensure_uuid(uuid_)
    m_fm = ensure_uuid(m_uuid) if m_uuid else musteri_id_to_uuid.get(musteri_id)
    if fm in deleted_projects:
        bump("proje_silindi_korundu")
        continue
    if fm in existing_projects:
        if not DRY_RUN:
            sqcur.execute("UPDATE tq_projects SET name=?, status=?, customer_id=?, customer_name=?, updated_date=? WHERE id=?",
                          (adi or "Bilinmiyor", "aktif" if aktif else "pasif", m_fm, m_adi, to_iso(guncelleme), fm))
        bump("proje_guncel")
    else:
        if not DRY_RUN:
            sqcur.execute("INSERT OR IGNORE INTO tq_projects (id, name, status, customer_id, customer_name, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?)",
                          (fm, adi or "Bilinmiyor", "aktif" if aktif else "pasif", m_fm, m_adi, "sync", to_iso(kayit), to_iso(guncelleme)))
        bump("proje_yeni")
if not DRY_RUN: sq.commit()

# ─── 3. KULLANICILAR ─────────────────────────────────────────
existing_emp = {r[0] for r in sqcur.execute("SELECT email FROM employees").fetchall()}
pgcur.execute("""SELECT kullanici_id, kt.kod FROM core_kullanici_tipleri ckt
                 JOIN core_kullanici_tipi kt ON ckt.kullanici_tipi_id = kt.id""")
kullanici_rol = {r[0]: r[1] for r in pgcur.fetchall()}
pgcur.execute("SELECT id, uuid, username, email, aktif, kayit_zamani, guncelleme_zamani FROM core_kullanici WHERE aktif = true")
for id_, uuid_, username, email, aktif, kayit, guncelleme in pgcur.fetchall():
    fm = ensure_uuid(uuid_)
    kullanici_id_to_uuid[id_] = fm
    kullanici_id_to_name[id_] = username or email
    if not email or "@" not in email: continue
    role = ROLE_MAP.get(kullanici_rol.get(id_, ""), "kullanici")
    # Musteri rollu kullanicilar CALISAN degildir -> employees'e yazma (giris icin users'ta zaten var)
    if role == "musteri":
        continue
    if email in existing_emp:
        # FLOW SAHIBI: mevcut calisan kaydina DOKUNMA (flow'da elle duzenlenmis olabilir)
        bump("kullanici_korundu")
    else:
        if not DRY_RUN:
            sqcur.execute("INSERT OR IGNORE INTO employees (id, full_name, email, status, app_role, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?)",
                          (fm, username or email, email, "aktif" if aktif else "pasif", role, "sync", to_iso(kayit), to_iso(guncelleme)))
        bump("kullanici_yeni")
if not DRY_RUN: sq.commit()

# ─── 4. PANOLAR ──────────────────────────────────────────────
existing_boards = {r[0] for r in sqcur.execute("SELECT id FROM tq_kanban_boards").fetchall()}
pgcur.execute("SELECT id, uuid, adi, aktif, kayit_zamani, guncelleme_zamani FROM pn_pano WHERE id = ANY(%s)", (PANO_IDS,))
for id_, uuid_, adi, aktif, kayit, guncelleme in pgcur.fetchall():
    fm = ensure_uuid(uuid_); pano_id_to_uuid[id_] = fm
    if fm in existing_boards:
        if not DRY_RUN:
            # is_active'e DOKUNMA: flow'da pasife alinan pano pasif kalsin (sync geri aktiflestirmez)
            sqcur.execute("UPDATE tq_kanban_boards SET name=?, updated_date=? WHERE id=?",
                          (adi, to_iso(guncelleme), fm))
        bump("pano_guncel")
    else:
        if not DRY_RUN:
            sqcur.execute("INSERT OR IGNORE INTO tq_kanban_boards (id, name, is_active, color, icon, created_by, created_date, updated_date) VALUES (?,?,?,?,?,?,?,?)",
                          (fm, adi, 1 if aktif else 0, "blue", "📋", "sync", to_iso(kayit), to_iso(guncelleme)))
        bump("pano_yeni")
if not DRY_RUN: sq.commit()

# ─── 5. BILETLER ─────────────────────────────────────────────
existing_tickets = {r[0] for r in sqcur.execute("SELECT id FROM tq_tickets").fetchall()}
bilet_id_to_uuid = {}
pgcur.execute("""
    SELECT b.id, b.uuid, b.bilet_no, b.ozet, b.detay, b.bilet_tipi_id,
           b.hedef_bitis_tarihi, b.calisma_suresi, b.kayit_zamani, b.guncelleme_zamani, b.gerceklesen_bitis_tarihi,
           l.pano_id, p.adi, l.adi,
           m.id, m.uuid, m.adi, prj.uuid, prj.adi, u.adi
    FROM blt_bilet b
    LEFT JOIN lst_liste l ON b.liste_id = l.id
    LEFT JOIN pn_pano p ON l.pano_id = p.id
    LEFT JOIN prj_proje_urun pu ON pu.id = b.proje_urun_id
    LEFT JOIN prj_proje prj ON prj.id = pu.proje_id
    LEFT JOIN mstr_musteri m ON m.id = prj.musteri_id
    LEFT JOIN urn_urun u ON u.id = pu.urun_id
    WHERE b.aktif = true AND (l.pano_id = ANY(%s) OR b.liste_id IS NULL)
""" + ("""
    AND b.guncelleme_zamani > (NOW() - INTERVAL '3 days')
""" if LIGHT else ""), (PANO_IDS,))
biletler = pgcur.fetchall()
log(f"PG'den {len(biletler)} aktif bilet cekildi")
# FLOW SAHIBI ISIMLER: bilet uzerine yazilacak musteri/atanan isimleri flow tablosundan al (eski app degil)
flow_cust_name = {r[0]: r[1] for r in sqcur.execute("SELECT id, company_name FROM customers").fetchall()}
flow_emp_name = {r[0]: r[1] for r in sqcur.execute("SELECT id, full_name FROM employees").fetchall()}

for row in biletler:
    (id_, uuid_, bilet_no, ozet, detay, tip_id, hedef_tarih, calisma_suresi,
     kayit, guncelleme, gercek_bitis, pano_id, pano_adi, liste_adi,
     musteri_id, m_uuid, m_adi, proje_uuid, proje_adi, urun_adi) = row
    fm = ticket_uuid(uuid_, bilet_no); bilet_id_to_uuid[id_] = fm
    # Panosuz (liste_id NULL) biletler: arsivlendi statusu, board YOK
    if liste_adi is None and pano_id is None:
        status = "arsivlendi"
        board_uuid = None
        pano_adi = None
    else:
        status = liste_to_status(liste_adi)
        board_uuid = pano_id_to_uuid.get(pano_id)
    tip = TYPE_MAP.get(tip_id, "Yazılım")
    m_fm = ensure_uuid(m_uuid) if m_uuid else (musteri_id_to_uuid.get(musteri_id) if musteri_id else None)
    pc = pg.cursor()
    pc.execute("SELECT bk.kullanici_id FROM blt_bilet_kullanicilari bk WHERE bk.bilet_id=%s AND bk.aktif=true", (id_,))
    arows = pc.fetchall(); pc.close()
    a_pairs = [(r[0], kullanici_id_to_uuid.get(r[0])) for r in arows if kullanici_id_to_uuid.get(r[0])]
    a_uuids = [u for (_, u) in a_pairs]
    # ISIM: flow employees.full_name oncelikli (Mert Odaci), yoksa eski app username
    a_adlar = [flow_emp_name.get(u) or kullanici_id_to_name.get(kid) for (kid, u) in a_pairs]
    a_uuid = a_uuids[0] if a_uuids else None
    a_adi = a_adlar[0] if a_adlar else None
    # ISIM: musteri adi flow customers.company_name oncelikli (senin duzelttigin), yoksa eski app
    m_adi_flow = (flow_cust_name.get(m_fm) or m_adi) if m_fm else m_adi
    hrs = round(calisma_suresi/60, 2) if calisma_suresi else 0
    proj_fm = ensure_uuid(proje_uuid) if proje_uuid else None

    if fm in existing_tickets:
        # GUNCELLE - sadece PG kaynakli alanlar; tags/attachments/parent/yonlendirme_notu KORUNUR
        if not DRY_RUN:
            sqcur.execute("""UPDATE tq_tickets SET
                title=?, description=?, ticket_number=?, status=?, type=?,
                board_id=?, board_name=?, customer_id=?, customer_name=?,
                project_id=?, project_name=?, product_name=?,
                assigned_to_id=?, assigned_to_name=?, assigned_to_ids=?, assigned_to_names=?,
                due_date=?, actual_hours=?, updated_date=?, resolved_at=?
                WHERE id=?""",
                (ozet or "(Başlık Yok)", detay or "", str(bilet_no) if bilet_no else None, status, tip,
                 board_uuid, pano_adi, m_fm, m_adi_flow, proj_fm, proje_adi, urun_adi,
                 a_uuid, a_adi, json.dumps(a_uuids), json.dumps(a_adlar),
                 str(hedef_tarih) if hedef_tarih else None, hrs, to_iso(guncelleme),
                 to_iso(gercek_bitis) if (gercek_bitis and status in ("sonuclanan","arsivlendi")) else None, fm))
        bump("bilet_guncel")
    else:
        if not DRY_RUN:
            sqcur.execute("""INSERT OR IGNORE INTO tq_tickets (
                id, title, description, ticket_number, status, type, priority,
                board_id, board_name, customer_id, customer_name,
                project_id, project_name, product_name,
                assigned_to_id, assigned_to_name, assigned_to_ids, assigned_to_names,
                due_date, actual_hours, tags, attachments,
                is_deleted, created_by, created_date, updated_date, resolved_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (fm, ozet or "(Başlık Yok)", detay or "", str(bilet_no) if bilet_no else None,
                 status, tip, "orta", board_uuid, pano_adi, m_fm, m_adi_flow,
                 proj_fm, proje_adi, urun_adi, a_uuid, a_adi,
                 json.dumps(a_uuids), json.dumps(a_adlar),
                 str(hedef_tarih) if hedef_tarih else None, hrs,
                 json.dumps([]), json.dumps([]), 0, "sync", to_iso(kayit), to_iso(guncelleme),
                 to_iso(gercek_bitis) if (gercek_bitis and status in ("sonuclanan","arsivlendi")) else None))
        bump("bilet_yeni")
if not DRY_RUN: sq.commit()

# ─── 6. YORUMLAR ─────────────────────────────────────────────
existing_comments = {r[0] for r in sqcur.execute("SELECT id FROM tq_comments").fetchall()}
pgcur.execute("""
    SELECT y.id, y.uuid, y.yorum, y.bilet_id, y.kullanici_id, y.musteriye_acik,
           y.kayit_zamani, y.guncelleme_zamani, k.username, k.email
    FROM blt_bilet_yorumlari y
    LEFT JOIN core_kullanici k ON k.id = y.kullanici_id
    WHERE y.bilet_id IN (
        SELECT b.id FROM blt_bilet b JOIN lst_liste l ON b.liste_id=l.id
        WHERE l.pano_id = ANY(%s) AND b.aktif=true)
""", (PANO_IDS,))
for row in pgcur.fetchall():
    (id_, uuid_, yorum, bilet_id, kullanici_id, musteriye_acik, kayit, guncelleme, username, email) = row
    fm = ensure_uuid(uuid_)
    ticket_uuid = bilet_id_to_uuid.get(bilet_id)
    if not ticket_uuid: continue
    author_uuid = kullanici_id_to_uuid.get(kullanici_id)
    if fm in existing_comments:
        if not DRY_RUN:
            sqcur.execute("UPDATE tq_comments SET content=?, is_internal=?, updated_date=? WHERE id=?",
                          (yorum or "", 0 if musteriye_acik else 1, to_iso(guncelleme), fm))
        bump("yorum_guncel")
    else:
        if not DRY_RUN:
            sqcur.execute("""INSERT OR IGNORE INTO tq_comments (
                id, ticket_id, content, author_id, author_name, author_email,
                is_internal, comment_type, created_by, created_date, updated_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (fm, ticket_uuid, yorum or "", author_uuid, username or email or "Bilinmiyor", email or "",
                 0 if musteriye_acik else 1, "comment", "sync", to_iso(kayit), to_iso(guncelleme)))
        bump("yorum_yeni")
if not DRY_RUN: sq.commit()

pgcur.close(); pg.close(); sq.close()

log("SONUC:")
for k in sorted(stats.keys()):
    log(f"   {k}: {stats[k]}")
log(f"SYNC BITTI {'(DRY-RUN - hicbir sey yazilmadi)' if DRY_RUN else '(GERCEK)'}")
log("=" * 60)
logf.close()
