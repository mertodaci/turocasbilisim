# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_kart_kutular.py
# Satis Aktiviteleri kartindaki tip rozetlerini, Sozlesmeler kartindaki gibi
# renkli kutulara cevirir.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/pages/ExecutiveDashboard.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

# ---------- 1) Renk haritasi ----------
ISARET_RENK = "const SALES_ACT_COLORS = {"
if ISARET_RENK in s:
    print("ATLANDI (zaten var): renk haritasi")
else:
    ANCHOR = "const SALES_ACT_LABELS = {"
    assert s.count(ANCHOR) == 1, "ANCHOR BULUNAMADI/COKLU: SALES_ACT_LABELS"
    RENK = """const SALES_ACT_COLORS = {
  musteri_ziyareti: { box: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900", num: "text-blue-600", lbl: "text-blue-500" },
  saha_ziyareti:    { box: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900", num: "text-amber-600", lbl: "text-amber-500" },
  demo_sunum:       { box: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900", num: "text-purple-600", lbl: "text-purple-500" },
  email_yazisma:    { box: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800", num: "text-slate-600", lbl: "text-slate-500" },
  telefon_gorusmesi:{ box: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900", num: "text-teal-600", lbl: "text-teal-500" },
  musteri_toplantisi:{ box: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900", num: "text-indigo-600", lbl: "text-indigo-500" },
  ofis_toplantisi:  { box: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900", num: "text-cyan-600", lbl: "text-cyan-500" },
  satis_gorusmesi:  { box: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900", num: "text-emerald-600", lbl: "text-emerald-500" },
};
const SALES_ACT_FALLBACK = { box: "bg-muted/30 border-border", num: "text-foreground", lbl: "text-muted-foreground" };

"""
    s = s.replace(ANCHOR, RENK + ANCHOR)
    print("TAMAM: renk haritasi eklendi")

# ---------- 2) Rozetleri kutulara cevir ----------
ISARET_KUTU = "SALES_ACT_FALLBACK;"
if ISARET_KUTU in s:
    print("ATLANDI (zaten var): kutu gorunumu")
else:
    ESKI = """                <div className="flex flex-wrap gap-2 mb-4">
                  {(salesAct.byType || []).map((t) => (
                    <span key={t.type} className="text-xs px-2.5 py-1 rounded-full bg-muted/60 text-foreground">
                      {SALES_ACT_LABELS[t.type] || t.type} <strong className="ml-0.5">{t.c}</strong>
                    </span>
                  ))}
                </div>"""

    YENI = """                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(salesAct.byType || []).map((t) => {
                    const c = SALES_ACT_COLORS[t.type] || SALES_ACT_FALLBACK;
                    return (
                      <div key={t.type} className={`border rounded-xl p-4 text-center ${c.box}`}>
                        <div className={`text-3xl font-black ${c.num}`}>{t.c}</div>
                        <div className={`text-xs mt-1 ${c.lbl}`}>
                          {SALES_ACT_LABELS[t.type] || t.type}
                        </div>
                      </div>
                    );
                  })}
                </div>"""

    assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: rozet blogu"
    s = s.replace(ESKI, YENI)
    print("TAMAM: kutu gorunumu")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
