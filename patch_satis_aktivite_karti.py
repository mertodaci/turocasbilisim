# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_satis_aktivite_karti.py
# 1) backend/src/index.js: dashboard'a salesActivities blogu ekler
#    (sales_activities tablosu, teklif_sunumu HARIC, is_deleted filtreli)
# 2) src/pages/ExecutiveDashboard.jsx: Satis tabina "Satis Aktiviteleri" karti

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

# ---------- 1) Backend: sorgular ----------
patch("backend/src/index.js",
    '    // === SON TEKL\u0130FLER ===',
    '''    // === SATIS AKTIVITELERI (teklif haric) ===
    const NOT_OFFER = "activity_type != 'teklif_sunumu' AND (is_deleted=0 OR is_deleted IS NULL)";
    const salesActByType = db.prepare("SELECT activity_type as type, COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " GROUP BY activity_type ORDER BY c DESC").all();
    const salesActThisMonth = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " AND substr(date,1,7)=?").get(thisMonth).c;
    const salesActLastMonth = db.prepare("SELECT COUNT(*) as c FROM sales_activities WHERE " + NOT_OFFER + " AND substr(date,1,7)=?").get(lastMonth).c;
    const salesActRecent = db.prepare("SELECT id, customer_name, activity_type, date, contact_person, employee_name FROM sales_activities WHERE " + NOT_OFFER + " ORDER BY date DESC, created_date DESC LIMIT 5").all();

    // === SON TEKL\u0130FLER ===''',
    'SATIS AKTIVITELERI (teklif haric)',
    "backend salesActivities sorgulari")

# ---------- 2) Backend: response'a ekle ----------
patch("backend/src/index.js",
    '      recent: { activities: recentActivities, offers: recentOffers },',
    '      recent: { activities: recentActivities, offers: recentOffers },\n'
    '      salesActivities: { byType: salesActByType, thisMonth: salesActThisMonth, lastMonth: salesActLastMonth, recent: salesActRecent },',
    'salesActivities: { byType: salesActByType',
    "backend response blogu")

# ---------- 3) Frontend: kart ----------
patch("src/pages/ExecutiveDashboard.jsx",
    '''            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={trends.offers.map(d=>({name:monthLabel(d.month),c:d.c}))}>
                <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                <Bar dataKey="c" fill="#6366f1" radius={[3,3,0,0]} name="Teklif"/>
                <Tooltip/>
              </BarChart>
            </ResponsiveContainer>''',
    '''            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={trends.offers.map(d=>({name:monthLabel(d.month),c:d.c}))}>
                <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                <Bar dataKey="c" fill="#6366f1" radius={[3,3,0,0]} name="Teklif"/>
                <Tooltip/>
              </BarChart>
            </ResponsiveContainer>

            {/* satis-aktiviteleri-karti */}
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
            </div>''',
    'satis-aktiviteleri-karti',
    "ExecutiveDashboard kart")

# ---------- 4) Frontend: etiket haritasi ----------
patch("src/pages/ExecutiveDashboard.jsx",
    'export default function ExecutiveDashboard',
    '''const SALES_ACT_LABELS = {
  telefon_gorusmesi: "Telefon",
  musteri_toplantisi: "M\u00fc\u015fteri Toplant\u0131s\u0131",
  ofis_toplantisi: "Ofis Toplant\u0131s\u0131",
  saha_ziyareti: "Saha Ziyareti",
  email_yazisma: "E-posta",
  musteri_ziyareti: "M\u00fc\u015fteri Ziyareti",
  demo_sunum: "Demo / Sunum",
  satis_gorusmesi: "Sat\u0131\u015f G\u00f6r\u00fc\u015fmesi",
  sunum: "Sunum",
  egitim: "E\u011fitim",
  diger: "Di\u011fer",
};

export default function ExecutiveDashboard''',
    'const SALES_ACT_LABELS = {',
    "ExecutiveDashboard etiket haritasi")

# ---------- 5) Frontend: salesAct degiskeni ----------
patch("src/pages/ExecutiveDashboard.jsx",
    "  const { hr, sales, taskqube, activities, trends } = data;",
    "  const { hr, sales, taskqube, activities, trends } = data;\n"
    "  const salesAct = data.salesActivities || {};",
    "const salesAct = data.salesActivities",
    "ExecutiveDashboard salesAct degiskeni")

print("")
print("BITTI. Simdi: pm2 restart turocas-backend && npm run build && sudo systemctl restart nginx")
