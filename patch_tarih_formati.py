# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_tarih_formati.py
# ISO tarihleri (2026-08-14) gg/aa/yyyy formatina cevirir:
#   1) Yonetici Masasi > IK karti > Bugun Izinli Personel (donus tarihi)
#   2) Yonetici Masasi > Satis Aktiviteleri karti (son aktivite tarihi)
#   3) Satis Aktivitesi ekrani > liste (satir tarihi)

import os

ROOT = os.path.dirname(os.path.abspath(__file__))

def patch(path, old, new, etiket):
    p = os.path.join(ROOT, path)
    with open(p, encoding="utf-8") as f:
        s = f.read()
    if new in s:
        print("ATLANDI (zaten var): " + etiket)
        return
    assert old in s and s.count(old) == 1, "ANCHOR BULUNAMADI/COKLU: " + etiket
    s = s.replace(old, new)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)
    print("TAMAM: " + etiket)

TR = '.split("-").reverse().join("/")'

# ---------- 1) IK karti: izinli personel donus tarihi ----------
patch("src/pages/ExecutiveDashboard.jsx",
    '{l.end_date ? `${l.end_date} d\u00f6n\u00fc\u015f` : ""}',
    '{l.end_date ? `${l.end_date' + TR + '} d\u00f6n\u00fc\u015f` : ""}',
    "IK karti donus tarihi")

# ---------- 2) Satis Aktiviteleri karti ----------
patch("src/pages/ExecutiveDashboard.jsx",
    '<span className="text-xs text-muted-foreground shrink-0">{a.date || ""}</span>',
    '<span className="text-xs text-muted-foreground shrink-0">{a.date ? a.date' + TR + ' : ""}</span>',
    "Satis Aktiviteleri karti tarihi")

# ---------- 3) Satis Aktivitesi liste ekrani ----------
patch("src/pages/AddSalesActivity.jsx",
    '<div className="text-xs font-semibold text-foreground">{a.date || ""}</div>',
    '<div className="text-xs font-semibold text-foreground">{a.date ? a.date' + TR + ' : ""}</div>',
    "Satis Aktivitesi liste tarihi")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
