#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# pdks_cards tablosunu ekler: PDKS kartlarinin (uid, isim, calisan baglantisi,
# aktif/pasif durumu) Turocas'in kendi database.sqlite'inda KALICI olarak
# tutulmasini saglar. Simdiye kadar kartlar sadece ESP32'lerin kendi
# hafizasindan okunuyordu -- "pasif" diye bir durum konsepti yoktu (ya
# yetkiliydi ya hic yoktu). Bu tablo sayesinde bir karti pasif yapinca
# (ESP32'lerden silinir, kapi acmaz) kaydi ve ismi kaybolmuyor, istenirse
# tekrar aktif edilebiliyor.
#
# /home/rootori/turocas icinden:
#   python3 patch_pdks_cards_table.py
import io

dpath = "backend/src/db.js"
with io.open(dpath, "r", encoding="utf-8") as f:
    db = f.read()

if "CREATE TABLE IF NOT EXISTS pdks_cards" in db:
    print("ZATEN UYGULANMIS, atlaniyor.")
    raise SystemExit(0)

old = """      UNIQUE(direction, seq)     -- ayni yon+seq tekrar gelirse atla (mukerrer onleme)
    );
  `);"""
assert old in db and db.count(old) == 1, "ANCHOR (card_logs UNIQUE) BULUNAMADI"

new = """      UNIQUE(direction, seq)     -- ayni yon+seq tekrar gelirse atla (mukerrer onleme)
    );
    CREATE TABLE IF NOT EXISTS pdks_cards (
      uid TEXT PRIMARY KEY,        -- kart RFID UID (hex)
      name TEXT,                   -- karta atanan isim
      employee_id TEXT,            -- baglandiysa calisan id'si (employees.id)
      status TEXT DEFAULT 'aktif', -- aktif | pasif
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    );
  `);"""

db = db.replace(old, new)
with io.open(dpath, "w", encoding="utf-8") as f:
    f.write(db)

print("OK db.js: pdks_cards tablosu eklendi")
print("ONEMLI: bu degisiklik yalnizca backend YENIDEN BASLATILDIGINDA calisir (initDb ilk acilista tetiklenir).")
print("        pm2 restart turocas-backend calistirmayi unutmayin.")
