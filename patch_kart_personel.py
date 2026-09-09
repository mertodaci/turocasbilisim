# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_kart_personel.py
# Yonetici Masasi > Satis > "Satis Aktiviteleri" kartindaki son aktivite
# satirlarina ziyareti yapan personelin adini ekler.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/pages/ExecutiveDashboard.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

ISARET = "{a.employee_name}"
if ISARET in s:
    print("ATLANDI (zaten var): personel adi")
else:
    ESKI = """                      <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{a.customer_name || "-"}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {SALES_ACT_LABELS[a.activity_type] || a.activity_type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{a.date || ""}</span>
                      </div>"""

    YENI = """                      <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">
                            <span className="font-medium">{a.customer_name || "-"}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {SALES_ACT_LABELS[a.activity_type] || a.activity_type}
                            </span>
                          </div>
                          {(a.employee_name || a.contact_person) && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {a.employee_name}
                              {a.employee_name && a.contact_person ? " \\u00b7 " : ""}
                              {a.contact_person}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{a.date || ""}</span>
                      </div>"""

    assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: son aktivite satiri"
    s = s.replace(ESKI, YENI)
    with open(P, "w", encoding="utf-8") as f:
        f.write(s)
    print("TAMAM: personel adi eklendi")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
