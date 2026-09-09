# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_yogunluk_dikey.py
# "Musteri Bazinda Yogunluk" grafigini yatay/tek renkten
# dikey/renkli (her musteriye ayri renk) hale getirir.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/pages/ExecutiveDashboard.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

# ---------- 1) Renk paleti ----------
if "CUSTOMER_COLORS" in s:
    print("ATLANDI (zaten var): renk paleti")
else:
    ANCHOR = "const SALES_ACT_COLORS = {"
    assert s.count(ANCHOR) == 1, "ANCHOR BULUNAMADI/COKLU: SALES_ACT_COLORS"
    PALET = """const CUSTOMER_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#0ea5e9", "#eab308", "#f43f5e", "#22c55e",
];

"""
    s = s.replace(ANCHOR, PALET + ANCHOR)
    print("TAMAM: renk paleti eklendi")

# ---------- 2) Grafigi dikey + renkli yap ----------
if 'angle={-45}' in s and "CUSTOMER_COLORS[i %" in s:
    print("ATLANDI (zaten var): dikey grafik")
else:
    ESKI = """              <ResponsiveContainer width="100%" height={Math.max(200, (taskqube.ticketByCustomer||[]).length * 34)}>
                <BarChart data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))} layout="vertical" margin={{left:20}}>
                  <XAxis type="number" tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={160} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" fill="#10b981" radius={[0,4,4,0]} name="A\u00e7\u0131k Bilet"/>
                </BarChart>
              </ResponsiveContainer>"""

    YENI = """              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))}
                  margin={{top:10, right:10, left:0, bottom:70}}
                >
                  <XAxis
                    dataKey="name"
                    tick={{fontSize:10}}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" radius={[4,4,0,0]} name="A\u00e7\u0131k Bilet" maxBarSize={48}>
                    {(taskqube.ticketByCustomer||[]).map((entry, i) => (
                      <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>"""

    assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: yogunluk grafigi"
    s = s.replace(ESKI, YENI)
    print("TAMAM: grafik dikey + renkli")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
