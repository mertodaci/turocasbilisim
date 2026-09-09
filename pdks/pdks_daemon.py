#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDKS (RFID Kapi Giris-Cikis) SENKRON DAEMONU
========================================================
ESP32 GIRIS/CIKIS cihazlarindan loglari periyodik ceker ve DOGRUDAN
Turocas'in kendi database.sqlite icindeki `card_logs` tablosuna yazar.
Boylece Turocas'teki "Personel Hareketleri" sayfasi PDKS verisini
otomatik, canli olarak gosterir -- ayri bir ekrana gerek kalmaz.

Kart tanimlama / silme / anlik durum icin localhost-only bir HTTP API
sunar (varsayilan 127.0.0.1:8091); bu API'ye Turocas'in Node backend'i
proxy yapar (bkz. patch_pdks_integration.py), boylece "Personel
Hareketleri" ekranindan kart eklenip silinebilir.

Turocas backend (Node/better-sqlite3) ile ayni SQLite dosyasina
ESZAMANLI erisir. Ikisi de WAL modunda ve kisa omurlu baglanti/islem
kullanir -- guvenlidir. Ancak: pdks-daemon calisirken elle
`node -e '...initDb()...'` gibi seyler CALISTIRMAYIN (WAL kilit
celismesi riski, projede daha once yasanmis).

Calistirma (PM2 ile, bkz. README.md):
    python3 pdks_daemon.py

Config: config.json (ayni klasorde)
"""

import json
import os
import sqlite3
import struct
import threading
import time
import uuid
from datetime import datetime

import requests
from flask import Flask, jsonify, Response, request

# ==================== YOL / SABIT ====================

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(HERE, "config.json")

HTTP_TIMEOUT = 3  # ESP32 istekleri icin saniye

DEFAULT_CONFIG = {
    "devices": [
        {"id": "GIRIS", "ip": "192.168.1.101", "name": "Giris Kapisi"},
        {"id": "CIKIS", "ip": "192.168.1.102", "name": "Cikis Kapisi"},
    ],
    "sync_interval": 5,
    "web_port": 8091,
    "web_host": "127.0.0.1",  # sadece sunucu icinden erisim (Node backend proxy'ler)
    "turocas_db_path": "/home/rootori/turocas/backend/database.sqlite",
}


def log(msg):
    print(f"[{datetime.now().isoformat(timespec='seconds')}] [PDKS] {msg}", flush=True)


def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            return {**DEFAULT_CONFIG, **cfg}
        except Exception as e:
            log(f"config.json okunamadi ({e}), varsayilan kullaniliyor")
    return DEFAULT_CONFIG.copy()


# ==================== VERITABANI (Turocas database.sqlite / card_logs) ====================

_db_lock = threading.Lock()
DB_FILE = None  # main() basinda config'ten set edilir


def get_conn():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def verify_db():
    """card_logs ve pdks_cards tablolarinin zaten var oldugunu dogrular.
    OLUSTURMAZ -- semayi Turocas'in kendi db.js'i yonetir (bkz.
    patch_pdks_cards_table.py), biz sadece satir okur/yazariz."""
    with _db_lock:
        conn = get_conn()
        try:
            conn.execute("SELECT id, direction, seq, card_uid FROM card_logs LIMIT 1")
        except sqlite3.OperationalError as e:
            conn.close()
            raise RuntimeError(
                f"card_logs tablosu bulunamadi ya da erisilemedi ({e}). "
                f"turocas_db_path dogru mu? ({DB_FILE})"
            )
        try:
            conn.execute("SELECT uid, name, employee_id, status FROM pdks_cards LIMIT 1")
        except sqlite3.OperationalError as e:
            conn.close()
            raise RuntimeError(
                f"pdks_cards tablosu bulunamadi ({e}). Once patch_pdks_cards_table.py "
                f"calistirip backend'i (turocas-backend) yeniden baslattiniz mi?"
            )
        conn.close()
    log(f"Turocas veritabani baglantisi dogrulandi: {DB_FILE}")


def ts_to_str(ts):
    if not ts:
        return "---"
    try:
        return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return "---"


def get_last_seq(direction):
    """Sadece bizim (source='pdks_live') daha once cektigimiz en yuksek seq.
    CSV import'tan gelen eski/farkli kaynakli seq degerlerini KASTEN yok sayar --
    yoksa CSV'deki tutarsiz seq'ler yuzunden cihazdan yeni kayitlar atlanabilir."""
    with _db_lock:
        conn = get_conn()
        row = conn.execute(
            "SELECT MAX(seq) FROM card_logs WHERE direction = ? AND source = 'pdks_live'",
            (direction,),
        ).fetchone()
        conn.close()
    return int(row[0]) if row and row[0] is not None else 0


def insert_logs(direction, entries, name_map):
    """entries: [{seq, timestamp, uid}, ...] -- card_logs'a INSERT OR IGNORE
    (direction, seq) UNIQUE constraint sayesinde mukerrer otomatik atlanir."""
    if not entries:
        return 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    added = 0
    with _db_lock:
        conn = get_conn()
        for e in entries:
            uid = e["uid"]
            ts = e.get("timestamp", 0) or int(time.time())
            row_id = uuid.uuid4().hex
            cur = conn.execute(
                """INSERT OR IGNORE INTO card_logs
                   (id, direction, seq, card_uid, person_name, ts, event_time, synced_at, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pdks_live')""",
                (
                    row_id,
                    direction,
                    e["seq"],
                    uid,
                    name_map.get(uid, "Bilinmiyor"),
                    ts,
                    ts_to_str(ts),
                    now,
                ),
            )
            if cur.rowcount:
                added += 1
        conn.commit()
        conn.close()
    return added


def recent_logs(limit=200):
    with _db_lock:
        conn = get_conn()
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, direction, seq, card_uid, person_name, employee_name, ts, event_time, source "
            "FROM card_logs ORDER BY ts DESC, rowid DESC LIMIT ?",
            (limit,),
        ).fetchall()
        conn.close()
    return [dict(r) for r in rows]


def log_count():
    with _db_lock:
        conn = get_conn()
        n = conn.execute("SELECT COUNT(*) FROM card_logs WHERE source='pdks_live'").fetchone()[0]
        conn.close()
    return n


# ==================== KART KAYITLARI (Turocas database.sqlite / pdks_cards) ====================
# Kartlar artik ESP32'lerin kendi bellegi degil, bu tablo "gercek kaynak" (source
# of truth). ESP32'lere sadece AKTIF kartlar yazilir (fiziksel kapi erisimi icin);
# pasif yapilan bir kart ESP32'lerden silinir ama burada (ismi/gecmisiyle) durmaya
# devam eder, istenirse tekrar aktif edilebilir.

def list_cards_db():
    with _db_lock:
        conn = get_conn()
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT uid, name, employee_id, status, updated_date FROM pdks_cards ORDER BY name"
        ).fetchall()
        conn.close()
    return [dict(r) for r in rows]


def card_name_map_db():
    """Tum kartlarin (aktif + pasif) uid->isim eslemesi -- gecmis loglarda
    isim gostermeye devam edebilmek icin pasif kartlar da dahil edilir."""
    with _db_lock:
        conn = get_conn()
        rows = conn.execute("SELECT uid, name FROM pdks_cards").fetchall()
        conn.close()
    return {uid: name for uid, name in rows}


def get_card_db(uid):
    with _db_lock:
        conn = get_conn()
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT uid, name, employee_id, status FROM pdks_cards WHERE uid = ?", (uid,)
        ).fetchone()
        conn.close()
    return dict(row) if row else None


def upsert_card_db(uid, name, employee_id=None, status="aktif"):
    with _db_lock:
        conn = get_conn()
        conn.execute(
            """INSERT INTO pdks_cards (uid, name, employee_id, status, updated_date)
               VALUES (?, ?, ?, ?, datetime('now'))
               ON CONFLICT(uid) DO UPDATE SET
                 name=excluded.name,
                 employee_id=excluded.employee_id,
                 status=excluded.status,
                 updated_date=datetime('now')""",
            (uid, name, employee_id, status),
        )
        conn.commit()
        conn.close()


def set_card_status_db(uid, status):
    with _db_lock:
        conn = get_conn()
        conn.execute(
            "UPDATE pdks_cards SET status = ?, updated_date = datetime('now') WHERE uid = ?",
            (status, uid),
        )
        conn.commit()
        conn.close()


def delete_card_db(uid):
    with _db_lock:
        conn = get_conn()
        conn.execute("DELETE FROM pdks_cards WHERE uid = ?", (uid,))
        conn.commit()
        conn.close()


# ==================== ESP32 ISTEMCI ====================

def _url(ip, path):
    return f"http://{ip}{path}"


def esp_get_status(ip):
    try:
        r = requests.get(_url(ip, "/status"), timeout=HTTP_TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def esp_sync_time(ip):
    try:
        t = int(time.time())
        requests.post(
            _url(ip, "/time"),
            data=json.dumps({"t": t}, separators=(",", ":")),
            headers={"Content-Type": "text/plain"},
            timeout=HTTP_TIMEOUT,
        )
    except Exception:
        pass


def esp_get_cards(ip):
    try:
        r = requests.get(_url(ip, "/cards"), timeout=HTTP_TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def esp_get_last_uid(ip):
    """Cihazda son 30sn icinde okutulan (yetkisi olsun olmasin) karti getir."""
    try:
        r = requests.get(_url(ip, "/last_uid"), timeout=HTTP_TIMEOUT)
        if r.status_code == 200:
            d = r.json()
            uid = d.get("uid", "")
            if uid and d.get("ms_ago", 99999) < 30000:
                return uid
    except Exception:
        pass
    return ""


# ==================== TOPLU KART OKUMA (CAPTURE SESSION) ====================
# Kullanim: art arda cok sayida yeni kart okutulacaksa, her birinde tek tek
# "Kartı Oku" butonuna basmak yerine bir "oturum" baslatilir; oturum acikken
# okutulan HER FARKLI kart otomatik, okutulma sirasiyla bir kuyruga eklenir.
# Kullanici sonra (ya da ayni anda) her satira isim atayip kaydedebilir.

capture_session = {"active": False, "device": None, "items": []}  # items: [{uid, captured_at}]
_capture_lock = threading.Lock()
_capture_stop_flag = threading.Event()
_capture_thread = None


def _capture_loop(ip, poll_interval=1.0):
    while not _capture_stop_flag.is_set():
        uid = esp_get_last_uid(ip)
        if uid:
            with _capture_lock:
                existing = {it["uid"] for it in capture_session["items"]}
                if uid not in existing:
                    capture_session["items"].append({
                        "uid": uid,
                        "captured_at": datetime.now().strftime("%H:%M:%S"),
                    })
                    log(f"[TOPLU OKUMA] Yeni kart yakalandi: {uid} (toplam: {len(capture_session['items'])})")
        _capture_stop_flag.wait(poll_interval)


def capture_start(device_id):
    global _capture_thread
    dev = next((d for d in DEVICES if d["id"] == device_id), None)
    if not dev:
        return False, "bilinmeyen cihaz"
    with _capture_lock:
        if capture_session["active"]:
            return False, "zaten aktif bir toplu okuma oturumu var"
        capture_session["active"] = True
        capture_session["device"] = device_id
        capture_session["items"] = []
    _capture_stop_flag.clear()
    _capture_thread = threading.Thread(target=_capture_loop, args=(dev["ip"],), daemon=True)
    _capture_thread.start()
    log(f"[TOPLU OKUMA] Oturum baslatildi: {device_id}")
    return True, None


def capture_stop():
    _capture_stop_flag.set()
    with _capture_lock:
        capture_session["active"] = False
    log(f"[TOPLU OKUMA] Oturum durduruldu ({len(capture_session['items'])} kart yakalanmisti)")


def capture_clear():
    with _capture_lock:
        capture_session["items"] = []


def esp_add_card(ip, uid_hex, name):
    try:
        r = requests.post(
            _url(ip, "/cards"),
            data=json.dumps({"uid": uid_hex, "name": name}, separators=(",", ":")),
            headers={"Content-Type": "text/plain"},
            timeout=HTTP_TIMEOUT,
        )
        return r.status_code == 200
    except Exception:
        return False


def esp_delete_card(ip, uid_hex):
    try:
        r = requests.delete(
            _url(ip, "/cards"),
            data=json.dumps({"uid": uid_hex}, separators=(",", ":")),
            headers={"Content-Type": "text/plain"},
            timeout=HTTP_TIMEOUT,
        )
        return r.status_code == 200
    except Exception:
        return False


def esp_get_logs(ip, after_seq=0):
    try:
        r = requests.get(_url(ip, f"/logs?after={after_seq}"), timeout=HTTP_TIMEOUT + 5)
        if r.status_code != 200:
            return []
        data = r.content
        if len(data) < 2:
            return []
        count = struct.unpack_from("<H", data, 0)[0]
        entries = []
        for i in range(count):
            off = 2 + i * 16
            if off + 16 > len(data):
                break
            seq, ts, uid_len = struct.unpack_from("<IIB", data, off)
            uid_bytes = data[off + 9: off + 9 + uid_len]
            entries.append({"seq": seq, "timestamp": ts, "uid": uid_bytes.hex().upper()})
        return entries
    except Exception:
        return []


# ==================== SENKRON DONGUSU ====================

device_status = {}   # device_id -> dict (bellek ici, sadece izleme icin)
_status_lock = threading.Lock()
DEVICES = DEFAULT_CONFIG["devices"]  # main() basinda gercek config ile degistirilir


def sync_all(devices):
    total_new = 0
    for dev in devices:
        did = dev["id"]
        ip = dev["ip"]
        name = dev.get("name", did)

        status = esp_get_status(ip)
        if status is None:
            with _status_lock:
                device_status[did] = {"online": False, "ip": ip, "name": name}
            continue

        with _status_lock:
            device_status[did] = {
                "online": True,
                "ip": ip,
                "name": name,
                "log_count_device": status.get("log_count", 0),
                "uptime": status.get("uptime", 0),
                "checked_at": datetime.now().strftime("%H:%M:%S"),
            }

        esp_sync_time(ip)

        names = card_name_map_db()

        last_seq = get_last_seq(did)
        entries = esp_get_logs(ip, after_seq=last_seq)
        if entries:
            added = insert_logs(did, entries, names)
            total_new += added

    if total_new:
        log(f"{total_new} yeni kayit eklendi (card_logs, source=pdks_live, toplam pdks kaynakli: {log_count()})")


def sync_loop(cfg):
    devices = cfg["devices"]
    interval = cfg.get("sync_interval", 5)
    log(f"Senkron dongusu basladi. Cihazlar: {[d['id'] for d in devices]}, interval={interval}s")
    while True:
        try:
            sync_all(devices)
        except Exception as e:
            log(f"HATA (sync_all): {e}")
        time.sleep(interval)


# ==================== WEB (localhost-only API; Node backend proxy'ler) ====================

app = Flask(__name__)


@app.get("/api/status")
def api_status():
    with _status_lock:
        return jsonify(device_status)


@app.get("/api/logs")
def api_logs():
    return jsonify(recent_logs(200))


@app.get("/api/cards")
def api_list_cards():
    return jsonify(list_cards_db())


@app.get("/api/last_uid")
def api_last_uid():
    device_id = request.args.get("device", "")
    dev = next((d for d in DEVICES if d["id"] == device_id), None)
    if not dev:
        return jsonify({"error": "bilinmeyen cihaz"}), 400
    uid = esp_get_last_uid(dev["ip"])
    return jsonify({"uid": uid})


@app.post("/api/cards")
def api_add_card():
    """Body: {"uid": "AABBCC", "name": "Ali Veli", "employee_id": "..."} -- TUM cihazlara ekler + aktif olarak kaydeder."""
    body = request.get_json(silent=True) or {}
    uid = (body.get("uid") or "").strip().upper()
    name = (body.get("name") or "").strip()
    employee_id = (body.get("employee_id") or "").strip() or None
    if not uid or not name:
        return jsonify({"ok": False, "error": "uid ve name zorunlu"}), 400
    if len(uid) % 2 != 0:
        return jsonify({"ok": False, "error": "uid cift sayida hex karakter olmali"}), 400

    results = {}
    for dev in DEVICES:
        results[dev["id"]] = esp_add_card(dev["ip"], uid, name)

    if any(results.values()):
        upsert_card_db(uid, name, employee_id, status="aktif")
        return jsonify({"ok": True, "devices": results})
    return jsonify({"ok": False, "error": "hicbir cihaza eklenemedi (cevrimdisi olabilirler)", "devices": results}), 502


@app.post("/api/cards/deactivate")
def api_deactivate_card():
    """Body: {"uid": "AABBCC"} -- ESP32'lerden siler (kapi acmaz), kaydi 'pasif' olarak tutar."""
    body = request.get_json(silent=True) or {}
    uid = (body.get("uid") or "").strip().upper()
    if not uid:
        return jsonify({"ok": False, "error": "uid zorunlu"}), 400
    if not get_card_db(uid):
        return jsonify({"ok": False, "error": "kart kayitli degil"}), 404

    results = {}
    for dev in DEVICES:
        results[dev["id"]] = esp_delete_card(dev["ip"], uid)

    set_card_status_db(uid, "pasif")
    return jsonify({"ok": True, "devices": results})


@app.post("/api/cards/activate")
def api_activate_card():
    """Body: {"uid": "AABBCC"} -- pasif kaydi tekrar ESP32'lere ekler, 'aktif' yapar."""
    body = request.get_json(silent=True) or {}
    uid = (body.get("uid") or "").strip().upper()
    if not uid:
        return jsonify({"ok": False, "error": "uid zorunlu"}), 400
    card = get_card_db(uid)
    if not card:
        return jsonify({"ok": False, "error": "kart kayitli degil"}), 404

    results = {}
    for dev in DEVICES:
        results[dev["id"]] = esp_add_card(dev["ip"], uid, card["name"])

    if any(results.values()):
        set_card_status_db(uid, "aktif")
        return jsonify({"ok": True, "devices": results})
    return jsonify({"ok": False, "error": "hicbir cihaza eklenemedi (cevrimdisi olabilirler)", "devices": results}), 502


@app.delete("/api/cards")
def api_delete_card():
    """Body: {"uid": "AABBCC"} -- TUM cihazlardan ve kayittan KALICI olarak siler."""
    body = request.get_json(silent=True) or {}
    uid = (body.get("uid") or "").strip().upper()
    if not uid:
        return jsonify({"ok": False, "error": "uid zorunlu"}), 400

    results = {}
    for dev in DEVICES:
        results[dev["id"]] = esp_delete_card(dev["ip"], uid)

    delete_card_db(uid)
    return jsonify({"ok": True, "devices": results})


@app.post("/api/capture/start")
def api_capture_start():
    body = request.get_json(silent=True) or {}
    device_id = (body.get("device") or "").strip().upper()
    ok, err = capture_start(device_id)
    if not ok:
        return jsonify({"ok": False, "error": err}), 400
    return jsonify({"ok": True})


@app.get("/api/capture/status")
def api_capture_status():
    with _capture_lock:
        return jsonify({
            "active": capture_session["active"],
            "device": capture_session["device"],
            "items": list(capture_session["items"]),
        })


@app.post("/api/capture/stop")
def api_capture_stop():
    capture_stop()
    with _capture_lock:
        return jsonify({"ok": True, "items": list(capture_session["items"])})


@app.post("/api/capture/clear")
def api_capture_clear():
    capture_clear()
    return jsonify({"ok": True})


@app.get("/")
def index():
    return Response(
        "<h3>PDKS daemon calisiyor.</h3>"
        "<p>Kart tanimlama ve gecis kayitlari artik Turocas &rarr; "
        "<b>Personel Hareketleri</b> sayfasindan yonetiliyor.</p>"
        "<p>Bu adres (127.0.0.1:8091) sadece Turocas backend'inin dahili "
        "kullanimi icindir.</p>"
        "<p>Debug: <a href='/api/status'>/api/status</a> &middot; "
        "<a href='/api/logs'>/api/logs</a> &middot; "
        "<a href='/api/cards'>/api/cards</a></p>",
        mimetype="text/html",
    )


# ==================== MAIN ====================

if __name__ == "__main__":
    cfg = load_config()
    DEVICES = cfg["devices"]
    DB_FILE = cfg["turocas_db_path"]

    verify_db()

    t = threading.Thread(target=sync_loop, args=(cfg,), daemon=True)
    t.start()

    port = cfg.get("web_port", 8091)
    host = cfg.get("web_host", "127.0.0.1")
    log(f"Dahili API: http://{host}:{port} (sadece Turocas backend'i icin)")
    app.run(host=host, port=port, debug=False, use_reloader=False)
