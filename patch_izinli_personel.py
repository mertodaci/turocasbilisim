# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_izinli_personel.py
# Yonetici Masasi > Insan Kaynaklari kartinin altina "Bugun Izinli Personel"
# bolumu ekler (isim + izin turu + bitis tarihi, yarim gun ibaresi dahil).

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

# ---------- 1) Backend: izinli personel listesi ----------
# 536. satirdaki dashboard sorgusunun hemen ardina ekleniyor.
patch("backend/src/index.js",
    """    const onLeaveToday = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ?").get(today, today).c;
    const pendingLeaves""",
    """    const onLeaveToday = db.prepare("SELECT COUNT(*) as c FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ?").get(today, today).c;
    const onLeaveTodayList = db.prepare("SELECT id, employee_full_name, leave_type, start_date, end_date, day_count, half_day_period FROM leave_requests WHERE status='onaylandi' AND start_date <= ? AND end_date >= ? ORDER BY end_date ASC LIMIT 20").all(today, today);
    const pendingLeaves""",
    "onLeaveTodayList",
    "backend izinli personel sorgusu")

# ---------- 2) Backend: response ----------
patch("backend/src/index.js",
    "      hr: { totalEmployees, onLeaveToday, pendingLeaves, thisMonthExpenses, pendingExpenses },",
    "      hr: { totalEmployees, onLeaveToday, onLeaveTodayList, pendingLeaves, thisMonthExpenses, pendingExpenses },",
    "onLeaveToday, onLeaveTodayList,",
    "backend response")

# ---------- 3) Frontend: bolum ----------
patch("src/pages/ExecutiveDashboard.jsx",
    """                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>""",
    """                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* bugun-izinli-personel */}
            {(hr.onLeaveTodayList || []).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Bug\\u00fcn \\u0130zinli Personel</p>
                <div className="space-y-2">
                  {(hr.onLeaveTodayList || []).map((l) => (
                    <div
                      key={l.id}
                      onClick={() => navigate("/ik-izin-yonetimi")}
                      className="flex items-start justify-between gap-3 text-sm cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 py-1 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{l.employee_full_name || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.leave_type || "-"}
                          {l.half_day_period
                            ? l.half_day_period === "ogleden_once"
                              ? " \\u00b7 yar\\u0131m g\\u00fcn (\\u00f6\\u011fleden \\u00f6nce)"
                              : " \\u00b7 yar\\u0131m g\\u00fcn (\\u00f6\\u011fleden sonra)"
                            : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {l.end_date ? `${l.end_date} d\\u00f6n\\u00fc\\u015f` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>""",
    "bugun-izinli-personel",
    "frontend izinli personel bolumu")

print("")
print("BITTI. Simdi: pm2 restart flowmetric-backend && npm run build && sudo systemctl restart nginx")
