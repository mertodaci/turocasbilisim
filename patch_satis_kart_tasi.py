# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_satis_kart_tasi.py
# Satis Aktiviteleri blogunu "Satis & Teklifler" kartinin icinden cikarip
# sag kolona, "Teklif Durum Dagilimi" kartinin altina BAGIMSIZ kart olarak koyar.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/pages/ExecutiveDashboard.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

# ---------- 1) Eski blogu kaldir ----------
ESKI = """            {/* satis-aktiviteleri-karti */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground">Sat\u0131\u015f Aktiviteleri</p>
                <span className="text-[10px] text-muted-foreground">
                  Bu ay {salesAct.thisMonth || 0} \u00b7 Ge\u00e7en ay {salesAct.lastMonth || 0}
                </span>
              </div>
              {(salesAct.byType || []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Aktivite verisi yok</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(salesAct.byType || []).map((t) => (
                      <span key={t.type} className="text-[10px] px-2 py-1 rounded-full bg-muted/60 text-foreground">
                        {SALES_ACT_LABELS[t.type] || t.type} <strong>{t.c}</strong>
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {(salesAct.recent || []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium truncate">{a.customer_name || "-"}</span>
                          <span className="text-muted-foreground ml-1.5">
                            {SALES_ACT_LABELS[a.activity_type] || a.activity_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{a.date || ""}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
"""

assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: eski satis aktivite blogu"
s = s.replace(ESKI, "")
print("TAMAM: eski blok kaldirildi")

# ---------- 2) Sag kolona bagimsiz kart ekle ----------
ANCHOR = """          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">S\u00f6zle\u015fmeler</h3>"""

YENI = """          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Sat\u0131\u015f Aktiviteleri</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Bu ay {salesAct.thisMonth || 0} \u00b7 Ge\u00e7en ay {salesAct.lastMonth || 0}
              </span>
            </div>
            {(salesAct.byType || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aktivite verisi yok</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(salesAct.byType || []).map((t) => (
                    <span key={t.type} className="text-xs px-2.5 py-1 rounded-full bg-muted/60 text-foreground">
                      {SALES_ACT_LABELS[t.type] || t.type} <strong className="ml-0.5">{t.c}</strong>
                    </span>
                  ))}
                </div>
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Son Aktiviteler</p>
                  <div className="space-y-2">
                    {(salesAct.recent || []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{a.customer_name || "-"}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {SALES_ACT_LABELS[a.activity_type] || a.activity_type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{a.date || ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">S\u00f6zle\u015fmeler</h3>"""

assert s.count(ANCHOR) == 1, "ANCHOR BULUNAMADI/COKLU: Sozlesmeler karti"
s = s.replace(ANCHOR, YENI)
print("TAMAM: yeni bagimsiz kart eklendi")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
