# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_harcama_iki_grafik.py
#
# "Harcama Dagilimi" karti (pasta + tek trend) yerine yan yana iki aylik
# trend grafigi:
#   - Onaylanan (yesil)      : status='onaylandi'
#   - Onay Bekleyen (amber)  : yonetici_onayi_bekliyor + ik_onayi_bekliyor
# Reddedilen ve iptal edilenler hicbirine girmez.

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

# ---------- 1) Backend: iki ayri trend sorgusu ----------
patch("backend/src/index.js",
    """      WHERE er.created_date >= date('now','-6 months') AND er.status = 'onaylandi'
      GROUP BY month ORDER BY month
    `).all();""",
    """      WHERE er.created_date >= date('now','-6 months') AND er.status = 'onaylandi'
      GROUP BY month ORDER BY month
    `).all();
    const expenseTrendPending = db.prepare(`
      SELECT substr(er.created_date,1,7) as month,
        COALESCE(SUM(ei.accommodation + ei.transport + ei.fuel + ei.meal + ei.other),0) as total
      FROM expense_reports er
      LEFT JOIN expense_items ei ON ei.report_id = er.id
      WHERE er.created_date >= date('now','-6 months')
        AND er.status IN ('yonetici_onayi_bekliyor','ik_onayi_bekliyor')
      GROUP BY month ORDER BY month
    `).all();""",
    "expenseTrendPending",
    "backend bekleyen trend sorgusu")

# ---------- 2) Backend: response ----------
patch("backend/src/index.js",
    "      trends: { expenses: expenseTrend, activities: activityTrend, offers: offerTrend, expenseByCategory },",
    "      trends: { expenses: expenseTrend, expensesPending: expenseTrendPending, activities: activityTrend, offers: offerTrend, expenseByCategory },",
    "expensesPending: expenseTrendPending",
    "backend response")

# ---------- 3) Frontend: kart icerigi ----------
ESKI = """            <h3 className="font-semibold text-foreground mb-4">Harcama Da\u011f\u0131l\u0131m\u0131</h3>
            {trends?.expenseByCategory ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Konaklama", value: trends.expenseByCategory.accommodation || 0 },
                      { name: "Ula\u015f\u0131m", value: trends.expenseByCategory.transport || 0 },
                      { name: "Yak\u0131t", value: trends.expenseByCategory.fuel || 0 },
                      { name: "Yemek", value: trends.expenseByCategory.meal || 0 },
                      { name: "Di\u011fer", value: trends.expenseByCategory.other || 0 },
                    ].filter(d => d.value > 0)}
                    dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                  >
                    {["#6366f1","#10b981","#f59e0b","#ef4444","#94a3b8"].map((c,i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${fmtMoney(v)} \u20ba`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Harcama verisi yok</p>
            )}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Son 6 Ay Harcama Trendi (TL)</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={(trends.expenses||[]).map(d=>({name:monthLabel(d.month),total:d.total}))}>
                  <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v)=>fmtMoney(v)+" TL"}/>
                  <Bar dataKey="total" fill="#f59e0b" radius={[3,3,0,0]} name="Harcama"/>
                </BarChart>
              </ResponsiveContainer>
            </div>"""

YENI = """            <h3 className="font-semibold text-foreground mb-4">Ayl\u0131k Harcama (Son 6 Ay)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { baslik: "Onaylanan", veri: trends.expenses, renk: "#10b981", etiket: "text-emerald-600" },
                { baslik: "Onay Bekleyen", veri: trends.expensesPending, renk: "#f59e0b", etiket: "text-amber-600" },
              ].map((g) => {
                const data = (g.veri || []).map(d => ({ name: monthLabel(d.month), total: d.total }));
                const toplam = data.reduce((s, d) => s + (d.total || 0), 0);
                return (
                  <div key={g.baslik}>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground">{g.baslik}</p>
                      <p className={`text-sm font-bold ${g.etiket}`}>{fmtMoney(toplam)} \u20ba</p>
                    </div>
                    {data.length === 0 ? (
                      <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">
                        Veri yok
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data} margin={{top:5, right:5, left:0, bottom:5}}>
                          <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} width={45}/>
                          <Tooltip formatter={(v)=>fmtMoney(v)+" TL"}/>
                          <Bar dataKey="total" fill={g.renk} radius={[3,3,0,0]} name={g.baslik}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })}
            </div>"""

patch("src/pages/ExecutiveDashboard.jsx", ESKI, YENI,
    "Ayl\u0131k Harcama (Son 6 Ay)",
    "frontend iki trend grafigi")

print("")
print("BITTI. Simdi: pm2 restart flowmetric-backend && npm run build && sudo systemctl restart nginx")
