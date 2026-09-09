# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_grafik_duzelt.py
#
# Onceki patch yanlis karti degistirmisti:
#  - Bilet Durum Dagilimi karti icine musteri verisi girmisti -> geri alinir
#    (dikey, ticketByStatusOpen, egik etiketler)
#  - Musteri Bazinda Yogunluk dikey kalmisti -> yatay + renkli yapilir

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/pages/ExecutiveDashboard.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

# ---------- 1) Bilet Durum Dagilimi: geri al ----------
ESKI1 = """                <ResponsiveContainer width="100%" height={Math.max(200, (taskqube.ticketByCustomer||[]).length * 34)}>
                <BarChart data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))} layout="vertical" margin={{left:20}}>
                  <XAxis type="number" tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={160} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" radius={[0,4,4,0]} name="A\u00e7\u0131k Bilet">
                    {(taskqube.ticketByCustomer||[]).map((entry, i) => (
                      <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>"""

YENI1 = """                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={(taskqube.ticketByStatusOpen||[]).map(d=>({name:d.status, c:d.c}))}
                    margin={{top:10, right:10, left:0, bottom:70}}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{fontSize:9}}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={90}
                    />
                    <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                    <Bar dataKey="c" fill="#6366f1" radius={[4,4,0,0]} name="Bilet"/>
                  </BarChart>
                </ResponsiveContainer>"""

assert s.count(ESKI1) == 1, "ANCHOR BULUNAMADI/COKLU: Bilet Durum Dagilimi blogu"
s = s.replace(ESKI1, YENI1)
print("TAMAM: Bilet Durum Dagilimi geri alindi")

# ---------- 2) Musteri Bazinda Yogunluk: yatay + renkli ----------
ESKI2 = """              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))}
                  margin={{top:10, right:10, left:0, bottom:60}}
                  barCategoryGap="20%"
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
                  <Bar dataKey="c" radius={[4,4,0,0]} name="A\u00e7\u0131k Bilet">
                    {(taskqube.ticketByCustomer||[]).map((entry, i) => (
                      <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>"""

YENI2 = """              <ResponsiveContainer width="100%" height={Math.max(200, (taskqube.ticketByCustomer||[]).length * 34)}>
                <BarChart
                  data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))}
                  layout="vertical"
                  margin={{left:20}}
                >
                  <XAxis type="number" tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={160} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" radius={[0,4,4,0]} name="A\u00e7\u0131k Bilet">
                    {(taskqube.ticketByCustomer||[]).map((entry, i) => (
                      <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>"""

assert s.count(ESKI2) == 1, "ANCHOR BULUNAMADI/COKLU: Yogunluk blogu"
s = s.replace(ESKI2, YENI2)
print("TAMAM: Yogunluk grafigi yatay + renkli")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
