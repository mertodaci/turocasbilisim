#!/bin/bash
# FlowMetrics gunluk sync wrapper (cron tarafindan 04:00'te calistirilir)
# Eski uygulama (PostgreSQL) -> FlowMetrics (SQLite) tam senkron

export HOME=/home/rootori
export PATH=/usr/local/bin:/usr/bin:/bin

cd /home/rootori/flowmetric/backend || exit 1

echo "===== $(date '+%Y-%m-%d %H:%M:%S') CRON SYNC BASLADI ====="

# WAL dance: backend durdur -> sync -> baslat
/usr/local/bin/pm2 stop flowmetric-backend
/usr/bin/python3 /home/rootori/flowmetric/backend/sync_taskpad.py
SYNC_EXIT=$?
/usr/local/bin/pm2 start flowmetric-backend

if [ $SYNC_EXIT -eq 0 ]; then
    echo "===== $(date '+%Y-%m-%d %H:%M:%S') CRON SYNC TAMAMLANDI (basarili) ====="
else
    echo "===== $(date '+%Y-%m-%d %H:%M:%S') CRON SYNC HATA (exit=$SYNC_EXIT) - backend yine de baslatildi ====="
fi
