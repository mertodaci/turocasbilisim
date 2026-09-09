# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_grafik_etiket.py
# Recharts Bar'larinda name= eksik oldugu icin tooltip'te ham dataKey
# (count / c / total / value) gorunuyor. Turkce etiket ekler.

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

# 1) ExecutiveDashboard - aylik teklif grafigi
patch("src/pages/ExecutiveDashboard.jsx",
    '<Bar dataKey="c" fill="#6366f1" radius={[3,3,0,0]}/>',
    '<Bar dataKey="c" fill="#6366f1" radius={[3,3,0,0]} name="Teklif"/>',
    'radius={[3,3,0,0]} name="Teklif"',
    "ExecutiveDashboard teklif grafigi")

# 2) ExecutiveDashboard - 6 aylik harcama trendi
patch("src/pages/ExecutiveDashboard.jsx",
    '<Bar dataKey="total" fill="#f59e0b" radius={[3,3,0,0]}/>',
    '<Bar dataKey="total" fill="#f59e0b" radius={[3,3,0,0]} name="Harcama"/>',
    'name="Harcama"',
    "ExecutiveDashboard harcama trendi")

# 3) TQDashboardChart - bilet dagilimi
patch("src/components/taskqube/TQDashboardChart.jsx",
    '<Bar dataKey="count" radius={[4, 4, 0, 0]}>',
    '<Bar dataKey="count" radius={[4, 4, 0, 0]} name="Bilet">',
    'radius={[4, 4, 0, 0]} name="Bilet"',
    "TQDashboardChart bilet dagilimi")

# 4) ActivityTypeChart - aktivite suresi
patch("src/components/dashboard/ActivityTypeChart.jsx",
    '<Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20}>',
    '<Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20} name="S\u00fcre">',
    'maxBarSize={20} name="S\u00fcre"',
    "ActivityTypeChart aktivite suresi")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
