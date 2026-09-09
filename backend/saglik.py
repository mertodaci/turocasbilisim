#!/usr/bin/env python3
# Turocas saglik kontrolu - saatte bir cron ile calisir.
# PM2 + API dususse otomatik restart eder; sync/disk/DB icin uyari loglar.
# Tum ciktilar zaman damgali saglik.log'a yazilir. UYARI/DUZELTILDI etiketli satirlar aranabilir.

import subprocess, json, os, sys, sqlite3, urllib.request, shutil
from datetime import datetime, timedelta

BASE = "/home/rootori/turocas"
DB = BASE + "/backend/database.sqlite"
LOG = BASE + "/backend/saglik.log"
HEALTH_URL = "http://localhost:3001/api/health"
PM2_PROCS = ["turocas-backend"]

def log(level, msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def run(cmd):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def pm2_status():
    code, out, _ = run("pm2 jlist")
    if code != 0 or not out:
        return {}
    try:
        procs = json.loads(out)
        return {p["name"]: p.get("pm2_env", {}).get("status", "unknown") for p in procs}
    except Exception:
        return {}

# 1) PM2 surecleri
statuses = pm2_status()
for name in PM2_PROCS:
    st = statuses.get(name)
    if st == "online":
        log("OK", f"PM2 {name} online")
    else:
        log("UYARI", f"PM2 {name} durumu: {st} - restart deneniyor")
        code, _, err = run(f"pm2 restart {name}")
        if code == 0:
            log("DUZELTILDI", f"PM2 {name} yeniden baslatildi")
        else:
            log("UYARI", f"PM2 {name} restart BASARISIZ: {err}")

# 2) API health
try:
    with urllib.request.urlopen(HEALTH_URL, timeout=10) as resp:
        if resp.status == 200:
            log("OK", "API health 200")
        else:
            raise Exception(f"status {resp.status}")
except Exception as e:
    log("UYARI", f"API health BASARISIZ ({e}) - backend restart deneniyor")
    code, _, err = run("pm2 restart turocas-backend")
    if code == 0:
        log("DUZELTILDI", "backend API icin yeniden baslatildi")
    else:
        log("UYARI", f"backend restart BASARISIZ: {err}")

# 3) Sync sagligi - DB'deki en yeni updated_date 26 saatten eskiyse uyar
try:
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.execute("SELECT MAX(updated_date) FROM tq_tickets")
    last = cur.fetchone()[0]
    con.close()
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "").split(".")[0].replace("T", " ").strip())
        except Exception:
            last_dt = None
        if last_dt and (datetime.now() - last_dt) > timedelta(hours=26):
            log("UYARI", f"Sync gecikmis olabilir - en yeni bilet guncelleme: {last}")
        else:
            log("OK", f"Sync guncel - en yeni bilet guncelleme: {last}")
    else:
        log("UYARI", "tq_tickets bos veya updated_date yok")
except Exception as e:
    log("UYARI", f"Sync/DB kontrolu BASARISIZ: {e}")

# 4) Disk durumu - %90+ dolu ise uyar
try:
    total, used, free = shutil.disk_usage("/home")
    pct = used * 100 // total
    if pct >= 90:
        log("UYARI", f"Disk doluluk %{pct} (kritik)")
    else:
        log("OK", f"Disk doluluk %{pct}")
except Exception as e:
    log("UYARI", f"Disk kontrolu BASARISIZ: {e}")

# 5) DB + WAL boyutu
try:
    db_mb = os.path.getsize(DB) / (1024*1024)
    wal_path = DB + "-wal"
    wal_mb = os.path.getsize(wal_path) / (1024*1024) if os.path.exists(wal_path) else 0
    if wal_mb > 100:
        log("UYARI", f"WAL dosyasi buyumus: {wal_mb:.1f} MB (checkpoint gerekebilir)")
    else:
        log("OK", f"DB {db_mb:.1f} MB, WAL {wal_mb:.1f} MB")
except Exception as e:
    log("UYARI", f"DB boyut kontrolu BASARISIZ: {e}")

log("OK", "Saglik kontrolu tamamlandi")
