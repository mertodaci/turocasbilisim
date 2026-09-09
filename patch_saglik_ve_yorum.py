# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_saglik_ve_yorum.py
# 1) saglik.py: silinmis turocas-sync surecini kontrol listesinden cikar
#    (saatte 2 sahte UYARI uretiyordu)
# 2) WorkTaskCard.jsx + WorkTaskDetailDialog.jsx: task_comments tablosunda
#    sender_id/sender_name YOK -> author_id/author_name olmali.
#    Bu yuzden durum degisikligi yorumu SQLITE_ERROR ile kaydedilmiyordu.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def patch(path, old, new, isaret, etiket):
    p = os.path.join(ROOT, path)
    with open(p, encoding="utf-8") as f:
        s = f.read()
    if isaret in s:
        print("ATLANDI (zaten var): " + etiket)
        return
    assert old in s and s.count(old) == 1, "ANCHOR BULUNAMADI/COKLU: " + etiket
    s = s.replace(old, new)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)
    print("TAMAM: " + etiket)

# ---------- 1) saglik.py ----------
patch("backend/saglik.py",
    'PM2_PROCS = ["turocas-backend", "turocas-sync"]',
    'PM2_PROCS = ["turocas-backend"]',
    'PM2_PROCS = ["turocas-backend"]',
    "saglik.py PM2_PROCS (sync cikarildi)")

# ---------- 2) WorkTaskCard.jsx: yorum yazma ----------
patch("src/components/work-tasks/WorkTaskCard.jsx",
    "        sender_id: user.id,\n        sender_name: user.full_name || user.email,",
    "        author_id: user.id,\n        author_name: user.full_name || user.email,\n        author_email: user.email,",
    "author_id: user.id,",
    "WorkTaskCard yorum alanlari")

# ---------- 3) WorkTaskDetailDialog.jsx: isMe kontrolu ----------
patch("src/components/work-tasks/WorkTaskDetailDialog.jsx",
    "                const isMe = comment.sender_id === user.id;",
    "                const isMe = comment.author_id === user.id;",
    "comment.author_id === user.id",
    "WorkTaskDetailDialog isMe kontrolu")

# ---------- 4) WorkTaskDetailDialog.jsx: bas harf ----------
patch("src/components/work-tasks/WorkTaskDetailDialog.jsx",
    '{comment.sender_name?.charAt(0)?.toUpperCase() || "?"}',
    '{(comment.author_name || comment.sender_name)?.charAt(0)?.toUpperCase() || "?"}',
    "(comment.author_name || comment.sender_name)",
    "WorkTaskDetailDialog bas harf")

print("")
print("NOT: WorkTaskDetailDialog icinde baska sender_name kullanimi varsa asagidaki")
print("     komutla kontrol et: grep -n sender_ src/components/work-tasks/*.jsx")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
