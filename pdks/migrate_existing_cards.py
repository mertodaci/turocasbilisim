#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIR KERELIK MIGRASYON: ESP32'lerin kendi bellegindeki (daha once pdks_cards
tablosu YOKKEN eklenmis) kartlari, Turocas'in database.sqlite -> pdks_cards
tablosuna aktarir. Boylece "Kart Yonetimi" sayfasindaki "Kayitli Kartlar"
listesinde artik gorunurler (aktif, employee_id bos -- istenirse sonra
sayfadan calisana baglanabilir).

Guvenli: zaten pdks_cards'ta olan bir uid'e DOKUNMAZ (mevcut kayit
korunur), sadece EKSIK olanlari ekler.

Calistirma (pdks/ klasoru icinden, pdks-daemon calisirken de calistirilabilir):
    cd /home/rootori/turocas/pdks
    python3 migrate_existing_cards.py
"""
import sys
import pdks_daemon as p

cfg = p.load_config()
p.DB_FILE = cfg["turocas_db_path"]
p.DEVICES = cfg["devices"]

p.verify_db()

existing = {c["uid"] for c in p.list_cards_db()}
print(f"pdks_cards tablosunda su an {len(existing)} kart kayitli.")

found = {}  # uid -> name
for dev in p.DEVICES:
    raw = p.esp_get_cards(dev["ip"])
    items = []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, dict):
        # olasi {"cards": [...]} sarmalayici
        items = raw.get("cards", [])

    count_dev = 0
    for it in items:
        uid = str(it.get("uid", "")).strip().upper()
        name = str(it.get("name", "")).strip()
        if not uid:
            continue
        if uid not in found:
            found[uid] = name or "(isimsiz)"
        count_dev += 1
    print(f"{dev['id']} ({dev['ip']}): cihazda {count_dev} kart bulundu.")

new_uids = [u for u in found if u not in existing]

if not new_uids:
    print("\nAktarilacak yeni kart yok -- pdks_cards zaten guncel.")
    sys.exit(0)

print(f"\n{len(new_uids)} kart pdks_cards tablosuna EKLENECEK:")
for uid in new_uids:
    print(f"  {uid}  ->  {found[uid]}")

added = 0
for uid in new_uids:
    p.upsert_card_db(uid, found[uid], employee_id=None, status="aktif")
    added += 1

print(f"\nOK: {added} kart pdks_cards tablosuna aktarildi (aktif, calisana henuz baglanmadi).")
print("Kart Yonetimi sayfasindan istersen her birine isim/calisan duzenlemesi yapabilirsin.")
