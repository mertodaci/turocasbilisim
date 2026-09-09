# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_isgunu_aciklama.py
# Izin formunda takvim gunu ile is gunu farkliysa aciklama gosterir:
#   "3 takvim gunu - 1 is gunu (hafta sonu ve resmi tatiller haric)"
# Boylece kullanici neden 2 degil de 1 gun dustugunu anlar.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/components/leave/LeaveRequestForm.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

# ---------- 1) Takvim gunu hesabi ----------
if "calendarDayCount" in s:
    print("ATLANDI (zaten var): calendarDayCount")
else:
    ESKI = "  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;"
    YENI = """  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;
  // Takvim gunu (her iki uc dahil) - is gunu farkini kullaniciya aciklamak icin
  const calendarDayCount =
    form.start_date && form.end_date
      ? Math.max(
          0,
          Math.round(
            (new Date(form.end_date) - new Date(form.start_date)) / 86400000
          ) + 1
        )
      : 0;"""
    assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: dayCount satiri"
    s = s.replace(ESKI, YENI)
    print("TAMAM: calendarDayCount hesabi")

# ---------- 2) Aciklama metni ----------
if "is g\u00fcn\u00fc (hafta sonu" in s:
    print("ATLANDI (zaten var): aciklama metni")
else:
    ESKI2 = """              {isCalendarDayType && ("""
    YENI2 = """              {!isCalendarDayType && !isHalfDay && calendarDayCount > dayCount && (
                <p className="text-xs text-muted-foreground">
                  {calendarDayCount} takvim g\u00fcn\u00fc \u00b7 {dayCount} i\u015f g\u00fcn\u00fc
                  {" "}(hafta sonu ve resmi tatiller hari\u00e7)
                </p>
              )}
              {isCalendarDayType && ("""
    assert s.count(ESKI2) == 1, "ANCHOR BULUNAMADI/COKLU: isCalendarDayType blogu"
    s = s.replace(ESKI2, YENI2)
    print("TAMAM: aciklama metni")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
