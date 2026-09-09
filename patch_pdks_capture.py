#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# PDKS toplu kart okuma + aktif/pasif proxy route'lari.
# ONEMLI: SIRAYLA calistirin (her biri oncekini gerektirir):
#   1) patch_pdks_integration.py
#   2) patch_pdks_permissions.py
#   3) patch_pdks_cards_table.py  (+ pm2 restart turocas-backend)
#   4) patch_pdks_capture.py      (bu script)
#
# /home/rootori/turocas icinden:
#   python3 patch_pdks_capture.py
import io

ipath = "backend/src/index.js"
with io.open(ipath, "r", encoding="utf-8") as f:
    ib = f.read()

if "/api/pdks/capture/start" in ib:
    print("ZATEN UYGULANMIS, atlaniyor.")
    raise SystemExit(0)

assert "checkPermission(db, req.user?.role, 'card_logs'" in ib, "Once patch_pdks_permissions.py calistirilmali!"

old_anchor = """app.delete('/api/pdks/cards', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_delete')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('DELETE', '/api/cards', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});"""

assert old_anchor in ib and ib.count(old_anchor) == 1, "ANCHOR (delete /api/pdks/cards) BULUNAMADI"

new_block = old_anchor + """

app.post('/api/pdks/cards/deactivate', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_edit')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/cards/deactivate', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/cards/activate', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_edit')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/cards/activate', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/start', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/start', req.body);
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.get('/api/pdks/capture/status', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_view')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('GET', '/api/capture/status');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/stop', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/stop');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});

app.post('/api/pdks/capture/clear', authMiddleware, async (req, res) => {
  if (!checkPermission(db, req.user?.role, 'card_logs', 'can_add')) return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  try {
    const { status, data } = await pdksProxy('POST', '/api/capture/clear');
    res.status(status).json(data);
  } catch (err) {
    res.status(502).json({ error: "PDKS daemon'a ulasilamadi (calismiyor olabilir)" });
  }
});"""

ib = ib.replace(old_anchor, new_block)
with io.open(ipath, "w", encoding="utf-8") as f:
    f.write(ib)

print("OK index.js: /api/pdks/cards/activate|deactivate + /api/pdks/capture/start|status|stop|clear eklendi")
