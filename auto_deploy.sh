#!/bin/bash
# FlowMetric otomatik deploy scripti.
# GitHub'daki main branch'te yeni commit varsa: ceker, degisen dosyalara
# gore npm install / npm run build / pm2 restart yapar. Cron ile
# birkac dakikada bir calistirilir (bkz. README/kurulum notlari).
set -e
cd /home/rootori/flowmetric
LOG=/home/rootori/flowmetric/deploy.log

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Yeni commit bulundu: $LOCAL -> $REMOTE" >> "$LOG"
CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE")
echo "Degisen dosyalar:" >> "$LOG"
echo "$CHANGED" >> "$LOG"

git pull origin main >> "$LOG" 2>&1

if echo "$CHANGED" | grep -qE '^(package\.json|package-lock\.json)$'; then
  echo "-> npm install (kok)" >> "$LOG"
  npm install >> "$LOG" 2>&1
fi

if echo "$CHANGED" | grep -qE '^backend/(package\.json|package-lock\.json)$'; then
  echo "-> npm install (backend)" >> "$LOG"
  (cd backend && npm install) >> "$LOG" 2>&1
fi

if echo "$CHANGED" | grep -qE '^(src/|eslint\.config\.js)'; then
  echo "-> npm run lint" >> "$LOG"
  # Lint bilgi amacli -- basarisiz olsa (or. eslint calistirilamiyor) bile
  # deploy'u durdurmaz. set -e ile bu adimin script'i kesmemesi icin || true.
  npm run lint >> "$LOG" 2>&1 || echo "   (lint atlandi/hatali -- deploy devam ediyor)" >> "$LOG"
fi

if echo "$CHANGED" | grep -qE '^(src/|index\.html|vite\.config\.js|package\.json|components\.json|tailwind\.config\.js)'; then
  echo "-> npm run build" >> "$LOG"
  npm run build >> "$LOG" 2>&1
fi

if echo "$CHANGED" | grep -qE '^backend/'; then
  echo "-> pm2 restart flowmetric-backend" >> "$LOG"
  pm2 restart flowmetric-backend >> "$LOG" 2>&1
fi

if echo "$CHANGED" | grep -qE '^pdks/'; then
  echo "-> pm2 restart pdks-daemon" >> "$LOG"
  pm2 restart pdks-daemon >> "$LOG" 2>&1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Guncelleme tamamlandi." >> "$LOG"
echo "----------------------------------------" >> "$LOG"
