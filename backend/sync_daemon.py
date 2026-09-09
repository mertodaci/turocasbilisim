#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GECICI ANLIK SYNC DAEMON (gecis donemi koprusu)
Eski TaskQube (PostgreSQL) -> FlowMetrics (SQLite) her N saniyede bir senkron.
Eski TaskQube kalkinca bu servis durdurulup silinecek:
    pm2 stop flowmetric-sync && pm2 delete flowmetric-sync

sync_taskpad.py'yi degistirMEDEN sarmalar; backend ACIK kalir (WAL, restart yok).
"""
import subprocess
import time
import sys
import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SYNC_SCRIPT = os.path.join(SCRIPT_DIR, "sync_taskpad.py")
INTERVAL = 10  # saniye - her bu kadar surede bir sync

def log(msg):
    print(f"[{datetime.now().isoformat()}] [DAEMON] {msg}", flush=True)

def is_mesai():
    now = datetime.now()
    return now.weekday() < 5 and 9 <= now.hour < 18

log(f"Anlik sync daemon basladi (her {INTERVAL}s). Script: {SYNC_SCRIPT}")

while True:
    start = time.time()
    if not is_mesai():
        time.sleep(INTERVAL)
        continue
    try:
        result = subprocess.run(
            ["/usr/bin/python3", SYNC_SCRIPT, "--light"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            log(f"SYNC HATA (exit={result.returncode}): {result.stderr[-300:]}")
    except subprocess.TimeoutExpired:
        log("SYNC TIMEOUT (120s asildi, atlandi)")
    except Exception as e:
        log(f"DAEMON HATA: {e}")

    elapsed = time.time() - start
    sleep_for = max(1, INTERVAL - elapsed)
    time.sleep(sleep_for)
